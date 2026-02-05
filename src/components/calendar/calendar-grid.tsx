"use client";

import { useMemo, useState, useCallback, memo } from "react";
import {
  format,
  addDays,
  startOfDay,
  isSameDay,
  isWeekend,
  isWithinInterval,
  isBefore,
  isAfter,
  getDay,
  nextMonday,
  getISOWeek,
  getISOWeekYear,
} from "date-fns";
import { enUS, ptBR, da } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Calendar, Home } from "lucide-react";
import type { Project, Employee, Holiday, Booking } from "@shared/schema";
import {
  cn,
  isDateHoliday,
  isEmployeeAbsent,
  getTeamColorForDate,
  toDateString,
} from "@/lib/utils";
import { useLocale } from "@/i18n/provider";
import { useUIStore } from "@/stores/ui-store";
import {
  useCreateBooking,
  useDeleteBooking,
  useBulkCreateBookings,
  useBulkDeleteBookings,
} from "@/hooks/use-bookings";
import { Button } from "@/components/ui/button";
import { useStatsStore } from "@/stores/stats-store";

interface CalendarGridProps {
  projects: Project[];
  employees: Employee[];
  holidays: Holiday[];
  bookings: Booking[];
}

const CELL_WIDTH = 32;
const ROW_HEIGHT = 32;
const EMPLOYEE_ROW_HEIGHT = 24;
const MONTH_ROW_HEIGHT = 20;
const WEEK_ROW_HEIGHT = 20;
const NAV_HEIGHT = 0;
// DATE_HEADER_HEIGHT is computed dynamically based on stats visibility

interface DragState {
  isSelecting: boolean;
  startDate: Date | null;
  endDate: Date | null;
  projectId: string | null;
  employeeId: string | null;
  mode: "book" | "unbook" | null;
}

const dateFnsLocales: Record<string, any> = {
  en: enUS,
  pt: ptBR,
  da: da,
};

// --- Memoized Components ---

interface CalendarCellProps {
  date: Date;
  dateStr: string;
  projectId: string;
  project: Project;
  employeeId: string;
  employeeTeamColor?: string;
  isBooked: boolean;
  otherBooking: Booking | undefined;
  isSelected: boolean;
  isToday: boolean;
  holiday: Holiday | undefined;
  isFriday: boolean;
  isAbsent: boolean;
  inProjectRange: boolean;
  dragMode: "book" | "unbook" | null;
  onMouseDown: (date: Date, isBooked: boolean) => void;
  onMouseEnter: (date: Date) => void;
}

