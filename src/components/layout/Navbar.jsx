import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { C } from "../../constants/theme";
import { LANGUAGES } from "../../constants/languages";
import Icon from "../ui/Icon";
import { LanguagePicker } from "../auth/LanguagePicker";
import SearchOverlay from "./SearchOverlay";

export default function Navbar() {
  const { user, profile, setCurrentPage, currentPage, setAuthModal, dbLogout, watchlist, favorites, t, uiLang } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const langObj = LANGUAGES.find(l => l.code === uiLang) || LANGUAGES[0];

  return (
    <>
      <nav className={`nav-fixed ${scrolled ? "scrolled" : ""}`}>
        {/* Logo */}
        <button onClick={() => setCurrentPage("home")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}>
          <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: C.accent, letterSpacing: 3 }}>N</span>
          <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: 3 }}>OVA</span>
        </button>

        {/* Nav Links */}
        <div className="hide-mobile" style={{ display: "flex", gap: 2 }}>
          {[["home", t("home")], ["movies", t("movies")], ["series", t("series")], ["watchlist", t("watchlist")]].map(([page, label]) => (
            <button key={page} onClick={() => setCurrentPage(page)}
              style={{ background: "none", border: "none", color: currentPage === page ? C.text : C.muted, cursor: "pointer", padding: "8px 14px", borderRadius: 6, fontSize: 14, fontWeight: currentPage === page ? 600 : 400, transition: "all 0.2s", fontFamily: "'DM Sans',sans-serif" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Right Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button className="btn-icon" onClick={() => setShowSearch(true)}>
            <Icon name="search" size={18} />
          </button>
          <button className="btn-icon" onClick={() => setShowLangPicker(true)} title="Language" style={{ fontSize: 16 }}>
            {langObj.flag}
          </button>

          {user ? (
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowUserMenu(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                <img src={`https://api.dicebear.com/8.x/personas/svg?seed=${profile?.avatar_seed || user.email || "user"}`}
                  alt="avatar" style={{ width: 34, height: 34, borderRadius: "50%", border: `2px solid ${C.accent}` }} />
                <span className="hide-mobile" style={{ fontSize: 13, fontWeight: 600 }}>{profile?.display_name || user.user_metadata?.display_name || "User"}</span>
              </button>
              {showUserMenu && (
                <div className="glass" style={{ position: "absolute", right: 0, top: "calc(100% + 10px)", borderRadius: 12, minWidth: 220, padding: "8px 0", animation: "slideDown 0.2s ease", zIndex: 200 }}>
                  <div style={{ padding: "12px 18px", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{profile?.display_name || "User"}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{user.email}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                      <Icon name="crown" size={13} color={C.gold} />
                      <span style={{ fontSize: 12, color: C.gold, fontWeight: 600 }}>{profile?.plan || "Free"} Plan</span>
                    </div>
                  </div>
                  {[
                    { label: t("profile"), page: "profile", icon: "user" },
                    { label: t("watchlist"), page: "watchlist", icon: "list", badge: watchlist.length },
                    { label: "Favorites", page: "favorites", icon: "heart", badge: favorites.length },
                    { label: t("settings"), page: "settings", icon: "settings" },
                    { label: t("subscription"), page: "subscription", icon: "crown" },
                  ].map(item => (
                    <button key={item.page} onClick={() => { setCurrentPage(item.page); setShowUserMenu(false); }}
                      style={{ width: "100%", background: "none", border: "none", color: C.text, padding: "9px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontFamily: "'DM Sans',sans-serif", transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                      onMouseLeave={e => e.currentTarget.style.background = "none"}>
                      <Icon name={item.icon} size={15} color={C.muted} />
                      {item.label}
                      {item.badge > 0 && <span style={{ marginLeft: "auto", background: C.accent, color: "white", borderRadius: 10, padding: "1px 8px", fontSize: 11 }}>{item.badge}</span>}
                    </button>
                  ))}
                  <div style={{ borderTop: `1px solid ${C.border}`, margin: "6px 0" }} />
                  <button onClick={() => { dbLogout(); setShowUserMenu(false); }}
                    style={{ width: "100%", background: "none", border: "none", color: "#ef4444", padding: "9px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>
                    <Icon name="logout" size={15} color="#ef4444" /> {t("signout")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-ghost" style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => setAuthModal("login")}>{t("login")}</button>
              <button className="btn-primary" style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => setAuthModal("signup")}>{t("signup")}</button>
            </div>
          )}
        </div>
      </nav>

      {showSearch && <SearchOverlay onClose={() => setShowSearch(false)} />}
      {showLangPicker && <LanguagePicker onClose={() => setShowLangPicker(false)} />}
    </>
  );
}