"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Booking, InsertBooking } from "@shared/schema";
import { useToast } from "./use-toast";
import { toDateString } from "@/lib/utils";
import { useAdminMode } from "@/contexts/admin-mode-context";

export function useBookings() {
  const adminMode = useAdminMode();
  const isAdmin = adminMode?.isAdminMode;
  const targetUserId = adminMode?.targetUserId;

  return useQuery<Booking[]>({
    queryKey: isAdmin ? ["admin-bookings", targetUserId] : ["bookings"],
    queryFn: async () => {
      const url = isAdmin
        ? `/api/admin/proxy/bookings?userId=${targetUserId}`
        : "/api/bookings";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const adminMode = useAdminMode();
  const isAdmin = adminMode?.isAdminMode;
  const targetUserId = adminMode?.targetUserId;
  const pushUndo = adminMode?.pushUndo;

  return useMutation({
    mutationFn: async (data: Omit<InsertBooking, "id" | "createdAt" | "updatedAt">) => {
      const url = isAdmin ? "/api/admin/proxy/bookings" : "/api/bookings";

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create booking");
      }
      return res.json();
    },
    onSuccess: (newBooking) => {
      const queryKey = isAdmin ? ["admin-bookings", targetUserId] : ["bookings"];
      const dashboardKey = isAdmin ? ["admin-dashboard", targetUserId] : ["dashboard"];
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
      toast({ title: "Booking created" });

      if (isAdmin && pushUndo) {
        pushUndo({
          description: `Added booking on ${newBooking.date}`,
          undoFn: async () => {
            await fetch(`/api/admin/proxy/bookings/${newBooking.id}`, { method: "DELETE" });
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

export function useDeleteBooking() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const adminMode = useAdminMode();
  const isAdmin = adminMode?.isAdminMode;
  const targetUserId = adminMode?.targetUserId;

  return useMutation({
    mutationFn: async (id: string) => {
      const url = isAdmin
        ? `/api/admin/proxy/bookings/${id}`
        : `/api/bookings/${id}`;

      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete booking");
      return res.json();
    },
    onSuccess: () => {
      const queryKey = isAdmin ? ["admin-bookings", targetUserId] : ["bookings"];
      const dashboardKey = isAdmin ? ["admin-dashboard", targetUserId] : ["dashboard"];
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
      toast({ title: "Booking removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useToggleBooking() {
  const queryClient = useQueryClient();
  const adminMode = useAdminMode();
  const isAdmin = adminMode?.isAdminMode;
  const targetUserId = adminMode?.targetUserId;
  const pushUndo = adminMode?.pushUndo;

  return useMutation({
    mutationFn: async (data: { date: Date | string; projectId: string; employeeId: string }) => {
      const dateStr = typeof data.date === 'string' ? data.date : toDateString(data.date);
      const url = isAdmin ? "/api/admin/proxy/bookings/toggle" : "/api/bookings/toggle";

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateStr,
          projectId: data.projectId,
          employeeId: data.employeeId,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to toggle booking");
      }
      return res.json();
    },
    onMutate: async (variables) => {
      const dateStr = typeof variables.date === 'string' ? variables.date : toDateString(variables.date);
      const queryKey = isAdmin ? ["admin-bookings", targetUserId] : ["bookings"];
      const dashboardKey = isAdmin ? ["admin-dashboard", targetUserId] : ["dashboard"];

      await queryClient.cancelQueries({ queryKey });
      await queryClient.cancelQueries({ queryKey: dashboardKey });

      const previousBookings = queryClient.getQueryData<Booking[]>(queryKey);
      const previousDashboard = queryClient.getQueryData<any>(dashboardKey);

      if (previousDashboard) {
        const isCurrentlyBooked = previousDashboard.bookings.some(
          (b: Booking) => b.projectId === variables.projectId && b.employeeId === variables.employeeId && b.date === dateStr
        );

        let newBookings;
        if (isCurrentlyBooked) {
          newBookings = previousDashboard.bookings.filter(
            (b: Booking) => !(b.projectId === variables.projectId && b.employeeId === variables.employeeId && b.date === dateStr)
          );
        } else {
          const tempBooking: Booking = {
            id: `temp-${Date.now()}`,
            projectId: variables.projectId,
            employeeId: variables.employeeId,
            date: dateStr,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          newBookings = [...previousDashboard.bookings, tempBooking];
        }

        queryClient.setQueryData(dashboardKey, {
          ...previousDashboard,
          bookings: newBookings,
        });
      }

      if (previousBookings) {
        const isCurrentlyBooked = previousBookings.some(
          (b: Booking) => b.projectId === variables.projectId && b.employeeId === variables.employeeId && b.date === dateStr
        );

        let newBookings;
        if (isCurrentlyBooked) {
          newBookings = previousBookings.filter(
            (b: Booking) => !(b.projectId === variables.projectId && b.employeeId === variables.employeeId && b.date === dateStr)
          );
        } else {
          const tempBooking: Booking = {
            id: `temp-${Date.now()}`,
            projectId: variables.projectId,
            employeeId: variables.employeeId,
            date: dateStr,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          newBookings = [...previousBookings, tempBooking];
        }
        queryClient.setQueryData(queryKey, newBookings);
      }

      return { previousBookings, previousDashboard, queryKey, dashboardKey };
    },
    onError: (err, variables, context) => {
      if (context) {
        queryClient.setQueryData(context.queryKey, context.previousBookings);
        queryClient.setQueryData(context.dashboardKey, context.previousDashboard);
      }
    },
    onSettled: (data, error, variables, context) => {
      if (context) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
        queryClient.invalidateQueries({ queryKey: context.dashboardKey });
      }
    },
    onSuccess: (result, variables) => {
      if (isAdmin && pushUndo) {
        const dateStr = typeof variables.date === 'string' ? variables.date : toDateString(variables.date);
        const action = result.action;
        const queryKey = isAdmin ? ["admin-bookings", targetUserId] : ["bookings"];

        pushUndo({
          description: action === "created" ? `Added booking on ${dateStr}` : `Removed booking on ${dateStr}`,
          undoFn: async () => {
            await fetch(isAdmin ? "/api/admin/proxy/bookings/toggle" : "/api/bookings/toggle", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                date: dateStr,
                projectId: variables.projectId,
                employeeId: variables.employeeId,
              }),
            });
            queryClient.invalidateQueries({ queryKey });
          },
        });
      }
    },
  });
}

export function useBulkCreateBookings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const adminMode = useAdminMode();
  const isAdmin = adminMode?.isAdminMode;
  const targetUserId = adminMode?.targetUserId;
  const pushUndo = adminMode?.pushUndo;

  return useMutation({
    mutationFn: async (data: { dates: (Date | string)[]; projectId: string; employeeId: string }) => {
      const dateStrings = data.dates.map(d =>
        typeof d === 'string' ? d : toDateString(d)
      );
      const url = isAdmin ? "/api/admin/proxy/bookings/bulk" : "/api/bookings/bulk";

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          dates: dateStrings,
          projectId: data.projectId,
          employeeId: data.employeeId,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create bookings");
      }
      return res.json();
    },
    onMutate: async (variables) => {
      const dateStrings = variables.dates.map(d => typeof d === 'string' ? d : toDateString(d));
      const queryKey = isAdmin ? ["admin-bookings", targetUserId] : ["bookings"];
      const dashboardKey = isAdmin ? ["admin-dashboard", targetUserId] : ["dashboard"];

      await queryClient.cancelQueries({ queryKey });
      await queryClient.cancelQueries({ queryKey: dashboardKey });

      const previousBookings = queryClient.getQueryData<Booking[]>(queryKey);
      const previousDashboard = queryClient.getQueryData<any>(dashboardKey);

      const tempBookings: Booking[] = dateStrings.map(dateStr => ({
        id: `temp-${Date.now()}-${dateStr}`,
        projectId: variables.projectId,
        employeeId: variables.employeeId,
        date: dateStr,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      if (previousDashboard) {
        queryClient.setQueryData(dashboardKey, {
          ...previousDashboard,
          bookings: [...previousDashboard.bookings, ...tempBookings],
        });
      }

      if (previousBookings) {
        queryClient.setQueryData(queryKey, [...previousBookings, ...tempBookings]);
      }

      return { previousBookings, previousDashboard, queryKey, dashboardKey };
    },
    onError: (err, variables, context) => {
      if (context) {
        queryClient.setQueryData(context.queryKey, context.previousBookings);
        queryClient.setQueryData(context.dashboardKey, context.previousDashboard);
      }
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
    onSettled: (data, error, variables, context) => {
      if (context) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
        queryClient.invalidateQueries({ queryKey: context.dashboardKey });
      }
    },
    onSuccess: (result) => {
      toast({ title: `${result.count || 0} bookings created` });

      if (isAdmin && pushUndo && result.bookings?.length > 0) {
        const queryKey = isAdmin ? ["admin-bookings", targetUserId] : ["bookings"];
        const bookingIds = result.bookings.map((b: { id: string }) => b.id);
        pushUndo({
          description: `Created ${result.count} bookings`,
          undoFn: async () => {
            const url = isAdmin ? "/api/admin/proxy/bookings/bulk" : "/api/bookings/bulk";
            await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "delete", bookingIds }),
            });
            queryClient.invalidateQueries({ queryKey });
          },
        });
      }
    },
  });
}

export function useBulkDeleteBookings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const adminMode = useAdminMode();
  const isAdmin = adminMode?.isAdminMode;
  const targetUserId = adminMode?.targetUserId;

  return useMutation({
    mutationFn: async (bookingIds: string[]) => {
      const url = isAdmin ? "/api/admin/proxy/bookings/bulk" : "/api/bookings/bulk";

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          bookingIds,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete bookings");
      }
      return res.json();
    },
    onMutate: async (bookingIds) => {
      const queryKey = isAdmin ? ["admin-bookings", targetUserId] : ["bookings"];
      const dashboardKey = isAdmin ? ["admin-dashboard", targetUserId] : ["dashboard"];

      await queryClient.cancelQueries({ queryKey });
      await queryClient.cancelQueries({ queryKey: dashboardKey });

      const previousBookings = queryClient.getQueryData<Booking[]>(queryKey);
      const previousDashboard = queryClient.getQueryData<any>(dashboardKey);

      if (previousDashboard) {
        queryClient.setQueryData(dashboardKey, {
          ...previousDashboard,
          bookings: previousDashboard.bookings.filter((b: Booking) => !bookingIds.includes(b.id)),
        });
      }

      if (previousBookings) {
        queryClient.setQueryData(queryKey, previousBookings.filter((b: Booking) => !bookingIds.includes(b.id)));
      }

      return { previousBookings, previousDashboard, queryKey, dashboardKey };
    },
    onError: (err, variables, context) => {
      if (context) {
        queryClient.setQueryData(context.queryKey, context.previousBookings);
        queryClient.setQueryData(context.dashboardKey, context.previousDashboard);
      }
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
    onSettled: (data, error, variables, context) => {
      if (context) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
        queryClient.invalidateQueries({ queryKey: context.dashboardKey });
      }
    },
    onSuccess: (data) => {
      toast({ title: `${data.count || 0} bookings removed` });
    },
  });
}

export function useDeleteBookingsForEmployee() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const adminMode = useAdminMode();
  const isAdmin = adminMode?.isAdminMode;
  const targetUserId = adminMode?.targetUserId;

  return useMutation({
    mutationFn: async ({ projectId, employeeId }: { projectId: string; employeeId: string }) => {
      const res = await fetch("/api/bookings/by-assignment", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, employeeId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete bookings");
      }
      return res.json();
    },
    onSuccess: () => {
      const queryKey = isAdmin ? ["admin-bookings", targetUserId] : ["bookings"];
      const dashboardKey = isAdmin ? ["admin-dashboard", targetUserId] : ["dashboard"];
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteBookingsForProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const adminMode = useAdminMode();
  const isAdmin = adminMode?.isAdminMode;
  const targetUserId = adminMode?.targetUserId;

  return useMutation({
    mutationFn: async (projectId: string) => {
      const res = await fetch(`/api/bookings/by-project/${projectId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete bookings");
      }
      return res.json();
    },
    onSuccess: () => {
      const queryKey = isAdmin ? ["admin-bookings", targetUserId] : ["bookings"];
      const dashboardKey = isAdmin ? ["admin-dashboard", targetUserId] : ["dashboard"];
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
