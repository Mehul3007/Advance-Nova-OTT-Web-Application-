import { useApp } from "../context/AppContext";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import SimplePage from "../components/ui/SimplePage";
import HomePage from "./HomePage";
import BrowsePage from "./BrowsePage";
import DetailPage from "./DetailPage";
import CollectionPage from "./CollectionPage";
import ProfilePage from "./ProfilePage";
import SubscriptionPage from "./SubscriptionPage";
import SettingsPage from "./SettingsPage";
import VideoPlayer from "./VideoPlayer";

export default function Router() {
  const { currentPage, playerContent, setCurrentPage } = useApp();
  if (currentPage === "player" && playerContent) return <VideoPlayer />;

  const pages = {
    home: <HomePage />,
    movies: <BrowsePage type="movies" />,
    series: <BrowsePage type="series" />,
    watchlist: <CollectionPage type="watchlist" />,
    favorites: <CollectionPage type="favorites" />,
    profile: <ProfilePage />,
    detail: <DetailPage />,
    subscription: <SubscriptionPage />,
    settings: <SettingsPage />,
    about: (
      <SimplePage title="About NOVA OTT">
        <p>NOVA OTT is India's next-generation streaming platform. We believe entertainment should speak your language — literally. With content in Indian languages and an AI engine that learns your taste, we bring you exactly what you want to watch, when you want it.</p>
        <br />
        <p>Built with Supabase for rock-solid auth and real-time sync, Razorpay for seamless Indian payments, and a recommendation engine that gets smarter with every watch.</p>
      </SimplePage>
    ),
    faq: (
      <SimplePage title="FAQ">
        <div>
          {[
            ["What languages are supported?", "Nova OTT supports English, Hindi, Tamil, Telugu, Malayalam, Kannada, Marathi, Bengali, Gujarati, and Punjabi — both in UI and content filtering."],
            ["How does the AI recommendation work?", "Our engine analyzes your watch history, ratings, and favorites to score every title by genre affinity, language preference, and trending signals."],
            ["How do I subscribe?", "Go to Subscription and choose your plan. Payments are powered by Razorpay — UPI, cards, net banking all accepted."],
            ["Is there a free trial?", "New Premium subscribers get 30 days free. No credit card required for the Free plan."],
          ].map(([q, a]) => (
            <div key={q} style={{ marginBottom: 22 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{q}</div>
              <div style={{ color: "rgba(238,240,248,0.7)", fontSize: 14 }}>{a}</div>
            </div>
          ))}
        </div>
      </SimplePage>
    ),
    contact: (
      <SimplePage title="Contact Us">
        <p style={{ marginBottom: 20 }}>Questions? We're here to help.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 460 }}>
          <input placeholder="Name" />
          <input placeholder="Email" type="email" />
          <textarea placeholder="Your message…" rows={4} style={{ resize: "vertical" }} />
          <button className="btn-primary" style={{ width: 140 }}>Send</button>
        </div>
      </SimplePage>
    ),
    privacypolicy: (
      <SimplePage title="Privacy Policy">
        <p>Nova OTT uses Supabase for secure user data storage with Row Level Security — your data is accessible only to you. We collect email, watch history, preferences, and payment records to power personalization and billing. We do not sell your data. Payments are processed by Razorpay and subject to their privacy policy.</p>
      </SimplePage>
    ),
  };

  return (
    <>
      <Navbar />
      <main>{pages[currentPage] || pages.home}</main>
      {currentPage !== "player" && <Footer />}
    </>
  );
}