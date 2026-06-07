import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { C } from "../../constants/theme";
import Icon from "./Icon";

// ─── STAR RATING ──────────────────────────────────────────────
export function StarRating({ contentId, size = 22 }) {
  const { ratings, rateContent } = useApp();
  const [hover, setHover] = useState(0);
  const current = ratings[contentId] || 0;
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} className="btn-icon" style={{ padding: 2 }}
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          onClick={() => rateContent(contentId, n)}>
          <Icon name="star" size={size} color={(hover || current) >= n ? C.gold : C.border} />
        </button>
      ))}
    </div>
  );
}

// ─── NOTIFICATION TOAST ───────────────────────────────────────
export function Notification() {
  const { notification } = useApp();
  if (!notification) return null;
  const colors = { success: C.accent, error: "#ef4444", warn: "#f59e0b" };
  return (
    <div className="notification-toast" style={{ background: C.surface, borderLeft: `3px solid ${colors[notification.type] || C.accent}`, border: `1px solid ${C.border}` }}>
      {notification.msg}
    </div>
  );
}

// ─── SIMPLE PAGE WRAPPER ──────────────────────────────────────
export function SimplePage({ title, children }) {
  return (
    <div style={{ paddingTop: 90, padding: "90px 5% 40px", maxWidth: 780, margin: "0 auto" }} className="fade-up">
      <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 40, fontWeight: 800, letterSpacing: "-0.3px", marginBottom: 24 }}>{title}</h1>
      <div style={{ color: "rgba(238,240,248,0.72)", lineHeight: 1.8, fontSize: 15 }}>{children}</div>
    </div>
  );
}

// ─── PASSWORD STRENGTH ────────────────────────────────────────
export function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: "", color: "transparent" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"];
  const colors = ["transparent", "#ef4444", "#f59e0b", "#eab308", "#22c55e", "#10b981"];
  return { score, label: labels[score] || "Strong", color: colors[Math.min(score, 5)] };
}