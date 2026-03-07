// import { Link } from "react-router-dom";
// import { useInView, motion, AnimatePresence, useScroll, useTransform, useSpring } from "framer-motion";
// import { useRef, useEffect, useState } from "react";
// // import heroImage from "/hero-clip.png";
// import { PlayIcon, SparklesIcon, UsersIcon } from "@heroicons/react/24/outline";
// import { ChevronDown } from 'lucide-react';
// import NavBar from "../components/NavBar";

// function useCounter(start = 0, end = 1000, speed = 20) {
//     const [value, setValue] = useState(start);
//     useEffect(() => {
//         let current = start;
//         const interval = setInterval(() => {
//             current += Math.ceil((end - start) / 50);
//             if (current >= end) {
//                 setValue(end);
//                 clearInterval(interval);
//             } else {
//                 setValue(current);
//             }
//         }, speed);
//         return () => clearInterval(interval);
//     }, [start, end, speed]);
//     return value;
// }

// const faqs = [
//     {
//         question: 'What is ClippaPay?',
//         answer: (
//             <>
//                 <p>ClippaPay is a next-generation advertising platform that pays everyday people—known as Clippers—to post short, engaging video ads on platforms like TikTok, Instagram, and WhatsApp. We leverage viral content strategies to turn views into income, ensuring instant payouts to creators.</p>
//             </>
//         ),
//     },
//     {
//         question: 'How do I submit proof of repost?',
//         answer: <p>Paste your YouTube, TikTok, or Instagram link along with tracked views, then click <strong>Submit Proof</strong>.</p>,
//     },
//     {
//         question: 'When do I get paid?',
//         answer: <p>Approved reposts are paid out daily. Withdrawals are available once your in-wallet balance exceeds ₦1,000.</p>,
//     },
//     {
//         question: 'How much can I really earn with ClippaPay?',
//         answer: (
//             <>
//                 <p>Your earning potential is limitless. Many dedicated users earn over ₦500,000 per month with just a few hours of daily clipping. People are literally buying houses from clipping.</p>
//             </>
//         ),
//     },
//     {
//         question: 'Who do ClippaPay Clippers work with?',
//         answer: (
//             <>
//                 <p>We partner with major streaming platforms, global brands, and rising tech companies. Even with a new bank account, you can clip for top names and get paid instantly.</p>
//             </>
//         ),
//     },
//     {
//         question: 'What platforms does ClippaPay support?',
//         answer: (
//             <>
//                 <p>Currently, we focus on TikTok, YouTube and Instagram. Our WhatsApp Clipping feature is launching soon, allowing brands to go viral through status updates.</p>
//             </>
//         ),
//     },
//     {
//         question: 'I don\'t have followers... can I still earn?',
//         answer: (
//             <>
//                 <p>Absolutely. Even 100–200 views per day can earn you money. We provide training to help you grow your audience over time.</p>
//             </>
//         ),
//     },
//     {
//         question: 'Why is ClippaPay doing this? What\'s in it for you?',
//         answer: (
//             <>
//                 <p>We aim to build the largest human-powered ad network ever. When you win, we win. All we ask is that you clip with passion; we handle the rest.</p>
//             </>
//         ),
//     },
// ];

// export default function HomePage() {
//     const campaignSamples = [
//         { title: "Clippapay Onboarding Challenge", rate: "₦0.2/view", category: "Business & Investment" },
//         { title: "Dance with VibeStream", rate: "₦0.2/view", category: "Entertainment" },
//         { title: "GlowUp Skincare Tease", rate: "₦0.2/view", category: "Health & Fitness" },
//     ];

//     const [openIndex, setOpenIndex] = useState(null);

//     const toggle = (index) => setOpenIndex(openIndex === index ? null : index);

//     const ref = useRef(null);
//     const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
//     const bgY = useTransform(scrollYProgress, [0, 1], ['100%', '60%']);
//     const smoothBgY = useSpring(bgY, { stiffness: 100, damping: 25 });


//     return (
//         <div className="min-h-screen bg-white font-sans">
//             {/* === HERO SECTION === */}
//             <NavBar />
//             <section
//                 ref={ref}
//                 className="relative w-full min-h-screen overflow-hidden flex flex-col justify-center items-center text-center bg-black px-4 py-24 sm:py-32"
//             >
//                 {/* Background Gradient Overlay */}
//                 <motion.div
//                     style={{ y: smoothBgY }}
//                     className="absolute inset-0 bg-gradient-to-b from-emerald-600 via-purple-700 to-yellow-400 opacity-80"
//                 />

//                 {/* Animated Gradient Blobs */}
//                 <motion.div
//                     className="absolute -top-20 -left-20 w-72 h-72 bg-purple-700 rounded-full filter blur-[100px] opacity-40 sm:w-96 sm:h-96"
//                     animate={{ scale: [1, 1.2, 1], rotate: [0, 45, 0] }}
//                     transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
//                 />
//                 <motion.div
//                     className="absolute bottom-0 right-0 w-60 h-60 bg-emerald-300 rounded-full filter blur-[80px] opacity-30 sm:w-80 sm:h-80"
//                     animate={{ x: [0, -50, 0], y: [0, -20, 0] }}
//                     transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
//                 />

//                 {/* Hero Title */}
//                 <motion.h1
//                     initial="hidden"
//                     animate="visible"
//                     variants={{
//                         hidden: {},
//                         visible: { transition: { staggerChildren: 0.06, delayChildren: 0.4 } },
//                     }}
//                     className="relative z-10 text-white text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold leading-tight max-w-4xl text-center"
//                 >
//                     {"Turn Your Views Into Income".split(" ").map((word, idx) => (
//                         <motion.span
//                             key={idx}
//                             className="inline-block mr-2"
//                             variants={{
//                                 hidden: { opacity: 0, y: 20 },
//                                 visible: { opacity: 1, y: 0 },
//                             }}
//                         >
//                             {word}
//                         </motion.span>
//                     ))}
//                 </motion.h1>


//                 {/* Subheading */}
//                 <motion.p
//                     initial={{ opacity: 0, y: 20 }}
//                     animate={{ opacity: 1, y: 0 }}
//                     transition={{ delay: 1.2, duration: 0.8 }}
//                     className="relative z-10 mt-8 max-w-2xl text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-white"
//                 >
//                     Advertiser Clips go viral instantly
//                     <span className="mx-2">•</span>
//                     Clippers earn up to ₦500,000/month
//                     <br />
//                     <span className="text-gray-300 text-base sm:text-lg mt-2 block">
//                         No followers? No problem. Start clipping today.
//                     </span>
//                 </motion.p>


//                 {/* Decorative Gradient Underline */}
//                 <motion.div
//                     initial={{ scaleX: 0 }}
//                     animate={{ scaleX: 1 }}
//                     transition={{ delay: 1.6, duration: 0.6 }}
//                     className="relative z-10 mt-6 w-32 h-1 bg-gradient-to-r from-yellow-300 via-purple-500 to-emerald-400 origin-left"
//                 />

