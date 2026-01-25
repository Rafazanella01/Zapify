"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { statsApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#25D366", "#128C7E", "#075E54", "#34B7F1"];

export default function StatsPage() {
  const { data: overview } = useQuery({
    queryKey: ["stats", "overview"],
    queryFn: async () => {
      const { data } = await statsApi.overview();
      return data.data;
    },
  });

  const { data: messagesStats } = useQuery({
    queryKey: ["stats", "messages"],
    queryFn: async () => {
      const { data } = await statsApi.messages(7);
      return data.data;
    },
  });

  const { data: contactsStats } = useQuery({
    queryKey: ["stats", "contacts"],
    queryFn: async () => {
      const { data } = await statsApi.contacts();
      return data.data;
    },
  });

  const { data: hourlyStats } = useQuery({
    queryKey: ["stats", "hourly"],
    queryFn: async () => {
      const { data } = await statsApi.hourly();
      return data.data;
    },
  });

  const pieData = [
    { name: "Recebidas", value: overview?.messagesIn || 0 },
    { name: "Enviadas", value: overview?.messagesOut || 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Estatisticas</h1>
        <p className="text-muted-foreground">
          Acompanhe o desempenho do seu bot
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Mensagens</p>
            <p className="text-3xl font-bold">{overview?.totalMessages || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Mensagens Hoje</p>
            <p className="text-3xl font-bold">{overview?.todayMessages || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Respostas Bot</p>
            <p className="text-3xl font-bold">{overview?.botMessages || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Conversas Ativas</p>
            <p className="text-3xl font-bold">{overview?.activeConversations || 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Messages Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Mensagens nos ultimos 7 dias</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={messagesStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                    })
                  }
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(v) =>
                    new Date(v).toLocaleDateString("pt-BR")
                  }
                />
                <Bar dataKey="incoming" name="Recebidas" fill="#25D366" />
                <Bar dataKey="outgoing" name="Enviadas" fill="#128C7E" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Messages Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuicao de Mensagens</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Hourly Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade por Hora (Hoje)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={hourlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="hour"
                  tickFormatter={(v) => `${v}h`}
                />
                <YAxis />
                <Tooltip labelFormatter={(v) => `${v}:00`} />
                <Line
                  type="monotone"
                  dataKey="incoming"
                  name="Recebidas"
                  stroke="#25D366"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="outgoing"
                  name="Enviadas"
                  stroke="#128C7E"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Contacts */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Contatos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contactsStats?.topContacts?.slice(0, 10).map((contact: { id: string; name: string; phone: string; messageCount: number }, index: number) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground w-6">
                      {index + 1}.
                    </span>
                    <span className="font-medium">
                      {contact.name || contact.phone}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {contact.messageCount} msgs
                  </span>
                </div>
              ))}
              {(!contactsStats?.topContacts || contactsStats.topContacts.length === 0) && (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum dado disponivel
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
