"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { create } from "zustand";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

interface BotStatus {
  isConnected: boolean;
  isReady: boolean;
  phoneNumber: string | null;
  qrCode: string | null;
}

interface Message {
  id: string;
  conversationId: string;
  content: string;
  type: string;
  direction: string;
  isFromBot: boolean;
  sentAt: string;
}

interface Conversation {
  id: string;
  contactId: string;
  status: string;
  lastMessageAt: string;
  unreadCount: number;
  contact: {
    id: string;
    phone: string;
    name: string | null;
    profilePic: string | null;
  };
}

interface SocketState {
  isConnected: boolean;
  botStatus: BotStatus | null;
  qrCode: string | null;
  setConnected: (connected: boolean) => void;
  setBotStatus: (status: BotStatus) => void;
  setQrCode: (qr: string | null) => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  isConnected: false,
  botStatus: null,
  qrCode: null,
  setConnected: (connected) => set({ isConnected: connected }),
  setBotStatus: (status) => set({ botStatus: status, qrCode: status.qrCode }),
  setQrCode: (qr) => set({ qrCode: qr }),
}));

interface UseSocketOptions {
  onNewMessage?: (message: Message & { conversation: Conversation }) => void;
  onMessageUpdate?: (message: Partial<Message> & { id: string }) => void;
  onConversationUpdate?: (conversation: Partial<Conversation> & { id: string }) => void;
  onBotStatus?: (status: BotStatus) => void;
  onQrCode?: (qr: string) => void;
}

// Socket singleton
let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    const token = typeof window !== "undefined" ? localStorage.getItem("zapify_token") : null;
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      autoConnect: false,
    });
  }
  return socket;
}

export function useSocket(options: UseSocketOptions = {}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const { setConnected, setBotStatus, setQrCode } = useSocketStore.getState();

  useEffect(() => {
    const s = getSocket();

    const handleConnect = () => {
      console.log("Socket connected");
      useSocketStore.getState().setConnected(true);
    };

    const handleDisconnect = () => {
      console.log("Socket disconnected");
      useSocketStore.getState().setConnected(false);
    };

    const handleBotStatus = (status: BotStatus) => {
      useSocketStore.getState().setBotStatus(status);
      optionsRef.current.onBotStatus?.(status);
    };

    const handleQrCode = (qr: string) => {
      useSocketStore.getState().setQrCode(qr);
      optionsRef.current.onQrCode?.(qr);
    };

    const handleNewMessage = (data: Message & { conversation: Conversation }) => {
      optionsRef.current.onNewMessage?.(data);
    };

    const handleMessageUpdate = (data: Partial<Message> & { id: string }) => {
      optionsRef.current.onMessageUpdate?.(data);
    };

    const handleConversationUpdate = (data: Partial<Conversation> & { id: string }) => {
      optionsRef.current.onConversationUpdate?.(data);
    };

    s.on("connect", handleConnect);
    s.on("disconnect", handleDisconnect);
    s.on("bot:status", handleBotStatus);
    s.on("bot:qr", handleQrCode);
    s.on("message:new", handleNewMessage);
    s.on("message:update", handleMessageUpdate);
    s.on("conversation:update", handleConversationUpdate);

    if (!s.connected) {
      s.connect();
    }

    return () => {
      s.off("connect", handleConnect);
      s.off("disconnect", handleDisconnect);
      s.off("bot:status", handleBotStatus);
      s.off("bot:qr", handleQrCode);
      s.off("message:new", handleNewMessage);
      s.off("message:update", handleMessageUpdate);
      s.off("conversation:update", handleConversationUpdate);
    };
  }, []);

  const sendMessage = (data: { conversationId: string; content: string }) => {
    getSocket().emit("message:send", data);
  };

  const markAsRead = (conversationId: string) => {
    getSocket().emit("conversation:read", conversationId);
  };

  return {
    socket: getSocket(),
    sendMessage,
    markAsRead,
  };
}
