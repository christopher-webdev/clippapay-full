// src/pages/Contact.tsx
import { useNavigate } from "react-router-dom";

const Contact: React.FC = () => {
  const navigate = useNavigate();

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

      <h1>Contact Us</h1>
      <p className="mb-6">
        We’d love to hear from you! Whether you’re an advertiser, a clipper, or
        just curious about ClippaPay, reach out any time.
      </p>

      <ul style={{ lineHeight: 1.8 }}>
        <li>
          Email:&nbsp;
          <a
            href="mailto:reach@clippapay.com"
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            reach@clippapay.com
          </a>
        </li>
        <li>Phone: +234 700‑CLIPPAY</li>
        <li>
          Address: No 67, Area 1 Old Secretariat, Abuja, Nigeria
        </li>
        <li>
          Business hours: Mon – Fri · 9 AM – 5 PM (WAT)
        </li>
      </ul>

      <p style={{ marginTop: "2rem" }}>
        Follow our updates on&nbsp;
        <a
          href="https://twitter.com/clippapay"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Twitter/X
        </a>{" "}
        and&nbsp;
        <a
          href="https://instagram.com/clippapay"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Instagram
        </a>
        .
      </p>
    </main>
  );
};

export default Contact;
