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
        { title: "Clippapay Onboarding Challenge", rate: "₦1.50/view", category: "Food" },
        { title: "Dance with VibeStream", rate: "₦2.00/view", category: "Entertainment" },
        { title: "GlowUp Skincare Tease", rate: "₦1.80/view", category: "Beauty" },
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


            {/* Campaign Previews */}
            <section className="bg-white py-20 px-6 text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-12">Trending Campaigns</h2>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    {campaignSamples.map((camp, i) => (
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
            </section>




            {/* === FEATURE SECTION (CLIPPERS VS ADVERTISERS) === */}
            <section className="bg-gradient-to-b from-white to-indigo-50 py-24 px-6">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-start">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h3 className="text-3xl font-bold text-gray-900 mb-6">
                            For Clippers
                        </h3>
                        <ul className="space-y-4 text-lg text-gray-700">
                            <li>📲 Repost TikToks, Reels, or YouTube Shorts</li>
                            <li>💰 Earn ₦ per verified view</li>
                            <li>🚀 Get daily campaigns, instant payouts</li>
                            <li>🏆 Compete on leaderboards</li>
                            <li>✅ No followers required</li>
                        </ul>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h3 className="text-3xl font-bold text-gray-900 mb-6">
                            For Advertisers
                        </h3>
                        <ul className="space-y-4 text-lg text-gray-700">
                            <li>🎯 Targeted reposting by local influencers</li>
                            <li>📈 Track campaign ROI in real-time</li>
                            <li>🧾 Pay only for verified views</li>
                            <li>🧠 Powered by AI + human promotion</li>
                            <li>🔒 Guaranteed escrow protection</li>
                        </ul>
                    </motion.div>
                </div>
            </section>



            {/* Call to Action */}
            <motion.section
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                viewport={{ once: true }}
                className="bg-indigo-700 text-white py-20 px-6 text-center relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600 to-emerald-500 opacity-30 z-0 blur-3xl" />
                <div className="relative z-10">
                    <h2 className="text-4xl font-bold mb-4">Join the Revolution</h2>
                    <p className="text-lg mb-6">Your phone is already online. Now let it pay you back.</p>
                    <Link
                        to="/signup"
                        className="bg-white text-indigo-700 font-semibold px-8 py-3 rounded-full shadow hover:bg-gray-100 transition-transform duration-300 hover:scale-105"
                    >
                        Join Now — It's Free
                    </Link>
                </div>
            </motion.section>

            {/* Floating CTA on Mobile */}
            <div className="fixed bottom-5 right-5 z-50 block md:hidden">
                <Link
                    to="/signup"
                    className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-lg text-sm font-semibold animate-bounce"
                >
                    Earn Now
                </Link>
            </div>


            {/* === TESTIMONIALS === */}
            <section className="bg-white py-20 px-6 text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-12">What Clippers Are Saying</h2>
                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {[
                        { name: "Ada E.", quote: "Made ₦75,000 in my first 5 days. I just post videos daily on IG!" },
                        { name: "Tolu J.", quote: "This is the first app that actually pays without wasting my time." },
                    ].map((t, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: i * 0.3 }}
                            className="bg-indigo-50 p-6 rounded-xl shadow-md text-left"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                                    {t.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-semibold text-indigo-700">{t.name}</p>
                                    <p className="text-sm text-gray-500">Verified Clipper</p>
                                </div>
                            </div>
                            <p className="text-gray-700 italic">“{t.quote}”</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* === CAROUSEL CLIP PREVIEW (Simplified Static) === */}
            <section className="bg-gradient-to-b from-indigo-50 to-emerald-50 py-20 px-6">
                <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Sample Clips You Can Repost</h2>
                <div className="flex overflow-x-auto gap-6 pb-4 snap-x max-w-full px-6 md:px-0">
                    {[1, 2, 3, 4].map((_, i) => (
                        <motion.div
                            key={i}
                            whileHover={{ scale: 1.05 }}
                            className="min-w-[250px] max-w-[300px] bg-white rounded-xl shadow-md p-4 snap-center"
                        >
                            <div className="w-full h-44 bg-gray-200 rounded-md mb-4" />
                            <h3 className="font-semibold text-indigo-800">Campaign {i + 1}</h3>
                            <p className="text-sm text-gray-600">Earn ₦1.25/view • Entertainment</p>
                        </motion.div>
                    ))}
                </div>
                <p className="text-center text-gray-500 text-sm mt-6">Login to see full campaign list</p>
            </section>

            {/* === PRICING SECTION === */}
            <section className="bg-white py-24 px-6 text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-12">Advertiser Plans</h2>
                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {[
                        { title: "Starter", price: "₦10,000", features: ["1 campaign", "Up to 5,000 views", "Escrow-protected"], highlight: false },
                        { title: "Growth", price: "₦50,000", features: ["5 campaigns", "Up to 25,000 views", "Boosted placement"], highlight: true },
                        { title: "Enterprise", price: "₦500,000", features: ["Unlimited", "Priority placement", "Dedicated success rep"], highlight: false },
                    ].map((plan, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: i * 0.2 }}
                            className={`rounded-xl shadow-lg p-8 text-left border ${plan.highlight ? "border-emerald-600 bg-emerald-50 scale-105" : "border-gray-200 bg-white"
                                }`}
                        >
                            <h3 className="text-2xl font-bold mb-2 text-gray-900">{plan.title}</h3>
                            <p className="text-xl text-indigo-600 font-semibold mb-6">{plan.price}</p>
                            <ul className="space-y-3 text-gray-700">
                                {plan.features.map((f, j) => (
                                    <li key={j}>✅ {f}</li>
                                ))}
                            </ul>
                            <Link
                                to="/signup?role=advertiser"
                                className="mt-6 inline-block bg-indigo-600 text-white px-6 py-2 rounded-full hover:bg-indigo-700 transition"
                            >
                                Get Started
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* === STICKY CTA FOR MOBILE === */}
            <div className="fixed bottom-4 right-4 z-50 md:hidden">
                <Link
                    to="/signup"
                    className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-lg text-sm font-semibold animate-bounce"
                >
                    Clip & Earn Now
                </Link>
            </div>

            {/* === NEWSLETTER === */}
            <section className="bg-emerald-600 text-white py-16 px-6 text-center">
                <h2 className="text-2xl font-semibold mb-4">Don't Miss New Campaigns</h2>
                <p className="mb-6">Get notified when fresh high-paying videos go live. Get tips to boost your earnings and access exclusive offers. No spam.</p>
                <p></p>
                <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                    <input
                        type="email"
                        placeholder="Your email address"
                        className="px-4 py-3 rounded-md border border-white text-black flex-1"
                    />
                    <button
                        type="submit"
                        className="bg-white text-emerald-600 font-semibold px-6 py-3 rounded-md hover:bg-gray-100 transition"
                    >
                        Subscribe
                    </button>
                </form>
            </section>

            {/* === GLOBAL REACH SECTION === */}
            <section className="bg-white py-24 px-6 text-center">
                <motion.h2
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-3xl font-bold text-gray-900 mb-10"
                >
                    Trusted Across the Globe
                </motion.h2>
                <p className="max-w-2xl mx-auto text-gray-600 text-lg mb-12">
                    ClippaPay is used by over 50,000 creators and 3,000+ advertisers from Lagos to LA. We're building the largest grassroots media network in the world.
                </p>
                <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 opacity-70">
                    {['🇳🇬', '🇺🇸', '🇬🇧', '🇿🇦', '🇨🇦', '🇮🇳'].map((flag, i) => (
                        <motion.div
                            key={i}
                            whileHover={{ scale: 1.1 }}
                            className="text-4xl"
                        >
                            {flag}
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* === AI & ESCROW TRUST SECTION === */}
            <section className="bg-gradient-to-br from-white to-gray-100 py-24 px-6 md:px-12">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-4xl font-extrabold text-gray-800 text-center mb-12">Frequently Asked Questions</h2>

                    <div className="space-y-4">
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
            {/* <section className="bg-gradient-to-br from-emerald-50 to-indigo-100 py-24 px-6 text-center">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">AI-Powered Discovery Meets Human Hustle</h2>
                    <p className="text-gray-700 text-lg mb-6">
                        We use AI to find the most viral content formats. Then, you post them. We track your views. You get paid. Simple.
                    </p>
                    <p className="text-gray-700 text-lg mb-10">
                        Every campaign is backed by our escrow system — so creators never worry about late payments again.
                    </p>
                    <Link
                        to="/signup"
                        className="bg-indigo-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-indigo-700 transition"
                    >
                        Try It Now
                    </Link>
                </div>
            </section> */}

            {/* === ADMIN PROOF SYSTEM SECTION === */}
            <section className="py-24 px-6 bg-white text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Verified Views. Manual Proof. Full Trust.</h2>
                <p className="max-w-2xl mx-auto text-gray-600 mb-10">
                    Every submission you make — your video link, your claimed views — is reviewed by our admin team before payout.
                </p>
                <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
                    <div className="bg-emerald-100 p-6 rounded-xl shadow-md">
                        <h3 className="text-xl font-semibold text-emerald-800 mb-2">Submit Link</h3>
                        <p className="text-gray-700">Paste your TikTok, Instagram or YouTube URL after posting the clip.</p>
                    </div>
                    <div className="bg-indigo-100 p-6 rounded-xl shadow-md">
                        <h3 className="text-xl font-semibold text-indigo-800 mb-2">We Verify Views</h3>
                        <p className="text-gray-700">Our AI + admin combo checks real views across platforms.</p>
                    </div>
                    <div className="bg-yellow-100 p-6 rounded-xl shadow-md">
                        <h3 className="text-xl font-semibold text-yellow-800 mb-2">You Get Paid</h3>
                        <p className="text-gray-700">Verified views are instantly credited to your wallet. Withdraw anytime.</p>
                    </div>
                </div>
            </section>

            {/* === FINAL CALL TO ACTION === */}
            <section className="relative bg-indigo-700 text-white py-28 px-6 text-center overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <img
                        src={heroImage}
                        alt="Background layer"
                        className="w-full h-full object-cover blur-lg"
                    />
                </div>
                <div className="relative z-10 max-w-4xl mx-auto">
                    <h2 className="text-4xl font-bold mb-4">Your Time Online Should Pay</h2>
                    <p className="text-lg mb-8">ClippaPay turns your attention into income. It’s free to join. Why wait?</p>
                    <Link
                        to="/signup"
                        className="bg-white text-indigo-700 font-semibold px-8 py-3 rounded-full shadow hover:bg-gray-100 transition-transform duration-300 hover:scale-105"
                    >
                        Join the Movement
                    </Link>
                </div>
            </section>
            {/* === FOOTER === */}
            <footer className="bg-indigo-900 text-white px-6 py-10 text-sm text-center">
                <div className="flex flex-col md:flex-row justify-between max-w-6xl mx-auto gap-6">
                    <div>
                        <h4 className="text-lg font-bold mb-2">ClippaPay</h4>
                        <p>Earn by posting. Advertise through virality.</p>
                    </div>
                    <div className="space-y-2">
                        <a href="/terms" className="hover:underline block">Terms of Service</a>
                        <a href="/privacy" className="hover:underline block">Privacy Policy</a>
                        <a href="/contact" className="hover:underline block">Contact Us</a>
                    </div>
                    <div className="space-y-2">
                        <p>Instagram • TikTok • X</p>
                        <p>&copy; 2025 ClippaPay Inc.</p>
                    </div>
                </div>
            </footer>


        </div>
    );
}