import { useState, useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { C } from "../../constants/theme";
import Icon from "../ui/Icon";
import { getPasswordStrength } from "../ui/StarRating";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ─── SUPABASE HELPERS ─────────────────────────────────────────
// Uses /recover endpoint — works on FREE Supabase plan
// Sends a password reset email with OTP code
async function sendOtpEmail(email) {
  try {
    const redirectTo = `${window.location.origin}${window.location.pathname}#reset-password`;
    const r = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
      body: JSON.stringify({ email, gotrue_meta_security: {}, redirect_to: redirectTo }),
    });
    // Supabase returns 200 regardless of whether email exists (security reason)
    // Always treat as success and show "check email" screen
    return { ok: true, method: "recover" };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
async function verifyOtp(email, token) {
  // Try OTP verify
  const r = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, token, type: "email" }),
  });
  const res = await r.json();
  return { ok: r.ok, access_token: res.access_token, error: res.error_description || res.msg || res.error };
}

async function updatePassword(accessToken, newPassword) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ password: newPassword }),
  });
  return r.ok;
}

const SOCIALS = [
  { id: "google",   label: "Continue with Google",   bg: "#fff",    color: "#1a1a1a", border: "#e5e7eb", logo: "https://www.svgrepo.com/show/475656/google-color.svg" },
  { id: "github",   label: "Continue with GitHub",   bg: "#24292e", color: "#fff",    border: "#24292e", logo: "https://www.svgrepo.com/show/475654/github-color.svg" },
  { id: "facebook", label: "Continue with Facebook", bg: "#1877f2", color: "#fff",    border: "#1877f2", logo: "https://www.svgrepo.com/show/475647/facebook-color.svg" },
  { id: "x",        label: "Continue with X",        bg: "#000",    color: "#fff",    border: "#333",    logo: "https://www.svgrepo.com/show/511330/twitter-154.svg" },
];

