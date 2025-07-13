import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

export default function SettingsPanel() {
  // Profile info state
  const [companyName, setCompanyName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Password change state
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load profile
  useEffect(() => {
    setProfileLoading(true);
    axios.get('/user/me')
      .then(res => {
        setCompanyName(res.data.company || '');
        setContactEmail(res.data.email || '');
        setProfileLoading(false);
      })
      .catch(err => {
        setProfileError(err.response?.data?.error || 'Failed to load profile.');
        setProfileLoading(false);
      });
  }, []);

  // Save profile
  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileMsg(null);
    try {
      await axios.patch('/user/me', {
        company: companyName,
        // Do not PATCH email unless you want to support email change
      });
      setProfileMsg('Profile updated successfully.');
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (err: any) {
      setProfileError(err.response?.data?.error || 'Failed to update profile.');
    }
  };

  // Change password
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    setPwdError(null);

    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdError('All fields are required.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError("New passwords don't match.");
      return;
    }
    setPwdLoading(true);
    try {
      await axios.post('/user/change-password', {
        oldPassword: currentPwd,
        newPassword: newPwd,
      });
      setPwdMsg('Password changed successfully.');
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setTimeout(() => setPwdMsg(null), 3000);
    } catch (err: any) {
      setPwdError(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setPwdLoading(false);
    }
  };

  // Delete account
  const handleDeleteAccount = async () => {
    setDeleteMsg(null);
    if (deleteInput !== 'DELETE') {
      setDeleteMsg('Type DELETE to confirm.');
      return;
    }
    setDeleting(true);
    try {
      await axios.delete('/user/me');
      alert('Your account has been deleted.');
      window.location.href = '/';
    } catch (err: any) {
      setDeleteMsg(err.response?.data?.error || 'Failed to delete account.');
    }
    setDeleting(false);
  };

   return (
    <div className="max-w-2xl mx-auto py-10 space-y-12">
      {/* PROFILE SECTION */}
      <section className="relative overflow-hidden rounded-2xl shadow-2xl bg-gradient-to-br from-white to-slate-50 p-8 border border-slate-100 ring-1 ring-slate-200/60">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cp-blue to-cp-indigo text-white flex items-center justify-center text-2xl font-bold shadow-md">
            <span role="img" aria-label="profile">👤</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-cp-blue">Profile Settings</h2>
            <p className="text-xs text-slate-500">Update your business info</p>
          </div>
        </div>
        {profileMsg && <p className="mb-4 text-green-700 font-medium">{profileMsg}</p>}
        {profileError && <p className="mb-4 text-red-600">{profileError}</p>}
        {profileLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-cp-blue border-t-transparent animate-spin rounded-full"></div>
            <span className="text-gray-400">Loading…</span>
          </div>
        ) : (
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-cp-indigo mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-cp-blue focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-cp-indigo mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                disabled
                className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-100 text-gray-500"
              />
            </div>
            <button
              type="submit"
              className="mt-2 px-6 py-2 rounded-xl bg-cp-blue hover:bg-cp-indigo transition text-white font-semibold shadow-lg"
            >
              Save Profile
            </button>
          </form>
        )}
      </section>

      {/* PASSWORD SECTION */}
      <section className="relative overflow-hidden rounded-2xl shadow-2xl bg-gradient-to-br from-white to-slate-50 p-8 border border-slate-100 ring-1 ring-slate-200/60">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cp-indigo to-cp-blue text-white flex items-center justify-center text-2xl font-bold shadow-md">
            <span role="img" aria-label="lock">🔒</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-cp-indigo">Change Password</h2>
            <p className="text-xs text-slate-500">Keep your account secure</p>
          </div>
        </div>
        {pwdMsg && <p className="mb-4 text-green-700 font-medium">{pwdMsg}</p>}
        {pwdError && <p className="mb-4 text-red-600">{pwdError}</p>}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-cp-indigo mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-cp-indigo transition"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-cp-indigo mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-cp-indigo transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-cp-indigo mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-cp-indigo transition"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={pwdLoading}
            className="mt-2 px-6 py-2 rounded-xl bg-cp-indigo hover:bg-cp-blue transition text-white font-semibold shadow-lg disabled:opacity-60"
          >
            {pwdLoading ? 'Saving…' : 'Change Password'}
          </button>
        </form>
      </section>

      {/* DANGER ZONE */}
      <section className="relative overflow-hidden rounded-2xl shadow-xl bg-gradient-to-br from-white to-red-50 p-8 border border-red-100 ring-1 ring-red-200/60">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-red-600 text-white flex items-center justify-center text-2xl font-bold shadow-md">
            <span role="img" aria-label="danger">⚠️</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-red-600">Danger Zone</h2>
            <p className="text-xs text-red-400">Permanent action</p>
          </div>
        </div>
        <p className="text-sm text-red-700 mb-4 font-semibold">
          This action is irreversible. All your data will be <span className="underline">permanently removed</span>.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-6 py-2 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 shadow-lg transition-all"
        >
          Delete My Account
        </button>
      </section>

      {/* DELETE MODAL */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur"
          >
            <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl space-y-5">
              <h3 className="text-lg font-semibold text-red-600 mb-2">
                Confirm Account Deletion
              </h3>
              {deleteMsg && (
                <p className="text-sm text-red-600">{deleteMsg}</p>
              )}
              <p className="text-sm text-gray-700">
                Type <span className="font-bold text-red-600">DELETE</span> below to confirm.
              </p>
              <input
                type="text"
                value={deleteInput}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setDeleteInput(e.target.value)
                }
                disabled={deleting}
                className="mt-1 block w-full rounded-xl border border-red-400 focus:ring-2 focus:ring-red-500 transition"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  disabled={deleting}
                >
                  {deleting ? 'Deleting…' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}