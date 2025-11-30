// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { motion, AnimatePresence } from "framer-motion";
// import { getData } from "country-list";
// import {
//   HiVideoCamera,
//   HiPhotograph,
//   HiTrendingUp,
//   HiCash,
//   HiSpeakerphone,
//   HiShieldCheck,
//   HiBadgeCheck,
// } from "react-icons/hi";

// // Import for SHA-256 hashing (you may need to install a library like js-sha256)
// import { sha256 } from 'js-sha256';

// const API_BASE = import.meta.env.VITE_API_URL || "";

// // grab & sort ISO country list
// const countryOptions = getData().sort((a, b) => a.name.localeCompare(b.name));

// // Creator types for advertisers to select
// const CREATOR_TYPES = [
//   "Streamer (Twitch, Kick, YouTube Live, etc.)",
//   "YouTuber (long-form or Shorts)",
//   "TikTok Creator",
//   "Instagram Influencer / Content Creator",
//   "Podcaster",
//   "Musical Artiste (singer, rapper, producer)",
//   "Dancer / Choreographer",
//   "Comedian / Skit Creator",
//   "Actor / Actress",
//   "Motivational Speaker",
//   "Religious Leader / Spiritual Coach",
//   "Event Host / MC",
//   "Public Figure / Media Personality",
//   "Entrepreneur / Business Owner / Brand",
//   "Other (please specify)"
// ];

// // ---- New: small role explainer card ----
// function RoleInfo({ role }: { role: "clipper" | "advertiser" }) {
//   const variants = {
//     initial: { opacity: 0, y: 8 },
//     animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
//     exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
//   };

//   if (role === "clipper") {
//     return (
//       <motion.div
//         key="clipper-info"
//         variants={variants}
//         initial="initial"
//         animate="animate"
//         exit="exit"
//         className="mt-3 rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-4"
//       >
//         <div className="flex items-start gap-3">
//           <div className="shrink-0 rounded-xl bg-purple-600/10 p-2">
//             <HiVideoCamera className="h-6 w-6 text-purple-600" />
//           </div>
//           <div>
//             <h4 className="font-semibold text-gray-800">Sign up as a Clipper</h4>
//             <p className="mt-1 text-sm text-gray-600">
//               You create and post short clips for active campaigns, then submit proof links or media.
//               When your views are verified, you get paid automatically.
//             </p>
//             <ul className="mt-3 grid gap-2 text-sm text-gray-700">
//               <li className="flex items-center gap-2">
//                 <HiBadgeCheck className="h-5 w-5 text-green-600" />
//                 Join campaigns across TikTok, Instagram, YouTube, Facebook, and X.
//               </li>
//               <li className="flex items-center gap-2">
//                 <HiTrendingUp className="h-5 w-5 text-indigo-600" />
//                 Earn per 1,000 verified views (CPM). Higher quality = better approval rate.
//               </li>
//               <li className="flex items-center gap-2">
//                 <HiCash className="h-5 w-5 text-emerald-600" />
//                 Instant wallet credit on approval; withdraw when you’re ready.
//               </li>
//             </ul>
//           </div>
//         </div>
//       </motion.div>
//     );
//   }

//   return (
//     <motion.div
//       key="advertiser-info"
//       variants={variants}
//       initial="initial"
//       animate="animate"
//       exit="exit"
//       className="mt-3 rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4"
//     >
//       <div className="flex items-start gap-3">
//         <div className="shrink-0 rounded-xl bg-sky-600/10 p-2">
//           <HiSpeakerphone className="h-6 w-6 text-sky-600" />
//         </div>
//         <div>
//           <h4 className="font-semibold text-gray-800">Sign up as an Advertiser</h4>
//           <p className="mt-1 text-sm text-gray-600">
//             You create campaigns and set budgets/targets. Clippers post content that drives views; you pay only for verified results.
//           </p>
//           <ul className="mt-3 grid gap-2 text-sm text-gray-700">
//             <li className="flex items-center gap-2">
//               <HiShieldCheck className="h-5 w-5 text-green-600" />
//               Funds are escrowed and released only after verification.
//             </li>
//             <li className="flex items-center gap-2">
//               <HiPhotograph className="h-5 w-5 text-indigo-600" />
//               Run standard or UGC-style briefs with assets, captions, and deadlines.
//             </li>
//             <li className="flex items-center gap-2">
//               <HiTrendingUp className="h-5 w-5 text-rose-600" />
//               Track remaining views & budget in real time; scale what’s working.
//             </li>
//           </ul>
//         </div>
//       </div>
//     </motion.div>
//   );
// }

