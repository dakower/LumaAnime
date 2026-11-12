/**
 * LumaAnime — Современный онлайн-кинотеатр и энциклопедия аниме
 * Полный клиентский движок:
 * - Кастомные серо-фиолетовые выпадающие меню (LumaDropdown) вместо стандартных браузерных <select>
 * - Современный кастомный видеоплеер LumaPlayer с плавной сменой озвучек, качеств и сохранением таймкода
 * - Поддержка ВСЕХ серий любого аниме (1..1180+ для Ван-Пис, Наруто, Блич и др.) с разбивкой по сотням (1–100, 101–200...) и быстрым поиском серии
 * - Режим реального времени (Live Sync + обратный отсчёт до выхода новой серии)
 */

(function () {
  "use strict";

  const IS_STATIC_HOST =
    window.location.hostname.includes("github.io") ||
    window.location.protocol === "file:" ||
    window.location.hostname.includes("pages.dev") ||
    window.location.hostname.includes("vercel.app") ||
    window.location.hostname.includes("netlify.app");

  async function fastFetchJson(url, timeoutMs = 2800) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      if (!res.ok) return null;
      return await res.json();
    } catch (_) {
      return null;
    }
  }

  const DEFAULT_STARTER_HOME = [
    { id: 16498, name: "Shingeki no Kyojin", russian: "Атака титанов", score: "8.5", kind: "tv", episodes: 25, poster_url: "https://shikimori.io/system/animes/original/16498.jpg?1711973439", banner_url: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/16498-8jpFCOcDmneX.jpg" },
    { id: 5114, name: "Fullmetal Alchemist: Brotherhood", russian: "Стальной алхимик: Братство", score: "9.1", kind: "tv", episodes: 64, poster_url: "https://shikimori.io/system/animes/original/5114.jpg?1711949773", banner_url: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/5114-q0V5URebphSG.jpg" },
    { id: 30276, name: "One Punch Man", russian: "Ванпанчмен", score: "8.5", kind: "tv", episodes: 12, poster_url: "https://shikimori.io/system/animes/original/30276.jpg?1711967568", banner_url: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/21087-sHb9zUZFsHe1.jpg" },
    { id: 38000, name: "Kimetsu no Yaiba", russian: "Клинок, рассекающий демонов", score: "8.5", kind: "tv", episodes: 26, poster_url: "https://shikimori.io/system/animes/original/38000.jpg?1711958556", banner_url: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/101922-33MtJGsUSxga.jpg" },
    { id: 40748, name: "Jujutsu Kaisen", russian: "Магическая битва", score: "8.6", kind: "tv", episodes: 24, poster_url: "https://shikimori.io/system/animes/original/40748.jpg?1711953835", banner_url: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/113415-jQBSkxWAAk83.jpg" },
    { id: 44511, name: "Chainsaw Man", russian: "Человек-бензопила", score: "8.5", kind: "tv", episodes: 12, poster_url: "https://shikimori.io/system/animes/original/44511.jpg?1711954497", banner_url: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/127230-o8IRwCGVr9KW.jpg" },
    { id: 52991, name: "Sousou no Frieren", russian: "Провожающая в последний путь Фрирен", score: "9.3", kind: "tv", episodes: 28, poster_url: "https://shikimori.io/system/animes/original/52991.jpg?1711953112", banner_url: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/154587-ivXNJ23SM1xB.jpg" },
    { id: 21, name: "One Piece", russian: "Ван-Пис", score: "8.7", kind: "tv", episodes: 1180, poster_url: "https://shikimori.io/system/animes/original/21.jpg?1711954707", banner_url: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/21-wf37VakJmZqs.jpg" },
    { id: 52299, name: "Ore dake Level Up na Ken", russian: "Поднятие уровня в одиночку", score: "8.3", kind: "tv", episodes: 12, poster_url: "https://shikimori.io/system/animes/original/52299.jpg?1711953046", banner_url: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/151807-37yfQA3ym8PA.jpg" }
  ];

  // =========================================================================
  // 1. Curated Genres with Custom Vector Icons (Shikimori Genre IDs)
  // =========================================================================
  const GENRES_CONFIG = [
    {
      id: "1",
      name: "Экшен",
      sub: "Динамика и сражения",
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/></svg>`,
    },
    {
      id: "10",
      name: "Фэнтези",
      sub: "Магические миры и Исекай",
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"/></svg>`,
    },
    {
      id: "27",
      name: "Сёнен",
      sub: "Путь героя и воля",
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    },
    {
      id: "22",
      name: "Романтика",
      sub: "Чувства и отношения",
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    },
    {
      id: "40",
      name: "Психологическое",
      sub: "Игры разума и философия",
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="3" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="21"/></svg>`,
    },
    {
      id: "24",
      name: "Фантастика",
      sub: "Киберпанк, космос и будущее",
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(30 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-30 12 12)"/><circle cx="12" cy="12" r="2"/></svg>`,
    },
    {
      id: "8",
      name: "Драма",
      sub: "Глубокие судьбы",
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
    },
    {
      id: "4",
      name: "Комедия",
      sub: "Юмор и лёгкое настроение",
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
    },
    {
      id: "41",
      name: "Триллер",
      sub: "Саспенс и напряжение",
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 2 22 22 22 12 2"/><line x1="12" y1="10" x2="12" y2="15"/><circle cx="12" cy="18" r="1"/></svg>`,
    },
    {
      id: "37",
      name: "Сверхъестественное",
      sub: "Мистика, духи и тайны",
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
    },
    {
      id: "36",
      name: "Повседневность",
      sub: "Уют и тепло каждого дня",
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,
    },
    {
      id: "42",
      name: "Сэйнэн",
      sub: "Серьёзные взрослые сюжеты",
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    },
    {
      id: "7",
      name: "Детектив",
      sub: "Расследования и загадки",
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><circle cx="11" cy="11" r="3"/></svg>`,
    },
    {
      id: "13",
      name: "Исторический",
      sub: "Эпохи, самураи и легенды",
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/></svg>`,
    },
    {
      id: "18",
      name: "Меха",
      sub: "Боевые роботы и пилоты",
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/></svg>`,
    },
    {
      id: "30",
      name: "Спорт",
      sub: "Азарт, команда и победа",
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/><path d="M19.07 4.93L4.93 19.07"/></svg>`,
    },
  ];

  const MOOD_CAPSULES = [
    {
      id: "mind_games",
      title: "Интеллектуальные дуэли",
      desc: "Психологические триллеры, гениальные стратеги и неожиданные повороты",
      params: { genre: "40,41", order: "ranked" },
    },
    {
      id: "dark_fantasy",
      title: "Мрачное фэнтези и экшен",
      desc: "Суровые миры, эпические битвы и бескомпромиссные герои",
      params: { genre: "1,10", order: "popularity" },
    },
    {
      id: "cozy_evening",
      title: "Тёплый уютный вечер",
      desc: "Повседневность, мягкая романтика и исцеляющая атмосфера",
      params: { genre: "36,22", order: "ranked" },
    },
    {
      id: "cyber_scifi",
      title: "Научная фантастика и космос",
      desc: "Технологии будущего, киберпанк, временные петли и антиутопии",
      params: { genre: "24", order: "ranked" },
    },
    {
      id: "modern_hits",
      title: "Главные хиты 2024–2026",
      desc: "Самые громкие и высокооценённые блокбастеры последних лет",
      params: { season: "2024_2026", order: "popularity" },
    },
    {
      id: "golden_90s",
      title: "Культовая классика 90-х и 00-х",
      desc: "Легендарная ручная анимация и произведения, изменившие индустрию",
      params: { season: "1990_2009", order: "ranked" },
    },
  ];

  const KIND_LABELS = {
    tv: "ТВ-сериал",
    movie: "Фильм",
    ova: "OVA",
    ona: "ONA",
    special: "Спешл",
    tv_special: "ТВ-спешл",
    music: "Клип",
  };

  const STATUS_LABELS = {
    ongoing: "Онгоинг",
    released: "Вышло",
    anons: "Анонс",
  };

  const WATCHLIST_LABELS = {
    watching: "Смотрю",
    planned: "В планах",
    completed: "Просмотрено",
    favorite: "Любимое ★",
    dropped: "Брошено",
  };

  // =========================================================================
  // 2. Application State & LocalStorage Persistence
  // =========================================================================
  const state = {
    detailCache: {},
    currentView: "home",
    homeData: null,
    heroItems: [],
    heroIndex: 0,
    heroTimer: null,

    // Dynamic Rotating Anime Banners
    animeBannerList: [],
    animeBannerPage: 0,
    animeBannerTimer: null,

    // Mid-page Panoramic Rotating Anime Banner
    wideShowcaseList: [],
    wideShowcaseIndex: 0,
    wideShowcaseTimer: null,

    catalogCache: {},
    detailCache: {},
    catalog: {
      page: 1,
      search: "",
      order: "popularity",
      kind: "",
      status: "",
      season: "",
      score: "",
      selectedGenres: new Set(),
    },

    hlsInstance: null,
    currentAnimeDetail: null,
    currentPlayerState: {
      mode: "hls", // 'hls' | 'balancer' | 'trailer'
      voiceoverId: "anilibria_hls",
      voiceoverName: "AniLibria.TV (Прямой поток 1080p FHD)",
      voiceoverBadge: "FHD 1080p",
      episodeOrdinal: 1,
      quality: "1080",
      playbackRate: 1,
      savedCurrentTime: 0,
      epRangeIndex: 0, // 0 means 1..100, 1 means 101..200, etc.
      epSearchQuery: "",
    },

    lumaUser: { logged_in: false, user_id: "guest", name: "Гость Luma", email: "", avatar: "" },
    streamAbortController: null,
    hideControlsTimeout: null,
    watchProgress: {},
    library: {},
    watchHistory: [],
  };

  function loadJsonStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function getUserStorageKey(base) {
    const uid = state.lumaUser?.user_id || "guest";
    return `${base}_${uid}`;
  }

  function loadUserData() {
    const uid = state.lumaUser?.user_id || "guest";
    state.library = loadJsonStorage(`luma_user_library_${uid}`, loadJsonStorage("luma_user_library_v1", {}));
    state.watchHistory = loadJsonStorage(`luma_watch_history_${uid}`, loadJsonStorage("luma_watch_history_v1", []));
    state.watchProgress = loadJsonStorage(`luma_watch_progress_${uid}`, loadJsonStorage("luma_watch_progress_backup", {}));
    updateLibraryBadge();

    // Also pull latest server-stored watch progress
    fetch(`/api/watch-progress?user_id=${encodeURIComponent(uid)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === "object") {
          const serverWp = data.progress || data;
          if (serverWp && typeof serverWp === "object" && !Array.isArray(serverWp)) {
            state.watchProgress = Object.assign({}, serverWp, state.watchProgress);
          }
        }
      })
      .catch(() => {});
  }

  function saveLibrary() {
    try {
      const key = getUserStorageKey("luma_user_library");
      localStorage.setItem(key, JSON.stringify(state.library));
      localStorage.setItem("luma_user_library_v1", JSON.stringify(state.library));
      updateLibraryBadge();

      // Persist to local server
      fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: state.lumaUser?.user_id || "guest",
          collections: state.library
        })
      }).catch(() => {});
    } catch (_) {}
  }

  function saveWatchHistory() {
    try {
      const key = getUserStorageKey("luma_watch_history");
      localStorage.setItem(key, JSON.stringify(state.watchHistory.slice(0, 30)));
      localStorage.setItem("luma_watch_history_v1", JSON.stringify(state.watchHistory.slice(0, 30)));
    } catch (_) {}
  }

  function recordWatchProgress(animeId, epOrdinal, epName, voiceoverName, currentTime, duration) {
    if (!animeId || currentTime < 2) return;
    const aid = String(animeId);
    state.watchProgress[aid] = {
      animeId: aid,
      episodeOrdinal: Number(epOrdinal) || 1,
      episodeName: epName || `Серия ${epOrdinal}`,
      voiceoverName: voiceoverName || "Русская озвучка",
      currentTime: Math.floor(currentTime),
      duration: Math.floor(duration || 0),
      updatedAt: Date.now()
    };
    try {
      const key = getUserStorageKey("luma_watch_progress");
      localStorage.setItem(key, JSON.stringify(state.watchProgress));
      localStorage.setItem("luma_watch_progress_backup", JSON.stringify(state.watchProgress));

      // Debounced sync to server
      clearTimeout(window.__syncWpTimer);
      window.__syncWpTimer = setTimeout(() => {
        fetch("/api/watch-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: state.lumaUser?.user_id || "guest",
            progress: state.watchProgress
          })
        }).catch(() => {});
      }, 1000);
    } catch (_) {}
  }

  function getWatchProgress(animeId) {
    if (!state.watchProgress || !animeId) return null;
    return state.watchProgress[String(animeId)] || state.watchProgress[Number(animeId)] || null;
  }

  function formatTime(sec) {
    if (isNaN(sec) || sec < 0) return "0:00";
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    const remSec = s % 60;
    const h = Math.floor(m / 60);
    const remMin = m % 60;
    const padSec = remSec < 10 ? "0" + remSec : remSec;
    if (h > 0) {
      const padMin = remMin < 10 ? "0" + remMin : remMin;
      return `${h}:${padMin}:${padSec}`;
    }
    return `${remMin}:${padSec}`;
  }

  function updateLibraryBadge() {
    const count = Object.keys(state.library).length;
    const badge = document.getElementById("libraryCountBadge");
    if (badge) {
      badge.textContent = String(count);
    }
    const mobileBadge = document.getElementById("mobileLibraryBadge");
    if (mobileBadge) {
      mobileBadge.textContent = String(count);
      mobileBadge.style.display = count > 0 ? "inline-block" : "none";
    }
  }

  function showToast(msg) {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 250);
    }, 2800);
  }

  // =========================================================================
  // 3. Custom Modern Dropdown System (Replaces All Ugly Browser <select>)
  // =========================================================================
  function upgradeSelectToLumaDropdown(selectEl, alignRight = false) {
    if (!selectEl) return;

    // Remove existing wrapper if re-rendering
    const existingWrapper = selectEl.parentElement?.classList.contains("luma-dropdown-host")
      ? selectEl.parentElement
      : null;

    selectEl.style.display = "none";

    let wrapper = selectEl.nextElementSibling;
    if (!wrapper || !wrapper.classList.contains("luma-dropdown")) {
      wrapper = document.createElement("div");
      wrapper.className = "luma-dropdown";
      selectEl.insertAdjacentElement("afterend", wrapper);
    }

    function renderDropdownContent() {
      const selectedOpt = selectEl.options[selectEl.selectedIndex] || selectEl.options[0];
      const labelText = selectedOpt ? selectedOpt.dataset.shortLabel || selectedOpt.textContent : "";

      const optionsHtml = Array.from(selectEl.options)
        .map((opt, idx) => {
          const isSelected = idx === selectEl.selectedIndex;
          const isDisabled = opt.disabled;
          const badge = opt.dataset.badge || "";
          const mainText = opt.dataset.shortLabel || opt.textContent;
          return `
            <button type="button" class="luma-dropdown-option ${isSelected ? "selected" : ""} ${isDisabled ? "disabled" : ""}" data-opt-idx="${idx}" ${isDisabled ? "disabled" : ""}>
              <span style="flex:1; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(mainText)}</span>
              ${badge ? `<span class="luma-option-sub">${escapeHtml(badge)}</span>` : ""}
              <span class="luma-option-check">✓</span>
            </button>
          `;
        })
        .join("");

      wrapper.innerHTML = `
        <button type="button" class="luma-dropdown-trigger" aria-haspopup="listbox">
          <span class="luma-dropdown-label">${escapeHtml(labelText)}</span>
          <svg class="luma-dropdown-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <div class="luma-dropdown-menu ${alignRight ? "align-right" : ""}" role="listbox">
          ${optionsHtml}
        </div>
      `;

      const trigger = wrapper.querySelector(".luma-dropdown-trigger");
      trigger?.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = wrapper.classList.contains("open");
        closeAllLumaDropdowns();
        if (!isOpen) {
          wrapper.classList.add("open");
        }
      });

      wrapper.querySelectorAll(".luma-dropdown-option").forEach((optBtn) => {
        optBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (optBtn.hasAttribute("disabled") || optBtn.classList.contains("disabled")) return;
          const idx = Number(optBtn.dataset.optIdx);
          selectEl.selectedIndex = idx;
          wrapper.classList.remove("open");
          renderDropdownContent();
          selectEl.dispatchEvent(new Event("change", { bubbles: true }));
        });
      });
    }

    renderDropdownContent();
    selectEl._refreshLumaDropdown = renderDropdownContent;
  }

  function closeAllLumaDropdowns() {
    document.querySelectorAll(".luma-dropdown.open").forEach((d) => d.classList.remove("open"));
  }

  document.addEventListener("click", () => {
    closeAllLumaDropdowns();
  });

  // =========================================================================
  // 4. Formatting & Card Renderers (Accurate Real-Time Episodes Count)
  // =========================================================================
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function stripShikimoriBBCode(text) {
    if (!text) return "Описание готовится к публикации.";
    return String(text)
      .replace(/\[character=[^\]]*\]([^\[]*)\[\/character\]/gi, "$1")
      .replace(/\[person=[^\]]*\]([^\[]*)\[\/person\]/gi, "$1")
      .replace(/\[anime=[^\]]*\]([^\[]*)\[\/anime\]/gi, "$1")
      .replace(/\[[^\]]+\]/g, "")
      .trim();
  }

  function getYear(anime) {
    const dateStr = anime.aired_on || anime.released_on || "";
    return dateStr ? dateStr.slice(0, 4) : anime.year || "";
  }

  function getPoster(anime) {
    if (anime.poster_url) return anime.poster_url;
    if (anime.image && anime.image.original && !anime.image.original.includes("missing")) {
      return `https://shikimori.io${anime.image.original}`;
    }
    return "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-buvcRTBx4NSm.jpg";
  }

  function formatEpisodesBadge(anime) {
    const realAired = Number(anime.real_episodes_aired || anime.episodes_aired || 0);
    const realTotal = Number(anime.real_episodes_total || anime.episodes || 0);

    if (anime.status === "ongoing") {
      if (realTotal > 0 && realTotal >= realAired) {
        return `${realAired} / ${realTotal} эп.`;
      }
      return realAired > 0 ? `${realAired}+ эп.` : "Онгоинг";
    }
    const finalCount = Math.max(realTotal, realAired);
    return finalCount > 0 ? `${finalCount} эп.` : "";
  }

  function formatTimeSeconds(sec) {
    if (!sec || isNaN(sec) || sec < 0) return "0:00";
    const total = Math.floor(sec);
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }

  function renderSkeletonGrid(container, count = 12) {
    if (!container) return;
    container.innerHTML = Array.from({ length: count })
      .map(() => `<div class="skeleton-card"></div>`)
      .join("");
  }

  function createAnimeCardHtml(anime) {
    const id = anime.id;
    const title = escapeHtml(anime.russian || anime.name);
    const poster = escapeHtml(getPoster(anime));
    const score = anime.score && parseFloat(anime.score) > 0 ? parseFloat(anime.score).toFixed(2) : null;
    const kind = KIND_LABELS[anime.kind] || "Аниме";
    const year = getYear(anime);
    const isOngoing = anime.status === "ongoing";
    const libEntry = state.library[id];
    const epsText = formatEpisodesBadge(anime);

    return `
      <article class="anime-card" data-anime-id="${id}" tabindex="0" role="button" aria-label="${title}">
        <div class="anime-card-poster-wrap">
          <img class="anime-card-poster" src="${poster}" alt="${title}" loading="lazy" />
          ${score ? `<span class="card-badge-top-left">★ ${score}</span>` : ""}
          <span class="card-badge-top-right ${isOngoing ? "card-badge-status-ongoing" : ""}">
            ${isOngoing ? "LIVE ОНГОИНГ" : escapeHtml(kind)}
          </span>
          ${
            libEntry
              ? `<span class="card-bookmark-indicator">${escapeHtml(WATCHLIST_LABELS[libEntry.status] || "В списке")}</span>`
              : ""
          }
        </div>
        <h3 class="anime-card-title" title="${title}">${title}</h3>
        <div class="anime-card-meta">
          <span>${year || "Анонс"}</span>
          ${epsText ? `<span>•</span><span>${escapeHtml(epsText)}</span>` : ""}
        </div>
      </article>
    `;
  }

  function renderAnimeGrid(container, items, emptyMessage = "Тайтлы по заданным параметрам не найдены.") {
    if (!container) return;
    if (!items || !items.length) {
      container.innerHTML = `<div style="grid-column: 1 / -1; padding: 36px; text-align:center; color: var(--text-secondary); background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-subtle);">${escapeHtml(emptyMessage)}</div>`;
      return;
    }
    container.innerHTML = items.map(createAnimeCardHtml).join("");
  }

  // =========================================================================
  // 5. Navigation & View Switching
  // =========================================================================
  function switchView(viewName, pushHash = true) {
    if (state.currentView === "anime" && viewName !== "anime") {
      destroyActivePlayer();
    }

    state.currentView = viewName;
    document.querySelectorAll(".view-section").forEach((sec) => {
      sec.classList.toggle("active", sec.id === `view-${viewName}`);
    });

    document.querySelectorAll(".main-nav .nav-link, .mobile-nav-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.nav === viewName);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });

    if (pushHash && viewName !== "anime") {
      history.replaceState(null, "", `#${viewName}`);
    }

    if (viewName === "home") {
      renderContinueWatching();
    } else if (viewName === "catalog") {
      loadCatalogResults();
    } else if (viewName === "recommendations") {
      initRecommendationsView();
    } else if (viewName === "schedule") {
      initScheduleView();
    } else if (viewName === "library") {
      renderLibraryView("all");
    }
  }

  // =========================================================================
  // 6. Home View & Wide Promotional Banners
  // =========================================================================
  // =========================================================================
  // 6. Home View & Wide Promotional Banners (Instant Zero-Delay Cached Loading)
  // =========================================================================
  async function initHomeView(forceRefresh = false) {
    try {
      renderHomeGenreRail();
      renderHomeQuickGenreTabs();
      renderContinueWatching();

      // 1. Instant 0ms Render from Cache or Starter Bundle
      let cached = null;
      try {
        const raw = localStorage.getItem("luma_home_cache_v4");
        if (raw) cached = JSON.parse(raw);
      } catch (_) {}

      const initialData = cached && cached.ongoing_top && cached.ongoing_top.length > 0
        ? cached
        : {
            ongoing_top: DEFAULT_STARTER_HOME,
            popular_all_time: DEFAULT_STARTER_HOME,
            top_rated: DEFAULT_STARTER_HOME,
            recent_anilibria: []
          };

      applyHomeData(initialData);

      // 2. Fast background update from shikimori.io
      fetchFreshHomeData(forceRefresh);
    } catch (err) {
      console.error("initHomeView error:", err);
    }
  }

  function applyHomeData(data) {
    if (!data) return;
    state.homeData = data;

    const candidates = [...(data.ongoing_top || []), ...(data.popular_all_time || [])];
    const withBanners = candidates.filter((a) => a.banner_url && a.banner_url !== a.poster_url);
    state.heroItems = (withBanners.length >= 4 ? withBanners : candidates).slice(0, 6);
    renderHeroSpotlight(0);
    startHeroRotation();

    const allCandidates = [
      ...(data.popular_all_time || []),
      ...(data.ongoing_top || []),
      ...(data.top_rated || []),
    ];
    const seenIds = new Set();
    state.animeBannerList = [];
    allCandidates.forEach((a) => {
      if (a && a.id && !seenIds.has(a.id)) {
        seenIds.add(a.id);
        state.animeBannerList.push(a);
      }
    });

    renderAnimeBanners(0);
    startAnimeBannerRotation();

    state.wideShowcaseList = state.animeBannerList.slice(0, 6);
    renderWideShowcaseBanner(0);
    startWideShowcaseRotation();

    const ongoingGrid = document.getElementById("homeOngoingGrid");
    const topRatedGrid = document.getElementById("homeTopRatedGrid");
    if (ongoingGrid) renderAnimeGrid(ongoingGrid, (data.ongoing_top || []).slice(0, 12));
    if (topRatedGrid) renderAnimeGrid(topRatedGrid, (data.top_rated || []).slice(0, 12));
    renderFreshDubGrid(data.recent_anilibria || []);
  }

  async function enrichAnimeWithAniListBanners(items) {
    if (!Array.isArray(items) || !items.length) return;
    const needBanners = items.filter((a) => a && a.id && (!a.banner_url || a.banner_url === a.poster_url));
    if (!needBanners.length) return;
    const ids = Array.from(new Set(needBanners.map((a) => Number(a.id)).filter((id) => id > 0))).slice(0, 50);
    if (!ids.length) return;

    try {
      const query = `query ($ids: [Int]) {
        Page(page: 1, perPage: 50) {
          media(idMal_in: $ids, type: ANIME) {
            idMal
            bannerImage
          }
        }
      }`;
      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { ids } })
      });
      if (res.ok) {
        const json = await res.json();
        const mediaList = json?.data?.Page?.media || [];
        const bannerMap = new Map();
        mediaList.forEach((m) => {
          if (m.idMal && m.bannerImage) {
            bannerMap.set(Number(m.idMal), m.bannerImage);
          }
        });
        items.forEach((a) => {
          if (a && a.id) {
            const b = bannerMap.get(Number(a.id));
            if (b) a.banner_url = b;
          }
        });
      }
    } catch (_) {}
  }

  async function fetchFreshHomeData(forceRefresh = false) {
    let data = null;
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (isLocal && !IS_STATIC_HOST) {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 2000);
        const res = await fetch(`/api/home${forceRefresh ? "?refresh=1" : ""}`, { signal: ctrl.signal });
        clearTimeout(tid);
        if (res.ok) data = await res.json();
      } catch (_) {}
    }

    if (!data || !data.ongoing_top || data.ongoing_top.length === 0) {
      try {
        const [ongoing, popular, topRated, alData] = await Promise.all([
          fastFetchJson("https://shikimori.io/api/animes?order=popularity&limit=16&status=ongoing", 2800),
          fastFetchJson("https://shikimori.io/api/animes?order=popularity&limit=16", 2800),
          fastFetchJson("https://shikimori.io/api/animes?order=ranked&limit=16", 2800),
          fastFetchJson("https://anilibria.top/api/v1/anime/schedule/now", 2800)
        ]);

        let freshAniLibria = [];
        if (alData && typeof alData === "object") {
          const list = Array.isArray(alData) ? alData : (alData.today || Object.values(alData)[0] || []);
          if (Array.isArray(list)) {
            freshAniLibria = list.slice(0, 8).map((rel) => {
              const r = rel.release || rel;
              return {
                id: r.shikimori?.id || r.id,
                name: r.name?.english || r.name?.main || "",
                russian: r.name?.main || "",
                score: "8.5",
                kind: "tv",
                episodes: r.episodes_total || 12,
                image: { original: r.poster?.src ? `https://anilibria.top${r.poster.src}` : "" },
              };
            });
          }
        }

        if (Array.isArray(ongoing) && ongoing.length > 0) {
          data = {
            ongoing_top: ongoing,
            popular_all_time: Array.isArray(popular) && popular.length > 0 ? popular : ongoing,
            top_rated: Array.isArray(topRated) && topRated.length > 0 ? topRated : ongoing,
            recent_anilibria: freshAniLibria,
          };
        }
      } catch (e) {
        console.warn("fetchFreshHomeData error:", e);
      }
    }

    if (data && data.ongoing_top && data.ongoing_top.length > 0) {
      const allToEnrich = [
        ...(data.ongoing_top || []),
        ...(data.popular_all_time || []),
        ...(data.top_rated || [])
      ];
      await enrichAnimeWithAniListBanners(allToEnrich);
      applyHomeData(data);
      try {
        localStorage.setItem("luma_home_cache_v4", JSON.stringify(data));
      } catch (_) {}
    }
  }

  function renderAnimeBanners(page) {
    const track = document.getElementById("animeBannersTrack");
    const dotsEl = document.getElementById("animeBannerDots");
    if (!track || !state.animeBannerList.length) return;

    const perPage = 3;
    const totalPages = Math.max(1, Math.ceil(state.animeBannerList.length / perPage));
    state.animeBannerPage = (page % totalPages + totalPages) % totalPages;

    const startIdx = state.animeBannerPage * perPage;
    const pageItems = state.animeBannerList.slice(startIdx, startIdx + perPage);

    track.style.opacity = "0.4";
    setTimeout(() => {
      track.innerHTML = pageItems
        .map((a) => {
          const title = escapeHtml(a.russian || a.name);
          const poster = escapeHtml(getPoster(a));
          const banner = escapeHtml(a.banner_url || poster);
          const score = a.score && parseFloat(a.score) > 0 ? `★ ${parseFloat(a.score).toFixed(2)}` : "";
          const year = getYear(a);
          const kind = KIND_LABELS[a.kind] || "ТВ-сериал";
          const genre = a.genres && a.genres[0] ? (a.genres[0].russian || a.genres[0].name) : "";

          return `
            <div class="anime-banner-card" data-open-anime="${a.id}" style="background-image: url('${banner}')" role="button" tabindex="0">
              <div class="anime-banner-overlay"></div>
              <div class="anime-banner-content">
                <img class="anime-banner-poster" src="${poster}" alt="${title}" loading="lazy" />
                <div class="anime-banner-info">
                  <div class="anime-banner-badges">
                    ${score ? `<span class="anime-banner-score">${score}</span>` : ""}
                    <span class="anime-banner-meta-tag">${escapeHtml(kind)} • ${year}</span>
                    ${genre ? `<span class="meta-tag-pill" style="padding:2px 7px;font-size:0.68rem;">${escapeHtml(genre)}</span>` : ""}
                  </div>
                  <h3 class="anime-banner-title" title="${title}">${title}</h3>
                  <div class="anime-banner-sub">${escapeHtml(a.name || "")}</div>
                </div>
              </div>
            </div>
          `;
        })
        .join("");
      track.style.opacity = "1";
    }, 120);

    if (dotsEl) {
      dotsEl.innerHTML = Array.from({ length: totalPages }, (_, p) => `
        <span class="banner-dot ${p === state.animeBannerPage ? "active" : ""}" data-banner-page="${p}"></span>
      `).join("");
    }
  }

  function startAnimeBannerRotation() {
    if (state.animeBannerTimer) clearInterval(state.animeBannerTimer);
    state.animeBannerTimer = setInterval(() => {
      if (state.currentView === "home" && state.animeBannerList.length > 3) {
        renderAnimeBanners(state.animeBannerPage + 1);
      }
    }, 5500);
  }

  // =========================================================================
  // Mid-Page Panoramic Rotating Anime Banner
  // =========================================================================
  function renderWideShowcaseBanner(idx) {
    const bannerEl = document.getElementById("wideShowcaseBanner");
    const dotsEl = document.getElementById("wideShowcaseDots");
    if (!bannerEl || !state.wideShowcaseList.length) return;

    state.wideShowcaseIndex = idx % state.wideShowcaseList.length;
    const pick = state.wideShowcaseList[state.wideShowcaseIndex];

    const title = escapeHtml(pick.russian || pick.name);
    const orig = escapeHtml(pick.name);
    const score = pick.score ? `★ ${parseFloat(pick.score).toFixed(2)}` : "";
    const year = getYear(pick);
    const kind = KIND_LABELS[pick.kind] || "ТВ-сериал";
    const epsBadge = formatEpisodesBadge(pick);
    const desc = escapeHtml(stripShikimoriBBCode(pick.description)).slice(0, 190);

    bannerEl.style.backgroundImage = `url('${pick.banner_url || getPoster(pick)}')`;
    bannerEl.innerHTML = `
      <div class="wide-showcase-overlay"></div>
      <div class="wide-showcase-inner">
        <div class="hero-badges">
          <span class="badge-editorial">ВЫБОР РЕДАКЦИИ</span>
          ${score ? `<span class="badge-meta">${score}</span>` : ""}
          <span class="badge-meta">${escapeHtml(kind)} • ${year}</span>
          ${epsBadge ? `<span class="badge-meta">${escapeHtml(epsBadge)}</span>` : ""}
        </div>
        <h2 style="font-family:'Unbounded',sans-serif; font-size:clamp(1.4rem, 2.3vw, 2rem); font-weight:700; margin-bottom:6px; line-height:1.2;">
          ${title}
        </h2>
        <div style="font-size:0.86rem; color:var(--text-muted); margin-bottom:12px;">${orig}</div>
        <p style="font-size:0.88rem; color:#dcd8ee; margin-bottom:20px; line-height:1.55; max-width:620px;">
          ${desc}${desc.length >= 190 ? "..." : ""}
        </p>
        <div style="display:flex; align-items:center; gap:12px;">
          <button class="btn-primary" data-open-anime="${pick.id}">
            <svg class="icon" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <span>Смотреть онлайн</span>
          </button>
          <button class="btn-secondary" data-quick-bookmark="${pick.id}">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            <span>В коллекцию</span>
          </button>
        </div>
      </div>
    `;

    if (dotsEl) {
      dotsEl.innerHTML = state.wideShowcaseList.map((_, i) => `
        <span class="banner-dot ${i === state.wideShowcaseIndex ? "active" : ""}" data-showcase-dot="${i}"></span>
      `).join("");
    }
  }

  function startWideShowcaseRotation() {
    if (state.wideShowcaseTimer) clearInterval(state.wideShowcaseTimer);
    state.wideShowcaseTimer = setInterval(() => {
      if (state.currentView === "home" && state.wideShowcaseList.length > 1) {
        renderWideShowcaseBanner((state.wideShowcaseIndex + 1) % state.wideShowcaseList.length);
      }
    }, 6000);
  }

  function renderHeroSpotlight(idx) {
    if (!state.heroItems.length) return;
    state.heroIndex = idx % state.heroItems.length;
    const item = state.heroItems[state.heroIndex];

    const backdrop = document.getElementById("heroBackdrop");
    const content = document.getElementById("heroContent");
    const thumbs = document.getElementById("heroThumbnails");

    if (backdrop) {
      backdrop.style.backgroundImage = `url('${item.banner_url || getPoster(item)}')`;
    }

    const title = escapeHtml(item.russian || item.name);
    const orig = escapeHtml(item.name);
    const score = item.score ? `★ ${parseFloat(item.score).toFixed(2)}` : "Премьера";
    const year = getYear(item);
    const kind = KIND_LABELS[item.kind] || "ТВ-сериал";
    const epsBadge = formatEpisodesBadge(item);

    if (content) {
      content.innerHTML = `
        <div class="hero-badges">
          <span class="badge-editorial">LUMAANIME ПРЕМЬЕРА</span>
          <span class="badge-meta">${score}</span>
          <span class="badge-meta">${escapeHtml(kind)} • ${year}</span>
          ${epsBadge ? `<span class="badge-meta">${escapeHtml(epsBadge)}</span>` : ""}
        </div>
        <h1 class="hero-title">${title}</h1>
        <div class="hero-orig-title">${orig}</div>
        <div class="hero-actions">
          <button class="btn-primary" data-open-anime="${item.id}">
            <svg class="icon" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <span>Смотреть все серии</span>
          </button>
          <button class="btn-secondary" data-quick-bookmark="${item.id}">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            <span>${state.library[item.id] ? "В вашей коллекции" : "В коллекцию"}</span>
          </button>
        </div>
      `;
    }

    if (thumbs) {
      thumbs.innerHTML = state.heroItems
        .map(
          (h, i) => `
          <button class="hero-thumb-btn ${i === state.heroIndex ? "active" : ""}" data-hero-idx="${i}" title="${escapeHtml(h.russian || h.name)}">
            <img src="${escapeHtml(getPoster(h))}" alt="" />
          </button>
        `
        )
        .join("");
    }
  }

  function startHeroRotation() {
    if (state.heroTimer) clearInterval(state.heroTimer);
    state.heroTimer = setInterval(() => {
      if (state.currentView === "home" && state.heroItems.length > 1) {
        renderHeroSpotlight((state.heroIndex + 1) % state.heroItems.length);
      }
    }, 8000);
  }

  function renderHomeGenreRail() {
    const rail = document.getElementById("homeGenreCardsRail");
    if (!rail) return;
    rail.innerHTML = GENRES_CONFIG.slice(0, 12)
      .map(
        (g) => `
        <button class="genre-vector-card" data-quick-genre="${g.id}">
          <div class="genre-icon-box">${g.svg}</div>
          <div>
            <span class="genre-card-name">${escapeHtml(g.name)}</span>
            <span class="genre-card-sub">${escapeHtml(g.sub)}</span>
          </div>
        </button>
      `
      )
      .join("");
  }

  function renderHomeQuickGenreTabs() {
    const bar = document.getElementById("homeQuickGenreTabs");
    if (!bar) return;
    const featuredGenres = GENRES_CONFIG.slice(0, 8);
    bar.innerHTML = featuredGenres
      .map(
        (g, idx) => `
        <button class="genre-pill ${idx === 0 ? "active" : ""}" data-home-genre-tab="${g.id}">
          ${escapeHtml(g.name)}
        </button>
      `
      )
      .join("");
  }

  async function loadHomeGenreShowcase(genreId) {
    const grid = document.getElementById("homeGenreRecGrid");
    renderSkeletonGrid(grid, 6);
    let items = null;
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (isLocal) {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 3500);
        const res = await fetch(`/api/recommendations?genre=${encodeURIComponent(genreId)}&order=ranked&limit=12`, { signal: ctrl.signal });
        clearTimeout(tid);
        if (res.ok) {
          const data = await res.json();
          items = data.items;
        }
      } catch (_) {}
    }
    if (!items || !items.length) {
      try {
        const res = await fetch(`https://shikimori.io/api/animes?genre=${encodeURIComponent(genreId)}&order=ranked&limit=12`)
          .catch(() => fetch(`https://shikimori.io/api/animes?genre=${encodeURIComponent(genreId)}&order=ranked&limit=12`));
        if (res && res.ok) items = await res.json();
      } catch (_) {}
    }
    renderAnimeGrid(grid, (items || []).slice(0, 12));
  }

  function renderFreshDubGrid(items) {
    const grid = document.getElementById("homeFreshDubGrid");
    if (!grid) return;
    if (!items.length) {
      grid.innerHTML = `<div style="color:var(--text-secondary)">Загрузка свежих релизов...</div>`;
      return;
    }
    grid.innerHTML = items
      .slice(0, 8)
      .map((item) => {
        const title = escapeHtml(item.russian || item.name);
        const genres = (item.genres || []).slice(0, 3).join(" • ");
        const eps = item.episodes_total ? `${item.episodes_total} эп.` : "Онгоинг";
        return `
          <div class="fresh-dub-card" data-fresh-shiki="${item.shikimori_id || ""}" data-fresh-title="${title}">
            <img class="fresh-dub-poster" src="${escapeHtml(item.poster_url)}" alt="${title}" loading="lazy" />
            <div class="fresh-dub-info">
              <div>
                <div class="fresh-dub-title">${title}</div>
                <div class="fresh-dub-genres">${escapeHtml(genres)}</div>
              </div>
              <div class="fresh-dub-footer">
                <span class="meta-tag-pill">FHD 1080p • Live</span>
                <span style="font-size:0.78rem; color:var(--text-secondary)">${escapeHtml(item.type)} • ${eps}</span>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderContinueWatching() {
    const sec = document.getElementById("continueWatchingSection");
    const grid = document.getElementById("continueWatchingGrid");
    if (!sec || !grid) return;

    if (!state.watchHistory.length) {
      sec.classList.add("hidden");
      return;
    }
    sec.classList.remove("hidden");
    grid.innerHTML = state.watchHistory
      .slice(0, 4)
      .map(
        (h) => `
        <div class="continue-card" data-open-anime="${h.id}">
          <img src="${escapeHtml(h.poster)}" alt="" style="width:52px;height:72px;border-radius:6px;object-fit:cover;flex-shrink:0;" />
          <div style="min-width:0;flex:1;">
            <div style="font-weight:600;font-size:0.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(h.title)}</div>
            <div style="font-size:0.78rem;color:var(--accent-light);margin-top:3px;font-weight:600;">Остановились: Серия ${h.episode || 1}</div>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;">Озвучка: ${escapeHtml(h.voiceover || "Русская")}</div>
          </div>
        </div>
      `
      )
      .join("");
  }

  // =========================================================================
  // 7. Catalog & Custom Dropdown Filters
  // =========================================================================
  function initCatalogControls() {
    const mobileFilterBtn = document.getElementById("mobileFilterToggleBtn");
    const filterPanel = document.getElementById("catalogFilterPanel");
    if (mobileFilterBtn && filterPanel) {
      mobileFilterBtn.addEventListener("click", () => {
        const isOpen = filterPanel.classList.toggle("mobile-open");
        mobileFilterBtn.classList.toggle("active", isOpen);
      });
    }

    const chipsContainer = document.getElementById("catalogGenreChips");
    if (chipsContainer) {
      chipsContainer.innerHTML = GENRES_CONFIG.map(
        (g) => `
        <button class="chip-genre" data-cat-genre="${g.id}">${escapeHtml(g.name)}</button>
      `
      ).join("");
    }

    const searchInput = document.getElementById("catalogSearchInput");
    let debounceTimer = null;
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          state.catalog.search = searchInput.value.trim();
          state.catalog.page = 1;
          loadCatalogResults();
        }, 380);
      });
    }

    const selectIds = [
      "catalogSortSelect",
      "catalogKindSelect",
      "catalogStatusSelect",
      "catalogSeasonSelect",
      "catalogScoreSelect",
    ];
    selectIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        upgradeSelectToLumaDropdown(el);
        el.addEventListener("change", () => {
          state.catalog.order = document.getElementById("catalogSortSelect").value;
          state.catalog.kind = document.getElementById("catalogKindSelect").value;
          state.catalog.status = document.getElementById("catalogStatusSelect").value;
          state.catalog.season = document.getElementById("catalogSeasonSelect").value;
          state.catalog.score = document.getElementById("catalogScoreSelect").value;
          state.catalog.page = 1;
          loadCatalogResults();
        });
      }
    });

    const resetBtn = document.getElementById("catalogResetBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        state.catalog = {
          page: 1,
          search: "",
          order: "popularity",
          kind: "",
          status: "",
          season: "",
          score: "",
          selectedGenres: new Set(),
        };
        document.getElementById("catalogSearchInput").value = "";
        selectIds.forEach((id) => {
          const s = document.getElementById(id);
          if (s) {
            s.selectedIndex = 0;
            if (s._refreshLumaDropdown) s._refreshLumaDropdown();
          }
        });
        syncCatalogGenreChips();
        loadCatalogResults();
      });
    }

    const prevBtns = [document.getElementById("catalogPrevPageBtn"), document.getElementById("catalogPrevPageTop")];
    const nextBtns = [document.getElementById("catalogNextPageBtn"), document.getElementById("catalogNextPageTop")];

    prevBtns.forEach((b) =>
      b?.addEventListener("click", () => {
        if (state.catalog.page > 1) {
          state.catalog.page--;
          loadCatalogResults();
          window.scrollTo({ top: 180, behavior: "smooth" });
        }
      })
    );
    nextBtns.forEach((b) =>
      b?.addEventListener("click", () => {
        state.catalog.page++;
        loadCatalogResults();
        window.scrollTo({ top: 180, behavior: "smooth" });
      })
    );
  }

  function syncCatalogGenreChips() {
    document.querySelectorAll("[data-cat-genre]").forEach((btn) => {
      btn.classList.toggle("selected", state.catalog.selectedGenres.has(btn.dataset.catGenre));
    });
  }

  function rerankSearchResultsClient(items, query) {
    if (!items || !query) return items;
    const qNorm = (query || "").toLowerCase().replace(/[^\w\sа-яА-ЯёЁ]/g, " ").replace(/\s+/g, " ").trim();

    const rankScore = (item) => {
      const nameEn = item.name || "";
      const nameRu = item.russian || "";
      const enNorm = nameEn.toLowerCase().replace(/[^\w\sа-яА-ЯёЁ]/g, " ").replace(/\s+/g, " ").trim();
      const ruNorm = nameRu.toLowerCase().replace(/[^\w\sа-яА-ЯёЁ]/g, " ").replace(/\s+/g, " ").trim();
      const kind = (item.kind || "").toLowerCase();
      const score = parseFloat(item.score || 0);
      const eps = parseInt(item.episodes || 0);

      let pts = 0;
      if (kind === "tv") pts += 240;
      else if (kind === "movie") pts += 60;
      else if (kind.includes("special")) pts += 15;
      else if (kind === "music") pts -= 500;

      pts += score * 22;
      if (eps > 1) pts += Math.min(eps, 50) * 2;

      if (ruNorm === qNorm || enNorm === qNorm) pts += 450;
      else if (ruNorm.startsWith(qNorm) || enNorm.startsWith(qNorm)) pts += 180;
      else if (ruNorm.includes(qNorm) || enNorm.includes(qNorm)) pts += 100;

      const spinOffs = ["special", "спешл", "movie", "фильм", "ova", "recap", "рекап", "part 2", "snickers", "chibi", "тиби"];
      for (const m of spinOffs) {
        if (nameEn.toLowerCase().includes(m) || nameRu.toLowerCase().includes(m)) pts -= 90;
      }

      const seasons = ["season 2", "2 сезон", "season 3", "3 сезон", "season 4", "4 сезон", "2nd season", "3rd season", "финал", "final"];
      for (const m of seasons) {
        if (nameEn.toLowerCase().includes(m) || nameRu.toLowerCase().includes(m)) pts -= 60;
      }

      pts += Math.max(0, 40 - (nameRu.length || 0));
      return pts;
    };

    return [...items].sort((a, b) => rankScore(b) - rankScore(a));
  }

  async function loadCatalogResults() {
    const grid = document.getElementById("catalogResultsGrid");
    renderSkeletonGrid(grid, 18);

    const params = new URLSearchParams({
      page: String(state.catalog.page),
      limit: "24",
      order: state.catalog.order,
    });
    if (state.catalog.search) params.set("search", state.catalog.search);
    if (state.catalog.kind) params.set("kind", state.catalog.kind);
    if (state.catalog.status) params.set("status", state.catalog.status);
    if (state.catalog.season) params.set("season", state.catalog.season);
    if (state.catalog.score) params.set("score", state.catalog.score);
    if (state.catalog.selectedGenres.size > 0) {
      params.set("genre", Array.from(state.catalog.selectedGenres).join(","));
    }

    const pageText = `Страница ${state.catalog.page}`;
    document.getElementById("catalogPageIndicator").textContent = pageText;
    document.getElementById("catalogPageIndicatorBottom").textContent = pageText;
    document.getElementById("catalogPrevPageBtn").disabled = state.catalog.page <= 1;
    document.getElementById("catalogPrevPageTop").disabled = state.catalog.page <= 1;

    const cacheKey = params.toString();
    if (state.catalogCache && state.catalogCache[cacheKey]) {
      renderAnimeGrid(grid, state.catalogCache[cacheKey]);
      const hasMore = state.catalogCache[cacheKey].length >= 24;
      document.getElementById("catalogNextPageBtn").disabled = !hasMore;
      document.getElementById("catalogNextPageTop").disabled = !hasMore;
      return;
    }

    let items = null;
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (isLocal && !IS_STATIC_HOST) {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 2000);
        const res = await fetch(`/api/catalog?${params.toString()}`, { signal: ctrl.signal });
        clearTimeout(tid);
        if (res.ok) {
          const data = await res.json();
          items = data.items || [];
        }
      } catch (_) {}
    }

    if (!items) {
      let targetUrl = `https://shikimori.io/api/animes?censored=true&page=${state.catalog.page}&limit=${state.catalog.search ? 30 : 24}`;
      if (state.catalog.search) targetUrl += `&search=${encodeURIComponent(state.catalog.search)}`;
      if (state.catalog.order && !state.catalog.search) targetUrl += `&order=${state.catalog.order}`;
      if (state.catalog.kind) targetUrl += `&kind=${state.catalog.kind}`;
      if (state.catalog.status) targetUrl += `&status=${state.catalog.status}`;
      if (state.catalog.selectedGenres.size > 0) targetUrl += `&genre=${Array.from(state.catalog.selectedGenres).join(",")}`;

      items = await fastFetchJson(targetUrl, 2600);
      if (Array.isArray(items) && state.catalog.search) {
        items = rerankSearchResultsClient(items, state.catalog.search).slice(0, 24);
      }
    }

    items = items || [];
    state.catalogCache = state.catalogCache || {};
    state.catalogCache[cacheKey] = items;
    renderAnimeGrid(grid, items);

    const hasMore = items.length >= 24;
    document.getElementById("catalogNextPageBtn").disabled = !hasMore;
    document.getElementById("catalogNextPageTop").disabled = !hasMore;
  }

  // =========================================================================
  // 8. Recommendations Hub
  // =========================================================================
  let recommendationsInitialized = false;

  function initRecommendationsView() {
    loadPersonalRecommendations();

    if (recommendationsInitialized) return;
    recommendationsInitialized = true;

    const moodGrid = document.getElementById("moodSelectorGrid");
    if (moodGrid) {
      moodGrid.innerHTML = MOOD_CAPSULES.map(
        (m, idx) => `
        <button class="mood-card ${idx === 0 ? "active" : ""}" data-mood-id="${m.id}">
          <div class="mood-card-title">${escapeHtml(m.title)}</div>
          <div class="mood-card-desc">${escapeHtml(m.desc)}</div>
        </button>
      `
      ).join("");
      loadMoodRecommendations(MOOD_CAPSULES[0]);
    }

    const recTabs = document.getElementById("recFullGenreTabs");
    if (recTabs) {
      recTabs.innerHTML = GENRES_CONFIG.map(
        (g, idx) => `
        <button class="genre-pill ${idx === 0 ? "active" : ""}" data-rec-genre-tab="${g.id}">
          ${escapeHtml(g.name)}
        </button>
      `
      ).join("");
      loadRecGenreExplorer(GENRES_CONFIG[0].id);
    }
  }

  async function loadPersonalRecommendations() {
    const grid = document.getElementById("personalRecGrid");
    const tagsEl = document.getElementById("personalRecTags");
    const titleEl = document.getElementById("personalRecTitle");
    renderSkeletonGrid(grid, 6);

    const genreCounts = {};
    Object.values(state.library).forEach((entry) => {
      (entry.genres || []).forEach((g) => {
        if (g.id) {
          genreCounts[g.id] = {
            id: g.id,
            name: g.russian || g.name,
            count: (genreCounts[g.id]?.count || 0) + 1,
          };
        }
      });
    });

    const sortedFavGenres = Object.values(genreCounts).sort((a, b) => b.count - a.count);
    let targetGenreIds = "1,40";
    if (sortedFavGenres.length > 0) {
      const topTwo = sortedFavGenres.slice(0, 2);
      targetGenreIds = topTwo.map((g) => g.id).join(",");
      titleEl.textContent = "Персональная подборка LumaAnime по вашей коллекции";
      tagsEl.innerHTML = topTwo
        .map((g) => `<span class="meta-tag-pill">Любимый жанр: ${escapeHtml(g.name)}</span>`)
        .join("");
    } else {
      titleEl.textContent = "Рекомендовано для старта (Топ зрительских симпатий)";
      tagsEl.innerHTML = `<span class="meta-tag-pill">Добавляйте аниме в коллекцию для калибровки</span>`;
    }

    try {
      const res = await fetch(`/api/recommendations?genre=${encodeURIComponent(targetGenreIds)}&order=ranked&limit=12`);
      const data = await res.json();
      renderAnimeGrid(grid, (data.items || []).slice(0, 12));
    } catch (_) {}
  }

  async function loadMoodRecommendations(moodObj) {
    const grid = document.getElementById("moodRecResultsGrid");
    renderSkeletonGrid(grid, 6);
    const params = new URLSearchParams({ ...moodObj.params, limit: "12" });
    try {
      const res = await fetch(`/api/recommendations?${params.toString()}`);
      const data = await res.json();
      renderAnimeGrid(grid, (data.items || []).slice(0, 12));
    } catch (_) {}
  }

  async function loadRecGenreExplorer(genreId) {
    const grid = document.getElementById("recGenreExplorerGrid");
    renderSkeletonGrid(grid, 12);
    try {
      const res = await fetch(`/api/recommendations?genre=${encodeURIComponent(genreId)}&order=popularity&limit=12`);
      const data = await res.json();
      renderAnimeGrid(grid, (data.items || []).slice(0, 12));
    } catch (_) {}
  }

  // =========================================================================
  // 9. Schedule & Library Views
  // =========================================================================
  async function initScheduleView() {
    const container = document.getElementById("scheduleListContainer");
    if (!container) return;

    let calendarItems = state.homeData?.calendar || [];
    if (!calendarItems.length) {
      container.innerHTML = `<div style="color:var(--text-secondary)">Загрузка календаря релизов...</div>`;
      try {
        const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        if (isLocal) {
          const res = await fetch("/api/home");
          if (res.ok) {
            const data = await res.json();
            calendarItems = data.calendar || [];
          }
        }
      } catch (_) {}
      if (!calendarItems.length) {
        try {
          const cRes = await fetch("https://shikimori.io/api/calendar").catch(() => fetch("https://shikimori.io/api/calendar"));
          if (cRes && cRes.ok) {
            calendarItems = await cRes.json();
          }
        } catch (_) {}
      }
    }

    renderScheduleItems(calendarItems);
  }

  function renderScheduleItems(calendarItems) {
    const container = document.getElementById("scheduleListContainer");
    if (!container) return;

    if (!calendarItems.length) {
      container.innerHTML = `<div style="color:var(--text-secondary)">Нет данных о ближайших сериях.</div>`;
      return;
    }

    container.innerHTML = calendarItems
      .filter((entry) => entry.anime)
      .map((entry) => {
        const a = entry.anime;
        const title = escapeHtml(a.russian || a.name);
        const poster = escapeHtml(getPoster(a));
        const nextEp = entry.next_episode;
        let dateFormatted = "";
        if (entry.next_episode_at) {
          try {
            const d = new Date(entry.next_episode_at);
            dateFormatted = d.toLocaleDateString("ru-RU", {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });
          } catch (_) {}
        }

        return `
          <div class="schedule-item-card" data-open-anime="${a.id}">
            <img class="schedule-poster" src="${poster}" alt="${title}" loading="lazy" />
            <div style="flex:1; min-width:0;">
              <div style="font-weight:600; font-size:0.94rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${title}</div>
              <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:4px;">Выходит <strong>${nextEp}-я серия</strong></div>
              <div style="margin-top:8px; display:flex; align-items:center; gap:8px;">
                <span class="meta-tag-pill">${escapeHtml(dateFormatted || "Скоро")}</span>
                ${a.score && parseFloat(a.score) > 0 ? `<span style="font-size:0.78rem; color:var(--gold-rating)">★ ${a.score}</span>` : ""}
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderLibraryView(activeTab = "all") {
    const statsRow = document.getElementById("libraryStatsRow");
    const grid = document.getElementById("libraryItemsGrid");
    const entries = Object.values(state.library);

    const counts = {
      all: entries.length,
      watching: entries.filter((e) => e.status === "watching").length,
      planned: entries.filter((e) => e.status === "planned").length,
      completed: entries.filter((e) => e.status === "completed").length,
      favorite: entries.filter((e) => e.status === "favorite").length,
      dropped: entries.filter((e) => e.status === "dropped").length,
    };

    if (statsRow) {
      statsRow.innerHTML = `
        <div class="stat-box"><div class="stat-num">${counts.all}</div><div class="stat-label">Всего в коллекции</div></div>
        <div class="stat-box"><div class="stat-num">${counts.watching}</div><div class="stat-label">Смотрю сейчас</div></div>
        <div class="stat-box"><div class="stat-num">${counts.planned}</div><div class="stat-label">В планах</div></div>
        <div class="stat-box"><div class="stat-num">${counts.completed}</div><div class="stat-label">Просмотрено</div></div>
        <div class="stat-box"><div class="stat-num">${counts.favorite}</div><div class="stat-label">Любимые тайтлы</div></div>
      `;
    }

    document.querySelectorAll("[data-lib-tab]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.libTab === activeTab);
    });

    const filtered = activeTab === "all" ? entries : entries.filter((e) => e.status === activeTab);
    renderAnimeGrid(
      grid,
      filtered,
      "В этом списке пока пусто. Откройте любое аниме и добавьте его в свою коллекцию LumaAnime."
    );
  }

  // =========================================================================
  // 10. Anime Detail Page & LumaPlayer (Full Uncut Episodes + Live Sync + Working Voiceover Switcher)
  // =========================================================================

  async function fetchAniListBanner(animeId) {
    try {
      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `query ($id: Int) { Media(idMal: $id, type: ANIME) { bannerImage } }`,
          variables: { id: Number(animeId) }
        })
      });
      if (res.ok) {
        const json = await res.json();
        return json?.data?.Media?.bannerImage || null;
      }
    } catch (_) {}
    return null;
  }

  async function fetchAniLibriaReleases(qName, animeId) {
    try {
      const alSearch = await fastFetchJson(`https://anilibria.top/api/v1/app/search/releases?query=${encodeURIComponent(qName)}`, 1600);
      if (!Array.isArray(alSearch) || !alSearch.length) return null;
      const cleanQ = (qName || "").toLowerCase().replace(/[^a-zа-я0-9]/g, "");
      const match = alSearch.find((x) => {
        if (String(x.shikimori?.id) === String(animeId) || String(x.mal?.id) === String(animeId)) return true;
        const ru = (x.name?.main || x.names?.ru || "").toLowerCase().replace(/[^a-zа-я0-9]/g, "");
        return ru.length > 2 && (ru === cleanQ || cleanQ.includes(ru) || ru.includes(cleanQ));
      });
      if (!match || !match.id) return null;
      const rel = await fastFetchJson(`https://anilibria.top/api/v1/anime/releases/${match.id}`, 1600);
      if (!rel || !Array.isArray(rel.episodes)) return null;
      return {
        release_id: match.id,
        episodes: rel.episodes.map(ep => ({
          ordinal: ep.ordinal,
          name: ep.name || `Серия ${ep.ordinal}`,
          duration: ep.duration,
          hls_1080: ep.hls_1080,
          hls_720: ep.hls_720,
          hls_480: ep.hls_480,
          opening: ep.opening,
          ending: ep.ending,
          preview: ep.preview?.src ? `https://anilibria.top${ep.preview.src}` : null
        }))
      };
    } catch (_) {
      return null;
    }
  }

  async function fetchClientSideAnimeDetail(animeId) {
    try {
      // 1. Fetch main Shikimori info (fast, ~0.25s)
      const shikiResp = await fetch(`https://shikimori.io/api/animes/${animeId}`)
        .catch(() => fetch(`https://shikimori.io/api/animes/${animeId}`));
      if (!shikiResp || !shikiResp.ok) return null;
      const details = await shikiResp.json();
      if (!details || !details.id) return null;

      const qName = details.russian || details.name;
      const kodikToken = "a0457eb45312af80bbb9f3fb33de3e93";

      // 2. Fetch all secondary enrichments concurrently in parallel!
      const [bannerRes, frRes, kodikRes, alRes, relRes, simRes] = await Promise.allSettled([
        fetchAniListBanner(animeId),
        fastFetchJson(`https://shikimori.io/api/animes/${animeId}/franchise`, 1800),
        fastFetchJson(`https://kodik-api.com/search?token=${kodikToken}&shikimori_id=${animeId}&with_episodes=true`, 1800),
        fetchAniLibriaReleases(qName, animeId),
        fastFetchJson(`https://shikimori.io/api/animes/${animeId}/related`, 1800),
        fastFetchJson(`https://shikimori.io/api/animes/${animeId}/similar`, 1800),
      ]);

      if (bannerRes.status === "fulfilled" && bannerRes.value) {
        details.banner_url = bannerRes.value;
      }

      // Franchise
      let seasons = [];
      if (frRes.status === "fulfilled" && frRes.value && Array.isArray(frRes.value.nodes)) {
        const tvNodes = frRes.value.nodes.filter((n) => {
          const k = (n.kind || "").toLowerCase();
          const nm = (n.name || "").toLowerCase();
          if (["клип", "реклама", "промо", "спецвыпуск", "фильм", "movie"].some((b) => k.includes(b))) return false;
          if (["recap", "рекап", "chibi", "тиби", "чиби", "snickers"].some((b) => nm.includes(b))) return false;
          return k.includes("tv") || k.includes("сериал");
        });
        tvNodes.sort((a, b) => (a.year || 9999) - (b.year || 9999));
        if (tvNodes.length > 1) {
          seasons = tvNodes.map((node, idx) => ({
            season_number: idx + 1,
            id: node.id,
            name: node.name,
            year: node.year,
            is_current: Number(node.id) === Number(animeId)
          }));
        }
      }

      const anilibriaData = alRes.status === "fulfilled" ? alRes.value : null;

      // Episodes calculation
      const isMovie = (details.kind || "").toLowerCase() === "movie" || (details.kind || "").toLowerCase() === "фильм";
      const isAnons = (details.status || "").toLowerCase() === "anons";
      let totalEp = 1;
      if (isMovie) {
        totalEp = isAnons ? 0 : 1;
      } else if (isAnons && !details.episodes_aired) {
        totalEp = 0;
      } else if (details.episodes_aired && details.episodes_aired > 0) {
        totalEp = details.episodes_aired;
      } else if (details.episodes && details.episodes > 0) {
        totalEp = details.episodes;
      } else if (anilibriaData && anilibriaData.episodes && anilibriaData.episodes.length > 0) {
        totalEp = anilibriaData.episodes.length;
      } else {
        totalEp = 1;
      }
      totalEp = Math.min(Math.max(totalEp, 0), 3000);

      // Assemble all voiceovers with real direct links!
      const voiceovers = [];
      if (anilibriaData && anilibriaData.episodes && anilibriaData.episodes.length > 0) {
        voiceovers.push({
          id: "anilibria_hls",
          name: "AniLibria.TV (Прямой поток 1080p FHD)",
          link: null,
          type: "hls",
          ep_min: 1,
          ep_max: anilibriaData.episodes.length,
          badge: `Все ${anilibriaData.episodes.length} эп. • FHD 1080p`,
          available: true
        });
      }

      const kodikSearchData = kodikRes.status === "fulfilled" ? kodikRes.value : null;
      if (kodikSearchData && Array.isArray(kodikSearchData.results) && kodikSearchData.results.length > 0) {
        const seenTitles = new Set();
        kodikSearchData.results.forEach((r) => {
          const t = r.translation || {};
          const title = (t.title || "").trim();
          if (!title || seenTitles.has(title.toLowerCase())) return;
          seenTitles.add(title.toLowerCase());

          // Avoid duplicating AniLibria if already present as direct HLS
          if (anilibriaData && anilibriaData.episodes && anilibriaData.episodes.length > 0 && /anilibria/i.test(title)) {
            return;
          }

          const rawLink = r.link || "";
          const cleanLink = rawLink.startsWith("//") ? `https:${rawLink}` : rawLink;
          const isSub = (t.type || "").toLowerCase().includes("sub") || /субтитр|sub/i.test(title);
          const epCount = r.episodes_count || totalEp;

          voiceovers.push({
            id: `dub_${t.id || title.toLowerCase().replace(/[^a-zа-я0-9]/g, "_")}`,
            name: title,
            link: cleanLink,
            type: isSub ? "Sub" : "Studio",
            ep_min: 1,
            ep_max: epCount,
            badge: epCount > 1 ? `1–${epCount} эп.` : "Полная озвучка",
            available: true
          });
        });
      }

      if (voiceovers.length === (anilibriaData ? 1 : 0)) {
        const shikiDubbers = details.fandubbers || [];
        shikiDubbers.forEach((sName) => {
          voiceovers.push({
            id: `dub_${sName.toLowerCase().replace(/[^a-zа-я0-9]/g, "_")}`,
            name: sName,
            link: `https://kodikplayer.com/find-player?shikimoriID=${animeId}`,
            type: "Studio",
            ep_min: 1,
            ep_max: totalEp || 1,
            badge: "Русская озвучка",
            available: true
          });
        });
      }

      if (voiceovers.length === 0) {
        voiceovers.push(
          { id: "kodik_main", name: "Русская озвучка (Kodik)", link: `https://kodikplayer.com/find-player?shikimoriID=${animeId}`, type: "Studio", ep_min: 1, ep_max: totalEp || 1, badge: "Русская озвучка", available: true },
          { id: "kodik_sub", name: "Оригинал + Русские субтитры", link: `https://kodikplayer.com/find-player?shikimoriID=${animeId}`, type: "Sub", ep_min: 1, ep_max: totalEp || 1, badge: "Субтитры", available: true }
        );
      }

      const defaultLink = voiceovers[0]?.link || `https://kodikplayer.com/find-player?shikimoriID=${animeId}`;

      const alMap = {};
      if (anilibriaData && anilibriaData.episodes) {
        anilibriaData.episodes.forEach((e) => {
          alMap[e.ordinal] = e;
        });
      }

      const fullEps = [];
      const defaultPreview = details.banner_url || getPoster(details);
      for (let i = 1; i <= totalEp; i++) {
        const alEp = alMap[i];
        fullEps.push({
          ordinal: i,
          name: (alEp && alEp.name) ? alEp.name : `Серия ${i}`,
          has_hls: Boolean(alEp && (alEp.hls_1080 || alEp.hls_720 || alEp.hls_480)),
          hls_1080: alEp?.hls_1080 || null,
          hls_720: alEp?.hls_720 || null,
          hls_480: alEp?.hls_480 || null,
          opening: alEp?.opening || null,
          ending: alEp?.ending || null,
          preview: alEp?.preview || defaultPreview,
          kodik_link: defaultLink ? (defaultLink.includes("?") ? `${defaultLink}&episode=${i}` : `${defaultLink}?episode=${i}`) : `https://kodikplayer.com/find-player?shikimoriID=${animeId}&episode=${i}`,
          duration: (alEp && alEp.duration) || 1440,
        });
      }

      // Related / Similar
      let related = [];
      if (relRes.status === "fulfilled" && Array.isArray(relRes.value)) {
        const validRelations = new Set(["sequel", "prequel", "side story", "parent story", "full story", "summary", "alternative version", "alternative setting", "spin-off"]);
        related = relRes.value.filter(r => r.anime && validRelations.has((r.relation || "").trim().toLowerCase())).slice(0, 30);
      }
      let similar = [];
      if (simRes.status === "fulfilled" && Array.isArray(simRes.value)) {
        similar = simRes.value.slice(0, 14);
      }

      return {
        anime: details,
        total_available_episodes: totalEp,
        full_episodes: fullEps,
        similar: similar,
        related: related,
        seasons: seasons,
        roles: [],
        anilibria: anilibriaData,
        voiceovers: voiceovers,
        synced_at: Math.floor(Date.now() / 1000)
      };
    } catch (e) {
      console.warn("Client fallback failed:", e);
      return null;
    }
  }

  async function openAnimeDetail(animeId, forceRefresh = false) {
    switchView("anime", false);
    history.replaceState(null, "", `#anime/${animeId}`);

    state.detailCache = state.detailCache || {};

    // Instant 0ms render if cached in memory!
    if (!forceRefresh && state.detailCache[animeId]) {
      state.currentAnimeDetail = state.detailCache[animeId];
      renderAnimeDetailPage(state.detailCache[animeId]);
      return;
    }

    const container = document.getElementById("animeDetailContainer");
    container.innerHTML = `
      <div class="container" style="padding: 80px 24px; text-align:center;">
        <div style="font-family:'Unbounded',sans-serif; font-size:1.25rem; margin-bottom:8px; color:var(--accent-light);">
          Синхронизация всех серий и звуковых дорожек в LumaAnime...
        </div>
        <div style="color:var(--text-secondary); font-size:0.9rem;">Подгружаем полную базу эпизодов без лимитов</div>
      </div>
    `;

    let data = null;
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (isLocal && !IS_STATIC_HOST) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`/api/anime/${animeId}${forceRefresh ? "?refresh=1" : ""}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          data = await res.json();
        }
      } catch (_) {}
    }

    if (!data || !data.anime) {
      try {
        data = await fetchClientSideAnimeDetail(animeId);
      } catch (err) {
        console.warn("Client side fallback error:", err);
      }
    }

    if (!data || !data.anime) {
      container.innerHTML = `
        <div class="container" style="padding:80px 24px; text-align:center;">
          <div style="font-family:'Unbounded',sans-serif; font-size:1.25rem; color:#f87171; margin-bottom:12px;">
            Не удалось загрузить аниме
          </div>
          <div style="color:var(--text-secondary); font-size:0.95rem; margin-bottom:24px; max-width:480px; margin-left:auto; margin-right:auto;">
            Сервер Shikimori временно задержал ответ. Нажмите кнопку ниже для повторной попытки.
          </div>
          <div style="display:flex; justify-content:center; gap:12px;">
            <button type="button" class="btn btn-primary" id="retryAnimeLoadBtn">
              Повторить попытку ↺
            </button>
            <button type="button" class="btn btn-secondary" onclick="switchView('catalog')">
              Вернуться в каталог
            </button>
          </div>
        </div>
      `;
      document.getElementById("retryAnimeLoadBtn")?.addEventListener("click", () => {
        openAnimeDetail(animeId, true);
      });
      return;
    }

    try {
      state.detailCache[animeId] = data;
      state.currentAnimeDetail = data;
      renderAnimeDetailPage(data);
    } catch (renderErr) {
      console.error("Critical error in renderAnimeDetailPage:", renderErr);
    }
  }

  function renderAnimeDetailPage(data) {
    if (!data || !data.anime) return;
    const detail = data; // Ensures detail.seasons and all detail.* properties resolve cleanly
    const a = data.anime;
    const fullEpisodes = data.full_episodes || [];
    const totalAvailable = data.total_available_episodes || fullEpisodes.length || 1;
    const voiceovers = data.voiceovers || [];
    const similar = data.similar || [];
    const related = data.related || [];
    const roles = data.roles || [];

    const titleRu = escapeHtml(a.russian || a.name);
    const titleOrig = escapeHtml(a.name);
    const poster = escapeHtml(getPoster(a));
    const banner = escapeHtml(a.banner_url || poster);
    const score = a.score && parseFloat(a.score) > 0 ? `★ ${parseFloat(a.score).toFixed(2)}` : "Без оценки";
    const kind = KIND_LABELS[a.kind] || "ТВ-сериал";
    const status = STATUS_LABELS[a.status] || a.status;
    const year = getYear(a);
    const studios = (a.studios || []).map((s) => s.name).join(", ") || "Неизвестно";
    const duration = a.duration ? `${a.duration} мин.` : "24 мин.";
    const description = escapeHtml(stripShikimoriBBCode(a.description));
    const currentLibStatus = state.library[a.id]?.status || "";

    const hasAnyHls = fullEpisodes.some((ep) => ep.has_hls);
    const firstVo = voiceovers[0] || { id: "default", name: "Русская озвучка", badge: "Все серии" };

    state.currentPlayerState = {
      mode: hasAnyHls ? "hls" : "balancer",
      voiceoverId: firstVo.id,
      voiceoverName: firstVo.name,
      voiceoverBadge: firstVo.badge,
      episodeOrdinal: 1,
      quality: "1080",
      playbackRate: 1,
      savedCurrentTime: 0,
      epRangeIndex: 0,
      epSearchQuery: "",
    };

    // Real-Time Airing Countdown Banner
    let liveBannerHtml = "";
    const nextEpisodeDate = a.next_episode_at
      ? new Date(a.next_episode_at)
      : a.next_airing?.airingAt
      ? new Date(a.next_airing.airingAt * 1000)
      : null;
    const nextEpisodeNum = (a.episodes_aired || totalAvailable || 0) + 1;

    if (nextEpisodeDate && !isNaN(nextEpisodeDate.getTime())) {
      const diffMs = nextEpisodeDate.getTime() - Date.now();
      if (diffMs > 0) {
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const timeStr = `${days > 0 ? `${days} дн. ` : ""}${hours} ч. ${minutes} мин.`;
        const dateStr = nextEpisodeDate.toLocaleString("ru-RU", {
          day: "numeric",
          month: "long",
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
        });

        liveBannerHtml = `
          <div class="live-airing-banner">
            <div style="display:flex; align-items:center; gap:10px;">
              <span class="live-dot"></span>
              <span><strong>LIVE ОНГОИНГ:</strong> В эфире <strong>${a.episodes_aired || totalAvailable} серий</strong>. Выход <strong>${nextEpisodeNum}-й серии</strong>: ${escapeHtml(dateStr)} (через ~${timeStr})</span>
            </div>
            <button class="btn-secondary btn-sm" id="detailForceRefreshBtn">Синхронизировать ↻</button>
          </div>
        `;
      }
    }

    // Build chunked range tabs (1-100, 101-200, ... up to 1180+)
    const chunkSize = 100;
    const totalChunks = Math.ceil(fullEpisodes.length / chunkSize);
    let rangeTabsHtml = "";
    if (totalChunks > 1) {
      rangeTabsHtml = `<div class="ep-range-tabs" id="epRangeTabs">` +
        Array.from({ length: totalChunks }, (_, cIdx) => {
          const startNum = cIdx * chunkSize + 1;
          const endNum = Math.min((cIdx + 1) * chunkSize, fullEpisodes.length);
          return `<button type="button" class="ep-range-btn ${cIdx === 0 ? "active" : ""}" data-ep-chunk="${cIdx}">${startNum}–${endNum}</button>`;
        }).join("") +
        `</div>`;
    }

    const container = document.getElementById("animeDetailContainer");
    container.innerHTML = `
      <div class="detail-banner-wrap">
        <img class="detail-banner-img" src="${banner}" alt="" />
        <div class="detail-banner-gradient"></div>
      </div>

      <div class="container detail-main-wrap">
        <div class="detail-top-grid">
          <!-- Left Column: Poster & Watchlist Custom Dropdown -->
          <div class="detail-poster-col">
            <img class="detail-poster-img" src="${poster}" alt="${titleRu}" />
            <div class="watchlist-controls">
              <select id="detailWatchlistSelect" data-anime-id="${a.id}">
                <option value="" ${currentLibStatus === "" ? "selected" : ""}>+ Добавить в коллекцию</option>
                <option value="watching" ${currentLibStatus === "watching" ? "selected" : ""}>Смотрю сейчас</option>
                <option value="planned" ${currentLibStatus === "planned" ? "selected" : ""}>В планах</option>
                <option value="completed" ${currentLibStatus === "completed" ? "selected" : ""}>Просмотрено</option>
                <option value="favorite" ${currentLibStatus === "favorite" ? "selected" : ""}>★ В любимое</option>
                <option value="dropped" ${currentLibStatus === "dropped" ? "selected" : ""}>Брошено</option>
                ${currentLibStatus ? `<option value="remove">Удалить из коллекции</option>` : ""}
              </select>
              <a href="#cinemaPlayerBox" class="btn-primary" style="justify-content:center;">
                <svg class="icon" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                <span>К плееру (${totalAvailable} эп.)</span>
              </a>
            </div>
          </div>

          <!-- Right Column: Metadata & Synopsis -->
          <div class="detail-info-col">
            <div class="detail-breadcrumbs">
              <button class="btn-text" data-nav="catalog">← Вернуться в каталог</button>
              <span class="meta-tag-pill">ID Shikimori: ${a.id} • Все вышедшие эпизоды</span>
            </div>
            <h1 class="detail-title-ru">${titleRu}</h1>
            <div class="detail-title-orig">${titleOrig} ${a.japanese?.[0] ? `• ${escapeHtml(a.japanese[0])}` : ""}</div>

            ${liveBannerHtml}

            <div class="detail-genres-row">
              ${(a.genres || [])
                .map(
                  (g) => `
                <button class="genre-pill" data-quick-genre="${g.id}">${escapeHtml(g.russian || g.name)}</button>
              `
                )
                .join("")}
            </div>

            <div class="detail-specs-grid">
              <div class="spec-item">
                <span class="spec-label">Рейтинг зрителей</span>
                <span class="spec-value" style="color:var(--gold-rating)">${score}</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">Формат</span>
                <span class="spec-value">${escapeHtml(kind)}</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">Статус</span>
                <span class="spec-value">${escapeHtml(status)}</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">Всего серий в базе</span>
                <span class="spec-value">${totalAvailable} эп. (${escapeHtml(duration)})</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">Год премьеры</span>
                <span class="spec-value">${year || "Анонс"}</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">Студия</span>
                <span class="spec-value">${escapeHtml(studios)}</span>
              </div>
            </div>

            <div class="detail-description">${description}</div>
          </div>
        </div>

        <!-- ==================== LUMAANIME CUSTOM CINEMA PLAYER ==================== -->
        <div class="cinema-section" id="cinemaPlayerBox">
          ${
            (detail.seasons || []).length > 1
              ? `
            <div class="cinema-seasons-row">
              <span class="seasons-label">Сезоны:</span>
              <div class="seasons-pills-list">
                ${(detail.seasons || [])
                  .map(
                    (s) => `
                  <button type="button" class="season-pill-btn ${s.is_current ? "active" : ""}" data-season-id="${s.id}" title="${escapeHtml(s.name)} (${s.year || ""})">
                    ${s.season_number} сезон
                  </button>
                `
                  )
                  .join("")}
              </div>
            </div>
          `
              : ""
          }
          <div class="cinema-toolbar">
            <div class="cinema-toolbar-left">
              <div class="cinema-toolbar-title-wrap">
                <button type="button" class="btn-text btn-sm" data-nav="catalog" style="padding:0; margin-right:4px;">←</button>
                <span class="cinema-title-badge">${titleRu}</span>
                <span class="cinema-ep-indicator">• Серия <strong id="cinemaCurrentEpNum">1</strong> из ${totalAvailable}</span>
              </div>
              ${
                (a.videos_clean || []).length > 0
                  ? `<button type="button" class="btn-text btn-sm" id="cinemaTrailerToggleBtn" style="color:var(--text-secondary); font-size:0.78rem;">
                      Трейлер
                    </button>`
                  : ""
              }
            </div>

            <div class="cinema-toolbar-right">
              <div class="voiceover-selector-wrap">
                <span class="vo-label">Озвучка:</span>
                <select id="voiceoverSelect">
                  ${voiceovers
                    .map(
                      (v) => `
                    <option value="${escapeHtml(v.id)}" data-id="${escapeHtml(v.id)}" data-name="${escapeHtml(v.name)}" data-link="${escapeHtml(v.link || "")}" data-short-label="${escapeHtml(v.name)}" data-badge="${escapeHtml(v.badge)}">
                      ${escapeHtml(v.name)}
                    </option>
                  `
                    )
                    .join("")}
                </select>
              </div>

              <div class="voiceover-selector-wrap" id="qualitySelectWrap">
                <span class="vo-label">Качество:</span>
                <select id="qualitySelect">
                  <option value="1080" data-short-label="1080p Full HD" data-badge="FHD">1080p Full HD</option>
                  <option value="720" data-short-label="720p HD" data-badge="HD">720p HD</option>
                  <option value="480" data-short-label="480p SD" data-badge="SD">480p SD</option>
                </select>
              </div>
            </div>
          </div>

          <div class="cinema-stage-grid" id="cinemaStageGrid">
            <div class="video-viewport paused" id="videoViewport"></div>

            <aside class="episodes-sidebar" id="episodesSidebar">
              <div class="episodes-sidebar-head">
                <div class="episodes-head-top">
                  <span class="episodes-sidebar-title">Список серий</span>
                  <span class="meta-tag-pill">${totalAvailable} эп.</span>
                </div>
                <input
                  type="text"
                  id="epQuickSearchInput"
                  class="ep-search-input"
                  placeholder="Быстрый переход к серии (например: 1180)..."
                />
                ${rangeTabsHtml}
              </div>
              <div class="episodes-scroll-list" id="episodesScrollList"></div>
            </aside>
          </div>

          <div class="cinema-footer-bar">
            <span id="cinemaStatusText">Готово к воспроизведению в LumaPlayer</span>
          </div>
        </div>

        <!-- ==================== RELATED FRANCHISE / SEASONS ==================== -->
        ${
          related.length > 0
            ? `
          <div class="content-block" style="margin-top:48px;">
            <div class="section-header">
              <div>
                <span class="section-eyebrow">ХРОНОЛОГИЯ И ФРАНШИЗА</span>
                <h2 class="section-title">Все сезоны, фильмы и спешлы</h2>
              </div>
            </div>
            <div class="anime-grid">
              ${related
                .map((r) => {
                  const relAnime = r.anime;
                  if (!relAnime) return "";
                  return createAnimeCardHtml(relAnime);
                })
                .join("")}
            </div>
          </div>
        `
            : ""
        }

        <!-- ==================== CHARACTERS ==================== -->
        ${
          roles.length > 0
            ? `
          <div class="content-block" style="margin-top:48px;">
            <div class="section-header">
              <div>
                <span class="section-eyebrow">ДЕЙСТВУЮЩИЕ ЛИЦА</span>
                <h2 class="section-title">Главные персонажи</h2>
              </div>
            </div>
            <div class="characters-rail">
              ${roles
                .slice(0, 12)
                .map((r) => {
                  const ch = r.character || {};
                  const roleRu = (r.roles || []).includes("Main") ? "Главный герой" : "Второстепенный";
                  return `
                    <div class="char-card">
                      <img class="char-avatar" src="${escapeHtml(ch.avatar_url || poster)}" alt="${escapeHtml(ch.russian || ch.name)}" loading="lazy" />
                      <div>
                        <div class="char-name">${escapeHtml(ch.russian || ch.name)}</div>
                        <div class="char-role">${roleRu}</div>
                      </div>
                    </div>
                  `;
                })
                .join("")}
            </div>
          </div>
        `
            : ""
        }

        <!-- ==================== SCREENSHOTS ==================== -->
        ${
          (a.screenshots_clean || []).length > 0
            ? `
          <div class="content-block" style="margin-top:48px;">
            <div class="section-header">
              <div>
                <span class="section-eyebrow">КАДРЫ ИЗ АНИМЕ</span>
                <h2 class="section-title">Визуальный ряд</h2>
              </div>
            </div>
            <div class="screenshots-grid">
              ${a.screenshots_clean
                .slice(0, 8)
                .map(
                  (s) => `
                <img class="screenshot-thumb" src="${escapeHtml(s.preview)}" alt="Кадр" loading="lazy" />
              `
                )
                .join("")}
            </div>
          </div>
        `
            : ""
        }

        <!-- ==================== SIMILAR RECOMMENDATIONS ==================== -->
        ${
          similar.length > 0
            ? `
          <div class="content-block" style="margin-top:48px;">
            <div class="section-header">
              <div>
                <span class="section-eyebrow">ЕСЛИ ВАМ ПОНРАВИЛОСЬ ЭТО АНИМЕ</span>
                <h2 class="section-title">Похожие аниме и рекомендации</h2>
              </div>
            </div>
            <div class="anime-grid">
              ${similar.slice(0, 12).map(createAnimeCardHtml).join("")}
            </div>
          </div>
        `
            : ""
        }
      </div>
    `;

    // Check saved watch progress and sync player state
    const prog = getWatchProgress(a.id);
    if (prog && prog.currentTime > 3) {
      const pEp = prog.episodeOrdinal || 1;
      const pVo = prog.voiceoverName || "Русская озвучка";
      state.currentPlayerState.episodeOrdinal = pEp;
      state.currentPlayerState.voiceoverName = pVo;
      state.currentPlayerState.savedCurrentTime = prog.currentTime;
    }

    // Upgrade selects on detail page to custom LumaDropdowns
    upgradeSelectToLumaDropdown(document.getElementById("detailWatchlistSelect"));
    upgradeSelectToLumaDropdown(document.getElementById("voiceoverSelect"), true);
    upgradeSelectToLumaDropdown(document.getElementById("qualitySelect"), true);

    populateVoiceoverDropdown(state.currentPlayerState.episodeOrdinal);
    renderEpisodesSidebarList();
    bindDetailPlayerEvents();

    const bannerContainer = document.getElementById("continueWatchingBannerContainer");
    if (bannerContainer) {
      bannerContainer.innerHTML = "";
    }

    const detailPlayBtn = document.getElementById("detailPlayBtn");
    if (prog && prog.currentTime > 3) {
      const pEp = prog.episodeOrdinal || 1;
      const pVo = prog.voiceoverName || "Русская озвучка";
      const pTime = formatTime(prog.currentTime);

      if (detailPlayBtn) {
        detailPlayBtn.innerHTML = `
          <svg class="icon" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          <span>Продолжить (${pEp}-я эп. • ${pTime})</span>
        `;
        detailPlayBtn.onclick = (e) => {
          e.preventDefault();
          state.currentPlayerState.episodeOrdinal = pEp;
          state.currentPlayerState.voiceoverName = pVo;
          state.currentPlayerState.savedCurrentTime = prog.currentTime;
          populateVoiceoverDropdown(pEp);
          renderEpisodesSidebarList();
          renderPlayerViewport(true);
          document.getElementById("cinemaPlayerBox")?.scrollIntoView({ behavior: "smooth" });
        };
      }
    }

    renderPlayerViewport();
  }

  function renderEpisodesSidebarList() {
    const listEl = document.getElementById("episodesScrollList");
    const detail = state.currentAnimeDetail;
    if (!listEl || !detail) return;

    const fullEpisodes = detail.full_episodes || [];
    const q = (state.currentPlayerState.epSearchQuery || "").trim().toLowerCase();
    const chunkSize = 100;
    const chunkIdx = state.currentPlayerState.epRangeIndex || 0;

    let visibleEpisodes = [];
    if (q) {
      visibleEpisodes = fullEpisodes.filter(
        (ep) => String(ep.ordinal).includes(q) || (ep.name && ep.name.toLowerCase().includes(q))
      );
    } else {
      const start = chunkIdx * chunkSize;
      visibleEpisodes = fullEpisodes.slice(start, start + chunkSize);
    }

    if (!visibleEpisodes.length) {
      listEl.innerHTML = `<div style="padding:16px; color:var(--text-secondary); font-size:0.84rem; text-align:center;">Серия не найдена</div>`;
      return;
    }

    listEl.innerHTML = visibleEpisodes
      .map((ep) => {
        const isCurrent = Number(ep.ordinal) === Number(state.currentPlayerState.episodeOrdinal);
        return `
          <button type="button" class="episode-item-btn ${isCurrent ? "active" : ""}" data-ep-ordinal="${ep.ordinal}">
            <span class="ep-number">${ep.ordinal}</span>
            <span class="ep-name">${escapeHtml(ep.name || `Серия ${ep.ordinal}`)}</span>
            ${ep.has_hls ? `<span class="ep-tag-hls">1080p</span>` : ""}
          </button>
        `;
      })
      .join("");

    listEl.querySelectorAll("[data-ep-ordinal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const nextOrd = Number(btn.dataset.epOrdinal) || 1;
        state.currentPlayerState.episodeOrdinal = nextOrd;
        state.currentPlayerState.savedCurrentTime = 0;
        populateVoiceoverDropdown(nextOrd);
        renderEpisodesSidebarList();
        renderPlayerViewport(true);
        showToast(`Включена ${nextOrd}-я серия • Озвучка: ${state.currentPlayerState.voiceoverName}`);
      });
    });
  }

  function destroyActivePlayer() {
    state.currentPlaybackToken = (state.currentPlaybackToken || 0) + 1;

    if (state.__playerKeyHandler) {
      document.removeEventListener("keydown", state.__playerKeyHandler);
      state.__playerKeyHandler = null;
    }

    // 1. Abort any in-flight stream fetch request immediately
    if (state.streamAbortController) {
      try {
        state.streamAbortController.abort();
      } catch (_) {}
      state.streamAbortController = null;
    }

    // 2. Clear controls inactivity timer
    if (state.hideControlsTimeout) {
      clearTimeout(state.hideControlsTimeout);
      state.hideControlsTimeout = null;
    }

    // 3. Tear down HLS instance FIRST
    if (state.hlsInstance) {
      try {
        state.hlsInstance.stopLoad();
        state.hlsInstance.detachMedia();
        state.hlsInstance.destroy();
      } catch (_) {}
      state.hlsInstance = null;
    }

    // 4. Stop and remove all existing video and iframe elements
    const vp = document.getElementById("videoViewport");
    if (vp) {
      const videos = vp.querySelectorAll("video");
      videos.forEach((v) => {
        try {
          v.pause();
          v.removeAttribute("src");
          v.src = "";
          v.srcObject = null;
          v.load();
          v.remove();
        } catch (_) {}
      });

      const iframes = vp.querySelectorAll("iframe");
      iframes.forEach((ifr) => {
        try {
          ifr.contentWindow?.postMessage?.('{"event":"command","func":"pauseVideo","args":""}', '*');
          ifr.src = "about:blank";
          ifr.remove();
        } catch (_) {}
      });

      vp.innerHTML = "";
      vp.classList.remove("hide-cursor");
      vp.classList.remove("show-controls");
    }
  }

  function bindDetailPlayerEvents() {
    const watchlistSelect = document.getElementById("detailWatchlistSelect");
    if (watchlistSelect) {
      watchlistSelect.addEventListener("change", () => {
        const val = watchlistSelect.value;
        const a = state.currentAnimeDetail?.anime;
        if (!a) return;
        if (val === "remove" || val === "") {
          delete state.library[a.id];
          saveLibrary();
          showToast(`Удалено из коллекции: ${a.russian || a.name}`);
        } else {
          state.library[a.id] = {
            id: a.id,
            russian: a.russian,
            name: a.name,
            poster_url: getPoster(a),
            score: a.score,
            kind: a.kind,
            status: val,
            aired_on: a.aired_on,
            episodes: a.episodes,
            real_episodes_aired: a.real_episodes_aired,
            real_episodes_total: a.real_episodes_total,
            genres: a.genres || [],
          };
          saveLibrary();
          showToast(`Добавлено в «${WATCHLIST_LABELS[val]}»: ${a.russian || a.name}`);
        }
      });
    }

    // Force real-time refresh button on detail page
    document.getElementById("detailForceRefreshBtn")?.addEventListener("click", () => {
      const a = state.currentAnimeDetail?.anime;
      if (a) {
        showToast("Синхронизация списка серий в реальном времени...");
        openAnimeDetail(a.id, true);
      }
    });

    // Episode range chunk buttons (1-100, 101-200...)
    document.querySelectorAll("[data-ep-chunk]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.currentPlayerState.epRangeIndex = Number(btn.dataset.epChunk) || 0;
        document.querySelectorAll("[data-ep-chunk]").forEach((b) => b.classList.toggle("active", b === btn));
        renderEpisodesSidebarList();
      });
    });

    // Episode quick search input
    const epSearchInput = document.getElementById("epQuickSearchInput");
    if (epSearchInput) {
      epSearchInput.addEventListener("input", () => {
        state.currentPlayerState.epSearchQuery = epSearchInput.value;
        renderEpisodesSidebarList();
      });
    }

    // Seasons Navigation Switcher
    document.querySelectorAll(".season-pill-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const sId = btn.dataset.seasonId;
        if (sId && sId !== String(state.currentAnimeDetail?.anime?.id)) {
          window.location.hash = `#anime/${sId}`;
        }
      });
    });

    // Trailer Toggle Button
    document.getElementById("cinemaTrailerToggleBtn")?.addEventListener("click", () => {
      state.currentPlayerState.mode = state.currentPlayerState.mode === "trailer" ? "hls" : "trailer";
      const btn = document.getElementById("cinemaTrailerToggleBtn");
      if (btn) btn.classList.toggle("active", state.currentPlayerState.mode === "trailer");
      renderPlayerViewport(state.currentPlayerState.mode === "trailer");
    });

    // Voiceover Custom Select Change -> Preserves Current Time & Seamlessly Reloads Stream with Active Voiceover Badge!
    const voSelect = document.getElementById("voiceoverSelect");
    if (voSelect) {
      voSelect.addEventListener("change", () => {
        const videoEl = document.getElementById("lumaHlsVideo");
        if (videoEl && !isNaN(videoEl.currentTime)) {
          state.currentPlayerState.savedCurrentTime = videoEl.currentTime;
        }
        const opt = voSelect.options[voSelect.selectedIndex];
        if (!opt) return;
        state.currentPlayerState.voiceoverId = opt.dataset.id || opt.value;
        state.currentPlayerState.voiceoverName = opt.dataset.name || opt.textContent || "Русская озвучка";
        state.currentPlayerState.voiceoverLink = opt.dataset.link || "";
        state.currentPlayerState.voiceoverBadge = opt.dataset.badge || "";

        renderPlayerViewport(true);
        showToast(`Озвучка: ${state.currentPlayerState.voiceoverName}`);
      });
    }

    // Quality Custom Select Change -> Preserves Current Time & Reloads Stream in 1080p/720p/480p!
    const qSelect = document.getElementById("qualitySelect");
    if (qSelect) {
      qSelect.addEventListener("change", () => {
        const videoEl = document.getElementById("lumaHlsVideo");
        if (videoEl && !isNaN(videoEl.currentTime)) {
          state.currentPlayerState.savedCurrentTime = videoEl.currentTime;
        }
        state.currentPlayerState.quality = qSelect.value;
        renderPlayerViewport(true);
        showToast(`Качество видео переключено на ${qSelect.value}p`);
      });
    }
  }

  function recordWatchHistory(anime, epOrdinal, voiceoverName) {
    if (!anime) return;
    state.watchHistory = state.watchHistory.filter((h) => String(h.id) !== String(anime.id));
    state.watchHistory.unshift({
      id: anime.id,
      title: anime.russian || anime.name,
      poster: getPoster(anime),
      episode: epOrdinal,
      voiceover: voiceoverName,
      ts: Date.now(),
    });
    saveWatchHistory();
  }

  function populateVoiceoverDropdown(targetEpOrdinal) {
    const voSelect = document.getElementById("voiceoverSelect");
    const detail = state.currentAnimeDetail;
    if (!voSelect || !detail || !detail.voiceovers) return;

    const currentEp = targetEpOrdinal || state.currentPlayerState.episodeOrdinal || 1;
    const currentEpObj = (detail.full_episodes || [])[currentEp - 1];

    voSelect.innerHTML = "";

    // 1. AniLibria direct stream if available
    const anilibriaVo = detail.voiceovers.find((v) => v.id === "anilibria_hls");
    if (anilibriaVo) {
      const isAlAvail =
        (!anilibriaVo.ep_min && !anilibriaVo.ep_max) ||
        (currentEp >= anilibriaVo.ep_min && currentEp <= anilibriaVo.ep_max) ||
        (currentEpObj && currentEpObj.has_hls);
      const opt = document.createElement("option");
      opt.value = anilibriaVo.id || "anilibria_hls";
      opt.dataset.id = anilibriaVo.id || "anilibria_hls";
      opt.dataset.name = anilibriaVo.name;
      opt.dataset.link = anilibriaVo.link || "";
      opt.dataset.shortLabel = "AniLibria.TV (FHD)";
      opt.dataset.badge = isAlAvail ? "1080p FHD" : `Серии ${anilibriaVo.ep_min || 1}–${anilibriaVo.ep_max || ""}`;
      opt.textContent = isAlAvail ? anilibriaVo.name : `${anilibriaVo.name} [Недоступно: сер. ${currentEp}]`;
      if (!isAlAvail) opt.disabled = true;
      voSelect.appendChild(opt);
    }

    // 2. All other voiceovers from detail.voiceovers
    const otherVos = detail.voiceovers.filter((v) => v.id !== "anilibria_hls");
    otherVos.forEach((v) => {
      const isAvail = (!v.ep_min && !v.ep_max) || (currentEp >= v.ep_min && currentEp <= v.ep_max);
      const opt = document.createElement("option");
      opt.value = v.id || v.name;
      opt.dataset.id = v.id || v.name;
      opt.dataset.name = v.name;
      opt.dataset.link = v.link || "";
      opt.dataset.shortLabel = v.name;
      opt.dataset.badge = v.badge || (v.type === "Sub" ? "Субтитры" : "Русская озвучка");
      if (isAvail) {
        opt.textContent = v.name;
      } else {
        const rangeStr =
          v.ep_min && v.ep_max && v.ep_max < 99999
            ? `${v.ep_min}–${v.ep_max} эп.`
            : v.ep_min > 1
            ? `с ${v.ep_min} эп.`
            : `до ${v.ep_max} эп.`;
        opt.textContent = `${v.name} [Доступно: ${rangeStr}]`;
        opt.disabled = true;
      }
      voSelect.appendChild(opt);
    });

    // Ensure an available voiceover is selected
    const currentVoId = (state.currentPlayerState.voiceoverId || "").trim();
    const currentVoName = (state.currentPlayerState.voiceoverName || "").trim().toLowerCase();
    let foundIdx = -1;
    for (let i = 0; i < voSelect.options.length; i++) {
      const opt = voSelect.options[i];
      if (opt.disabled) continue;
      const optId = (opt.dataset.id || opt.value || "").trim();
      const optName = (opt.dataset.name || opt.textContent || "").trim().toLowerCase();
      if (
        (currentVoId && (optId === currentVoId || opt.value === currentVoId)) ||
        (currentVoName && (optName === currentVoName || optName.includes(currentVoName) || currentVoName.includes(optName)))
      ) {
        foundIdx = i;
        break;
      }
    }

    // If current voiceover was not available on this episode, auto-select the best Russian voiceover!
    if (foundIdx === -1) {
      for (let i = 0; i < voSelect.options.length; i++) {
        const opt = voSelect.options[i];
        if (!opt.disabled && !opt.value.toLowerCase().includes("субтитр")) {
          foundIdx = i;
          break;
        }
      }
      if (foundIdx === -1) {
        for (let i = 0; i < voSelect.options.length; i++) {
          if (!voSelect.options[i].disabled) {
            foundIdx = i;
            break;
          }
        }
      }
    }

    if (foundIdx !== -1) {
      voSelect.selectedIndex = foundIdx;
      const chosenOpt = voSelect.options[foundIdx];
      const prevVo = state.currentPlayerState.voiceoverName;
      state.currentPlayerState.voiceoverId = chosenOpt.dataset.id || chosenOpt.value;
      state.currentPlayerState.voiceoverName = chosenOpt.dataset.name || chosenOpt.textContent;
      state.currentPlayerState.voiceoverLink = chosenOpt.dataset.link || "";
      state.currentPlayerState.voiceoverBadge = chosenOpt.dataset.badge || "";
      if (prevVo && prevVo !== state.currentPlayerState.voiceoverName) {
        if (state.hlsInstance || state.currentPlayerState.activeHls) {
          showToast(`Озвучка: «${state.currentPlayerState.voiceoverName}» (серия ${currentEp})`);
        }
      }
    }

    if (voSelect._refreshLumaDropdown) {
      voSelect._refreshLumaDropdown();
    }
  }

  function updateDynamicTranslationsDropdown(translations, activeTitle) {
    const voSelect = document.getElementById("voiceoverSelect");
    if (!voSelect || !translations || translations.length === 0) return;

    const epOrd = state.currentPlayerState.episodeOrdinal || 1;
    const currentEp = (state.currentAnimeDetail?.full_episodes || [])[epOrd - 1];

    voSelect.innerHTML = "";

    // 1. AniLibria direct stream if available
    if (currentEp && currentEp.has_hls) {
      const opt = document.createElement("option");
      opt.value = "AniLibria.TV (Прямой поток 1080p FHD)";
      opt.textContent = "AniLibria.TV (Прямой поток 1080p FHD)";
      opt.dataset.name = "AniLibria.TV (Прямой поток 1080p FHD)";
      opt.dataset.shortLabel = "AniLibria.TV (FHD)";
      opt.dataset.badge = "1080p FHD";
      voSelect.appendChild(opt);
    }

    // 2. Kodik translations
    const seen = new Set();
    translations.forEach((t) => {
      const title = (t.title || "").trim();
      const norm = title.toLowerCase();
      if (!title || seen.has(norm)) return;
      seen.add(norm);

      const isAvail = (!t.ep_min && !t.ep_max) || (epOrd >= t.ep_min && epOrd <= t.ep_max);
      const opt = document.createElement("option");
      opt.value = title;
      opt.dataset.name = title;
      opt.dataset.shortLabel = title;
      const isSub = t.is_sub || norm.includes("субтитр") || norm.includes("sub") || norm.includes("оригинал");
      opt.dataset.badge = isSub ? "Субтитры" : "Русская озвучка";

      if (isAvail) {
        opt.textContent = title;
      } else {
        const rangeStr =
          t.ep_min && t.ep_max && t.ep_max < 99999
            ? `${t.ep_min}–${t.ep_max} эп.`
            : t.ep_min > 1
            ? `с ${t.ep_min} эп.`
            : `до ${t.ep_max} эп.`;
        opt.textContent = `${title} [Доступно: ${rangeStr}]`;
        opt.disabled = true;
      }
      voSelect.appendChild(opt);
    });

    // Select the active translation
    const targetTitle = (activeTitle || state.currentPlayerState.voiceoverName || "").trim().toLowerCase();
    for (let i = 0; i < voSelect.options.length; i++) {
      const opt = voSelect.options[i];
      if (opt.disabled) continue;
      const oText = opt.textContent.trim().toLowerCase();
      const oVal = opt.value.trim().toLowerCase();
      if (
        oText === targetTitle ||
        oVal === targetTitle ||
        (targetTitle && (oText.includes(targetTitle) || targetTitle.includes(oText)))
      ) {
        voSelect.selectedIndex = i;
        break;
      }
    }

    if (voSelect._refreshLumaDropdown) {
      voSelect._refreshLumaDropdown();
    }
  }

  function renderPlayerViewport(autoPlayAfterSwitch = false) {
    destroyActivePlayer();
    const vp = document.getElementById("videoViewport");
    const statusText = document.getElementById("cinemaStatusText");
    const detail = state.currentAnimeDetail;
    if (!vp || !detail) return;

    const a = detail.anime;
    const fullEpisodes = detail.full_episodes || [];
    const mode = state.currentPlayerState.mode;
    const epOrd = state.currentPlayerState.episodeOrdinal || 1;
    const voName = state.currentPlayerState.voiceoverName || "Русская озвучка";
    const q = state.currentPlayerState.quality || "1080";

    recordWatchHistory(a, epOrd, voName);

    const currentEpNumEl = document.getElementById("cinemaCurrentEpNum");
    if (currentEpNumEl) currentEpNumEl.textContent = String(epOrd);

    // Official Trailer Mode
    if (mode === "trailer") {
      const videos = a.videos_clean || [];
      const firstVid = videos[0];
      if (firstVid && firstVid.player_url) {
        const embedUrl = firstVid.player_url.replace("http://", "https://");
        vp.innerHTML = `<iframe src="${escapeHtml(embedUrl)}" allowfullscreen allow="autoplay; encrypted-media" style="width:100%;height:100%;border:none;background:#000;"></iframe>`;
        if (statusText) statusText.textContent = `Официальный трейлер: ${firstVid.name}`;
        return;
      }
    }

    const currentEpObj =
      fullEpisodes.find((e) => Number(e.ordinal) === Number(epOrd)) ||
      fullEpisodes[0] ||
      { ordinal: epOrd, name: `Серия ${epOrd}`, preview: a.banner_url || getPoster(a) };

    const epPreview = currentEpObj.preview || a.banner_url || getPoster(a);

    function startPlayback() {
      const myPlaybackToken = ++state.currentPlaybackToken;
      vp.classList.add("paused");
      vp.innerHTML = `
        <video id="lumaHlsVideo" playsinline poster="${escapeHtml(epPreview)}"></video>
        <button id="skipRecapFloatingBtn" class="skip-recap-btn hidden" type="button">↺ Повтор +90с</button>
        <button id="skipOpeningFloatingBtn" class="skip-opening-btn hidden" type="button">⏭ Пропустить опенинг</button>

        <!-- Custom LumaPlayer Slate-Violet Controls Overlay -->
        <div class="luma-player-ui" id="lumaPlayerUi">
          <div class="luma-player-top">
            <span class="luma-player-ep-badge">
              Серия ${epOrd}: ${escapeHtml(currentEpObj.name || `Эпизод ${epOrd}`)}
            </span>
            <span class="meta-tag-pill" id="lumaPlayerMetaPill">
              ${escapeHtml(voName)} • ${q}p
            </span>
          </div>

          <button type="button" class="luma-player-center-play" id="lumaCenterPlayBtn" aria-label="Воспроизвести">
            <svg viewBox="0 0 24 24" fill="currentColor" style="width:28px;height:28px;margin-left:3px;">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </button>

          <div class="luma-player-bottom">
            <div class="luma-progress-wrap" id="lumaProgressWrap">
              <div class="luma-progress-filled" id="lumaProgressFilled">
                <span class="luma-progress-thumb"></span>
              </div>
            </div>

            <div class="luma-controls-row">
              <div class="luma-controls-left">
                <button type="button" class="luma-ctrl-btn" id="lumaPlayPauseBtn" title="Воспроизведение / Пауза (Пробел)">
                  <svg id="lumaPlayIcon" viewBox="0 0 24 24" fill="currentColor" style="width:18px;height:18px;">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </button>
                <button type="button" class="luma-ctrl-btn" id="lumaRewindBtn" title="-10 секунд (←)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;">
                    <polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline>
                  </svg>
                </button>
                <button type="button" class="luma-ctrl-btn" id="lumaForwardBtn" title="+10 секунд (→)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;">
                    <polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline>
                  </svg>
                </button>

                <input type="range" id="lumaVolumeSlider" class="luma-volume-slider" min="0" max="1" step="0.05" value="1" title="Громкость (↑/↓)" />
                <span class="luma-time-label" id="lumaTimeLabel">0:00 / 24:00</span>
              </div>

              <div class="luma-controls-right">
                <button type="button" class="luma-pill-ctrl" id="lumaSkipRecapBtn" title="Пропустить повтор (+90 сек)">
                  ↺ Повтор +90с
                </button>
                <button type="button" class="luma-pill-ctrl" id="lumaSkipOpeningBtn" title="Пропустить опенинг (+85 сек)">
                  ⏭ Опенинг
                </button>
                <button type="button" class="luma-pill-ctrl" id="lumaSkipEndingBtn" title="Пропустить эндинг">
                  ⏭ Эндинг
                </button>
                <button type="button" class="luma-pill-ctrl ${state.currentPlayerState.autoplay !== false ? "active" : ""}" id="lumaAutoplayBtn" title="Автопереход к следующей серии">
                  ${state.currentPlayerState.autoplay !== false ? "Авто: ВКЛ" : "Авто: ВЫКЛ"}
                </button>
                <button type="button" class="luma-pill-ctrl" id="lumaSpeedBtn" title="Скорость воспроизведения">
                  ${state.currentPlayerState.playbackRate}x
                </button>
                <button type="button" class="luma-pill-ctrl" id="lumaPrevEpBtn" title="Предыдущая серия (P)">
                  ← Пред.
                </button>
                <button type="button" class="luma-pill-ctrl" id="lumaNextEpBtn" title="Следующая серия (N)">
                  След. →
                </button>
                <button type="button" class="luma-ctrl-btn" id="lumaFullscreenBtn" title="На весь экран (F)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      const video = document.getElementById("lumaHlsVideo");
      const skipBtn = document.getElementById("skipOpeningFloatingBtn");

      function attachStreamToVideo(hlsUrl) {
        const restoreTimeAndPlay = () => {
          if (state.currentPlayerState.savedCurrentTime > 1) {
            try {
              video.currentTime = state.currentPlayerState.savedCurrentTime;
            } catch (_) {}
          }
          video.playbackRate = state.currentPlayerState.playbackRate || 1;
          video.play().catch(() => {});
        };

        if (window.Hls && window.Hls.isSupported()) {
          const hls = new window.Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 30,
            maxBufferLength: 25,
            maxMaxBufferLength: 50,
            maxBufferSize: 25 * 1000 * 1000,
            liveSyncDurationCount: 2,
            nudgeOffset: 0.1,
            nudgeMaxRetry: 5
          });
          state.hlsInstance = hls;
          hls.loadSource(hlsUrl);
          hls.attachMedia(video);
          hls.on(window.Hls.Events.MANIFEST_PARSED, restoreTimeAndPlay);
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = hlsUrl;
          video.addEventListener("loadedmetadata", restoreTimeAndPlay, { once: true });
        }

        bindCustomVideoControls(vp, video, skipBtn, currentEpObj);
      }

      // Check if AniLibria direct stream is available for this episode and chosen
      const isAnilibriaChosen = voName.toLowerCase().includes("anilibria");
      if (isAnilibriaChosen && currentEpObj.has_hls && (currentEpObj.hls_1080 || currentEpObj.hls_720 || currentEpObj.hls_480)) {
        const hlsUrl =
          (q === "1080" && currentEpObj.hls_1080) ||
          (q === "720" && currentEpObj.hls_720) ||
          currentEpObj.hls_480 ||
          currentEpObj.hls_1080 ||
          currentEpObj.hls_720;
        attachStreamToVideo(hlsUrl);
        if (statusText) statusText.textContent = `LumaPlayer ${q}p • Серия ${epOrd} из ${detail.total_available_episodes} • Озвучка: ${voName}`;
        return;
      }

      // Check if running on local server vs static GitHub Pages host
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      if (!isLocal) {
        if (myPlaybackToken !== state.currentPlaybackToken) return;

        // Resolve exact player URL for chosen translation
        const chosenVo =
          (detail.voiceovers || []).find(
            (v) => (state.currentPlayerState.voiceoverId && v.id === state.currentPlayerState.voiceoverId) ||
                   (state.currentPlayerState.voiceoverLink && v.link === state.currentPlayerState.voiceoverLink) ||
                   (v.name && v.name.toLowerCase() === voName.toLowerCase())
          ) || (detail.voiceovers || [])[0];

        let balancerUrl = chosenVo?.link || state.currentPlayerState.voiceoverLink || currentEpObj.kodik_link || `https://kodikplayer.com/find-player?shikimoriID=${a.id}&episode=${epOrd}`;

        if (balancerUrl.startsWith("//")) {
          balancerUrl = "https:" + balancerUrl;
        }

        balancerUrl = balancerUrl.replace(/[?&]episode=\d+/, "");
        balancerUrl += (balancerUrl.includes("?") ? `&episode=${epOrd}` : `?episode=${epOrd}`);

        vp.innerHTML = `
          <div class="luma-clean-embed" style="position:relative; width:100%; height:100%; background:#000; border-radius:inherit; overflow:hidden;">
            <iframe
              id="lumaActiveFrame"
              src="${escapeHtml(balancerUrl)}"
              allowfullscreen
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              style="width:100%; height:100%; border:none; background:#000; display:block;"
            ></iframe>
          </div>
        `;

        if (statusText) {
          statusText.textContent = `Плеер Kodik • Серия ${epOrd} из ${detail.total_available_episodes} • Озвучка: ${chosenVo?.name || state.currentPlayerState.voiceoverName}`;
        }
        return;
      }

      // Otherwise fetch stream directly from local /api/stream with AbortController
      if (statusText) statusText.textContent = `Подключение потока серии ${epOrd} (${voName})...`;
      state.streamAbortController = new AbortController();
      const currentSignal = state.streamAbortController.signal;

      fetch(`/api/stream?anime_id=${a.id}&episode=${epOrd}&translation=${encodeURIComponent(voName)}`, { signal: currentSignal })
        .then((r) => r.json())
        .then((resData) => {
          if (currentSignal.aborted || myPlaybackToken !== state.currentPlaybackToken) return;
          const streams = resData?.streams || {};
          const streamUrl =
            (q === "1080" && streams["1080"]) ||
            (q === "720" && streams["720"]) ||
            streams["720"] ||
            streams["480"] ||
            streams["360"] ||
            Object.values(streams)[0];

          if (!streamUrl) {
            const fallbackLink = resData?.fallback_player || currentEpObj.kodik_link || `https://kodikplayer.com/find-player?shikimoriID=${a.id}&episode=${epOrd}`;
            vp.innerHTML = `<iframe src="${escapeHtml(fallbackLink)}" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture" style="width:100%;height:100%;border:none;background:#000;"></iframe>`;
            if (statusText) statusText.textContent = `Плеер Kodik • Серия ${epOrd} из ${detail.total_available_episodes} • Озвучка: ${state.currentPlayerState.voiceoverName}`;
            return;
          }

          if (resData.active_translation) {
            state.currentPlayerState.voiceoverName = resData.active_translation;
            const metaPill = document.getElementById("lumaPlayerMetaPill");
            if (metaPill) metaPill.textContent = `${resData.active_translation} • ${q}p`;
          }

          if (resData.translations && resData.translations.length > 0) {
            updateDynamicTranslationsDropdown(resData.translations, resData.active_translation);
          }

          attachStreamToVideo(streamUrl);
          if (statusText) statusText.textContent = `LumaPlayer • Серия ${epOrd} из ${detail.total_available_episodes} • Озвучка: ${state.currentPlayerState.voiceoverName}`;
        })
        .catch((err) => {
          if (err && err.name === "AbortError") return;
          if (myPlaybackToken !== state.currentPlaybackToken) return;
          const fallbackLink = currentEpObj.kodik_link || `https://kodikplayer.com/find-player?shikimoriID=${a.id}&episode=${epOrd}`;
          vp.innerHTML = `<iframe src="${escapeHtml(fallbackLink)}" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture" style="width:100%;height:100%;border:none;background:#000;"></iframe>`;
          if (statusText) statusText.textContent = `Плеер Kodik • Серия ${epOrd} из ${detail.total_available_episodes}`;
        });
    }

    // Auto-play immediately if switched from list/button
    if (autoPlayAfterSwitch) {
      startPlayback();
      return;
    }

    // Clean Pre-Play State: Blurred episode still frame backdrop + Central stylish Play button OR In-Player Resume Card
    vp.classList.add("paused");
    const prog = getWatchProgress(a.id);

    if (prog && prog.currentTime > 3) {
      const pEp = prog.episodeOrdinal || 1;
      const pVo = prog.voiceoverName || "Русская озвучка";
      const pTime = formatTime(prog.currentTime);
      const epForSplash =
        fullEpisodes.find((e) => Number(e.ordinal) === Number(pEp)) ||
        currentEpObj;
      const previewForSplash = epForSplash.preview || epPreview;

      vp.innerHTML = `
        <div class="luma-splash-screen" id="lumaSplashScreen">
          <div class="luma-splash-backdrop" style="background-image: url('${escapeHtml(previewForSplash)}');"></div>
          <div class="luma-splash-vignette"></div>

          <div class="luma-splash-resume-card" id="lumaSplashResumeCard">
            <div class="luma-resume-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" class="luma-resume-badge-icon">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>ВЫ ОСТАНОВИЛИСЬ ЗДЕСЬ</span>
            </div>

            <div class="luma-resume-title">
              Серия ${pEp} • ${pTime}
            </div>

            <div class="luma-resume-subtitle">
              Озвучка: <span class="luma-resume-vo-name">«${escapeHtml(pVo)}»</span>
            </div>

            <div class="luma-resume-actions">
              <button type="button" class="luma-resume-btn-main" id="lumaSplashResumeBtn" aria-label="Продолжить просмотр">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="6 3 20 12 6 21 6 3"></polygon>
                </svg>
                <span>Продолжить просмотр</span>
              </button>
              <button type="button" class="luma-resume-btn-secondary" id="lumaSplashRestartBtn" title="Начать просмотр этой серии с 0:00">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M1 4v6h6"></path>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
                <span>С начала</span>
              </button>
            </div>
          </div>

          <div class="luma-splash-info">
            <span class="luma-splash-ep-pill">Серия ${pEp}</span>
            <span class="luma-splash-title">${escapeHtml(epForSplash.name || `Эпизод ${pEp}`)}</span>
          </div>
        </div>
      `;

      document.getElementById("lumaSplashResumeBtn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        state.currentPlayerState.episodeOrdinal = pEp;
        state.currentPlayerState.voiceoverName = pVo;
        state.currentPlayerState.savedCurrentTime = prog.currentTime;
        populateVoiceoverDropdown(pEp);
        renderEpisodesSidebarList();
        startPlayback();
      });

      document.getElementById("lumaSplashRestartBtn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        state.currentPlayerState.episodeOrdinal = pEp;
        state.currentPlayerState.voiceoverName = pVo;
        state.currentPlayerState.savedCurrentTime = 0;
        populateVoiceoverDropdown(pEp);
        renderEpisodesSidebarList();
        startPlayback();
      });

      if (statusText) {
        statusText.textContent = `Вы остановились на ${pEp}-й серии (${pTime}) • Озвучка: ${pVo}`;
      }
      return;
    }

    // Default clean pre-play splash with play button
    vp.innerHTML = `
      <div class="luma-splash-screen" id="lumaSplashScreen" title="Нажмите, чтобы включить серию ${epOrd}">
        <div class="luma-splash-backdrop" style="background-image: url('${escapeHtml(epPreview)}');"></div>
        <div class="luma-splash-vignette"></div>

        <button type="button" class="luma-splash-play-btn" id="lumaSplashPlayBtn" aria-label="Воспроизвести ${epOrd}-ю серию">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <polygon points="6 3 20 12 6 21 6 3"></polygon>
          </svg>
        </button>

        <div class="luma-splash-info">
          <span class="luma-splash-ep-pill">Серия ${epOrd}</span>
          <span class="luma-splash-title">${escapeHtml(currentEpObj.name || `Эпизод ${epOrd}`)}</span>
        </div>
      </div>
    `;

    document.getElementById("lumaSplashScreen")?.addEventListener("click", () => {
      startPlayback();
    });

    if (statusText) {
      statusText.textContent = `Серия ${epOrd} из ${detail.total_available_episodes} • Озвучка: ${voName}`;
    }
  }

  function bindCustomVideoControls(vp, video, skipBtn, epObj) {
    const playPauseBtn = document.getElementById("lumaPlayPauseBtn");
    const centerPlayBtn = document.getElementById("lumaCenterPlayBtn");
    const playIcon = document.getElementById("lumaPlayIcon");
    const rewindBtn = document.getElementById("lumaRewindBtn");
    const forwardBtn = document.getElementById("lumaForwardBtn");
    const volumeSlider = document.getElementById("lumaVolumeSlider");
    const timeLabel = document.getElementById("lumaTimeLabel");
    const progressWrap = document.getElementById("lumaProgressWrap");
    const progressFilled = document.getElementById("lumaProgressFilled");
    const speedBtn = document.getElementById("lumaSpeedBtn");
    const nextEpBtn = document.getElementById("lumaNextEpBtn");
    const fsBtn = document.getElementById("lumaFullscreenBtn");

    function resetInactivityTimer() {
      vp.classList.add("show-controls");
      vp.classList.remove("hide-cursor");
      clearTimeout(state.hideControlsTimeout);
      state.hideControlsTimeout = setTimeout(() => {
        if (!video.paused) {
          vp.classList.remove("show-controls");
          vp.classList.add("hide-cursor");
        }
      }, 3000);
    }

    vp.addEventListener("touchstart", (e) => {
      if (e.target.closest("button, input, select, .luma-dropdown")) return;
      resetInactivityTimer();
    }, { passive: true });

    vp.addEventListener("mousemove", resetInactivityTimer);
    vp.addEventListener("mousedown", resetInactivityTimer);
    document.addEventListener("keydown", (e) => {
      if (state.currentView === "anime") resetInactivityTimer();
    });

    vp.addEventListener("mouseleave", () => {
      if (!video.paused) {
        clearTimeout(state.hideControlsTimeout);
        state.hideControlsTimeout = setTimeout(() => {
          if (!video.paused) {
            vp.classList.remove("show-controls");
            vp.classList.add("hide-cursor");
          }
        }, 800);
      }
    });

    function togglePlay() {
      if (video.paused) {
        video.play().catch(() => {});
        resetInactivityTimer();
      } else {
        video.pause();
        vp.classList.add("show-controls");
      }
    }

    video.addEventListener("click", togglePlay);
    playPauseBtn?.addEventListener("click", togglePlay);
    centerPlayBtn?.addEventListener("click", togglePlay);

    video.addEventListener("play", () => {
      vp.classList.remove("paused");
      if (playIcon) {
        playIcon.innerHTML = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;
      }
      resetInactivityTimer();
    });

    video.addEventListener("pause", () => {
      vp.classList.add("paused");
      if (playIcon) {
        playIcon.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
      }
      const cur = video.currentTime || 0;
      if (cur > 2) {
        const aId = state.currentAnimeDetail?.anime?.id || (state.currentView === "anime" && window.location.hash.split("anime/")[1]);
        if (aId) {
          recordWatchProgress(
            aId,
            state.currentPlayerState.episodeOrdinal || 1,
            epObj?.name || `Серия ${state.currentPlayerState.episodeOrdinal || 1}`,
            state.currentPlayerState.voiceoverName || "Русская озвучка",
            cur,
            video.duration || 0
          );
        }
      }
    });

    rewindBtn?.addEventListener("click", () => {
      video.currentTime = Math.max(0, video.currentTime - 10);
    });

    forwardBtn?.addEventListener("click", () => {
      video.currentTime = Math.min(video.duration || 9999, video.currentTime + 10);
    });

    volumeSlider?.addEventListener("input", () => {
      video.volume = Number(volumeSlider.value);
    });

    const recapFloat = document.getElementById("skipRecapFloatingBtn");
    const openingFloat = document.getElementById("skipOpeningFloatingBtn");
    const skipRecapBtn = document.getElementById("lumaSkipRecapBtn");
    const skipOpeningBtn = document.getElementById("lumaSkipOpeningBtn");
    const skipEndingBtn = document.getElementById("lumaSkipEndingBtn");
    const autoplayBtn = document.getElementById("lumaAutoplayBtn");

    const doSkipRecap = () => {
      video.currentTime = Math.min((video.duration || 9999) - 1, (video.currentTime || 0) + 90);
      showToast("Повтор пропущен (+90 сек)");
      resetInactivityTimer();
    };
    skipRecapBtn?.addEventListener("click", doSkipRecap);
    recapFloat?.addEventListener("click", doSkipRecap);

    const doSkipOpening = () => {
      if (epObj.opening && epObj.opening.stop != null) {
        video.currentTime = epObj.opening.stop;
      } else {
        video.currentTime = Math.min((video.duration || 9999) - 1, (video.currentTime || 0) + 85);
      }
      openingFloat?.classList.add("hidden");
      showToast("Опенинг пропущен");
      resetInactivityTimer();
    };
    skipOpeningBtn?.addEventListener("click", doSkipOpening);
    openingFloat?.addEventListener("click", doSkipOpening);

    const doSkipEnding = () => {
      if (epObj.ending && epObj.ending.start != null) {
        video.currentTime = epObj.ending.start;
      } else if (video.duration && video.duration > 10) {
        video.currentTime = Math.max(0, video.duration - 2);
      } else {
        nextEpBtn?.click();
      }
      showToast("Эндинг пропущен");
      resetInactivityTimer();
    };
    skipEndingBtn?.addEventListener("click", doSkipEnding);

    autoplayBtn?.addEventListener("click", () => {
      state.currentPlayerState.autoplay = !(state.currentPlayerState.autoplay !== false);
      const isAuto = state.currentPlayerState.autoplay;
      autoplayBtn.textContent = isAuto ? "Авто: ВКЛ" : "Авто: ВЫКЛ";
      autoplayBtn.classList.toggle("active", isAuto);
      showToast(isAuto ? "Автопереход к след. серии включен" : "Автопереход выключен");
    });

    video.addEventListener("ended", () => {
      if (state.currentPlayerState.autoplay !== false) {
        const total = state.currentAnimeDetail?.total_available_episodes || 1;
        const curOrd = Number(state.currentPlayerState.episodeOrdinal) || 1;
        if (curOrd < total) {
          const nextOrd = curOrd + 1;
          showToast(`Серия завершена. Автопереход к ${nextOrd}-й серии...`);
          setTimeout(() => {
            state.currentPlayerState.episodeOrdinal = nextOrd;
            state.currentPlayerState.savedCurrentTime = 0;
            populateVoiceoverDropdown(nextOrd);
            renderEpisodesSidebarList();
            renderPlayerViewport(true);
          }, 1200);
        } else {
          showToast("Все вышедшие серии просмотрены!");
        }
      }
    });

    video.addEventListener("timeupdate", () => {
      const cur = video.currentTime || 0;
      const dur = video.duration || epObj.duration || 1440;
      const pct = Math.min(100, Math.max(0, (cur / dur) * 100));
      if (progressFilled) progressFilled.style.width = `${pct}%`;
      if (timeLabel) timeLabel.textContent = `${formatTimeSeconds(cur)} / ${formatTimeSeconds(dur)}`;

      // Show/hide floating skip buttons
      if (cur >= 2 && cur <= 120) {
        recapFloat?.classList.remove("hidden");
      } else {
        recapFloat?.classList.add("hidden");
      }

      if (epObj.opening && epObj.opening.start != null && epObj.opening.stop != null) {
        if (cur >= epObj.opening.start && cur <= epObj.opening.stop) {
          openingFloat?.classList.remove("hidden");
        } else {
          openingFloat?.classList.add("hidden");
        }
      } else if (cur >= 10 && cur <= 100) {
        openingFloat?.classList.remove("hidden");
      } else {
        openingFloat?.classList.add("hidden");
      }

      // Save watch progress every 2 seconds
      if (cur > 2 && !video.paused) {
        const now = Date.now();
        if (!video.__lastSaveProgress || now - video.__lastSaveProgress > 2000) {
          video.__lastSaveProgress = now;
          const aId = state.currentAnimeDetail?.anime?.id || (state.currentView === "anime" && window.location.hash.split("anime/")[1]);
          if (aId) {
            recordWatchProgress(
              aId,
              state.currentPlayerState.episodeOrdinal || 1,
              epObj?.name || `Серия ${state.currentPlayerState.episodeOrdinal || 1}`,
              state.currentPlayerState.voiceoverName || "Русская озвучка",
              cur,
              dur
            );
          }
        }
      }
    });

    const flushProgressOnExit = () => {
      const cur = video.currentTime || 0;
      if (cur > 2) {
        const aId = state.currentAnimeDetail?.anime?.id || (state.currentView === "anime" && window.location.hash.split("anime/")[1]);
        if (aId) {
          recordWatchProgress(
            aId,
            state.currentPlayerState.episodeOrdinal || 1,
            epObj?.name || `Серия ${state.currentPlayerState.episodeOrdinal || 1}`,
            state.currentPlayerState.voiceoverName || "Русская озвучка",
            cur,
            video.duration || 0
          );
        }
      }
    };
    window.addEventListener("beforeunload", flushProgressOnExit, { once: true });
    window.addEventListener("pagehide", flushProgressOnExit, { once: true });

    progressWrap?.addEventListener("click", (e) => {
      const rect = progressWrap.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const dur = video.duration || epObj.duration || 1440;
      video.currentTime = ratio * dur;
    });

    speedBtn?.addEventListener("click", () => {
      const rates = [1, 1.25, 1.5, 2];
      const nextRate = rates[(rates.indexOf(video.playbackRate) + 1) % rates.length] || 1;
      video.playbackRate = nextRate;
      state.currentPlayerState.playbackRate = nextRate;
      speedBtn.textContent = `${nextRate}x`;
      showToast(`Скорость воспроизведения: ${nextRate}x`);
    });

    const prevEpBtn = document.getElementById("lumaPrevEpBtn");

    const doPrevEpisode = () => {
      const cur = Number(state.currentPlayerState.episodeOrdinal) || 1;
      if (cur > 1) {
        state.currentPlayerState.episodeOrdinal = cur - 1;
        state.currentPlayerState.savedCurrentTime = 0;
        populateVoiceoverDropdown(cur - 1);
        renderEpisodesSidebarList();
        renderPlayerViewport(true);
        showToast(`Серия ${cur - 1}`);
      }
    };

    const doNextEpisode = () => {
      const total = state.currentAnimeDetail?.total_available_episodes || 1;
      const cur = Number(state.currentPlayerState.episodeOrdinal) || 1;
      if (cur < total) {
        state.currentPlayerState.episodeOrdinal = cur + 1;
        state.currentPlayerState.savedCurrentTime = 0;
        populateVoiceoverDropdown(cur + 1);
        renderEpisodesSidebarList();
        renderPlayerViewport(true);
        showToast(`Серия ${cur + 1}`);
      } else {
        showToast("Это последняя вышедшая серия");
      }
    };

    prevEpBtn?.addEventListener("click", doPrevEpisode);
    nextEpBtn?.addEventListener("click", doNextEpisode);

    fsBtn?.addEventListener("click", () => {
      if (!document.fullscreenElement) {
        vp.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    });

    // Rock-Solid Global Hotkeys Listener
    function handlePlayerKeydown(e) {
      const tag = document.activeElement?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag) || document.activeElement?.isContentEditable) {
        return;
      }
      if (!video || !document.body.contains(video)) {
        return;
      }

      const key = e.key;
      const code = e.code;

      if (code === "Space" || key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (code === "ArrowLeft" || key === "ArrowLeft") {
        e.preventDefault();
        video.currentTime = Math.max(0, (video.currentTime || 0) - 10);
        resetInactivityTimer();
        showToast("« 10 сек");
      } else if (code === "ArrowRight" || key === "ArrowRight") {
        e.preventDefault();
        video.currentTime = Math.min((video.duration || 9999) - 1, (video.currentTime || 0) + 10);
        resetInactivityTimer();
        showToast("» 10 сек");
      } else if (code === "ArrowUp" || key === "ArrowUp") {
        e.preventDefault();
        video.volume = Math.min(1, Math.round(((video.volume || 1) + 0.1) * 100) / 100);
        if (volumeSlider) volumeSlider.value = video.volume;
        resetInactivityTimer();
        showToast(`Громкость: ${Math.round(video.volume * 100)}%`);
      } else if (code === "ArrowDown" || key === "ArrowDown") {
        e.preventDefault();
        video.volume = Math.max(0, Math.round(((video.volume || 1) - 0.1) * 100) / 100);
        if (volumeSlider) volumeSlider.value = video.volume;
        resetInactivityTimer();
        showToast(`Громкость: ${Math.round(video.volume * 100)}%`);
      } else if (code === "KeyF" || key === "f" || key === "F" || key === "а" || key === "А") {
        e.preventDefault();
        fsBtn?.click();
      } else if (code === "KeyM" || key === "m" || key === "M" || key === "ь" || key === "Ь") {
        e.preventDefault();
        video.muted = !video.muted;
        showToast(video.muted ? "Звук отключен" : "Звук включен");
      } else if (code === "KeyN" || key === "n" || key === "N" || key === "т" || key === "Т") {
        e.preventDefault();
        doNextEpisode();
      } else if (code === "KeyP" || key === "p" || key === "P" || key === "з" || key === "З") {
        e.preventDefault();
        doPrevEpisode();
      } else if (code === "KeyS" || key === "s" || key === "S" || key === "ы" || key === "Ы" ||
                 code === "KeyO" || key === "o" || key === "O" || key === "щ" || key === "Щ") {
        e.preventDefault();
        doSkipOpening();
      }
    }

    if (state.__playerKeyHandler) {
      document.removeEventListener("keydown", state.__playerKeyHandler);
    }
    state.__playerKeyHandler = handlePlayerKeydown;
    document.addEventListener("keydown", handlePlayerKeydown);
  }

  // =========================================================================
  // 11. Global Instant Search Bar, Live Sync & Random Anime
  // =========================================================================
  function initGlobalSearch() {
    const input = document.getElementById("globalSearchInput");
    const dropdown = document.getElementById("searchDropdown");
    const wrapper = document.getElementById("searchWrapper");
    const clearBtn = document.getElementById("searchClearBtn");
    let timer = null;

    if (!input || !dropdown) return;

    function updateSearchUI() {
      const val = input.value.trim();
      wrapper?.classList.toggle("has-text", Boolean(val.length));
      clearBtn?.classList.toggle("hidden", !val.length);
    }

    clearBtn?.addEventListener("click", () => {
      input.value = "";
      updateSearchUI();
      dropdown.classList.add("hidden");
      input.focus();
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest("#searchWrapper")) {
        dropdown.classList.add("hidden");
      }
    });

    window.addEventListener("keydown", (e) => {
      if (
        e.key === "/" &&
        document.activeElement !== input &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)
      ) {
        e.preventDefault();
        input.focus();
      } else if (e.key === "Escape") {
        dropdown.classList.add("hidden");
      }
    });

    input.addEventListener("input", () => {
      updateSearchUI();
      const q = input.value.trim();
      clearTimeout(timer);
      if (q.length < 2) {
        dropdown.classList.add("hidden");
        return;
      }
      timer = setTimeout(async () => {
        try {
          let items = null;
          items = await fastFetchJson(`https://shikimori.io/api/animes?search=${encodeURIComponent(q)}&limit=10`, 1800);
          if (Array.isArray(items)) items = rerankSearchResultsClient(items, q).slice(0, 8);
          const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
          if (isLocal) {
            try {
              const res = await fetch(`/api/catalog?search=${encodeURIComponent(q)}&limit=8`);
              if (res.ok) {
                const data = await res.json();
                items = data.items || [];
              }
            } catch (_) {}
          }
          if (!items) {
            try {
              const shikiRes = await fetch(`https://shikimori.io/api/animes?search=${encodeURIComponent(q)}&limit=15`)
                .catch(() => fetch(`https://shikimori.io/api/animes?search=${encodeURIComponent(q)}&limit=15`));
              if (shikiRes && shikiRes.ok) {
                const raw = await shikiRes.json();
                items = rerankSearchResultsClient(raw, q).slice(0, 8);
              }
            } catch (_) {}
          }
          items = items || [];
          if (!items.length) {
            dropdown.innerHTML = `<div style="padding:14px; font-size:0.85rem; color:var(--text-secondary);">Ничего не найдено по запросу «${escapeHtml(q)}»</div>`;
          } else {
            dropdown.innerHTML =
              items
                .map(
                  (a) => `
                <div class="search-result-item" data-open-anime="${a.id}">
                  <img class="search-result-thumb" src="${escapeHtml(getPoster(a))}" alt="" />
                  <div class="search-result-info">
                    <div class="search-result-title">${escapeHtml(a.russian || a.name)}</div>
                    <div class="search-result-meta">
                      <span>${escapeHtml(KIND_LABELS[a.kind] || "Аниме")}</span>
                      <span>•</span>
                      <span>${escapeHtml(formatEpisodesBadge(a) || getYear(a))}</span>
                      ${a.score && parseFloat(a.score) > 0 ? `<span>•</span><span style="color:var(--gold-rating)">★ ${a.score}</span>` : ""}
                    </div>
                  </div>
                </div>
              `
                )
                .join("") +
              `<button class="btn-text" style="width:100%; padding:10px; text-align:center; border-top:1px solid var(--border-subtle); margin-top:4px;" data-search-all="${escapeHtml(q)}">Показать все результаты в каталоге LumaAnime →</button>`;
          }
          dropdown.classList.remove("hidden");
        } catch (_) {}
      }, 120);
    });

    document.addEventListener("click", (e) => {
      if (!document.getElementById("searchWrapper")?.contains(e.target)) {
        dropdown.classList.add("hidden");
      }
    });
  }

  // =========================================================================
  // 12. Theme Toggle, Phone Connection & Global Delegated Click Listeners
  // =========================================================================
  function initLumaUserSync() {
    loadUserData();
  }

  function initTheme() {
    const saved = localStorage.getItem("luma_theme") || "dark";
    document.documentElement.setAttribute("data-theme", saved);

    document.getElementById("themeToggleBtn")?.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "dark";
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("luma_theme", next);
    });
  }

  function initGlobalDelegation() {
    document.body.addEventListener("click", async (e) => {
      const navBtn = e.target.closest("[data-nav]");
      if (navBtn) {
        e.preventDefault();
        switchView(navBtn.dataset.nav);
        return;
      }

      const animeTrigger = e.target.closest("[data-anime-id], [data-open-anime]");
      if (animeTrigger) {
        const id = animeTrigger.dataset.openAnime || animeTrigger.dataset.animeId;
        if (id) {
          document.getElementById("searchDropdown")?.classList.add("hidden");
          openAnimeDetail(id);
          return;
        }
      }

      const freshCard = e.target.closest("[data-fresh-shiki]");
      if (freshCard) {
        const shikiId = freshCard.dataset.freshShiki;
        const title = freshCard.dataset.freshTitle;
        if (shikiId && shikiId !== "None") {
          openAnimeDetail(shikiId);
        } else if (title) {
          state.catalog.search = title;
          document.getElementById("catalogSearchInput").value = title;
          switchView("catalog");
        }
        return;
      }

      const heroThumb = e.target.closest("[data-hero-idx]");
      if (heroThumb) {
        renderHeroSpotlight(Number(heroThumb.dataset.heroIdx));
        startHeroRotation();
        return;
      }

      // Rotating Anime Banners Controls
      const bannerPrev = e.target.closest("#animeBannerPrevBtn");
      if (bannerPrev) {
        renderAnimeBanners(state.animeBannerPage - 1);
        startAnimeBannerRotation();
        return;
      }

      const bannerNext = e.target.closest("#animeBannerNextBtn");
      if (bannerNext) {
        renderAnimeBanners(state.animeBannerPage + 1);
        startAnimeBannerRotation();
        return;
      }

      const bannerDot = e.target.closest("[data-banner-page]");
      if (bannerDot) {
        renderAnimeBanners(Number(bannerDot.dataset.bannerPage));
        startAnimeBannerRotation();
        return;
      }

      // Panoramic Mid-Page Showcase Dots
      const showcaseDot = e.target.closest("[data-showcase-dot]");
      if (showcaseDot) {
        renderWideShowcaseBanner(Number(showcaseDot.dataset.showcaseDot));
        startWideShowcaseRotation();
        return;
      }

      const quickBm = e.target.closest("[data-quick-bookmark]");
      if (quickBm) {
        const id = quickBm.dataset.quickBookmark;
        const item = state.heroItems.find((h) => String(h.id) === String(id));
        if (item) {
          if (state.library[id]) {
            delete state.library[id];
            saveLibrary();
            showToast(`Удалено из коллекции: ${item.russian || item.name}`);
          } else {
            state.library[id] = {
              id: item.id,
              russian: item.russian,
              name: item.name,
              poster_url: getPoster(item),
              score: item.score,
              kind: item.kind,
              status: "planned",
              aired_on: item.aired_on,
              episodes: item.episodes,
              real_episodes_aired: item.real_episodes_aired,
              real_episodes_total: item.real_episodes_total,
            };
            saveLibrary();
            showToast(`Добавлено в «В планах»: ${item.russian || item.name}`);
          }
          renderHeroSpotlight(state.heroIndex);
        }
        return;
      }

      const homeGenreTab = e.target.closest("[data-home-genre-tab]");
      if (homeGenreTab) {
        document
          .querySelectorAll("[data-home-genre-tab]")
          .forEach((b) => b.classList.toggle("active", b === homeGenreTab));
        loadHomeGenreShowcase(homeGenreTab.dataset.homeGenreTab);
        return;
      }

      const quickGenre = e.target.closest("[data-quick-genre]");
      if (quickGenre) {
        e.preventDefault();
        const gid = quickGenre.dataset.quickGenre;
        state.catalog.selectedGenres = new Set([String(gid)]);
        state.catalog.page = 1;
        syncCatalogGenreChips();
        switchView("catalog");
        return;
      }

      const catGenreChip = e.target.closest("[data-cat-genre]");
      if (catGenreChip) {
        const gid = catGenreChip.dataset.catGenre;
        if (state.catalog.selectedGenres.has(gid)) {
          state.catalog.selectedGenres.delete(gid);
        } else {
          state.catalog.selectedGenres.add(gid);
        }
        state.catalog.page = 1;
        syncCatalogGenreChips();
        loadCatalogResults();
        return;
      }

      const goCat = e.target.closest("[data-go-catalog]");
      if (goCat) {
        const preset = goCat.dataset.goCatalog;
        if (preset === "ongoing") {
          state.catalog.status = "ongoing";
          state.catalog.order = "popularity";
          document.getElementById("catalogStatusSelect").value = "ongoing";
          document.getElementById("catalogSortSelect").value = "popularity";
        } else if (preset === "ranked") {
          state.catalog.status = "";
          state.catalog.order = "ranked";
          document.getElementById("catalogStatusSelect").value = "";
          document.getElementById("catalogSortSelect").value = "ranked";
        }
        ["catalogStatusSelect", "catalogSortSelect"].forEach((id) => {
          const s = document.getElementById(id);
          if (s && s._refreshLumaDropdown) s._refreshLumaDropdown();
        });
        state.catalog.page = 1;
        switchView("catalog");
        return;
      }

      const searchAll = e.target.closest("[data-search-all]");
      if (searchAll) {
        const q = searchAll.dataset.searchAll;
        document.getElementById("searchDropdown")?.classList.add("hidden");
        state.catalog.search = q;
        document.getElementById("catalogSearchInput").value = q;
        state.catalog.page = 1;
        switchView("catalog");
        return;
      }

      const moodBtn = e.target.closest("[data-mood-id]");
      if (moodBtn) {
        document.querySelectorAll("[data-mood-id]").forEach((b) => b.classList.toggle("active", b === moodBtn));
        const found = MOOD_CAPSULES.find((m) => m.id === moodBtn.dataset.moodId);
        if (found) loadMoodRecommendations(found);
        return;
      }

      const recGenreTab = e.target.closest("[data-rec-genre-tab]");
      if (recGenreTab) {
        document
          .querySelectorAll("[data-rec-genre-tab]")
          .forEach((b) => b.classList.toggle("active", b === recGenreTab));
        loadRecGenreExplorer(recGenreTab.dataset.recGenreTab);
        return;
      }

      const libTab = e.target.closest("[data-lib-tab]");
      if (libTab) {
        renderLibraryView(libTab.dataset.libTab);
        return;
      }
    });

    document.getElementById("clearHistoryBtn")?.addEventListener("click", () => {
      state.watchHistory = [];
      saveWatchHistory();
      renderContinueWatching();
      showToast("История просмотра очищена");
    });

    // Live Sync Button in Header
    document.getElementById("liveSyncBtn")?.addEventListener("click", async () => {
      const icon = document.getElementById("liveSyncIcon");
      icon?.classList.add("spinning");
      showToast("Синхронизация новых серий в реальном времени...");
      if (state.currentView === "anime" && state.currentAnimeDetail?.anime?.id) {
        await openAnimeDetail(state.currentAnimeDetail.anime.id, true);
      } else {
        await initHomeView(true);
      }
      setTimeout(() => icon?.classList.remove("spinning"), 700);
      showToast("База серий LumaAnime актуальна!");
    });

    document.getElementById("randomAnimeBtn")?.addEventListener("click", async () => {
      showToast("Подбираем случайное аниме с высоким рейтингом...");
      try {
        const res = await fetch("/api/random");
        const data = await res.json();
        const first = (data.items || [])[0];
        if (first && first.id) {
          openAnimeDetail(first.id);
        }
      } catch (_) {}
    });
  }

  // =========================================================================
  // 13. Bootstrap Application
  // =========================================================================
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initLumaUserSync();
    updateLibraryBadge();
    initCatalogControls();
    initGlobalSearch();
    initGlobalDelegation();
    initHomeView();

    function handleRoute(hashStr) {
      const hash = (hashStr || window.location.hash).replace(/^#/, "");
      if (hash.startsWith("anime/")) {
        const id = hash.split("anime/")[1];
        if (id && (!state.currentAnimeDetail || String(state.currentAnimeDetail.anime?.id) !== String(id))) {
          openAnimeDetail(id);
        }
      } else if (["catalog", "recommendations", "schedule", "library"].includes(hash)) {
        switchView(hash, false);
      } else if (!hash || hash === "home") {
        switchView("home", false);
      }
    }

    handleRoute(window.location.hash);
    window.addEventListener("hashchange", () => handleRoute(window.location.hash));
  });
})();
