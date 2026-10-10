"use client";

import { useEffect, useState } from "react";

export default function CalendarPage() {
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
        color: "#fff",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "28px", marginBottom: "12px" }}>
          Kalendar
        </h1>

        <p style={{ color: "#aaa" }}>
          {mounted
            ? "Kalendar sahifasi tayyor."
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