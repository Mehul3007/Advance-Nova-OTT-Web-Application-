import { useState } from "react";
import { useApp } from "../context/AppContext";
import { C } from "../constants/theme";
import ContentCard from "../components/ui/ContentCard";

const GENRES = ["All", "Action", "Drama", "Sci-Fi", "Thriller", "Fantasy", "Crime", "Horror", "Historical", "Adventure"];
const CONTENT_LANGUAGES = ["All", "English", "Hindi", "Tamil", "Telugu", "Malayalam", "Kannada", "Marathi", "Bengali"];

export default function BrowsePage({ type }) {
  const { movies, series, contentLoading, t } = useApp();
  const items = type === "movies" ? movies : series;

  const [genre, setGenre] = useState("All");
  const [lang, setLang] = useState("All");
  const [sort, setSort] = useState("rating");
  const [search, setSearch] = useState("");

  const filtered = items
    .filter(c => genre === "All" || c.genre === genre || (c.genres || []).includes(genre))
    .filter(c => lang === "All" || c.language === lang)
    .filter(c => !search || c.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === "rating" ? b.rating - a.rating : sort === "year" ? b.year - a.year : a.title.localeCompare(b.title));

  const pill = (val, active, onClick) => (
    <button key={val} onClick={onClick} style={{
      padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: "pointer",
      background: active ? C.accent : C.card, color: active ? "white" : C.muted,
      border: `1px solid ${active ? C.accent : C.border}`, transition: "all 0.2s", whiteSpace: "nowrap"
    }}>{val}</button>
  );

  return (
    <div style={{ paddingTop: 80, padding: "80px 5% 40px" }} className="fade-up">
      <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 36, fontWeight: 800, marginBottom: 24 }}>
        {type === "movies" ? t("movies") : t("series")}
      </h1>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 20, maxWidth: 400 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
          style={{ width: "100%", padding: "10px 16px 10px 40px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.muted }}>🔍</span>
      </div>

      {/* Genre Filter */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 12, scrollbarWidth: "none" }}>
        {GENRES.map(g => pill(g, genre === g, () => setGenre(g)))}
      </div>

      {/* Language Filter */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 16, scrollbarWidth: "none" }}>
        {CONTENT_LANGUAGES.map(l => pill(l, lang === l, () => setLang(l)))}
      </div>

      {/* Sort */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[["rating", "Top Rated"], ["year", "Newest"], ["title", "A–Z"]].map(([val, label]) =>
          pill(label, sort === val, () => setSort(val))
        )}
      </div>

      {/* Results */}
      {contentLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${C.border}`, borderTopColor: C.accent, animation: "spin 0.8s linear infinite" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: C.muted }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎬</div>
          <div style={{ fontSize: 16 }}>No results found</div>
        </div>
      ) : (
        <>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>{filtered.length} titles</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {filtered.map(item => <ContentCard key={item.id} item={item} />)}
          </div>
        </>
      )}
    </div>
  );
}