//                 {/* CTA Buttons */}
//                 <motion.div
//                     initial={{ opacity: 0, scale: 0.8 }}
//                     animate={{ opacity: 1, scale: 1 }}
//                     transition={{ delay: 2.2, duration: 0.6 }}
//                     className="relative z-10 flex flex-col sm:flex-row gap-5 mt-10"
//                 >
//                     <Link
//                         to="/signup"
//                         className="group relative overflow-hidden px-8 py-4 bg-gradient-to-r from-yellow-300 to-emerald-400 text-black font-bold rounded-full shadow-xl hover:shadow-2xl transition-transform transform hover:scale-105"
//                     >
//                         <span className="relative z-10">Get Started</span>
//                     </Link>

//                     <Link
//                         to="/signup?role=advertiser"
//                         className="group relative overflow-hidden px-8 py-4 border-2 border-white text-white font-bold rounded-full shadow-xl hover:border-yellow-300 hover:text-yellow-300 hover:bg-black/20 transition-colors"
//                     >
//                         <span className="relative z-10">Advertise & Go Viral</span>
//                     </Link>

//                     <Link
//                         to="/about"
//                         className="px-8 py-4 bg-white text-black font-bold rounded-full shadow-xl hover:bg-gray-100 transition"
//                     >
//                         Learn More
//                     </Link>
//                 </motion.div>
//             </section>


//             {/* === FEATURE COMPARISON: CLIPPERS VS ADVERTISERS === */}
//             <section className="bg-gradient-to-b from-white to-indigo-50 py-24 px-6 sm:px-10">
//                 <div className="max-w-6xl mx-auto text-center mb-16">
//                     <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
//                         Earners & Advertisers, We’ve Got You Covered
//                     </h2>
//                     <p className="text-xl text-gray-600 max-w-2xl mx-auto">
//                         Whether you're reposting content or launching a campaign, ClippaPay makes it seamless.
//                     </p>
//                 </div>

//                 <div className="grid md:grid-cols-2 gap-10 max-w-6xl mx-auto">
//                     {/* Clippers Card */}
//                     <motion.div
//                         initial={{ opacity: 0, y: 30 }}
//                         whileInView={{ opacity: 1, y: 0 }}
//                         transition={{ duration: 0.6 }}
//                         className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl border border-gray-100 transition"
//                     >
//                         <div className="flex items-center mb-5">
//                             <div className="bg-green-100 p-3 rounded-full mr-4">
//                                 <PlayIcon className="w-7 h-7 text-green-600" />
//                             </div>
//                             <h3 className="text-2xl font-bold text-gray-800">For Clippers</h3>
//                         </div>
//                         <ul className="space-y-4 text-gray-700 text-base">
//                             <li>📲 Repost video ads on TikTok, Instagram & YouTube</li>
//                             <li>💸 Earn ₦ per verified view with daily payouts</li>
//                             <li>🚀 Get fresh campaigns every day</li>
//                             <li>🎯 Compete on leaderboards & earn bonus rewards</li>
//                             <li>🙌 No followers needed — anyone can earn</li>
//                         </ul>
//                     </motion.div>

//                     {/* Advertisers Card */}
//                     <motion.div
//                         initial={{ opacity: 0, y: 30 }}
//                         whileInView={{ opacity: 1, y: 0 }}
//                         transition={{ duration: 0.6, delay: 0.1 }}
//                         className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl border border-gray-100 transition"
//                     >
//                         {/* Advertiser-Focused Video Ad */}
//                         {/* <motion.div
//                             initial={{ opacity: 0, y: 30 }}
//                             whileInView={{ opacity: 1, y: 0 }}
//                             transition={{ duration: 0.6, delay: 0.2 }}
//                             className="col-span-full bg-black rounded-2xl shadow-lg overflow-hidden"
//                         >
//                             <video
//                                 src="/video20.mp4"
//                                 className="w-full h-auto object-cover"
//                                 autoPlay
//                                 muted
//                                 loop
//                                 playsInline
//                                 controls
//                             />
//                         </motion.div> */}

//                         <div className="flex items-center mb-5">
//                             <div className="bg-blue-100 p-3 rounded-full mr-4">
//                                 <UsersIcon className="w-7 h-7 text-blue-600" />
//                             </div>
//                             <h3 className="text-2xl font-bold text-gray-800">For Advertisers</h3>
//                         </div>
//                         <ul className="space-y-4 text-gray-700 text-base">
//                             <li>🔍 Reach real people via viral reposts</li>
//                             <li>📊 Track ROI & view stats in real-time</li>
//                             <li>🤖 Anti-bot detection with AI-powered verification</li>
//                             <li>💰 Pay only for real, verified views</li>
//                             <li>🔐 Escrow system guarantees delivery or refund</li>
//                         </ul>
//                     </motion.div>
//                 </div>
//             </section>

//             {/* === TRENDING CAMPAIGNS === */}
//             <section className="bg-white py-24 px-6 sm:px-10 text-center">
//                 <div className="max-w-6xl mx-auto">
//                     <h2 className="text-4xl font-bold text-gray-900 mb-6">
//                         Trending Campaigns 🔥
//                     </h2>
//                     <p className="text-lg text-gray-600 mb-12">
//                         Start earning by reposting these active high-reward campaigns.
//                     </p>

//                     <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
//                         {[
//                             { title: "Clippapay Onboarding Challenge", rate: "₦0.2/view", category: "Business & Investment" },
//                             { title: "Dance with VibeStream", rate: "₦0.2/view", category: "Entertainment" },
//                             { title: "GlowUp Skincare Tease", rate: "₦0.2/view", category: "Health & Fitness" },
//                         ].map((camp, i) => (
//                             <motion.div
//                                 key={i}
//                                 initial={{ opacity: 0, y: 30 }}
//                                 whileInView={{ opacity: 1, y: 0 }}
//                                 transition={{ duration: 0.5, delay: i * 0.2 }}
//                                 className="bg-indigo-50 hover:bg-indigo-100 p-6 rounded-2xl shadow-md text-left transition"
//                             >
//                                 <h3 className="text-lg font-semibold text-indigo-800 mb-1">{camp.title}</h3>
//                                 <p className="text-sm text-gray-600">Reward: <strong>{camp.rate}</strong></p>
//                                 <p className="text-xs text-gray-500 mt-1">Category: {camp.category}</p>
//                             </motion.div>
//                         ))}
//                     </div>

//                     <Link
//                         to="/signup"
//                         className="mt-10 inline-block bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-full font-medium shadow transition hover:scale-105"
//                     >
//                         View All Campaigns →
//                     </Link>
//                 </div>
//             </section>
//             {/* === PROOF + PAYOUT FLOW === */}
//             <section className="py-24 px-6 sm:px-10 bg-gradient-to-b from-white to-gray-50 text-center">
//                 <h2 className="text-4xl font-bold text-gray-900 mb-6">
//                     Simple Process. Guaranteed Payouts.
//                 </h2>
//                 <p className="max-w-2xl mx-auto text-gray-600 mb-12 text-lg">
//                     You post. We verify. You get paid. ClippaPay ensures every view is real and every payment is prompt.
//                 </p>

//                 <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8 text-left">
//                     <motion.div
//                         initial={{ opacity: 0, y: 30 }}
//                         whileInView={{ opacity: 1, y: 0 }}
//                         transition={{ duration: 0.4 }}
//                         className="bg-white p-6 rounded-xl shadow-md border border-gray-100"
//                     >
//                         <h3 className="text-xl font-semibold text-emerald-700 mb-2">1. Submit Your Link</h3>
//                         <p className="text-gray-700">Paste your TikTok, Instagram or YouTube URL after posting your assigned clip.</p>
//                     </motion.div>

