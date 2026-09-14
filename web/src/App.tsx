import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import Login from "./pages/Login";
import SetPassword from "./pages/SetPassword";
import VerifyOTP from "./pages/VerifyOTP";
import Dashboard from "./pages/Dashboard";
import ClientJourney from "./pages/ClientJourney";
import AdminClients from "./pages/AdminClients";
import AdminClientDetail from "./pages/AdminClientDetail";
import AskBrock from "./pages/AskBrock";
import { Settings } from "./pages/Settings";
import MyCoverage from "./pages/MyCoverage";

function Protected({ role, children }: { role: "ADMIN" | "CLIENT"; children: React.ReactNode }) {
  const { me, loading } = useAuth();
  if (loading) return <div style={{ padding: 44 }}>Loading…</div>;
  if (!me) return <Navigate to="/login" replace />;
  if (me.role !== role) return <Navigate to={me.role === "ADMIN" ? "/admin/clients" : "/dashboard"} replace />;
  return <>{children}</>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { me, loading } = useAuth();
  if (loading) return <div style={{ padding: 44 }}>Loading…</div>;
  if (!me) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { me, loading } = useAuth();
  if (loading) return <div style={{ padding: 44 }}>Loading…</div>;
  if (!me) return <Navigate to="/login" replace />;
  return <Navigate to={me.role === "ADMIN" ? "/admin/clients" : "/dashboard"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/set-password" element={<SetPassword />} />
      <Route path="/verify-otp" element={<VerifyOTP />} />
      <Route
        path="/dashboard"
        element={
          <Protected role="CLIENT">
            <Dashboard />
          </Protected>
        }
      />
      <Route
        path="/journey"
        element={
          <Protected role="CLIENT">
            <ClientJourney />
          </Protected>
        }
      />
      <Route
        path="/settings"
        element={
          <Protected role="CLIENT">
            <Settings />
          </Protected>
        }
      />
      <Route
        path="/coverage"
        element={
          <Protected role="CLIENT">
            <MyCoverage />
          </Protected>
        }
      />
      <Route
        path="/ask-brock"
        element={
          <RequireAuth>
            <AskBrock />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/clients"
        element={
          <Protected role="ADMIN">
            <AdminClients />
          </Protected>
        }
      />
      <Route
        path="/admin/clients/:clientId"
        element={
          <Protected role="ADMIN">
            <AdminClientDetail />
          </Protected>
        }
      />
    </Routes>
    </AuthProvider>
  );
}
