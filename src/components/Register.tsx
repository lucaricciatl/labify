import { useState } from "react";
import { Beaker, Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "../auth";

export default function Register({ onSwitch }: { onSwitch: (view: "login" | "register") => void }) {
  const { register, resendVerification } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resentLoading, setResentLoading] = useState(false);
  const [resentError, setResentError] = useState("");
  const [emailStatus, setEmailStatus] = useState<{ mock?: boolean; link?: string; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await register(email, password, name);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSent(true);
      setEmailStatus(result.emailStatus || null);
    }
  };

  if (sent) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-brand">
            <CheckCircle size={32} color="#0D9488" />
            <h1>Account created</h1>
            <p>
              {emailStatus?.mock ? (
                <><strong>Email is not configured.</strong> Check the server console for the verification link.</>
              ) : emailStatus?.error ? (
                <><strong>Email failed to send:</strong> {emailStatus.error}</>
              ) : (
                <>We sent a verification link to <strong>{email}</strong>.</>
              )}
            </p>
            {emailStatus?.link && (
              <div className="auth-error" style={{ wordBreak: "break-all" }}>
                <strong>Dev link:</strong>{" "}
                <a href={emailStatus.link} target="_blank" rel="noreferrer">{emailStatus.link}</a>
              </div>
            )}
          </div>
          {resentError && <div className="auth-error">{resentError}</div>}
          <button
            className="auth-btn secondary"
            disabled={resentLoading}
            onClick={async () => {
              setResentError("");
              setResentLoading(true);
              const result = await resendVerification(email);
              setResentLoading(false);
              if (result.error) setResentError(result.error);
            }}
          >
            {resentLoading ? <Loader2 size={16} className="spin" /> : "Resend email"}
          </button>
          <p className="auth-switch">
            <button className="link" onClick={() => onSwitch("login")}>Back to login</button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <Beaker size={32} />
          <h1>Create account</h1>
          <p>Join your lab on Labify</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <label>Full name (optional)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dr. Jane Doe"
          />

          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@institution.edu"
            required
            autoFocus
          />

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 6 characters"
            required
            minLength={6}
          />

          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? <Loader2 size={16} className="spin" /> : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <button className="link" onClick={() => onSwitch("login")}>
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}
