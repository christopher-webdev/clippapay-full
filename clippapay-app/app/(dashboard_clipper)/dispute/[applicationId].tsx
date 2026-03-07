// // app/(dashboard)/dispute/[applicationId].tsx
// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TextInput,
//   TouchableOpacity,
//   Image,
//   ActivityIndicator,
//   Alert,
//   StyleSheet,
//   SafeAreaView,
//   Linking,
// } from 'react-native';
// import { useLocalSearchParams, useRouter } from 'expo-router';
// import { Ionicons } from '@expo/vector-icons';
// import * as SecureStore from 'expo-secure-store';

// const API_URL = process.env.EXPO_PUBLIC_API_URL;

// export default function DisputeScreen() {
//   const { applicationId } = useLocalSearchParams<{ applicationId: string }>();
//   const router = useRouter();

//   const [application, setApplication] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [submitting, setSubmitting] = useState(false);

//   // Form fields for raising dispute
//   const [reason, setReason] = useState('');
//   const [evidenceLinks, setEvidenceLinks] = useState('');

//   const fetchApplication = async () => {
//     setLoading(true);
//     try {
//       const token = await SecureStore.getItemAsync('userToken');
//       if (!token) throw new Error('Not authenticated');

//       const res = await fetch(`${API_URL}/applications/${applicationId}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || 'Failed to load');

//       setApplication(data.application || data);

//       // Pre-fill reason if already raised
//       if (data.application.disputeReason) {
//         setReason(data.application.disputeReason);
//       }

//     } catch (err: any) {
//       Alert.alert('Error', err.message || 'Could not load application details');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (applicationId) fetchApplication();
//   }, [applicationId]);

//   const canRaiseDispute = () => {
//     if (!application) return false;
//     return (
//       (application.revisionCount >= 3 || application.status === 'expired') &&
//       !application.disputeRaised
//     );
//   };

//   const handleRaiseDispute = async () => {
//     if (!reason.trim()) {
//       Alert.alert('Required', 'Please provide a reason for the dispute.');
//       return;
//     }

//     setSubmitting(true);

//     try {
//       const token = await SecureStore.getItemAsync('userToken');

//       const links = evidenceLinks
//         .split('\n')
//         .map((l) => l.trim())
//         .filter(Boolean);

//       const res = await fetch(`${API_URL}/disputes/application/${applicationId}/raise`, {
//         method: 'POST',
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           reason: reason.trim(),
//           evidenceLinks: links.length > 0 ? links : undefined,
//         }),
//       });

//       const data = await res.json();

//       if (!res.ok) {
//         throw new Error(data.error || 'Failed to raise dispute');
//       }

//       Alert.alert(
//         'Dispute Raised',
//         'Your dispute has been submitted. An admin will review it soon.',
//         [{ text: 'OK', onPress: () => {
//           fetchApplication();
//           router.back();
//         } }]
//       );

