import { create } from "zustand";
import * as authApi from "../auth/authApi";
import type { AuthUser, ProfileUpdateValues } from "../auth/authApi";
import type { LoginValues, RegisterValues } from "../auth/validation";

type AuthStatus = "loading" | "anonymous" | "authenticated";

type AuthState = {
  user: AuthUser | null;
  status: AuthStatus;
  loadMe: () => Promise<void>;
  login: (values: LoginValues) => Promise<void>;
  register: (values: RegisterValues) => Promise<void>;
  updateProfile: (values: ProfileUpdateValues) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "loading",
  async loadMe() {
    try {
      const response = await authApi.getMe();
      set({ user: response.user, status: "authenticated" });
    } catch {
      set({ user: null, status: "anonymous" });
    }
  },
  async login(values) {
    const response = await authApi.login(values);
    set({ user: response.user, status: "authenticated" });
  },
  async register(values) {
    const response = await authApi.registerAccount(values);
    set({ user: response.user, status: "authenticated" });
  },
  async updateProfile(values) {
    const response = await authApi.updateProfile(values);
    set({ user: response.user, status: "authenticated" });
  },
  async logout() {
    await authApi.logout();
    set({ user: null, status: "anonymous" });
  }
}));
