import { useEffect, useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const [status, setStatus] = useState<"loading" | "disabled">("loading");

  useEffect(() => {
    // Small delay so the screen doesn't flash
    const t = setTimeout(() => setStatus("disabled"), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="auth-screen">
      <div className="auth-card">
        {status === "loading" && (
          <div className="auth-brand">
            <Loader2 size={32} className="spin" />
            <h1>Just a moment…</h1>
          </div>
        )}
        {status === "disabled" && (
          <div className="auth-brand">
            <CheckCircle size={32} color="#0D9488" />
            <h1>Email verification is disabled</h1>
            <p>You can log in immediately after creating an account.</p>
            <a href="/" className="auth-btn">Go to login</a>
          </div>
        )}
      </div>
    </div>
  );
}
