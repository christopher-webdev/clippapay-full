// File: src/components/CreateCampaignForm.tsx
import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import axios from 'axios';
import { getData } from 'country-list';
import { useNavigate } from 'react-router-dom';
import { HiVideoCamera, HiUpload, HiInformationCircle, HiLightningBolt, HiEye } from 'react-icons/hi';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Prepare country list
const countryOptions = getData()
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((c) => ({ label: c.name, value: c.code }));

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

// PRICING
const NAIRA_PER_VIEW = 1.2; // ₦1200 / 1000 views

interface CreateCampaignFormProps { onClose: () => void; }

interface FormData {
  title: string;
  videoFile: File | null;
  budget: number;
  platforms: string[];
  countries: string[];
  hashtags: string;
  directions: string;
  cta_url: string;
  categories: string[];
  numClipsSuggested: number;
}




const MAX_FILE_SIZE_MB = 300;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const validateFileSize = (file: File): boolean => file.size <= MAX_FILE_SIZE_BYTES;

export default function CreateCampaignForm({ onClose }: CreateCampaignFormProps) {
  const [form, setForm] = useState<FormData>({
    title: '',
    videoFile: null,
    budget: 0,
    platforms: [],
    countries: [],
    hashtags: '',
    directions: '',
    cta_url: '',
    categories: [],
    numClipsSuggested: 1,
  });
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const navigate = useNavigate();

  const estimatedViews = form.budget > 0 ? Math.floor(form.budget / NAIRA_PER_VIEW) : 0;

  useEffect(() => {
    axios.get<{ balance: number }>(`${API_BASE}/wallet`)
      .then((res) => setWalletBalance(res.data.balance))
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (!form.videoFile) { setVideoPreview(null); return; }
    const url = URL.createObjectURL(form.videoFile);
    setVideoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [form.videoFile]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked, files } = target;

    if (type === 'file') {
      const file = (files && files[0]) || null;
      if (file) {
        if (!validateFileSize(file)) {
          setError(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit`);
          target.value = '';
          return;
        }
        setError(null);
      }
      setForm((f) => ({ ...f, videoFile: file }));
      return;
    }

    if (type === 'checkbox') {
      if (name === 'platforms' || name === 'countries' || name === 'categories') {
        setForm((f) => ({
          ...f,
          [name]: checked ? [...(f as any)[name], value] : (f as any)[name].filter((v: string) => v !== value),
        }));
        return;
      }
    }

    setForm((f) => ({ ...f, [name]: type === 'number' ? parseFloat(value) : value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.budget > walletBalance) { setError('Budget cannot exceed your available balance.'); return; }
    if (estimatedViews < 1) { setError('Budget is too low for even 1 view.'); return; }
    if (!form.videoFile) { setError('Please upload a video file.'); return; }

    setLoading(true); setError(null); setMessage(null);

    try {
      const payload = new FormData();
      payload.append('title', form.title);
      payload.append('video', form.videoFile);
      payload.append('cpv', NAIRA_PER_VIEW.toString());
      payload.append('budget', String(form.budget));
      payload.append('viewGoal', String(estimatedViews));
      payload.append('platforms', JSON.stringify(form.platforms));
      payload.append('countries', JSON.stringify(form.countries));
      payload.append('hashtags', JSON.stringify(form.hashtags.split(',').map(s => s.trim()).filter(Boolean)));
      payload.append('directions', JSON.stringify(form.directions.split('\n').map(s => s.trim()).filter(Boolean)));
      payload.append('cta_url', form.cta_url);
      payload.append('categories', JSON.stringify(form.categories));
      payload.append('numClipsSuggested', String(form.numClipsSuggested));

      await axios.post(`${API_BASE}/campaigns`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (pe) => {
          if (!pe.total) return;
          setUploadProgress(Math.round((pe.loaded * 100) / pe.total));
        }
      });

      setMessage('Campaign created successfully!');
      setForm({
        title: '', videoFile: null, budget: 0, platforms: [], countries: [],
        hashtags: '', directions: '', cta_url: '', categories: [], numClipsSuggested: 1,
      });
      setTimeout(() => { onClose(); navigate('/dashboard/advertiser/campaigns'); }, 900);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };


  return (
    <div className="relative max-w-4xl mx-auto">

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose?.(); // if parent passed one
          navigate('/dashboard/advertiser/campaigns'); // uncomment only if you WANT to redirect
        }}
        aria-label="Close form"
        className="absolute top-3 right-3 z-10 rounded-md border bg-white/60 px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-white"
      >
        ✕
      </button>


      <div className="bg-white shadow-xl rounded-2xl mt-8 ring-1 ring-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 sm:px-8 py-6 border-b bg-gradient-to-br from-gray-50 to-white">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Create New Campaign</h2>
          <p className="mt-1 text-sm text-gray-600 flex items-center gap-2">
            <HiInformationCircle className="w-4 h-4 text-indigo-500" />
            <span>
              Pricing: <b className="text-indigo-600">₦1200 per 1,000 views</b> (<b>₦1.2</b> per view). Set your budget, upload a video, choose platforms & targeting.
            </span>
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 sm:px-8 py-6 space-y-8">
          {/* Section: Basics */}
          <section className="rounded-xl border border-gray-200 p-5">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-gray-900">1. Basics</h3>
              <p className="text-sm text-gray-500">Name your campaign and upload the main video creators will use.</p>
            </div>

            {/* Title */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Campaign Title</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  placeholder="Summer Sale Promo"
                  className="mt-1 w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Budget (₦)</label>
                <input
                  type="number"
                  name="budget"
                  value={form.budget}
                  onChange={handleChange}
                  min={0}
                  required
                  placeholder="E.g., 6000"
                  className="mt-1 w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <div className="mt-1 text-xs text-gray-500">Wallet balance: ₦{walletBalance.toLocaleString()}</div>
              </div>
            </div>

            {/* Reach summary */}
            <div className="mt-4 grid sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 rounded-lg border bg-gray-50 p-3">
                <HiLightningBolt className="w-5 h-5 text-indigo-600" />
                <div className="text-sm">
                  <div className="font-semibold text-gray-800">Estimated Views</div>
                  <div className="text-gray-600">{estimatedViews.toLocaleString()}</div>
                </div>
              </div>
              <div className="rounded-lg border bg-gray-50 p-3 text-sm">
                <div className="text-gray-500">Rate</div>
                <div className="font-semibold text-gray-800">₦1200 / 1,000 views</div>
              </div>
              <div className="rounded-lg border bg-gray-50 p-3 text-sm">
                <div className="text-gray-500">Per View</div>
                <div className="font-semibold text-gray-800">₦{NAIRA_PER_VIEW.toFixed(2)}</div>
              </div>
            </div>

            {/* Upload */}
            <div className="mt-5">
              <label className="block text-sm font-medium text-gray-700">
                Upload Video <span className="text-gray-400 text-xs">(required, max {MAX_FILE_SIZE_MB}MB)</span>
              </label>

              <label className="mt-2 flex items-center justify-between gap-3 w-full rounded-lg border-2 border-dashed border-gray-300 p-4 hover:bg-gray-50 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
                    <HiUpload className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-800">Click to browse</div>
                    <div className="text-xs text-gray-500">MP4 / MOV / WEBM</div>
                  </div>
                </div>
                <input type="file" name="video" accept="video/*" onChange={handleChange} required className="hidden" />
              </label>

              {/* Progress */}
              {uploadProgress > 0 && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div className="h-2.5 rounded-full bg-indigo-600 transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="text-xs mt-1 text-gray-500 text-right">{uploadProgress}%</p>
                </div>
              )}

              {/* Meta + Preview */}
              <div className="mt-3 flex items-start gap-4">
                {form.videoFile && (
                  <div className="text-xs text-gray-500">
                    File size: {(form.videoFile.size / (1024 * 1024)).toFixed(2)}MB
                  </div>
                )}
                {videoPreview && (
                  <div className="ml-auto">
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <HiEye className="w-4 h-4" /> Preview
                    </div>
                    <div className="w-48 bg-black rounded-md overflow-hidden ring-1 ring-gray-200">
                      <div className="aspect-video">
                        <video src={videoPreview} controls className="w-full h-full object-contain" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Section: Targeting */}
          <section className="rounded-xl border border-gray-200 p-5">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-gray-900">2. Targeting</h3>
              <p className="text-sm text-gray-500">Pick platforms and countries to prioritize.</p>
            </div>

            {/* Platforms */}
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">
                Platforms <span className="text-xs text-gray-400">(required)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {platformOptions.map((opt) => {
                  const on = form.platforms.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className={`px-3 py-1.5 rounded-full text-sm border cursor-pointer select-none ${on ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      <input
                        type="checkbox"
                        name="platforms"
                        value={opt.value}
                        checked={on}
                        onChange={handleChange}
                        className="hidden"
                      />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Countries */}
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Target Countries</div>
              <div className="max-h-44 overflow-y-auto rounded-lg border bg-gray-50 p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked disabled className="rounded border-gray-300 bg-gray-200" />
                  <span className="text-gray-700">Worldwide</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="countries"
                    value="NG"
                    checked={form.countries.includes('NG')}
                    onChange={handleChange}
                    className="rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="text-gray-700">Nigeria</span>
                </label>
                {countryOptions.filter(c => c.value !== 'NG').map((c) => (
                  <label key={c.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="countries"
                      value={c.value}
                      checked={form.countries.includes(c.value)}
                      onChange={handleChange}
                      className="rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <span className="text-gray-700">{c.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* Section: Creative & Rules */}
          <section className="rounded-xl border border-gray-200 p-5">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-gray-900">3. Creative & Rules</h3>
              <p className="text-sm text-gray-500">Write directions and tags creators must include.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Hashtags */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Hashtags <span className="text-xs text-gray-400">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  name="hashtags"
                  value={form.hashtags}
                  onChange={handleChange}
                  placeholder="#sale, #promo"
                  className="mt-1 w-full rounded-md border-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              {/* CTA */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Primary CTA URL <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="url"
                  name="cta_url"
                  value={form.cta_url}
                  onChange={handleChange}
                  placeholder="https://example.com"
                  className="mt-1 w-full rounded-md border-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Directions */}
            <div className="mt-4">
              <label className="block text-sm shadow font-medium text-gray-700">Directions</label>
              <textarea
                name="directions"
                value={form.directions}
                onChange={handleChange}
                rows={4}
                placeholder={'e.g.\nUse trending audio\nDont re-edit my video\nPost my video as uploaded'}
                className="mt-1 w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">One instruction per line works best.</p>
            </div>

            {/* Categories & suggested clips */}
            <div className="mt-4 grid md:grid-cols-2 gap-4">
              <fieldset>
                <legend className="text-sm font-medium text-gray-700 mb-2">Categories</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {categoryOptions.map((cat) => {
                    const on = form.categories.includes(cat);
                    return (
                      <label
                        key={cat}
                        className={`flex items-center gap-2 rounded-md px-3 py-2 border cursor-pointer ${on ? 'bg-green-50 border-green-300 text-green-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        <input
                          type="checkbox"
                          name="categories"
                          value={cat}
                          checked={on}
                          onChange={handleChange}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm">{cat}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div>
                <label className="block text-sm font-medium text-gray-700">Suggested Number of Clips</label>
                <input
                  type="number"
                  name="numClipsSuggested"
                  value={form.numClipsSuggested}
                  onChange={handleChange}
                  min={1}
                  max={6}
                  className="mt-1 w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">Creators will see this as your preferred number.</p>
              </div>
            </div>
          </section>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-md bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700 transition disabled:opacity-60"
            >
              {loading ? `Uploading… ${uploadProgress}%` : 'Create Campaign'}
            </button>

            <div className="mt-3 text-center min-h-[22px]">
              {message && <p className="text-green-600 font-medium">{message}</p>}
              {error && <p className="text-red-600 font-medium">{error}</p>}
            </div>
          </div>
        </form>
      </div>
    </div >
  );
}
