import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { PROJECT_TYPES } from "@/lib/build-store";

export default function HelpScreen() {
  const colors = useColors();

  return (
    <ScreenContainer className="flex-1" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.foreground }]}>Aide</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Importez votre code, One App s’occupe du chemin vers l’APK debug.</Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardEyebrow, { color: colors.primary }]}>AVANT D’ENVOYER</Text>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Choisissez votre type de projet</Text>
          <Text style={[styles.cardText, { color: colors.muted }]}>Le type indique au compilateur comment lire votre archive ZIP. Il ne peut pas être choisi après l’envoi.</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Formats acceptés</Text>
        <View style={styles.formatList}>
          {PROJECT_TYPES.map((type) => (
            <View key={type.id} style={[styles.formatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.formatIcon}>{type.icon}</Text>
              <View style={styles.formatCopy}>
                <Text style={[styles.formatTitle, { color: colors.foreground }]}>{type.label}</Text>
                <Text style={[styles.formatText, { color: colors.muted }]}>{type.expected}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.tipCard, { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}55` }]}>
          <Text style={styles.tipIcon}>✦</Text>
          <View style={styles.tipCopy}>
            <Text style={[styles.tipTitle, { color: colors.foreground }]}>Pour éviter une erreur</Text>
            <Text style={[styles.tipText, { color: colors.muted }]}>Envoyez un ZIP propre, sans `node_modules`, dossier `build`, clés ou mots de passe. Donnez à votre projet un nom simple.</Text>
          </View>
        </View>

        <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/create")} style={({ pressed }) => [styles.action, { borderColor: colors.primary }, pressed && styles.pressed]}>
          <Text style={[styles.actionText, { color: colors.primary }]}>Créer un build</Text>
          <Text style={[styles.actionArrow, { color: colors.primary }]}>→</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 15, paddingBottom: 28 },
  title: { fontSize: 25, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 5, marginBottom: 23 },
  card: { borderWidth: 1, borderRadius: 20, padding: 17, marginBottom: 26 },
  cardEyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.1, marginBottom: 7 },
  cardTitle: { fontSize: 18, fontWeight: "800" },
  cardText: { marginTop: 7, fontSize: 13, lineHeight: 19 },
  sectionTitle: { fontSize: 17, fontWeight: "800", marginBottom: 10 },
  formatList: { gap: 9 },
  formatCard: { borderWidth: 1, borderRadius: 16, padding: 13, flexDirection: "row", alignItems: "center" },
  formatIcon: { fontSize: 21, width: 40, textAlign: "center", marginRight: 8 },
  formatCopy: { flex: 1 },
  formatTitle: { fontSize: 14, fontWeight: "800" },
  formatText: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  tipCard: { marginTop: 22, borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: "row" },
  tipIcon: { fontSize: 19, marginRight: 9 },
  tipCopy: { flex: 1 },
  tipTitle: { fontSize: 14, fontWeight: "800" },
  tipText: { fontSize: 12, marginTop: 4, lineHeight: 18 },
  action: { minHeight: 51, marginTop: 22, borderWidth: 1.5, borderRadius: 15, paddingHorizontal: 17, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  actionText: { fontSize: 15, fontWeight: "800" },
  actionArrow: { fontSize: 22, fontWeight: "700" },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});
