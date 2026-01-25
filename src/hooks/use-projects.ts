"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Project, InsertProject } from "@shared/schema";
import { useToast } from "./use-toast";
import { useAdminMode } from "@/contexts/admin-mode-context";

export function useProjects() {
  const adminMode = useAdminMode();
  const isAdmin = adminMode?.isAdminMode;
  const targetUserId = adminMode?.targetUserId;

  return useQuery<Project[]>({
    queryKey: isAdmin ? ["admin-projects", targetUserId] : ["projects"],
    queryFn: async () => {
      const url = isAdmin
        ? `/api/admin/proxy/projects?userId=${targetUserId}`
        : "/api/projects";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
  });
}

export function useProject(projectId: string) {
  return useQuery<Project>({
    queryKey: ["projects", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch project");
      return res.json();
    },
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const adminMode = useAdminMode();
  const isAdmin = adminMode?.isAdminMode;
  const targetUserId = adminMode?.targetUserId;
  const pushUndo = adminMode?.pushUndo;

  return useMutation({
    mutationFn: async (data: Omit<InsertProject, "id" | "createdAt" | "updatedAt" | "userId">) => {
      const url = isAdmin ? "/api/admin/proxy/projects" : "/api/projects";
      const body = isAdmin ? { ...data, userId: targetUserId } : data;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create project");
      }
      return res.json();
    },
    onSuccess: (newProject) => {
      const queryKey = isAdmin ? ["admin-projects", targetUserId] : ["projects"];
      const dashboardKey = isAdmin ? ["admin-dashboard", targetUserId] : ["dashboard"];
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
      toast({ title: "Project created successfully" });

      if (isAdmin && pushUndo) {
        pushUndo({
          description: `Created project "${newProject.name}"`,
          undoFn: async () => {
            await fetch(`/api/admin/proxy/projects/${newProject.id}`, { method: "DELETE" });
            queryClient.invalidateQueries({ queryKey });
          },
        });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const adminMode = useAdminMode();
  const isAdmin = adminMode?.isAdminMode;
  const targetUserId = adminMode?.targetUserId;
  const pushUndo = adminMode?.pushUndo;

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<InsertProject> & { id: string }) => {
      const url = isAdmin
        ? `/api/admin/proxy/projects/${id}`
        : `/api/projects/${id}`;

      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update project");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      const queryKey = isAdmin ? ["admin-projects", targetUserId] : ["projects"];
      const dashboardKey = isAdmin ? ["admin-dashboard", targetUserId] : ["dashboard"];
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
      toast({ title: "Project updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const adminMode = useAdminMode();
  const isAdmin = adminMode?.isAdminMode;
  const targetUserId = adminMode?.targetUserId;

  return useMutation({
    mutationFn: async (id: string) => {
      const url = isAdmin
        ? `/api/admin/proxy/projects/${id}`
        : `/api/projects/${id}`;

      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete project");
      return res.json();
    },
    onSuccess: () => {
      const queryKey = isAdmin ? ["admin-projects", targetUserId] : ["projects"];
      const dashboardKey = isAdmin ? ["admin-dashboard", targetUserId] : ["dashboard"];
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
      toast({ title: "Project deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateProjectOrder() {
  const queryClient = useQueryClient();
  const adminMode = useAdminMode();
  const isAdmin = adminMode?.isAdminMode;
  const targetUserId = adminMode?.targetUserId;
  const pushUndo = adminMode?.pushUndo;

  return useMutation({
    mutationFn: async (projectIds: string[]) => {
      const url = isAdmin
        ? "/api/admin/proxy/projects/order"
        : "/api/projects/order";

      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectIds }),
      });
      if (!res.ok) throw new Error("Failed to update project order");
      return res.json();
    },
    onSuccess: () => {
      const queryKey = isAdmin ? ["admin-projects", targetUserId] : ["projects"];
      const dashboardKey = isAdmin ? ["admin-dashboard", targetUserId] : ["dashboard"];
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
  });
}
