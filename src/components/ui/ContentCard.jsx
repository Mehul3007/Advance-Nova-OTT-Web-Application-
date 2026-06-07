import { useApp } from "../../context/AppContext";
import { C } from "../../constants/theme";
import Icon from "./Icon";

export function ContentCard({ item, wide = false, showAiBadge = false }) {
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
            <span className="ai-badge">
              <Icon name="sparkles" size={9} color="white" style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />
              AI Pick
            </span>
          </div>
        )}
        <div
          style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 50%)", opacity: 0, transition: "opacity 0.25s" }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0}
        >
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

export default ContentCard;