const CalendarCell = memo(({
  date,
  dateStr,
  projectId,
  project,
  employeeId,
  employeeTeamColor,
  isBooked,
  otherBooking,
  isSelected,
  isToday,
  holiday,
  isFriday,
  isAbsent,
  inProjectRange,
  dragMode,
  onMouseDown,
  onMouseEnter,
}: CalendarCellProps) => {
  const isDelivered = project.status === "delivered";
  const canBook = !holiday && !isAbsent && !otherBooking && inProjectRange && !isDelivered;

  const isContractStart = project.contractStartDate === dateStr;
  const isContractEnd = project.contractEndDate === dateStr;
  const isInternalStart = project.internalStartDate === dateStr;
  const isInternalEnd = project.internalEndDate === dateStr;
  const isDeliveryDate = project.deliveryDate === dateStr;

  return (
    <div
      onMouseDown={() => canBook && onMouseDown(date, isBooked)}
      onMouseEnter={() => onMouseEnter(date)}
      className={cn(
        "shrink-0 transition-colors relative",
        isFriday ? "border-r-2 border-gray-300 dark:border-gray-600" : "border-r border-gray-200 dark:border-gray-700",
        canBook && "cursor-pointer",
        holiday && "bg-red-100 dark:bg-red-900/30 cursor-not-allowed",
        isToday && !inProjectRange && "bg-purple-100/60 dark:bg-purple-900/40 border-l border-purple-200/50 dark:border-purple-800/50",
        !inProjectRange && !holiday && !isToday && "bg-gray-100 dark:bg-gray-900 cursor-not-allowed",
        isAbsent && inProjectRange && !holiday && "bg-orange-100 dark:bg-orange-900/30 cursor-not-allowed striped-bg",
        !isBooked && !otherBooking && isToday && !isDelivered && !holiday && "bg-purple-100/60 dark:bg-purple-900/40 border-l border-purple-200/50 dark:border-purple-800/50",
        !inProjectRange && !holiday && !isAbsent && !isToday && "bg-gray-100 dark:bg-gray-900 cursor-not-allowed",
        (isBooked || otherBooking) && "cursor-pointer",
        otherBooking && inProjectRange && "bg-gray-200 dark:bg-gray-700 cursor-not-allowed",
        !isBooked && canBook && !isToday && "hover:bg-blue-50 dark:hover:bg-blue-900/30",
        isSelected && dragMode === "book" && "ring-2 ring-inset ring-blue-500 bg-blue-100 dark:bg-blue-900/50",
        isSelected && dragMode === "unbook" && "ring-2 ring-inset ring-red-500 bg-red-100 dark:bg-red-900/50",
      )}
      style={{
        width: CELL_WIDTH,
        height: EMPLOYEE_ROW_HEIGHT,
        backgroundColor: isBooked && !isSelected ? employeeTeamColor || "#3b82f6" : undefined,
      }}
      title={
        isDelivered ? "Delivered project (Read-only)"
          : holiday ? `Holiday: ${holiday.name}`
            : !inProjectRange ? "Outside project dates"
              : isAbsent ? "Employee absent"
                : otherBooking ? "Booked on another project"
                  : isBooked ? "Drag to unbook range"
                    : "Drag to book range"
      }
    >
      {isContractStart && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500/50 z-[1]" />}
      {isContractEnd && <div className="absolute right-0 top-0 bottom-0 w-1 bg-emerald-500/50 z-[1]" />}
      {isInternalStart && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500/50 z-[1]"
          style={{ left: isContractStart ? 4 : 0 }}
        />
      )}
      {isInternalEnd && (
        <div
          className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500/50 z-[1]"
          style={{ right: isContractEnd ? 4 : 0 }}
        />
      )}
      {isDeliveryDate && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[2]">
          <span className="text-[8px] font-bold text-purple-700/50 leading-none">D</span>
        </div>
      )}
    </div>
  );
});

interface ProjectSummaryCellProps {
  dateStr: string;
  project: Project;
  bookingCount: number;
  totalAssigned: number;
  isToday: boolean;
  holiday: Holiday | undefined;
  isFriday: boolean;
  teamColor: string | undefined;
}

