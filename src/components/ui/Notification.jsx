import { useApp } from "../../context/AppContext";
import { C } from "../../constants/theme";

export default function Notification() {
  const { notification } = useApp();
  if (!notification) return null;
  const colors = { success: C.accent, error: "#ef4444", warn: "#f59e0b" };
  return (
    <div className="notification-toast" style={{
      background: C.surface,
      borderLeft: `3px solid ${colors[notification.type] || C.accent}`,
      border: `1px solid ${C.border}`,
    }}>
      {notification.msg}
    </div>
  );
}