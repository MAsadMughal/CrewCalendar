"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { X, Plus, Calendar, User, Loader2, Trash2 } from "lucide-react";
import { Dialog, DraggableDialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/draggable-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUIStore } from "@/stores/ui-store";
import { useEmployee, useCreateEmployee, useUpdateEmployee, useDeleteEmployee } from "@/hooks/use-employees";
import { useDashboard } from "@/hooks/use-dashboard";
import { employeeSchema, type EmployeeFormData } from "@shared/validations";
import { getWeekdayStringsBetween, formatDateString } from "@/lib/utils";
import { ConfirmModal } from "./confirm-modal";

const PRESET_COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#EAB308", "#84CC16",
  "#22C55E", "#10B981", "#14B8A6", "#06B6D4", "#0EA5E9",
  "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7", "#D946EF",
  "#EC4899", "#F43F5E",
];

export function EmployeeModal() {
  const { isEmployeeModalOpen, editingEmployee, closeEmployeeModal } = useUIStore();
  const { data: employee } = useEmployee(editingEmployee || "");
  const { data: dashboardData } = useDashboard();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const t = useTranslations("employeeModal");
  const tCommon = useTranslations("common");

  const activeProjectsWithEmployee = (dashboardData?.projects || [])
    .filter(p => p.status === "active" && (p.assignedEmployees || []).includes(editingEmployee || ""));
  const canDelete = activeProjectsWithEmployee.length === 0;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: "",
      teamColor: "#3B82F6",
      plannedAbsences: [],
    },
  });

  const currentColor = watch("teamColor");
  const plannedAbsences = watch("plannedAbsences") || [];
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (employee) {
      reset({
        name: employee.name,
        teamColor: employee.teamColor,
        plannedAbsences: employee.plannedAbsences || [],
      });
    } else {
      reset({
        name: "",
        teamColor: "#3B82F6",
        plannedAbsences: [],
      });
    }
    setStartDate("");
    setEndDate("");
    setShowDeleteConfirm(false);
  }, [employee, reset]);

  const addAbsenceDates = () => {
    if (!startDate) return;
    const dateStrings = getWeekdayStringsBetween(startDate, endDate || startDate);
    const existingSet = new Set(plannedAbsences);
    const newDates = dateStrings.filter(d => !existingSet.has(d));
    
    if (newDates.length > 0) {
      setValue("plannedAbsences", [...plannedAbsences, ...newDates]);
    }
    setStartDate("");
    setEndDate("");
  };

  const removeAbsenceDate = (index: number) => {
    const updated = plannedAbsences.filter((_, i) => i !== index);
    setValue("plannedAbsences", updated);
  };

  const onSubmit = (data: EmployeeFormData) => {
    if (editingEmployee) {
      updateEmployee.mutate({ id: editingEmployee, ...data }, {
        onSuccess: () => closeEmployeeModal(),
      });
    } else {
      createEmployee.mutate(data, {
        onSuccess: () => closeEmployeeModal(),
      });
    }
  };

  const handleDelete = () => {
    if (editingEmployee) {
      deleteEmployee.mutate(editingEmployee, {
        onSuccess: () => {
          setShowDeleteConfirm(false);
          closeEmployeeModal();
        },
      });
    }
  };

  const isPending = createEmployee.isPending || updateEmployee.isPending;

  return (
    <>
      <Dialog open={isEmployeeModalOpen} onOpenChange={closeEmployeeModal}>
        <DraggableDialogContent className="w-[95vw] max-w-[450px] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <User className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-white">
                  {editingEmployee ? t("editEmployee") : t("addEmployee")}
                </DialogTitle>
                <DialogDescription className="text-emerald-100 text-sm">
                  {editingEmployee ? t("editDescription") : t("addDescription")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("employeeName")}</Label>
              <Input 
                id="name" 
                {...register("name")} 
                placeholder={t("enterEmployeeName")}
                className="h-11"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("teamColor")}</Label>
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl border-2 border-gray-200 dark:border-gray-600 shadow-sm flex-shrink-0"
                  style={{ backgroundColor: currentColor }}
                />
                <Input 
                  type="text" 
                  {...register("teamColor")}
                  className="w-28 h-10 font-mono text-sm"
                  placeholder="#000000"
                />
              </div>
              <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 ${
                      currentColor === color ? "border-gray-800 dark:border-white ring-2 ring-gray-300 dark:ring-gray-500" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setValue("teamColor", color)}
                  />
                ))}
              </div>
              {errors.teamColor && <p className="text-red-500 text-xs">{errors.teamColor.message}</p>}
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Calendar className="h-4 w-4 text-orange-500" />
                {t("plannedLeaveDates")}
              </Label>
              <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800 space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-10 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                      placeholder={tCommon("start")}
                    />
                    <Input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-10 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                      placeholder={tCommon("end")}
                    />
                  </div>
                  <Button 
                    type="button" 
                    size="sm"
                    onClick={addAbsenceDates}
                    disabled={!startDate}
                    className="h-10 px-4 bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {tCommon("add")}
                  </Button>
                </div>
                <p className="text-xs text-orange-600 dark:text-orange-400">{t("weekendsExcluded")}</p>
              </div>
              
              {plannedAbsences.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {[...plannedAbsences]
                    .sort((a, b) => a.localeCompare(b))
                    .map((dateStr, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-2 text-sm group"
                      >
                        <span className="text-orange-700 dark:text-orange-400 font-medium">
                          {formatDateString(dateStr, "EEE, MMM d, yyyy")}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeAbsenceDate(plannedAbsences.indexOf(dateStr))}
                          className="text-orange-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  }
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">{t("noLeaveDates")}</p>
              )}
            </div>

            {editingEmployee && (
              <div className="pt-2 border-t space-y-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 disabled:text-gray-400 disabled:hover:bg-transparent"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={!canDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("deleteEmployee")}
                </Button>
                {!canDelete && (
                  <p className="text-xs text-center text-amber-600">
                    {activeProjectsWithEmployee.length === 1 
                      ? t("cannotDelete", { count: activeProjectsWithEmployee.length })
                      : t("cannotDeletePlural", { count: activeProjectsWithEmployee.length })}
                  </p>
                )}
              </div>
            )}

            <DialogFooter className="pt-4 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={closeEmployeeModal} className="flex-1 sm:flex-none">
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isPending} className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700">
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingEmployee ? t("updateEmployee") : t("addEmployee")}
              </Button>
            </DialogFooter>
          </form>
        </DraggableDialogContent>
      </Dialog>

      <ConfirmModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={t("deleteEmployeeConfirmTitle")}
        description={t("deleteEmployeeConfirmDescription", { name: employee?.name || "" })}
        confirmText={t("deleteEmployee")}
        variant="danger"
      />
    </>
  );
}
