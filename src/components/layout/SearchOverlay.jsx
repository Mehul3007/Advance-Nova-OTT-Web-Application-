import { useState, useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { C } from "../../constants/theme";
import Icon from "../ui/Icon";

const GENRES = ["Action", "Drama", "Sci-Fi", "Thriller", "Fantasy", "Crime", "Horror", "Historical", "Adventure"];

export default function SearchOverlay({ onClose }) {
  const { allContent, setSelectedContent, setCurrentPage } = useApp();
  const [query, setQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = allContent.filter(c => {
    const matchQuery = !query || c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.description?.toLowerCase().includes(query.toLowerCase()) ||
      (c.cast || []).some(a => a.toLowerCase().includes(query.toLowerCase()));
    const matchGenre = !activeGenre || c.genre === activeGenre || (c.genres || []).includes(activeGenre);
    return matchQuery && matchGenre;
  }).slice(0, 24);

  const openDetail = (item) => {
    setSelectedContent(item);
    setCurrentPage("detail");
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,6,15,0.97)", zIndex: 200,
      display: "flex", flexDirection: "column", padding: "24px 5%", overflowY: "auto"
    }} className="fade-up">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Icon name="search" size={18} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: C.muted }} />
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search movies, series, cast..."
            style={{
              width: "100%", padding: "14px 16px 14px 48px", background: C.card,
              border: `1px solid ${C.border}`, borderRadius: 10, color: C.text,
              fontSize: 16, outline: "none", boxSizing: "border-box"
            }} />
        </div>
        <button type="button" onClick={onClose} style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
          padding: "12px 16px", color: C.text, cursor: "pointer", fontSize: 14
        }}>✕ Close</button>
      </div>

      {/* Genre Pills */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {GENRES.map(g => (
          <button key={g} type="button" onClick={() => setActiveGenre(activeGenre === g ? null : g)} style={{
            padding: "6px 16px", borderRadius: 20, fontSize: 13, cursor: "pointer",
            background: activeGenre === g ? C.accent : C.card,
            color: activeGenre === g ? "white" : C.muted,
            border: `1px solid ${activeGenre === g ? C.accent : C.border}`,
            transition: "all 0.2s"
          }}>{g}</button>
        ))}
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: C.muted }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <div>No results for "{query}"</div>
        </div>
      ) : (
        <>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>{results.length} results</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {results.map(item => (
              <div key={item.id} onClick={() => openDetail(item)}
                style={{ cursor: "pointer", borderRadius: 8, overflow: "hidden", background: C.card, border: `1px solid ${C.border}` }}
                className="card-lift">
                <img src={item.thumb} alt={item.title}
                  style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }} />
                <div style={{ padding: "10px 10px 12px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    {item.year} · {item.genre} · ★ {item.rating}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}