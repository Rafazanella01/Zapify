"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit2, Trash2, Copy, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { templatesApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Template } from "@/types";

const templateSchema = z.object({
  name: z.string().min(1, "Nome e obrigatorio"),
  content: z.string().min(1, "Conteudo e obrigatorio"),
  category: z.string().default("geral"),
});

type TemplateForm = z.infer<typeof templateSchema>;

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      category: "geral",
    },
  });

  const content = watch("content");

  const { data: templatesData, isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const { data } = await templatesApi.list();
      return data;
    },
  });

  const templates: Template[] = templatesData?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: TemplateForm) => templatesApi.create(data),
    onSuccess: () => {
      toast.success("Template criado");
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      reset();
      setIsFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TemplateForm }) =>
      templatesApi.update(id, data),
    onSuccess: () => {
      toast.success("Template atualizado");
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      reset();
      setEditingId(null);
      setIsFormOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => templatesApi.delete(id),
    onSuccess: () => {
      toast.success("Template removido");
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });

  const onSubmit = (data: TemplateForm) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (template: Template) => {
    setEditingId(template.id);
    setValue("name", template.name);
    setValue("content", template.content);
    setValue("category", template.category);
    setIsFormOpen(true);
  };

  const handleCancel = () => {
    reset();
    setEditingId(null);
    setIsFormOpen(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para area de transferencia");
  };

  // Extrai variaveis do conteudo
  const extractVariables = (text: string) => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = [...text.matchAll(regex)];
    return [...new Set(matches.map((m) => m[1]))];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-muted-foreground">
            Crie templates de mensagens reutilizaveis
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Template
        </Button>
      </div>

      {/* Form */}
      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? "Editar Template" : "Novo Template"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Boas-vindas"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Input
                    id="category"
                    placeholder="Ex: atendimento, vendas"
                    {...register("category")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Conteudo</Label>
                <Textarea
                  id="content"
                  placeholder="Use {{variavel}} para criar campos dinamicos"
                  rows={5}
                  {...register("content")}
                />
                {errors.content && (
                  <p className="text-sm text-red-500">{errors.content.message}</p>
                )}
                {content && extractVariables(content).length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">Variaveis:</span>
                    {extractVariables(content).map((v) => (
                      <Badge key={v} variant="secondary">
                        {v}
                      </Badge>
                    ))}
                  </div>
                )}
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

      {/* Templates List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            Carregando...
          </div>
        ) : templates.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            Nenhum template criado
          </div>
        ) : (
          templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant="outline" className="mt-1">
                      {template.category}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {template.content}
                </p>

                {template.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {template.variables.map((v) => (
                      <Badge key={v} variant="secondary" className="text-xs">
                        {v}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(template.content)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
