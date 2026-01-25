"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit2, Trash2, Copy, GitBranch } from "lucide-react";
import toast from "react-hot-toast";
import { flowsApi } from "@/lib/api";
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
import type { Flow } from "@/types";

const flowSchema = z.object({
  name: z.string().min(1, "Nome e obrigatorio"),
  trigger: z.string().min(1, "Trigger e obrigatorio"),
  triggerType: z.enum(["EXACT", "CONTAINS", "REGEX"]),
});

type FlowForm = z.infer<typeof flowSchema>;

export default function FlowsPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSteps, setEditingSteps] = useState<string>("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FlowForm>({
    resolver: zodResolver(flowSchema),
    defaultValues: {
      triggerType: "CONTAINS",
    },
  });

  const { data: flowsData, isLoading } = useQuery({
    queryKey: ["flows"],
    queryFn: async () => {
      const { data } = await flowsApi.list();
      return data;
    },
  });

  const flows: Flow[] = flowsData?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: FlowForm & { steps: unknown[] }) => flowsApi.create(data),
    onSuccess: () => {
      toast.success("Fluxo criado");
      queryClient.invalidateQueries({ queryKey: ["flows"] });
      reset();
      setIsFormOpen(false);
      setEditingSteps("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FlowForm & { steps?: unknown[] } }) =>
      flowsApi.update(id, data),
    onSuccess: () => {
      toast.success("Fluxo atualizado");
      queryClient.invalidateQueries({ queryKey: ["flows"] });
      reset();
      setEditingId(null);
      setIsFormOpen(false);
      setEditingSteps("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => flowsApi.delete(id),
    onSuccess: () => {
      toast.success("Fluxo removido");
      queryClient.invalidateQueries({ queryKey: ["flows"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => flowsApi.toggle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flows"] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => flowsApi.duplicate(id),
    onSuccess: () => {
      toast.success("Fluxo duplicado");
      queryClient.invalidateQueries({ queryKey: ["flows"] });
    },
  });

  const onSubmit = (data: FlowForm) => {
    let steps: unknown[] = [];
    try {
      if (editingSteps) {
        steps = JSON.parse(editingSteps);
      }
    } catch {
      toast.error("JSON de steps invalido");
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: { ...data, steps } });
    } else {
      createMutation.mutate({ ...data, steps });
    }
  };

  const handleEdit = (flow: Flow) => {
    setEditingId(flow.id);
    setValue("name", flow.name);
    setValue("trigger", flow.trigger);
    setValue("triggerType", flow.triggerType);
    setEditingSteps(JSON.stringify(flow.steps, null, 2));
    setIsFormOpen(true);
  };

  const handleCancel = () => {
    reset();
    setEditingId(null);
    setIsFormOpen(false);
    setEditingSteps("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fluxos de Mensagem</h1>
          <p className="text-muted-foreground">
            Crie fluxos de conversacao automatizados
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Fluxo
        </Button>
      </div>

      {/* Form */}
      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? "Editar Fluxo" : "Novo Fluxo"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Atendimento inicial"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trigger">Trigger</Label>
                  <Input
                    id="trigger"
                    placeholder="Ex: menu, ajuda"
                    {...register("trigger")}
                  />
                  {errors.trigger && (
                    <p className="text-sm text-red-500">{errors.trigger.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
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
                <Label>Steps (JSON)</Label>
                <Textarea
                  rows={10}
                  placeholder='[{"id": "1", "type": "message", "content": "Ola!", "delay": 1000}]'
                  value={editingSteps}
                  onChange={(e) => setEditingSteps(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Cada step pode ter: id, type (message/question), content, delay (ms), options
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
          <CardTitle>{flows.length} fluxo(s)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : flows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum fluxo configurado</p>
            </div>
          ) : (
            <div className="divide-y">
              {flows.map((flow) => (
                <div
                  key={flow.id}
                  className="flex items-start justify-between py-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{flow.name}</span>
                      <Badge variant="secondary">{flow.triggerType}</Badge>
                      {!flow.isActive && (
                        <Badge variant="destructive">Inativo</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <code className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                        {flow.trigger}
                      </code>
                      <span>{flow.steps?.length || 0} step(s)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Switch
                      checked={flow.isActive}
                      onCheckedChange={() => toggleMutation.mutate(flow.id)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => duplicateMutation.mutate(flow.id)}
                      title="Duplicar"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(flow)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(flow.id)}
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
