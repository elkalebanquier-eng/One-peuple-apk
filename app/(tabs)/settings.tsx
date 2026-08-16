import { ScrollView, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

function InfoRow({ icon, title, detail, border }: { icon: "inventory-2" | "timer" | "lock-outline" | "info-outline"; title: string; detail: string; border?: string }) {
  const colors = useColors();
  return <View style={[styles.infoRow, border ? { borderBottomColor: border, borderBottomWidth: StyleSheet.hairlineWidth } : null]}><View style={[styles.infoIcon, { backgroundColor: colors.background }]}><MaterialIcons color={colors.primary} name={icon} size={19} /></View><View style={styles.infoCopy}><Text style={[styles.infoTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.infoDetail, { color: colors.muted }]}>{detail}</Text></View></View>;
}

export default function SettingsScreen() {
  const colors = useColors();
  return (
    <ScreenContainer className="flex-1" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>À PROPOS DE ONE APP</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Simple, même depuis un téléphone.</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Ces informations décrivent les limites et la protection appliquées à la compilation.</Text>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Votre compilation</Text>
        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <InfoRow icon="inventory-2" title="Fichiers acceptés" detail="ZIP Expo, Android natif ou HTML" border={colors.border} />
          <InfoRow icon="timer" title="Limite gratuite" detail="2 compilations par heure · 50 Mo maximum" border={colors.border} />
          <InfoRow icon="info-outline" title="Résultat" detail="APK Android destinée aux tests" />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Protection</Text>
        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <InfoRow icon="lock-outline" title="Fichier source" detail="Utilisé seulement pendant la préparation de la compilation" border={colors.border} />
          <InfoRow icon="timer" title="Lien APK" detail="Disponible temporairement après la compilation" />
        </View>

        <View style={[styles.notice, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}4D` }]}><MaterialIcons color={colors.primary} name="lightbulb-outline" size={21} /><Text style={[styles.noticeText, { color: colors.muted }]}>Pour éviter un refus, envoyez un fichier propre : pas de node_modules, pas de dossier build et aucune clé secrète.</Text></View>
        <Text style={[styles.version, { color: colors.muted }]}>One App · Version 1.0.0</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 15, paddingBottom: 30 },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  title: { marginTop: 5, fontSize: 26, lineHeight: 32, fontWeight: "800", letterSpacing: -0.8, maxWidth: 310 },
  subtitle: { marginTop: 7, fontSize: 13, lineHeight: 19 },
  sectionTitle: { marginTop: 27, marginBottom: 11, fontSize: 17, fontWeight: "800" },
  panel: { borderWidth: 1, borderRadius: 18, overflow: "hidden" },
  infoRow: { minHeight: 75, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 11 },
  infoIcon: { width: 39, height: 39, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  infoCopy: { flex: 1 },
  infoTitle: { fontSize: 13, fontWeight: "800" },
  infoDetail: { marginTop: 3, fontSize: 11, lineHeight: 16 },
  notice: { marginTop: 23, borderWidth: 1, borderRadius: 17, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  noticeText: { flex: 1, fontSize: 11, lineHeight: 17 },
  version: { marginTop: 23, textAlign: "center", fontSize: 11 },
});