export default function AuthModal() {
  const { authModal, setAuthModal, dbLogin, dbSignUp, dbLoading } = useApp();

  // ── MAIN FLOW STATES ─────────────────────────────────────────
  // mode: "login" | "signup" | "forgot"
  const [mode, setMode] = useState("login");
  // forgotStep: 1=enter email, 2=enter OTP, 3=new password, 4=success
  const [forgotStep, setForgotStep] = useState(1);
  const [loginStep, setLoginStep] = useState(1); // 1=social, 2=email form

  // ── FORM FIELDS ───────────────────────────────────────────────
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState("");

  // ── OTP STATE ─────────────────────────────────────────────────
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpToken, setOtpToken] = useState(""); // access_token after OTP verify
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef([]);

  // ── NEW PASSWORD ──────────────────────────────────────────────
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const pwStrength = getPasswordStrength(mode === "signup" ? password : newPw);

  // ── PHOTO CAPTURE ─────────────────────────────────────────────
  const [photoCapture, setPhotoCapture] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [streamObj, setStreamObj] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // ── RESET ON MODAL OPEN ───────────────────────────────────────
  useEffect(() => {
    setMode(authModal === "login" ? "login" : "signup");
    setForgotStep(1); setLoginStep(1);
    setErr(""); setInfo(""); setEmail(""); setPassword(""); setPassword2(""); setName("");
    setOtp(["", "", "", "", "", ""]); setOtpToken("");
    setNewPw(""); setNewPw2(""); setCapturedPhoto(null);
  }, [authModal]);

  // ── RESEND COOLDOWN TIMER ─────────────────────────────────────
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  if (!authModal) return null;

  // ── SOCIAL LOGIN ──────────────────────────────────────────────
  const handleSocial = (provider) => {
    setSocialLoading(provider);
    const redirectTo = encodeURIComponent(window.location.origin + window.location.pathname);
    const oauthProvider = provider === "x" ? "twitter" : provider;
    window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=${oauthProvider}&redirect_to=${redirectTo}`;
  };

  // ── LOGIN SUBMIT ──────────────────────────────────────────────
  const handleLogin = async () => {
    setErr("");
    if (!email || !password) { setErr("Please fill in all fields."); return; }
    const result = await dbLogin(email, password);
    if (result && !result.ok) setErr(result.error || "Login failed.");
  };

  // ── SIGNUP SUBMIT ─────────────────────────────────────────────
  const handleSignup = async () => {
    setErr("");
    if (!name.trim()) { setErr("Please enter your display name."); return; }
    if (!email || !email.includes("@")) { setErr("Enter a valid email."); return; }
    if (pwStrength.score < 2) { setErr("Password is too weak."); return; }
    if (password !== password2) { setErr("Passwords do not match."); return; }
    await dbSignUp(email, password, name.trim());
  };

  // ── FORGOT: STEP 1 — Send OTP ─────────────────────────────────
  const handleSendOtp = async () => {
    setErr(""); setInfo("");
    if (!email || !email.includes("@")) { setErr("Enter a valid email address."); return; }
    setLoading(true);
    const result = await sendOtpEmail(email);
    setLoading(false);
    if (!result.ok) {
      setErr("Could not send reset email. Make sure this email is registered in NOVA.");
      return;
    }
    if (result.method === "recover") {
      setForgotStep("recover");
    } else {
      setInfo(`6-digit OTP sent to ${email}`);
      setResendCooldown(60);
      setForgotStep(2);
    }
  };

  // ── FORGOT: STEP 2 — Verify OTP ──────────────────────────────
  const handleVerifyOtp = async () => {
    setErr("");
    const code = otp.join("");
    if (code.length !== 6) { setErr("Enter the 6-digit OTP."); return; }
    setLoading(true);
    const { ok, access_token, error } = await verifyOtp(email, code);
    setLoading(false);
    if (!ok) { setErr(error || "Invalid or expired OTP. Try again."); return; }
    setOtpToken(access_token);
    setForgotStep(3);
  };

  // ── FORGOT: STEP 3 — Update Password ─────────────────────────
  const handleUpdatePassword = async () => {
    setErr("");
    const pwStr = getPasswordStrength(newPw);
    if (pwStr.score < 2) { setErr("New password is too weak."); return; }
    if (newPw !== newPw2) { setErr("Passwords do not match."); return; }
    setLoading(true);
    const ok = await updatePassword(otpToken, newPw);
    setLoading(false);
    if (!ok) { setErr("Failed to update password. Please try again."); return; }
    setForgotStep(4);
  };

  // ── FORGOT: Resend OTP ────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setErr(""); setInfo("");
    setLoading(true);
    const ok = await sendOtpEmail(email);
    setLoading(false);
    if (ok) { setInfo("New OTP sent!"); setResendCooldown(60); }
    else setErr("Failed to resend OTP.");
  };

  // ── OTP INPUT HANDLER ─────────────────────────────────────────
  const handleOtpChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  // ── CAMERA ────────────────────────────────────────────────────
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

  // ── SHARED UI HELPERS ─────────────────────────────────────────
  const Spinner = () => (
    <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", animation: "spin 0.7s linear infinite" }} />
  );

  const ErrBox = ({ msg }) => msg ? (
    <div style={{ color: "#ef4444", fontSize: 13, padding: "10px 14px", background: "rgba(239,68,68,0.08)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)" }}>{msg}</div>
  ) : null;

  const InfoBox = ({ msg }) => msg ? (
    <div style={{ color: "#10b981", fontSize: 13, padding: "10px 14px", background: "rgba(16,185,129,0.08)", borderRadius: 8, border: "1px solid rgba(16,185,129,0.25)" }}>✓ {msg}</div>
  ) : null;

  const PwInput = ({ value, onChange, show, onToggle, placeholder, onEnter }) => (
    <div style={{ position: "relative" }}>
      <input placeholder={placeholder} type={show ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === "Enter" && onEnter?.()}
        style={{ width: "100%", paddingRight: 44 }} />
      <button onClick={onToggle} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16 }}>
        {show ? "🙈" : "👁️"}
      </button>
    </div>
  );

  const PwStrengthBar = ({ pw }) => {
    const s = getPasswordStrength(pw);
    if (!pw) return null;
    return (
      <div style={{ marginTop: 6 }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
          {[1,2,3,4,5].map(i => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= s.score ? s.color : C.border, transition: "background 0.3s" }} />)}
        </div>
        <div style={{ fontSize: 11, color: s.color }}>{s.label}{s.score < 3 && <span style={{ color: C.muted }}> — add uppercase, numbers & symbols</span>}</div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // ── RENDER ───────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="modal-overlay" onClick={() => setAuthModal(null)}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, maxHeight: "92vh", overflowY: "auto" }}>

        {/* Close */}
        <button className="btn-icon" onClick={() => setAuthModal(null)} style={{ position: "absolute", top: 16, right: 16, zIndex: 2 }}>
          <Icon name="x" size={18} />
        </button>

        {/* ══════════════════ FORGOT PASSWORD FLOW ══════════════════ */}
        {mode === "forgot" && (
          <div>
            {/* Back button */}
            <button onClick={() => { setMode("login"); setForgotStep(1); setErr(""); setInfo(""); }}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13, marginBottom: 24, padding: 0 }}>
              <Icon name="arrowLeft" size={15} /> Back to Login
            </button>

            {/* ── STEP 1: Email Input ── */}
            {forgotStep === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Forgot Password?</div>
                  <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>Enter your registered email. We'll send a 6-digit OTP to reset your password.</div>
                </div>

                <div style={{ background: "rgba(200,16,46,0.06)", border: `1px solid rgba(200,16,46,0.2)`, borderRadius: 10, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 22 }}>📧</span>
                  <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>A 6-digit OTP will be sent to your email. It expires in <strong style={{ color: C.text }}>10 minutes</strong>.</div>
                </div>

                <div>
                  <label style={{ fontSize: 12, color: C.muted, marginBottom: 6, display: "block" }}>Email Address *</label>
                  <input placeholder="you@email.com" type="email" value={email} onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSendOtp()}
                    style={{ width: "100%" }} />
                </div>

                <ErrBox msg={err} />

                <button className="btn-primary" style={{ width: "100%", height: 48, fontSize: 15 }} onClick={handleSendOtp} disabled={loading}>
                  {loading ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Spinner /> Sending OTP…</span> : "Send OTP →"}
                </button>
              </div>
            )}

            {/* ── STEP RECOVER: Magic Link Sent ── */}
            {forgotStep === "recover" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20, textAlign: "center", padding: "10px 0" }}>
                <div style={{ fontSize: 64 }}>📬</div>
                <div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Check Your Email!</div>
                  <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
                    We sent a <strong style={{ color: C.text }}>password reset link</strong> to<br />
                    <strong style={{ color: C.accent }}>{email}</strong>
                  </div>
                </div>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px", fontSize: 13, color: C.muted, lineHeight: 1.7, textAlign: "left" }}>
                  <div style={{ marginBottom: 8, fontWeight: 600, color: C.text }}>Steps:</div>
                  <div>1. Open your email inbox</div>
                  <div>2. Click the reset link in the email</div>
                  <div>3. You will be redirected back to NOVA</div>
                  <div>4. Set your new password</div>
                </div>
                <div style={{ fontSize: 12, color: C.muted }}>Link expires in 10 minutes. Check spam folder too.</div>
                <button onClick={handleSendOtp} disabled={resendCooldown > 0 || loading}
                  style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, color: resendCooldown > 0 ? C.muted : C.text, cursor: resendCooldown > 0 ? "not-allowed" : "pointer", padding: "10px", fontSize: 13 }}>
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Email"}
                </button>
                <button onClick={() => { setMode("login"); setForgotStep(1); }}
                  className="btn-primary" style={{ height: 44 }}>
                  Back to Login
                </button>
              </div>
            )}

            {/* ── STEP 2: OTP Verification ── */}
            {forgotStep === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Enter OTP</div>
                  <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
                    6-digit OTP sent to <strong style={{ color: C.text }}>{email}</strong>
                  </div>
                </div>

                {/* 6 OTP boxes */}
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => otpRefs.current[i] = el}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      maxLength={1}
                      style={{
                        width: 50, height: 58, textAlign: "center", fontSize: 24, fontWeight: 700,
                        background: digit ? "rgba(200,16,46,0.1)" : C.card,
                        border: `2px solid ${digit ? C.accent : C.border}`,
                        borderRadius: 10, color: C.text, outline: "none", transition: "all 0.2s",
                      }}
                      onFocus={e => e.target.style.borderColor = C.accent}
                      onBlur={e => e.target.style.borderColor = digit ? C.accent : C.border}
                    />
                  ))}
                </div>

                {/* Timer + Resend */}
                <div style={{ textAlign: "center", fontSize: 13, color: C.muted }}>
                  Didn't get it?{" "}
                  <button onClick={handleResend} disabled={resendCooldown > 0}
                    style={{ background: "none", border: "none", cursor: resendCooldown > 0 ? "not-allowed" : "pointer", color: resendCooldown > 0 ? C.muted : C.accent, fontWeight: 700, fontSize: 13 }}>
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                  </button>
                </div>

                <InfoBox msg={info} />
                <ErrBox msg={err} />

                <button className="btn-primary" style={{ width: "100%", height: 48, fontSize: 15 }}
                  onClick={handleVerifyOtp} disabled={loading || otp.join("").length !== 6}>
                  {loading ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Spinner /> Verifying…</span> : "Verify OTP →"}
                </button>

                <button onClick={() => setForgotStep(1)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13, textAlign: "center" }}>
                  ← Change email
                </button>
              </div>
            )}

            {/* ── STEP 3: New Password ── */}
            {forgotStep === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, marginBottom: 6 }}>New Password</div>
                  <div style={{ fontSize: 13, color: C.muted }}>OTP verified ✓ — Set your new password below.</div>
                </div>

                <div>
                  <label style={{ fontSize: 12, color: C.muted, marginBottom: 6, display: "block" }}>New Password *</label>
                  <PwInput value={newPw} onChange={setNewPw} show={showNewPw} onToggle={() => setShowNewPw(v => !v)} placeholder="Create a strong password" />
                  <PwStrengthBar pw={newPw} />
                </div>

                <div>
                  <label style={{ fontSize: 12, color: C.muted, marginBottom: 6, display: "block" }}>Confirm New Password *</label>
                  <input placeholder="Repeat new password" type="password" value={newPw2} onChange={e => setNewPw2(e.target.value)}
                    style={{ width: "100%", borderColor: newPw2 && newPw !== newPw2 ? "#ef4444" : "" }} />
                  {newPw2 && newPw !== newPw2 && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>Passwords do not match</div>}
                </div>

                <ErrBox msg={err} />

                <button className="btn-primary" style={{ width: "100%", height: 48, fontSize: 15 }} onClick={handleUpdatePassword} disabled={loading}>
                  {loading ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Spinner /> Updating…</span> : "Update Password →"}
                </button>
              </div>
            )}

            {/* ── STEP 4: Success ── */}
            {forgotStep === 4 && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, marginBottom: 10 }}>Password Updated!</div>
                <div style={{ fontSize: 14, color: C.muted, marginBottom: 28, lineHeight: 1.6 }}>Your password has been successfully changed. You can now sign in with your new password.</div>
                <button className="btn-primary" style={{ width: "100%", height: 48, fontSize: 15 }}
                  onClick={() => { setMode("login"); setLoginStep(2); setForgotStep(1); setErr(""); setNewPw(""); setNewPw2(""); }}>
                  Sign In Now →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ LOGIN FLOW ══════════════════ */}
        {mode === "login" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Welcome Back</div>
              <div style={{ fontSize: 13, color: C.muted }}>Sign in to continue watching</div>
            </div>

            {/* Social (Step 1) */}
            {loginStep === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {SOCIALS.map(s => (
                  <button key={s.id} onClick={() => handleSocial(s.id)}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderRadius: 8, border: `1px solid ${s.border}`, background: s.bg, color: s.color, cursor: "pointer", fontSize: 14, fontWeight: 500, fontFamily: "'DM Sans',sans-serif", opacity: socialLoading === s.id ? 0.6 : 1, transition: "opacity 0.2s" }}>
                    <img src={s.logo} alt={s.id} style={{ width: 18, height: 18, objectFit: "contain" }} />
                    {socialLoading === s.id ? "Connecting…" : s.label}
                  </button>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0" }}>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                  <span style={{ fontSize: 12, color: C.muted }}>or continue with email</span>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                </div>
                <button className="btn-ghost" style={{ width: "100%", height: 44 }} onClick={() => setLoginStep(2)}>
                  Continue with Email →
                </button>
              </div>
            )}

            {/* Email Form (Step 2) */}
            {loginStep === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: C.muted, marginBottom: 5, display: "block" }}>Email *</label>
                  <input placeholder="you@email.com" type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: "100%" }} />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <label style={{ fontSize: 12, color: C.muted }}>Password *</label>
                    {/* ── FORGOT PASSWORD LINK ── */}
                    <button onClick={() => { setMode("forgot"); setForgotStep(1); setErr(""); setInfo(""); }}
                      style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                      Forgot Password?
                    </button>
                  </div>
                  <PwInput value={password} onChange={setPassword} show={showPw} onToggle={() => setShowPw(v => !v)}
                    placeholder="Your password" onEnter={handleLogin} />
                </div>
                <ErrBox msg={err} />
                <button className="btn-primary" style={{ width: "100%", height: 48, fontSize: 15 }} onClick={handleLogin} disabled={dbLoading}>
                  {dbLoading ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Spinner /> Please wait…</span> : "Sign In →"}
                </button>
              </div>
            )}

            <div style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: C.muted }}>
              New to Nova?{" "}
              <button onClick={() => { setMode("signup"); setErr(""); setLoginStep(1); }}
                style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                Sign Up Free
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════ SIGNUP FLOW ══════════════════ */}
        {mode === "signup" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Create Account</div>
              <div style={{ fontSize: 13, color: C.muted }}>Join NOVA OTT — it's free</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: C.muted, marginBottom: 5, display: "block" }}>Display Name *</label>
                <input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.muted, marginBottom: 5, display: "block" }}>Email *</label>
                <input placeholder="you@email.com" type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.muted, marginBottom: 5, display: "block" }}>Password *</label>
                <PwInput value={password} onChange={setPassword} show={showPw} onToggle={() => setShowPw(v => !v)} placeholder="Create a strong password" />
                <PwStrengthBar pw={password} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.muted, marginBottom: 5, display: "block" }}>Confirm Password *</label>
                <input placeholder="Repeat your password" type="password" value={password2} onChange={e => setPassword2(e.target.value)}
                  style={{ width: "100%", borderColor: password2 && password2 !== password ? "#ef4444" : "" }} />
                {password2 && password !== password2 && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>Passwords do not match</div>}
              </div>

              {/* Photo */}
              <div>
                <label style={{ fontSize: 12, color: C.muted, marginBottom: 8, display: "block" }}>Profile Photo (optional)</label>
                {capturedPhoto ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img src={capturedPhoto} alt="captured" style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.accent}` }} />
                    <button onClick={() => setCapturedPhoto(null)} style={{ fontSize: 12, color: C.muted, background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>Retake</button>
                  </div>
                ) : photoCapture ? (
                  <div>
                    <video ref={videoRef} autoPlay playsInline style={{ width: "100%", borderRadius: 8, display: "block" }} />
                    <canvas ref={canvasRef} style={{ display: "none" }} />
                    <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                      <button className="btn-primary" onClick={snapPhoto} style={{ flex: 1, padding: "10px" }}>📸 Capture</button>
                      <button onClick={stopCamera} style={{ flex: 1, padding: "10px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, cursor: "pointer" }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={startCamera} style={{ flex: 1, padding: "10px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>📷 Camera</button>
                    <label style={{ flex: 1, padding: "10px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      🖼️ Upload
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) { const reader = new FileReader(); reader.onload = ev => setCapturedPhoto(ev.target.result); reader.readAsDataURL(file); }
                      }} />
                    </label>
                  </div>
                )}
              </div>

              <ErrBox msg={err} />
              <button className="btn-primary" style={{ width: "100%", height: 48, fontSize: 15 }} onClick={handleSignup} disabled={dbLoading}>
                {dbLoading ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Spinner /> Please wait…</span> : "Create Account →"}
              </button>
            </div>

            <div style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: C.muted }}>
              Already have an account?{" "}
              <button onClick={() => { setMode("login"); setErr(""); }}
                style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                Sign In
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}