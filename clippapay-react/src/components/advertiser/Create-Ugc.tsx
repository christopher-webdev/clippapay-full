// File: src/pages/CreateUGCCampaignForm.tsx
import React, { useEffect, useMemo, useState, ChangeEvent, FormEvent } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2, Paperclip, X, Info, AlertCircle, Check } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

// CORRECTED PRICING MODEL
const CLIPPER_FIXED_PAYOUT = 2000;     // ₦2,000 per approved clipper
const PLATFORM_FEE_PER_CLIPPER = 500; // ₦500 per clipper
const FIXED_COST_PER_CLIPPER = CLIPPER_FIXED_PAYOUT + PLATFORM_FEE_PER_CLIPPER; // ₦2,500
const MIN_BUDGET = 10000;
const VIEWS_CPM = 5000; // ₦5,000 per 1000 views
const VIEWS_COST_PER_VIEW = VIEWS_CPM / 1000; // ₦5 per view

const platformOptions = [
    { label: 'TikTok', value: 'tiktok' },
    { label: 'Instagram', value: 'instagram' },
    { label: 'YouTube', value: 'youtube' },
    { label: 'Facebook', value: 'facebook' },
    { label: 'X', value: 'X' },
    { label: 'WhatsApp', value: 'whatsapp' },
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
    budget: MIN_BUDGET,
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

    // CORRECTED CALCULATION: Budget is split between clippers and views
    const { clipperSlots, fixedCost, viewsBudget, estimatedViews } = useMemo(() => {
        const clipperBudget = form.budget * 0.5;
        const viewsBudget = form.budget * 0.5;

        const slots = Math.floor(clipperBudget / FIXED_COST_PER_CLIPPER);
        const fixedCost = slots * FIXED_COST_PER_CLIPPER;

        const views = Math.floor(viewsBudget / (VIEWS_CPM / 1000));

        return { clipperSlots: slots, fixedCost, viewsBudget, estimatedViews: views };
    }, [form.budget]);


    useEffect(() => {
        axios.get<{ balance: number }>(`${API_BASE}/wallet`)
            .then(r => setWalletBalance(r.data.balance))
            .catch(() => { });
    }, []);

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

        // Handle number inputs
        if (type === 'number') {
            setForm(f => ({ ...f, [name]: Number(value) }));
        } else {
            setForm(f => ({ ...f, [name]: value }));
        }
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
        if (form.budget < MIN_BUDGET) return setError(`Minimum budget is ₦${MIN_BUDGET.toLocaleString()}`);
        if (form.budget > walletBalance) return setError('Budget exceeds wallet balance.');
        if (form.platforms.length === 0) return setError('Select at least one platform.');
        if (clipperSlots < 1) return setError('Budget too low for even 1 clipper');
        if (estimatedViews < 1000) return setError('Need at least ₦5,000 for views (1,000 views)');

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

            // Budget breakdown (new fields)
            fd.append('clipperSlots', String(clipperSlots));
            fd.append('fixedCost', String(fixedCost));
            fd.append('viewsBudget', String(viewsBudget));
            fd.append('estimatedViews', String(estimatedViews));

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
                        onClick={() => navigate('/dashboard/advertiser/campaigns')}
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
                                Each clipper gets <span className="font-semibold">₦2,000</span> on approval •
                                Platform fee <span className="font-semibold">₦500</span> per clipper •
                                Views cost <span className="font-semibold">₦5 per view</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Budget Breakdown Section */}
                <div className="px-6 py-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-2xl font-bold mb-4">Budget Breakdown</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
                                <div className="text-3xl font-bold">{clipperSlots}</div>
                                <div className="text-sm">Clipper Slots</div>
                            </div>
                            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
                                <div className="text-3xl font-bold">₦{fixedCost.toLocaleString()}</div>
                                <div className="text-sm">Fixed Cost</div>
                            </div>
                            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
                                <div className="text-3xl font-bold">₦{viewsBudget.toLocaleString()}</div>
                                <div className="text-sm">Views Budget</div>
                            </div>
                            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
                                <div className="text-3xl font-bold">{estimatedViews.toLocaleString()}</div>
                                <div className="text-sm">Est. Views</div>
                            </div>
                        </div>

                        {/* Budget Calculation Details */}
                        <div className="mt-6 bg-white/10 rounded-lg p-4">
                            <h3 className="font-semibold mb-2">Calculation Details:</h3>
                            <div className="text-sm space-y-1">
                                <div>• Total Budget: <strong>₦{form.budget.toLocaleString()}</strong></div>
                                <div>• {clipperSlots} Clipper(s): <strong>{clipperSlots} × ₦2,500</strong> = ₦{fixedCost.toLocaleString()}</div>
                                <div>• Clipper Payout: {clipperSlots} × ₦2,000 = <strong>₦{(clipperSlots * CLIPPER_FIXED_PAYOUT).toLocaleString()}</strong></div>
                                <div>• Platform Fees: {clipperSlots} × ₦500 = <strong>₦{(clipperSlots * PLATFORM_FEE_PER_CLIPPER).toLocaleString()}</strong></div>
                                <div>• Remaining for Views: <strong>₦{viewsBudget.toLocaleString()}</strong></div>
                                <div>• Estimated Views: <strong>{estimatedViews.toLocaleString()} views</strong> at ₦5 per view</div>
                            </div>
                        </div>

                        <p className="mt-4 text-sm opacity-90">
                            Minimum budget: <strong>₦{MIN_BUDGET.toLocaleString()}</strong> (2 clippers + 1,000 views)
                        </p>
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
                                    Give your campaign a clear title and budget. The budget is split between clipper payouts and views.
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
                                            min={MIN_BUDGET}
                                            step="2500"
                                            value={form.budget}
                                            onChange={onChange}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-3 px-4 border"
                                            placeholder="10000"
                                        />
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500">
                                        Wallet balance: ₦{walletBalance.toLocaleString()} • Minimum: ₦{MIN_BUDGET.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* Quick Budget Examples */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Budget Examples:</h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                                    <div className="text-center p-2 bg-white rounded border">
                                        <div className="font-semibold">₦10,000</div>
                                        <div>2 clippers</div>
                                        <div>1,000 views</div>
                                    </div>
                                    <div className="text-center p-2 bg-white rounded border">
                                        <div className="font-semibold">₦15,000</div>
                                        <div>3 clippers</div>
                                        <div>1,500 views</div>
                                    </div>
                                    <div className="text-center p-2 bg-white rounded border">
                                        <div className="font-semibold">₦20,000</div>
                                        <div>4 clippers</div>
                                        <div>2,000 views</div>
                                    </div>
                                    <div className="text-center p-2 bg-white rounded border">
                                        <div className="font-semibold">₦25,000</div>
                                        <div>5 clippers</div>
                                        <div>2,500 views</div>
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/* Rest of the form remains the same */}
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
                                            placeholder="This is where you can add title suggestions for clippers to use"
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
                                            Brands and creators may use, modify, and repost assets content on brand and creators social channels.
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    {/* <label className="block text-sm font-medium text-gray-700">Require Draft Review?</label> */}
                                    <div className="mt-1 flex items-center">
                                        <div className="relative flex items-start py-2">
                                            {/* <div className="flex h-6 items-center">
                                                <input
                                                    id="draftRequired"
                                                    name="draftRequired"
                                                    type="checkbox"
                                                    checked={form.draftRequired}
                                                    onChange={onChange}
                                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                            </div> */}
                                            {/* <div className="ml-3">
                                                <label htmlFor="draftRequired" className="text-sm text-gray-700">
                                                    {form.draftRequired ? 'Yes' : 'No'}
                                                </label>
                                            </div> */}
                                        </div>
                                    </div>
                                    {/* <p className="mt-2 text-xs text-gray-500">
                                        If on, creators submit a draft for your review before posting live.
                                    </p> */}
                                </div>
                            </div>

                            <div className="max-w-xs">
                                {/* <label htmlFor="numClipsSuggested" className="block text-sm font-medium text-gray-700">
                                    Suggested Number of Clips
                                </label> */}
                                {/* <div className="mt-1">
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
                                </div> */}
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
                                    disabled={loading || uploadingAssets || clipperSlots < 1}
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