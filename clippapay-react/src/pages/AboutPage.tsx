// src/pages/AboutPage.tsx
import React, { useState, useRef, useEffect } from 'react';
import NavBar from '../components/NavBar';
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiPlay, FiPause, FiVolume2, FiVolumeX } from 'react-icons/fi';
import { FaTiktok, FaFacebook, FaInstagram, FaYoutube } from 'react-icons/fa';



const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.6 }}
    className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg p-8 rounded-2xl border border-white/10 shadow-lg hover:shadow-xl transition-all"
  >
    <div className="text-4xl mb-4 text-blue-400">{icon}</div>
    <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
    <p className="text-gray-300">{description}</p>
  </motion.div>
);

const AccordionItem = ({
  index,
  openIndex,
  toggle,
  title,
  children
}: {
  index: number,
  openIndex: number | null,
  toggle: (i: number) => void,
  title: string,
  children: React.ReactNode
}) => (
  <div className="border-b border-gray-700 last:border-0">
    <button
      onClick={() => toggle(index)}
      className="flex justify-between items-center w-full py-6 text-left"
    >
      <h3 className="text-xl md:text-2xl font-semibold text-white">{title}</h3>
      <motion.div
        animate={{ rotate: openIndex === index ? 180 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <FiChevronDown className="text-2xl text-blue-400" />
      </motion.div>
    </button>
    <AnimatePresence>
      {openIndex === index && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="pb-6 text-gray-300">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export default function AboutPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const smoothBgY = useSpring(bgY, { stiffness: 100, damping: 30 });

  const toggle = (i: number) => setOpenIndex(prev => prev === i ? null : i);
  const togglePlay = () => {
    if (videoRef.current) {
      isPlaying ? videoRef.current.pause() : videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    if (videoRef.current) videoRef.current.play().catch(e => console.log("Autoplay prevented:", e));
  }, []);
  const video20Ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = video20Ref.current;
    if (!video) return;

    const handleLoaded = () => {
      video.currentTime = 1.5;
    };

    const handleSeeked = () => {
      video.pause(); // Stop exactly at 1.5s
    };

    video.addEventListener("loadedmetadata", handleLoaded);
    video.addEventListener("seeked", handleSeeked);
    video.play().catch(() => { });

    return () => {
      video.removeEventListener("loadedmetadata", handleLoaded);
      video.removeEventListener("seeked", handleSeeked);
    };
  }, []);

  return (

    <div className="min-h-screen bg-gray-950 text-white overflow-hidden">
      <NavBar />

      {/* Hero Section */}
      <section ref={containerRef} className="relative h-screen min-h-[800px] overflow-hidden">
        <motion.div style={{ y: smoothBgY }} className="absolute inset-0 w-full h-full">

          <div className="absolute inset-0 bg-black/20" />
        </motion.div>

        <div className="absolute bottom-4 right-4 z-20 flex space-x-3">
          <button onClick={togglePlay} className="bg-black/50 text-white p-3 rounded-full hover:bg-black/75 transition">
            {isPlaying ? <FiPause size={20} /> : <FiPlay size={20} />}
          </button>
          <button onClick={() => setIsMuted(prev => !prev)} className="bg-black/50 text-white p-3 rounded-full hover:bg-black/75 transition">
            {isMuted ? <FiVolumeX size={20} /> : <FiVolume2 size={20} />}
          </button>
        </div>

        <div className="relative z-10 h-full flex items-end justify-center px-4 sm:px-6 lg:px-8 pb-20">
          <div className="text-center max-w-4xl space-y-6">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl sm:text-6xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500"
            >
              Redefining Viral Marketing
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-l md:text-2l text-gray-300 max-w-3xl mx-auto"
            >
              ClippaPay bridges the gap between brands and creators through performance-based, escrow-backed campaigns.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="pt-4"
            >
              <a href="/signup" className="inline-block px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-full hover:shadow-lg transition">
                Join the Movement
              </a>
            </motion.div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
          <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
            <FiChevronDown className="text-3xl text-white opacity-70" />
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-900 to-gray-950">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "10M+", label: "Monthly Views" },
            { value: "50K+", label: "Active Clippers" },
            { value: "1K+", label: "Brands Trust Us" },
            { value: "$5M+", label: "Paid to Creators" }
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.1 }}>
              <div className="text-4xl md:text-5xl font-bold text-blue-400 mb-2">{stat.value}</div>
              <div className="text-gray-400 uppercase text-sm tracking-wider">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-28 px-4 sm:px-6 lg:px-8 bg-gray-950">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">How ClippaPay Works</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">A simple three-step process that benefits both brands and creators</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <FaTiktok size={40} />,
                title: "1. Upload & Fund",
                description: "Advertisers fund their wallet and upload videos. We deduct our cut per verified view."
              },
              {
                icon: <FaInstagram size={40} />,
                title: "2. Clip & Distribute",
                description: "Clippers repost the content across TikTok, Instagram, and YouTube Shorts."
              },
              {
                icon: <FaYoutube size={40} />,
                title: "3. Track & Get Paid",
                description: "Views are verified, and creators receive instant payments automatically."
              }
            ].map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.1 }}>
                <div className="relative bg-gray-900 p-8 rounded-2xl">
                  <div className="text-blue-400 mb-4">{step.icon}</div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-gray-400">{step.description}</p>
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-28 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Our Platform Features</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">Everything you need to launch, manage, and scale your campaigns</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard icon="📊" title="Real-Time Analytics" description="Track views, engagement, and ROI with our comprehensive dashboard." />
            <FeatureCard icon="🔒" title="Escrow Protection" description="Funds are securely held until performance metrics are verified." />
            <FeatureCard icon="⚡" title="Instant Payouts" description="Creators receive payments immediately upon verification." />
            <FeatureCard icon="🎯" title="Targeting Options" description="Reach specific demographics with advanced targeting." />
            <FeatureCard icon="🤖" title="AI Optimization" description="Algorithms optimize content delivery for best performance." />
            <FeatureCard icon="📱" title="Mobile Responsive" description="Manage campaigns and earnings on the go." />
          </div>
        </div>
      </section>
      {/* Video Ads Showcase Section */}
      <section className="bg-gray-900 py-24 px-6 sm:px-10 text-center">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">Watch How ClippaPay Delivers Results</h2>
          <p className="text-lg text-gray-400 mb-12">
            These short videos explain our platform and how your brand gets visibility through everyday people.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Video 1: Ad Explainer */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-black rounded-2xl overflow-hidden shadow-lg"
            >
             <video
                ref={video20Ref}
                src="/video-ad.mp4"
                className="w-full h-89 object-cover"
                muted
                playsInline
                controls
              />
              <div className="p-4 text-left">
                <h3 className="text-white font-semibold text-lg">What Makes ClippaPay Different?</h3>
                <p className="text-gray-400 text-sm mt-1">A fast overview for advertisers looking to go viral instantly.</p>
              </div>
            </motion.div>

            {/* Video 2: Platform In Action */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, }}
              className="bg-black rounded-2xl overflow-hidden shadow-lg"
            >
              <video
                ref={video20Ref}
                src="/video20.mp4"
                className="w-full h-89 object-cover"
                muted
                playsInline
                controls
              />
              <div className="p-4 text-left">
                <h3 className="text-white font-semibold text-lg">Real Campaigns. Real People.</h3>
                <p className="text-gray-400 text-sm mt-1">See how your video spreads across platforms like TikTok, YouTube & Instagram.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-950">
        <div className="max-w-7xl mx-auto text-center">
          <h3 className="text-xl font-semibold mb-4">ClippaPay</h3>
          <p className="text-gray-400 mb-6">
            Empowering creators and brands through performance-based marketing.
          </p>

          {/* Social Media Links */}
          <div className="flex justify-center space-x-6 mb-6">
            <a
              href="https://www.instagram.com/clippapay?igsh=MXdrM2J0am1jcXQ5aQ=="
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition"
            >
              <FaInstagram size={24} />
            </a>
            <a
              href="https://facebook.com/clippapay"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition"
            >
              <FaFacebook size={24} />
            </a>
            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition"
            >
              <FaTiktok size={24} />
            </a>

          </div>

          <div className="pt-4 border-t border-gray-800 text-gray-500">
            &copy; {new Date().getFullYear()} ClippaPay Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
