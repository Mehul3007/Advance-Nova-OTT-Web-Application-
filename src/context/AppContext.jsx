import { useState, useEffect, useContext, createContext, useCallback } from "react";
import supabase from "../lib/supabase";
import { UI_STRINGS } from "../constants/languages";
import { C } from "../constants/theme";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  // ── CONTENT STATE ────────────────────────────────────────────
  const [allContent, setAllContent] = useState([]);
  const [contentLoading, setContentLoading] = useState(true);

  // ── USER STATE ───────────────────────────────────────────────
  const [watchlist, setWatchlist] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [watchHistory, setWatchHistory] = useState([]);
  const [ratings, setRatings] = useState({});
  const [continueWatching, setContinueWatching] = useState([]);

  // ── UI STATE ─────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState("home");
  const [selectedContent, setSelectedContent] = useState(null);
  const [notification, setNotification] = useState(null);
  const [authModal, setAuthModal] = useState(null);
  const [playerContent, setPlayerContent] = useState(null);
  const [uiLang, setUiLang] = useState("en");
  const [dbLoading, setDbLoading] = useState(false);

  const t = (key) => (UI_STRINGS[uiLang] || UI_STRINGS.en)[key] || key;

  const showNotification = useCallback((msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // ── FETCH ALL CONTENT FROM SUPABASE ─────────────────────────
  const fetchContent = useCallback(async () => {
    setContentLoading(true);
    try {
      const db = await supabase.from("content");
      const data = await db.select("*");
      if (Array.isArray(data) && data.length > 0) {
        // Map snake_case DB fields to camelCase for frontend
        const mapped = data.map((item) => ({
          id: item.id,
          title: item.title,
          type: item.type,
          genre: item.genre,
          genres: item.genres || [],
          year: item.year,
          rating: item.rating,
          duration: item.duration,
          seasons: item.seasons,
          episodes: item.episodes,
          language: item.language,
          thumb: item.thumb_url,        // thumb_url → thumb
          banner: item.banner_url,      // banner_url → banner
          tags: item.tags || [],
          description: item.description,
          cast: item.cast_members || [], // cast_members → cast
          director: item.director,
          age: item.age_rating,          // age_rating → age
          isTrending: item.is_trending,
          isTop10: item.is_top10,
          youtubeId: item.youtube_id,    // youtube_id → youtubeId ✅
          createdAt: item.created_at,
        }));
        setAllContent(mapped);
      }
    } catch (err) {
      console.error("Content fetch error:", err);
      showNotification("Failed to load content", "error");
    } finally {
      setContentLoading(false);
    }
  }, [showNotification]);

  // ── DERIVED CONTENT LISTS ────────────────────────────────────
  const movies = allContent.filter((c) => c.type === "movie");
  const series = allContent.filter((c) => c.type === "series");
  const trendingContent = allContent.filter((c) => c.isTrending);
  const top10Content = allContent.filter((c) => c.isTop10);

  const getContentById = (id) => allContent.find((c) => c.id === id) || null;

  const getContentByLanguage = (lang) =>
    allContent.filter((c) => c.language.toLowerCase() === lang.toLowerCase());

  const getContentByGenre = (genre) =>
    allContent.filter(
      (c) =>
        c.genre.toLowerCase() === genre.toLowerCase() ||
        c.genres.some((g) => g.toLowerCase() === genre.toLowerCase())
    );

  // ── AUTH ────────────────────────────────────────────────────
  const dbSignUp = async (email, password, displayName) => {
    setDbLoading(true);
    try {
      const { data, error } = await supabase.signUp(email, password, {
        display_name: displayName,
      });
      if (error) {
        showNotification(error, "error");
        return false;
      }
      if (!data.access_token) {
        localStorage.setItem(
          "nova_pending_profile",
          JSON.stringify({
            email,
            displayName,
            avatar_seed: Math.random().toString(36).slice(2),
          })
        );
        setAuthModal(null);
        showNotification(
          "✉️ Verification link sent! Check your email and click the link to activate your account.",
          "warn"
        );
        return true;
      }
      const token = data.access_token;
      setAccessToken(token);
      localStorage.setItem("nova_token", token);
      if (data.refresh_token)
        localStorage.setItem("nova_refresh", data.refresh_token);
      const userInfo = data.user || (await supabase.getUser(token));
      if (userInfo && userInfo.id) {
        setUser(userInfo);
        try {
          const db = await supabase.from("user_profiles", token);
          await db.upsert({
            id: userInfo.id,
            display_name: displayName,
            avatar_seed: Math.random().toString(36).slice(2),
            plan: "free",
            language: "en",
          });
        } catch {}
        await loadUserProfile(userInfo.id, token);
        setAuthModal(null);
        showNotification("🎉 Welcome to NOVA! Start watching now.");
      }
      return true;
    } catch {
      showNotification("Network error — please try again", "error");
      return false;
    } finally {
      setDbLoading(false);
    }
  };

  const dbLogin = async (email, password) => {
    setDbLoading(true);
    try {
      const { data, error } = await supabase.signIn(email, password);
      if (error) {
        showNotification(error, "error");
        return { ok: false, error };
      }
      const token = data.access_token;
      setAccessToken(token);
      localStorage.setItem("nova_token", token);
      if (data.refresh_token)
        localStorage.setItem("nova_refresh", data.refresh_token);
      const userInfo = await supabase.getUser(token);
      if (!userInfo) {
        showNotification("Could not fetch user info", "error");
        return { ok: false, error: "Could not fetch user info" };
      }
      setUser(userInfo);
      const pendingRaw = localStorage.getItem("nova_pending_profile");
      if (pendingRaw) {
        try {
          const pending = JSON.parse(pendingRaw);
          const db = await supabase.from("user_profiles", token);
          await db.upsert({
            id: userInfo.id,
            display_name: pending.displayName,
            avatar_seed:
              pending.avatar_seed || Math.random().toString(36).slice(2),
            plan: "free",
            language: "en",
          });
          localStorage.removeItem("nova_pending_profile");
        } catch {}
      }
      await loadUserProfile(userInfo.id, token);
      setAuthModal(null);
      showNotification("Welcome back! 🎬");
      return { ok: true };
    } catch {
      const msg = "Network error — please try again";
      showNotification(msg, "error");
      return { ok: false, error: msg };
    } finally {
      setDbLoading(false);
    }
  };

  const loadUserProfile = async (userId, token) => {
    try {
      const db = await supabase.from("user_profiles", token);
      const data = await db.select("*", `&id=eq.${userId}`);
      if (Array.isArray(data) && data[0]) {
        setProfile(data[0]);
        if (data[0].language) setUiLang(data[0].language);
      }
      const wlDb = await supabase.from("watchlist", token);
      const wlData = await wlDb.select("content_id", `&user_id=eq.${userId}`);
      if (Array.isArray(wlData)) setWatchlist(wlData.map((r) => r.content_id));

      const favDb = await supabase.from("favorites", token);
      const favData = await favDb.select(
        "content_id",
        `&user_id=eq.${userId}`
      );
      if (Array.isArray(favData))
        setFavorites(favData.map((r) => r.content_id));

      const histDb = await supabase.from("watch_history", token);
      const histData = await histDb.select(
        "content_id,progress,last_watched",
        `&user_id=eq.${userId}&order=last_watched.desc&limit=20`
      );
      if (Array.isArray(histData)) {
        setWatchHistory(histData.map((r) => r.content_id));
        setContinueWatching(
          histData
            .filter((r) => r.progress > 0 && r.progress < 100)
            .map((r) => ({
              id: r.content_id,
              progress: r.progress,
              lastWatched: r.last_watched
                ? new Date(r.last_watched).toLocaleDateString()
                : "Recently",
            }))
        );
      }
      const ratingsDb = await supabase.from("ratings", token);
      const ratingsData = await ratingsDb.select(
        "content_id,rating",
        `&user_id=eq.${userId}`
      );
      if (Array.isArray(ratingsData)) {
        const ratingsMap = {};
        ratingsData.forEach((r) => {
          ratingsMap[r.content_id] = r.rating;
        });
        setRatings(ratingsMap);
      }
    } catch {}
  };

  const dbLogout = async () => {
    if (accessToken) {
      try {
        await supabase.signOut(accessToken);
      } catch {}
    }
    localStorage.removeItem("nova_token");
    localStorage.removeItem("nova_refresh");
    setUser(null);
    setProfile(null);
    setAccessToken(null);
    setWatchlist([]);
    setFavorites([]);
    setWatchHistory([]);
    setContinueWatching([]);
    setCurrentPage("home");
    showNotification("Logged out successfully");
  };

  // ── USER ACTIONS ─────────────────────────────────────────────
  const toggleWatchlist = async (id) => {
    const newList = watchlist.includes(id)
      ? watchlist.filter((x) => x !== id)
      : [...watchlist, id];
    setWatchlist(newList);
    showNotification(
      watchlist.includes(id) ? "Removed from Watchlist" : "Added to Watchlist ✓"
    );
    if (user && accessToken) {
      try {
        const db = await supabase.from("watchlist", accessToken);
        if (watchlist.includes(id))
          await db.delete({ user_id: user.id, content_id: id });
        else await db.upsert({ user_id: user.id, content_id: id });
      } catch {}
    }
  };

  const toggleFavorite = async (id) => {
    const newList = favorites.includes(id)
      ? favorites.filter((x) => x !== id)
      : [...favorites, id];
    setFavorites(newList);
    showNotification(
      favorites.includes(id) ? "Removed from Favorites" : "Added to Favorites ♥"
    );
    if (user && accessToken) {
      try {
        const db = await supabase.from("favorites", accessToken);
        if (favorites.includes(id))
          await db.delete({ user_id: user.id, content_id: id });
        else await db.upsert({ user_id: user.id, content_id: id });
      } catch {}
    }
  };

  const rateContent = async (id, r) => {
    setRatings((prev) => ({ ...prev, [id]: r }));
    showNotification(`Rated ${r} ★`);
    if (user && accessToken) {
      try {
        const db = await supabase.from("ratings", accessToken);
        await db.upsert({ user_id: user.id, content_id: id, rating: r });
      } catch {}
    }
  };

  const playContent = async (content) => {
    if (!user) {
      setAuthModal("login");
      return;
    }
    setPlayerContent(content);
    setCurrentPage("player");
    const exists = continueWatching.find((x) => x.id === content.id);
    if (!exists)
      setContinueWatching((prev) =>
        [
          { id: content.id, progress: 0, lastWatched: "Just now" },
          ...prev,
        ].slice(0, 6)
      );
    if (!watchHistory.includes(content.id))
      setWatchHistory((prev) => [content.id, ...prev]);
    if (user && accessToken) {
      try {
        const db = await supabase.from("watch_history", accessToken);
        await db.upsert({
          user_id: user.id,
          content_id: content.id,
          progress: exists?.progress || 0,
        });
      } catch {}
    }
  };

  const updateProgress = async (contentId, progress) => {
    setContinueWatching((prev) =>
      prev.map((x) => (x.id === contentId ? { ...x, progress } : x))
    );
    if (user && accessToken) {
      try {
        const db = await supabase.from("watch_history", accessToken);
        await db.upsert({
          user_id: user.id,
          content_id: contentId,
          progress,
          last_watched: new Date().toISOString(),
        });
      } catch {}
    }
  };

  // ── RAZORPAY ─────────────────────────────────────────────────
  const initPayment = async (plan) => {
    if (!user) {
      setAuthModal("login");
      return;
    }
    const loaded = await supabase.loadRazorpay();
    if (!loaded) {
      showNotification("Payment gateway unavailable", "error");
      return;
    }
    const planConfig = {
      Premium: { amount: 49900, name: "Premium Plan" },
      Family: { amount: 79900, name: "Family Plan" },
    };
    const config = planConfig[plan];
    if (!config) return;
    const options = {
      key: "YOUR_RAZORPAY_KEY_ID",
      amount: config.amount,
      currency: "INR",
      name: "NOVA OTT",
      description: config.name,
      image: "https://picsum.photos/seed/logo/64/64",
      prefill: {
        email: user.email,
        name:
          profile?.display_name ||
          user.user_metadata?.display_name ||
          "User",
      },
      theme: { color: C.accent },
      handler: async (response) => {
        showNotification(`🎉 Subscribed to ${plan} Plan!`);
        setProfile((prev) => ({ ...prev, plan }));
        if (user && accessToken) {
          try {
            const db = await supabase.from("subscriptions", accessToken);
            await db.upsert({
              user_id: user.id,
              plan,
              status: "active",
              razorpay_subscription_id: response.razorpay_payment_id,
              current_period_end: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000
              ).toISOString(),
            });
          } catch {}
        }
      },
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  // ── SESSION RESTORE + CONTENT FETCH ON MOUNT ─────────────────
  useEffect(() => {
    // Fetch content from Supabase immediately on app load
    fetchContent();

    const restoreSession = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        const params = new URLSearchParams(hash.replace("#", "?"));
        const token = params.get("access_token");
        const refresh = params.get("refresh_token");
        if (token) {
          window.history.replaceState(null, "", window.location.pathname);
          localStorage.setItem("nova_token", token);
          if (refresh) localStorage.setItem("nova_refresh", refresh);
          setAccessToken(token);
          try {
            const userInfo = await supabase.getUser(token);
            if (userInfo && !userInfo.error) {
              setUser(userInfo);
              const pendingRaw = localStorage.getItem("nova_pending_profile");
              if (pendingRaw) {
                try {
                  const pending = JSON.parse(pendingRaw);
                  const db = await supabase.from("user_profiles", token);
                  await db.upsert({
                    id: userInfo.id,
                    display_name: pending.displayName,
                    avatar_seed:
                      pending.avatar_seed ||
                      Math.random().toString(36).slice(2),
                    plan: "free",
                    language: "en",
                  });
                  localStorage.removeItem("nova_pending_profile");
                } catch {}
              }
              await loadUserProfile(userInfo.id, token);
              showNotification("🎉 Email verified! Welcome to NOVA!");
            }
          } catch {}
          return;
        }
      }
      const stored = localStorage.getItem("nova_token");
      if (!stored) return;
      try {
        const userInfo = await supabase.getUser(stored);
        if (userInfo && userInfo.id) {
          setAccessToken(stored);
          setUser(userInfo);
          await loadUserProfile(userInfo.id, stored);
        } else {
          localStorage.removeItem("nova_token");
        }
      } catch {
        localStorage.removeItem("nova_token");
      }
    };

    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveLanguagePreference = async (code) => {
    setUiLang(code);
    if (user && accessToken) {
      try {
        const db = await supabase.from("user_profiles", accessToken);
        await db.update({ language: code }, { id: user.id });
      } catch {}
    }
  };

  return (
    <AppContext.Provider
      value={{
        // Auth
        user, profile, setProfile, dbLoading,
        dbLogin, dbSignUp, dbLogout,

        // Content from Supabase ✅
        allContent, contentLoading, fetchContent,
        movies, series, trendingContent, top10Content,
        getContentById, getContentByLanguage, getContentByGenre,

        // User data
        watchlist, favorites, watchHistory, ratings, continueWatching,

        // UI
        currentPage, setCurrentPage,
        selectedContent, setSelectedContent,
        notification, showNotification,
        authModal, setAuthModal,
        playerContent, setPlayerContent,
        uiLang, setUiLang: saveLanguagePreference, t,

        // Actions
        toggleWatchlist, toggleFavorite, rateContent,
        playContent, updateProgress, initPayment,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);