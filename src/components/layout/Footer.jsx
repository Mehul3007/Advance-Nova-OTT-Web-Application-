import { useApp } from "../../context/AppContext";
import { C } from "../../constants/theme";
import { LANGUAGES } from "../../constants/languages";

export default function Footer() {
  const { setCurrentPage } = useApp();
  return (
    <footer style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: "44px 5% 28px", marginTop: 32 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 36, marginBottom: 36 }}>
        <div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 800, color: C.accent, letterSpacing: 3 }}>
            N<span style={{ color: C.text }}>OVA</span>
          </span>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 10, lineHeight: 1.7 }}>Premium streaming for every Indian language. Watch anything, anywhere.</p>
          <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {LANGUAGES.slice(0, 5).map(l => (
              <span key={l.code} style={{ fontSize: 11, color: C.muted, background: C.card, border: `1px solid ${C.border}`, padding: "2px 8px", borderRadius: 4 }}>{l.native}</span>
            ))}
          </div>
        </div>
        {[
          { title: "Browse", links: ["Movies", "Series", "Trending", "New Releases"] },
          { title: "Account", links: ["Profile", "Watchlist", "Favorites", "Subscription"] },
          { title: "Company", links: ["About", "FAQ", "Contact", "Privacy Policy"] },
        ].map(col => (
          <div key={col.title}>
            <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: 14, color: C.muted }}>{col.title}</div>
            {col.links.map(link => (
              <div key={link} style={{ fontSize: 13, color: C.muted, marginBottom: 9, cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.color = C.text}
                onMouseLeave={e => e.currentTarget.style.color = C.muted}
                onClick={() => setCurrentPage(link.toLowerCase().replace(/ /g, ""))}>
                {link}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <span style={{ fontSize: 12, color: C.muted }}>© 2025 NOVA OTT. All rights reserved.</span>
        <div style={{ display: "flex", gap: 14, fontSize: 12, color: C.muted }}>
          <span style={{ cursor: "pointer" }} onClick={() => setCurrentPage("privacypolicy")}>Privacy</span>
          <span>Terms</span>
          <span>Cookies</span>
          <span>🔒 Secured by Razorpay</span>
        </div>
      </div>
    </footer>
  );
}