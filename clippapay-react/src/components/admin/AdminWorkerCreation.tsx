// File: src/components/admin/AdminWorkerCreation.tsx

import React, { useState } from 'react';
import axios from 'axios';

export default function AdminWorkerCreation() {
  // Super-Admin login fields
  const [superEmail, setSuperEmail] = useState('');
  const [superPassword, setSuperPassword] = useState('');

  // New worker fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSuper, setIsSuper] = useState(false);

  // Feedback
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    // Basic validation
    if (password !== confirm) {
      setError('Worker passwords must match.');
      return;
    }

    try {
      // 1) Verify Super-Admin credentials
      const loginRes = await axios.post('/admin/login', {
        email: superEmail,
        password: superPassword
      });

      const token = loginRes.data.token;
      if (!token) {
        throw new Error('Failed to retrieve token from login.');
      }

      // 2) Use that token to create the worker
      const prevHeader = axios.defaults.headers.common['Authorization'];
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      const { data } = await axios.post('/api/admin/workers', {
        email,
        password,
        confirm,
        isSuperAdmin: isSuper
      });

      // 3) Restore previous Auth header (if any)
      if (prevHeader) {
        axios.defaults.headers.common['Authorization'] = prevHeader;
      } else {
        delete axios.defaults.headers.common['Authorization'];
      }

      // Success feedback
      setMessage(`Worker created: ${data.user.email}`);
      setEmail('');
      setPassword('');
      setConfirm('');
      setIsSuper(false);
      setSuperEmail('');
      setSuperPassword('');
    } catch (err: any) {
      // Cleanup Auth header on error too
      delete axios.defaults.headers.common['Authorization'];
      setError(
        err.response?.data?.error ||
        err.message ||
        'Failed to create worker.'
      );
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white shadow rounded">
      <h2 className="text-2xl font-bold mb-4">Create Admin Worker</h2>

      {message && <p className="text-green-600 mb-2">{message}</p>}
      {error   && <p className="text-red-500 mb-2">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Super-Admin Authentication */}
        <fieldset className="border rounded p-4">
          <legend className="font-semibold">Super-Admin Login</legend>
          <div className="mt-2 space-y-4">
            <div>
              <label className="block mb-1">Email</label>
              <input
                type="email"
                className="w-full border px-3 py-2 rounded"
                value={superEmail}
                onChange={e => setSuperEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block mb-1">Password</label>
              <input
                type="password"
                className="w-full border px-3 py-2 rounded"
                value={superPassword}
                onChange={e => setSuperPassword(e.target.value)}
                required
              />
            </div>
          </div>
        </fieldset>

        {/* New Worker Details */}
        <fieldset className="border rounded p-4">
          <legend className="font-semibold">New Worker Details</legend>
          <div className="mt-2 space-y-4">
            <div>
              <label className="block mb-1">Email</label>
              <input
                type="email"
                className="w-full border px-3 py-2 rounded"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block mb-1">Password</label>
              <input
                type="password"
                className="w-full border px-3 py-2 rounded"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block mb-1">Confirm Password</label>
              <input
                type="password"
                className="w-full border px-3 py-2 rounded"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center">
              <input
                id="super"
                type="checkbox"
                className="mr-2"
                checked={isSuper}
                onChange={e => setIsSuper(e.target.checked)}
              />
              <label htmlFor="super">Grant Super-Admin</label>
            </div>
          </div>
        </fieldset>

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
        >
          Create Worker
        </button>
      </form>
    </div>
  );
}
