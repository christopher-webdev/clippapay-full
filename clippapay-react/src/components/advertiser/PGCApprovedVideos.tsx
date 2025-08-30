// src/components/advertiser/PGCApprovedVideos.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Download, Film, Loader2, AlertCircle, FolderOpen, Calendar, User } from 'lucide-react';

interface ApprovedVideo {
    _id: string;
    url: string;
    createdAt: string;
    status: 'approved';
    campaign: {
        _id: string;
        title: string;
    };
    clipper: {
        _id: string;
        firstName?: string;
        lastName?: string;
        email: string;
    };
}

interface CampaignVideos {
    campaignId: string;
    campaignTitle: string;
    videos: ApprovedVideo[];
}

export default function PGCApprovedVideos() {
    const [campaignVideos, setCampaignVideos] = useState<CampaignVideos[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchApprovedVideos();
    }, []);

    const fetchApprovedVideos = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get<ApprovedVideo[]>('/campaigns/pgc/approved-videos', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });

            // Group videos by campaign
            const groupedVideos: CampaignVideos[] = [];
            response.data.forEach(video => {
                const existingCampaign = groupedVideos.find(c => c.campaignId === video.campaign._id);
                if (existingCampaign) {
                    existingCampaign.videos.push(video);
                } else {
                    groupedVideos.push({
                        campaignId: video.campaign._id,
                        campaignTitle: video.campaign.title,
                        videos: [video]
                    });
                }
            });

            setCampaignVideos(groupedVideos);
        } catch (err: any) {
            console.error('Failed to fetch approved videos:', err);
            setError(err.response?.data?.error || 'Failed to load approved videos');
        } finally {
            setLoading(false);
        }
    };

    const getClipperName = (clipper: ApprovedVideo['clipper']) => {
        if (clipper.firstName && clipper.lastName) {
            return `${clipper.firstName} ${clipper.lastName}`;
        }
        return clipper.email;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getFileName = (campaignTitle: string, createdAt: string) => {
        return `${campaignTitle}-${new Date(createdAt).toISOString().split('T')[0]}.mp4`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin mr-2 h-6 w-6" />
                <span className="text-lg">Loading approved videos...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading videos</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={fetchApprovedVideos}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Approved PGC Videos</h1>
                <p className="text-gray-600">
                    Download your professionally created videos that have been approved by our team.
                    Videos are automatically deleted after 30 days.
                </p>
            </div>

            {campaignVideos.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-lg">
                    <FolderOpen className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No approved videos yet</h3>
                    <p className="text-gray-600">Your approved PGC videos will appear here once they're verified by our team.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {campaignVideos.map(campaign => (
                        <div key={campaign.campaignId} className="bg-white rounded-lg shadow-sm border">
                            <div className="px-6 py-4 border-b bg-gray-50">
                                <h2 className="text-xl font-semibold text-gray-900">{campaign.campaignTitle}</h2>
                                <p className="text-sm text-gray-600">
                                    {campaign.videos.length} approved video{campaign.videos.length !== 1 ? 's' : ''}
                                </p>
                            </div>

                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {campaign.videos.map(video => (
                                        <div key={video._id} className="border rounded-lg overflow-hidden bg-gray-50 hover:shadow-md transition-shadow">
                                            <div className="relative w-full aspect-video">
                                                <video
                                                    src={`${video.url}#t=5.5`} // Add slight offset to trigger preload
                                                    className="w-full h-full object-contain bg-black"
                                                    controls
                                                    controlsList="nodownload" // Prevent browser's right-click download
                                                    preload="auto"
                                                    type="video/mp4"
                                                    onError={(e) => {
                                                        console.error('Video load error:', {
                                                            url: video.url,
                                                            error: (e.target as HTMLVideoElement).error,
                                                        });
                                                        (e.target as HTMLVideoElement).poster = '/video-error-placeholder.png';
                                                    }}
                                                    onLoadedMetadata={(e) => {
                                                        console.log('Video metadata loaded:', {
                                                            url: video.url,
                                                            duration: (e.target as HTMLVideoElement).duration,
                                                        });
                                                    }}
                                                >
                                                    <source src={video.url} type="video/mp4" />
                                                    Your browser does not support the video tag.
                                                </video>
                                                <div className="absolute top-2 right-2">
                                                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                                        Approved
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="p-4">
                                                <div className="mb-3 space-y-2">
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <Calendar className="h-4 w-4 mr-1" />
                                                        {formatDate(video.createdAt)}
                                                    </div>
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <User className="h-4 w-4 mr-1" />
                                                        {getClipperName(video.clipper)}
                                                    </div>
                                                </div>

                                                <a
                                                    href={video.url}
                                                    download={getFileName(campaign.campaignTitle, video.createdAt)}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => {
                                                        console.log('Download initiated:', video.url);
                                                    }}
                                                >
                                                    <Download className="h-4 w-4" />
                                                    Download Video
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}