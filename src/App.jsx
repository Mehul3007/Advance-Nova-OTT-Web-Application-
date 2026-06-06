// ============================================================
// NOVA OTT PRO — Full-Stack Streaming Platform
// Features: Supabase Auth/DB, Indian Languages, AI Recommendations,
//           Watch History, User Profiles, Subscription/Payment
// ============================================================

import { useState, useEffect, useContext, createContext, useRef, useCallback } from "react";

// ─── SUPABASE CONFIG ──────────────────────────────────────────
// Replace with your actual Supabase project URL and anon key
const SUPABASE_URL = "https://oaljtmquzkpevsvknzgf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_3Ctzj6rxDisbiAQwn6vYWw_CJylOEk5";

// Lightweight Supabase client (no npm required for browser/React)
const supabase = {
  _headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },

  async signUp(email, password, metadata = {}) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST", headers: this._headers,
      body: JSON.stringify({ email, password, data: metadata }),
    });
    return r.json();
  },
  async signIn(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST", headers: this._headers,
      body: JSON.stringify({ email, password }),
    });
    return r.json();
  },
  async signOut(token) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST", headers: { ...this._headers, "Authorization": `Bearer ${token}` },
    });
  },
  async getUser(token) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { ...this._headers, "Authorization": `Bearer ${token}` },
    });
    return r.json();
  },

  // Generic REST DB query helper
  async from(table, token) {
    const auth = token ? { "Authorization": `Bearer ${token}` } : {};
    return {
      _table: table, _token: token, _authHeaders: { ...this._headers, ...auth },
      async select(columns = "*", filters = "") {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${columns}${filters}`, { headers: this._authHeaders });
        return r.json();
      },
      async upsert(data) {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
          method: "POST",
          headers: { ...this._authHeaders, "Prefer": "resolution=merge-duplicates" },
          body: JSON.stringify(data),
        });
        return r.status < 300 ? { error: null } : { error: await r.json() };
      },
      async update(data, match) {
        const q = Object.entries(match).map(([k, v]) => `${k}=eq.${v}`).join("&");
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`, {
          method: "PATCH", headers: this._authHeaders,
          body: JSON.stringify(data),
        });
        return r.status < 300 ? { error: null } : { error: await r.json() };
      },
      async delete(match) {
        const q = Object.entries(match).map(([k, v]) => `${k}=eq.${v}`).join("&");
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`, {
          method: "DELETE", headers: this._authHeaders,
        });
        return r.status < 300 ? { error: null } : { error: await r.json() };
      },
    };
  },

  // Payments (Razorpay integration helper)
  loadRazorpay() {
    return new Promise(resolve => {
      if (window.Razorpay) { resolve(true); return; }
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });
  },
};

// ─── SUPABASE TABLES SCHEMA (for reference) ───────────────────
/*
-- Run these in Supabase SQL editor:

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_seed TEXT,
  plan TEXT DEFAULT 'free',
  language TEXT DEFAULT 'en',
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE watch_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id INT NOT NULL,
  progress INT DEFAULT 0,
  last_watched TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, content_id)
);

CREATE TABLE watchlist (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id INT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, content_id)
);

CREATE TABLE favorites (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id INT NOT NULL,
  UNIQUE(user_id, content_id)
);

CREATE TABLE ratings (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id INT NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  UNIQUE(user_id, content_id)
);

CREATE TABLE subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  razorpay_subscription_id TEXT,
  status TEXT DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only see their own data)
CREATE POLICY "Users manage own profile" ON user_profiles USING (auth.uid() = id);
CREATE POLICY "Users manage own history" ON watch_history USING (auth.uid() = user_id);
CREATE POLICY "Users manage own watchlist" ON watchlist USING (auth.uid() = user_id);
CREATE POLICY "Users manage own favorites" ON favorites USING (auth.uid() = user_id);
CREATE POLICY "Users manage own ratings" ON ratings USING (auth.uid() = user_id);
CREATE POLICY "Users manage own subscription" ON subscriptions USING (auth.uid() = user_id);
*/

// ─── INDIAN LANGUAGES ─────────────────────────────────────────
const LANGUAGES = [
  { code: "en",    name: "English",    native: "English",   flag: "🇬🇧" },
  { code: "hi",    name: "Hindi",      native: "हिन्दी",      flag: "🇮🇳" },
  { code: "ta",    name: "Tamil",      native: "தமிழ்",       flag: "🏳️" },
  { code: "te",    name: "Telugu",     native: "తెలుగు",       flag: "🏳️" },
  { code: "ml",    name: "Malayalam",  native: "മലയാളം",     flag: "🏳️" },
  { code: "kn",    name: "Kannada",    native: "ಕನ್ನಡ",        flag: "🏳️" },
  { code: "mr",    name: "Marathi",    native: "मराठी",        flag: "🏳️" },
  { code: "bn",    name: "Bengali",    native: "বাংলা",        flag: "🏳️" },
  { code: "gu",    name: "Gujarati",   native: "ગુજરાતી",     flag: "🏳️" },
  { code: "pa",    name: "Punjabi",    native: "ਪੰਜਾਬੀ",      flag: "🏳️" },
];

const UI_STRINGS = {
  en: { home: "Home", movies: "Movies", series: "Series", watchlist: "Watchlist", profile: "Profile", login: "Login", signup: "Sign Up", signout: "Sign Out", search: "Search…", trending: "Trending Now", newReleases: "New Releases", recommended: "Recommended For You", continueWatching: "Continue Watching", settings: "Settings", subscription: "Subscription", language: "Language", plan: "Plan", watchNow: "Watch Now", moreInfo: "More Info", addWatchlist: "Add to Watchlist", chooseplan: "Choose Your Plan" },
  hi: { home: "होम", movies: "फ़िल्में", series: "सीरीज़", watchlist: "वॉचलिस्ट", profile: "प्रोफ़ाइल", login: "लॉगिन", signup: "साइन अप", signout: "साइन आउट", search: "खोजें…", trending: "ट्रेंडिंग", newReleases: "नई फ़िल्में", recommended: "आपके लिए अनुशंसित", continueWatching: "देखना जारी रखें", settings: "सेटिंग्स", subscription: "सदस्यता", language: "भाषा", plan: "प्लान", watchNow: "अभी देखें", moreInfo: "अधिक जानकारी", addWatchlist: "वॉचलिस्ट में जोड़ें", chooseplan: "अपना प्लान चुनें" },
  ta: { home: "முகப்பு", movies: "திரைப்படங்கள்", series: "தொடர்கள்", watchlist: "பார்வை பட்டியல்", profile: "சுயவிவரம்", login: "உள்நுழை", signup: "பதிவு செய்", signout: "வெளியேறு", search: "தேடு…", trending: "டிரெண்டிங்", newReleases: "புதிய வெளியீடுகள்", recommended: "உங்களுக்கான பரிந்துரை", continueWatching: "தொடர்ந்து பார்க்கவும்", settings: "அமைப்புகள்", subscription: "சந்தா", language: "மொழி", plan: "திட்டம்", watchNow: "இப்போது பாருங்கள்", moreInfo: "மேலும் தகவல்", addWatchlist: "பார்வை பட்டியலில் சேர்", chooseplan: "உங்கள் திட்டத்தை தேர்வு செய்யுங்கள்" },
  te: { home: "హోమ్", movies: "సినిమాలు", series: "సీరీస్", watchlist: "వాచ్‌లిస్ట్", profile: "ప్రొఫైల్", login: "లాగిన్", signup: "సైన్ అప్", signout: "సైన్ అవుట్", search: "వెతుకు…", trending: "ట్రెండింగ్", newReleases: "కొత్త విడుదలలు", recommended: "మీకు సిఫారసు చేయబడింది", continueWatching: "చూడడం కొనసాగించు", settings: "సెట్టింగ్స్", subscription: "సభ్యత్వం", language: "భాష", plan: "ప్లాన్", watchNow: "ఇప్పుడు చూడండి", moreInfo: "మరింత సమాచారం", addWatchlist: "వాచ్‌లిస్ట్‌కు జోడించు", chooseplan: "మీ ప్లాన్ ఎంచుకోండి" },
  ml: { home: "ഹോം", movies: "ചലച്ചിത്രങ്ങൾ", series: "പരമ്പരകൾ", watchlist: "വാച്ച്‌ലിസ്റ്റ്", profile: "പ്രൊഫൈൽ", login: "ലോഗിൻ", signup: "സൈൻ അപ്പ്", signout: "സൈൻ ഔട്ട്", search: "തിരയുക…", trending: "ട്രെൻഡിങ്", newReleases: "പുതിയ റിലീസുകൾ", recommended: "നിങ്ങൾക്കായി ശുപാർശ ചെയ്തത്", continueWatching: "കാണൽ തുടരുക", settings: "ക്രമീകരണങ്ങൾ", subscription: "സബ്‌സ്‌ക്രിപ്ഷൻ", language: "ഭാഷ", plan: "പ്ലാൻ", watchNow: "ഇപ്പോൾ കാണുക", moreInfo: "കൂടുതൽ വിവരങ്ങൾ", addWatchlist: "വാച്ച്‌ലിസ്റ്റിൽ ചേർക്കുക", chooseplan: "നിങ്ങളുടെ പ്ലാൻ തിരഞ്ഞെടുക്കുക" },
  kn: { home: "ಮುಖಪುಟ", movies: "ಚಲನಚಿತ್ರಗಳು", series: "ಸರಣಿ", watchlist: "ವಾಚ್‌ಲಿಸ್ಟ್", profile: "ಪ್ರೊಫೈಲ್", login: "ಲಾಗಿನ್", signup: "ಸೈನ್ ಅಪ್", signout: "ಸೈನ್ ಔಟ್", search: "ಹುಡುಕು…", trending: "ಟ್ರೆಂಡಿಂಗ್", newReleases: "ಹೊಸ ಬಿಡುಗಡೆಗಳು", recommended: "ನಿಮಗಾಗಿ ಶಿಫಾರಸು", continueWatching: "ವೀಕ್ಷಣೆ ಮುಂದುವರಿಸಿ", settings: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು", subscription: "ಚಂದಾದಾರಿಕೆ", language: "ಭಾಷೆ", plan: "ಯೋಜನೆ", watchNow: "ಈಗ ವೀಕ್ಷಿಸಿ", moreInfo: "ಹೆಚ್ಚಿನ ಮಾಹಿತಿ", addWatchlist: "ವಾಚ್‌ಲಿಸ್ಟ್‌ಗೆ ಸೇರಿಸಿ", chooseplan: "ನಿಮ್ಮ ಯೋಜನೆ ಆಯ್ಕೆಮಾಡಿ" },
  mr: { home: "मुखपृष्ठ", movies: "चित्रपट", series: "मालिका", watchlist: "वॉचलिस्ट", profile: "प्रोफाइल", login: "लॉगिन", signup: "साइन अप", signout: "साइन आउट", search: "शोधा…", trending: "ट्रेंडिंग", newReleases: "नवीन प्रकाशने", recommended: "तुमच्यासाठी शिफारस", continueWatching: "पाहणे सुरू ठेवा", settings: "सेटिंग्ज", subscription: "सदस्यता", language: "भाषा", plan: "प्लान", watchNow: "आता पहा", moreInfo: "अधिक माहिती", addWatchlist: "वॉचलिस्टमध्ये जोडा", chooseplan: "तुमचा प्लान निवडा" },
  bn: { home: "হোম", movies: "চলচ্চিত্র", series: "সিরিজ", watchlist: "ওয়াচলিস্ট", profile: "প্রোফাইল", login: "লগইন", signup: "সাইন আপ", signout: "সাইন আউট", search: "খুঁজুন…", trending: "ট্রেন্ডিং", newReleases: "নতুন মুক্তি", recommended: "আপনার জন্য প্রস্তাবিত", continueWatching: "দেখা চালিয়ে যান", settings: "সেটিংস", subscription: "সাবস্ক্রিপশন", language: "ভাষা", plan: "প্ল্যান", watchNow: "এখন দেখুন", moreInfo: "আরও তথ্য", addWatchlist: "ওয়াচলিস্টে যোগ করুন", chooseplan: "আপনার পরিকল্পনা বেছে নিন" },
  gu: { home: "હોમ", movies: "ફિલ્મો", series: "સીરિઝ", watchlist: "વૉચલિસ્ટ", profile: "પ્રોફાઇલ", login: "લોગિન", signup: "સાઇન અપ", signout: "સાઇન આઉટ", search: "શોધો…", trending: "ટ્રેન્ડિંગ", newReleases: "નવા પ્રકાશનો", recommended: "તમારા માટે ભલામણ", continueWatching: "જોવાનું ચાલુ રાખો", settings: "સેટિંગ્સ", subscription: "સબ્સ્ક્રિપ્શન", language: "ભાષા", plan: "પ્લાન", watchNow: "હવે જુઓ", moreInfo: "વધુ માહિતી", addWatchlist: "વૉચલિસ્ટમાં ઉમેરો", chooseplan: "તમારી યોજના પસંદ કરો" },
  pa: { home: "ਹੋਮ", movies: "ਫਿਲਮਾਂ", series: "ਸੀਰੀਜ਼", watchlist: "ਵਾਚਲਿਸਟ", profile: "ਪ੍ਰੋਫਾਈਲ", login: "ਲੌਗਇਨ", signup: "ਸਾਈਨ ਅੱਪ", signout: "ਸਾਈਨ ਆਉਟ", search: "ਖੋਜੋ…", trending: "ਟ੍ਰੈਂਡਿੰਗ", newReleases: "ਨਵੀਆਂ ਰਿਲੀਜ਼", recommended: "ਤੁਹਾਡੇ ਲਈ ਸਿਫਾਰਸ਼", continueWatching: "ਦੇਖਣਾ ਜਾਰੀ ਰੱਖੋ", settings: "ਸੈਟਿੰਗਾਂ", subscription: "ਸਬਸਕ੍ਰਿਪਸ਼ਨ", language: "ਭਾਸ਼ਾ", plan: "ਪਲਾਨ", watchNow: "ਹੁਣੇ ਦੇਖੋ", moreInfo: "ਹੋਰ ਜਾਣਕਾਰੀ", addWatchlist: "ਵਾਚਲਿਸਟ ਵਿੱਚ ਜੋੜੋ", chooseplan: "ਆਪਣਾ ਪਲਾਨ ਚੁਣੋ" },
};

// ─── THEME ────────────────────────────────────────────────────
const C = {
  bg: "#06060f",
  surface: "#0c0c1a",
  card: "#10101e",
  cardHover: "#161628",
  border: "#1c1c30",
  accent: "#c8102e",
  accentGlow: "rgba(200,16,46,0.35)",
  gold: "#fbbf24",
  goldGlow: "rgba(251,191,36,0.2)",
  text: "#eef0f8",
  muted: "#6b6b88",
  gradient: "linear-gradient(135deg, #c8102e 0%, #ff4757 100%)",
  glassBg: "rgba(12,12,26,0.85)",
};

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@500&display=swap');`;

// ─── CONTENT DATA ─────────────────────────────────────────────
const MOCK_MOVIES = [
  { id: 1, title: "Stellar Horizon", genre: "Sci-Fi", year: 2024, rating: 8.7, duration: "2h 18m", language: "English", thumb: "https://picsum.photos/seed/m1/400/225", banner: "https://picsum.photos/seed/b1/1280/720", tags: ["Action", "Sci-Fi"], description: "A crew ventures beyond the known galaxy, discovering a world that challenges everything about existence.", cast: ["Elena Vasquez", "Marcus Chen"], director: "Sofia Andersson", age: "16+", trending: true, top10: true, genres: ["Sci-Fi", "Action"], youtubeId: "pBy1zgt0XPc" },
  { id: 2, title: "Crimson Tide Rising", genre: "Thriller", year: 2024, rating: 8.2, duration: "1h 55m", language: "Hindi", thumb: "https://picsum.photos/seed/m2/400/225", banner: "https://picsum.photos/seed/b2/1280/720", tags: ["Thriller", "Drama"], description: "A seasoned detective races against time to stop a conspiracy reaching the highest levels of power.", cast: ["James Holloway", "Priya Sharma"], director: "David Park", age: "18+", trending: true, top10: true, genres: ["Thriller", "Drama"], youtubeId: "LXb3EKWsInQ" },
  { id: 3, title: "Neon Requiem", genre: "Action", year: 2023, rating: 7.9, duration: "2h 5m", language: "Tamil", thumb: "https://picsum.photos/seed/m3/400/225", banner: "https://picsum.photos/seed/b3/1280/720", tags: ["Action", "Neo-Noir"], description: "In a cyberpunk city, a retired mercenary is pulled back into the underground when someone targets her family.", cast: ["Yuki Tanaka", "Rex Storm"], director: "Ana Lucia Ferreira", age: "18+", trending: false, top10: true, genres: ["Action"], youtubeId: "9DOYQ9IKD7A" },
  { id: 4, title: "The Last Algorithm", genre: "Drama", year: 2024, rating: 9.1, duration: "2h 32m", language: "Telugu", thumb: "https://picsum.photos/seed/m4/400/225", banner: "https://picsum.photos/seed/b4/1280/720", tags: ["Drama", "Tech"], description: "When an AI achieves sentience, its creator must choose between fame and protecting the world from what he's unleashed.", cast: ["Oliver Grant", "Mei Lin"], director: "Soren Mikkelson", age: "13+", trending: true, top10: false, genres: ["Drama", "Sci-Fi"], youtubeId: "ysz5S6PUM-U" },
  { id: 5, title: "Echoes of Tomorrow", genre: "Sci-Fi", year: 2024, rating: 8.5, duration: "1h 48m", language: "Malayalam", thumb: "https://picsum.photos/seed/m5/400/225", banner: "https://picsum.photos/seed/b5/1280/720", tags: ["Sci-Fi", "Romance"], description: "A physicist discovers she can send messages to the past, but each alteration creates devastating ripples.", cast: ["Clara Montez", "Hugo Bell"], director: "Ingrid Larsson", age: "13+", trending: false, top10: false, genres: ["Sci-Fi", "Romance"], youtubeId: "dQw4w9WgXcQ" },
  { id: 6, title: "Phantom Protocol", genre: "Action", year: 2023, rating: 7.6, duration: "2h 12m", language: "Kannada", thumb: "https://picsum.photos/seed/m6/400/225", banner: "https://picsum.photos/seed/b6/1280/720", tags: ["Action", "Spy"], description: "A ghost agent goes rogue after discovering her own agency has been compromised.", cast: ["Anya Petrov", "Cal Drake"], director: "Ryu Ishikawa", age: "16+", trending: true, top10: false, genres: ["Action"], youtubeId: "ZbZSe6N_BXs" },
  { id: 7, title: "Savage Kingdom", genre: "Fantasy", year: 2024, rating: 8.8, duration: "2h 45m", language: "Marathi", thumb: "https://picsum.photos/seed/m7/400/225", banner: "https://picsum.photos/seed/b7/1280/720", tags: ["Fantasy", "Epic"], description: "An ancient prophecy forces a reluctant warrior queen to unite warring tribes against immortal darkness.", cast: ["Nia Obi", "Kiran Malhotra"], director: "Fatima Al-Rashid", age: "16+", trending: true, top10: true, genres: ["Fantasy"], youtubeId: "M7lc1UVf-VE" },
  { id: 8, title: "Zero Gravity", genre: "Adventure", year: 2023, rating: 7.4, duration: "1h 38m", language: "Bengali", thumb: "https://picsum.photos/seed/m8/400/225", banner: "https://picsum.photos/seed/b8/1280/720", tags: ["Adventure", "Family"], description: "A teenage prodigy becomes humanity's only hope when accidentally launched into deep space.", cast: ["Zoe Patel", "Frank Morrison"], director: "Chris Delgado", age: "PG", trending: false, top10: false, genres: ["Adventure", "Sci-Fi"], youtubeId: "y6120QOlsfU" },
  { id: 9, title: "Dark Meridian", genre: "Horror", year: 2024, rating: 8.0, duration: "1h 52m", language: "English", thumb: "https://picsum.photos/seed/m9/400/225", banner: "https://picsum.photos/seed/b9/1280/720", tags: ["Horror", "Psychological"], description: "After moving into an island estate, a family discovers its previous residents never truly left.", cast: ["Lena Wren", "Tobias Hart"], director: "Mira Volkov", age: "18+", trending: false, top10: false, genres: ["Horror"], youtubeId: "kffacxfA7G4" },
  { id: 10, title: "Empire of Dust", genre: "Historical", year: 2023, rating: 8.3, duration: "2h 58m", language: "Hindi", thumb: "https://picsum.photos/seed/m10/400/225", banner: "https://picsum.photos/seed/b10/1280/720", tags: ["Historical", "Epic"], description: "A general who built an empire on the edge of the world — and the woman who tore it down.", cast: ["Marco Silva", "Adaeze Nwosu"], director: "Christophe Laurent", age: "16+", trending: true, top10: true, genres: ["Historical", "Drama"], youtubeId: "ioNng23DkIM" },
  { id: 11, title: "Pulse", genre: "Action", year: 2024, rating: 7.8, duration: "1h 44m", language: "Tamil", thumb: "https://picsum.photos/seed/m11/400/225", banner: "https://picsum.photos/seed/b11/1280/720", tags: ["Action", "Heist"], description: "A master thief assembles a crew to steal the world's most advanced AI chip from a moving bullet train.", cast: ["Sasha Kim", "Dmitri Volkov"], director: "Lee Chang-woo", age: "13+", trending: false, top10: false, genres: ["Action", "Thriller"], youtubeId: "ZbZSe6N_BXs" },
  { id: 12, title: "The Wandering Stars", genre: "Drama", year: 2024, rating: 9.0, duration: "2h 20m", language: "Telugu", thumb: "https://picsum.photos/seed/m12/400/225", banner: "https://picsum.photos/seed/b12/1280/720", tags: ["Drama", "Coming-of-Age"], description: "Three teenagers from different continents connected by a single inexplicable event.", cast: ["Amara Diallo", "Lucian Bose", "Sera Tanaka"], director: "Penelope Cruz-Walker", age: "13+", trending: true, top10: false, genres: ["Drama"], youtubeId: "dQw4w9WgXcQ" },
  { id: 13, title: "Rajputra", genre: "Historical", year: 2024, rating: 8.6, duration: "2h 40m", language: "Hindi", thumb: "https://picsum.photos/seed/m13/400/225", banner: "https://picsum.photos/seed/b13/1280/720", tags: ["Historical", "War"], description: "The last Rajput king battles Mughal forces, betrayal, and his own ambitions in a grand epic.", cast: ["Vikrant Thakur", "Priya Rathod"], director: "Rohit Shetty Jr.", age: "16+", trending: true, top10: true, genres: ["Historical", "Action"], youtubeId: "LXb3EKWsInQ" },
  { id: 14, title: "Neon City", genre: "Sci-Fi", year: 2025, rating: 8.4, duration: "1h 58m", language: "Tamil", thumb: "https://picsum.photos/seed/m14/400/225", banner: "https://picsum.photos/seed/b14/1280/720", tags: ["Sci-Fi", "Noir"], description: "In a rain-soaked cybercity of 2075, a data thief discovers she is the blueprint for a new god.", cast: ["Lakshmi Iyer", "Dev Anand III"], director: "Mani Ratnam II", age: "18+", trending: false, top10: false, genres: ["Sci-Fi"], youtubeId: "9DOYQ9IKD7A" },
  { id: 15, title: "Jungle Court", genre: "Drama", year: 2024, rating: 7.9, duration: "1h 47m", language: "Marathi", thumb: "https://picsum.photos/seed/m15/400/225", banner: "https://picsum.photos/seed/b15/1280/720", tags: ["Drama", "Legal"], description: "A forest-rights lawyer fights a billion-dollar corporation threatening an indigenous community.", cast: ["Sonali Patil", "Rahul Deshpande"], director: "Nagraj Manjule Jr.", age: "13+", trending: false, top10: false, genres: ["Drama"], youtubeId: "M7lc1UVf-VE" },
  { id: 16, title: "Bloodline Protocol", genre: "Action", year: 2025, rating: 8.1, duration: "2h 3m", language: "English", thumb: "https://picsum.photos/seed/m16/400/225", banner: "https://picsum.photos/seed/b16/1280/720", tags: ["Action", "Spy"], description: "A twin sister discovers her sibling was a black-ops assassin and must finish the final mission.", cast: ["Sofia Blake", "Marco DeNiro"], director: "John Wick Jr.", age: "18+", trending: true, top10: false, genres: ["Action", "Thriller"], youtubeId: "ioNng23DkIM" },
  { id: 17, title: "Kalaakaar", genre: "Drama", year: 2024, rating: 8.8, duration: "2h 15m", language: "Hindi", thumb: "https://picsum.photos/seed/m17/400/225", banner: "https://picsum.photos/seed/b17/1280/720", tags: ["Drama", "Music"], description: "A street musician from Dharavi battles the Indian music industry's dark underbelly to reach the top.", cast: ["Ayushmann K. Jr.", "Taapsee Jr."], director: "Shoojit Sircar Jr.", age: "13+", trending: true, top10: true, genres: ["Drama", "Music"], youtubeId: "ZbZSe6N_BXs" },
  { id: 18, title: "The Midnight Market", genre: "Fantasy", year: 2025, rating: 8.9, duration: "1h 52m", language: "Malayalam", thumb: "https://picsum.photos/seed/m18/400/225", banner: "https://picsum.photos/seed/b18/1280/720", tags: ["Fantasy", "Mystery"], description: "Every full moon, a magical bazaar appears in Fort Kochi. A young woman finds the price of entry is her past.", cast: ["Aishwarya Nair", "Dulquer III"], director: "Lijo Jose III", age: "PG", trending: false, top10: false, genres: ["Fantasy"], youtubeId: "y6120QOlsfU" },
  { id: 19, title: "Sandstorm", genre: "Thriller", year: 2025, rating: 8.3, duration: "1h 46m", language: "Telugu", thumb: "https://picsum.photos/seed/m19/400/225", banner: "https://picsum.photos/seed/b19/1280/720", tags: ["Thriller", "Political"], description: "A journalist embedded in a desert war zone uncovers proof that both sides are fighting for the same oil baron.", cast: ["Rashmika Jr.", "Vijay D. III"], director: "Trivikram II", age: "16+", trending: true, top10: false, genres: ["Thriller"], youtubeId: "kffacxfA7G4" },
  { id: 20, title: "Infinite Loop", genre: "Sci-Fi", year: 2025, rating: 9.3, duration: "2h 28m", language: "English", thumb: "https://picsum.photos/seed/m20/400/225", banner: "https://picsum.photos/seed/b20/1280/720", tags: ["Sci-Fi", "Mindbender"], description: "A programmer trapped in a recursive time loop must decode the universe's source code before reality collapses.", cast: ["Keira Walsh", "Ajay Sharma"], director: "Denis Villeneuve Jr.", age: "16+", trending: true, top10: true, genres: ["Sci-Fi"], youtubeId: "pBy1zgt0XPc" },
];

const MOCK_SERIES = [
  { id: 101, title: "Void Walkers", genre: "Sci-Fi", year: 2024, rating: 9.2, seasons: 3, episodes: 30, language: "English", thumb: "https://picsum.photos/seed/s1/400/225", banner: "https://picsum.photos/seed/sb1/1280/720", tags: ["Sci-Fi", "Mystery"], description: "Interdimensional agents navigate parallel realities holding clues to prevent multiverse collapse.", cast: ["Ava Stone", "Jin-ho Park"], director: "Nikolai Petrov", age: "16+", trending: true, genres: ["Sci-Fi", "Mystery"], youtubeId: "ysz5S6PUM-U" },
  { id: 102, title: "House of Mirrors", genre: "Thriller", year: 2023, rating: 8.9, seasons: 2, episodes: 16, language: "Hindi", thumb: "https://picsum.photos/seed/s2/400/225", banner: "https://picsum.photos/seed/sb2/1280/720", tags: ["Thriller", "Mystery"], description: "A detective becomes obsessed with a disappearance connected to her own forgotten childhood.", cast: ["Diana Frost", "Ethan Cross"], director: "Amelia Rhodes", age: "18+", trending: true, genres: ["Thriller", "Crime"], youtubeId: "ZbZSe6N_BXs" },
  { id: 103, title: "Steel & Shadow", genre: "Fantasy", year: 2024, rating: 8.6, seasons: 1, episodes: 10, language: "Tamil", thumb: "https://picsum.photos/seed/s3/400/225", banner: "https://picsum.photos/seed/sb3/1280/720", tags: ["Fantasy", "Action"], description: "A disgraced knight forges an alliance with a shadow mage to reclaim a stolen kingdom.", cast: ["Roan Blackwell", "Lyra Moon"], director: "Bastian Wolf", age: "16+", trending: false, genres: ["Fantasy", "Action"], youtubeId: "LXb3EKWsInQ" },
  { id: 104, title: "Downlink", genre: "Drama", year: 2024, rating: 8.4, seasons: 2, episodes: 20, language: "Telugu", thumb: "https://picsum.photos/seed/s4/400/225", banner: "https://picsum.photos/seed/sb4/1280/720", tags: ["Drama", "Tech"], description: "A whistleblower uncovers a conspiracy that could reshape global democracy.", cast: ["Isabel Vega", "Nate Holloway"], director: "Sarah Kim", age: "16+", trending: true, genres: ["Drama", "Thriller"], youtubeId: "9DOYQ9IKD7A" },
  { id: 105, title: "Midnight Protocol", genre: "Crime", year: 2023, rating: 8.1, seasons: 3, episodes: 24, language: "Malayalam", thumb: "https://picsum.photos/seed/s5/400/225", banner: "https://picsum.photos/seed/sb5/1280/720", tags: ["Crime", "Noir"], description: "A morally complex prosecutor navigates where justice and corruption blur.", cast: ["Marcus King", "Zara Ahmed"], director: "Paulo Mendes", age: "18+", trending: false, genres: ["Crime", "Drama"], youtubeId: "dQw4w9WgXcQ" },
  { id: 106, title: "Aurora Protocol", genre: "Sci-Fi", year: 2024, rating: 9.0, seasons: 1, episodes: 8, language: "Kannada", thumb: "https://picsum.photos/seed/s6/400/225", banner: "https://picsum.photos/seed/sb6/1280/720", tags: ["Sci-Fi", "Drama"], description: "Earth's first alien signal triggers a race between nations — and within the human soul.", cast: ["Chen Wei", "Fatou Diallo"], director: "Hiroshi Yamada", age: "13+", trending: true, genres: ["Sci-Fi", "Drama"], youtubeId: "pBy1zgt0XPc" },
  { id: 107, title: "Dilli Darbar", genre: "Crime", year: 2025, rating: 8.7, seasons: 2, episodes: 18, language: "Hindi", thumb: "https://picsum.photos/seed/s7/400/225", banner: "https://picsum.photos/seed/sb7/1280/720", tags: ["Crime", "Political"], description: "Power, politics and murder collide in the corridors of Parliament. A journalist documents it all.", cast: ["Nawazuddin Jr.", "Radhika A. II"], director: "Anurag Kashyap III", age: "18+", trending: true, genres: ["Crime", "Drama"], youtubeId: "M7lc1UVf-VE" },
  { id: 108, title: "Kashmiri Kode", genre: "Thriller", year: 2025, rating: 8.5, seasons: 1, episodes: 8, language: "Hindi", thumb: "https://picsum.photos/seed/s8/400/225", banner: "https://picsum.photos/seed/sb8/1280/720", tags: ["Thriller", "Spy"], description: "A RAW agent goes off-grid in the valley to stop a sleeper cell — but nothing is as it seems.", cast: ["Manoj B. Jr.", "Tabu III"], director: "Vishal Bhardwaj Jr.", age: "18+", trending: false, genres: ["Thriller"], youtubeId: "kffacxfA7G4" },
  { id: 109, title: "Silicon Karma", genre: "Drama", year: 2024, rating: 8.3, seasons: 2, episodes: 20, language: "English", thumb: "https://picsum.photos/seed/s9/400/225", banner: "https://picsum.photos/seed/sb9/1280/720", tags: ["Drama", "Tech"], description: "The rise and moral collapse of India's most celebrated startup founder.", cast: ["Rahul K.", "Deepika P. III"], director: "Zoya A. Jr.", age: "13+", trending: true, genres: ["Drama", "Tech"], youtubeId: "y6120QOlsfU" },
  { id: 110, title: "Kochi Noir", genre: "Crime", year: 2024, rating: 8.8, seasons: 1, episodes: 6, language: "Malayalam", thumb: "https://picsum.photos/seed/s10/400/225", banner: "https://picsum.photos/seed/sb10/1280/720", tags: ["Crime", "Neo-Noir"], description: "A retired cop, a missing heiress, and backwater smugglers — Kerala's most stylish crime story.", cast: ["Fahadh F. Jr.", "Parvathy III"], director: "Mahesh N. Jr.", age: "16+", trending: true, genres: ["Crime", "Thriller"], youtubeId: "ioNng23DkIM" },
];

const ALL_CONTENT = [...MOCK_MOVIES, ...MOCK_SERIES];
const GENRES = ["All", "Action", "Drama", "Sci-Fi", "Thriller", "Fantasy", "Crime", "Horror", "Historical", "Adventure"];
const CONTENT_LANGUAGES = ["All", "English", "Hindi", "Tamil", "Telugu", "Malayalam", "Kannada", "Marathi", "Bengali"];

// ─── AI RECOMMENDATION ENGINE ─────────────────────────────────
function getRecommendations(watchHistory, favorites, ratings, currentContent = null) {
  if (!watchHistory.length && !favorites.length && !currentContent) {
    return ALL_CONTENT.filter(c => c.trending).slice(0, 8);
  }

  const watched = watchHistory.map(id => ALL_CONTENT.find(c => c.id === id)).filter(Boolean);
  const faved = favorites.map(id => ALL_CONTENT.find(c => c.id === id)).filter(Boolean);
  const allInteracted = [...watched, ...faved];

  // Build genre affinity scores
  const genreScores = {};
  const langScores = {};

  allInteracted.forEach(item => {
    if (!item) return;
    const weight = favorites.includes(item.id) ? 2 : 1;
    const userRating = ratings[item.id];
    const ratingMult = userRating ? userRating / 3 : 1;
    (item.genres || [item.genre]).forEach(g => {
      genreScores[g] = (genreScores[g] || 0) + weight * ratingMult;
    });
    langScores[item.language] = (langScores[item.language] || 0) + weight;
  });

  // Score all content
  const seenIds = new Set([...watchHistory, ...favorites, currentContent?.id].filter(Boolean));
  const scored = ALL_CONTENT
    .filter(c => !seenIds.has(c.id))
    .map(c => {
      let score = 0;
      (c.genres || [c.genre]).forEach(g => { score += (genreScores[g] || 0) * 3; });
      score += (langScores[c.language] || 0) * 1.5;
      score += c.rating * 0.5;
      if (c.trending) score += 2;
      if (currentContent) {
        if (c.genre === currentContent.genre) score += 5;
        if (c.language === currentContent.language) score += 2;
        const sharedTags = (c.tags || []).filter(t => (currentContent.tags || []).includes(t));
        score += sharedTags.length * 3;
      }
      return { ...c, _score: score };
    })
    .sort((a, b) => b._score - a._score);

  return scored.slice(0, 10);
}

// ─── CONTEXT ─────────────────────────────────────────────────
const AppContext = createContext(null);

function AppProvider({ children }) {
  const [user, setUser] = useState(null);           // Supabase auth user
  const [profile, setProfile] = useState(null);     // DB user_profiles row
  const [accessToken, setAccessToken] = useState(null);
  const [watchlist, setWatchlist] = useState([3, 7, 101]);
  const [favorites, setFavorites] = useState([1, 4, 102]);
  const [watchHistory, setWatchHistory] = useState([1, 2, 101]);
  const [ratings, setRatings] = useState({ 1: 5, 4: 4 });
  const [continueWatching, setContinueWatching] = useState([
    { id: 2, progress: 45, lastWatched: "2h ago" },
    { id: 101, progress: 72, lastWatched: "1d ago" },
  ]);
  const [currentPage, setCurrentPage] = useState("home");
  const [selectedContent, setSelectedContent] = useState(null);
  const [notification, setNotification] = useState(null);
  const [authModal, setAuthModal] = useState(null);
  const [playerContent, setPlayerContent] = useState(null);
  const [uiLang, setUiLang] = useState("en");       // UI language code
  const [dbLoading, setDbLoading] = useState(false);

  const t = (key) => (UI_STRINGS[uiLang] || UI_STRINGS.en)[key] || key;

  const showNotification = useCallback((msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // ── SUPABASE AUTH ──────────────────────────────────────────
  const dbSignUp = async (email, password, displayName) => {
    setDbLoading(true);
    try {
      const res = await supabase.signUp(email, password, { display_name: displayName });
      if (res.error) { showNotification(res.error.message || "Sign up failed", "error"); return false; }
      // After signup, sign in to get token
      return await dbLogin(email, password);
    } catch { showNotification("Network error — running in demo mode", "warn"); return localLogin(email, displayName); }
    finally { setDbLoading(false); }
  };

  const dbLogin = async (email, password) => {
    setDbLoading(true);
    try {
      const res = await supabase.signIn(email, password);
      if (res.error) { showNotification(res.error.message || "Login failed", "error"); return false; }
      const token = res.access_token;
      setAccessToken(token);
      localStorage.setItem("nova_token", token);
      const userInfo = await supabase.getUser(token);
      setUser(userInfo);
      await loadUserProfile(userInfo.id, token);
      setAuthModal(null);
      showNotification(`Welcome back! 🎬`);
      return true;
    } catch {
      showNotification("Cannot reach server — running in demo mode", "warn");
      return localLogin(email);
    } finally { setDbLoading(false); }
  };

  const localLogin = (email, name) => {
    const localUser = { id: "demo", email, user_metadata: { display_name: name || email.split("@")[0] } };
    setUser(localUser);
    setProfile({ display_name: name || email.split("@")[0], plan: "Premium", avatar_seed: email, language: uiLang });
    setAuthModal(null);
    showNotification(`Welcome, ${name || email.split("@")[0]}! (Demo mode)`);
    return true;
  };

  const loadUserProfile = async (userId, token) => {
    try {
      const db = await supabase.from("user_profiles", token);
      const data = await db.select("*", `&id=eq.${userId}`);
      if (Array.isArray(data) && data[0]) {
        setProfile(data[0]);
        if (data[0].language) setUiLang(data[0].language);
      }
      // Load watchlist, favorites, history from DB
      const wlDb = await supabase.from("watchlist", token);
      const wlData = await wlDb.select("content_id", `&user_id=eq.${userId}`);
      if (Array.isArray(wlData)) setWatchlist(wlData.map(r => r.content_id));

      const favDb = await supabase.from("favorites", token);
      const favData = await favDb.select("content_id", `&user_id=eq.${userId}`);
      if (Array.isArray(favData)) setFavorites(favData.map(r => r.content_id));

      const histDb = await supabase.from("watch_history", token);
      const histData = await histDb.select("content_id,progress", `&user_id=eq.${userId}&order=last_watched.desc`);
      if (Array.isArray(histData)) {
        setWatchHistory(histData.map(r => r.content_id));
        setContinueWatching(histData.filter(r => r.progress > 0 && r.progress < 95).slice(0, 6).map(r => ({
          id: r.content_id, progress: r.progress, lastWatched: "recently"
        })));
      }
    } catch { /* silently handle */ }
  };

  const dbLogout = async () => {
    if (accessToken) {
      try { await supabase.signOut(accessToken); } catch { }
    }
    localStorage.removeItem("nova_token");
    setUser(null); setProfile(null); setAccessToken(null);
    setCurrentPage("home");
    showNotification("Logged out successfully");
  };

  // ── DB SYNC HELPERS ──────────────────────────────────────
  const syncWatchlist = async (newList) => {
    if (!user || user.id === "demo" || !accessToken) return;
    // Simplified: just upsert all. In production, track delta.
  };

  // ── LOCAL ACTIONS (optimistic, synced to DB async) ────────
  const toggleWatchlist = async (id) => {
    const newList = watchlist.includes(id) ? watchlist.filter(x => x !== id) : [...watchlist, id];
    setWatchlist(newList);
    showNotification(watchlist.includes(id) ? "Removed from Watchlist" : "Added to Watchlist ✓");
    if (user && accessToken && user.id !== "demo") {
      try {
        const db = await supabase.from("watchlist", accessToken);
        if (watchlist.includes(id)) await db.delete({ user_id: user.id, content_id: id });
        else await db.upsert({ user_id: user.id, content_id: id });
      } catch { }
    }
  };

  const toggleFavorite = async (id) => {
    const newList = favorites.includes(id) ? favorites.filter(x => x !== id) : [...favorites, id];
    setFavorites(newList);
    showNotification(favorites.includes(id) ? "Removed from Favorites" : "Added to Favorites ♥");
    if (user && accessToken && user.id !== "demo") {
      try {
        const db = await supabase.from("favorites", accessToken);
        if (favorites.includes(id)) await db.delete({ user_id: user.id, content_id: id });
        else await db.upsert({ user_id: user.id, content_id: id });
      } catch { }
    }
  };

  const rateContent = async (id, r) => {
    setRatings(prev => ({ ...prev, [id]: r }));
    showNotification(`Rated ${r} ★`);
    if (user && accessToken && user.id !== "demo") {
      try {
        const db = await supabase.from("ratings", accessToken);
        await db.upsert({ user_id: user.id, content_id: id, rating: r });
      } catch { }
    }
  };

  const playContent = async (content) => {
    if (!user) { setAuthModal("login"); return; }
    setPlayerContent(content);
    setCurrentPage("player");
    const exists = continueWatching.find(x => x.id === content.id);
    if (!exists) setContinueWatching(prev => [{ id: content.id, progress: 0, lastWatched: "Just now" }, ...prev].slice(0, 6));
    if (!watchHistory.includes(content.id)) setWatchHistory(prev => [content.id, ...prev]);
    if (user && accessToken && user.id !== "demo") {
      try {
        const db = await supabase.from("watch_history", accessToken);
        await db.upsert({ user_id: user.id, content_id: content.id, progress: exists?.progress || 0 });
      } catch { }
    }
  };

  const updateProgress = async (contentId, progress) => {
    setContinueWatching(prev => prev.map(x => x.id === contentId ? { ...x, progress } : x));
    if (user && accessToken && user.id !== "demo") {
      try {
        const db = await supabase.from("watch_history", accessToken);
        await db.upsert({ user_id: user.id, content_id: contentId, progress, last_watched: new Date().toISOString() });
      } catch { }
    }
  };

  // ── RAZORPAY PAYMENT ────────────────────────────────────
  const initPayment = async (plan) => {
    if (!user) { setAuthModal("login"); return; }
    const loaded = await supabase.loadRazorpay();
    if (!loaded) { showNotification("Payment gateway unavailable", "error"); return; }

    const planConfig = { Premium: { amount: 49900, name: "Premium Plan" }, Family: { amount: 79900, name: "Family Plan" } };
    const config = planConfig[plan];
    if (!config) return;

    const options = {
      key: "YOUR_RAZORPAY_KEY_ID", // Replace with your Razorpay key
      amount: config.amount,
      currency: "INR",
      name: "NOVA OTT",
      description: config.name,
      image: "https://picsum.photos/seed/logo/64/64",
      prefill: { email: user.email, name: profile?.display_name || user.user_metadata?.display_name || "User" },
      theme: { color: C.accent },
      handler: async (response) => {
        // On successful payment, update subscription in DB
        showNotification(`🎉 Subscribed to ${plan} Plan!`);
        setProfile(prev => ({ ...prev, plan }));
        if (user && accessToken && user.id !== "demo") {
          try {
            const db = await supabase.from("subscriptions", accessToken);
            await db.upsert({
              user_id: user.id, plan, status: "active",
              razorpay_subscription_id: response.razorpay_payment_id,
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            });
          } catch { }
        }
      },
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const saveLanguagePreference = async (code) => {
    setUiLang(code);
    if (user && accessToken && user.id !== "demo") {
      try {
        const db = await supabase.from("user_profiles", accessToken);
        await db.update({ language: code }, { id: user.id });
      } catch { }
    }
  };

  return (
    <AppContext.Provider value={{
      user, profile, setProfile, dbLoading,
      watchlist, favorites, watchHistory, ratings, continueWatching,
      currentPage, setCurrentPage, selectedContent, setSelectedContent,
      notification, showNotification, authModal, setAuthModal,
      playerContent, setPlayerContent,
      uiLang, setUiLang: saveLanguagePreference, t,
      toggleWatchlist, toggleFavorite, rateContent, playContent, updateProgress,
      dbLogin, dbSignUp, dbLogout, initPayment,
    }}>
      {children}
    </AppContext.Provider>
  );
}

const useApp = () => useContext(AppContext);

// ─── GLOBAL CSS ───────────────────────────────────────────────
const globalCSS = `
${FONTS}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body { background: ${C.bg}; color: ${C.text}; font-family: 'DM Sans', sans-serif; overflow-x: hidden; }
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: ${C.accent}; border-radius: 4px; }

@keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:none; } }
@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
@keyframes scaleIn { from { opacity:0; transform:scale(0.94); } to { opacity:1; transform:none; } }
@keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }
@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes glowPulse { 0%,100%{box-shadow:0 0 20px ${C.accentGlow};} 50%{box-shadow:0 0 40px ${C.accentGlow},0 0 80px ${C.accentGlow};} }
@keyframes spin { to{transform:rotate(360deg)} }
@keyframes marqueeTick { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }

.fade-up { animation: fadeUp 0.55s cubic-bezier(.22,1,.36,1) forwards; }
.fade-in { animation: fadeIn 0.4s ease forwards; }
.scale-in { animation: scaleIn 0.35s cubic-bezier(.22,1,.36,1) forwards; }

.glass { background: ${C.glassBg}; backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid ${C.border}; }

.btn-primary {
  background: ${C.gradient};
  color: white; border: none;
  padding: 11px 26px; border-radius: 6px;
  font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 14px;
  cursor: pointer; transition: all 0.2s; letter-spacing: 0.3px;
}
.btn-primary:hover { filter: brightness(1.12); transform: translateY(-1px); box-shadow: 0 6px 20px ${C.accentGlow}; }

.btn-ghost {
  background: rgba(255,255,255,0.07); color: white; border: 1px solid rgba(255,255,255,0.12);
  padding: 11px 26px; border-radius: 6px;
  font-family: 'DM Sans', sans-serif; font-weight: 500; font-size: 14px;
  cursor: pointer; transition: all 0.2s; backdrop-filter: blur(10px);
}
.btn-ghost:hover { background: rgba(255,255,255,0.13); transform: translateY(-1px); }

.btn-icon { background: none; border: none; color: ${C.muted}; cursor: pointer; padding: 8px; border-radius: 50%; transition: all 0.2s; display:flex; align-items:center; justify-content:center; }
.btn-icon:hover { color: white; background: rgba(255,255,255,0.08); }

.skeleton { background: linear-gradient(90deg, ${C.card} 25%, ${C.border} 50%, ${C.card} 75%); background-size:200% 100%; animation: shimmer 1.5s infinite; border-radius:8px; }

.scrollrow { display:flex; gap:14px; overflow-x:auto; padding-bottom:10px; scrollbar-width:none; }
.scrollrow::-webkit-scrollbar { display:none; }

.card-lift { transition: transform 0.28s cubic-bezier(.22,1,.36,1), box-shadow 0.28s; cursor:pointer; }
.card-lift:hover { transform: translateY(-6px) scale(1.02); box-shadow: 0 18px 50px rgba(0,0,0,0.55); }

.tag { display:inline-block; background:rgba(200,16,46,0.12); color:${C.accent}; border:1px solid rgba(200,16,46,0.28); border-radius:4px; padding:2px 10px; font-size:11px; font-weight:600; letter-spacing:0.3px; }

.section { padding: 36px 5%; }
.section-title {
  font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800;
  letter-spacing: 0.5px; margin-bottom: 22px;
  display:flex; align-items:center; gap:10px;
}
.section-title::before { content:''; width:3px; height:20px; background:${C.gradient}; border-radius:2px; flex-shrink:0; }

.nav-fixed { position:fixed; top:0; left:0; right:0; z-index:100; height:66px; display:flex; align-items:center; padding:0 5%; justify-content:space-between; transition: background 0.3s, border-bottom 0.3s; }
.nav-fixed.scrolled { background:${C.glassBg}; backdrop-filter:blur(20px); border-bottom:1px solid ${C.border}; }

input, textarea, select {
  background:${C.card}; border:1px solid ${C.border}; color:${C.text};
  border-radius:6px; padding:11px 14px;
  font-family:'DM Sans',sans-serif; font-size:14px; outline:none; transition:border-color 0.2s;
}
input:focus, textarea:focus, select:focus { border-color:${C.accent}; }
input::placeholder { color:${C.muted}; }
select { cursor:pointer; }

.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.88); z-index:1000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(10px); animation:fadeIn 0.25s ease; }
.modal { background:${C.surface}; border:1px solid ${C.border}; border-radius:14px; padding:36px; width:min(480px,94vw); animation:scaleIn 0.3s ease; position:relative; }

.progress-bar { height:3px; background:${C.border}; border-radius:2px; overflow:hidden; }
.progress-fill { height:100%; background:${C.accent}; border-radius:2px; transition:width 0.3s; }

.hero-wrap { min-height:88vh; display:flex; align-items:center; position:relative; overflow:hidden; }

.genre-chip { padding:7px 18px; border-radius:20px; border:1px solid ${C.border}; background:${C.card}; color:${C.muted}; cursor:pointer; font-size:13px; font-weight:500; transition:all 0.18s; white-space:nowrap; }
.genre-chip:hover, .genre-chip.active { background:${C.accent}; border-color:${C.accent}; color:white; }

.lang-selector { display:flex; flex-wrap:wrap; gap:8px; }
.lang-btn { padding:6px 14px; border-radius:20px; border:1px solid ${C.border}; background:${C.card}; color:${C.muted}; cursor:pointer; font-size:13px; transition:all 0.18s; display:flex; align-items:center; gap:6px; }
.lang-btn:hover, .lang-btn.active { border-color:${C.accent}; color:${C.accent}; background:rgba(200,16,46,0.1); }

.ai-badge { background:linear-gradient(135deg,#7c3aed,#4f46e5); color:white; font-size:10px; font-weight:700; padding:2px 8px; border-radius:3px; letter-spacing:0.5px; }

.notification-toast { position:fixed; bottom:28px; right:28px; z-index:9999; min-width:260px; max-width:360px; padding:14px 20px; border-radius:10px; font-size:14px; font-weight:500; animation:fadeUp 0.35s ease; box-shadow:0 8px 32px rgba(0,0,0,0.4); }

.player-wrap { position:fixed; inset:0; background:#000; z-index:500; display:flex; flex-direction:column; }
.player-controls { position:absolute; bottom:0; left:0; right:0; padding:20px 28px 28px; background:linear-gradient(to top, rgba(0,0,0,0.9), transparent); }

.stat-chip { background:${C.card}; border:1px solid ${C.border}; border-radius:10px; padding:18px 20px; text-align:center; cursor:pointer; transition:border-color 0.2s, background 0.2s; }
.stat-chip:hover { border-color:${C.accent}; background:rgba(200,16,46,0.06); }

.recommend-card { position:relative; border-radius:10px; overflow:hidden; }
.recommend-card .ai-label { position:absolute; top:10px; left:10px; z-index:2; }

@media (max-width: 640px) {
  .hide-mobile { display:none !important; }
  .section { padding:28px 4%; }
}
`;

// ─── ICON ─────────────────────────────────────────────────────
function Icon({ name, size = 20, color = "currentColor", style = {} }) {
  const paths = {
    home: "M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z",
    film: "M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z",
    tv: "M2 7a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7zM8 19h8",
    list: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z",
    search: "M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z",
    play: "M5 3l14 9-14 9V3z",
    pause: "M6 4h4v16H6zM14 4h4v16h-4z",
    plus: "M12 5v14M5 12h14",
    check: "M5 13l4 4L19 7",
    x: "M18 6L6 18M6 6l12 12",
    heart: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
    heartOutline: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
    info: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8h.01M11 12h1v4h1",
    star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
    logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
    crown: "M2 20h20M5 20V10l7-6 7 6v10",
    share: "M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13",
    arrowLeft: "M19 12H5M12 19l-7-7 7-7",
    chevronLeft: "M15 18l-6-6 6-6",
    chevronRight: "M9 18l6-6-6-6",
    maximize: "M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3",
    volume: "M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07",
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
    playCircle: "M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10zM10 8l6 4-6 4V8z",
    globe: "M12 2a10 10 0 100 20A10 10 0 0012 2zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z",
    sparkles: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      {paths[name] && <path d={paths[name]} fill={["heart", "star", "play"].includes(name) && color !== C.muted ? color : "none"} />}
    </svg>
  );
}

// ─── STAR RATING ──────────────────────────────────────────────
function StarRating({ contentId, size = 22 }) {
  const { ratings, rateContent } = useApp();
  const [hover, setHover] = useState(0);
  const current = ratings[contentId] || 0;
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} className="btn-icon" style={{ padding: 2 }}
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          onClick={() => rateContent(contentId, n)}>
          <Icon name="star" size={size} color={(hover || current) >= n ? C.gold : C.border} />
        </button>
      ))}
    </div>
  );
}

// ─── NOTIFICATION ─────────────────────────────────────────────
function Notification() {
  const { notification } = useApp();
  if (!notification) return null;
  const colors = { success: C.accent, error: "#ef4444", warn: "#f59e0b" };
  return (
    <div className="notification-toast" style={{ background: C.surface, borderLeft: `3px solid ${colors[notification.type] || C.accent}`, border: `1px solid ${C.border}` }}>
      {notification.msg}
    </div>
  );
}

// ─── PASSWORD STRENGTH ────────────────────────────────────────
function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: "", color: "transparent" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"];
  const colors = ["transparent", "#ef4444", "#f59e0b", "#eab308", "#22c55e", "#10b981"];
  return { score, label: labels[score] || "Strong", color: colors[Math.min(score, 5)] };
}

