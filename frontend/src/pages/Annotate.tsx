import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import client from "../api/client";

interface Task {
  id: number;
  text_content: string;
  status: string;
  dataset_labels: string[];
  dataset_name: string;
  comments: { body: string; author: { username: string }; created_at: string }[];
}

export default function Annotate() {
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get("dataset_id");
  const [queue, setQueue] = useState<Task[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQueue = useCallback(async () => {
    const url = datasetId ? `/api/tasks/queue/?dataset_id=${datasetId}` : "/api/tasks/queue/";
    const res = await client.get(url);
    setQueue(res.data);
    setLoading(false);
  }, [datasetId]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const task = queue[currentIdx];

  useEffect(() => {
    setSelectedLabel(null);
    setTimer(0);
    if (timerRef.current) clearInterval(timerRef.current);
    if (task) {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIdx, task?.id]);

  const claimAndSubmit = async () => {
    if (!task || !selectedLabel || submitting) return;
    setSubmitting(true);
    try {
      if (task.status === "unclaimed") {
        await client.post(`/api/tasks/${task.id}/claim/`);
      }
      await client.post(`/api/tasks/${task.id}/submit/`, {
        annotation: { label: selectedLabel },
        time_spent_seconds: timer,
      });
      const newQueue = queue.filter((_, i) => i !== currentIdx);
      setQueue(newQueue);
      if (currentIdx >= newQueue.length && newQueue.length > 0) {
        setCurrentIdx(newQueue.length - 1);
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error submitting task");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!task) return;
      const labels = task.dataset_labels || [];
      const num = parseInt(e.key);
      if (num >= 1 && num <= labels.length) {
        setSelectedLabel(labels[num - 1]);
      }
      if (e.key === "Enter" && selectedLabel) {
        claimAndSubmit();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [task, selectedLabel, timer, submitting]);

  if (loading) return <div style={containerStyle}>Loading queue...</div>;

  if (queue.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={{
          textAlign: "center", padding: 60, color: "#888",
          background: "#1a1a2e", borderRadius: 12,
        }}>
          <h2 style={{ color: "#e0e0e0" }}>No tasks available</h2>
          <p>Check back later or select a different dataset.</p>
        </div>
      </div>
    );
  }

  const labels = task.dataset_labels || [];
  const rejectionComments = task.comments?.filter((c) => c.body) || [];
  const latestRejection = rejectionComments.length > 0 ? rejectionComments[0] : null;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div style={containerStyle}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 20,
      }}>
        <h1 style={{ color: "#e0e0e0", fontSize: 22 }}>Annotate</h1>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ color: "#888", fontSize: 14 }}>
            Task {currentIdx + 1} of {queue.length}
          </span>
          <span style={{
            background: "#16213e", padding: "4px 12px", borderRadius: 8,
            color: "#00d4ff", fontFamily: "monospace", fontSize: 16,
          }}>
            {formatTime(timer)}
          </span>
        </div>
      </div>

      {latestRejection && (
        <div style={{
          background: "#e74c3c22", border: "1px solid #e74c3c",
          borderRadius: 8, padding: 16, marginBottom: 16,
        }}>
          <div style={{ color: "#e74c3c", fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
            Reviewer Feedback ({latestRejection.author.username})
          </div>
          <div style={{ color: "#e0e0e0", fontSize: 14 }}>{latestRejection.body}</div>
        </div>
      )}

      <div style={{
        background: "#1a1a2e", borderRadius: 12, padding: 32,
        border: "1px solid #222", marginBottom: 20,
      }}>
        <div style={{ color: "#666", fontSize: 12, marginBottom: 8 }}>
          {task.dataset_name} &middot; Task #{task.id}
        </div>
        <p style={{ color: "#e0e0e0", fontSize: 18, lineHeight: 1.6, margin: 0 }}>
          {task.text_content}
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        {labels.map((label, i) => (
          <button
            key={label}
            onClick={() => setSelectedLabel(label)}
            style={{
              padding: "12px 24px", borderRadius: 8,
              border: selectedLabel === label ? "2px solid #00d4ff" : "2px solid #333",
              background: selectedLabel === label ? "#00d4ff22" : "#16213e",
              color: selectedLabel === label ? "#00d4ff" : "#aaa",
              cursor: "pointer", fontSize: 15, fontWeight: 600,
              transition: "all 0.15s",
            }}
          >
            <span style={{ opacity: 0.5, marginRight: 8, fontSize: 12 }}>{i + 1}</span>
            {label}
          </button>
        ))}
      </div>

      <button
        onClick={claimAndSubmit}
        disabled={!selectedLabel || submitting}
        style={{
          padding: "12px 32px", background: selectedLabel ? "#00d4ff" : "#333",
          color: selectedLabel ? "#0f0f23" : "#666", border: "none",
          borderRadius: 8, fontSize: 16, fontWeight: 700,
          cursor: selectedLabel ? "pointer" : "not-allowed",
        }}
      >
        {submitting ? "Submitting..." : "Submit (Enter)"}
      </button>

      <p style={{ color: "#555", fontSize: 12, marginTop: 12 }}>
        Keyboard: Press 1-{labels.length} to select label, Enter to submit
      </p>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  maxWidth: 720, margin: "0 auto", padding: 32, color: "#e0e0e0",
};
