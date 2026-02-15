// app/components/applications/ScriptReviewPanel.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ScriptReviewPanelProps {
  application: any;
  userRole: 'advertiser' | 'clipper';
  onAction: (action: string, data?: any) => void;
  loading?: boolean;
}

export function ScriptReviewPanel({ application, userRole, onAction, loading }: ScriptReviewPanelProps) {
  const [feedback, setFeedback] = useState('');
  const [scriptContent, setScriptContent] = useState('');
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  const { scriptStatus, scriptExpiresAt, creatorScript, scriptRevisions } = application;
  const isAdvertiser = userRole === 'advertiser';

  const handleSubmitScript = () => {
    if (!scriptContent.trim()) {
      Alert.alert('Error', 'Please enter your script');
      return;
    }
    onAction('submit_script', { content: scriptContent });
    setShowSubmitForm(false);
  };

  const handleApproveScript = () => {
    Alert.alert(
      'Approve Script',
      'Are you sure you want to approve this script? The creator can then start working.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => onAction('approve_script') }
      ]
    );
  };

  const handleRequestChanges = () => {
    if (!feedback.trim()) {
      Alert.alert('Error', 'Please provide feedback');
      return;
    }
    onAction('request_script_changes', { feedback });
    setShowFeedbackForm(false);
    setFeedback('');
  };

  const renderTimer = () => {
    if (!scriptExpiresAt) return null;
    
    const expiry = new Date(scriptExpiresAt).getTime();
    const now = new Date().getTime();
    const hoursLeft = Math.max(0, Math.floor((expiry - now) / (1000 * 60 * 60)));
    
    if (hoursLeft <= 0) return null;

    return (
      <View style={styles.timerContainer}>
        <Ionicons name="time-outline" size={16} color="#D97706" />
        <Text style={styles.timerText}>{hoursLeft}h remaining</Text>
      </View>
    );
  };

  const renderScriptContent = () => {
    if (!creatorScript) return null;

    return (
      <View style={styles.scriptContainer}>
        <Text style={styles.scriptLabel}>Submitted Script:</Text>
        <View style={styles.scriptContent}>
          <Text style={styles.scriptText}>{creatorScript}</Text>
        </View>
      </View>
    );
  };

  const renderRevisionHistory = () => {
    if (!scriptRevisions || scriptRevisions.length === 0) return null;

    return (
      <View style={styles.revisionContainer}>
        <Text style={styles.revisionTitle}>Revision History</Text>
        {scriptRevisions.map((rev: any, idx: number) => (
          <View key={idx} style={styles.revisionItem}>
            <View style={styles.revisionHeader}>
              <Ionicons name="document-text" size={14} color="#6B7280" />
              <Text style={styles.revisionDate}>
                {new Date(rev.submittedAt).toLocaleDateString()}
              </Text>
              <View style={[
                styles.revisionStatus,
                { backgroundColor: rev.status === 'approved' ? '#DCFCE7' : '#FEF3C7' }
              ]}>
                <Text style={[
                  styles.revisionStatusText,
                  { color: rev.status === 'approved' ? '#059669' : '#D97706' }
                ]}>
                  {rev.status.replace('_', ' ')}
                </Text>
              </View>
            </View>
            <Text style={styles.revisionContent} numberOfLines={2}>
              {rev.content}
            </Text>
            {rev.feedback && (
              <View style={styles.feedbackContainer}>
                <Text style={styles.feedbackLabel}>Feedback:</Text>
                <Text style={styles.feedbackText}>{rev.feedback}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  if (isAdvertiser) {
    return (
      <View style={styles.container}>
        {renderTimer()}
        {renderScriptContent()}
        {renderRevisionHistory()}

        {scriptStatus === 'pending_review' && (
          <View style={styles.actionContainer}>
            <Text style={styles.sectionTitle}>Review Script</Text>
            
            {!showFeedbackForm ? (
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.approveButton]}
                  onPress={handleApproveScript}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="#FFF" />
                      <Text style={styles.buttonText}>Approve</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.rejectButton]}
                  onPress={() => setShowFeedbackForm(true)}
                >
                  <Ionicons name="create" size={20} color="#FFF" />
                  <Text style={styles.buttonText}>Request Changes</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.feedbackForm}>
                <TextInput
                  style={styles.feedbackInput}
                  placeholder="Describe what changes are needed..."
                  value={feedback}
                  onChangeText={setFeedback}
                  multiline
                  numberOfLines={4}
                />
                <View style={styles.feedbackButtons}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => setShowFeedbackForm(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.submitButton]}
                    onPress={handleRequestChanges}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.buttonText}>Submit Feedback</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    );
  }

  // Clipper view
  return (
    <View style={styles.container}>
      {renderTimer()}
      {renderRevisionHistory()}

      {scriptStatus === 'changes_requested' && (
        <View style={styles.actionContainer}>
          <Text style={styles.sectionTitle}>Submit Revised Script</Text>
          
          {!showSubmitForm ? (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => setShowSubmitForm(true)}
            >
              <Ionicons name="create" size={20} color="#FFF" />
              <Text style={styles.buttonText}>Submit Script</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.submitForm}>
              <TextInput
                style={styles.scriptInput}
                placeholder="Enter your script here..."
                value={scriptContent}
                onChangeText={setScriptContent}
                multiline
                numberOfLines={6}
              />
              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setShowSubmitForm(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.submitButton]}
                  onPress={handleSubmitScript}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.buttonText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {scriptStatus === 'pending_review' && (
        <View style={styles.waitingContainer}>
          <Ionicons name="time" size={32} color="#9CA3AF" />
          <Text style={styles.waitingText}>Waiting for advertiser to review your script...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  timerText: {
    fontSize: 14,
    color: '#D97706',
    fontWeight: '500',
  },
  scriptContainer: {
    marginBottom: 16,
  },
  scriptLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  scriptContent: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  scriptText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  revisionContainer: {
    marginBottom: 16,
  },
  revisionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  revisionItem: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  revisionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  revisionDate: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  revisionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  revisionStatusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  revisionContent: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 8,
  },
  feedbackContainer: {
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 6,
  },
  feedbackLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
  rejectButton: {
    backgroundColor: '#DC2626',
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
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
  feedbackForm: {
    gap: 12,
  },
  feedbackInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  submitForm: {
    gap: 12,
  },
  scriptInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    minHeight: 150,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
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
  },
});

export default ScriptReviewPanel;