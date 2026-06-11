import { useState, useRef } from "react";
import { useApp } from "../context/AppContext";
import { C } from "../constants/theme";
import { LANGUAGES } from "../constants/languages";
import { ALL_CONTENT } from "../constants/mockData";
import supabase from "../lib/supabase";
import Icon from "../components/ui/Icon";
import LanguagePicker from "../components/auth/LanguagePicker";

export default function ProfilePage() {
  const { user, profile, setProfile, watchlist, favorites, watchHistory, continueWatching, dbLogout, setCurrentPage, showNotification, t, uiLang, setUiLang } = useApp();
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [dob, setDob] = useState(profile?.dob || "");
  const [gender, setGender] = useState(profile?.gender || "");

  // ✅ FIX: avatar_url se initialize karo (DB field)
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);
  const [coverUrl, setCoverUrl] = useState(profile?.coverUrl || null);
  const [photoCapture, setPhotoCapture] = useState(false);
  const [stream, setStream] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const langObj = LANGUAGES.find(l => l.code === uiLang) || LANGUAGES[0];

  if (!user) return (
    <div style={{ paddingTop: 140, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <div style={{ fontSize: 18, marginBottom: 20, color: C.muted }}>Please sign in to view your profile</div>
    </div>
  );

  const stats = [
    { label: t("watchlist"), value: watchlist.length, icon: "list", page: "watchlist" },
    { label: "Favorites", value: favorites.length, icon: "heart", page: "favorites" },
    { label: "Watched", value: watchHistory.length, icon: "playCircle", page: "home" },
    { label: "In Progress", value: continueWatching.length, icon: "play", page: "home" },
  ];

  const handlePhotoFile = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (type === "avatar") setAvatarUrl(ev.target.result);
      else setCoverUrl(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    setPhotoCapture(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch { showNotification("Camera access denied", "error"); setPhotoCapture(false); }
  };

  const snapPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    setAvatarUrl(canvasRef.current.toDataURL("image/jpeg", 0.85));
    stream?.getTracks().forEach(t => t.stop());
    setStream(null); setPhotoCapture(false);
  };

  // ✅ FIX: saveProfile — avatar_url bhi DB mein save karo
  const saveProfile = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("nova_token");
      if (user && user.id && token) {
        const db = await supabase.from("user_profiles", token);
        await db.update(
          {
            display_name: displayName,
            bio,
            phone,
            dob,
            gender,
            // ✅ avatar_url DB mein save karo
            ...(avatarUrl && avatarUrl !== profile?.avatar_url ? { avatar_url: avatarUrl } : {}),
          },
          { id: user.id }
        );
      }
      // ✅ Context mein bhi update karo taaki navbar turant change ho
      if (setProfile) {
        setProfile(prev => ({
          ...prev,
          display_name: displayName,
          bio, phone, dob, gender,
          ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        }));
      }
      setEditMode(false);
      showNotification("Profile updated ✓");
    } catch (e) {
      showNotification("Failed to save profile", "error");
    } finally {
      setSaving(false);
    }
  };

  // ✅ FIX: avatar show karne ke liye avatar_url prefer karo
  const avatarSrc = avatarUrl
    || profile?.avatar_url
    || `https://api.dicebear.com/8.x/personas/svg?seed=${profile?.avatar_seed || user.email}`;

  const TABS = ["overview", "activity", "settings"];

  return (
    <div className="fade-up" style={{ paddingTop: 66 }}>
      {/* Cover Photo */}
      <div style={{ position: "relative", height: 220, background: coverUrl ? `url(${coverUrl}) center/cover no-repeat` : `linear-gradient(135deg, #1a0010 0%, ${C.surface} 50%, #0a0820 100%)`, overflow: "hidden" }}>
        {!coverUrl && (
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(200,16,46,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(79,70,229,0.1) 0%, transparent 60%)" }} />
        )}
        {editMode && (
          <label style={{ position: "absolute", bottom: 14, right: 14, padding: "8px 14px", background: "rgba(0,0,0,0.6)", border: `1px solid ${C.border}`, borderRadius: 8, color: "white", cursor: "pointer", fontSize: 12, backdropFilter: "blur(8px)", display: "flex", alignItems: "center", gap: 6 }}>
            🖼️ Change Cover
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => handlePhotoFile(e, "cover")} />
          </label>
        )}
      </div>

      <div style={{ padding: "0 5%", position: "relative" }}>
        {/* Avatar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
          <div style={{ position: "relative", marginTop: -50 }}>
            <img
              src={avatarSrc}
              alt="avatar"
              style={{ width: 100, height: 100, borderRadius: "50%", border: `3px solid ${C.accent}`, objectFit: "cover", background: C.surface }}
            />
            {editMode && (
              <div style={{ position: "absolute", bottom: 0, right: 0, display: "flex", gap: 4 }}>
                <label style={{ width: 30, height: 30, borderRadius: "50%", background: C.accent, border: `2px solid ${C.bg}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14 }}>
                  🖼️
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => handlePhotoFile(e, "avatar")} />
                </label>
                <button onClick={startCamera} style={{ width: 30, height: 30, borderRadius: "50%", background: C.card, border: `2px solid ${C.bg}`, cursor: "pointer", fontSize: 14 }}>📷</button>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, paddingBottom: 4 }}>
            {editMode ? (
              <>
                <button className="btn-primary" style={{ fontSize: 13, padding: "8px 18px" }} onClick={saveProfile} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
                <button className="btn-ghost" style={{ fontSize: 13, padding: "8px 18px" }} onClick={() => setEditMode(false)}>Cancel</button>
              </>
            ) : (
              <button className="btn-ghost" style={{ fontSize: 13, padding: "8px 18px" }} onClick={() => setEditMode(true)}>Edit Profile</button>
            )}
          </div>
        </div>

        {/* Camera capture */}
        {photoCapture && (
          <div style={{ marginBottom: 20 }}>
            <video ref={videoRef} autoPlay playsInline style={{ width: "100%", maxWidth: 400, borderRadius: 8 }} />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button className="btn-primary" onClick={snapPhoto}>📸 Capture</button>
              <button onClick={() => { stream?.getTracks().forEach(t => t.stop()); setStream(null); setPhotoCapture(false); }}
                style={{ padding: "10px 18px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Edit fields */}
        {editMode ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480, marginBottom: 28 }}>
            <div><label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 4 }}>Display Name</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} style={{ width: "100%" }} /></div>
            <div><label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 4 }}>Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} style={{ width: "100%" }} /></div>
            <div><label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 4 }}>Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} style={{ width: "100%" }} /></div>
            <div><label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 4 }}>Date of Birth</label>
              <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={{ width: "100%" }} /></div>
            <div><label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 4 }}>Gender</label>
              <select value={gender} onChange={e => setGender(e.target.value)} style={{ width: "100%" }}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select></div>
          </div>
        ) : (
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 800 }}>{profile?.display_name || user.user_metadata?.display_name || "User"}</h1>
            <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>{user.email}</div>
            {bio && <p style={{ fontSize: 14, color: "rgba(238,240,248,0.75)", marginTop: 8, lineHeight: 1.6 }}>{bio}</p>}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`, marginBottom: 28 }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: "10px 22px", background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600,
                color: activeTab === tab ? C.accent : C.muted, borderBottom: activeTab === tab ? `2px solid ${C.accent}` : "2px solid transparent",
                textTransform: "capitalize", transition: "color 0.2s" }}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
              {stats.map(s => (
                <div key={s.label} className="stat-chip" onClick={() => setCurrentPage(s.page)}>
                  <Icon name={s.icon} size={22} color={C.accent} style={{ marginBottom: 6 }} />
                  <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Syne',sans-serif" }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
              {phone && <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px" }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>PHONE</div>
                <div style={{ fontWeight: 600 }}>{phone}</div></div>}
              {dob && <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px" }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>DATE OF BIRTH</div>
                <div style={{ fontWeight: 600 }}>{new Date(dob).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</div></div>}
              {gender && <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px" }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>GENDER</div>
                <div style={{ fontWeight: 600, textTransform: "capitalize" }}>{gender}</div></div>}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px" }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>LANGUAGE</div>
                <div style={{ fontWeight: 600 }}>{langObj.flag} {langObj.name}</div>
              </div>
            </div>

            <div style={{ background: "linear-gradient(135deg,rgba(200,16,46,0.12),rgba(255,71,87,0.06))", border: `1px solid rgba(200,16,46,0.25)`, borderRadius: 12, padding: "22px 26px", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Current Plan</div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: C.accent }}>{profile?.plan || "Free"} Plan</div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>Renews July 5, 2026 · ₹499/month</div>
                </div>
                <button className="btn-primary" style={{ fontSize: 13 }} onClick={() => setCurrentPage("subscription")}>Upgrade Plan</button>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <button onClick={dbLogout} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: `1px solid rgba(239,68,68,0.3)`, color: "#ef4444", padding: "11px 22px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>
                <Icon name="logout" size={16} color="#ef4444" /> {t("signout")}
              </button>
            </div>
          </>
        )}

        {activeTab === "activity" && (
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Recent Activity</div>
            {watchHistory.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📺</div>
                <div>No watch history yet</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {watchHistory.slice(0, 8).map(id => {
                  const content = ALL_CONTENT.find(c => c.id === id);
                  if (!content) return null;
                  const cw = continueWatching.find(x => x.id === id);
                  return (
                    <div key={id} style={{ display: "flex", gap: 14, alignItems: "center", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px" }}>
                      <img src={content.thumb} alt={content.title} style={{ width: 72, height: 40, objectFit: "cover", borderRadius: 6 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{content.title}</div>
                        <div style={{ fontSize: 12, color: C.muted }}>{content.genre} · {content.year}</div>
                      </div>
                      {cw && (
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 12, color: C.accent, fontWeight: 700 }}>{cw.progress}% done</div>
                          <div style={{ width: 80, marginTop: 4 }}>
                            <div className="progress-bar"><div className="progress-fill" style={{ width: `${cw.progress}%` }} /></div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { icon: "globe", label: "Interface Language", value: `${langObj.flag} ${langObj.name}`, action: () => setShowLangPicker(true), btnLabel: "Change" },
              { icon: "settings", label: "Notification Preferences", value: "Push & Email enabled", action: () => {}, btnLabel: "Configure" },
              { icon: "grid", label: "Content Maturity", value: "All audiences", action: () => {}, btnLabel: "Change" },
              { icon: "playCircle", label: "Autoplay", value: "Next episode plays automatically", action: () => {}, btnLabel: "Toggle" },
            ].map(row => (
              <div key={row.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                <Icon name={row.icon} size={20} color={C.muted} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{row.label}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{row.value}</div>
                </div>
                <button onClick={row.action} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.border}`, background: "none", color: C.muted, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}>
                  {row.btnLabel}
                </button>
              </div>
            ))}
            <div style={{ marginTop: 8 }}>
              <button onClick={dbLogout} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: `1px solid rgba(239,68,68,0.3)`, color: "#ef4444", padding: "11px 22px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>
                <Icon name="logout" size={16} color="#ef4444" /> {t("signout")}
              </button>
            </div>
          </div>
        )}

        <div style={{ height: 40 }} />
      </div>

      {showLangPicker && <LanguagePicker onClose={() => setShowLangPicker(false)} />}
    </div>
  );
}