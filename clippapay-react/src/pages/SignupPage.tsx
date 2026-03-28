// src/pages/SignupPage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getData } from "country-list";
import { sha256 } from "js-sha256";
import {
  HiVideoCamera,
  HiSpeakerphone,
  HiCheckCircle,
  HiXCircle,
  HiChevronLeft,
  HiExternalLink,
  HiSparkles,
} from "react-icons/hi";

const API_BASE = import.meta.env.VITE_API_URL || "";
const TELEGRAM_BOT_USERNAME = "clippapay";
const TELEGRAM_CHANNEL_LINK = "https://t.me/clippapay";

const countryOptions = getData().sort((a, b) => a.name.localeCompare(b.name));

const CREATOR_TYPES = [
  "Streamer (Twitch, Kick, YouTube Live, etc.)",
  "YouTuber (long-form or Shorts)",
  "TikTok Creator",
  "Instagram Influencer / Content Creator",
  "Podcaster",
  "Musical Artiste (singer, rapper, producer)",
  "Dancer / Choreographer",
  "Comedian / Skit Creator",
  "Actor / Actress",
  "Motivational Speaker",
  "Religious Leader / Spiritual Coach",
  "Event Host / MC",
  "Public Figure / Media Personality",
  "Entrepreneur / Business Owner / Brand",
  "Other (please specify)",
];

type Step = "form" | "otp" | "telegram";

