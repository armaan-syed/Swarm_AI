import { apiClient, setToken, clearToken } from "./client";
import { AuthResponse, UserOut, LoginRequest } from "@/app/types/api";

// TODO(backend): Supabase auth endpoints — mock responses until backend ships
const USE_MOCK = true;

export async function login(email: string, password: string): Promise<AuthResponse> {
  if (USE_MOCK) {
    // Mock successful login — remove when backend auth is live
    const mock: AuthResponse = {
      access_token: `mock-token-${Date.now()}`,
      token_type: "bearer",
      user: { id: "mock-user-1", email },
    };
    setToken(mock.access_token);
    return mock;
  }
  const res = await apiClient.post<AuthResponse>("/auth/login", { email, password } as LoginRequest);
  setToken(res.access_token);
  return res;
}

export async function signup(email: string, password: string): Promise<AuthResponse> {
  if (USE_MOCK) {
    const mock: AuthResponse = {
      access_token: `mock-token-${Date.now()}`,
      token_type: "bearer",
      user: { id: `mock-user-${Date.now()}`, email },
    };
    setToken(mock.access_token);
    return mock;
  }
  const res = await apiClient.post<AuthResponse>("/auth/signup", { email, password });
  setToken(res.access_token);
  return res;
}

export async function getMe(): Promise<UserOut> {
  if (USE_MOCK) {
    return { id: "mock-user-1", email: "user@company.com" };
  }
  return apiClient.get<UserOut>("/auth/me");
}

export function logout(): void {
  clearToken();
  if (typeof window !== "undefined") {
    localStorage.removeItem("compliance_company_id");
  }
}
