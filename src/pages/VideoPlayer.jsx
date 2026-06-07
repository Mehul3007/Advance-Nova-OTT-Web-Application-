import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { C } from "../constants/theme";
import Icon from "../components/ui/Icon";
import { getRecommendations } from "../lib/recommendations";

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

export default function VideoPlayer() {
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
          style={{ padding: "7px 14px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.card, color: C.muted, cursor: "pointer", fontSize: 12 }}>
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