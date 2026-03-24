import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, Linking,
} from 'react-native';
import SettingsLayout from '../SettingsLayout';

export default function DataDeletion() {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!email.trim()) {
      Alert.alert('Required', 'Please enter your registered email address.');
      return;
    }
    // In production: POST to your API endpoint
    const subject = encodeURIComponent('Data Deletion Request - ClippaPay');
    const body = encodeURIComponent(
      `Email: ${email}\nReason: ${reason || 'Not specified'}\n\nI request the deletion of all personal data associated with this account.`
    );
    Linking.openURL(`mailto:reach@clippapay.com?subject=${subject}&body=${body}`);
    setSubmitted(true);
  };

  return (
    <SettingsLayout title="Data Deletion Request">
      <Text style={S.intro}>
        Under the Nigeria Data Protection Act 2023 (NDPA), you have the right to request deletion
        of all personal data we hold about you. Submitting this request will initiate account closure
        and permanent data removal.
      </Text>
      <View style={S.warningBox}>
        <Text style={S.warningTitle}>⚠️ Important — Please Read</Text>
        <Text style={S.warningText}>
          Deleting your data is irreversible. You will lose:{'\n'}
          • Your account and profile{'\n'}
          • All campaign history and earnings records{'\n'}
          • Any pending payouts (ensure all payouts are settled first){'\n'}
          • Access to the ClippaPay platform
        </Text>
      </View>

      {!submitted ? (
        <>
          <Text style={S.label}>Registered Email Address *</Text>
          <TextInput
            style={S.input}
            placeholder="your@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={S.label}>Reason for deletion (optional)</Text>
          <TextInput
            style={[S.input, S.textarea]}
            placeholder="Tell us why you're leaving..."
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={4}
          />
          <TouchableOpacity style={S.btn} onPress={handleSubmit} activeOpacity={0.8}>
            <Text style={S.btnText}>Submit Deletion Request</Text>
          </TouchableOpacity>
          <Text style={S.alt}>
            Alternatively, email us directly at:{'\n'}
            <Text style={S.link} onPress={() => Linking.openURL('mailto:reach@clippapay.com')}>
              privacy@clippapay.com
            </Text>
          </Text>
        </>
      ) : (
        <View style={S.successBox}>
          <Text style={S.successTitle}>Request Received</Text>
          <Text style={S.successText}>
            Your data deletion request has been submitted. We will process it within 30 days and
            send confirmation to your email. If you have any urgent queries, contact privacy@clippapay.com.
          </Text>
        </View>
      )}
    </SettingsLayout>
  );
}

const S = StyleSheet.create({
  intro: { fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 20 },
  warningBox: { backgroundColor: '#FFFBEB', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#FDE68A', marginBottom: 24 },
  warningTitle: { fontSize: 14, fontWeight: '700', color: '#92400E', marginBottom: 8 },
  warningText: { fontSize: 13, color: '#92400E', lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#0F0F1A', marginBottom: 16 },
  textarea: { height: 100, textAlignVertical: 'top' },
  btn: { backgroundColor: '#EF4444', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  alt: { marginTop: 20, textAlign: 'center', fontSize: 13, color: '#6B7280', lineHeight: 20 },
  link: { color: '#6366F1', fontWeight: '600' },
  successBox: { backgroundColor: '#ECFDF5', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#A7F3D0' },
  successTitle: { fontSize: 16, fontWeight: '700', color: '#065F46', marginBottom: 8 },
  successText: { fontSize: 14, color: '#065F46', lineHeight: 22 },
});