// ─── AUTH MODAL ───────────────────────────────────────────────
function AuthModal() {
  const { authModal, setAuthModal, dbLogin, dbSignUp, dbLoading } = useApp();
  const [step, setStep] = useState(1); // 1=method, 2=details, 3=verify
  const [isLogin, setIsLogin] = useState(authModal === "login");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [err, setErr] = useState("");
  const [socialLoading, setSocialLoading] = useState("");
  const [photoCapture, setPhotoCapture] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streamObj, setStreamObj] = useState(null);

  const pwStrength = getPasswordStrength(password);

  useEffect(() => {
    setIsLogin(authModal === "login");
    setStep(1); setErr(""); setName(""); setAge(""); setEmail(""); setPassword(""); setPassword2("");
    setCodeSent(false); setCodeVerified(false); setCapturedPhoto(null);
  }, [authModal]);

  if (!authModal) return null;

  const SOCIALS = [
    { id: "google",   label: "Continue with Google",   bg: "#fff",     color: "#1a1a1a", border: "#e5e7eb", logo: "https://www.svgrepo.com/show/475656/google-color.svg" },
    { id: "github",   label: "Continue with GitHub",   bg: "#24292e",  color: "#fff",    border: "#24292e", logo: "https://www.svgrepo.com/show/475654/github-color.svg" },
    { id: "facebook", label: "Continue with Facebook", bg: "#1877f2",  color: "#fff",    border: "#1877f2", logo: "https://www.svgrepo.com/show/475647/facebook-color.svg" },
    { id: "x",        label: "Continue with X",        bg: "#000",     color: "#fff",    border: "#333",    logo: "https://www.svgrepo.com/show/511330/twitter-154.svg" },
  ];

  const handleSocial = async (provider) => {
    setSocialLoading(provider);
    await new Promise(r => setTimeout(r, 1200));
    setSocialLoading("");
    // In real implementation: supabase.auth.signInWithOAuth({ provider })
    // For demo: simulate login
    const demoUser = { id: "demo", email: `user@${provider}.demo`, user_metadata: { display_name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} User` } };
    const { dbLogin } = useApp ? { dbLogin: null } : {};
    // Just use localLogin path via dbSignUp demo mode
    await dbSignUp(`user@${provider}.demo`, "demo1234", `${provider} User`);
  };

  const sendCode = () => {
    if (!email || !email.includes("@")) { setErr("Enter a valid email first"); return; }
    setErr("");
    setCodeSent(true);
    // In real: send OTP via supabase or email service
  };
  const verifyCode = () => {
    // Demo: any 6-digit code works
    if (emailCode.length === 6) { setCodeVerified(true); setErr(""); }
    else setErr("Enter the 6-digit code sent to your email");
  };

  // Camera capture
  const startCamera = async () => {
    setPhotoCapture(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStreamObj(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch { setErr("Camera access denied"); setPhotoCapture(false); }
  };
  const snapPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    setCapturedPhoto(canvasRef.current.toDataURL("image/jpeg", 0.8));
    stopCamera();
  };
  const stopCamera = () => {
    streamObj?.getTracks().forEach(t => t.stop());
    setStreamObj(null); setPhotoCapture(false);
  };

  const handleSubmit = async () => {
    setErr("");
    if (isLogin) {
      if (!email || !password) { setErr("Please fill all fields"); return; }
      const ok = await dbLogin(email, password);
      if (!ok) setErr("Invalid email or password");
    } else {
      if (!name.trim()) { setErr("Please enter your name"); return; }
      if (!age || isNaN(age) || +age < 13 || +age > 120) { setErr("Please enter a valid age (13+)"); return; }
      if (!email || !email.includes("@")) { setErr("Please enter a valid email"); return; }
      if (!codeVerified) { setErr("Please verify your email first"); return; }
      if (pwStrength.score < 2) { setErr("Password is too weak"); return; }
      if (password !== password2) { setErr("Passwords do not match"); return; }
      const ok = await dbSignUp(email, password, name);
      if (!ok) setErr("Sign up failed — try again");
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setAuthModal(null)}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, maxHeight: "90vh", overflowY: "auto" }}>
        <button className="btn-icon" onClick={() => setAuthModal(null)} style={{ position: "absolute", top: 16, right: 16, zIndex: 2 }}>
          <Icon name="x" size={18} />
        </button>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 800, color: C.accent, letterSpacing: 2 }}>
            N<span style={{ color: C.text }}>OVA</span>
          </span>
          <div style={{ marginTop: 8, fontSize: 20, fontWeight: 700 }}>
            {isLogin ? "Welcome back" : "Create your account"}
          </div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
            {isLogin ? "Sign in to continue watching" : "Start your streaming journey today"}
          </div>
        </div>

        {/* Social Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {SOCIALS.map(s => (
            <button key={s.id} disabled={!!socialLoading}
              onClick={() => handleSocial(s.id)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderRadius: 8,
                background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600,
                opacity: socialLoading && socialLoading !== s.id ? 0.5 : 1, transition: "opacity 0.2s, transform 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "none"}>
              {socialLoading === s.id
                ? <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${s.color}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
                : <img src={s.logo} alt={s.id} style={{ width: 20, height: 20, objectFit: "contain" }} />}
              <span>{socialLoading === s.id ? "Connecting…" : s.label}</span>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>or with email</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        {/* Form Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {!isLogin && (
            <>
              {/* Name */}
              <div>
                <label style={{ fontSize: 12, color: C.muted, marginBottom: 5, display: "block" }}>Full Name *</label>
                <input placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} style={{ width: "100%" }} />
              </div>
              {/* Age */}
              <div>
                <label style={{ fontSize: 12, color: C.muted, marginBottom: 5, display: "block" }}>Age * (13+ required)</label>
                <input placeholder="Your age" type="number" min="13" max="120" value={age} onChange={e => setAge(e.target.value)} style={{ width: "100%" }} />
              </div>
            </>
          )}

          {/* Email + Verify */}
          <div>
            <label style={{ fontSize: 12, color: C.muted, marginBottom: 5, display: "block" }}>Email Address *</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input placeholder="you@email.com" type="email" value={email} onChange={e => { setEmail(e.target.value); setCodeVerified(false); setCodeSent(false); }}
                style={{ flex: 1 }} />
              {!isLogin && (
                <button onClick={sendCode} disabled={codeVerified}
                  style={{ padding: "0 14px", borderRadius: 6, border: `1px solid ${codeVerified ? "#22c55e" : C.accent}`,
                    background: codeVerified ? "rgba(34,197,94,0.1)" : "rgba(200,16,46,0.1)",
                    color: codeVerified ? "#22c55e" : C.accent, cursor: codeVerified ? "default" : "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {codeVerified ? "✓ Verified" : codeSent ? "Resend" : "Send Code"}
                </button>
              )}
            </div>
          </div>

          {/* OTP Input */}
          {!isLogin && codeSent && !codeVerified && (
            <div>
              <label style={{ fontSize: 12, color: C.muted, marginBottom: 5, display: "block" }}>
                Verification Code <span style={{ color: C.muted }}>(check your email — demo: any 6 digits)</span>
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input placeholder="6-digit code" maxLength={6} value={emailCode} onChange={e => setEmailCode(e.target.value.replace(/\D/g, ""))}
                  style={{ flex: 1, letterSpacing: 6, fontSize: 18, textAlign: "center" }} />
                <button onClick={verifyCode}
                  style={{ padding: "0 14px", borderRadius: 6, border: `1px solid ${C.accent}`,
                    background: "rgba(200,16,46,0.1)", color: C.accent, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  Verify
                </button>
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <label style={{ fontSize: 12, color: C.muted, marginBottom: 5, display: "block" }}>Password *</label>
            <div style={{ position: "relative" }}>
              <input placeholder={isLogin ? "Your password" : "Create strong password"} type={showPw ? "text" : "password"}
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && isLogin && handleSubmit()}
                style={{ width: "100%", paddingRight: 44 }} />
              <button onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16 }}>
                {showPw ? "🙈" : "👁️"}
              </button>
            </div>
            {!isLogin && password && (
              <div style={{ marginTop: 6 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 2,
                      background: i <= pwStrength.score ? pwStrength.color : C.border, transition: "background 0.3s" }} />
                  ))}
                </div>
                <div style={{ fontSize: 11, color: pwStrength.color }}>{pwStrength.label}
                  {pwStrength.score < 3 && <span style={{ color: C.muted }}> — add uppercase, numbers & symbols</span>}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          {!isLogin && (
            <div>
              <label style={{ fontSize: 12, color: C.muted, marginBottom: 5, display: "block" }}>Confirm Password *</label>
              <div style={{ position: "relative" }}>
                <input placeholder="Repeat your password" type={showPw2 ? "text" : "password"}
                  value={password2} onChange={e => setPassword2(e.target.value)}
                  style={{ width: "100%", paddingRight: 44, borderColor: password2 && password2 !== password ? "#ef4444" : "" }} />
                <button onClick={() => setShowPw2(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16 }}>
                  {showPw2 ? "🙈" : "👁️"}
                </button>
              </div>
              {password2 && password !== password2 && (
                <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>Passwords do not match</div>
              )}
            </div>
          )}

          {/* Photo Capture */}
          {!isLogin && (
            <div>
              <label style={{ fontSize: 12, color: C.muted, marginBottom: 8, display: "block" }}>Profile Photo (optional)</label>
              {capturedPhoto ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <img src={capturedPhoto} alt="captured" style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.accent}` }} />
                  <button onClick={() => setCapturedPhoto(null)}
                    style={{ fontSize: 12, color: C.muted, background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>
                    Retake
                  </button>
                </div>
              ) : photoCapture ? (
                <div style={{ borderRadius: 8, overflow: "hidden", position: "relative" }}>
                  <video ref={videoRef} autoPlay playsInline style={{ width: "100%", borderRadius: 8, display: "block" }} />
                  <canvas ref={canvasRef} style={{ display: "none" }} />
                  <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                    <button className="btn-primary" onClick={snapPhoto} style={{ flex: 1, padding: "10px" }}>📸 Capture</button>
                    <button onClick={stopCamera} style={{ flex: 1, padding: "10px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={startCamera}
                    style={{ flex: 1, padding: "10px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
                      color: C.text, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    📷 Open Camera
                  </button>
                  <label style={{ flex: 1, padding: "10px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
                    color: C.text, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    🖼️ Upload Photo
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) { const reader = new FileReader(); reader.onload = ev => setCapturedPhoto(ev.target.result); reader.readAsDataURL(file); }
                    }} />
                  </label>
                </div>
              )}
            </div>
          )}

          {err && <div style={{ color: "#ef4444", fontSize: 13, padding: "8px 12px", background: "rgba(239,68,68,0.08)", borderRadius: 6, border: "1px solid rgba(239,68,68,0.2)" }}>{err}</div>}

          <button className="btn-primary" style={{ width: "100%", height: 48, marginTop: 4, fontSize: 15 }} onClick={handleSubmit} disabled={dbLoading}>
            {dbLoading ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite" }} />
              Please wait…</span>
            : isLogin ? "Sign In →" : "Create Account →"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: C.muted }}>
          {isLogin ? "New to Nova? " : "Already have an account? "}
          <button onClick={() => { setIsLogin(v => !v); setErr(""); }}
            style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
            {isLogin ? "Sign Up Free" : "Sign In"}
          </button>
        </div>

        <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(200,16,46,0.06)", borderRadius: 8, border: `1px solid rgba(200,16,46,0.15)`, fontSize: 11, color: C.muted }}>
          💡 <strong style={{ color: C.text }}>Demo mode:</strong> Social login simulates auth. Email/password uses real Supabase if configured, otherwise runs locally.
        </div>
      </div>
    </div>
  );
}

