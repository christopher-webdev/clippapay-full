// File: src/pages/CreateAssetCreationCampaign.tsx
import React, { useEffect, useMemo, useState, ChangeEvent, FormEvent } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2, Paperclip, X, Info, AlertCircle, Check } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const ASSET_CREATION_COST_PER_VIDEO = 7500; // ₦ per approved video
const MIN_VIDEOS = 1;
const MAX_VIDEOS = 50;

const categoryOptions = [
    'Fashion', 'Science & Tech', 'Gaming', 'Food', 'Travel', 'TV/Movies & Entertainment',
    'Sports', 'Education', 'Politics', 'Religion', 'Business & Investment', 'Health & Fitness',
    'Lifestyle', 'News & Media', 'Real Estate', 'Pets & Animals', 'Agriculture',
    'Music', 'Comedy', 'DIY & Crafts', 'Other',
];

type AssetCreationForm = {
    title: string;
    budget: number;
    desiredVideos: number;
    hashtags: string;
    directions: string;
    categories: string[];
    brief: string;
    deliverables: string;
    captionTemplate: string;
    usageRights: string;
    approvalCriteria: string;
    assets: File[];
    cta_url?: string;
};

const initialForm: AssetCreationForm = {
    title: '',
    budget: 0,
    desiredVideos: 1,
    hashtags: '',
    directions: '',
    categories: [],
    brief: '',
    deliverables: '',
    captionTemplate: '',
    usageRights: 'Brand may use and repost creator content on brand social channels and marketing materials.',
    approvalCriteria: '',
    assets: [],
    cta_url: '',
};

