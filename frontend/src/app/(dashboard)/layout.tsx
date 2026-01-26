"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare,
  LayoutDashboard,
  Users,
  Settings,
  MessageCircle,
  FileText,
  GitBranch,
  BarChart3,
  LogOut,
  Menu,
  X,
  Bot,
  BookOpen,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSocket, useSocketStore } from "@/hooks/useSocket";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn, getInitials } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Conversas", href: "/dashboard/conversations", icon: MessageCircle },
  { name: "Contatos", href: "/dashboard/contacts", icon: Users },
  { name: "Auto-Respostas", href: "/dashboard/auto-replies", icon: MessageSquare },
  { name: "Templates", href: "/dashboard/templates", icon: FileText },
  { name: "Fluxos", href: "/dashboard/flows", icon: GitBranch },
  { name: "Base de Conhecimento", href: "/dashboard/knowledge", icon: BookOpen },
  { name: "Estatisticas", href: "/dashboard/stats", icon: BarChart3 },
  { name: "Configuracoes", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout, checkAuth } = useAuth();
  const { botStatus } = useSocketStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Conecta ao socket
  useSocket();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="bg-primary p-1.5 rounded-lg">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg">Zapify</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Bot Status */}
          <div className="px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <span className="text-sm font-medium">Status do Bot</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  botStatus?.isReady ? "bg-green-500" : "bg-red-500"
                )}
              />
              <span className="text-sm text-muted-foreground">
                {botStatus?.isReady
                  ? `Conectado (${botStatus.phoneNumber})`
                  : "Desconectado"}
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {user?.name ? getInitials(user.name) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center h-16 px-4 bg-white dark:bg-gray-800 border-b lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <Badge
            variant={botStatus?.isReady ? "success" : "destructive"}
            className="lg:hidden"
          >
            {botStatus?.isReady ? "Online" : "Offline"}
          </Badge>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
