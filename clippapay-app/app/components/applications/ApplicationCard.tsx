// app/components/applications/ApplicationCard.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { StatusBadge } from './StatusBadge';
import { AddonBadge } from './AddonBadge';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const API_BASE = 'https://clippapay.com/api';
const MEDIA_BASE = 'https://clippapay.com';

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
    profileImage?: string;
  };
  status: 'pending' | 'shortlisted' | 'offer_sent' | 'accepted' | 'rejected' | 'expired' | 'working' | 'submitted' | 'revision_requested' | 'approved' | 'completed' | 'cancelled';
  offerExpiresAt?: string;
  createdAt: string;
  revisionCount: number;
  maxRevisions: number;
}

interface ApplicationCardProps {
  application: Application;
  onPress: () => void;
  onShortlist?: () => void;
  onUnshortlist?: () => void; // New prop for unshortlisting
  onSendOffer?: () => void;
  showActions?: boolean;
}

export function ApplicationCard({
  application,
  onPress,
  onShortlist,
  onUnshortlist,
  onSendOffer,
  showActions = true
}: ApplicationCardProps) {
  const router = useRouter();
  const [isShortlisting, setIsShortlisting] = useState(false);
  
  const campaign = application.campaign;
  const clipper = application.clipper;
  const hasOffer = application.status === 'offer_sent';
  const hasSubmitted = application.status === 'submitted' || application.status === 'revision_requested';
  const isShortlisted = application.status === 'shortlisted';

  const formatCurrency = (amount?: number | null) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '₦0';
    }
    return `₦${amount.toLocaleString()}`;
  };

  const getMediaUrl = (path?: string) => {
    if (!path) return undefined;
    if (path.startsWith('http')) return path;
    return `${MEDIA_BASE}${path}`;
  };

  const handleViewCreatorProfile = () => {
    router.push({
      pathname: '/(dashboard_advertiser)/creator/[id]',
      params: { id: clipper._id }
    });
  };

  const handleShortlistPress = async () => {
    if (isShortlisted && onUnshortlist) {
      Alert.alert(
        'Remove from Shortlist',
        'Are you sure you want to remove this creator from your shortlist?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              setIsShortlisting(true);
              try {
                await onUnshortlist();
              } finally {
                setIsShortlisting(false);
              }
            }
          }
        ]
      );
    } else if (onShortlist) {
      setIsShortlisting(true);
      try {
        await onShortlist();
      } finally {
        setIsShortlisting(false);
      }
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <LinearGradient colors={['#FFFFFF', '#F9FAFB']} style={styles.cardGradient}>
        {/* Header with status */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <StatusBadge status={application.status} />
            
            {application.offerExpiresAt && application.status === 'offer_sent' && (
              <View style={styles.expiryBadge}>
                <Ionicons name="time-outline" size={12} color="#D97706" />
                <Text style={styles.expiryText}>
                  Expires {formatDistanceToNow(new Date(application.offerExpiresAt), { addSuffix: true })}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.dateText}>
            {formatDistanceToNow(new Date(application.createdAt), { addSuffix: true })}
          </Text>
        </View>

        {/* Campaign Info with Thumbnail */}
        <View style={styles.campaignInfo}>
          <View style={styles.campaignTitleContainer}>
            {campaign.thumb_url ? (
              <Image 
                source={{ uri: getMediaUrl(campaign.thumb_url) }} 
                style={styles.campaignThumb}
              />
            ) : (
              <View style={styles.campaignThumbPlaceholder}>
                <Ionicons name="megaphone" size={20} color="#4F46E5" />
              </View>
            )}
            <Text style={styles.campaignTitle} numberOfLines={2}>
              {campaign.title}
            </Text>
          </View>
          
          {/* Add-ons badges */}
          {campaign.pgcAddons && campaign.pgcAddons.length > 0 && (
            <View style={styles.addonsContainer}>
              {campaign.pgcAddons.map((addon, index) => (
                <AddonBadge key={index} addonId={addon} />
              ))}
            </View>
          )}
        </View>

        {/* Creator Info - Now clickable */}
        <TouchableOpacity 
          style={styles.creatorInfo}
          onPress={handleViewCreatorProfile}
          activeOpacity={0.7}
        >
          <View style={styles.creatorAvatar}>
            {clipper.profileImage ? (
              <Image 
                source={{ uri: getMediaUrl(clipper.profileImage) }} 
                style={styles.avatarImage} 
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {clipper.firstName?.[0]}{clipper.lastName?.[0]}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.creatorDetails}>
            <View style={styles.creatorNameRow}>
              <Text style={styles.creatorName}>
                {clipper.firstName} {clipper.lastName}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </View>
            <Text style={styles.creatorEmail} numberOfLines={1}>
              {clipper.email}
            </Text>
          </View>

          {/* Budget Display */}
          <View style={styles.budgetContainer}>
            <Ionicons name="wallet-outline" size={14} color="#059669" />
            <Text style={styles.budgetText}>
              {formatCurrency(campaign.budget_total)}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Progress/Status specific info */}
        {hasOffer && (
          <View style={styles.offerInfo}>
            <Ionicons name="information-circle" size={16} color="#2563EB" />
            <Text style={styles.offerInfoText}>
              Waiting for creator to accept offer
            </Text>
          </View>
        )}

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

        {/* Action Buttons */}
        {showActions && application.status === 'pending' && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.shortlistButton]}
              onPress={handleShortlistPress}
              disabled={isShortlisting}
            >
              {isShortlisting ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <>
                  <Ionicons name="star-outline" size={16} color="#2563EB" />
                  <Text style={styles.shortlistText}>Shortlist</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.offerButton]}
              onPress={onSendOffer}
            >
              <LinearGradient
                colors={['#22C55E', '#16A34A']}
                style={styles.offerButtonGradient}
              >
                <Text style={styles.offerButtonText}>Offer This Job</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {showActions && application.status === 'shortlisted' && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.unshortlistButton]}
              onPress={handleShortlistPress}
              disabled={isShortlisting}
            >
              {isShortlisting ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <>
                  <Ionicons name="star" size={16} color="#DC2626" />
                  <Text style={styles.unshortlistText}>Shortlisted</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.offerButton]}
              onPress={onSendOffer}
            >
              <LinearGradient
                colors={['#22C55E', '#16A34A']}
                style={styles.offerButtonGradient}
              >
                <Text style={styles.offerButtonText}>Offer This Job</Text>
              </LinearGradient>
            </TouchableOpacity>
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
  creatorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    marginTop: 8,
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
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortlistButton: {
    backgroundColor: '#EEF2FF',
    flexDirection: 'row',
    gap: 6,
  },
  shortlistText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  unshortlistButton: {
    backgroundColor: '#FEE2E2',
    flexDirection: 'row',
    gap: 6,
  },
  unshortlistText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  offerButton: {
    overflow: 'hidden',
  },
  offerButtonGradient: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  fullWidthButton: {
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  sendOfferFullButton: {
    backgroundColor: '#22C55E',
  },
  sendOfferFullText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ApplicationCard;