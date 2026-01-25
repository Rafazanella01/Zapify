"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Users,
  MessageCircle,
  MessageSquare,
  Bot,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { statsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSocketStore } from "@/hooks/useSocket";

export default function DashboardPage() {
  const { botStatus, qrCode } = useSocketStore();

  const { data: stats } = useQuery({
    queryKey: ["stats", "overview"],
    queryFn: async () => {
      const { data } = await statsApi.overview();
      return data.data;
    },
  });

  const statCards = [
    {
      title: "Total de Contatos",
      value: stats?.totalContacts || 0,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: "Conversas Ativas",
      value: stats?.activeConversations || 0,
      icon: MessageCircle,
      color: "text-green-500",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
    {
      title: "Mensagens Hoje",
      value: stats?.todayMessages || 0,
      icon: MessageSquare,
      color: "text-purple-500",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      title: "Respostas do Bot",
      value: stats?.botMessages || 0,
      icon: Bot,
      color: "text-orange-500",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Visao geral do seu bot WhatsApp
        </p>
      </div>

      {/* QR Code Section */}
      {!botStatus?.isReady && qrCode && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10">
          <CardHeader>
            <CardTitle className="text-yellow-700 dark:text-yellow-500">
              Conecte seu WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground text-center">
              Escaneie o QR Code abaixo com o WhatsApp do seu celular para
              conectar o bot.
            </p>
            <img
              src={qrCode}
              alt="QR Code"
              className="w-64 h-64 border rounded-lg"
            />
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mensagens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Recebidas</span>
                </div>
                <span className="font-semibold">{stats?.messagesIn || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Enviadas</span>
                </div>
                <span className="font-semibold">{stats?.messagesOut || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">Automaticas</span>
                </div>
                <span className="font-semibold">{stats?.botMessages || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status do Bot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Conexao</span>
                <span
                  className={`text-sm font-medium ${
                    botStatus?.isConnected ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {botStatus?.isConnected ? "Conectado" : "Desconectado"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Status</span>
                <span
                  className={`text-sm font-medium ${
                    botStatus?.isReady ? "text-green-500" : "text-yellow-500"
                  }`}
                >
                  {botStatus?.isReady ? "Pronto" : "Aguardando"}
                </span>
              </div>
              {botStatus?.phoneNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">Numero</span>
                  <span className="text-sm font-medium">
                    +{botStatus.phoneNumber}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
