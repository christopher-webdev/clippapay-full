import { Link } from "react-router-dom";
import { useInView, motion, AnimatePresence, useScroll, useTransform, useSpring } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import heroImage from "/hero-clip.png";
import { PlayIcon, SparklesIcon, UsersIcon } from "@heroicons/react/24/outline";
import { ChevronDown } from 'lucide-react';
import NavBar from "../components/NavBar";

function useCounter(start = 0, end = 1000, speed = 20) {
    const [value, setValue] = useState(start);
    useEffect(() => {
        let current = start;
        const interval = setInterval(() => {
            current += Math.ceil((end - start) / 50);
            if (current >= end) {
                setValue(end);
                clearInterval(interval);
            } else {
                setValue(current);
            }
        }, speed);
        return () => clearInterval(interval);
    }, [start, end, speed]);
    return value;
}

const faqs = [
    {
        question: 'What is ClippaPay?',
        answer: (
            <>
                <p>ClippaPay is a next-generation advertising platform that pays everyday people—known as Clippers—to post short, engaging video ads on platforms like TikTok, Instagram, and WhatsApp. We leverage viral content strategies to turn views into income, ensuring instant payouts to creators.</p>
            </>
        ),
    },
    {
        question: 'How do I submit proof of repost?',
        answer: <p>Paste your YouTube, TikTok, or Instagram link along with tracked views, then click <strong>Submit Proof</strong>.</p>,
    },
    {
        question: 'When do I get paid?',
        answer: <p>Approved reposts are paid out daily. Withdrawals are available once your in-wallet balance exceeds ₦1,000.</p>,
    },
    {
        question: 'How much can I really earn with ClippaPay?',
        answer: (
            <>
                <p>Your earning potential is limitless. Many dedicated users earn over ₦500,000 per month with just a few hours of daily clipping. People are literally buying houses from clipping.</p>
            </>
        ),
    },
    {
        question: 'Who do ClippaPay Clippers work with?',
        answer: (
            <>
                <p>We partner with major streaming platforms, global brands, and rising tech companies. Even with a new bank account, you can clip for top names and get paid instantly.</p>
            </>
        ),
    },
    {
        question: 'What platforms does ClippaPay support?',
        answer: (
            <>
                <p>Currently, we focus on TikTok, YouTube and Instagram. Our WhatsApp Clipping feature is launching soon, allowing brands to go viral through status updates.</p>
            </>
        ),
    },
    {
        question: 'I don\'t have followers... can I still earn?',
        answer: (
            <>
                <p>Absolutely. Even 100–200 views per day can earn you money. We provide training to help you grow your audience over time.</p>
            </>
        ),
    },
    {
        question: 'Why is ClippaPay doing this? What\'s in it for you?',
        answer: (
            <>
                <p>We aim to build the largest human-powered ad network ever. When you win, we win. All we ask is that you clip with passion; we handle the rest.</p>
            </>
        ),
    },
];

