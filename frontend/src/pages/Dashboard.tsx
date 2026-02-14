import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import client from "../api/client";

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

const COLORS = ["#00d4ff", "#2ecc71", "#f39c12", "#e74c3c", "#9b59b6", "#1abc9c"];

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string>("");
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    client.get("/api/projects/").then((res) => setProjects(res.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = projectId ? `/api/metrics/?project_id=${projectId}` : "/api/metrics/";
    client.get(url).then((res) => {
      setMetrics(res.data);
      setLoading(false);
    });
  }, [projectId]);

  if (loading || !metrics) return <div style={containerStyle}>Loading dashboard...</div>;

  const labelData = Object.entries(metrics.label_distribution).map(([name, value]) => ({
    name, value,
  }));

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
      <div style={chartCard}>
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
