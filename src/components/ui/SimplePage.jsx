export default function SimplePage({ title, children }) {
  return (
    <div style={{ paddingTop: 90, padding: "90px 5% 40px", maxWidth: 780, margin: "0 auto" }} className="fade-up">
      <h1 style={{
        fontFamily: "'Syne',sans-serif",
        fontSize: 40,
        fontWeight: 800,
        letterSpacing: "-0.3px",
        marginBottom: 24,
      }}>
        {title}
      </h1>
      <div style={{ color: "rgba(238,240,248,0.72)", lineHeight: 1.8, fontSize: 15 }}>
        {children}
      </div>
    </div>
  );
}