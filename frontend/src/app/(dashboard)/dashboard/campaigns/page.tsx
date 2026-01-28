"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Edit2,
  Trash2,
  Play,
  Pause,
  StopCircle,
  Eye,
  Send,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { campaignsApi, contactsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Campaign, Contact } from "@/types";

const campaignSchema = z.object({
  name: z.string().min(1, "Nome e obrigatorio"),
  message: z.string().min(1, "Mensagem e obrigatoria"),
  targetType: z.enum(["ALL", "TAGS", "SELECTED"]).default("ALL"),
  targetTags: z.array(z.string()).default([]),
  targetContacts: z.array(z.string()).default([]),
  delayBetween: z.number().min(1000).max(60000).default(3000),
});

type CampaignForm = z.infer<typeof campaignSchema>;

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
  SCHEDULED: "bg-blue-500",
  RUNNING: "bg-green-500",
  PAUSED: "bg-yellow-500",
  COMPLETED: "bg-emerald-500",
  CANCELLED: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Rascunho",
  SCHEDULED: "Agendada",
  RUNNING: "Enviando",
  PAUSED: "Pausada",
  COMPLETED: "Concluida",
  CANCELLED: "Cancelada",
};

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [tagInput, setTagInput] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CampaignForm>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      targetType: "ALL",
      targetTags: [],
      targetContacts: [],
      delayBetween: 3000,
    },
  });

  const targetType = watch("targetType");
  const targetTags = watch("targetTags");

  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data } = await campaignsApi.list();
      return data;
    },
    refetchInterval: 5000,
  });

  const { data: contactsData } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data } = await contactsApi.list();
      return data;
    },
  });

  const campaigns: Campaign[] = campaignsData?.data || [];
  const contacts: Contact[] = contactsData?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: CampaignForm) => campaignsApi.create(data),
    onSuccess: () => {
      toast.success("Campanha criada");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      reset();
      setIsFormOpen(false);
    },
    onError: () => toast.error("Erro ao criar campanha"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CampaignForm }) =>
      campaignsApi.update(id, data),
    onSuccess: () => {
      toast.success("Campanha atualizada");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      reset();
      setEditingId(null);
      setIsFormOpen(false);
    },
    onError: () => toast.error("Erro ao atualizar campanha"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.delete(id),
    onSuccess: () => {
      toast.success("Campanha removida");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: () => toast.error("Erro ao remover campanha"),
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.start(id),
    onSuccess: () => {
      toast.success("Campanha iniciada");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.message || "Erro ao iniciar campanha"),
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.pause(id),
    onSuccess: () => {
      toast.success("Campanha pausada");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: () => toast.error("Erro ao pausar campanha"),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.cancel(id),
    onSuccess: () => {
      toast.success("Campanha cancelada");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: () => toast.error("Erro ao cancelar campanha"),
  });

  const onSubmit = (data: CampaignForm) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingId(campaign.id);
    setValue("name", campaign.name);
    setValue("message", campaign.message);
    setValue("targetType", campaign.targetType);
    setValue("targetTags", campaign.targetTags);
    setValue("targetContacts", campaign.targetContacts);
    setValue("delayBetween", campaign.delayBetween);
    setIsFormOpen(true);
  };

  const handleCancel = () => {
    reset();
    setEditingId(null);
    setIsFormOpen(false);
  };

  const addTag = () => {
    if (tagInput.trim() && !targetTags.includes(tagInput.trim())) {
      setValue("targetTags", [...targetTags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setValue(
      "targetTags",
      targetTags.filter((t) => t !== tag)
    );
  };

  const getProgress = (campaign: Campaign) => {
    if (campaign.totalRecipients === 0) return 0;
    return Math.round(
      ((campaign.sentCount + campaign.failedCount) / campaign.totalRecipients) * 100
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campanhas</h1>
          <p className="text-muted-foreground">
            Envie mensagens em massa para seus contatos
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      {/* Form */}
      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? "Editar Campanha" : "Nova Campanha"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Campanha</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Promocao de Natal"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delayBetween">Intervalo entre mensagens (ms)</Label>
                  <Input
                    id="delayBetween"
                    type="number"
                    min={1000}
                    max={60000}
                    {...register("delayBetween", { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimo 1000ms (1s), maximo 60000ms (1min)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Mensagem</Label>
                <Textarea
                  id="message"
                  placeholder="Use {{nome}} para personalizar com o nome do contato"
                  rows={4}
                  {...register("message")}
                />
                {errors.message && (
                  <p className="text-sm text-red-500">{errors.message.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Destinatarios</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={targetType === "ALL" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setValue("targetType", "ALL")}
                  >
                    <Users className="h-4 w-4 mr-1" />
                    Todos
                  </Button>
                  <Button
                    type="button"
                    variant={targetType === "TAGS" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setValue("targetType", "TAGS")}
                  >
                    Por Tags
                  </Button>
                </div>
              </div>

              {targetType === "TAGS" && (
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Digite uma tag"
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" onClick={addTag}>
                      Adicionar
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {targetTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => removeTag(tag)}
                      >
                        {tag} &times;
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingId ? "Atualizar" : "Criar"}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Campaigns List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            Carregando...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            Nenhuma campanha criada
          </div>
        ) : (
          campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <Badge className={statusColors[campaign.status]}>
                      {statusLabels[campaign.status]}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {campaign.message}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                  <div>
                    <p className="text-lg font-semibold">{campaign.totalRecipients}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-green-600">
                      {campaign.sentCount}
                    </p>
                    <p className="text-xs text-muted-foreground">Enviadas</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-red-600">
                      {campaign.failedCount}
                    </p>
                    <p className="text-xs text-muted-foreground">Falhas</p>
                  </div>
                </div>

                {/* Progress */}
                {(campaign.status === "RUNNING" || campaign.status === "PAUSED") && (
                  <div className="mb-4">
                    <Progress value={getProgress(campaign)} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      {getProgress(campaign)}% concluido
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {campaign.status === "DRAFT" && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => startMutation.mutate(campaign.id)}
                        disabled={startMutation.isPending}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Iniciar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(campaign)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(campaign.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}

                  {campaign.status === "RUNNING" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => pauseMutation.mutate(campaign.id)}
                      >
                        <Pause className="h-4 w-4 mr-1" />
                        Pausar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => cancelMutation.mutate(campaign.id)}
                      >
                        <StopCircle className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                    </>
                  )}

                  {campaign.status === "PAUSED" && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => startMutation.mutate(campaign.id)}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Continuar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => cancelMutation.mutate(campaign.id)}
                      >
                        <StopCircle className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                    </>
                  )}

                  {(campaign.status === "COMPLETED" || campaign.status === "CANCELLED") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(campaign.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remover
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
