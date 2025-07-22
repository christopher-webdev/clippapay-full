import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  HiFingerPrint,
  HiPlayCircle,
  HiArrowDownCircle,
  HiClipboardDocumentCheck,
  HiArrowUpTray,
  HiCheckCircle,
} from "react-icons/hi2";

// Imported image assets
import img10 from "@/assets/howto/img_10.png";
import img11 from "@/assets/howto/img_11.png";
import img12 from "@/assets/howto/img_12.png";
import img13 from "@/assets/howto/img_13.png";

interface Step {
  img: string;
  title: string;
  text: string;
  icon: React.ReactNode;
  accent: string;
}

const steps: Step[] = [
  {
    img: img10,
    title: "Browse Campaigns",
    text:
      "From your dashboard, click on Campaigns.\n\nYou’ll see a list of jobs you can join, each showing its budget, view targets, and progress.",
    icon: <HiFingerPrint />,
    accent: "purple",
  },
  {
    img: img11,
    title: "View Campaign Details",
    text:
      "Click the View Clips button to open the campaign. You’ll see available clips, reward rate per view, and platforms you're allowed to post on.\n\nDownload any of the clips you prefer.",
    icon: <HiArrowDownCircle />,
    accent: "purple",
  },
  {
    img: img11,
    title: "Post Your Clip",
    text:
      "Upload the clip to the listed social platforms (e.g. TikTok, YouTube, Instagram).\n\nReturn and click the green Start Promoting button to continue.",
    icon: <HiPlayCircle />,
    accent: "purple",
  },
  {
    img: img12,
    title: "Submit Your Post",
    text:
      "On the submission form:\n• Remove unused platforms.\n• Paste your post link (must start with https://).\n• Set views to 1 if it's your first time.\n• No proof needed yet.\n\nThen click Submit.",
    icon: <HiClipboardDocumentCheck />,
    accent: "purple",
  },
  {
    img: img13,
    title: "Update Your Views",
    text:
      "Once your views increase, go to the Submissions tab and click Update.\n\nUpload proof:\n• YouTube/TikTok: short video from Studio\n• Instagram/Facebook: screenshot showing views\n\nUpdate the view count, then click Submit again.",
    icon: <HiArrowUpTray />,
    accent: "purple",
  },
  {
    img: img13,
    title: "Get Verified & Paid",
    text:
      "After review, your status will change to Approved.\n\nVerified views are credited to your wallet automatically.\n\nIf a submission is rejected, read the admin note or use Live Chat to resolve it.",
    icon: <HiCheckCircle />,
    accent: "purple",
  },
];

export default function ClipperHowTo() {
  const [zoomImg, setZoomImg] = useState<string | null>(null);

  return (
    <div className="relative isolate overflow-hidden px-4 py-20 sm:px-8 lg:px-16">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-purple-100 via-pink-100 to-rose-100 dark:from-purple-200/10 dark:via-pink-200/10 dark:to-rose-200/10" />

      <div className="mx-auto max-w-6xl space-y-24">
        {/* Page header */}
        <header className="text-center space-y-6">
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 bg-clip-text text-transparent drop-shadow-sm">
            How to Earn on ClippaPay as a Clipper
          </h1>
          <p className="mx-auto max-w-2xl text-xl">
            Join campaigns, post videos, track your views, and get paid per verified view.
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
                className={`grid gap-12 md:grid-cols-2 items-center ${isEven ? "" : "md:flex-row-reverse"
                  }`}
              >
                {/* Image with zoom on click */}
                <motion.img
                  src={step.img}
                  alt={step.title}
                  className="w-full rounded-3xl shadow-xl ring-1 ring-black/5 dark:ring-white/10 cursor-zoom-in"
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setZoomImg(step.img)}
                />

                {/* Details */}
                <div className="relative">
                  <span
                    className={`absolute -left-6 -top-6 flex h-14 w-14 items-center justify-center rounded-full bg-${step.accent}-500 text-white text-xl font-bold shadow-lg shadow-${step.accent}-500/40`}
                  >
                    {i + 1}
                  </span>
                  <div className="relative overflow-hidden rounded-3xl bg-white/85 backdrop-blur-lg ring-1 ring-gray-200/60 shadow-2xl">
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

        {/* Support videos */}
        <section className="mt-20 text-center space-y-8">
          <h2 className="text-3xl font-bold text-gray-800">Still Not Sure How to Upload Proof?</h2>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Watch these short videos to learn how to capture and upload correct proof for each platform.
          </p>
          <div className="flex flex-wrap gap-6 justify-center">
            <video controls preload="auto" className="w-full max-w-sm rounded-xl shadow-lg" src="/instagram.mp4#t=1" />
            <video controls preload="auto" className="w-full max-w-sm rounded-xl shadow-lg" src="/youtube.mp4#t=1" />
            <video controls preload="auto" className="w-full max-w-sm rounded-xl shadow-lg" src="/tiktok.mp4#t=1" />
          </div>
        </section>
      </div>

      {/* Zoom modal */}
      {zoomImg && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
          onClick={() => setZoomImg(null)}
        >
          <img
            src={zoomImg}
            alt="Zoomed"
            className="max-w-[90%] max-h-[90%] rounded-2xl shadow-xl"
          />
        </div>
      )}
    </div>
  );
}
