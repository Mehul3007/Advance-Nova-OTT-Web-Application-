import { useApp } from "../context/AppContext";
import { C } from "../constants/theme";
import ContentCard from "../components/ui/ContentCard";

export default function CollectionPage({ type }) {
  const { watchlist, favorites, allContent, setCurrentPage, t } = useApp();
  const ids = type === "watchlist" ? watchlist : favorites;
  const items = ids.map(id => allContent.find(c => c.id === id)).filter(Boolean);

  const title = type === "watchlist" ? t("myWatchlist") : t("myFavorites");
  const emptyIcon = type === "watchlist" ? "🎬" : "♥";
  const emptyMsg = type === "watchlist" ? "Your watchlist is empty" : "No favorites yet";
  const emptySub = type === "watchlist"
    ? "Add movies and series to watch later"
    : "Heart your favorite titles to find them here";

  return (
    <div style={{ paddingTop: 80, padding: "80px 5% 40px" }} className="fade-up">
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <button onClick={() => setCurrentPage("home")}
          style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", color: C.text, cursor: "pointer", fontSize: 13 }}>
          ← Back
        </button>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 32, fontWeight: 800, margin: 0 }}>
          {title}
          {items.length > 0 && (
            <span style={{ fontSize: 16, fontWeight: 500, color: C.muted, marginLeft: 12 }}>
              {items.length} title{items.length !== 1 ? "s" : ""}
            </span>
          )}
        </h1>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: C.muted }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{emptyIcon}</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 8 }}>{emptyMsg}</div>
          <div style={{ fontSize: 14, marginBottom: 24 }}>{emptySub}</div>
          <button onClick={() => setCurrentPage("home")} style={{
            background: C.accent, color: "white", border: "none", borderRadius: 8,
            padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer"
          }}>Browse Content</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {items.map(item => <ContentCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}