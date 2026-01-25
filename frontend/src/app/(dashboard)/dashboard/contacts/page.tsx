"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Ban, CheckCircle, MoreVertical, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { contactsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPhone, formatDateTime, getInitials } from "@/lib/utils";
import type { Contact } from "@/types";

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: contactsData, isLoading } = useQuery({
    queryKey: ["contacts", searchQuery],
    queryFn: async () => {
      const { data } = await contactsApi.list({ search: searchQuery });
      return data;
    },
  });

  const contacts: Contact[] = contactsData?.data || [];

  const blockMutation = useMutation({
    mutationFn: (id: string) => contactsApi.block(id),
    onSuccess: () => {
      toast.success("Contato bloqueado");
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  const unblockMutation = useMutation({
    mutationFn: (id: string) => contactsApi.unblock(id),
    onSuccess: () => {
      toast.success("Contato desbloqueado");
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contactsApi.delete(id),
    onSuccess: () => {
      toast.success("Contato removido");
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contatos</h1>
          <p className="text-muted-foreground">
            Gerencie seus contatos do WhatsApp
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou telefone..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Contacts List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {contactsData?.total || 0} contato(s)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum contato encontrado
            </div>
          ) : (
            <div className="divide-y">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between py-4"
                >
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={contact.profilePic || undefined} />
                      <AvatarFallback>
                        {contact.name
                          ? getInitials(contact.name)
                          : contact.phone.slice(-2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {contact.name || formatPhone(contact.phone)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatPhone(contact.phone)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Adicionado em {formatDateTime(contact.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {contact.isBlocked && (
                      <Badge variant="destructive">Bloqueado</Badge>
                    )}

                    {contact.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}

                    {contact.isBlocked ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => unblockMutation.mutate(contact.id)}
                        title="Desbloquear"
                      >
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => blockMutation.mutate(contact.id)}
                        title="Bloquear"
                      >
                        <Ban className="h-4 w-4 text-red-500" />
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(contact.id)}
                      title="Remover"
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
