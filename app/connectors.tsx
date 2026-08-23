import { type ComponentProps, useMemo, useState } from "react";
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  CONNECTOR_CATEGORIES,
  filterMiaConnectors,
  type MiaConnector,
  type MiaConnectorCategory,
  type MiaConnectorState,
} from "@/shared/mia-connectors";

type AppIcon = ComponentProps<typeof MaterialIcons>["name"];

function stateColor(state: MiaConnectorState, colors: ReturnType<typeof useColors>) {
  if (state === "protected") return colors.success;
  if (state === "internal") return colors.primary;
  if (state === "disabled") return colors.muted;
  return colors.warning;
}

function ConnectorRow({ connector, onPress }: { connector: MiaConnector; onPress: () => void }) {
  const colors = useColors();
  const accent = stateColor(connector.state, colors);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Voir ${connector.title}`} onPress={onPress} style={({ pressed }) => [styles.row, { borderBottomColor: colors.border }, pressed && styles.pressed]}>
      <View style={[styles.icon, { backgroundColor: `${accent}18` }]}>
        <MaterialIcons color={accent} name={connector.icon as AppIcon} size={21} />
      </View>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={[styles.rowTitle, { color: colors.foreground }]}>{connector.title}</Text>
          <View style={[styles.status, { backgroundColor: `${accent}18` }]}><Text style={[styles.statusText, { color: accent }]}>{connector.status}</Text></View>
        </View>
        <Text numberOfLines={2} style={[styles.rowDetail, { color: colors.muted }]}>{connector.detail}</Text>
      </View>
      <MaterialIcons color={colors.muted} name="chevron-right" size={21} />
    </Pressable>
  );
}

export default function ConnectorsScreen() {
  const colors = useColors();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MiaConnectorCategory>("Tous");
  const [selectedConnector, setSelectedConnector] = useState<MiaConnector | null>(null);
  const [githubSetupOpen, setGithubSetupOpen] = useState(false);
  const [buildStatusAccess, setBuildStatusAccess] = useState(true);
  const [githubPreparationDone, setGithubPreparationDone] = useState(false);

  const connectors = useMemo(() => filterMiaConnectors(query, category), [category, query]);

  const openConnector = (connector: MiaConnector) => {
    if (connector.id === "github") {
      setGithubPreparationDone(false);
      setGithubSetupOpen(true);
      return;
    }
    setSelectedConnector(connector);
  };

  const prepareGithubAuthorization = () => {
    Alert.alert(
      "Préparer l’autorisation GitHub ?",
      "MIA mémorisera seulement le choix de suivi pendant cette préparation. Aucun compte, mot de passe, cookie ou jeton GitHub n’est récupéré.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Préparer", onPress: () => setGithubPreparationDone(true) },
      ],
    );
  };

  const showSecurityExplanation = () => {
    Alert.alert(
      "Connexion protégée",
      "Un connecteur n’est jamais relié par son simple affichage dans le catalogue. Il faudra toujours une autorisation officielle du service, suivie d’un accord clair. MIA ne lit pas les sessions, mots de passe, cookies ni secrets déjà présents sur votre téléphone.",
      [{ text: "Compris" }],
    );
  };

  return (
    <ScreenContainer className="flex-1" edges={["top", "bottom", "left", "right"]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour aux réglages" onPress={() => router.back()} style={({ pressed }) => [styles.back, { borderColor: colors.border }, pressed && styles.pressed]}>
          <MaterialIcons color={colors.foreground} name="arrow-back" size={22} />
        </Pressable>
        <View style={styles.headerCopy}><Text style={[styles.headerTitle, { color: colors.foreground }]}>Connecteurs</Text><Text style={[styles.headerSubtitle, { color: colors.muted }]}>{connectors.length} services dans le catalogue</Text></View>
      </View>

      <FlatList
        data={connectors}
        keyExtractor={(connector) => connector.id}
        renderItem={({ item }) => <ConnectorRow connector={item} onPress={() => openConnector(item)} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Ajoutez les services dont vous avez besoin.</Text>
            <Text style={[styles.lead, { color: colors.muted }]}>Touchez un service pour voir les permissions prévues. Aucun ne se connecte sans votre accord officiel.</Text>
            <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialIcons color={colors.muted} name="search" size={20} />
              <TextInput accessibilityLabel="Rechercher un connecteur" autoCapitalize="none" onChangeText={setQuery} placeholder="Rechercher un service" placeholderTextColor={colors.muted} style={[styles.searchInput, { color: colors.foreground }]} value={query} />
              {query ? <Pressable accessibilityRole="button" accessibilityLabel="Effacer la recherche" onPress={() => setQuery("")}><MaterialIcons color={colors.muted} name="close" size={19} /></Pressable> : null}
            </View>
            <ScrollView contentContainerStyle={styles.categoryList} horizontal showsHorizontalScrollIndicator={false}>
              {CONNECTOR_CATEGORIES.map((item) => {
                const active = item === category;
                return <Pressable accessibilityRole="button" key={item} onPress={() => setCategory(item)} style={({ pressed }) => [styles.category, { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border }, pressed && styles.pressed]}><Text style={[styles.categoryText, { color: active ? colors.background : colors.foreground }]}>{item}</Text></Pressable>;
              })}
            </ScrollView>
            <View style={[styles.notice, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}4D` }]}>
              <MaterialIcons color={colors.primary} name="verified-user" size={22} />
              <Text style={[styles.noticeText, { color: colors.muted }]}>Le catalogue présente les intégrations prévues. Un service ne devient connecté qu’après son autorisation officielle et la configuration de son relais sécurisé.</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Catalogue</Text>
          </View>
        }
        ListEmptyComponent={<View style={styles.empty}><MaterialIcons color={colors.muted} name="search-off" size={28} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Aucun service trouvé</Text><Text style={[styles.emptyText, { color: colors.muted }]}>Essayez un autre mot ou une autre catégorie.</Text></View>}
        ListFooterComponent={<Pressable accessibilityRole="button" onPress={showSecurityExplanation} style={styles.securityButton}><Text style={[styles.securityHint, { color: colors.muted }]}>Comment les autorisations protègent-elles mon compte ?</Text></Pressable>}
      />

      <Modal transparent visible={Boolean(selectedConnector)} animationType="fade" onRequestClose={() => setSelectedConnector(null)}>
        <View style={styles.sheetBackdrop}>
          {selectedConnector ? <View style={[styles.connectorSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.sheetHeader}>
              <View style={[styles.sheetIcon, { backgroundColor: `${stateColor(selectedConnector.state, colors)}18` }]}><MaterialIcons color={stateColor(selectedConnector.state, colors)} name={selectedConnector.icon as AppIcon} size={25} /></View>
              <View style={styles.sheetTitleCopy}><Text style={[styles.sheetTitle, { color: colors.foreground }]}>{selectedConnector.title}</Text><Text style={[styles.sheetSubtitle, { color: colors.muted }]}>{selectedConnector.status}</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={() => setSelectedConnector(null)} style={({ pressed }) => [styles.closeButton, { borderColor: colors.border }, pressed && styles.pressed]}><MaterialIcons color={colors.foreground} name="close" size={21} /></Pressable>
            </View>
            <Text style={[styles.sheetLead, { color: colors.muted }]}>{selectedConnector.detail}</Text>
            <Text style={[styles.permissionsTitle, { color: colors.foreground }]}>Permissions prévues</Text>
            {selectedConnector.permissions.map((permission) => <View key={permission} style={styles.permissionLine}><MaterialIcons color={colors.success} name="check-circle" size={18} /><Text style={[styles.permissionText, { color: colors.muted }]}>{permission}</Text></View>)}
            <View style={[styles.protectedBox, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}4D` }]}><MaterialIcons color={colors.primary} name="lock" size={19} /><Text style={[styles.protectedText, { color: colors.muted }]}>Ce service est dans le catalogue. Il ne sera connecté que lorsqu’un relais OAuth officiel sera configuré et que vous l’autoriserez.</Text></View>
            <Pressable accessibilityRole="button" onPress={() => { setSelectedConnector(null); showSecurityExplanation(); }} style={({ pressed }) => [styles.cancelButton, { borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.cancelText, { color: colors.foreground }]}>Comprendre la sécurité</Text></Pressable>
          </View> : null}
        </View>
      </Modal>

      <Modal transparent visible={githubSetupOpen} animationType="fade" onRequestClose={() => setGithubSetupOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={[styles.connectorSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.sheetHeader}>
              <View style={[styles.sheetIcon, { backgroundColor: `${colors.primary}16` }]}><MaterialIcons color={colors.primary} name="code" size={25} /></View>
              <View style={styles.sheetTitleCopy}><Text style={[styles.sheetTitle, { color: colors.foreground }]}>Configurer GitHub</Text><Text style={[styles.sheetSubtitle, { color: colors.muted }]}>Vous gardez le contrôle sur les accès.</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Fermer la configuration GitHub" onPress={() => setGithubSetupOpen(false)} style={({ pressed }) => [styles.closeButton, { borderColor: colors.border }, pressed && styles.pressed]}><MaterialIcons color={colors.foreground} name="close" size={21} /></Pressable>
            </View>
            <Text style={[styles.sheetLead, { color: colors.muted }]}>GitHub sera le premier connecteur qui pourra devenir actif dès que son relais OAuth sécurisé sera configuré. Cette APK ne stocke aucun secret GitHub.</Text>
            <View style={[styles.permissionBox, { backgroundColor: colors.surface, borderColor: colors.border }]}><MaterialIcons color={colors.success} name="folder-special" size={20} /><View style={styles.permissionCopy}><Text style={[styles.permissionTitle, { color: colors.foreground }]}>Dépôts que vous choisissez</Text><Text style={[styles.permissionDetail, { color: colors.muted }]}>MIA ne demandera pas l’accès à tous vos dépôts.</Text></View></View>
            <View style={[styles.permissionBox, { backgroundColor: colors.surface, borderColor: colors.border }]}><MaterialIcons color={colors.primary} name="build" size={20} /><View style={styles.permissionCopy}><Text style={[styles.permissionTitle, { color: colors.foreground }]}>Suivi des compilations</Text><Text style={[styles.permissionDetail, { color: colors.muted }]}>Affiche seulement les compilations que vous lancez.</Text></View><Switch accessibilityLabel="Autoriser le suivi des compilations" value={buildStatusAccess} onValueChange={setBuildStatusAccess} trackColor={{ false: colors.border, true: `${colors.primary}99` }} thumbColor={buildStatusAccess ? colors.primary : colors.muted} /></View>
            {githubPreparationDone ? <View style={[styles.readyNotice, { backgroundColor: `${colors.success}12`, borderColor: `${colors.success}4D` }]}><MaterialIcons color={colors.success} name="verified-user" size={20} /><Text style={[styles.readyText, { color: colors.muted }]}>Préparation terminée. GitHub n’est pas encore connecté : l’autorisation officielle s’ouvrira après la configuration du relais sécurisé.</Text></View> : null}
            <Pressable accessibilityRole="button" onPress={prepareGithubAuthorization} style={({ pressed }) => [styles.authorizeButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}><MaterialIcons color={colors.background} name="lock-open" size={19} /><Text style={[styles.addText, { color: colors.background }]}>Préparer l’autorisation</Text></Pressable>
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
  listContent: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 30 },
  title: { maxWidth: 345, fontSize: 26, lineHeight: 32, fontWeight: "900", letterSpacing: -0.7 },
  lead: { marginTop: 8, fontSize: 13, lineHeight: 20 },
  searchBox: { minHeight: 48, marginTop: 18, borderWidth: 1, borderRadius: 15, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 13 },
  searchInput: { flex: 1, minHeight: 44, fontSize: 13 },
  categoryList: { gap: 8, paddingTop: 12, paddingRight: 18 },
  category: { minHeight: 36, borderWidth: 1, borderRadius: 18, justifyContent: "center", paddingHorizontal: 13 },
  categoryText: { fontSize: 11, fontWeight: "800" },
  notice: { marginTop: 16, borderWidth: 1, borderRadius: 18, flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14 },
  noticeText: { flex: 1, fontSize: 11, lineHeight: 17 },
  sectionTitle: { marginTop: 24, marginBottom: 7, fontSize: 18, fontWeight: "900" },
  row: { minHeight: 86, flexDirection: "row", alignItems: "center", gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 3, paddingVertical: 11 },
  icon: { width: 41, height: 41, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  rowTitle: { flex: 1, fontSize: 13, fontWeight: "900" },
  status: { minHeight: 21, borderRadius: 11, justifyContent: "center", paddingHorizontal: 7 },
  statusText: { fontSize: 9, fontWeight: "900" },
  rowDetail: { marginTop: 4, fontSize: 11, lineHeight: 16 },
  empty: { alignItems: "center", paddingVertical: 42 },
  emptyTitle: { marginTop: 10, fontSize: 14, fontWeight: "900" },
  emptyText: { marginTop: 4, fontSize: 12 },
  securityButton: { marginTop: 22, alignItems: "center", paddingVertical: 10 },
  securityHint: { fontSize: 11, fontWeight: "700", textAlign: "center", textDecorationLine: "underline" },
  sheetBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(8, 12, 20, 0.48)" },
  connectorSheet: { borderTopWidth: 1, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 26 },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  sheetIcon: { width: 45, height: 45, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sheetTitleCopy: { flex: 1 },
  sheetTitle: { fontSize: 18, lineHeight: 22, fontWeight: "900" },
  sheetSubtitle: { marginTop: 2, fontSize: 11, fontWeight: "600" },
  closeButton: { width: 38, height: 38, borderWidth: 1, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  sheetLead: { marginTop: 18, fontSize: 12, lineHeight: 18 },
  permissionsTitle: { marginTop: 17, fontSize: 12, fontWeight: "900" },
  permissionLine: { marginTop: 9, flexDirection: "row", alignItems: "center", gap: 8 },
  permissionText: { flex: 1, fontSize: 11, lineHeight: 16 },
  protectedBox: { marginTop: 16, borderWidth: 1, borderRadius: 15, flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 11 },
  protectedText: { flex: 1, fontSize: 10, lineHeight: 15 },
  permissionBox: { minHeight: 70, marginTop: 12, borderWidth: 1, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 11 },
  permissionCopy: { flex: 1 },
  permissionTitle: { fontSize: 12, fontWeight: "900" },
  permissionDetail: { marginTop: 3, fontSize: 10, lineHeight: 14 },
  readyNotice: { marginTop: 14, borderWidth: 1, borderRadius: 15, flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 11 },
  readyText: { flex: 1, fontSize: 10, lineHeight: 15 },
  authorizeButton: { minHeight: 50, marginTop: 18, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  addText: { fontSize: 14, fontWeight: "900" },
  cancelButton: { minHeight: 44, marginTop: 9, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 13, fontWeight: "800" },
  pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
});
