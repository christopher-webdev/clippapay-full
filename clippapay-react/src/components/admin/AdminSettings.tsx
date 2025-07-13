import React, { useEffect, useState, FormEvent } from 'react';
import axios from 'axios';

export interface PlatformSettings {
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
}

export default function AdminSettings() {
  // --- State ---
  const [settings, setSettings] = useState<PlatformSettings>({
    bankName: '',
    bankAccountNumber: '',
    bankAccountName: '',
  });
  const [form, setForm] = useState(settings);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // --- Load from backend ---
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await axios.get<PlatformSettings>('/admin/settings');
        setSettings(data);
        setForm(data);
      } catch (err: any) {
        console.error(err);
        setLoadError('Failed to load settings.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function handleChange<K extends keyof PlatformSettings>(
    key: K,
    value: PlatformSettings[K]
  ) {
    setForm(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
    setSaveError(null);
    setSaveSuccess(null);
  }

  function handleCancel() {
    setForm(settings);
    setIsDirty(false);
    setSaveError(null);
    setSaveSuccess(null);
  }

  // --- Save to backend ---
  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const { data } = await axios.put<PlatformSettings>('/admin/settings', form);
      setSettings(data);
      setForm(data);
      setIsDirty(false);
      setSaveSuccess('Settings saved successfully.');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setSaveError(err.response?.data?.error || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="p-10 text-center text-gray-500">Loading settings…</p>;
  }
  if (loadError) {
    return <p className="p-10 text-center text-red-500">{loadError}</p>;
  }

  return (
    <div className="max-w-lg mx-auto py-10 px-2">
      <h2 className="text-3xl font-extrabold mb-8 text-cp-blue text-center tracking-tight">
        Platform Settings
      </h2>

      <form
        onSubmit={handleSave}
        className="bg-gradient-to-br from-white to-slate-50 border border-slate-100 shadow-xl rounded-2xl p-8 space-y-5"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 flex items-center justify-center rounded-full bg-cp-blue text-white text-2xl font-bold shadow">
            🏦
          </div>
          <div>
            <h3 className="text-lg font-bold text-cp-blue">Bank Details</h3>
            <div className="text-xs text-gray-500">For platform withdrawals</div>
          </div>
        </div>

        {/* Bank Name */}
        <div>
          <label className="block text-sm font-semibold mb-1 text-cp-indigo">
            Bank Name
          </label>
          <input
            type="text"
            value={form.bankName}
            onChange={e => handleChange('bankName', e.target.value)}
            required
            className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-cp-blue"
            placeholder="e.g. Access Bank"
          />
        </div>

        {/* Account Number */}
        <div>
          <label className="block text-sm font-semibold mb-1 text-cp-indigo">
            Account Number
          </label>
          <input
            type="text"
            value={form.bankAccountNumber}
            onChange={e => handleChange('bankAccountNumber', e.target.value)}
            required
            className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-cp-blue"
            placeholder="e.g. 1234567890"
          />
        </div>

        {/* Account Name */}
        <div>
          <label className="block text-sm font-semibold mb-1 text-cp-indigo">
            Account Name
          </label>
          <input
            type="text"
            value={form.bankAccountName}
            onChange={e => handleChange('bankAccountName', e.target.value)}
            required
            className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-cp-blue"
            placeholder="e.g. ClippaPay Ltd"
          />
        </div>

        {/* Save / Cancel */}
        <div className="flex items-center gap-4 pt-4 border-t mt-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={!isDirty || saving}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isDirty || saving}
            className="px-4 py-2 bg-cp-blue text-white font-semibold rounded-xl shadow hover:bg-cp-indigo transition disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>

        {/* Feedback */}
        {saveError && (
          <p className="mt-3 text-red-600 text-sm">{saveError}</p>
        )}
        {saveSuccess && (
          <p className="mt-3 text-green-600 text-sm">{saveSuccess}</p>
        )}
      </form>
    </div>
  );
}
