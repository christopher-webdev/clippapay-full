import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { StatusBadge } from './StatusBadge';
import { AddonBadge } from './AddonBadge';

const { width } = Dimensions.get('window');

const API_BASE = 'https://clippapay.com/api';
const UPLOAD_BASE = 'https://clippapay.com'; // 🔥 IMPORTANT FIX

interface Application {
  _id: string;
  campaign: {
    _id: string;
    title?: string;
    kind?: string;
    budget_total?: number;
    desiredVideos?: number;
    approvedVideosCount?: number;
    pgcAddons?: string[];
    thumb_url?: string;
  };
  clipper: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    clipperProfile?: {
      profileImage?: string;
    };
  };
  status: string;
  offerExpiresAt?: string;
  createdAt: string;
  revisionCount: number;
  maxRevisions: number;
}

interface ApplicationCardProps {
  application: Application;
  onPress: () => void;
  onShortlist?: () => void;
  onSendOffer?: () => void;
  showActions?: boolean;
}

export function ApplicationCard({
  application,
  onPress,
  onShortlist,
  onSendOffer,
  showActions = true,
}: ApplicationCardProps) {
  const campaign = application.campaign || {};
  const clipper = application.clipper || {};

  const hasOffer = application.status === 'offer_sent';
  const hasSubmitted =
    application.status === 'submitted' ||
    application.status === 'revision_requested';

  // ✅ Safe currency
  const formatCurrency = (amount?: number | null) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '₦0';
    return `₦${amount.toLocaleString()}`;
  };

  const creatorInitials = `${clipper.firstName?.[0] || ''}${
    clipper.lastName?.[0] || ''
  }`;

  const profileImage =
    clipper?.clipperProfile?.profileImage;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient colors={['#FFFFFF', '#F9FAFB']} style={styles.cardGradient}>
        
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <StatusBadge status={application.status} />

            {application.offerExpiresAt &&
              application.status === 'offer_sent' && (
                <View style={styles.expiryBadge}>
                  <Ionicons name="time-outline" size={12} color="#D97706" />
                  <Text style={styles.expiryText}>
                    Expires{' '}
                    {formatDistanceToNow(
                      new Date(application.offerExpiresAt),
                      { addSuffix: true }
                    )}
                  </Text>
                </View>
              )}
          </View>

          <Text style={styles.dateText}>
            {formatDistanceToNow(new Date(application.createdAt), {
              addSuffix: true,
            })}
          </Text>
        </View>

        {/* Campaign */}
        <View style={styles.campaignInfo}>
          <View style={styles.campaignTitleContainer}>
            {campaign.thumb_url ? (
              <Image
                source={{ uri: `${UPLOAD_BASE}${campaign.thumb_url}` }} // ✅ FIXED
                style={styles.campaignThumb}
              />
            ) : (
              <View style={styles.campaignThumbPlaceholder}>
                <Ionicons name="megaphone" size={20} color="#4F46E5" />
              </View>
            )}

            <Text style={styles.campaignTitle} numberOfLines={2}>
              {campaign.title || 'Untitled Campaign'}
            </Text>
          </View>

          {campaign.pgcAddons?.length ? (
            <View style={styles.addonsContainer}>
              {campaign.pgcAddons.map((addon, index) => (
                <AddonBadge key={index} addonId={addon} />
              ))}
            </View>
          ) : null}
        </View>

        {/* Creator */}
        <View style={styles.creatorInfo}>
          <View style={styles.creatorAvatar}>
            {profileImage ? (
              <Image
                source={{ uri: `${UPLOAD_BASE}${profileImage}` }} // ✅ FIXED
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{creatorInitials}</Text>
              </View>
            )}
          </View>

          <View style={styles.creatorDetails}>
            <Text style={styles.creatorName}>
              {clipper.firstName} {clipper.lastName}
            </Text>
            <Text style={styles.creatorEmail} numberOfLines={1}>
              {clipper.email}
            </Text>
          </View>

          {/* Budget */}
          <View style={styles.budgetContainer}>
            <Ionicons name="wallet-outline" size={14} color="#059669" />
            <Text style={styles.budgetText}>
              {formatCurrency(campaign.budget_total ?? 0)}
            </Text>
          </View>
        </View>

        {/* Offer Info */}
        {hasOffer && (
          <View style={styles.offerInfo}>
            <Ionicons name="information-circle" size={16} color="#2563EB" />
            <Text style={styles.offerInfoText}>
              Waiting for creator to accept offer
            </Text>
          </View>
        )}

        {/* Submission Info */}
        {hasSubmitted && (
          <View style={styles.submissionInfo}>
            <View style={styles.revisionCounter}>
              <Text style={styles.revisionText}>
                Revision {application.revisionCount}/{application.maxRevisions}
              </Text>
            </View>
            <View style={styles.reviewBadge}>
              <Ionicons name="eye-outline" size={14} color="#4F46E5" />
              <Text style={styles.reviewBadgeText}>Ready to Review</Text>
            </View>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardGradient: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  expiryText: {
    fontSize: 10,
    color: '#D97706',
    fontWeight: '500',
  },
  dateText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  campaignInfo: {
    marginBottom: 12,
  },
  campaignTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  campaignThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  campaignThumbPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  campaignTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  addonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  creatorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  creatorDetails: {
    flex: 1,
  },
  creatorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  creatorEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  budgetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  budgetText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '700',
  },
  offerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  offerInfoText: {
    fontSize: 13,
    color: '#2563EB',
    flex: 1,
  },
  submissionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  revisionCounter: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  revisionText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  reviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  reviewBadgeText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '600',
  },
});

export default ApplicationCard;
