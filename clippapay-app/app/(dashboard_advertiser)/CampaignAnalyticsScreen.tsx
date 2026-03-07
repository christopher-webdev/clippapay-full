import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  Dimensions,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { LineChart } from "react-native-chart-kit";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const API_BASE = 'http://192.168.0.16:5000/api' //"https://clippapay.com/api";
const CLIPPERS_PER_PAGE = 10;

interface Campaign {
  _id: string;
  title: string;
  status?: string;
  kind?: "normal" | "ugc" | "pgc";
  views_purchased?: number;
  views_left?: number;
  budget_total?: number;
  desiredVideos?: number;
  approvedVideosCount?: number;
}

interface Clipper {
  name: string;
  username?: string;
  platform: string;
  views: number;
  contribution: number;
  link?: string;
  date?: string;
  verified?: boolean;
}

interface Analytics {
  totalViews: number;
  targetViews: number;
  completion: number;
  budgetTotal: number;
  clippersCount: number;
  history: { date: string; views: number }[];
  clippers: Clipper[];
}

export default function CampaignAnalyticsScreen() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Pagination state
  const [clipperPage, setClipperPage] = useState(1);

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem("userToken");
      if (!storedToken) return Alert.alert("Error", "No token found");
      setToken(storedToken);
      fetchCampaigns(storedToken);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchCampaigns = async (authToken: string) => {
    setLoadingCampaigns(true);
    try {
      const res = await axios.get(`${API_BASE}/campaigns`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setCampaigns(list);
      if (list.length > 0) {
        setSelectedCampaign(list[0]);
        fetchAnalytics(authToken, list[0]._id, list[0]);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to load campaigns");
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const fetchAnalytics = async (authToken: string, campaignId: string, campaign: Campaign) => {
    setLoadingAnalytics(true);
    try {
      const res = await axios.get(`${API_BASE}/campaigns/${campaignId}/analytics`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = res.data;

      const totalViews = data.totalVerifiedViews || data.totalViews || data.total_views || 0;
      const targetViews = campaign.views_purchased || 100000;

      let completion = 0;
        if (campaign.kind === "pgc") {
          completion = campaign.desiredVideos
            ? Math.round(((campaign.approvedVideosCount || 0) / campaign.desiredVideos) * 100)
            : 0;
        } else {
          completion = campaign.views_purchased && campaign.views_purchased > 0
            ? Math.round(
                Math.min(
                  ((campaign.views_purchased - (campaign.views_left || 0)) / campaign.views_purchased) * 100,
                  100
                )
              )
            : 0;
        }

      const normalized: Analytics = {
        totalViews,
        targetViews,
        completion,
        budgetTotal: campaign.budget_total || 0,
        clippersCount: data.clippers?.length || 0,
        history: (data.history || []).map((p: any) => ({
          date: p.date?.slice(5) || "??",
          views: p.views || 0,
        })),
        clippers: (data.clippers || []).map((c: any) => ({
          name: c.name?.split(" ")[0] || c.name || "Unknown",
          username: c.username || `@${c.handle || "unknown"}`,
          platform: c.platform || "Other",
          views: c.views || 0,
          contribution: c.contribution || Math.round((c.views || 0) / (totalViews || 1) * 100),
          link: c.link,
          date: c.date || "2026-01-25",
          verified: c.status === "approved" || c.verified,
        })),
      };

      setAnalytics(normalized);
      setClipperPage(1); // reset pagination on campaign change
    } catch (err) {
      Alert.alert("Error", "Failed to load analytics");
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const openLink = (url?: string) => {
    if (url) Linking.openURL(url).catch(() => {});
  };

  const goToProfile = (username?: string) => {
    if (username) Alert.alert("Profile", `Go to ${username}`);
  };

  // Pagination helpers
  const getPaginatedClippers = () => {
    if (!analytics?.clippers) return [];
    const start = (clipperPage - 1) * CLIPPERS_PER_PAGE;
    return analytics.clippers.slice(start, start + CLIPPERS_PER_PAGE);
  };

  const totalPages = analytics?.clippers
    ? Math.ceil(analytics.clippers.length / CLIPPERS_PER_PAGE)
    : 1;

  const chartData = {
    labels: analytics?.history?.map(h => h.date) || Array(7).fill(""),
    datasets: [{ data: analytics?.history?.map(h => h.views) || Array(7).fill(0) }],
  };

  const chartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
    labelColor: () => "#6B7280",
    propsForDots: { r: "5", strokeWidth: "2", stroke: "#4F46E5" },
  };

  // ────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────

  return (
    <LinearGradient
      colors={['#34D3991A', '#D6CF8D80', '#ffffffb2']}
      style={{ flex: 1 }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/(dashboard)/Campaigns")}>
          <ChevronLeft size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Campaign Analytics</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Scrollable Campaign Selector */}
        <View style={styles.selectorContainer}>
          <Text style={styles.selectLabel}>Select Campaign</Text>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollableCampaigns}
          >
            {loadingCampaigns ? (
              <ActivityIndicator color="#4F46E5" style={{ marginHorizontal: 20, marginVertical: 12 }} />
            ) : campaigns.length === 0 ? (
              <Text style={styles.noCampaignsText}>No campaigns available</Text>
            ) : (
              campaigns.map((camp) => (
                <TouchableOpacity
                  key={camp._id}
                  style={[
                    styles.campaignChip,
                    selectedCampaign?._id === camp._id && styles.campaignChipActive,
                  ]}
                  onPress={() => {
                    setSelectedCampaign(camp);
                    if (token) fetchAnalytics(token, camp._id, camp);
                  }}
                  activeOpacity={0.8}
                >
                  <Text 
                    style={[
                      styles.campaignChipText,
                      selectedCampaign?._id === camp._id && styles.campaignChipTextActive,
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {camp.title}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>

        {loadingAnalytics ? (
          <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 60 }} />
        ) : analytics ? (
          <>
            {/* Metrics */}
            <View style={styles.metricRow}>
              <View style={[styles.metricCard, styles.viewsCard]}>
                <Text style={styles.metricLabel}>Total Views</Text>
                <Text style={styles.metricValue}>
                  {analytics.totalViews.toLocaleString()}
                </Text>
                <Text style={styles.metricSub}>
                  of {analytics.targetViews.toLocaleString()} target
                </Text>
              </View>

              <View style={[styles.metricCard, styles.completionCard]}>
                <Text style={styles.metricLabel}>Completion</Text>
                <Text style={styles.metricValue}>{Math.round(analytics.completion)}%</Text>
              </View>
            </View>

            <View style={styles.metricRow}>
              <View style={[styles.metricCard, styles.budgetCard]}>
                <Text style={styles.metricLabel}>Budget Total</Text>
                <Text style={styles.metricValue}>
                  ₦{analytics.budgetTotal.toLocaleString()}
                </Text>
              </View>

              <View style={[styles.metricCard, styles.clippersCard]}>
                <Text style={styles.metricLabel}>Clippers</Text>
                <Text style={styles.metricValue}>{analytics.clippersCount}</Text>
              </View>
            </View>

            {/* Chart */}
            <View style={styles.chartCard}>
              <Text style={styles.sectionTitle}>Views Over Time</Text>
              <ScrollView horizontal>
                <LineChart
                  data={chartData}
                  width={Math.max(SCREEN_WIDTH - 40, analytics.history.length * 90)}
                  height={200}
                  chartConfig={chartConfig}
                  bezier
                  style={{ borderRadius: 10 }}
                />
              </ScrollView>
            </View>

            {/* Clipper Performance Header */}
            <View style={styles.clipperSectionHeader}>
              <Text style={styles.sectionTitle}>Clipper Performance</Text>
              <Text style={styles.clippersCount}>
                {analytics.clippers.length} Clippers
              </Text>
            </View>

            {/* Paginated Clippers */}
            <FlatList
              data={getPaginatedClippers()}
              keyExtractor={(_, i) => `clipper-${clipperPage}-${i}`}
              scrollEnabled={false}
              ListEmptyComponent={<Text style={styles.emptyText}>No clippers found</Text>}
              renderItem={({ item }) => (
                <View style={styles.clipperCard}>
                  <TouchableOpacity onPress={() => goToProfile(item.username)}>
                    <Text style={styles.clipperName}>
                      {item.name} {item.verified && <Text style={styles.verified}>✔</Text>}
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.clipperUsername}>{item.username}</Text>

                  <View style={[styles.platformBadge, { backgroundColor: getPlatformColor(item.platform) }]}>
                    <Text style={styles.platformText}>{item.platform}</Text>
                  </View>

                  <Text style={styles.dateText}>{item.date}</Text>

                  <View style={styles.viewsRow}>
                    <Text style={styles.viewsText}>
                      {item.views.toLocaleString()} views
                    </Text>
                    {item.platform.toLowerCase() !== "whatsapp" && item.link && (
                      <TouchableOpacity
                        style={styles.verifyBtn}
                        onPress={() => openLink(item.link)}
                      >
                        <Text style={styles.verifyBtnText}>Verify</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.barContainer}>
                    <View
                      style={[styles.barFill, { width: `${item.contribution}%` }]}
                    />
                  </View>
                  <Text style={styles.contributionText}>
                    Contribution {item.contribution}%
                  </Text>
                </View>
              )}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageBtn, clipperPage === 1 && styles.pageBtnDisabled]}
                  disabled={clipperPage === 1}
                  onPress={() => setClipperPage(p => Math.max(1, p - 1))}
                >
                  <Text style={styles.pageBtnText}>Previous</Text>
                </TouchableOpacity>

                <Text style={styles.pageInfo}>
                  Page {clipperPage} of {totalPages}
                </Text>

                <TouchableOpacity
                  style={[styles.pageBtn, clipperPage === totalPages && styles.pageBtnDisabled]}
                  disabled={clipperPage === totalPages}
                  onPress={() => setClipperPage(p => Math.min(totalPages, p + 1))}
                >
                  <Text style={styles.pageBtnText}>Next</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Verified Performance Data */}
            <View style={styles.verifiedInfoCard}>
              <Text style={styles.verifiedTitle}>Verified Performance Data</Text>
              <Text style={styles.verifiedText}>
                All view counts are verified through direct platform links. Click "Verify" on any clipper to confirm their post and view count on the original platform.
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.noData}>No analytics data available</Text>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

// ────────────────────────────────────────────────
// STYLES
// ────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#111827" },

  // Container
  container: { paddingHorizontal: 20, paddingBottom: 100 },

  // Scrollable Selector
  selectorContainer: {
    marginBottom: 24,
  },
  selectLabel: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 8,
    fontWeight: "500",
  },
  scrollableCampaigns: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 12,
  },
  campaignChip: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 220,
  },
  campaignChipActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  campaignChipText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#374151",
  },
  campaignChipTextActive: {
    color: "#ffffff",
    fontWeight: "600",
  },
  noCampaignsText: {
    fontSize: 15,
    color: "#9CA3AF",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  // Metrics
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  metricCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  viewsCard: { borderLeftColor: "#42ADE2" },
  completionCard: { borderLeftColor: "#F2B200" },
  budgetCard: { borderLeftColor: "#10B981" },
  clippersCard: { borderLeftColor: "#ED1C1F" },

  metricLabel: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
  metricValue: { fontSize: 24, fontWeight: "700", color: "#111827", marginTop: 4 },
  metricSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },

  // Chart
  chartCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#111827", marginBottom: 8 },

  // Clipper Section
  clipperSectionHeader: {
    marginTop: 24,
    marginBottom: 12,
  },
  clippersCount: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },

  clipperCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  clipperName: { fontSize: 16, fontWeight: "600", color: "#111827" },
  verified: { color: "#10B981", fontSize: 14 },
  clipperUsername: { fontSize: 13, color: "#6B7280", marginTop: 3 },
  platformBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 10,
  },
  platformText: { color: "#ffffff", fontSize: 12, fontWeight: "600" },
  dateText: { fontSize: 12, color: "#9CA3AF", marginTop: 6 },
  viewsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  viewsText: { fontSize: 16, fontWeight: "700", color: "#4F46E5" },
  verifyBtn: {
    backgroundColor: "rgba(15,32,39,0.05)",
    borderWidth: 0.5,
    borderColor: "#0F2027",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  verifyBtnText: { fontSize: 13, color: "#0F2027", fontWeight: "500" },

  barContainer: {
    height: 6,
    backgroundColor: "#f1f5f9",
    borderRadius: 3,
    marginTop: 12,
    overflow: "hidden",
  },
  barFill: { height: "100%", backgroundColor: "#4F46E5" },
  contributionText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 6,
    fontWeight: "500",
  },

  // Pagination
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 20,
    paddingHorizontal: 8,
  },
  pageBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  pageBtnDisabled: { opacity: 0.5 },
  pageBtnText: { fontSize: 14, color: "#374151", fontWeight: "500" },
  pageInfo: { fontSize: 14, color: "#6B7280" },

  // Verified Info
  verifiedInfoCard: {
    backgroundColor: "#f8f9ff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  verifiedTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  verifiedText: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },

  emptyText: { textAlign: "center", color: "#9CA3AF", fontSize: 14, paddingVertical: 20 },
  noData: { textAlign: "center", marginTop: 60, color: "#9CA3AF", fontSize: 16 },
});

const getPlatformColor = (platform: string) => {
  const p = platform.toLowerCase();
  if (p.includes("tiktok")) return "#0F2027";
  if (p.includes("instagram")) return "#E1306C";
  if (p.includes("youtube")) return "#FF0000";
  if (p.includes("whatsapp")) return "#25D366";
  return "#6B7280";
};