export default function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [telegramChecking, setTelegramChecking] = useState(false);

  const [formData, setFormData] = useState({
    role: "clipper" as "clipper" | "advertiser",
    email: "",
    password: "",
    confirm: "",
    phone: "",
    country: "",
    firstName: "",
    lastName: "",
    contactName: "",
    company: "",
    creatorTypes: [] as string[],
    otherCreatorType: "",
  });

  const [otp, setOtp] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleCreatorType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      creatorTypes: prev.creatorTypes.includes(type)
        ? prev.creatorTypes.filter((t) => t !== type)
        : [...prev.creatorTypes, type],
    }));
  };

  const request = async (endpoint: string, body: any) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong");
    return data;
  };

  const submitSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const finalCreatorTypes = formData.creatorTypes.includes("Other (please specify)")
        ? [...formData.creatorTypes.filter((t) => t !== "Other (please specify)"), formData.otherCreatorType]
        : formData.creatorTypes;

      await request("/auth/signup", {
        ...formData,
        creatorTypes: finalCreatorTypes,
        otherCreatorType: formData.otherCreatorType || "",
      });

      if (window.ttq) {
        const hashedEmail = formData.email ? sha256(formData.email.toLowerCase().trim()) : null;
        const hashedPhone = formData.phone ? sha256(formData.phone.replace(/\D/g, "")) : null;
        window.ttq.identify({ email: hashedEmail, phone_number: hashedPhone });
        window.ttq.track("CompleteRegistration");
      }

      setMessage("OTP sent to your email!");
      setStep("otp");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await request("/auth/verify", { email: formData.email, otp });
      setMessage("Email verified successfully!");
      if (formData.role === "clipper") setStep("telegram");
      else navigate("/login?role=advertiser");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkTelegramStatus = async () => {
    setTelegramChecking(true);
    try {
      const res = await fetch(`${API_BASE}/auth/check-telegram`, { credentials: "include" });
      const data = await res.json();
      if (data.verified) {
        setMessage("Welcome aboard!");
        setTimeout(() => navigate("/dashboard"), 1500);
      } else {
        setTimeout(() => navigate("/login"), 2500);
      }
    } catch {
      setError("Verification failed. Try again.");
    } finally {
      setTelegramChecking(true);
    }
  };

  const encodedPhone = btoa(formData.phone);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-white/90 hover:text-white mb-8 text-sm font-medium"
        >
          <HiChevronLeft className="w-5 h-5" /> Back to Home
        </button>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="p-8 md:p-12 lg:p-16">
            <AnimatePresence mode="wait">

              {/* ====== STEP 1: FORM ====== */}
              {step === "form" && (
                <motion.div key="form" initial={{ opacity: 0, x: -100 }} animate={{ opacity: 1, x: 0 }}>
                  <div className="text-center mb-10">
                    <h1 className="text-4xl font-extrabold mb-3">Join ClippaPay</h1>
                    <p className="text-gray-500">Create your account and start earning or growing your brand</p>
                  </div>

                  {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
                      <HiXCircle className="w-6 h-6 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  {/* Role selector */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    {[
                      { role: "clipper", icon: <HiVideoCamera className="w-8 h-8" />, label: "Creator / Clipper", sub: "Earn money creating & clipping content" },
                      { role: "advertiser", icon: <HiSpeakerphone className="w-8 h-8" />, label: "Brand / Advertiser", sub: "Launch campaigns & get UGC content" },
                    ].map(({ role, icon, label, sub }) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setFormData({ ...formData, role: role as any })}
                        className={`p-6 rounded-2xl border-2 text-left transition-all ${
                          formData.role === role
                            ? "border-purple-600 bg-purple-50"
                            : "border-gray-200 hover:border-purple-300"
                        }`}
                      >
                        <div className={`mb-3 ${formData.role === role ? "text-purple-600" : "text-gray-400"}`}>{icon}</div>
                        <div className="font-bold text-gray-800">{label}</div>
                        <div className="text-sm text-gray-500 mt-1">{sub}</div>
                      </button>
                    ))}
                  </div>

                  <form onSubmit={submitSignup} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <input type="email" name="email" placeholder="Email address" required value={formData.email} onChange={handleChange} className="px-5 py-4 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none col-span-2" />
                    <input type="password" name="password" placeholder="Password" required value={formData.password} onChange={handleChange} className="px-5 py-4 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none" />
                    <input type="password" name="confirm" placeholder="Confirm password" required value={formData.confirm} onChange={handleChange} className="px-5 py-4 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none" />
                    <input type="tel" name="phone" placeholder="Phone number" required value={formData.phone} onChange={handleChange} className="px-5 py-4 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none" />
                    <select name="country" required value={formData.country} onChange={handleChange} className="px-5 py-4 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none bg-white">
                      <option value="">Select country</option>
                      {countryOptions.map((c) => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>

                    {formData.role === "clipper" ? (
                      <>
                        <input type="text" name="firstName" placeholder="First Name" required value={formData.firstName} onChange={handleChange} className="px-5 py-4 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none" />
                        <input type="text" name="lastName" placeholder="Last Name" required value={formData.lastName} onChange={handleChange} className="px-5 py-4 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none" />
                      </>
                    ) : (
                      <>
                        <input type="text" name="contactName" placeholder="Contact Person Name" required value={formData.contactName} onChange={handleChange} className="px-5 py-4 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none" />
                        <input type="text" name="company" placeholder="Company / Brand (optional)" value={formData.company} onChange={handleChange} className="px-5 py-4 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none" />
                        <div className="col-span-2">
                          <p className="text-sm font-medium text-gray-700 mb-3">Preferred Creator Types (select all that apply)</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-4 bg-gray-50 rounded-xl">
                            {CREATOR_TYPES.map((type) => (
                              <label key={type} className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={formData.creatorTypes.includes(type)} onChange={() => toggleCreatorType(type)} className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500" />
                                <span className="text-sm text-gray-700">{type}</span>
                              </label>
                            ))}
                          </div>
                          {formData.creatorTypes.includes("Other (please specify)") && (
                            <input type="text" placeholder="Specify other creator type..." value={formData.otherCreatorType} onChange={(e) => setFormData({ ...formData, otherCreatorType: e.target.value })} className="mt-4 w-full px-5 py-4 rounded-xl border border-gray-300 focus:border-purple-500" required />
                          )}
                        </div>
                      </>
                    )}

                    <button type="submit" disabled={loading} className="col-span-2 w-full py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition disabled:opacity-70">
                      {loading ? "Creating Account..." : "Continue →"}
                    </button>

                    {/* ── Terms & Privacy — required for Play Store / App Store compliance ── */}
                    <p className="col-span-2 text-xs text-center text-gray-400 leading-relaxed mt-2">
                      By signing up, you agree to our{' '}
                      <Link to="/terms" className="text-purple-600 hover:underline font-medium">Terms of Service</Link>
                      {' '}and{' '}
                      <Link to="/privacy" className="text-purple-600 hover:underline font-medium">Privacy Policy</Link>
                    </p>
                  </form>

                  <p className="mt-6 text-sm text-center text-gray-500">
                    Already have an account?{' '}
                    <Link to="/login" className="text-purple-600 font-semibold hover:underline">Log in</Link>
                  </p>
                </motion.div>
              )}

              {/* ====== STEP 2: OTP ====== */}
              {step === "otp" && (
                <motion.div key="otp" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} className="max-w-md mx-auto text-center">
                  <HiSparkles className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
                  <h2 className="text-3xl font-bold mb-4">Check Your Email</h2>
                  <p className="text-gray-600 mb-8">We sent a 6-digit code to <span className="font-bold">{formData.email}</span></p>

                  {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">{error}</div>}
                  {message && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center justify-center gap-2">
                      <HiCheckCircle className="w-6 h-6" />{message}
                    </div>
                  )}

                  <form onSubmit={submitOtp} className="space-y-6">
                    <input type="text" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="000000" className="w-full text-4xl text-center tracking-widest font-bold py-6 rounded-2xl border-2 border-gray-300 focus:border-purple-600 outline-none" required />
                    <button type="submit" disabled={loading} className="w-full py-5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition">
                      {loading ? "Verifying..." : "Verify Email"}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ====== STEP 3: TELEGRAM ====== */}
              {step === "telegram" && (
                <motion.div key="telegram" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg mx-auto text-center py-12">
                  <div className="text-8xl mb-8">Telegram</div>
                  <h2 className="text-3xl font-bold mb-6">One Last Step, Clipper!</h2>
                  <p className="text-lg text-gray-700 mb-10">Join our Telegram channel to get instant campaign alerts and prove you're real</p>

                  <div className="space-y-6">
                    <a href={`https://t.me/${TELEGRAM_BOT_USERNAME}?start=${encodedPhone}`} target="_blank" rel="noopener noreferrer" className="block w-full py-5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-xl rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition flex items-center justify-center gap-3">
                      <HiExternalLink className="w-7 h-7" />
                      Open Telegram &amp; Join Now
                    </a>
                    <p className="text-sm text-gray-500">After tapping <strong>/start or Join Channel</strong> in the bot, come back here</p>
                    <button onClick={checkTelegramStatus} disabled={telegramChecking} className="w-full py-4 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-900 transition disabled:opacity-60">
                      {telegramChecking ? "Checking..." : "I've Joined → Verify Me"}
                    </button>
                    {error && <p className="text-red-600 font-medium flex items-center justify-center gap-2"><HiXCircle className="w-6 h-6" />{error}</p>}
                    {message && !error && <p className="text-green-600 font-bold text-xl flex items-center justify-center gap-3"><HiCheckCircle className="w-8 h-8" />{message}</p>}
                  </div>

                  <div className="mt-10 p-6 bg-blue-50 rounded-2xl">
                    <p className="text-sm text-gray-700"><strong>Pro Tip:</strong> Stay in the channel to never miss high-paying campaigns!</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}