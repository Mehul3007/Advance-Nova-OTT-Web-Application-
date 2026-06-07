import { useApp } from "../../context/AppContext";
import { LANGUAGES } from "../../constants/languages";
import { C } from "../../constants/theme";
import Icon from "../ui/Icon";

export function LanguagePicker({ onClose }) {
  const { uiLang, setUiLang } = useApp();
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <button className="btn-icon" onClick={onClose} style={{ position: "absolute", top: 16, right: 16 }}>
          <Icon name="x" size={18} />
        </button>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
          Language / भाषा
        </div>
        <div style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>
          Choose your preferred UI language
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              className={`lang-btn ${uiLang === lang.code ? "active" : ""}`}
              style={{ justifyContent: "flex-start", padding: "10px 14px" }}
              onClick={() => { setUiLang(lang.code); onClose(); }}
            >
              <span style={{ fontSize: 18 }}>{lang.flag}</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{lang.name}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{lang.native}</div>
              </div>
              {uiLang === lang.code && (
                <Icon name="check" size={14} color={C.accent} style={{ marginLeft: "auto" }} />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LanguagePicker;