//                     <motion.div
//                         initial={{ opacity: 0, y: 30 }}
//                         whileInView={{ opacity: 1, y: 0 }}
//                         transition={{ duration: 0.4, delay: 0.1 }}
//                         className="bg-white p-6 rounded-xl shadow-md border border-gray-100"
//                     >
//                         <h3 className="text-xl font-semibold text-indigo-700 mb-2">2. We Verify Views</h3>
//                         <p className="text-gray-700">Our AI + human reviewers cross-check view count, engagement quality, and platform analytics.</p>
//                     </motion.div>

//                     <motion.div
//                         initial={{ opacity: 0, y: 30 }}
//                         whileInView={{ opacity: 1, y: 0 }}
//                         transition={{ duration: 0.4, delay: 0.2 }}
//                         className="bg-white p-6 rounded-xl shadow-md border border-gray-100"
//                     >
//                         <h3 className="text-xl font-semibold text-yellow-700 mb-2">3. Get Paid Instantly</h3>
//                         <p className="text-gray-700">Once approved, your earnings drop straight into your ClippaPay wallet. Withdraw anytime.</p>
//                     </motion.div>
//                 </div>
//             </section>

//             {/* === TESTIMONIALS === */}
//             <section className="bg-white py-24 px-6 sm:px-10 text-center">
//                 <div className="max-w-4xl mx-auto">
//                     <h2 className="text-4xl font-bold text-gray-900 mb-6">What Clippers Are Saying</h2>
//                     <p className="text-lg text-gray-600 mb-12">Don’t just take our word for it. See how ClippaPay is changing lives every day.</p>

//                     <div className="grid md:grid-cols-2 gap-10 text-left">
//                         {[
//                             { name: "Ada E.", quote: "Made ₦75,000 in my first 5 days. I just post videos daily on IG!" },
//                             { name: "Tolu J.", quote: "This is the first app that actually pays without wasting my time." },
//                         ].map((t, i) => (
//                             <motion.div
//                                 key={i}
//                                 initial={{ opacity: 0, y: 30 }}
//                                 whileInView={{ opacity: 1, y: 0 }}
//                                 transition={{ duration: 0.5, delay: i * 0.3 }}
//                                 className="bg-indigo-50 p-6 rounded-2xl shadow-md"
//                             >
//                                 <div className="flex items-center gap-4 mb-4">
//                                     <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
//                                         {t.name.charAt(0)}
//                                     </div>
//                                     <div>
//                                         <p className="font-semibold text-indigo-700">{t.name}</p>
//                                         <p className="text-sm text-gray-500">Verified Clipper</p>
//                                     </div>
//                                 </div>
//                                 <p className="text-gray-700 italic text-base">“{t.quote}”</p>
//                             </motion.div>
//                         ))}
//                     </div>
//                 </div>
//             </section>
//             {/* === SAMPLE CLIPS CAROUSEL === */}
//             <section className="bg-gradient-to-b from-indigo-50 to-emerald-50 py-24 px-6 sm:px-10 text-center">
//                 <h2 className="text-4xl font-bold text-gray-900 mb-6">Sample Clips You Can Repost</h2>
//                 <p className="text-lg text-gray-600 mb-10">
//                     Real examples. Easy to repost. Watch & start earning.
//                 </p>

//                 <div className="relative">
//                     <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth px-1 md:px-0 pb-2 hide-scrollbar">
//                         {[4, 3, 2, 1].map((i) => (
//                             <motion.div
//                                 key={i}
//                                 whileHover={{ scale: 1.05 }}
//                                 className="snap-center flex-shrink-0 w-[260px] bg-white rounded-2xl shadow-md p-4"
//                             >
//                                 <video
//                                     src={`/video${i}.mp4`}
//                                     className="w-full h-96 rounded-xl object-cover mb-3"
//                                     autoPlay
//                                     muted
//                                     loop
//                                     playsInline
//                                 />
//                                 <h3 className="font-semibold text-indigo-800 text-base mb-1">Campaign {i}</h3>
//                                 <p className="text-sm text-gray-600">Earn ₦0.2/view • Entertainment</p>
//                             </motion.div>
//                         ))}
//                     </div>
//                 </div>

//                 <p className="text-center text-sm text-gray-500 mt-6">
//                     Login to access the full library of clips.
//                 </p>
//             </section>

//             {/* === GLOBAL REACH SECTION === */}
//             <section className="bg-white py-24 px-6 sm:px-10 text-center">
//                 <motion.h2
//                     initial={{ opacity: 0, y: 30 }}
//                     whileInView={{ opacity: 1, y: 0 }}
//                     transition={{ duration: 0.6 }}
//                     className="text-4xl font-bold text-gray-900 mb-6"
//                 >
//                     Trusted Across the Globe 🌍
//                 </motion.h2>

//                 <p className="max-w-2xl mx-auto text-lg text-gray-600 mb-12">
//                     ClippaPay is trusted by over <strong>10,000 creators</strong> and <strong>3,000 advertisers</strong> from Lagos to LA. We're building the largest grassroots media network in the world.
//                 </p>

//                 <div className="grid grid-cols-3 sm:grid-cols-6 gap-6 max-w-4xl mx-auto text-4xl opacity-70">
//                     {['🇳🇬', '🇺🇸', '🇬🇧', '🇿🇦', '🇨🇦', '🇮🇳'].map((flag, i) => (
//                         <motion.div
//                             key={i}
//                             whileHover={{ scale: 1.1 }}
//                             className="transition-transform"
//                         >
//                             {flag}
//                         </motion.div>
//                     ))}
//                 </div>
//             </section>
//             {/* === AI & ESCROW TRUST SYSTEM === */}
//             <section className="bg-gradient-to-br from-white to-gray-100 py-24 px-6 sm:px-10 text-center">
//                 <div className="max-w-4xl mx-auto">
//                     <h2 className="text-4xl font-bold text-gray-900 mb-6">AI-Powered Discovery Meets Human Hustle</h2>

//                     <p className="text-lg text-gray-700 mb-6">
//                         We use smart AI to find the most viral content formats — then give you the exact clips to post. You bring the reach. We handle the rest.
//                     </p>

//                     <p className="text-lg text-gray-700 mb-10">
//                         Every campaign is backed by escrow. So you’re guaranteed to get paid — no matter what.
//                     </p>

//                     <Link
//                         to="/signup"
//                         className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full font-semibold transition"
//                     >
//                         Try It Now
//                     </Link>
//                 </div>
//             </section>

//             {/* === MID CALL TO ACTION === */}
//             <motion.section
//                 initial={{ opacity: 0, y: 40 }}
//                 whileInView={{ opacity: 1, y: 0 }}
//                 transition={{ duration: 0.7 }}
//                 viewport={{ once: true }}
//                 className="bg-indigo-700 text-white py-24 px-6 sm:px-10 text-center relative overflow-hidden"
//             >
//                 <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600 to-emerald-500 opacity-30 z-0 blur-3xl" />
//                 <div className="relative z-10">
//                     <h2 className="text-4xl font-bold mb-4">Join the Revolution 🚀</h2>
//                     <p className="text-lg mb-6">
//                         Your phone is already online. Why not let it pay you back?
//                     </p>
//                     <Link
//                         to="/signup"
//                         className="bg-white text-indigo-700 font-semibold px-8 py-3 rounded-full shadow hover:bg-gray-100 transition-transform duration-300 hover:scale-105"
//                     >
//                         Join Now — It’s Free
//                     </Link>
//                 </div>
//             </motion.section>
//             {/* === FAQ SECTION === */}
//             <section className="bg-gradient-to-br from-white to-gray-50 py-24 px-6 sm:px-10">
//                 <div className="max-w-4xl mx-auto text-center">
//                     <h2 className="text-4xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
//                     <p className="text-lg text-gray-600 mb-12">
//                         Got questions? We've answered the most common ones below.
//                     </p>

