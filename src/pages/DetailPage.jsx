import { useState } from "react";
import { useApp } from "../context/AppContext";
import { C } from "../constants/theme";
import { ALL_CONTENT } from "../constants/mockData";
import Icon from "../components/ui/Icon";
import StarRating from "../components/ui/StarRating";
import ContentRow from "../components/ui/ContentRow";
import { getRecommendations } from "../lib/recommendations";

export default function DetailPage() {
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
      {/* Banner */}
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
                  <img
                    src={
                      item.cast_images?.[i]
                        ? item.cast_images[i]
                        : `https://api.dicebear.com/8.x/personas/svg?seed=${actor}`
                    }
                    alt={actor}
                    onError={e => { e.target.src = `https://api.dicebear.com/8.x/personas/svg?seed=${actor}`; }}
                    style={{ width: 74, height: 74, borderRadius: "50%", border: `2px solid ${C.border}`, objectFit: "cover" }}
                  />
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

        {related.length > 0 && (
          <ContentRow title="More like this" items={related} showAiBadges />
        )}
      </div>
    </div>
  );
}