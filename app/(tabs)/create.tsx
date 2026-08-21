import { useCallback, useMemo, useState } from "react";
import type { ComponentProps } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { prepareAssistantHtmlSource, takeAssistantDraft, takeMiaLogoDraft } from "@/lib/ai-code-assistant";
import { createLocalBuildDraft, formatBytes, PROJECT_TYPES, submitBuildJob, type BuildMode, type ProjectType } from "@/lib/build-store";
import { enableBuildNotifications } from "@/lib/build-notifications";
import { prepareDirectHtmlSource, type PreparedHtmlSource } from "@/lib/html-direct-import";
import { inspectProjectSource } from "@/lib/project-preflight";
import { MAX_SOURCE_SIZE, isHtmlFile, validateProjectArchive } from "@/lib/project-import";
import { prepareStarterProject } from "@/lib/starter-project";
import { DEFAULT_APP_VERSION, getProjectPackageName, readAppIdentity } from "@/shared/app-identity";
import type { ProjectPreflight } from "@/shared/project-preflight";
import { STARTER_PROJECTS, type StarterProjectId } from "@/shared/starter-projects";

type IconName = ComponentProps<typeof MaterialIcons>["name"];
type SelectedSource = Pick<DocumentPicker.DocumentPickerAsset, "name" | "size" | "uri"> & { preparedFromHtml?: boolean; preparedFromTemplate?: boolean };
type SelectedAppIcon = { name: string; size?: number; uri: string };

const TYPE_ICONS: Record<ProjectType, IconName> = { expo: "code", android: "android", html: "language" };