// export default function SignupPage() {
//   const navigate = useNavigate();
//   const [step, setStep] = useState<"form" | "otp">("form");
//   const [formData, setFormData] = useState({
//     role: "clipper",
//     email: "",
//     password: "",
//     confirm: "",
//     phone: "",
//     country: "",
//     firstName: "",
//     lastName: "",
//     contactName: "",
//     company: "",
//     creatorTypes: [] as string[],
//     otherCreatorType: ""
//   });
//   const [otp, setOtp] = useState("");
//   const [error, setError] = useState<string | null>(null);
//   const [message, setMessage] = useState<string | null>(null);
//   const [loading, setLoading] = useState(false);

//   const handleChange = (
//     e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
//   ) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };

//   const handleCreatorTypeChange = (creatorType: string) => {
//     setFormData(prev => {
//       if (prev.creatorTypes.includes(creatorType)) {
//         return {
//           ...prev,
//           creatorTypes: prev.creatorTypes.filter(type => type !== creatorType)
//         };
//       } else {
//         return {
//           ...prev,
//           creatorTypes: [...prev.creatorTypes, creatorType]
//         };
//       }
//     });
//   };

//   const handleOtherCreatorTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setFormData({ ...formData, otherCreatorType: e.target.value });
//   };

//   async function request(endpoint: string, body: any) {
//     const res = await fetch(`${API_BASE}${endpoint}`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(body),
//     });
//     const data = await res.json();
//     if (!res.ok) throw new Error(data.error || data.message);
//     return data;
//   }

//   const submitSignup = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError(null);
//     setMessage(null);
//     setLoading(true);

//     try {
//       const isOtherSelected = formData.creatorTypes.includes("Other (please specify)");

//       // Prepare the creatorTypes array
//       const finalCreatorTypes = isOtherSelected
//         ? [
//           ...formData.creatorTypes.filter(type => type !== "Other (please specify)"),
//           formData.otherCreatorType
//         ]
//         : formData.creatorTypes;

//       const data = await request("/auth/signup", {
//         ...formData,
//         creatorTypes: finalCreatorTypes,
//         otherCreatorType: formData.otherCreatorType
//       });

//       // TikTok Pixel: Track CompleteRegistration event
//       if (window.ttq) {
//         // Hash email and phone for TikTok Pixel
//         const hashedEmail = formData.email ? sha256(formData.email.toLowerCase().trim()) : undefined;
//         const hashedPhone = formData.phone ? sha256(formData.phone.replace(/\D/g, '')) : undefined;

//         // Identify the user
//         window.ttq.identify({
//           email: hashedEmail,
//           phone_number: hashedPhone,
//         });

//         // Track the CompleteRegistration event
//         window.ttq.track('CompleteRegistration', {
//           value: 0, // Adjust value if needed (e.g., based on signup value)
//           currency: "USD",
//           contents: [
//             {
//               content_id: "signup",
//               content_type: "product",
//               content_name: "User Signup"
//             }
//           ]
//         });
//       }

//       setMessage(data.message);
//       setStep("otp");
//     } catch (err: any) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const submitOtp = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError(null);
//     setMessage(null);
//     setLoading(true);
//     try {
//       const data = await request("/auth/verify", {
//         email: formData.email,
//         otp,
//       });
//       setMessage(data.message);
//       navigate(
//         formData.role === "clipper"
//           ? "/login?role=clipper"
//           : "/login?role=advertiser"
//       );
//     } catch (err: any) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-6">
//       <motion.div
//         initial={{ opacity: 0, y: 40 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.6 }}
//         className="w-full max-w-md bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden"
//       >
//         <div className="p-8">
//           {/* Back to Home */}
//           <div className="mb-4">
//             <button
//               onClick={() => navigate("/")}
//               className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition flex items-center gap-1 mb-2"
//             >
//               ← Back to Home
//             </button>
//           </div>

//           {step === "form" ? (
//             <>
//               <h2 className="text-3xl font-bold text-gray-800 text-center mb-6">
//                 Create Your Account
//               </h2>
//               {error && (
//                 <p className="text-red-600 mb-4 text-center">{error}</p>
//               )}
//               <form onSubmit={submitSignup} className="space-y-4">
//                 {/* Role */}
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700">
//                     Signing up as
//                   </label>
//                   <select
//                     name="role"
//                     value={formData.role}
//                     onChange={handleChange}
//                     className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
//                   >
//                     <option value="clipper">Clipper</option>
//                     <option value="advertiser">Advertiser</option>
//                   </select>

