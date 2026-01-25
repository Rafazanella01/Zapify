"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, RotateCcw, Power, PowerOff } from "lucide-react";
import toast from "react-hot-toast";
import { configApi } from "@/lib/api";
import { useSocketStore } from "@/hooks/useSocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BotConfig } from "@/types";

const configSchema = z.object({
  isActive: z.boolean(),
  aiProvider: z.enum(["gemini", "openai", "anthropic"]),
  aiModel: z.string(),
  aiTemperature: z.number().min(0).max(2),
  aiMaxTokens: z.number().min(100).max(4000),
  welcomeMessage: z.string().nullable(),
  awayMessage: z.string().nullable(),
  businessHoursStart: z.string().nullable(),
  businessHoursEnd: z.string().nullable(),
  systemPrompt: z.string().nullable(),
});

type ConfigForm = z.infer<typeof configSchema>;

const aiModels = {
  gemini: [
    { id: "gemini-pro", name: "Gemini Pro" },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
  ],
  openai: [
    { id: "gpt-4o", name: "GPT-4o" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
  ],
  anthropic: [
    { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
    { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet" },
    { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku" },
  ],
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { botStatus, qrCode } = useSocketStore();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<ConfigForm>({
    resolver: zodResolver(configSchema),
  });

  const aiProvider = watch("aiProvider");

  const { data: configData } = useQuery({
    queryKey: ["config"],
    queryFn: async () => {
      const { data } = await configApi.get();
      return data.data as BotConfig;
    },
  });

  useEffect(() => {
    if (configData) {
      reset({
        isActive: configData.isActive,
        aiProvider: configData.aiProvider,
        aiModel: configData.aiModel,
        aiTemperature: configData.aiTemperature,
        aiMaxTokens: configData.aiMaxTokens,
        welcomeMessage: configData.welcomeMessage,
        awayMessage: configData.awayMessage,
        businessHoursStart: configData.businessHoursStart,
        businessHoursEnd: configData.businessHoursEnd,
        systemPrompt: configData.systemPrompt,
      });
    }
  }, [configData, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: ConfigForm) => configApi.update(data),
    onSuccess: () => {
      toast.success("Configuracoes salvas");
      queryClient.invalidateQueries({ queryKey: ["config"] });
    },
    onError: () => {
      toast.error("Erro ao salvar configuracoes");
    },
  });

  const restartMutation = useMutation({
    mutationFn: () => configApi.restart(),
    onSuccess: () => {
      toast.success("Bot reiniciado. Escaneie o novo QR Code.");
    },
    onError: () => {
      toast.error("Erro ao reiniciar bot");
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => configApi.disconnect(),
    onSuccess: () => {
      toast.success("Bot desconectado");
    },
  });

  const onSubmit = (data: ConfigForm) => {
    updateMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuracoes</h1>
        <p className="text-muted-foreground">
          Configure o comportamento do bot e integracao com IA
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Status do Bot */}
        <Card>
          <CardHeader>
            <CardTitle>Status do Bot</CardTitle>
            <CardDescription>
              Gerencie a conexao do WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`w-3 h-3 rounded-full ${
                    botStatus?.isReady ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <div>
                  <p className="font-medium">
                    {botStatus?.isReady ? "Conectado" : "Desconectado"}
                  </p>
                  {botStatus?.phoneNumber && (
                    <p className="text-sm text-muted-foreground">
                      +{botStatus.phoneNumber}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => restartMutation.mutate()}
                  disabled={restartMutation.isPending}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reconectar
                </Button>
                {botStatus?.isReady && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => disconnectMutation.mutate()}
                    disabled={disconnectMutation.isPending}
                  >
                    <PowerOff className="h-4 w-4 mr-2" />
                    Desconectar
                  </Button>
                )}
              </div>
            </div>

            {qrCode && !botStatus?.isReady && (
              <div className="flex flex-col items-center gap-4 p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Escaneie o QR Code com seu WhatsApp
                </p>
                <img
                  src={qrCode}
                  alt="QR Code"
                  className="w-48 h-48 border rounded"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label>Bot Ativo</Label>
                <p className="text-sm text-muted-foreground">
                  Habilite para o bot responder automaticamente
                </p>
              </div>
              <Switch
                checked={watch("isActive")}
                onCheckedChange={(v) => setValue("isActive", v, { shouldDirty: true })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Integracao com IA */}
        <Card>
          <CardHeader>
            <CardTitle>Integracao com IA</CardTitle>
            <CardDescription>
              Configure o provedor e modelo de IA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Provedor</Label>
                <Select
                  value={aiProvider}
                  onValueChange={(v) => {
                    const provider = v as "gemini" | "openai" | "anthropic";
                    setValue("aiProvider", provider, { shouldDirty: true });
                    const models = aiModels[provider];
                    if (models && models.length > 0) {
                      setValue("aiModel", models[0].id, { shouldDirty: true });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="openai">OpenAI GPT</SelectItem>
                    <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Select
                  value={watch("aiModel")}
                  onValueChange={(v) => setValue("aiModel", v, { shouldDirty: true })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {aiProvider &&
                      aiModels[aiProvider]?.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Temperatura ({watch("aiTemperature")})</Label>
                <Input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  {...register("aiTemperature", { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  Menor = mais preciso, Maior = mais criativo
                </p>
              </div>
              <div className="space-y-2">
                <Label>Max Tokens</Label>
                <Input
                  type="number"
                  min="100"
                  max="4000"
                  {...register("aiMaxTokens", { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>System Prompt</Label>
              <Textarea
                rows={5}
                placeholder="Instrucoes para a IA..."
                {...register("systemPrompt")}
              />
              <p className="text-xs text-muted-foreground">
                Defina a personalidade e comportamento do bot
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Mensagens Automaticas */}
        <Card>
          <CardHeader>
            <CardTitle>Mensagens Automaticas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Mensagem de Boas-vindas</Label>
              <Textarea
                rows={3}
                placeholder="Ola! Como posso ajudar?"
                {...register("welcomeMessage")}
              />
            </div>
            <div className="space-y-2">
              <Label>Mensagem Fora do Horario</Label>
              <Textarea
                rows={3}
                placeholder="Estamos fora do horario de atendimento..."
                {...register("awayMessage")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Horario de Atendimento */}
        <Card>
          <CardHeader>
            <CardTitle>Horario de Atendimento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Inicio</Label>
                <Input type="time" {...register("businessHoursStart")} />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input type="time" {...register("businessHoursEnd")} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Fora deste horario, a mensagem de ausencia sera enviada
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={!isDirty || updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Configuracoes
          </Button>
        </div>
      </form>
    </div>
  );
}
