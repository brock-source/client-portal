import { PortalShell } from "../components/PortalShell";

export function Settings() {
  return (
    <PortalShell>
      <div style={{ padding: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "600", marginBottom: "24px", marginTop: "0" }}>
          Settings
        </h1>

        {/* Planned Features */}
        <div
          style={{
            padding: "24px",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            background: "var(--surface-alt)",
          }}
        >
          <h2 style={{ marginTop: "0" }}>Coming Soon</h2>
          <ul style={{ color: "var(--text-muted)" }}>
            <li>Notification Preferences (delivery method, types, frequency)</li>
            <li>Contact Information (email, phone verification)</li>
            <li>Account Settings (profile, password, timezone)</li>
            <li>Privacy & Communication preferences</li>
            <li>Display Preferences (theme selection)</li>
          </ul>
        </div>
      </div>
    </PortalShell>
  );
}
