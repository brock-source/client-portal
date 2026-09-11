import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { NotificationBell } from "./NotificationBell";
import { ClientNav } from "./ClientNav";

export function PortalShell({ children }: { children: React.ReactNode }) {
  const { me, logout } = useAuth();
  const navigate = useNavigate();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper-warm, #f4f3f1)" }}>
      <div
        className="sc-header-bar"
        style={{
          background: "var(--ink-900)",
          minHeight: 38,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "8px 32px",
          fontFamily: "var(--font-label)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#b9c2cc",
        }}
      >
        <span>Private Client Portal</span>
        <div style={{ display: "flex", gap: 26, flexWrap: "wrap" }}>
          <span>(615) 397-8799</span>
          <span
            style={{ color: "#f4f3f1", cursor: "pointer" }}
            onClick={() => logout().then(() => (window.location.href = "/login"))}
          >
            Sign out
          </span>
        </div>
      </div>
      <div
        className="sc-header-bar"
        style={{
          background: "#fff",
          borderBottom: "1px solid var(--border-subtle)",
          minHeight: 52,
          display: "flex",
          flexWrap: "nowrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "12px 32px",
        }}
      >
        <img
          src="/assets/logo.png"
          alt="StoneCentury Financial"
          style={{ height: 36, width: "auto", cursor: me?.client ? "pointer" : "default", flexShrink: 0 }}
          onClick={() => me?.client && navigate("/dashboard")}
        />

        {me?.client && <ClientNav />}

        {me?.client && (
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginLeft: "auto", flexShrink: 0 }}>
            <NotificationBell />
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
              <div
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                style={{
                  width: 34,
                  height: 34,
                  flex: "none",
                  background: "var(--navy-700)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-label)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  borderRadius: "4px",
                }}
              >
                {me.client.firstName[0]}
                {me.client.lastName[0]}
              </div>
              <span
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 14,
                  color: "var(--ink-700)",
                  cursor: "pointer",
                }}
              >
                {me.client.householdLabel}
              </span>

              {profileDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    background: "#fff",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "4px",
                    minWidth: "200px",
                    marginTop: "8px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    zIndex: 1000,
                  }}
                >
                  <button
                    onClick={() => {
                      navigate("/settings");
                      setProfileDropdownOpen(false);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "12px 16px",
                      background: "transparent",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      fontFamily: "var(--font-body)",
                      fontSize: "14px",
                      color: "var(--ink-700)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--navy-50, #f8fafb)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    Settings
                  </button>
                  <button
                    onClick={() => logout().then(() => (window.location.href = "/login"))}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "12px 16px",
                      background: "transparent",
                      border: "none",
                      borderTop: "1px solid var(--border-subtle)",
                      textAlign: "left",
                      cursor: "pointer",
                      fontFamily: "var(--font-body)",
                      fontSize: "14px",
                      color: "var(--ink-700)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--navy-50, #f8fafb)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
