import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";
import { router, useFocusEffect } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  deleteMiaConversation,
  generateMiaLogo,
  loadMiaConversations,
  reviewMiaCode,
  saveAssistantDraft,
  saveMiaConversation,
  saveMiaLogoDraft,
  sendMiaMessage,
  takeMiaBuildHelpDraft,
} from "@/lib/ai-code-assistant";
import { PROJECT_TYPES, type ProjectType } from "@/lib/build-store";
import {
  createMiaPreview,
  type MiaLogoMessage,
  type MiaProvider,
  makeMiaTitle,
  type MiaConversation,
  type MiaMessage,
} from "@/shared/mia-chat";
import { MIA_CONNECTORS_HINT_STORAGE_KEY, shouldShowMiaConnectorsHint } from "@/shared/mia-interface-hints";
import { MIA_TYPING_INTERVAL_MS, isMiaTypingComplete, nextMiaTypingLength } from "@/shared/mia-typing";
import type { MiaCodeReview } from "@/shared/mia-code-review";
import {
  createMiaAgentAction,
  getMiaAgentActionDetails,
  isMiaAgentActionAvailable,
  type MiaAgentAction,
  type MiaAgentActionKind,
} from "@/shared/mia-agent";
import type { MiaLogoDraft } from "@/shared/mia-logo";

const TYPE_ICONS: Record<ProjectType, React.ComponentProps<typeof MaterialIcons>["name"]> = {
  expo: "code",
  android: "android",
  html: "language",
};

const QUICK_PROMPTS = [
  { label: "Créer", icon: "auto-awesome" as const, value: "Crée une page d’accueil simple et moderne pour mon application." },
  { label: "Corriger", icon: "build" as const, value: "Je veux corriger un problème dans mon code. Explique-moi d’abord ce dont tu as besoin." },
];

const AGENT_ACTION_KINDS: MiaAgentActionKind[] = [
  "review-latest-code",
  "prepare-html-apk",
  "use-logo-as-icon",
  "copy-latest-code",
  "preview-latest-code",
  "start-html-project",
];

const AGENT_ACTION_ICONS: Record<MiaAgentActionKind, React.ComponentProps<typeof MaterialIcons>["name"]> = {
  "review-latest-code": "fact-check",
  "prepare-html-apk": "archive",
  "use-logo-as-icon": "image",
  "copy-latest-code": "content-copy",
  "preview-latest-code": "visibility",
  "start-html-project": "add-comment",
};

type AgentFeedback = {
  tone: "success" | "error";
  title: string;
  detail: string;
};

type LogoFormValues = Pick<MiaLogoMessage, "appName" | "description" | "primaryColor" | "secondaryColor">;