//                     <div className="space-y-4 text-left">
//                         {faqs.map((item, idx) => (
//                             <div key={idx} className="bg-white rounded-2xl shadow-lg overflow-hidden">
//                                 <button
//                                     onClick={() => toggle(idx)}
//                                     className="w-full flex justify-between items-center px-6 py-4 focus:outline-none"
//                                 >
//                                     <span className="text-lg font-medium text-gray-900">{item.question}</span>
//                                     <ChevronDown
//                                         className={`h-5 w-5 text-blue-600 transform transition-transform duration-200 ${openIndex === idx ? 'rotate-180' : ''}`}
//                                     />
//                                 </button>

//                                 <AnimatePresence initial={false}>
//                                     {openIndex === idx && (
//                                         <motion.div
//                                             key="content"
//                                             initial={{ height: 0, opacity: 0 }}
//                                             animate={{ height: 'auto', opacity: 1 }}
//                                             exit={{ height: 0, opacity: 0 }}
//                                             transition={{ duration: 0.3, ease: 'easeInOut' }}
//                                             className="px-6 pb-6 text-gray-700 leading-relaxed"
//                                         >
//                                             {item.answer}
//                                         </motion.div>
//                                     )}
//                                 </AnimatePresence>
//                             </div>
//                         ))}
//                     </div>
//                 </div>
//             </section>
//             {/* === NEWSLETTER OPT-IN === */}
//             <section className="bg-emerald-600 text-white py-20 px-6 sm:px-10 text-center">
//                 <div className="max-w-xl mx-auto">
//                     <h2 className="text-2xl sm:text-3xl font-bold mb-4">Don’t Miss New Campaigns</h2>
//                     <p className="mb-6 text-base sm:text-lg">
//                         Get alerts when new high-paying videos go live. We’ll also send you growth tips & exclusive offers. No spam. Ever.
//                     </p>

//                     <form className="flex flex-col sm:flex-row gap-3 justify-center">
//                         <input
//                             type="email"
//                             placeholder="Enter your email"
//                             className="px-4 py-3 rounded-md border border-white text-black flex-1 w-full sm:max-w-xs"
//                         />
//                         <button
//                             type="submit"
//                             className="bg-white text-emerald-600 font-semibold px-6 py-3 rounded-md hover:bg-gray-100 transition"
//                         >
//                             Subscribe
//                         </button>
//                     </form>
//                 </div>
//             </section>
//             {/* === FINAL CALL TO ACTION === */}
//             <section className="relative bg-indigo-700 text-white py-28 px-6 sm:px-10 text-center overflow-hidden">
//                 <div className="absolute inset-0 opacity-10">
//                     {/* <img
//                         src={heroImage}
//                         alt="Background layer"
//                         className="w-full h-full object-cover blur-lg"
//                     /> */}
//                 </div>

//                 <div className="relative z-10 max-w-4xl mx-auto">
//                     <h2 className="text-4xl font-bold mb-4">Your Time Online Should Pay</h2>
//                     <p className="text-lg mb-8">
//                         ClippaPay turns your attention into income. It’s free to join. Why wait?
//                     </p>
//                     <Link
//                         to="/signup"
//                         className="bg-white text-indigo-700 font-semibold px-8 py-3 rounded-full shadow hover:bg-gray-100 transition-transform duration-300 hover:scale-105"
//                     >
//                         Join the Movement
//                     </Link>
//                 </div>
//             </section>
//             {/* === FOOTER === */}
//             <footer className="bg-indigo-900 text-white px-6 py-10 text-sm">
//                 <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-8">
//                     <div>
//                         <h4 className="text-lg font-bold mb-2">ClippaPay</h4>
//                         <p>Earn by posting. Advertise through virality.</p>
//                     </div>

//                     <div className="space-y-2">
//                         <a href="/terms" className="hover:underline block">Terms of Service</a>
//                         <a href="/privacy" className="hover:underline block">Privacy Policy</a>
//                         <a href="/contact" className="hover:underline block">Contact Us</a>
//                     </div>

//                     <div className="space-y-2 text-right md:text-left">
//                         <p>Instagram • TikTok • X</p>
//                         <p>&copy; {new Date().getFullYear()} ClippaPay Inc.</p>
//                     </div>
//                 </div>
//             </footer>
//             {/* === MOBILE STICKY CTA === */}
//             <div className="fixed bottom-4 right-4 z-50 md:hidden">
//                 <Link
//                     to="/signup"
//                     className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-lg text-sm font-semibold animate-bounce"
//                 >
//                     Clip & Earn Now
//                 </Link>
//             </div>



//         </div>
//     );
// }




