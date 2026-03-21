// app/(dashboard_advertiser)/CreateUgc.tsx
//
// Redesigned UGC campaign creation form:
//  - Multi-step wizard (4 steps) so it doesn't feel overwhelming
//  - Inline field-level validation errors — tells exactly which field failed
//  - Native calendar picker — no external package, pure React Native
//  - Progress bar at top
//  - Success screen after submission
//
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, Image,
  Platform, Alert, KeyboardAvoidingView, ActivityIndicator,
  StyleSheet, Dimensions, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL  = process.env.EXPO_PUBLIC_API_URL;
const { width } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────
type FormData = {
  title: string;
  description: string;
  script: string;
  keyPhrases: string;
  preferredLength: string;
  category: string;
  deadlineDate: Date | null;
  aspectRatio: string;
  preferredLocation: string;
  locationDescription: string;
  backgroundStyle: string;
  moodTone: string;
  referenceLinks: string;
  thumbnail: { uri: string; name: string; type: string } | null;
};

type Errors = Partial<Record<keyof FormData, string>>;

// ─── Constants ────────────────────────────────────────────────────────────────
const LENGTHS   = ['15s', '30s', '45s', '60s', '90s', 'any'];
const ASPECTS   = ['9:16', '16:9', '1:1', '4:5', 'any'];
const LOCATIONS = ['anywhere', 'indoor', 'outdoor', 'studio', 'specific'];
const CATEGORIES = [
  'Beauty', 'Tech', 'Food', 'Fashion', 'Lifestyle',
  'Fitness', 'Travel', 'Gaming', 'Finance', 'Education', 'Other',
];

