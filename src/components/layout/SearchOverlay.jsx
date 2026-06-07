import { useState, useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { C } from "../../constants/theme";
import { ALL_CONTENT } from "../../constants/mockData";
import Icon from "../ui/Icon";

const GENRES = ["Action", "Drama", "Sci-Fi", "Thriller", "Fantasy", "Crime", "Horror", "Historical", "Adventure"];

export default function SearchOverlay({ onClose }) {
  const { setSelectedContent, setCurrentPage, t } = useApp();
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const ql = q.toLowerCase();
    setResults(
      ALL_CONTENT.filter(c =>
        c.title.toLowerCase().includes(ql) ||
        c.genre.toLowerCase().includes(ql) ||
        c.tags?.some(tag => tag.toLowerCase().includes(ql)) ||
        c.language?.toLowerCase().includes(ql)
      ).slice(0, 10)
    );
  }, [q]);

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 900, display: "flex", flexDirection: "column", alignItems: "center", padding: "120px 5% 40px", animation: "fadeIn 0.2s ease", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <div style={{ width: "min(640px, 100%)" }} onClick={e => e.stopPropagation()}>
        <div style={{ position: "relative", marginBottom: 24 }}>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={t("search")}
            style={{ width: "100%", paddingLeft: 46, fontSize: 17, height: 54, border: `2px solid ${C.border}`, background: C.surface, borderRadius: 8 }}
          />
          <Icon name="search" size={20} color={C.muted} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
          <button onClick={onClose} className="btn-icon" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
            <Icon name="x" size={18} />
          </button>
        </div>

        {!q && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {GENRES.map(g => (
              <button key={g} className="genre-chip" onClick={() => setQ(g)}>{g}</button>
            ))}
          </div>
        )}

        {results.length > 0 && (
          <div style={{ maxHeight: 450, overflowY: "auto", background: C.surface, borderRadius: 10, border: `1px solid ${C.border}` }}>
            {results.map(item => (
              <div
                key={item.id}
                onClick={() => { setSelectedContent(item); setCurrentPage("detail"); onClose(); }}
                style={{ display: "flex", gap: 14, alignItems: "center", padding: "12px 16px", cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = C.card}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
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