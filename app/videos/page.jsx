"use client";

import Link from "next/link";

export default function VideosPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "32px 20px",
        background: "#10111a",
        color: "#fff",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <h1>Videolar</h1>
        <p style={{ color: "#aaa", lineHeight: 1.7 }}>
          QaraVault video kutubxonasi.
        </p>

        <Link
          href="/"
          style={{
            display: "inline-block",
            marginTop: "20px",
            color: "#a99aff",
            textDecoration: "none",
          }}
        >
          ← Bosh sahifaga qaytish
        </Link>
      </div>
    </main>
  );
}