//                   {/* New: Role explainer appears here */}
//                   <AnimatePresence mode="wait">
//                     <RoleInfo role={formData.role as "clipper" | "advertiser"} />
//                   </AnimatePresence>
//                 </div>

//                 {/* Email */}
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700">
//                     Email
//                   </label>
//                   <input
//                     type="email"
//                     name="email"
//                     value={formData.email}
//                     onChange={handleChange}
//                     required
//                     className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
//                     placeholder="you@example.com"
//                   />
//                 </div>

//                 {/* Passwords */}
//                 <div className="grid grid-cols-2 gap-4">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700">
//                       Password
//                     </label>
//                     <input
//                       type="password"
//                       name="password"
//                       value={formData.password}
//                       onChange={handleChange}
//                       required
//                       className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
//                       placeholder="••••••••"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700">
//                       Confirm
//                     </label>
//                     <input
//                       type="password"
//                       name="confirm"
//                       value={formData.confirm}
//                       onChange={handleChange}
//                       required
//                       className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
//                       placeholder="••••••••"
//                     />
//                   </div>
//                 </div>

//                 {/* Phone */}
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700">
//                     Phone
//                   </label>
//                   <input
//                     name="phone"
//                     value={formData.phone}
//                     onChange={handleChange}
//                     required
//                     className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
//                     placeholder="+234 800 0000 000"
//                   />
//                 </div>

//                 {/* Country */}
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700">
//                     Country
//                   </label>
//                   <select
//                     name="country"
//                     value={formData.country}
//                     onChange={handleChange}
//                     required
//                     className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
//                   >
//                     <option value="">Select Country</option>
//                     {countryOptions.map(({ code, name }) => (
//                       <option key={code} value={code}>
//                         {name}
//                       </option>
//                     ))}
//                   </select>
//                 </div>

//                 {/* Conditional Fields */}
//                 {formData.role === "clipper" ? (
//                   <>
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700">
//                         First Name
//                       </label>
//                       <input
//                         name="firstName"
//                         value={formData.firstName}
//                         onChange={handleChange}
//                         required
//                         className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
//                         placeholder="John"
//                       />
//                     </div>
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700">
//                         Last Name
//                       </label>
//                       <input
//                         name="lastName"
//                         value={formData.lastName}
//                         onChange={handleChange}
//                         required
//                         className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
//                         placeholder="Doe"
//                       />
//                     </div>
//                   </>
//                 ) : (
//                   <>
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700">
//                         Contact Name
//                       </label>
//                       <input
//                         name="contactName"
//                         value={formData.contactName}
//                         onChange={handleChange}
//                         required
//                         className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
//                         placeholder="Jane Doe"
//                       />
//                     </div>
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700">
//                         Company (optional)
//                       </label>
//                       <input
//                         name="company"
//                         value={formData.company}
//                         onChange={handleChange}
//                         className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
//                         placeholder="Acme Corp"
//                       />
//                     </div>

//                     {/* Creator Types Selection (only for advertisers) */}
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Preferred Creator Types (select all that apply)
//                       </label>
//                       <div className="space-y-2 max-h-60 overflow-y-auto p-2 border rounded-lg">
//                         {CREATOR_TYPES.map((type) => (
//                           <div key={type} className="flex items-center">
//                             <input
//                               type="checkbox"
//                               id={`creator-type-${type}`}
//                               checked={formData.creatorTypes.includes(type)}
//                               onChange={() => handleCreatorTypeChange(type)}
//                               className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
//                             />
//                             <label htmlFor={`creator-type-${type}`} className="ml-2 text-sm text-gray-700">
//                               {type}
//                             </label>
//                           </div>
//                         ))}
//                       </div>
//                     </div>

//                     {/* Other Creator Type Specification */}
//                     {formData.creatorTypes.includes("Other (please specify)") && (
//                       <div>
//                         <label className="block text-sm font-medium text-gray-700">
//                           Please specify other creator type
//                         </label>
//                         <input
//                           name="otherCreatorType"
//                           value={formData.otherCreatorType}
//                           onChange={handleOtherCreatorTypeChange}
//                           required
//                           className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
//                           placeholder="Enter creator type"
//                         />
//                       </div>
//                     )}
//                   </>
//                 )}

