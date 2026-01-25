"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Search, MoreVertical, Archive } from "lucide-react";
import toast from "react-hot-toast";
import { conversationsApi, messagesApi } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn, formatPhone, formatDate, getInitials, truncate } from "@/lib/utils";
import type { Conversation, Message } from "@/types";

export default function ConversationsPage() {
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Socket para tempo real
  useSocket({
    onNewMessage: (data) => {
      // Atualiza lista de conversas
      queryClient.invalidateQueries({ queryKey: ["conversations"] });

      // Se a mensagem e da conversa atual, atualiza mensagens
      if (data.conversationId === selectedConversation?.id) {
        queryClient.invalidateQueries({
          queryKey: ["messages", selectedConversation.id],
        });
      }
    },
  });

  // Busca conversas
  const { data: conversationsData } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data } = await conversationsApi.list({ status: "ACTIVE" });
      return data;
    },
  });

  const conversations = conversationsData?.data || [];

  // Busca mensagens da conversa selecionada
  const { data: messagesData } = useQuery({
    queryKey: ["messages", selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation) return { data: [] };
      const { data } = await conversationsApi.getMessages(selectedConversation.id);
      return data;
    },
    enabled: !!selectedConversation,
  });

  const messages: Message[] = messagesData?.data || [];

  // Mutation para enviar mensagem
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedConversation) throw new Error("Nenhuma conversa selecionada");
      return messagesApi.send({
        conversationId: selectedConversation.id,
        content,
      });
    },
    onSuccess: () => {
      setMessageInput("");
      queryClient.invalidateQueries({
        queryKey: ["messages", selectedConversation?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: () => {
      toast.error("Erro ao enviar mensagem");
    },
  });

  // Mutation para arquivar conversa
  const archiveMutation = useMutation({
    mutationFn: (id: string) => conversationsApi.archive(id),
    onSuccess: () => {
      toast.success("Conversa arquivada");
      setSelectedConversation(null);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  // Scroll para ultima mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Filtra conversas
  const filteredConversations = conversations.filter((conv: Conversation) => {
    if (!searchQuery) return true;
    const contact = conv.contact;
    const search = searchQuery.toLowerCase();
    return (
      contact?.name?.toLowerCase().includes(search) ||
      contact?.phone.includes(search)
    );
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    sendMessageMutation.mutate(messageInput);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      {/* Lista de Conversas */}
      <div className="w-full md:w-80 lg:w-96 flex flex-col bg-white dark:bg-gray-800 rounded-lg border">
        {/* Header */}
        <div className="p-4 border-b">
          <h2 className="font-semibold mb-3">Conversas</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversa..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Nenhuma conversa encontrada
            </div>
          ) : (
            filteredConversations.map((conv: Conversation) => (
              <button
                key={conv.id}
                className={cn(
                  "w-full p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b transition-colors",
                  selectedConversation?.id === conv.id &&
                    "bg-gray-100 dark:bg-gray-700"
                )}
                onClick={() => setSelectedConversation(conv)}
              >
                <Avatar>
                  <AvatarImage src={conv.contact?.profilePic || undefined} />
                  <AvatarFallback>
                    {conv.contact?.name
                      ? getInitials(conv.contact.name)
                      : conv.contact?.phone.slice(-2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">
                      {conv.contact?.name || formatPhone(conv.contact?.phone || "")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {conv.lastMessageAt && formatDate(conv.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-muted-foreground truncate">
                      {conv.messages?.[0]
                        ? truncate(conv.messages[0].content, 30)
                        : "Sem mensagens"}
                    </span>
                    {conv.unreadCount > 0 && (
                      <Badge className="ml-2">{conv.unreadCount}</Badge>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Area de Chat */}
      <div
        className={cn(
          "flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-lg border",
          !selectedConversation && "hidden md:flex"
        )}
      >
        {selectedConversation ? (
          <>
            {/* Header do Chat */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage
                    src={selectedConversation.contact?.profilePic || undefined}
                  />
                  <AvatarFallback>
                    {selectedConversation.contact?.name
                      ? getInitials(selectedConversation.contact.name)
                      : selectedConversation.contact?.phone.slice(-2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {selectedConversation.contact?.name ||
                      formatPhone(selectedConversation.contact?.phone || "")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatPhone(selectedConversation.contact?.phone || "")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => archiveMutation.mutate(selectedConversation.id)}
                >
                  <Archive className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.direction === "OUTGOING" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[70%] px-4 py-2 shadow-sm",
                      msg.direction === "OUTGOING"
                        ? "chat-bubble-outgoing"
                        : "chat-bubble-incoming"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      {msg.isFromBot && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                          Bot
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(msg.sentAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de Mensagem */}
            <form onSubmit={handleSendMessage} className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Digite uma mensagem..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={!messageInput.trim() || sendMessageMutation.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Selecione uma conversa para comecar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageSquare(props: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
