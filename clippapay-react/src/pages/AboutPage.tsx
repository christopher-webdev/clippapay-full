// src/pages/AboutPage.tsx
import React, { useState, useRef } from 'react';
import NavBar from '../components/NavBar';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

const clippersVideos = [
  { title: 'How to Submit Proof for TikTok', file: 'tiktok.mp4' },
  { title: 'How to Submit Proof for Instagram', file: 'instagram.mp4' },
  { title: 'How to Submit Proof for YouTube', file: 'youtube.mp4' },
];

const advertisersVideos = [
  { title: 'Creating Your First Campaign', url: 'https://www.youtube.com/embed/V-_O7nl0Ii0' },
  { title: 'Funding Your Wallet', url: 'https://www.youtube.com/embed/L_jWHffIx5E' },
  { title: 'Reviewing Submissions', url: 'https://www.youtube.com/embed/fJ9rUzIMcZQ' },
];

const faqs = [
  {
    q: 'How do I become a Clipper?',
    a: 'Simply sign up as a Clipper, browse active campaigns, join one, repost the video, and submit your view count for verification.',
  },
  {
    q: 'How do advertisers fund campaigns?',
    a: 'Advertisers top up their wallet via bank transfer or Paystack/Flutterwave, then create a campaign and set cost-per-view and view goals.',
  },
  {
    q: 'When do I get paid?',
    a: 'Clippers are credited immediately after their views are verified. Advertisers’ escrow is debited at the same time.',
  },
];

function VideoCard({ title, file }: { title: string; file: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow hover:shadow-xl transition">
      <div className="aspect-video w-full">
        <video
          className="w-full h-full"
          src={`/${file}`}
          controls
          preload="metadata"
        />
      </div>
      <div className="p-4">
        <h3 className="text-center font-medium text-gray-800 dark:text-gray-100">{title}</h3>
      </div>
    </div>
  );
}

function YouTubeCard({ title, url }: { title: string; url: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow hover:shadow-xl transition">
      <div className="aspect-video w-full">
        <iframe
          className="w-full h-full"
          src={`${url}?rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
      <div className="p-4">
        <h3 className="text-center font-medium text-gray-800 dark:text-gray-100">{title}</h3>
      </div>
    </div>
  );
}

export default function AboutPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['100%', '60%']);
  const smoothBgY = useSpring(bgY, { stiffness: 100, damping: 25 });
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);


  const toggle = (i: number) => setOpenIndex((prev) => (prev === i ? null : i));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavBar />

      {/* Hero */}
      <section ref={ref} className="relative h-[100vh] overflow-hidden">
        <div className="absolute inset-0 w-full h-full">
          <video
            ref={videoRef}
            className="w-full h-full object-center object-cover md:object-contain"
            src="/video-ad.mp4"
            autoPlay
            muted={isMuted}
            loop
            playsInline
          />
        </div>

        {/* Mute/Unmute Toggle */}
        <div className="absolute bottom-4 right-4 z-20">
          <button
            onClick={() => setIsMuted((prev) => !prev)}
            className="bg-black bg-opacity-50 text-white px-3 py-1 rounded hover:bg-opacity-75 transition"
          >
            {isMuted ? '🔇 Mute' : '🔊 Unmute'}
          </button>
        </div>

        <div className="relative z-10 flex items-center justify-center h-full bg-black bg-opacity-40 px-4">
          <div className="text-center text-white max-w-2xl space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">About ClippaPay</h1>
            <p className="text-lg md:text-xl">
              Empowering creators to monetize viral content through escrow-backed campaigns.
            </p>
          </div>
        </div>
      </section>


      {/* How It Works */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold text-gray-800 dark:text-gray-100 text-center">How It Works</h2>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: '📥',
              title: 'Subscribe & Upload',
              desc: 'Advertisers choose a plan and upload their video ad.',
            },
            {
              icon: '🔄',
              title: 'Clip & Repost',
              desc: 'Clippers download & share on their social channels.',
            },
            {
              icon: '💰',
              title: 'Track & Earn',
              desc: 'Monitor views and receive instant payouts.',
            },
          ].map((step, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow text-center transition hover:shadow-xl"
            >
              <div className="text-5xl">{step.icon}</div>
              <h3 className="mt-4 text-xl font-medium text-gray-900 dark:text-gray-100">{step.title}</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Clippers Onboarding Videos */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800">
        <h2 className="text-3xl font-semibold text-gray-800 dark:text-gray-100 text-center">Clippers Onboarding</h2>
        <p className="mt-2 text-center text-gray-600 dark:text-gray-300">
          Learn how to get started as a Clipper
        </p>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {clippersVideos.map((v, i) => (
            <VideoCard key={i} {...v} />
          ))}
        </div>
      </section>

      {/* Advertisers Onboarding Videos */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
        <h2 className="text-3xl font-semibold text-gray-800 dark:text-gray-100 text-center">Advertisers Onboarding</h2>
        <p className="mt-2 text-center text-gray-600 dark:text-gray-300">
          Watch these to learn how to run your first campaign
        </p>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {advertisersVideos.map((v, i) => (
            <YouTubeCard key={i} {...v} />
          ))}
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800">
        <h2 className="text-3xl font-semibold text-gray-800 dark:text-gray-100 text-center">FAQs</h2>
        <div className="mt-8 max-w-2xl mx-auto space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => toggle(i)}
                className="w-full flex justify-between items-center py-4 text-left"
              >
                <span className="text-lg font-medium text-gray-800 dark:text-gray-100">{faq.q}</span>
                <span className="text-gray-500 dark:text-gray-300">{openIndex === i ? '–' : '+'}</span>
              </button>
              {openIndex === i && <div className="pb-4 text-gray-600 dark:text-gray-300">{faq.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-500 dark:text-gray-400">
        &copy; {new Date().getFullYear()} ClippaPay Inc. All rights reserved.
      </footer>
    </div>
  );
}
