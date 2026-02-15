// app/components/applications/ApplicationWorkflow.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScriptReviewPanel } from './ScriptReviewPanel';
import { ApprovalPanel } from './ApprovalPanel';
import { RevisionPanel } from './RevisionPanel';
import { StatusBadge } from './StatusBadge';

interface Application {
  _id: string;
  campaign: {
    _id: string;
    title: string;
    kind: string;
    budget_total: number;
    desiredVideos: number;
    approvedVideosCount: number;
    pgcAddons?: string[];
    script?: string;
    thumb_url?: string;
    ugc?: {
      brief: string;
      deliverables: string[];
      assets: string[];
      approvalCriteria: string;
    };
  };
  clipper: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    profileImage?: string;
  };
  status: 'pending' | 'shortlisted' | 'offer_sent' | 'accepted' | 'rejected' | 'expired' | 'working' | 'submitted' | 'revision_requested' | 'approved' | 'completed' | 'cancelled';
  scriptStatus?: 'not_required' | 'pending_review' | 'changes_requested' | 'approved';
  scriptExpiresAt?: string;
  creatorScript?: string;
  scriptRevisions?: Array<{
    submittedAt: string;
    content: string;
    feedback?: string;
    status: string;
  }>;
  submissionVideo?: string;
  submissionFiles?: string[];
  submittedAt?: string;
  submissionDeadline?: string;
  revisions: Array<{
    requestedAt: string;
    notes: string;
    files?: string[];
    respondedAt?: string;
    responseNotes?: string;
  }>;
  revisionCount: number;
  maxRevisions: number;
  offerExpiresAt?: string;
  acceptedAt?: string;
  paidAt?: string;
  payoutAmount?: number;
}

interface ApplicationWorkflowProps {
  application: Application;
  userRole: 'advertiser' | 'clipper';
  onAction: (action: string, data?: any) => void;
  loading?: boolean;
}

export function ApplicationWorkflow({ application, userRole, onAction, loading }: ApplicationWorkflowProps) {
  const { status, scriptStatus, campaign } = application;
  const isAdvertiser = userRole === 'advertiser';
  const requiresScript = campaign.pgcAddons?.includes('script');

  // Render different panels based on status
  const renderWorkflowPanel = () => {
    // Script Phase (if required)
    if (requiresScript && scriptStatus && scriptStatus !== 'approved' && scriptStatus !== 'not_required') {
      return (
        <ScriptReviewPanel
          application={application}
          userRole={userRole}
          onAction={onAction}
          loading={loading}
        />
      );
    }

    // Main workflow based on status
    switch (status) {
      case 'pending':
      case 'shortlisted':
        return (
          <View style={styles.infoPanel}>
            <Text style={styles.infoTitle}>Application Pending Review</Text>
            <Text style={styles.infoText}>
              {isAdvertiser 
                ? 'Review this creator\'s profile and decide whether to shortlist or send an offer.'
                : 'Your application is being reviewed by the advertiser.'}
            </Text>
          </View>
        );

      case 'offer_sent':
        return (
          <View style={styles.infoPanel}>
            <Text style={styles.infoTitle}>Offer Sent</Text>
            {isAdvertiser ? (
              <Text style={styles.infoText}>
                Waiting for creator to accept your offer. They have until{' '}
                {new Date(application.offerExpiresAt!).toLocaleString()} to respond.
              </Text>
            ) : (
              <RevisionPanel
                type="offer"
                application={application}
                onAction={onAction}
                loading={loading}
              />
            )}
          </View>
        );

      case 'accepted':
        return (
          <View style={styles.infoPanel}>
            <Text style={styles.infoTitle}>Offer Accepted</Text>
            <Text style={styles.infoText}>
              {isAdvertiser
                ? 'The creator has accepted your offer. They will now work on the content.'
                : 'You have accepted the offer. Start working on the content.'}
            </Text>
          </View>
        );

      case 'working':
        return (
          <View style={styles.infoPanel}>
            <Text style={styles.infoTitle}>In Progress</Text>
            <Text style={styles.infoText}>
              {isAdvertiser
                ? 'The creator is working on your content.'
                : 'You are now working on this campaign. Submit your video when ready.'}
            </Text>
            {!isAdvertiser && application.submissionDeadline && (
              <View style={styles.deadlineWarning}>
                <Text style={styles.deadlineText}>
                  Deadline: {new Date(application.submissionDeadline).toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        );

      case 'submitted':
      case 'revision_requested':
        return (
          <ApprovalPanel
            application={application}
            userRole={userRole}
            onAction={onAction}
            loading={loading}
          />
        );

      case 'approved':
        return (
          <View style={[styles.infoPanel, styles.successPanel]}>
            <Text style={styles.successTitle}>Content Approved!</Text>
            <Text style={styles.successText}>
              {isAdvertiser
                ? 'You have approved this content. Payment will be processed.'
                : 'Your content has been approved! Payment is being processed.'}
            </Text>
          </View>
        );

      case 'completed':
        return (
          <View style={[styles.infoPanel, styles.successPanel]}>
            <Text style={styles.successTitle}>Completed</Text>
            <Text style={styles.successText}>
              This application is complete. Payment has been released.
              {application.paidAt && ` Paid on ${new Date(application.paidAt).toLocaleDateString()}`}
            </Text>
          </View>
        );

      case 'rejected':
      case 'cancelled':
        return (
          <View style={[styles.infoPanel, styles.rejectedPanel]}>
            <Text style={styles.rejectedTitle}>
              {status === 'rejected' ? 'Application Rejected' : 'Cancelled'}
            </Text>
            <Text style={styles.rejectedText}>
              {isAdvertiser
                ? 'This application has been rejected.'
                : 'Your application was not selected for this campaign.'}
            </Text>
          </View>
        );

      case 'expired':
        return (
          <View style={[styles.infoPanel, styles.rejectedPanel]}>
            <Text style={styles.rejectedTitle}>Expired</Text>
            <Text style={styles.rejectedText}>
              This offer has expired.
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <StatusBadge status={status} size="medium" />
        {requiresScript && scriptStatus && (
          <View style={styles.scriptBadge}>
            <Text style={styles.scriptBadgeText}>
              Script: {scriptStatus.replace('_', ' ')}
            </Text>
          </View>
        )}
      </View>

      {renderWorkflowPanel()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  scriptBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scriptBadgeText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  infoPanel: {
    backgroundColor: '#F9FAFB',
    padding: 20,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  deadlineWarning: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  deadlineText: {
    fontSize: 13,
    color: '#D97706',
    fontWeight: '500',
  },
  successPanel: {
    backgroundColor: '#DCFCE7',
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#047857',
  },
  rejectedPanel: {
    backgroundColor: '#FEE2E2',
  },
  rejectedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 8,
  },
  rejectedText: {
    fontSize: 14,
    color: '#B91C1C',
  },
});

export default ApplicationWorkflow;