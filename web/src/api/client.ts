const BASE = "/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const errorMessage = body.error?.message ?? body.error ?? `Request failed: ${res.status}`;
    throw new Error(errorMessage);
  }
  if (res.status === 204) return undefined as T;
  const json = await res.json();
  return json.data ?? json;
}

async function uploadFile(path: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Upload failed");
  }
}

export const HEALTH_RATING_OPTIONS = [
  "Preferred Plus",
  "Preferred",
  "Select",
  "Standard",
  "Preferred Tobacco",
  "Standard Tobacco",
] as const;

export type Role = "ADMIN" | "CLIENT";

export interface Me {
  id: string;
  email: string;
  role: Role;
  client: { id: string; firstName: string; lastName: string; householdLabel: string } | null;
}

export interface ChecklistItem {
  id: string;
  key: string;
  label: string;
  completedBy: "CLIENT" | "ADMIN";
  sortOrder: number;
  completed: boolean;
  completedAt: string | null;
}

export interface Phase1Category {
  id: string;
  key: string;
  label: string;
  hint?: string | null;
  uploaded: boolean;
  missing: boolean;
  document: { filename: string; uploadedAt: string } | null;
}

export interface Message {
  id: string;
  body: string;
  authorRole: "CLIENT" | "ADMIN";
  createdAt: string;
}

export interface ActionItem {
  id: string;
  text: string;
  createdAt: string;
}

