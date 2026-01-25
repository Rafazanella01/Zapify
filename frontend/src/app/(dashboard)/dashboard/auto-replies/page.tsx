"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit2, Trash2, Power } from "lucide-react";
import toast from "react-hot-toast";
import { autoRepliesApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AutoReply } from "@/types";

const autoReplySchema = z.object({
  trigger: z.string().min(1, "Trigger e obrigatorio"),
  triggerType: z.enum(["EXACT", "CONTAINS", "REGEX"]),
  response: z.string().min(1, "Resposta e obrigatoria"),
  priority: z.number().default(0),
});

type AutoReplyForm = z.infer<typeof autoReplySchema>;

export default function AutoRepliesPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AutoReplyForm>({
    resolver: zodResolver(autoReplySchema),
    defaultValues: {
      triggerType: "CONTAINS",
      priority: 0,
    },
  });

  const { data: autoRepliesData, isLoading } = useQuery({
    queryKey: ["auto-replies"],
    queryFn: async () => {
      const { data } = await autoRepliesApi.list();
      return data;
    },
  });

  const autoReplies: AutoReply[] = autoRepliesData?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: AutoReplyForm) => autoRepliesApi.create(data),
    onSuccess: () => {
      toast.success("Auto-resposta criada");
      queryClient.invalidateQueries({ queryKey: ["auto-replies"] });
      reset();
      setIsFormOpen(false);
    },
    onError: () => {
      toast.error("Erro ao criar auto-resposta");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AutoReplyForm }) =>
      autoRepliesApi.update(id, data),
    onSuccess: () => {
      toast.success("Auto-resposta atualizada");
      queryClient.invalidateQueries({ queryKey: ["auto-replies"] });
      reset();
      setEditingId(null);
      setIsFormOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => autoRepliesApi.delete(id),
    onSuccess: () => {
      toast.success("Auto-resposta removida");
      queryClient.invalidateQueries({ queryKey: ["auto-replies"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => autoRepliesApi.toggle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-replies"] });
    },
  });

  const onSubmit = (data: AutoReplyForm) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (autoReply: AutoReply) => {
    setEditingId(autoReply.id);
    setValue("trigger", autoReply.trigger);
    setValue("triggerType", autoReply.triggerType);
    setValue("response", autoReply.response);
    setValue("priority", autoReply.priority);
    setIsFormOpen(true);
  };

  const handleCancel = () => {
    reset();
    setEditingId(null);
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Auto-Respostas</h1>
          <p className="text-muted-foreground">
            Configure respostas automaticas por palavras-chave
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Auto-Resposta
        </Button>
      </div>

      {/* Form */}
      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? "Editar Auto-Resposta" : "Nova Auto-Resposta"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="trigger">Palavra-chave (Trigger)</Label>
                  <Input
                    id="trigger"
                    placeholder="Ex: preco, oi, ajuda"
                    {...register("trigger")}
                  />
                  {errors.trigger && (
                    <p className="text-sm text-red-500">{errors.trigger.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="triggerType">Tipo de Match</Label>
                  <Select
                    defaultValue="CONTAINS"
                    onValueChange={(v) => setValue("triggerType", v as "EXACT" | "CONTAINS" | "REGEX")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXACT">Exato</SelectItem>
                      <SelectItem value="CONTAINS">Contem</SelectItem>
                      <SelectItem value="REGEX">Regex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="response">Resposta</Label>
                <Textarea
                  id="response"
                  placeholder="Digite a resposta automatica..."
                  rows={4}
                  {...register("response")}
                />
                {errors.response && (
                  <p className="text-sm text-red-500">{errors.response.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Input
                  id="priority"
                  type="number"
                  {...register("priority", { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  Maior prioridade sera executada primeiro
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
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

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>{autoReplies.length} auto-resposta(s)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : autoReplies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma auto-resposta configurada
            </div>
          ) : (
            <div className="divide-y">
              {autoReplies.map((ar) => (
                <div
                  key={ar.id}
                  className="flex items-start justify-between py-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                        {ar.trigger}
                      </code>
                      <Badge variant="secondary">{ar.triggerType}</Badge>
                      <Badge variant="outline">P: {ar.priority}</Badge>
                      {!ar.isActive && (
                        <Badge variant="destructive">Inativo</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {ar.response}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Switch
                      checked={ar.isActive}
                      onCheckedChange={() => toggleMutation.mutate(ar.id)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(ar)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(ar.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
