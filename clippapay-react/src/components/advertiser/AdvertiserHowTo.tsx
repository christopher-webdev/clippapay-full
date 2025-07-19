import React from "react";
import { motion } from "framer-motion";

// 🖼️ Images live in /src/assets/howto/
import img1 from "@/assets/howto/img1_wallet.png";
import img2 from "@/assets/howto/img2.png";
import img3 from "@/assets/howto/img3.png";
import img4 from "@/assets/howto/img4.png";
import img5 from "@/assets/howto/img5.png";
import img6 from "@/assets/howto/img6.png";
import img7 from "@/assets/howto/img7.png";
import img8 from "@/assets/howto/img8.png";

/* Icons ­— Heroicons v2 via react-icons */
import {
  HiWallet,
  HiPlayCircle,
  HiLightBulb,
  HiCheckCircle,
} from "react-icons/hi2";

/**
 * Refreshed visual style
 * ─────────────────────
 * • Full pastel gradient backdrop (works for both themes)
 * • Cards use a light frosted‑glass look in **all** themes (no dark/black fill)
 * • Rings & shadows softened
 * • Text always high‑contrast for readability
 */

interface Step {
  img: string;
  title: string;
  text: string;
  icon: React.ReactNode;
  accent: string;
}

const steps: Step[] = [
  {
    img: img1,
    title: "Open the Wallet",
    text:
      "From your dashboard sidebar, click **Wallet**. This is where you’ll manage deposits, withdrawals and see your live balances.",
    icon: <HiWallet />,
    accent: "indigo",
  },
  {
    img: img2,
    title: "Tap “Add Funds”",
    text: "Click the blue **Add Funds** button. A secure deposit modal opens.",
    icon: <HiPlayCircle />,
    accent: "indigo",
  },
  {
    img: img3,
    title: "Transfer & Upload Receipt",
    text:
      "1. Make a bank transfer to the ClippaPay Inc. account shown.\n2. Enter the exact amount you sent.\n3. Upload your payment receipt (PDF, JPG or PNG).\n4. Hit **Submit**. Deposits are auto-verified in 5-10 minutes and instantly credited to your available balance.",
    icon: <HiCheckCircle />,
    accent: "indigo",
  },
  {
    img: img4,
    title: "Open the Campaigns tab",
    text: "Head to **Campaigns** from your sidebar to manage or create promotions.",
    icon: <HiPlayCircle />,
    accent: "indigo",
  },
  {
    img: img5,
    title: "Hit “Create Campaign”",
    text: "Tap the purple **+ Create Campaign** button to launch the campaign builder.",
    icon: <HiPlayCircle />,
    accent: "indigo",
  },
  {
    img: img6,
    title: "Fill in the basics",
    text:
      "• **Campaign Title**: Give your promo a memorable name.\n• **Upload Video**: Choose your creative (max 300 MB).\n• **Total Budget (₦)**: Enter how much you want to spend. 💡 The **Estimated Views** box auto-calculates how many views you’ll buy at ₦600 / 1 000.\n• **Platforms**: Tick every social app you want clippers to post on. Unchecked platforms won’t be used.",
    icon: <HiLightBulb />,
    accent: "indigo",
  },
  {
    img: img7,
    title: "Targeting & extras",
    text:
      "• **Target Countries**: Select regions, or leave **Worldwide**.\n• **Hashtags**: Suggest hashtags clippers should include.\n• **Directions**: (optional) Tell our AI editors to add music, captions, etc.\n• **Primary CTA URL**: (optional) Link viewers to your landing page.",
    icon: <HiLightBulb />,
    accent: "indigo",
  },
  {
    img: img8,
    title: "Categories & publish",
    text:
      "• **Categories**: Choose up to three that best match your video.\n• **Suggested Number of Clips**: Tell us how many versions the AI should spawn (leave **1** to use your original).\n\nWhen everything looks good, smash **Create Campaign** — and you’re done! Your campaign moves to **Live** as soon as we finish processing.",
    icon: <HiCheckCircle />,
    accent: "indigo",
  },
];

export default function AdvertiserHowTo() {
  return (
    <div className="relative isolate overflow-hidden px-4 py-20 sm:px-8 lg:px-16">
      {/* Full‑page pastel sweep */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 dark:from-indigo-200/10 dark:via-purple-200/10 dark:to-pink-200/10" />

      <div className="mx-auto max-w-6xl space-y-24">
        {/* Heading */}
        <header className="text-center space-y-6">
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent drop-shadow-sm">
            ClippaPay Advertiser Walkthrough
          </h1>
          <p className="mx-auto max-w-2xl text-xl">
            Fund your wallet → create your first campaign → watch the views roll in.
            Follow the guided timeline below.
          </p>
        </header>

        {/* Steps */}
        <ol className="space-y-32">
          {steps.map((step, i) => {
            const isEven = i % 2 === 0;
            return (
              <motion.li
                key={i}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.06, ease: "anticipate" }}
                viewport={{ once: true }}
                className={`grid gap-12 md:grid-cols-2 items-center ${
                  isEven ? "" : "md:flex-row-reverse"
                }`}
              >
                {/* Screenshot */}
                <motion.img
                  src={step.img}
                  alt={step.title}
                  className="w-full rounded-3xl shadow-xl ring-1 ring-black/5 dark:ring-white/10"
                  whileHover={{ scale: 1.05 }}
                />

                {/* Step card */}
                <div className="relative">
                  {/* Number */}
                  <span
                    className={`absolute -left-6 -top-6 flex h-14 w-14 items-center justify-center rounded-full bg-${step.accent}-500 text-white text-xl font-bold shadow-lg shadow-${step.accent}-500/40`}
                  >
                    {i + 1}
                  </span>

                  {/* Frosted panel */}
                  <div className="relative overflow-hidden rounded-3xl bg-white/85 backdrop-blur-lg ring-1 ring-gray-200/60 shadow-2xl">
                    {/* gentle inner highlight */}
                    <div className="pointer-events-none absolute inset-px rounded-[inherit] bg-gradient-to-br from-white/60 via-white/40 to-white/20" />

                    <div className="relative p-10 space-y-5 text-gray-900 dark:text-gray-800">
                      <h2 className="text-2xl font-semibold flex items-center gap-3">
                        <span className={`text-${step.accent}-600`}>{step.icon}</span>
                        {step.title}
                      </h2>
                      <p className="whitespace-pre-line leading-relaxed font-medium">
                        {step.text}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
