"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { CheckCircle, AlertTriangle, FolderKanban, Loader2 } from "lucide-react";
import { Dialog, DraggableDialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/draggable-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUIStore } from "@/stores/ui-store";
import { useProject, useCreateProject, useUpdateProject } from "@/hooks/use-projects";
import { projectSchema, type ProjectFormData } from "@shared/validations";
import { toDateString } from "@/lib/utils";

export function ProjectModal() {
  const { isProjectModalOpen, editingProject, closeProjectModal } = useUIStore();
  const { data: project } = useProject(editingProject || "");
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const t = useTranslations("projectModal");
  const tCommon = useTranslations("common");

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      status: "active",
      assignedEmployees: [],
    },
  });

  const status = watch("status");
  const deliveryDate = watch("deliveryDate");
  const contractEndDate = watch("contractEndDate");
  const internalEndDate = watch("internalEndDate");
  const todayStr = toDateString(new Date());

  const deliveryDateValidation = useMemo(() => {
    if (!deliveryDate || !contractEndDate || !internalEndDate) {
      return { isValid: true, message: "" };
    }
    const maxEndDate = contractEndDate > internalEndDate ? contractEndDate : internalEndDate;
    const isValid = deliveryDate > maxEndDate;
    return {
      isValid,
      message: isValid 
        ? t("validAfterBothEndDates")
        : t("mustBeAfter", { date: maxEndDate })
    };
  }, [deliveryDate, contractEndDate, internalEndDate, t]);

  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        contractStartDate: project.contractStartDate,
        contractEndDate: project.contractEndDate,
        internalStartDate: project.internalStartDate,
        internalEndDate: project.internalEndDate,
        status: project.status as "active" | "delivered",
        deliveryDate: project.deliveryDate || undefined,
        assignedEmployees: project.assignedEmployees || [],
      });
    } else {
      reset({
        name: "",
        contractStartDate: todayStr,
        contractEndDate: todayStr,
        internalStartDate: todayStr,
        internalEndDate: todayStr,
        status: "active",
        deliveryDate: undefined,
        assignedEmployees: [],
      });
    }
  }, [project, reset, isProjectModalOpen, todayStr]);

  const onSubmit = (data: ProjectFormData) => {
    const submitData = {
      ...data,
      deliveryDate: data.status === "delivered" ? data.deliveryDate : null,
    };

    if (editingProject) {
      updateProject.mutate({ id: editingProject, ...submitData }, {
        onSuccess: () => closeProjectModal(),
      });
    } else {
      createProject.mutate(submitData, {
        onSuccess: () => closeProjectModal(),
      });
    }
  };

  const isPending = createProject.isPending || updateProject.isPending;

  return (
    <>
      <Dialog open={isProjectModalOpen} onOpenChange={closeProjectModal}>
        <DraggableDialogContent className="w-[95vw] max-w-[500px] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <FolderKanban className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-white">
                  {editingProject ? t("editProject") : t("createProject")}
                </DialogTitle>
                <DialogDescription className="text-blue-100 text-sm">
                  {editingProject ? t("editDescription") : t("createDescription")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">{t("projectName")}</Label>
              <Input 
                id="name" 
                {...register("name")} 
                placeholder={t("enterProjectName")}
                className="h-11"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">{t("contractDates")}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="contractStartDate" className="text-xs text-gray-500">{tCommon("start")}</Label>
                  <Input 
                    id="contractStartDate" 
                    type="date" 
                    {...register("contractStartDate")}
                    className="h-10"
                  />
                  {errors.contractStartDate && <p className="text-red-500 text-xs">{errors.contractStartDate.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contractEndDate" className="text-xs text-gray-500">{tCommon("end")}</Label>
                  <Input 
                    id="contractEndDate" 
                    type="date" 
                    {...register("contractEndDate")}
                    className="h-10"
                  />
                  {errors.contractEndDate && <p className="text-red-500 text-xs">{errors.contractEndDate.message}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">{t("internalDates")}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="internalStartDate" className="text-xs text-gray-500">{tCommon("start")}</Label>
                  <Input 
                    id="internalStartDate" 
                    type="date" 
                    {...register("internalStartDate")}
                    className="h-10"
                  />
                  {errors.internalStartDate && <p className="text-red-500 text-xs">{errors.internalStartDate.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="internalEndDate" className="text-xs text-gray-500">{tCommon("end")}</Label>
                  <Input 
                    id="internalEndDate" 
                    type="date" 
                    {...register("internalEndDate")}
                    className="h-10"
                  />
                  {errors.internalEndDate && <p className="text-red-500 text-xs">{errors.internalEndDate.message}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium text-gray-700">{t("status")}</Label>
              <select
                id="status"
                {...register("status")}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="active">{t("active")}</option>
                <option value="delivered">{t("delivered")}</option>
              </select>
            </div>

            {status === "delivered" && (
              <div className="space-y-2 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2">
                  <Label htmlFor="deliveryDate" className="text-sm font-medium text-amber-800">
                    {t("deliveryDate")}
                  </Label>
                  {deliveryDate && (
                    deliveryDateValidation.isValid ? (
                      <span title={deliveryDateValidation.message}>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </span>
                    ) : (
                      <span title={deliveryDateValidation.message}>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      </span>
                    )
                  )}
                </div>
                <Input 
                  id="deliveryDate" 
                  type="date" 
                  {...register("deliveryDate")}
                  className="h-10 bg-white"
                />
                {errors.deliveryDate && <p className="text-red-500 text-xs">{errors.deliveryDate.message}</p>}
                {deliveryDate && !deliveryDateValidation.isValid && !errors.deliveryDate && (
                  <p className="text-amber-600 text-xs">{deliveryDateValidation.message}</p>
                )}
              </div>
            )}

            <DialogFooter className="pt-4 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={closeProjectModal} className="flex-1 sm:flex-none">
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isPending} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700">
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingProject ? t("updateProject") : t("createProject")}
              </Button>
            </DialogFooter>
          </form>
        </DraggableDialogContent>
      </Dialog>
    </>
  );
}
