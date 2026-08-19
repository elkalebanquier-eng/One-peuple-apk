import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  deleteMiaConversation,
  loadMiaConversations,
  saveAssistantDraft,
  saveMiaConversation,
  sendMiaMessage,
} from "@/lib/ai-code-assistant";
import { PROJECT_TYPES, type ProjectType } from "@/lib/build-store";
import {
  createMiaPreview,
  makeMiaTitle,
  type MiaConversation,
  type MiaMessage,
} from "@/shared/mia-chat";

const TYPE_ICONS: Record<ProjectType, React.ComponentProps<typeof MaterialIcons>["name"]> = {
  expo: "code",
  android: "android",
  html: "language",
};

const QUICK_PROMPTS = [
  { label: "Créer une page", icon: "auto-awesome" as const, value: "Crée une page d’accueil simple et moderne pour mon application." },
  { label: "Corriger du code", icon: "build" as const, value: "Je veux corriger un problème dans mon code. Explique-moi d’abord ce dont tu as besoin." },
  { label: "Idée d’application", icon: "lightbulb-outline" as const, value: "J’ai une idée d’application. Aide-moi à la transformer en une première version simple." },
];

function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Discussion";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function messageId(role: "user" | "assistant") {
  return `mia-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function AssistantScreen() {
  const colors = useColors();
  const inputRef = useRef<TextInput>(null);
  const [conversations, setConversations] = useState<MiaConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [draftProjectType, setDraftProjectType] = useState<ProjectType>("html");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [previewMessage, setPreviewMessage] = useState<MiaMessage | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied" | "error">("idle");

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [activeConversationId, conversations],
  );
  const projectType = activeConversation?.projectType ?? draftProjectType;
  const messages = activeConversation?.messages ?? [];
  const selectedType = PROJECT_TYPES.find((type) => type.id === projectType)!;
  const preview = useMemo(
    () => previewMessage?.code ? createMiaPreview(previewMessage.code) : null,
    [previewMessage],
  );
  const canSend = Boolean(draft.trim()) && !loading;

  useEffect(() => {
    let active = true;
    void loadMiaConversations().then((loaded) => {
      if (active) setConversations(loaded);
    }).catch(() => {
      if (active) setError("Les anciennes discussions MIA ne sont pas disponibles pour le moment.");
    });
    return () => { active = false; };
  }, []);

  function startNewConversation() {
    setActiveConversationId(null);
    setDraftProjectType("html");
    setDraft("");
    setError("");
    setCopyState("idle");
    setHistoryOpen(false);
    setTypePickerOpen(false);
    setPreviewMessage(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function openConversation(conversation: MiaConversation) {
    setActiveConversationId(conversation.id);
    setDraftProjectType(conversation.projectType);
    setDraft("");
    setError("");
    setCopyState("idle");
    setHistoryOpen(false);
    setPreviewMessage(null);
  }

  function selectProjectType(nextType: ProjectType) {
    if (activeConversation) {
      Alert.alert(
        "Type de projet enregistré",
        `Cette discussion utilise déjà ${selectedType.shortLabel}. Lancez un nouveau chat pour choisir un autre type.`,
      );
      setTypePickerOpen(false);
      return;
    }
    setDraftProjectType(nextType);
    setTypePickerOpen(false);
  }

  function useQuickPrompt(value: string) {
    setDraft(value);
    setError("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function persistConversation(conversation: MiaConversation) {
    const next = await saveMiaConversation(conversation);
    setConversations(next);
    setActiveConversationId(conversation.id);
  }

  async function handleSend() {
    const content = draft.trim();
    if (!content || loading) return;

    const now = new Date().toISOString();
    const userMessage: MiaMessage = { id: messageId("user"), role: "user", content, createdAt: now };
    const base: MiaConversation = activeConversation ?? {
      id: `mia-conversation-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title: makeMiaTitle(content),
      projectType,
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    const pendingConversation: MiaConversation = {
      ...base,
      updatedAt: now,
      messages: [...base.messages, userMessage],
    };

    setDraft("");
    setLoading(true);
    setError("");
    try {
      await persistConversation(pendingConversation);
      const answer = await sendMiaMessage({
        message: content,
        projectType,
        history: base.messages,
      });
      const assistantMessage: MiaMessage = {
        id: messageId("assistant"),
        role: "assistant",
        content: answer.message,
        code: answer.code,
        checklist: answer.checklist,
        createdAt: new Date().toISOString(),
      };
      await persistConversation({
        ...pendingConversation,
        updatedAt: assistantMessage.createdAt,
        messages: [...pendingConversation.messages, assistantMessage],
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "MIA ne répond pas. Réessayez dans quelques instants.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(message: MiaMessage) {
    if (!message.code || copyState === "copying") return;
    try {
      setCopyState("copying");
      const copied = await Clipboard.setStringAsync(message.code);
      if (!copied) throw new Error("clipboard-write-failed");
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  async function handlePrepareHtml(message: MiaMessage) {
    if (!message.code || projectType !== "html") return;
    try {
      await saveAssistantDraft({
        code: message.code,
        explanation: message.content,
        projectType: "html",
        projectName: "Mon application MIA",
        prompt: activeConversation?.title ?? "Code MIA",
        createdAt: new Date().toISOString(),
      });
      setPreviewMessage(null);
      Alert.alert(
        "Code HTML prêt",
        "MIA a préparé le fichier. One App va ouvrir la compilation avec votre code déjà placé.",
        [{ text: "Continuer", onPress: () => router.navigate("/(tabs)/create") }],
      );
    } catch {
      Alert.alert("Préparation impossible", "Le code n’a pas pu être conservé sur ce téléphone. Réessayez.");
    }
  }

  function confirmDeleteConversation(conversation: MiaConversation) {
    Alert.alert(
      "Supprimer cette discussion ?",
      "Elle sera supprimée uniquement de ce téléphone.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            void deleteMiaConversation(conversation.id).then((next) => {
              setConversations(next);
              if (conversation.id === activeConversationId) startNewConversation();
            }).catch(() => setError("Cette discussion ne peut pas être supprimée maintenant."));
          },
        },
      ],
    );
  }

  function renderMessage({ item }: { item: MiaMessage }) {
    const assistant = item.role === "assistant";
    return (
      <View style={[styles.messageRow, assistant ? styles.messageRowAssistant : styles.messageRowUser]}>
        {assistant ? <View style={[styles.miaAvatar, { backgroundColor: colors.primary }]}><Text style={[styles.miaAvatarText, { color: colors.background }]}>M</Text></View> : null}
        <View style={[styles.messageColumn, assistant ? styles.messageColumnAssistant : styles.messageColumnUser]}>
          {assistant ? <Text style={[styles.senderName, { color: colors.primary }]}>MIA</Text> : null}
          <View style={[
            styles.messageBubble,
            assistant
              ? { backgroundColor: colors.surface, borderColor: colors.border }
              : { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}>
            <Text style={[styles.messageText, { color: assistant ? colors.foreground : colors.background }]}>{item.content}</Text>
          </View>
          {item.code ? (
            <View style={[styles.codeAttachment, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.codeAttachmentHeader}>
                <View style={[styles.codeFileIcon, { backgroundColor: `${colors.primary}18` }]}><MaterialIcons color={colors.primary} name="code" size={18} /></View>
                <View style={styles.codeAttachmentCopy}>
                  <Text style={[styles.codeFileName, { color: colors.foreground }]}>{projectType === "html" ? "index.html" : projectType === "expo" ? "App.tsx" : "Code Android"}</Text>
                  <Text style={[styles.codeFileHint, { color: colors.muted }]}>Code préparé par MIA</Text>
                </View>
              </View>
              <View style={styles.codeActions}>
                <Pressable accessibilityRole="button" onPress={() => { setPreviewMessage(item); setCopyState("idle"); }} style={({ pressed }) => [styles.codeAction, { borderColor: colors.border }, pressed && styles.pressed]}>
                  <MaterialIcons color={colors.foreground} name="visibility" size={18} />
                  <Text style={[styles.codeActionText, { color: colors.foreground }]}>Voir le code</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => void handleCopy(item)} style={({ pressed }) => [styles.iconAction, { borderColor: colors.border }, pressed && styles.pressed]}>
                  <MaterialIcons color={copyState === "copied" ? colors.success : colors.foreground} name={copyState === "copied" ? "check" : "content-copy"} size={18} />
                </Pressable>
              </View>
              {projectType === "html" ? (
                <Pressable accessibilityRole="button" onPress={() => void handlePrepareHtml(item)} style={({ pressed }) => [styles.prepareInline, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
                  <Text style={[styles.prepareInlineText, { color: colors.background }]}>Préparer pour l’APK</Text>
                  <MaterialIcons color={colors.background} name="arrow-forward" size={18} />
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {item.checklist?.length ? (
            <View style={[styles.checklist, { borderColor: `${colors.success}66`, backgroundColor: `${colors.success}0E` }]}>
              {item.checklist.map((check) => <View key={check} style={styles.checkItem}><MaterialIcons color={colors.success} name="check-circle" size={15} /><Text style={[styles.checkText, { color: colors.muted }]}>{check}</Text></View>)}
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <ScreenContainer className="flex-1" edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={8}>
        <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir les discussions MIA" onPress={() => setHistoryOpen(true)} style={({ pressed }) => [styles.topIconButton, { borderColor: colors.border }, pressed && styles.pressed]}>
            <MaterialIcons color={colors.foreground} name="history" size={22} />
          </Pressable>
          <View style={styles.topIdentity}>
            <View style={[styles.topAvatar, { backgroundColor: colors.primary }]}><Text style={[styles.topAvatarText, { color: colors.background }]}>M</Text></View>
            <View><Text style={[styles.topTitle, { color: colors.foreground }]}>MIA</Text><Text style={[styles.topSubtitle, { color: colors.success }]}>Prête à vous aider</Text></View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Nouvelle discussion MIA" onPress={startNewConversation} style={({ pressed }) => [styles.topIconButton, { borderColor: colors.border }, pressed && styles.pressed]}>
            <MaterialIcons color={colors.primary} name="add" size={24} />
          </Pressable>
        </View>

        <View style={styles.projectStrip}>
          <Pressable accessibilityRole="button" onPress={() => setTypePickerOpen(true)} style={({ pressed }) => [styles.projectChip, { borderColor: `${colors.primary}88`, backgroundColor: `${colors.primary}12` }, pressed && styles.pressed]}>
            <MaterialIcons color={colors.primary} name={TYPE_ICONS[projectType]} size={16} />
            <Text style={[styles.projectChipText, { color: colors.primary }]}>{selectedType.shortLabel}</Text>
            <MaterialIcons color={colors.primary} name="keyboard-arrow-down" size={17} />
          </Pressable>
          <Text numberOfLines={1} style={[styles.projectStripText, { color: colors.muted }]}>{activeConversation ? "Discussion enregistrée sur ce téléphone" : "Choisissez le type avant de commencer"}</Text>
        </View>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.messagesContent, messages.length === 0 && styles.emptyMessagesContent]}
          ListEmptyComponent={
            <View style={styles.welcome}>
              <View style={[styles.welcomeOrb, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}55` }]}><Text style={[styles.welcomeOrbText, { color: colors.primary }]}>M</Text></View>
              <Text style={[styles.welcomeTitle, { color: colors.foreground }]}>Bonjour, je suis MIA.</Text>
              <Text style={[styles.welcomeText, { color: colors.muted }]}>Parlez-moi de votre idée, posez une question ou demandez-moi du code. Je vous réponds simplement et je prépare le fichier quand vous en avez besoin.</Text>
              <View style={styles.quickPromptList}>
                {QUICK_PROMPTS.map((quick) => (
                  <Pressable key={quick.label} accessibilityRole="button" onPress={() => useQuickPrompt(quick.value)} style={({ pressed }) => [styles.quickPrompt, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}>
                    <MaterialIcons color={colors.primary} name={quick.icon} size={18} />
                    <Text style={[styles.quickPromptText, { color: colors.foreground }]}>{quick.label}</Text>
                    <MaterialIcons color={colors.muted} name="arrow-upward" size={17} />
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.localNote, { color: colors.muted }]}>Vos discussions restent sur votre téléphone. MIA reçoit seulement les derniers messages nécessaires pour répondre.</Text>
            </View>
          }
          ListFooterComponent={loading ? (
            <View style={[styles.messageRow, styles.messageRowAssistant]}>
              <View style={[styles.miaAvatar, { backgroundColor: colors.primary }]}><Text style={[styles.miaAvatarText, { color: colors.background }]}>M</Text></View>
              <View style={[styles.typingBubble, { backgroundColor: colors.surface, borderColor: colors.border }]}><ActivityIndicator color={colors.primary} size="small" /><Text style={[styles.typingText, { color: colors.muted }]}>MIA réfléchit…</Text></View>
            </View>
          ) : null}
        />

        {error ? <View style={[styles.errorBox, { backgroundColor: `${colors.error}12`, borderColor: `${colors.error}66` }]}><MaterialIcons color={colors.error} name="error-outline" size={18} /><Text style={[styles.errorText, { color: colors.error }]}>{error}</Text></View> : null}

        <View style={[styles.composerArea, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <View style={[styles.composer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={setDraft}
              editable={!loading}
              multiline
              maxLength={3500}
              placeholder={`Écrivez à MIA…`}
              placeholderTextColor={colors.muted}
              textAlignVertical="top"
              style={[styles.composerInput, { color: colors.foreground }]}
              accessibilityLabel="Message à MIA"
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Envoyer le message à MIA" disabled={!canSend} onPress={() => void handleSend()} style={({ pressed }) => [styles.sendButton, { backgroundColor: canSend ? colors.primary : colors.background }, pressed && canSend && styles.pressed]}>
              <MaterialIcons color={canSend ? colors.background : colors.muted} name="arrow-upward" size={22} />
            </Pressable>
          </View>
          <Text style={[styles.composerHint, { color: colors.muted }]}>MIA peut expliquer, créer ou corriger du code. 20 demandes par heure.</Text>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={historyOpen} animationType="slide" onRequestClose={() => setHistoryOpen(false)}>
        <ScreenContainer className="flex-1" edges={["top", "bottom", "left", "right"]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View><Text style={[styles.modalTitle, { color: colors.foreground }]}>Discussions MIA</Text><Text style={[styles.modalSubtitle, { color: colors.muted }]}>Conservées uniquement sur ce téléphone</Text></View>
            <Pressable accessibilityRole="button" onPress={() => setHistoryOpen(false)} style={({ pressed }) => [styles.closeButton, { borderColor: colors.border }, pressed && styles.pressed]}><MaterialIcons color={colors.foreground} name="close" size={22} /></Pressable>
          </View>
          <Pressable accessibilityRole="button" onPress={startNewConversation} style={({ pressed }) => [styles.newChatButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}><MaterialIcons color={colors.background} name="add" size={21} /><Text style={[styles.newChatText, { color: colors.background }]}>Nouvelle discussion</Text></Pressable>
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.conversationList}
            ListEmptyComponent={<Text style={[styles.emptyConversationText, { color: colors.muted }]}>Vos nouvelles discussions avec MIA apparaîtront ici.</Text>}
            renderItem={({ item }) => (
              <View style={[styles.conversationRow, { backgroundColor: item.id === activeConversationId ? `${colors.primary}12` : colors.surface, borderColor: item.id === activeConversationId ? colors.primary : colors.border }]}>
                <Pressable accessibilityRole="button" onPress={() => openConversation(item)} style={({ pressed }) => [styles.conversationOpen, pressed && styles.pressed]}>
                  <View style={[styles.conversationIcon, { backgroundColor: `${colors.primary}18` }]}><MaterialIcons color={colors.primary} name={TYPE_ICONS[item.projectType]} size={19} /></View>
                  <View style={styles.conversationCopy}><Text numberOfLines={2} style={[styles.conversationTitle, { color: colors.foreground }]}>{item.title}</Text><Text style={[styles.conversationMeta, { color: colors.muted }]}>{item.messages.length} messages · {dateLabel(item.updatedAt)}</Text></View>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Supprimer cette discussion" onPress={() => confirmDeleteConversation(item)} style={({ pressed }) => [styles.conversationDelete, { borderColor: colors.border }, pressed && styles.pressed]}><MaterialIcons color={colors.muted} name="delete-outline" size={20} /></Pressable>
              </View>
            )}
          />
        </ScreenContainer>
      </Modal>

      <Modal visible={typePickerOpen} transparent animationType="fade" onRequestClose={() => setTypePickerOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={[styles.typeSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.typeSheetHeader}><View><Text style={[styles.modalTitle, { color: colors.foreground }]}>Type de projet</Text><Text style={[styles.modalSubtitle, { color: colors.muted }]}>MIA adapte ses réponses à ce choix.</Text></View><Pressable accessibilityRole="button" onPress={() => setTypePickerOpen(false)} style={({ pressed }) => [styles.closeButton, { borderColor: colors.border }, pressed && styles.pressed]}><MaterialIcons color={colors.foreground} name="close" size={21} /></Pressable></View>
            {PROJECT_TYPES.map((type) => {
              const selected = type.id === projectType;
              return <Pressable key={type.id} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => selectProjectType(type.id)} style={({ pressed }) => [styles.typeChoice, { backgroundColor: selected ? `${colors.primary}12` : colors.surface, borderColor: selected ? colors.primary : colors.border }, pressed && styles.pressed]}><View style={[styles.typeChoiceIcon, { backgroundColor: selected ? colors.primary : colors.background }]}><MaterialIcons color={selected ? colors.background : colors.primary} name={TYPE_ICONS[type.id]} size={20} /></View><View style={styles.typeChoiceCopy}><Text style={[styles.typeChoiceTitle, { color: colors.foreground }]}>{type.label}</Text><Text style={[styles.typeChoiceText, { color: colors.muted }]}>{type.expected}</Text></View>{selected ? <MaterialIcons color={colors.primary} name="check-circle" size={21} /> : null}</Pressable>;
            })}
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(previewMessage)} animationType="slide" onRequestClose={() => setPreviewMessage(null)}>
        <ScreenContainer className="flex-1" edges={["top", "bottom", "left", "right"]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View><Text style={[styles.modalTitle, { color: colors.foreground }]}>Code MIA</Text><Text style={[styles.modalSubtitle, { color: colors.muted }]}>{preview?.totalLines ?? 0} lignes · Relisez avant de l’utiliser</Text></View>
            <Pressable accessibilityRole="button" onPress={() => setPreviewMessage(null)} style={({ pressed }) => [styles.closeButton, { borderColor: colors.border }, pressed && styles.pressed]}><MaterialIcons color={colors.foreground} name="close" size={22} /></Pressable>
          </View>
          <FlatList
            data={preview?.lines ?? []}
            keyExtractor={(_, index) => `line-${index}`}
            contentContainerStyle={[styles.codePreviewList, { backgroundColor: colors.surface }]}
            renderItem={({ item, index }) => <View style={styles.codeLine}><Text style={[styles.lineNumber, { color: colors.muted }]}>{String(index + 1).padStart(3, " ")}</Text><Text selectable style={[styles.codeLineText, { color: colors.foreground }]}>{item || " "}</Text></View>}
            ListFooterComponent={preview?.isTruncated ? <Text style={[styles.truncatedText, { color: colors.muted }]}>Aperçu limité aux premières lignes. La copie garde tout le code.</Text> : null}
          />
          <View style={[styles.previewFooter, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <Pressable accessibilityRole="button" onPress={() => previewMessage && void handleCopy(previewMessage)} style={({ pressed }) => [styles.copyButton, { borderColor: colors.border, backgroundColor: colors.surface }, pressed && styles.pressed]}><MaterialIcons color={copyState === "copied" ? colors.success : colors.foreground} name={copyState === "copied" ? "check" : "content-copy"} size={19} /><Text style={[styles.copyButtonText, { color: colors.foreground }]}>{copyState === "copied" ? "Code copié" : "Copier le code"}</Text></Pressable>
            {projectType === "html" && previewMessage ? <Pressable accessibilityRole="button" onPress={() => void handlePrepareHtml(previewMessage)} style={({ pressed }) => [styles.previewPrepareButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={[styles.previewPrepareText, { color: colors.background }]}>Préparer l’APK</Text><MaterialIcons color={colors.background} name="arrow-forward" size={19} /></Pressable> : null}
          </View>
        </ScreenContainer>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  topBar: { minHeight: 68, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, paddingHorizontal: 16 },
  topIdentity: { flexDirection: "row", alignItems: "center", gap: 10 },
  topAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  topAvatarText: { fontSize: 17, fontWeight: "900" },
  topTitle: { fontSize: 17, fontWeight: "800", lineHeight: 20 },
  topSubtitle: { fontSize: 11, fontWeight: "700", lineHeight: 15 },
  topIconButton: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  projectStrip: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 },
  projectChip: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  projectChipText: { fontSize: 12, fontWeight: "800" },
  projectStripText: { flex: 1, fontSize: 11, fontWeight: "600" },
  messagesContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20, gap: 14 },
  emptyMessagesContent: { flexGrow: 1, justifyContent: "center" },
  welcome: { alignItems: "center", paddingHorizontal: 10, paddingTop: 18 },
  welcomeOrb: { width: 74, height: 74, borderRadius: 37, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  welcomeOrbText: { fontSize: 34, fontWeight: "900" },
  welcomeTitle: { fontSize: 25, fontWeight: "900", textAlign: "center", lineHeight: 31 },
  welcomeText: { marginTop: 9, maxWidth: 340, fontSize: 14, fontWeight: "500", textAlign: "center", lineHeight: 21 },
  quickPromptList: { width: "100%", marginTop: 26, gap: 9 },
  quickPrompt: { minHeight: 48, borderWidth: 1, borderRadius: 15, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 14 },
  quickPromptText: { flex: 1, fontSize: 13, fontWeight: "700" },
  localNote: { marginTop: 24, maxWidth: 320, textAlign: "center", fontSize: 11, lineHeight: 16 },
  messageRow: { flexDirection: "row", gap: 9, maxWidth: "100%" },
  messageRowAssistant: { alignSelf: "flex-start", paddingRight: 30 },
  messageRowUser: { alignSelf: "flex-end", paddingLeft: 42 },
  miaAvatar: { width: 29, height: 29, borderRadius: 15, alignItems: "center", justifyContent: "center", marginTop: 17 },
  miaAvatarText: { fontSize: 13, fontWeight: "900" },
  messageColumn: { maxWidth: "100%" },
  messageColumnAssistant: { flex: 1 },
  messageColumnUser: { maxWidth: "100%", alignItems: "flex-end" },
  senderName: { marginBottom: 4, paddingLeft: 2, fontSize: 11, fontWeight: "900", letterSpacing: 0.4 },
  messageBubble: { borderRadius: 17, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 11 },
  messageText: { fontSize: 14, fontWeight: "500", lineHeight: 21 },
  codeAttachment: { marginTop: 8, borderWidth: 1, borderRadius: 15, padding: 10 },
  codeAttachmentHeader: { flexDirection: "row", alignItems: "center", gap: 9 },
  codeFileIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  codeAttachmentCopy: { flex: 1 },
  codeFileName: { fontSize: 13, fontWeight: "800" },
  codeFileHint: { marginTop: 1, fontSize: 11, fontWeight: "500" },
  codeActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  codeAction: { flex: 1, minHeight: 37, borderRadius: 10, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  codeActionText: { fontSize: 12, fontWeight: "800" },
  iconAction: { width: 40, minHeight: 37, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  prepareInline: { minHeight: 38, marginTop: 8, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  prepareInlineText: { fontSize: 12, fontWeight: "900" },
  checklist: { marginTop: 8, borderWidth: 1, borderRadius: 12, padding: 9, gap: 5 },
  checkItem: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  checkText: { flex: 1, fontSize: 11, lineHeight: 16 },
  typingBubble: { minHeight: 47, borderWidth: 1, borderRadius: 15, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 13 },
  typingText: { fontSize: 13, fontWeight: "600" },
  errorBox: { marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderRadius: 12, flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10 },
  errorText: { flex: 1, fontSize: 12, fontWeight: "600", lineHeight: 17 },
  composerArea: { borderTopWidth: 1, paddingHorizontal: 12, paddingTop: 10 },
  composer: { minHeight: 52, borderWidth: 1, borderRadius: 18, flexDirection: "row", alignItems: "flex-end", paddingLeft: 13, paddingRight: 6, paddingTop: 6, paddingBottom: 6 },
  composerInput: { flex: 1, minHeight: 37, maxHeight: 100, fontSize: 14, fontWeight: "500", lineHeight: 20, paddingTop: 8, paddingRight: 8 },
  sendButton: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  composerHint: { paddingTop: 7, paddingBottom: 8, textAlign: "center", fontSize: 10, fontWeight: "500" },
  modalHeader: { minHeight: 66, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, paddingHorizontal: 16 },
  modalTitle: { fontSize: 18, fontWeight: "900", lineHeight: 22 },
  modalSubtitle: { marginTop: 2, fontSize: 11, fontWeight: "500" },
  closeButton: { width: 39, height: 39, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  newChatButton: { minHeight: 48, borderRadius: 14, marginHorizontal: 16, marginTop: 15, marginBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  newChatText: { fontSize: 14, fontWeight: "900" },
  conversationList: { padding: 16, gap: 10 },
  emptyConversationText: { paddingTop: 28, textAlign: "center", fontSize: 13, lineHeight: 20 },
  conversationRow: { minHeight: 68, flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 15, paddingLeft: 10 },
  conversationOpen: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  conversationIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  conversationCopy: { flex: 1 },
  conversationTitle: { fontSize: 13, fontWeight: "800", lineHeight: 18 },
  conversationMeta: { marginTop: 3, fontSize: 11 },
  conversationDelete: { width: 42, minHeight: 48, borderLeftWidth: 1, alignItems: "center", justifyContent: "center" },
  sheetBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.58)" },
  typeSheet: { borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingTop: 20, gap: 10 },
  typeSheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  typeChoice: { minHeight: 65, borderWidth: 1, borderRadius: 15, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12 },
  typeChoiceIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  typeChoiceCopy: { flex: 1 },
  typeChoiceTitle: { fontSize: 13, fontWeight: "800" },
  typeChoiceText: { marginTop: 2, fontSize: 11, lineHeight: 15 },
  codePreviewList: { paddingVertical: 12, paddingHorizontal: 10 },
  codeLine: { minHeight: 20, flexDirection: "row" },
  lineNumber: { width: 42, paddingRight: 9, fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }), fontSize: 11, textAlign: "right", lineHeight: 19 },
  codeLineText: { flex: 1, fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }), fontSize: 11, lineHeight: 19 },
  truncatedText: { paddingTop: 13, paddingHorizontal: 8, fontSize: 11, lineHeight: 16, textAlign: "center" },
  previewFooter: { borderTopWidth: 1, flexDirection: "row", gap: 9, padding: 12 },
  copyButton: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  copyButtonText: { fontSize: 12, fontWeight: "800" },
  previewPrepareButton: { flex: 1, minHeight: 46, borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  previewPrepareText: { fontSize: 12, fontWeight: "900" },
});
