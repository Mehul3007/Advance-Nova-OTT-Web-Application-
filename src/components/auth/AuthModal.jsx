import { useState, useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { C } from "../../constants/theme";
import Icon from "../ui/Icon";
import { getPasswordStrength } from "../ui/StarRating";

export default function AuthModal() {
  const { authModal, setAuthModal, dbLogin, dbSignUp, dbLoading } = useApp();
  const [step, setStep] = useState(1);
  const [isLogin, setIsLogin] = useState(authModal === "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [err, setErr] = useState("");
  const [socialLoading, setSocialLoading] = useState("");
  const [photoCapture, setPhotoCapture] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streamObj, setStreamObj] = useState(null);

  const pwStrength = getPasswordStrength(password);

  useEffect(() => {
    setIsLogin(authModal === "login");
    setStep(1); setErr(""); setName(""); setEmail(""); setPassword(""); setPassword2("");
    setCapturedPhoto(null);
  }, [authModal]);

  if (!authModal) return null;

  const SOCIALS = [
    { id: "google",   label: "Continue with Google",   bg: "#fff",     color: "#1a1a1a", border: "#e5e7eb", logo: "https://www.svgrepo.com/show/475656/google-color.svg" },
    { id: "github",   label: "Continue with GitHub",   bg: "#24292e",  color: "#fff",    border: "#24292e", logo: "https://www.svgrepo.com/show/475654/github-color.svg" },
    { id: "facebook", label: "Continue with Facebook", bg: "#1877f2",  color: "#fff",    border: "#1877f2", logo: "https://www.svgrepo.com/show/475647/facebook-color.svg" },
    { id: "x",        label: "Continue with X",        bg: "#000",     color: "#fff",    border: "#333",    logo: "https://www.svgrepo.com/show/511330/twitter-154.svg" },
  ];

  const handleSocial = (provider) => {
    setSocialLoading(provider);
    setTimeout(() => { setSocialLoading(""); setErr(`${provider} OAuth not configured. Use email login.`); }, 1200);
  };

  const startCamera = async () => {
    setPhotoCapture(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStreamObj(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch { setPhotoCapture(false); }
  };

  const snapPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    setCapturedPhoto(canvasRef.current.toDataURL("image/jpeg", 0.85));
    streamObj?.getTracks().forEach(t => t.stop());
    setStreamObj(null); setPhotoCapture(false);
  };

  const stopCamera = () => {
    streamObj?.getTracks().forEach(t => t.stop());
    setStreamObj(null); setPhotoCapture(false);
  };

  const handleSubmit = async () => {
    setErr("");
    if (!email || !password) { setErr("Please fill in all required fields."); return; }
    if (!isLogin) {
      if (!name.trim()) { setErr("Please enter your display name."); return; }
      if (password !== password2) { setErr("Passwords do not match."); return; }
      if (pwStrength.score < 2) { setErr("Password is too weak. Add uppercase, numbers or symbols."); return; }
      await dbSignUp(email, password, name.trim());
    } else {
      const result = await dbLogin(email, password);
      if (result && !result.ok) setErr(result.error || "Login failed.");
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setAuthModal(null)}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="btn-icon" onClick={() => setAuthModal(null)} style={{ position: "absolute", top: 16, right: 16 }}>
          <Icon name="x" size={18} />
        </button>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
            {isLogin ? "Welcome Back" : "Create Account"}
          </div>
          <div style={{ fontSize: 13, color: C.muted }}>
            {isLogin ? "Sign in to continue watching" : "Join NOVA OTT — it's free"}
          </div>
        </div>

        {/* Social Buttons (Step 1) */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {SOCIALS.map(s => (
              <button key={s.id} onClick={() => handleSocial(s.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderRadius: 8, border: `1px solid ${s.border}`, background: s.bg, color: s.color, cursor: "pointer", fontSize: 14, fontWeight: 500, fontFamily: "'DM Sans',sans-serif", transition: "opacity 0.2s", opacity: socialLoading === s.id ? 0.6 : 1 }}>
                <img src={s.logo} alt={s.id} style={{ width: 18, height: 18, objectFit: "contain" }} />
                {socialLoading === s.id ? "Connecting…" : s.label}
              </button>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0" }}>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ fontSize: 12, color: C.muted }}>or continue with email</span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>
            <button className="btn-ghost" style={{ width: "100%", height: 44 }} onClick={() => setStep(2)}>
              Continue with Email →
            </button>
          </div>
        )}

        {/* Email Form (Step 2) */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {!isLogin && (
              <div>
                <label style={{ fontSize: 12, color: C.muted, marginBottom: 5, display: "block" }}>Display Name *</label>
                <input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} style={{ width: "100%" }} />
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, color: C.muted, marginBottom: 5, display: "block" }}>Email *</label>
              <input placeholder="you@email.com" type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: "100%" }} />
            </div>

            <div>
              <label style={{ fontSize: 12, color: C.muted, marginBottom: 5, display: "block" }}>Password *</label>
              <div style={{ position: "relative" }}>
                <input placeholder={isLogin ? "Your password" : "Create a strong password"} type={showPw ? "text" : "password"}
                  value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && isLogin && handleSubmit()}
                  style={{ width: "100%", paddingRight: 44 }} />
                <button onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16 }}>
                  {showPw ? "🙈" : "👁️"}
                </button>
              </div>
              {!isLogin && password && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= pwStrength.score ? pwStrength.color : C.border, transition: "background 0.3s" }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: pwStrength.color }}>{pwStrength.label}
                    {pwStrength.score < 3 && <span style={{ color: C.muted }}> — add uppercase, numbers & symbols</span>}
                  </div>
                </div>
              )}
            </div>

            {!isLogin && (
              <div>
                <label style={{ fontSize: 12, color: C.muted, marginBottom: 5, display: "block" }}>Confirm Password *</label>
                <div style={{ position: "relative" }}>
                  <input placeholder="Repeat your password" type={showPw2 ? "text" : "password"}
                    value={password2} onChange={e => setPassword2(e.target.value)}
                    style={{ width: "100%", paddingRight: 44, borderColor: password2 && password2 !== password ? "#ef4444" : "" }} />
                  <button onClick={() => setShowPw2(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16 }}>
                    {showPw2 ? "🙈" : "👁️"}
                  </button>
                </div>
                {password2 && password !== password2 && (
                  <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>Passwords do not match</div>
                )}
              </div>
            )}

            {/* Photo Capture */}
            {!isLogin && (
              <div>
                <label style={{ fontSize: 12, color: C.muted, marginBottom: 8, display: "block" }}>Profile Photo (optional)</label>
                {capturedPhoto ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img src={capturedPhoto} alt="captured" style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.accent}` }} />
                    <button onClick={() => setCapturedPhoto(null)} style={{ fontSize: 12, color: C.muted, background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>Retake</button>
                  </div>
                ) : photoCapture ? (
                  <div style={{ borderRadius: 8, overflow: "hidden" }}>
                    <video ref={videoRef} autoPlay playsInline style={{ width: "100%", borderRadius: 8, display: "block" }} />
                    <canvas ref={canvasRef} style={{ display: "none" }} />
                    <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                      <button className="btn-primary" onClick={snapPhoto} style={{ flex: 1, padding: "10px" }}>📸 Capture</button>
                      <button onClick={stopCamera} style={{ flex: 1, padding: "10px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, cursor: "pointer" }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={startCamera} style={{ flex: 1, padding: "10px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      📷 Open Camera
                    </button>
                    <label style={{ flex: 1, padding: "10px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      🖼️ Upload Photo
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) { const reader = new FileReader(); reader.onload = ev => setCapturedPhoto(ev.target.result); reader.readAsDataURL(file); }
                      }} />
                    </label>
                  </div>
                )}
              </div>
            )}

            {err && <div style={{ color: "#ef4444", fontSize: 13, padding: "8px 12px", background: "rgba(239,68,68,0.08)", borderRadius: 6, border: "1px solid rgba(239,68,68,0.2)" }}>{err}</div>}

            <button className="btn-primary" style={{ width: "100%", height: 48, marginTop: 4, fontSize: 15 }} onClick={handleSubmit} disabled={dbLoading}>
              {dbLoading
                ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite" }} />
                    Please wait…
                  </span>
                : isLogin ? "Sign In →" : "Create Account →"
              }
            </button>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: C.muted }}>
          {isLogin ? "New to Nova? " : "Already have an account? "}
          <button onClick={() => { setIsLogin(v => !v); setErr(""); setStep(1); }}
            style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
            {isLogin ? "Sign Up Free" : "Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}