import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Outfit:wght@300;400;500;600;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #060608;
    --surface: #0E0E14;
    --card: #13131C;
    --border: #1E1E2E;
    --border-bright: #2E2E48;
    --ugc: #FF5F38;
    --clip: #00D4A8;
    --aff: #A78BFA;
    --white: #F4F3FF;
    --muted: #6B6A8A;
    --dim: #2A2940;
  }

  body { background: var(--bg); }

  .font-display { font-family: 'Syne', sans-serif; }
  .font-body { font-family: 'Outfit', sans-serif; }

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  @keyframes pulse-glow {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes ticker {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes dot-ping {
    0% { transform: scale(1); opacity: 1; }
    100% { transform: scale(2.5); opacity: 0; }
  }

  @media (max-width: 768px) {
    .hero-title { font-size: clamp(36px, 12vw, 64px) !important; }
    .section-title { font-size: clamp(28px, 8vw, 42px) !important; }
    .stat-number { font-size: 28px !important; }
    .stat-label { font-size: 11px !important; }
  }

  @media (min-width: 1440px) {
    .hero-title { font-size: 96px !important; }
    .section-title { font-size: 58px !important; }
    .hero-subtitle { font-size: 22px !important; }
    .stat-number { font-size: 42px !important; }
    .stat-label { font-size: 14px !important; }
  }
`;

// ── Utility components ──────────────────────────────────────────────────────

function LiveDot({ color }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 12, height: 12 }}>
      <span style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: color, animation: "dot-ping 1.4s ease-out infinite"
      }} />
      <span style={{ position: "relative", width: 12, height: 12, borderRadius: "50%", background: color }} />
    </span>
  );
}

function GlowOrb({ color, size = 300, x = "50%", y = "50%", opacity = 0.12 }) {
  return (
    <div style={{
      position: "absolute", left: x, top: y,
      width: size, height: size,
      borderRadius: "50%",
      background: color,
      filter: `blur(${size * 0.45}px)`,
      opacity,
      pointerEvents: "none",
      transform: "translate(-50%,-50%)"
    }} />
  );
}

function Tag({ children, color }) {
  return (
    <span className="font-body" style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "6px 16px",
      borderRadius: 100,
      background: color + "18",
      border: `1px solid ${color}44`,
      color: color,
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: 0.8,
      textTransform: "uppercase"
    }}>{children}</span>
  );
}

// ── Ticker tape ──────────────────────────────────────────────────────────────

function Ticker() {
  const items = ["UGC Creation", "Short-Form Clipping", "Affiliate Sales", "Brand Campaigns", "Creator Payouts", "View Verification", "Referral Tracking", "Content Distribution"];
  const doubled = [...items, ...items];
  return (
    <div style={{ overflow: "hidden", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "12px 0", background: "var(--surface)" }}>
      <div style={{ display: "flex", gap: 48, animation: "ticker 22s linear infinite", width: "max-content" }}>
        {doubled.map((item, i) => (
          <span key={i} className="font-body" style={{ color: "var(--muted)", fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", letterSpacing: 1, textTransform: "uppercase" }}>
            <span style={{ color: i % 2 === 0 ? "var(--ugc)" : i % 3 === 0 ? "var(--clip)" : "var(--aff)", marginRight: 8 }}>✦</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────

function Hero({ onExplore }) {
  const [count, setCount] = useState({ brands: 0, creators: 0, views: 0 });

  useEffect(() => {
    const targets = { brands: 340, creators: 12400, views: 89 };
    const dur = 2000;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      setCount({ brands: Math.floor(targets.brands * e), creators: Math.floor(targets.creators * e), views: Math.floor(targets.views * e) });
      if (t < 1) requestAnimationFrame(tick);
    };
    const id = setTimeout(() => requestAnimationFrame(tick), 300);
    return () => clearTimeout(id);
  }, []);

  return (
    <div style={{ position: "relative", minHeight: "92vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "100px 24px 80px", overflow: "hidden" }}>
      <GlowOrb color="var(--ugc)" size={600} x="20%" y="30%" opacity={0.08} />
      <GlowOrb color="var(--aff)" size={500} x="80%" y="60%" opacity={0.08} />
      <GlowOrb color="var(--clip)" size={450} x="50%" y="80%" opacity={0.06} />

      {/* Grid bg */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
        backgroundSize: "70px 70px",
        opacity: 0.4,
        maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)"
      }} />

      {/* Badge */}
      <div style={{ animation: "slide-up 0.6s ease both", animationDelay: "0.1s" }}>
        <div className="font-body" style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          padding: "10px 22px",
          borderRadius: 100,
          background: "var(--surface)",
          border: "1px solid var(--border-bright)",
          color: "var(--muted)",
          fontSize: 14,
          fontWeight: 500,
          marginBottom: 40,
          letterSpacing: 0.5
        }}>
          <LiveDot color="var(--clip)" />
          <span>The future of brand-creator collaboration</span>
        </div>
      </div>

      {/* Headline */}
      <div style={{ animation: "slide-up 0.6s ease both", animationDelay: "0.2s", maxWidth: 1000 }}>
        <h1 className="font-display hero-title" style={{
          fontSize: "clamp(48px, 10vw, 96px)",
          fontWeight: 800,
          lineHeight: 1.0,
          letterSpacing: -2,
          color: "var(--white)",
          marginBottom: 16
        }}>
          Create.{" "}
          <span style={{
            background: "linear-gradient(135deg, var(--ugc), #FF9A38)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>Clip.</span>
          <br />
          <span style={{
            background: "linear-gradient(135deg, var(--aff), var(--clip))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>Convert.</span>
        </h1>
      </div>

      {/* Subheadline */}
      <div style={{ animation: "slide-up 0.6s ease both", animationDelay: "0.35s" }}>
        <p className="font-body hero-subtitle" style={{
          fontSize: 20, color: "var(--muted)", lineHeight: 1.7,
          maxWidth: 700, margin: "32px auto 0",
          fontWeight: 400
        }}>
          ClippaPay connects brands with creators to <strong style={{ color: "var(--white)", fontWeight: 600 }}>make content</strong>,{" "}
          <strong style={{ color: "var(--white)", fontWeight: 600 }}>spread it everywhere</strong>, and{" "}
          <strong style={{ color: "var(--white)", fontWeight: 600 }}>turn views into sales</strong> — with or without a huge following.
        </p>
      </div>

      {/* CTAs */}
      <div style={{ animation: "slide-up 0.6s ease both", animationDelay: "0.5s", display: "flex", gap: 20, marginTop: 52, flexWrap: "wrap", justifyContent: "center" }}>
        <Link to="/signup?role=advertiser">
          <button className="font-body" style={{
            padding: "18px 40px",
            borderRadius: 14,
            border: "none",
            background: "var(--white)",
            color: "var(--bg)",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
            transition: "transform 0.2s, box-shadow 0.2s",
            boxShadow: "0 0 0 0 #ffffff44"
          }}
            onMouseEnter={e => { e.target.style.transform = "scale(1.04)"; e.target.style.boxShadow = "0 8px 32px #ffffff22"; }}
            onMouseLeave={e => { e.target.style.transform = "scale(1)"; e.target.style.boxShadow = "0 0 0 0 #ffffff44"; }}
          >
            I'm a Brand →
          </button>
        </Link>
        <Link to="/signup?role=creator">
          <button className="font-body" style={{
            padding: "18px 40px",
            borderRadius: 14,
            border: "2px solid var(--border-bright)",
            background: "transparent",
            color: "var(--white)",
            fontWeight: 600,
            fontSize: 16,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
            onMouseEnter={e => { e.target.style.borderColor = "var(--aff)"; e.target.style.color = "var(--aff)"; }}
            onMouseLeave={e => { e.target.style.borderColor = "var(--border-bright)"; e.target.style.color = "var(--white)"; }}
          >
            I'm a Creator
          </button>
        </Link>
      </div>

      {/* Stats */}
      <div style={{ animation: "slide-up 0.6s ease both", animationDelay: "0.65s", display: "flex", gap: 60, marginTop: 80, flexWrap: "wrap", justifyContent: "center" }}>
        {[
          { val: count.brands + "+", label: "Brands", color: "var(--ugc)" },
          { val: count.creators.toLocaleString() + "+", label: "Creators", color: "var(--aff)" },
          { val: count.views + "M+", label: "Views Generated", color: "var(--clip)" },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div className="font-display stat-number" style={{ fontSize: 44, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
            <div className="font-body stat-label" style={{ fontSize: 14, color: "var(--muted)", marginTop: 8, letterSpacing: 0.5, textTransform: "uppercase" }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Three Pillars ─────────────────────────────────────────────────────────────

const PILLARS = [
  {
    id: "ugc",
    icon: "🎬",
    name: "UGC Creation",
    color: "var(--ugc)",
    colorHex: "#FF5F38",
    tagline: "Real creators. Real content. Your brief.",
    description: "Brands post a campaign. Creators bid to win it. You choose who makes your content — after reviewing their past work.",
    brandFlow: [
      { step: "Post Campaign", detail: "Set your brief, content type, and base rate. Creators get notified instantly." },
      { step: "Review Applicants", detail: "Creators bid with their price. Browse their profiles and past UGC work." },
      { step: "Select & Pay", detail: "Choose your creator. Work begins. You only pay the one you pick." },
      { step: "Receive Content", detail: "Creator delivers. You approve. Done." },
    ],
    creatorFlow: [
      { step: "Browse Campaigns", detail: "See live brand briefs in your feed as soon as they're posted." },
      { step: "Bid Your Price", detail: "Apply with what you'd charge. Stand out with your portfolio." },
      { step: "Get Selected", detail: "Brand picks you. Accept the job and start creating." },
      { step: "Deliver & Earn", detail: "Submit your content, get approved, get paid." },
    ],
    accent: "You control who creates your content — no surprises.",
    creatorAccent: "No minimum followers. Your work speaks for itself."
  },
  {
    id: "clipping",
    icon: "✂️",
    name: "Clipping",
    color: "var(--clip)",
    colorHex: "#00D4A8",
    tagline: "Long videos. Viral short clips. Real reach.",
    description: "Brands upload their long-form content. Clippers cut it into scroll-stopping short videos and post them everywhere. Pay is based on verified organic views.",
    brandFlow: [
      { step: "Upload Your Content", detail: "Share a Google Drive link or upload a video under 200MB." },
      { step: "Clippers Get Notified", detail: "Your content reaches our clipper network immediately." },
      { step: "Content Goes Everywhere", detail: "Clippers post across TikTok, Reels, YouTube Shorts, Twitter." },
      { step: "Pay Per Verified View", detail: "We verify organic view counts and pay clippers. You only pay for real reach." },
    ],
    creatorFlow: [
      { step: "Pick a Brand's Video", detail: "Browse available brand videos ready to be clipped." },
      { step: "Create Short Clips", detail: "Cut the best moments into engaging short-form content." },
      { step: "Post Across Platforms", detail: "Publish on your socials. Submit your links to ClippaPay." },
      { step: "Earn Per Verified View", detail: "We check your view count. Hit the milestone, get paid." },
    ],
    accent: "Every view is verified. Every payment is earned.",
    creatorAccent: "Turn someone else's content into your income stream."
  },
  {
    id: "affiliate",
    icon: "🔗",
    name: "Marketplace",
    color: "var(--aff)",
    colorHex: "#A78BFA",
    tagline: "Post. Link. Earn commissions.",
    description: "Creators browse brand products, get a unique referral link, and earn a commission on every sale they drive. Brands pay only when a sale is made.",
    brandFlow: [
      { step: "List Your Product", detail: "Set your product, commission rate, and campaign guidelines." },
      { step: "Creators Join", detail: "Creators browse and apply to promote your product." },
      { step: "Content Gets Made", detail: "Creators make videos with your product and post their referral link." },
      { step: "Pay On Sale Only", detail: "A sale is made through a creator's link? That's when you pay. Zero risk." },
    ],
    creatorFlow: [
      { step: "Browse the Marketplace", detail: "See available products, commission rates, and campaign details." },
      { step: "Join a Campaign", detail: "Read the brief, get your unique referral link generated instantly." },
      { step: "Create & Post", detail: "Make your video. Attach your link. Post on your platforms." },
      { step: "Track Sales & Earn", detail: "Every sale through your link is tracked. Your commission is automatic." },
    ],
    accent: "No sale, no charge. Pure performance marketing.",
    creatorAccent: "Your link works 24/7. Earn while you sleep."
  }
];

function PillarCard({ pillar, isActive, onClick }) {
  return (
    <button onClick={onClick} className="font-body" style={{
      flex: 1,
      padding: "24px 24px",
      borderRadius: 16,
      border: `2px solid ${isActive ? pillar.color : "var(--border)"}`,
      background: isActive ? pillar.colorHex + "0F" : "var(--card)",
      color: isActive ? pillar.color : "var(--muted)",
      cursor: "pointer",
      transition: "all 0.25s",
      textAlign: "left",
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = pillar.color + "66"; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = "var(--border)"; }}
    >
      <span style={{ fontSize: 32 }}>{pillar.icon}</span>
      <div style={{ fontSize: 18, fontWeight: 700, color: isActive ? pillar.color : "var(--white)", fontFamily: "'Syne', sans-serif" }}>{pillar.name}</div>
      <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.5 }}>{pillar.tagline}</div>
    </button>
  );
}

function FlowStep({ step, detail, index, color }) {
  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
      <div style={{
        width: 42, height: 42, borderRadius: "50%",
        background: color + "18",
        border: `2px solid ${color}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        color: color, fontSize: 15, fontWeight: 800,
        fontFamily: "'Syne', sans-serif"
      }}>{index + 1}</div>
      <div style={{ paddingTop: 8 }}>
        <div className="font-body" style={{ fontSize: 16, fontWeight: 700, color: "var(--white)", marginBottom: 4 }}>{step}</div>
        <div className="font-body" style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.6 }}>{detail}</div>
      </div>
    </div>
  );
}

