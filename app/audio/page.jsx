"use client";

import { useEffect, useState } from "react";

export default function AudioPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 20px",
        background: "#10111a",
        color: "#ffffff",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        <h1 style={{ fontSize: "28px", marginBottom: "12px" }}>
          Audio
        </h1>

        <p style={{ color: "#aaa", lineHeight: 1.7 }}>
          {mounted
            ? "Audio sahifasi tayyor."
            : "Sahifa yuklanmoqda..."}
        </p>

        <a
          href="/"
          style={{
            display: "inline-block",
            marginTop: "20px",
            padding: "12px 20px",
            borderRadius: "10px",
            background: "#6c5ce7",
            color: "#fff",
            textDecoration: "none",
          }}
        >
          Bosh sahifaga qaytish
        </a>
      </div>
    </main>
  );
}