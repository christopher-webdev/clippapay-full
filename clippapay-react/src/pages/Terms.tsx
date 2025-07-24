// src/pages/Terms.tsx
import React from "react";
import { useNavigate } from "react-router-dom";

const Terms: React.FC = () => {
    const navigate = useNavigate();   // ✅ hooks must be inside the component

    return (
        <main
            className="policy-container"
            style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}
        >
            {/* back button */}
            <div className="mb-4">
                <button
                    onClick={() => navigate("/")}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition flex items-center gap-1"
                >
                    ← Back to Home
                </button>
            </div>

            <h1>Terms of Service</h1>
            <p>
                <em>Last updated:&nbsp;July 24,&nbsp;2025</em>
            </p>

            <p>
                PLEASE READ THESE TERMS OF SERVICE (“<strong>Terms</strong>”) CAREFULLY
                BEFORE USING THE SERVICE. By accessing or using ClippaPay, you agree to
                be bound by these Terms and our Privacy Policy. If you do not agree, do
                not use the Service.
            </p>

            {/* ---------- sections ------------------------------------ */}
            <h2>1.&nbsp;Definitions</h2>
            <ul>
                <li><strong>Advertiser</strong> – funds campaigns to promote content.</li>
                <li><strong>Clipper</strong> – distributes advertiser content and earns per qualified view.</li>
                <li><strong>Campaign</strong> – advertising order with budget, CPM, targeting, creatives.</li>
                <li>
                    <strong>Qualified View</strong> – a view validated by ClippaPay’s fraud‑detection systems and meeting campaign
                    criteria.
                </li>
            </ul>

            <h2>2.&nbsp;Eligibility &amp; Account</h2>
            <p>
                You must be at least 18 and capable of a binding contract. Provide
                accurate info and keep it current. You’re responsible for safeguarding
                credentials.
            </p>

            <h2>3.&nbsp;Service Description</h2>
            <p>
                ClippaPay connects Advertisers seeking virality with Clippers who post
                content. We track views and handle escrow.
            </p>

            <h2>4.&nbsp;Advertiser Obligations</h2>
            <ul>
                <li>Fund campaigns in advance.</li>
                <li>Provide lawful, non‑infringing creative assets.</li>
                <li>Comply with platform policies (e.g., TikTok guidelines).</li>
                <li>
                    Unused funds after 180 days may incur an inactivity fee or be refunded
                    minus processing costs.
                </li>
            </ul>

            <h2>5.&nbsp;Clipper Obligations</h2>
            <ul>
                <li>Post content exactly as provided—no deceptive practices.</li>
                <li>Do not buy views, use bots, or break third‑party rules.</li>
                <li>Submit links for verification within the campaign window.</li>
            </ul>

            <h2>6.&nbsp;Payments</h2>
            <ul>
                <li>Clippers earn at the advertised CPM; withdrawals from ₦1,000.</li>
                <li>Advertisers are charged per qualified view; spend ≤ budget.</li>
                <li>Fraudulent earnings may be reversed.</li>
            </ul>

            <h2>7.&nbsp;Intellectual Property</h2>
            <p>
                All ClippaPay software and branding are ours or licensed. You keep
                ownership of your content but grant us a worldwide, non‑exclusive,
                royalty‑free licence to host, display, and distribute it to operate the
                Service.
            </p>

            <h2>8.&nbsp;Prohibited Conduct</h2>
            <p>You agree not to:</p>
            <ul>
                <li>Break laws or third‑party rights.</li>
                <li>Spam, distribute malware, or advertise illegally.</li>
                <li>Reverse‑engineer, scrape, or exploit the platform.</li>
                <li>Harass, hate, or abuse others.</li>
                <li>Interfere with security features.</li>
            </ul>

            <h2>9.&nbsp;Suspension &amp; Termination</h2>
            <p>
                We may suspend or terminate for violations. Upon termination, your
                rights end immediately, but payment obligations survive.
            </p>

            <h2>10.&nbsp;Disclaimers</h2>
            <p>
                The Service is provided “AS IS” and “AS AVAILABLE.” We disclaim all
                warranties. We do not guarantee earnings or campaign results.
            </p>

            <h2>11.&nbsp;Limitation of Liability</h2>
            <p>
                To the fullest extent permitted, ClippaPay is not liable for indirect or
                consequential losses. Our aggregate liability will not exceed ₦100,000
                or the fees you paid us in the last 6 months, whichever is greater.
            </p>

            <h2>12.&nbsp;Indemnification</h2>
            <p>
                You will indemnify and hold harmless ClippaPay, its directors, employees
                and partners from claims arising out of your use, your content, or your
                breach of these Terms.
            </p>

            <h2>13.&nbsp;Governing Law &amp; Dispute Resolution</h2>
            <p>
                These Terms are governed by the laws of the Federal Republic of Nigeria.
                Disputes go to good‑faith negotiation, then arbitration in Abuja under
                the Arbitration &amp; Conciliation Act.
            </p>

            <h2>14.&nbsp;Changes to Terms</h2>
            <p>
                We may modify these Terms anytime by posting an updated version.
                Continued use after changes means acceptance.
            </p>

            <h2>15.&nbsp;Contact</h2>
            <address>
                ClippaPay&nbsp;Ltd.<br />
                No&nbsp;67, Area&nbsp;1 Old Secretariat, Abuja, Nigeria<br />
                Email:&nbsp;
                <a href="mailto:reach@clippapay.com">reach@clippapay.com</a>
            </address>

            <p style={{ marginTop: "2rem" }}>
                © 2025 ClippaPay Ltd.&nbsp;All rights reserved.
            </p>
        </main>
    );
};

export default Terms;
