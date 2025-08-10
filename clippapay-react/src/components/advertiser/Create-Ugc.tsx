// File: src/pages/CreateUGCCampaignForm.tsx
import React, { useEffect, useMemo, useState, ChangeEvent, FormEvent } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2, Paperclip, X, Info, AlertCircle, Check } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const UGC_ADVERTISER_CPM = 5000; // ₦ per 1000 views
const UGC_COST_PER_VIEW = UGC_ADVERTISER_CPM / 1000; // ₦5 per view

const platformOptions = [
    { label: 'TikTok', value: 'tiktok' },
    { label: 'Instagram', value: 'instagram' },
    { label: 'YouTube', value: 'youtube' },
    { label: 'Facebook', value: 'facebook' },
    { label: 'X', value: 'X' },
];

const categoryOptions = [
    'Fashion', 'Science & Tech', 'Gaming', 'Food', 'Travel', 'TV/Movies & Entertainment',
    'Sports', 'Education', 'Politics', 'Religion', 'Business & Investment', 'Health & Fitness',
    'Lifestyle', 'News & Media', 'Real Estate', 'Pets & Animals', 'Agriculture',
    'Music', 'Comedy', 'DIY & Crafts', 'Other',
];

type UGCForm = {
    title: string;
    budget: number;
    platforms: string[];
    countries: string[];
    hashtags: string;
    directions: string;
    categories: string[];
    numClipsSuggested: number;
    brief: string;
    deliverables: string;
    captionTemplate: string;
    usageRights: string;
    draftRequired: boolean;
    assets: File[];
    cta_url?: string;
};

const initialForm: UGCForm = {
    title: '',
    budget: 0,
    platforms: [],
    countries: [],
    hashtags: '',
    directions: '',
    categories: [],
    numClipsSuggested: 1,
    brief: '',
    deliverables: '',
    captionTemplate: '',
    usageRights: 'Brand may repost creator content on brand social channels.',
    draftRequired: true,
    assets: [],
    cta_url: '',
};