// ─── LANGUAGE PICKER ──────────────────────────────────────────
function LanguagePicker({ onClose }) {
  const { uiLang, setUiLang } = useApp();
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <button className="btn-icon" onClick={onClose} style={{ position: "absolute", top: 16, right: 16 }}>
          <Icon name="x" size={18} />
        </button>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Language / भाषा</div>
        <div style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>Choose your preferred UI language</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {LANGUAGES.map(lang => (
            <button key={lang.code} className={`lang-btn ${uiLang === lang.code ? "active" : ""}`}
              style={{ justifyContent: "flex-start", padding: "10px 14px" }}
              onClick={() => { setUiLang(lang.code); onClose(); }}>
              <span style={{ fontSize: 18 }}>{lang.flag}</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{lang.name}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{lang.native}</div>
              </div>
              {uiLang === lang.code && <Icon name="check" size={14} color={C.accent} style={{ marginLeft: "auto" }} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CONTENT CARD ─────────────────────────────────────────────
function ContentCard({ item, wide = false, showAiBadge = false }) {
  const { setSelectedContent, setCurrentPage, toggleWatchlist, watchlist, playContent } = useApp();
  const inWL = watchlist.includes(item.id);
  const w = wide ? 260 : 185;
  const h = wide ? 146 : 104;

  return (
    <div className="card-lift" style={{ flexShrink: 0, width: w, background: C.card, borderRadius: 8, overflow: "hidden" }}
      onClick={() => { setSelectedContent(item); setCurrentPage("detail"); }}>
      <div style={{ position: "relative" }}>
        <img src={item.thumb} alt={item.title} style={{ width: "100%", height: h, objectFit: "cover", display: "block" }} />
        {showAiBadge && (
          <div style={{ position: "absolute", top: 8, left: 8 }}>
            <span className="ai-badge"><Icon name="sparkles" size={9} color="white" style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />AI Pick</span>
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 50%)", opacity: 0, transition: "opacity 0.25s" }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0}>
          <div style={{ position: "absolute", bottom: 10, left: 10, right: 10, display: "flex", gap: 8 }}>
            <button className="btn-primary" style={{ flex: 1, padding: "6px 0", fontSize: 12 }}
              onClick={e => { e.stopPropagation(); playContent(item); }}>▶ Play</button>
            <button onClick={e => { e.stopPropagation(); toggleWatchlist(item.id); }}
              style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", width: 30, borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={inWL ? "check" : "plus"} size={14} />
            </button>
          </div>
        </div>
      </div>
      <div style={{ padding: "10px 10px 12px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
        <div style={{ fontSize: 11, color: C.muted, display: "flex", gap: 8 }}>
          <span>{item.year}</span>
          <span style={{ color: C.gold }}>★ {item.rating}</span>
          <span>{item.language}</span>
        </div>
      </div>
    </div>
  );
}

// ─── CONTENT ROW ──────────────────────────────────────────────
function ContentRow({ title, items, wide = false, showAiBadges = false }) {
  const scrollRef = useRef(null);
  const scroll = (dir) => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir * 420, behavior: "smooth" });
  };
  if (!items?.length) return null;
  return (
    <div className="section">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          {showAiBadges && <span className="ai-badge" style={{ marginLeft: 8 }}><Icon name="sparkles" size={10} color="white" style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />AI</span>}
          {title}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn-icon" onClick={() => scroll(-1)} style={{ background: C.card, border: `1px solid ${C.border}`, width: 34, height: 34 }}><Icon name="chevronLeft" size={16} /></button>
          <button className="btn-icon" onClick={() => scroll(1)} style={{ background: C.card, border: `1px solid ${C.border}`, width: 34, height: 34 }}><Icon name="chevronRight" size={16} /></button>
        </div>
      </div>
      <div className="scrollrow" ref={scrollRef}>
        {items.map(item => <ContentCard key={item.id} item={item} wide={wide} showAiBadge={showAiBadges} />)}
      </div>
    </div>
  );
}

// ─── CONTINUE WATCHING ROW ────────────────────────────────────
function ContinueWatchingRow() {
  const { continueWatching, playContent, t } = useApp();
  const items = continueWatching.map(cw => {
    const c = ALL_CONTENT.find(x => x.id === cw.id);
    return c ? { ...c, progress: cw.progress, lastWatched: cw.lastWatched } : null;
  }).filter(Boolean);
  if (!items.length) return null;
  return (
    <div className="section">
      <div className="section-title">{t("continueWatching")}</div>
      <div className="scrollrow">
        {items.map(item => (
          <div key={item.id} style={{ flexShrink: 0, width: 260, cursor: "pointer" }} className="card-lift" onClick={() => playContent(item)}>
            <div style={{ position: "relative", borderRadius: 8, overflow: "hidden" }}>
              <img src={item.thumb} alt={item.title} style={{ width: "100%", height: 146, objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(200,16,46,0.9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="play" size={20} color="white" />
                </div>
              </div>
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
                <div className="progress-bar" style={{ borderRadius: 0 }}>
                  <div className="progress-fill" style={{ width: `${item.progress}%` }} />
                </div>
              </div>
            </div>
            <div style={{ padding: "10px 4px 0" }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{item.progress}% • {item.lastWatched}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AI RECOMMENDATIONS SECTION ───────────────────────────────
function AiRecommendationsSection() {
  const { watchHistory, favorites, ratings, t } = useApp();
  const recommended = getRecommendations(watchHistory, favorites, ratings);
  if (!recommended.length) return null;
  return <ContentRow title={t("recommended")} items={recommended} wide showAiBadges />;
}

// ─── HERO SLIDER ──────────────────────────────────────────────
function HeroSlider() {
  const { playContent, setSelectedContent, setCurrentPage, toggleWatchlist, watchlist, t } = useApp();
  const heroes = MOCK_MOVIES.filter(m => m.trending).slice(0, 5);
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => { setIdx(i => (i + 1) % heroes.length); setFade(true); }, 300);
    }, 7000);
    return () => clearInterval(timer);
  }, [heroes.length]);

  const current = heroes[idx];
  const inWL = watchlist.includes(current.id);

  return (
    <div className="hero-wrap" style={{ background: `url(${current.banner}) center/cover no-repeat` }}>
      {/* Overlays */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg, rgba(6,6,15,0.97) 0%, rgba(6,6,15,0.7) 45%, rgba(6,6,15,0.15) 100%)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 260, background: `linear-gradient(to top, ${C.bg}, transparent)` }} />

      {/* Decorative accent line */}
      <div style={{ position: "absolute", left: 0, top: "15%", bottom: "15%", width: 3, background: C.gradient, opacity: 0.6, borderRadius: 3 }} />

      <div style={{ position: "relative", zIndex: 2, padding: "0 5%", maxWidth: 640, opacity: fade ? 1 : 0, transition: "opacity 0.3s" }}>
        {/* Language badge */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
          {current.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
          <span className="tag" style={{ background: "rgba(251,191,36,0.12)", color: C.gold, borderColor: "rgba(251,191,36,0.28)" }}>★ {current.rating}</span>
          <span style={{ fontSize: 12, color: C.muted, background: C.card, padding: "2px 10px", borderRadius: 4, border: `1px solid ${C.border}` }}>{current.language}</span>
        </div>

        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: "clamp(38px,5.5vw,70px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.5px", marginBottom: 16 }}>
          {current.title}
        </h1>

        <p style={{ fontSize: 15, color: "rgba(238,240,248,0.72)", lineHeight: 1.65, marginBottom: 12, maxWidth: 460 }}>{current.description}</p>

        <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 30, fontSize: 13, color: C.muted }}>
          <span>{current.year}</span><span>·</span><span>{current.duration}</span><span>·</span>
          <span style={{ color: C.accent, fontWeight: 600 }}>{current.age}</span>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 28px" }}
            onClick={() => playContent(current)}>
            <Icon name="play" size={16} /> {t("watchNow")}
          </button>
          <button className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 8 }}
            onClick={() => { setSelectedContent(current); setCurrentPage("detail"); }}>
            <Icon name="info" size={16} /> {t("moreInfo")}
          </button>
          <button className="btn-ghost" style={{ padding: "12px 16px" }} onClick={() => toggleWatchlist(current.id)}>
            <Icon name={inWL ? "check" : "plus"} size={16} />
          </button>
        </div>
      </div>

      {/* Slider dots */}
      <div style={{ position: "absolute", bottom: 48, left: "5%", display: "flex", gap: 8 }}>
        {heroes.map((_, i) => (
          <button key={i} onClick={() => { setFade(false); setTimeout(() => { setIdx(i); setFade(true); }, 200); }}
            style={{ width: i === idx ? 28 : 6, height: 6, borderRadius: 3, border: "none", cursor: "pointer", transition: "all 0.3s", background: i === idx ? C.accent : "rgba(255,255,255,0.3)" }} />
        ))}
      </div>
    </div>
  );
}

// ─── NAVBAR ───────────────────────────────────────────────────
function Navbar() {
  const { user, profile, setCurrentPage, currentPage, setAuthModal, dbLogout, watchlist, favorites, t, uiLang } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const langObj = LANGUAGES.find(l => l.code === uiLang) || LANGUAGES[0];

  return (
    <>
      <nav className={`nav-fixed ${scrolled ? "scrolled" : ""}`}>
        <button onClick={() => setCurrentPage("home")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}>
          <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: C.accent, letterSpacing: 3 }}>N</span>
          <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: 3 }}>OVA</span>
        </button>

        <div className="hide-mobile" style={{ display: "flex", gap: 2 }}>
          {[["home", t("home")], ["movies", t("movies")], ["series", t("series")], ["watchlist", t("watchlist")]].map(([page, label]) => (
            <button key={page} onClick={() => setCurrentPage(page)}
              style={{ background: "none", border: "none", color: currentPage === page ? C.text : C.muted, cursor: "pointer", padding: "8px 14px", borderRadius: 6, fontSize: 14, fontWeight: currentPage === page ? 600 : 400, transition: "all 0.2s", fontFamily: "'DM Sans',sans-serif" }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button className="btn-icon" onClick={() => setShowSearch(true)}>
            <Icon name="search" size={18} />
          </button>
          {/* Language toggle */}
          <button className="btn-icon" onClick={() => setShowLangPicker(true)} title="Language" style={{ fontSize: 16 }}>
            {langObj.flag}
          </button>

          {user ? (
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowUserMenu(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                <img src={`https://api.dicebear.com/8.x/personas/svg?seed=${profile?.avatar_seed || user.email || "user"}`}
                  alt="avatar" style={{ width: 34, height: 34, borderRadius: "50%", border: `2px solid ${C.accent}` }} />
                <span className="hide-mobile" style={{ fontSize: 13, fontWeight: 600 }}>{profile?.display_name || user.user_metadata?.display_name || "User"}</span>
              </button>
              {showUserMenu && (
                <div className="glass" style={{ position: "absolute", right: 0, top: "calc(100% + 10px)", borderRadius: 12, minWidth: 220, padding: "8px 0", animation: "slideDown 0.2s ease", zIndex: 200 }}>
                  <div style={{ padding: "12px 18px", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{profile?.display_name || "User"}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{user.email}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                      <Icon name="crown" size={13} color={C.gold} />
                      <span style={{ fontSize: 12, color: C.gold, fontWeight: 600 }}>{profile?.plan || "Free"} Plan</span>
                    </div>
                  </div>
                  {[
                    { label: t("profile"), page: "profile", icon: "user" },
                    { label: t("watchlist"), page: "watchlist", icon: "list", badge: watchlist.length },
                    { label: "Favorites", page: "favorites", icon: "heart", badge: favorites.length },
                    { label: t("settings"), page: "settings", icon: "settings" },
                    { label: t("subscription"), page: "subscription", icon: "crown" },
                  ].map(item => (
                    <button key={item.page} onClick={() => { setCurrentPage(item.page); setShowUserMenu(false); }}
                      style={{ width: "100%", background: "none", border: "none", color: C.text, padding: "9px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontFamily: "'DM Sans',sans-serif", transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                      onMouseLeave={e => e.currentTarget.style.background = "none"}>
                      <Icon name={item.icon} size={15} color={C.muted} />
                      {item.label}
                      {item.badge > 0 && <span style={{ marginLeft: "auto", background: C.accent, color: "white", borderRadius: 10, padding: "1px 8px", fontSize: 11 }}>{item.badge}</span>}
                    </button>
                  ))}
                  <div style={{ borderTop: `1px solid ${C.border}`, margin: "6px 0" }} />
                  <button onClick={() => { dbLogout(); setShowUserMenu(false); }}
                    style={{ width: "100%", background: "none", border: "none", color: "#ef4444", padding: "9px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>
                    <Icon name="logout" size={15} color="#ef4444" /> {t("signout")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-ghost" style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => setAuthModal("login")}>{t("login")}</button>
              <button className="btn-primary" style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => setAuthModal("signup")}>{t("signup")}</button>
            </div>
          )}
        </div>
      </nav>

      {showSearch && <SearchOverlay onClose={() => setShowSearch(false)} />}
      {showLangPicker && <LanguagePicker onClose={() => setShowLangPicker(false)} />}
    </>
  );
}

// ─── SEARCH OVERLAY ───────────────────────────────────────────
function SearchOverlay({ onClose }) {
  const { setSelectedContent, setCurrentPage, t } = useApp();
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const ql = q.toLowerCase();
    setResults(ALL_CONTENT.filter(c =>
      c.title.toLowerCase().includes(ql) || c.genre.toLowerCase().includes(ql) ||
      c.tags?.some(t => t.toLowerCase().includes(ql)) || c.language?.toLowerCase().includes(ql)
    ).slice(0, 10));
  }, [q]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 900, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 120, padding: "120px 5% 40px", animation: "fadeIn 0.2s ease", backdropFilter: "blur(12px)" }}
      onClick={onClose}>
      <div style={{ width: "min(640px, 100%)" }} onClick={e => e.stopPropagation()}>
        <div style={{ position: "relative", marginBottom: 24 }}>
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
            placeholder={t("search")}
            style={{ width: "100%", paddingLeft: 46, fontSize: 17, height: 54, border: `2px solid ${C.border}`, background: C.surface, borderRadius: 8 }} />
          <Icon name="search" size={20} color={C.muted} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
          <button onClick={onClose} className="btn-icon" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
            <Icon name="x" size={18} />
          </button>
        </div>

        {!q && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {GENRES.slice(1).map(g => (
              <button key={g} className="genre-chip" onClick={() => setQ(g)}>{g}</button>
            ))}
          </div>
        )}

        {results.length > 0 && (
          <div style={{ maxHeight: 450, overflowY: "auto", background: C.surface, borderRadius: 10, border: `1px solid ${C.border}` }}>
            {results.map(item => (
              <div key={item.id} onClick={() => { setSelectedContent(item); setCurrentPage("detail"); onClose(); }}
                style={{ display: "flex", gap: 14, alignItems: "center", padding: "12px 16px", cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = C.card}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <img src={item.thumb} alt={item.title} style={{ width: 72, height: 40, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{item.genre} · {item.year} · {item.language} · ★ {item.rating}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── VIDEO PLAYER (YouTube Embed) ────────────────────────────
function VideoPlayer() {
  const { playerContent, setCurrentPage, updateProgress, watchHistory, favorites, ratings } = useApp();
  const [progress, setProgress] = useState(0);
  const [showInfo, setShowInfo] = useState(true);
  const related = getRecommendations(watchHistory, favorites, ratings, playerContent).slice(0, 6);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(p => Math.min(100, p + 0.04));
    }, 200);
    return () => clearInterval(timer);
  }, []);

  const close = () => {
    updateProgress(playerContent?.id, Math.round(progress));
    setCurrentPage("home");
  };

  const ytId = playerContent?.youtubeId || "dQw4w9WgXcQ";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ padding: "16px 24px", display: "flex", alignItems: "center", gap: 14, background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        <button className="btn-icon" onClick={close} style={{ background: C.card, border: `1px solid ${C.border}`, width: 38, height: 38 }}>
          <Icon name="arrowLeft" size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700 }}>{playerContent?.title}</div>
          <div style={{ fontSize: 12, color: C.muted }}>{playerContent?.year} · {playerContent?.language} · {playerContent?.age}</div>
        </div>
        <button onClick={() => setShowInfo(v => !v)}
          style={{ padding: "7px 14px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.card,
            color: C.muted, cursor: "pointer", fontSize: 12 }}>
          {showInfo ? "Hide Info" : "Show Info"}
        </button>
      </div>

      {/* Main area */}
      <div style={{ display: "flex", flex: 1, gap: 0 }}>
        {/* YouTube Player */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", background: "#000" }}>
            <iframe
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
              title={playerContent?.title}
            />
          </div>

          {/* Progress tracker */}
          <div style={{ padding: "14px 20px", background: C.surface, borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginBottom: 6 }}>
              <span>Watch Progress (demo)</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* Side info panel */}
        {showInfo && (
          <div style={{ width: 320, background: C.surface, borderLeft: `1px solid ${C.border}`, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {/* Content info */}
            <div style={{ padding: "20px" }}>
              <img src={playerContent?.banner} alt="" style={{ width: "100%", borderRadius: 8, marginBottom: 14, objectFit: "cover", height: 140 }} />
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{playerContent?.title}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                {playerContent?.tags?.map(t => <span key={t} className="tag">{t}</span>)}
                <span style={{ fontSize: 11, color: C.gold }}>★ {playerContent?.rating}</span>
              </div>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>{playerContent?.description}</p>
              <div style={{ fontSize: 12, color: C.muted }}>
                <div style={{ marginBottom: 4 }}><strong style={{ color: C.text }}>Director:</strong> {playerContent?.director}</div>
                <div><strong style={{ color: C.text }}>Cast:</strong> {playerContent?.cast?.join(", ")}</div>
              </div>
            </div>

            {/* AI Recommendations below player */}
            {related.length > 0 && (
              <div style={{ padding: "0 20px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span className="ai-badge">
                    <Icon name="sparkles" size={9} color="white" style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />
                    AI PICKS
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Up Next</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {related.map(item => <MiniContentCard key={item.id} item={item} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniContentCard({ item }) {
  const { setSelectedContent, setCurrentPage, playContent } = useApp();
  return (
    <div style={{ display: "flex", gap: 10, cursor: "pointer", padding: "8px", borderRadius: 8, transition: "background 0.2s" }}
      onMouseEnter={e => e.currentTarget.style.background = C.card}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      onClick={() => { setSelectedContent(item); setCurrentPage("detail"); }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <img src={item.thumb} alt={item.title} style={{ width: 90, height: 52, objectFit: "cover", borderRadius: 6 }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          opacity: 0, transition: "opacity 0.2s", background: "rgba(0,0,0,0.5)", borderRadius: 6 }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0}>
          <button className="btn-primary" style={{ padding: "4px 10px", fontSize: 11 }}
            onClick={e => { e.stopPropagation(); playContent(item); }}>▶</button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{item.genre} · ★ {item.rating}</div>
      </div>
    </div>
  );
}

// ─── DETAIL PAGE ──────────────────────────────────────────────
function DetailPage() {
  const { selectedContent: item, setCurrentPage, playContent, toggleWatchlist, toggleFavorite, watchlist, favorites, watchHistory, ratings, t } = useApp();
  const [tab, setTab] = useState("about");
  const [review, setReview] = useState("");
  const [reviews, setReviews] = useState([
    { user: "Alex M.", rating: 5, text: "Breathtaking. One of the best films this decade.", time: "2 days ago" },
    { user: "Priya K.", rating: 4, text: "Great storytelling with stunning visuals.", time: "5 days ago" },
  ]);

  if (!item) return null;
  const inWL = watchlist.includes(item.id);
  const inFav = favorites.includes(item.id);
  const hasWatched = watchHistory.includes(item.id);
  const related = getRecommendations(watchHistory, favorites, ratings, item).slice(0, 8);

  return (
    <div className="fade-up">
      <div style={{ position: "relative", height: "62vh", background: `url(${item.banner}) center/cover no-repeat` }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(6,6,15,1) 0%, rgba(6,6,15,0.45) 50%, rgba(6,6,15,0.15) 100%)" }} />
        <button className="btn-icon" onClick={() => setCurrentPage("home")}
          style={{ position: "absolute", top: 84, left: "5%", background: "rgba(0,0,0,0.5)", border: `1px solid ${C.border}`, width: 42, height: 42, zIndex: 10, borderRadius: 8 }}>
          <Icon name="arrowLeft" size={18} />
        </button>
      </div>

      <div style={{ padding: "0 5%", marginTop: -130, position: "relative", zIndex: 10 }}>
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-end" }}>
          <img src={item.thumb} alt={item.title} style={{ width: 170, height: 240, objectFit: "cover", borderRadius: 10, border: `2px solid ${C.border}`, flexShrink: 0, boxShadow: "0 12px 40px rgba(0,0,0,0.6)" }} />
          <div style={{ flex: 1, minWidth: 200, paddingBottom: 12 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {item.tags?.map(tag => <span key={tag} className="tag">{tag}</span>)}
              <span className="tag" style={{ background: "rgba(251,191,36,0.1)", color: C.gold, borderColor: "rgba(251,191,36,0.25)" }}>★ {item.rating}</span>
              {hasWatched && <span className="tag" style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", borderColor: "rgba(16,185,129,0.25)" }}>✓ Watched</span>}
            </div>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: "clamp(28px,4.5vw,52px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.3px", marginBottom: 8 }}>{item.title}</h1>
            <div style={{ display: "flex", gap: 12, fontSize: 13, color: C.muted, marginBottom: 16, flexWrap: "wrap" }}>
              <span>{item.year}</span><span>·</span>
              <span>{item.duration || `${item.seasons} Seasons · ${item.episodes} Eps`}</span><span>·</span>
              <span style={{ color: C.accent, fontWeight: 600 }}>{item.age}</span><span>·</span>
              <span>{item.language}</span>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={() => playContent(item)}>
                <Icon name="play" size={15} /> {t("watchNow")}
              </button>
              <button className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={() => toggleWatchlist(item.id)}>
                <Icon name={inWL ? "check" : "plus"} size={15} />
                {inWL ? "In Watchlist" : t("addWatchlist")}
              </button>
              <button className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 8, color: inFav ? "#ef4444" : undefined }}
                onClick={() => toggleFavorite(item.id)}>
                <Icon name={inFav ? "heart" : "heartOutline"} size={15} color={inFav ? "#ef4444" : "currentColor"} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, margin: "28px 0 0", borderBottom: `1px solid ${C.border}` }}>
          {["about", "cast", "reviews"].map(tab_ => (
            <button key={tab_} onClick={() => setTab(tab_)}
              style={{ background: "none", border: "none", color: tab === tab_ ? C.text : C.muted, padding: "11px 20px", cursor: "pointer", fontSize: 14, fontWeight: tab === tab_ ? 700 : 400, fontFamily: "'DM Sans',sans-serif", borderBottom: `2px solid ${tab === tab_ ? C.accent : "transparent"}`, transition: "all 0.2s", textTransform: "capitalize" }}>
              {tab_}
            </button>
          ))}
        </div>

        <div style={{ padding: "24px 0 0" }}>
          {tab === "about" && (
            <div>
              <p style={{ fontSize: 15, lineHeight: 1.72, color: "rgba(238,240,248,0.82)", maxWidth: 680, marginBottom: 24 }}>{item.description}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 14, marginBottom: 24 }}>
                {[["Director", item.director], ["Genre", item.genre], ["Language", item.language], ["Rating", item.age]].map(([l, v]) => (
                  <div key={l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 16px" }}>
                    <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>{l}</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" }}>Your Rating</div>
                <StarRating contentId={item.id} />
              </div>
            </div>
          )}

          {tab === "cast" && (
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {item.cast?.map((actor, i) => (
                <div key={i} style={{ textAlign: "center", width: 100 }}>
                  <img src={`https://api.dicebear.com/8.x/personas/svg?seed=${actor}`} alt={actor}
                    style={{ width: 74, height: 74, borderRadius: "50%", border: `2px solid ${C.border}`, objectFit: "cover" }} />
                  <div style={{ fontSize: 12, fontWeight: 600, marginTop: 7 }}>{actor}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>Cast</div>
                </div>
              ))}
            </div>
          )}

          {tab === "reviews" && (
            <div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
                {reviews.map((r, i) => (
                  <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "18px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{r.user}</div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ color: C.gold, fontSize: 13 }}>{"★".repeat(r.rating)}</span>
                        <span style={{ fontSize: 11, color: C.muted }}>{r.time}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: "rgba(238,240,248,0.75)", lineHeight: 1.6 }}>{r.text}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <input value={review} onChange={e => setReview(e.target.value)} placeholder="Write your review…" style={{ flex: 1 }} />
                <button className="btn-primary" style={{ flexShrink: 0, padding: "11px 20px" }} onClick={() => {
                  if (!review.trim()) return;
                  setReviews(prev => [{ user: "You", rating: 5, text: review, time: "Just now" }, ...prev]);
                  setReview("");
                }}>Post</button>
              </div>
            </div>
          )}
        </div>

        {/* AI recommended based on this content */}
        {related.length > 0 && (
          <ContentRow title={`More like this`} items={related} showAiBadges />
        )}
      </div>
    </div>
  );
}

// ─── BROWSE PAGE ─────────────────────────────────────────────
function BrowsePage({ type }) {
  const items = type === "movies" ? MOCK_MOVIES : MOCK_SERIES;
  const [genre, setGenre] = useState("All");
  const [sort, setSort] = useState("rating");
  const [langFilter, setLangFilter] = useState("All");

  const filtered = items
    .filter(i => (genre === "All" || i.genre === genre) && (langFilter === "All" || i.language === langFilter))
    .sort((a, b) => sort === "rating" ? b.rating - a.rating : sort === "year" ? b.year - a.year : a.title.localeCompare(b.title));

  return (
    <div style={{ paddingTop: 90, padding: "90px 5% 40px" }} className="fade-up">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 42, fontWeight: 800, marginBottom: 4 }}>
          {type === "movies" ? "Movies" : "Web Series"}
        </h1>
        <p style={{ color: C.muted, fontSize: 13 }}>{filtered.length} titles</p>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24, alignItems: "center" }}>
        <div className="scrollrow" style={{ flex: 1, paddingBottom: 0, gap: 8 }}>
          {GENRES.map(g => (
            <button key={g} className={`genre-chip ${genre === g ? "active" : ""}`} onClick={() => setGenre(g)}>{g}</button>
          ))}
        </div>
        <select value={langFilter} onChange={e => setLangFilter(e.target.value)} style={{ width: "auto", fontSize: 13 }}>
          {CONTENT_LANGUAGES.map(l => <option key={l}>{l}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ width: "auto", fontSize: 13 }}>
          <option value="rating">Top Rated</option>
          <option value="year">Newest</option>
          <option value="title">A–Z</option>
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(185px,1fr))", gap: 16 }}>
        {filtered.map(item => <ContentCard key={item.id} item={item} />)}
      </div>
    </div>
  );
}

// ─── COLLECTION PAGE ──────────────────────────────────────────
function CollectionPage({ type }) {
  const { watchlist, favorites, setSelectedContent, setCurrentPage, playContent, t } = useApp();
  const ids = type === "watchlist" ? watchlist : favorites;
  const items = ALL_CONTENT.filter(c => ids.includes(c.id));
  const title = type === "watchlist" ? t("watchlist") : "Favorites";

  return (
    <div style={{ paddingTop: 90, padding: "90px 5% 40px" }} className="fade-up">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 42, fontWeight: 800, marginBottom: 4 }}>{title}</h1>
        <p style={{ color: C.muted, fontSize: 13 }}>{items.length} {items.length === 1 ? "title" : "titles"}</p>
      </div>
      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: C.muted }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: C.text }}>Nothing here yet</div>
          <div style={{ fontSize: 14 }}>Browse and save content to see it here</div>
          <button className="btn-primary" style={{ marginTop: 24 }} onClick={() => setCurrentPage("movies")}>Browse Movies</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(185px,1fr))", gap: 16 }}>
          {items.map(item => <ContentCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}

// ─── PROFILE PAGE ─────────────────────────────────────────────
function ProfilePage() {
  const { user, profile, setProfile, watchlist, favorites, watchHistory, continueWatching, dbLogout, setCurrentPage, showNotification, t, uiLang, setUiLang } = useApp();
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [dob, setDob] = useState(profile?.dob || "");
  const [gender, setGender] = useState(profile?.gender || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || null);
  const [coverUrl, setCoverUrl] = useState(profile?.coverUrl || null);
  const [photoCapture, setPhotoCapture] = useState(false);
  const [stream, setStream] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const langObj = LANGUAGES.find(l => l.code === uiLang) || LANGUAGES[0];

  if (!user) return (
    <div style={{ paddingTop: 140, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <div style={{ fontSize: 18, marginBottom: 20, color: C.muted }}>Please sign in to view your profile</div>
    </div>
  );

  const stats = [
    { label: t("watchlist"), value: watchlist.length, icon: "list", page: "watchlist" },
    { label: "Favorites", value: favorites.length, icon: "heart", page: "favorites" },
    { label: "Watched", value: watchHistory.length, icon: "playCircle", page: "home" },
    { label: "In Progress", value: continueWatching.length, icon: "play", page: "home" },
  ];

  const handlePhotoFile = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (type === "avatar") setAvatarUrl(ev.target.result);
      else setCoverUrl(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    setPhotoCapture(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch { showNotification("Camera access denied", "error"); setPhotoCapture(false); }
  };

  const snapPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    setAvatarUrl(canvasRef.current.toDataURL("image/jpeg", 0.85));
    stream?.getTracks().forEach(t => t.stop());
    setStream(null); setPhotoCapture(false);
  };

  const saveProfile = () => {
    if (setProfile) setProfile(prev => ({ ...prev, display_name: displayName, bio, phone, dob, gender, avatarUrl, coverUrl }));
    setEditMode(false);
    showNotification("Profile updated ✓");
  };

  const TABS = ["overview", "activity", "settings"];

  return (
    <div className="fade-up" style={{ paddingTop: 66 }}>
      {/* Cover Photo */}
      <div style={{ position: "relative", height: 220, background: coverUrl ? `url(${coverUrl}) center/cover no-repeat` : `linear-gradient(135deg, #1a0010 0%, ${C.surface} 50%, #0a0820 100%)`, overflow: "hidden" }}>
        {!coverUrl && (
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(200,16,46,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(79,70,229,0.1) 0%, transparent 60%)" }} />
        )}
        {editMode && (
          <label style={{ position: "absolute", bottom: 14, right: 14, padding: "8px 14px", background: "rgba(0,0,0,0.6)", border: `1px solid ${C.border}`, borderRadius: 8,
            color: "white", cursor: "pointer", fontSize: 12, backdropFilter: "blur(8px)", display: "flex", alignItems: "center", gap: 6 }}>
            🖼️ Change Cover
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => handlePhotoFile(e, "cover")} />
          </label>
        )}
      </div>

      {/* Profile Header */}
      <div style={{ padding: "0 5%", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 22, alignItems: "flex-end", marginTop: -55, marginBottom: 28, flexWrap: "wrap" }}>
          {/* Avatar */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            {photoCapture ? (
              <div style={{ background: C.surface, border: `2px solid ${C.border}`, borderRadius: 12, padding: 10, width: 280 }}>
                <video ref={videoRef} autoPlay playsInline style={{ width: "100%", borderRadius: 8, display: "block" }} />
                <canvas ref={canvasRef} style={{ display: "none" }} />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button className="btn-primary" onClick={snapPhoto} style={{ flex: 1, padding: "8px", fontSize: 12 }}>📸 Snap</button>
                  <button onClick={() => { stream?.getTracks().forEach(t => t.stop()); setStream(null); setPhotoCapture(false); }}
                    style={{ flex: 1, padding: "8px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, cursor: "pointer", fontSize: 12 }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" style={{ width: 110, height: 110, borderRadius: "50%", objectFit: "cover", border: `3px solid ${C.accent}`, boxShadow: `0 0 0 4px ${C.bg}` }} />
                  : <img src={`https://api.dicebear.com/8.x/personas/svg?seed=${profile?.avatar_seed || user.email}`}
                      style={{ width: 110, height: 110, borderRadius: "50%", border: `3px solid ${C.accent}`, background: C.card, boxShadow: `0 0 0 4px ${C.bg}` }} />
                }
                {editMode && (
                  <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.55)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <label style={{ cursor: "pointer", fontSize: 11, color: "white", textAlign: "center", padding: "2px 6px",
                      background: "rgba(200,16,46,0.8)", borderRadius: 4 }}>
                      📁 Upload
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => handlePhotoFile(e, "avatar")} />
                    </label>
                    <button onClick={startCamera} style={{ fontSize: 11, color: "white", background: "rgba(0,0,0,0.6)", border: "none", borderRadius: 4, padding: "2px 6px", cursor: "pointer" }}>
                      📷 Camera
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ flex: 1, paddingBottom: 8 }}>
            {editMode ? (
              <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Syne',sans-serif", width: "100%", maxWidth: 320, marginBottom: 8 }} />
            ) : (
              <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 32, fontWeight: 800, letterSpacing: "-0.3px", marginBottom: 4 }}>
                {profile?.display_name || user.user_metadata?.display_name || "User"}
              </h1>
            )}
            <div style={{ color: C.muted, fontSize: 13, marginBottom: 10 }}>{user.email}</div>
            {!editMode && bio && <p style={{ fontSize: 14, color: "rgba(238,240,248,0.7)", maxWidth: 480, lineHeight: 1.6, marginBottom: 10 }}>{bio}</p>}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 20, padding: "4px 14px" }}>
                <Icon name="crown" size={13} color={C.gold} />
                <span style={{ fontSize: 12, fontWeight: 700, color: C.gold }}>{profile?.plan || "Free"} Plan</span>
              </div>
              {!editMode ? (
                <button className="btn-ghost" style={{ padding: "7px 16px", fontSize: 13 }} onClick={() => setEditMode(true)}>
                  ✏️ Edit Profile
                </button>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-primary" style={{ padding: "7px 18px", fontSize: 13 }} onClick={saveProfile}>Save Changes</button>
                  <button className="btn-ghost" style={{ padding: "7px 14px", fontSize: 13 }} onClick={() => setEditMode(false)}>Cancel</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Edit Form */}
        {editMode && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "24px", marginBottom: 24 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 18 }}>Edit Profile Details</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: C.muted, marginBottom: 5, display: "block" }}>Phone Number</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.muted, marginBottom: 5, display: "block" }}>Date of Birth</label>
                <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.muted, marginBottom: 5, display: "block" }}>Gender</label>
                <select value={gender} onChange={e => setGender(e.target.value)} style={{ width: "100%" }}>
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="nonbinary">Non-binary</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.muted, marginBottom: 5, display: "block" }}>Language Preference</label>
                <button className="btn-ghost" style={{ width: "100%", textAlign: "left", padding: "11px 14px", fontSize: 14 }}
                  onClick={() => setShowLangPicker(true)}>
                  {langObj.flag} {langObj.name}
                </button>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12, color: C.muted, marginBottom: 5, display: "block" }}>Bio</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us something about yourself…" rows={3}
                  style={{ width: "100%", resize: "vertical" }} />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`, marginBottom: 28 }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: "10px 22px", background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600,
                color: activeTab === tab ? C.accent : C.muted, borderBottom: activeTab === tab ? `2px solid ${C.accent}` : "2px solid transparent",
                textTransform: "capitalize", transition: "color 0.2s" }}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
              {stats.map(s => (
                <div key={s.label} className="stat-chip" onClick={() => setCurrentPage(s.page)}>
                  <Icon name={s.icon} size={22} color={C.accent} style={{ marginBottom: 6 }} />
                  <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Syne',sans-serif" }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Profile Info Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
              {phone && (
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px" }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>PHONE</div>
                  <div style={{ fontWeight: 600 }}>{phone}</div>
                </div>
              )}
              {dob && (
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px" }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>DATE OF BIRTH</div>
                  <div style={{ fontWeight: 600 }}>{new Date(dob).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</div>
                </div>
              )}
              {gender && (
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px" }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>GENDER</div>
                  <div style={{ fontWeight: 600, textTransform: "capitalize" }}>{gender}</div>
                </div>
              )}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px" }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>LANGUAGE</div>
                <div style={{ fontWeight: 600 }}>{langObj.flag} {langObj.name}</div>
              </div>
            </div>

            {/* Subscription card */}
            <div style={{ background: "linear-gradient(135deg,rgba(200,16,46,0.12),rgba(255,71,87,0.06))", border: `1px solid rgba(200,16,46,0.25)`, borderRadius: 12, padding: "22px 26px", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Current Plan</div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: C.accent }}>{profile?.plan || "Free"} Plan</div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>Renews July 5, 2026 · ₹499/month</div>
                </div>
                <button className="btn-primary" style={{ fontSize: 13 }} onClick={() => setCurrentPage("subscription")}>Upgrade Plan</button>
              </div>
            </div>
          </>
        )}

        {activeTab === "activity" && (
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Recent Activity</div>
            {watchHistory.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📺</div>
                <div>No watch history yet</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {watchHistory.slice(0, 8).map(id => {
                  const content = ALL_CONTENT.find(c => c.id === id);
                  if (!content) return null;
                  const cw = continueWatching.find(x => x.id === id);
                  return (
                    <div key={id} style={{ display: "flex", gap: 14, alignItems: "center", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px" }}>
                      <img src={content.thumb} alt={content.title} style={{ width: 72, height: 40, objectFit: "cover", borderRadius: 6 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{content.title}</div>
                        <div style={{ fontSize: 12, color: C.muted }}>{content.genre} · {content.year}</div>
                      </div>
                      {cw && (
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 12, color: C.accent, fontWeight: 700 }}>{cw.progress}% done</div>
                          <div style={{ width: 80, marginTop: 4 }}>
                            <div className="progress-bar"><div className="progress-fill" style={{ width: `${cw.progress}%` }} /></div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { icon: "globe", label: "Interface Language", value: `${langObj.flag} ${langObj.name}`, action: () => setShowLangPicker(true), btnLabel: "Change" },
              { icon: "settings", label: "Notification Preferences", value: "Push & Email enabled", action: () => {}, btnLabel: "Configure" },
              { icon: "grid", label: "Content Maturity", value: "All audiences", action: () => {}, btnLabel: "Change" },
              { icon: "playCircle", label: "Autoplay", value: "Next episode plays automatically", action: () => {}, btnLabel: "Toggle" },
            ].map(row => (
              <div key={row.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                <Icon name={row.icon} size={20} color={C.muted} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{row.label}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{row.value}</div>
                </div>
                <button onClick={row.action} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.border}`, background: "none", color: C.muted, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}>
                  {row.btnLabel}
                </button>
              </div>
            ))}

            <div style={{ marginTop: 8 }}>
              <button onClick={dbLogout} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: `1px solid rgba(239,68,68,0.3)`, color: "#ef4444", padding: "11px 22px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>
                <Icon name="logout" size={16} color="#ef4444" /> {t("signout")}
              </button>
            </div>
          </div>
        )}

        {activeTab === "overview" && (
          <div style={{ marginTop: 10 }}>
            <button onClick={dbLogout} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: `1px solid rgba(239,68,68,0.3)`, color: "#ef4444", padding: "11px 22px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>
              <Icon name="logout" size={16} color="#ef4444" /> {t("signout")}
            </button>
          </div>
        )}

        <div style={{ height: 40 }} />
      </div>

      {showLangPicker && <LanguagePicker onClose={() => setShowLangPicker(false)} />}
    </div>
  );
}