export default function CreateAssetCreationCampaign() {
    const [form, setForm] = useState<AssetCreationForm>(initialForm);
    const [walletBalance, setWalletBalance] = useState(0);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [uploadingAssets, setUploadingAssets] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        axios.get<{ balance: number }>(`${API_BASE}/wallet`)
            .then(r => setWalletBalance(r.data.balance))
            .catch(() => { });
    }, []);

    const estimatedCost = useMemo(
        () => form.desiredVideos * ASSET_CREATION_COST_PER_VIDEO,
        [form.desiredVideos]
    );

    function onChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        const t = e.target as HTMLInputElement;
        const { name, value, type, checked } = t;

        if (type === 'checkbox') {
            if (name === 'categories') {
                setForm(f => ({
                    ...f,
                    [name]: checked
                        ? [...(f as any)[name], value]
                        : (f as any)[name].filter((v: string) => v !== value)
                }));
            }
            return;
        }

        setForm(f => ({ ...f, [name]: type === 'number' ? Number(value) : value }));
    }

    function onAssets(e: ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files || []);
        setForm(f => ({ ...f, assets: [...f.assets, ...files] }));
        e.target.value = '';
    }

    function removeAsset(idx: number) {
        setForm(f => ({ ...f, assets: f.assets.filter((_, i) => i !== idx) }));
    }

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null); setMessage(null);

        if (!form.title) return setError('Please provide a campaign title.');
        if (form.desiredVideos < MIN_VIDEOS || form.desiredVideos > MAX_VIDEOS) {
            return setError(`Desired videos must be between ${MIN_VIDEOS} and ${MAX_VIDEOS}.`);
        }
        if (form.budget < estimatedCost) return setError(`Budget must be at least ₦${estimatedCost} for ${form.desiredVideos} videos.`);
        if (form.budget > walletBalance) return setError('Budget exceeds wallet balance.');
        if (!form.brief) return setError('Please provide a creative brief.');

        try {
            setLoading(true);
            const fd = new FormData();

            // Required basics
            fd.append('title', form.title);
            fd.append('budget', String(form.budget));
            fd.append('kind', 'asset_creation');
            fd.append('desiredVideos', String(form.desiredVideos));

            // Guidelines
            fd.append('hashtags', JSON.stringify(form.hashtags.split(',').map(s => s.trim()).filter(Boolean)));
            fd.append('directions', JSON.stringify(form.directions.split('\n').map(s => s.trim()).filter(Boolean)));
            fd.append('categories', JSON.stringify(form.categories));
            if (form.cta_url) fd.append('cta_url', form.cta_url);

            // UGC-like meta (adapted for assets)
            fd.append('brief', form.brief);
            fd.append('deliverables', JSON.stringify(
                form.deliverables
                    .split(/\n|,/)
                    .map(s => s.trim())
                    .filter(Boolean)
            ));
            fd.append('captionTemplate', form.captionTemplate);
            fd.append('usageRights', form.usageRights);
            fd.append('approvalCriteria', form.approvalCriteria);
            fd.append('draftRequired', 'true'); // Always true for this type

            // Upload assets if any
            setUploadingAssets(true);
            form.assets.forEach(f => fd.append('assets', f));

            const { data } = await axios.post(`${API_BASE}/campaigns/pgc`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setMessage('Campaign created successfully!');
            setTimeout(() => navigate('/dashboard/advertiser/campaigns'), 2000);
        } catch (err: any) {
            console.error('Asset Creation submit error:', err);
            setError(err.response?.data?.error || 'Failed to create campaign. Please try again.');
        } finally {
            setUploadingAssets(false);
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-6xl mx-auto px-4">
                <div className="bg-white rounded-xl shadow-sm border">
                    <div className="bg-gradient-to-r from-green-600 to-green-800 px-6 py-8 text-white rounded-t-xl relative">
                        {/* Close button added here */}
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard/advertiser/campaigns')}
                            aria-label="Close form"
                            className="absolute top-4 right-4 z-10 rounded-md border bg-white/60 px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-white"
                        >
                            ✕
                        </button>

                        <h1 className="text-3xl font-bold">Create Asset Creation Campaign</h1>
                        <p className="mt-2 text-lg">Get custom videos from creators for your own use. ₦7,500 per approved video.</p>
                        <div className="mt-3 flex items-start gap-2 bg-green-700/50 rounded-lg p-3">
                            <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            <p className="text-sm">Creators submit videos privately. You or an admin approve them, then receive the files to post yourself.</p>
                        </div>
                    </div>

                    <form onSubmit={onSubmit} className="px-6 py-8 space-y-10">
                        {/* Campaign Basics */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold">Basics</h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Campaign Title</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={form.title}
                                    onChange={onChange}
                                    required
                                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Desired Number of Videos</label>
                                <input
                                    type="number"
                                    name="desiredVideos"
                                    value={form.desiredVideos}
                                    onChange={onChange}
                                    min={MIN_VIDEOS}
                                    max={MAX_VIDEOS}
                                    required
                                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                                <p className="mt-1 text-sm text-gray-500">Between {MIN_VIDEOS} and {MAX_VIDEOS}. Creators will see this as your target.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Budget</label>
                                <input
                                    type="number"
                                    name="budget"
                                    value={form.budget}
                                    onChange={onChange}
                                    min={estimatedCost}
                                    step={ASSET_CREATION_COST_PER_VIDEO}
                                    required
                                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                                <p className="mt-1 text-sm text-gray-500">Minimum ₦{estimatedCost} for {form.desiredVideos} videos (₦{ASSET_CREATION_COST_PER_VIDEO} each). Your wallet balance: ₦{walletBalance}.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Primary CTA URL <span className="text-gray-400 text-xs">(optional)</span></label>
                                <input
                                    type="url"
                                    name="cta_url"
                                    value={form.cta_url}
                                    onChange={onChange}
                                    placeholder="https://example.com"
                                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        {/* Creative Guidelines */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold">Creative Guidelines</h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Hashtags <span className="text-gray-400 text-xs">(optional, comma-separated)</span></label>
                                <input
                                    type="text"
                                    name="hashtags"
                                    value={form.hashtags}
                                    onChange={onChange}
                                    placeholder="#hashtag1, #hashtag2"
                                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Directions</label>
                                <textarea
                                    name="directions"
                                    value={form.directions}
                                    onChange={onChange}
                                    rows={4}
                                    placeholder="e.g.\nUse trending audio\nFilm in landscape\nInclude product shot at end"
                                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                                <p className="mt-1 text-xs text-gray-500">One instruction per line works best.</p>
                            </div>

                            <fieldset>
                                <legend className="block text-sm font-medium text-gray-700 mb-2">Categories</legend>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {categoryOptions.map((cat) => {
                                        const on = form.categories.includes(cat);
                                        return (
                                            <label
                                                key={cat}
                                                className={`flex items-center gap-2 rounded-md px-3 py-2 border cursor-pointer ${on ? 'bg-green-50 border-green-300 text-green-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    name="categories"
                                                    value={cat}
                                                    checked={on}
                                                    onChange={onChange}
                                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-sm">{cat}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </fieldset>
                        </div>

                        {/* Brief & Requirements */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold">Brief & Requirements</h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Creative Brief</label>
                                <textarea
                                    name="brief"
                                    value={form.brief}
                                    onChange={onChange}
                                    rows={6}
                                    placeholder="Describe the video concept, key messages, target audience, tone, length, etc."
                                    required
                                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Deliverables</label>
                                <textarea
                                    name="deliverables"
                                    value={form.deliverables}
                                    onChange={onChange}
                                    rows={4}
                                    placeholder="e.g.\nOne 30-second video\nRaw footage files\nCaption suggestions"
                                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                                <p className="mt-1 text-xs text-gray-500">List items separated by commas or new lines.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Caption Template <span className="text-gray-400 text-xs">(optional)</span></label>
                                <textarea
                                    name="captionTemplate"
                                    value={form.captionTemplate}
                                    onChange={onChange}
                                    rows={3}
                                    placeholder="e.g. Check out [product]! [description] #hashtag"
                                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Usage Rights</label>
                                <textarea
                                    name="usageRights"
                                    value={form.usageRights}
                                    onChange={onChange}
                                    rows={3}
                                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                                <p className="mt-1 text-xs text-gray-500">Default: Brand may use and repost creator content.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Approval Criteria</label>
                                <textarea
                                    name="approvalCriteria"
                                    value={form.approvalCriteria}
                                    onChange={onChange}
                                    rows={4}
                                    placeholder="e.g.\nMust be 1080p resolution\nNo watermarks\nClear audio\nMatches brief exactly"
                                    required
                                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                                <p className="mt-1 text-xs text-gray-500">Specify requirements for approval to guide creators and admins.</p>
                            </div>
                        </div>

                        {/* Reference Assets */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold">Reference Assets <span className="text-gray-400 text-xs">(optional)</span></h2>
                            <div className="border-2 border-dashed border-gray-300 rounded-md px-6 py-12 text-center">
                                <div className="space-y-1 text-sm text-gray-600">
                                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                    <div className="flex text-sm text-gray-600">
                                        <label
                                            htmlFor="file-upload"
                                            className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
                                        >
                                            <span>Upload files</span>
                                            <input
                                                id="file-upload"
                                                name="file-upload"
                                                type="file"
                                                multiple
                                                onChange={onAssets}
                                                className="sr-only"
                                            />
                                        </label>
                                        <p className="pl-1">or drag and drop</p>
                                    </div>
                                    <p className="text-xs text-gray-500">Images, videos, PDFs up to 200MB</p>
                                </div>
                            </div>

                            {form.assets.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-sm font-medium text-gray-700">Uploaded Files</h3>
                                    <ul className="space-y-2">
                                        {form.assets.map((file, index) => (
                                            <li key={index} className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2">
                                                <div className="flex items-center space-x-2">
                                                    <Paperclip className="h-4 w-4 flex-shrink-0 text-gray-400" />
                                                    <span className="text-sm font-medium text-gray-900 truncate max-w-xs">{file.name}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeAsset(index)}
                                                    className="text-red-600 hover:text-red-500 text-sm font-medium flex items-center"
                                                >
                                                    <X className="h-4 w-4 mr-1" />
                                                    Remove
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Form Submission */}
                        <div className="pt-8">
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loading || uploadingAssets}
                                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                                            Creating Campaign...
                                        </>
                                    ) : (
                                        'Create Asset Creation Campaign'
                                    )}
                                </button>
                            </div>

                            {message && (
                                <div className="mt-4 rounded-md bg-green-50 p-4">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <Check className="h-5 w-5 text-green-400" />
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-green-800">{message}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="mt-4 rounded-md bg-red-50 p-4">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <AlertCircle className="h-5 w-5 text-red-400" />
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-red-800">{error}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}