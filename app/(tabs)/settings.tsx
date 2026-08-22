import { type ComponentProps, useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { refreshBuildQuota } from "@/lib/build-store";
import { getMiaServiceStatuses, type MiaRelayHealth } from "@/shared/mia-services";

type AppIcon = ComponentProps<typeof MaterialIcons>["name"];

function InfoRow({ icon, title, detail, border }: { icon: AppIcon; title: string; detail: string; border?: string }) {
  const colors = useColors();
  return <View style={[styles.infoRow, border ? { borderBottomColor: border, borderBottomWidth: StyleSheet.hairlineWidth } : null]}><View style={[styles.infoIcon, { backgroundColor: colors.background }]}><MaterialIcons color={colors.primary} name={icon} size={19} /></View><View style={styles.infoCopy}><Text style={[styles.infoTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.infoDetail, { color: colors.muted }]}>{detail}</Text></View></View>;
}

const SERVICE_ICONS: Record<ReturnType<typeof getMiaServiceStatuses>[number]["id"], AppIcon> = {
  build: "rocket-launch",
  relay: "cloud-queue",
  mia: "auto-awesome",
  gemini: "auto-awesome",
};

function ServiceRow({ service, border }: { service: ReturnType<typeof getMiaServiceStatuses>[number]; border?: string }) {
  const colors = useColors();
  const color = service.state === "active" ? colors.success : service.state === "attention" ? colors.error : colors.primary;
  const label = service.state === "active" ? "Opérationnel" : service.state === "attention" ? "À vérifier" : "Préparé";
  return (
    <View style={[styles.infoRow, border ? { borderBottomColor: border, borderBottomWidth: StyleSheet.hairlineWidth } : null]}>
      <View style={[styles.infoIcon, { backgroundColor: `${color}18` }]}><MaterialIcons color={color} name={SERVICE_ICONS[service.id]} size={19} /></View>
      <View style={styles.infoCopy}>
        <View style={styles.serviceTitleRow}><Text style={[styles.infoTitle, { color: colors.foreground }]}>{service.title}</Text><View style={[styles.statusPill, { backgroundColor: `${color}17` }]}><View style={[styles.statusDot, { backgroundColor: color }]} /><Text style={[styles.statusText, { color }]}>{label}</Text></View></View>
        <Text style={[styles.infoDetail, { color: colors.muted }]}>{service.detail}</Text>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const [relayHealth, setRelayHealth] = useState<MiaRelayHealth>("checking");
  const [checkingServices, setCheckingServices] = useState(false);
  const services = getMiaServiceStatuses(relayHealth);

  const checkServices = useCallback(async () => {
    setCheckingServices(true);
    setRelayHealth("checking");
    try {
      const quota = await refreshBuildQuota();
      setRelayHealth(quota ? "ready" : "offline");
    } catch {
      setRelayHealth("offline");
    } finally {
      setCheckingServices(false);
    }
  }, []);

  useEffect(() => { void checkServices(); }, [checkServices]);

  return (
    <ScreenContainer className="flex-1" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerLabel}><View style={[styles.headerDot, { backgroundColor: colors.success }]} /><Text style={[styles.eyebrow, { color: colors.primary }]}>MIA💻 · À PROPOS</Text></View>
        <Text style={[styles.title, { color: colors.foreground }]}>Tout est guidé, même depuis un téléphone.</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Les limites et protections appliquées pendant votre compilation.</Text>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Votre compilation</Text>
        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <InfoRow icon="inventory-2" title="Fichiers acceptés" detail="ZIP Expo, Android natif ou HTML" border={colors.border} />
          <InfoRow icon="timer" title="Limite gratuite" detail="6 compilations par heure · 50 Mo maximum" border={colors.border} />
          <InfoRow icon="info-outline" title="Résultat" detail="APK Android destinée aux tests" />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Protection</Text>
        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <InfoRow icon="lock-outline" title="Fichier source" detail="Utilisé seulement pendant la préparation de la compilation" border={colors.border} />
          <InfoRow icon="timer" title="Lien APK" detail="Disponible temporairement après la compilation" />
        </View>

        <View style={styles.servicesHeading}>
          <View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Services MIA</Text><Text style={[styles.servicesSubtitle, { color: colors.muted }]}>Fonctionnement personnel, sans compte à connecter.</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Vérifier les services MIA" disabled={checkingServices} onPress={() => { void checkServices(); }} style={({ pressed }) => [styles.checkButton, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}55` }, pressed && !checkingServices && styles.pressed]}>
            {checkingServices ? <ActivityIndicator color={colors.primary} size="small" /> : <MaterialIcons color={colors.primary} name="refresh" size={17} />}
            <Text style={[styles.checkButtonText, { color: colors.primary }]}>{checkingServices ? "Vérification…" : "Vérifier"}</Text>
          </Pressable>
        </View>
        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          {services.map((service, index) => <ServiceRow key={service.id} service={service} border={index < services.length - 1 ? colors.border : undefined} />)}
        </View>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Connecteurs</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir les connecteurs MIA" onPress={() => router.push("/connectors" as never)} style={({ pressed }) => [styles.connectorRow, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}>
          <View style={[styles.infoIcon, { backgroundColor: `${colors.primary}18` }]}><MaterialIcons color={colors.primary} name="hub" size={19} /></View>
          <View style={styles.infoCopy}><Text style={[styles.infoTitle, { color: colors.foreground }]}>Gérer les connecteurs</Text><Text style={[styles.infoDetail, { color: colors.muted }]}>Voir les services autorisables et leurs protections.</Text></View>
          <MaterialIcons color={colors.muted} name="chevron-right" size={22} />
        </Pressable>
        <View style={[styles.personalNotice, { backgroundColor: `${colors.success}10`, borderColor: `${colors.success}4D` }]}><MaterialIcons color={colors.success} name="phone-android" size={21} /><Text style={[styles.noticeText, { color: colors.muted }]}>Mode personnel : vos projets restent sur ce téléphone. La préparation de l’APK ne demande aucun dépôt GitHub personnel ni configuration technique.</Text></View>

        <View style={[styles.notice, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}4D` }]}><MaterialIcons color={colors.primary} name="lightbulb-outline" size={21} /><Text style={[styles.noticeText, { color: colors.muted }]}>Pour éviter un refus, envoyez un fichier propre : pas de node_modules, pas de dossier build et aucune clé secrète.</Text></View>
        <Text style={[styles.version, { color: colors.muted }]}>MIA💻 · Version 1.0.0</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 30 },
  headerLabel: { flexDirection: "row", alignItems: "center", gap: 7 },
  headerDot: { width: 7, height: 7, borderRadius: 4 },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  title: { marginTop: 9, fontSize: 29, lineHeight: 35, fontWeight: "900", letterSpacing: -1, maxWidth: 330 },
  subtitle: { marginTop: 8, fontSize: 13, lineHeight: 20 },
  sectionTitle: { marginTop: 29, marginBottom: 12, fontSize: 18, fontWeight: "900", letterSpacing: -0.3 },
  servicesHeading: { marginTop: 29, marginBottom: 12, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 10 },
  servicesSubtitle: { marginTop: -6, fontSize: 11, lineHeight: 16 },
  checkButton: { minHeight: 36, paddingHorizontal: 10, borderWidth: 1, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 5 },
  checkButtonText: { fontSize: 10.5, fontWeight: "900" },
  panel: { borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  connectorRow: { minHeight: 75, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 11 },
  infoRow: { minHeight: 75, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 11 },
  infoIcon: { width: 39, height: 39, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  infoCopy: { flex: 1 },
  infoTitle: { fontSize: 13, fontWeight: "800" },
  infoDetail: { marginTop: 3, fontSize: 11, lineHeight: 16 },
  serviceTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  statusPill: { paddingHorizontal: 7, minHeight: 21, borderRadius: 11, flexDirection: "row", alignItems: "center", gap: 4 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 9, fontWeight: "900" },
  notice: { marginTop: 23, borderWidth: 1, borderRadius: 19, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  personalNotice: { marginTop: 12, borderWidth: 1, borderRadius: 19, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  noticeText: { flex: 1, fontSize: 11, lineHeight: 17 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  version: { marginTop: 23, textAlign: "center", fontSize: 11 },
});
