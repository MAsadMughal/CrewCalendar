"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useToast } from "./use-toast";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  lastLoginAt?: string;
  loginHistory?: string[];
  createdAt?: string;
}

interface AuthResponse {
  user: User;
}

export function useAuth() {
  return useQuery<User | null>({
    queryKey: ["auth"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        if (res.status === 401) {
          return null;
        }
        throw new Error("Failed to fetch user");
      }
      const data = await res.json();
      return data.user;
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Login failed");
      }
      return res.json() as Promise<AuthResponse>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["auth"], data.user);
      toast({ title: "Login successful" });
      if (data.user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/");
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

interface SignupResponse {
  message: string;
  pendingApproval: boolean;
}

export function useSignup() {
  const router = useRouter();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { name: string; email: string; password: string }) => {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Signup failed");
      }
      return res.json() as Promise<SignupResponse>;
    },
    onSuccess: (data) => {
      toast({ 
        title: "Account created", 
        description: "Please wait for admin approval before logging in." 
      });
      router.push("/login");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Logout failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(["auth"], null);
      queryClient.clear();
      toast({ title: "Logged out successfully" });
      router.push("/login");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useForgotPassword() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { email: string }) => {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Request failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "If an account exists with this email, you will receive a password reset link." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useResetPassword() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { token: string; password: string }) => {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Password reset failed");
      }
      return res.json() as Promise<AuthResponse>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["auth"], data.user);
      toast({ title: "Password reset successfully" });
      router.push("/");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useChangePassword() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Password change failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { name: string; email: string }) => {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Profile update failed");
      }
      return res.json() as Promise<AuthResponse>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["auth"], data.user);
      toast({ title: "Profile updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
