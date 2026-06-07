import { useState } from "react";
import { useApp } from "../context/AppContext";
import { C } from "../constants/theme";
import { LANGUAGES } from "../constants/languages";
import Icon from "../components/ui/Icon";
import LanguagePicker from "../components/auth/LanguagePicker";

export default function SettingsPage() {
  const { uiLang, setUiLang, t } = useApp();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const langObj = LANGUAGES.find(l => l.code === uiLang) || LANGUAGES[0];

  const settings = [
    { key: "Playback Quality", value: "Auto (4K)" },
    { key: "Subtitles", value: "Off" },
    { key: "Autoplay", value: "On" },
    { key: "Notifications", value: "Enabled" },
    { key: "Downloads", value: "Wi-Fi only" },
  ];

  return (
    <div style={{ paddingTop: 90, padding: "90px 5% 40px", maxWidth: 700, margin: "0 auto" }} className="fade-up">
      <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 40, fontWeight: 800, marginBottom: 28 }}>{t("settings")}</h1>

      {/* Language setting */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="globe" size={16} color={C.muted} /> {t("language")}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{langObj.flag} {langObj.native} — {langObj.name}</div>
        </div>
        <button className="btn-ghost" style={{ fontSize: 13, padding: "7px 14px" }} onClick={() => setShowLangPicker(true)}>Change</button>
      </div>

      {settings.map(s => (
        <div key={s.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{s.key}</span>
          <span style={{ fontSize: 13, color: C.muted }}>{s.value}</span>
        </div>
      ))}

      {showLangPicker && <LanguagePicker onClose={() => setShowLangPicker(false)} />}
    </div>
  );
}