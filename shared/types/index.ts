// ===========================================
// Tipos Compartilhados - Zapify
// ===========================================

// Tipos de Mensagem
export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker';
export type MessageDirection = 'incoming' | 'outgoing';
export type ConversationStatus = 'active' | 'archived' | 'blocked';

// Provedores de IA
export type AIProvider = 'gemini' | 'openai' | 'anthropic';

// Usuario do Dashboard
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'operator';
  createdAt: Date;
  updatedAt: Date;
}

// Contato do WhatsApp
export interface Contact {
  id: string;
  phone: string;
  name: string | null;
  profilePic: string | null;
  isBlocked: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Conversa
export interface Conversation {
  id: string;
  contactId: string;
  contact?: Contact;
  status: ConversationStatus;
  lastMessageAt: Date | null;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Mensagem
export interface Message {
  id: string;
  conversationId: string;
  content: string;
  type: MessageType;
  direction: MessageDirection;
  isFromBot: boolean;
  mediaUrl: string | null;
  sentAt: Date;
  deliveredAt: Date | null;
  readAt: Date | null;
}

// Auto-resposta
export interface AutoReply {
  id: string;
  trigger: string;
  triggerType: 'exact' | 'contains' | 'regex';
  response: string;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

// Template de Mensagem
export interface Template {
  id: string;
  name: string;
  content: string;
  variables: string[];
  category: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Configuracao do Bot
export interface BotConfig {
  id: string;
  isActive: boolean;
  aiProvider: AIProvider;
  aiModel: string;
  aiTemperature: number;
  aiMaxTokens: number;
  welcomeMessage: string | null;
  awayMessage: string | null;
  businessHoursStart: string | null;
  businessHoursEnd: string | null;
  businessDays: number[];
  systemPrompt: string | null;
  updatedAt: Date;
}

// Fluxo de Mensagens
export interface Flow {
  id: string;
  name: string;
  trigger: string;
  triggerType: 'exact' | 'contains' | 'regex';
  steps: FlowStep[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FlowStep {
  id: string;
  type: 'message' | 'question' | 'condition' | 'action';
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

// Estatisticas
export interface Stats {
  totalContacts: number;
  totalConversations: number;
  totalMessages: number;
  messagesIn: number;
  messagesOut: number;
  activeConversations: number;
  avgResponseTime: number;
}

// Status do Bot
export interface BotStatus {
  isConnected: boolean;
  isReady: boolean;
  phoneNumber: string | null;
  qrCode: string | null;
  lastSeen: Date | null;
}

// Eventos Socket.io
export interface SocketEvents {
  // Server -> Client
  'bot:status': (status: BotStatus) => void;
  'bot:qr': (qr: string) => void;
  'message:new': (message: Message & { conversation: Conversation }) => void;
  'message:update': (message: Partial<Message> & { id: string }) => void;
  'conversation:update': (conversation: Partial<Conversation> & { id: string }) => void;

  // Client -> Server
  'message:send': (data: { conversationId: string; content: string; type?: MessageType }) => void;
  'conversation:read': (conversationId: string) => void;
}

// API Responses
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

// Auth
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: Omit<User, 'password'>;
  token: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}
