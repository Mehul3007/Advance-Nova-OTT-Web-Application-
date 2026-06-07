import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { C } from "../../constants/theme";  // ✅ FIXED: was ../../lib/theme
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

export default StarRating;