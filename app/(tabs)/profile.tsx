import type { ComponentProps } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { PROJECT_TYPES, type ProjectType } from "@/lib/build-store";

type IconName = ComponentProps<typeof MaterialIcons>["name"];
const TYPE_ICONS: Record<ProjectType, IconName> = { expo: "code", android: "android", html: "language" };

export default function HelpScreen() {
  const colors = useColors();
  return (
    <ScreenContainer className="flex-1" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerLabel}><View style={[styles.headerDot, { backgroundColor: colors.success }]} /><Text style={[styles.eyebrow, { color: colors.primary }]}>ONE PEUPLE · GUIDE RAPIDE</Text></View>
        <Text style={[styles.title, { color: colors.foreground }]}>Créer une APK en trois étapes.</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Pas besoin de connaître les outils Android. Suivez simplement l’ordre ci-dessous.</Text>

        <View style={styles.guideList}>
          <View style={[styles.guideRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.guideNumber, { backgroundColor: colors.primary }]}><Text style={[styles.guideNumberText, { color: colors.background }]}>1</Text></View><View style={styles.guideCopy}><Text style={[styles.guideTitle, { color: colors.foreground }]}>Choisissez le type</Text><Text style={[styles.guideText, { color: colors.muted }]}>Expo, Android natif ou HTML. Ce choix explique comment lire votre code.</Text></View></View>
          <View style={[styles.guideRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.guideNumber, { backgroundColor: colors.primary }]}><Text style={[styles.guideNumberText, { color: colors.background }]}>2</Text></View><View style={styles.guideCopy}><Text style={[styles.guideTitle, { color: colors.foreground }]}>Ajoutez votre fichier</Text><Text style={[styles.guideText, { color: colors.muted }]}>Un ZIP est demandé, sauf pour HTML où index.html est aussi accepté.</Text></View></View>
          <View style={[styles.guideRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.guideNumber, { backgroundColor: colors.primary }]}><Text style={[styles.guideNumberText, { color: colors.background }]}>3</Text></View><View style={styles.guideCopy}><Text style={[styles.guideTitle, { color: colors.foreground }]}>Téléchargez l’APK</Text><Text style={[styles.guideText, { color: colors.muted }]}>Quand le statut devient « APK prête », téléchargez-la puis installez-la sur Android.</Text></View></View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Fichiers acceptés</Text>
        <View style={[styles.formatPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {PROJECT_TYPES.map((type, index) => <View key={type.id} style={[styles.formatRow, index < PROJECT_TYPES.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}><MaterialIcons color={colors.primary} name={TYPE_ICONS[type.id]} size={21} /><View style={styles.formatCopy}><Text style={[styles.formatTitle, { color: colors.foreground }]}>{type.label}</Text><Text style={[styles.formatText, { color: colors.muted }]}>{type.expected}</Text></View></View>)}
        </View>

        <View style={[styles.warning, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}4D` }]}><MaterialIcons color={colors.primary} name="shield" size={20} /><View style={styles.warningCopy}><Text style={[styles.warningTitle, { color: colors.foreground }]}>Gardez vos informations secrètes</Text><Text style={[styles.warningText, { color: colors.muted }]}>Retirez les mots de passe, clés API et données privées avant l’envoi. N’ajoutez pas node_modules dans un ZIP.</Text></View></View>

        <Pressable accessibilityRole="button" accessibilityLabel="Créer une compilation" onPress={() => router.push("/(tabs)/create")} style={({ pressed }) => [styles.action, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={[styles.actionText, { color: colors.background }]}>Créer une compilation</Text><MaterialIcons color={colors.background} name="arrow-forward" size={22} /></Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 30 },
  headerLabel: { flexDirection: "row", alignItems: "center", gap: 7 },
  headerDot: { width: 7, height: 7, borderRadius: 4 },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  title: { marginTop: 9, fontSize: 29, lineHeight: 35, fontWeight: "900", letterSpacing: -1, maxWidth: 320 },
  subtitle: { marginTop: 8, fontSize: 13, lineHeight: 20, maxWidth: 335 },
  guideList: { gap: 10, marginTop: 25 },
  guideRow: { borderWidth: 1, borderRadius: 20, padding: 14, flexDirection: "row", alignItems: "flex-start" },
  guideNumber: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 11 },
  guideNumberText: { fontSize: 12, fontWeight: "900" },
  guideCopy: { flex: 1 },
  guideTitle: { fontSize: 14, fontWeight: "800" },
  guideText: { marginTop: 3, fontSize: 11, lineHeight: 17 },
  sectionTitle: { marginTop: 29, marginBottom: 12, fontSize: 18, fontWeight: "900", letterSpacing: -0.3 },
  formatPanel: { borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  formatRow: { minHeight: 67, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 12 },
  formatCopy: { flex: 1 },
  formatTitle: { fontSize: 13, fontWeight: "800" },
  formatText: { marginTop: 2, fontSize: 11, lineHeight: 16 },
  warning: { marginTop: 22, borderWidth: 1, borderRadius: 19, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  warningCopy: { flex: 1 },
  warningTitle: { fontSize: 13, fontWeight: "800" },
  warningText: { marginTop: 3, fontSize: 11, lineHeight: 17 },
  action: { minHeight: 61, marginTop: 23, paddingHorizontal: 17, borderRadius: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  actionText: { fontSize: 15, fontWeight: "900" },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});
