// File: src/components/CreateCampaignForm.tsx

import React, {
  useState,
  useEffect,
  ChangeEvent,
  FormEvent,
} from 'react';
import axios from 'axios';
import { getData } from 'country-list';
import { useNavigate } from 'react-router-dom';

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
];

const categoryOptions = [
  'Fashion', 'Science & Tech', 'Gaming', 'Food', 'Travel', 'TV/Movies & Entertainment',
  'Sports', 'Education', 'Politics', 'Religion', 'Business & Investment', 'Health & Fitness',
  'Lifestyle', 'News & Media', 'Real Estate', 'Pets & Animals', 'Agriculture',
  'Music', 'Comedy', 'DIY & Crafts', 'Other',
];

// CONSTANTS
const NAIRA_PER_VIEW = 0.6; // ₦600 per 1000 = ₦0.6 per view

interface CreateCampaignFormProps {
  onClose: () => void;
}

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
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024; // 300MB in bytes

const validateFileSize = (file: File): boolean => {
  return file.size <= MAX_FILE_SIZE_BYTES;
};
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
  const navigate = useNavigate();

  // Derived: Calculate max views from budget (for the progress chip)
  const estimatedViews = form.budget > 0
    ? Math.floor(form.budget / NAIRA_PER_VIEW)
    : 0;

  // Fetch wallet balance on mount
  useEffect(() => {
    axios
      .get<{ balance: number }>(`${API_BASE}/wallet`)
      .then((res) => setWalletBalance(res.data.balance))
      .catch(() => { /* ignore */ });
  }, []);

  // Video preview
  useEffect(() => {
    if (!form.videoFile) {
      setVideoPreview(null);
      return;
    }
    const url = URL.createObjectURL(form.videoFile);
    setVideoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [form.videoFile]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;

    if (type === 'file') {
      const file = target.files?.[0] || null;
      if (file) {
        if (!validateFileSize(file)) {
          setError(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit`);
          // Clear the file input
          target.value = '';
          return;
        }
        setError(null); // Clear any previous errors
      }
      setForm((f) => ({ ...f, videoFile: file }));
    } else if (type === 'checkbox') {
      if (name === 'platforms') {
        setForm((f) => ({
          ...f,
          platforms: checked
            ? [...f.platforms, value]
            : f.platforms.filter((v) => v !== value),
        }));
      } else if (name === 'countries') {
        setForm((f) => ({
          ...f,
          countries: checked
            ? [...f.countries, value]
            : f.countries.filter((v) => v !== value),
        }));
      } else if (name === 'categories') {
        setForm((f) => ({
          ...f,
          categories: checked
            ? [...f.categories, value]
            : f.categories.filter((v) => v !== value),
        }));
      }
    } else {
      setForm((f) => ({
        ...f,
        [name]:
          type === 'number'
            ? parseFloat(value)
            : value,
      }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.budget > walletBalance) {
      setError('Budget cannot exceed your available balance.');
      return;
    }
    if (estimatedViews < 1) {
      setError('Budget is too low for even 1 view.');
      return;
    }
    if (!form.videoFile) {
      setError('Please upload a video file.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const payload = new FormData();
      payload.append('title', form.title);
      payload.append('video', form.videoFile);
      payload.append('cpv', NAIRA_PER_VIEW.toString());
      payload.append('budget', form.budget.toString());
      payload.append('viewGoal', estimatedViews.toString()); // for backend
      payload.append('platforms', JSON.stringify(form.platforms));
      payload.append('countries', JSON.stringify(form.countries));
      payload.append(
        'hashtags',
        JSON.stringify(
          form.hashtags
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t)
        )
      );
      payload.append(
        'directions',
        JSON.stringify(
          form.directions
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l)
        )
      );
      payload.append('cta_url', form.cta_url);
      payload.append('categories', JSON.stringify(form.categories));
      payload.append('numClipsSuggested', form.numClipsSuggested.toString());

      const res = await axios.post(
        `${API_BASE}/campaigns`,
        payload,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setMessage('Campaign created successfully!');
      setForm({
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
      setTimeout(() => {
        onClose();
        navigate('/dashboard/advertiser/campaigns');
      }, 1200);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative max-w-3xl mx-auto">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 z-10"
        aria-label="Close form"
      >
        ✕
      </button>
      <div className="bg-white shadow rounded-2xl p-7 sm:p-10 mt-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Create New Campaign
        </h2>
        <p className="mb-5 text-gray-500 text-sm">
          <span className="font-semibold text-cp-blue">₦600 per 1,000 views (₦0.6 per view)</span>. Enter your budget, upload a video, select platforms and targeting, and see your estimated reach.
        </p>
        <form onSubmit={handleSubmit} className="space-y-7">

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Campaign Title
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-cp-blue focus:border-cp-blue"
              placeholder="Summer Sale Promo"
            />
          </div>

          {/* Video Upload */}
          {/* Video Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Upload Video <span className="text-gray-400 text-xs">(required, max {MAX_FILE_SIZE_MB}MB)</span>
            </label>
            <input
              type="file"
              name="video"
              accept="video/*"
              onChange={handleChange}
              required
              className="mt-1 block w-full text-gray-700"
            />
            {form.videoFile && (
              <p className="text-xs mt-1 text-gray-500">
                File size: {(form.videoFile.size / (1024 * 1024)).toFixed(2)}MB
              </p>
            )}
            {videoPreview && (
              <video
                src={videoPreview}
                controls
                className="mt-3 w-[170px] h-[170px] object-cover rounded-md border shadow"
              />
            )}
          </div>

          {/* Budget / Views */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-sm font-semibold text-gray-700">
                Total Budget (₦)
              </label>
              <input
                type="number"
                name="budget"
                value={form.budget}
                onChange={handleChange}
                min={0}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-cp-blue focus:border-cp-blue"
                placeholder="E.g., 6000"
              />
              <p className="mt-1 text-xs text-gray-500">
                Balance: ₦{walletBalance.toLocaleString()}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-gray-700">
                  Estimated Views
                </label>
                <span className="text-xs text-gray-400">Auto-calculated</span>
              </div>
              <input
                type="number"
                value={estimatedViews}
                readOnly
                className="mt-1 block w-full rounded-md border-gray-100 shadow-none bg-gray-100 text-gray-700 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">
                (₦600 = 1,000 views)
              </p>
            </div>
          </div>

          {/* Platforms */}
          <fieldset>
            <legend className="text-sm font-semibold text-gray-700 mb-2">
              Platforms <span className="text-xs text-gray-400">(required)</span>
            </legend>
            <div className="space-x-4">
              {platformOptions.map((opt) => (
                <label key={opt.value} className="inline-flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="platforms"
                    value={opt.value}
                    checked={form.platforms.includes(opt.value)}
                    onChange={handleChange}
                    className="rounded border-gray-300 focus:ring-cp-indigo"
                  />
                  <span className="text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Countries */}
          <fieldset>
            <legend className="text-sm font-semibold text-gray-700 mb-2">
              Target Countries
            </legend>
            <div className="max-h-36 overflow-y-auto border p-2 rounded-lg bg-gray-50 grid grid-cols-2 gap-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked
                  disabled
                  className="rounded border-gray-300 bg-gray-200 cursor-not-allowed"
                />
                <span className="text-gray-700 text-sm">Worldwide</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="countries"
                  value="NG"
                  checked={form.countries.includes('NG')}
                  onChange={handleChange}
                  className="rounded border-gray-300 focus:ring-cp-indigo"
                />
                <span className="text-gray-700 text-sm">Nigeria</span>
              </label>
              {countryOptions
                .filter((c) => c.value !== 'NG')
                .map((c) => (
                  <label key={c.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="countries"
                      value={c.value}
                      checked={form.countries.includes(c.value)}
                      onChange={handleChange}
                      className="rounded border-gray-300 focus:ring-cp-indigo"
                    />
                    <span className="text-gray-700 text-sm">{c.label}</span>
                  </label>
                ))}
            </div>
          </fieldset>

          {/* Hashtags */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Hashtags <span className="text-xs text-gray-400">(comma-separated)</span>
            </label>
            <input
              type="text"
              name="hashtags"
              value={form.hashtags}
              onChange={handleChange}
              placeholder="#sale, #promo"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-cp-blue focus:border-cp-blue"
            />
          </div>

          {/* Directions */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Directions
            </label>
            <textarea
              name="directions"
              value={form.directions}
              onChange={handleChange}
              rows={3}
              placeholder="e.g., Use trending audio"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-cp-blue focus:border-cp-blue"
            />
          </div>

          {/* CTA URL */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Primary CTA URL <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="url"
              name="cta_url"
              value={form.cta_url}
              onChange={handleChange}
              placeholder="https://example.com"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-cp-blue focus:border-cp-blue"
            />
          </div>

          {/* Categories */}
          <fieldset className="border border-gray-200 rounded-lg p-4 shadow-sm">
            <legend className="text-base font-semibold text-gray-800 mb-4 px-1">
              Categories
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categoryOptions.map((cat) => (
                <label
                  key={cat}
                  className="flex items-center space-x-3 bg-gray-50 hover:bg-gray-100 rounded-md px-3 py-2 cursor-pointer transition"
                >
                  <input
                    type="checkbox"
                    name="categories"
                    value={cat}
                    checked={form.categories.includes(cat)}
                    onChange={handleChange}
                    className="h-4 w-4 text-cp-indigo border-gray-300 rounded focus:ring-cp-indigo"
                  />
                  <span className="text-sm text-gray-700">{cat}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Suggested Clips */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Suggested Number of Clips
            </label>
            <input
              type="number"
              name="numClipsSuggested"
              value={form.numClipsSuggested}
              onChange={handleChange}
              min={1}
              max={6}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-cp-blue focus:border-cp-blue"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-cp-blue text-white font-semibold rounded-md shadow hover:bg-cp-indigo transition"
          >
            {loading ? 'Creating…' : 'Create Campaign'}
          </button>

          {/* Success / error feedback */}
          <div className="mt-4 text-center min-h-[22px]">
            {message && <p className="text-green-600 font-medium">{message}</p>}
            {error && <p className="text-red-600 font-medium">{error}</p>}
          </div>
        </form>
      </div>
    </div>
  );
}
