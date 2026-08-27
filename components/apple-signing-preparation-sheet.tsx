import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { useColors } from "@/hooks/use-colors";
import { clearAppleSigningPreparation, loadAppleSigningPreparation, saveAppleSigningPreparation } from "@/lib/apple-signing-preparation-store";
import { EMPTY_APPLE_SIGNING_PREPARATION, getApplePreparationState, type AppleSigningPreparation } from "@/shared/apple-signing-preparation";

type AppleSigningPreparationSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export function AppleSigningPreparationSheet({ visible, onClose }: AppleSigningPreparationSheetProps) {
  const colors = useColors();
  const [draft, setDraft] = useState<AppleSigningPreparation>(EMPTY_APPLE_SIGNING_PREPARATION);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const preparationState = useMemo(() => getApplePreparationState(draft), [draft]);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setLoading(true);
    setSavedMessage(null);
    void loadAppleSigningPreparation().then((saved) => {
      if (active) setDraft(saved);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [visible]);

  function update<K extends keyof AppleSigningPreparation>(key: K, value: AppleSigningPreparation[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setSavedMessage(null);
  }

  async function save() {
    setSaving(true);
    try {
      const saved = await saveAppleSigningPreparation(draft);
      setDraft(saved);
      setSavedMessage(preparationState.ready ? "Préparation enregistrée. L’IPA reste verrouillée jusqu’au service Apple sécurisé." : "Préparation enregistrée sur ce téléphone. Complétez les éléments restants quand vous les aurez.");
    } finally {
      setSaving(false);
    }
  }

  function confirmClear() {
    Alert.alert(
      "Effacer cette préparation ?",
      "Les identifiants et noms saisis seront retirés de ce téléphone. Aucune clé n’est concernée, car MIA💻 n’en conserve jamais.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Effacer",
          style: "destructive",
          onPress: () => {
            void clearAppleSigningPreparation().then(() => {
              setDraft(EMPTY_APPLE_SIGNING_PREPARATION);
              setSavedMessage("Préparation effacée de ce téléphone.");
            });
          },
        },
      ],
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer la préparation Apple" onPress={onClose} style={styles.backdrop} />
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: `${colors.warning}1A` }]}><MaterialIcons color={colors.warning} name="phone-iphone" size={22} /></View>
            <View style={styles.headerCopy}><Text style={[styles.title, { color: colors.foreground }]}>Préparer une IPA Apple</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Vos repères seulement. Aucune clé privée n’est demandée.</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}><MaterialIcons color={colors.muted} name="close" size={22} /></Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={[styles.lockedBanner, { backgroundColor: `${colors.warning}12`, borderColor: `${colors.warning}44` }]}>
              <MaterialIcons color={colors.warning} name="lock-outline" size={19} />
              <Text style={[styles.lockedText, { color: colors.muted }]}>La compilation IPA reste bloquée. MIA💻 prépare vos informations sans les envoyer.</Text>
            </View>

            {loading ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={[styles.loadingText, { color: colors.muted }]}>Chargement de votre préparation…</Text></View> : <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>1. Identité de l’application</Text>
              <Text style={[styles.sectionText, { color: colors.muted }]}>Ces valeurs doivent correspondre à votre projet et à App Store Connect.</Text>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Identifiant iOS (Bundle ID)</Text>
              <TextInput value={draft.bundleIdentifier} onChangeText={(value) => update("bundleIdentifier", value)} autoCapitalize="none" autoCorrect={false} placeholder="com.monentreprise.monapp" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} />
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Identifiant d’équipe Apple</Text>
              <TextInput value={draft.appleTeamId} onChangeText={(value) => update("appleTeamId", value)} autoCapitalize="characters" autoCorrect={false} maxLength={10} placeholder="10 caractères" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} />
              <View style={styles.pair}>
                <View style={styles.pairItem}><Text style={[styles.fieldLabel, { color: colors.muted }]}>Version</Text><TextInput value={draft.appVersion} onChangeText={(value) => update("appVersion", value)} autoCapitalize="none" autoCorrect={false} placeholder="1.0.0" placeholderTextColor={colors.muted} style={[styles.input, styles.compactInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} /></View>
                <View style={styles.pairItem}><Text style={[styles.fieldLabel, { color: colors.muted }]}>N° de build</Text><TextInput value={draft.buildNumber} onChangeText={(value) => update("buildNumber", value)} keyboardType="number-pad" placeholder="1" placeholderTextColor={colors.muted} style={[styles.input, styles.compactInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} /></View>
              </View>

              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>2. Signature à préparer</Text>
              <Text style={[styles.sectionText, { color: colors.muted }]}>Notez les noms créés dans Apple Developer. Ne joignez aucun fichier ici.</Text>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Nom du certificat de distribution</Text>
              <TextInput value={draft.certificateName} onChangeText={(value) => update("certificateName", value)} placeholder="Ex. Distribution MIA" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} />
              <View style={[styles.switchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.switchCopy}><Text style={[styles.switchTitle, { color: colors.foreground }]}>Certificat prêt dans Apple Developer</Text><Text style={[styles.switchText, { color: colors.muted }]}>Vous l’avez créé ou choisi dans votre compte Apple.</Text></View><Switch value={draft.certificatePrepared} onValueChange={(value) => update("certificatePrepared", value)} trackColor={{ false: colors.border, true: `${colors.success}99` }} thumbColor={draft.certificatePrepared ? colors.success : colors.muted} /></View>
              <Text style={[styles.fieldLabel, { color: colors.muted }]}>Nom du profil App Store Connect</Text>
              <TextInput value={draft.profileName} onChangeText={(value) => update("profileName", value)} placeholder="Ex. MIA App Store" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]} />
              <View style={[styles.switchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.switchCopy}><Text style={[styles.switchTitle, { color: colors.foreground }]}>Profil associé au même Bundle ID</Text><Text style={[styles.switchText, { color: colors.muted }]}>Le profil sélectionne votre certificat de distribution.</Text></View><Switch value={draft.profilePrepared} onValueChange={(value) => update("profilePrepared", value)} trackColor={{ false: colors.border, true: `${colors.success}99` }} thumbColor={draft.profilePrepared ? colors.success : colors.muted} /></View>

              <View style={[styles.privacy, { backgroundColor: `${colors.error}0D`, borderColor: `${colors.error}44` }]}><MaterialIcons color={colors.error} name="shield" size={20} /><Text style={[styles.privacyText, { color: colors.muted }]}>N’ajoutez pas de fichier `.p12`, `.mobileprovision`, `.p8`, clé privée, mot de passe ou code Apple. MIA💻 les bloque volontairement.</Text></View>
              <View style={[styles.progress, { backgroundColor: `${preparationState.ready ? colors.success : colors.primary}12`, borderColor: `${preparationState.ready ? colors.success : colors.primary}44` }]}><MaterialIcons color={preparationState.ready ? colors.success : colors.primary} name={preparationState.ready ? "check-circle" : "assignment"} size={20} /><View style={styles.progressCopy}><Text style={[styles.progressTitle, { color: colors.foreground }]}>{preparationState.label}</Text>{preparationState.ready ? <Text style={[styles.progressText, { color: colors.muted }]}>Vos repères sont prêts. Il faudra toujours une machine macOS et un service de signature isolé.</Text> : preparationState.issues.slice(0, 2).map((issue) => <Text key={issue} style={[styles.progressText, { color: colors.muted }]}>• {issue}</Text>)}</View></View>
              {savedMessage ? <Text accessibilityLiveRegion="polite" style={[styles.savedMessage, { color: colors.success }]}>{savedMessage}</Text> : null}
              <Pressable accessibilityRole="button" accessibilityLabel="Enregistrer la préparation Apple" disabled={saving} onPress={() => void save()} style={({ pressed }) => [styles.saveButton, { backgroundColor: colors.primary }, pressed && styles.pressed, saving && styles.disabled]}><Text style={[styles.saveButtonText, { color: colors.background }]}>{saving ? "Enregistrement…" : "Enregistrer sur ce téléphone"}</Text><MaterialIcons color={colors.background} name="save" size={20} /></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Effacer la préparation Apple" onPress={confirmClear} style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}><Text style={[styles.resetText, { color: colors.muted }]}>Effacer ces informations de ce téléphone</Text></Pressable>
            </>}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.48)" },
  backdrop: { flex: 1 },
  sheet: { maxHeight: "91%", borderTopWidth: 1, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 9 },
  grabber: { alignSelf: "center", width: 38, height: 4, borderRadius: 3, marginBottom: 12 },
  header: { minHeight: 48, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1 },
  title: { fontSize: 16, lineHeight: 21, fontWeight: "900" },
  subtitle: { marginTop: 1, fontSize: 10.5, lineHeight: 15 },
  closeButton: { width: 39, height: 39, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 18, paddingTop: 15, paddingBottom: 34 },
  lockedBanner: { borderWidth: 1, borderRadius: 15, padding: 12, flexDirection: "row", alignItems: "flex-start", gap: 9, marginBottom: 21 },
  lockedText: { flex: 1, fontSize: 11, lineHeight: 16 },
  loading: { minHeight: 180, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { fontSize: 12 },
  sectionTitle: { marginTop: 5, fontSize: 14, lineHeight: 20, fontWeight: "900" },
  sectionText: { marginTop: 3, marginBottom: 13, fontSize: 10.5, lineHeight: 16 },
  fieldLabel: { marginBottom: 6, marginLeft: 2, fontSize: 10.5, fontWeight: "800" },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 15, paddingHorizontal: 13, marginBottom: 12, fontSize: 14 },
  compactInput: { marginBottom: 15 },
  pair: { flexDirection: "row", gap: 10 },
  pairItem: { flex: 1 },
  switchRow: { minHeight: 70, borderWidth: 1, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 15 },
  switchCopy: { flex: 1 },
  switchTitle: { fontSize: 11.5, lineHeight: 16, fontWeight: "800" },
  switchText: { marginTop: 2, fontSize: 10, lineHeight: 14 },
  privacy: { borderWidth: 1, borderRadius: 15, padding: 12, flexDirection: "row", alignItems: "flex-start", gap: 9, marginTop: 2, marginBottom: 12 },
  privacyText: { flex: 1, fontSize: 10.5, lineHeight: 16 },
  progress: { borderWidth: 1, borderRadius: 15, padding: 12, flexDirection: "row", alignItems: "flex-start", gap: 9 },
  progressCopy: { flex: 1 },
  progressTitle: { fontSize: 11.5, lineHeight: 16, fontWeight: "900" },
  progressText: { marginTop: 2, fontSize: 10, lineHeight: 15 },
  savedMessage: { marginTop: 12, fontSize: 11, lineHeight: 16, fontWeight: "700" },
  saveButton: { minHeight: 55, borderRadius: 16, paddingHorizontal: 16, marginTop: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  saveButtonText: { fontSize: 13, fontWeight: "900" },
  resetButton: { minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: 6 },
  resetText: { fontSize: 11, fontWeight: "800" },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.65 },
});