function logoDraftFromMessage(logo: MiaLogoMessage | undefined): MiaLogoDraft | null {
  if (!logo || logo.kind !== "result" || !logo.uri || !logo.name) return null;
  return {
    id: `conversation-${logo.name}-${logo.uri}`,
    appName: logo.appName,
    description: logo.description,
    uri: logo.uri,
    name: logo.name,
    size: logo.size,
    createdAt: new Date().toISOString(),
  };
}

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
  const [draftProvider, setDraftProvider] = useState<MiaProvider>("mia");
  const [draftProjectType, setDraftProjectType] = useState<ProjectType>("html");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [connectorsHintVisible, setConnectorsHintVisible] = useState(false);
  const toolsEntrance = useRef(new Animated.Value(0)).current;
  const [previewMessage, setPreviewMessage] = useState<MiaMessage | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied" | "error">("idle");
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [typingCharacterCount, setTypingCharacterCount] = useState(0);
  const [logoDraft, setLogoDraft] = useState<MiaLogoDraft | null>(null);
  const [logoForms, setLogoForms] = useState<Record<string, LogoFormValues>>({});
  const [logoLoading, setLogoLoading] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewCode, setReviewCode] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewResult, setReviewResult] = useState<MiaCodeReview | null>(null);
  const [reviewError, setReviewError] = useState("");
  const [agentPlannerOpen, setAgentPlannerOpen] = useState(false);
  const [pendingAgentAction, setPendingAgentAction] = useState<MiaAgentAction | null>(null);
  const [agentExecuting, setAgentExecuting] = useState(false);
  const [agentFeedback, setAgentFeedback] = useState<AgentFeedback | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [activeConversationId, conversations],
  );
  const projectType = activeConversation?.projectType ?? draftProjectType;
  const provider = activeConversation?.provider ?? draftProvider;
  const messages = activeConversation?.messages ?? [];
  const latestCodeMessage = [...messages].reverse().find((message) => Boolean(message.code)) ?? null;
  const latestConversationLogo = [...messages].reverse().find((message) => message.logo?.kind === "result")?.logo;
  const activeLogoDraft = logoDraft ?? logoDraftFromMessage(latestConversationLogo);
  const selectedType = PROJECT_TYPES.find((type) => type.id === projectType)!;
  const agentContext = {
    hasLatestCode: Boolean(latestCodeMessage?.code),
    isHtmlProject: projectType === "html",
    hasLogo: Boolean(activeLogoDraft),
  };
  const availableAgentActionKinds = AGENT_ACTION_KINDS.filter((kind) => isMiaAgentActionAvailable(kind, agentContext));
  const preview = useMemo(
    () => previewMessage?.code ? createMiaPreview(previewMessage.code) : null,
    [previewMessage],
  );
  const canSend = Boolean(draft.trim()) && !loading && !logoLoading && !typingMessageId;
  const assistantName = provider === "kia" ? "KIA" : "MIA";

  useEffect(() => {
    if (!toolsOpen) {
      toolsEntrance.setValue(0);
      return;
    }

    const entrance = Animated.timing(toolsEntrance, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    });
    entrance.start();
    return () => entrance.stop();
  }, [toolsEntrance, toolsOpen]);

  useEffect(() => {
    let active = true;
    void loadMiaConversations().then((loaded) => {
      // KIA relies on a separate Gemini relay that is unavailable during the
      // Cloudflare-only migration. Keep these conversations in local storage,
      // but do not offer them in the active assistant interface.
      if (active) setConversations(loaded.filter((conversation) => conversation.provider === "mia"));
    }).catch(() => {
      if (active) setError("Les anciennes discussions MIA ne sont pas disponibles pour le moment.");
    });
    return () => { active = false; };
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    void takeMiaBuildHelpDraft().then((helpDraft) => {
      if (!active || !helpDraft) return;
      setActiveConversationId(null);
      setDraftProvider("mia");
      setDraftProjectType(helpDraft.projectType);
      setDraft(helpDraft.prompt);
      setError("");
      setHistoryOpen(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }).catch(() => {
      if (active) setError("L’aide liée à cette compilation n’a pas pu être préparée. Réessayez depuis Mes APK.");
    });
    return () => { active = false; };
  }, []));

  useEffect(() => {
    if (!typingMessageId) {
      setTypingCharacterCount(0);
      return;
    }

    const typingMessage = conversations
      .flatMap((conversation) => conversation.messages)
      .find((message) => message.id === typingMessageId);
    const fullText = typingMessage?.content ?? "";
    if (!fullText) {
      setTypingMessageId(null);
      return;
    }

    let visibleLength = 0;
    setTypingCharacterCount(0);
    const timer = setInterval(() => {
      visibleLength = nextMiaTypingLength(fullText, visibleLength);
      setTypingCharacterCount(visibleLength);
      if (isMiaTypingComplete(fullText, visibleLength)) {
        clearInterval(timer);
        setTypingMessageId(null);
      }
    }, MIA_TYPING_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [conversations, typingMessageId]);

  function startNewConversation() {
    setActiveConversationId(null);
    setDraftProvider("mia");
    setDraftProjectType("html");
    setDraft("");
    setError("");
    setCopyState("idle");
    setHistoryOpen(false);
    setTypePickerOpen(false);
    setToolsOpen(false);
    setPreviewMessage(null);
    setTypingMessageId(null);
    setTypingCharacterCount(0);
    setAgentFeedback(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function handleConnectorsPress() {
    try {
      const savedValue = await AsyncStorage.getItem(MIA_CONNECTORS_HINT_STORAGE_KEY);
      if (shouldShowMiaConnectorsHint(savedValue)) {
        setConnectorsHintVisible(true);
        void AsyncStorage.setItem(MIA_CONNECTORS_HINT_STORAGE_KEY, "1");
        return;
      }
    } catch {
      // Si la préférence locale est indisponible, le Connecteur reste utilisable.
    }
    router.push("/connectors");
  }

  function openConversation(conversation: MiaConversation) {
    if (conversation.provider !== "mia") {
      Alert.alert("KIA est momentanément indisponible", "Pendant la migration gratuite, utilisez MIA Cloudflare pour continuer.");
      return;
    }
    setActiveConversationId(conversation.id);
    setDraftProvider("mia");
    setDraftProjectType(conversation.projectType);
    setDraft("");
    setError("");
    setCopyState("idle");
    setHistoryOpen(false);
    setToolsOpen(false);
    setPreviewMessage(null);
    setTypingMessageId(null);
    setTypingCharacterCount(0);
    setAgentFeedback(null);
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
      id: `${provider}-conversation-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      provider,
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
        provider: base.provider,
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
      setTypingMessageId(assistantMessage.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "MIA ne répond pas. Réessayez dans quelques instants.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(message: MiaMessage) {
    if (!message.code || copyState === "copying") return false;
    try {
      setCopyState("copying");
      const copied = await Clipboard.setStringAsync(message.code);
      if (!copied) throw new Error("clipboard-write-failed");
      setCopyState("copied");
      return true;
    } catch {
      setCopyState("error");
      return false;
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
        "MIA a préparé le fichier. MIA💻 va ouvrir la compilation avec votre code déjà placé.",
        [{ text: "Continuer", onPress: () => router.navigate("/(tabs)/create") }],
      );
    } catch {
      Alert.alert("Préparation impossible", "Le code n’a pas pu être conservé sur ce téléphone. Réessayez.");
    }
  }

  async function openLogoConversation() {
    const now = new Date().toISOString();
    const base: MiaConversation = activeConversation ?? {
      id: `${provider}-conversation-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      provider,
      title: "Créer un logo",
      projectType,
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    const form: LogoFormValues = {
      appName: activeLogoDraft?.appName || "Mon application",
      description: activeLogoDraft?.description || "",
      primaryColor: "#D4AF37",
      secondaryColor: "#0A0A0F",
    };
    const message: MiaMessage = {
      id: messageId("assistant"),
      role: "assistant",
      content: "Décrivez le logo ici. Je ne l’enverrai au relais IA qu’après votre confirmation.",
      createdAt: now,
      logo: { kind: "request", ...form },
    };
    setError("");
    setToolsOpen(false);
    try {
      await persistConversation({ ...base, updatedAt: now, messages: [...base.messages, message] });
      setLogoForms((current) => ({ ...current, [message.id]: form }));
    } catch {
      setError("La demande de logo ne peut pas être ajoutée à cette discussion.");
    }
  }

  function updateLogoForm(message: MiaMessage, field: keyof LogoFormValues, value: string) {
    if (message.logo?.kind !== "request") return;
    setLogoForms((current) => ({
      ...current,
      [message.id]: { ...message.logo, ...current[message.id], [field]: value },
    }));
  }

  async function confirmConversationLogo(message: MiaMessage, values?: LogoFormValues) {
    const source = values ?? message.logo;
    if (!source || !source.appName.trim() || !source.description.trim()) {
      setError("Indiquez le nom de l’application et décrivez le symbole avant de créer le logo.");
      return;
    }
    const request: LogoFormValues = {
      appName: source.appName.trim(),
      description: source.description.trim(),
      primaryColor: source.primaryColor,
      secondaryColor: source.secondaryColor,
    };
    if (activeConversation) {
      try {
        const updatedMessage: MiaMessage = { ...message, logo: { kind: "request", ...request } };
        await persistConversation({
          ...activeConversation,
          updatedAt: activeConversation.updatedAt,
          messages: activeConversation.messages.map((entry) => entry.id === message.id ? updatedMessage : entry),
        });
      } catch {
        setError("Le brief de logo ne peut pas être conservé sur ce téléphone.");
        return;
      }
    }
    Alert.alert(
      "Envoyer ce brief à MIA ?",
      "MIA va envoyer cette description au relais IA Cloudflare pour créer une image. Aucune clé n’est stockée dans votre APK.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Créer le logo", onPress: () => void generateConversationLogo(request) },
      ],
    );
  }

  async function generateConversationLogo(request: LogoFormValues) {
    const base = activeConversation;
    if (!base || logoLoading) return;
    setLogoLoading(true);
    setError("");
    try {
      const nextLogo = await generateMiaLogo(request);
      const createdAt = new Date().toISOString();
      const result: MiaMessage = {
        id: messageId("assistant"),
        role: "assistant",
        content: `Voici votre logo pour ${nextLogo.appName}. Il a été créé par MIA via l’IA Cloudflare et reste enregistré sur ce téléphone.`,
        createdAt,
        logo: {
          kind: "result",
          appName: nextLogo.appName,
          description: nextLogo.description,
          primaryColor: request.primaryColor,
          secondaryColor: request.secondaryColor,
          uri: nextLogo.uri,
          name: nextLogo.name,
          size: nextLogo.size,
          source: "cloudflare-ai",
        },
      };
      setLogoDraft(nextLogo);
      await persistConversation({ ...base, updatedAt: createdAt, messages: [...base.messages, result] });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "MIA ne peut pas créer ce logo pour le moment.");
    } finally {
      setLogoLoading(false);
    }
  }

  async function handleUseLogoForBuild(draft = activeLogoDraft) {
    if (!draft) return;
    try {
      await saveMiaLogoDraft(draft);
      setLogoDraft(draft);
      setAgentFeedback({ tone: "success", title: "Icône enregistrée", detail: "Ce logo sera proposé dans le formulaire de compilation de votre prochaine APK." });
    } catch {
      setError("Le logo ne peut pas être conservé sur ce téléphone.");
    }
  }

  async function prepareApkWithLogo(draft = activeLogoDraft) {
    if (!draft) return;
    try {
      await saveMiaLogoDraft(draft);
      setLogoDraft(draft);
      Alert.alert(
        "Logo prêt pour l’APK",
        "L’icône est conservée sur ce téléphone. Ouvrez maintenant la préparation de l’APK.",
        [{ text: "Préparer l’APK", onPress: () => router.navigate("/(tabs)/create") }],
      );
    } catch {
      setError("Le logo ne peut pas être conservé sur ce téléphone.");
    }
  }

  function openCodeReview(code = "") {
    setReviewCode(code);
    setReviewResult(null);
    setReviewError("");
    setError("");
    setReviewOpen(true);
  }

  function prepareAgentAction(kind: MiaAgentActionKind) {
    if (!isMiaAgentActionAvailable(kind, agentContext)) {
      setAgentPlannerOpen(false);
      setAgentFeedback({
        tone: "error",
        title: "Action indisponible",
        detail: "Créez d’abord du code ou un logo dans MIA pour utiliser cette action.",
      });
      return;
    }
    setAgentPlannerOpen(false);
    setPendingAgentAction(createMiaAgentAction(kind));
  }

  function cancelAgentAction() {
    if (!agentExecuting) setPendingAgentAction(null);
  }

  async function confirmAgentAction() {
    const action = pendingAgentAction;
    if (!action || agentExecuting) return;
    setAgentExecuting(true);
    setError("");
    try {
      if (action.kind === "review-latest-code") {
        if (!latestCodeMessage?.code) throw new Error("Aucun code généré n’est disponible dans cette discussion.");
        setReviewCode(latestCodeMessage.code);
        setReviewResult(null);
        setReviewError("");
        setReviewOpen(true);
        setPendingAgentAction(null);
        const reviewed = await runCodeReview(latestCodeMessage.code);
        if (reviewed) {
          setAgentFeedback({ tone: "success", title: "Diagnostic prêt", detail: "Le résultat est ouvert dans Vérifier mon code." });
        }
        return;
      }
      if (action.kind === "prepare-html-apk") {
        if (!latestCodeMessage?.code || projectType !== "html") throw new Error("Préparez d’abord un code HTML dans cette discussion.");
        setPendingAgentAction(null);
        await handlePrepareHtml(latestCodeMessage);
        return;
      }
      if (action.kind === "copy-latest-code") {
        if (!latestCodeMessage?.code) throw new Error("Aucun code généré n’est disponible dans cette discussion.");
        setPendingAgentAction(null);
        if (!await handleCopy(latestCodeMessage)) throw new Error("La copie du code a échoué. Réessayez.");
        setAgentFeedback({ tone: "success", title: "Code copié", detail: "Vous pouvez maintenant le coller dans une autre application." });
        return;
      }
      if (action.kind === "preview-latest-code") {
        if (!latestCodeMessage?.code) throw new Error("Aucun code généré n’est disponible dans cette discussion.");
        setPendingAgentAction(null);
        setPreviewMessage(latestCodeMessage);
        setAgentFeedback({ tone: "success", title: "Aperçu ouvert", detail: "Le code est affiché en lecture seule, sans être modifié." });
        return;
      }
      if (action.kind === "start-html-project") {
        setPendingAgentAction(null);
        startNewConversation();
        setAgentFeedback({ tone: "success", title: "Discussion HTML prête", detail: "Décrivez maintenant l’application que vous voulez créer." });
        return;
      }
      if (!logoDraft) throw new Error("Créez d’abord un logo dans MIA avant de l’utiliser.");
      setPendingAgentAction(null);
      await handleUseLogoForBuild();
    } catch (caught) {
      setPendingAgentAction(null);
      setAgentFeedback({
        tone: "error",
        title: "Action non effectuée",
        detail: caught instanceof Error ? caught.message : "Cette action Agent ne peut pas être exécutée pour le moment.",
      });
    } finally {
      setAgentExecuting(false);
    }
  }

  async function runCodeReview(code: string) {
    if (reviewLoading) return false;
    setReviewLoading(true);
    setReviewError("");
    try {
      setReviewResult(await reviewMiaCode({ code, projectType }));
      return true;
    } catch (caught) {
      setReviewError(caught instanceof Error ? caught.message : "MIA ne peut pas vérifier ce code pour le moment.");
      return false;
    } finally {
      setReviewLoading(false);
    }
  }

  async function handleCodeReview() {
    await runCodeReview(reviewCode);
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
    const typing = assistant && item.id === typingMessageId;
    const visibleContent = typing ? item.content.slice(0, typingCharacterCount) : item.content;
    const logoForm = item.logo?.kind === "request" ? logoForms[item.id] ?? item.logo : null;
    const resultLogo = logoDraftFromMessage(item.logo);
    return (
      <View style={[styles.messageRow, assistant ? styles.messageRowAssistant : styles.messageRowUser]}>
        {assistant ? <View style={[styles.miaAvatar, { backgroundColor: colors.primary }]}><Text style={[styles.miaAvatarText, { color: colors.background }]}>{provider === "kia" ? "K" : "M"}</Text></View> : null}
        <View style={[styles.messageColumn, assistant ? styles.messageColumnAssistant : styles.messageColumnUser]}>
          {assistant ? <Text style={[styles.senderName, { color: colors.primary }]}>{assistantName}</Text> : null}
          <View style={[
            styles.messageBubble,
            assistant
              ? { backgroundColor: colors.surface, borderColor: colors.border }
              : { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}>
            <Text
              accessibilityLiveRegion={typing ? "polite" : "none"}
              accessibilityLabel={typing ? `${assistantName} rédige sa réponse` : undefined}
              style={[styles.messageText, { color: assistant ? colors.foreground : colors.background }]}
            >
              {visibleContent}
              {typing ? <Text style={[styles.typingCursor, { color: colors.primary }]}>▍</Text> : null}
            </Text>
          </View>
          {logoForm ? (
            <View style={[styles.logoRequestCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.logoCardTitleRow}><View style={[styles.logoCardIcon, { backgroundColor: `${colors.primary}18` }]}><MaterialIcons color={colors.primary} name="brush" size={18} /></View><View style={styles.logoCardTitleCopy}><Text style={[styles.logoCardTitle, { color: colors.foreground }]}>Brief du logo</Text><Text style={[styles.logoCardHint, { color: colors.muted }]}>MIA ne crée rien avant votre confirmation.</Text></View></View>
              <Text style={[styles.toolLabel, { color: colors.foreground }]}>Nom de l’application</Text>
              <TextInput value={logoForm.appName} onChangeText={(value) => updateLogoForm(item, "appName", value)} editable={!logoLoading} maxLength={48} placeholder="Ex. Ma boutique" placeholderTextColor={colors.muted} style={[styles.toolInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} />
              <Text style={[styles.toolLabel, { color: colors.foreground }]}>Symbole et style</Text>
              <TextInput value={logoForm.description} onChangeText={(value) => updateLogoForm(item, "description", value)} editable={!logoLoading} maxLength={600} multiline textAlignVertical="top" placeholder="Ex. un sac moderne, symbole central, style simple…" placeholderTextColor={colors.muted} style={[styles.logoDescriptionInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} />
              <View style={styles.colorRow}>
                <View style={styles.colorField}><Text style={[styles.toolLabel, { color: colors.foreground }]}>Couleur 1</Text><TextInput value={logoForm.primaryColor ?? ""} onChangeText={(value) => updateLogoForm(item, "primaryColor", value)} editable={!logoLoading} autoCapitalize="characters" maxLength={7} placeholder="#D4AF37" placeholderTextColor={colors.muted} style={[styles.toolInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} /></View>
                <View style={styles.colorField}><Text style={[styles.toolLabel, { color: colors.foreground }]}>Couleur 2</Text><TextInput value={logoForm.secondaryColor ?? ""} onChangeText={(value) => updateLogoForm(item, "secondaryColor", value)} editable={!logoLoading} autoCapitalize="characters" maxLength={7} placeholder="#0A0A0F" placeholderTextColor={colors.muted} style={[styles.toolInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} /></View>
              </View>
              <Pressable accessibilityRole="button" disabled={logoLoading} onPress={() => void confirmConversationLogo(item, logoForm)} style={({ pressed }) => [styles.logoGenerateButton, { backgroundColor: colors.primary }, (pressed || logoLoading) && styles.pressed]}>{logoLoading ? <ActivityIndicator color={colors.background} /> : <MaterialIcons color={colors.background} name="auto-awesome" size={18} />}<Text style={[styles.logoGenerateText, { color: colors.background }]}>{logoLoading ? "Création…" : "Confirmer et créer"}</Text></Pressable>
              <Text style={[styles.logoPrivacyNote, { color: colors.muted }]}>Maximum trois logos par heure. Votre brief est envoyé uniquement après confirmation ; l’image reste sur votre téléphone.</Text>
            </View>
          ) : null}
          {resultLogo && item.logo?.kind === "result" ? (
            <View style={[styles.logoResultCard, { backgroundColor: colors.background, borderColor: `${colors.primary}66` }]}>
              <View style={styles.logoCardTitleRow}><View style={[styles.logoCardIcon, { backgroundColor: `${colors.success}18` }]}><MaterialIcons color={colors.success} name="auto-awesome" size={18} /></View><View style={styles.logoCardTitleCopy}><Text style={[styles.logoCardTitle, { color: colors.foreground }]}>{item.logo.appName}</Text><Text style={[styles.logoCardHint, { color: colors.muted }]}>{item.logo.source === "cloudflare-ai" ? "Image IA Cloudflare · stockée localement" : "Modèle local · stocké localement"}</Text></View></View>
              <Image accessibilityLabel={`Logo créé pour ${item.logo.appName}`} source={{ uri: resultLogo.uri }} style={styles.logoConversationImage} />
              <Text style={[styles.logoResultDescription, { color: colors.muted }]}>{item.logo.description}</Text>
              <View style={styles.logoActionRow}><Pressable accessibilityRole="button" onPress={() => void handleUseLogoForBuild(resultLogo)} style={({ pressed }) => [styles.logoSecondaryAction, { borderColor: colors.success, backgroundColor: `${colors.success}0D` }, pressed && styles.pressed]}><MaterialIcons color={colors.success} name="check-circle" size={17} /><Text style={[styles.logoSecondaryActionText, { color: colors.success }]}>Utiliser</Text></Pressable><Pressable accessibilityRole="button" disabled={logoLoading} onPress={() => void confirmConversationLogo(item, item.logo)} style={({ pressed }) => [styles.logoSecondaryAction, { borderColor: colors.border, backgroundColor: colors.surface }, (pressed || logoLoading) && styles.pressed]}><MaterialIcons color={colors.foreground} name="refresh" size={17} /><Text style={[styles.logoSecondaryActionText, { color: colors.foreground }]}>Regénérer</Text></Pressable></View>
              <Pressable accessibilityRole="button" onPress={() => void prepareApkWithLogo(resultLogo)} style={({ pressed }) => [styles.prepareInline, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={[styles.prepareInlineText, { color: colors.background }]}>Préparer l’APK avec ce logo</Text><MaterialIcons color={colors.background} name="arrow-forward" size={18} /></Pressable>
            </View>
          ) : null}
          {item.code ? (
            <View style={[styles.codeAttachment, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.codeAttachmentHeader}>
                <View style={[styles.codeFileIcon, { backgroundColor: `${colors.primary}18` }]}><MaterialIcons color={colors.primary} name="code" size={18} /></View>
                <View style={styles.codeAttachmentCopy}>
                  <Text style={[styles.codeFileName, { color: colors.foreground }]}>{projectType === "html" ? "index.html" : projectType === "expo" ? "App.tsx" : "Code Android"}</Text>
                  <Text style={[styles.codeFileHint, { color: colors.muted }]}>Code préparé par {assistantName}</Text>
                </View>
              </View>
              <View style={styles.codeActions}>
                <Pressable accessibilityRole="button" onPress={() => { setPreviewMessage(item); setCopyState("idle"); }} style={({ pressed }) => [styles.codeAction, { borderColor: colors.border }, pressed && styles.pressed]}>
                  <MaterialIcons color={colors.foreground} name="visibility" size={18} />
                  <Text style={[styles.codeActionText, { color: colors.foreground }]}>Voir le code</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => openCodeReview(item.code)} style={({ pressed }) => [styles.codeAction, { borderColor: `${colors.success}88` }, pressed && styles.pressed]}>
                  <MaterialIcons color={colors.success} name="fact-check" size={18} />
                  <Text style={[styles.codeActionText, { color: colors.foreground }]}>Vérifier</Text>
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
          <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir les discussions MIA et KIA" onPress={() => setHistoryOpen(true)} style={({ pressed }) => [styles.topIconButton, { borderColor: colors.border }, pressed && styles.pressed]}>
            <MaterialIcons color={colors.foreground} name="history" size={22} />
          </Pressable>
          <View style={styles.topIdentity}>
            <View style={[styles.topAvatar, { backgroundColor: colors.primary }]}><Text style={[styles.topAvatarText, { color: colors.background }]}>{provider === "kia" ? "K" : "M"}</Text></View>
            <View><Text style={[styles.topTitle, { color: colors.foreground }]}>{assistantName}</Text><Text style={[styles.topSubtitle, { color: colors.success }]}>Prête à vous aider</Text></View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Nouvelle discussion avec ${assistantName}`} onPress={startNewConversation} style={({ pressed }) => [styles.topIconButton, { borderColor: colors.border }, pressed && styles.pressed]}>
            <MaterialIcons color={colors.primary} name="add" size={24} />
          </Pressable>
        </View>

        <View style={[styles.utilityBar, { borderBottomColor: colors.border }]}>
          <Pressable accessibilityRole="button" onPress={() => setTypePickerOpen(true)} style={({ pressed }) => [styles.projectChip, { borderColor: `${colors.primary}88`, backgroundColor: `${colors.primary}12` }, pressed && styles.pressed]}>
            <MaterialIcons color={colors.primary} name={TYPE_ICONS[projectType]} size={16} />
            <Text style={[styles.projectChipText, { color: colors.primary }]}>{selectedType.shortLabel}</Text>
            <MaterialIcons color={colors.primary} name="keyboard-arrow-down" size={17} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir les Connecteurs" onPress={() => void handleConnectorsPress()} style={({ pressed }) => [styles.connectorsButton, { borderColor: `${colors.primary}88`, backgroundColor: `${colors.primary}12` }, pressed && styles.pressed]}>
            <MaterialIcons color={colors.primary} name="hub" size={19} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir les outils MIA" onPress={() => setToolsOpen(true)} style={({ pressed }) => [styles.toolsButton, { borderColor: colors.border, backgroundColor: colors.surface }, pressed && styles.pressed]}>
            <MaterialIcons color={colors.foreground} name="tune" size={18} />
            <Text style={[styles.toolsButtonText, { color: colors.foreground }]}>Outils</Text>
          </Pressable>
        </View>

        {connectorsHintVisible ? (
          <View accessibilityLiveRegion="polite" style={[styles.connectorsHint, { backgroundColor: colors.surface, borderColor: `${colors.primary}66` }]}>
            <MaterialIcons color={colors.primary} name="hub" size={16} />
            <Text style={[styles.connectorsHintText, { color: colors.foreground }]}>Ici, vous pouvez relier vos services.</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer l’aide Connecteurs" onPress={() => setConnectorsHintVisible(false)} style={({ pressed }) => [styles.connectorsHintClose, pressed && styles.pressed]}>
              <Text style={[styles.connectorsHintCloseText, { color: colors.primary }]}>Compris</Text>
            </Pressable>
          </View>
        ) : null}

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.messagesContent, messages.length === 0 && styles.emptyMessagesContent]}
          ListEmptyComponent={
            <View style={styles.welcome}>
              <Text style={[styles.welcomeTitle, { color: colors.foreground }]}>Bonjour, je suis {assistantName}.</Text>
              <View style={styles.quickPromptList}>
                {QUICK_PROMPTS.map((quick) => (
                  <Pressable key={quick.label} accessibilityRole="button" onPress={() => useQuickPrompt(quick.value)} style={({ pressed }) => [styles.quickPrompt, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}>
                    <MaterialIcons color={colors.primary} name={quick.icon} size={18} />
                    <Text style={[styles.quickPromptText, { color: colors.foreground }]}>{quick.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
          ListFooterComponent={loading ? (
            <View style={[styles.messageRow, styles.messageRowAssistant]}>
              <View style={[styles.miaAvatar, { backgroundColor: colors.primary }]}><Text style={[styles.miaAvatarText, { color: colors.background }]}>{provider === "kia" ? "K" : "M"}</Text></View>
              <View style={[styles.typingBubble, { backgroundColor: colors.surface, borderColor: colors.border }]}><ActivityIndicator color={colors.primary} size="small" /><Text style={[styles.typingText, { color: colors.muted }]}>{assistantName} prépare sa réponse…</Text></View>
            </View>
          ) : null}
        />

        {agentFeedback ? <View style={[styles.agentFeedback, { backgroundColor: agentFeedback.tone === "success" ? `${colors.success}12` : `${colors.error}12`, borderColor: agentFeedback.tone === "success" ? `${colors.success}66` : `${colors.error}66` }]}><MaterialIcons color={agentFeedback.tone === "success" ? colors.success : colors.error} name={agentFeedback.tone === "success" ? "check-circle" : "error-outline"} size={18} /><View style={styles.agentFeedbackCopy}><Text style={[styles.agentFeedbackTitle, { color: colors.foreground }]}>{agentFeedback.title}</Text><Text style={[styles.agentFeedbackText, { color: colors.muted }]}>{agentFeedback.detail}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Fermer le résultat Agent" onPress={() => setAgentFeedback(null)} style={styles.agentFeedbackClose}><MaterialIcons color={colors.muted} name="close" size={18} /></Pressable></View> : null}
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
              placeholder={`Écrivez à ${assistantName}…`}
              placeholderTextColor={colors.muted}
              textAlignVertical="top"
              style={[styles.composerInput, { color: colors.foreground }]}
              accessibilityLabel={`Message à ${assistantName}`}
            />
            <Pressable accessibilityRole="button" accessibilityLabel={`Envoyer le message à ${assistantName}`} disabled={!canSend} onPress={() => void handleSend()} style={({ pressed }) => [styles.sendButton, { backgroundColor: canSend ? colors.primary : colors.background }, pressed && canSend && styles.pressed]}>
              <MaterialIcons color={canSend ? colors.background : colors.muted} name="arrow-upward" size={22} />
            </Pressable>
          </View>
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
                  <View style={styles.conversationCopy}><Text numberOfLines={2} style={[styles.conversationTitle, { color: colors.foreground }]}>{item.title}</Text><Text style={[styles.conversationMeta, { color: colors.muted }]}>MIA Cloudflare · {item.messages.length} messages · {dateLabel(item.updatedAt)}</Text></View>
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

      <Modal visible={toolsOpen} transparent animationType="fade" onRequestClose={() => setToolsOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <Animated.View style={[
            styles.toolSheet,
            { backgroundColor: colors.background, borderColor: colors.border },
            {
              opacity: toolsEntrance,
              transform: [
                { translateY: toolsEntrance.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) },
                { scale: toolsEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
              ],
            },
          ]}>
            <View style={styles.typeSheetHeader}>
              <View><Text style={[styles.modalTitle, { color: colors.foreground }]}>Outils MIA</Text><Text style={[styles.modalSubtitle, { color: colors.muted }]}>Des actions utiles, rangées au même endroit.</Text></View>
              <Pressable accessibilityRole="button" onPress={() => setToolsOpen(false)} style={({ pressed }) => [styles.closeButton, { borderColor: colors.border }, pressed && styles.pressed]}><MaterialIcons color={colors.foreground} name="close" size={21} /></Pressable>
            </View>
            <Pressable accessibilityRole="button" onPress={() => void openLogoConversation()} style={({ pressed }) => [styles.toolChoice, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}66` }, pressed && styles.pressed]}>
              <View style={styles.toolIconStack}><View style={[styles.typeChoiceIcon, { backgroundColor: `${colors.primary}18` }]}><MaterialIcons color={colors.primary} name="brush" size={20} /></View><Text style={[styles.toolIconLabel, { color: colors.primary }]}>LOGO</Text></View>
              <View style={styles.typeChoiceCopy}><Text style={[styles.typeChoiceTitle, { color: colors.foreground }]}>Créer un logo</Text><Text style={[styles.typeChoiceText, { color: colors.muted }]}>Crée une icône carrée à utiliser dans votre future APK.</Text></View>
              <MaterialIcons color={colors.primary} name="chevron-right" size={22} />
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => { setToolsOpen(false); openCodeReview(); }} style={({ pressed }) => [styles.toolChoice, { backgroundColor: `${colors.success}0D`, borderColor: `${colors.success}66` }, pressed && styles.pressed]}>
              <View style={styles.toolIconStack}><View style={[styles.typeChoiceIcon, { backgroundColor: `${colors.success}18` }]}><MaterialIcons color={colors.success} name="fact-check" size={20} /></View><Text style={[styles.toolIconLabel, { color: colors.success }]}>CODE</Text></View>
              <View style={styles.typeChoiceCopy}><Text style={[styles.typeChoiceTitle, { color: colors.foreground }]}>Vérifier mon code</Text><Text style={[styles.typeChoiceText, { color: colors.muted }]}>Analyse votre code avant la compilation et explique les problèmes.</Text></View>
              <MaterialIcons color={colors.success} name="chevron-right" size={22} />
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => { setToolsOpen(false); setAgentPlannerOpen(true); }} style={({ pressed }) => [styles.toolChoice, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}>
              <View style={styles.toolIconStack}><View style={[styles.typeChoiceIcon, { backgroundColor: `${colors.foreground}12` }]}><MaterialIcons color={colors.foreground} name="verified-user" size={20} /></View><Text style={[styles.toolIconLabel, { color: colors.muted }]}>AGENT</Text></View>
              <View style={styles.typeChoiceCopy}><Text style={[styles.typeChoiceTitle, { color: colors.foreground }]}>Mode Agent</Text><Text style={[styles.typeChoiceText, { color: colors.muted }]}>Prépare une action, puis vous demande toujours votre accord.</Text></View>
              <MaterialIcons color={colors.muted} name="chevron-right" size={22} />
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

      <Modal visible={reviewOpen} animationType="slide" onRequestClose={() => setReviewOpen(false)}>
        <ScreenContainer className="flex-1" edges={["top", "bottom", "left", "right"]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View><Text style={[styles.modalTitle, { color: colors.foreground }]}>Vérifier avant l’APK</Text><Text style={[styles.modalSubtitle, { color: colors.muted }]}>MIA cherche les blocages probables sans lancer de compilation.</Text></View>
            <Pressable accessibilityRole="button" onPress={() => setReviewOpen(false)} style={({ pressed }) => [styles.closeButton, { borderColor: colors.border }, pressed && styles.pressed]}><MaterialIcons color={colors.foreground} name="close" size={22} /></Pressable>
          </View>
          <FlatList
            data={["review-form"]}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.aiToolContent}
            renderItem={() => (
              <View style={styles.aiToolForm}>
                <Text style={[styles.toolLead, { color: colors.foreground }]}>Collez le code à contrôler. MIA adapte son diagnostic au type de projet {selectedType.shortLabel}.</Text>
                <TextInput value={reviewCode} onChangeText={setReviewCode} maxLength={60000} multiline textAlignVertical="top" placeholder="Collez votre code ici…" placeholderTextColor={colors.muted} style={[styles.reviewCodeInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} />
                <Pressable accessibilityRole="button" disabled={reviewLoading} onPress={() => void handleCodeReview()} style={({ pressed }) => [styles.toolPrimaryButton, { backgroundColor: colors.success }, (pressed || reviewLoading) && styles.pressed]}>{reviewLoading ? <ActivityIndicator color={colors.background} /> : <MaterialIcons color={colors.background} name="fact-check" size={19} />}<Text style={[styles.toolPrimaryText, { color: colors.background }]}>{reviewLoading ? "Vérification…" : "Vérifier le code"}</Text></Pressable>
                {reviewError ? <View style={[styles.reviewError, { backgroundColor: `${colors.error}12`, borderColor: `${colors.error}66` }]}><MaterialIcons color={colors.error} name="error-outline" size={18} /><Text style={[styles.errorText, { color: colors.error }]}>{reviewError}</Text></View> : null}
                {reviewResult ? <View style={styles.reviewResults}>
                  <View style={[styles.reviewSummary, { backgroundColor: reviewResult.blockers.length ? `${colors.error}12` : `${colors.success}12`, borderColor: reviewResult.blockers.length ? `${colors.error}66` : `${colors.success}66` }]}><MaterialIcons color={reviewResult.blockers.length ? colors.error : colors.success} name={reviewResult.blockers.length ? "error-outline" : "check-circle"} size={20} /><Text style={[styles.reviewSummaryText, { color: colors.foreground }]}>{reviewResult.summary}</Text></View>
                  {reviewResult.blockers.map((item, index) => <View key={`blocker-${index}`} style={[styles.reviewItem, { borderColor: `${colors.error}66`, backgroundColor: `${colors.error}0A` }]}><MaterialIcons color={colors.error} name="block" size={17} /><View style={styles.reviewCopy}><Text style={[styles.reviewItemTitle, { color: colors.error }]}>{item.title}{item.line ? ` · ligne ${item.line}` : ""}</Text><Text style={[styles.reviewItemText, { color: colors.foreground }]}>{item.detail}</Text></View></View>)}
                  {reviewResult.warnings.map((item, index) => <View key={`warning-${index}`} style={[styles.reviewItem, { borderColor: `${colors.primary}66`, backgroundColor: `${colors.primary}0A` }]}><MaterialIcons color={colors.primary} name="warning-amber" size={17} /><View style={styles.reviewCopy}><Text style={[styles.reviewItemTitle, { color: colors.primary }]}>{item.title}{item.line ? ` · ligne ${item.line}` : ""}</Text><Text style={[styles.reviewItemText, { color: colors.foreground }]}>{item.detail}</Text></View></View>)}
                  {reviewResult.fixes.length ? <View style={[styles.fixBox, { borderColor: `${colors.success}66`, backgroundColor: `${colors.success}0A` }]}><Text style={[styles.fixTitle, { color: colors.success }]}>À corriger avant d’envoyer</Text>{reviewResult.fixes.map((fix) => <View key={fix} style={styles.fixRow}><MaterialIcons color={colors.success} name="check-circle" size={15} /><Text style={[styles.fixText, { color: colors.foreground }]}>{fix}</Text></View>)}</View> : null}
                </View> : null}
                <Text style={[styles.toolNote, { color: colors.muted }]}>MIA repère des risques probables. La compilation reste la confirmation finale.</Text>
              </View>
            )}
          />
        </ScreenContainer>
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

      <Modal visible={agentPlannerOpen} transparent animationType="slide" onRequestClose={() => setAgentPlannerOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={[styles.agentSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.typeSheetHeader}>
              <View><Text style={[styles.modalTitle, { color: colors.foreground }]}>Mode Agent</Text><Text style={[styles.modalSubtitle, { color: colors.muted }]}>L’action ne démarre jamais à cette étape.</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Fermer le Mode Agent" onPress={() => setAgentPlannerOpen(false)} style={({ pressed }) => [styles.closeButton, { borderColor: colors.border }, pressed && styles.pressed]}><MaterialIcons color={colors.foreground} name="close" size={21} /></Pressable>
            </View>
            {!agentContext.hasLatestCode && !agentContext.hasLogo ? <View style={[styles.agentEmptyHint, { backgroundColor: colors.surface, borderColor: colors.border }]}><MaterialIcons color={colors.primary} name="info-outline" size={18} /><Text style={[styles.agentEmptyHintText, { color: colors.muted }]}>Créez d’abord du code ou un logo pour débloquer d’autres actions.</Text></View> : null}
            {availableAgentActionKinds.map((kind) => {
              const action = getMiaAgentActionDetails(kind);
              const actionColor = kind === "review-latest-code" || kind === "copy-latest-code" ? colors.success : colors.primary;
              return <Pressable key={kind} accessibilityRole="button" onPress={() => prepareAgentAction(kind)} style={({ pressed }) => [styles.agentChoice, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}><MaterialIcons color={actionColor} name={AGENT_ACTION_ICONS[kind]} size={21} /><View style={styles.agentChoiceCopy}><Text style={[styles.agentChoiceTitle, { color: colors.foreground }]}>{action.title}</Text><Text style={[styles.agentChoiceText, { color: colors.muted }]}>{action.detail}</Text></View><MaterialIcons color={colors.muted} name="chevron-right" size={21} /></Pressable>;
            })}
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(pendingAgentAction)} transparent animationType="fade" onRequestClose={cancelAgentAction}>
        <View style={styles.sheetBackdrop}>
          <View style={[styles.agentSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.agentConfirmIcon, { backgroundColor: `${colors.success}14` }]}><MaterialIcons color={colors.success} name="verified-user" size={28} /></View>
            <Text style={[styles.agentConfirmTitle, { color: colors.foreground }]}>Confirmer cette action ?</Text>
            <Text style={[styles.agentConfirmLead, { color: colors.muted }]}>MIA💻 ne fera rien tant que vous n’aurez pas touché « Confirmer ».</Text>
            <View style={[styles.agentSummary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.agentSummaryLabel, { color: colors.success }]}>ACTION</Text><Text style={[styles.agentSummaryTitle, { color: colors.foreground }]}>{pendingAgentAction?.title}</Text>
              <Text style={[styles.agentSummaryLabel, { color: colors.success }]}>DONNÉES UTILISÉES</Text><Text style={[styles.agentSummaryText, { color: colors.foreground }]}>{pendingAgentAction?.dataLabel}</Text>
              <Text style={[styles.agentSummaryLabel, { color: colors.success }]}>RÉSULTAT ATTENDU</Text><Text style={[styles.agentSummaryText, { color: colors.foreground }]}>{pendingAgentAction?.consequence}</Text>
            </View>
            <Pressable accessibilityRole="button" disabled={agentExecuting} onPress={() => void confirmAgentAction()} style={({ pressed }) => [styles.agentConfirmButton, { backgroundColor: colors.success }, (pressed || agentExecuting) && styles.pressed]}>{agentExecuting ? <ActivityIndicator color={colors.background} /> : <MaterialIcons color={colors.background} name="check" size={20} />}<Text style={[styles.agentConfirmButtonText, { color: colors.background }]}>{agentExecuting ? "Exécution…" : "Confirmer l’action"}</Text></Pressable>
            <Pressable accessibilityRole="button" disabled={agentExecuting} onPress={cancelAgentAction} style={({ pressed }) => [styles.agentCancelButton, { borderColor: colors.border }, pressed && !agentExecuting && styles.pressed]}><Text style={[styles.agentCancelButtonText, { color: colors.foreground }]}>Annuler</Text></Pressable>
          </View>
        </View>
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
  utilityBar: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 6, borderBottomWidth: 1, paddingHorizontal: 16 },
  providerStrip: { gap: 8, borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 10 },
  providerChoice: { minHeight: 42, borderWidth: 1, borderRadius: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 12 },
  providerChoiceText: { fontSize: 11, fontWeight: "800" },
  kiaUnavailableText: { fontSize: 10, fontWeight: "600", lineHeight: 14, textAlign: "center" },
  agentStrip: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 8 },
  agentStripCopy: { flex: 1 },
  agentTitleRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  agentStripTitle: { fontSize: 12, fontWeight: "900" },
  agentStripText: { marginTop: 2, fontSize: 10, fontWeight: "500" },
  agentOpenButton: { minHeight: 38, borderRadius: 11, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 10 },
  agentOpenText: { fontSize: 11, fontWeight: "900" },
  projectChip: { minHeight: 34, flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 10, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5 },
  projectChipText: { fontSize: 11, fontWeight: "800" },
  connectorsButton: { width: 34, minHeight: 34, borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  connectorsHint: { alignSelf: "flex-end", maxWidth: 286, minHeight: 42, marginTop: 8, marginRight: 16, borderWidth: 1, borderRadius: 13, flexDirection: "row", alignItems: "center", gap: 7, paddingLeft: 10, paddingRight: 8 },
  connectorsHintText: { flex: 1, fontSize: 11, fontWeight: "600", lineHeight: 15 },
  connectorsHintClose: { minHeight: 30, justifyContent: "center", paddingHorizontal: 4 },
  connectorsHintCloseText: { fontSize: 11, fontWeight: "900" },
  toolsButton: { minHeight: 34, borderWidth: 1, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 9 },
  toolsButtonText: { fontSize: 11, fontWeight: "800" },
  projectStripText: { flex: 1, fontSize: 11, fontWeight: "600" },
  messagesContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20, gap: 14 },
  emptyMessagesContent: { flexGrow: 1, justifyContent: "center" },
  welcome: { alignItems: "center", paddingHorizontal: 10, paddingTop: 12 },
  welcomeTitle: { fontSize: 22, fontWeight: "900", textAlign: "center", lineHeight: 27 },
  quickPromptList: { width: "100%", flexDirection: "row", marginTop: 16, gap: 9 },
  quickPrompt: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 10 },
  quickPromptText: { fontSize: 12, fontWeight: "800" },
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
  typingCursor: { fontSize: 13, fontWeight: "900" },
  codeAttachment: { marginTop: 8, borderWidth: 1, borderRadius: 15, padding: 10 },
  logoRequestCard: { marginTop: 8, borderWidth: 1, borderRadius: 15, padding: 11, gap: 8 },
  logoResultCard: { marginTop: 8, borderWidth: 1, borderRadius: 15, padding: 11, gap: 9 },
  logoCardTitleRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  logoCardIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  logoCardTitleCopy: { flex: 1 },
  logoCardTitle: { fontSize: 13, fontWeight: "900", lineHeight: 18 },
  logoCardHint: { marginTop: 1, fontSize: 11, fontWeight: "500", lineHeight: 15 },
  logoDescriptionInput: { minHeight: 88, borderWidth: 1, borderRadius: 12, padding: 11, fontSize: 13, fontWeight: "500", lineHeight: 19 },
  logoGenerateButton: { minHeight: 46, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 2 },
  logoGenerateText: { fontSize: 13, fontWeight: "900" },
  logoPrivacyNote: { fontSize: 10, lineHeight: 15, textAlign: "center", paddingHorizontal: 4 },
  logoConversationImage: { alignSelf: "center", width: 164, height: 164, borderRadius: 22 },
  logoResultDescription: { fontSize: 11, fontWeight: "500", lineHeight: 16, textAlign: "center" },
  logoActionRow: { flexDirection: "row", gap: 8 },
  logoSecondaryAction: { flex: 1, minHeight: 39, borderRadius: 10, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  logoSecondaryActionText: { fontSize: 11, fontWeight: "900" },
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
  agentFeedback: { marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderRadius: 12, flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10 },
  agentFeedbackCopy: { flex: 1 },
  agentFeedbackTitle: { fontSize: 12, fontWeight: "900", lineHeight: 17 },
  agentFeedbackText: { marginTop: 2, fontSize: 11, fontWeight: "500", lineHeight: 16 },
  agentFeedbackClose: { width: 24, minHeight: 24, alignItems: "center", justifyContent: "center" },
  composerArea: { borderTopWidth: 1, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8 },
  composer: { minHeight: 52, borderWidth: 1, borderRadius: 18, flexDirection: "row", alignItems: "flex-end", paddingLeft: 13, paddingRight: 6, paddingTop: 6, paddingBottom: 6 },
  composerInput: { flex: 1, minHeight: 37, maxHeight: 100, fontSize: 14, fontWeight: "500", lineHeight: 20, paddingTop: 8, paddingRight: 8 },
  sendButton: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
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
  toolSheet: { borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingTop: 20, gap: 10 },
  typeSheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  typeChoice: { minHeight: 65, borderWidth: 1, borderRadius: 15, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12 },
  typeChoiceIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  typeChoiceCopy: { flex: 1 },
  typeChoiceTitle: { fontSize: 13, fontWeight: "800" },
  typeChoiceText: { marginTop: 2, fontSize: 11, lineHeight: 15 },
  toolIconStack: { width: 40, alignItems: "center", gap: 3 },
  toolIconLabel: { fontSize: 8, fontWeight: "900", letterSpacing: 0.4 },
  toolChoice: { minHeight: 70, borderWidth: 1, borderRadius: 15, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12 },
  agentSheet: { borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingTop: 20, gap: 11 },
  agentEmptyHint: { borderWidth: 1, borderRadius: 13, flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 11 },
  agentEmptyHintText: { flex: 1, fontSize: 11, fontWeight: "600", lineHeight: 16 },
  agentChoice: { minHeight: 72, borderWidth: 1, borderRadius: 15, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 13 },
  agentChoiceCopy: { flex: 1 },
  agentChoiceTitle: { fontSize: 13, fontWeight: "900" },
  agentChoiceText: { marginTop: 3, fontSize: 11, fontWeight: "500", lineHeight: 15 },
  agentConfirmIcon: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  agentConfirmTitle: { fontSize: 20, fontWeight: "900", textAlign: "center", marginTop: 3 },
  agentConfirmLead: { fontSize: 12, fontWeight: "500", textAlign: "center", lineHeight: 18, paddingHorizontal: 10 },
  agentSummary: { borderWidth: 1, borderRadius: 15, padding: 13, gap: 4, marginTop: 3 },
  agentSummaryLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 0.6, marginTop: 4 },
  agentSummaryTitle: { fontSize: 14, fontWeight: "900", lineHeight: 20 },
  agentSummaryText: { fontSize: 12, fontWeight: "600", lineHeight: 18 },
  agentConfirmButton: { minHeight: 52, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 2 },
  agentConfirmButtonText: { fontSize: 14, fontWeight: "900" },
  agentCancelButton: { minHeight: 52, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  agentCancelButtonText: { fontSize: 14, fontWeight: "800" },
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
  aiToolContent: { padding: 16, paddingBottom: 32 },
  aiToolForm: { gap: 12 },
  toolLead: { fontSize: 13, fontWeight: "600", lineHeight: 20, marginBottom: 3 },
  toolLabel: { fontSize: 12, fontWeight: "800", marginTop: 2 },
  toolInput: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 14, fontWeight: "600" },
  toolTextArea: { minHeight: 104, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, fontWeight: "500", lineHeight: 20 },
  colorRow: { flexDirection: "row", gap: 10 },
  colorField: { flex: 1, gap: 7 },
  logoPreview: { alignItems: "center", borderWidth: 1, borderRadius: 18, padding: 16, gap: 7 },
  logoPreviewImage: { width: 148, height: 148, borderRadius: 28 },
  logoPreviewName: { marginTop: 2, fontSize: 15, fontWeight: "900", textAlign: "center" },
  logoPreviewHint: { fontSize: 11, lineHeight: 16, textAlign: "center" },
  toolPrimaryButton: { minHeight: 50, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 2 },
  toolPrimaryText: { fontSize: 14, fontWeight: "900" },
  toolSecondaryButton: { minHeight: 50, borderWidth: 1, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  toolSecondaryText: { fontSize: 13, fontWeight: "900" },
  toolNote: { fontSize: 11, lineHeight: 16, textAlign: "center", paddingHorizontal: 8, paddingTop: 2 },
  reviewCodeInput: { minHeight: 168, maxHeight: 380, borderWidth: 1, borderRadius: 12, padding: 12, fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }), fontSize: 12, lineHeight: 18 },
  reviewError: { borderWidth: 1, borderRadius: 13, flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 11 },
  reviewResults: { gap: 10, marginTop: 2 },
  reviewSummary: { borderWidth: 1, borderRadius: 14, flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 12 },
  reviewSummaryText: { flex: 1, fontSize: 13, fontWeight: "700", lineHeight: 19 },
  reviewItem: { borderWidth: 1, borderRadius: 13, flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 11 },
  reviewCopy: { flex: 1 },
  reviewItemTitle: { fontSize: 12, fontWeight: "900", lineHeight: 17 },
  reviewItemText: { marginTop: 3, fontSize: 12, fontWeight: "500", lineHeight: 18 },
  fixBox: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 7 },
  fixTitle: { fontSize: 12, fontWeight: "900" },
  fixRow: { flexDirection: "row", alignItems: "flex-start", gap: 7 },
  fixText: { flex: 1, fontSize: 12, fontWeight: "600", lineHeight: 17 },
});