const STEPS = [
  { title: 'Campaign Basics',     icon: 'document-text-outline'  },
  { title: 'Script & Content',    icon: 'mic-outline'            },
  { title: 'Creative Direction',  icon: 'color-palette-outline'  },
  { title: 'Review & Submit',     icon: 'checkmark-circle-outline'},
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_ABBR = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getToken = async () => {
  try {
    let t = await SecureStore.getItemAsync('userToken');
    if (!t) t = await AsyncStorage.getItem('userToken');
    return t;
  } catch { return null; }
};

const fmtDate = (d: Date | null) =>
  !d ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

// Build calendar grid for a given month/year
const buildCalendar = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

// ─── Calendar Component ────────────────────────────────────────────────────────
function CalendarPicker({
  value, onChange, onClose,
}: { value: Date | null; onChange: (d: Date) => void; onClose: () => void }) {
  const today = new Date();
  const [viewYear, setViewYear]   = useState(value?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(value?.getMonth() ?? today.getMonth());

  const cells = buildCalendar(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const isPast = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    d.setHours(0, 0, 0, 0);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return d <= t;
  };

  const isSelected = (day: number) =>
    value && value.getFullYear() === viewYear &&
    value.getMonth() === viewMonth && value.getDate() === day;

  return (
    <View style={CAL.wrap}>
      {/* Month nav */}
      <View style={CAL.header}>
        <TouchableOpacity style={CAL.navBtn} onPress={prevMonth}>
          <Ionicons name="chevron-back" size={20} color="#4F46E5" />
        </TouchableOpacity>
        <Text style={CAL.monthTitle}>{MONTHS[viewMonth]} {viewYear}</Text>
        <TouchableOpacity style={CAL.navBtn} onPress={nextMonth}>
          <Ionicons name="chevron-forward" size={20} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      {/* Day headers */}
      <View style={CAL.weekRow}>
        {DAYS_ABBR.map(d => (
          <Text key={d} style={CAL.weekDay}>{d}</Text>
        ))}
      </View>

      {/* Cells */}
      <View style={CAL.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`e-${i}`} style={CAL.cell} />;
          const past     = isPast(day);
          const selected = isSelected(day);
          return (
            <TouchableOpacity
              key={`d-${day}`}
              style={[CAL.cell, selected && CAL.cellSelected, past && CAL.cellPast]}
              onPress={() => {
                if (past) return;
                onChange(new Date(viewYear, viewMonth, day));
                onClose();
              }}
              disabled={past}
              activeOpacity={0.7}
            >
              <Text style={[CAL.dayTxt, selected && CAL.dayTxtSelected, past && CAL.dayTxtPast]}>
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={CAL.cancelBtn} onPress={onClose}>
        <Text style={CAL.cancelTxt}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Field-level error display ─────────────────────────────────────────────────
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <View style={S.errRow}>
      <Ionicons name="alert-circle" size={13} color="#EF4444" />
      <Text style={S.errTxt}>{msg}</Text>
    </View>
  );
}

// ─── Section header ────────────────────────────────────────────────────────────
function SectionHdr({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <View style={S.sHdr}>
      <View style={S.sHdrIcon}>
        <Ionicons name={icon as any} size={20} color="#4F46E5" />
      </View>
      <View>
        <Text style={S.sHdrTitle}>{title}</Text>
        {sub && <Text style={S.sHdrSub}>{sub}</Text>}
      </View>
    </View>
  );
}

// ─── Chip selector ────────────────────────────────────────────────────────────
function ChipGroup({
  options, value, onChange, wrap = false,
}: { options: string[]; value: string; onChange: (v: string) => void; wrap?: boolean }) {
  return (
    <View style={[S.chipRow, wrap && { flexWrap: 'wrap' }]}>
      {options.map(o => (
        <TouchableOpacity
          key={o}
          style={[S.chip, value === o && S.chipActive]}
          onPress={() => onChange(o)}
        >
          <Text style={[S.chipTxt, value === o && S.chipTxtActive]}>
            {o.charAt(0).toUpperCase() + o.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function CreateUGCScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [step, setStep]       = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [errors, setErrors]   = useState<Errors>({});

  const [form, setForm] = useState<FormData>({
    title: '', description: '', script: '', keyPhrases: '',
    preferredLength: '30s', category: '', deadlineDate: null,
    aspectRatio: '9:16', preferredLocation: 'anywhere',
    locationDescription: '', backgroundStyle: '', moodTone: '',
    referenceLinks: '', thumbnail: null,
  });

  const set = (key: keyof FormData, val: any) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }));
  };

  // ── Thumbnail picker ────────────────────────────────────────────────────────
  const pickThumb = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo access to upload a thumbnail.'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true, aspect: [4, 3], quality: 0.82,
    });
    if (!r.canceled && r.assets?.[0]) {
      const a = r.assets[0];
      set('thumbnail', { uri: a.uri, name: a.fileName || `thumb-${Date.now()}.jpg`, type: a.mimeType || 'image/jpeg' });
    }
  }, []);

  // ── Per-step validation ────────────────────────────────────────────────────
  const validateStep = (s: number): boolean => {
    const e: Errors = {};
    if (s === 0) {
      if (!form.title.trim())        e.title       = 'Campaign title is required';
      else if (form.title.trim().length < 5) e.title = 'Title must be at least 5 characters';
      if (!form.description.trim())  e.description = 'Brief description is required';
      else if (form.description.trim().length < 20) e.description = 'Description should be at least 20 characters';
      if (!form.category.trim())     e.category    = 'Category is required';
      if (!form.deadlineDate)        e.deadlineDate = 'Please pick an application deadline';
    }
    if (s === 1) {
      // Script is optional but key phrases have a length limit
      if (form.keyPhrases.length > 2000) e.keyPhrases = 'Key phrases are too long (max 2000 chars)';
    }
    // Step 2 creative direction is all optional
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) {
      // Scroll to top to show errors
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setStep(s => s + 1);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const goBack = () => {
    setStep(s => s - 1);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) { Alert.alert('Not logged in', 'Please log in again.'); router.replace('/(auth)/login'); return; }

      const fd = new FormData() as any;
      fd.append('title',            form.title.trim());
      fd.append('description',      form.description.trim());
      fd.append('script',           form.script.trim());
      fd.append('keyPhrases',       JSON.stringify(form.keyPhrases.split('\n').map(p => p.trim()).filter(Boolean)));
      fd.append('preferredLength',  form.preferredLength);
      fd.append('category',         form.category.trim());
      fd.append('applicationDeadline', form.deadlineDate!.toISOString());
      fd.append('aspectRatio',      form.aspectRatio);
      fd.append('preferredLocation',form.preferredLocation);
      fd.append('locationDescription', form.locationDescription.trim());
      fd.append('backgroundStyle',  form.backgroundStyle.trim());
      fd.append('moodTone',         form.moodTone.trim());
      fd.append('referenceLinks',   JSON.stringify(form.referenceLinks.split('\n').map(l => l.trim()).filter(Boolean)));

      if (form.thumbnail) {
        fd.append('thumbnail', {
          uri:  Platform.OS === 'ios' ? form.thumbnail.uri.replace('file://', '') : form.thumbnail.uri,
          name: form.thumbnail.name,
          type: form.thumbnail.type,
        });
      }

      console.log('Submitting campaign to:', `${API_URL}/campaigns`);
      console.log('Deadline ISO:', form.deadlineDate!.toISOString());

      const res = await fetch(`${API_URL}/campaigns`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      let data: any = {};
      try { data = await res.json(); } catch (_) {}

      console.log('Server response status:', res.status);
      console.log('Server response body:', JSON.stringify(data));

      if (!res.ok) {
        // Parse field-level errors from server details array
        const serverDetails: string[] = data.details || [];
        const newErrors: Errors = {};

        if (serverDetails.length > 0) {
          serverDetails.forEach((msg: string) => {
            const m = msg.toLowerCase();
            if (m.includes('title'))                   newErrors.title        = msg;
            else if (m.includes('descrip'))            newErrors.description  = msg;
            else if (m.includes('categor'))            newErrors.category     = msg;
            else if (m.includes('deadline') || m.includes('date')) newErrors.deadlineDate = msg;
            else if (m.includes('script'))             newErrors.script       = msg;
          });
        }

        // Show the exact error message from the server
        const mainErr = data.error || data.message || `Server error ${res.status}`;

        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          // Jump back to step 0 if basic fields errored
          if (newErrors.title || newErrors.description || newErrors.category || newErrors.deadlineDate) {
            setStep(0);
            scrollRef.current?.scrollTo({ y: 0, animated: true });
          }
          Alert.alert('Validation Error', `${mainErr}\n\nPlease fix the highlighted fields.`);
        } else {
          // Generic server error — show exactly what the server said
          Alert.alert('Error', mainErr);
        }
        return;
      }

      setDone(true);
    } catch (err: any) {
      console.error('Submit error:', err);
      Alert.alert('Network Error', err.message || 'Could not reach the server. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (done) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F5F7' }}>
        <View style={S.successWrap}>
          <LinearGradient colors={['#4F46E5','#7C3AED']} style={S.successCircle}>
            <Ionicons name="checkmark" size={52} color="#FFF" />
          </LinearGradient>
          <Text style={S.successTitle}>Campaign Submitted!</Text>
          <Text style={S.successSub}>
            Your UGC campaign is now pending review by our team. Once approved, creators will start applying.
            You'll get a notification when it goes live.
          </Text>
          <View style={S.successInfo}>
            <Ionicons name="time-outline" size={18} color="#7C3AED" />
            <Text style={S.successInfoTxt}>Usually reviewed within 15 minutes</Text>
          </View>
          <TouchableOpacity
            style={S.successBtn}
            onPress={() => router.push('/(dashboard_advertiser)/Campaigns' as any)}
          >
            <Text style={S.successBtnTxt}>View My Campaigns</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={S.successBtnSecondary}
            onPress={() => { setDone(false); setStep(0); setForm({ title:'',description:'',script:'',keyPhrases:'',preferredLength:'30s',category:'',deadlineDate:null,aspectRatio:'9:16',preferredLocation:'anywhere',locationDescription:'',backgroundStyle:'',moodTone:'',referenceLinks:'',thumbnail:null }); }}
          >
            <Text style={S.successBtnSecondaryTxt}>Create Another Campaign</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Step content ───────────────────────────────────────────────────────────
  const renderStep0 = () => (
    <>
      {/* Thumbnail */}
      <TouchableOpacity style={S.thumbBox} onPress={pickThumb} activeOpacity={0.85}>
        {form.thumbnail ? (
          <Image source={{ uri: form.thumbnail.uri }} style={S.thumbImg} resizeMode="cover" />
        ) : (
          <View style={S.thumbEmpty}>
            <Ionicons name="image-outline" size={40} color="#C4B5FD" />
            <Text style={S.thumbEmptyTxt}>Tap to add thumbnail</Text>
            <Text style={S.thumbEmptyHint}>4:3 ratio recommended · optional</Text>
          </View>
        )}
        {form.thumbnail && (
          <View style={S.thumbEditBadge}>
            <Ionicons name="pencil" size={14} color="#FFF" />
          </View>
        )}
      </TouchableOpacity>

      {/* Title */}
      <View style={S.field}>
        <Text style={S.label}>Campaign Title <Text style={S.req}>*</Text></Text>
        <TextInput
          style={[S.input, errors.title && S.inputErr]}
          placeholder="e.g. Unboxing video for our new skincare range"
          value={form.title}
          onChangeText={v => set('title', v)}
          maxLength={180}
        />
        <FieldError msg={errors.title} />
        <Text style={S.charCount}>{form.title.length}/180</Text>
      </View>

      {/* Description */}
      <View style={S.field}>
        <Text style={S.label}>Campaign Brief <Text style={S.req}>*</Text></Text>
        <Text style={S.hint}>What do you want the video to achieve? Who is the target audience?</Text>
        <TextInput
          style={[S.input, S.textArea, errors.description && S.inputErr]}
          placeholder="Describe the goal, target audience, and what makes your product special..."
          value={form.description}
          onChangeText={v => set('description', v)}
          multiline numberOfLines={5} maxLength={2000}
        />
        <FieldError msg={errors.description} />
        <Text style={S.charCount}>{form.description.length}/2000</Text>
      </View>

      {/* Category */}
      <View style={S.field}>
        <Text style={S.label}>Category <Text style={S.req}>*</Text></Text>
        <View style={[S.chipRow, { flexWrap: 'wrap', gap: 8 }]}>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c}
              style={[S.chip, form.category === c && S.chipActive, errors.category && !form.category && S.chipErrBorder]}
              onPress={() => set('category', c)}
            >
              <Text style={[S.chipTxt, form.category === c && S.chipTxtActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <FieldError msg={errors.category} />
      </View>

      {/* Preferred length */}
      <View style={S.field}>
        <Text style={S.label}>Preferred Video Length</Text>
        <ChipGroup options={LENGTHS} value={form.preferredLength} onChange={v => set('preferredLength', v)} />
      </View>

      {/* Deadline — calendar */}
      <View style={S.field}>
        <Text style={S.label}>Application Deadline <Text style={S.req}>*</Text></Text>
        <Text style={S.hint}>Applications close on this date. Must be at least 1 day from today.</Text>
        <TouchableOpacity
          style={[S.dateBtn, errors.deadlineDate && S.inputErr]}
          onPress={() => setCalOpen(true)}
        >
          <Ionicons name="calendar-outline" size={20} color={form.deadlineDate ? '#4F46E5' : '#9CA3AF'} />
          <Text style={[S.dateBtnTxt, form.deadlineDate && { color: '#1F2937', fontWeight: '600' }]}>
            {form.deadlineDate ? fmtDate(form.deadlineDate) : 'Pick a deadline date'}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
        </TouchableOpacity>
        <FieldError msg={errors.deadlineDate} />
      </View>
    </>
  );

  const renderStep1 = () => (
    <>
      <SectionHdr icon="mic-outline" title="Script & Talking Points" sub="Help the creator understand exactly what to say" />

      <View style={S.field}>
        <Text style={S.label}>Full Script <Text style={S.optBadge}>optional</Text></Text>
        <Text style={S.hint}>Provide the complete script if you have one. Otherwise give key points below.</Text>
        <TextInput
          style={[S.input, S.textAreaLg]}
          placeholder="Write your full script here, or leave blank if you prefer creators to use their own style..."
          value={form.script}
          onChangeText={v => set('script', v)}
          multiline numberOfLines={10} maxLength={6000}
        />
        <Text style={S.charCount}>{form.script.length}/6000</Text>
      </View>

      <View style={S.field}>
        <Text style={S.label}>Key Phrases to Include <Text style={S.optBadge}>optional</Text></Text>
        <Text style={S.hint}>Specific phrases the creator MUST say. Put each on a new line.</Text>
        <TextInput
          style={[S.input, S.textArea, errors.keyPhrases && S.inputErr]}
          placeholder={'e.g.\n"Buy now at clippapay.com"\n"Use code SAVE20 for 20% off"\n"This changed my skin in 2 weeks"'}
          value={form.keyPhrases}
          onChangeText={v => set('keyPhrases', v)}
          multiline numberOfLines={5}
        />
        <FieldError msg={errors.keyPhrases} />
        <View style={S.phrasesPreview}>
          {form.keyPhrases.split('\n').filter(Boolean).map((p, i) => (
            <View key={i} style={S.phraseChip}>
              <Text style={S.phraseTxt} numberOfLines={1}>"{p.trim()}"</Text>
            </View>
          ))}
        </View>
      </View>
    </>
  );

  const renderStep2 = () => (
    <>
      <SectionHdr icon="color-palette-outline" title="Creative Direction" sub="All fields optional — only fill what matters to you" />

      <View style={S.field}>
        <Text style={S.label}>Aspect Ratio</Text>
        <ChipGroup options={ASPECTS} value={form.aspectRatio} onChange={v => set('aspectRatio', v)} />
      </View>

      <View style={S.field}>
        <Text style={S.label}>Filming Location</Text>
        <ChipGroup options={LOCATIONS} value={form.preferredLocation} onChange={v => set('preferredLocation', v)} wrap />
        {form.preferredLocation === 'specific' && (
          <TextInput
            style={[S.input, { marginTop: 10 }]}
            placeholder="Describe the location (e.g. modern kitchen, busy Nigerian market...)"
            value={form.locationDescription}
            onChangeText={v => set('locationDescription', v)}
          />
        )}
      </View>

      <View style={S.field}>
        <Text style={S.label}>Background Style</Text>
        <TextInput
          style={S.input}
          placeholder="e.g. Clean white background, natural outdoor setting..."
          value={form.backgroundStyle}
          onChangeText={v => set('backgroundStyle', v)}
        />
      </View>

      <View style={S.field}>
        <Text style={S.label}>Mood & Tone</Text>
        <TextInput
          style={S.input}
          placeholder="e.g. Fun & energetic, calm & professional, authentic & relatable..."
          value={form.moodTone}
          onChangeText={v => set('moodTone', v)}
        />
      </View>

      <View style={S.field}>
        <Text style={S.label}>Reference Links</Text>
        <Text style={S.hint}>YouTube videos, mood boards, competitor ads — one per line</Text>
        <TextInput
          style={[S.input, S.textArea]}
          placeholder={'https://youtube.com/watch?v=...\nhttps://...'}
          value={form.referenceLinks}
          onChangeText={v => set('referenceLinks', v)}
          multiline numberOfLines={4}
          autoCapitalize="none"
          keyboardType="url"
        />
      </View>
    </>
  );

  const renderStep3 = () => {
    const keyPhraseList = form.keyPhrases.split('\n').map(p => p.trim()).filter(Boolean);
    return (
      <>
        <SectionHdr icon="checkmark-circle-outline" title="Review Your Campaign" sub="Check everything looks right before submitting" />

        {/* Review cards */}
        {[
          { label: 'Title',        val: form.title || '—',            icon: 'text-outline'           },
          { label: 'Category',     val: form.category || '—',         icon: 'pricetag-outline'       },
          { label: 'Video Length', val: form.preferredLength,         icon: 'timer-outline'          },
          { label: 'Deadline',     val: fmtDate(form.deadlineDate) || '—', icon: 'calendar-outline' },
          { label: 'Aspect Ratio', val: form.aspectRatio,             icon: 'phone-portrait-outline' },
          { label: 'Location',     val: form.preferredLocation,       icon: 'location-outline'       },
        ].map(({ label, val, icon }) => (
          <View key={label} style={S.reviewRow}>
            <View style={S.reviewIcon}>
              <Ionicons name={icon as any} size={16} color="#4F46E5" />
            </View>
            <Text style={S.reviewLabel}>{label}</Text>
            <Text style={S.reviewVal} numberOfLines={1}>{val}</Text>
          </View>
        ))}

        {/* Description preview */}
        <View style={S.reviewSection}>
          <Text style={S.reviewSectionTitle}>Brief</Text>
          <Text style={S.reviewSectionTxt}>{form.description || '—'}</Text>
        </View>

        {form.script ? (
          <View style={S.reviewSection}>
            <Text style={S.reviewSectionTitle}>Script</Text>
            <Text style={S.reviewSectionTxt} numberOfLines={4}>{form.script}</Text>
          </View>
        ) : null}

        {keyPhraseList.length > 0 && (
          <View style={S.reviewSection}>
            <Text style={S.reviewSectionTitle}>Key Phrases ({keyPhraseList.length})</Text>
            {keyPhraseList.map((p, i) => (
              <Text key={i} style={S.reviewPhrase}>• "{p}"</Text>
            ))}
          </View>
        )}

        {/* What happens next */}
        <View style={S.nextStepsBox}>
          <Text style={S.nextStepsTitle}>What happens next?</Text>
          {[
            ['hourglass-outline',        'Your campaign is reviewed by our team (usually within 15 minutes)'],
            ['checkmark-circle-outline', 'Once approved, creators browse and apply with their rate'],
            ['people-outline',           'You review applicants and select the best creator'],
            ['cash-outline',             'Your payment is held in escrow until you accept the video'],
            ['trophy-outline',           'Accept the video and payment is released to the creator'],
          ].map(([icon, txt], i) => (
            <View key={i} style={S.nextStepRow}>
              <View style={S.nextStepNum}><Text style={S.nextStepNumTxt}>{i + 1}</Text></View>
              <Text style={S.nextStepTxt}>{txt}</Text>
            </View>
          ))}
        </View>
      </>
    );
  };

  const isLastStep = step === STEPS.length - 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F5F7' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        {/* ── Fixed header ── */}
        <View style={S.fixedHdr}>
          <TouchableOpacity style={S.backBtn} onPress={step === 0 ? () => router.back() : goBack}>
            <Ionicons name="arrow-back" size={22} color="#1F2937" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={S.hdrTitle}>{STEPS[step].title}</Text>
            <Text style={S.hdrSub}>Step {step + 1} of {STEPS.length}</Text>
          </View>
          {/* Step dots */}
          <View style={S.stepDots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[S.dot, i <= step && S.dotActive, i === step && S.dotCurrent]} />
            ))}
          </View>
        </View>

        {/* ── Progress bar ── */}
        <View style={S.progressTrack}>
          <View style={[S.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` as any }]} />
        </View>

        {/* ── Scrollable content ── */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={S.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          {/* Bottom actions */}
          <View style={S.actions}>
            {step > 0 && (
              <TouchableOpacity style={S.backActionBtn} onPress={goBack}>
                <Ionicons name="arrow-back" size={18} color="#6B7280" />
                <Text style={S.backActionTxt}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[S.nextBtn, loading && { opacity: 0.6 }, step === 0 && { flex: 1 }]}
              onPress={isLastStep ? handleSubmit : goNext}
              disabled={loading}
            >
              <LinearGradient colors={['#4F46E5','#7C3AED']} style={S.nextGrad}>
                {loading ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Text style={S.nextTxt}>{isLastStep ? 'Submit Campaign' : 'Continue'}</Text>
                    <Ionicons name={isLastStep ? 'send' : 'arrow-forward'} size={18} color="#FFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Calendar Modal ── */}
      <Modal visible={calOpen} transparent animationType="fade" onRequestClose={() => setCalOpen(false)}>
        <TouchableOpacity style={S.calOverlay} activeOpacity={1} onPress={() => setCalOpen(false)}>
          <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
            <CalendarPicker
              value={form.deadlineDate}
              onChange={d => { set('deadlineDate', d); }}
              onClose={() => setCalOpen(false)}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Calendar styles ───────────────────────────────────────────────────────────
const CAL = StyleSheet.create({
  wrap:        { backgroundColor: '#FFF', borderRadius: 20, padding: 20, width: width - 40, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 12 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  monthTitle:  { fontSize: 16, fontWeight: '700', color: '#111827' },
  weekRow:     { flexDirection: 'row', marginBottom: 8 },
  weekDay:     { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  grid:        { flexDirection: 'row', flexWrap: 'wrap' },
  cell:        { width: `${100/7}%` as any, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  cellSelected:{ backgroundColor: '#4F46E5', borderRadius: 100 },
  cellPast:    { opacity: 0.3 },
  dayTxt:      { fontSize: 14, fontWeight: '500', color: '#1F2937' },
  dayTxtSelected:{ color: '#FFF', fontWeight: '700' },
  dayTxtPast:  { color: '#D1D5DB' },
  cancelBtn:   { marginTop: 16, alignItems: 'center', paddingVertical: 12 },
  cancelTxt:   { fontSize: 15, fontWeight: '600', color: '#6B7280' },
});

// ─── Main styles ───────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  // Header
  fixedHdr:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  hdrTitle:    { fontSize: 16, fontWeight: '700', color: '#111827' },
  hdrSub:      { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  stepDots:    { flexDirection: 'row', gap: 5 },
  dot:         { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB' },
  dotActive:   { backgroundColor: '#C4B5FD' },
  dotCurrent:  { backgroundColor: '#4F46E5', width: 20, borderRadius: 4 },

  progressTrack: { height: 3, backgroundColor: '#E5E7EB' },
  progressFill:  { height: 3, backgroundColor: '#4F46E5' },

  scrollContent: { padding: 16 },

  // Thumbnail
  thumbBox:      { height: 180, borderRadius: 16, overflow: 'hidden', marginBottom: 20, backgroundColor: '#EEF2FF', borderWidth: 2, borderColor: '#C7D2FE', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  thumbImg:      { width: '100%', height: '100%' },
  thumbEmpty:    { alignItems: 'center', gap: 8 },
  thumbEmptyTxt: { fontSize: 15, fontWeight: '600', color: '#7C3AED' },
  thumbEmptyHint:{ fontSize: 12, color: '#A78BFA' },
  thumbEditBadge:{ position: 'absolute', bottom: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center' },

  // Fields
  field:     { marginBottom: 20 },
  label:     { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 6 },
  req:       { color: '#EF4444' },
  hint:      { fontSize: 12, color: '#6B7280', marginBottom: 8, lineHeight: 17 },
  optBadge:  { fontSize: 11, fontWeight: '500', color: '#9CA3AF', backgroundColor: '#F3F4F6', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 4 },

  input:     { backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#1F2937', lineHeight: 22 },
  inputErr:  { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  textArea:  { minHeight: 110, textAlignVertical: 'top', lineHeight: 22 },
  textAreaLg:{ minHeight: 180, textAlignVertical: 'top', lineHeight: 22 },

  errRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  errTxt:    { fontSize: 12, color: '#EF4444', fontWeight: '500' },

  // Chips
  chipRow:   { flexDirection: 'row', gap: 8 },
  chip:      { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: '#E5E7EB' },
  chipActive:{ backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
  chipErrBorder:{ borderColor: '#FCA5A5' },
  chipTxt:   { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  chipTxtActive:{ color: '#4F46E5', fontWeight: '700' },

  // Date button
  dateBtn:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, gap: 10 },
  dateBtnTxt:{ flex: 1, fontSize: 15, color: '#9CA3AF' },

  // Key phrases preview
  phrasesPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  phraseChip:     { backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  phraseTxt:      { fontSize: 12, color: '#4F46E5', fontStyle: 'italic' },

  // Section header
  sHdr:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20, backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderLeftWidth: 4, borderLeftColor: '#4F46E5' },
  sHdrIcon:  { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  sHdrTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sHdrSub:   { fontSize: 12, color: '#6B7280', marginTop: 2 },

  // Review step
  reviewRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB', gap: 10 },
  reviewIcon:     { width: 32, height: 32, borderRadius: 8, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  reviewLabel:    { fontSize: 13, color: '#6B7280', width: 90 },
  reviewVal:      { flex: 1, fontSize: 13, fontWeight: '600', color: '#1F2937', textAlign: 'right' },
  reviewSection:  { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, marginTop: 14 },
  reviewSectionTitle: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  reviewSectionTxt: { fontSize: 14, color: '#374151', lineHeight: 20 },
  reviewPhrase:   { fontSize: 13, color: '#4F46E5', marginBottom: 4 },

  nextStepsBox:  { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginTop: 20 },
  nextStepsTitle:{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 14 },
  nextStepRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  nextStepNum:   { width: 24, height: 24, borderRadius: 12, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  nextStepNumTxt:{ fontSize: 12, fontWeight: '700', color: '#4F46E5' },
  nextStepTxt:   { flex: 1, fontSize: 13, color: '#374151', lineHeight: 18 },

  // Actions
  actions:       { flexDirection: 'row', gap: 12, marginTop: 24 },
  backActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F3F4F6', borderRadius: 14, paddingVertical: 15, paddingHorizontal: 18 },
  backActionTxt: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  nextBtn:       { flex: 2, borderRadius: 14, overflow: 'hidden' },
  nextGrad:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  nextTxt:       { fontSize: 16, fontWeight: '700', color: '#FFF' },

  // Calendar
  calOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },

  // Success
  successWrap:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  successCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  successTitle:  { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 12, textAlign: 'center' },
  successSub:    { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  successInfo:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F5F3FF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 28 },
  successInfoTxt:{ fontSize: 13, color: '#5B21B6', fontWeight: '600' },
  successBtn:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#4F46E5', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 28, marginBottom: 12 },
  successBtnTxt: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  successBtnSecondary:    { paddingVertical: 12, paddingHorizontal: 20 },
  successBtnSecondaryTxt: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
});
