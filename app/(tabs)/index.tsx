import { useEffect, useState } from "react";
import type { ComponentProps } from "react";
import { FlatList, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  formatBytes,
  getProjectType,
  refreshBuildJob,
  subscribeToBuildJobs,
  type BuildJob,
  type BuildStatus,
  type ProjectType,
} from "@/lib/build-store";

type IconName = ComponentProps<typeof MaterialIcons>["name"];

const STATUS_COPY: Record<BuildStatus, { label: string; color: string; icon: IconName }> = {
  draft: { label: "À préparer", color: "#8B93A7", icon: "edit-note" },
  ready: { label: "Sur cet appareil", color: "#FFB35C", icon: "phone-android" },
  queued: { label: "Dans la file", color: "#FFB35C", icon: "schedule" },
  building: { label: "Compilation en cours", color: "#7AA7FF", icon: "autorenew" },
  complete: { label: "APK prête", color: "#34D399", icon: "verified" },
  failed: { label: "Action nécessaire", color: "#FF5C72", icon: "error-outline" },
};

const TYPE_ICONS: Record<ProjectType, IconName> = {
  expo: "code",
  android: "android",
  html: "language",
};

function BuildCard({ item }: { item: BuildJob }) {
  const colors = useColors();
  const type = getProjectType(item.projectType);
  const status = STATUS_COPY[item.status];

  return (
    <View style={[styles.buildCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardTopRow}>
        <View style={[styles.typeTile, { backgroundColor: colors.background }]}>
          <MaterialIcons color={colors.primary} name={TYPE_ICONS[item.projectType]} size={22} />
        </View>
        <View style={styles.cardTitleBlock}>
          <Text numberOfLines={1} style={[styles.cardTitle, { color: colors.foreground }]}>
            {item.projectName}
          </Text>
          <Text numberOfLines={1} style={[styles.cardMeta, { color: colors.muted }]}>
            {type.label} · {formatBytes(item.sourceSize)}
          </Text>
        </View>
        <View style={[styles.stateIcon, { backgroundColor: `${status.color}18` }]}>
          <MaterialIcons color={status.color} name={status.icon} size={19} />
        </View>
      </View>

      <View style={[styles.statusStrip, { backgroundColor: `${status.color}12` }]}>
        <View style={[styles.statusMark, { backgroundColor: status.color }]} />
        <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
        <Text numberOfLines={1} style={[styles.statusDetail, { color: colors.muted }]}>
          {item.message || item.sourceName}
        </Text>
      </View>

      {item.status === "complete" && item.apkUri ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Télécharger l’APK de ${item.projectName}`}
            onPress={() => { void Linking.openURL(item.apkUri!); }}
            style={({ pressed }) => [styles.downloadButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}
          >
            <View style={styles.downloadCopy}>
              <Text style={[styles.downloadTitle, { color: colors.background }]}>Télécharger l’APK</Text>
              <Text style={[styles.downloadHint, { color: colors.background }]}>Pour installer et tester sur Android</Text>
            </View>
            <MaterialIcons color={colors.background} name="download" size={24} />
          </Pressable>
          <Text style={[styles.expiryNote, { color: colors.muted }]}>Le lien de téléchargement est disponible temporairement.</Text>
        </>
      ) : null}
    </View>
  );
}

export default function BuildsScreen() {
  const colors = useColors();
  const [jobs, setJobs] = useState<BuildJob[]>([]);

  useEffect(() => subscribeToBuildJobs(setJobs), []);

  useEffect(() => {
    const activeJobs = jobs.filter((job) => job.status === "queued" || job.status === "building");
    if (activeJobs.length === 0) return;

    let active = true;
    const refresh = () => {
      if (active) void Promise.all(activeJobs.map((job) => refreshBuildJob(job)));
    };
    refresh();
    const interval = setInterval(refresh, 15_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [jobs]);

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
              <View style={styles.brandRow}>
                <View style={[styles.logoMark, { backgroundColor: colors.primary }]}>
                  <MaterialIcons color={colors.background} name="bolt" size={20} />
                </View>
                <View>
                  <Text style={[styles.brand, { color: colors.foreground }]}>One App</Text>
                  <Text style={[styles.headerCaption, { color: colors.muted }]}>Atelier de projets local</Text>
                </View>
              </View>
              <Text style={[styles.localCount, { color: colors.muted }]}>{jobs.length} sur cet appareil</Text>
            </View>

            <View style={[styles.launchPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.orangeRule, { backgroundColor: colors.primary }]} />
              <Text style={[styles.launchEyebrow, { color: colors.primary }]}>MODE HORS LIGNE</Text>
              <Text style={[styles.launchTitle, { color: colors.foreground }]}>Préparez votre code sur votre téléphone.</Text>
              <Text style={[styles.launchText, { color: colors.muted }]}>Choisissez un type de projet, ajoutez votre fichier puis gardez-le privé sur cet appareil.</Text>
              <View style={styles.formatPills}>
                <View style={[styles.formatPill, { backgroundColor: colors.background }]}><MaterialIcons color={colors.primary} name="code" size={14} /><Text style={[styles.formatPillText, { color: colors.muted }]}>Expo</Text></View>
                <View style={[styles.formatPill, { backgroundColor: colors.background }]}><MaterialIcons color={colors.primary} name="android" size={14} /><Text style={[styles.formatPillText, { color: colors.muted }]}>Android</Text></View>
                <View style={[styles.formatPill, { backgroundColor: colors.background }]}><MaterialIcons color={colors.primary} name="language" size={14} /><Text style={[styles.formatPillText, { color: colors.muted }]}>HTML</Text></View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ajouter un projet local"
                onPress={() => router.push("/(tabs)/create")}
                style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}
              >
                <Text style={[styles.primaryButtonText, { color: colors.background }]}>Ajouter un projet</Text>
                <MaterialIcons color={colors.background} name="arrow-forward" size={22} />
              </Pressable>
            </View>

            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Mes projets</Text>
              <Text style={[styles.sectionCount, { color: colors.muted }]}>{jobs.length === 0 ? "Aucune pour l’instant" : `${jobs.length} au total`}</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
              <MaterialIcons color={colors.primary} name="rocket-launch" size={25} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Votre premier projet commence ici.</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>Un ZIP Expo ou Android, ou directement un fichier index.html, suffit pour le conserver sur ce téléphone.</Text>
          </View>
        }
        ListFooterComponent={
          <View style={[styles.footerNote, { borderColor: colors.border }]}>
            <MaterialIcons color={colors.muted} name="info-outline" size={16} />
            <Text style={[styles.footerNoteText, { color: colors.muted }]}>Mode local : votre fichier reste sur ce téléphone. Une nouvelle APK ne peut pas être créée sans un service de compilation.</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: 18, paddingBottom: 30 },
  header: { paddingTop: 13, paddingBottom: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoMark: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  brand: { fontSize: 21, fontWeight: "800", letterSpacing: -0.5 },
  headerCaption: { marginTop: 1, fontSize: 12, fontWeight: "600" },
  localCount: { fontSize: 11, fontWeight: "700" },
  launchPanel: { borderWidth: 1, borderRadius: 24, padding: 20, overflow: "hidden" },
  orangeRule: { width: 38, height: 4, borderRadius: 3, marginBottom: 14 },
  launchEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.25 },
  launchTitle: { marginTop: 8, fontSize: 29, lineHeight: 34, fontWeight: "800", letterSpacing: -1 },
  launchText: { marginTop: 9, fontSize: 14, lineHeight: 20, maxWidth: 330 },
  formatPills: { flexDirection: "row", gap: 7, marginTop: 16, marginBottom: 19 },
  formatPill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 },
  formatPillText: { fontSize: 11, fontWeight: "700" },
  primaryButton: { minHeight: 54, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 16 },
  primaryButtonText: { fontSize: 16, fontWeight: "900" },
  sectionTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 28, marginBottom: 13 },
  sectionTitle: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  sectionCount: { fontSize: 12, fontWeight: "600" },
  buildCard: { borderWidth: 1, borderRadius: 20, padding: 14, marginBottom: 11 },
  cardTopRow: { flexDirection: "row", alignItems: "center" },
  typeTile: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 11 },
  cardTitleBlock: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 15, fontWeight: "800" },
  cardMeta: { marginTop: 3, fontSize: 12 },
  stateIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", marginLeft: 8 },
  statusStrip: { flexDirection: "row", alignItems: "center", minHeight: 38, borderRadius: 11, paddingHorizontal: 10, marginTop: 13, gap: 7 },
  statusMark: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 11, fontWeight: "900" },
  statusDetail: { flex: 1, fontSize: 11, textAlign: "right" },
  downloadButton: { minHeight: 57, marginTop: 12, paddingHorizontal: 15, borderRadius: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  downloadCopy: { flex: 1 },
  downloadTitle: { fontSize: 14, fontWeight: "900" },
  downloadHint: { fontSize: 11, fontWeight: "600", opacity: 0.78, marginTop: 2 },
  expiryNote: { marginTop: 8, fontSize: 11, textAlign: "center" },
  emptyState: { alignItems: "center", paddingHorizontal: 28, paddingTop: 10, paddingBottom: 23 },
  emptyIcon: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 13 },
  emptyTitle: { textAlign: "center", fontSize: 16, fontWeight: "800" },
  emptyText: { maxWidth: 285, marginTop: 7, textAlign: "center", fontSize: 13, lineHeight: 19 },
  footerNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 16, paddingTop: 15, paddingHorizontal: 4 },
  footerNoteText: { flex: 1, fontSize: 11, lineHeight: 16 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});
