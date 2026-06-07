import { C } from "../constants/theme";

export const globalCSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body { background: ${C.bg}; color: ${C.text}; font-family: 'DM Sans', sans-serif; overflow-x: hidden; }

::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: ${C.accent}; border-radius: 4px; }

@keyframes fadeUp   { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:none; } }
@keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
@keyframes scaleIn  { from { opacity:0; transform:scale(0.94); } to { opacity:1; transform:none; } }
@keyframes slideDown{ from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }
@keyframes spin     { to { transform:rotate(360deg); } }

.fade-up  { animation: fadeUp 0.55s cubic-bezier(.22,1,.36,1) forwards; }
.fade-in  { animation: fadeIn 0.4s ease forwards; }
.scale-in { animation: scaleIn 0.35s cubic-bezier(.22,1,.36,1) forwards; }

.glass {
  background: ${C.glassBg};
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid ${C.border};
}

/* ── BUTTONS ── */
.btn-primary {
  background: ${C.gradient};
  color: white; border: none;
  padding: 11px 26px; border-radius: 6px;
  font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 14px;
  cursor: pointer; transition: all 0.2s; letter-spacing: 0.3px;
}
.btn-primary:hover  { filter: brightness(1.12); transform: translateY(-1px); box-shadow: 0 6px 20px ${C.accentGlow}; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

.btn-ghost {
  background: rgba(255,255,255,0.07); color: white;
  border: 1px solid rgba(255,255,255,0.12);
  padding: 11px 26px; border-radius: 6px;
  font-family: 'DM Sans', sans-serif; font-weight: 500; font-size: 14px;
  cursor: pointer; transition: all 0.2s; backdrop-filter: blur(10px);
}
.btn-ghost:hover { background: rgba(255,255,255,0.13); transform: translateY(-1px); }

.btn-icon {
  background: none; border: none; color: ${C.muted}; cursor: pointer;
  padding: 8px; border-radius: 50%; transition: all 0.2s;
  display: flex; align-items: center; justify-content: center;
}
.btn-icon:hover { color: white; background: rgba(255,255,255,0.08); }

/* ── INPUTS ── */
input, textarea, select {
  background: ${C.card}; border: 1px solid ${C.border}; color: ${C.text};
  border-radius: 6px; padding: 11px 14px;
  font-family: 'DM Sans', sans-serif; font-size: 14px;
  outline: none; transition: border-color 0.2s; width: 100%;
}
input:focus, textarea:focus, select:focus { border-color: ${C.accent}; }
input::placeholder, textarea::placeholder { color: ${C.muted}; }
select { cursor: pointer; }

/* ── MODALS ── */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.88); z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(10px); animation: fadeIn 0.25s ease;
}
.modal {
  background: ${C.surface}; border: 1px solid ${C.border}; border-radius: 14px;
  padding: 36px; width: min(480px, 94vw);
  animation: scaleIn 0.3s ease; position: relative;
  max-height: 90vh; overflow-y: auto;
}

/* ── LAYOUT ── */
.nav-fixed {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100; height: 66px;
  display: flex; align-items: center; padding: 0 5%;
  justify-content: space-between; transition: background 0.3s, border-bottom 0.3s;
}
.nav-fixed.scrolled {
  background: ${C.glassBg}; backdrop-filter: blur(20px);
  border-bottom: 1px solid ${C.border};
}

.hero-wrap {
  min-height: 88vh; display: flex; align-items: center;
  position: relative; overflow: hidden;
}

.section { padding: 36px 5%; }
.section-title {
  font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800;
  letter-spacing: 0.5px; margin-bottom: 22px;
  display: flex; align-items: center; gap: 10px;
}
.section-title::before {
  content: ''; width: 3px; height: 20px;
  background: ${C.gradient}; border-radius: 2px; flex-shrink: 0;
}

/* ── CARDS ── */
.scrollrow {
  display: flex; gap: 14px; overflow-x: auto;
  padding-bottom: 10px; scrollbar-width: none;
}
.scrollrow::-webkit-scrollbar { display: none; }

.card-lift { transition: transform 0.28s cubic-bezier(.22,1,.36,1), box-shadow 0.28s; cursor: pointer; }
.card-lift:hover { transform: translateY(-6px) scale(1.02); box-shadow: 0 18px 50px rgba(0,0,0,0.55); }

/* ── TAGS & BADGES ── */
.tag {
  display: inline-block; background: rgba(200,16,46,0.12); color: ${C.accent};
  border: 1px solid rgba(200,16,46,0.28); border-radius: 4px;
  padding: 2px 10px; font-size: 11px; font-weight: 600; letter-spacing: 0.3px;
}
.ai-badge {
  background: linear-gradient(135deg,#7c3aed,#4f46e5); color: white;
  font-size: 10px; font-weight: 700; padding: 2px 8px;
  border-radius: 3px; letter-spacing: 0.5px;
}

/* ── PROGRESS ── */
.progress-bar  { height: 3px; background: ${C.border}; border-radius: 2px; overflow: hidden; }
.progress-fill { height: 100%; background: ${C.accent}; border-radius: 2px; transition: width 0.3s; }

/* ── GENRE CHIPS ── */
.genre-chip {
  padding: 7px 18px; border-radius: 20px; border: 1px solid ${C.border};
  background: ${C.card}; color: ${C.muted}; cursor: pointer;
  font-size: 13px; font-weight: 500; transition: all 0.18s; white-space: nowrap;
}
.genre-chip:hover, .genre-chip.active { background: ${C.accent}; border-color: ${C.accent}; color: white; }

/* ── LANGUAGE BUTTONS ── */
.lang-btn {
  padding: 6px 14px; border-radius: 8px; border: 1px solid ${C.border};
  background: ${C.card}; color: ${C.muted}; cursor: pointer;
  font-size: 13px; transition: all 0.18s;
  display: flex; align-items: center; gap: 8px;
}
.lang-btn:hover, .lang-btn.active { border-color: ${C.accent}; color: ${C.accent}; background: rgba(200,16,46,0.1); }

/* ── NOTIFICATION ── */
.notification-toast {
  position: fixed; bottom: 28px; right: 28px; z-index: 9999;
  min-width: 260px; max-width: 360px; padding: 14px 20px;
  border-radius: 10px; font-size: 14px; font-weight: 500;
  animation: fadeUp 0.35s ease; box-shadow: 0 8px 32px rgba(0,0,0,0.4);
}

/* ── PROFILE ── */
.stat-chip {
  background: ${C.card}; border: 1px solid ${C.border}; border-radius: 10px;
  padding: 18px 20px; text-align: center; cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
.stat-chip:hover { border-color: ${C.accent}; background: rgba(200,16,46,0.06); }

/* ── RESPONSIVE ── */
@media (max-width: 640px) {
  .hide-mobile { display: none !important; }
  .section { padding: 28px 4%; }
}
`;