export interface ClientNotification {
  id: string;
  type: "action_item" | "message" | "document";
  title: string;
  body: string;
  relatedId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPreference {
  id: string;
  clientId: string;
  deliveryMethods: string[];
  actionItemsEnabled: boolean;
  messagesEnabled: boolean;
  documentsEnabled: boolean;
  notificationFrequency: string;
  digestTime: string | null;
  notificationEmail: string | null;
  notificationPhone: string | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  timezone: string;
}

export interface Policy {
  id: string;
  clientId: string;
  policyNumber: string;
  policyType: "LIFE" | "DISABILITY" | "LONG_TERM_CARE" | "UMBRELLA" | "HEALTH" | "OTHER";
  status: "ACTIVE" | "INACTIVE" | "EXPIRED" | "LAPSED" | "CANCELLED" | "PENDING";
  coverageAmount: number;
  premium: number | null;
  premiumFrequency: string | null;
  beneficiary: string | null;
  insurer: string | null;
  issueDate: string;
  expirationDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export const api = {
  me: () => request<Me>("/auth/me"),
  login: (email: string, password: string) =>
    request<Me>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request<{ ok: true }>("/auth/logout", { method: "POST" }),
  setPassword: (token: string, password: string) =>
    request<{ ok: true }>("/auth/set-password", { method: "POST", body: JSON.stringify({ token, password }) }),

  admin: {
    listClients: () =>
      request<
        Array<{
          id: string;
          name: string;
          email: string;
          healthRating: string | null;
          currentPhase: number;
          currentStepLabel: string;
          phase1Progress: { uploaded: number; total: number };
          phase1MissingCount: number;
          unreadMessageCount: number;
          phaseStatuses: Array<{ phase: number; status: string }>;
        }>
      >("/admin/clients"),
    addClient: (data: { firstName: string; lastName: string; email: string; phone?: string }) =>
      request<{ clientId: string }>("/admin/clients", { method: "POST", body: JSON.stringify(data) }),
    clientDetail: (clientId: string) =>
      request<{
        client: {
          id: string;
          firstName: string;
          lastName: string;
          email: string;
          phone: string | null;
          householdLabel: string;
          healthRating: string | null;
          legacyHandoffCompletedAt: string | null;
        };
        progress: Array<{ phase: number; status: string }>;
        phase1Categories: Phase1Category[];
        phase2Checklist: ChecklistItem[];
        phase3Checklist: ChecklistItem[];
        actionItems: Array<{ id: string; text: string; completed: boolean; completedAt: string | null; createdAt: string }>;
        messages: Message[];
      }>(`/admin/clients/${clientId}`),
    completeChecklistItem: (clientId: string, itemId: string) =>
      request<{ ok: true }>(`/admin/clients/${clientId}/checklist/${itemId}/complete`, { method: "POST" }),
    uncompleteChecklistItem: (clientId: string, itemId: string) =>
      request<{ ok: true }>(`/admin/clients/${clientId}/checklist/${itemId}/incomplete`, { method: "POST" }),
    setHealthRating: (clientId: string, rating: string) =>
      request<{ ok: true }>(`/admin/clients/${clientId}/health-rating`, {
        method: "POST",
        body: JSON.stringify({ rating }),
      }),
    completePhase4: (clientId: string) =>
      request<{ ok: true }>(`/admin/clients/${clientId}/phase4/complete`, { method: "POST" }),
    deleteClient: (clientId: string, confirmName: string) =>
      request<{ ok: true }>(`/admin/clients/${clientId}`, {
        method: "DELETE",
        body: JSON.stringify({ confirmName }),
      }),
    uploadDocument: (clientId: string, categoryId: string, file: File) =>
      uploadFile(`/admin/clients/${clientId}/documents/${categoryId}`, file),
    deleteDocument: (clientId: string, categoryId: string) =>
      request<{ ok: true }>(`/admin/clients/${clientId}/documents/${categoryId}`, { method: "DELETE" }),
    addActionItem: (clientId: string, text: string) =>
      request<{ ok: true }>(`/admin/clients/${clientId}/action-items`, { method: "POST", body: JSON.stringify({ text }) }),
    deleteActionItem: (clientId: string, itemId: string) =>
      request<{ ok: true }>(`/admin/clients/${clientId}/action-items/${itemId}`, { method: "DELETE" }),
    sendMessage: (clientId: string, body: string) =>
      request<{ ok: true }>(`/admin/clients/${clientId}/messages`, { method: "POST", body: JSON.stringify({ body }) }),
    markMessagesRead: (clientId: string) =>
      request<{ ok: true }>(`/admin/clients/${clientId}/messages/read`, { method: "POST" }),
    listPolicies: (clientId: string) =>
      request<{ data: Policy[] }>(`/admin/clients/${clientId}/policies`),
    createPolicy: (clientId: string, data: Partial<Policy>) =>
      request<{ data: Policy }>(`/admin/clients/${clientId}/policies`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    updatePolicy: (clientId: string, policyId: string, data: Partial<Policy>) =>
      request<{ data: Policy }>(`/admin/clients/${clientId}/policies/${policyId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    deletePolicy: (clientId: string, policyId: string) =>
      request<{ ok: true }>(`/admin/clients/${clientId}/policies/${policyId}`, {
        method: "DELETE",
      }),
  },

  client: {
    onboarding: () =>
      request<{
        client: {
          id: string;
          firstName: string;
          householdLabel: string;
          healthRating: string | null;
          welcomeSeenAt: string | null;
        };
        progress: Array<{ phase: number; status: string }>;
        allPhasesComplete: boolean;
        currentPhase: number;
        currentStepLabel: string;
        nextActionHint: string | null;
        phase1Categories: Phase1Category[];
        phase2Checklist: ChecklistItem[];
        phase3Checklist: ChecklistItem[];
        phase4: { legacyHandoffCompletedAt: string | null };
      }>("/client/onboarding"),
    uploadDocument: (categoryId: string, file: File) => uploadFile(`/client/documents/${categoryId}`, file),
    markDocumentMissing: (categoryId: string) =>
      request<{ ok: true }>(`/client/documents/${categoryId}/missing`, { method: "POST" }),
    completeChecklistItem: (itemId: string) =>
      request<{ ok: true }>(`/client/checklist/${itemId}/complete`, { method: "POST" }),
    uncompleteChecklistItem: (itemId: string) =>
      request<{ ok: true }>(`/client/checklist/${itemId}/incomplete`, { method: "POST" }),
    scheduleMeeting: (phase: number) =>
      request<{ ok: true }>(`/client/phases/${phase}/schedule-meeting`, { method: "POST" }),
    markWelcomeSeen: () => request<{ ok: true }>("/client/welcome-seen", { method: "POST" }),
    actionItems: () => request<{ items: ActionItem[] }>("/client/action-items"),
    completeActionItem: (itemId: string) =>
      request<{ ok: true }>(`/client/action-items/${itemId}/complete`, { method: "POST" }),
    messages: () => request<{ messages: Message[] }>("/client/messages"),
    sendMessage: (body: string) =>
      request<{ ok: true }>("/client/messages", { method: "POST", body: JSON.stringify({ body }) }),
    notifications: (unreadOnly?: boolean) =>
      request<{ notifications: ClientNotification[]; unreadCount: number }>(
        `/client/notifications${unreadOnly ? "?unreadOnly=true" : ""}`
      ),
    readNotification: (id: string) =>
      request<{ ok: true }>(`/client/notifications/${id}/read`, { method: "POST" }),
    readAllNotifications: () =>
      request<{ ok: true }>("/client/notifications/read-all", { method: "POST" }),
    preferences: () =>
      request<NotificationPreference>("/client/preferences"),
    updatePreferences: (data: Partial<NotificationPreference>) =>
      request<{ ok: true; preferences: NotificationPreference }>("/client/preferences", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ ok: true }>("/client/password/change", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    policies: () =>
      request<{ data: Policy[] }>("/client/policies"),
    policyDetail: (policyId: string) =>
      request<{ data: Policy }>(`/client/policies/${policyId}`),
  },

  askBrock: {
    ask: (question: string) =>
      request<{
        answer: string;
        grounded: boolean;
        sources: Array<{ title: string; webViewLink: string | null }>;
      }>("/ask-brock/ask", { method: "POST", body: JSON.stringify({ question }) }),
  },
};
