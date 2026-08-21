import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  clearPrivateKeyBackupUrl,
  formatBytes,
  getPrivateKeyBackupUrl,
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

function makeApkFileName(projectName: string, buildId: string) {
  const safeName = projectName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "mia-build";
  return `${safeName}-${buildId.slice(-8)}.apk`;
}

function makeKeyBackupFileName(projectName: string) {
  const safeName = projectName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "mia";
  return `${safeName}-cle-de-signature.zip`;
}

function BuildCard({ item, installFromNotification = false }: { item: BuildJob; installFromNotification?: boolean }) {
  const colors = useColors();
  const type = getProjectType(item.projectType);
  const status = STATUS_COPY[item.status];
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ received: number; total: number } | null>(null);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const [restarting, setRestarting] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [sharingApk, setSharingApk] = useState(false);
  const [savedApkUri, setSavedApkUri] = useState<string | null>(null);
  const lastDownloadUpdate = useRef(0);
  const handledNotificationInstall = useRef(false);
  const canRestart = item.status === "complete" || item.status === "failed";
  const receivedBytes = downloadProgress?.received ?? 0;
  const expectedBytes = downloadProgress?.total ?? 0;
  const progressPercent = expectedBytes > 0 ? Math.min(100, Math.round((receivedBytes / expectedBytes) * 100)) : 0;
  const downloadHint = downloadMessage
    ?? (expectedBytes > 0
      ? `${progressPercent} % · ${formatBytes(receivedBytes)} sur ${formatBytes(expectedBytes)}`
      : receivedBytes > 0
        ? `${formatBytes(receivedBytes)} téléchargés · taille en cours de lecture`
        : "Connexion au fichier APK…");

  useEffect(() => {
    let active = true;
    const findSavedApk = async () => {
      const directory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
      if (!directory) return;
      const fileUri = `${directory}${makeApkFileName(item.projectName, item.id)}`;
      const info = await FileSystem.getInfoAsync(fileUri);
      if (active && info.exists && info.size && info.size >= 10_000) setSavedApkUri(fileUri);
    };
    void findSavedApk();
    return () => {
      active = false;
    };
  }, [item.id, item.projectName]);

  async function downloadApkToPhone() {
    if (!item.apkUri) throw new Error("L’adresse de téléchargement de cette APK est indisponible.");
    const directory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
    if (!directory) throw new Error("Le dossier de téléchargement est indisponible sur ce téléphone.");

    const fileUri = `${directory}${makeApkFileName(item.projectName, item.id)}`;
    const existing = await FileSystem.getInfoAsync(fileUri);
    if (existing.exists && existing.size && existing.size >= 10_000) {
      setDownloadProgress({ received: existing.size, total: existing.size });
      setSavedApkUri(fileUri);
      return fileUri;
    }
    if (existing.exists) await FileSystem.deleteAsync(fileUri, { idempotent: true });

    const downloadTask = FileSystem.createDownloadResumable(
      item.apkUri,
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
    if (!download) throw new Error("Le téléchargement a été interrompu avant la réception du fichier APK.");
    const info = await FileSystem.getInfoAsync(download.uri);
    if (!info.exists || !info.size || info.size < 10_000) {
      await FileSystem.deleteAsync(download.uri, { idempotent: true });
      throw new Error("Le fichier reçu n’est pas une APK Android complète. Réessayez la compilation.");
    }

    setDownloadProgress({ received: info.size, total: info.size });
    setDownloadMessage("Fichier reçu · vérification de l’APK…");
    const apkHeader = await FileSystem.readAsStringAsync(download.uri, {
      encoding: FileSystem.EncodingType.Base64,
      length: 8,
      position: 0,
    });
    if (!apkHeader.startsWith("UEs")) {
      await FileSystem.deleteAsync(download.uri, { idempotent: true });
      throw new Error("Le fichier reçu ne ressemble pas à une APK Android. Relancez la compilation.");
    }
    setSavedApkUri(download.uri);
    return download.uri;
  }

  async function handleDownloadAndInstall() {
    if (!item.apkUri) return;
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
    if (!installFromNotification || handledNotificationInstall.current || item.status !== "complete" || !item.apkUri) return;
    handledNotificationInstall.current = true;
    void handleDownloadAndInstall();
  }, [installFromNotification, item.apkUri, item.status]);

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
        setDownloadMessage("Téléchargement de l’APK avant l’envoi…");
        fileUri = await downloadApkToPhone();
      }
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error("Le partage de fichiers est indisponible sur ce téléphone.");
      }
      await Sharing.shareAsync(fileUri, {
        dialogTitle: `Envoyer l’APK ${item.projectName}`,
        mimeType: APK_MIME_TYPE,
      });
      setDownloadMessage("APK prête à être envoyée depuis votre téléphone");
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

  async function shareSavedKeyBackup(fileUri: string) {
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error("Le partage de fichiers est indisponible sur ce téléphone.");
    }
    await Sharing.shareAsync(fileUri, {
      dialogTitle: "Sauvegarder ma clé de signature",
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
      Alert.alert("Clé prête à sauvegarder", "Choisissez un dossier privé ou une application de fichiers. Gardez ce ZIP et son mot de passe : ils sont nécessaires pour publier une mise à jour de cette application.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "La sauvegarde de clé a échoué.";
      Alert.alert("Sauvegarde non terminée", message);
    } finally {
      setSavingKey(false);
    }
  }

  function confirmKeyBackup() {
    Alert.alert(
      "Sauvegarder la clé ?",
      "Cette sauvegarde privée ne peut être téléchargée qu’une seule fois. Vérifiez votre connexion, puis choisissez un endroit privé sur le téléphone.",
      [
        { text: "Pas maintenant", style: "cancel" },
        { text: "Télécharger la clé", onPress: () => { void downloadAndShareKeyBackup(); } },
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
          {item.message || item.sourceName}
        </Text>
      </View>

      <View style={[styles.buildModeBadge, { backgroundColor: item.buildMode === "signed" ? `${colors.success}16` : `${colors.primary}16` }]}>
        <MaterialIcons color={item.buildMode === "signed" ? colors.success : colors.primary} name={item.buildMode === "signed" ? "verified-user" : "science"} size={14} />
        <Text style={[styles.buildModeBadgeText, { color: item.buildMode === "signed" ? colors.success : colors.primary }]}>{item.buildMode === "signed" ? "APK signée · publication" : "APK de test · Android"}</Text>
      </View>

      {item.status === "complete" && item.apkUri ? (
        <>
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Envoyer l’APK de ${item.projectName}`}
            disabled={downloading || sharingApk}
            onPress={() => { void handleShareApk(); }}
            style={({ pressed }) => [styles.shareApkButton, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}66` }, pressed && !downloading && !sharingApk && styles.pressed]}
          >
            <View style={[styles.shareApkIcon, { backgroundColor: `${colors.primary}22` }]}>
              <MaterialIcons color={colors.primary} name={sharingApk ? "downloading" : "ios-share"} size={21} />
            </View>
            <View style={styles.shareApkCopy}>
              <Text style={[styles.shareApkTitle, { color: colors.foreground }]}>{sharingApk ? "Préparation de l’envoi…" : "Envoyer l’APK"}</Text>
              <Text style={[styles.shareApkHint, { color: colors.muted }]}>{savedApkUri ? "Choisir WhatsApp, Bluetooth ou Fichiers" : "Télécharge puis ouvre les applications de partage"}</Text>
            </View>
            <MaterialIcons color={colors.primary} name="arrow-forward" size={20} />
          </Pressable>
          {item.buildMode === "signed" && item.keyBackupAvailable ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Sauvegarder la clé de signature de ${item.projectName}`}
              disabled={savingKey || downloading}
              onPress={confirmKeyBackup}
              style={({ pressed }) => [styles.keyBackupButton, { backgroundColor: `${colors.success}12`, borderColor: `${colors.success}66` }, pressed && !savingKey && styles.pressed]}
            >
              <View style={[styles.keyBackupIcon, { backgroundColor: `${colors.success}20` }]}><MaterialIcons color={colors.success} name={savingKey ? "downloading" : "key"} size={21} /></View>
              <View style={styles.keyBackupCopy}>
                <Text style={[styles.keyBackupTitle, { color: colors.foreground }]}>{savingKey ? "Préparation de la clé…" : "Sauvegarder ma clé"}</Text>
                <Text style={[styles.keyBackupHint, { color: colors.muted }]}>{savingKey ? "Ne fermez pas MIA💻" : "Une seule fois · indispensable pour les mises à jour"}</Text>
              </View>
              <MaterialIcons color={colors.success} name="ios-share" size={20} />
            </Pressable>
          ) : null}
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
          {item.status === "complete" ? <Text style={[styles.expiryNote, { color: colors.muted }]}>L’APK est téléchargée sur le téléphone, sans navigateur. Disponible temporairement.</Text> : null}
        </>
      ) : null}
    </View>
  );
}

export default function BuildsScreen() {
  const colors = useColors();
  const [jobs, setJobs] = useState<BuildJob[]>([]);
  const [quota, setQuota] = useState<BuildQuota | null>(null);
  const { installBuild } = useLocalSearchParams<{ installBuild?: string }>();
  const quotaProgress = quota ? Math.max(0, Math.min(1, quota.remaining / quota.max)) : 0;
  const quotaWarning = quota !== null && quota.remaining <= 1;
  const quotaColor = quotaWarning ? colors.error : colors.primary;

  useEffect(() => subscribeToBuildJobs(setJobs), []);
  useEffect(() => subscribeToBuildQuota(setQuota), []);

  useFocusEffect(useCallback(() => {
    void refreshBuildQuota();
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

  return (
    <ScreenContainer className="flex-1" edges={["top", "left", "right"]}>
      <FlatList
        data={jobs}
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
              <Text style={[styles.sectionCount, { color: colors.muted }]}>{jobs.length === 0 ? "Aucune pour l’instant" : `${jobs.length} au total`}</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
              <MaterialIcons color={colors.primary} name="rocket-launch" size={25} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Votre première APK commence ici.</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>Un ZIP Expo ou Android, ou directement un fichier index.html, suffit pour démarrer.</Text>
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
  buildModeBadge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5, marginTop: 9 },
  buildModeBadgeText: { fontSize: 10, fontWeight: "800" },
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
  keyBackupButton: { minHeight: 64, marginTop: 9, paddingHorizontal: 13, borderRadius: 15, borderWidth: 1, flexDirection: "row", alignItems: "center" },
  keyBackupIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 10 },
  keyBackupCopy: { flex: 1, paddingRight: 8 },
  keyBackupTitle: { fontSize: 13, fontWeight: "900" },
  keyBackupHint: { fontSize: 10.5, lineHeight: 15, marginTop: 2 },
  restartButton: { minHeight: 57, marginTop: 10, paddingHorizontal: 15, borderRadius: 15, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  restartCopy: { flex: 1 },
  restartTitle: { fontSize: 14, fontWeight: "900" },
  restartHint: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  expiryNote: { marginTop: 8, fontSize: 11, textAlign: "center" },
  emptyState: { alignItems: "center", paddingHorizontal: 28, paddingTop: 10, paddingBottom: 23 },
  emptyIcon: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 13 },
  emptyTitle: { textAlign: "center", fontSize: 16, fontWeight: "800" },
  emptyText: { maxWidth: 285, marginTop: 7, textAlign: "center", fontSize: 13, lineHeight: 19 },
  footerNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 16, paddingTop: 15, paddingHorizontal: 4 },
  footerNoteText: { flex: 1, fontSize: 11, lineHeight: 16 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});
