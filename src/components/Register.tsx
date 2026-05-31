import { useState } from "react";
import { Beaker, Loader2 } from "lucide-react";
import { useAuth } from "../auth";

export default function Register({ onSwitch }: { onSwitch: (view: "login" | "register") => void }) {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);
    const result = await register(email, password, name);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      // Auth state updated automatically; App.tsx will redirect to the app
    }
  };

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
          {success && <div className="auth-error" style={{ color: "var(--accent)", borderColor: "var(--accent-border)", background: "var(--accent-bg)" }}>Account created! Redirecting…</div>}

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

          <button type="submit" disabled={loading || success} className="auth-btn">
            {loading ? <Loader2 size={16} className="spin" /> : success ? "Welcome!" : "Create account"}
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
