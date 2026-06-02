import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "../auth";

export default function FirstRun({ onComplete }: { onComplete: () => void }) {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const result = await register(email, password, name || undefined);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      onComplete();
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <ShieldCheck size={36} style={{ color: "var(--accent)" }} />
          <h1>Welcome to Labify</h1>
          <p>Create your admin account to get started</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <label>Full name (optional)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dr. Jane Doe"
            autoFocus
          />

          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@institution.edu"
            required
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

          <label>Confirm password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat password"
            required
            minLength={6}
          />

          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? <Loader2 size={16} className="spin" /> : "Create admin account"}
          </button>
        </form>

        <p className="auth-switch" style={{ fontSize: "0.8rem", opacity: 0.7 }}>
          This will be the first administrator account for your Labify instance.
        </p>
      </div>
    </div>
  );
}
