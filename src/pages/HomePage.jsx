import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { C } from "../constants/theme";
import { MOCK_MOVIES, MOCK_SERIES, ALL_CONTENT } from "../constants/mockData";
import ContentRow from "../components/ui/ContentRow";
import ContentCard from "../components/ui/ContentCard";
import Icon from "../components/ui/Icon";
import { getRecommendations } from "../lib/recommendations";

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
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg, rgba(6,6,15,0.97) 0%, rgba(6,6,15,0.7) 45%, rgba(6,6,15,0.15) 100%)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 260, background: `linear-gradient(to top, ${C.bg}, transparent)` }} />
      <div style={{ position: "absolute", left: 0, top: "15%", bottom: "15%", width: 3, background: C.gradient, opacity: 0.6, borderRadius: 3 }} />

      <div style={{ position: "relative", zIndex: 2, padding: "0 5%", maxWidth: 640, opacity: fade ? 1 : 0, transition: "opacity 0.3s" }}>
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
      <div style={{ position: "absolute", bottom: 32, left: "5%", display: "flex", gap: 8, zIndex: 3 }}>
        {heroes.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
            style={{ width: i === idx ? 28 : 8, height: 8, borderRadius: 4, background: i === idx ? C.accent : C.border, border: "none", cursor: "pointer", transition: "all 0.3s" }} />
        ))}
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

// ─── AI RECOMMENDATIONS ───────────────────────────────────────
function AiRecommendationsSection() {
  const { watchHistory, favorites, ratings, t } = useApp();
  const recommended = getRecommendations(watchHistory, favorites, ratings);
  if (!recommended.length) return null;
  return <ContentRow title={t("recommended")} items={recommended} wide showAiBadges />;
}

// ─── TOP 10 SECTION ───────────────────────────────────────────
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

// ─── GENRE SECTION ────────────────────────────────────────────
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

// ─── HOME PAGE ────────────────────────────────────────────────
export default function HomePage() {
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