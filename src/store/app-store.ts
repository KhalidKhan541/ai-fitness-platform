import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { User, UserSettings, Subscription } from "@/types";

interface AppState {
  user: User | null;
  subscription: Subscription | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  setUser: (user: User | null) => void;
  setSubscription: (subscription: Subscription | null) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  updateProfile: (profile: Partial<User>) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  incrementXp: (amount: number) => void;
  incrementStreak: () => void;
  resetStreak: () => void;
}

const initialState = {
  user: null,
  subscription: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,
};

export const useAppStore = create<AppState>()(
  persist(
    immer((set) => ({
      ...initialState,

      setUser: (user) =>
        set((state) => {
          state.user = user;
          state.isAuthenticated = user !== null;
          state.error = null;
        }),

      setSubscription: (subscription) =>
        set((state) => {
          state.subscription = subscription;
        }),

      updateSettings: (settings) =>
        set((state) => {
          if (state.user) {
            state.user.settings = {
              ...state.user.settings,
              ...settings,
            };
          }
        }),

      updateProfile: (profile) =>
        set((state) => {
          if (state.user) {
            state.user = {
              ...state.user,
              ...profile,
            };
          }
        }),

      setAuthenticated: (authenticated) =>
        set((state) => {
          state.isAuthenticated = authenticated;
        }),

      setLoading: (loading) =>
        set((state) => {
          state.isLoading = loading;
        }),

      setInitialized: (initialized) =>
        set((state) => {
          state.isInitialized = initialized;
        }),

      setError: (error) =>
        set((state) => {
          state.error = error;
        }),

      logout: () =>
        set((state) => {
          state.user = null;
          state.subscription = null;
          state.isAuthenticated = false;
          state.error = null;
        }),

      incrementXp: (amount) =>
        set((state) => {
          if (state.user) {
            state.user.xp += amount;
            const xpPerLevel = 1000;
            const newLevel = Math.floor(state.user.xp / xpPerLevel) + 1;
            if (newLevel > state.user.level) {
              state.user.level = newLevel;
            }
          }
        }),

      incrementStreak: () =>
        set((state) => {
          if (state.user) {
            state.user.streak += 1;
          }
        }),

      resetStreak: () =>
        set((state) => {
          if (state.user) {
            state.user.streak = 0;
          }
        }),
    })),
    {
      name: "aifitness-app",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      partialize: (state) => ({
        user: state.user,
        subscription: state.subscription,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
