import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { ScreenContainer } from "@/components/screen-container";

export default function LicensesScreen() {
  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background">
      <StatusBar style="light" />
      <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.backButton}><MaterialIcons name="arrow-back" size={22} color="#F7F8FC" /></Pressable><Text style={styles.headerTitle}>Licenças e avisos</Text><View style={{ width: 42 }} /></View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}><MaterialIcons name="policy" size={32} color="#22D3EE" /><Text style={styles.heroTitle}>Código aberto, distribuição responsável</Text><Text style={styles.heroText}>A integração nativa planejada utiliza componentes com licença GPL-3.0. A distribuição final deve manter os avisos e disponibilizar o código-fonte correspondente.</Text></View>
        <Text style={styles.groupLabel}>NÚCLEO DE EMULAÇÃO</Text>
        <View style={styles.card}><Text style={styles.cardTitle}>Mupen64Plus Android Edition</Text><Text style={styles.cardText}>Frontend Android e conjunto de módulos nativos de referência para a integração do núcleo Mupen64Plus.</Text><View style={styles.licensePill}><Text style={styles.licenseText}>GPL-3.0</Text></View></View>
        <Text style={styles.groupLabel}>USO DE ARQUIVOS</Text>
        <View style={styles.card}><Text style={styles.cardTitle}>ROMs não são incluídas</Text><Text style={styles.cardText}>O aplicativo organiza apenas arquivos selecionados pelo usuário. Não distribua ROMs, BIOS, capas ou outros conteúdos protegidos sem autorização.</Text></View>
        <Text style={styles.footer}>Consulte OPEN_SOURCE_NOTICES.md e docs/NATIVE_CORE_INTEGRATION.md no projeto-fonte para os detalhes de distribuição e referências.</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { height: 66, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "#171C2C", borderWidth: 1, borderColor: "#303852" },
  headerTitle: { color: "#F7F8FC", fontSize: 16, fontWeight: "800" },
  content: { padding: 20, paddingTop: 12, paddingBottom: 34 },
  hero: { padding: 20, borderRadius: 22, backgroundColor: "#171C31", borderWidth: 1, borderColor: "#303852" },
  heroTitle: { color: "#F7F8FC", fontSize: 21, lineHeight: 27, fontWeight: "800", marginTop: 13 },
  heroText: { color: "#B0B9CD", fontSize: 13, lineHeight: 19, marginTop: 7 },
  groupLabel: { color: "#818CA5", fontSize: 10, fontWeight: "800", letterSpacing: 1.25, marginTop: 27, marginBottom: 9 },
  card: { backgroundColor: "#141827", borderColor: "#2A3146", borderWidth: 1, borderRadius: 18, padding: 17 },
  cardTitle: { color: "#F7F8FC", fontSize: 15, fontWeight: "800" },
  cardText: { color: "#A8B0C4", fontSize: 12, lineHeight: 18, marginTop: 5 },
  licensePill: { alignSelf: "flex-start", marginTop: 13, paddingVertical: 5, paddingHorizontal: 9, borderRadius: 8, backgroundColor: "rgba(139,92,246,0.15)" },
  licenseText: { color: "#C8BEFF", fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  footer: { color: "#778299", fontSize: 11, lineHeight: 16, marginTop: 24, textAlign: "center" },
});