function PillarsSection() {
  const [active, setActive] = useState(0);
  const [view, setView] = useState("brand");
  const pillar = PILLARS[active];

  return (
    <section style={{ padding: "100px 24px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 60 }}>
        <Tag color="var(--white)">How It Works</Tag>
        <h2 className="font-display section-title" style={{ fontSize: "clamp(36px, 7vw, 58px)", fontWeight: 800, color: "var(--white)", marginTop: 24, letterSpacing: -1.5, lineHeight: 1.1 }}>
          Three ways to work together.
        </h2>
        <p className="font-body" style={{ fontSize: 18, color: "var(--muted)", marginTop: 20, maxWidth: 600, margin: "20px auto 0" }}>
          Pick the model that fits your goal. Brands can use all three. Creators can earn from all three.
        </p>
      </div>

      {/* Pillar tabs */}
      <div style={{ display: "flex", gap: 16, marginBottom: 48, flexWrap: "wrap" }}>
        {PILLARS.map((p, i) => (
          <PillarCard key={i} pillar={p} isActive={active === i} onClick={() => setActive(i)} />
        ))}
      </div>

      {/* Detail panel */}
      <div style={{
        background: "var(--card)",
        border: `2px solid ${pillar.colorHex}44`,
        borderRadius: 28,
        overflow: "hidden",
        position: "relative"
      }}>
        <GlowOrb color={pillar.color} size={500} x="90%" y="10%" opacity={0.08} />

        {/* Panel header */}
        <div style={{
          padding: "40px 44px 32px",
          borderBottom: `2px solid var(--border)`,
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 20
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
              <span style={{ fontSize: 40 }}>{pillar.icon}</span>
              <h3 className="font-display" style={{ fontSize: 32, fontWeight: 800, color: pillar.color, letterSpacing: -0.5 }}>{pillar.name}</h3>
            </div>
            <p className="font-body" style={{ fontSize: 17, color: "var(--muted)", maxWidth: 550, lineHeight: 1.6 }}>{pillar.description}</p>
          </div>

          {/* View toggle */}
          <div style={{
            display: "flex",
            background: "var(--surface)",
            borderRadius: 14,
            border: "2px solid var(--border)",
            padding: 6,
            gap: 6,
            flexShrink: 0
          }}>
            {["brand", "creator"].map(v => (
              <button key={v} onClick={() => setView(v)} className="font-body" style={{
                padding: "10px 24px",
                borderRadius: 10,
                border: "none",
                background: view === v ? pillar.color : "transparent",
                color: view === v ? "#fff" : "var(--muted)",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                transition: "all 0.2s",
                textTransform: "capitalize"
              }}>{v === "brand" ? "🏷️ Brand" : "🎥 Creator"}</button>
            ))}
          </div>
        </div>

        {/* Flow steps */}
        <div style={{ padding: "40px 44px 44px", display: "flex", flexDirection: "column", gap: 28 }}>
          {(view === "brand" ? pillar.brandFlow : pillar.creatorFlow).map((step, i) => (
            <FlowStep key={i} {...step} index={i} color={pillar.colorHex} />
          ))}

          {/* Accent bar */}
          <div style={{
            marginTop: 12,
            padding: "20px 24px",
            background: pillar.colorHex + "0D",
            border: `2px solid ${pillar.colorHex}33`,
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            gap: 16
          }}>
            <span style={{ fontSize: 22 }}>✦</span>
            <span className="font-body" style={{ fontSize: 16, color: "var(--white)", fontWeight: 600, lineHeight: 1.5 }}>
              {view === "brand" ? pillar.accent : pillar.creatorAccent}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── For Brands / Creators sections ──────────────────────────────────────────

function ForBrands() {
  const benefits = [
    { icon: "🎯", title: "Targeted UGC", body: "Post a campaign brief, receive bids from creators, review their past work, and choose who makes your content." },
    { icon: "📡", title: "Content Distribution", body: "Upload your long video once. Our Clippers transform it into short viral content and spread it everywhere." },
    { icon: "💸", title: "Performance Sales", body: "List your product in the Marketplace. Creators promote it. You pay commission only when a sale is made." },
    { icon: "📊", title: "Full Visibility", body: "Track views, clicks, conversions, and payouts in real-time. Every creator. Every campaign." },
    { icon: "🔒", title: "Brand Safe", body: "Review every creator's profile and past content before selecting them. No blindside surprises." },
    { icon: "⚡", title: "One Platform", body: "UGC, Clipping, and Affiliate — all under one roof. Launch all three or start with one." },
  ];

  return (
    <section id="brands" style={{ padding: "80px 24px 100px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ position: "relative", background: "var(--card)", border: "2px solid var(--border)", borderRadius: 32, padding: "60px 50px", overflow: "hidden" }}>
        <GlowOrb color="var(--ugc)" size={600} x="100%" y="0%" opacity={0.06} />

        <Tag color="var(--ugc)">For Brands</Tag>
        <h2 className="font-display section-title" style={{ fontSize: "clamp(32px, 6vw, 52px)", fontWeight: 800, color: "var(--white)", marginTop: 20, letterSpacing: -1, lineHeight: 1.1, marginBottom: 20, maxWidth: 700 }}>
          Everything your brand needs to win with creators.
        </h2>
        <p className="font-body" style={{ fontSize: 18, color: "var(--muted)", lineHeight: 1.7, maxWidth: 600, marginBottom: 50 }}>
          No more cold influencer DMs. No agency fees. No wasted budget. ClippaPay gives brands direct access to creators who produce, distribute, and sell.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {benefits.map((b, i) => (
            <div key={i} style={{
              padding: "26px 26px",
              background: "var(--surface)",
              borderRadius: 18,
              border: "2px solid var(--border)",
              transition: "border-color 0.2s, transform 0.2s"
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#FF5F3866"; e.currentTarget.style.transform = "translateY(-4px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div style={{ fontSize: 32, marginBottom: 14 }}>{b.icon}</div>
              <div className="font-display" style={{ fontSize: 18, fontWeight: 700, color: "var(--white)", marginBottom: 10 }}>{b.title}</div>
              <div className="font-body" style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.6 }}>{b.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ForCreators() {
  const paths = [
    {
      icon: "🎬",
      title: "UGC Creator",
      color: "var(--ugc)",
      colorHex: "#FF5F38",
      tagline: "Make content. Get paid per project.",
      req: "A phone, creativity, and a portfolio",
      earn: "Set your own rate per project",
      steps: ["Browse brand campaigns", "Bid your price", "Get selected", "Deliver content → get paid"]
    },
    {
      icon: "✂️",
      title: "Clipper",
      color: "var(--clip)",
      colorHex: "#00D4A8",
      tagline: "Edit clips. Earn per view milestone.",
      req: "Basic editing skills + any social account",
      earn: "Paid per verified organic view",
      steps: ["Pick a brand video", "Clip the best parts", "Post on your socials", "Hit view milestone → get paid"]
    },
    {
      icon: "🔗",
      title: "Affiliate Creator",
      color: "var(--aff)",
      colorHex: "#A78BFA",
      tagline: "Post with a link. Earn commissions.",
      req: "Any social presence — no minimum followers",
      earn: "Commission % on every sale",
      steps: ["Browse marketplace", "Join a product campaign", "Post with your unique link", "Sale made → commission earned"]
    }
  ];

  return (
    <section id="creators" style={{ padding: "20px 24px 100px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 50 }}>
        <Tag color="var(--aff)">For Creators</Tag>
        <h2 className="font-display section-title" style={{ fontSize: "clamp(32px, 6vw, 52px)", fontWeight: 800, color: "var(--white)", marginTop: 20, letterSpacing: -1, lineHeight: 1.1 }}>
          Three ways to earn.<br />
          <span style={{ background: "linear-gradient(135deg, var(--aff), var(--clip))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            No gatekeeping.
          </span>
        </h2>
        <p className="font-body" style={{ fontSize: 18, color: "var(--muted)", lineHeight: 1.7, maxWidth: 600, margin: "20px auto 0" }}>
          You don't need millions of followers. You need a phone, some creativity, and ClippaPay.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
        {paths.map((p, i) => (
          <div key={i} style={{
            background: "var(--card)",
            border: `2px solid ${p.colorHex}33`,
            borderRadius: 26,
            overflow: "hidden",
            position: "relative",
            transition: "transform 0.2s, box-shadow 0.2s"
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = `0 30px 70px ${p.colorHex}22`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ height: 5, background: `linear-gradient(90deg, ${p.colorHex}, ${p.colorHex}44)` }} />
            <div style={{ padding: "32px 32px 36px" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>{p.icon}</div>
              <h3 className="font-display" style={{ fontSize: 26, fontWeight: 800, color: p.color, letterSpacing: -0.3, marginBottom: 8 }}>{p.title}</h3>
              <p className="font-body" style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1.5, marginBottom: 26 }}>{p.tagline}</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
                {p.steps.map((s, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: p.colorHex, fontFamily: "'Syne', sans-serif", minWidth: 22, paddingTop: 2 }}>0{j + 1}</span>
                    <span className="font-body" style={{ fontSize: 15, color: "var(--white)", lineHeight: 1.5 }}>{s}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 24, borderTop: "2px solid var(--border)" }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <span className="font-body" style={{ fontSize: 13, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, minWidth: 70 }}>Requires</span>
                  <span className="font-body" style={{ fontSize: 14, color: "var(--white)" }}>{p.req}</span>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <span className="font-body" style={{ fontSize: 13, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, minWidth: 70 }}>Earn</span>
                  <span className="font-body" style={{ fontSize: 14, color: p.color, fontWeight: 600 }}>{p.earn}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Why ClippaPay ─────────────────────────────────────────────────────────────

function WhySection() {
  return (
    <section style={{ padding: "0 24px 100px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{
        background: `linear-gradient(135deg, #0E0E18, #12121F)`,
        border: "2px solid var(--border-bright)",
        borderRadius: 32,
        padding: "60px 50px",
        position: "relative",
        overflow: "hidden",
        textAlign: "center"
      }}>
        <GlowOrb color="var(--aff)" size={500} x="50%" y="50%" opacity={0.08} />

        <div style={{ position: "relative" }}>
          <Tag color="var(--clip)">The ClippaPay Advantage</Tag>
          <h2 className="font-display section-title" style={{ fontSize: "clamp(32px, 6vw, 52px)", fontWeight: 800, color: "var(--white)", marginTop: 24, letterSpacing: -1, lineHeight: 1.1, marginBottom: 20 }}>
            Built for everyone.<br />Designed for results.
          </h2>
          <p className="font-body" style={{ fontSize: 18, color: "var(--muted)", lineHeight: 1.7, maxWidth: 600, margin: "0 auto 60px" }}>
            ClippaPay isn't just another influencer platform. It's a full-stack creator economy — from content production to viral distribution to affiliate sales.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 2 }}>
            {[
              { label: "No follower minimum", icon: "✓", color: "var(--clip)" },
              { label: "Pay only for results", icon: "✓", color: "var(--clip)" },
              { label: "Verified view counts", icon: "✓", color: "var(--clip)" },
              { label: "Tracked affiliate links", icon: "✓", color: "var(--clip)" },
              { label: "Creator portfolio reviews", icon: "✓", color: "var(--clip)" },
              { label: "All three models in one", icon: "✓", color: "var(--clip)" },
            ].map((item, i) => (
              <div key={i} style={{
                padding: "22px 24px",
                background: "var(--bg)",
                border: "2px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: 14,
                borderRadius: i === 0 ? "12px 0 0 0" : i === 1 ? "0" : i === 2 ? "0 12px 0 0" : i === 3 ? "0 0 0 12px" : i === 4 ? "0" : "0 0 12px 0"
              }}>
                <span style={{ color: "var(--clip)", fontWeight: 800, fontSize: 18 }}>{item.icon}</span>
                <span className="font-body" style={{ fontSize: 16, color: "var(--white)", fontWeight: 500 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────

function CTA() {
  return (
    <section style={{ padding: "0 24px 120px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
      <div style={{
        background: "var(--card)",
        border: "2px solid var(--border-bright)",
        borderRadius: 32,
        padding: "70px 50px",
        position: "relative",
        overflow: "hidden"
      }}>
        <GlowOrb color="var(--ugc)" size={400} x="10%" y="50%" opacity={0.08} />
        <GlowOrb color="var(--aff)" size={400} x="90%" y="50%" opacity={0.08} />

        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 50, marginBottom: 24 }}>✦</div>
          <h2 className="font-display section-title" style={{ fontSize: "clamp(32px,6vw,52px)", fontWeight: 800, color: "var(--white)", letterSpacing: -1, lineHeight: 1.1, marginBottom: 24 }}>
            Ready to join ClippaPay?
          </h2>
          <p className="font-body" style={{ fontSize: 18, color: "var(--muted)", lineHeight: 1.7, maxWidth: 500, margin: "0 auto 48px" }}>
            Whether you're a brand that needs content or a creator that wants to earn — your spot is waiting.
          </p>
          <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/signup?role=advertiser">
              <button className="font-body" style={{
                padding: "18px 42px",
                borderRadius: 14,
                border: "none",
                background: "linear-gradient(135deg, var(--ugc), #FF9A38)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
                boxShadow: "0 8px 32px #FF5F3844",
                transition: "transform 0.2s, box-shadow 0.2s"
              }}
                onMouseEnter={e => { e.target.style.transform = "scale(1.04)"; e.target.style.boxShadow = "0 15px 50px #FF5F3866"; }}
                onMouseLeave={e => { e.target.style.transform = "scale(1)"; e.target.style.boxShadow = "0 8px 32px #FF5F3844"; }}
              >
                Sign Up as a Brand
              </button>
            </Link>
            <Link to="/signup?role=creator">
              <button className="font-body" style={{
                padding: "18px 42px",
                borderRadius: 14,
                border: "2px solid var(--aff)",
                background: "transparent",
                color: "var(--aff)",
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
                onMouseEnter={e => { e.target.style.background = "#A78BFA18"; }}
                onMouseLeave={e => { e.target.style.background = "transparent"; }}
              >
                Join as a Creator
              </button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────

function Nav({ onNav }) {
  return (
    <nav style={{
      position: "sticky",
      top: 0,
      zIndex: 200,
      background: "#060608CC",
      backdropFilter: "blur(16px)",
      borderBottom: "2px solid var(--border)",
      padding: "18px 32px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 16
    }}>
      <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
        {/* Original ClippaPay logo/text */}
        <span className="font-display" style={{ fontSize: 24, fontWeight: 800, background: "linear-gradient(135deg, var(--ugc), var(--aff))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -0.5 }}>ClippaPay</span>
      </Link>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {["UGC", "Clipping", "Marketplace"].map((item, i) => (
          <button key={i} onClick={() => onNav(item)} className="font-body" style={{
            padding: "8px 18px",
            borderRadius: 10,
            border: "2px solid var(--border)",
            background: "transparent",
            color: "var(--muted)",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
            onMouseEnter={e => { e.target.style.color = "var(--white)"; e.target.style.borderColor = "var(--border-bright)"; }}
            onMouseLeave={e => { e.target.style.color = "var(--muted)"; e.target.style.borderColor = "var(--border)"; }}
          >{item}</button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <Link to="/login">
          <button className="font-body" style={{
            padding: "10px 24px", borderRadius: 12, border: "2px solid var(--border-bright)",
            background: "transparent", color: "var(--white)", fontWeight: 600, fontSize: 14, cursor: "pointer"
          }}>Log In</button>
        </Link>
        <Link to="/signup">
          <button className="font-body" style={{
            padding: "10px 24px", borderRadius: 12, border: "none",
            background: "var(--white)", color: "var(--bg)", fontWeight: 700, fontSize: 14, cursor: "pointer"
          }}>Get Started</button>
        </Link>
      </div>
    </nav>
  );
}

// ── Main HomePage Component ───────────────────────────────────────────────────────

export default function HomePage() {
  const [activeSection, setActiveSection] = useState(null);
  const pillarsRef = useRef(null);

  const handleExplore = (section) => {
    setActiveSection(section);
    setTimeout(() => {
      const el = document.getElementById(section);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleNav = (label) => {
    if (pillarsRef.current) {
      pillarsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", fontFamily: "'Outfit', sans-serif" }}>
      <style>{STYLES}</style>
      <Nav onNav={handleNav} />
      <Ticker />
      <Hero onExplore={handleExplore} />
      <div ref={pillarsRef}>
        <PillarsSection />
      </div>
      <ForBrands />
      <ForCreators />
      <WhySection />
      <CTA />

      {/* Footer */}
      <footer style={{ borderTop: "2px solid var(--border)", padding: "32px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="font-display" style={{ fontSize: 18, fontWeight: 800, color: "var(--muted)" }}>ClippaPay</span>
        </div>
        <span className="font-body" style={{ fontSize: 14, color: "var(--muted)" }}>Create. Clip. Convert. © 2026</span>
        <div style={{ display: "flex", gap: 8 }}>
          <Tag color="var(--ugc)">UGC</Tag>
          <Tag color="var(--clip)">Clipping</Tag>
          <Tag color="var(--aff)">Marketplace</Tag>
        </div>
      </footer>
    </div>
  );
}