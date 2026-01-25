"use client";

import { useMemo, useState, useCallback } from "react";
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
  startOfYear,
  differenceInCalendarDays,
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, Home } from "lucide-react";
import type { Project, Employee, Holiday, Booking } from "@shared/schema";
import {
  cn,
  isDateHoliday,
  isEmployeeAbsent,
  getTeamColorForDate,
  toDateString,
} from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import {
  useCreateBooking,
  useDeleteBooking,
  useBulkCreateBookings,
  useBulkDeleteBookings,
} from "@/hooks/use-bookings";
import { Button } from "@/components/ui/button";

interface CalendarGridProps {
  projects: Project[];
  employees: Employee[];
  holidays: Holiday[];
  bookings: Booking[];
}

const CELL_WIDTH = 40;
const ROW_HEIGHT = 32;
const EMPLOYEE_ROW_HEIGHT = 24;
const DATE_HEADER_HEIGHT = 90;
const MONTH_ROW_HEIGHT = 20;
const WEEK_ROW_HEIGHT = 20;
const NAV_HEIGHT = 28;
const TOTAL_HEADER_HEIGHT =
  NAV_HEIGHT + MONTH_ROW_HEIGHT + WEEK_ROW_HEIGHT + DATE_HEADER_HEIGHT;

interface DragState {
  isSelecting: boolean;
  startDate: Date | null;
  endDate: Date | null;
  projectId: string | null;
  employeeId: string | null;
  mode: "book" | "unbook" | null;
}

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

const getFirstMondayOfYear = (year: number): Date => {
  const jan1 = startOfYear(new Date(year, 0, 1));
  const dayOfWeek = getDay(jan1);
  if (dayOfWeek === 1) return jan1;
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  return addDays(jan1, daysUntilMonday);
};

const getProfessionalWeek = (date: Date): { week: number; year: number } => {
  const year = date.getFullYear();
  const firstMonday = getFirstMondayOfYear(year);

  if (isBefore(date, firstMonday)) {
    const prevFirstMonday = getFirstMondayOfYear(year - 1);
    const daysSincePrevFirstMonday = differenceInCalendarDays(
      date,
      prevFirstMonday,
    );
    const weekNum = Math.floor(daysSincePrevFirstMonday / 7) + 1;
    return { week: weekNum, year: year - 1 };
  }

  const daysSinceFirstMonday = differenceInCalendarDays(date, firstMonday);
  const weekNum = Math.floor(daysSinceFirstMonday / 7) + 1;
  return { week: weekNum, year };
};

