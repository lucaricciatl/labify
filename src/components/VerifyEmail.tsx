import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useAuth } from "../auth";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const { verifyEmail } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }
    verifyEmail(token).then((result) => {
      if (result.error) {
        setStatus("error");
        setMessage(result.error);
      } else {
        setStatus("success");
        setMessage(result.message || "Verified!");
      }
    });
  }, [token, verifyEmail]);

  return (
    <div className="auth-screen">
      <div className="auth-card">
        {status === "loading" && (
          <div className="auth-brand">
            <Loader2 size={32} className="spin" />
            <h1>Verifying your email…</h1>
          </div>
        )}
        {status === "success" && (
          <div className="auth-brand">
            <CheckCircle size={32} color="#0D9488" />
            <h1>{message}</h1>
            <p>You can now log in to Labify.</p>
            <a href="/" className="auth-btn">Go to login</a>
          </div>
        )}
        {status === "error" && (
          <div className="auth-brand">
            <XCircle size={32} color="#EF4444" />
            <h1>Verification failed</h1>
            <p>{message}</p>
            <a href="/" className="auth-btn">Go to login</a>
          </div>
        )}
      </div>
    </div>
  );
}
