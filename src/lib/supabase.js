// ─── SUPABASE CONFIG ──────────────────────────────────────────
// Replace with your actual Supabase project URL and anon key
const SUPABASE_URL = "https://tvrdoephamcmgwjerdzd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_msM3OR7HoUyvjAqt1AOFUA_of0S0pKX";

const supabase = {
  _headers: {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  },

  async signUp(email, password, metadata = {}) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST", headers: this._headers,
      body: JSON.stringify({ email, password, data: metadata }),
    });
    const res = await r.json();
    if (!r.ok) {
      const raw = res.error_description || res.msg || res.error || "";
      let msg;
      const lower = raw.toLowerCase();
      if (lower.includes("already registered") || lower.includes("user already exists") || lower.includes("email address is already")) {
        msg = "An account with this email already exists. Please sign in instead.";
      } else if (lower.includes("password") && lower.includes("weak")) {
        msg = "Password is too weak. Use at least 8 characters with uppercase, numbers and symbols.";
      } else if (lower.includes("invalid email")) {
        msg = "Please enter a valid email address.";
      } else {
        msg = raw || "Sign up failed. Please try again.";
      }
      return { data: null, error: msg };
    }
    return { data: res, error: null };
  },

  async signIn(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST", headers: this._headers,
      body: JSON.stringify({ email, password }),
    });
    const res = await r.json();
    if (!r.ok) {
      const raw = res.error_description || res.msg || res.error || "";
      let msg;
      if (r.status === 400 || r.status === 401) {
        const lower = raw.toLowerCase();
        if (lower.includes("invalid login") || lower.includes("invalid credentials") || lower.includes("user not found") || lower.includes("no user") || raw === "") {
          msg = "No account found with this email, or the password is incorrect.";
        } else if (lower.includes("email not confirmed")) {
          msg = "Please confirm your email first. Check your inbox for the verification link.";
        } else if (lower.includes("too many")) {
          msg = "Too many login attempts. Please wait a moment and try again.";
        } else {
          msg = raw || "Login failed. Please check your credentials.";
        }
      } else {
        msg = raw || "Login failed. Please try again.";
      }
      return { data: null, error: msg };
    }
    return { data: res, error: null };
  },

  async signOut(token) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: { ...this._headers, "Authorization": `Bearer ${token}` },
    });
  },

  async getUser(token) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { ...this._headers, "Authorization": `Bearer ${token}` },
    });
    const res = await r.json();
    if (!r.ok) return null;
    return res;
  },

  async from(table, token) {
    const auth = token ? { "Authorization": `Bearer ${token}` } : {};
    return {
      _table: table,
      _token: token,
      _authHeaders: { ...this._headers, ...auth },
      async select(columns = "*", filters = "") {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${columns}${filters}`, { headers: this._authHeaders });
        return r.json();
      },
      async upsert(data) {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
          method: "POST",
          headers: { ...this._authHeaders, "Prefer": "resolution=merge-duplicates" },
          body: JSON.stringify(data),
        });
        return r.status < 300 ? { error: null } : { error: await r.json() };
      },
      async update(data, match) {
        const q = Object.entries(match).map(([k, v]) => `${k}=eq.${v}`).join("&");
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`, {
          method: "PATCH", headers: this._authHeaders,
          body: JSON.stringify(data),
        });
        return r.status < 300 ? { error: null } : { error: await r.json() };
      },
      async delete(match) {
        const q = Object.entries(match).map(([k, v]) => `${k}=eq.${v}`).join("&");
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`, {
          method: "DELETE", headers: this._authHeaders,
        });
        return r.status < 300 ? { error: null } : { error: await r.json() };
      },
    };
  },

  loadRazorpay() {
    return new Promise(resolve => {
      if (window.Razorpay) { resolve(true); return; }
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });
  },
};

export default supabase;