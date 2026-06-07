import { useState } from "react";
import { C } from "../constants/theme";
import { MOCK_MOVIES, MOCK_SERIES } from "../constants/mockData";
import ContentCard from "../components/ui/ContentCard";

const GENRES = ["All", "Action", "Drama", "Sci-Fi", "Thriller", "Fantasy", "Crime", "Horror", "Historical", "Adventure"];
const CONTENT_LANGUAGES = ["All", "English", "Hindi", "Tamil", "Telugu", "Malayalam", "Kannada", "Marathi", "Bengali"];

export default function BrowsePage({ type }) {
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