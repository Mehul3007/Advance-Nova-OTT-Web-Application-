import { AppProvider } from "./context/AppContext";
import { globalCSS } from "./styles/global";
import Router from "./pages/Router";
import AuthModal from "./components/auth/AuthModal";
import Notification from "./components/ui/Notification";

export default function NovaOTTPro() {
  return (
    <AppProvider>
      <style>{globalCSS}</style>
      <Router />
      <AuthModal />
      <Notification />
    </AppProvider>
  );
}