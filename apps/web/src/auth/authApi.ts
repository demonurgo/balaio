import { apiGet, apiPost } from "../lib/api";
import type { LoginValues, RegisterValues } from "./validation";

export type AuthUser = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
};

type AuthResponse = {
  user: AuthUser;
};

export function registerAccount(values: RegisterValues) {
  return apiPost<AuthResponse>("/api/auth/register", values);
}

export function login(values: LoginValues) {
  return apiPost<AuthResponse>("/api/auth/login", values);
}

export function logout() {
  return apiPost<{ ok: true }>("/api/auth/logout");
}

export function getMe() {
  return apiGet<AuthResponse>("/api/auth/me");
}
