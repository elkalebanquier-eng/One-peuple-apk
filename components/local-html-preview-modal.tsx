import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { WebView } from "react-native-webview";

import { useColors } from "@/hooks/use-colors";
import { isAllowedPreviewRequest, type LocalHtmlPreview } from "@/shared/html-preview";

type LocalHtmlPreviewModalProps = {
  preview: LocalHtmlPreview | null;
  visible: boolean;
  onClose: () => void;
};

/** Une WebView strictement locale pour vérifier visuellement index.html avant compilation. */
export function LocalHtmlPreviewModal({ preview, visible, onClose }: LocalHtmlPreviewModalProps) {
  const colors = useColors();

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={[styles.page, { backgroundColor: colors.background }]}> 
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}> 
          <View style={styles.titleWrap}>
            <Text numberOfLines={1} style={[styles.title, { color: colors.foreground }]}>{preview?.title ?? "Aperçu HTML local"}</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Aperçu isolé · aucune donnée réelle ni fichier du téléphone</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer l’aperçu HTML" onPress={onClose} style={({ pressed }) => [styles.close, { backgroundColor: colors.background }, pressed && styles.pressed]}>
            <MaterialIcons color={colors.foreground} name="close" size={22} />
          </Pressable>
        </View>

        {preview?.hasUnloadedZipResources ? (
          <View style={[styles.notice, { backgroundColor: `${colors.primary}12`, borderBottomColor: `${colors.primary}40` }]}>
            <MaterialIcons color={colors.primary} name="info-outline" size={17} />
            <Text style={[styles.noticeText, { color: colors.muted }]}>ZIP détecté : index.html est affiché seul. Les images, CSS et scripts liés du ZIP ne sont pas chargés ici.</Text>
          </View>
        ) : null}

        {preview ? Platform.OS === "web" ? (
          <View style={styles.webFallback}>
            <MaterialIcons color={colors.primary} name="phone-android" size={32} />
            <Text style={[styles.webFallbackTitle, { color: colors.foreground }]}>Aperçu disponible dans l’APK</Text>
            <Text style={[styles.webFallbackText, { color: colors.muted }]}>Cette fenêtre est protégée pour Android et iPhone. Sur la prévisualisation web, MIA💻 n’exécute pas votre HTML.</Text>
          </View>
        ) : (
          <WebView
            source={{ html: preview.html }}
            originWhitelist={["about:blank", "data:text/html"]}
            onShouldStartLoadWithRequest={(request) => isAllowedPreviewRequest(request.url)}
            allowFileAccess={false}
            allowUniversalAccessFromFileURLs={false}
            domStorageEnabled={false}
            javaScriptCanOpenWindowsAutomatically={false}
            setSupportMultipleWindows={false}
            allowsInlineMediaPlayback={false}
            mediaPlaybackRequiresUserAction
            incognito
            style={styles.webview}
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingTop: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  titleWrap: { flex: 1, gap: 3 },
  title: { fontSize: 17, fontWeight: "800" },
  subtitle: { fontSize: 12, lineHeight: 17 },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  notice: { flexDirection: "row", gap: 9, paddingHorizontal: 18, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 17 },
  webview: { flex: 1, backgroundColor: "#ffffff" },
  webFallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  webFallbackTitle: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  webFallbackText: { fontSize: 14, lineHeight: 21, textAlign: "center" },
  pressed: { opacity: 0.68 },
});