export default function HomePage() {
    const campaignSamples = [
        { title: "Clippapay Onboarding Challenge", rate: "₦0.2/view", category: "Business & Investment" },
        { title: "Dance with VibeStream", rate: "₦0.2/view", category: "Entertainment" },
        { title: "GlowUp Skincare Tease", rate: "₦0.2/view", category: "Health & Fitness" },
    ];

    const [openIndex, setOpenIndex] = useState(null);

    const toggle = (index) => setOpenIndex(openIndex === index ? null : index);

    const ref = useRef(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
    const bgY = useTransform(scrollYProgress, [0, 1], ['100%', '60%']);
    const smoothBgY = useSpring(bgY, { stiffness: 100, damping: 25 });


    return (
        <div className="min-h-screen bg-white font-sans">
            {/* === HERO SECTION === */}
            <NavBar />
            <section
                ref={ref}
                className="relative w-full min-h-screen overflow-hidden flex flex-col justify-center items-center text-center bg-black px-4 py-24 sm:py-32"
            >
                {/* Background Gradient Overlay */}
                <motion.div
                    style={{ y: smoothBgY }}
                    className="absolute inset-0 bg-gradient-to-b from-emerald-600 via-purple-700 to-yellow-400 opacity-80"
                />

                {/* Animated Gradient Blobs */}
                <motion.div
                    className="absolute -top-20 -left-20 w-72 h-72 bg-purple-700 rounded-full filter blur-[100px] opacity-40 sm:w-96 sm:h-96"
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 45, 0] }}
                    transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute bottom-0 right-0 w-60 h-60 bg-emerald-300 rounded-full filter blur-[80px] opacity-30 sm:w-80 sm:h-80"
                    animate={{ x: [0, -50, 0], y: [0, -20, 0] }}
                    transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* Hero Title */}
                <motion.h1
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: {},
                        visible: { transition: { staggerChildren: 0.06, delayChildren: 0.4 } },
                    }}
                    className="relative z-10 text-white text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold leading-tight max-w-4xl text-center"
                >
                    {"Turn Your Views Into Income".split(" ").map((word, idx) => (
                        <motion.span
                            key={idx}
                            className="inline-block mr-2"
                            variants={{
                                hidden: { opacity: 0, y: 20 },
                                visible: { opacity: 1, y: 0 },
                            }}
                        >
                            {word}
                        </motion.span>
                    ))}
                </motion.h1>


                {/* Subheading */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2, duration: 0.8 }}
                    className="relative z-10 mt-8 max-w-2xl text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-white"
                >
                    Advertiser Clips go viral instantly
                    <span className="mx-2">•</span>
                    Clippers earn up to ₦500,000/month
                    <br />
                    <span className="text-gray-300 text-base sm:text-lg mt-2 block">
                        No followers? No problem. Start clipping today.
                    </span>
                </motion.p>


                {/* Decorative Gradient Underline */}
                <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 1.6, duration: 0.6 }}
                    className="relative z-10 mt-6 w-32 h-1 bg-gradient-to-r from-yellow-300 via-purple-500 to-emerald-400 origin-left"
                />

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 2.2, duration: 0.6 }}
                    className="relative z-10 flex flex-col sm:flex-row gap-5 mt-10"
                >
                    <Link
                        to="/signup"
                        className="group relative overflow-hidden px-8 py-4 bg-gradient-to-r from-yellow-300 to-emerald-400 text-black font-bold rounded-full shadow-xl hover:shadow-2xl transition-transform transform hover:scale-105"
                    >
                        <span className="relative z-10">Get Started</span>
                    </Link>

                    <Link
                        to="/signup?role=advertiser"
                        className="group relative overflow-hidden px-8 py-4 border-2 border-white text-white font-bold rounded-full shadow-xl hover:border-yellow-300 hover:text-yellow-300 hover:bg-black/20 transition-colors"
                    >
                        <span className="relative z-10">Advertise & Go Viral</span>
                    </Link>

                    <Link
                        to="/about"
                        className="px-8 py-4 bg-white text-black font-bold rounded-full shadow-xl hover:bg-gray-100 transition"
                    >
                        Learn More
                    </Link>
                </motion.div>
            </section>


            {/* === FEATURE COMPARISON: CLIPPERS VS ADVERTISERS === */}
            <section className="bg-gradient-to-b from-white to-indigo-50 py-24 px-6 sm:px-10">
                <div className="max-w-6xl mx-auto text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
                        Earners & Advertisers, We’ve Got You Covered
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Whether you're reposting content or launching a campaign, ClippaPay makes it seamless.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-10 max-w-6xl mx-auto">
                    {/* Clippers Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl border border-gray-100 transition"
                    >
                        <div className="flex items-center mb-5">
                            <div className="bg-green-100 p-3 rounded-full mr-4">
                                <PlayIcon className="w-7 h-7 text-green-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800">For Clippers</h3>
                        </div>
                        <ul className="space-y-4 text-gray-700 text-base">
                            <li>📲 Repost video ads on TikTok, Instagram & YouTube</li>
                            <li>💸 Earn ₦ per verified view with daily payouts</li>
                            <li>🚀 Get fresh campaigns every day</li>
                            <li>🎯 Compete on leaderboards & earn bonus rewards</li>
                            <li>🙌 No followers needed — anyone can earn</li>
                        </ul>
                    </motion.div>

                    {/* Advertisers Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl border border-gray-100 transition"
                    >
                        <div className="flex items-center mb-5">
                            <div className="bg-blue-100 p-3 rounded-full mr-4">
                                <UsersIcon className="w-7 h-7 text-blue-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800">For Advertisers</h3>
                        </div>
                        <ul className="space-y-4 text-gray-700 text-base">
                            <li>🔍 Reach real people via viral reposts</li>
                            <li>📊 Track ROI & view stats in real-time</li>
                            <li>🤖 Anti-bot detection with AI-powered verification</li>
                            <li>💰 Pay only for real, verified views</li>
                            <li>🔐 Escrow system guarantees delivery or refund</li>
                        </ul>
                    </motion.div>
                </div>
            </section>

            {/* === TRENDING CAMPAIGNS === */}
            <section className="bg-white py-24 px-6 sm:px-10 text-center">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-4xl font-bold text-gray-900 mb-6">
                        Trending Campaigns 🔥
                    </h2>
                    <p className="text-lg text-gray-600 mb-12">
                        Start earning by reposting these active high-reward campaigns.
                    </p>

                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {[
                            { title: "Clippapay Onboarding Challenge", rate: "₦0.2/view", category: "Business & Investment" },
                            { title: "Dance with VibeStream", rate: "₦0.2/view", category: "Entertainment" },
                            { title: "GlowUp Skincare Tease", rate: "₦0.2/view", category: "Health & Fitness" },
                        ].map((camp, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: i * 0.2 }}
                                className="bg-indigo-50 hover:bg-indigo-100 p-6 rounded-2xl shadow-md text-left transition"
                            >
                                <h3 className="text-lg font-semibold text-indigo-800 mb-1">{camp.title}</h3>
                                <p className="text-sm text-gray-600">Reward: <strong>{camp.rate}</strong></p>
                                <p className="text-xs text-gray-500 mt-1">Category: {camp.category}</p>
                            </motion.div>
                        ))}
                    </div>

                    <Link
                        to="/signup"
                        className="mt-10 inline-block bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-full font-medium shadow transition hover:scale-105"
                    >
                        View All Campaigns →
                    </Link>
                </div>
            </section>
            {/* === PROOF + PAYOUT FLOW === */}
            <section className="py-24 px-6 sm:px-10 bg-gradient-to-b from-white to-gray-50 text-center">
                <h2 className="text-4xl font-bold text-gray-900 mb-6">
                    Simple Process. Guaranteed Payouts.
                </h2>
                <p className="max-w-2xl mx-auto text-gray-600 mb-12 text-lg">
                    You post. We verify. You get paid. ClippaPay ensures every view is real and every payment is prompt.
                </p>

                <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8 text-left">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="bg-white p-6 rounded-xl shadow-md border border-gray-100"
                    >
                        <h3 className="text-xl font-semibold text-emerald-700 mb-2">1. Submit Your Link</h3>
                        <p className="text-gray-700">Paste your TikTok, Instagram or YouTube URL after posting your assigned clip.</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="bg-white p-6 rounded-xl shadow-md border border-gray-100"
                    >
                        <h3 className="text-xl font-semibold text-indigo-700 mb-2">2. We Verify Views</h3>
                        <p className="text-gray-700">Our AI + human reviewers cross-check view count, engagement quality, and platform analytics.</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        className="bg-white p-6 rounded-xl shadow-md border border-gray-100"
                    >
                        <h3 className="text-xl font-semibold text-yellow-700 mb-2">3. Get Paid Instantly</h3>
                        <p className="text-gray-700">Once approved, your earnings drop straight into your ClippaPay wallet. Withdraw anytime.</p>
                    </motion.div>
                </div>
            </section>

            {/* === TESTIMONIALS === */}
            <section className="bg-white py-24 px-6 sm:px-10 text-center">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-4xl font-bold text-gray-900 mb-6">What Clippers Are Saying</h2>
                    <p className="text-lg text-gray-600 mb-12">Don’t just take our word for it. See how ClippaPay is changing lives every day.</p>

                    <div className="grid md:grid-cols-2 gap-10 text-left">
                        {[
                            { name: "Ada E.", quote: "Made ₦75,000 in my first 5 days. I just post videos daily on IG!" },
                            { name: "Tolu J.", quote: "This is the first app that actually pays without wasting my time." },
                        ].map((t, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: i * 0.3 }}
                                className="bg-indigo-50 p-6 rounded-2xl shadow-md"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                                        {t.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-indigo-700">{t.name}</p>
                                        <p className="text-sm text-gray-500">Verified Clipper</p>
                                    </div>
                                </div>
                                <p className="text-gray-700 italic text-base">“{t.quote}”</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>
            {/* === SAMPLE CLIPS CAROUSEL === */}
            <section className="bg-gradient-to-b from-indigo-50 to-emerald-50 py-24 px-6 sm:px-10 text-center">
                <h2 className="text-4xl font-bold text-gray-900 mb-6">Sample Clips You Can Repost</h2>
                <p className="text-lg text-gray-600 mb-10">
                    Real examples. Easy to repost. Watch & start earning.
                </p>

                <div className="relative">
                    <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth px-1 md:px-0 pb-2 hide-scrollbar">
                        {[4, 3, 2, 1].map((i) => (
                            <motion.div
                                key={i}
                                whileHover={{ scale: 1.05 }}
                                className="snap-center flex-shrink-0 w-[260px] bg-white rounded-2xl shadow-md p-4"
                            >
                                <video
                                    src={`/video${i}.mp4`}
                                    className="w-full h-96 rounded-xl object-cover mb-3"
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                />
                                <h3 className="font-semibold text-indigo-800 text-base mb-1">Campaign {i}</h3>
                                <p className="text-sm text-gray-600">Earn ₦0.2/view • Entertainment</p>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <p className="text-center text-sm text-gray-500 mt-6">
                    Login to access the full library of clips.
                </p>
            </section>

            {/* === GLOBAL REACH SECTION === */}
            <section className="bg-white py-24 px-6 sm:px-10 text-center">
                <motion.h2
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-4xl font-bold text-gray-900 mb-6"
                >
                    Trusted Across the Globe 🌍
                </motion.h2>

                <p className="max-w-2xl mx-auto text-lg text-gray-600 mb-12">
                    ClippaPay is trusted by over <strong>10,000 creators</strong> and <strong>3,000 advertisers</strong> from Lagos to LA. We're building the largest grassroots media network in the world.
                </p>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-6 max-w-4xl mx-auto text-4xl opacity-70">
                    {['🇳🇬', '🇺🇸', '🇬🇧', '🇿🇦', '🇨🇦', '🇮🇳'].map((flag, i) => (
                        <motion.div
                            key={i}
                            whileHover={{ scale: 1.1 }}
                            className="transition-transform"
                        >
                            {flag}
                        </motion.div>
                    ))}
                </div>
            </section>
            {/* === AI & ESCROW TRUST SYSTEM === */}
            <section className="bg-gradient-to-br from-white to-gray-100 py-24 px-6 sm:px-10 text-center">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-4xl font-bold text-gray-900 mb-6">AI-Powered Discovery Meets Human Hustle</h2>

                    <p className="text-lg text-gray-700 mb-6">
                        We use smart AI to find the most viral content formats — then give you the exact clips to post. You bring the reach. We handle the rest.
                    </p>

                    <p className="text-lg text-gray-700 mb-10">
                        Every campaign is backed by escrow. So you’re guaranteed to get paid — no matter what.
                    </p>

                    <Link
                        to="/signup"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full font-semibold transition"
                    >
                        Try It Now
                    </Link>
                </div>
            </section>

            {/* === MID CALL TO ACTION === */}
            <motion.section
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                viewport={{ once: true }}
                className="bg-indigo-700 text-white py-24 px-6 sm:px-10 text-center relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600 to-emerald-500 opacity-30 z-0 blur-3xl" />
                <div className="relative z-10">
                    <h2 className="text-4xl font-bold mb-4">Join the Revolution 🚀</h2>
                    <p className="text-lg mb-6">
                        Your phone is already online. Why not let it pay you back?
                    </p>
                    <Link
                        to="/signup"
                        className="bg-white text-indigo-700 font-semibold px-8 py-3 rounded-full shadow hover:bg-gray-100 transition-transform duration-300 hover:scale-105"
                    >
                        Join Now — It’s Free
                    </Link>
                </div>
            </motion.section>
            {/* === FAQ SECTION === */}
            <section className="bg-gradient-to-br from-white to-gray-50 py-24 px-6 sm:px-10">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
                    <p className="text-lg text-gray-600 mb-12">
                        Got questions? We've answered the most common ones below.
                    </p>

                    <div className="space-y-4 text-left">
                        {faqs.map((item, idx) => (
                            <div key={idx} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                                <button
                                    onClick={() => toggle(idx)}
                                    className="w-full flex justify-between items-center px-6 py-4 focus:outline-none"
                                >
                                    <span className="text-lg font-medium text-gray-900">{item.question}</span>
                                    <ChevronDown
                                        className={`h-5 w-5 text-blue-600 transform transition-transform duration-200 ${openIndex === idx ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                <AnimatePresence initial={false}>
                                    {openIndex === idx && (
                                        <motion.div
                                            key="content"
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                                            className="px-6 pb-6 text-gray-700 leading-relaxed"
                                        >
                                            {item.answer}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            {/* === NEWSLETTER OPT-IN === */}
            <section className="bg-emerald-600 text-white py-20 px-6 sm:px-10 text-center">
                <div className="max-w-xl mx-auto">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-4">Don’t Miss New Campaigns</h2>
                    <p className="mb-6 text-base sm:text-lg">
                        Get alerts when new high-paying videos go live. We’ll also send you growth tips & exclusive offers. No spam. Ever.
                    </p>

                    <form className="flex flex-col sm:flex-row gap-3 justify-center">
                        <input
                            type="email"
                            placeholder="Enter your email"
                            className="px-4 py-3 rounded-md border border-white text-black flex-1 w-full sm:max-w-xs"
                        />
                        <button
                            type="submit"
                            className="bg-white text-emerald-600 font-semibold px-6 py-3 rounded-md hover:bg-gray-100 transition"
                        >
                            Subscribe
                        </button>
                    </form>
                </div>
            </section>
            {/* === FINAL CALL TO ACTION === */}
            <section className="relative bg-indigo-700 text-white py-28 px-6 sm:px-10 text-center overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <img
                        src={heroImage}
                        alt="Background layer"
                        className="w-full h-full object-cover blur-lg"
                    />
                </div>

                <div className="relative z-10 max-w-4xl mx-auto">
                    <h2 className="text-4xl font-bold mb-4">Your Time Online Should Pay</h2>
                    <p className="text-lg mb-8">
                        ClippaPay turns your attention into income. It’s free to join. Why wait?
                    </p>
                    <Link
                        to="/signup"
                        className="bg-white text-indigo-700 font-semibold px-8 py-3 rounded-full shadow hover:bg-gray-100 transition-transform duration-300 hover:scale-105"
                    >
                        Join the Movement
                    </Link>
                </div>
            </section>
            {/* === FOOTER === */}
            <footer className="bg-indigo-900 text-white px-6 py-10 text-sm">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-8">
                    <div>
                        <h4 className="text-lg font-bold mb-2">ClippaPay</h4>
                        <p>Earn by posting. Advertise through virality.</p>
                    </div>

                    <div className="space-y-2">
                        <a href="/terms" className="hover:underline block">Terms of Service</a>
                        <a href="/privacy" className="hover:underline block">Privacy Policy</a>
                        <a href="/contact" className="hover:underline block">Contact Us</a>
                    </div>

                    <div className="space-y-2 text-right md:text-left">
                        <p>Instagram • TikTok • X</p>
                        <p>&copy; {new Date().getFullYear()} ClippaPay Inc.</p>
                    </div>
                </div>
            </footer>
            {/* === MOBILE STICKY CTA === */}
            <div className="fixed bottom-4 right-4 z-50 md:hidden">
                <Link
                    to="/signup"
                    className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-lg text-sm font-semibold animate-bounce"
                >
                    Clip & Earn Now
                </Link>
            </div>



        </div>
    );
}