"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Pencil,
  Trash2,
  Building2,
  Package,
  ScrollText,
  HelpCircle,
  DollarSign,
  FileText,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";
import { knowledgeApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const categories = [
  { id: "COMPANY", label: "Sobre a Empresa", icon: Building2, color: "bg-blue-500" },
  { id: "PRODUCTS", label: "Produtos e Servicos", icon: Package, color: "bg-green-500" },
  { id: "RULES", label: "Regras de Atendimento", icon: ScrollText, color: "bg-orange-500" },
  { id: "FAQ", label: "Perguntas Frequentes", icon: HelpCircle, color: "bg-purple-500" },
  { id: "PRICING", label: "Precos e Valores", icon: DollarSign, color: "bg-yellow-500" },
  { id: "POLICIES", label: "Politicas", icon: FileText, color: "bg-red-500" },
];

const knowledgeSchema = z.object({
  category: z.enum(["COMPANY", "PRODUCTS", "RULES", "FAQ", "PRICING", "POLICIES"]),
  title: z.string().min(1, "Titulo e obrigatorio"),
  content: z.string().min(1, "Conteudo e obrigatorio"),
  isActive: z.boolean(),
  priority: z.number().min(0).max(100),
});

type KnowledgeForm = z.infer<typeof knowledgeSchema>;

interface Knowledge {
  id: string;
  category: string;
  title: string;
  content: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export default function KnowledgePage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKnowledge, setEditingKnowledge] = useState<Knowledge | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<KnowledgeForm>({
    resolver: zodResolver(knowledgeSchema),
    defaultValues: {
      category: "COMPANY",
      title: "",
      content: "",
      isActive: true,
      priority: 0,
    },
  });

  const { data: knowledgeData, isLoading } = useQuery({
    queryKey: ["knowledge", filterCategory],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filterCategory !== "all") {
        params.category = filterCategory;
      }
      const { data } = await knowledgeApi.list(params);
      return data.data as Knowledge[];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: KnowledgeForm) => knowledgeApi.create(data),
    onSuccess: () => {
      toast.success("Conhecimento adicionado");
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      handleCloseDialog();
    },
    onError: () => {
      toast.error("Erro ao adicionar conhecimento");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<KnowledgeForm> }) =>
      knowledgeApi.update(id, data),
    onSuccess: () => {
      toast.success("Conhecimento atualizado");
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      handleCloseDialog();
    },
    onError: () => {
      toast.error("Erro ao atualizar conhecimento");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => knowledgeApi.delete(id),
    onSuccess: () => {
      toast.success("Conhecimento removido");
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      setDeleteId(null);
    },
    onError: () => {
      toast.error("Erro ao remover conhecimento");
    },
  });

  const handleOpenDialog = (knowledge?: Knowledge) => {
    if (knowledge) {
      setEditingKnowledge(knowledge);
      reset({
        category: knowledge.category as KnowledgeForm["category"],
        title: knowledge.title,
        content: knowledge.content,
        isActive: knowledge.isActive,
        priority: knowledge.priority,
      });
    } else {
      setEditingKnowledge(null);
      reset({
        category: "COMPANY",
        title: "",
        content: "",
        isActive: true,
        priority: 0,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingKnowledge(null);
    reset();
  };

  const onSubmit = (data: KnowledgeForm) => {
    if (editingKnowledge) {
      updateMutation.mutate({ id: editingKnowledge.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getCategoryInfo = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId) || categories[0];
  };

  const filteredKnowledge = knowledgeData?.filter((k) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        k.title.toLowerCase().includes(search) ||
        k.content.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Agrupa por categoria
  const groupedKnowledge = filteredKnowledge?.reduce((acc, k) => {
    if (!acc[k.category]) {
      acc[k.category] = [];
    }
    acc[k.category].push(k);
    return acc;
  }, {} as Record<string, Knowledge[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Base de Conhecimento</h1>
          <p className="text-muted-foreground">
            Configure as informacoes que a IA usara para responder aos clientes
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por titulo ou conteudo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de conhecimentos */}
      {isLoading ? (
        <div className="text-center py-12">Carregando...</div>
      ) : !filteredKnowledge?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Nenhum conhecimento cadastrado.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => handleOpenDialog()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar primeiro conhecimento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedKnowledge || {}).map(([category, items]) => {
            const catInfo = getCategoryInfo(category);
            const Icon = catInfo.icon;

            return (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className={`p-2 rounded ${catInfo.color}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    {catInfo.label}
                    <Badge variant="secondary">{items.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {items.map((knowledge) => (
                      <div
                        key={knowledge.id}
                        className={`p-4 border rounded-lg ${
                          !knowledge.isActive ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium">{knowledge.title}</h3>
                              {!knowledge.isActive && (
                                <Badge variant="secondary">Inativo</Badge>
                              )}
                              {knowledge.priority > 0 && (
                                <Badge variant="outline">
                                  Prioridade: {knowledge.priority}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {knowledge.content}
                            </p>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(knowledge)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(knowledge.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog de criar/editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingKnowledge ? "Editar Conhecimento" : "Novo Conhecimento"}
            </DialogTitle>
            <DialogDescription>
              Adicione informacoes que a IA usara para responder aos clientes
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={watch("category")}
                  onValueChange={(v) =>
                    setValue("category", v as KnowledgeForm["category"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridade (0-100)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  {...register("priority", { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  Maior prioridade = aparece primeiro no contexto
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Titulo</Label>
              <Input
                placeholder="Ex: Nome da Empresa"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Conteudo</Label>
              <Textarea
                rows={6}
                placeholder="Ex: Somos uma empresa de tecnologia fundada em 2020..."
                {...register("content")}
              />
              {errors.content && (
                <p className="text-sm text-destructive">{errors.content.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Escreva de forma clara e objetiva. A IA usara esse texto para responder perguntas relacionadas.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={watch("isActive")}
                  onCheckedChange={(v) => setValue("isActive", v)}
                />
                <Label>Ativo</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingKnowledge ? "Salvar" : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmacao de exclusao */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover conhecimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. O conhecimento sera removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
