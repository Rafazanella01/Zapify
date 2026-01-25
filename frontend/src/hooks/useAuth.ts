"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        const { data } = await authApi.login(email, password);
        const { user, token } = data.data;

        localStorage.setItem("zapify_token", token);

        set({
          user,
          token,
          isAuthenticated: true,
        });
      },

      register: async (email: string, password: string, name: string) => {
        const { data } = await authApi.register(email, password, name);
        const { user, token } = data.data;

        localStorage.setItem("zapify_token", token);

        set({
          user,
          token,
          isAuthenticated: true,
        });
      },

      logout: () => {
        localStorage.removeItem("zapify_token");
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      checkAuth: async () => {
        const token = localStorage.getItem("zapify_token");

        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        try {
          const { data } = await authApi.me();
          set({
            user: data.data.user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          localStorage.removeItem("zapify_token");
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: "zapify-auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
