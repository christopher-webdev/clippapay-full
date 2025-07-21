import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function parseJwt(token: string) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'login' | 'otp'>('login');
  const [otp, setOtp] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const togglePassword = () => setShowPassword(prev => !prev);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email.toLowerCase(),
          password: credentials.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.notVerified) {
          setStep('otp');
          setError(data.error || 'Account not verified.');
          return;
        }
        throw new Error(data.error || data.message || 'Login failed');
      }

      localStorage.setItem('token', data.token);
      axios.defaults.baseURL = API_BASE;
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

      const decoded = parseJwt(data.token);
      const role = decoded?.role;
      if (role === 'clipper') {
        navigate('/dashboard/clipper');
      } else if (role === 'advertiser') {
        navigate('/dashboard/advertiser');
      } else if (role === 'ad-worker') {
        navigate('/dashboard/ad-worker');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email.toLowerCase(),
          otp,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      // Retry login after verification
      await login(e);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl relative">
        <Link
          to="/"
          className="absolute top-4 right-4 text-sm text-indigo-600 font-semibold hover:underline"
        >
          ← Go to Homepage
        </Link>

        <h2 className="text-3xl font-extrabold text-center text-gray-800 mb-6">
          {step === 'login' ? 'Welcome Back 👋' : 'Verify Your Account'}
        </h2>

        {error && <p className="text-red-600 text-sm mb-4 text-center">{error}</p>}

        {step === 'login' ? (
          <form onSubmit={login} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={credentials.email}
                onChange={handleChange}
                required
                className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={credentials.password}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={togglePassword}
                  className="absolute inset-y-0 right-3 flex items-center text-sm text-gray-500 hover:text-indigo-500"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="text-right text-sm">
              <Link
                to="/forgot-password"
                className="text-indigo-600 hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-md font-semibold hover:bg-indigo-700 transition disabled:opacity-60"
            >
              {loading ? 'Logging in…' : 'Log In'}
            </button>
          </form>
        ) : (
          <form onSubmit={submitOtp} className="space-y-5">
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
              Enter the OTP sent to your email
            </label>
            <input
              id="otp"
              name="otp"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="6-digit code"
            />
            <button
              type="submit"
              className="w-full bg-green-600 text-white py-3 rounded-md font-semibold hover:bg-green-700 transition"
              disabled={loading}
            >
              {loading ? 'Verifying…' : 'Verify & Log In'}
            </button>
          </form>
        )}

        {step === 'login' && (
          <p className="mt-6 text-sm text-center text-gray-600">
            Don't have an account?{' '}
            <Link to="/signup" className="text-indigo-600 font-medium hover:underline">
              Sign up
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
