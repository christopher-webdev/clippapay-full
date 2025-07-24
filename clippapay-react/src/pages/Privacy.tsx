// src/pages/Privacy.tsx
import React from "react";
import { useNavigate } from "react-router-dom";

const Privacy: React.FC = () => {
    const navigate = useNavigate();   // ✅ moved inside component

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
            <p>
                <em>Last updated:&nbsp;July&nbsp;24,&nbsp;2025</em>
            </p>

            {/* --- policy content unchanged --- */}
            <p>
                Thank you for choosing <strong>ClippaPay&nbsp;Ltd.</strong> (“
                <strong>ClippaPay</strong>,” “<strong>we</strong>,” “<strong>our</strong>,”
                or “<strong>us</strong>”). We respect your privacy and are committed …
            </p>

            {/* …rest of your policy … */}

            <address>
                ClippaPay&nbsp;Ltd.<br />
                No&nbsp;67, Area&nbsp;1 Old Secretariat, Abuja, Nigeria<br />
                Email:&nbsp;
                <a href="mailto:reach@clippapay.com">reach@clippapay.com</a>
                <br />
                Phone:&nbsp;+234 700‑CLIPPAY
            </address>
        </main>
    );
};

export default Privacy;
