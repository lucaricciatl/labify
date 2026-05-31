import { useState } from "react";
import { Beaker, Loader2 } from "lucide-react";
import { useAuth } from "../auth";

export default function Login({ onSwitch }: { onSwitch: (view: "login" | "register") => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.error) setError(result.error);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <Beaker size={32} />
          <h1>Labify</h1>
          <p>Laboratory Management System</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

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
            placeholder="••••••"
            required
            minLength={6}
          />

          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? <Loader2 size={16} className="spin" /> : "Log In"}
          </button>
        </form>

        <p className="auth-switch">
          No account?{" "}
          <button className="link" onClick={() => onSwitch("register")}>
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}
