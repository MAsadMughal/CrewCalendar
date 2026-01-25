"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Employee, InsertEmployee } from "@shared/schema";
import { useToast } from "./use-toast";
import { useAdminMode } from "@/contexts/admin-mode-context";

export function useEmployees() {
  const adminMode = useAdminMode();
  const isAdmin = adminMode?.isAdminMode;
  const targetUserId = adminMode?.targetUserId;

  return useQuery<Employee[]>({
    queryKey: isAdmin ? ["admin-employees", targetUserId] : ["employees"],
    queryFn: async () => {
      const url = isAdmin 
        ? `/api/admin/proxy/employees?userId=${targetUserId}`
        : "/api/employees";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch employees");
      return res.json();
    },
  });
}

export function useEmployee(employeeId: string) {
  return useQuery<Employee>({
    queryKey: ["employees", employeeId],
    queryFn: async () => {
      const res = await fetch(`/api/employees/${employeeId}`);
      if (!res.ok) throw new Error("Failed to fetch employee");
      return res.json();
    },
    enabled: !!employeeId,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const adminMode = useAdminMode();
  const isAdmin = adminMode?.isAdminMode;
  const targetUserId = adminMode?.targetUserId;
  const pushUndo = adminMode?.pushUndo;

  return useMutation({
    mutationFn: async (data: Omit<InsertEmployee, "id" | "userId" | "createdAt" | "updatedAt">) => {
      const url = isAdmin ? "/api/admin/proxy/employees" : "/api/employees";
      const body = isAdmin ? { ...data, userId: targetUserId } : data;
      
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create employee");
      }
      return res.json();
    },
    onSuccess: (newEmployee) => {
      const queryKey = isAdmin ? ["admin-employees", targetUserId] : ["employees"];
      const dashboardKey = isAdmin ? ["admin-dashboard", targetUserId] : ["dashboard"];
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
      toast({ title: "Employee created successfully" });
      
      if (isAdmin && pushUndo) {
        pushUndo({
          description: `Created employee "${newEmployee.name}"`,
          undoFn: async () => {
            await fetch(`/api/admin/proxy/employees/${newEmployee.id}`, { method: "DELETE" });
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

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const adminMode = useAdminMode();
  const isAdmin = adminMode?.isAdminMode;
  const targetUserId = adminMode?.targetUserId;

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<InsertEmployee> & { id: string }) => {
      const url = isAdmin 
        ? `/api/admin/proxy/employees/${id}`
        : `/api/employees/${id}`;
      
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update employee");
      }
      return res.json();
    },
    onSuccess: () => {
      const queryKey = isAdmin ? ["admin-employees", targetUserId] : ["employees"];
      const dashboardKey = isAdmin ? ["admin-dashboard", targetUserId] : ["dashboard"];
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
      if (isAdmin) {
        queryClient.invalidateQueries({ queryKey: ["admin-bookings", targetUserId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["bookings"] });
      }
      toast({ title: "Employee updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const adminMode = useAdminMode();
  const isAdmin = adminMode?.isAdminMode;
  const targetUserId = adminMode?.targetUserId;

  return useMutation({
    mutationFn: async (id: string) => {
      const url = isAdmin 
        ? `/api/admin/proxy/employees/${id}`
        : `/api/employees/${id}`;
      
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete employee");
      return res.json();
    },
    onSuccess: () => {
      const queryKey = isAdmin ? ["admin-employees", targetUserId] : ["employees"];
      const dashboardKey = isAdmin ? ["admin-dashboard", targetUserId] : ["dashboard"];
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
      if (isAdmin) {
        queryClient.invalidateQueries({ queryKey: ["admin-bookings", targetUserId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["bookings"] });
      }
      toast({ title: "Employee deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