//                 <button
//                   type="submit"
//                   disabled={loading}
//                   className="w-full mt-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow hover:bg-purple-700 transition"
//                 >
//                   {loading ? "Sending OTP…" : "Sign Up"}
//                 </button>
//               </form>
//             </>
//           ) : (
//             <>
//               <h2 className="text-3xl font-bold text-gray-800 text-center mb-6">
//                 Verify Your Account
//               </h2>
//               {message && (
//                 <p className="text-green-600 mb-2 text-center">{message}</p>
//               )}
//               {error && (
//                 <p className="text-red-600 mb-2 text-center">{error}</p>
//               )}
//               <form onSubmit={submitOtp} className="space-y-4">
//                 <input
//                   name="otp"
//                   value={otp}
//                   onChange={(e) => setOtp(e.target.value)}
//                   required
//                   maxLength={6}
//                   className="w-full text-center text-xl font-medium tracking-widest mt-1 block rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
//                   placeholder="Enter 6-digit code"
//                 />
//                 <button
//                   type="submit"
//                   disabled={loading}
//                   className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg shadow hover:bg-green-700 transition"
//                 >
//                   {loading ? "Verifying…" : "Verify"}
//                 </button>
//               </form>
//             </>
//           )}
//         </div>
//       </motion.div>
//     </div>
//   );
// }
// src/pages/SignupPage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
const TELEGRAM_BOT_USERNAME = "clippapay"; // Change if different
const TELEGRAM_CHANNEL_LINK = "https://t.me/clippapay"; // Your channel

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

      // TikTok Pixel
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

      // If clipper → go to Telegram step
      if (formData.role === "clipper") {
        setStep("telegram");
      } else {
        navigate("/login?role=advertiser");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkTelegramStatus = async () => {
    setTelegramChecking(true);
    try {
      const res = await fetch(`${API_BASE}/auth/check-telegram`, {
        credentials: "include",
      });
      const data = await res.json();

      if (data.verified) {
        setMessage("Welcome aboard!");
        setTimeout(() => navigate("/dashboard"), 1500);
      } else {
        // setError("Telegram verification not detected. Please you can join the channel anytime on https://t.me/clippapay to keep up with new campaigns. You can now login");
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
        {/* Back Button */}
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
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h1 className="text-4xl md:text-5xl font-bold text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                    Join ClippaPay
                  </h1>
                  <p className="text-center text-gray-600 mb-10">Earn money by creating viral clips</p>

                  {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
                      <HiXCircle className="w-6 h-6 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={submitSignup} className="space-y-6">
                    {/* Role Selector */}
                    <div className="grid grid-cols-2 gap-4">
                      {(["clipper", "advertiser"] as const).map((role) => (
                        <label
                          key={role}
                          className={`relative flex flex-col items-center p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                            formData.role === role
                              ? "border-purple-600 bg-purple-50 shadow-lg"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="role"
                            value={role}
                            checked={formData.role === role}
                            onChange={handleChange}
                            className="sr-only"
                          />
                          <div className="text-4xl mb-3">
                            {role === "clipper" ? <HiVideoCamera /> : <HiSpeakerphone />}
                          </div>
                          <span className="font-bold capitalize">{role === "clipper" ? "Clipper" : "Advertiser"}</span>
                          <span className="text-xs text-gray-500 mt-1">
                            {role === "clipper" ? "Earn per view" : "Run campaigns"}
                          </span>
                        </label>
                      ))}
                    </div>

                    {/* Email & Password */}
                    <div className="grid md:grid-cols-2 gap-5">
                      <input
                        type="email"
                        name="email"
                        placeholder="Email Address"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="px-5 py-4 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="password"
                          name="password"
                          placeholder="Password"
                          required
                          value={formData.password}
                          onChange={handleChange}
                          className="px-5 py-4 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none"
                        />
                        <input
                          type="password"
                          name="confirm"
                          placeholder="Confirm Password"
                          required
                          value={formData.confirm}
                          onChange={handleChange}
                          className="px-5 py-4 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none"
                        />
                      </div>
                    </div>

                    {/* Phone & Country */}
                    <div className="grid md:grid-cols-2 gap-5">
                      <input
                        type="tel"
                        name="phone"
                        placeholder="Phone Number (+234...)"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        className="px-5 py-4 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none"
                      />
                      <select
                        name="country"
                        required
                        value={formData.country}
                        onChange={handleChange}
                        className="px-5 py-4 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none"
                      >
                        <option value="">Select Country</option>
                        {countryOptions.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Role-specific fields */}
                    {formData.role === "clipper" ? (
                      <div className="grid md:grid-cols-2 gap-5">
                        <input
                          type="text"
                          name="firstName"
                          placeholder="First Name"
                          required
                          value={formData.firstName}
                          onChange={handleChange}
                          className="px-5 py-4 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none"
                        />
                        <input
                          type="text"
                          name="lastName"
                          placeholder="Last Name"
                          required
                          value={formData.lastName}
                          onChange={handleChange}
                          className="px-5 py-4 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none"
                        />
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          name="contactName"
                          placeholder="Contact Person Name"
                          required
                          value={formData.contactName}
                          onChange={handleChange}
                          className="px-5 py-4 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none"
                        />
                        <input
                          type="text"
                          name="company"
                          placeholder="Company / Brand (optional)"
                          value={formData.company}
                          onChange={handleChange}
                          className="px-5 py-4 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none"
                        />

                        <div className="col-span-2">
                          <p className="text-sm font-medium text-gray-700 mb-3">
                            Preferred Creator Types (select all that apply)
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-4 bg-gray-50 rounded-xl">
                            {CREATOR_TYPES.map((type) => (
                              <label key={type} className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={formData.creatorTypes.includes(type)}
                                  onChange={() => toggleCreatorType(type)}
                                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                                />
                                <span className="text-sm text-gray-700">{type}</span>
                              </label>
                            ))}
                          </div>
                          {formData.creatorTypes.includes("Other (please specify)") && (
                            <input
                              type="text"
                              placeholder="Specify other creator type..."
                              value={formData.otherCreatorType}
                              onChange={(e) => setFormData({ ...formData, otherCreatorType: e.target.value })}
                              className="mt-4 w-full px-5 py-4 rounded-xl border border-gray-300 focus:border-purple-500"
                              required
                            />
                          )}
                        </div>
                      </>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition disabled:opacity-70"
                    >
                      {loading ? "Creating Account..." : "Continue →"}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ====== STEP 2: OTP ====== */}
              {step === "otp" && (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="max-w-md mx-auto text-center"
                >
                  <HiSparkles className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
                  <h2 className="text-3xl font-bold mb-4">Check Your Email</h2>
                  <p className="text-gray-600 mb-8">
                    We sent a 6-digit code to <span className="font-bold">{formData.email}</span>
                  </p>

                  {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                      {error}
                    </div>
                  )}
                  {message && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center justify-center gap-2">
                      <HiCheckCircle className="w-6 h-6" />
                      {message}
                    </div>
                  )}

                  <form onSubmit={submitOtp} className="space-y-6">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      className="w-full text-4xl text-center tracking-widest font-bold py-6 rounded-2xl border-2 border-gray-300 focus:border-purple-600 outline-none"
                      required
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition"
                    >
                      {loading ? "Verifying..." : "Verify Email"}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ====== STEP 3: TELEGRAM (Clippers Only) ====== */}
              {step === "telegram" && (
                <motion.div
                  key="telegram"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-lg mx-auto text-center py-12"
                >
                  <div className="text-8xl mb-8">Telegram</div>
                  <h2 className="text-3xl font-bold mb-6">One Last Step, Clipper!</h2>
                  <p className="text-lg text-gray-700 mb-10">
                    Join our Telegram channel to get instant campaign alerts and prove you're real
                  </p>

                  <div className="space-y-6">
                    <a
                      href={`https://t.me/${TELEGRAM_BOT_USERNAME}?start=${encodedPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full py-5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-xl rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition flex items-center justify-center gap-3"
                    >
                      <HiExternalLink className="w-7 h-7" />
                      Open Telegram & Verify Now
                    </a>

                    <p className="text-sm text-gray-500">
                      After tapping <strong>/start or Join Channel</strong> in the bot, come back here
                    </p>

                    <button
                      onClick={checkTelegramStatus}
                      disabled={telegramChecking}
                      className="w-full py-4 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-900 transition disabled:opacity-60"
                    >
                      {telegramChecking ? "Checking..." : "I’ve Joined → Verify Me"}
                    </button>

                    {error && (
                      <p className="text-red-600 font-medium flex items-center justify-center gap-2">
                        <HiXCircle className="w-6 h-6" />
                        {error}
                      </p>
                    )}
                    {message && !error && (
                      <p className="text-green-600 font-bold text-xl flex items-center justify-center gap-3">
                        <HiCheckCircle className="w-8 h-8" />
                        {message}
                      </p>
                    )}
                  </div>

                  <div className="mt-10 p-6 bg-blue-50 rounded-2xl">
                    <p className="text-sm text-gray-700">
                      <strong>Pro Tip:</strong> Stay in the channel to never miss high-paying campaigns!
                    </p>
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