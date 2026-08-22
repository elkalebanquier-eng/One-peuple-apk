import { type ComponentProps } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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

function ConnectorRow({ connector, border }: { connector: MiaConnector; border?: string }) {
  const colors = useColors();
  const stateColors: Record<MiaConnectorState, string> = {
    planned: colors.warning,
    protected: colors.success,
    internal: colors.primary,
    disabled: colors.muted,
  };
  const accent = stateColors[connector.state];

  return (
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
    </View>
  );
}

export default function ConnectorsScreen() {
  const colors = useColors();

  const explainAuthorization = () => {
    Alert.alert(
      "Connexion sécurisée",
      "Lorsque GitHub sera activé, MIA ouvrira uniquement la page officielle d’autorisation. Vous choisirez les dépôts autorisés. Aucun mot de passe, cookie de navigateur ou jeton personnel ne sera affiché ni enregistré dans l’APK.",
      [{ text: "Compris" }],
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
          {MIA_CONNECTORS.map((connector, index) => <ConnectorRow key={connector.id} connector={connector} border={index < MIA_CONNECTORS.length - 1 ? colors.border : undefined} />)}
        </View>

        <Pressable accessibilityRole="button" onPress={explainAuthorization} style={({ pressed }) => [styles.addButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
          <MaterialIcons color={colors.background} name="add-link" size={20} />
          <Text style={[styles.addText, { color: colors.background }]}>Comprendre les connexions</Text>
        </Pressable>
        <Text style={[styles.hint, { color: colors.muted }]}>GitHub n’est pas encore relié dans cette version. La compilation personnelle actuelle fonctionne sans compte GitHub connecté dans MIA.</Text>
      </ScrollView>
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
  icon: { width: 41, height: 41, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  rowTitle: { flex: 1, fontSize: 13, fontWeight: "900" },
  status: { minHeight: 21, borderRadius: 11, justifyContent: "center", paddingHorizontal: 7 },
  statusText: { fontSize: 9, fontWeight: "900" },
  rowDetail: { marginTop: 4, fontSize: 11, lineHeight: 16 },
  addButton: { minHeight: 50, borderRadius: 14, marginTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  addText: { fontSize: 14, fontWeight: "900" },
  hint: { marginTop: 11, paddingHorizontal: 8, textAlign: "center", fontSize: 11, lineHeight: 16 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
});
