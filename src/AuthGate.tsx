import { useState, useEffect } from "react";
import { useAuth } from "./auth";
import Login from "./components/Login";
import Register from "./components/Register";
import FirstRun from "./components/FirstRun";
import { Loader2 } from "lucide-react";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [view, setView] = useState<"login" | "register">("login");
  const [firstRun, setFirstRun] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_URL || "";
    fetch(`${API_BASE}/api/auth/first-run`)
      .then((r) => r.json())
      .then((data) => {
        setFirstRun(data.firstRun);
        setChecking(false);
      })
      .catch(() => {
        setFirstRun(false);
        setChecking(false);
      });
  }, []);

  // Re-check first-run after a successful first-run registration
  const handleFirstRunComplete = () => {
    setFirstRun(false);
    setView("login");
  };

  if (checking || authLoading) {
    return (
      <div className="auth-screen">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <Loader2 size={32} className="spin" />
          <p style={{ marginTop: "1rem", opacity: 0.7 }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <>{children}</>;
  }

  if (firstRun) {
    return <FirstRun onComplete={handleFirstRunComplete} />;
  }

  if (view === "login") {
    return <Login onSwitch={setView} />;
  }

  return <Register onSwitch={setView} />;
}
