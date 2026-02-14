import { useEffect, useState } from "react";
import client from "../api/client";

interface Task {
  id: number;
  text_content: string;
  annotation: { label: string } | null;
  assigned_to: { username: string } | null;
  dataset_name: string;
  time_spent_seconds: number;
}

export default function Review() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState<number | null>(null);

  const fetchQueue = async () => {
    const res = await client.get("/api/tasks/review-queue/");
    setTasks(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchQueue(); }, []);

  const approve = async (taskId: number) => {
    setProcessing(taskId);
    try {
      await client.post(`/api/tasks/${taskId}/approve/`);
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error");
    } finally {
      setProcessing(null);
    }
  };

  const reject = async (taskId: number) => {
    if (!comment.trim()) return alert("Comment is required for rejection.");
    setProcessing(taskId);
    try {
      await client.post(`/api/tasks/${taskId}/reject/`, { comment: comment.trim() });
      setTasks(tasks.filter((t) => t.id !== taskId));
      setRejectId(null);
      setComment("");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <div style={containerStyle}>Loading review queue...</div>;

  return (
    <div style={containerStyle}>
      <h1 style={{ color: "#e0e0e0", fontSize: 22, marginBottom: 24 }}>
        Review Queue
        <span style={{ color: "#888", fontSize: 14, fontWeight: 400, marginLeft: 12 }}>
          {tasks.length} task{tasks.length !== 1 ? "s" : ""} pending
        </span>
      </h1>

      {tasks.length === 0 && (
        <div style={{
          textAlign: "center", padding: 60, color: "#888",
          background: "#1a1a2e", borderRadius: 12,
        }}>
          <h2 style={{ color: "#e0e0e0" }}>All caught up!</h2>
          <p>No tasks waiting for review.</p>
        </div>
      )}

      {tasks.map((task) => (
        <div key={task.id} style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "#666", fontSize: 12 }}>
              {task.dataset_name} &middot; Task #{task.id}
            </span>
            <span style={{ color: "#888", fontSize: 12 }}>
              by {task.assigned_to?.username || "unknown"} &middot; {task.time_spent_seconds}s
            </span>
          </div>

          <p style={{ color: "#e0e0e0", fontSize: 15, margin: "8px 0 12px" }}>
            {task.text_content.length > 200
              ? task.text_content.substring(0, 200) + "..."
              : task.text_content}
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
              background: "#00d4ff22", color: "#00d4ff", padding: "4px 12px",
              borderRadius: 6, fontSize: 13, fontWeight: 600,
            }}>
              {task.annotation?.label || "N/A"}
            </span>

            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button
                onClick={() => approve(task.id)}
                disabled={processing === task.id}
                style={{
                  padding: "6px 16px", background: "#2ecc71", color: "#fff",
                  border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer",
                }}
              >
                Approve
              </button>
              <button
                onClick={() => setRejectId(rejectId === task.id ? null : task.id)}
                style={{
                  padding: "6px 16px", background: "transparent", color: "#e74c3c",
                  border: "1px solid #e74c3c", borderRadius: 6, fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Reject
              </button>
            </div>
          </div>

          {rejectId === task.id && (
            <div style={{ marginTop: 12 }}>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Required: Explain why this annotation is being rejected..."
                style={{
                  width: "100%", padding: "8px 12px", background: "#16213e",
                  border: "1px solid #e74c3c", borderRadius: 6, color: "#e0e0e0",
                  fontSize: 13, height: 80, resize: "vertical", outline: "none",
                  boxSizing: "border-box",
                }}
                autoFocus
              />
              <button
                onClick={() => reject(task.id)}
                disabled={processing === task.id || !comment.trim()}
                style={{
                  marginTop: 8, padding: "6px 16px", background: "#e74c3c",
                  color: "#fff", border: "none", borderRadius: 6, fontWeight: 600,
                  cursor: comment.trim() ? "pointer" : "not-allowed",
                }}
              >
                Submit Rejection
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  maxWidth: 800, margin: "0 auto", padding: 32, color: "#e0e0e0",
};

const cardStyle: React.CSSProperties = {
  background: "#1a1a2e", padding: 20, borderRadius: 8,
  border: "1px solid #222", marginBottom: 12,
};