//     } catch (err: any) {
//       Alert.alert('Error', err.message || 'Could not raise dispute');
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const openEvidenceLink = (url: string) => {
//     Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open link'));
//   };

//   if (loading) {
//     return (
//       <SafeAreaView style={styles.safeArea}>
//         <ActivityIndicator size="large" color="#6366f1" style={{ flex: 1 }} />
//       </SafeAreaView>
//     );
//   }

//   if (!application) {
//     return (
//       <SafeAreaView style={styles.safeArea}>
//         <View style={styles.center}>
//           <Text style={styles.errorText}>Application not found</Text>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   const isClipper = application.clipper?._id === /* your user ID from context */;
//   const isAdvertiser = application.campaign?.advertiser?._id === /* your user ID */;

//   return (
//     <SafeAreaView style={styles.safeArea}>
//       <ScrollView contentContainerStyle={styles.scrollContent}>
//         {/* Header */}
//         <View style={styles.header}>
//           <TouchableOpacity onPress={() => router.back()}>
//             <Ionicons name="arrow-back" size={24} color="#1e293b" />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Dispute</Text>
//           <View style={{ width: 24 }} />
//         </View>

//         {/* Status Banner */}
//         {application.disputeRaised ? (
//           <View style={styles.raisedBanner}>
//             <Ionicons name="alert-circle" size={24} color="#ef4444" />
//             <View style={styles.bannerContent}>
//               <Text style={styles.bannerTitle}>Dispute Raised</Text>
//               <Text style={styles.bannerStatus}>
//                 Status: In Review • Raised by {isClipper ? 'You (Clipper)' : 'Advertiser'}
//               </Text>
//               <Text style={styles.bannerDate}>
//                 {new Date(application.updatedAt).toLocaleString()}
//               </Text>
//             </View>
//           </View>
//         ) : (
//           <View style={styles.noDisputeBanner}>
//             <Text style={styles.bannerTitle}>No Dispute Raised Yet</Text>
//             <Text style={styles.bannerText}>
//               {canRaiseDispute()
//                 ? 'You can raise a dispute now (max 3 revisions reached or deadline missed).'
//                 : 'Dispute not available yet (need 3 revisions or missed deadline).'}
//             </Text>
//           </View>
//         )}

//         {/* Current Reason (if raised) */}
//         {application.disputeRaised && (
//           <View style={styles.infoCard}>
//             <Text style={styles.cardTitle}>Dispute Reason</Text>
//             <Text style={styles.reasonText}>{application.disputeReason || 'No reason provided'}</Text>

//             {application.disputeEvidence?.length > 0 && (
//               <>
//                 <Text style={styles.evidenceTitle}>Evidence Links</Text>
//                 {application.disputeEvidence.map((link: string, idx: number) => (
//                   <TouchableOpacity key={idx} onPress={() => openEvidenceLink(link)}>
//                     <Text style={styles.evidenceLink}>🔗 {link}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </>
//             )}
//           </View>
//         )}

//         {/* Raise Dispute Form */}
//         {canRaiseDispute() && !application.disputeRaised && (
//           <View style={styles.formCard}>
//             <Text style={styles.formTitle}>Raise a Dispute</Text>
//             <Text style={styles.formHelp}>
//               Explain why the submission or process is unfair. Provide as much detail as possible.
//             </Text>

//             <TextInput
//               style={styles.textArea}
//               placeholder="Describe your issue / reason for dispute..."
//               value={reason}
//               onChangeText={setReason}
//               multiline
//               numberOfLines={6}
//             />

//             <Text style={styles.inputLabel}>Evidence Links (optional – one per line)</Text>
//             <TextInput
//               style={[styles.textArea, { minHeight: 80 }]}
//               placeholder="https://example.com/proof1\nhttps://example.com/proof2"
//               value={evidenceLinks}
//               onChangeText={setEvidenceLinks}
//               multiline
//             />

//             <TouchableOpacity
//               style={[styles.submitButton, submitting && styles.disabled]}
//               onPress={handleRaiseDispute}
//               disabled={submitting || !reason.trim()}
//             >
//               {submitting ? (
//                 <ActivityIndicator color="#fff" />
//               ) : (
//                 <Text style={styles.submitText}>Raise Dispute</Text>
//               )}
//             </TouchableOpacity>

//             <Text style={styles.formNote}>
//               Once raised, an admin will review. You cannot edit or withdraw after submission.
//             </Text>
//           </View>
//         )}

//         {/* Already Resolved Message */}
//         {application.disputeRaised && application.status === 'disputed_resolved' && (
//           <View style={styles.resolvedBanner}>
//             <Ionicons name="checkmark-circle" size={32} color="#10b981" />
//             <Text style={styles.resolvedText}>Dispute Resolved by Admin</Text>
//           </View>
//         )}

//         <View style={{ height: 60 }} />
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   safeArea: { flex: 1, backgroundColor: '#f8fafc' },
//   scrollContent: { paddingBottom: 40 },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     padding: 20,
//     backgroundColor: '#fff',
//     borderBottomWidth: 1,
//     borderBottomColor: '#e5e7eb',
//   },
//   headerTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
//   raisedBanner: {
//     flexDirection: 'row',
//     backgroundColor: '#fee2e2',
//     margin: 20,
//     padding: 16,
//     borderRadius: 12,
//     alignItems: 'center',
//   },
//   bannerContent: { flex: 1, marginLeft: 12 },
//   bannerTitle: { fontSize: 16, fontWeight: '600', color: '#991b1b' },
//   bannerStatus: { fontSize: 14, color: '#7f1d1d', marginTop: 4 },
//   bannerDate: { fontSize: 13, color: '#991b1b', marginTop: 4 },
//   noDisputeBanner: {
//     backgroundColor: '#f3f4f6',
//     margin: 20,
//     padding: 20,
//     borderRadius: 12,
//     alignItems: 'center',
//   },
//   bannerText: { fontSize: 15, color: '#4b5563', textAlign: 'center', marginTop: 8 },
//   infoCard: {
//     backgroundColor: '#fff',
//     marginHorizontal: 20,
//     padding: 20,
//     borderRadius: 16,
//     borderWidth: 1,
//     borderColor: '#e5e7eb',
//     marginBottom: 20,
//   },
//   cardTitle: { fontSize: 17, fontWeight: '600', marginBottom: 8 },
//   reasonText: { fontSize: 15, lineHeight: 22, color: '#374151' },
//   evidenceTitle: { fontSize: 15, fontWeight: '600', marginTop: 16, marginBottom: 8 },
//   evidenceLink: { color: '#3b82f6', textDecorationLine: 'underline', marginBottom: 6 },
//   formCard: {
//     backgroundColor: '#fff',
//     marginHorizontal: 20,
//     padding: 20,
//     borderRadius: 16,
//     borderWidth: 1,
//     borderColor: '#e5e7eb',
//   },
//   formTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
//   formHelp: { fontSize: 14, color: '#64748b', marginBottom: 16 },
//   inputLabel: { fontSize: 15, fontWeight: '600', marginTop: 16, marginBottom: 6 },
//   textArea: {
//     borderWidth: 1,
//     borderColor: '#e2e8f0',
//     borderRadius: 12,
//     padding: 14,
//     fontSize: 16,
//     minHeight: 120,
//     textAlignVertical: 'top',
//     backgroundColor: '#f8fafc',
//   },
//   submitButton: {
//     backgroundColor: '#ef4444',
//     paddingVertical: 16,
//     borderRadius: 12,
//     alignItems: 'center',
//     marginTop: 24,
//   },
//   disabled: { opacity: 0.6 },
//   submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
//   formNote: { fontSize: 13, color: '#64748b', marginTop: 12, textAlign: 'center' },
//   resolvedBanner: {
//     backgroundColor: '#d1fae5',
//     margin: 20,
//     padding: 20,
//     borderRadius: 12,
//     alignItems: 'center',
//     flexDirection: 'row',
//     justifyContent: 'center',
//     gap: 12,
//   },
//   resolvedText: { fontSize: 17, fontWeight: '600', color: '#065f46' },
//   center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
//   errorText: { fontSize: 18, color: '#ef4444', textAlign: 'center' },
// });