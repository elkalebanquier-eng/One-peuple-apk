import { type ComponentProps, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MIA_CONNECTORS, type MiaConnector, type MiaConnectorState } from "@/shared/mia-connectors";

type AppIcon = ComponentProps<typeof MaterialIcons>["name"];

const CONNECTOR_ICONS: Record<MiaConnector["id"], AppIcon> = {
  github: "code",
  browser: "public",
  cloudflare: "cloud-queue",
  gemini: "auto-awesome",
};

function ConnectorRow({ connector, border, onPress }: { connector: MiaConnector; border?: string; onPress?: () => void }) {
  const colors = useColors();
  const stateColors: Record<MiaConnectorState, string> = {
    planned: colors.warning,
    protected: colors.success,
    internal: colors.primary,
    disabled: colors.muted,
  };
  const accent = stateColors[connector.state];

  const content = (
    <View style={[styles.row, border ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: border } : null]}>
      <View style={[styles.icon, { backgroundColor: `${accent}18` }]}>
        <MaterialIcons color={accent} name={CONNECTOR_ICONS[connector.id]} size={21} />
      </View>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={[styles.rowTitle, { color: colors.foreground }]}>{connector.title}</Text>
          <View style={[styles.status, { backgroundColor: `${accent}18` }]}><Text style={[styles.statusText, { color: accent }]}>{connector.status}</Text></View>
        </View>
        <Text style={[styles.rowDetail, { color: colors.muted }]}>{connector.detail}</Text>
      </View>
      {onPress ? <MaterialIcons color={colors.muted} name="chevron-right" size={21} /> : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Configurer ${connector.title}`} onPress={onPress} style={({ pressed }) => pressed && styles.rowPressed}>
      {content}
    </Pressable>
  );
}

export default function ConnectorsScreen() {
  const colors = useColors();
  const [githubSetupOpen, setGithubSetupOpen] = useState(false);
  const [buildStatusAccess, setBuildStatusAccess] = useState(true);
  const [githubPreparationDone, setGithubPreparationDone] = useState(false);

  const explainAuthorization = () => {
    Alert.alert(
      "Connexion sécurisée",
      "Lorsque GitHub sera activé, MIA ouvrira uniquement la page officielle d’autorisation. Vous choisirez les dépôts autorisés. Aucun mot de passe, cookie de navigateur ou jeton personnel ne sera affiché ni enregistré dans l’APK.",
      [{ text: "Compris" }],
    );
  };

  const openGithubSetup = () => {
    setGithubPreparationDone(false);
    setGithubSetupOpen(true);
  };

  const prepareGithubAuthorization = () => {
    Alert.alert(
      "Préparer l’autorisation GitHub ?",
      "MIA mémorisera uniquement vos choix de permission pour cette préparation. Aucun mot de passe, cookie, jeton ou compte GitHub n’est récupéré dans cette étape.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Préparer", onPress: () => setGithubPreparationDone(true) },
      ],
    );
  };

  return (
    <ScreenContainer className="flex-1" edges={["top", "bottom", "left", "right"]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour aux réglages" onPress={() => router.back()} style={({ pressed }) => [styles.back, { borderColor: colors.border }, pressed && styles.pressed]}>
          <MaterialIcons color={colors.foreground} name="arrow-back" size={22} />
        </Pressable>
        <View style={styles.headerCopy}><Text style={[styles.headerTitle, { color: colors.foreground }]}>Connecteurs</Text><Text style={[styles.headerSubtitle, { color: colors.muted }]}>Vos services, vos autorisations</Text></View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.foreground }]}>Relier un service sans donner vos secrets.</Text>
        <Text style={[styles.lead, { color: colors.muted }]}>Vous contrôlez les autorisations. MIA ne récupère pas vos mots de passe, vos cookies ni les sessions déjà ouvertes sur votre téléphone.</Text>

        <View style={[styles.notice, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}4D` }]}>
          <MaterialIcons color={colors.primary} name="verified-user" size={22} />
          <Text style={[styles.noticeText, { color: colors.muted }]}>Quand un connecteur sera prêt, son bouton ouvrira la page officielle du service. Vous pourrez accepter, refuser ou retirer l’accès depuis ce service.</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Connecteurs</Text>
        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {MIA_CONNECTORS.map((connector, index) => <ConnectorRow key={connector.id} connector={connector} border={index < MIA_CONNECTORS.length - 1 ? colors.border : undefined} onPress={connector.id === "github" ? openGithubSetup : undefined} />)}
        </View>

        <Pressable accessibilityRole="button" onPress={openGithubSetup} style={({ pressed }) => [styles.addButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
          <MaterialIcons color={colors.background} name="add-link" size={20} />
          <Text style={[styles.addText, { color: colors.background }]}>Configurer GitHub</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={explainAuthorization} style={styles.infoButton}>
          <Text style={[styles.hint, { color: colors.muted }]}>GitHub n’est pas encore relié dans cette version. Touchez ici pour comprendre les connexions.</Text>
        </Pressable>
      </ScrollView>

      <Modal transparent visible={githubSetupOpen} animationType="fade" onRequestClose={() => setGithubSetupOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={[styles.githubSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.sheetHeader}>
              <View style={[styles.githubIcon, { backgroundColor: `${colors.primary}16` }]}><MaterialIcons color={colors.primary} name="code" size={25} /></View>
              <View style={styles.sheetTitleCopy}><Text style={[styles.sheetTitle, { color: colors.foreground }]}>Configurer GitHub</Text><Text style={[styles.sheetSubtitle, { color: colors.muted }]}>Vous gardez le contrôle sur les accès.</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Fermer la configuration GitHub" onPress={() => setGithubSetupOpen(false)} style={({ pressed }) => [styles.closeButton, { borderColor: colors.border }, pressed && styles.pressed]}><MaterialIcons color={colors.foreground} name="close" size={21} /></Pressable>
            </View>

            <Text style={[styles.sheetLead, { color: colors.muted }]}>MIA demandera uniquement une autorisation officielle GitHub lorsque le relais sécurisé sera configuré. Cette APK ne stocke aucun mot de passe, cookie ou jeton GitHub.</Text>

            <View style={[styles.permissionBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialIcons color={colors.success} name="folder-special" size={20} />
              <View style={styles.permissionCopy}><Text style={[styles.permissionTitle, { color: colors.foreground }]}>Dépôts que vous choisissez</Text><Text style={[styles.permissionDetail, { color: colors.muted }]}>MIA ne demandera pas l’accès à tous vos dépôts.</Text></View>
            </View>
            <View style={[styles.permissionBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialIcons color={colors.primary} name="build" size={20} />
              <View style={styles.permissionCopy}><Text style={[styles.permissionTitle, { color: colors.foreground }]}>Suivi des compilations</Text><Text style={[styles.permissionDetail, { color: colors.muted }]}>Autorise uniquement l’affichage de l’état de vos compilations choisies.</Text></View>
              <Switch accessibilityLabel="Autoriser le suivi des compilations" value={buildStatusAccess} onValueChange={setBuildStatusAccess} trackColor={{ false: colors.border, true: `${colors.primary}99` }} thumbColor={buildStatusAccess ? colors.primary : colors.muted} />
            </View>

            {githubPreparationDone ? (
              <View style={[styles.readyNotice, { backgroundColor: `${colors.success}12`, borderColor: `${colors.success}4D` }]}><MaterialIcons color={colors.success} name="verified-user" size={20} /><Text style={[styles.readyText, { color: colors.muted }]}>Préparation terminée. Aucun compte n’est encore connecté : l’autorisation GitHub réelle sera ouverte seulement après la configuration du relais sécurisé.</Text></View>
            ) : null}

            <Pressable accessibilityRole="button" onPress={prepareGithubAuthorization} style={({ pressed }) => [styles.authorizeButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
              <MaterialIcons color={colors.background} name="lock-open" size={19} /><Text style={[styles.addText, { color: colors.background }]}>Préparer l’autorisation</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setGithubSetupOpen(false)} style={({ pressed }) => [styles.cancelButton, { borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.cancelText, { color: colors.foreground }]}>Fermer</Text></Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 66, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 },
  back: { width: 40, height: 40, borderWidth: 1, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "900", lineHeight: 22 },
  headerSubtitle: { marginTop: 2, fontSize: 11, fontWeight: "600" },
  content: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 30 },
  title: { maxWidth: 340, fontSize: 27, lineHeight: 33, fontWeight: "900", letterSpacing: -0.7 },
  lead: { marginTop: 8, fontSize: 13, lineHeight: 20 },
  notice: { marginTop: 18, borderWidth: 1, borderRadius: 18, flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14 },
  noticeText: { flex: 1, fontSize: 11, lineHeight: 17 },
  sectionTitle: { marginTop: 26, marginBottom: 11, fontSize: 18, fontWeight: "900" },
  panel: { borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  row: { minHeight: 91, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 14, paddingVertical: 12 },
  rowPressed: { opacity: 0.74 },
  icon: { width: 41, height: 41, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  rowTitle: { flex: 1, fontSize: 13, fontWeight: "900" },
  status: { minHeight: 21, borderRadius: 11, justifyContent: "center", paddingHorizontal: 7 },
  statusText: { fontSize: 9, fontWeight: "900" },
  rowDetail: { marginTop: 4, fontSize: 11, lineHeight: 16 },
  addButton: { minHeight: 50, borderRadius: 14, marginTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  addText: { fontSize: 14, fontWeight: "900" },
  infoButton: { marginTop: 8 },
  hint: { paddingHorizontal: 8, textAlign: "center", fontSize: 11, lineHeight: 16 },
  sheetBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(8, 12, 20, 0.48)" },
  githubSheet: { borderTopWidth: 1, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 26 },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  githubIcon: { width: 45, height: 45, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sheetTitleCopy: { flex: 1 },
  sheetTitle: { fontSize: 18, lineHeight: 22, fontWeight: "900" },
  sheetSubtitle: { marginTop: 2, fontSize: 11, fontWeight: "600" },
  closeButton: { width: 38, height: 38, borderWidth: 1, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  sheetLead: { marginTop: 18, fontSize: 12, lineHeight: 18 },
  permissionBox: { minHeight: 70, marginTop: 12, borderWidth: 1, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 11 },
  permissionCopy: { flex: 1 },
  permissionTitle: { fontSize: 12, fontWeight: "900" },
  permissionDetail: { marginTop: 3, fontSize: 10, lineHeight: 14 },
  readyNotice: { marginTop: 14, borderWidth: 1, borderRadius: 15, flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 11 },
  readyText: { flex: 1, fontSize: 10, lineHeight: 15 },
  authorizeButton: { minHeight: 50, marginTop: 18, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  cancelButton: { minHeight: 44, marginTop: 9, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 13, fontWeight: "800" },
  pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
});
