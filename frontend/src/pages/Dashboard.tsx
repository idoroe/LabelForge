import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";

interface Metrics {
  total_tasks: number;
  completed: number;
  rejected: number;
  completion_rate: number;
  rejection_rate: number;
  avg_time_per_task: number;
  daily_throughput: { date: string; count: number }[];
  per_annotator: {
    username: string; done: number; rejected: number;
    rejection_rate: number; avg_time: number;
  }[];
  label_distribution: Record<string, number>;
}

interface Rejection {
  id: number;
  task_id: number;
  text_content: string;
  dataset_name: string;
  annotator: string;
  label_submitted: string;
  reviewer: string;
  feedback: string;
  rejected_at: string;
  current_status: string;
  time_spent_seconds: number;
}

const COLORS = ["#00d4ff", "#2ecc71", "#f39c12", "#e74c3c", "#9b59b6", "#1abc9c"];

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  approved: { text: "Fixed & Approved", color: "#2ecc71" },
  submitted: { text: "Re-submitted", color: "#f39c12" },
  in_progress: { text: "Awaiting Re-work", color: "#e74c3c" },
  unclaimed: { text: "Unclaimed", color: "#888" },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [rejections, setRejections] = useState<Rejection[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string>("");
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    client.get("/api/projects/").then((res) => setProjects(res.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const metricsUrl = projectId ? `/api/metrics/?project_id=${projectId}` : "/api/metrics/";
    const rejectUrl = projectId
      ? `/api/tasks/rejection-history/?project_id=${projectId}`
      : "/api/tasks/rejection-history/";

    Promise.all([
      client.get(metricsUrl),
      client.get(rejectUrl),
    ]).then(([metricsRes, rejectRes]) => {
      setMetrics(metricsRes.data);
      setRejections(rejectRes.data);
      setLoading(false);
    });
  }, [projectId]);

  if (loading || !metrics) return <div style={containerStyle}>Loading dashboard...</div>;

  const labelData = Object.entries(metrics.label_distribution).map(([name, value]) => ({
    name, value,
  }));

  const resolvedCount = rejections.filter((r) => r.current_status === "approved").length;
  const pendingCount = rejections.filter((r) => r.current_status !== "approved").length;

  return (
    <div style={containerStyle}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 24,
      }}>
        <h1 style={{ color: "#e0e0e0", fontSize: 24 }}>Quality Dashboard</h1>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          style={{
            background: "#16213e", border: "1px solid #333", color: "#e0e0e0",
            padding: "6px 12px", borderRadius: 6, fontSize: 13,
          }}
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Stat Cards */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 12, marginBottom: 32,
      }}>
        <StatCard label="Total Tasks" value={metrics.total_tasks} />
        <StatCard label="Completed" value={metrics.completed} color="#2ecc71" />
        <StatCard label="Rejected" value={metrics.rejected} color="#e74c3c" />
        <StatCard label="Completion" value={`${metrics.completion_rate}%`} color="#00d4ff" />
        <StatCard label="Rejection Rate" value={`${metrics.rejection_rate}%`} color="#f39c12" />
        <StatCard
          label="Avg Time"
          value={`${Math.round(metrics.avg_time_per_task)}s`}
          color="#9b59b6"
        />
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
        <div style={chartCard}>
          <h3 style={{ color: "#ccc", fontSize: 15, marginBottom: 16 }}>Daily Throughput</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={metrics.daily_throughput}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="date" tick={{ fill: "#888", fontSize: 11 }}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis tick={{ fill: "#888", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#16213e", border: "1px solid #333", color: "#e0e0e0" }}
              />
              <Bar dataKey="count" fill="#00d4ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={chartCard}>
          <h3 style={{ color: "#ccc", fontSize: 15, marginBottom: 16 }}>Label Distribution</h3>
          {labelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={labelData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                  paddingAngle={3}
                >
                  {labelData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#16213e", border: "1px solid #333", color: "#e0e0e0" }}
                />
                <Legend
                  wrapperStyle={{ color: "#aaa", fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: "#666", textAlign: "center", paddingTop: 80 }}>
              No data yet
            </div>
          )}
        </div>
      </div>

      {/* Per-annotator table */}
      <div style={{ ...chartCard, marginBottom: 32 }}>
        <h3 style={{ color: "#ccc", fontSize: 15, marginBottom: 16 }}>Per-Annotator Performance</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #333" }}>
              {["Annotator", "Completed", "Rejected", "Rejection Rate", "Avg Time"].map((h) => (
                <th key={h} style={{
                  color: "#888", fontSize: 12, fontWeight: 600, padding: "8px 12px",
                  textAlign: "left",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.per_annotator.map((a) => (
              <tr key={a.username} style={{ borderBottom: "1px solid #222" }}>
                <td style={cellStyle}>{a.username}</td>
                <td style={cellStyle}>{a.done}</td>
                <td style={cellStyle}>{a.rejected}</td>
                <td style={cellStyle}>
                  <span style={{
                    color: a.rejection_rate > 20 ? "#e74c3c" : a.rejection_rate > 10 ? "#f39c12" : "#2ecc71",
                  }}>
                    {a.rejection_rate}%
                  </span>
                </td>
                <td style={cellStyle}>{Math.round(a.avg_time)}s</td>
              </tr>
            ))}
            {metrics.per_annotator.length === 0 && (
              <tr>
                <td colSpan={5} style={{ ...cellStyle, color: "#666", textAlign: "center" }}>
                  No data yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Rejection History */}
      <div style={{
        ...chartCard,
        borderColor: "#e74c3c33",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 20,
        }}>
          <div>
            <h3 style={{ color: "#e74c3c", fontSize: 17, marginBottom: 4 }}>
              Rejection History
            </h3>
            <p style={{ color: "#888", fontSize: 12, margin: 0 }}>
              {user?.role === "annotator"
                ? "Review past rejections to learn from feedback and improve accuracy"
                : "All rejection events across annotators"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <MiniStat label="Total Rejections" value={rejections.length} color="#e74c3c" />
            <MiniStat label="Resolved" value={resolvedCount} color="#2ecc71" />
            <MiniStat label="Pending" value={pendingCount} color="#f39c12" />
          </div>
        </div>

        {rejections.length === 0 ? (
          <div style={{
            textAlign: "center", padding: 40, color: "#666", fontSize: 14,
          }}>
            No rejections yet — great work!
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rejections.map((r) => {
              const isExpanded = expandedId === r.id;
              const statusInfo = STATUS_LABELS[r.current_status] || { text: r.current_status, color: "#888" };

              return (
                <div
                  key={r.id}
                  style={{
                    background: "#16213e",
                    border: isExpanded ? "1px solid #e74c3c55" : "1px solid #222",
                    borderRadius: 8,
                    overflow: "hidden",
                    transition: "border-color 0.2s",
                  }}
                >
                  {/* Collapsed row */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto auto",
                      alignItems: "center",
                      gap: 16,
                      padding: "12px 16px",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        color: "#e0e0e0", fontSize: 13,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {r.text_content}
                      </div>
                      <div style={{ color: "#666", fontSize: 11, marginTop: 2 }}>
                        Task #{r.task_id} &middot; {r.dataset_name}
                        {user?.role !== "annotator" && <> &middot; by {r.annotator}</>}
                      </div>
                    </div>

                    <span style={{
                      background: "#e74c3c22", color: "#e74c3c",
                      padding: "3px 10px", borderRadius: 4, fontSize: 12,
                      fontWeight: 600, whiteSpace: "nowrap",
                    }}>
                      Labeled: {r.label_submitted}
                    </span>

                    <span style={{
                      background: `${statusInfo.color}22`, color: statusInfo.color,
                      padding: "3px 10px", borderRadius: 4, fontSize: 11,
                      fontWeight: 600, whiteSpace: "nowrap",
                    }}>
                      {statusInfo.text}
                    </span>

                    <span style={{
                      color: "#555", fontSize: 16, transition: "transform 0.2s",
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    }}>
                      &#9662;
                    </span>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div style={{
                      borderTop: "1px solid #222",
                      padding: 20,
                      background: "#131325",
                    }}>
                      {/* Full text */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={detailLabel}>Original Text</div>
                        <div style={{
                          color: "#e0e0e0", fontSize: 14, lineHeight: 1.6,
                          background: "#1a1a2e", padding: 12, borderRadius: 6,
                          border: "1px solid #222",
                        }}>
                          {r.text_content}
                        </div>
                      </div>

                      {/* Two columns: what was submitted vs feedback */}
                      <div style={{
                        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
                        marginBottom: 16,
                      }}>
                        <div>
                          <div style={detailLabel}>Your Label</div>
                          <div style={{
                            display: "inline-block",
                            background: "#e74c3c22", color: "#e74c3c",
                            padding: "6px 16px", borderRadius: 6, fontSize: 15,
                            fontWeight: 700, border: "1px solid #e74c3c44",
                          }}>
                            {r.label_submitted}
                          </div>
                        </div>
                        <div>
                          <div style={detailLabel}>Time Spent</div>
                          <div style={{ color: "#ccc", fontSize: 14 }}>
                            {r.time_spent_seconds}s
                          </div>
                        </div>
                      </div>

                      {/* Reviewer feedback */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={detailLabel}>
                          Reviewer Feedback from {r.reviewer}
                        </div>
                        <div style={{
                          background: "#e74c3c11", border: "1px solid #e74c3c33",
                          borderRadius: 6, padding: 14,
                          color: "#e0e0e0", fontSize: 14, lineHeight: 1.6,
                        }}>
                          {r.feedback}
                        </div>
                      </div>

                      {/* Status + date */}
                      <div style={{
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={detailLabel}>Current Status:</span>
                          <span style={{
                            color: statusInfo.color, fontWeight: 600, fontSize: 13,
                          }}>
                            {statusInfo.text}
                          </span>
                        </div>
                        <div style={{ color: "#555", fontSize: 12 }}>
                          Rejected on {new Date(r.rejected_at).toLocaleDateString()} at{" "}
                          {new Date(r.rejected_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{
      background: "#1a1a2e", padding: 16, borderRadius: 8,
      border: "1px solid #222", textAlign: "center",
    }}>
      <div style={{ color: color || "#e0e0e0", fontSize: 28, fontWeight: 700 }}>{value}</div>
      <div style={{ color: "#888", fontSize: 12, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ color, fontSize: 20, fontWeight: 700 }}>{value}</div>
      <div style={{ color: "#666", fontSize: 10 }}>{label}</div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  maxWidth: 1000, margin: "0 auto", padding: 32, color: "#e0e0e0",
};

const chartCard: React.CSSProperties = {
  background: "#1a1a2e", padding: 20, borderRadius: 8,
  border: "1px solid #222",
};

const cellStyle: React.CSSProperties = {
  padding: "10px 12px", color: "#ccc", fontSize: 13,
};

const detailLabel: React.CSSProperties = {
  color: "#888", fontSize: 11, fontWeight: 600, textTransform: "uppercase",
  letterSpacing: 0.5, marginBottom: 6,
};
