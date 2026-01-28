import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("zapify_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Interceptor para tratar erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("zapify_token");
        localStorage.removeItem("zapify_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/api/auth/login", { email, password }),
  register: (email: string, password: string, name: string) =>
    api.post("/api/auth/register", { email, password, name }),
  me: () => api.get("/api/auth/me"),
};

// Contacts
export const contactsApi = {
  list: (params?: Record<string, string>) =>
    api.get("/api/contacts", { params }),
  get: (id: string) => api.get(`/api/contacts/${id}`),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/contacts/${id}`, data),
  delete: (id: string) => api.delete(`/api/contacts/${id}`),
  block: (id: string) => api.post(`/api/contacts/${id}/block`),
  unblock: (id: string) => api.post(`/api/contacts/${id}/unblock`),
};

// Conversations
export const conversationsApi = {
  list: (params?: Record<string, string>) =>
    api.get("/api/conversations", { params }),
  get: (id: string) => api.get(`/api/conversations/${id}`),
  getMessages: (id: string, params?: Record<string, string>) =>
    api.get(`/api/conversations/${id}/messages`, { params }),
  archive: (id: string) => api.put(`/api/conversations/${id}/archive`),
  unarchive: (id: string) => api.put(`/api/conversations/${id}/unarchive`),
  markAsRead: (id: string) => api.put(`/api/conversations/${id}/read`),
};

// Messages
export const messagesApi = {
  send: (data: { conversationId?: string; phone?: string; content: string }) =>
    api.post("/api/messages/send", data),
  list: (conversationId: string, params?: Record<string, string>) =>
    api.get(`/api/messages/${conversationId}`, { params }),
};

// Auto Replies
export const autoRepliesApi = {
  list: (params?: Record<string, string>) =>
    api.get("/api/auto-replies", { params }),
  get: (id: string) => api.get(`/api/auto-replies/${id}`),
  create: (data: Record<string, unknown>) => api.post("/api/auto-replies", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/auto-replies/${id}`, data),
  delete: (id: string) => api.delete(`/api/auto-replies/${id}`),
  toggle: (id: string) => api.put(`/api/auto-replies/${id}/toggle`),
};

// Templates
export const templatesApi = {
  list: (params?: Record<string, string>) =>
    api.get("/api/templates", { params }),
  get: (id: string) => api.get(`/api/templates/${id}`),
  create: (data: Record<string, unknown>) => api.post("/api/templates", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/templates/${id}`, data),
  delete: (id: string) => api.delete(`/api/templates/${id}`),
  preview: (id: string, variables: Record<string, string>) =>
    api.post(`/api/templates/${id}/preview`, { variables }),
  categories: () => api.get("/api/templates/categories"),
};

// Flows
export const flowsApi = {
  list: (params?: Record<string, string>) => api.get("/api/flows", { params }),
  get: (id: string) => api.get(`/api/flows/${id}`),
  create: (data: Record<string, unknown>) => api.post("/api/flows", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/flows/${id}`, data),
  delete: (id: string) => api.delete(`/api/flows/${id}`),
  toggle: (id: string) => api.put(`/api/flows/${id}/toggle`),
  duplicate: (id: string) => api.post(`/api/flows/${id}/duplicate`),
};

// Config
export const configApi = {
  get: () => api.get("/api/config"),
  update: (data: Record<string, unknown>) => api.put("/api/config", data),
  getStatus: () => api.get("/api/config/status"),
  restart: () => api.post("/api/config/restart"),
  disconnect: () => api.post("/api/config/disconnect"),
  getAIModels: () => api.get("/api/config/ai-models"),
};

// Stats
export const statsApi = {
  overview: () => api.get("/api/stats/overview"),
  messages: (days?: number) =>
    api.get("/api/stats/messages", { params: { days } }),
  contacts: (days?: number) =>
    api.get("/api/stats/contacts", { params: { days } }),
  hourly: () => api.get("/api/stats/hourly"),
};

// Knowledge Base
export const knowledgeApi = {
  list: (params?: Record<string, string>) =>
    api.get("/api/knowledge", { params }),
  get: (id: string) => api.get(`/api/knowledge/${id}`),
  create: (data: Record<string, unknown>) => api.post("/api/knowledge", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/knowledge/${id}`, data),
  delete: (id: string) => api.delete(`/api/knowledge/${id}`),
};

// Campaigns
export const campaignsApi = {
  list: (params?: Record<string, string>) =>
    api.get("/api/campaigns", { params }),
  get: (id: string) => api.get(`/api/campaigns/${id}`),
  create: (data: Record<string, unknown>) => api.post("/api/campaigns", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/campaigns/${id}`, data),
  delete: (id: string) => api.delete(`/api/campaigns/${id}`),
  start: (id: string) => api.post(`/api/campaigns/${id}/start`),
  pause: (id: string) => api.post(`/api/campaigns/${id}/pause`),
  cancel: (id: string) => api.post(`/api/campaigns/${id}/cancel`),
  logs: (id: string, params?: Record<string, string>) =>
    api.get(`/api/campaigns/${id}/logs`, { params }),
};

export default api;
