// app/(dashboard_advertiser)/premium_creator_hire.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// import { useLocalSearchParams } from 'expo-router'; // Remove this
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { Video } from 'expo-av';

const { width } = Dimensions.get('window');
const scale = width / 428;

const API_BASE = 'https://clippapay.com/api';

export default function PremiumCreatorHire() {
  // const params = useLocalSearchParams(); // Remove this
  // const id = params?.id as string | undefined; // Remove this

  const [creatorId, setCreatorId] = useState<string | null>(null); // New state for ID from storage
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Campaign form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState('');
  const [deadline, setDeadline] = useState('');
  const [budget, setBudget] = useState('');

  const getToken = async () => {
    let token = null;
    if (Platform.OS === 'web') {
      token = await AsyncStorage.getItem('userToken');
    } else {
      token = await SecureStore.getItemAsync('userToken');
      if (!token) token = await AsyncStorage.getItem('userToken');
    }
    return token;
  };

  const toFullUrl = (path: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `https://clippapay.com${path}`;
  };

  // New effect to load ID from storage
  useEffect(() => {
    const loadCreatorId = async () => {
      try {
        const storedId = await AsyncStorage.getItem('selectedCreatorId');
        if (storedId) {
          setCreatorId(storedId);
        } else {
          setError('No creator selected');
          setLoading(false);
        }
      } catch (storageErr) {
        console.error('Failed to load creator ID from storage:', storageErr);
        setError('Failed to load selected creator');
        setLoading(false);
      }
    };

    loadCreatorId();
  }, []);

  useEffect(() => {
    if (!creatorId) return; // Wait until ID is loaded

    setLoading(true);
    setError(null);

    const fetchCreator = async () => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error('No authentication token found');
        }

        console.log(`Fetching creator profile for ID: ${creatorId}`);

        const res = await axios.get(`${API_BASE}/user/clipper-profile/${creatorId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log('Received creator data:', res.data);

        setCreator(res.data);
      } catch (err: any) {
        console.error('Failed to load creator:', err);
        const errMsg = err.response?.data?.error || 'Failed to load creator profile';
        setError(errMsg);
        Alert.alert('Error', errMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchCreator();
  }, [creatorId]); // Depend on creatorId instead of id

  const handleCreateCampaign = async () => {
    if (!title || !description || !platform) {
      Alert.alert('Missing Fields', 'Please fill all required fields');
      return;
    }

    // For now just preview payload (route later)
    const payload = {
      creatorId,
      title,
      description,
      platform,
      deadline,
      budget,
    };

    console.log('CAMPAIGN PAYLOAD:', payload);

    Alert.alert(
      'Ready',
      'Campaign payload prepared (route will be connected next)'
    );
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#FF3366" />
      </View>
    );
  }

  if (error || !creator) {
    return (
      <View style={styles.loader}>
        <Text style={{ color: '#FFF' }}>{error || 'Creator not found'}</Text>
      </View>
    );
  }

  const image = toFullUrl(creator.profileImage);
  const video = toFullUrl(creator.sampleVideo);

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#0F0F0F', '#1A1A1A', '#252525']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* PROFILE HEADER */}
          <Image source={{ uri: image }} style={styles.heroImage} />

          <View style={styles.section}>
            <Text style={styles.name}>
              {creator.user?.firstName} {creator.user?.lastName}
            </Text>

            <Text style={styles.rating}>
              ⭐ {(creator.user?.rating || 0).toFixed(1)}
            </Text>

            <Text style={styles.bio}>
              {creator.bio || 'Professional Premium Creator'}
            </Text>
          </View>

          {/* SAMPLE VIDEO */}
          {video && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sample Work</Text>
              <Video
                source={{ uri: video }}
                style={styles.video}
                useNativeControls
                resizeMode="contain"
              />
            </View>
          )}

          {/* STATS */}
          <View style={styles.statsRow}>
            <Stat label="Projects" value={creator.completedProjects || 0} />
            <Stat label="Delivery" value={`${creator.expectedDelivery || 0}d`} />
            <Stat label="Rate" value={`$${creator.ratePerVideo || 0}`} />
          </View>

          {/* CAMPAIGN FORM */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Create Premium Campaign</Text>

            <Input label="Campaign Title" value={title} onChange={setTitle} />

            <Input
              label="Campaign Description"
              value={description}
              onChange={setDescription}
              multiline
            />

            <Input label="Platform (TikTok, IG, YT)" value={platform} onChange={setPlatform} />

            <Input label="Deadline (days)" value={deadline} onChange={setDeadline} />

            <Input label="Budget ($)" value={budget} onChange={setBudget} />

            {/* CREATE BUTTON */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleCreateCampaign}
            >
              <LinearGradient
                colors={['#FF3366', '#FF6B35']}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.submitText}>CREATE PREMIUM CAMPAIGN</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* ---------- SMALL COMPONENTS ---------- */

function Stat({ label, value }: any) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Input({ label, value, onChange, multiline }: any) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        style={[
          styles.input,
          multiline && { height: 120, textAlignVertical: 'top' },
        ]}
        placeholder={label}
        placeholderTextColor="#777"
      />
    </View>
  );
}

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    justifyContent: 'center',
    alignItems: 'center',
  },

  heroImage: {
    width: '100%',
    height: 240 * scale,
  },

  section: {
    padding: 20 * scale,
  },

  name: {
    color: '#FFF',
    fontSize: 26 * scale,
    fontWeight: '800',
  },

  rating: {
    color: '#FFD700',
    marginTop: 6,
  },

  bio: {
    color: '#CCC',
    marginTop: 10,
    lineHeight: 22,
  },

  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },

  video: {
    width: '100%',
    height: 220 * scale,
    borderRadius: 16,
  },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },

  statBox: {
    flex: 1,
    alignItems: 'center',
  },

  statValue: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },

  statLabel: {
    color: '#AAA',
    fontSize: 12,
  },

  formCard: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 20,
  },

  formTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 20,
  },

  inputLabel: {
    color: '#AAA',
    marginBottom: 6,
  },

  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 14,
    color: '#FFF',
  },

  submitBtn: {
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: 10,
  },

  submitText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
  },
});