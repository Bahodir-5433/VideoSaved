
"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(true);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "32px 20px",
        background: darkMode ? "#10111a" : "#f5f5f5",
        color: darkMode ? "#ffffff" : "#171717",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <h1>Sozlamalar</h1>
        <p>QaraVault ilovasi sozlamalari</p>

        <div
          style={{
            marginTop: "24px",
            padding: "20px",
            borderRadius: "12px",
            background: darkMode ? "#1c1d2b" : "#ffffff",
          }}
        >
          <h2>Ko‘rinish</h2>
          <p>{darkMode ? "Tungi rejim" : "Kunduzgi rejim"}</p>

          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              padding: "12px 18px",
              border: "none",
              borderRadius: "8px",
              background: "#6c5ce7",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            Rejimni almashtirish
          </button>
        </div>

        <a
          href="/"
          style={{
            display: "inline-block",
            marginTop: "24px",
            color: "#a99aff",
          }}
        >
          ← Bosh sahifaga qaytish
        </a>
      </div>
    </main>
  );
}
