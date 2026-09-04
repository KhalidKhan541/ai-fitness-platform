import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

type Theme = "light" | "dark" | "system";
type SidebarView = "default" | "compact" | "hidden";
type ModalType =
  | "none"
  | "workout"
  | "exercise"
  | "food"
  | "goal"
  | "challenge"
  | "settings"
  | "profile"
  | "confirm"
  | "photo"
  | "measurement";

interface ModalState {
  type: ModalType;
  data?: unknown;
  isOpen: boolean;
}

interface UIState {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  sidebar: SidebarView;
  modal: ModalState;
  toasts: Toast[];
  isLoading: boolean;
  isOnline: boolean;
  isMobileMenuOpen: boolean;
  isCommandPaletteOpen: boolean;
  isWorkoutTimerVisible: boolean;
  currentPage: string;
  scrollPosition: number;
  notificationsPanelOpen: boolean;

  setTheme: (theme: Theme) => void;
  setResolvedTheme: (theme: "light" | "dark") => void;
  setSidebar: (view: SidebarView) => void;
  toggleSidebar: () => void;

  openModal: (type: ModalType, data?: unknown) => void;
  closeModal: () => void;

  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  setLoading: (loading: boolean) => void;
  setOnline: (online: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setWorkoutTimerVisible: (visible: boolean) => void;
  setCurrentPage: (page: string) => void;
  setScrollPosition: (position: number) => void;
  setNotificationsPanelOpen: (open: boolean) => void;
}

interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

let toastCounter = 0;

export const useUIStore = create<UIState>()(
  persist(
    immer((set, get) => ({
      theme: "system",
      resolvedTheme: "light",
      sidebar: "default",
      modal: { type: "none", isOpen: false },
      toasts: [],
      isLoading: false,
      isOnline: true,
      isMobileMenuOpen: false,
      isCommandPaletteOpen: false,
      isWorkoutTimerVisible: false,
      currentPage: "dashboard",
      scrollPosition: 0,
      notificationsPanelOpen: false,

      setTheme: (theme) =>
        set((state) => {
          state.theme = theme;
          if (typeof window !== "undefined") {
            const root = document.documentElement;
            root.classList.remove("light", "dark");

            let resolved: "light" | "dark" = "light";
            if (theme === "system") {
              resolved = window.matchMedia("(prefers-color-scheme: dark)")
                .matches
                ? "dark"
                : "light";
            } else {
              resolved = theme;
            }

            root.classList.add(resolved);
            state.resolvedTheme = resolved;
          }
        }),

      setResolvedTheme: (theme) =>
        set((state) => {
          state.resolvedTheme = theme;
        }),

      setSidebar: (view) =>
        set((state) => {
          state.sidebar = view;
        }),

      toggleSidebar: () =>
        set((state) => {
          if (state.sidebar === "default") {
            state.sidebar = "compact";
          } else if (state.sidebar === "compact") {
            state.sidebar = "hidden";
          } else {
            state.sidebar = "default";
          }
        }),

      openModal: (type, data) =>
        set((state) => {
          state.modal = { type, data, isOpen: true };
        }),

      closeModal: () =>
        set((state) => {
          state.modal = { type: "none", isOpen: false };
        }),

      addToast: (toastData) =>
        set((state) => {
          const id = `toast_${++toastCounter}`;
          const toast: Toast = { ...toastData, id };
          state.toasts.push(toast);

          if (toast.duration !== 0) {
            setTimeout(() => {
              get().removeToast(id);
            }, toast.duration || 5000);
          }
        }),

      removeToast: (id) =>
        set((state) => {
          state.toasts = state.toasts.filter((t) => t.id !== id);
        }),

      clearToasts: () =>
        set((state) => {
          state.toasts = [];
        }),

      setLoading: (loading) =>
        set((state) => {
          state.isLoading = loading;
        }),

      setOnline: (online) =>
        set((state) => {
          state.isOnline = online;
        }),

      setMobileMenuOpen: (open) =>
        set((state) => {
          state.isMobileMenuOpen = open;
        }),

      setCommandPaletteOpen: (open) =>
        set((state) => {
          state.isCommandPaletteOpen = open;
        }),

      setWorkoutTimerVisible: (visible) =>
        set((state) => {
          state.isWorkoutTimerVisible = visible;
        }),

      setCurrentPage: (page) =>
        set((state) => {
          state.currentPage = page;
        }),

      setScrollPosition: (position) =>
        set((state) => {
          state.scrollPosition = position;
        }),

      setNotificationsPanelOpen: (open) =>
        set((state) => {
          state.notificationsPanelOpen = open;
        }),
    })),
    {
      name: "aifitness-ui",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      partialize: (state) => ({
        theme: state.theme,
        sidebar: state.sidebar,
      }),
    }
  )
);

export function toast(
  type: Toast["type"],
  title: string,
  message?: string,
  options?: { duration?: number; action?: Toast["action"] }
): void {
  useUIStore.getState().addToast({
    type,
    title,
    message,
    duration: options?.duration,
    action: options?.action,
  });
}

export const showToast = {
  success: (title: string, message?: string) =>
    toast("success", title, message),
  error: (title: string, message?: string) => toast("error", title, message),
  warning: (title: string, message?: string) =>
    toast("warning", title, message),
  info: (title: string, message?: string) => toast("info", title, message),
};
