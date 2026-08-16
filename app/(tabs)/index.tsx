import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  formatBytes,
  getProjectType,
  subscribeToBuildJobs,
  type BuildJob,
  type BuildStatus,
} from "@/lib/build-store";

const STATUS_COPY: Record<BuildStatus, { label: string; color: string; icon: string }> = {
  draft: { label: "Brouillon", color: "#8B93A7", icon: "○" },
  ready: { label: "Prêt à envoyer", color: "#FFB35C", icon: "●" },
  queued: { label: "En attente", color: "#FFB35C", icon: "◌" },
  building: { label: "Compilation", color: "#7AA7FF", icon: "◌" },
  complete: { label: "APK prête", color: "#34D399", icon: "●" },
  failed: { label: "À corriger", color: "#FF5C72", icon: "!" },
};

function BuildCard({ item }: { item: BuildJob }) {
  const colors = useColors();
  const type = getProjectType(item.projectType);
  const status = STATUS_COPY[item.status];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Build ${item.projectName}, ${status.label}`}
      style={({ pressed }) => [
        styles.buildCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.typeIcon, { backgroundColor: colors.background }]}>
          <Text style={styles.typeIconText}>{type.icon}</Text>
        </View>
        <View style={styles.cardTitleBlock}>
          <Text numberOfLines={1} style={[styles.cardTitle, { color: colors.foreground }]}>
            {item.projectName}
          </Text>
          <Text numberOfLines={1} style={[styles.cardMeta, { color: colors.muted }]}>
            {type.label} · {formatBytes(item.sourceSize)}
          </Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: `${status.color}22` }]}>
          <Text style={[styles.statusDotText, { color: status.color }]}>{status.icon}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
        <Text numberOfLines={1} style={[styles.fileLabel, { color: colors.muted }]}>
          {item.sourceName}
        </Text>
      </View>
    </Pressable>
  );
}

export default function BuildsScreen() {
  const colors = useColors();
  const [jobs, setJobs] = useState<BuildJob[]>([]);

  useEffect(() => subscribeToBuildJobs(setJobs), []);

  return (
    <ScreenContainer className="flex-1" edges={["top", "left", "right"]}>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <BuildCard item={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View>
                <Text style={[styles.brand, { color: colors.primary }]}>One App</Text>
                <Text style={[styles.headerCaption, { color: colors.muted }]}>Créez des APK debug, simplement.</Text>
              </View>
              <View style={[styles.secureBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.secureBadgeText, { color: colors.muted }]}>Local</Text>
              </View>
            </View>

            <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.heroText}>
                <Text style={[styles.heroEyebrow, { color: colors.primary }]}>NOUVEAU PROJET</Text>
                <Text style={[styles.heroTitle, { color: colors.foreground }]}>Votre code, une APK debug.</Text>
                <Text style={[styles.heroDescription, { color: colors.muted }]}>Choisissez le type, ajoutez votre ZIP et suivez la compilation sans outils compliqués.</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Créer un nouveau build"
                onPress={() => router.push("/(tabs)/create")}
                style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}
              >
                <Text style={[styles.primaryButtonText, { color: colors.background }]}>Nouveau build</Text>
                <Text style={[styles.primaryButtonArrow, { color: colors.background }]}>→</Text>
              </Pressable>
            </View>

            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Mes builds</Text>
              <Text style={[styles.sectionCount, { color: colors.muted }]}>{jobs.length} au total</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.emptyIcon}>⌘</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Aucun build pour le moment</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>Commencez avec un ZIP Expo, Android natif ou HTML.</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footerNote}>
            <Text style={[styles.footerNoteText, { color: colors.muted }]}>Les brouillons restent sur votre téléphone avant l’envoi au service de compilation.</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: 16, paddingBottom: 30 },
  header: { paddingTop: 14, paddingBottom: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  headerCaption: { marginTop: 3, fontSize: 13, fontWeight: "500" },
  secureBadge: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  secureBadgeText: { fontSize: 12, fontWeight: "700" },
  hero: { borderRadius: 24, borderWidth: 1, padding: 20, marginBottom: 26 },
  heroText: { marginBottom: 18 },
  heroEyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.1, marginBottom: 7 },
  heroTitle: { fontSize: 25, lineHeight: 31, fontWeight: "800", letterSpacing: -0.6, maxWidth: 285 },
  heroDescription: { marginTop: 9, fontSize: 14, lineHeight: 20, maxWidth: 310 },
  primaryButton: { minHeight: 52, borderRadius: 15, paddingHorizontal: 18, alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  primaryButtonText: { fontSize: 15, fontWeight: "800" },
  primaryButtonArrow: { fontSize: 22, fontWeight: "700" },
  sectionTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 11 },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  sectionCount: { fontSize: 12, fontWeight: "600" },
  buildCard: { borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  typeIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", marginRight: 11 },
  typeIconText: { fontSize: 20 },
  cardTitleBlock: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 15, fontWeight: "800" },
  cardMeta: { marginTop: 3, fontSize: 12 },
  statusDot: { minWidth: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", marginLeft: 8 },
  statusDotText: { fontSize: 16, fontWeight: "800" },
  cardFooter: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.10)", marginTop: 13, paddingTop: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  statusLabel: { fontSize: 12, fontWeight: "800" },
  fileLabel: { flex: 1, textAlign: "right", fontSize: 12 },
  emptyCard: { alignItems: "center", borderWidth: 1, borderRadius: 18, paddingHorizontal: 26, paddingVertical: 30 },
  emptyIcon: { fontSize: 30, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "800" },
  emptyText: { marginTop: 7, fontSize: 13, lineHeight: 19, textAlign: "center" },
  footerNote: { paddingHorizontal: 12, paddingTop: 18 },
  footerNoteText: { fontSize: 12, lineHeight: 18, textAlign: "center" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