const ProjectSummaryCell = memo(({
  dateStr,
  project,
  bookingCount,
  totalAssigned,
  isToday,
  holiday,
  isFriday,
  teamColor,
}: ProjectSummaryCellProps) => {
  const isContractStart = project.contractStartDate === dateStr;
  const isContractEnd = project.contractEndDate === dateStr;
  const isInternalStart = project.internalStartDate === dateStr;
  const isInternalEnd = project.internalEndDate === dateStr;
  const isDeliveryDate = project.deliveryDate === dateStr;

  const isInContractRange = project.contractStartDate && project.contractEndDate &&
    dateStr >= project.contractStartDate && dateStr <= project.contractEndDate;
  const isInInternalRange = project.internalStartDate && project.internalEndDate &&
    dateStr >= project.internalStartDate && dateStr <= project.internalEndDate;

  const minStart = [project.contractStartDate, project.internalStartDate].filter(Boolean).sort()[0];
  const maxEnd = [project.contractEndDate, project.internalEndDate].filter(Boolean).sort().reverse()[0];
  const isInProjectRange = minStart && maxEnd && dateStr >= minStart && dateStr <= maxEnd;

  const showRangeOverlay = isInContractRange || isInInternalRange;
  const isDelivered = project.status === "delivered";

  return (
    <div
      title={isDelivered ? "Delivered project (Read-only)"
        : holiday ? `Holiday: ${holiday.name}`
          : (isContractStart || isContractEnd || isInternalStart || isInternalEnd || isDeliveryDate)
            ? [
              isContractStart && "Contract Start",
              isContractEnd && "Contract End",
              isInternalStart && "Internal Start",
              isInternalEnd && "Internal End",
              isDeliveryDate && "Delivery Date",
            ].filter(Boolean).join(" & ")
            : !isInProjectRange ? "Outside project dates"
              : "Project Summary"}
      className={cn(
        "shrink-0 relative flex items-center justify-center",
        isFriday ? "border-r-2 border-gray-300 dark:border-gray-600" : "border-r border-gray-200 dark:border-gray-700",
        holiday && "bg-red-100 dark:bg-red-900/30 cursor-not-allowed",
        isToday && !holiday && !isDelivered && "bg-purple-100/60 dark:bg-purple-900/40 border-l border-purple-200/50 dark:border-purple-800/50",
        !isInProjectRange && !holiday && !isToday && "bg-gray-100 dark:bg-gray-800",
      )}
      style={{
        width: CELL_WIDTH,
        height: ROW_HEIGHT,
        backgroundColor: bookingCount > 0 ? teamColor : undefined,
      }}
    >
      {showRangeOverlay && !holiday && !isToday && bookingCount === 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isDelivered
              ? "linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(252, 211, 77, 0.25) 50%, rgba(251, 191, 36, 0.1) 100%)"
              : isInContractRange && isInInternalRange
                ? "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(59, 130, 246, 0.12) 50%, rgba(16, 185, 129, 0.08) 100%)"
                : isInContractRange
                  ? "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.2) 50%, rgba(16, 185, 129, 0.1) 100%)"
                  : "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.2) 50%, rgba(59, 130, 246, 0.1) 100%)",
          }}

        />
      )}
      {isContractStart && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 z-[1]" />}
      {isContractEnd && <div className="absolute right-0 top-0 bottom-0 w-1 bg-emerald-500 z-[1]" />}
      {isInternalStart && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 z-[1]"
          style={{ left: isContractStart ? 4 : 0 }}
        />
      )}
      {isInternalEnd && (
        <div
          className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500 z-[1]"
          style={{ right: isContractEnd ? 4 : 0 }}
        />
      )}
      {isDeliveryDate && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[2]">
          <span className="text-[10px] font-bold text-purple-700 bg-purple-100/80 px-0.5 rounded leading-none border border-purple-300 shadow-sm">
            D
          </span>
        </div>
      )}
      {bookingCount > 0 && (
        <span className="text-[10px] font-bold dark:text-black z-[3] pointer-events-none">
          {bookingCount}
        </span>
      )}
    </div>
  );
});

const CALENDAR_DAYS = 90;
const WEEKDAYS_TO_SHOW = 65;
const DAYS_BEFORE_TODAY = 20;

const getEffectiveToday = () => {
  const realToday = startOfDay(new Date());
  const dayOfWeek = getDay(realToday);
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return nextMonday(realToday);
  }
  return realToday;
};

const getProfessionalWeek = (date: Date): { week: number; year: number } => {
  return {
    week: getISOWeek(date),
    year: getISOWeekYear(date),
  };
};

