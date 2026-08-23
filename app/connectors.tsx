import { type ComponentProps, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  CONNECTOR_CATEGORIES,
  filterMiaConnectors,
  getMiaConnectorAction,
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
  const action = getMiaConnectorAction(connector);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={action.accessibilityLabel} onPress={onPress} style={({ pressed }) => [styles.row, { borderBottomColor: colors.border }, pressed && styles.pressed]}>
      <View style={[styles.icon, { backgroundColor: `${accent}18` }]}>
        <MaterialIcons color={accent} name={connector.icon as AppIcon} size={21} />
      </View>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={[styles.rowTitle, { color: colors.foreground }]}>{connector.title}</Text>
          <View style={[styles.status, { backgroundColor: `${accent}18` }]}><Text style={[styles.statusText, { color: accent }]}>{action.label}</Text></View>
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
  const [securitySheetVisible, setSecuritySheetVisible] = useState(false);

  const connectors = useMemo(() => filterMiaConnectors(query, category), [category, query]);

  const getAvailabilityMessage = (connector: MiaConnector) => {
    if (connector.state === "internal") return "Ce service aide déjà MIA. Aucun compte personnel n’est relié.";
    if (connector.state === "disabled") return "Ce service reste désactivé. Aucun compte n’est relié.";
    return "Le relais officiel de ce service n’est pas encore configuré. MIA ne lancera donc aucune demande de connexion.";
  };

  return (
    <ScreenContainer className="flex-1" edges={["top", "bottom", "left", "right"]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour aux réglages" onPress={() => router.back()} style={({ pressed }) => [styles.back, { borderColor: colors.border }, pressed && styles.pressed]}>
          <MaterialIcons color={colors.foreground} name="arrow-back" size={22} />
        </Pressable>
        <View style={styles.headerCopy}><Text style={[styles.headerTitle, { color: colors.foreground }]}>Connecteurs</Text><Text style={[styles.headerSubtitle, { color: colors.muted }]}>Choisissez un service</Text></View>
      </View>

      <FlatList
        data={connectors}
        keyExtractor={(connector) => connector.id}
        renderItem={({ item }) => <ConnectorRow connector={item} onPress={() => setSelectedConnector(item)} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Vos outils, en préparation.</Text>
            <Text style={[styles.lead, { color: colors.muted }]}>Les connexions officielles seront activées une par une.</Text>
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
              <MaterialIcons color={colors.primary} name="verified-user" size={18} />
              <Text style={[styles.noticeText, { color: colors.muted }]}>Une autorisation ne s’ouvrira qu’une fois le service prêt.</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Services</Text>
          </View>
        }
        ListEmptyComponent={<View style={styles.empty}><MaterialIcons color={colors.muted} name="search-off" size={28} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Aucun service trouvé</Text><Text style={[styles.emptyText, { color: colors.muted }]}>Essayez un autre mot ou une autre catégorie.</Text></View>}
        ListFooterComponent={<Pressable accessibilityRole="button" onPress={() => setSecuritySheetVisible(true)} style={styles.securityButton}><Text style={[styles.securityHint, { color: colors.muted }]}>Comment les autorisations protègent-elles mon compte ?</Text></Pressable>}
      />

      <Modal transparent visible={Boolean(selectedConnector)} animationType="fade" onRequestClose={() => setSelectedConnector(null)}>
        <View style={styles.sheetBackdrop}>
          {selectedConnector ? <View style={[styles.connectorSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.sheetHeader}>
              <View style={[styles.sheetIcon, { backgroundColor: `${stateColor(selectedConnector.state, colors)}18` }]}><MaterialIcons color={stateColor(selectedConnector.state, colors)} name={selectedConnector.icon as AppIcon} size={25} /></View>
              <View style={styles.sheetTitleCopy}><Text style={[styles.sheetTitle, { color: colors.foreground }]}>{selectedConnector.title}</Text><Text style={[styles.sheetSubtitle, { color: colors.muted }]}>{selectedConnector.status}</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={() => setSelectedConnector(null)} style={({ pressed }) => [styles.closeButton, { borderColor: colors.border }, pressed && styles.pressed]}><MaterialIcons color={colors.foreground} name="close" size={21} /></Pressable>
            </View>
            <Text style={[styles.sheetLead, { color: colors.muted }]}>MIA n’ouvrira aucune connexion tant que le relais officiel de ce service n’est pas prêt.</Text>
            <Text style={[styles.permissionsTitle, { color: colors.foreground }]}>Ce que le futur connecteur demandera</Text>
            {selectedConnector.permissions.map((permission) => <View key={permission} style={styles.permissionLine}><MaterialIcons color={colors.success} name="check-circle" size={18} /><Text style={[styles.permissionText, { color: colors.muted }]}>{permission}</Text></View>)}
            <View style={[styles.protectedBox, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}4D` }]}><MaterialIcons color={colors.primary} name="lock" size={19} /><Text style={[styles.protectedText, { color: colors.muted }]}>Une autorisation officielle s’ouvrira toujours dans le navigateur, jamais dans vos sessions existantes.</Text></View>
            {(() => {
              const action = getMiaConnectorAction(selectedConnector);
              const accent = stateColor(selectedConnector.state, colors);
              return <View accessibilityLabel={action.accessibilityLabel} style={[styles.availabilityBox, { backgroundColor: `${accent}18`, borderColor: `${accent}4D` }]}><MaterialIcons color={accent} name={selectedConnector.state === "internal" ? "check-circle" : "schedule"} size={19} /><View style={styles.availabilityCopy}><Text style={[styles.availabilityTitle, { color: colors.foreground }]}>{action.label}</Text><Text style={[styles.availabilityText, { color: colors.muted }]}>{getAvailabilityMessage(selectedConnector)}</Text></View></View>;
            })()}
            <Pressable accessibilityRole="button" onPress={() => { setSelectedConnector(null); setSecuritySheetVisible(true); }} style={({ pressed }) => [styles.cancelButton, { borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.cancelText, { color: colors.foreground }]}>Comment ça marche ?</Text></Pressable>
          </View> : null}
        </View>
      </Modal>

      <Modal transparent visible={securitySheetVisible} animationType="fade" onRequestClose={() => setSecuritySheetVisible(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={[styles.infoSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.sheetHeader}>
              <View style={[styles.sheetIcon, { backgroundColor: `${colors.primary}18` }]}><MaterialIcons color={colors.primary} name="verified-user" size={25} /></View>
              <View style={styles.sheetTitleCopy}><Text style={[styles.sheetTitle, { color: colors.foreground }]}>Connexion protégée</Text><Text style={[styles.sheetSubtitle, { color: colors.muted }]}>Vos comptes restent privés</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={() => setSecuritySheetVisible(false)} style={({ pressed }) => [styles.closeButton, { borderColor: colors.border }, pressed && styles.pressed]}><MaterialIcons color={colors.foreground} name="close" size={21} /></Pressable>
            </View>
            <Text style={[styles.infoText, { color: colors.muted }]}>Un connecteur n’est jamais relié par son simple affichage dans le catalogue. Lorsqu’un service sera prêt, son autorisation officielle demandera votre accord dans le navigateur.</Text>
            <Text style={[styles.infoText, { color: colors.muted }]}>MIA ne lit jamais vos sessions existantes, mots de passe, cookies, ni secrets présents sur votre téléphone.</Text>
            <Pressable accessibilityRole="button" onPress={() => setSecuritySheetVisible(false)} style={({ pressed }) => [styles.doneButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={[styles.doneText, { color: colors.background }]}>Fermer</Text></Pressable>
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
  notice: { marginTop: 14, borderWidth: 1, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  noticeText: { flex: 1, fontSize: 11, lineHeight: 15, fontWeight: "700" },
  sectionTitle: { marginTop: 19, marginBottom: 5, fontSize: 17, fontWeight: "900" },
  row: { minHeight: 73, flexDirection: "row", alignItems: "center", gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 3, paddingVertical: 9 },
  icon: { width: 41, height: 41, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  rowTitle: { flex: 1, fontSize: 13, fontWeight: "900" },
  status: { minHeight: 21, borderRadius: 11, justifyContent: "center", paddingHorizontal: 7 },
  statusText: { fontSize: 9, fontWeight: "900" },
  rowDetail: { marginTop: 3, fontSize: 11, lineHeight: 15 },
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
  availabilityBox: { minHeight: 68, marginTop: 18, borderWidth: 1, borderRadius: 14, flexDirection: "row", alignItems: "flex-start", gap: 9, padding: 12 },
  availabilityCopy: { flex: 1 },
  availabilityTitle: { fontSize: 13, fontWeight: "900" },
  availabilityText: { marginTop: 3, fontSize: 10, lineHeight: 15 },
  cancelButton: { minHeight: 44, marginTop: 9, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 13, fontWeight: "800" },
  infoSheet: { borderTopWidth: 1, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 26 },
  infoText: { marginTop: 17, fontSize: 12, lineHeight: 19 },
  doneButton: { minHeight: 50, marginTop: 21, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  doneText: { fontSize: 14, fontWeight: "900" },
  pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
});
