
"use client";

import "bootstrap-icons/font/bootstrap-icons.css";
import { useEffect, useRef, useState } from "react";

const DB_NAME = "QaraVaultDB";
const STORE_NAME = "videos";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getVideos() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();

    request.onsuccess = () => {
      resolve(
        request.result.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        )
      );
    };

    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => db.close();
  });
}

async function saveVideo(video) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(video);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function removeVideo(id) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatSize(bytes = 0) {
  if (!bytes) return "0 MB";

  return bytes >= 1024 ** 3
    ? `${(bytes / 1024 ** 3).toFixed(2)} GB`
    : `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Barchasi");
  const [showUpload, setShowUpload] = useState(false);
  const [activeVideo, setActiveVideo] = useState(null);
  const [editingVideo, setEditingVideo] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const fileRef = useRef(null);
  const playerRef = useRef(null);

  const [form, setForm] = useState({
    title: "",
    category: "Boshqa",
    description: "",
    file: null,
  });

  const [editForm, setEditForm] = useState({
    title: "",
    category: "Boshqa",
    description: "",
  });

  const [playerUrl, setPlayerUrl] = useState("");

  // Saqlangan rang rejimini yuklash
  useEffect(() => {
    try {
      setDarkMode(localStorage.getItem("videocore-theme") === "dark");
    } catch (error) {
      console.error("Mavzu sozlamasini o‘qib bo‘lmadi:", error);
    }
  }, []);

  // Rang rejimini saqlash va sahifaga qo‘llash
  useEffect(() => {
    document.documentElement.classList.toggle("qv-dark-mode", darkMode);

    try {
      localStorage.setItem(
        "videocore-theme",
        darkMode ? "dark" : "light"
      );
    } catch (error) {
      console.error("Mavzu sozlamasini saqlab bo‘lmadi:", error);
    }
  }, [darkMode]);

  useEffect(() => {
    let mounted = true;

    async function loadVideos() {
      try {
        const result = await getVideos();
        if (mounted) setVideos(result);
      } catch (error) {
        console.error(error);
        if (mounted) setMessage("Videolarni yuklashda xatolik yuz berdi.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadVideos();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeVideo?.file) {
      setPlayerUrl("");
      return;
    }

    const url = URL.createObjectURL(activeVideo.file);
    setPlayerUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [activeVideo]);

  useEffect(() => {
    if (!message) return;

    const timeout = setTimeout(() => setMessage(""), 3500);
    return () => clearTimeout(timeout);
  }, [message]);

  const categories = [
    "Barchasi",
    "Darslar",
    "Kurslar",
    "Shaxsiy",
    "Boshqa",
  ];

  const filteredVideos = videos.filter((video) => {
    const query = search.toLowerCase();

    const matchesSearch =
      (video.title || "").toLowerCase().includes(query) ||
      (video.category || "").toLowerCase().includes(query) ||
      (video.description || "").toLowerCase().includes(query);

    const matchesCategory =
      categoryFilter === "Barchasi" ||
      video.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  async function handleUpload(event) {
    event.preventDefault();

    if (!form.file) {
      setMessage("Avval video faylini tanlang.");
      return;
    }

    if (!form.file.type.startsWith("video/")) {
      setMessage("Iltimos, video faylini tanlang.");
      return;
    }

    setSaving(true);

    try {
      const video = {
        id: crypto.randomUUID(),
        title:
          form.title.trim() ||
          form.file.name.replace(/\.[^/.]+$/, ""),
        category: form.category,
        description: form.description.trim(),
        file: form.file,
        fileName: form.file.name,
        fileSize: form.file.size,
        createdAt: new Date().toISOString(),
      };

      await saveVideo(video);

      setVideos((previous) =>
        [video, ...previous].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        )
      );

      setForm({
        title: "",
        category: "Boshqa",
        description: "",
        file: null,
      });

      if (fileRef.current) fileRef.current.value = "";

      setShowUpload(false);
      setMessage("Video muvaffaqiyatli saqlandi!");
    } catch (error) {
      console.error(error);
      setMessage("Saqlash amalga oshmadi. Qurilmadagi joyni tekshiring.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(video) {
    if (!window.confirm(`"${video.title}" videosini o‘chirmoqchimisiz?`)) {
      return;
    }

    try {
      await removeVideo(video.id);
      setVideos((previous) =>
        previous.filter((item) => item.id !== video.id)
      );

      if (activeVideo?.id === video.id) setActiveVideo(null);

      setMessage("Video o‘chirildi.");
    } catch (error) {
      console.error(error);
      setMessage("Videoni o‘chirishda xatolik yuz berdi.");
    }
  }

  function startEditing(video) {
    setEditingVideo(video);
    setEditForm({
      title: video.title,
      category: video.category,
      description: video.description || "",
    });
  }

  async function handleEdit(event) {
    event.preventDefault();
    if (!editingVideo) return;

    setSaving(true);

    try {
      const updatedVideo = {
        ...editingVideo,
        title: editForm.title.trim() || editingVideo.title,
        category: editForm.category,
        description: editForm.description.trim(),
      };

      await saveVideo(updatedVideo);

      setVideos((previous) =>
        previous.map((video) =>
          video.id === updatedVideo.id ? updatedVideo : video
        )
      );

      if (activeVideo?.id === updatedVideo.id) {
        setActiveVideo(updatedVideo);
      }

      setEditingVideo(null);
      setMessage("Video ma’lumotlari yangilandi.");
    } catch (error) {
      console.error(error);
      setMessage("Tahrirlashda xatolik yuz berdi.");
    } finally {
      setSaving(false);
    }
  }

  function closePlayer() {
    if (playerRef.current) playerRef.current.pause();
    setActiveVideo(null);
  }

  return (
    <div className="qv-app">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <a
          href="#"
          className="brand"
          onClick={(event) => {
            event.preventDefault();
            setCategoryFilter("Barchasi");
            setSearch("");
            setSidebarOpen(false);
          }}
        >
          <span className="brand-icon">
            <img src="/icons/film.svg" alt="VideoCore logo" />
          </span>
          <span>
            Video<span className="brand-accent">Core</span>
          </span>
        </a>

        <div className="side-label">ASOSIY</div>

        <button
          className={`side-link ${categoryFilter === "Barchasi" ? "active" : ""}`}
          onClick={() => {
            setCategoryFilter("Barchasi");
            setSidebarOpen(false);
          }}
        >
          <span>▦</span> Bosh sahifa
        </button>

        <button
          className="side-link"
          onClick={() => {
            setShowUpload(true);
            setSidebarOpen(false);
          }}
        >
          <span>＋</span> Video yuklash
        </button>

        <div className="side-label category-label">KATEGORIYALAR</div>

        {categories.slice(1).map((category) => (
          <button
            key={category}
            className={`side-link ${categoryFilter === category ? "active" : ""}`}
            onClick={() => {
              setCategoryFilter(category);
              setSidebarOpen(false);
            }}
          >
            <span className="category-dot" />
            {category}
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="storage-icon">▣</div>
          <strong>Shaxsiy xotirangiz</strong>
          <p>Videolaringiz qurilmangizdagi brauzer xotirasida saqlanadi.</p>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          className="sidebar-overlay"
          aria-label="Menyuni yopish"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="main-content">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setSidebarOpen((value) => !value)}
            aria-label="Menyuni ochish"
          >
            ☰
          </button>

          <div className="breadcrumb">
            <span>VideoCore</span>
            <span className="breadcrumb-separator">/</span>
            <strong>Bosh sahifa</strong>
          </div>

          <div className="topbar-right">
            <div className="search-box">
              <span>⌕</span>
              <input
                type="search"
                placeholder="Videolarni qidirish..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <button
              className="theme-toggle"
              onClick={() => setDarkMode((value) => !value)}
              title={darkMode ? "Yorug‘ rejimga o‘tish" : "Tungi rejimga o‘tish"}
              aria-label={darkMode ? "Yorug‘ rejim" : "Tungi rejim"}
            >
              <i className={darkMode ? "bi bi-sun-fill" : "bi bi-moon-stars-fill"}></i>
            </button>

            <div className="profile-button">
              <span className="profile-avatar">V</span>
              <span className="profile-name">Mening kutubxonam</span>
            </div>
          </div>
        </header>

        <section className="welcome-banner">
          <div className="welcome-content">
            <div className="welcome-badge">
              <span className="live-dot" />
              SHAXSIY VIDEO KUTUBXONA
            </div>

            <h1>
              Barcha videolaringiz
              <br />
              <span>bir joyda.</span>
            </h1>

            <p>
              O‘zingiz uchun muhim videolarni saqlang, tartiblang
              va istalgan vaqtda tomosha qiling.
            </p>

            <button
              className="banner-button"
              onClick={() => setShowUpload(true)}
            >
              ＋ Video yuklash
            </button>
          </div>

          <div className="banner-art" aria-hidden="true">
            <div className="art-circle art-circle-one" />
            <div className="art-circle art-circle-two" />
            <div className="art-folder">
              <div className="folder-tab" />
              <div className="folder-inner">
                <span className="folder-play">▶</span>
              </div>
              <div className="folder-line" />
              <div className="folder-line short" />
            </div>
            <div className="floating-card floating-card-one">▶</div>
            <div className="floating-card floating-card-two">♫</div>
          </div>

          <div className="banner-decoration">V</div>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon purple-icon">▣</div>
              <span className="stat-caption">JAMI</span>
            </div>
            <div className="stat-number">{videos.length}</div>
            <div className="stat-description">Saqlangan videolar</div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon blue-icon">◷</div>
              <span className="stat-caption">XOTIRA</span>
            </div>
            <div className="stat-number">
              {formatSize(videos.reduce((sum, video) => sum + (video.fileSize || 0), 0))}
            </div>
            <div className="stat-description">Ishlatilgan joy</div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon green-icon">▤</div>
              <span className="stat-caption">TURLAR</span>
            </div>
            <div className="stat-number">
              {new Set(videos.map((video) => video.category)).size}
            </div>
            <div className="stat-description">Kategoriyalar</div>
          </div>
        </section>

        <section className="library-section">
          <div className="section-heading">
            <div>
              <div className="section-eyebrow">SIZNING KUTUBXONANGIZ</div>
              <h2>Videolarim</h2>
              <p className="section-description">
                Barcha saqlangan videolaringiz shu yerda.
              </p>
            </div>

            <button
              className="upload-button"
              onClick={() => setShowUpload(true)}
            >
              ＋ Yangi video
            </button>
          </div>

          <div className="filter-row">
            <div className="filter-list">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`filter-chip ${categoryFilter === category ? "selected" : ""}`}
                  onClick={() => setCategoryFilter(category)}
                >
                  {category}
                  {category === "Barchasi" && (
                    <span className="filter-count">{videos.length}</span>
                  )}
                </button>
              ))}
            </div>
            <span className="results-count">{filteredVideos.length} ta video</span>
          </div>

          {loading ? (
            <div className="empty-state">
              <div className="loading-spinner" />
              <h3>Videolar yuklanmoqda...</h3>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">{search ? "⌕" : "▷"}</div>
              <h3>
                {search
                  ? "Hech narsa topilmadi"
                  : categoryFilter !== "Barchasi"
                    ? "Bu kategoriyada video yo‘q"
                    : "Kutubxonangiz hozircha bo‘sh"}
              </h3>
              <p>
                {search
                  ? "Boshqa nom yoki kalit so‘z bilan qidirib ko‘ring."
                  : "Birinchi videongizni yuklang va shaxsiy kutubxonangizni yarating."}
              </p>

              {!search && categoryFilter === "Barchasi" && (
                <button className="upload-button" onClick={() => setShowUpload(true)}>
                  ＋ Birinchi videoni yuklash
                </button>
              )}

              {(search || categoryFilter !== "Barchasi") && (
                <button
                  className="reset-button"
                  onClick={() => {
                    setSearch("");
                    setCategoryFilter("Barchasi");
                  }}
                >
                  Filtrlarni tozalash
                </button>
              )}
            </div>
          ) : (
            <div className="video-grid">
              {filteredVideos.map((video) => (
                <article className="video-card" key={video.id}>
                  <div className="video-thumbnail">
                    <button
                      className="thumbnail-play"
                      onClick={() => setActiveVideo(video)}
                      aria-label={`${video.title} videosini ochish`}
                    >
                      ▶
                    </button>
                    <div className="thumbnail-label">{video.category}</div>
                    <span className="thumbnail-duration">{formatSize(video.fileSize)}</span>
                  </div>

                  <div className="video-card-body">
                    <div className="video-card-heading">
                      <h3 title={video.title}>{video.title}</h3>
                      <button
                        className="more-button"
                        onClick={() => startEditing(video)}
                        aria-label="Video ma’lumotlarini tahrirlash"
                        title="Tahrirlash"
                      >
                        ⋯
                      </button>
                    </div>

                    <p className="video-description">
                      {video.description || "Qo‘shimcha izoh kiritilmagan."}
                    </p>

                    <div className="video-meta">
                      <span>▤ {video.category}</span>
                      <span>{formatDate(video.createdAt)}</span>
                    </div>

                    <div className="video-card-actions">
                      <button
                        className="watch-button"
                        onClick={() => setActiveVideo(video)}
                      >
                        ▶ Tomosha qilish
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => handleDelete(video)}
                        aria-label="Videoni o‘chirish"
                        title="O‘chirish"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="footer">
          <span><span className="footer-brand">VideoCore</span> · Shaxsiy video makoningiz</span>
          <span>Videolaringiz o‘zingiz tanlagan qurilmada saqlanadi.</span>
        </footer>
      </main>

      {showUpload && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowUpload(false);
          }}
        >
          <div className="modal-panel">
            <div className="modal-heading">
              <div>
                <span className="modal-eyebrow">KUTUBXONAGA QO‘SHISH</span>
                <h2>Yangi video yuklash</h2>
                <p>Kompyuteringizdan video faylini tanlang.</p>
              </div>
              <button className="modal-close" onClick={() => setShowUpload(false)} aria-label="Yopish">×</button>
            </div>

            <form onSubmit={handleUpload}>
              <label className="field-label">Video fayli *</label>
              <button
                type="button"
                className={`file-drop ${form.file ? "file-selected" : ""}`}
                onClick={() => fileRef.current?.click()}
              >
                <span className="file-drop-icon">↑</span>
                <strong>{form.file ? form.file.name : "Video faylini tanlang"}</strong>
                <span>{form.file ? formatSize(form.file.size) : "MP4, WebM, MOV va boshqa video formatlar"}</span>
                <span className="file-browse">Fayl tanlash</span>
              </button>

              <input
                ref={fileRef}
                type="file"
                accept="video/*"
                className="hidden-file"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setForm((previous) => ({
                    ...previous,
                    file,
                    title: previous.title || file?.name.replace(/\.[^/.]+$/, "") || "",
                  }));
                }}
              />

              <label className="field-label" htmlFor="video-title">Video nomi</label>
              <input
                id="video-title"
                className="form-input"
                placeholder="Masalan: React darsi 1"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />

              <label className="field-label" htmlFor="video-category">Kategoriya</label>
              <select
                id="video-category"
                className="form-input"
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
              >
                {categories.slice(1).map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              <label className="field-label" htmlFor="video-description">
                Izoh <span className="optional-label">(ixtiyoriy)</span>
              </label>
              <textarea
                id="video-description"
                className="form-input form-textarea"
                placeholder="Video haqida qisqacha..."
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                rows={3}
              />

              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={() => setShowUpload(false)}>
                  Bekor qilish
                </button>
                <button type="submit" className="upload-button" disabled={saving}>
                  {saving ? "Saqlanmoqda..." : "✓ Videoni saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingVideo && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditingVideo(null);
          }}
        >
          <div className="modal-panel">
            <div className="modal-heading">
              <div>
                <span className="modal-eyebrow">VIDEO SOZLAMALARI</span>
                <h2>Ma’lumotlarni tahrirlash</h2>
                <p>Videoning nomi, kategoriyasi va izohini o‘zgartiring.</p>
              </div>
              <button className="modal-close" onClick={() => setEditingVideo(null)} aria-label="Yopish">×</button>
            </div>

            <form onSubmit={handleEdit}>
              <label className="field-label" htmlFor="edit-title">Video nomi</label>
              <input
                id="edit-title"
                className="form-input"
                value={editForm.title}
                onChange={(event) => setEditForm({ ...editForm, title: event.target.value })}
                required
              />

              <label className="field-label" htmlFor="edit-category">Kategoriya</label>
              <select
                id="edit-category"
                className="form-input"
                value={editForm.category}
                onChange={(event) => setEditForm({ ...editForm, category: event.target.value })}
              >
                {categories.slice(1).map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              <label className="field-label" htmlFor="edit-description">Izoh</label>
              <textarea
                id="edit-description"
                className="form-input form-textarea"
                rows={3}
                value={editForm.description}
                onChange={(event) => setEditForm({ ...editForm, description: event.target.value })}
              />

              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={() => setEditingVideo(null)}>
                  Bekor qilish
                </button>
                <button type="submit" className="upload-button" disabled={saving}>
                  {saving ? "Saqlanmoqda..." : "O‘zgarishlarni saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeVideo && (
        <div
          className="player-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePlayer();
          }}
        >
          <div className="player-panel">
            <div className="player-header">
              <div>
                <span className="modal-eyebrow">VIDEOCORE PLAYER</span>
                <h2>{activeVideo.title}</h2>
              </div>
              <button className="modal-close" onClick={closePlayer} aria-label="Pleyerni yopish">×</button>
            </div>

            {playerUrl && (
              <video
                ref={playerRef}
                className="main-video-player"
                src={playerUrl}
                controls
                autoPlay
                playsInline
                onError={() => setMessage("Videoni ochib bo‘lmadi. Fayl formatini tekshiring.")}
              >
                Brauzeringiz video ijrosini qo‘llab-quvvatlamaydi.
              </video>
            )}

            <div className="player-information">
              <div className="player-category">{activeVideo.category}</div>
              <p>{activeVideo.description || "Bu video uchun izoh mavjud emas."}</p>
              <span>{activeVideo.fileName} · {formatSize(activeVideo.fileSize)}</span>
            </div>
          </div>
        </div>
      )}

      {message && <div className="toast-message">{message}</div>}

      <style jsx global>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #f7f7fc; color: #25243a; font-family: Arial, Helvetica, sans-serif; }
        body { min-width: 320px; }
        button, input, select, textarea { font: inherit; }
        button { cursor: pointer; }
        button:disabled { cursor: not-allowed; opacity: .65; }
        button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 3px solid #b9b0ff; outline-offset: 3px; }
        .qv-app { min-height: 100vh; }
        .sidebar { width: 252px; position: fixed; inset: 0 auto 0 0; z-index: 30; display: flex; flex-direction: column; padding: 29px 18px 20px; background: #fff; border-right: 1px solid #eeedf5; transition: background .2s, border-color .2s; }
        .brand { display: flex; align-items: center; gap: 11px; margin: 0 0 43px 5px; color: #26233c; text-decoration: none; font-size: 23px; font-weight: 800; letter-spacing: -1px; }
        .brand-icon { display: grid; width: 39px; height: 39px; place-items: center; border-radius: 13px; background: linear-gradient(135deg,#7162f5,#9b65ef); box-shadow: 0 5px 13px #7562f533; }
        .brand-icon img { width: 24px; height: 24px; }
        .brand-accent { color: #7563f4; }
        .side-label { margin: 0 0 12px 12px; color: #a09caf; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; }
        .side-link { display: flex; width: 100%; min-height: 45px; align-items: center; gap: 13px; padding: 0 13px; margin-bottom: 5px; border: 0; border-radius: 11px; background: transparent; color: #77748d; text-align: left; font-size: 13px; font-weight: 600; transition: background .2s,color .2s; }
        .side-link > span:first-child { display: inline-grid; width: 20px; place-items: center; font-size: 18px; }
        .side-link:hover,.side-link.active { background: #f0edff; color: #705bf0; }
        .category-label { margin-top: 32px; }
        .category-dot { width: 8px; height: 8px; margin: 0 6px; border-radius: 50%; background: #a89cfb; }
        .sidebar-bottom { margin-top: auto; padding: 17px 14px; border: 1px solid #efedff; border-radius: 15px; background: #faf9ff; }
        .storage-icon { display: grid; width: 34px; height: 34px; margin-bottom: 12px; place-items: center; border-radius: 10px; background: #eeeaff; color: #725cf3; font-size: 18px; }
        .sidebar-bottom strong { display: block; font-size: 12px; }
        .sidebar-bottom p { margin: 7px 0 0; color: #88849e; font-size: 11px; line-height: 1.7; }
        .main-content { min-height: 100vh; margin-left: 252px; padding: 0 35px; }
        .topbar { position: sticky; top: 0; z-index: 20; display: flex; min-height: 83px; align-items: center; justify-content: space-between; gap: 20px; margin: 0 -35px 29px; padding: 14px 35px; border-bottom: 1px solid #eeedf5; background: #f7f7fcf5; backdrop-filter: blur(14px); }
        .breadcrumb { display: flex; align-items: center; gap: 11px; color: #9895a9; white-space: nowrap; font-size: 12px; }
        .breadcrumb-separator { color: #c8c4d7; }
        .breadcrumb strong { color: #36334d; }
        .topbar-right { display: flex; align-items: center; gap: 12px; }
        .search-box { display: flex; width: 265px; height: 42px; align-items: center; gap: 9px; padding: 0 12px; border: 1px solid #e9e7f2; border-radius: 11px; background: #fff; color: #8e89a5; }
        .search-box > span { font-size: 24px; }
        .search-box input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: #34314a; font-size: 11px; }
        .search-box input:focus-visible { outline: none; }
        .theme-toggle { display: grid; width: 40px; height: 40px; flex-shrink: 0; place-items: center; border: 1px solid #e9e7f2; border-radius: 11px; background: #fff; color: #5c4dd5; font-size: 18px; transition: transform .2s,background .2s; }
        .theme-toggle:hover { transform: translateY(-2px); }
        .profile-button { display: flex; align-items: center; gap: 9px; color: #504d65; white-space: nowrap; font-size: 11px; font-weight: 700; }
        .profile-avatar { display: grid; width: 35px; height: 35px; place-items: center; border-radius: 12px; background: #e9e4ff; color: #715cf0; font-size: 16px; font-weight: 800; }
        .mobile-menu { display: none; width: 39px; height: 39px; border: 1px solid #e8e5f4; border-radius: 10px; background: #fff; color: #5d51c9; }
        .welcome-banner { position: relative; display: flex; min-height: 300px; align-items: center; overflow: hidden; padding: 34px 43px; border-radius: 21px; background: linear-gradient(112deg,#5142d9,#7660f0 53%,#a57af4); color: #fff; box-shadow: 0 14px 35px #7860ef24; }
        .welcome-content { position: relative; z-index: 2; max-width: 480px; }
        .welcome-badge { display: inline-flex; align-items: center; gap: 8px; padding: 8px 11px; border: 1px solid #ffffff3d; border-radius: 30px; background: #ffffff16; color: #eeeaff; font-size: 9px; font-weight: 800; letter-spacing: 1px; }
        .live-dot { width: 6px; height: 6px; border-radius: 50%; background: #a8ffcb; box-shadow: 0 0 9px #a8ffcb; }
        .welcome-banner h1 { margin: 20px 0 12px; color: #fff; font-size: clamp(29px,3vw,43px); font-weight: 800; line-height: 1.15; letter-spacing: -1.8px; }
        .welcome-banner h1 span { color: #ded5ff; }
        .welcome-banner p { max-width: 420px; margin: 0; color: #e5e1ff; font-size: 12px; line-height: 1.9; }
        .banner-button { display: inline-flex; min-height: 43px; align-items: center; gap: 9px; margin-top: 23px; padding: 0 17px; border: 0; border-radius: 10px; background: #fff; color: #6250df; font-size: 12px; font-weight: 800; box-shadow: 0 5px 15px #3829a326; }
        .banner-art { position: absolute; top: 0; right: 1%; width: 43%; height: 100%; }
        .art-circle { position: absolute; border: 1px solid #ffffff19; border-radius: 50%; }
        .art-circle-one { top: -73px; right: -15px; width: 340px; height: 340px; }
        .art-circle-two { top: -29px; right: 29px; width: 255px; height: 255px; }
        .art-folder { position: absolute; top: 50%; left: 50%; width: 190px; height: 142px; transform: translate(-50%,-37%) rotate(-8deg); border: 1px solid #ffffff63; border-radius: 14px; background: linear-gradient(145deg,#e6dfff,#b7a5ff); box-shadow: 0 22px 50px #3321a657; }
        .folder-tab { position: absolute; top: -12px; left: 15px; width: 64px; height: 17px; border-radius: 7px 7px 0 0; background: #d8cdff; }
        .folder-inner { position: absolute; top: 16px; left: 16px; display: grid; width: 158px; height: 83px; place-items: center; border-radius: 9px; background: linear-gradient(135deg,#6c5ae6,#9e76f1); }
        .folder-play { display: grid; width: 38px; height: 38px; place-items: center; padding-left: 3px; border-radius: 50%; background: #ffffffec; color: #6d56df; font-size: 13px; }
        .folder-line { position: absolute; bottom: 13px; left: 17px; width: 95px; height: 5px; border-radius: 5px; background: #ffffffb3; }
        .folder-line.short { left: 119px; width: 31px; background: #ffffff67; }
        .floating-card { position: absolute; display: grid; width: 43px; height: 43px; place-items: center; border: 1px solid #ffffff63; border-radius: 13px; background: #ffffff26; color: #fff; box-shadow: 0 9px 22px #3221a329; backdrop-filter: blur(9px); }
        .floating-card-one { top: 25%; right: 17%; }
        .floating-card-two { right: 13%; bottom: 21%; font-size: 22px; }
        .banner-decoration { position: absolute; right: -10px; bottom: -106px; color: #ffffff08; font-size: 280px; font-weight: 900; line-height: 1; pointer-events: none; }
        .stats-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 17px; margin: 24px 0 37px; }
        .stat-card { min-width: 0; padding: 19px 20px; border: 1px solid #eeedf5; border-radius: 16px; background: #fff; }
        .stat-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .stat-icon { display: grid; width: 39px; height: 39px; place-items: center; border-radius: 12px; font-size: 19px; }
        .purple-icon { background: #f0ecff; color: #7762f3; }
        .blue-icon { background: #eaf3ff; color: #5593e9; }
        .green-icon { background: #e5faf2; color: #3cb48b; }
        .stat-caption { color: #b0acbf; font-size: 9px; font-weight: 800; letter-spacing: 1.1px; }
        .stat-number { margin-top: 15px; overflow-wrap: anywhere; color: #28253e; font-size: 27px; font-weight: 800; }
        .stat-description { margin-top: 5px; color: #9692a8; font-size: 11px; }
        .library-section { padding-bottom: 20px; }
        .section-heading { display: flex; align-items: center; justify-content: space-between; gap: 15px; }
        .section-eyebrow { margin-bottom: 8px; color: #8470ed; font-size: 9px; font-weight: 800; letter-spacing: 1.4px; }
        .section-heading h2 { margin: 0; color: #29263f; font-size: 24px; font-weight: 800; }
        .section-description { margin: 8px 0 0; color: #9894a9; font-size: 11px; line-height: 1.7; }
        .upload-button { display: inline-flex; min-height: 42px; align-items: center; justify-content: center; gap: 8px; padding: 0 16px; border: 0; border-radius: 10px; background: #7160ee; color: #fff; font-size: 11px; font-weight: 800; white-space: nowrap; box-shadow: 0 5px 13px #7160ee21; transition: background .2s,transform .2s; }
        .upload-button:hover { transform: translateY(-1px); background: #5e4cde; }
        .filter-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 25px 0 19px; }
        .filter-list { display: flex; flex-wrap: wrap; gap: 8px; }
        .filter-chip { display: inline-flex; min-height: 33px; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid #e9e7f2; border-radius: 9px; background: #fff; color: #77738b; font-size: 10px; font-weight: 700; }
        .filter-chip:hover,.filter-chip.selected { border-color: #dcd5ff; background: #f0edff; color: #705bf0; }
        .filter-count { display: grid; min-width: 19px; height: 19px; place-items: center; padding: 0 4px; border-radius: 6px; background: #e3ddff; color: #6e5ae8; font-size: 9px; }
        .results-count { color: #9995aa; font-size: 10px; white-space: nowrap; }
        .video-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 17px; }
        .video-card { min-width: 0; overflow: hidden; border: 1px solid #eeedf5; border-radius: 15px; background: #fff; transition: transform .2s,box-shadow .2s; }
        .video-card:hover { transform: translateY(-3px); box-shadow: 0 13px 28px #3523630c; }
        .video-thumbnail { position: relative; display: grid; aspect-ratio: 16/9; place-items: center; overflow: hidden; background: radial-gradient(ellipse at 75% 25%,#b8aaff 0,transparent 38%),linear-gradient(135deg,#5143a6,#8875e9 55%,#c6baff); }
        .video-card:nth-child(3n + 2) .video-thumbnail { background: radial-gradient(ellipse at 75% 25%,#a1d6e9 0,transparent 40%),linear-gradient(135deg,#346e98,#659ed4 55%,#b6d5f1); }
        .video-card:nth-child(3n) .video-thumbnail { background: radial-gradient(ellipse at 75% 25%,#a8e8d0 0,transparent 40%),linear-gradient(135deg,#287d71,#50b6a0 55%,#a4e6ce); }
        .thumbnail-play { display: grid; width: 45px; height: 45px; place-items: center; padding-left: 3px; border: 1px solid #ffffff99; border-radius: 50%; background: #ffffffdf; color: #6653e2; box-shadow: 0 5px 20px #18102b25; }
        .thumbnail-label { position: absolute; top: 11px; left: 11px; max-width: 65%; overflow: hidden; padding: 6px 9px; border: 1px solid #ffffff40; border-radius: 7px; background: #25203a40; color: #fff; text-overflow: ellipsis; white-space: nowrap; font-size: 9px; font-weight: 700; }
        .thumbnail-duration { position: absolute; right: 10px; bottom: 10px; padding: 5px 7px; border-radius: 6px; background: #201a3ab0; color: #fff; font-size: 9px; font-weight: 700; }
        .video-card-body { padding: 15px; }
        .video-card-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
        .video-card h3 { min-width: 0; overflow: hidden; margin: 0; color: #302c47; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 800; }
        .more-button { display: grid; width: 27px; height: 25px; flex-shrink: 0; place-items: center; margin-top: -5px; border: 0; border-radius: 7px; background: transparent; color: #89849f; font-size: 21px; }
        .video-description { display: -webkit-box; min-height: 35px; overflow: hidden; margin: 7px 0 12px; color: #9995a9; font-size: 10px; line-height: 1.7; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
        .video-meta { display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 10px 0; border-top: 1px solid #f0eef6; color: #9691a8; font-size: 9px; }
        .video-meta span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .video-card-actions { display: flex; gap: 8px; margin-top: 7px; }
        .watch-button { display: flex; min-height: 36px; flex: 1; align-items: center; justify-content: center; gap: 7px; border: 1px solid #e6e1ff; border-radius: 9px; background: #f6f4ff; color: #6b58e7; font-size: 10px; font-weight: 800; }
        .delete-button { display: grid; width: 36px; min-height: 36px; flex-shrink: 0; place-items: center; border: 1px solid #f1e5e7; border-radius: 9px; background: #fff; color: #d66b80; font-size: 21px; }
        .empty-state { display: flex; min-height: 300px; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; border: 1px dashed #dcd8ee; border-radius: 17px; background: #fff; text-align: center; }
        .empty-icon { display: grid; width: 65px; height: 65px; place-items: center; margin-bottom: 18px; border-radius: 20px; background: #f0edff; color: #7965ef; font-size: 30px; }
        .empty-state h3 { margin: 0; color: #39354f; font-size: 17px; }
        .empty-state p { max-width: 350px; margin: 10px 0 20px; color: #9792aa; font-size: 11px; line-height: 1.8; }
        .reset-button { padding: 10px 15px; border: 1px solid #e3defb; border-radius: 9px; background: #f5f2ff; color: #705bf0; font-size: 11px; font-weight: 700; }
        .loading-spinner { width: 32px; height: 32px; margin-bottom: 16px; border: 3px solid #e9e5ff; border-top-color: #7560ef; border-radius: 50%; animation: qv-spin .8s linear infinite; }
        @keyframes qv-spin { to { transform: rotate(360deg); } }
        .footer { display: flex; justify-content: space-between; gap: 12px; margin: 35px 0 0; padding: 21px 0; border-top: 1px solid #eae8f2; color: #a09caf; font-size: 9px; line-height: 1.7; }
        .footer-brand { color: #7160ed; font-weight: 800; }
        .modal-backdrop,.player-backdrop { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; overflow-y: auto; padding: 20px; background: #211a3d99; backdrop-filter: blur(5px); }
        .modal-panel { width: min(500px,100%); max-height: calc(100vh - 40px); overflow-y: auto; padding: 26px; border: 1px solid #ffffffa1; border-radius: 19px; background: #fff; box-shadow: 0 25px 80px #1a123333; animation: qv-modal-in .2s ease-out; }
        @keyframes qv-modal-in { from { opacity: 0; transform: translateY(8px) scale(.99); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .modal-heading,.player-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 15px; margin-bottom: 24px; }
        .modal-eyebrow { color: #7965ed; font-size: 9px; font-weight: 800; letter-spacing: 1.3px; }
        .modal-heading h2,.player-header h2 { margin: 8px 0 0; color: #2e2946; font-size: 22px; line-height: 1.35; overflow-wrap: anywhere; }
        .modal-heading p { margin: 7px 0 0; color: #9690a7; font-size: 11px; line-height: 1.7; }
        .modal-close { display: grid; width: 34px; height: 34px; flex-shrink: 0; place-items: center; border: 1px solid #ece9f4; border-radius: 10px; background: #fff; color: #77718b; font-size: 24px; line-height: 1; }
        .field-label { display: block; margin: 17px 0 8px; color: #49445f; font-size: 11px; font-weight: 800; }
        .optional-label { color: #aaa5b7; font-weight: 400; }
        .file-drop { display: flex; width: 100%; flex-direction: column; align-items: center; gap: 9px; padding: 23px 14px; border: 1px dashed #cfc6ff; border-radius: 13px; background: #faf9ff; color: #77718e; text-align: center; }
        .file-drop-icon { display: grid; width: 43px; height: 43px; place-items: center; border-radius: 13px; background: #e9e3ff; color: #715cf0; font-size: 25px; }
        .file-drop strong { max-width: 100%; overflow-wrap: anywhere; color: #413a5e; font-size: 12px; }
        .file-drop > span:not(.file-drop-icon) { font-size: 10px; line-height: 1.7; }
        .file-drop .file-browse { margin-top: 4px; padding: 7px 11px; border: 1px solid #e2dcff; border-radius: 7px; background: #fff; color: #6e59eb; font-size: 10px; font-weight: 800; }
        .hidden-file { display: none; }
        .form-input { display: block; width: 100%; min-height: 42px; padding: 11px 12px; border: 1px solid #e4e1ee; border-radius: 9px; outline: none; background: #fff; color: #38334f; font-size: 12px; transition: border .2s,box-shadow .2s; }
        .form-input:focus { border-color: #9c8cff; box-shadow: 0 0 0 3px #7863ef16; }
        .form-textarea { min-height: 85px; resize: vertical; line-height: 1.7; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 25px; }
        .cancel-button { min-height: 41px; padding: 0 14px; border: 1px solid #e5e2ef; border-radius: 9px; background: #fff; color: #77718a; font-size: 11px; font-weight: 700; }
        .player-backdrop { z-index: 110; }
        .player-panel { width: min(900px,100%); max-height: calc(100vh - 40px); overflow-y: auto; padding: 24px; border: 1px solid #ffffff7a; border-radius: 19px; background: #fff; box-shadow: 0 25px 80px #1a123333; }
        .player-header { align-items: center; margin-bottom: 19px; }
        .player-header h2 { font-size: 20px; }
        .main-video-player { display: block; width: 100%; max-height: 65vh; border-radius: 12px; background: #111; object-fit: contain; }
        .player-information { padding-top: 18px; }
        .player-category { display: inline-flex; padding: 7px 10px; border-radius: 7px; background: #f0edff; color: #715be8; font-size: 10px; font-weight: 800; }
        .player-information p { margin: 12px 0; color: #666078; font-size: 12px; line-height: 1.8; }
        .player-information > span { color: #a09bad; font-size: 10px; overflow-wrap: anywhere; }
        .toast-message { position: fixed; right: 24px; bottom: 24px; z-index: 200; max-width: calc(100vw - 32px); padding: 14px 19px; border: 1px solid #e5e0ff; border-radius: 12px; background: #fff; color: #5545c6; box-shadow: 0 10px 35px #20133c18; font-size: 12px; font-weight: 700; line-height: 1.6; animation: qv-modal-in .2s ease-out; }
        .sidebar-overlay { display: none; }

        /* TUNGI REJIM */
        html.qv-dark-mode, html.qv-dark-mode body { background: #10111a !important; color: #ececf5; color-scheme: dark; }
        html.qv-dark-mode .qv-app { background: #10111a; color: #ececf5; }
        html.qv-dark-mode .sidebar,html.qv-dark-mode .topbar { background: #141520; border-color: #292a3a; }
        html.qv-dark-mode .topbar { background: #141520ed; }
        html.qv-dark-mode .brand,html.qv-dark-mode .breadcrumb strong,html.qv-dark-mode .stat-number,html.qv-dark-mode .section-heading h2,html.qv-dark-mode .video-card h3,html.qv-dark-mode .empty-state h3,html.qv-dark-mode .modal-heading h2,html.qv-dark-mode .player-header h2,html.qv-dark-mode .sidebar-bottom strong { color: #f0efff; }
        html.qv-dark-mode .side-link { color: #aaa7c0; }
        html.qv-dark-mode .side-link:hover,html.qv-dark-mode .side-link.active { background: #2a2647; color: #c2b8ff; }
        html.qv-dark-mode .sidebar-bottom,html.qv-dark-mode .stat-card,html.qv-dark-mode .video-card,html.qv-dark-mode .empty-state,html.qv-dark-mode .modal-panel,html.qv-dark-mode .player-panel { background: #191a27; border-color: #2c2d40; }
        html.qv-dark-mode .sidebar-bottom { background: #202033; border-color: #34304d; }
        html.qv-dark-mode .storage-icon { background: #302b50; color: #c2b8ff; }
        html.qv-dark-mode .search-box,html.qv-dark-mode .form-input,html.qv-dark-mode .cancel-button,html.qv-dark-mode .modal-close,html.qv-dark-mode .delete-button,html.qv-dark-mode .filter-chip,html.qv-dark-mode .theme-toggle,html.qv-dark-mode .mobile-menu { background: #202130; border-color: #34354a; color: #e5e3f5; }
        html.qv-dark-mode .search-box input { color: #f0efff; }
        html.qv-dark-mode .search-box input::placeholder,html.qv-dark-mode .form-input::placeholder { color: #88869f; }
        html.qv-dark-mode .section-description,html.qv-dark-mode .video-description,html.qv-dark-mode .video-meta,html.qv-dark-mode .stat-description,html.qv-dark-mode .modal-heading p,html.qv-dark-mode .player-information p,html.qv-dark-mode .player-information > span,html.qv-dark-mode .sidebar-bottom p { color: #aaa7bf; }
        html.qv-dark-mode .video-meta,html.qv-dark-mode .footer { border-color: #2c2d40; }
        html.qv-dark-mode .filter-chip.selected { background: #2a2647; border-color: #494071; color: #c2b8ff; }
        html.qv-dark-mode .filter-count { background: #383052; color: #c2b8ff; }
        html.qv-dark-mode .watch-button { background: #292442; border-color: #443a70; color: #c2b8ff; }
        html.qv-dark-mode .more-button { color: #b5b0ce; }
        html.qv-dark-mode .more-button:hover { background: #302b50; }
        html.qv-dark-mode .file-drop { background: #202033; border-color: #494071; color: #c2bfd6; }
        html.qv-dark-mode .file-drop strong { color: #f0efff; }
        html.qv-dark-mode .file-drop .file-browse { background: #28263a; border-color: #494071; color: #c2b8ff; }
        html.qv-dark-mode .footer { color: #9692ad; }
        html.qv-dark-mode .toast-message { background: #201f31; border-color: #494071; color: #c2b8ff; }
        html.qv-dark-mode .profile-button { color: #d8d5eb; }
        html.qv-dark-mode .profile-avatar { background: #302b50; color: #c2b8ff; }
        html.qv-dark-mode .player-category { background: #2a2647; color: #c2b8ff; }
        html.qv-dark-mode .reset-button { background: #292442; border-color: #443a70; color: #c2b8ff; }

        @media (min-width: 1500px) {
          .main-content { padding-right: 48px; padding-left: 48px; }
          .topbar { margin-right: -48px; margin-left: -48px; padding-right: 48px; padding-left: 48px; }
          .video-grid { grid-template-columns: repeat(4,minmax(0,1fr)); }
        }
        @media (max-width: 1200px) {
          .sidebar { width: 225px; }
          .main-content { margin-left: 225px; padding-right: 24px; padding-left: 24px; }
          .topbar { margin-right: -24px; margin-left: -24px; padding-right: 24px; padding-left: 24px; }
          .video-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
          .banner-art { right: -5%; width: 42%; }
          .welcome-banner { padding-right: 30px; padding-left: 30px; }
          .search-box { width: 220px; }
        }
        @media (max-width: 900px) {
          .sidebar { width: 250px; transform: translateX(-100%); transition: transform .25s ease; }
          .sidebar.sidebar-open { transform: translateX(0); box-shadow: 15px 0 50px #211a3d1a; }
          .sidebar-overlay { position: fixed; inset: 0; z-index: 25; display: block; border: 0; background: #211a3d65; }
          .main-content { margin-left: 0; padding-right: 24px; padding-left: 24px; }
          .topbar { margin-right: -24px; margin-left: -24px; padding-right: 24px; padding-left: 24px; gap: 12px; }
          .mobile-menu { display: grid; flex-shrink: 0; place-items: center; font-size: 19px; }
          .breadcrumb { margin-right: auto; }
          .banner-art { right: -1%; width: 40%; opacity: .8; }
          .welcome-content { max-width: 62%; }
          .welcome-banner h1 { font-size: 34px; }
          .stats-grid { gap: 12px; }
          .stat-card { padding: 16px; }
          .profile-name { display: none; }
        }
        @media (max-width: 600px) {
          .main-content { padding-right: 15px; padding-left: 15px; }
          .topbar { min-height: 68px; flex-wrap: wrap; margin-right: -15px; margin-left: -15px; margin-bottom: 20px; padding: 11px 15px; gap: 10px; }
          .breadcrumb { gap: 7px; font-size: 11px; }
          .topbar-right { display: contents; }
          .search-box { order: 4; width: 100%; height: 40px; }
          .profile-button { margin-left: auto; }
          .profile-avatar { width: 33px; height: 33px; }
          .welcome-banner { min-height: 285px; padding: 25px 21px; border-radius: 17px; }
          .welcome-content { max-width: 100%; }
          .welcome-badge { font-size: 8px; }
          .welcome-banner h1 { font-size: 32px; letter-spacing: -1.2px; }
          .welcome-banner p { max-width: 290px; font-size: 11px; }
          .banner-art { right: -120px; width: 270px; opacity: .2; }
          .banner-button { margin-top: 19px; }
          .stats-grid { grid-template-columns: repeat(3,minmax(0,1fr)); gap: 8px; margin: 17px 0 29px; }
          .stat-card { padding: 12px 10px; border-radius: 12px; }
          .stat-icon { width: 30px; height: 30px; border-radius: 9px; font-size: 15px; }
          .stat-caption { display: none; }
          .stat-number { margin-top: 12px; font-size: 20px; }
          .stat-description { font-size: 9px; line-height: 1.5; }
          .section-heading { align-items: center; }
          .section-heading h2 { font-size: 21px; }
          .section-description { max-width: 225px; font-size: 10px; }
          .section-eyebrow { font-size: 8px; }
          .section-heading > .upload-button { min-height: 38px; gap: 5px; padding: 0 10px; font-size: 10px; }
          .filter-row { align-items: flex-start; flex-direction: column; margin-top: 20px; }
          .filter-list { gap: 6px; }
          .filter-chip { min-height: 31px; padding: 0 9px; font-size: 9px; }
          .results-count { align-self: flex-end; }
          .video-grid { grid-template-columns: minmax(0,1fr); gap: 14px; }
          .video-thumbnail { aspect-ratio: 16/8.5; }
          .video-card-body { padding: 14px; }
          .footer { flex-direction: column; gap: 5px; margin-top: 25px; }
          .modal-backdrop,.player-backdrop { align-items: flex-start; padding: 12px; }
          .modal-panel,.player-panel { max-height: calc(100dvh - 24px); padding: 19px 16px; border-radius: 15px; }
          .modal-heading h2,.player-header h2 { font-size: 19px; }
          .modal-actions { flex-wrap: wrap; }
          .modal-actions button { flex: 1; }
          .main-video-player { max-height: 55vh; }
          .toast-message { right: 12px; bottom: 12px; left: 12px; max-width: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          *,*::before,*::after { scroll-behavior: auto !important; animation-duration: .01ms !important; transition-duration: .01ms !important; }
        }
      `}</style>
    </div>
  );
}
