import { useApp } from "../context/AppContext";
import { C } from "../constants/theme";
import Icon from "../components/ui/Icon";

export default function SubscriptionPage() {
  const { user, setAuthModal, initPayment, profile, t } = useApp();
  const plans = [
    { name: "Free", price: "₹0", period: "forever", features: ["Limited content", "Ads enabled", "720p quality", "1 device"], highlight: false, btnLabel: "Current Free Plan" },
    { name: "Premium", price: "₹499", period: "/month", features: ["Full content library", "Ad-free", "4K Ultra HD", "2 devices", "Offline downloads", "All Indian languages"], highlight: true, btnLabel: "Subscribe Premium" },
    { name: "Family", price: "₹799", period: "/month", features: ["Everything in Premium", "6 profiles", "4 simultaneous streams", "Kids mode", "Family controls", "Priority support"], highlight: false, btnLabel: "Subscribe Family", color: C.gold },
  ];

  return (
    <div style={{ paddingTop: 90, padding: "90px 5% 60px" }} className="fade-up">
      <div style={{ textAlign: "center", marginBottom: 52 }}>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: "clamp(32px,5vw,54px)", fontWeight: 800, marginBottom: 12 }}>{t("chooseplan")}</h1>
        <p style={{ color: C.muted, fontSize: 16 }}>Unlimited streaming. Cancel anytime. Powered by Razorpay.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 22, maxWidth: 940, margin: "0 auto" }}>
        {plans.map(plan => (
          <div key={plan.name} style={{
            background: plan.highlight ? "linear-gradient(135deg,rgba(200,16,46,0.14),rgba(255,71,87,0.06))" : C.card,
            border: `2px solid ${plan.highlight ? C.accent : plan.color ? "rgba(251,191,36,0.35)" : C.border}`,
            borderRadius: 14, padding: "32px 28px", position: "relative",
            transform: plan.highlight ? "scale(1.03)" : "none",
            transition: "transform 0.2s, box-shadow 0.2s",
            boxShadow: plan.highlight ? `0 0 40px ${C.accentGlow}` : "none",
          }}>
            {plan.highlight && (
              <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: C.accent, color: "white", fontSize: 10, fontWeight: 800, padding: "4px 14px", borderRadius: 20, letterSpacing: 1, whiteSpace: "nowrap" }}>⚡ MOST POPULAR</div>
            )}
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: plan.color || (plan.highlight ? C.accent : C.text), marginBottom: 6 }}>{plan.name}</div>
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 40, fontWeight: 800 }}>{plan.price}</span>
              <span style={{ color: C.muted, fontSize: 14 }}>{plan.period}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 28 }}>
              {plan.features.map(f => (
                <div key={f} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: plan.highlight ? "rgba(200,16,46,0.18)" : "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name="check" size={11} color={plan.highlight ? C.accent : C.muted} />
                  </div>
                  <span style={{ fontSize: 13, color: plan.highlight ? C.text : C.muted }}>{f}</span>
                </div>
              ))}
            </div>
            <button
              className={plan.highlight ? "btn-primary" : "btn-ghost"}
              style={{ width: "100%", height: 44, border: plan.color ? `1px solid rgba(251,191,36,0.4)` : undefined, color: plan.color && !plan.highlight ? C.gold : undefined }}
              onClick={() => {
                if (plan.name === "Free") return;
                if (!user) { setAuthModal("login"); return; }
                initPayment(plan.name);
              }}>
              {plan.name === profile?.plan ? "✓ Current Plan" : plan.btnLabel}
            </button>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 40, padding: "20px", background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, maxWidth: 500, margin: "40px auto 0" }}>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>🔒 Secured by Razorpay</div>
        <div style={{ fontSize: 12, color: C.muted }}>Supports UPI, cards, net banking, wallets. Cancel anytime.</div>
      </div>
    </div>
  );
}