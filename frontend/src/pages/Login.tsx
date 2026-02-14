import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(username, password);
      navigate("/projects");
    } catch {
      setError("Invalid credentials");
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#0f0f23",
    }}>
      <form onSubmit={handleSubmit} style={{
        background: "#1a1a2e", padding: 40, borderRadius: 12,
        width: 360, boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}>
        <h1 style={{ color: "#00d4ff", marginBottom: 8, fontSize: 28, textAlign: "center" }}>
          LabelForge
        </h1>
        <p style={{ color: "#888", textAlign: "center", marginBottom: 24, fontSize: 14 }}>
          Annotation & Review Platform
        </p>
        {error && (
          <div style={{
            background: "#e74c3c22", border: "1px solid #e74c3c",
            color: "#e74c3c", padding: "8px 12px", borderRadius: 6,
            marginBottom: 16, fontSize: 13,
          }}>
            {error}
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: "#aaa", fontSize: 13, display: "block", marginBottom: 4 }}>
            Username
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle}
            autoFocus
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ color: "#aaa", fontSize: 13, display: "block", marginBottom: 4 }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </div>
        <button type="submit" style={{
          width: "100%", padding: "10px 0", background: "#00d4ff",
          color: "#0f0f23", border: "none", borderRadius: 6,
          fontSize: 15, fontWeight: 600, cursor: "pointer",
        }}>
          Sign In
        </button>
        <div style={{ marginTop: 20, color: "#666", fontSize: 12, textAlign: "center" }}>
          Demo: admin/admin123 &middot; annotator/annotator123 &middot; reviewer/reviewer123
        </div>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", background: "#16213e",
  border: "1px solid #333", borderRadius: 6, color: "#e0e0e0",
  fontSize: 14, outline: "none", boxSizing: "border-box",
};
