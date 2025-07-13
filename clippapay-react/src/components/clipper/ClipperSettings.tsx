import React, { useEffect, useState, FormEvent } from 'react';
import axios from 'axios';

interface Profile {
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  email: string;
}

export default function ClipperSettings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<Profile>({
    firstName: '',
    lastName: '',
    phone: '',
    country: '',
    email: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Change password state
  const [cpw, setCpw] = useState('');
  const [npw, setNpw] = useState('');
  const [cpw2, setCpw2] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');

  // Load profile
  useEffect(() => {
    setLoading(true);
    axios.get<Profile>('/user/me')
      .then(res => {
        setProfile(res.data);
        setForm(res.data);
      })
      .catch(() => setErrorMsg('Failed to load profile.'))
      .finally(() => setLoading(false));
  }, []);

  // Update form
  const handleChange = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setForm(f => ({ ...f, [key]: value }));
  };

  // Save profile
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true); setSuccessMsg(''); setErrorMsg('');
    try {
      await axios.patch('/user/me', {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        country: form.country,
      });
      setSuccessMsg('Profile updated.');
      setProfile({ ...profile!, ...form });
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwSaving(true);
    setPwMsg('');
    if (npw.length < 6) {
      setPwMsg('New password must be at least 6 characters.');
      setPwSaving(false);
      return;
    }
    if (npw !== cpw2) {
      setPwMsg('Passwords do not match.');
      setPwSaving(false);
      return;
    }
    try {
      await axios.post('/user/change-password', { oldPassword: cpw, newPassword: npw });
      setPwMsg('Password changed.');
      setCpw(''); setNpw(''); setCpw2('');
    } catch (err: any) {
      setPwMsg(err.response?.data?.error || 'Change password failed.');
    } finally {
      setPwSaving(false);
    }
  };

  // Delete account
  const handleDelete = async () => {
    if (!window.confirm('Are you sure? This cannot be undone.')) return;
    try {
      await axios.delete('/user/me');
      alert('Account deleted. Goodbye!');
      window.location.href = '/'; // or log out user, etc.
    } catch {
      alert('Failed to delete account.');
    }
  };

  if (loading) return <p className="text-center py-10">Loading profile…</p>;

  return (
    <div className="max-w-xl mx-auto space-y-10 px-2 py-10">
      <h2 className="text-3xl font-extrabold mb-8 text-cp-blue text-center tracking-tight">
        Account Settings
      </h2>

      {errorMsg && (
        <div className="mb-3 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold shadow-sm animate-pulse">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="mb-3 px-4 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 font-semibold shadow-sm animate-fadeIn">
          {successMsg}
        </div>
      )}

      {/* Profile Edit Card */}
      <form onSubmit={handleSave} className="bg-gradient-to-br from-white to-slate-50 border border-slate-100 shadow-xl rounded-2xl p-8 space-y-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 flex items-center justify-center rounded-full bg-cp-blue text-white text-2xl font-bold shadow">
            👤
          </div>
          <div>
            <h3 className="text-lg font-semibold text-cp-blue">Profile Info</h3>
            <p className="text-xs text-gray-400">Update your details</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1 text-cp-indigo">First Name</label>
            <input
              className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-cp-blue"
              type="text"
              value={form.firstName}
              onChange={e => handleChange('firstName', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-cp-indigo">Last Name</label>
            <input
              className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-cp-blue"
              type="text"
              value={form.lastName}
              onChange={e => handleChange('lastName', e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1 text-cp-indigo">Phone</label>
          <input
            className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-cp-blue"
            type="text"
            value={form.phone}
            onChange={e => handleChange('phone', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1 text-cp-indigo">Country</label>
          <input
            className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-cp-blue"
            type="text"
            value={form.country}
            onChange={e => handleChange('country', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1 text-cp-indigo">Email</label>
          <input
            className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-gray-100 text-gray-500 cursor-not-allowed"
            type="email"
            value={form.email}
            disabled
            readOnly
          />
        </div>
        <div className="flex justify-end pt-5 border-t mt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-cp-blue text-white font-semibold rounded-xl shadow hover:bg-cp-indigo transition disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Change Password */}
      <form
        onSubmit={handleChangePassword}
        className="bg-gradient-to-br from-white to-slate-50 border border-slate-100 shadow-xl rounded-2xl p-8 space-y-5"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 flex items-center justify-center rounded-full bg-cp-indigo text-white text-2xl font-bold shadow">
            🔒
          </div>
          <div>
            <h3 className="text-lg font-semibold text-cp-indigo">Change Password</h3>
            <p className="text-xs text-gray-400">For your account security</p>
          </div>
        </div>
        {pwMsg && (
          <div className={`mb-2 px-4 py-2 rounded-xl ${pwMsg.includes('changed') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'} font-semibold shadow-sm`}>
            {pwMsg}
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold mb-1 text-cp-indigo">Current Password</label>
          <input
            className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-cp-indigo"
            type="password"
            value={cpw}
            onChange={e => setCpw(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1 text-cp-indigo">New Password</label>
            <input
              className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-cp-indigo"
              type="password"
              value={npw}
              onChange={e => setNpw(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-cp-indigo">Confirm New Password</label>
            <input
              className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-cp-indigo"
              type="password"
              value={cpw2}
              onChange={e => setCpw2(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
        </div>
        <div className="flex justify-end pt-5 border-t mt-4">
          <button
            type="submit"
            disabled={pwSaving}
            className="px-6 py-2 bg-cp-indigo text-white font-semibold rounded-xl shadow hover:bg-cp-blue transition disabled:opacity-60"
          >
            {pwSaving ? 'Saving…' : 'Change Password'}
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="bg-gradient-to-br from-white to-red-50 border border-red-100 shadow-xl rounded-2xl p-8 space-y-5 border-l-4 border-red-600">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-600 text-white text-xl flex items-center justify-center font-bold shadow">
            ⚠️
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-600">Danger Zone</h3>
            <p className="text-xs text-red-500">This action is irreversible</p>
          </div>
        </div>
        <p className="text-gray-700 text-sm">
          Permanently delete your account. This cannot be undone.
        </p>
        <button
          onClick={handleDelete}
          className="px-6 py-2 bg-red-600 text-white font-semibold rounded-xl shadow hover:bg-red-700 transition"
        >
          Delete My Account
        </button>
      </div>
    </div>
  );
}