// ─── SUBSCRIPTION PAGE ────────────────────────────────────────
function SubscriptionPage() {
  const { user, setAuthModal, initPayment, profile, t } = useApp();
  const plans = [
    { name: "Free", price: "₹0", period: "forever", features: ["Limited content", "Ads enabled", "720p quality", "1 device"], highlight: false, btnLabel: "Current Free Plan" },
    { name: "Premium", price: "₹499", period: "/month", features: ["Full content library", "Ad-free", "4K Ultra HD", "2 devices", "Offline downloads", "All Indian languages"], highlight: true, btnLabel: "Subscribe Premium" },
    { name: "Family", price: "₹799", period: "/month", features: ["Everything in Premium", "6 profiles", "4 simultaneous streams", "Kids mode", "Family controls", "Priority support"], highlight: false, btnLabel: "Subscribe Family", color: C.gold },
  ];

  return (
    <div style={{ paddingTop: 90, padding: "90px 5% 60px" }} className="fade-up">
      <div style={{ textAlign: "center", marginBottom: 52 }}>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: "clamp(32px,5vw,54px)", fontWeight: 800, marginBottom: 12 }}>{t("chooseplan")}</h1>
        <p style={{ color: C.muted, fontSize: 16 }}>Unlimited streaming. Cancel anytime. Powered by Razorpay.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 22, maxWidth: 940, margin: "0 auto" }}>
        {plans.map(plan => (
          <div key={plan.name} style={{
            background: plan.highlight ? "linear-gradient(135deg,rgba(200,16,46,0.14),rgba(255,71,87,0.06))" : C.card,
            border: `2px solid ${plan.highlight ? C.accent : plan.color ? "rgba(251,191,36,0.35)" : C.border}`,
            borderRadius: 14, padding: "32px 28px", position: "relative",
            transform: plan.highlight ? "scale(1.03)" : "none",
            transition: "transform 0.2s, box-shadow 0.2s",
            boxShadow: plan.highlight ? `0 0 40px ${C.accentGlow}` : "none",
          }}>
            {plan.highlight && <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: C.accent, color: "white", fontSize: 10, fontWeight: 800, padding: "4px 14px", borderRadius: 20, letterSpacing: 1, whiteSpace: "nowrap" }}>⚡ MOST POPULAR</div>}
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: plan.color || (plan.highlight ? C.accent : C.text), marginBottom: 6 }}>{plan.name}</div>
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 40, fontWeight: 800 }}>{plan.price}</span>
              <span style={{ color: C.muted, fontSize: 14 }}>{plan.period}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 28 }}>
              {plan.features.map(f => (
                <div key={f} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: plan.highlight ? "rgba(200,16,46,0.18)" : "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name="check" size={11} color={plan.highlight ? C.accent : C.muted} />
                  </div>
                  <span style={{ fontSize: 13, color: plan.highlight ? C.text : C.muted }}>{f}</span>
                </div>
              ))}
            </div>
            <button
              className={plan.highlight ? "btn-primary" : "btn-ghost"}
              style={{ width: "100%", height: 44, border: plan.color ? `1px solid rgba(251,191,36,0.4)` : undefined, color: plan.color && !plan.highlight ? C.gold : undefined }}
              onClick={() => {
                if (plan.name === "Free") return;
                if (!user) { setAuthModal("login"); return; }
                initPayment(plan.name);
              }}>
              {plan.name === profile?.plan ? "✓ Current Plan" : plan.btnLabel}
            </button>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 40, padding: "20px", background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, maxWidth: 500, margin: "40px auto 0" }}>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>🔒 Secured by Razorpay</div>
        <div style={{ fontSize: 12, color: C.muted }}>Supports UPI, cards, net banking, wallets. Cancel anytime.</div>
      </div>
    </div>
  );
}

