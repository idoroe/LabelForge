import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!user) return null;

  return (
    <nav style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", height: 56, background: "#1a1a2e",
      borderBottom: "1px solid #16213e", color: "#e0e0e0",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <Link to="/projects" style={{
          fontWeight: 700, fontSize: 18, color: "#00d4ff",
          textDecoration: "none", letterSpacing: 1,
        }}>
          LabelForge
        </Link>
        <Link to="/projects" style={linkStyle}>Projects</Link>
        {(user.role === "annotator" || user.role === "admin") && (
          <Link to="/annotate" style={linkStyle}>Annotate</Link>
        )}
        {(user.role === "reviewer" || user.role === "admin") && (
          <Link to="/review" style={linkStyle}>Review</Link>
        )}
        <Link to="/dashboard" style={linkStyle}>Dashboard</Link>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{
          background: roleColors[user.role] || "#444",
          padding: "2px 10px", borderRadius: 12, fontSize: 12,
          fontWeight: 600, textTransform: "uppercase",
        }}>
          {user.role}
        </span>
        <span style={{ fontSize: 14 }}>{user.username}</span>
        <button onClick={handleLogout} style={{
          background: "transparent", border: "1px solid #555",
          color: "#ccc", padding: "4px 12px", borderRadius: 4,
          cursor: "pointer", fontSize: 13,
        }}>
          Logout
        </button>
      </div>
    </nav>
  );
}

const linkStyle: React.CSSProperties = {
  color: "#b0b0b0", textDecoration: "none", fontSize: 14, fontWeight: 500,
};

const roleColors: Record<string, string> = {
  admin: "#e74c3c",
  reviewer: "#f39c12",
  annotator: "#2ecc71",
};
