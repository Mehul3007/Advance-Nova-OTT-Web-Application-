import { useRef } from "react";
import { C } from "../../constants/theme";
import Icon from "./Icon";
import ContentCard from "./ContentCard";

export default function ContentRow({ title, items, wide = false, showAiBadges = false }) {
  const scrollRef = useRef(null);
  const scroll = (dir) => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir * 420, behavior: "smooth" });
  };
  if (!items?.length) return null;
  return (
    <div className="section">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div className="section-title" style={{ marginBottom: 0 }}>
          {showAiBadges && (
            <span className="ai-badge" style={{ marginLeft: 8 }}>
              <Icon name="sparkles" size={10} color="white" style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />
              AI
            </span>
          )}
          {title}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn-icon" onClick={() => scroll(-1)} style={{ background: C.card, border: `1px solid ${C.border}`, width: 34, height: 34 }}>
            <Icon name="chevronLeft" size={16} />
          </button>
          <button className="btn-icon" onClick={() => scroll(1)} style={{ background: C.card, border: `1px solid ${C.border}`, width: 34, height: 34 }}>
            <Icon name="chevronRight" size={16} />
          </button>
        </div>
      </div>
      <div className="scrollrow" ref={scrollRef}>
        {items.map(item => (
          <ContentCard key={item.id} item={item} wide={wide} showAiBadge={showAiBadges} />
        ))}
      </div>
    </div>
  );
}