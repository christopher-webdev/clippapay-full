// src/pages/Privacy.tsx
import React from "react";
import { useNavigate } from "react-router-dom";

const Privacy: React.FC = () => {
  const navigate = useNavigate(); // ✅ hook inside component

  return (
    <main
      className="policy-container"
      style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}
    >
      {/* Back button */}
      <div className="mb-4">
        <button
          onClick={() => navigate("/")}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition flex items-center gap-1"
        >
          ← Back to Home
        </button>
      </div>

      <h1>Privacy Policy</h1>
      <p><em>Last updated: July 24, 2025</em></p>

      <p>
        Thank you for choosing <strong>ClippaPay&nbsp;Ltd.</strong> (“
        <strong>ClippaPay</strong>,” “<strong>we</strong>,” “<strong>our</strong>,”
        or “<strong>us</strong>”). We respect your privacy and are committed to
        protecting your personal data. This Privacy Policy explains how we
        collect, use, disclose, and safeguard your information when you visit{" "}
        <a href="https://clippapay.com">clippapay.com</a> or use any ClippaPay
        mobile, desktop, or API services (collectively, the “Service”).
      </p>

      <h2>1.&nbsp;Information&nbsp;We&nbsp;Collect</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
              Category
            </th>
            <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
              Types&nbsp;of&nbsp;Data
            </th>
            <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>
              How&nbsp;We&nbsp;Collect
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Account&nbsp;Data</td>
            <td>
              Full name, email, phone, username, password, KYC
              docs
            </td>
            <td>Provided by you during sign‑up or profile updates</td>
          </tr>
          <tr>
            <td>Usage&nbsp;Data</td>
            <td>
              IP, browser, device IDs, pages visited, click‑stream, timestamps
            </td>
            <td>Automatically via cookies, logs, analytics tools</td>
          </tr>
          <tr>
            <td>Financial&nbsp;Data</td>
            <td>Bank details, transaction history</td>
            <td>Via payment processors &amp; payout requests</td>
          </tr>
          <tr>
            <td>User‑Generated&nbsp;Content</td>
            <td>Clips, captions, thumbnails, comments, view metrics</td>
            <td>Uploaded or created while using the Service</td>
          </tr>
          <tr>
            <td>Third‑Party&nbsp;Data</td>
            <td>
              Social‑media IDs, platform stats (TikTok, Instagram, WhatsApp,
              Youtube etc.)
            </td>
            <td>With your permission when Uploading proof</td>
          </tr>
        </tbody>
      </table>

      <h2>2.&nbsp;How&nbsp;We&nbsp;Use&nbsp;Your&nbsp;Information</h2>
      <ul>
        <li>Provide &amp; maintain the Service (accounts, earnings, campaigns).</li>
        <li>Improve &amp; personalise features, fight fraud, recommend campaigns.</li>
        <li>Verify identity &amp; prevent fraud (KYC/AML, HypeAuditor view checks).</li>
        <li>Process payments for advertisers and withdrawals for clippers.</li>
        <li>Send transactional notices, promos, and support messages.</li>
        <li>Comply with laws, enforce Terms, protect our rights.</li>
      </ul>

      <h2>3.&nbsp;Legal&nbsp;Bases</h2>
      <p>
        Where required (e.g., Nigeria Data Protection Act 2023, GDPR), we rely
        on: (a) contract performance, (b) legitimate interests, (c) consent, and
        (d) legal obligations.
      </p>

      <h2>4.&nbsp;Cookies&nbsp;&amp;&nbsp;Similar&nbsp;Technologies</h2>
      <p>
        We use cookies, web beacons, and local storage to remember preferences,
        measure performance, and keep you logged in. Disabling cookies may break
        some features.
      </p>

      <h2>5.&nbsp;How&nbsp;We&nbsp;Share&nbsp;Information</h2>
      <ul>
        <li>Service providers (hosting, analytics, payments, KYC).</li>
        <li>
          Advertisers &amp; Clippers – only metrics required to run campaigns and
          validate performance.
        </li>
        <li>Regulators or courts when disclosure is legally required.</li>
        <li>Business transfers (merger, acquisition, asset sale).</li>
      </ul>
      <p><strong>We never sell your personal data.</strong></p>

      <h2>6.&nbsp;International&nbsp;Transfers</h2>
      <p>
        Data may be hosted outside your country. Where required, we use
        Standard Contractual Clauses or equivalent safeguards.
      </p>

      <h2>7.&nbsp;Data&nbsp;Security</h2>
      <p>
        We use TLS in transit, AES‑256 at rest, role‑based controls, and routine
        penetration testing. No method is 100% secure; use the Service at your
        own risk.
      </p>

      <h2>8.&nbsp;Data&nbsp;Retention</h2>
      <p>
        We retain data while your account is active or as needed to provide the
        Service and meet legal duties. After deletion, we anonymise or erase
        data within 90 days.
      </p>

      <h2>9.&nbsp;Your&nbsp;Rights</h2>
      <p>
        Depending on your jurisdiction, you may access, rectify, delete,
        restrict, object, port, or withdraw consent. Email&nbsp;
        <a href="mailto:reach@clippapay.com">reach@clippapay.com</a> to
        exercise rights.
      </p>

      <h2>10.&nbsp;Children’s&nbsp;Privacy</h2>
      <p>ClippaPay is not directed to children under 18. We do not knowingly collect their data.</p>

      <h2>11.&nbsp;Changes&nbsp;to&nbsp;This&nbsp;Policy</h2>
      <p>
        We may update this Privacy Policy. Material changes will be emailed or
        shown in‑app at least 7 days before taking effect.
      </p>

      <h2>12.&nbsp;Contact&nbsp;Us</h2>
      <address>
        ClippaPay&nbsp;Ltd.<br />
        No&nbsp;67, Area&nbsp;1 Old Secretariat, Abuja, Nigeria<br />
        Email:&nbsp;
        <a href="mailto:reach@clippapay.com">reach@clippapay.com</a>
        <br />
        Phone:&nbsp;+234&nbsp;700‑CLIPPAY
      </address>
    </main>
  );
};

export default Privacy;
