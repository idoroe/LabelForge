import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";

interface Dataset {
  id: number;
  name: string;
  labels: string[];
  task_counts: Record<string, number>;
}

interface ProjectData {
  id: number;
  name: string;
  description: string;
  datasets: Dataset[];
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [dsName, setDsName] = useState("");
  const [dsLabels, setDsLabels] = useState("positive,negative,neutral");
  const [showBulk, setShowBulk] = useState<number | null>(null);
  const [bulkText, setBulkText] = useState("");

  const fetch = async () => {
    const res = await client.get(`/api/projects/${id}/`);
    setProject(res.data);
  };

  useEffect(() => { fetch(); }, [id]);

  const handleCreateDataset = async (e: React.FormEvent) => {
    e.preventDefault();
    await client.post(`/api/projects/${id}/datasets/`, {
      name: dsName,
      labels: dsLabels.split(",").map((l) => l.trim()).filter(Boolean),
    });
    setDsName(""); setShowCreate(false);
    fetch();
  };

  const handleBulkCreate = async (datasetId: number) => {
    const lines = bulkText.split("\n").filter((l) => l.trim());
    const tasks = lines.map((l) => ({ text_content: l.trim() }));
    await client.post(`/api/datasets/${datasetId}/tasks/bulk/`, { tasks });
    setBulkText(""); setShowBulk(null);
    fetch();
  };

  if (!project) return <div style={{ padding: 32, color: "#888" }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 32 }}>
      <button onClick={() => navigate("/projects")} style={backBtn}>&larr; Projects</button>
      <h1 style={{ color: "#e0e0e0", marginBottom: 4 }}>{project.name}</h1>
      <p style={{ color: "#888", marginBottom: 24 }}>{project.description}</p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ color: "#ccc", fontSize: 18 }}>Datasets</h2>
        {user?.role === "admin" && (
          <button onClick={() => setShowCreate(!showCreate)} style={btnPrimary}>
            + New Dataset
          </button>
        )}
      </div>

      {showCreate && (
        <form onSubmit={handleCreateDataset} style={formStyle}>
          <input
            placeholder="Dataset name" value={dsName}
            onChange={(e) => setDsName(e.target.value)}
            style={{ ...inputStyle, marginBottom: 12 }} autoFocus
          />
          <input
            placeholder="Labels (comma-separated)" value={dsLabels}
            onChange={(e) => setDsLabels(e.target.value)}
            style={{ ...inputStyle, marginBottom: 12 }}
          />
          <button type="submit" style={btnPrimary}>Create Dataset</button>
        </form>
      )}

      {project.datasets.map((ds) => (
        <div key={ds.id} style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ color: "#e0e0e0", margin: 0 }}>{ds.name}</h3>
            <div style={{ display: "flex", gap: 8 }}>
              {(user?.role === "annotator" || user?.role === "admin") && (
                <button
                  onClick={() => navigate(`/annotate?dataset_id=${ds.id}`)}
                  style={{ ...btnPrimary, fontSize: 12, padding: "4px 12px" }}
                >
                  Annotate
                </button>
              )}
              {user?.role === "admin" && (
                <button
                  onClick={() => setShowBulk(showBulk === ds.id ? null : ds.id)}
                  style={{ ...btnSecondary, fontSize: 12, padding: "4px 12px" }}
                >
                  + Tasks
                </button>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
            {Object.entries(ds.task_counts).map(([k, v]) => (
              <span key={k} style={badgeStyle}>
                {k}: <strong>{v}</strong>
              </span>
            ))}
          </div>
          <div style={{ marginTop: 8, color: "#666", fontSize: 12 }}>
            Labels: {ds.labels.join(", ")}
          </div>

          {showBulk === ds.id && (
            <div style={{ marginTop: 12 }}>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Paste task texts, one per line..."
                style={{ ...inputStyle, height: 100, resize: "vertical" }}
              />
              <button
                onClick={() => handleBulkCreate(ds.id)}
                style={{ ...btnPrimary, marginTop: 8, fontSize: 12 }}
              >
                Create Tasks
              </button>
            </div>
          )}
        </div>
      ))}
      {project.datasets.length === 0 && (
        <p style={{ color: "#666" }}>No datasets yet.</p>
      )}
    </div>
  );
}

const backBtn: React.CSSProperties = {
  background: "transparent", border: "none", color: "#00d4ff",
  cursor: "pointer", fontSize: 14, padding: 0, marginBottom: 16,
};
const btnPrimary: React.CSSProperties = {
  padding: "8px 16px", background: "#00d4ff", color: "#0f0f23",
  border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer",
};
const btnSecondary: React.CSSProperties = {
  padding: "8px 16px", background: "transparent", color: "#00d4ff",
  border: "1px solid #00d4ff", borderRadius: 6, fontWeight: 600, cursor: "pointer",
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", background: "#16213e",
  border: "1px solid #333", borderRadius: 6, color: "#e0e0e0",
  fontSize: 14, outline: "none", boxSizing: "border-box",
};
const formStyle: React.CSSProperties = {
  background: "#1a1a2e", padding: 20, borderRadius: 8,
  marginBottom: 20, border: "1px solid #333",
};
const cardStyle: React.CSSProperties = {
  background: "#1a1a2e", padding: 20, borderRadius: 8,
  border: "1px solid #222", marginBottom: 12,
};
const badgeStyle: React.CSSProperties = {
  background: "#16213e", padding: "2px 10px", borderRadius: 12,
  fontSize: 12, color: "#aaa",
};
