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
    onMutate: async (newProjectData) => {
      const queryKey = isAdmin ? ["admin-projects", targetUserId] : ["projects"];
      const dashboardKey = isAdmin ? ["admin-dashboard", targetUserId] : ["dashboard"];

      await queryClient.cancelQueries({ queryKey });
      await queryClient.cancelQueries({ queryKey: dashboardKey });

      const previousProjects = queryClient.getQueryData<Project[]>(queryKey);
      const previousDashboard = queryClient.getQueryData<any>(dashboardKey);

      const tempProject: Project = {
        ...newProjectData,
        id: `temp-${Date.now()}`,
        status: newProjectData.status || "active",
        assignedEmployees: newProjectData.assignedEmployees || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: targetUserId || "current",
      } as Project;

      if (previousProjects) {
        queryClient.setQueryData(queryKey, [...previousProjects, tempProject]);
      }

      if (previousDashboard) {
        queryClient.setQueryData(dashboardKey, {
          ...previousDashboard,
          projects: [...previousDashboard.projects, tempProject],
        });
      }

      return { previousProjects, previousDashboard, queryKey, dashboardKey };
    },
    onSuccess: (newProject, variables, context) => {
      toast({ title: "Project created successfully" });

      if (isAdmin && pushUndo) {
        pushUndo({
          description: `Created project "${newProject.name}"`,
          undoFn: async () => {
            const url = isAdmin ? `/api/admin/proxy/projects/${newProject.id}` : `/api/projects/${newProject.id}`;
            await fetch(url, { method: "DELETE" });
            queryClient.invalidateQueries({ queryKey: context.queryKey });
            queryClient.invalidateQueries({ queryKey: context.dashboardKey });
          },
        });
      }
    },
    onError: (error: Error, variables, context) => {
      if (context) {
        queryClient.setQueryData(context.queryKey, context.previousProjects);
        queryClient.setQueryData(context.dashboardKey, context.previousDashboard);
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
    onSettled: (data, error, variables, context) => {
      if (context) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
        queryClient.invalidateQueries({ queryKey: context.dashboardKey });
      }
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
    onMutate: async (variables) => {
      const { id, ...data } = variables;
      const queryKey = isAdmin ? ["admin-projects", targetUserId] : ["projects"];
      const dashboardKey = isAdmin ? ["admin-dashboard", targetUserId] : ["dashboard"];

      await queryClient.cancelQueries({ queryKey });
      await queryClient.cancelQueries({ queryKey: dashboardKey });

      const previousProjects = queryClient.getQueryData<Project[]>(queryKey);
      const previousDashboard = queryClient.getQueryData<any>(dashboardKey);

      if (previousProjects) {
        queryClient.setQueryData(
          queryKey,
          previousProjects.map((p) => (p.id === id ? { ...p, ...data } : p))
        );
      }

      if (previousDashboard) {
        queryClient.setQueryData(dashboardKey, {
          ...previousDashboard,
          projects: previousDashboard.projects.map((p: Project) =>
            p.id === id ? { ...p, ...data } : p
          ),
        });
      }

      return { previousProjects, previousDashboard, queryKey, dashboardKey };
    },
    onSuccess: () => {
      toast({ title: "Project updated successfully" });
    },
    onError: (error: Error, variables, context) => {
      if (context) {
        queryClient.setQueryData(context.queryKey, context.previousProjects);
        queryClient.setQueryData(context.dashboardKey, context.previousDashboard);
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
    onSettled: (data, error, variables, context) => {
      if (context) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
        queryClient.invalidateQueries({ queryKey: context.dashboardKey });
      }
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
    onMutate: async (id) => {
      const queryKey = isAdmin ? ["admin-projects", targetUserId] : ["projects"];
      const dashboardKey = isAdmin ? ["admin-dashboard", targetUserId] : ["dashboard"];

      await queryClient.cancelQueries({ queryKey });
      await queryClient.cancelQueries({ queryKey: dashboardKey });

      const previousProjects = queryClient.getQueryData<Project[]>(queryKey);
      const previousDashboard = queryClient.getQueryData<any>(dashboardKey);

      if (previousProjects) {
        queryClient.setQueryData(
          queryKey,
          previousProjects.filter((p) => p.id !== id)
        );
      }

      if (previousDashboard) {
        queryClient.setQueryData(dashboardKey, {
          ...previousDashboard,
          projects: previousDashboard.projects.filter((p: Project) => p.id !== id),
        });
      }

      return { previousProjects, previousDashboard, queryKey, dashboardKey };
    },
    onSuccess: () => {
      toast({ title: "Project deleted successfully" });
    },
    onError: (error: Error, variables, context) => {
      if (context) {
        queryClient.setQueryData(context.queryKey, context.previousProjects);
        queryClient.setQueryData(context.dashboardKey, context.previousDashboard);
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
    onSettled: (data, error, variables, context) => {
      if (context) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
        queryClient.invalidateQueries({ queryKey: context.dashboardKey });
      }
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
    onMutate: async (projectIds) => {
      const queryKey = isAdmin ? ["admin-projects", targetUserId] : ["projects"];
      const dashboardKey = isAdmin ? ["admin-dashboard", targetUserId] : ["dashboard"];

      await queryClient.cancelQueries({ queryKey });
      await queryClient.cancelQueries({ queryKey: dashboardKey });

      const previousProjects = queryClient.getQueryData<Project[]>(queryKey);
      const previousDashboard = queryClient.getQueryData<any>(dashboardKey);

      if (previousProjects) {
        const sortedProjects = [...previousProjects].sort((a, b) => {
          const aIndex = projectIds.indexOf(a.id);
          const bIndex = projectIds.indexOf(b.id);
          if (aIndex === -1 && bIndex === -1) return 0;
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });
        queryClient.setQueryData(queryKey, sortedProjects);
      }

      if (previousDashboard) {
        const sortedProjects = [...previousDashboard.projects].sort((a, b) => {
          const aIndex = projectIds.indexOf(a.id);
          const bIndex = projectIds.indexOf(b.id);
          if (aIndex === -1 && bIndex === -1) return 0;
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });
        queryClient.setQueryData(dashboardKey, {
          ...previousDashboard,
          projects: sortedProjects,
        });
      }

      return { previousProjects, previousDashboard, queryKey, dashboardKey };
    },
    onError: (error, variables, context) => {
      if (context) {
        queryClient.setQueryData(context.queryKey, context.previousProjects);
        queryClient.setQueryData(context.dashboardKey, context.previousDashboard);
      }
    },
    onSettled: (data, error, variables, context) => {
      if (context) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
        queryClient.invalidateQueries({ queryKey: context.dashboardKey });
      }
    },
  });
}
