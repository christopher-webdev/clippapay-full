// components/advertiser/CreateClipping.tsx
// 3-step wizard to create a clipping campaign
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'https://clippapay.com/api';

const NGN_PER_THOUSAND_VIEWS  = 3000;
const USDT_PER_THOUSAND_VIEWS = 1.85;

const PLATFORM_OPTIONS = [
  { id: 'tiktok',     label: 'TikTok',           icon: '🎵' },
  { id: 'instagram',  label: 'Instagram Reels',   icon: '📸' },
  { id: 'youtube',    label: 'YouTube Shorts',    icon: '▶️' },
  { id: 'facebook',   label: 'Facebook Reels',    icon: '👥' },
  { id: 'twitter',    label: 'X (Twitter)',       icon: '🐦' },
] as const;

const CATEGORY_OPTIONS = [
  'Fashion & Style','Beauty & Makeup','Tech & Gadgets','Gaming','Food & Cooking',
  'Travel & Adventure','Fitness & Health','Business & Finance','Education & Learning',
  'Entertainment','Comedy','Sports','Music & Dance','DIY & Crafts','Lifestyle',
  'Motivation & Inspiration','Pets & Animals','Parenting & Family','Automotive','Real Estate',
] as const;

interface WalletData { balance: number; usdtBalance: number; preferredCurrency: 'NGN' | 'USDT'; }
interface CampaignForm {
  title: string; videoUrl: string; budget: string; currency: 'NGN' | 'USDT';
  platforms: string[]; hashtags: string; directions: string; categories: string[]; ctaUrl: string;
}
interface FormErrors {
  title?: string; videoUrl?: string; budget?: string; platforms?: string; categories?: string;
}

const getToken = () => localStorage.getItem('token');