export default function CreateUGCCampaignForm() {
    const [form, setForm] = useState<UGCForm>(initialForm);
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

    const estimatedViews = useMemo(
        () => Math.floor((form.budget || 0) / UGC_COST_PER_VIEW),
        [form.budget]
    );

    function onChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        const t = e.target as HTMLInputElement;
        const { name, value, type, checked } = t;

        if (type === 'checkbox') {
            if (name === 'draftRequired') {
                setForm(f => ({ ...f, draftRequired: checked }));
            } else if (name === 'platforms' || name === 'categories' || name === 'countries') {
                setForm(f => ({
                    ...f,
                    [name]: checked
                        ? [...(f as any)[name], value]
                        : (f as any)[name].filter((v: string) => v !== value)
                }));
            }
            return;
        }

        setForm(f => ({ ...f, [name]: value }));
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
        if (form.budget <= 0) return setError('Enter a valid budget.');
        if (form.budget > walletBalance) return setError('Budget exceeds wallet balance.');
        if (form.platforms.length === 0) return setError('Select at least one platform.');
        if (estimatedViews < 1000) return setError('Minimum budget for UGC is ₦5,000 (1,000 views).');

        try {
            setLoading(true);
            const fd = new FormData();

            // Required basics
            fd.append('title', form.title);
            fd.append('budget', String(form.budget));

            // Targeting / settings
            fd.append('platforms', JSON.stringify(form.platforms));
            fd.append('countries', JSON.stringify(form.countries));
            fd.append('hashtags', JSON.stringify(form.hashtags.split(',').map(s => s.trim()).filter(Boolean)));
            fd.append('directions', JSON.stringify(form.directions.split('\n').map(s => s.trim()).filter(Boolean)));
            fd.append('categories', JSON.stringify(form.categories));
            fd.append('numClipsSuggested', String(form.numClipsSuggested || 1));
            if (form.cta_url) fd.append('cta_url', form.cta_url);

            // UGC meta
            fd.append('brief', form.brief);
            fd.append('deliverables', JSON.stringify(
                form.deliverables
                    .split(/\n|,/)
                    .map(s => s.trim())
                    .filter(Boolean)
            ));
            fd.append('captionTemplate', form.captionTemplate);
            fd.append('usageRights', form.usageRights);
            fd.append('draftRequired', String(form.draftRequired));

            // Assets (optional files)
            setUploadingAssets(true);
            form.assets.forEach(f => fd.append('assets', f));

            await axios.post(`${API_BASE}/campaigns/ugc`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setMessage('UGC campaign created successfully!');
            setTimeout(() => navigate('/dashboard/advertiser/campaigns'), 1500);
        } catch (err: any) {
            setError(err?.response?.data?.error || err?.message || 'Failed to create UGC campaign');
        } finally {
            setUploadingAssets(false);
            setLoading(false);
        }
    }

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Header */}

                <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-8 text-white">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onclose?.(); // if parent passed one
                            navigate('/dashboard/advertiser/campaigns'); // uncomment only if you WANT to redirect
                        }}
                        aria-label="Close form"
                        className="relative top-3 right-3 z-10 rounded-md border bg-white/60 px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-white"
                    >
                        ✕
                    </button>
                    <div className="max-w-3xl mx-auto">

                        <h1 className="text-3xl font-bold">Create UGC Campaign</h1>
                        <div className="mt-3 flex items-start gap-2 bg-indigo-700/50 rounded-lg p-3">
                            <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            <p className="text-sm">
                                UGC runs at <span className="font-semibold">₦5,000 per 1,000 views</span> (₦5 per view).
                                Your campaign runs until your escrowed budget is used up.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form Sections */}
                <div className="px-6 py-8">
                    <form onSubmit={onSubmit} className="space-y-10 divide-y divide-gray-200">
                        {/* Campaign Basics */}
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">Campaign Basics</h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Give your campaign a clear title and budget. Estimated views are calculated from your budget at ₦5 per view.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div>
                                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                                        Campaign Title
                                    </label>
                                    <div className="mt-1">
                                        <input
                                            type="text"
                                            name="title"
                                            id="title"
                                            value={form.title}
                                            onChange={onChange}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 border"
                                            placeholder="e.g., UGC for Summer Drop"
                                        />
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500">
                                        This appears to creators. Keep it descriptive.
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="budget" className="block text-sm font-medium text-gray-700">
                                        Budget (₦)
                                    </label>
                                    <div className="mt-1 relative rounded-md shadow-sm">
                                        <input
                                            type="number"
                                            name="budget"
                                            id="budget"
                                            min={0}
                                            value={form.budget}
                                            onChange={onChange}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 border"
                                            placeholder="5000"
                                        />
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500">
                                        Wallet balance: ₦{walletBalance.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <p className="text-xs font-medium text-gray-500">Estimated Views</p>
                                    <p className="mt-1 text-xl font-semibold text-gray-900">{estimatedViews.toLocaleString()}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <p className="text-xs font-medium text-gray-500">Cost per View</p>
                                    <p className="mt-1 text-xl font-semibold text-gray-900">₦{UGC_COST_PER_VIEW}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <p className="text-xs font-medium text-gray-500">Minimum Budget</p>
                                    <p className="mt-1 text-xl font-semibold text-gray-900">₦5,000 for 1,000 views</p>
                                </div>
                            </div>
                        </div>

                        {/* Targeting & Distribution */}
                        <div className="pt-8 space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">Targeting & Distribution</h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Choose the platforms and audience you want. Hashtags, directions and CTA help creators match your brand.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Platforms</label>
                                <p className="mt-1 text-xs text-gray-500">Where creators should post your UGC. Pick at least one.</p>
                                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                                    {platformOptions.map((platform) => (
                                        <div key={platform.value} className="flex items-center">
                                            <input
                                                id={`platform-${platform.value}`}
                                                name="platforms"
                                                type="checkbox"
                                                value={platform.value}
                                                checked={form.platforms.includes(platform.value)}
                                                onChange={onChange}
                                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <label htmlFor={`platform-${platform.value}`} className="ml-2 text-sm text-gray-700">
                                                {platform.label}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div>
                                    <label htmlFor="hashtags" className="block text-sm font-medium text-gray-700">
                                        Hashtags (comma-separated)
                                    </label>
                                    <div className="mt-1">
                                        <input
                                            type="text"
                                            name="hashtags"
                                            id="hashtags"
                                            value={form.hashtags}
                                            onChange={onChange}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 border"
                                            placeholder="#brand, #promo"
                                        />
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500">We'll suggest these to creators.</p>
                                </div>

                                <div>
                                    <label htmlFor="cta_url" className="block text-sm font-medium text-gray-700">
                                        CTA URL (optional)
                                    </label>
                                    <div className="mt-1">
                                        <input
                                            type="url"
                                            name="cta_url"
                                            id="cta_url"
                                            value={form.cta_url}
                                            onChange={onChange}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 border"
                                            placeholder="https://example.com"
                                        />
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500">Landing page creators can include in their caption or bio link.</p>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="directions" className="block text-sm font-medium text-gray-700">
                                    Directions (one per line)
                                </label>
                                <div className="mt-1">
                                    <textarea
                                        id="directions"
                                        name="directions"
                                        rows={4}
                                        value={form.directions}
                                        onChange={onChange}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 border"
                                        placeholder={'e.g.\nShow the product in frame for 3+ seconds\nMention discount code CLIPPA\nUse an upbeat, friendly tone'}
                                    />
                                </div>
                                <p className="mt-2 text-xs text-gray-500">
                                    Simple instructions for creators, e.g., hooks, mentions, must-include points.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Categories</label>
                                <p className="mt-1 text-xs text-gray-500">Helps creators discover your campaign.</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {categoryOptions.map((category) => (
                                        <div key={category} className="flex items-center">
                                            <input
                                                id={`category-${category}`}
                                                name="categories"
                                                type="checkbox"
                                                value={category}
                                                checked={form.categories.includes(category)}
                                                onChange={onChange}
                                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <label htmlFor={`category-${category}`} className="ml-2 text-sm text-gray-700">
                                                {category}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* UGC Brief */}
                        <div className="pt-8 space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">UGC Brief</h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Describe what to create and how. If "Require draft review" is on, creators will submit a draft before posting live.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div>
                                    <label htmlFor="brief" className="block text-sm font-medium text-gray-700">
                                        Brief
                                    </label>
                                    <div className="mt-1">
                                        <textarea
                                            id="brief"
                                            name="brief"
                                            rows={5}
                                            value={form.brief}
                                            onChange={onChange}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 border"
                                            placeholder="Tell a quick story about unboxing. Open with a strong hook in the first 3 seconds. Avoid mentioning competitors."
                                        />
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500">
                                        What the content should look/feel like. Add do's/don'ts, hooks, tone.
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="deliverables" className="block text-sm font-medium text-gray-700">
                                        Deliverables (comma or new lines)
                                    </label>
                                    <div className="mt-1">
                                        <textarea
                                            id="deliverables"
                                            name="deliverables"
                                            rows={5}
                                            value={form.deliverables}
                                            onChange={onChange}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 border"
                                            placeholder={'Examples:\nTikTok: 1x 9:16 video (≤60s)\nInstagram: 1x Reel + caption'}
                                        />
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500">
                                        What exactly creators must deliver.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                <div>
                                    <label htmlFor="captionTemplate" className="block text-sm font-medium text-gray-700">
                                        Caption Template
                                    </label>
                                    <div className="mt-1">
                                        <textarea
                                            id="captionTemplate"
                                            name="captionTemplate"
                                            rows={3}
                                            value={form.captionTemplate}
                                            onChange={onChange}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 border"
                                            placeholder="This is where you can add title suggestions for  clippers to use"
                                        />
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500">Optional caption scaffold creators can copy and edit.</p>
                                </div>

                                <div>
                                    <label htmlFor="usageRights" className="block text-sm font-medium text-gray-700">
                                        Usage Rights
                                    </label>
                                    <div className="mt-1">
                                        <span className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 border"
                                        >
                                            Brands and creators may use, modify, and repost assets content on brand social channels.
                                        </span>
                                    </div>

                                </div>

                                {/* <div>
                                    <label className="block text-sm font-medium text-gray-700">Require Draft Review?</label>
                                    <div className="mt-1 flex items-center">
                                        <div className="relative flex items-start py-2">
                                            <div className="flex h-6 items-center">
                                                <input
                                                    id="draftRequired"
                                                    name="draftRequired"
                                                    type="checkbox"
                                                    checked={form.draftRequired}
                                                    onChange={onChange}
                                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div className="ml-3">
                                                <label htmlFor="draftRequired" className="text-sm text-gray-700">
                                                    {form.draftRequired ? 'Yes' : 'No'}
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500">
                                        If on, creators submit a draft for your review before posting live.
                                    </p>
                                </div>*/}
                            </div>

                            <div className="max-w-xs">
                                <label htmlFor="numClipsSuggested" className="block text-sm font-medium text-gray-700">
                                    Suggested Number of Clips
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="number"
                                        name="numClipsSuggested"
                                        id="numClipsSuggested"
                                        min={1}
                                        max={6}
                                        value={form.numClipsSuggested}
                                        onChange={onChange}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 border"
                                    />
                                </div>
                                <p className="mt-2 text-xs text-gray-500">
                                    A soft guideline for how many distinct pieces of content you're hoping to gather.
                                </p>
                            </div>
                        </div>

                        {/* Brand Assets */}
                        <div className="pt-8 space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">Brand Assets (optional)</h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Upload logos, product shots, sound files, or references to help creators nail the brief.
                                </p>
                            </div>

                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                                <div className="space-y-1 text-center">
                                    <div className="flex justify-center text-gray-400">
                                        <Upload className="h-12 w-12" />
                                    </div>
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
                                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                                            Creating Campaign...
                                        </>
                                    ) : (
                                        'Create UGC Campaign'
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