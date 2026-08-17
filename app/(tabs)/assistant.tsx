import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  deleteAssistantHistoryEntry,
  generateAssistantCode,
  loadAssistantHistory,
  saveAssistantDraft,
  saveAssistantHistory,
} from "@/lib/ai-code-assistant";
import { PROJECT_TYPES, type ProjectType } from "@/lib/build-store";
import type { AiCodeHistoryEntry, AiCodeResponse } from "@/shared/ai-code";

const TYPE_ICONS: Record<ProjectType, React.ComponentProps<typeof MaterialIcons>["name"]> = {
  expo: "code",
  android: "android",
  html: "language",
};

function historyDate(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Ancien code";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function historyTitle(prompt: string) {
  const compact = prompt.replace(/\s+/g, " ").trim();
  return compact.length > 62 ? `${compact.slice(0, 62)}…` : compact || "Code généré";
}

export default function AssistantScreen() {
  const colors = useColors();
  const [projectType, setProjectType] = useState<ProjectType>("html");
  const [prompt, setPrompt] = useState("");
  const [context, setContext] = useState("");
  const [result, setResult] = useState<AiCodeResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<AiCodeHistoryEntry[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const canGenerate = Boolean(prompt.trim()) && !loading;
  const selectedType = PROJECT_TYPES.find((type) => type.id === projectType)!;

  useEffect(() => {
    let active = true;
    void loadAssistantHistory()
      .then((entries) => {
        if (active) setHistory(entries);
      })
      .finally(() => {
        if (active) setHistoryLoaded(true);
      });
    return () => { active = false; };
  }, []);

  async function handleGenerate() {
    if (!canGenerate) return;
    try {
      setLoading(true);
      setError("");
      const generated = await generateAssistantCode({ prompt, projectType, context });
      setResult(generated);
      try {
        setHistory(await saveAssistantHistory({
          ...generated,
          projectType,
          prompt,
          createdAt: new Date().toISOString(),
        }));
      } catch {
        setError("Le code est prêt, mais son historique n’a pas pu être enregistré sur ce téléphone.");
      }
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "L’assistant ne répond pas. Réessayez dans quelques instants.");
    } finally {
      setLoading(false);
    }
  }

  function openHistoryEntry(entry: AiCodeHistoryEntry) {
    setProjectType(entry.projectType);
    setPrompt(entry.prompt);
    setContext("");
    setResult({ code: entry.code, explanation: entry.explanation });
    setError("");
  }

  function confirmDeleteHistoryEntry(entry: AiCodeHistoryEntry) {
    Alert.alert(
      "Supprimer ce code ?",
      "Cette suppression concerne seulement l’historique de ce téléphone.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            void deleteAssistantHistoryEntry(entry.id)
              .then(setHistory)
              .catch(() => setError("Cet ancien code n’a pas pu être supprimé. Réessayez."));
          },
        },
      ],
    );
  }

  async function handleUseHtmlCode() {
    if (!result || projectType !== "html") return;
    try {
      await saveAssistantDraft({
        ...result,
        projectType,
        projectName: "Mon application IA",
        prompt,
        createdAt: new Date().toISOString(),
      });
      Alert.alert(
        "Code HTML prêt",
        "One App va préparer automatiquement un index.html et remplir le formulaire de compilation.",
        [{ text: "Continuer", onPress: () => router.navigate("/(tabs)/create") }],
      );
    } catch {
      Alert.alert("Préparation impossible", "Le code n’a pas pu être conservé sur ce téléphone. Réessayez.");
    }
  }

  return (
    <ScreenContainer className="flex-1" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.headerLabel}><View style={[styles.headerLabelDot, { backgroundColor: colors.success }]} /><Text style={[styles.headerEyebrow, { color: colors.primary }]}>ONE PEUPLE · IA CODE</Text></View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Écrivez votre idée.</Text>
          <Text style={[styles.headerText, { color: colors.muted }]}>Décrivez ce que vous voulez créer ou corriger. L’assistant prépare du code simple pour votre type de projet.</Text>
        </View>

        <View style={[styles.freeNote, { backgroundColor: `${colors.success}12`, borderColor: `${colors.success}55` }]}>
          <MaterialIcons color={colors.success} name="auto-awesome" size={20} />
          <Text style={[styles.freeNoteText, { color: colors.muted }]}>Assistant gratuit avec une limite de 20 demandes par heure pour protéger le service.</Text>
        </View>

        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <View><Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 2 }]}>Historique IA</Text><Text style={[styles.historyHint, { color: colors.muted }]}>Vos anciens codes restent sur ce téléphone.</Text></View>
            <View style={[styles.historyCount, { backgroundColor: `${colors.primary}1A` }]}><Text style={[styles.historyCountText, { color: colors.primary }]}>{history.length}</Text></View>
          </View>
          {historyLoaded && history.length === 0 ? <Text style={[styles.emptyHistory, { color: colors.muted }]}>Vos prochains codes générés apparaîtront ici.</Text> : null}
          <View style={styles.historyList}>
            {history.map((entry) => (
              <View key={entry.id} style={[styles.historyRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Ouvrir le code : ${historyTitle(entry.prompt)}`} onPress={() => openHistoryEntry(entry)} style={({ pressed }) => [styles.historyOpen, pressed && styles.pressed]}>
                  <View style={[styles.historyIcon, { backgroundColor: `${colors.primary}18` }]}><MaterialIcons color={colors.primary} name={TYPE_ICONS[entry.projectType]} size={18} /></View>
                  <View style={styles.historyCopy}><Text numberOfLines={2} style={[styles.historyTitle, { color: colors.foreground }]}>{historyTitle(entry.prompt)}</Text><Text style={[styles.historyMeta, { color: colors.muted }]}>{PROJECT_TYPES.find((type) => type.id === entry.projectType)?.shortLabel} · {historyDate(entry.createdAt)}</Text></View>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Supprimer ce code de l’historique" onPress={() => confirmDeleteHistoryEntry(entry)} style={({ pressed }) => [styles.historyDelete, { borderColor: colors.border }, pressed && styles.pressed]}><MaterialIcons color={colors.muted} name="delete-outline" size={19} /></Pressable>
              </View>
            ))}
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>1. Quel type de code ?</Text>
        <View style={styles.typeList}>
          {PROJECT_TYPES.map((type) => {
            const selected = type.id === projectType;
            return (
              <Pressable key={type.id} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={type.label} onPress={() => { setProjectType(type.id); setResult(null); setError(""); }} style={({ pressed }) => [styles.typeRow, { backgroundColor: selected ? `${colors.primary}13` : colors.surface, borderColor: selected ? colors.primary : colors.border }, pressed && styles.pressed]}>
                <View style={[styles.typeIcon, { backgroundColor: selected ? colors.primary : colors.background }]}><MaterialIcons color={selected ? colors.background : colors.primary} name={TYPE_ICONS[type.id]} size={21} /></View>
                <View style={styles.typeCopy}><Text style={[styles.typeTitle, { color: colors.foreground }]}>{type.label}</Text><Text style={[styles.typeDescription, { color: colors.muted }]}>{type.expected}</Text></View>
                <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.border }]}>{selected ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}</View>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>2. Décrivez votre besoin</Text>
        <TextInput value={prompt} onChangeText={setPrompt} editable={!loading} maxLength={3500} multiline placeholder={`Ex. Crée une page de connexion avec un bouton vert pour ${selectedType.shortLabel}.`} placeholderTextColor={colors.muted} textAlignVertical="top" style={[styles.promptInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]} />
        <Text style={[styles.counter, { color: colors.muted }]}>{prompt.length}/3500</Text>

        <Text style={[styles.contextLabel, { color: colors.foreground }]}>Code à corriger (facultatif)</Text>
        <TextInput value={context} onChangeText={setContext} editable={!loading} maxLength={7000} multiline autoCapitalize="none" autoCorrect={false} placeholder="Collez ici le code qui pose problème. L’assistant proposera une correction." placeholderTextColor={colors.muted} textAlignVertical="top" style={[styles.contextInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]} />

        <Pressable accessibilityRole="button" accessibilityLabel="Générer le code" disabled={!canGenerate} onPress={handleGenerate} style={({ pressed }) => [styles.generateButton, { backgroundColor: canGenerate ? colors.primary : colors.surface, borderColor: canGenerate ? colors.primary : colors.border }, pressed && canGenerate && styles.pressed]}>
          <View><Text style={[styles.generateTitle, { color: canGenerate ? colors.background : colors.muted }]}>{loading ? "Écriture du code…" : "Écrire le code"}</Text><Text style={[styles.generateText, { color: canGenerate ? colors.background : colors.muted }]}>{loading ? "Patientez un instant" : "Réponse préparée pour votre projet"}</Text></View>
          <MaterialIcons color={canGenerate ? colors.background : colors.muted} name={loading ? "hourglass-top" : "auto-awesome"} size={23} />
        </Pressable>

        {error ? <View style={[styles.errorBox, { backgroundColor: `${colors.error}12`, borderColor: `${colors.error}55` }]}><MaterialIcons color={colors.error} name="error-outline" size={20} /><Text style={[styles.errorText, { color: colors.error }]}>{error}</Text></View> : null}

        {result ? (
          <View style={[styles.resultBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.resultHeader}><View style={[styles.resultBadge, { backgroundColor: `${colors.success}1A` }]}><MaterialIcons color={colors.success} name="check-circle" size={18} /></View><View style={styles.resultHeading}><Text style={[styles.resultTitle, { color: colors.foreground }]}>Code prêt</Text><Text style={[styles.resultExplanation, { color: colors.muted }]}>{result.explanation}</Text></View></View>
            <TextInput value={result.code} editable={false} multiline selectTextOnFocus autoCapitalize="none" autoCorrect={false} textAlignVertical="top" style={[styles.codeBox, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} />
            {projectType === "html" ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Utiliser ce code HTML pour créer une application" onPress={handleUseHtmlCode} style={({ pressed }) => [styles.useButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
                <View><Text style={[styles.useTitle, { color: colors.background }]}>Utiliser ce code</Text><Text style={[styles.useText, { color: colors.background }]}>Prépare index.html pour la compilation</Text></View>
                <MaterialIcons color={colors.background} name="arrow-forward" size={22} />
              </Pressable>
            ) : (
              <View style={[styles.projectNote, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}55` }]}><MaterialIcons color={colors.primary} name="info-outline" size={19} /><Text style={[styles.projectNoteText, { color: colors.muted }]}>Ce code est prêt à placer dans votre ZIP {projectType === "expo" ? "Expo" : "Android"} avant de lancer la compilation.</Text></View>
            )}
          </View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 32 },
  header: { marginBottom: 19 },
  headerLabel: { flexDirection: "row", alignItems: "center", gap: 7 },
  headerLabelDot: { width: 7, height: 7, borderRadius: 4 },
  headerEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  headerTitle: { marginTop: 9, fontSize: 30, fontWeight: "900", letterSpacing: -1 },
  headerText: { marginTop: 7, maxWidth: 340, fontSize: 13, lineHeight: 20 },
  freeNote: { borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 25 },
  freeNoteText: { flex: 1, fontSize: 11, lineHeight: 16 },
  historySection: { marginBottom: 26 },
  historyHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  historyHint: { fontSize: 11, lineHeight: 15 },
  historyCount: { minWidth: 28, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  historyCountText: { fontSize: 12, fontWeight: "900" },
  emptyHistory: { borderWidth: 1, borderColor: "transparent", borderRadius: 15, padding: 13, fontSize: 12, lineHeight: 18 },
  historyList: { gap: 8 },
  historyRow: { minHeight: 68, borderWidth: 1, borderRadius: 17, flexDirection: "row", alignItems: "center" },
  historyOpen: { minHeight: 66, paddingLeft: 11, paddingVertical: 9, paddingRight: 7, flexDirection: "row", alignItems: "center", flex: 1 },
  historyIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 10 },
  historyCopy: { flex: 1, paddingRight: 4 },
  historyTitle: { fontSize: 12, lineHeight: 16, fontWeight: "800" },
  historyMeta: { marginTop: 3, fontSize: 10, fontWeight: "600" },
  historyDelete: { width: 42, height: 42, borderLeftWidth: 1, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 15, fontWeight: "800", marginBottom: 11 },
  typeList: { gap: 8, marginBottom: 26 },
  typeRow: { minHeight: 68, borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, flexDirection: "row", alignItems: "center" },
  typeIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", marginRight: 10 },
  typeCopy: { flex: 1, paddingRight: 7 },
  typeTitle: { fontSize: 13, fontWeight: "800" },
  typeDescription: { marginTop: 2, fontSize: 10, lineHeight: 15 },
  radio: { width: 21, height: 21, borderRadius: 11, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  promptInput: { minHeight: 130, borderWidth: 1, borderRadius: 18, padding: 14, fontSize: 14, lineHeight: 20 },
  counter: { alignSelf: "flex-end", marginTop: 5, marginBottom: 19, fontSize: 10, fontWeight: "700" },
  contextLabel: { fontSize: 13, fontWeight: "800", marginBottom: 9 },
  contextInput: { minHeight: 108, borderWidth: 1, borderRadius: 17, padding: 13, fontSize: 12, lineHeight: 18, marginBottom: 18 },
  generateButton: { minHeight: 64, borderRadius: 18, borderWidth: 1, paddingHorizontal: 17, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 17 },
  generateTitle: { fontSize: 15, fontWeight: "900" },
  generateText: { marginTop: 2, fontSize: 11, fontWeight: "600", opacity: 0.78 },
  errorBox: { borderWidth: 1, borderRadius: 16, padding: 13, flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 17 },
  errorText: { flex: 1, fontSize: 12, fontWeight: "700", lineHeight: 17 },
  resultBox: { borderWidth: 1, borderRadius: 20, padding: 14 },
  resultHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  resultBadge: { width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  resultHeading: { flex: 1 },
  resultTitle: { fontSize: 14, fontWeight: "900" },
  resultExplanation: { marginTop: 2, fontSize: 11, lineHeight: 16 },
  codeBox: { height: 248, borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 14, fontFamily: "monospace", fontSize: 11, lineHeight: 17 },
  useButton: { minHeight: 61, borderRadius: 16, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 },
  useTitle: { fontSize: 14, fontWeight: "900" },
  useText: { marginTop: 2, fontSize: 10, fontWeight: "700", opacity: 0.75 },
  projectNote: { borderWidth: 1, borderRadius: 15, padding: 12, flexDirection: "row", alignItems: "flex-start", gap: 9, marginTop: 14 },
  projectNoteText: { flex: 1, fontSize: 11, lineHeight: 16 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});