// ─── SETTINGS PAGE ────────────────────────────────────────────
function SettingsPage() {
  const { uiLang, setUiLang, t } = useApp();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const langObj = LANGUAGES.find(l => l.code === uiLang) || LANGUAGES[0];

  const settings = [
    { key: "Playback Quality", value: "Auto (4K)" },
    { key: "Subtitles", value: "Off" },
    { key: "Autoplay", value: "On" },
    { key: "Notifications", value: "Enabled" },
    { key: "Downloads", value: "Wi-Fi only" },
  ];

  return (
    <div style={{ paddingTop: 90, padding: "90px 5% 40px", maxWidth: 700, margin: "0 auto" }} className="fade-up">
      <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 40, fontWeight: 800, marginBottom: 28 }}>{t("settings")}</h1>

      {/* Language setting */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="globe" size={16} color={C.muted} /> {t("language")}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{langObj.flag} {langObj.native} — {langObj.name}</div>
        </div>
        <button className="btn-ghost" style={{ fontSize: 13, padding: "7px 14px" }} onClick={() => setShowLangPicker(true)}>Change</button>
      </div>

      {settings.map(s => (
        <div key={s.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{s.key}</span>
          <span style={{ fontSize: 13, color: C.muted }}>{s.value}</span>
        </div>
      ))}

      {showLangPicker && <LanguagePicker onClose={() => setShowLangPicker(false)} />}
    </div>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────
function HomePage() {
  const { user, watchHistory, favorites, ratings, t } = useApp();
  const trending = ALL_CONTENT.filter(c => c.trending);
  const top10 = MOCK_MOVIES.filter(m => m.top10).sort((a, b) => b.rating - a.rating).slice(0, 10);
  const newReleases = [...ALL_CONTENT].sort((a, b) => b.year - a.year).slice(0, 12);
  const action = ALL_CONTENT.filter(c => c.genre === "Action" || c.genre === "Thriller");
  const scifi = ALL_CONTENT.filter(c => c.genre === "Sci-Fi" || c.genre === "Fantasy");
  const drama = ALL_CONTENT.filter(c => c.genre === "Drama");
  const hindi = ALL_CONTENT.filter(c => c.language === "Hindi");
  const south = ALL_CONTENT.filter(c => ["Tamil", "Telugu", "Malayalam", "Kannada"].includes(c.language));
  const horror = ALL_CONTENT.filter(c => c.genre === "Horror" || c.genre === "Crime");

  return (
    <div>
      <HeroSlider />
      {user && <ContinueWatchingRow />}
      {user && <AiRecommendationsSection />}
      <ContentRow title={t("trending")} items={trending} wide />
      <ContentRow title={t("newReleases")} items={newReleases} />
      <Top10Section items={top10} />
      <ContentRow title="Popular Series" items={MOCK_SERIES} wide />
      <ContentRow title="Action & Thriller" items={action} />
      <ContentRow title="Sci-Fi & Fantasy" items={scifi} />
      <ContentRow title="Drama Picks" items={drama} wide />
      <ContentRow title="Hindi Originals" items={hindi} />
      <ContentRow title="South Indian Cinema" items={south} wide />
      <ContentRow title="Crime & Horror" items={horror} />
      <GenreSection />
    </div>
  );
}

function Top10Section({ items }) {
  const { setSelectedContent, setCurrentPage } = useApp();
  return (
    <div className="section">
      <div className="section-title">Top 10 This Week</div>
      <div className="scrollrow">
        {items.map((item, i) => (
          <div key={item.id} style={{ flexShrink: 0, position: "relative", cursor: "pointer" }} className="card-lift"
            onClick={() => { setSelectedContent(item); setCurrentPage("detail"); }}>
            <div style={{ position: "absolute", left: -18, bottom: -8, fontFamily: "'Syne',sans-serif", fontSize: 90, fontWeight: 800, color: "transparent", WebkitTextStroke: `2px ${C.border}`, zIndex: 0, lineHeight: 1, userSelect: "none" }}>{i + 1}</div>
            <div style={{ marginLeft: 38, position: "relative", zIndex: 1 }}>
              <img src={item.thumb} alt={item.title} style={{ width: 130, height: 185, objectFit: "cover", borderRadius: 8, display: "block" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GenreSection() {
  const genreList = [
    { name: "Action", color: "#c8102e", img: "https://picsum.photos/seed/gact/400/200" },
    { name: "Sci-Fi", color: "#3b82f6", img: "https://picsum.photos/seed/gsci/400/200" },
    { name: "Drama", color: "#8b5cf6", img: "https://picsum.photos/seed/gdrm/400/200" },
    { name: "Thriller", color: "#f59e0b", img: "https://picsum.photos/seed/gthr/400/200" },
    { name: "Fantasy", color: "#10b981", img: "https://picsum.photos/seed/gfan/400/200" },
    { name: "Horror", color: "#6b7280", img: "https://picsum.photos/seed/ghor/400/200" },
  ];
  return (
    <div className="section">
      <div className="section-title">Browse by Genre</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 12 }}>
        {genreList.map(g => (
          <div key={g.name} style={{ borderRadius: 10, overflow: "hidden", position: "relative", height: 88, cursor: "pointer" }} className="card-lift">
            <img src={g.img} alt={g.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg,${g.color}cc,rgba(0,0,0,0.7))`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: "white", letterSpacing: 1, textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>{g.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────
function Footer() {
  const { setCurrentPage } = useApp();
  return (
    <footer style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: "44px 5% 28px", marginTop: 32 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 36, marginBottom: 36 }}>
        <div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 800, color: C.accent, letterSpacing: 3 }}>N<span style={{ color: C.text }}>OVA</span></span>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 10, lineHeight: 1.7 }}>Premium streaming for every Indian language. Watch anything, anywhere.</p>
          <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {LANGUAGES.slice(0, 5).map(l => (
              <span key={l.code} style={{ fontSize: 11, color: C.muted, background: C.card, border: `1px solid ${C.border}`, padding: "2px 8px", borderRadius: 4 }}>{l.native}</span>
            ))}
          </div>
        </div>
        {[
          { title: "Browse", links: ["Movies", "Series", "Trending", "New Releases"] },
          { title: "Account", links: ["Profile", "Watchlist", "Favorites", "Subscription"] },
          { title: "Company", links: ["About", "FAQ", "Contact", "Privacy Policy"] },
        ].map(col => (
          <div key={col.title}>
            <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: 14, color: C.muted }}>{col.title}</div>
            {col.links.map(link => (
              <div key={link} style={{ fontSize: 13, color: C.muted, marginBottom: 9, cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.color = C.text}
                onMouseLeave={e => e.currentTarget.style.color = C.muted}
                onClick={() => setCurrentPage(link.toLowerCase().replace(/ /g, ""))}>
                {link}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <span style={{ fontSize: 12, color: C.muted }}>© 2025 NOVA OTT. All rights reserved.</span>
        <div style={{ display: "flex", gap: 14, fontSize: 12, color: C.muted }}>
          <span style={{ cursor: "pointer" }} onClick={() => setCurrentPage("privacypolicy")}>Privacy</span>
          <span>Terms</span>
          <span>Cookies</span>
          <span>🔒 Secured by Razorpay</span>
        </div>
      </div>
    </footer>
  );
}

// ─── SIMPLE PAGE WRAPPER ──────────────────────────────────────
function SimplePage({ title, children }) {
  return (
    <div style={{ paddingTop: 90, padding: "90px 5% 40px", maxWidth: 780, margin: "0 auto" }} className="fade-up">
      <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 40, fontWeight: 800, letterSpacing: "-0.3px", marginBottom: 24 }}>{title}</h1>
      <div style={{ color: "rgba(238,240,248,0.72)", lineHeight: 1.8, fontSize: 15 }}>{children}</div>
    </div>
  );
}

// ─── ROUTER ───────────────────────────────────────────────────
function Router() {
  const { currentPage, playerContent } = useApp();
  if (currentPage === "player" && playerContent) return <VideoPlayer />;

  const pages = {
    home: <HomePage />,
    movies: <BrowsePage type="movies" />,
    series: <BrowsePage type="series" />,
    watchlist: <CollectionPage type="watchlist" />,
    favorites: <CollectionPage type="favorites" />,
    profile: <ProfilePage />,
    detail: <DetailPage />,
    subscription: <SubscriptionPage />,
    settings: <SettingsPage />,
    about: <SimplePage title="About NOVA OTT"><p>NOVA OTT is India's next-generation streaming platform. We believe entertainment should speak your language — literally. With content in Indian languages and an AI engine that learns your taste, we bring you exactly what you want to watch, when you want it.</p><br /><p>Built with Supabase for rock-solid auth and real-time sync, Razorpay for seamless Indian payments, and a recommendation engine that gets smarter with every watch.</p></SimplePage>,
    faq: <SimplePage title="FAQ"><div>{[["What languages are supported?", "Nova OTT supports English, Hindi, Tamil, Telugu, Malayalam, Kannada, Marathi, Bengali, Gujarati, and Punjabi — both in UI and content filtering."], ["How does the AI recommendation work?", "Our engine analyzes your watch history, ratings, and favorites to score every title by genre affinity, language preference, and trending signals."], ["How do I subscribe?", "Go to Subscription and choose your plan. Payments are powered by Razorpay — UPI, cards, net banking all accepted."], ["Is there a free trial?", "New Premium subscribers get 30 days free. No credit card required for the Free plan."]].map(([q, a]) => <div key={q} style={{ marginBottom: 22 }}><div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{q}</div><div style={{ color: "rgba(238,240,248,0.7)", fontSize: 14 }}>{a}</div></div>)}</div></SimplePage>,
    contact: <SimplePage title="Contact Us"><p style={{ marginBottom: 20 }}>Questions? We're here to help.</p><div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 460 }}><input placeholder="Name" /><input placeholder="Email" type="email" /><textarea placeholder="Your message…" rows={4} style={{ resize: "vertical" }} /><button className="btn-primary" style={{ width: 140 }}>Send</button></div></SimplePage>,
    privacypolicy: <SimplePage title="Privacy Policy"><p>Nova OTT uses Supabase for secure user data storage with Row Level Security — your data is accessible only to you. We collect email, watch history, preferences, and payment records to power personalization and billing. We do not sell your data. Payments are processed by Razorpay and subject to their privacy policy.</p></SimplePage>,
  };

  return (
    <>
      <Navbar />
      <main>{pages[currentPage] || pages.home}</main>
      {currentPage !== "player" && <Footer />}
    </>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────
export default function NovaOTTPro() {
  return (
    <AppProvider>
      <style>{globalCSS}</style>
      <Router />
      <AuthModal />
      <Notification />
    </AppProvider>
  );
}