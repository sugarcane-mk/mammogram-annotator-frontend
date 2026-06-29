import { create } from 'zustand';
import type { AppUser, UserRole } from '../db/database';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  
  toasts: Toast[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;

  authUser: AppUser | null;
  authRole: UserRole | null;
  organizationId: string | null;
  setAuthUser: (user: AppUser | null) => void;
  clearAuthUser: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (isOpen) => set({ sidebarOpen: isOpen }),
  theme: 'dark',
  setTheme: (theme) => set({ theme }),
  
  toasts: [],
  addToast: (message, type = 'success') => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    // Auto-remove after 3 seconds
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    }, 3000);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) })),

  authUser: null,
  authRole: null,
  organizationId: null,
  setAuthUser: (user) => set({ authUser: user, authRole: user?.role ?? null, organizationId: user?.organizationId ?? null }),
  clearAuthUser: () => set({ authUser: null, authRole: null, organizationId: null }),
}));