export default function NewBuildScreen() {
  const colors = useColors();
  const [projectType, setProjectType] = useState<ProjectType | null>(null);
  const [projectName, setProjectName] = useState("");
  const [archive, setArchive] = useState<SelectedSource | null>(null);
  const [customIcon, setCustomIcon] = useState<SelectedAppIcon | null>(null);
  const [packageName, setPackageName] = useState("com.oneapp.monapp");
  const [appVersion, setAppVersion] = useState(DEFAULT_APP_VERSION);
  const [buildMode, setBuildMode] = useState<BuildMode>("debug");
  const [saving, setSaving] = useState(false);
  const [preflight, setPreflight] = useState<ProjectPreflight | null>(null);

  const selectedType = useMemo(() => PROJECT_TYPES.find((type) => type.id === projectType) ?? null, [projectType]);
  const appIdentity = useMemo(() => readAppIdentity(packageName, appVersion), [appVersion, packageName]);
  const canPrepare = Boolean(projectType && archive && preflight && !preflight.hasBlockers && projectName.trim() && appIdentity.valid && !saving);

  async function inspectSelectedSource(nextType: ProjectType, source: SelectedSource) {
    try {
      const report = await inspectProjectSource({ projectType: nextType, uri: source.uri, preparedFromHtml: source.preparedFromHtml });
      setPreflight(report);
      return report;
    } catch (error) {
      const report: ProjectPreflight = {
        entryCount: 0,
        hasBlockers: true,
        findings: [{ level: "blocker", message: error instanceof Error ? error.message : "Le contrôle du ZIP n’a pas pu être terminé." }],
      };
      setPreflight(report);
      return report;
    }
  }

  useFocusEffect(useCallback(() => {
    let active = true;

    void (async () => {
      const [draft, miaLogo] = await Promise.all([takeAssistantDraft(), takeMiaLogoDraft()]);
      if ((!draft && !miaLogo) || !active) return;
      try {
        let importedCode = false;
        let importedLogo = false;
        if (draft) {
          const prepared = await prepareAssistantHtmlSource(draft.code);
          if (!active) return;
          setProjectType("html");
          setArchive(prepared);
          await inspectSelectedSource("html", prepared);
          setProjectName(draft.projectName);
          setPackageName(getProjectPackageName(draft.projectName));
          importedCode = true;
        }

        if (miaLogo) {
          const normalized = await ImageManipulator.manipulateAsync(
            miaLogo.uri,
            [{ resize: { width: 512, height: 512 } }],
            { compress: 1, format: ImageManipulator.SaveFormat.PNG },
          );
          const info = await FileSystem.getInfoAsync(normalized.uri);
          if (!info.exists) throw new Error("Le logo MIA n’est plus disponible sur le téléphone.");
          if (!active) return;
          setCustomIcon({
            name: miaLogo.name.replace(/\.(png|jpe?g|webp)$/i, "") + ".png",
            size: "size" in info && typeof info.size === "number" ? info.size : undefined,
            uri: normalized.uri,
          });
          if (!projectName.trim() && !draft) {
            setProjectName(miaLogo.appName);
            if (packageName === "com.oneapp.monapp") setPackageName(getProjectPackageName(miaLogo.appName));
          }
          importedLogo = true;
        }

        if (!active) return;
        if (importedCode && importedLogo) {
          Alert.alert("Code et logo ajoutés", "Votre index.html et votre icône MIA sont prêts. Vous pouvez lancer la compilation.");
        } else if (importedCode) {
          Alert.alert("Code IA ajouté", "Votre index.html est prêt. Vous pouvez maintenant choisir une icône et lancer la compilation.");
        } else if (importedLogo) {
          Alert.alert("Logo MIA ajouté", "Votre logo est sélectionné comme icône personnalisée pour la prochaine APK.");
        }
      } catch (error) {
        if (active) Alert.alert("Élément MIA non ajouté", error instanceof Error ? error.message : "Réessayez depuis MIA.");
      }
    })();

    return () => { active = false; };
  }, []));

  async function handlePickArchive() {
    if (!projectType) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: projectType === "html"
          ? ["text/html", "application/xhtml+xml", "application/zip", "application/x-zip-compressed", "application/octet-stream"]
          : ["application/zip", "application/x-zip-compressed", "application/octet-stream"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;

      const selected = result.assets[0];
      const selectedName = selected.name ?? "index.html";
      const directHtml = projectType === "html" && isHtmlFile(selectedName);
      const validation = directHtml
        ? selected.size && selected.size > MAX_SOURCE_SIZE ? { valid: false, reason: "Fichier trop grand" } : { valid: true, reason: null }
        : validateProjectArchive(selectedName, selected.size);
      if (!validation.valid) {
        const message = validation.reason === "Archive ZIP requise"
          ? projectType === "html"
            ? "Choisissez index.html directement, ou un ZIP contenant index.html et vos images, CSS ou JavaScript."
            : "Choisissez un seul fichier se terminant par .zip."
          : `Choisissez un fichier de ${Math.round(MAX_SOURCE_SIZE / (1024 * 1024))} Mo maximum.`;
        Alert.alert(validation.reason ?? "Import impossible", message);
        return;
      }
      const rawSource: SelectedSource = { name: selectedName, size: selected.size, uri: selected.uri };
      const source: SelectedSource | PreparedHtmlSource = directHtml ? await prepareDirectHtmlSource(selected) : rawSource;
      setArchive(source);
      await inspectSelectedSource(projectType, source);
      if (!projectName.trim()) {
        const suggestedName = selectedName.replace(/\.(zip|html?)$/i, "");
        setProjectName(suggestedName);
        if (packageName === "com.oneapp.monapp") setPackageName(getProjectPackageName(suggestedName));
      }
    } catch (error) {
      Alert.alert("Import impossible", error instanceof Error ? error.message : "Le fichier n’a pas pu être sélectionné. Réessayez.");
    }
  }

  async function handleUseStarter(starterId: StarterProjectId) {
    try {
      const source = prepareStarterProject(starterId);
      setProjectType(source.projectType);
      setArchive(source);
      setProjectName(source.projectName);
      setPackageName(getProjectPackageName(source.projectName));
      await inspectSelectedSource(source.projectType, source);
      Alert.alert("Modèle prêt", `Le modèle ${source.projectType === "html" ? "HTML" : source.projectType === "expo" ? "Expo" : "Android"} est prêt à modifier ou à compiler.`);
    } catch (error) {
      Alert.alert("Modèle non ajouté", error instanceof Error ? error.message : "Réessayez dans un instant.");
    }
  }

  async function handlePickCustomIcon() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (result.canceled) return;

      const selected = result.assets[0];
      const normalized = await ImageManipulator.manipulateAsync(
        selected.uri,
        [{ resize: { width: 512, height: 512 } }],
        { compress: 1, format: ImageManipulator.SaveFormat.PNG },
      );
      const info = await FileSystem.getInfoAsync(normalized.uri);
      setCustomIcon({
        name: "icone-personnalisee.png",
        size: "size" in info && typeof info.size === "number" ? info.size : undefined,
        uri: normalized.uri,
      });
    } catch (error) {
      Alert.alert("Icône non sélectionnée", error instanceof Error ? error.message : "Choisissez une image carrée, puis réessayez.");
    }
  }

  async function handlePrepareBuild() {
    if (!projectType || !archive || !projectName.trim()) return;
    if (!appIdentity.valid) {
      Alert.alert("Paramètres à corriger", appIdentity.message);
      return;
    }
    try {
      setSaving(true);
      const report = preflight ?? await inspectSelectedSource(projectType, archive);
      if (report.hasBlockers) {
        Alert.alert("Projet à corriger", "MIA💻 a trouvé au moins un blocage dans la structure du projet. Corrigez les éléments indiqués avant d’envoyer la compilation.");
        return;
      }
      const job = await createLocalBuildDraft({
        projectName,
        projectType,
        sourceName: archive.name,
        sourceSize: archive.size,
        sourceUri: archive.uri,
        iconName: customIcon?.name,
        iconSize: customIcon?.size,
        iconUri: customIcon?.uri,
        packageName: appIdentity.packageName,
        appVersion: appIdentity.appVersion,
        buildMode,
      });
      await submitBuildJob(job);
      const notificationsEnabled = await enableBuildNotifications();
      Alert.alert(
        "Compilation lancée",
        buildMode === "signed"
          ? `${notificationsEnabled ? "MIA💻 vous préviendra dès que l’APK sera prête. " : ""}MIA💻 prépare une APK signée. Quand elle sera prête, téléchargez aussi la sauvegarde de clé une seule fois depuis Mes APK.`
          : `${notificationsEnabled ? "MIA💻 vous préviendra dès que l’APK sera prête. " : ""}MIA💻 prépare votre APK de test. Vous verrez son avancement dans Mes APK.`,
        [{ text: "Voir mes APK", onPress: () => router.replace("/(tabs)") }],
      );
    } catch (error) {
      Alert.alert("Compilation non lancée", error instanceof Error ? error.message : "Vérifiez votre connexion et réessayez.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer className="flex-1" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.headerLabel}><View style={[styles.headerLabelDot, { backgroundColor: colors.success }]} /><Text style={[styles.headerEyebrow, { color: colors.primary }]}>MIA💻 · NOUVEAU PROJET</Text></View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Construisez votre APK.</Text>
          <Text style={[styles.headerText, { color: colors.muted }]}>Choisissez, importez, configurez. Le reste est guidé étape par étape.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir l’assistant de code" onPress={() => router.navigate("/(tabs)/assistant")} style={({ pressed }) => [styles.assistantLink, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}55` }, pressed && styles.pressed]}>
            <MaterialIcons color={colors.primary} name="auto-awesome" size={18} />
            <Text style={[styles.assistantLinkText, { color: colors.primary }]}>Besoin d’aide pour écrire votre code ?</Text>
            <MaterialIcons color={colors.primary} name="arrow-forward-ios" size={14} />
          </Pressable>
        </View>

        <View style={[styles.stepPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <View style={styles.progressRow}>
            {[1, 2, 3].map((step, index) => {
              const done = (step === 1 && projectType) || (step === 2 && archive) || (step === 3 && projectName.trim());
              const active = (step === 1 && !projectType) || (step === 2 && projectType && !archive) || (step === 3 && archive && !projectName.trim());
              return (
                <View key={step} style={styles.progressItem}>
                  <View style={[styles.stepBubble, { borderColor: done || active ? colors.primary : colors.border, backgroundColor: done ? colors.primary : colors.background }]}>
                    {done ? <MaterialIcons color={colors.background} name="check" size={15} /> : <Text style={[styles.stepNumber, { color: active ? colors.primary : colors.muted }]}>{step}</Text>}
                  </View>
                  {index < 2 ? <View style={[styles.stepLine, { backgroundColor: done ? colors.primary : colors.border }]} /> : null}
                </View>
              );
            })}
          </View>
          <Text style={[styles.progressText, { color: colors.muted }]}>{!projectType ? "Étape 1 · Choisissez votre type de code" : !archive ? "Étape 2 · Ajoutez votre fichier" : "Étape 3 · Donnez une identité à votre APK"}</Text>
        </View>

        <View style={[styles.starterPanel, { backgroundColor: `${colors.primary}0D`, borderColor: `${colors.primary}45` }]}>
          <View style={styles.starterTitleRow}><MaterialIcons color={colors.primary} name="auto-awesome" size={18} /><View style={styles.starterCopy}><Text style={[styles.starterTitle, { color: colors.foreground }]}>Démarrer sans fichier</Text><Text style={[styles.starterText, { color: colors.muted }]}>Choisissez un modèle déjà compatible avec le compilateur.</Text></View></View>
          <View style={styles.starterList}>
            {STARTER_PROJECTS.map((starter) => (
              <Pressable key={starter.id} accessibilityRole="button" accessibilityLabel={`Utiliser le ${starter.title}`} disabled={saving} onPress={() => { void handleUseStarter(starter.id); }} style={({ pressed }) => [styles.starterButton, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}>
                <MaterialIcons color={colors.primary} name={starter.id === "html" ? "language" : starter.id === "expo" ? "code" : "android"} size={18} />
                <View style={styles.starterButtonCopy}><Text style={[styles.starterButtonTitle, { color: colors.foreground }]}>{starter.title}</Text><Text numberOfLines={1} style={[styles.starterButtonText, { color: colors.muted }]}>{starter.description}</Text></View>
                <MaterialIcons color={colors.primary} name="arrow-forward-ios" size={13} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.sectionHead}>
          <View style={[styles.sectionNumber, { backgroundColor: colors.primary }]}><Text style={[styles.sectionNumberText, { color: colors.background }]}>1</Text></View>
          <View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quel code voulez-vous compiler ?</Text><Text style={[styles.sectionHint, { color: colors.muted }]}>Le choix ne peut plus changer après l’import.</Text></View>
        </View>

        <View style={styles.typeList}>
          {PROJECT_TYPES.map((type) => {
            const selected = projectType === type.id;
            return (
              <Pressable
                key={type.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={type.label}
                onPress={() => { setProjectType(type.id); setArchive(null); setPreflight(null); }}
                style={({ pressed }) => [styles.typeRow, { backgroundColor: selected ? `${colors.primary}13` : colors.surface, borderColor: selected ? colors.primary : colors.border }, pressed && styles.pressed]}
              >
                <View style={[styles.typeIcon, { backgroundColor: selected ? colors.primary : colors.background }]}>
                  <MaterialIcons color={selected ? colors.background : colors.primary} name={TYPE_ICONS[type.id]} size={23} />
                </View>
                <View style={styles.typeCopy}>
                  <Text style={[styles.typeTitle, { color: colors.foreground }]}>{type.label}</Text>
                  <Text style={[styles.typeDescription, { color: colors.muted }]}>{type.description}</Text>
                </View>
                <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.border }]}>{selected ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}</View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHead}>
          <View style={[styles.sectionNumber, { backgroundColor: projectType ? colors.primary : colors.surface }]}><Text style={[styles.sectionNumberText, { color: projectType ? colors.background : colors.muted }]}>2</Text></View>
          <View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ajoutez le fichier du projet</Text><Text style={[styles.sectionHint, { color: colors.muted }]}>{selectedType ? selectedType.expected : "Choisissez d’abord le type de code."}</Text></View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={projectType === "html" ? "Choisir index.html ou un fichier ZIP" : "Choisir un fichier ZIP"}
          disabled={!projectType || saving}
          onPress={handlePickArchive}
          style={({ pressed }) => [styles.importZone, { backgroundColor: projectType ? colors.surface : `${colors.surface}88`, borderColor: projectType ? colors.border : "transparent" }, pressed && projectType && styles.pressed]}
        >
          <View style={[styles.importIcon, { backgroundColor: projectType ? `${colors.primary}18` : colors.background }]}><MaterialIcons color={projectType ? colors.primary : colors.muted} name="upload-file" size={25} /></View>
          <View style={styles.importCopy}>
            <Text style={[styles.importTitle, { color: projectType ? colors.foreground : colors.muted }]}>{projectType === "html" ? "Choisir index.html ou un ZIP" : "Choisir un fichier ZIP"}</Text>
            <Text style={[styles.importText, { color: colors.muted }]}>{projectType === "html" ? "index.html seul ou ZIP avec tous les fichiers" : projectType ? "Un ZIP de 50 Mo maximum" : "Débloqué après le choix du type"}</Text>
          </View>
          <MaterialIcons color={projectType ? colors.primary : colors.muted} name="arrow-forward-ios" size={17} />
        </Pressable>

        {archive ? (
          <View style={[styles.selectedFile, { backgroundColor: `${colors.success}12`, borderColor: `${colors.success}55` }]}> 
            <View style={[styles.fileCheck, { backgroundColor: `${colors.success}22` }]}><MaterialIcons color={colors.success} name="check" size={18} /></View>
            <View style={styles.fileCopy}><Text numberOfLines={1} style={[styles.fileName, { color: colors.foreground }]}>{archive.name}</Text><Text style={[styles.fileDetail, { color: colors.muted }]}>{formatBytes(archive.size)} · {archive.preparedFromTemplate ? "Modèle prêt à modifier" : archive.preparedFromHtml ? "HTML prêt à compiler" : "Fichier reconnu"}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Retirer le fichier" onPress={() => { setArchive(null); setPreflight(null); }} style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}><MaterialIcons color={colors.muted} name="close" size={20} /></Pressable>
          </View>
        ) : null}

        {preflight ? (
          <View style={[styles.preflightPanel, { backgroundColor: preflight.hasBlockers ? `${colors.error}10` : `${colors.success}10`, borderColor: preflight.hasBlockers ? `${colors.error}55` : `${colors.success}55` }]}>
            <View style={styles.preflightHeader}><MaterialIcons color={preflight.hasBlockers ? colors.error : colors.success} name={preflight.hasBlockers ? "warning-amber" : "verified"} size={20} /><View><Text style={[styles.preflightTitle, { color: colors.foreground }]}>{preflight.hasBlockers ? "À corriger avant l’envoi" : "Contrôle avant envoi terminé"}</Text><Text style={[styles.preflightSubtitle, { color: colors.muted }]}>{preflight.entryCount} fichier{preflight.entryCount > 1 ? "s" : ""} vérifié{preflight.entryCount > 1 ? "s" : ""} sur votre téléphone</Text></View></View>
            {preflight.findings.map((finding, index) => <View key={`${finding.level}-${index}`} style={styles.preflightFinding}><MaterialIcons color={finding.level === "blocker" ? colors.error : finding.level === "warning" ? colors.primary : colors.success} name={finding.level === "blocker" ? "cancel" : finding.level === "warning" ? "info-outline" : "check-circle"} size={15} /><Text style={[styles.preflightFindingText, { color: colors.muted }]}>{finding.message}</Text></View>)}
          </View>
        ) : null}

        <View style={styles.optionalHead}>
          <View style={[styles.optionalBadge, { backgroundColor: `${colors.primary}18` }]}><MaterialIcons color={colors.primary} name="image" size={17} /></View>
          <View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Icône de l’APK</Text><Text style={[styles.sectionHint, { color: colors.muted }]}>Optionnel. Une image carrée sera utilisée sur le téléphone.</Text></View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choisir une icône personnalisée"
          disabled={saving}
          onPress={handlePickCustomIcon}
          style={({ pressed }) => [styles.iconPicker, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}
        >
          {customIcon ? <Image source={{ uri: customIcon.uri }} style={styles.iconPreview} /> : <View style={[styles.iconPlaceholder, { backgroundColor: `${colors.primary}18` }]}><MaterialIcons color={colors.primary} name="add-photo-alternate" size={24} /></View>}
          <View style={styles.iconPickerCopy}>
            <Text style={[styles.iconPickerTitle, { color: colors.foreground }]}>{customIcon ? "Icône personnalisée prête" : "Choisir une image"}</Text>
            <Text style={[styles.iconPickerText, { color: colors.muted }]}>{customIcon ? `${formatBytes(customIcon.size)} · Formatée en PNG 512 × 512` : "Galerie du téléphone · PNG, JPG ou WebP"}</Text>
          </View>
          {customIcon ? <Pressable accessibilityRole="button" accessibilityLabel="Retirer l’icône personnalisée" onPress={() => setCustomIcon(null)} style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}><MaterialIcons color={colors.muted} name="close" size={20} /></Pressable> : <MaterialIcons color={colors.primary} name="arrow-forward-ios" size={17} />}
        </Pressable>

        <View style={styles.sectionHead}>
          <View style={[styles.sectionNumber, { backgroundColor: archive ? colors.primary : colors.surface }]}><Text style={[styles.sectionNumberText, { color: archive ? colors.background : colors.muted }]}>3</Text></View>
          <View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Nommez ce projet</Text><Text style={[styles.sectionHint, { color: colors.muted }]}>Ce nom sera visible dans votre liste de builds.</Text></View>
        </View>
        <TextInput value={projectName} onChangeText={setProjectName} editable={!saving} placeholder="Ex. Ma première application" placeholderTextColor={colors.muted} returnKeyType="done" style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]} />

        <View style={styles.optionalHead}>
          <View style={[styles.optionalBadge, { backgroundColor: `${colors.primary}18` }]}><MaterialIcons color={colors.primary} name="settings-applications" size={17} /></View>
          <View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Identité de l’APK</Text><Text style={[styles.sectionHint, { color: colors.muted }]}>Ces paramètres seront intégrés à l’application générée.</Text></View>
        </View>
        <View style={styles.identityFields}>
          <View style={styles.identityField}>
            <Text style={[styles.identityLabel, { color: colors.muted }]}>Nom du package Android</Text>
            <TextInput value={packageName} onChangeText={setPackageName} editable={!saving} autoCapitalize="none" autoCorrect={false} placeholder="com.monentreprise.monapp" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.surface, borderColor: appIdentity.valid ? colors.border : colors.error, color: colors.foreground }]} />
          </View>
          <View style={styles.identityFieldSmall}>
            <Text style={[styles.identityLabel, { color: colors.muted }]}>Version</Text>
            <TextInput value={appVersion} onChangeText={setAppVersion} editable={!saving} autoCapitalize="none" autoCorrect={false} keyboardType="decimal-pad" placeholder="1.0.0" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.surface, borderColor: appIdentity.valid ? colors.border : colors.error, color: colors.foreground }]} />
          </View>
        </View>
        {!appIdentity.valid ? <Text style={[styles.identityError, { color: colors.error }]}>{appIdentity.message}</Text> : null}

        <View style={styles.optionalHead}>
          <View style={[styles.optionalBadge, { backgroundColor: `${colors.primary}18` }]}><MaterialIcons color={colors.primary} name="verified-user" size={17} /></View>
          <View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Type d’APK</Text><Text style={[styles.sectionHint, { color: colors.muted }]}>Choisissez une version de test ou une version prête à signer pour une publication.</Text></View>
        </View>
        <View style={styles.buildModeList}>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: buildMode === "debug" }}
            accessibilityLabel="APK de test"
            disabled={saving}
            onPress={() => setBuildMode("debug")}
            style={({ pressed }) => [styles.buildModeRow, { backgroundColor: buildMode === "debug" ? `${colors.primary}13` : colors.surface, borderColor: buildMode === "debug" ? colors.primary : colors.border }, pressed && styles.pressed]}
          >
            <View style={[styles.buildModeIcon, { backgroundColor: buildMode === "debug" ? colors.primary : colors.background }]}><MaterialIcons color={buildMode === "debug" ? colors.background : colors.primary} name="science" size={21} /></View>
            <View style={styles.buildModeCopy}><Text style={[styles.buildModeTitle, { color: colors.foreground }]}>APK de test</Text><Text style={[styles.buildModeText, { color: colors.muted }]}>À installer et essayer immédiatement sur Android.</Text></View>
            <View style={[styles.radio, { borderColor: buildMode === "debug" ? colors.primary : colors.border }]}>{buildMode === "debug" ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}</View>
          </Pressable>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: buildMode === "signed" }}
            accessibilityLabel="APK signée pour publication"
            disabled={saving}
            onPress={() => setBuildMode("signed")}
            style={({ pressed }) => [styles.buildModeRow, { backgroundColor: buildMode === "signed" ? `${colors.success}12` : colors.surface, borderColor: buildMode === "signed" ? colors.success : colors.border }, pressed && styles.pressed]}
          >
            <View style={[styles.buildModeIcon, { backgroundColor: buildMode === "signed" ? colors.success : colors.background }]}><MaterialIcons color={buildMode === "signed" ? colors.background : colors.success} name="workspace-premium" size={21} /></View>
            <View style={styles.buildModeCopy}><Text style={[styles.buildModeTitle, { color: colors.foreground }]}>APK signée</Text><Text style={[styles.buildModeText, { color: colors.muted }]}>Crée une clé unique pour cette application et une APK de publication.</Text></View>
            <View style={[styles.radio, { borderColor: buildMode === "signed" ? colors.success : colors.border }]}>{buildMode === "signed" ? <View style={[styles.radioDot, { backgroundColor: colors.success }]} /> : null}</View>
          </Pressable>
        </View>
        {buildMode === "signed" ? (
          <View style={[styles.signingNote, { backgroundColor: `${colors.success}10`, borderColor: `${colors.success}55` }]}>
            <MaterialIcons color={colors.success} name="key" size={20} />
            <Text style={[styles.signingText, { color: colors.muted }]}>Après la compilation, sauvegardez le fichier de clé proposé dans Builds. Il est nécessaire pour publier une mise à jour de la même application et ne pourra être téléchargé qu’une fois.</Text>
          </View>
        ) : null}

        <View style={[styles.securityNote, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MaterialIcons color={colors.primary} name="shield" size={20} />
          <Text style={[styles.securityText, { color: colors.muted }]}>N’ajoutez jamais de mot de passe, clé privée ou information personnelle dans votre fichier.</Text>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Lancer la compilation" disabled={!canPrepare} onPress={handlePrepareBuild} style={({ pressed }) => [styles.submitButton, { backgroundColor: canPrepare ? colors.primary : colors.surface, borderColor: canPrepare ? colors.primary : colors.border }, pressed && canPrepare && styles.pressed]}>
          <View><Text style={[styles.submitTitle, { color: canPrepare ? colors.background : colors.muted }]}>{saving ? "Envoi du projet…" : "Lancer la compilation"}</Text><Text style={[styles.submitText, { color: canPrepare ? colors.background : colors.muted }]}>{saving ? "Patientez un instant" : buildMode === "signed" ? "Sortie : APK Android signée" : "Sortie : APK Android de test"}</Text></View>
          <MaterialIcons color={canPrepare ? colors.background : colors.muted} name="arrow-forward" size={23} />
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 32 },
  header: { marginBottom: 22 },
  headerLabel: { flexDirection: "row", alignItems: "center", gap: 7 },
  headerLabelDot: { width: 7, height: 7, borderRadius: 4 },
  headerEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  headerTitle: { marginTop: 9, fontSize: 30, fontWeight: "900", letterSpacing: -1 },
  headerText: { marginTop: 7, maxWidth: 335, fontSize: 13, lineHeight: 20 },
  assistantLink: { alignSelf: "flex-start", minHeight: 42, borderWidth: 1, borderRadius: 14, marginTop: 14, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  assistantLinkText: { fontSize: 11, fontWeight: "800" },
  starterPanel: { borderWidth: 1, borderRadius: 19, padding: 13, marginBottom: 27 },
  starterTitleRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  starterCopy: { flex: 1 },
  starterTitle: { fontSize: 14, fontWeight: "900" },
  starterText: { marginTop: 2, fontSize: 10.5, lineHeight: 15 },
  starterList: { marginTop: 11, gap: 7 },
  starterButton: { minHeight: 53, borderWidth: 1, borderRadius: 13, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 9 },
  starterButtonCopy: { flex: 1 },
  starterButtonTitle: { fontSize: 12, fontWeight: "900" },
  starterButtonText: { marginTop: 2, fontSize: 10, lineHeight: 14 },
  stepPanel: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 15, marginBottom: 29 },
  progressRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  progressItem: { flexDirection: "row", alignItems: "center" },
  stepBubble: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  stepNumber: { fontSize: 12, fontWeight: "900" },
  stepLine: { width: 82, height: 2, marginHorizontal: 7, borderRadius: 1 },
  progressText: { marginTop: 10, textAlign: "center", fontSize: 12, fontWeight: "600" },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  sectionNumber: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sectionNumberText: { fontSize: 12, fontWeight: "900" },
  sectionTitle: { fontSize: 15, fontWeight: "800" },
  sectionHint: { fontSize: 11, marginTop: 2 },
  typeList: { gap: 9, marginBottom: 27 },
  typeRow: { minHeight: 76, borderWidth: 1, borderRadius: 19, padding: 13, flexDirection: "row", alignItems: "center" },
  typeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 11 },
  typeCopy: { flex: 1, paddingRight: 8 },
  typeTitle: { fontSize: 14, fontWeight: "800" },
  typeDescription: { marginTop: 2, fontSize: 11, lineHeight: 16 },
  radio: { width: 21, height: 21, borderRadius: 11, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  importZone: { minHeight: 94, borderWidth: 1, borderStyle: "dashed", borderRadius: 19, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", marginBottom: 12 },
  importIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 11 },
  importCopy: { flex: 1 },
  importTitle: { fontSize: 14, fontWeight: "800" },
  importText: { marginTop: 3, fontSize: 11, lineHeight: 16 },
  selectedFile: { minHeight: 68, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", marginBottom: 27 },
  fileCheck: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", marginRight: 10 },
  fileCopy: { flex: 1, minWidth: 0 },
  fileName: { fontSize: 13, fontWeight: "800" },
  fileDetail: { marginTop: 2, fontSize: 11 },
  preflightPanel: { borderWidth: 1, borderRadius: 16, padding: 13, marginTop: -17, marginBottom: 27 },
  preflightHeader: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 9 },
  preflightTitle: { fontSize: 13, fontWeight: "900" },
  preflightSubtitle: { fontSize: 10.5, marginTop: 1 },
  preflightFinding: { flexDirection: "row", alignItems: "flex-start", gap: 7, marginTop: 6 },
  preflightFindingText: { flex: 1, fontSize: 10.5, lineHeight: 15 },
  removeButton: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  optionalHead: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 9, marginBottom: 12 },
  optionalBadge: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  iconPicker: { minHeight: 78, borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", marginBottom: 27 },
  iconPlaceholder: { width: 50, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  iconPreview: { width: 50, height: 50, borderRadius: 14, marginRight: 11 },
  iconPickerCopy: { flex: 1, marginLeft: 11 },
  iconPickerTitle: { fontSize: 14, fontWeight: "800" },
  iconPickerText: { marginTop: 2, fontSize: 11, lineHeight: 16 },
  input: { minHeight: 53, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, fontSize: 15, marginBottom: 16 },
  identityFields: { flexDirection: "row", gap: 10 },
  identityField: { flex: 1.8 },
  identityFieldSmall: { flex: 0.9 },
  identityLabel: { fontSize: 11, fontWeight: "700", marginBottom: 6, marginLeft: 2 },
  identityError: { marginTop: -8, marginBottom: 16, fontSize: 11, lineHeight: 16 },
  buildModeList: { gap: 9, marginBottom: 12 },
  buildModeRow: { minHeight: 77, borderWidth: 1, borderRadius: 18, padding: 12, flexDirection: "row", alignItems: "center" },
  buildModeIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", marginRight: 11 },
  buildModeCopy: { flex: 1, paddingRight: 9 },
  buildModeTitle: { fontSize: 13, fontWeight: "800" },
  buildModeText: { marginTop: 3, fontSize: 10.5, lineHeight: 15 },
  signingNote: { borderWidth: 1, borderRadius: 16, padding: 13, flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 15 },
  signingText: { flex: 1, fontSize: 11, lineHeight: 17 },
  securityNote: { borderWidth: 1, borderRadius: 16, padding: 13, flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 18 },
  securityText: { flex: 1, fontSize: 11, lineHeight: 17 },
  submitButton: { minHeight: 64, borderRadius: 18, borderWidth: 1, paddingHorizontal: 17, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  submitTitle: { fontSize: 15, fontWeight: "900" },
  submitText: { marginTop: 2, fontSize: 11, fontWeight: "600", opacity: 0.78 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});