export function CalendarGrid({
  projects,
  employees,
  holidays,
  bookings,
}: CalendarGridProps) {
  const {
    expandedProjects,
    calendarOffset,
    navigateCalendar,
    goToToday,
    goToDate,
  } = useUIStore();
  const createBooking = useCreateBooking();
  const deleteBooking = useDeleteBooking();
  const bulkCreate = useBulkCreateBookings();
  const bulkDelete = useBulkDeleteBookings();

  const [dragState, setDragState] = useState<DragState>({
    isSelecting: false,
    startDate: null,
    endDate: null,
    projectId: null,
    employeeId: null,
    mode: null,
  });

  const effectiveToday = useMemo(() => getEffectiveToday(), []);

  const dates = useMemo(() => {
    let startDate = addDays(
      effectiveToday,
      -DAYS_BEFORE_TODAY + calendarOffset,
    );
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

  const dateRange = useMemo(() => {
    if (dates.length === 0) return { start: new Date(), end: new Date() };
    return { start: dates[0], end: dates[dates.length - 1] };
  }, [dates]);

  const today = effectiveToday;

  const getProjectDateRange = (project: Project) => {
    // Compare date strings directly to avoid timezone issues
    const dates = [
      project.contractStartDate,
      project.contractEndDate,
      project.internalStartDate,
      project.internalEndDate,
    ].filter(Boolean);

    const minStart = dates.reduce((min, d) => (d < min ? d : min), dates[0]);
    const maxEnd = dates.reduce((max, d) => (d > max ? d : max), dates[0]);

    return { minStart, maxEnd };
  };

  const isDateInProjectRange = (date: Date, project: Project) => {
    const { minStart, maxEnd } = getProjectDateRange(project);
    const dateStr = toDateString(date);
    return dateStr >= minStart && dateStr <= maxEnd;
  };

  const getDailyMetrics = (date: Date) => {
    const dateStr = toDateString(date);
    
    const activeProjects = projects.filter((p) => p.status === "active");
    
    const bookedCount = bookings.filter((b) => {
      const project = activeProjects.find((p) => p.id === b.projectId);
      return b.date === dateStr && project;
    }).length;
    
    const absentCount = employees.filter((e) =>
      isEmployeeAbsent(dateStr, e),
    ).length;
    
    const bookedEmployeeIds = new Set(
      bookings.filter((b) => {
        const project = activeProjects.find((p) => p.id === b.projectId);
        return b.date === dateStr && project;
      }).map((b) => b.employeeId)
    );
    
    const allAssignedEmployeeIds = new Set<string>();
    activeProjects.forEach((p) => {
      (p.assignedEmployees || []).forEach((empId) => {
        allAssignedEmployeeIds.add(empId);
      });
    });
    
    const unassignedCount = Array.from(allAssignedEmployeeIds).filter(
      (empId) => !bookedEmployeeIds.has(empId) && !employees.find((e) => e.id === empId && isEmployeeAbsent(dateStr, e))
    ).length;
    
    return { bookedCount, absentCount, unassignedCount };
  };

  const getSelectionRange = (): Date[] => {
    if (!dragState.startDate || !dragState.endDate) return [];

    const start = isBefore(dragState.startDate, dragState.endDate)
      ? dragState.startDate
      : dragState.endDate;
    const end = isBefore(dragState.startDate, dragState.endDate)
      ? dragState.endDate
      : dragState.startDate;

    const range: Date[] = [];
    let current = start;
    while (!isAfter(current, end)) {
      range.push(current);
      current = addDays(current, 1);
    }
    return range;
  };

  const isInSelection = (
    date: Date,
    projectId: string,
    employeeId: string,
  ): boolean => {
    if (
      !dragState.isSelecting ||
      dragState.projectId !== projectId ||
      dragState.employeeId !== employeeId
    ) {
      return false;
    }
    const range = getSelectionRange();
    return range.some((d) => isSameDay(d, date));
  };

  const handleMouseDown = (
    date: Date,
    projectId: string,
    employeeId: string,
    isBooked: boolean,
    project: Project,
  ) => {
    if (project.status === "delivered") return;

    const dateStr = toDateString(date);
    const holiday = isDateHoliday(dateStr, holidays);
    if (holiday) return;

    const employee = employees.find((e) => e.id === employeeId);
    if (employee && isEmployeeAbsent(dateStr, employee)) return;

    if (!isDateInProjectRange(date, project)) return;

    const otherBooking = bookings.find(
      (b) =>
        b.employeeId === employeeId &&
        b.projectId !== projectId &&
        b.date === dateStr,
    );
    if (otherBooking) return;

    setDragState({
      isSelecting: true,
      startDate: date,
      endDate: date,
      projectId,
      employeeId,
      mode: isBooked ? "unbook" : "book",
    });
  };

  const handleMouseEnter = (
    date: Date,
    projectId: string,
    employeeId: string,
  ) => {
    if (
      !dragState.isSelecting ||
      dragState.projectId !== projectId ||
      dragState.employeeId !== employeeId
    ) {
      return;
    }
    setDragState((prev) => ({ ...prev, endDate: date }));
  };

  const handleMouseUp = useCallback(() => {
    if (
      !dragState.isSelecting ||
      !dragState.startDate ||
      !dragState.projectId ||
      !dragState.employeeId
    ) {
      setDragState({
        isSelecting: false,
        startDate: null,
        endDate: null,
        projectId: null,
        employeeId: null,
        mode: null,
      });
      return;
    }

    const range = getSelectionRange();
    const project = projects.find((p) => p.id === dragState.projectId);
    if (!project) return;

    const validDates = range.filter((date) => {
      const dateStr = toDateString(date);
      const holiday = isDateHoliday(dateStr, holidays);
      if (holiday) return false;

      const employee = employees.find((e) => e.id === dragState.employeeId);
      if (employee && isEmployeeAbsent(dateStr, employee)) return false;

      if (!isDateInProjectRange(date, project)) return false;

      const otherBooking = bookings.find(
        (b) =>
          b.employeeId === dragState.employeeId &&
          b.projectId !== dragState.projectId &&
          b.date === dateStr,
      );
      if (otherBooking) return false;

      return true;
    });

    if (validDates.length === 0) {
      setDragState({
        isSelecting: false,
        startDate: null,
        endDate: null,
        projectId: null,
        employeeId: null,
        mode: null,
      });
      return;
    }

    if (dragState.mode === "book") {
      const datesToBook = validDates.filter((date) => {
        const dateStr = toDateString(date);
        const existing = bookings.find(
          (b) =>
            b.employeeId === dragState.employeeId &&
            b.projectId === dragState.projectId &&
            b.date === dateStr,
        );
        return !existing;
      });

      if (datesToBook.length > 0) {
        bulkCreate.mutate({
          dates: datesToBook,
          projectId: dragState.projectId,
          employeeId: dragState.employeeId,
        });
      }
    } else {
      const bookingIdsToDelete = validDates
        .map((date) => {
          const dateStr = toDateString(date);
          const booking = bookings.find(
            (b) =>
              b.employeeId === dragState.employeeId &&
              b.projectId === dragState.projectId &&
              b.date === dateStr,
          );
          return booking?.id;
        })
        .filter(Boolean) as string[];

      if (bookingIdsToDelete.length > 0) {
        bulkDelete.mutate(bookingIdsToDelete);
      }
    }

    setDragState({
      isSelecting: false,
      startDate: null,
      endDate: null,
      projectId: null,
      employeeId: null,
      mode: null,
    });
  }, [
    dragState,
    bookings,
    employees,
    holidays,
    projects,
    bulkCreate,
    bulkDelete,
  ]);

  return (
    <div
      className="flex flex-col select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-10">
        <div
          className="flex items-center justify-between px-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
          style={{ height: NAV_HEIGHT }}
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 p-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateCalendar(-7)}
                className="h-4 w-5 p-0 text-[10px] font-medium hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                title="Previous week"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateCalendar(-30)}
                className="h-4 w-6 p-0 text-[10px] font-medium hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                title="Previous month"
              >
                <ChevronLeft className="h-3 w-3" />
                <ChevronLeft className="h-3 w-3 -ml-2" />
              </Button>
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={goToToday}
              className="h-5 px-2 text-[10px] font-medium bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Home className="h-3 w-3 mr-1" />
              Today
            </Button>

            <span className="text-[9px] text-gray-500">
              {format(dateRange.start, "MMM d")} -{" "}
              {format(dateRange.end, "MMM d, yyyy")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] text-gray-500">
              {format(dateRange.start, "MMM d")} -{" "}
              {format(dateRange.end, "MMM d, yyyy")}
            </span>

            <Button
              variant="default"
              size="sm"
              onClick={goToToday}
              className="h-5 px-2 text-[10px] font-medium bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Home className="h-3 w-3 mr-1" />
              Today
            </Button>

            <div className="flex items-center gap-0.5 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 p-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateCalendar(7)}
                className="h-4 w-5 p-0 text-[10px] font-medium hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                title="Next week"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateCalendar(30)}
                className="h-4 w-6 p-0 text-[10px] font-medium hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                title="Next month"
              >
                <ChevronRight className="h-3 w-3" />
                <ChevronRight className="h-3 w-3 -ml-2" />
              </Button>
            </div>
          </div>
        </div>

        {(() => {
          const monthGroups: { month: string; year: number; count: number }[] =
            [];
          const weekGroups: { week: number; year: number; count: number }[] =
            [];

          dates.forEach((date, i) => {
            const monthKey = format(date, "MMM");
            const yearNum = date.getFullYear();
            const { week: weekNum, year: weekYear } = getProfessionalWeek(date);

            if (
              i === 0 ||
              monthGroups[monthGroups.length - 1].month !== monthKey ||
              monthGroups[monthGroups.length - 1].year !== yearNum
            ) {
              monthGroups.push({ month: monthKey, year: yearNum, count: 1 });
            } else {
              monthGroups[monthGroups.length - 1].count++;
            }

            if (
              i === 0 ||
              weekGroups[weekGroups.length - 1].week !== weekNum ||
              weekGroups[weekGroups.length - 1].year !== weekYear
            ) {
              weekGroups.push({ week: weekNum, year: weekYear, count: 1 });
            } else {
              weekGroups[weekGroups.length - 1].count++;
            }
          });

          return (
            <>
              <div className="flex" style={{ height: MONTH_ROW_HEIGHT }}>
                {monthGroups.map((group, i) => (
                  <div
                    key={`month-${i}`}
                    className="shrink-0 text-center text-[10px] font-medium border-r border-gray-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-700 flex items-center justify-center text-slate-700 dark:text-gray-300"
                    style={{ width: CELL_WIDTH * group.count }}
                  >
                    {group.month} {group.year}
                  </div>
                ))}
              </div>
              <div className="flex" style={{ height: WEEK_ROW_HEIGHT }}>
                {weekGroups.map((group, i) => (
                  <div
                    key={`week-${i}`}
                    className="shrink-0 text-center text-[10px] border-r border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 flex items-center justify-center text-slate-600 dark:text-gray-400"
                    style={{ width: CELL_WIDTH * group.count }}
                  >
                    W{group.week}
                  </div>
                ))}
              </div>
            </>
          );
        })()}

        <div className="flex" style={{ height: DATE_HEADER_HEIGHT }}>
          {dates.map((date) => {
            const isToday = isSameDay(date, today);
            const dateStr = toDateString(date);
            const holiday = isDateHoliday(dateStr, holidays);
            const metrics = getDailyMetrics(date);

            return (
              <div
                key={date.toISOString()}
                data-today={isToday}
                className={cn(
                  "shrink-0 text-center text-xs border-r border-gray-200 dark:border-gray-700 flex flex-col justify-start pt-1 bg-white dark:bg-gray-800",
                  isToday && "bg-purple-100 dark:bg-purple-900/50",
                  holiday && "bg-red-50 dark:bg-red-900/30",
                )}
                style={{ width: CELL_WIDTH }}
              >
                <div className="text-gray-500 dark:text-gray-400 text-[9px] font-medium uppercase tracking-tight">
                  {format(date, "EEE")}
                </div>
                <div
                  className={cn(
                    "text-base font-bold leading-tight",
                    isToday ? "text-purple-700 dark:text-purple-400" : "text-gray-900 dark:text-gray-100"
                  )}
                >
                  {format(date, "d")}
                </div>
                <div className="space-y-0 text-[8px] leading-tight mt-1">
                  <div className="text-green-600 dark:text-green-400 font-medium">B:{metrics.bookedCount}</div>
                  <div className="text-orange-600 dark:text-orange-400 font-medium">A:{metrics.absentCount}</div>
                  <div className="text-blue-600 dark:text-blue-400 font-medium">U:{metrics.unassignedCount}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        {/* Active projects first, then delivered - matching sidebar order */}
        {projects
          .filter((p) => p.status === "active")
          .map((project) => {
            const isExpanded = expandedProjects.includes(project.id);
            const assignedEmployees = employees.filter((e) =>
              (project.assignedEmployees || []).includes(e.id),
            );
            const { minStart, maxEnd } = getProjectDateRange(project);

            return (
              <div key={project.id} className="border-b border-gray-100">
                <div className="flex">
                  {dates.map((date) => {
                    const isToday = isSameDay(date, today);
                    const dateStr = toDateString(date);
                    const holiday = isDateHoliday(dateStr, holidays);

                    // Compare date strings directly to avoid timezone issues
                    const isContractStart =
                      project.contractStartDate === dateStr;
                    const isContractEnd = project.contractEndDate === dateStr;
                    const isInternalStart =
                      project.internalStartDate === dateStr;
                    const isInternalEnd = project.internalEndDate === dateStr;
                    const isDeliveryDate = project.deliveryDate === dateStr;

                    const isInContractRange =
                      dateStr >= project.contractStartDate &&
                      dateStr <= project.contractEndDate;
                    const isInInternalRange =
                      dateStr >= project.internalStartDate &&
                      dateStr <= project.internalEndDate;
                    const isInProjectRange = isDateInProjectRange(
                      date,
                      project,
                    );
                    const dayBookings = bookings.filter(
                      (b) => b.projectId === project.id && b.date === dateStr,
                    );
                    const bookingCount = dayBookings.length;
                    const totalAssigned = assignedEmployees.length;

                    const getBookingIntensity = () => {
                      if (bookingCount === 0 || totalAssigned === 0) return 0;
                      return Math.min(bookingCount / totalAssigned, 1);
                    };
                    const intensity = getBookingIntensity();

                    const teamColor = getTeamColorForDate(
                      dateStr,
                      project.id,
                      bookings,
                      employees,
                    );

                    const getBgColor = () => {
                      if (bookingCount > 0) return teamColor;
                      return undefined;
                    };

                    const showRangeOverlay =
                      isInContractRange || isInInternalRange;
                    const isDelivered = project.status === "delivered";

                    return (
                      <div
                        key={date.toISOString()}
                        className={cn(
                          "shrink-0 border-r border-gray-200 dark:border-gray-700 relative flex items-center justify-center",
                          holiday && "bg-red-100 dark:bg-red-900/30",
                          isToday && !holiday && "bg-purple-100 dark:bg-purple-900/30",
                          !isInProjectRange && !holiday && !isToday && "bg-gray-100 dark:bg-gray-800",
                        )}
                        style={{
                          width: CELL_WIDTH,
                          height: ROW_HEIGHT,
                          backgroundColor: getBgColor(),
                        }}
                        title={
                          bookingCount > 0
                            ? `${bookingCount}/${totalAssigned} booked`
                            : isInProjectRange
                              ? "No bookings"
                              : "Outside project range"
                        }
                      >
                        {showRangeOverlay &&
                          !holiday &&
                          !isToday &&
                          bookingCount === 0 && (
                            <div
                              className="absolute inset-0 pointer-events-none"
                              style={{
                                background: isDelivered
                                  ? "linear-gradient(135deg, rgba(156, 163, 175, 0.15) 0%, rgba(209, 213, 219, 0.25) 50%, rgba(156, 163, 175, 0.1) 100%)"
                                  : isInContractRange && isInInternalRange
                                    ? "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(59, 130, 246, 0.12) 50%, rgba(16, 185, 129, 0.08) 100%)"
                                    : isInContractRange
                                      ? "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.2) 50%, rgba(16, 185, 129, 0.1) 100%)"
                                      : "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.2) 50%, rgba(59, 130, 246, 0.1) 100%)",
                                backdropFilter: "blur(0.5px)",
                              }}
                            />
                          )}
                        {isContractStart && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                        )}
                        {isContractEnd && (
                          <div className="absolute right-0 top-0 bottom-0 w-1 bg-emerald-500" />
                        )}
                        {isInternalStart && (
                          <div
                            className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"
                            style={{ left: isContractStart ? 4 : 0 }}
                          />
                        )}
                        {isInternalEnd && (
                          <div
                            className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500"
                            style={{ right: isContractEnd ? 4 : 0 }}
                          />
                        )}
                        {isDeliveryDate && (
                          <div className=" flex items-end justify-center pointer-events-none">
                            <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-1 rounded-t leading-none">
                              D
                            </span>
                          </div>
                        )}

                        {bookingCount > 0 && isInProjectRange && (
                          <div className="flex items-center justify-center min-w-[18px] h-[18px] rounded text-[10px] font-bold text-white drop-shadow-sm">
                            {bookingCount}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {isExpanded &&
                  assignedEmployees.map((employee) => (
                    <div key={employee.id} className="flex">
                      {dates.map((date) => {
                        const isToday = isSameDay(date, today);
                        const dateStr = toDateString(date);
                        const holiday = isDateHoliday(dateStr, holidays);
                        const isAbsent = isEmployeeAbsent(dateStr, employee);
                        const inProjectRange = isDateInProjectRange(
                          date,
                          project,
                        );
                        const booking = bookings.find(
                          (b) =>
                            b.employeeId === employee.id &&
                            b.projectId === project.id &&
                            b.date === dateStr,
                        );

                        const otherBooking = bookings.find(
                          (b) =>
                            b.employeeId === employee.id &&
                            b.projectId !== project.id &&
                            b.date === dateStr,
                        );

                        const isSelected = isInSelection(
                          date,
                          project.id,
                          employee.id,
                        );
                        const canBook =
                          !holiday &&
                          !isAbsent &&
                          !otherBooking &&
                          inProjectRange;

                        return (
                          <div
                            key={date.toISOString()}
                            onMouseDown={() =>
                              canBook &&
                              handleMouseDown(
                                date,
                                project.id,
                                employee.id,
                                !!booking,
                                project,
                              )
                            }
                            onMouseEnter={() =>
                              handleMouseEnter(date, project.id, employee.id)
                            }
                            className={cn(
                              "shrink-0 border-r border-gray-200 dark:border-gray-700 transition-colors",
                              canBook && "cursor-pointer",
                              isToday && "bg-purple-50 dark:bg-purple-900/30",
                              holiday && "bg-red-100 dark:bg-red-900/30 cursor-not-allowed",
                              isAbsent &&
                                !holiday &&
                                "bg-orange-100 dark:bg-orange-900/30 cursor-not-allowed striped-bg",
                              !inProjectRange &&
                                !holiday &&
                                !isAbsent &&
                                "bg-gray-100 dark:bg-gray-900 cursor-not-allowed",
                              booking && "cursor-pointer",
                              otherBooking && "bg-gray-200 dark:bg-gray-700 cursor-not-allowed",
                              !booking && canBook && "hover:bg-blue-50 dark:hover:bg-blue-900/30",
                              isSelected &&
                                dragState.mode === "book" &&
                                "ring-2 ring-inset ring-blue-500 bg-blue-100 dark:bg-blue-900/50",
                              isSelected &&
                                dragState.mode === "unbook" &&
                                "ring-2 ring-inset ring-red-500 bg-red-100 dark:bg-red-900/50",
                            )}
                            style={{
                              width: CELL_WIDTH,
                              height: EMPLOYEE_ROW_HEIGHT,
                              backgroundColor:
                                booking && !isSelected
                                  ? employee.teamColor
                                  : undefined,
                            }}
                            title={
                              holiday
                                ? `Holiday: ${holiday.name}`
                                : isAbsent
                                  ? "Employee absent"
                                  : !inProjectRange
                                    ? "Outside project dates"
                                    : otherBooking
                                      ? "Booked on another project"
                                      : booking
                                        ? "Drag to unbook range"
                                        : "Drag to book range"
                            }
                          />
                        );
                      })}
                    </div>
                  ))}

                {isExpanded && assignedEmployees.length === 0 && (
                  <div className="flex">
                    {dates.map((date) => (
                      <div
                        key={date.toISOString()}
                        className="shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                        style={{
                          width: CELL_WIDTH,
                          height: EMPLOYEE_ROW_HEIGHT,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

        {/* Delivered section header bar - matches sidebar */}
        {projects.filter((p) => p.status === "delivered").length > 0 && (
          <div
            className="flex bg-amber-100 dark:bg-amber-900/30 border-y border-amber-200 dark:border-amber-800"
            style={{ height: 28 }}
          >
            {dates.map((date) => (
              <div
                key={date.toISOString()}
                className="shrink-0 border-r border-amber-200 dark:border-amber-800"
                style={{ width: CELL_WIDTH, height: 28 }}
              />
            ))}
          </div>
        )}

        {/* Delivered projects */}
        {projects
          .filter((p) => p.status === "delivered")
          .map((project) => {
            const isExpanded = expandedProjects.includes(project.id);
            const assignedEmployees = employees.filter((e) =>
              (project.assignedEmployees || []).includes(e.id),
            );
            const { minStart, maxEnd } = getProjectDateRange(project);

            return (
              <div
                key={project.id}
                className="border-b border-amber-100 bg-amber-50"
              >
                <div className="flex">
                  {dates.map((date) => {
                    const isToday = isSameDay(date, today);
                    const dateStr = toDateString(date);
                    const holiday = isDateHoliday(dateStr, holidays);

                    const isContractStart =
                      project.contractStartDate === dateStr;
                    const isContractEnd = project.contractEndDate === dateStr;
                    const isInternalStart =
                      project.internalStartDate === dateStr;
                    const isInternalEnd = project.internalEndDate === dateStr;
                    const isDeliveryDate = project.deliveryDate === dateStr;

                    const isInContractRange =
                      dateStr >= project.contractStartDate &&
                      dateStr <= project.contractEndDate;
                    const isInInternalRange =
                      dateStr >= project.internalStartDate &&
                      dateStr <= project.internalEndDate;
                    const isInProjectRange = isDateInProjectRange(
                      date,
                      project,
                    );
                    const dayBookings = bookings.filter(
                      (b) => b.projectId === project.id && b.date === dateStr,
                    );
                    const bookingCount = dayBookings.length;
                    const totalAssigned = assignedEmployees.length;

                    const showRangeOverlay =
                      isInContractRange || isInInternalRange;

                    const teamColor = getTeamColorForDate(
                      dateStr,
                      project.id,
                      bookings,
                      employees,
                    );

                    return (
                      <div
                        key={date.toISOString()}
                        className={cn(
                          "shrink-0 border-r border-gray-200 dark:border-gray-700 relative flex items-center justify-center",
                          holiday && "bg-red-100 dark:bg-red-900/30",
                          isToday && !holiday && "bg-purple-100 dark:bg-purple-900/30",
                          !isInProjectRange && !holiday && !isToday && "bg-gray-100 dark:bg-gray-800",
                        )}
                        style={{
                          width: CELL_WIDTH,
                          height: ROW_HEIGHT,
                          backgroundColor: bookingCount > 0 ? teamColor : undefined,
                        }}
                      >
                        {showRangeOverlay &&
                          !holiday &&
                          !isToday &&
                          bookingCount === 0 && (
                            <div
                              className="absolute inset-0 pointer-events-none"
                              style={{
                                background:
                                  "linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(252, 211, 77, 0.25) 50%, rgba(251, 191, 36, 0.1) 100%)",
                                backdropFilter: "blur(0.5px)",
                              }}
                            />
                          )}
                        {isContractStart && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                        )}
                        {isContractEnd && (
                          <div className="absolute right-0 top-0 bottom-0 w-1 bg-emerald-500" />
                        )}
                        {isInternalStart && (
                          <div
                            className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"
                            style={{ left: isContractStart ? 4 : 0 }}
                          />
                        )}
                        {isInternalEnd && (
                          <div
                            className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500"
                            style={{ right: isContractEnd ? 4 : 0 }}
                          />
                        )}
                        {isDeliveryDate && (
                          <div className="absolute inset-0 flex items-end justify-center">
                            <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-1 rounded-t leading-none">
                              D
                            </span>
                          </div>
                        )}

                        {bookingCount > 0 && isInProjectRange && (
                          <div className="flex items-center justify-center min-w-[18px] h-[18px] rounded text-[10px] font-bold text-white drop-shadow-sm">
                            {bookingCount}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {isExpanded &&
                  assignedEmployees.map((employee) => (
                    <div key={employee.id} className="flex">
                      {dates.map((date) => {
                        const isToday = isSameDay(date, today);
                        const dateStr = toDateString(date);
                        const holiday = isDateHoliday(dateStr, holidays);
                        const isAbsent = isEmployeeAbsent(dateStr, employee);
                        const inProjectRange = isDateInProjectRange(
                          date,
                          project,
                        );
                        const booking = bookings.find(
                          (b) =>
                            b.employeeId === employee.id &&
                            b.projectId === project.id &&
                            b.date === dateStr,
                        );

                        return (
                          <div
                            key={date.toISOString()}
                            className={cn(
                              "shrink-0 border-r border-gray-200 dark:border-gray-700",
                              isToday && "bg-purple-50 dark:bg-purple-900/30",
                              holiday && "bg-red-100 dark:bg-red-900/30",
                              isAbsent && !holiday && "bg-orange-100 dark:bg-orange-900/30",
                              !inProjectRange &&
                                !holiday &&
                                !isAbsent &&
                                "bg-amber-50 dark:bg-amber-900/20",
                            )}
                            style={{
                              width: CELL_WIDTH,
                              height: EMPLOYEE_ROW_HEIGHT,
                              backgroundColor: booking ? employee.teamColor : undefined,
                            }}
                          />
                        );
                      })}
                    </div>
                  ))}

                {isExpanded && assignedEmployees.length === 0 && (
                  <div className="flex">
                    {dates.map((date) => (
                      <div
                        key={date.toISOString()}
                        className="shrink-0 border-r border-gray-200 dark:border-gray-700 bg-amber-50 dark:bg-amber-900/20"
                        style={{
                          width: CELL_WIDTH,
                          height: EMPLOYEE_ROW_HEIGHT,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
