import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  createLocalBuildDraft,
  formatBytes,
  PROJECT_TYPES,
  submitBuildJob,
  type ProjectType,
} from "@/lib/build-store";
import { prepareDirectHtmlSource, type PreparedHtmlSource } from "@/lib/html-direct-import";
import { MAX_SOURCE_SIZE, isHtmlFile, validateProjectArchive } from "@/lib/project-import";

type SelectedSource = Pick<DocumentPicker.DocumentPickerAsset, "name" | "size" | "uri"> & {
  preparedFromHtml?: boolean;
};

export default function NewBuildScreen() {
  const colors = useColors();
  const [projectType, setProjectType] = useState<ProjectType | null>(null);
  const [projectName, setProjectName] = useState("");
  const [archive, setArchive] = useState<SelectedSource | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedType = useMemo(
    () => PROJECT_TYPES.find((type) => type.id === projectType) ?? null,
    [projectType],
  );
  const canPrepare = Boolean(projectType && archive && projectName.trim() && !saving);

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
      const selectedSource: SelectedSource = {
        name: selectedName,
        size: selected.size,
        uri: selected.uri,
      };

      const directHtml = projectType === "html" && isHtmlFile(selectedName);
      const validation = directHtml
        ? selected.size && selected.size > MAX_SOURCE_SIZE
          ? { valid: false, reason: "Fichier trop grand" }
          : { valid: true, reason: null }
        : validateProjectArchive(selectedName, selected.size);
      if (!validation.valid) {
        const message = validation.reason === "Archive ZIP requise"
          ? projectType === "html"
            ? "Choisissez index.html directement, ou un fichier ZIP contenant index.html et vos images, CSS ou JavaScript."
            : "Choisissez un seul fichier se terminant par .zip."
          : `Pour ce premier test, choisissez un ZIP de ${Math.round(MAX_SOURCE_SIZE / (1024 * 1024))} Mo maximum.`;
        Alert.alert(validation.reason ?? "Import impossible", message);
        return;
      }

      const source: SelectedSource | PreparedHtmlSource = directHtml
        ? await prepareDirectHtmlSource(selected)
        : selectedSource;
      setArchive(source);
      if (!projectName.trim()) {
        setProjectName(selectedName.replace(/\.(zip|html?)$/i, ""));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Le fichier n’a pas pu être sélectionné. Réessayez.";
      Alert.alert("Import impossible", message);
    }
  }

  async function handlePrepareBuild() {
    if (!projectType || !archive || !projectName.trim()) return;

    try {
      setSaving(true);
      const job = await createLocalBuildDraft({
        projectName,
        projectType,
        sourceName: archive.name,
        sourceSize: archive.size,
        sourceUri: archive.uri,
      });
      await submitBuildJob(job);
      Alert.alert(
        "Compilation lancée",
        "One App prépare maintenant votre APK. Vous verrez son avancement dans Mes builds.",
        [{ text: "Voir mes builds", onPress: () => router.replace("/(tabs)") }],
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Vérifiez votre connexion et l’espace libre de votre téléphone puis réessayez.";
      Alert.alert("Compilation non lancée", message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer className="flex-1" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Nouveau build</Text>
          <Text style={[styles.headerText, { color: colors.muted }]}>Choisissez votre projet avant d’envoyer le code.</Text>
        </View>

        <View style={styles.stepRow}>
          <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}><Text style={[styles.stepBadgeText, { color: colors.background }]}>1</Text></View>
          <View><Text style={[styles.stepLabel, { color: colors.foreground }]}>Type de projet</Text><Text style={[styles.stepHint, { color: colors.muted }]}>Obligatoire avant l’import.</Text></View>
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
                onPress={() => { setProjectType(type.id); setArchive(null); }}
                style={({ pressed }) => [
                  styles.typeCard,
                  { backgroundColor: selected ? `${colors.primary}18` : colors.surface, borderColor: selected ? colors.primary : colors.border },
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.iconTile, { backgroundColor: selected ? colors.primary : colors.background }]}>
                  <Text style={styles.iconTileText}>{type.icon}</Text>
                </View>
                <View style={styles.typeCopy}>
                  <Text style={[styles.typeTitle, { color: colors.foreground }]}>{type.label}</Text>
                  <Text style={[styles.typeDescription, { color: colors.muted }]}>{type.description}</Text>
                </View>
                <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.border }]}>{selected ? <View style={[styles.radioInner, { backgroundColor: colors.primary }]} /> : null}</View>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.stepRow}>
          <View style={[styles.stepBadge, { backgroundColor: projectType ? colors.primary : colors.surface }]}><Text style={[styles.stepBadgeText, { color: projectType ? colors.background : colors.muted }]}>2</Text></View>
          <View><Text style={[styles.stepLabel, { color: colors.foreground }]}>Code du projet</Text><Text style={[styles.stepHint, { color: colors.muted }]}>{selectedType ? selectedType.expected : "Choisissez d’abord le type de projet."}</Text></View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={projectType === "html" ? "Choisir index.html ou une archive ZIP" : "Choisir une archive ZIP"}
          disabled={!projectType || saving}
          onPress={handlePickArchive}
          style={({ pressed }) => [
            styles.archiveButton,
            { backgroundColor: projectType ? colors.surface : `${colors.surface}88`, borderColor: projectType ? colors.border : "transparent" },
            pressed && projectType && styles.pressed,
          ]}
        >
          <Text style={styles.archiveButtonIcon}>⇧</Text>
          <View style={styles.archiveButtonCopy}>
            <Text style={[styles.archiveButtonTitle, { color: projectType ? colors.foreground : colors.muted }]}>{projectType === "html" ? "Choisir index.html ou un ZIP" : "Choisir une archive ZIP"}</Text>
            <Text style={[styles.archiveButtonText, { color: colors.muted }]}>{projectType === "html" ? "index.html seul, ou ZIP pour un site avec des fichiers" : projectType ? "50 Mo maximum pour ce premier test" : "Débloqué après le choix du type"}</Text>
          </View>
        </Pressable>

        {archive ? (
          <View style={[styles.fileCard, { backgroundColor: `${colors.success}12`, borderColor: `${colors.success}55` }]}>
            <Text style={styles.fileIcon}>✓</Text>
            <View style={styles.fileCopy}>
              <Text numberOfLines={1} style={[styles.fileName, { color: colors.foreground }]}>{archive.name}</Text>
              <Text style={[styles.fileSize, { color: colors.muted }]}>{formatBytes(archive.size)} · {archive.preparedFromHtml ? "HTML prêt à compiler" : "ZIP sélectionné"}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Retirer le fichier" onPress={() => setArchive(null)} style={({ pressed }) => [styles.removeFile, pressed && styles.pressed]}>
              <Text style={[styles.removeFileText, { color: colors.primary }]}>Retirer</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.stepRow}>
          <View style={[styles.stepBadge, { backgroundColor: archive ? colors.primary : colors.surface }]}><Text style={[styles.stepBadgeText, { color: archive ? colors.background : colors.muted }]}>3</Text></View>
          <View><Text style={[styles.stepLabel, { color: colors.foreground }]}>Nom du projet</Text><Text style={[styles.stepHint, { color: colors.muted }]}>Il vous aidera à retrouver votre build.</Text></View>
        </View>
        <TextInput
          value={projectName}
          onChangeText={setProjectName}
          editable={!saving}
          placeholder="Ex. Ma première application"
          placeholderTextColor={colors.muted}
          returnKeyType="done"
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
        />

        <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.infoIcon}>ⓘ</Text>
          <Text style={[styles.infoText, { color: colors.muted }]}>{projectType === "html" ? "Vous pouvez choisir index.html directement. Pour inclure des images, CSS ou JavaScript locaux, choisissez plutôt un ZIP contenant tous les fichiers." : "One App envoie votre ZIP de façon sécurisée, fabrique l’APK, puis vous prévient ici dès qu’elle est prête."}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lancer la compilation"
          disabled={!canPrepare}
          onPress={handlePrepareBuild}
          style={({ pressed }) => [styles.submitButton, { backgroundColor: canPrepare ? colors.primary : `${colors.border}99` }, pressed && canPrepare && styles.pressed]}
        >
          <Text style={[styles.submitText, { color: canPrepare ? colors.background : colors.muted }]}>{saving ? "Envoi sécurisé…" : "Lancer la compilation"}</Text>
          <Text style={[styles.submitArrow, { color: canPrepare ? colors.background : colors.muted }]}>→</Text>
        </Pressable>
        <Text style={[styles.testLabel, { color: colors.muted }]}>Sortie prévue : APK debug destinée aux tests.</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 28 },
  header: { marginBottom: 26 },
  headerTitle: { fontSize: 25, fontWeight: "800", letterSpacing: -0.5 },
  headerText: { marginTop: 5, fontSize: 14, lineHeight: 20 },
  stepRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  stepBadge: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  stepBadgeText: { fontSize: 13, fontWeight: "800" },
  stepLabel: { fontSize: 15, fontWeight: "800" },
  stepHint: { fontSize: 12, marginTop: 2 },
  typeList: { gap: 9 },
  typeCard: { borderWidth: 1, borderRadius: 17, padding: 13, flexDirection: "row", alignItems: "center" },
  iconTile: { width: 43, height: 43, borderRadius: 13, alignItems: "center", justifyContent: "center", marginRight: 11 },
  iconTileText: { fontSize: 20 },
  typeCopy: { flex: 1, paddingRight: 10 },
  typeTitle: { fontSize: 14, fontWeight: "800" },
  typeDescription: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 26 },
  archiveButton: { minHeight: 78, borderWidth: 1, borderRadius: 17, borderStyle: "dashed", padding: 15, flexDirection: "row", alignItems: "center", marginBottom: 12 },
  archiveButtonIcon: { fontSize: 24, marginRight: 12 },
  archiveButtonCopy: { flex: 1 },
  archiveButtonTitle: { fontSize: 14, fontWeight: "800" },
  archiveButtonText: { fontSize: 12, marginTop: 3 },
  fileCard: { borderWidth: 1, borderRadius: 14, minHeight: 64, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", marginBottom: 26 },
  fileIcon: { color: "#34D399", fontSize: 20, fontWeight: "900", marginRight: 10 },
  fileCopy: { flex: 1, minWidth: 0 },
  fileName: { fontSize: 13, fontWeight: "800" },
  fileSize: { fontSize: 12, marginTop: 3 },
  removeFile: { paddingLeft: 10, paddingVertical: 8 },
  removeFileText: { fontSize: 12, fontWeight: "800" },
  input: { minHeight: 51, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 15, marginBottom: 19 },
  infoBox: { borderWidth: 1, borderRadius: 15, padding: 13, flexDirection: "row", marginBottom: 18 },
  infoIcon: { fontSize: 16, marginRight: 9 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
  submitButton: { minHeight: 54, borderRadius: 15, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  submitText: { fontSize: 15, fontWeight: "800" },
  submitArrow: { fontSize: 22, fontWeight: "700" },
  testLabel: { textAlign: "center", fontSize: 12, marginTop: 11 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
