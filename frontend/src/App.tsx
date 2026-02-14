import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Annotate from "./pages/Annotate";
import Review from "./pages/Review";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <div style={{ minHeight: "100vh", background: "#0f0f23" }}>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
        <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
        <Route path="/annotate" element={<ProtectedRoute><Annotate /></ProtectedRoute>} />
        <Route path="/review" element={<ProtectedRoute><Review /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </div>
  );
}
