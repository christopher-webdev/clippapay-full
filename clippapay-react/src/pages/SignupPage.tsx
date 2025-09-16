import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getData } from "country-list";
import {
  HiVideoCamera,
  HiPhotograph,
  HiTrendingUp,
  HiCash,
  HiSpeakerphone,
  HiShieldCheck,
  HiBadgeCheck,
} from "react-icons/hi";

// Import for SHA-256 hashing (you may need to install a library like js-sha256)
import { sha256 } from 'js-sha256';

const API_BASE = import.meta.env.VITE_API_URL || "";

// grab & sort ISO country list
const countryOptions = getData().sort((a, b) => a.name.localeCompare(b.name));

// Creator types for advertisers to select
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
  "Other (please specify)"
];

// ---- New: small role explainer card ----
function RoleInfo({ role }: { role: "clipper" | "advertiser" }) {
  const variants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
  };

  if (role === "clipper") {
    return (
      <motion.div
        key="clipper-info"
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="mt-3 rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-4"
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-xl bg-purple-600/10 p-2">
            <HiVideoCamera className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-800">Sign up as a Clipper</h4>
            <p className="mt-1 text-sm text-gray-600">
              You create and post short clips for active campaigns, then submit proof links or media.
              When your views are verified, you get paid automatically.
            </p>
            <ul className="mt-3 grid gap-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <HiBadgeCheck className="h-5 w-5 text-green-600" />
                Join campaigns across TikTok, Instagram, YouTube, Facebook, and X.
              </li>
              <li className="flex items-center gap-2">
                <HiTrendingUp className="h-5 w-5 text-indigo-600" />
                Earn per 1,000 verified views (CPM). Higher quality = better approval rate.
              </li>
              <li className="flex items-center gap-2">
                <HiCash className="h-5 w-5 text-emerald-600" />
                Instant wallet credit on approval; withdraw when you’re ready.
              </li>
            </ul>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="advertiser-info"
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="mt-3 rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-xl bg-sky-600/10 p-2">
          <HiSpeakerphone className="h-6 w-6 text-sky-600" />
        </div>
        <div>
          <h4 className="font-semibold text-gray-800">Sign up as an Advertiser</h4>
          <p className="mt-1 text-sm text-gray-600">
            You create campaigns and set budgets/targets. Clippers post content that drives views; you pay only for verified results.
          </p>
          <ul className="mt-3 grid gap-2 text-sm text-gray-700">
            <li className="flex items-center gap-2">
              <HiShieldCheck className="h-5 w-5 text-green-600" />
              Funds are escrowed and released only after verification.
            </li>
            <li className="flex items-center gap-2">
              <HiPhotograph className="h-5 w-5 text-indigo-600" />
              Run standard or UGC-style briefs with assets, captions, and deadlines.
            </li>
            <li className="flex items-center gap-2">
              <HiTrendingUp className="h-5 w-5 text-rose-600" />
              Track remaining views & budget in real time; scale what’s working.
            </li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [formData, setFormData] = useState({
    role: "clipper",
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
    otherCreatorType: ""
  });
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreatorTypeChange = (creatorType: string) => {
    setFormData(prev => {
      if (prev.creatorTypes.includes(creatorType)) {
        return {
          ...prev,
          creatorTypes: prev.creatorTypes.filter(type => type !== creatorType)
        };
      } else {
        return {
          ...prev,
          creatorTypes: [...prev.creatorTypes, creatorType]
        };
      }
    });
  };

  const handleOtherCreatorTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, otherCreatorType: e.target.value });
  };

  async function request(endpoint: string, body: any) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message);
    return data;
  }

  const submitSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const isOtherSelected = formData.creatorTypes.includes("Other (please specify)");

      // Prepare the creatorTypes array
      const finalCreatorTypes = isOtherSelected
        ? [
          ...formData.creatorTypes.filter(type => type !== "Other (please specify)"),
          formData.otherCreatorType
        ]
        : formData.creatorTypes;

      const data = await request("/auth/signup", {
        ...formData,
        creatorTypes: finalCreatorTypes,
        otherCreatorType: formData.otherCreatorType
      });

      // TikTok Pixel: Track CompleteRegistration event
      if (window.ttq) {
        // Hash email and phone for TikTok Pixel
        const hashedEmail = formData.email ? sha256(formData.email.toLowerCase().trim()) : undefined;
        const hashedPhone = formData.phone ? sha256(formData.phone.replace(/\D/g, '')) : undefined;

        // Identify the user
        window.ttq.identify({
          email: hashedEmail,
          phone_number: hashedPhone,
        });

        // Track the CompleteRegistration event
        window.ttq.track('CompleteRegistration', {
          value: 0, // Adjust value if needed (e.g., based on signup value)
          currency: "USD",
          contents: [
            {
              content_id: "signup",
              content_type: "product",
              content_name: "User Signup"
            }
          ]
        });
      }

      setMessage(data.message);
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
    setMessage(null);
    setLoading(true);
    try {
      const data = await request("/auth/verify", {
        email: formData.email,
        otp,
      });
      setMessage(data.message);
      navigate(
        formData.role === "clipper"
          ? "/login?role=clipper"
          : "/login?role=advertiser"
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-8">
          {/* Back to Home */}
          <div className="mb-4">
            <button
              onClick={() => navigate("/")}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition flex items-center gap-1 mb-2"
            >
              ← Back to Home
            </button>
          </div>

          {step === "form" ? (
            <>
              <h2 className="text-3xl font-bold text-gray-800 text-center mb-6">
                Create Your Account
              </h2>
              {error && (
                <p className="text-red-600 mb-4 text-center">{error}</p>
              )}
              <form onSubmit={submitSignup} className="space-y-4">
                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Signing up as
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option value="clipper">Clipper</option>
                    <option value="advertiser">Advertiser</option>
                  </select>

                  {/* New: Role explainer appears here */}
                  <AnimatePresence mode="wait">
                    <RoleInfo role={formData.role as "clipper" | "advertiser"} />
                  </AnimatePresence>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    placeholder="you@example.com"
                  />
                </div>

                {/* Passwords */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Confirm
                    </label>
                    <input
                      type="password"
                      name="confirm"
                      value={formData.confirm}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    placeholder="+234 800 0000 000"
                  />
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Country
                  </label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  >
                    <option value="">Select Country</option>
                    {countryOptions.map(({ code, name }) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Conditional Fields */}
                {formData.role === "clipper" ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        First Name
                      </label>
                      <input
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Last Name
                      </label>
                      <input
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                        placeholder="Doe"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Contact Name
                      </label>
                      <input
                        name="contactName"
                        value={formData.contactName}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                        placeholder="Jane Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Company (optional)
                      </label>
                      <input
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                        placeholder="Acme Corp"
                      />
                    </div>

                    {/* Creator Types Selection (only for advertisers) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preferred Creator Types (select all that apply)
                      </label>
                      <div className="space-y-2 max-h-60 overflow-y-auto p-2 border rounded-lg">
                        {CREATOR_TYPES.map((type) => (
                          <div key={type} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`creator-type-${type}`}
                              checked={formData.creatorTypes.includes(type)}
                              onChange={() => handleCreatorTypeChange(type)}
                              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            />
                            <label htmlFor={`creator-type-${type}`} className="ml-2 text-sm text-gray-700">
                              {type}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Other Creator Type Specification */}
                    {formData.creatorTypes.includes("Other (please specify)") && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Please specify other creator type
                        </label>
                        <input
                          name="otherCreatorType"
                          value={formData.otherCreatorType}
                          onChange={handleOtherCreatorTypeChange}
                          required
                          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                          placeholder="Enter creator type"
                        />
                      </div>
                    )}
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow hover:bg-purple-700 transition"
                >
                  {loading ? "Sending OTP…" : "Sign Up"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-gray-800 text-center mb-6">
                Verify Your Account
              </h2>
              {message && (
                <p className="text-green-600 mb-2 text-center">{message}</p>
              )}
              {error && (
                <p className="text-red-600 mb-2 text-center">{error}</p>
              )}
              <form onSubmit={submitOtp} className="space-y-4">
                <input
                  name="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                  className="w-full text-center text-xl font-medium tracking-widest mt-1 block rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                  placeholder="Enter 6-digit code"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg shadow hover:bg-green-700 transition"
                >
                  {loading ? "Verifying…" : "Verify"}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}