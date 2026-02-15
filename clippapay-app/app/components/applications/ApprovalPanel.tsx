// app/components/applications/ApprovalPanel.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ApprovalPanelProps {
  application: any;
  userRole: 'advertiser' | 'clipper';
  onAction: (action: string, data?: any) => void;
  loading?: boolean;
}

export function ApprovalPanel({ application, userRole, onAction, loading }: ApprovalPanelProps) {
  const [revisionNotes, setRevisionNotes] = useState('');
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const { submissionVideo, submissionFiles, submissionUrl, revisionCount, maxRevisions, revisions } = application;
  const isAdvertiser = userRole === 'advertiser';
  const canRequestRevision = revisionCount < maxRevisions;

  const handleApprove = () => {
    Alert.alert(
      'Approve Content',
      'Once approved, the creator will be paid. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve & Pay', onPress: () => onAction('approve') }
      ]
    );
  };

  const handleRequestRevision = () => {
    if (!revisionNotes.trim()) {
      Alert.alert('Error', 'Please provide revision notes');
      return;
    }
    onAction('request_revision', { notes: revisionNotes });
    setShowRevisionForm(false);
    setRevisionNotes('');
  };

  const renderVideoPlayer = () => {
    if (!submissionVideo) return null;

    return (
      <TouchableOpacity style={styles.videoContainer}>
        <View style={styles.videoPlaceholder}>
          <Ionicons name="play-circle" size={64} color="#4F46E5" />
          <Text style={styles.videoText}>Tap to play video</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSubmissionUrl = () => {
    if (!submissionUrl) return null;

    return (
      <View style={styles.urlContainer}>
        <Text style={styles.urlLabel}>Post URL:</Text>
        <TouchableOpacity onPress={() => {/* Open URL */}}>
          <Text style={styles.urlText} numberOfLines={1}>
            {submissionUrl}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFiles = () => {
    if (!submissionFiles || submissionFiles.length === 0) return null;

    return (
      <View style={styles.filesContainer}>
        <Text style={styles.filesLabel}>Additional Files:</Text>
        {submissionFiles.map((file: string, idx: number) => (
          <TouchableOpacity key={idx} style={styles.fileItem}>
            <Ionicons name="document-outline" size={20} color="#6B7280" />
            <Text style={styles.fileName} numberOfLines={1}>
              {file.split('/').pop()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderRevisionHistory = () => {
    if (!revisions || revisions.length === 0) return null;

    return (
      <View style={styles.revisionHistory}>
        <Text style={styles.revisionHistoryTitle}>Revision History</Text>
        {revisions.map((rev: any, idx: number) => (
          <View key={idx} style={styles.revisionItem}>
            <View style={styles.revisionHeader}>
              <Ionicons name="create-outline" size={14} color="#D97706" />
              <Text style={styles.revisionDate}>
                {new Date(rev.requestedAt).toLocaleDateString()}
              </Text>
            </View>
            <Text style={styles.revisionNotes}>{rev.notes}</Text>
            {rev.responseNotes && (
              <View style={styles.responseContainer}>
                <Text style={styles.responseLabel}>Creator response:</Text>
                <Text style={styles.responseText}>{rev.responseNotes}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  if (isAdvertiser) {
    return (
      <ScrollView style={styles.container}>
        {renderVideoPlayer()}
        {renderSubmissionUrl()}
        {renderFiles()}
        {renderRevisionHistory()}

        <View style={styles.actionContainer}>
          <Text style={styles.sectionTitle}>Review Content</Text>
          
          {!showRevisionForm ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.approveButton]}
                onPress={handleApprove}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    <Text style={styles.buttonText}>Approve & Pay</Text>
                  </>
                )}
              </TouchableOpacity>

              {canRequestRevision && (
                <TouchableOpacity
                  style={[styles.button, styles.revisionButton]}
                  onPress={() => setShowRevisionForm(true)}
                >
                  <Ionicons name="create" size={20} color="#FFF" />
                  <Text style={styles.buttonText}>
                    Request Revision ({revisionCount}/{maxRevisions})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.revisionForm}>
              <TextInput
                style={styles.revisionInput}
                placeholder="Describe what changes are needed..."
                value={revisionNotes}
                onChangeText={setRevisionNotes}
                multiline
                numberOfLines={4}
              />
              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setShowRevisionForm(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.submitButton]}
                  onPress={handleRequestRevision}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.buttonText}>Request Revision</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  // Clipper view
  return (
    <ScrollView style={styles.container}>
      {renderVideoPlayer()}
      {renderSubmissionUrl()}
      {renderFiles()}
      {renderRevisionHistory()}

      {application.status === 'revision_requested' && (
        <View style={styles.revisionNotice}>
          <Ionicons name="alert-circle" size={24} color="#D97706" />
          <Text style={styles.revisionNoticeText}>
            The advertiser has requested changes. Please review their feedback and submit a revised version.
          </Text>
        </View>
      )}

      {application.status === 'submitted' && (
        <View style={styles.waitingContainer}>
          <Ionicons name="time" size={32} color="#9CA3AF" />
          <Text style={styles.waitingText}>
            Your content is under review. You'll be notified when the advertiser responds.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  videoContainer: {
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  videoPlaceholder: {
    aspectRatio: 16 / 9,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  videoText: {
    marginTop: 8,
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '500',
  },
  urlContainer: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  urlLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  urlText: {
    fontSize: 14,
    color: '#4F46E5',
    textDecorationLine: 'underline',
  },
  filesContainer: {
    marginBottom: 16,
  },
  filesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 6,
    marginBottom: 4,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  fileName: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
  },
  revisionHistory: {
    marginBottom: 16,
  },
  revisionHistoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  revisionItem: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  revisionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  revisionDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  revisionNotes: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 8,
  },
  responseContainer: {
    backgroundColor: '#EEF2FF',
    padding: 8,
    borderRadius: 6,
  },
  responseLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4F46E5',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 12,
    color: '#4B5563',
  },
  actionContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    flex: 1,
  },
  approveButton: {
    backgroundColor: '#059669',
  },
  revisionButton: {
    backgroundColor: '#F59E0B',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#4F46E5',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  revisionForm: {
    gap: 12,
  },
  revisionInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  revisionNotice: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
    alignItems: 'center',
  },
  revisionNoticeText: {
    flex: 1,
    fontSize: 14,
    color: '#D97706',
    lineHeight: 20,
  },
  waitingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    gap: 12,
  },
  waitingText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ApprovalPanel;