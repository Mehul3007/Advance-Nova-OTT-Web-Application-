import { useApp } from "../context/AppContext";
import { C } from "../constants/theme";
import { ALL_CONTENT } from "../constants/mockData";
import ContentCard from "../components/ui/ContentCard";

export default function CollectionPage({ type }) {
  const { watchlist, favorites, setCurrentPage, t } = useApp();
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