export default function CreateClipping() {
  const navigate = useNavigate();
  const [loading, setLoading]           = useState(false);
  const [walletLoading, setWalletLoading] = useState(true);
  const [wallet, setWallet]             = useState<WalletData | null>(null);
  const [activeStep, setActiveStep]     = useState(1);
  const [estimatedViews, setEstimatedViews] = useState(0);
  const [errors, setErrors]             = useState<FormErrors>({});
  const [successId, setSuccessId]       = useState<string | null>(null);

  const [form, setForm] = useState<CampaignForm>({
    title: '', videoUrl: '', budget: '', currency: 'NGN',
    platforms: [], hashtags: '', directions: '', categories: [], ctaUrl: '',
  });

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const token = getToken();
        if (!token) return;
        const res = await axios.get(`${API_BASE}/wallet`, { headers: { Authorization: `Bearer ${token}` } });
        setWallet(res.data);
        setForm((prev) => ({ ...prev, currency: res.data.preferredCurrency || 'NGN' }));
      } catch { /* silent */ } finally { setWalletLoading(false); }
    };
    fetchWallet();
  }, []);

  useEffect(() => {
    const budgetNum = parseFloat(form.budget) || 0;
    if (budgetNum > 0) {
      const rate = form.currency === 'NGN' ? NGN_PER_THOUSAND_VIEWS / 1000 : USDT_PER_THOUSAND_VIEWS / 1000;
      setEstimatedViews(Math.floor(budgetNum / rate));
    } else {
      setEstimatedViews(0);
    }
  }, [form.budget, form.currency]);

  const setField = <K extends keyof CampaignForm>(key: K, val: CampaignForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const togglePlatform = (id: string) => {
    setField('platforms', form.platforms.includes(id) ? form.platforms.filter((p) => p !== id) : [...form.platforms, id]);
    setErrors((e) => ({ ...e, platforms: undefined }));
  };
  const toggleCategory = (cat: string) => {
    setField('categories', form.categories.includes(cat) ? form.categories.filter((c) => c !== cat) : [...form.categories, cat]);
    setErrors((e) => ({ ...e, categories: undefined }));
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.title.trim() || form.title.length < 5)       e.title    = 'Title must be at least 5 characters';
    if (!form.videoUrl.trim())                              e.videoUrl = 'Video URL is required';
    else try { new URL(form.videoUrl); } catch { e.videoUrl = 'Please enter a valid URL'; }

    const budgetNum = parseFloat(form.budget);
    if (!form.budget || isNaN(budgetNum) || budgetNum <= 0) {
      e.budget = 'Please enter a valid budget amount';
    } else {
      const min = form.currency === 'NGN' ? 3000 : 1.85;
      if (budgetNum < min) e.budget = `Minimum budget is ${form.currency === 'NGN' ? '₦3,000' : '$1.85 USDT'}`;
      const avail = form.currency === 'NGN' ? wallet?.balance || 0 : wallet?.usdtBalance || 0;
      if (budgetNum > avail) e.budget = `Insufficient ${form.currency} balance`;
    }
    if (form.platforms.length === 0) e.platforms = 'Select at least one platform';
    if (form.categories.length === 0) e.categories = 'Select at least one category';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const token    = getToken();
      const budgetNum = parseFloat(form.budget);
      const payload  = {
        title:            form.title.trim(),
        videoUrl:         form.videoUrl.trim(),
        budget:           budgetNum,
        currency:         form.currency,
        platforms:        form.platforms,
        hashtags:         form.hashtags.split(',').map((t) => t.trim()).filter(Boolean),
        directions:       form.directions.split('\n').filter((l) => l.trim()),
        categories:       form.categories,
        ctaUrl:           form.ctaUrl.trim() || undefined,
        estimatedViews,
        costPerThousand:  form.currency === 'NGN' ? NGN_PER_THOUSAND_VIEWS : USDT_PER_THOUSAND_VIEWS,
      };
      const res = await axios.post(`${API_BASE}/campaigns/clipping`, payload, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      setSuccessId(res.data.campaignId);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create campaign. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (successId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 flex items-center justify-center p-5">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-9 h-9 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">Campaign Created! 🎉</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Your clipping campaign is now active. Clippers can start joining and submitting proofs.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => navigate(`../${successId}`)}
              className="w-full bg-indigo-500 text-white font-bold py-3 rounded-xl text-sm hover:bg-indigo-600 transition-colors"
            >
              Manage Campaign
            </button>
            <button
              onClick={() => navigate('..')}
              className="w-full border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              View All Campaigns
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stepLabels = ['Basic Info', 'Budget & Platforms', 'Guidelines'];
  const fmtCur = (n: number) => form.currency === 'NGN' ? `₦${n.toLocaleString()}` : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT`;
  const avail  = form.currency === 'NGN' ? wallet?.balance || 0 : wallet?.usdtBalance || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800">
      <div className="max-w-2xl mx-auto px-5 pt-8 pb-20">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-white">Create Clipping Campaign</h1>
            <p className="text-white/70 text-sm mt-0.5">Turn your video into viral clips</p>
          </div>
        </div>

        {/* Wallet card */}
        <div className="bg-white/15 backdrop-blur rounded-2xl p-4 mb-4 flex gap-4">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          {walletLoading ? (
            <div className="flex items-center"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>
          ) : wallet ? (
            <div className="flex gap-6">
              <div>
                <p className="text-white/70 text-xs mb-0.5">NGN Balance</p>
                <p className="text-white font-bold text-base">₦{wallet.balance.toLocaleString()}</p>
              </div>
              <div className="w-px bg-white/30" />
              <div>
                <p className="text-white/70 text-xs mb-0.5">USDT Balance</p>
                <p className="text-white font-bold text-base">${wallet.usdtBalance.toLocaleString()}</p>
              </div>
            </div>
          ) : (
            <p className="text-white/60 text-sm self-center">Failed to load wallet</p>
          )}
        </div>

        {/* Info banner */}
        <div className="bg-white/95 rounded-2xl p-4 mb-4 flex gap-3 items-start">
          <svg className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-gray-600 leading-relaxed">
            Creators will download your video and create engaging clips. You pay{' '}
            <strong>{form.currency === 'NGN' ? '₦3,000' : '$1.85 USDT'}</strong> per 1,000 views generated.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          {/* Step indicator */}
          <div className="flex items-center mb-8">
            {[1, 2, 3].map((step) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    activeStep >= step ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {activeStep > step ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : step}
                  </div>
                  <span className={`text-[10px] mt-1 font-medium ${activeStep >= step ? 'text-orange-500' : 'text-gray-400'}`}>
                    {stepLabels[step - 1]}
                  </span>
                </div>
                {step < 3 && (
                  <div className={`flex-1 h-0.5 mb-4 mx-1 transition-colors ${activeStep > step ? 'bg-orange-500' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* ── Step 1 ── */}
          {activeStep === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Campaign Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => { setField('title', e.target.value); setErrors((err) => ({ ...err, title: undefined })); }}
                  placeholder="e.g., Summer Fashion Lookbook Clips"
                  maxLength={100}
                  className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors.title ? 'border-red-400' : 'border-gray-200'}`}
                />
                <div className="flex justify-between mt-1">
                  {errors.title ? <p className="text-red-500 text-xs">{errors.title}</p> : <span />}
                  <p className="text-gray-400 text-xs">{form.title.length}/100</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Video URL</label>
                <div className={`flex items-center bg-gray-50 border rounded-xl px-4 ${errors.videoUrl ? 'border-red-400' : 'border-gray-200'}`}>
                  <svg className="w-4 h-4 text-gray-400 shrink-0 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <input
                    type="url"
                    value={form.videoUrl}
                    onChange={(e) => { setField('videoUrl', e.target.value); setErrors((err) => ({ ...err, videoUrl: undefined })); }}
                    placeholder="https://youtube.com/watch?v=..."
                    className="flex-1 bg-transparent py-3 text-sm text-gray-900 focus:outline-none"
                  />
                </div>
                {errors.videoUrl && <p className="text-red-500 text-xs mt-1">{errors.videoUrl}</p>}
                <p className="text-gray-400 text-xs mt-1">Supported: YouTube, Vimeo, Google Drive, or direct MP4 links</p>
              </div>

              <button
                onClick={() => setActiveStep(2)}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition-colors"
              >
                Next: Budget & Platforms
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* ── Step 2 ── */}
          {activeStep === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Currency</label>
                <div className="flex bg-gray-100 rounded-xl p-1">
                  {(['NGN', 'USDT'] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => setField('currency', c)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        form.currency === c ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'
                      }`}
                    >
                      {c === 'NGN' ? '₦ NGN' : '$ USDT'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Budget</label>
                <div className={`flex items-center bg-gray-50 border rounded-xl px-4 ${errors.budget ? 'border-red-400' : 'border-gray-200'}`}>
                  <span className="text-xl font-bold text-gray-400 mr-2">{form.currency === 'NGN' ? '₦' : '$'}</span>
                  <input
                    type="number"
                    value={form.budget}
                    onChange={(e) => { setField('budget', e.target.value.replace(/[^0-9.]/g, '')); setErrors((err) => ({ ...err, budget: undefined })); }}
                    placeholder="0.00"
                    className="flex-1 bg-transparent py-3 text-lg font-bold text-gray-900 focus:outline-none"
                  />
                </div>
                {errors.budget && <p className="text-red-500 text-xs mt-1">{errors.budget}</p>}
                <p className="text-gray-400 text-xs mt-1">Available: {fmtCur(avail)}</p>

                {estimatedViews > 0 && (
                  <div className="bg-blue-50 rounded-xl p-3 mt-2">
                    <p className="text-xs text-orange-500 font-semibold mb-0.5">Estimated Views</p>
                    <p className="text-lg font-extrabold text-blue-800">{estimatedViews.toLocaleString()} views</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Rate: {form.currency === 'NGN' ? '₦3,000' : '$1.85 USDT'}/1k views
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Platforms</label>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORM_OPTIONS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => togglePlatform(p.id)}
                      className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        form.platforms.includes(p.id)
                          ? 'border-orange-400 bg-orange-50 text-orange-600'
                          : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span>{p.icon}</span>
                      {p.label}
                    </button>
                  ))}
                </div>
                {errors.platforms && <p className="text-red-500 text-xs mt-1">{errors.platforms}</p>}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setActiveStep(1)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm hover:bg-gray-200 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button
                  onClick={() => setActiveStep(3)}
                  className="flex-1 flex items-center justify-center gap-2 bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition-colors"
                >
                  Next: Guidelines
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3 ── */}
          {activeStep === 3 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Hashtags</label>
                <input
                  type="text"
                  value={form.hashtags}
                  onChange={(e) => setField('hashtags', e.target.value)}
                  placeholder="#viral, #trending, #fashion"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <p className="text-gray-400 text-xs mt-1">Separate hashtags with commas</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Editing Directions</label>
                <textarea
                  value={form.directions}
                  onChange={(e) => setField('directions', e.target.value)}
                  placeholder={`• Use trending audio\n• Add captions\n• Keep clips under 30 seconds`}
                  rows={5}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Categories</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        form.categories.includes(cat)
                          ? 'bg-orange-50 border-orange-400 text-orange-600'
                          : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                {errors.categories && <p className="text-red-500 text-xs mt-2">{errors.categories}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Call-to-Action URL <span className="text-gray-400 font-normal">(Optional)</span></label>
                <input
                  type="url"
                  value={form.ctaUrl}
                  onChange={(e) => setField('ctaUrl', e.target.value)}
                  placeholder="https://yourwebsite.com/product"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* Summary */}
              {estimatedViews > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Campaign Summary</p>
                  {[
                    ['Budget',          fmtCur(parseFloat(form.budget) || 0)],
                    ['Estimated Views', estimatedViews.toLocaleString()],
                    ['Platforms',       String(form.platforms.length)],
                    ['Categories',      String(form.categories.length)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
                      <span className="text-sm text-gray-500">{label}</span>
                      <span className="text-sm font-bold text-gray-800">{value}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setActiveStep(2)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm hover:bg-gray-200 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white font-bold py-3 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-60"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Create Campaign
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
