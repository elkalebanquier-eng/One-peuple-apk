import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { Alert, FlatList, Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import Svg, { Circle } from "react-native-svg";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { saveMiaBuildHelpDraft } from "@/lib/ai-code-assistant";
import { getBuildErrorHelp } from "@/shared/build-error-help";
import { getBuildTimeRemainingLabel } from "@/shared/build-progress";
import { canDeleteBuildFromHistory, countDeletableBuilds, getLocalArtifactFileUri, matchesBuildHistoryFilter, type BuildHistoryFilter } from "@/shared/build-history";
import { getKeyBackupState } from "@/shared/key-backup-status";
import {
  clearPrivateKeyBackupUrl,
  deleteBuildJob,
  deleteFinishedBuildJobs,
  formatBytes,
  getPrivateKeyBackupUrl,
  loadBuildJobs,
  markPrivateKeyBackupSaved,
  getProjectType,
  refreshBuildQuota,
  refreshBuildJob,
  restartBuildJob,
  subscribeToBuildQuota,
  subscribeToBuildJobs,
  type BuildJob,
  type BuildQuota,
  type BuildStatus,
  type ProjectType,
} from "@/lib/build-store";

type IconName = ComponentProps<typeof MaterialIcons>["name"];

const STATUS_COPY: Record<BuildStatus, { label: string; color: string; icon: IconName }> = {
  draft: { label: "À préparer", color: "#8B93A7", icon: "edit-note" },
  ready: { label: "Prêt à envoyer", color: "#FFB35C", icon: "upload-file" },
  queued: { label: "Dans la file", color: "#FFB35C", icon: "schedule" },
  building: { label: "Compilation en cours", color: "#7AA7FF", icon: "autorenew" },
  complete: { label: "APK prête", color: "#34D399", icon: "verified" },
  failed: { label: "Action nécessaire", color: "#FF5C72", icon: "error-outline" },
};

const TYPE_ICONS: Record<ProjectType, IconName> = {
  expo: "code",
  android: "android",
  html: "language",
};

const APK_MIME_TYPE = "application/vnd.android.package-archive";
const QUOTA_RING_SIZE = 66;
const QUOTA_RING_STROKE = 6;
const QUOTA_RING_RADIUS = (QUOTA_RING_SIZE - QUOTA_RING_STROKE) / 2;
const QUOTA_RING_CIRCUMFERENCE = 2 * Math.PI * QUOTA_RING_RADIUS;

const HISTORY_FILTERS: Array<{ id: BuildHistoryFilter; label: string; icon: IconName }> = [
  { id: "all", label: "Toutes", icon: "apps" },
  { id: "complete", label: "Terminées", icon: "verified" },
  { id: "failed", label: "Erreurs", icon: "error-outline" },
];

function makeKeyBackupFileName(projectName: string) {
  const safeName = projectName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "mia";
  return `${safeName}-cle-et-mot-de-passe.zip`;
}

function BuildCard({ item, installFromNotification = false }: { item: BuildJob; installFromNotification?: boolean }) {
  const colors = useColors();
  const type = getProjectType(item.projectType);
  const artifactType = item.artifactType ?? (item.buildMode === "aab" ? "aab" : "apk");
  const isAab = artifactType === "aab";
  const artifactLabel = isAab ? "fichier AAB" : "APK";
  const keyBackupState = getKeyBackupState({
    buildMode: item.buildMode,
    keyBackupAvailable: item.keyBackupAvailable,
    keyBackupSavedAt: item.keyBackupSavedAt,
  });
  const keyBackupNeedsSaving = keyBackupState === "needs-save";
  const keyBackupConfirmed = keyBackupState === "saved";
  const status = item.status === "complete" && isAab
    ? { label: "AAB prête", color: "#34D399", icon: "verified" as IconName }
    : STATUS_COPY[item.status];
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ received: number; total: number } | null>(null);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const [restarting, setRestarting] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [sharingApk, setSharingApk] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savedApkUri, setSavedApkUri] = useState<string | null>(null);
  const [showCompilationLog, setShowCompilationLog] = useState(true);
  const lastDownloadUpdate = useRef(0);
  const handledNotificationInstall = useRef(false);
  const canRestart = item.status === "complete" || item.status === "failed";
  const canDelete = canDeleteBuildFromHistory(item.status);
  const receivedBytes = downloadProgress?.received ?? 0;
  const expectedBytes = downloadProgress?.total ?? 0;
  const progressPercent = expectedBytes > 0 ? Math.min(100, Math.round((receivedBytes / expectedBytes) * 100)) : 0;
  const compilationProgress = item.status === "complete" ? 100 : Math.max(0, Math.min(100, item.progress ?? (item.status === "building" ? 12 : 5)));
  const compilationEvents = (item.events ?? []).slice(-8);
  const showCompilationProgress = item.status === "queued" || item.status === "building";
  const errorHelp = item.status === "failed"
    ? getBuildErrorHelp({ projectName: item.projectName, projectType: item.projectType, message: item.message })
    : null;
  const timeRemaining = getBuildTimeRemainingLabel(item.status, compilationProgress);
  const downloadHint = downloadMessage
    ?? (expectedBytes > 0
      ? `${progressPercent} % · ${formatBytes(receivedBytes)} sur ${formatBytes(expectedBytes)}`
      : receivedBytes > 0
        ? `${formatBytes(receivedBytes)} téléchargés · taille en cours de lecture`
        : `Connexion au ${artifactLabel}…`);

  useEffect(() => {
    let active = true;
    const findSavedApk = async () => {
      const directory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
      if (!directory) return;
      const fileUri = getLocalArtifactFileUri(directory, item.projectName, item.id, artifactType);
      const info = await FileSystem.getInfoAsync(fileUri);
      if (active && info.exists && info.size && info.size >= 10_000) setSavedApkUri(fileUri);
    };
    void findSavedApk();
    return () => {
      active = false;
    };
  }, [artifactType, item.id, item.projectName]);

  async function downloadApkToPhone() {
    const artifactUri = item.artifactUri ?? item.apkUri;
    if (!artifactUri) throw new Error(`L’adresse de téléchargement de ce ${artifactLabel} est indisponible.`);
    const directory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
    if (!directory) throw new Error("Le dossier de téléchargement est indisponible sur ce téléphone.");

    const fileUri = getLocalArtifactFileUri(directory, item.projectName, item.id, artifactType);
    const existing = await FileSystem.getInfoAsync(fileUri);
    if (existing.exists && existing.size && existing.size >= 10_000) {
      setDownloadProgress({ received: existing.size, total: existing.size });
      setSavedApkUri(fileUri);
      return fileUri;
    }
    if (existing.exists) await FileSystem.deleteAsync(fileUri, { idempotent: true });

    const downloadTask = FileSystem.createDownloadResumable(
      artifactUri,
      fileUri,
      {},
      ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
        const now = Date.now();
        if (now - lastDownloadUpdate.current < 250 && totalBytesWritten !== totalBytesExpectedToWrite) return;
        lastDownloadUpdate.current = now;
        setDownloadProgress({ received: totalBytesWritten, total: totalBytesExpectedToWrite });
      },
    );
    const download = await downloadTask.downloadAsync();
    if (!download) throw new Error(`Le téléchargement a été interrompu avant la réception du ${artifactLabel}.`);
    const info = await FileSystem.getInfoAsync(download.uri);
    if (!info.exists || !info.size || info.size < 10_000) {
      await FileSystem.deleteAsync(download.uri, { idempotent: true });
      throw new Error(`Le fichier reçu n’est pas un ${artifactLabel} Android complet. Réessayez la compilation.`);
    }

    setDownloadProgress({ received: info.size, total: info.size });
    setDownloadMessage(`Fichier reçu · vérification du ${artifactLabel}…`);
    const apkHeader = await FileSystem.readAsStringAsync(download.uri, {
      encoding: FileSystem.EncodingType.Base64,
      length: 8,
      position: 0,
    });
    if (!apkHeader.startsWith("UEs")) {
      await FileSystem.deleteAsync(download.uri, { idempotent: true });
      throw new Error(`Le fichier reçu ne ressemble pas à un ${artifactLabel} Android. Relancez la compilation.`);
    }
    setSavedApkUri(download.uri);
    return download.uri;
  }

  async function handleDownloadAndInstall() {
    if (isAab || !(item.artifactUri ?? item.apkUri)) return;
    if (Platform.OS !== "android") {
      Alert.alert("Android requis", "L’installation directe d’une APK est disponible uniquement sur Android.");
      return;
    }

    try {
      setDownloading(true);
      setDownloadProgress({ received: 0, total: 0 });
      setDownloadMessage(null);
      const fileUri = await downloadApkToPhone();
      const contentUri = await FileSystem.getContentUriAsync(fileUri);
      setDownloadMessage("APK vérifiée · ouverture de l’installateur Android…");
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: contentUri,
        flags: 1,
        type: APK_MIME_TYPE,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Le téléchargement de l’APK a échoué.";
      setDownloadMessage("Téléchargement arrêté · vous pouvez réessayer");
      Alert.alert(
        "Installation non ouverte",
        `${message}\n\nSi Android le demande, autorisez MIA💻 à installer des applications inconnues, puis réessayez.`,
      );
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    if (!installFromNotification || isAab || handledNotificationInstall.current || item.status !== "complete" || !(item.artifactUri ?? item.apkUri)) return;
    handledNotificationInstall.current = true;
    void handleDownloadAndInstall();
  }, [installFromNotification, isAab, item.apkUri, item.artifactUri, item.status]);

  async function handleShareApk() {
    try {
      setSharingApk(true);
      let fileUri = savedApkUri;
      if (fileUri) {
        const savedInfo = await FileSystem.getInfoAsync(fileUri);
        if (!savedInfo.exists || !savedInfo.size || savedInfo.size < 10_000) {
          fileUri = null;
          setSavedApkUri(null);
        }
      }
      if (!fileUri) {
        setDownloading(true);
        setDownloadProgress({ received: 0, total: 0 });
        setDownloadMessage(`Téléchargement du ${artifactLabel} avant l’envoi…`);
        fileUri = await downloadApkToPhone();
      }
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error("Le partage de fichiers est indisponible sur ce téléphone.");
      }
      await Sharing.shareAsync(fileUri, {
        dialogTitle: `Envoyer le ${artifactLabel} ${item.projectName}`,
        mimeType: isAab ? "application/octet-stream" : APK_MIME_TYPE,
      });
      setDownloadMessage(`${artifactLabel} prêt à être envoyé depuis votre téléphone`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "L’envoi de l’APK a échoué.";
      Alert.alert("Envoi non terminé", message);
    } finally {
      setSharingApk(false);
      setDownloading(false);
    }
  }

  async function handleRestart() {
    try {
      setRestarting(true);
      await restartBuildJob(item);
      Alert.alert(
        "Compilation relancée",
        "MIA💻 réutilise le fichier déjà enregistré sur votre téléphone. Vous pouvez suivre la nouvelle compilation ici.",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "La compilation ne peut pas être relancée pour le moment.";
      Alert.alert("Relance impossible", message);
    } finally {
      setRestarting(false);
    }
  }

  async function handleOpenMiaErrorHelp() {
    if (!errorHelp) return;
    try {
      await saveMiaBuildHelpDraft({ projectType: item.projectType, prompt: errorHelp.miaPrompt });
      router.navigate("/(tabs)/assistant");
    } catch {
      Alert.alert("Aide indisponible", "MIA💻 n’a pas pu préparer l’aide pour le moment. Réessayez dans un instant.");
    }
  }

  async function handleDelete() {
    try {
      setDeleting(true);
      await deleteBuildJob(item);
      Alert.alert("Compilation supprimée", "L’ancienne compilation et ses fichiers locaux ont été retirés de MIA💻.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "La compilation ne peut pas être supprimée pour le moment.";
      Alert.alert("Suppression impossible", message);
    } finally {
      setDeleting(false);
    }
  }

  function confirmDelete() {
    const signingWarning = (item.buildMode === "signed" || item.buildMode === "aab") && item.keyBackupAvailable
      ? "\n\nSi vous devez mettre cette application à jour plus tard, exportez d’abord le ZIP « clé + mot de passe ». Après suppression, son lien privé ne sera plus accessible dans MIA💻."
      : "";
    Alert.alert(
      "Supprimer cette compilation ?",
      `Cette action retire cette carte, le ZIP importé et le ${artifactLabel} enregistré par MIA💻 sur ce téléphone. Elle ne désinstalle pas une APK déjà installée et ne supprime pas les fichiers déjà envoyés ou copiés dans Fichiers.${signingWarning}`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => { void handleDelete(); } },
      ],
    );
  }

  async function shareSavedKeyBackup(fileUri: string) {
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error("Le partage de fichiers est indisponible sur ce téléphone.");
    }
    await Sharing.shareAsync(fileUri, {
      dialogTitle: "Sauvegarder ma clé et mon mot de passe",
      mimeType: "application/zip",
    });
  }

  async function downloadAndShareKeyBackup() {
    try {
      setSavingKey(true);
      const directory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
      if (!directory) throw new Error("Le dossier de sauvegarde est indisponible sur ce téléphone.");
      const fileUri = `${directory}${makeKeyBackupFileName(item.projectName)}`;
      const existing = await FileSystem.getInfoAsync(fileUri);
      if (existing.exists && existing.size && existing.size > 100) {
        await shareSavedKeyBackup(fileUri);
        confirmKeyBackupSaved();
        return;
      }

      const keyBackupUrl = await getPrivateKeyBackupUrl(item.id);
      if (!keyBackupUrl) {
        throw new Error("La sauvegarde privée n’est plus disponible. Ne supprimez jamais une clé déjà sauvegardée : elle est nécessaire pour mettre à jour cette application.");
      }
      const download = await FileSystem.downloadAsync(keyBackupUrl, fileUri);
      const received = await FileSystem.getInfoAsync(download.uri);
      if (!received.exists || !received.size || received.size < 100) {
        await FileSystem.deleteAsync(download.uri, { idempotent: true });
        throw new Error("La sauvegarde reçue est incomplète. Réessayez seulement si aucun fichier n’a été reçu.");
      }
      await clearPrivateKeyBackupUrl(item.id);
      await shareSavedKeyBackup(download.uri);
      confirmKeyBackupSaved();
    } catch (error) {
      const message = error instanceof Error ? error.message : "La sauvegarde de clé a échoué.";
      Alert.alert("Sauvegarde non terminée", message);
    } finally {
      setSavingKey(false);
    }
  }

  function confirmKeyBackupSaved() {
    Alert.alert(
      "Le ZIP est-il sauvegardé ?",
      "Choisissez Fichiers, un espace privé ou un autre endroit sûr. Le ZIP contient « MOT-DE-PASSE-ET-INFOS…txt ». Ne l’envoyez à personne et conservez-le pour une future mise à jour Google Play.",
      [
        { text: "Je dois encore le sauvegarder", style: "cancel" },
        {
          text: "Oui, c’est sauvegardé",
          onPress: () => {
            void markPrivateKeyBackupSaved(item.id).catch(() => {
              Alert.alert("Confirmation non enregistrée", "Le ZIP reste disponible sur ce téléphone. Réessayez la confirmation après l’avoir sauvegardé.");
            });
          },
        },
      ],
    );
  }

  function confirmKeyBackup() {
    Alert.alert(
      "Exporter la clé et le mot de passe ?",
      "Ce ZIP privé ne peut être téléchargé qu’une seule fois. Il contient votre fichier de clé et « MOT-DE-PASSE-ET-INFOS…txt ». Vérifiez votre connexion, puis choisissez Fichiers ou un endroit privé sur le téléphone.",
      [
        { text: "Pas maintenant", style: "cancel" },
        { text: "Exporter le ZIP privé", onPress: () => { void downloadAndShareKeyBackup(); } },
      ],
    );
  }

  return (
    <View style={[styles.buildCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardTopRow}>
        <View style={[styles.typeTile, { backgroundColor: colors.background }]}>
          <MaterialIcons color={colors.primary} name={TYPE_ICONS[item.projectType]} size={22} />
        </View>
        <View style={styles.cardTitleBlock}>
          <Text numberOfLines={1} style={[styles.cardTitle, { color: colors.foreground }]}>
            {item.projectName}
          </Text>
          <Text numberOfLines={1} style={[styles.cardMeta, { color: colors.muted }]}>
            {type.label} · {formatBytes(item.sourceSize)}
          </Text>
        </View>
        <View style={[styles.stateIcon, { backgroundColor: `${status.color}18` }]}>
          <MaterialIcons color={status.color} name={status.icon} size={19} />
        </View>
      </View>

      <View style={[styles.statusStrip, { backgroundColor: `${status.color}12` }]}> 
        <View style={[styles.statusMark, { backgroundColor: status.color }]} />
        <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
        <Text numberOfLines={1} style={[styles.statusDetail, { color: colors.muted }]}>
          {errorHelp ? errorHelp.title : item.message || item.sourceName}
        </Text>
      </View>

      {errorHelp ? (
        <View style={[styles.errorHelpPanel, { backgroundColor: `${colors.error}0D`, borderColor: `${colors.error}40` }]}>
          <View style={styles.errorHelpHeader}>
            <MaterialIcons color={colors.error} name="lightbulb-outline" size={19} />
            <View style={styles.errorHelpCopy}>
              <Text style={[styles.errorHelpTitle, { color: colors.foreground }]}>{errorHelp.title}</Text>
            <Text style={[styles.errorHelpText, { color: colors.muted }]}>{errorHelp.summary}</Text>
            </View>
          </View>
          <Text style={[styles.errorHelpNext, { color: colors.muted }]}>{errorHelp.nextStep}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Comprendre l’erreur de ${item.projectName} avec MIA`}
            onPress={() => { void handleOpenMiaErrorHelp(); }}
            style={({ pressed }) => [styles.errorHelpButton, { backgroundColor: `${colors.primary}17`, borderColor: `${colors.primary}55` }, pressed && styles.pressed]}
          >
            <MaterialIcons color={colors.primary} name="auto-awesome" size={17} />
            <Text style={[styles.errorHelpButtonText, { color: colors.primary }]}>Demander à MIA</Text>
            <MaterialIcons color={colors.primary} name="arrow-forward" size={17} />
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.buildModeBadge, { backgroundColor: item.buildMode === "debug" ? `${colors.primary}16` : `${colors.success}16` }]}>
        <MaterialIcons color={item.buildMode === "debug" ? colors.primary : colors.success} name={item.buildMode === "aab" ? "shop" : item.buildMode === "signed" ? "verified-user" : "science"} size={14} />
        <Text style={[styles.buildModeBadgeText, { color: item.buildMode === "debug" ? colors.primary : colors.success }]}>{item.buildMode === "aab" ? "AAB · Google Play" : item.buildMode === "signed" ? "APK signée · publication" : "APK de test · Android"}</Text>
      </View>

      {showCompilationProgress ? (
        <View style={[styles.compilationPanel, { backgroundColor: `${status.color}0D`, borderColor: `${status.color}32` }]}>
          <View style={styles.compilationHeading}>
            <Text style={[styles.compilationTitle, { color: colors.foreground }]}>Progression de la compilation</Text>
            <View style={styles.compilationSummary}>
              <Text style={[styles.compilationPercent, { color: status.color }]}>{compilationProgress} %</Text>
              <Text style={[styles.compilationEstimate, { color: colors.muted }]}>{timeRemaining}</Text>
            </View>
          </View>
          <View style={[styles.compilationTrack, { backgroundColor: `${status.color}24` }]}>
            <View style={[styles.compilationFill, { backgroundColor: status.color, width: `${Math.max(3, compilationProgress)}%` }]} />
          </View>
          <Text style={[styles.compilationEstimateHint, { color: colors.muted }]}>Estimation variable selon la taille du projet et la file.</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showCompilationLog ? "Masquer le journal de compilation" : "Afficher le journal de compilation"}
            accessibilityState={{ expanded: showCompilationLog }}
            onPress={() => setShowCompilationLog((visible) => !visible)}
            style={({ pressed }) => [styles.compilationLogToggle, { backgroundColor: `${status.color}12` }, pressed && styles.pressed]}
          >
            <MaterialIcons color={status.color} name={showCompilationLog ? "expand-less" : "expand-more"} size={18} />
            <Text style={[styles.compilationLogToggleText, { color: status.color }]}>{showCompilationLog ? "Masquer le journal" : `Afficher le journal${compilationEvents.length > 0 ? ` (${compilationEvents.length})` : ""}`}</Text>
          </Pressable>
          {showCompilationLog ? (
            <View style={styles.compilationEvents}>
              {compilationEvents.length > 0 ? compilationEvents.map((event, index) => (
                <View key={`${event.createdAt}-${index}`} style={styles.compilationEvent}>
                  <MaterialIcons color={event.progress <= compilationProgress ? status.color : colors.muted} name={event.progress < compilationProgress ? "check-circle" : "radio-button-checked"} size={14} />
                  <Text numberOfLines={2} style={[styles.compilationEventText, { color: event.progress < compilationProgress ? colors.muted : colors.foreground }]}>{event.message}</Text>
                </View>
              )) : (
                <Text style={[styles.compilationEventText, { color: colors.muted }]}>Connexion au suivi de compilation…</Text>
              )}
            </View>
          ) : null}
        </View>
      ) : null}

      {item.status === "complete" && (item.artifactUri ?? item.apkUri) ? (
        <>
          {(item.buildMode === "signed" || item.buildMode === "aab") && item.keyBackupAvailable ? (
            <>
              <View style={[styles.keyBackupStatus, { backgroundColor: keyBackupNeedsSaving ? `${colors.warning}12` : `${colors.success}12`, borderColor: keyBackupNeedsSaving ? `${colors.warning}52` : `${colors.success}52` }]}>
                <MaterialIcons color={keyBackupNeedsSaving ? colors.warning : colors.success} name={keyBackupNeedsSaving ? "priority-high" : "verified-user"} size={20} />
                <View style={styles.keyBackupStatusCopy}>
                  <Text style={[styles.keyBackupStatusTitle, { color: colors.foreground }]}>{keyBackupNeedsSaving ? "Clé de publication à sauvegarder" : "Clé de publication sauvegardée"}</Text>
                  <Text style={[styles.keyBackupStatusHint, { color: colors.muted }]}>{keyBackupNeedsSaving ? "Indispensable pour publier ou mettre à jour cette application plus tard." : "Vous avez confirmé le ZIP privé. Gardez-le dans un endroit sûr."}</Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${keyBackupConfirmed ? "Ouvrir à nouveau" : "Exporter"} le ZIP privé contenant la clé et le mot de passe de ${item.projectName}`}
                disabled={savingKey || downloading}
                onPress={confirmKeyBackup}
                style={({ pressed }) => [styles.keyBackupButton, { backgroundColor: keyBackupNeedsSaving ? colors.warning : colors.success }, pressed && !savingKey && !downloading && styles.pressed]}
              >
                <View style={[styles.keyBackupIcon, { backgroundColor: `${colors.background}22` }]}><MaterialIcons color={colors.background} name={savingKey ? "downloading" : keyBackupConfirmed ? "folder-open" : "file-download"} size={22} /></View>
                <View style={styles.keyBackupCopy}>
                  <Text style={[styles.keyBackupTitle, { color: colors.background }]}>{savingKey ? "Export du ZIP en cours…" : keyBackupConfirmed ? "Ouvrir le ZIP privé sauvegardé" : "Sauvegarder le ZIP : clé + mot de passe"}</Text>
                  <Text style={[styles.keyBackupHint, { color: colors.background }]}>{savingKey ? "Ne fermez pas MIA💻" : keyBackupConfirmed ? "Pour vérifier ou copier le fichier dans Fichiers" : "À faire maintenant · une clé est nécessaire pour les mises à jour"}</Text>
                </View>
                <MaterialIcons color={colors.background} name="arrow-forward" size={22} />
              </Pressable>
            </>
          ) : null}
          {isAab ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Télécharger le fichier AAB de ${item.projectName}`}
              disabled={downloading || sharingApk}
              onPress={() => { void handleShareApk(); }}
              style={({ pressed }) => [styles.downloadButton, { backgroundColor: colors.primary }, pressed && !downloading && !sharingApk && styles.pressed]}
            >
              <View style={styles.downloadCopy}>
                <Text style={[styles.downloadTitle, { color: colors.background }]}>{downloading || sharingApk ? "Préparation du fichier AAB…" : "Télécharger le fichier AAB"}</Text>
                <Text style={[styles.downloadHint, { color: colors.background }]}>{downloading ? downloadHint : "À envoyer sur Google Play · ne s’installe pas sur le téléphone"}</Text>
                {downloading ? <View style={[styles.downloadTrack, { backgroundColor: `${colors.background}3B` }]}><View style={[styles.downloadFill, { backgroundColor: colors.background, width: expectedBytes > 0 ? `${Math.max(3, progressPercent)}%` : "18%" }]} /></View> : null}
              </View>
              <MaterialIcons color={colors.background} name={downloading || sharingApk ? "downloading" : "download"} size={24} />
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Télécharger et installer l’APK de ${item.projectName}`}
              disabled={downloading}
              onPress={() => { void handleDownloadAndInstall(); }}
              style={({ pressed }) => [styles.downloadButton, { backgroundColor: colors.primary }, pressed && !downloading && styles.pressed]}
            >
              <View style={styles.downloadCopy}>
                <Text style={[styles.downloadTitle, { color: colors.background }]}>{downloading ? "Téléchargement de l’APK…" : "Télécharger et installer"}</Text>
                <Text style={[styles.downloadHint, { color: colors.background }]}>{downloading ? downloadHint : "Ouvre directement l’installateur Android"}</Text>
                {downloading ? (
                  <View style={[styles.downloadTrack, { backgroundColor: `${colors.background}3B` }]}>
                    <View style={[styles.downloadFill, { backgroundColor: colors.background, width: expectedBytes > 0 ? `${Math.max(3, progressPercent)}%` : "18%" }]} />
                  </View>
                ) : null}
              </View>
              <MaterialIcons color={colors.background} name={downloading ? "downloading" : "install-mobile"} size={24} />
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Envoyer le ${artifactLabel} de ${item.projectName}`}
            disabled={downloading || sharingApk}
            onPress={() => { void handleShareApk(); }}
            style={({ pressed }) => [styles.shareApkButton, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}66` }, pressed && !downloading && !sharingApk && styles.pressed]}
          >
            <View style={[styles.shareApkIcon, { backgroundColor: `${colors.primary}22` }]}>
              <MaterialIcons color={colors.primary} name={sharingApk ? "downloading" : "ios-share"} size={21} />
            </View>
            <View style={styles.shareApkCopy}>
              <Text style={[styles.shareApkTitle, { color: colors.foreground }]}>{sharingApk ? "Préparation de l’envoi…" : `Envoyer le ${artifactLabel}`}</Text>
              <Text style={[styles.shareApkHint, { color: colors.muted }]}>{savedApkUri ? "Choisir WhatsApp, Bluetooth ou Fichiers" : "Télécharge puis ouvre les applications de partage"}</Text>
            </View>
            <MaterialIcons color={colors.primary} name="arrow-forward" size={20} />
          </Pressable>
        </>
      ) : null}

      {canRestart ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Relancer la compilation de ${item.projectName}`}
            disabled={restarting || downloading}
            onPress={() => { void handleRestart(); }}
            style={({ pressed }) => [styles.restartButton, { borderColor: colors.border, backgroundColor: colors.background }, pressed && !restarting && !downloading && styles.pressed]}
          >
            <View style={styles.restartCopy}>
              <Text style={[styles.restartTitle, { color: colors.foreground }]}>{restarting ? "Relance de la compilation…" : "Relancer"}</Text>
              <Text style={[styles.restartHint, { color: colors.muted }]}>{restarting ? "Envoi du fichier enregistré" : "Réutilise le même fichier, sans le choisir à nouveau"}</Text>
            </View>
            <MaterialIcons color={colors.primary} name={restarting ? "autorenew" : "replay"} size={22} />
          </Pressable>
          {item.status === "complete" ? <Text style={[styles.expiryNote, { color: colors.muted }]}>{isAab ? "Le fichier AAB est destiné à Google Play et ne peut pas être installé directement." : "L’APK est téléchargée sur le téléphone, sans navigateur. Disponible temporairement."}</Text> : null}
        </>
      ) : null}

      {canDelete ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Supprimer la compilation ${item.projectName}`}
          disabled={deleting || downloading || restarting || savingKey || sharingApk}
          onPress={confirmDelete}
          style={({ pressed }) => [styles.deleteButton, { borderColor: `${colors.error}66`, backgroundColor: `${colors.error}10` }, pressed && !deleting && styles.pressed]}
        >
          <View style={styles.deleteCopy}>
            <Text style={[styles.deleteTitle, { color: colors.error }]}>{deleting ? "Suppression en cours…" : "Supprimer cette compilation"}</Text>
            <Text style={[styles.deleteHint, { color: colors.muted }]}>Retire l’historique et les fichiers locaux de MIA💻</Text>
          </View>
          <MaterialIcons color={colors.error} name={deleting ? "hourglass-top" : "delete-outline"} size={21} />
        </Pressable>
      ) : null}
    </View>
  );
}

