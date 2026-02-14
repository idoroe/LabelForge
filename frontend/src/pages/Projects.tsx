import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";

interface Project {
  id: number;
  name: string;
  description: string;
  created_by: { username: string };
  created_at: string;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchProjects = async () => {
    const res = await client.get("/api/projects/");
    setProjects(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await client.post("/api/projects/", { name, description: desc });
    setName(""); setDesc(""); setShowCreate(false);
    fetchProjects();
  };

  if (loading) return <div style={containerStyle}>Loading projects...</div>;

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ color: "#e0e0e0", fontSize: 24 }}>Projects</h1>
        {user?.role === "admin" && (
          <button onClick={() => setShowCreate(!showCreate)} style={btnPrimary}>
            + New Project
          </button>
        )}
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} style={{
          background: "#1a1a2e", padding: 20, borderRadius: 8,
          marginBottom: 20, border: "1px solid #333",
        }}>
          <input
            placeholder="Project name" value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ ...inputStyle, marginBottom: 12 }} autoFocus
          />
          <input
            placeholder="Description" value={desc}
            onChange={(e) => setDesc(e.target.value)}
            style={{ ...inputStyle, marginBottom: 12 }}
          />
          <button type="submit" style={btnPrimary}>Create</button>
        </form>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {projects.map((p) => (
          <div
            key={p.id}
            onClick={() => navigate(`/projects/${p.id}`)}
            style={{
              background: "#1a1a2e", padding: 20, borderRadius: 8,
              border: "1px solid #222", cursor: "pointer",
              transition: "border-color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#00d4ff")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#222")}
          >
            <h3 style={{ color: "#e0e0e0", marginBottom: 4 }}>{p.name}</h3>
            <p style={{ color: "#888", fontSize: 13, margin: 0 }}>{p.description}</p>
            <p style={{ color: "#555", fontSize: 12, marginTop: 8 }}>
              Created by {p.created_by.username} &middot; {new Date(p.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
        {projects.length === 0 && (
          <p style={{ color: "#666" }}>No projects yet.</p>
        )}
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = { maxWidth: 800, margin: "0 auto", padding: 32 };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", background: "#16213e",
  border: "1px solid #333", borderRadius: 6, color: "#e0e0e0",
  fontSize: 14, outline: "none", boxSizing: "border-box",
};
const btnPrimary: React.CSSProperties = {
  padding: "8px 16px", background: "#00d4ff", color: "#0f0f23",
  border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer",
};
