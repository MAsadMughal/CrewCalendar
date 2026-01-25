"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Trash2, CalendarDays, Loader2 } from "lucide-react";
import { Dialog, DraggableDialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/draggable-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUIStore } from "@/stores/ui-store";
import { useHolidays, useCreateHoliday, useDeleteHoliday } from "@/hooks/use-holidays";
import { holidaySchema, type HolidayFormData } from "@shared/validations";
import { format } from "date-fns";

export function HolidayModal() {
  const { isHolidayModalOpen, closeHolidayModal } = useUIStore();
  const { data: holidays = [] } = useHolidays();
  const createHoliday = useCreateHoliday();
  const deleteHoliday = useDeleteHoliday();
  const t = useTranslations("holidayModal");
  const tCommon = useTranslations("common");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<HolidayFormData>({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = (data: HolidayFormData) => {
    createHoliday.mutate(data, {
      onSuccess: () => reset(),
    });
  };

  return (
    <Dialog open={isHolidayModalOpen} onOpenChange={closeHolidayModal}>
      <DraggableDialogContent className="w-[95vw] max-w-[450px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 bg-gradient-to-r from-rose-600 to-pink-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-white">
                {t("title")}
              </DialogTitle>
              <DialogDescription className="text-rose-100 text-sm">
                {t("description")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="p-6 space-y-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">{t("holidayName")}</Label>
              <Input 
                id="name" 
                {...register("name")} 
                placeholder={t("placeholder")}
                className="h-11"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">{t("dateRange")}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate" className="text-xs text-gray-500">{t("startDate")}</Label>
                  <Input 
                    id="startDate" 
                    type="date" 
                    {...register("startDate")}
                    className="h-10"
                  />
                  {errors.startDate && <p className="text-red-500 text-xs">{errors.startDate.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endDate" className="text-xs text-gray-500">{t("endDate")}</Label>
                  <Input 
                    id="endDate" 
                    type="date" 
                    {...register("endDate")}
                    className="h-10"
                  />
                  {errors.endDate && <p className="text-red-500 text-xs">{errors.endDate.message}</p>}
                </div>
              </div>
              <p className="text-xs text-gray-500">{t("weekendsExcluded")}</p>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 bg-rose-600 hover:bg-rose-700" 
              disabled={createHoliday.isPending}
            >
              {createHoliday.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("addHoliday")}
            </Button>
          </form>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">{t("existingHolidays")}</h4>
            {holidays.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <CalendarDays className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">{t("noHolidays")}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {holidays.map((holiday) => (
                  <div 
                    key={holiday.id} 
                    className="flex items-center justify-between p-3 bg-rose-50 border border-rose-100 rounded-lg group"
                  >
                    <div>
                      <span className="text-sm font-medium text-rose-800">{holiday.name}</span>
                      <span className="text-sm text-rose-600 ml-2">
                        {format(new Date(holiday.date), "MMM d, yyyy")}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteHoliday.mutate(holiday.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeHolidayModal} className="w-full sm:w-auto">
              {tCommon("close")}
            </Button>
          </DialogFooter>
        </div>
      </DraggableDialogContent>
    </Dialog>
  );
}