export default function BuildsScreen() {
  const colors = useColors();
  const [jobs, setJobs] = useState<BuildJob[]>([]);
  const [quota, setQuota] = useState<BuildQuota | null>(null);
  const [historyFilter, setHistoryFilter] = useState<BuildHistoryFilter>("all");
  const [deletingAll, setDeletingAll] = useState(false);
  const { installBuild } = useLocalSearchParams<{ installBuild?: string }>();
  const quotaProgress = quota ? Math.max(0, Math.min(1, quota.remaining / quota.max)) : 0;
  const quotaWarning = quota !== null && quota.remaining <= 1;
  const quotaColor = quotaWarning ? colors.error : colors.primary;
  const filteredJobs = useMemo(
    () => jobs.filter((job) => matchesBuildHistoryFilter(job.status, historyFilter)),
    [historyFilter, jobs],
  );
  const deletableBuildCount = useMemo(() => countDeletableBuilds(jobs.map((job) => job.status)), [jobs]);
  const activeBuildCount = jobs.length - deletableBuildCount;
  const filterEmptyTitle = historyFilter === "complete" ? "Aucune APK terminée." : "Aucune compilation en erreur.";
  const filterEmptyText = historyFilter === "complete"
    ? "Les APK prêtes apparaîtront ici après la fin de leur compilation."
    : "Les explications utiles apparaîtront ici seulement si une compilation a besoin d’être relancée.";

  useEffect(() => subscribeToBuildJobs(setJobs), []);
  useEffect(() => subscribeToBuildQuota(setQuota), []);

  useFocusEffect(useCallback(() => {
    void refreshBuildQuota();
    void loadBuildJobs().then((storedJobs) => {
      const activeJobs = storedJobs.filter((job) => job.status === "queued" || job.status === "building");
      return Promise.all(activeJobs.map((job) => refreshBuildJob(job)));
    });
  }, []));

  useEffect(() => {
    const activeJobs = jobs.filter((job) => job.status === "queued" || job.status === "building");
    if (activeJobs.length === 0) return;

    let active = true;
    const refresh = () => {
      if (active) void Promise.all(activeJobs.map((job) => refreshBuildJob(job)));
    };
    refresh();
    const interval = setInterval(refresh, 15_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [jobs]);

  async function handleDeleteFinishedBuilds() {
    try {
      setDeletingAll(true);
      const deletedCount = await deleteFinishedBuildJobs();
      Alert.alert(
        "Historique nettoyé",
        `${deletedCount} ancienne${deletedCount > 1 ? "s" : ""} compilation${deletedCount > 1 ? "s" : ""} et ses fichiers locaux ont été retirés de MIA💻.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Le nettoyage n’a pas pu être terminé.";
      Alert.alert("Nettoyage impossible", message);
    } finally {
      setDeletingAll(false);
    }
  }

  function confirmDeleteFinishedBuildsSecondStep() {
    Alert.alert(
      "Dernière confirmation",
      `Vous allez supprimer définitivement ${deletableBuildCount} ancienne${deletableBuildCount > 1 ? "s" : ""} compilation${deletableBuildCount > 1 ? "s" : ""} de l’historique local. Cette action ne peut pas être annulée.${activeBuildCount > 0 ? ` ${activeBuildCount} compilation${activeBuildCount > 1 ? "s" : ""} active${activeBuildCount > 1 ? "s" : ""} restera${activeBuildCount > 1 ? "ont" : ""} protégée${activeBuildCount > 1 ? "s" : ""}.` : ""}`,
      [
        { text: "Revenir", style: "cancel" },
        { text: "Oui, tout supprimer", style: "destructive", onPress: () => { void handleDeleteFinishedBuilds(); } },
      ],
    );
  }

  function confirmDeleteFinishedBuildsFirstStep() {
    if (deletableBuildCount === 0) {
      Alert.alert("Rien à supprimer", "Seules les compilations actives sont encore présentes. Elles restent protégées jusqu’à leur fin.");
      return;
    }
    Alert.alert(
      "Supprimer toutes les anciennes compilations ?",
      `MIA💻 retirera ${deletableBuildCount} entrée${deletableBuildCount > 1 ? "s" : ""} terminée${deletableBuildCount > 1 ? "s" : ""} ou en erreur, avec les ZIP et APK conservés uniquement dans l’application. Les APK déjà installées, partagées ou copiées dans Fichiers ne seront pas supprimées.${activeBuildCount > 0 ? ` ${activeBuildCount} compilation${activeBuildCount > 1 ? "s" : ""} active${activeBuildCount > 1 ? "s" : ""} restera protégée.` : ""}`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Continuer", style: "destructive", onPress: confirmDeleteFinishedBuildsSecondStep },
      ],
    );
  }

  return (
    <ScreenContainer className="flex-1" edges={["top", "left", "right"]}>
      <FlatList
        data={filteredJobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <BuildCard item={item} installFromNotification={installBuild === item.id} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View style={styles.brandRow}>
                <Image source={require("../../assets/images/icon.png")} style={styles.logoMark} />
                <View>
                  <Text style={[styles.brand, { color: colors.foreground }]}>MIA💻</Text>
                  <Text style={[styles.headerCaption, { color: colors.primary }]}>ASSISTANT · ATELIER APK</Text>
                </View>
              </View>
              <View style={[styles.localBadge, { backgroundColor: `${colors.primary}15` }]}><MaterialIcons color={colors.primary} name="phone-android" size={14} /><Text style={[styles.localCount, { color: colors.primary }]}>{jobs.length}</Text></View>
            </View>

            <View style={[styles.quotaPanel, { backgroundColor: `${quotaColor}12`, borderColor: `${quotaColor}4D` }]}>
              <View style={styles.quotaGauge}>
                <Svg width={QUOTA_RING_SIZE} height={QUOTA_RING_SIZE}>
                  <Circle
                    cx={QUOTA_RING_SIZE / 2}
                    cy={QUOTA_RING_SIZE / 2}
                    r={QUOTA_RING_RADIUS}
                    stroke={`${quotaColor}26`}
                    strokeWidth={QUOTA_RING_STROKE}
                    fill="none"
                  />
                  <Circle
                    cx={QUOTA_RING_SIZE / 2}
                    cy={QUOTA_RING_SIZE / 2}
                    r={QUOTA_RING_RADIUS}
                    stroke={quotaColor}
                    strokeWidth={QUOTA_RING_STROKE}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${QUOTA_RING_CIRCUMFERENCE}`}
                    strokeDashoffset={QUOTA_RING_CIRCUMFERENCE * (1 - quotaProgress)}
                    transform={`rotate(-90 ${QUOTA_RING_SIZE / 2} ${QUOTA_RING_SIZE / 2})`}
                  />
                </Svg>
                <View style={styles.quotaGaugeLabel}>
                  <Text style={[styles.quotaNumber, { color: quotaColor }]}>{quota ? quota.remaining : "—"}</Text>
                  <Text style={[styles.quotaUnit, { color: quotaColor }]}>RESTE</Text>
                </View>
              </View>
              <View style={styles.quotaCopy}>
                <Text style={[styles.quotaEyebrow, { color: quotaColor }]}>COMPILATIONS GRATUITES</Text>
                <Text style={[styles.quotaTitle, { color: colors.foreground }]}>
                  {quota
                    ? quota.remaining === 0
                      ? "Limite atteinte"
                      : `${quota.remaining} compilation${quota.remaining > 1 ? "s" : ""} disponible${quota.remaining > 1 ? "s" : ""}`
                    : "Vérification en cours"}
                </Text>
                <Text style={[styles.quotaDetail, { color: colors.muted }]}>
                  {quota
                    ? quota.remaining === 0
                      ? "Réessayez dans moins d’une heure"
                      : `sur ${quota.max} cette heure`
                    : "Connexion au compteur sécurisé"}
                </Text>
                <View style={[styles.quotaTrack, { backgroundColor: `${quotaColor}26` }]}>
                  <View style={[styles.quotaFill, { backgroundColor: quotaColor, width: `${Math.max(0, quotaProgress * 100)}%` }]} />
                </View>
              </View>
            </View>

            <View style={[styles.launchPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
              <View style={styles.heroTopline}><View style={[styles.orangeRule, { backgroundColor: colors.primary }]} /><Text style={[styles.launchEyebrow, { color: colors.primary }]}>PRÊT À CONSTRUIRE</Text><View style={[styles.heroStatus, { backgroundColor: `${colors.success}1A` }]}><View style={[styles.heroDot, { backgroundColor: colors.success }]} /><Text style={[styles.heroStatusText, { color: colors.success }]}>SIMPLE</Text></View></View>
              <Text style={[styles.launchTitle, { color: colors.foreground }]}>Votre code.{"\n"}Votre APK.</Text>
              <Text style={[styles.launchText, { color: colors.muted }]}>Importez un projet, suivez la compilation et installez l’APK directement sur votre téléphone.</Text>
              <View style={styles.formatPills}>
                <View style={[styles.formatPill, { backgroundColor: colors.background }]}><MaterialIcons color={colors.primary} name="code" size={14} /><Text style={[styles.formatPillText, { color: colors.muted }]}>Expo</Text></View>
                <View style={[styles.formatPill, { backgroundColor: colors.background }]}><MaterialIcons color={colors.primary} name="android" size={14} /><Text style={[styles.formatPillText, { color: colors.muted }]}>Android</Text></View>
                <View style={[styles.formatPill, { backgroundColor: colors.background }]}><MaterialIcons color={colors.primary} name="language" size={14} /><Text style={[styles.formatPillText, { color: colors.muted }]}>HTML</Text></View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Créer une nouvelle APK"
                onPress={() => router.push("/(tabs)/create")}
                style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}
              >
                <View><Text style={[styles.primaryButtonText, { color: colors.background }]}>Nouvelle compilation</Text><Text style={[styles.primaryButtonHint, { color: colors.background }]}>Importer mon code</Text></View>
                <MaterialIcons color={colors.background} name="arrow-forward" size={22} />
              </Pressable>
            </View>

              <View style={styles.sectionTitleRow}>
                <View><Text style={[styles.sectionEyebrow, { color: colors.primary }]}>SUIVI</Text><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Mes compilations</Text></View>
                <Text style={[styles.sectionCount, { color: colors.muted }]}>{jobs.length === 0 ? "Aucune pour l’instant" : `${filteredJobs.length} affichée${filteredJobs.length > 1 ? "s" : ""}`}</Text>
              </View>
              <View style={styles.historyControls}>
                <View style={[styles.filterRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {HISTORY_FILTERS.map((filter) => {
                    const selected = historyFilter === filter.id;
                    const selectedColor = filter.id === "failed" ? colors.error : colors.primary;
                    return (
                      <Pressable
                        key={filter.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Afficher les compilations ${filter.label.toLocaleLowerCase("fr-FR")}`}
                        accessibilityState={{ selected }}
                        onPress={() => setHistoryFilter(filter.id)}
                        style={({ pressed }) => [styles.filterButton, selected && { backgroundColor: `${selectedColor}18` }, pressed && styles.pressed]}
                      >
                        <MaterialIcons color={selected ? selectedColor : colors.muted} name={filter.icon} size={15} />
                        <Text style={[styles.filterButtonText, { color: selected ? selectedColor : colors.muted }]}>{filter.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Supprimer toutes les anciennes compilations"
                  disabled={deletingAll || deletableBuildCount === 0}
                  onPress={confirmDeleteFinishedBuildsFirstStep}
                  style={({ pressed }) => [styles.clearAllButton, { borderColor: `${colors.error}66`, backgroundColor: `${colors.error}10`, opacity: deletableBuildCount === 0 ? 0.48 : 1 }, pressed && deletableBuildCount > 0 && styles.pressed]}
                >
                  <MaterialIcons color={colors.error} name={deletingAll ? "hourglass-top" : "delete-sweep"} size={18} />
                  <Text style={[styles.clearAllButtonText, { color: colors.error }]}>{deletingAll ? "Nettoyage en cours…" : `Tout supprimer${deletableBuildCount > 0 ? ` (${deletableBuildCount})` : ""}`}</Text>
                </Pressable>
              </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
              <MaterialIcons color={historyFilter === "failed" ? colors.error : colors.primary} name={historyFilter === "all" ? "rocket-launch" : historyFilter === "complete" ? "verified" : "check-circle-outline"} size={25} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{historyFilter === "all" ? "Votre première APK commence ici." : filterEmptyTitle}</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>{historyFilter === "all" ? "Un ZIP Expo ou Android, ou directement un fichier index.html, suffit pour démarrer." : filterEmptyText}</Text>
          </View>
        }
        ListFooterComponent={
          <View style={[styles.footerNote, { borderColor: colors.border }]}>
            <MaterialIcons color={colors.muted} name="info-outline" size={16} />
            <Text style={[styles.footerNoteText, { color: colors.muted }]}>Votre fichier est utilisé uniquement le temps de préparer la compilation. L’APK est une version de test Android.</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: 18, paddingBottom: 30 },
  header: { paddingTop: 12, paddingBottom: 22, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoMark: { width: 42, height: 42, borderRadius: 13 },
  brand: { fontSize: 22, fontWeight: "900", letterSpacing: -0.7 },
  headerCaption: { marginTop: 2, fontSize: 9, fontWeight: "900", letterSpacing: 0.9 },
  localBadge: { minWidth: 36, height: 28, paddingHorizontal: 8, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  localCount: { fontSize: 12, fontWeight: "900" },
  quotaPanel: { minHeight: 92, marginBottom: 14, padding: 12, borderRadius: 17, borderWidth: 1, flexDirection: "row", alignItems: "center" },
  quotaGauge: { width: QUOTA_RING_SIZE, height: QUOTA_RING_SIZE, alignItems: "center", justifyContent: "center", marginRight: 13 },
  quotaGaugeLabel: { position: "absolute", alignItems: "center", justifyContent: "center" },
  quotaNumber: { fontSize: 19, lineHeight: 22, fontWeight: "900", letterSpacing: -0.5 },
  quotaUnit: { marginTop: -1, fontSize: 7, fontWeight: "900", letterSpacing: 0.7 },
  quotaCopy: { flex: 1, justifyContent: "center" },
  quotaEyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 0.95 },
  quotaTitle: { marginTop: 2, fontSize: 14, lineHeight: 18, fontWeight: "900" },
  quotaDetail: { marginTop: 1, fontSize: 11, lineHeight: 15, fontWeight: "600" },
  quotaTrack: { height: 4, marginTop: 8, borderRadius: 4, overflow: "hidden" },
  quotaFill: { height: 4, borderRadius: 4 },
  launchPanel: { borderWidth: 1, borderRadius: 26, padding: 20, overflow: "hidden" },
  heroTopline: { flexDirection: "row", alignItems: "center", gap: 8 },
  orangeRule: { width: 30, height: 4, borderRadius: 3 },
  launchEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.25 },
  heroStatus: { marginLeft: "auto", paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 4 },
  heroDot: { width: 5, height: 5, borderRadius: 3 },
  heroStatusText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.7 },
  launchTitle: { marginTop: 17, fontSize: 32, lineHeight: 36, fontWeight: "900", letterSpacing: -1.2 },
  launchText: { marginTop: 10, fontSize: 13, lineHeight: 20, maxWidth: 320 },
  formatPills: { flexDirection: "row", gap: 7, marginTop: 17, marginBottom: 19 },
  formatPill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7 },
  formatPillText: { fontSize: 11, fontWeight: "700" },
  primaryButton: { minHeight: 62, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 17 },
  primaryButtonText: { fontSize: 16, fontWeight: "900" },
  primaryButtonHint: { marginTop: 1, fontSize: 10, fontWeight: "700", opacity: 0.7 },
  sectionTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 30, marginBottom: 13 },
  sectionEyebrow: { marginBottom: 3, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  sectionTitle: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  sectionCount: { fontSize: 12, fontWeight: "600" },
  historyControls: { marginBottom: 13, gap: 8 },
  filterRow: { minHeight: 46, padding: 4, borderRadius: 14, borderWidth: 1, flexDirection: "row" },
  filterButton: { flex: 1, minHeight: 36, paddingHorizontal: 6, borderRadius: 10, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 4 },
  filterButtonText: { fontSize: 10.5, fontWeight: "900" },
  clearAllButton: { minHeight: 43, paddingHorizontal: 13, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  clearAllButtonText: { fontSize: 11.5, fontWeight: "900" },
  buildCard: { borderWidth: 1, borderRadius: 20, padding: 14, marginBottom: 11 },
  cardTopRow: { flexDirection: "row", alignItems: "center" },
  typeTile: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 11 },
  cardTitleBlock: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 15, fontWeight: "800" },
  cardMeta: { marginTop: 3, fontSize: 12 },
  stateIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", marginLeft: 8 },
  statusStrip: { flexDirection: "row", alignItems: "center", minHeight: 38, borderRadius: 11, paddingHorizontal: 10, marginTop: 13, gap: 7 },
  statusMark: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 11, fontWeight: "900" },
  statusDetail: { flex: 1, fontSize: 11, textAlign: "right" },
  errorHelpPanel: { borderWidth: 1, borderRadius: 14, marginTop: 10, padding: 11 },
  errorHelpHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  errorHelpCopy: { flex: 1 },
  errorHelpTitle: { fontSize: 12, fontWeight: "900" },
  errorHelpText: { marginTop: 2, fontSize: 10.5, lineHeight: 15 },
  errorHelpNext: { marginTop: 8, fontSize: 10.5, lineHeight: 15, fontWeight: "700" },
  errorHelpButton: { minHeight: 38, marginTop: 9, paddingHorizontal: 10, borderWidth: 1, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 6 },
  errorHelpButtonText: { flex: 1, fontSize: 11, fontWeight: "900" },
  buildModeBadge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5, marginTop: 9 },
  buildModeBadgeText: { fontSize: 10, fontWeight: "800" },
  compilationPanel: { borderWidth: 1, borderRadius: 14, marginTop: 10, padding: 11 },
  compilationHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  compilationTitle: { fontSize: 12, fontWeight: "900" },
  compilationSummary: { alignItems: "flex-end", marginLeft: 10 },
  compilationPercent: { fontSize: 12, fontWeight: "900" },
  compilationEstimate: { marginTop: 1, fontSize: 9.5, lineHeight: 13, fontWeight: "700", textAlign: "right" },
  compilationTrack: { height: 6, borderRadius: 5, overflow: "hidden", marginTop: 8 },
  compilationFill: { height: 6, borderRadius: 5 },
  compilationEstimateHint: { marginTop: 8, fontSize: 9.5, lineHeight: 13 },
  compilationLogToggle: { minHeight: 34, marginTop: 9, paddingHorizontal: 9, borderRadius: 9, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5 },
  compilationLogToggleText: { fontSize: 10.5, fontWeight: "900" },
  compilationEvents: { marginTop: 10, gap: 5 },
  compilationEvent: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  compilationEventText: { flex: 1, fontSize: 10.5, lineHeight: 15, fontWeight: "600" },
  downloadButton: { minHeight: 68, marginTop: 12, paddingHorizontal: 15, borderRadius: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  downloadCopy: { flex: 1 },
  downloadTitle: { fontSize: 14, fontWeight: "900" },
  downloadHint: { fontSize: 11, fontWeight: "600", opacity: 0.78, marginTop: 2 },
  downloadTrack: { height: 4, borderRadius: 4, overflow: "hidden", marginTop: 8, marginRight: 14 },
  downloadFill: { height: 4, borderRadius: 4 },
  shareApkButton: { minHeight: 62, marginTop: 9, paddingHorizontal: 13, borderRadius: 15, borderWidth: 1, flexDirection: "row", alignItems: "center" },
  shareApkIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 10 },
  shareApkCopy: { flex: 1, paddingRight: 8 },
  shareApkTitle: { fontSize: 13, fontWeight: "900" },
  shareApkHint: { marginTop: 2, fontSize: 10.5, lineHeight: 15 },
  keyBackupButton: { minHeight: 70, marginTop: 12, paddingHorizontal: 14, borderRadius: 16, flexDirection: "row", alignItems: "center" },
  keyBackupStatus: { minHeight: 66, marginTop: 12, padding: 11, borderWidth: 1, borderRadius: 15, flexDirection: "row", alignItems: "flex-start", gap: 9 },
  keyBackupStatusCopy: { flex: 1 },
  keyBackupStatusTitle: { fontSize: 12.5, lineHeight: 17, fontWeight: "900" },
  keyBackupStatusHint: { marginTop: 2, fontSize: 10.5, lineHeight: 15, fontWeight: "600" },
  keyBackupIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 10 },
  keyBackupCopy: { flex: 1, paddingRight: 8 },
  keyBackupTitle: { fontSize: 13, fontWeight: "900" },
  keyBackupHint: { fontSize: 10.5, lineHeight: 15, marginTop: 2 },
  restartButton: { minHeight: 57, marginTop: 10, paddingHorizontal: 15, borderRadius: 15, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  restartCopy: { flex: 1 },
  restartTitle: { fontSize: 14, fontWeight: "900" },
  restartHint: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  deleteButton: { minHeight: 50, marginTop: 10, paddingHorizontal: 15, borderRadius: 15, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  deleteCopy: { flex: 1, paddingRight: 10 },
  deleteTitle: { fontSize: 12.5, fontWeight: "900" },
  deleteHint: { marginTop: 2, fontSize: 10.5, lineHeight: 14 },
  expiryNote: { marginTop: 8, fontSize: 11, textAlign: "center" },
  emptyState: { alignItems: "center", paddingHorizontal: 28, paddingTop: 10, paddingBottom: 23 },
  emptyIcon: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 13 },
  emptyTitle: { textAlign: "center", fontSize: 16, fontWeight: "800" },
  emptyText: { maxWidth: 285, marginTop: 7, textAlign: "center", fontSize: 13, lineHeight: 19 },
  footerNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 16, paddingTop: 15, paddingHorizontal: 4 },
  footerNoteText: { flex: 1, fontSize: 11, lineHeight: 16 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});
