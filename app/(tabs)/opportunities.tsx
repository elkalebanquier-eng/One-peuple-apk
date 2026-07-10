import { ScrollView, Text, View, TouchableOpacity, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

const opportunityTypes = [
  { id: "all", label: "Tous", emoji: "📋", color: "#5B8DEF" },
  { id: "job", label: "Emploi", emoji: "💼", color: "#34D399" },
  { id: "formation", label: "Formation", emoji: "🎓", color: "#FF9D5C" },
  { id: "financement", label: "Financement", emoji: "💰", color: "#C084FC" },
  { id: "partenariat", label: "Partenariat", emoji: "🤝", color: "#5B8DEF" },
];

const domains = [
  { id: "technologie", label: "Technologie", emoji: "💻" },
  { id: "agriculture", label: "Agriculture", emoji: "🌱" },
  { id: "education", label: "Éducation", emoji: "📚" },
  { id: "sante", label: "Santé", emoji: "🩺" },
];

const mockOpportunities = [
  {
    id: 1,
    type: "job",
    domain: "technologie",
    author: "TechCorp",
    avatar: "🏢",
    title: "Développeur React Senior",
    description: "Rejoignez notre équipe de développement...",
    city: "Dakar",
    premium: true,
  },
  {
    id: 2,
    type: "formation",
    domain: "technologie",
    author: "Code Academy",
    avatar: "🎓",
    title: "Formation Web Development",
    description: "12 semaines intensives...",
    city: "Abidjan",
    premium: false,
  },
  {
    id: 3,
    type: "financement",
    domain: "agriculture",
    author: "AgriVenture",
    avatar: "🌾",
    title: "Fonds pour startups agricoles",
    description: "Jusqu'à 50M FCFA...",
    city: "Bamako",
    premium: true,
  },
  {
    id: 4,
    type: "partenariat",
    domain: "education",
    author: "EduTech",
    avatar: "📖",
    title: "Partenariat écoles-entreprises",
    description: "Créons ensemble...",
    city: "Ouagadougou",
    premium: false,
  },
];

function OpportunityCard({ opp }: { opp: (typeof mockOpportunities)[0] }) {
  const colors = useColors();
  const typeInfo = opportunityTypes.find((t) => t.id === opp.type);

  return (
    <TouchableOpacity
      className="rounded-2xl overflow-hidden mb-3 p-4 active:opacity-90"
      style={{
        backgroundColor: colors.surface,
        borderWidth: opp.premium ? 1.5 : 0,
        borderColor: colors.primary,
      }}
    >
      {/* Header */}
      <View className="flex-row items-center gap-3 mb-3">
        <View
          className="w-12 h-12 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.background }}
        >
          <Text className="text-2xl">{opp.avatar}</Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="font-semibold text-sm" style={{ color: colors.foreground }}>
              {opp.author}
            </Text>
            {opp.premium && (
              <View
                className="px-2 py-0.5 rounded-full"
                style={{ backgroundColor: colors.primary }}
              >
                <Text className="text-xs font-bold" style={{ color: colors.background }}>
                  PREMIUM
                </Text>
              </View>
            )}
          </View>
          <Text className="text-xs" style={{ color: colors.muted }}>
            📍 {opp.city}
          </Text>
        </View>
        <View
          className="px-2 py-1 rounded-lg"
          style={{ backgroundColor: typeInfo?.color }}
        >
          <Text className="text-xs">{typeInfo?.emoji}</Text>
        </View>
      </View>

      {/* Title */}
      <Text className="font-bold text-base mb-2" style={{ color: colors.foreground }}>
        {opp.title}
      </Text>

      {/* Description */}
      <Text className="text-sm mb-3 line-clamp-2" style={{ color: colors.muted }}>
        {opp.description}
      </Text>

      {/* Action */}
      <TouchableOpacity
        className="py-2 px-4 rounded-lg items-center"
        style={{ backgroundColor: colors.primary }}
      >
        <Text className="text-sm font-bold" style={{ color: colors.background }}>
          Voir plus
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function OpportunitiesScreen() {
  const colors = useColors();
  const [selectedType, setSelectedType] = useState("all");
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  const filteredOpps = mockOpportunities.filter((opp) => {
    if (selectedType !== "all" && opp.type !== selectedType) return false;
    if (selectedDomain && opp.domain !== selectedDomain) return false;
    return true;
  });

  return (
    <ScreenContainer
      containerClassName="flex-1"
      className="flex-1"
      edges={["top", "left", "right"]}
    >
      <View className="flex-1">
        {/* Header */}
        <View className="px-4 py-4 flex-row items-center justify-between border-b" style={{ borderBottomColor: colors.border }}>
          <Text className="text-2xl font-bold" style={{ color: colors.foreground }}>
            Opportunités
          </Text>
          <TouchableOpacity className="px-3 py-2 rounded-lg" style={{ backgroundColor: colors.primary }}>
            <Text className="text-sm font-bold" style={{ color: colors.background }}>
              + Publier
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
        >
          {opportunityTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              className="px-3 py-1.5 rounded-full items-center gap-1 flex-row active:opacity-70"
              style={{
                backgroundColor: selectedType === type.id ? type.color : colors.surface,
              }}
              onPress={() => setSelectedType(type.id)}
            >
              <Text className="text-sm">{type.emoji}</Text>
              <Text
                className="text-xs font-semibold"
                style={{
                  color: selectedType === type.id ? colors.background : colors.foreground,
                }}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Domains */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
        >
          <TouchableOpacity
            className="px-3 py-1.5 rounded-full items-center gap-1 flex-row active:opacity-70"
            style={{
              backgroundColor: selectedDomain === null ? colors.primary : colors.surface,
            }}
            onPress={() => setSelectedDomain(null)}
          >
            <Text className="text-xs font-semibold" style={{ color: selectedDomain === null ? colors.background : colors.foreground }}>
              Tous les domaines
            </Text>
          </TouchableOpacity>
          {domains.map((domain) => (
            <TouchableOpacity
              key={domain.id}
              className="px-3 py-1.5 rounded-full items-center gap-1 flex-row active:opacity-70"
              style={{
                backgroundColor: selectedDomain === domain.id ? colors.primary : colors.surface,
              }}
              onPress={() => setSelectedDomain(domain.id)}
            >
              <Text className="text-sm">{domain.emoji}</Text>
              <Text
                className="text-xs font-semibold"
                style={{
                  color: selectedDomain === domain.id ? colors.background : colors.foreground,
                }}
              >
                {domain.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Opportunities List */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {filteredOpps.length > 0 ? (
            filteredOpps.map((opp) => <OpportunityCard key={opp.id} opp={opp} />)
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-lg font-semibold mb-2" style={{ color: colors.muted }}>
                Aucune opportunité
              </Text>
              <Text className="text-sm" style={{ color: colors.muted }}>
                Sois le premier à publier !
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}
