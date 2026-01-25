// User
export interface User {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "OPERATOR";
  createdAt: string;
  updatedAt: string;
}

// Contact
export interface Contact {
  id: string;
  phone: string;
  name: string | null;
  profilePic: string | null;
  isBlocked: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// Conversation
export interface Conversation {
  id: string;
  contactId: string;
  contact?: Contact;
  status: "ACTIVE" | "ARCHIVED" | "BLOCKED";
  lastMessageAt: string | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}

// Message
export interface Message {
  id: string;
  conversationId: string;
  content: string;
  type: "TEXT" | "IMAGE" | "AUDIO" | "VIDEO" | "DOCUMENT" | "STICKER";
  direction: "INCOMING" | "OUTGOING";
  isFromBot: boolean;
  mediaUrl: string | null;
  sentAt: string;
  deliveredAt: string | null;
  readAt: string | null;
}

// Auto Reply
export interface AutoReply {
  id: string;
  trigger: string;
  triggerType: "EXACT" | "CONTAINS" | "REGEX";
  response: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

// Template
export interface Template {
  id: string;
  name: string;
  content: string;
  variables: string[];
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Flow
export interface Flow {
  id: string;
  name: string;
  trigger: string;
  triggerType: "EXACT" | "CONTAINS" | "REGEX";
  steps: FlowStep[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FlowStep {
  id: string;
  type: "message" | "question" | "condition" | "action";
  content: string;
  options?: FlowOption[];
  nextStepId?: string;
  delay?: number;
}

export interface FlowOption {
  label: string;
  value: string;
  nextStepId: string;
}

// Bot Config
export interface BotConfig {
  id: string;
  isActive: boolean;
  aiProvider: "gemini" | "openai" | "anthropic";
  aiModel: string;
  aiTemperature: number;
  aiMaxTokens: number;
  welcomeMessage: string | null;
  awayMessage: string | null;
  businessHoursStart: string | null;
  businessHoursEnd: string | null;
  businessDays: number[];
  systemPrompt: string | null;
  updatedAt: string;
}

// Bot Status
export interface BotStatus {
  isConnected: boolean;
  isReady: boolean;
  phoneNumber: string | null;
  qrCode: string | null;
}

// Stats
export interface StatsOverview {
  totalContacts: number;
  totalConversations: number;
  activeConversations: number;
  totalMessages: number;
  messagesIn: number;
  messagesOut: number;
  todayMessages: number;
  botMessages: number;
}

// API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
