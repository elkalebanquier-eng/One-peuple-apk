import { useMemo, useState } from "react";
import type { ComponentProps } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { createLocalBuildDraft, formatBytes, PROJECT_TYPES, submitBuildJob, type ProjectType } from "@/lib/build-store";
import { prepareDirectHtmlSource, type PreparedHtmlSource } from "@/lib/html-direct-import";
import { MAX_SOURCE_SIZE, isHtmlFile, validateProjectArchive } from "@/lib/project-import";

type IconName = ComponentProps<typeof MaterialIcons>["name"];
type SelectedSource = Pick<DocumentPicker.DocumentPickerAsset, "name" | "size" | "uri"> & { preparedFromHtml?: boolean };

const TYPE_ICONS: Record<ProjectType, IconName> = { expo: "code", android: "android", html: "language" };

export default function NewBuildScreen() {
  const colors = useColors();
  const [projectType, setProjectType] = useState<ProjectType | null>(null);
  const [projectName, setProjectName] = useState("");
  const [archive, setArchive] = useState<SelectedSource | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedType = useMemo(() => PROJECT_TYPES.find((type) => type.id === projectType) ?? null, [projectType]);
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
      if (!projectName.trim()) setProjectName(selectedName.replace(/\.(zip|html?)$/i, ""));
    } catch (error) {
      Alert.alert("Import impossible", error instanceof Error ? error.message : "Le fichier n’a pas pu être sélectionné. Réessayez.");
    }
  }

  async function handlePrepareBuild() {
    if (!projectType || !archive || !projectName.trim()) return;
    try {
      setSaving(true);
      const job = await createLocalBuildDraft({ projectName, projectType, sourceName: archive.name, sourceSize: archive.size, sourceUri: archive.uri });
      await submitBuildJob(job);
      Alert.alert("Compilation lancée", "One App prépare votre APK. Vous verrez son avancement dans Builds.", [{ text: "Voir les builds", onPress: () => router.replace("/(tabs)") }]);
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
          <Text style={[styles.headerEyebrow, { color: colors.primary }]}>NOUVELLE COMPILATION</Text>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Préparez votre APK.</Text>
          <Text style={[styles.headerText, { color: colors.muted }]}>Trois petites étapes. One App vous explique le fichier attendu à chaque fois.</Text>
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
          <Text style={[styles.progressText, { color: colors.muted }]}>{!projectType ? "1. Choisissez votre type de code" : !archive ? "2. Ajoutez votre fichier" : "3. Donnez un nom au projet"}</Text>
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
                onPress={() => { setProjectType(type.id); setArchive(null); }}
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
            <View style={styles.fileCopy}><Text numberOfLines={1} style={[styles.fileName, { color: colors.foreground }]}>{archive.name}</Text><Text style={[styles.fileDetail, { color: colors.muted }]}>{formatBytes(archive.size)} · {archive.preparedFromHtml ? "HTML prêt à compiler" : "Fichier reconnu"}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Retirer le fichier" onPress={() => setArchive(null)} style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}><MaterialIcons color={colors.muted} name="close" size={20} /></Pressable>
          </View>
        ) : null}

        <View style={styles.sectionHead}>
          <View style={[styles.sectionNumber, { backgroundColor: archive ? colors.primary : colors.surface }]}><Text style={[styles.sectionNumberText, { color: archive ? colors.background : colors.muted }]}>3</Text></View>
          <View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Nommez ce projet</Text><Text style={[styles.sectionHint, { color: colors.muted }]}>Ce nom sera visible dans votre liste de builds.</Text></View>
        </View>
        <TextInput value={projectName} onChangeText={setProjectName} editable={!saving} placeholder="Ex. Ma première application" placeholderTextColor={colors.muted} returnKeyType="done" style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]} />

        <View style={[styles.securityNote, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MaterialIcons color={colors.primary} name="shield" size={20} />
          <Text style={[styles.securityText, { color: colors.muted }]}>N’ajoutez jamais de mot de passe, clé privée ou information personnelle dans votre fichier.</Text>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Lancer la compilation" disabled={!canPrepare} onPress={handlePrepareBuild} style={({ pressed }) => [styles.submitButton, { backgroundColor: canPrepare ? colors.primary : colors.surface, borderColor: canPrepare ? colors.primary : colors.border }, pressed && canPrepare && styles.pressed]}>
          <View><Text style={[styles.submitTitle, { color: canPrepare ? colors.background : colors.muted }]}>{saving ? "Envoi du projet…" : "Lancer la compilation"}</Text><Text style={[styles.submitText, { color: canPrepare ? colors.background : colors.muted }]}>{saving ? "Patientez un instant" : "Sortie : APK Android de test"}</Text></View>
          <MaterialIcons color={canPrepare ? colors.background : colors.muted} name="arrow-forward" size={23} />
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 32 },
  header: { marginBottom: 20 },
  headerEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  headerTitle: { marginTop: 5, fontSize: 27, fontWeight: "800", letterSpacing: -0.8 },
  headerText: { marginTop: 6, maxWidth: 335, fontSize: 13, lineHeight: 19 },
  stepPanel: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 14, marginBottom: 27 },
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
  typeRow: { minHeight: 72, borderWidth: 1, borderRadius: 18, padding: 12, flexDirection: "row", alignItems: "center" },
  typeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 11 },
  typeCopy: { flex: 1, paddingRight: 8 },
  typeTitle: { fontSize: 14, fontWeight: "800" },
  typeDescription: { marginTop: 2, fontSize: 11, lineHeight: 16 },
  radio: { width: 21, height: 21, borderRadius: 11, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  importZone: { minHeight: 88, borderWidth: 1, borderStyle: "dashed", borderRadius: 18, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", marginBottom: 12 },
  importIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 11 },
  importCopy: { flex: 1 },
  importTitle: { fontSize: 14, fontWeight: "800" },
  importText: { marginTop: 3, fontSize: 11, lineHeight: 16 },
  selectedFile: { minHeight: 68, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", marginBottom: 27 },
  fileCheck: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", marginRight: 10 },
  fileCopy: { flex: 1, minWidth: 0 },
  fileName: { fontSize: 13, fontWeight: "800" },
  fileDetail: { marginTop: 2, fontSize: 11 },
  removeButton: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  input: { minHeight: 53, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, fontSize: 15, marginBottom: 16 },
  securityNote: { borderWidth: 1, borderRadius: 16, padding: 13, flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 18 },
  securityText: { flex: 1, fontSize: 11, lineHeight: 17 },
  submitButton: { minHeight: 60, borderRadius: 17, borderWidth: 1, paddingHorizontal: 17, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  submitTitle: { fontSize: 15, fontWeight: "900" },
  submitText: { marginTop: 2, fontSize: 11, fontWeight: "600", opacity: 0.78 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});