export function CalendarGrid({
  projects,
  employees,
  holidays,
  bookings,
}: CalendarGridProps) {
  const {
    expandedProjects,
    selectedEmployeeFilters,
    calendarOffset,
    navigateCalendar,
    goToToday,
    goToDate,
  } = useUIStore();

  const createBooking = useCreateBooking();
  const deleteBooking = useDeleteBooking();
  const bulkCreate = useBulkCreateBookings();
  const bulkDelete = useBulkDeleteBookings();
  const { locale } = useLocale();
  const t = useTranslations("calendar");

  const [dragState, setDragState] = useState<DragState>({
    isSelecting: false,
    startDate: null,
    endDate: null,
    projectId: null,
    employeeId: null,
    mode: null,
  });

  const { isStatsVisible } = useStatsStore();

  const DATE_HEADER_HEIGHT = isStatsVisible ? 95 : 35;
  const TOTAL_HEADER_HEIGHT = NAV_HEIGHT + MONTH_ROW_HEIGHT + WEEK_ROW_HEIGHT + DATE_HEADER_HEIGHT;

  const calculatedHeight = useMemo(() => {
    let height = TOTAL_HEADER_HEIGHT;

    // Use the same filtering logic as the rendered list
    const shownActiveProjects = selectedEmployeeFilters.length === 0
      ? projects.filter(p => p.status === "active")
      : projects.filter(p =>
        p.status === "active" &&
        (p.assignedEmployees || []).some(empId => selectedEmployeeFilters.includes(empId))
      );

    const shownDeliveredProjects = projects.filter(p => p.status === "delivered");

    shownActiveProjects.forEach(p => {
      height += ROW_HEIGHT;
      if (expandedProjects.includes(p.id)) {
        height += (p.assignedEmployees?.length || 0) * EMPLOYEE_ROW_HEIGHT;
      }
    });

    if (shownDeliveredProjects.length > 0) {
      height += 29; // Delivered section divider row
      shownDeliveredProjects.forEach(p => {
        height += ROW_HEIGHT;
        if (expandedProjects.includes(p.id)) {
          const assignedCount = (p.assignedEmployees || []).length;
          height += assignedCount > 0 ? assignedCount * EMPLOYEE_ROW_HEIGHT : EMPLOYEE_ROW_HEIGHT;
        }
      });
    }

    // Add a bit of bottom padding to ensure the last row isn't cut off and sticky has room
    return height + 30;
  }, [projects, expandedProjects, selectedEmployeeFilters, TOTAL_HEADER_HEIGHT, isStatsVisible]);

  const effectiveToday = useMemo(() => getEffectiveToday(), []);

  const dates = useMemo(() => {
    let startDate = addDays(effectiveToday, -DAYS_BEFORE_TODAY + calendarOffset);
    const allDates: Date[] = [];
    let current = startDate;
    let attempts = 0;
    while (allDates.length < WEEKDAYS_TO_SHOW && attempts < CALENDAR_DAYS * 2) {
      if (!isWeekend(current)) {
        allDates.push(current);
      }
      current = addDays(current, 1);
      attempts++;
    }
    return allDates;
  }, [calendarOffset, effectiveToday]);

  const today = effectiveToday;

  // --- Optimized Maps ---
  const holidayMap = useMemo(() => {
    const map = new Map<string, Holiday>();
    holidays.forEach(h => map.set(h.date, h));
    return map;
  }, [holidays]);

  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach(e => map.set(e.id, e));
    return map;
  }, [employees]);

  const bookingMap = useMemo(() => {
    const map = new Map<string, Booking[]>();
    bookings.forEach(b => {
      const key = `${b.date}:${b.projectId}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    });
    return map;
  }, [bookings]);

  const employeeBookingMap = useMemo(() => {
    const map = new Map<string, Booking>();
    bookings.forEach(b => {
      const key = `${b.date}:${b.employeeId}`;
      map.set(key, b);
    });
    return map;
  }, [bookings]);

  const getProjectDateRange = useCallback((project: Project) => {
    const pDates = [
      project.contractStartDate,
      project.contractEndDate,
      project.internalStartDate,
      project.internalEndDate,
    ].filter(Boolean);
    if (pDates.length === 0) return { minStart: "9999-12-31", maxEnd: "0000-01-01" };
    const minStart = pDates.reduce((min, d) => (d < min ? d : min), pDates[0]);
    const maxEnd = pDates.reduce((max, d) => (d > max ? d : max), pDates[0]);
    return { minStart, maxEnd };
  }, []);

  const isDateInProjectRange = useCallback((date: Date, project: Project) => {
    const { minStart, maxEnd } = getProjectDateRange(project);
    const dateStr = toDateString(date);
    return dateStr >= minStart && dateStr <= maxEnd;
  }, [getProjectDateRange]);

  const getSelectionRange = useCallback((): Date[] => {
    if (!dragState.startDate || !dragState.endDate) return [];
    const start = isBefore(dragState.startDate, dragState.endDate) ? dragState.startDate : dragState.endDate;
    const end = isBefore(dragState.startDate, dragState.endDate) ? dragState.endDate : dragState.startDate;
    const range: Date[] = [];
    let current = start;
    while (!isAfter(current, end)) {
      range.push(current);
      current = addDays(current, 1);
    }
    return range;
  }, [dragState.startDate, dragState.endDate]);

  const isInSelection = useCallback((date: Date, projectId: string, employeeId: string): boolean => {
    if (!dragState.isSelecting || dragState.projectId !== projectId || dragState.employeeId !== employeeId) return false;
    const range = getSelectionRange();
    return range.some((d) => isSameDay(d, date));
  }, [dragState.isSelecting, dragState.projectId, dragState.employeeId, getSelectionRange]);

  const handleMouseDown = useCallback((date: Date, projectId: string, employeeId: string, isBooked: boolean, project: Project) => {
    if (project.status === "delivered") return;
    const dateStr = toDateString(date);
    if (holidayMap.has(dateStr)) return;
    const employee = employeeMap.get(employeeId);
    if (employee && isEmployeeAbsent(dateStr, employee)) return;
    if (!isDateInProjectRange(date, project)) return;
    const otherBooking = employeeBookingMap.get(`${dateStr}:${employeeId}`);
    if (otherBooking && otherBooking.projectId !== projectId) return;

    setDragState({
      isSelecting: true,
      startDate: date,
      endDate: date,
      projectId,
      employeeId,
      mode: isBooked ? "unbook" : "book",
    });
  }, [holidayMap, employeeMap, employeeBookingMap, isDateInProjectRange]);

  const handleMouseEnter = useCallback((date: Date, projectId: string, employeeId: string) => {
    if (!dragState.isSelecting || dragState.projectId !== projectId || dragState.employeeId !== employeeId) return;
    setDragState((prev) => ({ ...prev, endDate: date }));
  }, [dragState.isSelecting, dragState.projectId, dragState.employeeId]);

  const handleMouseUp = useCallback(() => {
    if (!dragState.isSelecting || !dragState.startDate || !dragState.projectId || !dragState.employeeId) {
      setDragState({ isSelecting: false, startDate: null, endDate: null, projectId: null, employeeId: null, mode: null });
      return;
    }

    const range = getSelectionRange();
    const project = projects.find((p) => p.id === dragState.projectId);
    if (!project) return;

    const validDates = range.filter((date) => {
      const dateStr = toDateString(date);
      if (holidayMap.has(dateStr)) return false;
      const employee = employeeMap.get(dragState.employeeId!);
      if (employee && isEmployeeAbsent(dateStr, employee)) return false;
      if (!isDateInProjectRange(date, project)) return false;
      const otherBooking = employeeBookingMap.get(`${dateStr}:${dragState.employeeId}`);
      if (otherBooking && otherBooking.projectId !== dragState.projectId) return false;
      return true;
    });

    if (validDates.length === 0) {
      setDragState({ isSelecting: false, startDate: null, endDate: null, projectId: null, employeeId: null, mode: null });
      return;
    }

    if (dragState.mode === "book") {
      const datesToBook = validDates.filter((date) => {
        const dateStr = toDateString(date);
        const booking = bookings.find(b => b.employeeId === dragState.employeeId && b.projectId === dragState.projectId && b.date === dateStr);
        return !booking;
      });
      if (datesToBook.length > 0) {
        bulkCreate.mutate({ dates: datesToBook, projectId: dragState.projectId!, employeeId: dragState.employeeId! });
      }
    } else {
      const bookingIdsToDelete = validDates
        .map((date) => {
          const dateStr = toDateString(date);
          const booking = bookings.find(b => b.employeeId === dragState.employeeId && b.projectId === dragState.projectId && b.date === dateStr);
          return booking?.id;
        })
        .filter(Boolean) as string[];
      if (bookingIdsToDelete.length > 0) {
        bulkDelete.mutate(bookingIdsToDelete);
      }
    }

    setDragState({ isSelecting: false, startDate: null, endDate: null, projectId: null, employeeId: null, mode: null });
  }, [dragState, projects, holidays, employees, bookings, bulkCreate, bulkDelete, getSelectionRange, holidayMap, employeeMap, employeeBookingMap, isDateInProjectRange]);

  const getDailyMetrics = useCallback((date: Date) => {
    const dateStr = toDateString(date);
    const activeProjects = projects.filter((p) => p.status === "active");
    const activeProjectIds = new Set(activeProjects.map(p => p.id));

    let bookedCount = 0;
    const bookedEmployeeIds = new Set<string>();
    bookings.forEach(b => {
      if (b.date === dateStr && activeProjectIds.has(b.projectId)) {
        bookedCount++;
        bookedEmployeeIds.add(b.employeeId);
      }
    });

    const allAssignedEmployeeIds = new Set<string>();
    activeProjects.forEach(p => {
      (p.assignedEmployees || []).forEach(empId => allAssignedEmployeeIds.add(empId));
    });

    const absentCount = employees.filter(e =>
      allAssignedEmployeeIds.has(e.id) && isEmployeeAbsent(dateStr, e)
    ).length;

    const unassignedCount = Array.from(allAssignedEmployeeIds).filter(empId => {
      const emp = employeeMap.get(empId);
      return !bookedEmployeeIds.has(empId) && !(emp && isEmployeeAbsent(dateStr, emp));
    }).length;

    return { bookedCount, absentCount, unassignedCount };
  }, [projects, bookings, employees, employeeMap]);

  return (
    <div
      className="flex flex-col select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        minWidth: dates.length * CELL_WIDTH,
        width: "fit-content",
        height: calculatedHeight,
        minHeight: "100vh"
      }}
    >
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-30">
        {(() => {
          const monthGroups: any[] = [];
          const weekGroups: any[] = [];
          dates.forEach((date, i) => {
            const mKey = format(date, "MMM", { locale: dateFnsLocales[locale] });
            const yNum = date.getFullYear();
            const { week: wNum, year: wYear } = getProfessionalWeek(date);
            if (i === 0 || monthGroups[monthGroups.length - 1].month !== mKey || monthGroups[monthGroups.length - 1].year !== yNum) {
              monthGroups.push({ month: mKey, year: yNum, count: 1 });
            } else { monthGroups[monthGroups.length - 1].count++; }
            if (i === 0 || weekGroups[weekGroups.length - 1].week !== wNum || weekGroups[weekGroups.length - 1].year !== wYear) {
              weekGroups.push({ week: wNum, year: wYear, count: 1 });
            } else { weekGroups[weekGroups.length - 1].count++; }
          });
          return (
            <>
              <div className="flex" style={{ height: MONTH_ROW_HEIGHT }}>
                {monthGroups.map((g, i) => (
                  <div key={i} className="shrink-0 text-center text-[10px] font-medium border-r border-gray-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-700 flex items-center justify-center text-slate-700 dark:text-gray-300" style={{ width: CELL_WIDTH * g.count }}>
                    {g.month} {g.year}
                  </div>
                ))}
              </div>
              <div className="flex" style={{ height: WEEK_ROW_HEIGHT }}>
                {weekGroups.map((g, i) => (
                  <div key={i} className="shrink-0 text-center text-[10px] border-r border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 flex items-center justify-center text-slate-600 dark:text-gray-400" style={{ width: CELL_WIDTH * g.count }}>
                    {t("weekNumber")} {g.week}
                  </div>
                ))}
              </div>
            </>
          );
        })()}

        <div className="flex" style={{ height: DATE_HEADER_HEIGHT }}>
          {dates.map((date) => {
            const dateStr = toDateString(date);
            const metrics = getDailyMetrics(date);
            const isToday = isSameDay(date, today);
            return (
              <div key={dateStr} className={cn("shrink-0 text-center text-xs flex flex-col justify-start pt-1 bg-white dark:bg-gray-800", getDay(date) === 5 ? "border-r-2 border-gray-300 dark:border-gray-600" : "border-r border-gray-200 dark:border-gray-700", isToday && "bg-purple-100/60 dark:bg-purple-900/40 border-l border-purple-200/50 dark:border-purple-800/50", holidayMap.has(dateStr) && "bg-red-50 dark:bg-red-900/30")} style={{ width: CELL_WIDTH }}>
                <div className={cn("text-sm font-bold leading-none mt-0.5", isToday ? "text-purple-700 dark:text-purple-400" : "text-gray-900 dark:text-gray-100")}>{format(date, "d")}</div>
                {isStatsVisible && (
                  <div className="flex flex-col mt-2 border-t border-gray-200 dark:border-gray-700 w-full">
                    <div className="h-[18px] border-b border-gray-100 dark:border-gray-800 flex items-center justify-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="bg-emerald-50 dark:bg-emerald-900/30 px-1 rounded min-w-[16px] text-center leading-none">{metrics.bookedCount}</span>
                    </div>
                    <div className="h-[18px] border-b border-gray-100 dark:border-gray-800 flex items-center justify-center text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      <span className="bg-amber-50 dark:bg-amber-900/30 px-1 rounded min-w-[16px] text-center leading-none">{metrics.absentCount}</span>
                    </div>
                    <div className="h-[18px] border-b border-gray-100 dark:border-gray-800 flex items-center justify-center text-[10px] font-bold text-sky-600 dark:text-sky-400">
                      <span className="bg-sky-50 dark:bg-sky-900/30 px-1 rounded min-w-[16px] text-center leading-none">{metrics.unassignedCount}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative">
        {projects
          .filter(p => p.status === "active")
          .map(project => {
            const isExpanded = expandedProjects.includes(project.id);
            const assignedEmployees = employees.filter(e => (project.assignedEmployees || []).includes(e.id));
            return (
              <div key={project.id} className="border-b border-gray-100 dark:border-gray-700">
                <div className="flex">
                  {dates.map(date => {
                    const dateStr = toDateString(date);
                    return (
                      <ProjectSummaryCell
                        key={dateStr}
                        dateStr={dateStr}
                        project={project}
                        bookingCount={(bookingMap.get(`${dateStr}:${project.id}`) || []).length}
                        totalAssigned={assignedEmployees.length}
                        isToday={isSameDay(date, today)}
                        holiday={holidayMap.get(dateStr)}
                        isFriday={getDay(date) === 5}
                        teamColor={getTeamColorForDate(dateStr, project.id, bookings, employees)}
                      />
                    );
                  })}
                </div>
                {isExpanded && assignedEmployees.map(employee => (
                  <div key={employee.id} className="flex">
                    {dates.map(date => {
                      const dateStr = toDateString(date);
                      const booking = bookings.find(b => b.employeeId === employee.id && b.projectId === project.id && b.date === dateStr);
                      const otherBooking = employeeBookingMap.get(`${dateStr}:${employee.id}`);
                      return (
                        <CalendarCell
                          key={dateStr}
                          date={date}
                          dateStr={dateStr}
                          projectId={project.id}
                          project={project}
                          employeeId={employee.id}
                          employeeTeamColor={employee.teamColor}
                          isBooked={!!booking}
                          otherBooking={otherBooking && otherBooking.projectId !== project.id ? otherBooking : undefined}
                          isSelected={isInSelection(date, project.id, employee.id)}
                          isToday={isSameDay(date, today)}
                          holiday={holidayMap.get(dateStr)}
                          isFriday={getDay(date) === 5}
                          isAbsent={isEmployeeAbsent(dateStr, employee)}
                          inProjectRange={isDateInProjectRange(date, project)}
                          dragMode={dragState.mode}
                          onMouseDown={(d, b) => handleMouseDown(d, project.id, employee.id, b, project)}
                          onMouseEnter={(d) => handleMouseEnter(d, project.id, employee.id)}
                        />
                      );
                    })}
                  </div>
                ))}
                {/* {isExpanded && assignedEmployees.length === 0 && (
                  <div className="flex" style={{ height: EMPLOYEE_ROW_HEIGHT }}>
                    {dates.map((date, i) => (
                      <div
                        key={i}
                        className={cn(
                          "shrink-0",
                          getDay(date) === 5 ? "border-r-2 border-gray-300 dark:border-gray-600" : "border-r border-gray-200 dark:border-gray-700",
                          isSameDay(date, today) && "bg-purple-100/60 dark:bg-purple-900/40",
                          holidayMap.has(toDateString(date)) && "bg-red-50 dark:bg-red-900/30"
                        )}
                        style={{ width: CELL_WIDTH, height: EMPLOYEE_ROW_HEIGHT }}
                      />
                    ))}
                  </div>
                )} */}
              </div>
            );
          })}

        {projects.filter(p => p.status === "delivered").length > 0 && (
          <div className="border-t border-amber-200 dark:border-amber-800">
            <div className="flex bg-amber-100 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800" style={{ height: 29 }}>
              {dates.map((date, i) => (
                <div key={i} className={cn("shrink-0 border-amber-200 dark:border-amber-800", getDay(date) === 5 ? "border-r-2" : "border-r")} style={{ width: CELL_WIDTH, height: 29 }} />
              ))}
            </div>
            {projects.filter(p => p.status === "delivered").map(project => {
              const isExpanded = expandedProjects.includes(project.id);
              const assignedEmployees = employees.filter(e => (project.assignedEmployees || []).includes(e.id));

              // Handle snapshots for delivered projects
              const snapshotHolidays = project.snapshotHolidays ? JSON.parse(project.snapshotHolidays as string) : null;
              const snapshotAbsences = project.snapshotAbsences ? JSON.parse(project.snapshotAbsences as string) : null;

              const getProjectHoliday = (dateStr: string) => {
                if (snapshotHolidays) {
                  return snapshotHolidays.find((h: any) => h.date === dateStr);
                }
                return holidayMap.get(dateStr);
              };

              const isProjectEmployeeAbsent = (dateStr: string, employeeId: string) => {
                if (snapshotAbsences && snapshotAbsences[employeeId]) {
                  return snapshotAbsences[employeeId].includes(dateStr);
                }
                const employee = employeeMap.get(employeeId);
                return employee ? isEmployeeAbsent(dateStr, employee) : false;
              };

              return (
                <div key={project.id} className="border-b border-amber-100 dark:border-amber-900/30 bg-amber-50/30">
                  <div className="flex">
                    {dates.map(date => {
                      const dateStr = toDateString(date);
                      return (
                        <ProjectSummaryCell
                          key={dateStr}
                          dateStr={dateStr}
                          project={project}
                          bookingCount={(bookingMap.get(`${dateStr}:${project.id}`) || []).length}
                          totalAssigned={assignedEmployees.length}
                          isToday={isSameDay(date, today)}
                          holiday={getProjectHoliday(dateStr)}
                          isFriday={getDay(date) === 5}
                          teamColor={getTeamColorForDate(dateStr, project.id, bookings, employees)}
                        />
                      );
                    })}
                  </div>
                  {isExpanded && assignedEmployees.map(employee => (
                    <div key={employee.id} className="flex">
                      {dates.map(date => {
                        const dateStr = toDateString(date);
                        const booking = bookings.find(b => b.employeeId === employee.id && b.projectId === project.id && b.date === dateStr);
                        const otherBooking = employeeBookingMap.get(`${dateStr}:${employee.id}`);
                        return (
                          <CalendarCell
                            key={dateStr}
                            date={date}
                            dateStr={dateStr}
                            projectId={project.id}
                            project={project}
                            employeeId={employee.id}
                            employeeTeamColor={employee.teamColor}
                            isBooked={!!booking}
                            otherBooking={otherBooking && otherBooking.projectId !== project.id ? otherBooking : undefined}
                            isSelected={isInSelection(date, project.id, employee.id)}
                            isToday={isSameDay(date, today)}
                            holiday={getProjectHoliday(dateStr)}
                            isFriday={getDay(date) === 5}
                            isAbsent={isProjectEmployeeAbsent(dateStr, employee.id)}
                            inProjectRange={isDateInProjectRange(date, project)}
                            dragMode={dragState.mode}
                            onMouseDown={(d, b) => handleMouseDown(d, project.id, employee.id, b, project)}
                            onMouseEnter={(d) => handleMouseEnter(d, project.id, employee.id)}
                          />
                        );
                      })}
                    </div>
                  ))}
                  {/* {isExpanded && assignedEmployees.length === 0 && (
                    <div className="flex" style={{ height: EMPLOYEE_ROW_HEIGHT }}>
                      {dates.map((date, i) => (
                        <div
                          key={i}
                          className={cn(
                            "shrink-0 border-amber-100 dark:border-amber-900/30",
                            getDay(date) === 5 ? "border-r-2" : "border-r",
                            isSameDay(date, today) && "bg-purple-100/60 dark:bg-purple-900/40 border-l border-purple-200/50 dark:border-purple-800/50"
                          )}
                          style={{ width: CELL_WIDTH, height: EMPLOYEE_ROW_HEIGHT }}
                        />
                      ))}
                    </div>
                  )} */}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
