"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import {
  format,
  addDays,
  startOfDay,
  isSameDay,
  isWeekend,
  getDay,
  nextMonday,
  startOfYear,
  startOfWeek,
  differenceInCalendarDays,
  isBefore,
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronDown, ChevronRight as ChevronRightIcon, User, Filter, Check, X, Share2, AlertCircle, Menu, GripVertical, Search, CalendarDays } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn, isDateHoliday, isEmployeeAbsent, getTeamColorForDate, toDateString } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";

interface Project {
  id: string;
  name: string;
  contractStartDate: string;
  contractEndDate: string;
  internalStartDate: string;
  internalEndDate: string;
  status: string;
  deliveryDate: string | null;
  assignedEmployees: string[];
  sortOrder: string;
}

interface Employee {
  id: string;
  name: string;
  teamColor: string;
  plannedAbsences: string[];
}

interface Holiday {
  id: string;
  name: string;
  date: string;
}

interface Booking {
  id: string;
  date: string;
  projectId: string;
  employeeId: string;
}

interface ShareData {
  shareLink: {
    name: string | null;
    userName: string | null;
    createdAt: string;
  };
  projects: Project[];
  employees: Employee[];
  holidays: Holiday[];
  bookings: Booking[];
}

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
    const daysSincePrevFirstMonday = differenceInCalendarDays(date, prevFirstMonday);
    const weekNum = Math.floor(daysSincePrevFirstMonday / 7) + 1;
    return { week: weekNum, year: year - 1 };
  }

  const daysSinceFirstMonday = differenceInCalendarDays(date, firstMonday);
  const weekNum = Math.floor(daysSinceFirstMonday / 7) + 1;
  return { week: weekNum, year };
};

const useWindowSize = () => {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;

    const updateSize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };

    const debouncedUpdate = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(updateSize, 50);
    };

    const handleOrientationChange = () => {
      setTimeout(updateSize, 100);
    };

    updateSize();
    window.addEventListener("resize", debouncedUpdate);
    window.addEventListener("orientationchange", handleOrientationChange);

    return () => {
      clearTimeout(debounceTimer);
      window.removeEventListener("resize", debouncedUpdate);
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, []);

  return size;
};

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;
  const { width, height } = useWindowSize();
  const t = useTranslations("sharePage");
  const tCommon = useTranslations("common");
  const tSidebar = useTranslations("sidebar");

  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);
  const [selectedEmployeeFilters, setSelectedEmployeeFilters] = useState<string[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [customSidebarWidth, setCustomSidebarWidth] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const filterModalRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [filterModalPosition, setFilterModalPosition] = useState({ x: 100, y: 100 });

  const isMobile = width > 0 && width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isLandscape = width > height;

  const defaultSidebarWidth = useMemo(() => {
    if (sidebarCollapsed) return 40;
    if (isMobile) return isLandscape ? 180 : 160;
    if (isTablet) return 200;
    return 250;
  }, [isMobile, isTablet, isLandscape, sidebarCollapsed]);

  const sidebarWidth = sidebarCollapsed ? 40 : (customSidebarWidth ?? defaultSidebarWidth);
  const minSidebarWidth = isMobile ? 120 : 150;
  const maxSidebarWidth = isMobile ? 280 : 400;

  const cellWidth = useMemo(() => {
    if (width === 0) return 44;
    const availableWidth = width - sidebarWidth - 20;
    if (isMobile && !isLandscape) {
      const daysToShow = 5;
      return Math.max(48, Math.floor(availableWidth / daysToShow));
    }
    if (isMobile && isLandscape) {
      const daysToShow = 10;
      return Math.max(40, Math.floor(availableWidth / daysToShow));
    }
    if (isTablet) {
      const daysToShow = isLandscape ? 15 : 8;
      return Math.max(44, Math.floor(availableWidth / daysToShow));
    }
    return 44;
  }, [width, sidebarWidth, isMobile, isTablet, isLandscape]);

  const weeksToShow = useMemo(() => {
    if (width === 0) return 4;
    const availableWidth = width - sidebarWidth - 20;
    const daysVisible = Math.floor(availableWidth / cellWidth);
    const weeks = Math.ceil(daysVisible / 5);
    if (isMobile && !isLandscape) return Math.max(1, Math.min(2, weeks));
    if (isMobile && isLandscape) return Math.max(2, Math.min(4, weeks));
    if (isTablet) return Math.max(2, Math.min(6, weeks));
    return Math.max(4, Math.min(12, weeks));
  }, [width, sidebarWidth, cellWidth, isMobile, isTablet, isLandscape]);

  const rowHeight = isMobile ? 36 : 32;
  const employeeRowHeight = isMobile ? 28 : 24;
  const dateHeaderHeight = isMobile ? 56 : 70;
  const monthRowHeight = isMobile ? 24 : 20;
  const weekRowHeight = isMobile ? 22 : 20;
  const navHeight = isMobile ? 40 : 28;
  const totalHeaderHeight = navHeight + monthRowHeight + weekRowHeight + dateHeaderHeight;

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/public/share/${token}`);
        if (!res.ok) {
          const errorData = await res.json();
          setError(errorData.error || "Failed to load calendar");
          return;
        }
        const shareData = await res.json();
        setData(shareData);
        if (shareData.projects.length > 0) {
          setExpandedProjects(shareData.projects.slice(0, 3).map((p: Project) => p.id));
        }
      } catch (err) {
        setError("Failed to load calendar");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [token]);

  const effectiveToday = useMemo(() => getEffectiveToday(), []);

  const currentWeekStart = useMemo(() => {
    const weekStart = startOfWeek(effectiveToday, { weekStartsOn: 1 });
    return addDays(weekStart, weekOffset * 7);
  }, [effectiveToday, weekOffset]);

  const dates = useMemo(() => {
    const allDates: Date[] = [];
    let current = currentWeekStart;
    const totalDaysNeeded = weeksToShow * 5;
    let attempts = 0;

    while (allDates.length < totalDaysNeeded && attempts < 100) {
      if (!isWeekend(current)) {
        allDates.push(current);
      }
      current = addDays(current, 1);
      attempts++;
    }

    return allDates;
  }, [currentWeekStart, weeksToShow]);

  const dateRange = useMemo(() => {
    if (dates.length === 0) return { start: new Date(), end: new Date() };
    return { start: dates[0], end: dates[dates.length - 1] };
  }, [dates]);

  const toggleEmployeeFilter = useCallback((id: string) => {
    setSelectedEmployeeFilters(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  }, []);

  const toggleProjectExpanded = useCallback((id: string) => {
    setExpandedProjects(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  }, []);

  const goToToday = useCallback(() => {
    setWeekOffset(0);
  }, []);

  const goToPrevWeek = useCallback(() => {
    setWeekOffset(prev => prev - 1);
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekOffset(prev => prev + 1);
  }, []);

  const goToPrevMonth = useCallback(() => {
    setWeekOffset(prev => prev - 4);
  }, []);

  const goToNextMonth = useCallback(() => {
    setWeekOffset(prev => prev + 4);
  }, []);

  const goToDate = useCallback((date: Date) => {
    const effectiveTodayDate = getEffectiveToday();
    const weekStart = startOfWeek(effectiveTodayDate, { weekStartsOn: 1 });
    const targetWeekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weeksDiff = Math.floor(differenceInCalendarDays(targetWeekStart, weekStart) / 7);
    setWeekOffset(weeksDiff);
    setDatePickerOpen(false);
    setSelectedDate(undefined);
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleResizeMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isResizing || !sidebarRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const sidebarRect = sidebarRef.current.getBoundingClientRect();
    const newWidth = clientX - sidebarRect.left;
    setCustomSidebarWidth(Math.max(minSidebarWidth, Math.min(maxSidebarWidth, newWidth)));
  }, [isResizing, minSidebarWidth, maxSidebarWidth]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.addEventListener('touchmove', handleResizeMove);
      document.addEventListener('touchend', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
        document.removeEventListener('touchmove', handleResizeMove);
        document.removeEventListener('touchend', handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  const handleFilterModalDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragOffset.current = {
      x: clientX - filterModalPosition.x,
      y: clientY - filterModalPosition.y,
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const moveX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const moveY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setFilterModalPosition({
        x: Math.max(0, Math.min(width - 320, moveX - dragOffset.current.x)),
        y: Math.max(0, Math.min(height - 400, moveY - dragOffset.current.y)),
      });
    };

    const handleEnd = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);
  }, [filterModalPosition, width, height]);

  const filteredEmployeesForModal = useMemo(() => {
    if (!data) return [];
    if (!filterSearch.trim()) return data.employees;
    const search = filterSearch.toLowerCase();
    return data.employees.filter(e => e.name.toLowerCase().includes(search));
  }, [data, filterSearch]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-950 dark:to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t("loadingCalendar")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-950 dark:to-gray-900 p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">{t("unableToLoad")}</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { shareLink, projects, employees, holidays, bookings } = data;

  const filteredProjects = selectedEmployeeFilters.length > 0
    ? projects.filter((p) =>
      (p.assignedEmployees || []).some((empId) =>
        selectedEmployeeFilters.includes(empId)
      )
    )
    : projects;

  const activeProjects = filteredProjects.filter(p => p.status === "active");
  const deliveredProjects = filteredProjects.filter(p => p.status === "delivered");

  const getProjectDateRange = (project: Project) => {
    const projectDates = [
      project.contractStartDate,
      project.contractEndDate,
      project.internalStartDate,
      project.internalEndDate,
    ].filter(Boolean);

    const minStart = projectDates.reduce((min, d) => (d < min ? d : min), projectDates[0]);
    const maxEnd = projectDates.reduce((max, d) => (d > max ? d : max), projectDates[0]);

    return { minStart, maxEnd };
  };

  const isDateInProjectRange = (date: Date, project: Project) => {
    const { minStart, maxEnd } = getProjectDateRange(project);
    const dateStr = toDateString(date);
    return dateStr >= minStart && dateStr <= maxEnd;
  };

  const hasActiveFilter = selectedEmployeeFilters.length > 0;

  const monthGroups: { month: string; year: number; count: number }[] = [];
  const weekGroups: { week: number; year: number; count: number }[] = [];

  dates.forEach((date, i) => {
    const monthKey = format(date, "MMM");
    const yearNum = date.getFullYear();
    const { week: weekNum, year: weekYear } = getProfessionalWeek(date);

    if (i === 0 || monthGroups[monthGroups.length - 1].month !== monthKey || monthGroups[monthGroups.length - 1].year !== yearNum) {
      monthGroups.push({ month: monthKey, year: yearNum, count: 1 });
    } else {
      monthGroups[monthGroups.length - 1].count++;
    }

    if (i === 0 || weekGroups[weekGroups.length - 1].week !== weekNum || weekGroups[weekGroups.length - 1].year !== weekYear) {
      weekGroups.push({ week: weekNum, year: weekYear, count: 1 });
    } else {
      weekGroups[weekGroups.length - 1].count++;
    }
  });

  return (
    <div className="min-h-screen h-screen flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden touch-pan-x touch-pan-y">
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-3 md:px-4 py-2 md:py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 md:p-1.5 bg-blue-600 rounded-lg">
            <CalendarIcon className="h-4 w-4 md:h-5 md:w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base md:text-xl font-bold text-gray-900 dark:text-white truncate">CrewCalendar</h1>
            <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 truncate">
              {shareLink.userName || "Unknown"}
              {shareLink.name && <span className="ml-1 text-blue-600 dark:text-blue-400">({shareLink.name})</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <Share2 className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />
          <span className="text-[10px] md:text-xs text-gray-500 hidden sm:inline">{tCommon("readOnly")}</span>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden relative">
        <div
          ref={sidebarRef}
          className={cn(
            "bg-white border-r border-gray-200 flex shrink-0 relative",
            !isResizing && "transition-all duration-200"
          )}
          style={{ width: sidebarWidth }}
        >
          {sidebarCollapsed ? (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="h-full flex items-center justify-center hover:bg-gray-50 w-full"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-400" />
            </button>
          ) : (
            <>
              <div className="flex flex-col flex-1 overflow-hidden">
                <div
                  className="flex flex-col border-b border-gray-200 bg-gray-50 shrink-0"
                  style={{ height: totalHeaderHeight }}
                >
                  <div
                    className="flex items-center justify-between border-b border-gray-100 px-2"
                    style={{ height: navHeight }}
                  >
                    <span className="text-[9px] md:text-[10px] text-gray-400 font-medium uppercase tracking-wide">{tSidebar("projects")}</span>
                    {isMobile && (
                      <button
                        onClick={() => setSidebarCollapsed(true)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <X className="h-3 w-3 text-gray-400" />
                      </button>
                    )}
                  </div>

                  <div
                    className="flex items-center justify-center border-b border-gray-100 px-1 md:px-2"
                    style={{ height: monthRowHeight }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilterModalOpen(true)}
                      className={cn(
                        "h-5 text-[9px] md:text-[10px] gap-1 px-1 md:px-2",
                        hasActiveFilter && "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      )}
                    >
                      <Filter className="h-2.5 w-2.5 md:h-3 md:w-3" />
                      <span className="hidden sm:inline">{hasActiveFilter ? `${selectedEmployeeFilters.length}` : tCommon("filter")}</span>
                    </Button>
                  </div>

                  <div
                    className="flex items-center justify-center border-b border-gray-100"
                    style={{ height: weekRowHeight }}
                  >
                    <span className="text-[8px] md:text-[9px] text-gray-400">
                      {activeProjects.length} {tCommon("active")}
                    </span>
                  </div>

                  <div
                    className="flex items-center p-1 md:p-2"
                    style={{ height: dateHeaderHeight }}
                  >
                    <h2 className="text-xs md:text-sm font-semibold text-gray-700">
                      Active ({activeProjects.length})
                    </h2>
                  </div>
                </div>

                <div className="overflow-y-auto flex-1 overscroll-contain">
                  {activeProjects.length === 0 ? (
                    <div className="p-2 md:p-4 text-center text-xs md:text-sm text-gray-400">
                      {hasActiveFilter ? tCommon("noMatch") : tSidebar("noProjects")}
                    </div>
                  ) : (
                    activeProjects.map((project) => {
                      const isExpanded = expandedProjects.includes(project.id);
                      const assignedEmployees = employees.filter(e =>
                        (project.assignedEmployees || []).includes(e.id)
                      );

                      return (
                        <div key={project.id} className="bg-white border-b border-gray-100">
                          <div
                            className="flex items-center gap-1 px-1 md:px-2"
                            style={{ height: rowHeight }}
                          >
                            <button onClick={() => toggleProjectExpanded(project.id)} className="p-0.5 touch-manipulation">
                              {isExpanded ? (
                                <ChevronDown className="h-3 w-3 text-gray-500" />
                              ) : (
                                <ChevronRightIcon className="h-3 w-3 text-gray-500" />
                              )}
                            </button>

                            <span className="font-medium text-[10px] md:text-xs text-gray-800 truncate flex-1">
                              {project.name}
                            </span>
                          </div>

                          {isExpanded && assignedEmployees.map((employee) => (
                            <div
                              key={employee.id}
                              className="flex items-center gap-1 md:gap-2 px-1 md:px-2 pl-4 md:pl-6"
                              style={{ height: employeeRowHeight }}
                            >
                              <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: employee.teamColor }}
                              />
                              <span className="text-[9px] md:text-[11px] text-gray-700 truncate">{employee.name}</span>
                            </div>
                          ))}

                          {isExpanded && assignedEmployees.length === 0 && (
                            <div
                              className="text-[9px] md:text-[10px] text-gray-400 px-1 md:px-2 pl-4 md:pl-6 italic flex items-center"
                              style={{ height: employeeRowHeight }}
                            >
                              {tSidebar("noEmployees")}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                  {deliveredProjects.length > 0 && (
                    <>
                      <div className="px-1 md:px-2 py-1 bg-gray-100 border-y border-gray-200">
                        <h3 className="text-[9px] md:text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                          {tSidebar("delivered")} ({deliveredProjects.length})
                        </h3>
                      </div>
                      {deliveredProjects.map((project) => {
                        const isExpanded = expandedProjects.includes(project.id);
                        const assignedEmployees = employees.filter(e =>
                          (project.assignedEmployees || []).includes(e.id)
                        );

                        return (
                          <div key={project.id} className="bg-amber-50 border-b border-amber-100">
                            <div
                              className="flex items-center gap-1 px-1 md:px-2"
                              style={{ height: rowHeight }}
                            >
                              <button onClick={() => toggleProjectExpanded(project.id)} className="p-0.5 touch-manipulation">
                                {isExpanded ? (
                                  <ChevronDown className="h-3 w-3 text-amber-500" />
                                ) : (
                                  <ChevronRightIcon className="h-3 w-3 text-amber-500" />
                                )}
                              </button>

                              <span className="font-medium text-[10px] md:text-xs text-amber-700 truncate flex-1">
                                {project.name}
                              </span>
                            </div>

                            {isExpanded && assignedEmployees.map((employee) => (
                              <div
                                key={employee.id}
                                className="flex items-center gap-1 md:gap-2 px-1 md:px-2 pl-4 md:pl-6"
                                style={{ height: employeeRowHeight }}
                              >
                                <div
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: employee.teamColor }}
                                />
                                <span className="text-[9px] md:text-[11px] text-amber-600 truncate">{employee.name}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {!sidebarCollapsed && (
            <div
              className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-200 transition-colors flex items-center justify-center group z-10"
              onMouseDown={handleResizeStart}
              onTouchStart={handleResizeStart}
            >
              <div className="w-0.5 h-8 bg-gray-300 group-hover:bg-blue-500 rounded transition-colors" />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto overscroll-contain">
          <div className="flex flex-col select-none" style={{ minWidth: dates.length * cellWidth }}>
            <div className="bg-white border-b sticky top-0 z-10">
              <div
                className="flex items-center justify-between px-1 md:px-2 border-b border-gray-100 bg-gray-50"
                style={{ height: navHeight }}
              >
                <div className="flex items-center gap-1 md:gap-2">
                  {sidebarCollapsed && isMobile && (
                    <button
                      onClick={() => setSidebarCollapsed(false)}
                      className="p-1.5 bg-white rounded border border-gray-200 mr-1"
                    >
                      <Menu className="h-3 w-3 text-gray-500" />
                    </button>
                  )}
                  <div className="flex items-center bg-white rounded border border-gray-200 overflow-hidden">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goToPrevMonth}
                      className="h-6 md:h-7 w-6 md:w-7 p-0 rounded-none hover:bg-gray-100 touch-manipulation"
                    >
                      <ChevronLeft className="h-3 w-3" />
                      <ChevronLeft className="h-3 w-3 -ml-2" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goToPrevWeek}
                      className="h-6 md:h-7 w-6 md:w-7 p-0 rounded-none hover:bg-gray-100 border-l touch-manipulation"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                  </div>

                  <Button
                    variant="default"
                    size="sm"
                    onClick={goToToday}
                    className="h-6 md:h-7 px-2 md:px-3 text-[10px] md:text-xs font-medium bg-blue-600 hover:bg-blue-700 touch-manipulation"
                  >
                    {tCommon("today")}
                  </Button>

                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 md:h-7 w-6 md:w-7 p-0 touch-manipulation"
                      >
                        <CalendarDays className="h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-0" align="center" sideOffset={8}>
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          if (date) {
                            setSelectedDate(date);
                            goToDate(date);
                          }
                        }}
                        initialFocus
                        className="rounded-md border"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <span className="text-[9px] md:text-[10px] text-gray-500 hidden sm:block">
                  {format(dateRange.start, "MMM d")} - {format(dateRange.end, "MMM d")}
                </span>

                <div className="flex items-center bg-white rounded border border-gray-200 overflow-hidden">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToNextWeek}
                    className="h-6 md:h-7 w-6 md:w-7 p-0 rounded-none hover:bg-gray-100 touch-manipulation"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToNextMonth}
                    className="h-6 md:h-7 w-6 md:w-7 p-0 rounded-none hover:bg-gray-100 border-l touch-manipulation"
                  >
                    <ChevronRight className="h-3 w-3" />
                    <ChevronRight className="h-3 w-3 -ml-2" />
                  </Button>
                </div>
              </div>

              <div className="flex" style={{ height: monthRowHeight }}>
                {monthGroups.map((group, i) => (
                  <div
                    key={`month-${i}`}
                    className="shrink-0 text-center text-[9px] md:text-[10px] font-medium border-r bg-slate-100 flex items-center justify-center text-slate-700"
                    style={{ width: cellWidth * group.count }}
                  >
                    {group.month} {isMobile ? `'${String(group.year).slice(-2)}` : group.year}
                  </div>
                ))}
              </div>
              <div className="flex" style={{ height: weekRowHeight }}>
                {weekGroups.map((group, i) => (
                  <div
                    key={`week-${i}`}
                    className="shrink-0 text-center text-[9px] md:text-[10px] border-r bg-slate-50 flex items-center justify-center text-slate-600"
                    style={{ width: cellWidth * group.count }}
                  >
                    W{group.week}
                  </div>
                ))}
              </div>

              <div className="flex" style={{ height: dateHeaderHeight }}>
                {dates.map((date) => {
                  const isToday = isSameDay(date, effectiveToday);
                  const dateStr = toDateString(date);
                  const holiday = isDateHoliday(dateStr, holidays);

                  return (
                    <div
                      key={date.toISOString()}
                      className={cn(
                        "shrink-0 text-center border-r flex flex-col justify-center items-center",
                        isToday && "bg-purple-100",
                        holiday && "bg-red-50"
                      )}
                      style={{ width: cellWidth }}
                    >
                      <div className={cn(
                        "text-sm md:text-base font-semibold",
                        isToday ? "text-purple-700" : "text-gray-800"
                      )}>
                        {format(date, "d")}
                      </div>
                      <div className="text-gray-500 text-[9px] md:text-[10px]">
                        {format(date, "EEE")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              {activeProjects.map((project) => {
                const isExpanded = expandedProjects.includes(project.id);
                const assignedEmployees = employees.filter((e) =>
                  (project.assignedEmployees || []).includes(e.id)
                );

                return (
                  <div key={project.id} className="border-b border-gray-100">
                    <div className="flex">
                      {dates.map((date) => {
                        const isToday = isSameDay(date, effectiveToday);
                        const dateStr = toDateString(date);
                        const holiday = isDateHoliday(dateStr, holidays);
                        const isInProjectRange = isDateInProjectRange(date, project);

                        const isContractStart = project.contractStartDate === dateStr;
                        const isContractEnd = project.contractEndDate === dateStr;
                        const isInternalStart = project.internalStartDate === dateStr;
                        const isInternalEnd = project.internalEndDate === dateStr;
                        const isDeliveryDate = project.deliveryDate === dateStr;

                        const isInContractRange = dateStr >= project.contractStartDate && dateStr <= project.contractEndDate;
                        const isInInternalRange = dateStr >= project.internalStartDate && dateStr <= project.internalEndDate;

                        const dayBookings = bookings.filter(
                          (b) => b.projectId === project.id && b.date === dateStr
                        );
                        const bookingCount = dayBookings.length;

                        const teamColor = getTeamColorForDate(dateStr, project.id, bookings, employees);

                        const getBgColor = () => {
                          if (holiday) return "#FEE2E2";
                          if (isToday) return "#F3E8FF";
                          if (!isInProjectRange) return "#f9fafb";
                          if (bookingCount > 0) return teamColor;
                          return undefined;
                        };

                        const showRangeOverlay = isInContractRange || isInInternalRange;

                        return (
                          <div
                            key={date.toISOString()}
                            className="shrink-0 border-r relative flex items-center justify-center"
                            style={{
                              width: cellWidth,
                              height: rowHeight,
                              backgroundColor: getBgColor(),
                            }}
                          >
                            {showRangeOverlay && !holiday && !isToday && bookingCount === 0 && (
                              <div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                  background: "linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0.1) 100%)",
                                }}
                              />
                            )}

                            {(isContractStart || isInternalStart) && (
                              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500" />
                            )}
                            {(isContractEnd || isInternalEnd) && (
                              <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-blue-500" />
                            )}
                            {isDeliveryDate && (
                              <div className="absolute inset-0 border-2 border-dashed border-green-500 pointer-events-none" />
                            )}

                            {bookingCount > 0 && (
                              <span className="text-[10px] md:text-xs font-bold text-white drop-shadow-sm">
                                {bookingCount}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {isExpanded &&
                      assignedEmployees.map((employee) => (
                        <div key={employee.id} className="flex">
                          {dates.map((date) => {
                            const isToday = isSameDay(date, effectiveToday);
                            const dateStr = toDateString(date);
                            const holiday = isDateHoliday(dateStr, holidays);
                            const isAbsent = isEmployeeAbsent(dateStr, employee);
                            const isInProjectRange = isDateInProjectRange(date, project);

                            const booking = bookings.find(
                              (b) =>
                                b.projectId === project.id &&
                                b.employeeId === employee.id &&
                                b.date === dateStr
                            );

                            const otherBooking = bookings.find(
                              (b) =>
                                b.employeeId === employee.id &&
                                b.projectId !== project.id &&
                                b.date === dateStr
                            );

                            const isBooked = !!booking;

                            const getBgColor = () => {
                              if (holiday) return "#FEE2E2";
                              if (isAbsent) return "#FEF3C7";
                              if (isToday) return "#F3E8FF";
                              if (!isInProjectRange) return "#f9fafb";
                              if (isBooked) return employee.teamColor;
                              if (otherBooking) return "#E5E7EB";
                              return undefined;
                            };

                            return (
                              <div
                                key={date.toISOString()}
                                className="shrink-0 border-r relative flex items-center justify-center"
                                style={{
                                  width: cellWidth,
                                  height: employeeRowHeight,
                                  backgroundColor: getBgColor(),
                                }}
                              >
                                {isBooked && (
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{
                                      backgroundColor: "rgba(255,255,255,0.8)",
                                    }}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                  </div>
                );
              })}

              {deliveredProjects.length > 0 && (
                <div className="flex border-b border-gray-200 bg-gray-100" style={{ height: rowHeight }}>
                  {dates.map((date) => (
                    <div
                      key={date.toISOString()}
                      className="shrink-0 border-r"
                      style={{ width: cellWidth }}
                    />
                  ))}
                </div>
              )}

              {deliveredProjects.map((project) => {
                const isExpanded = expandedProjects.includes(project.id);
                const assignedEmployees = employees.filter((e) =>
                  (project.assignedEmployees || []).includes(e.id)
                );

                return (
                  <div key={project.id} className="border-b border-amber-100">
                    <div className="flex">
                      {dates.map((date) => {
                        const isToday = isSameDay(date, effectiveToday);
                        const dateStr = toDateString(date);
                        const holiday = isDateHoliday(dateStr, holidays);
                        const isInProjectRange = isDateInProjectRange(date, project);

                        const dayBookings = bookings.filter(
                          (b) => b.projectId === project.id && b.date === dateStr
                        );
                        const bookingCount = dayBookings.length;

                        const teamColor = getTeamColorForDate(dateStr, project.id, bookings, employees);

                        const getBgColor = () => {
                          if (holiday) return "#FEE2E2";
                          if (isToday) return "#F3E8FF";
                          if (!isInProjectRange) return "#FFFBEB";
                          if (bookingCount > 0) return teamColor;
                          return "#FEF3C7";
                        };

                        return (
                          <div
                            key={date.toISOString()}
                            className="shrink-0 border-r relative flex items-center justify-center"
                            style={{
                              width: cellWidth,
                              height: rowHeight,
                              backgroundColor: getBgColor(),
                            }}
                          >
                            {bookingCount > 0 && (
                              <span className="text-[10px] md:text-xs font-bold text-white drop-shadow-sm">
                                {bookingCount}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {isExpanded &&
                      assignedEmployees.map((employee) => (
                        <div key={employee.id} className="flex">
                          {dates.map((date) => {
                            const isToday = isSameDay(date, effectiveToday);
                            const dateStr = toDateString(date);
                            const holiday = isDateHoliday(dateStr, holidays);
                            const isAbsent = isEmployeeAbsent(dateStr, employee);
                            const isInProjectRange = isDateInProjectRange(date, project);

                            const booking = bookings.find(
                              (b) =>
                                b.projectId === project.id &&
                                b.employeeId === employee.id &&
                                b.date === dateStr
                            );

                            const isBooked = !!booking;

                            const getBgColor = () => {
                              if (holiday) return "#FEE2E2";
                              if (isAbsent) return "#FEF3C7";
                              if (isToday) return "#F3E8FF";
                              if (!isInProjectRange) return "#FFFBEB";
                              if (isBooked) return employee.teamColor;
                              return "#FEF3C7";
                            };

                            return (
                              <div
                                key={date.toISOString()}
                                className="shrink-0 border-r relative flex items-center justify-center"
                                style={{
                                  width: cellWidth,
                                  height: employeeRowHeight,
                                  backgroundColor: getBgColor(),
                                }}
                              >
                                {isBooked && (
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{
                                      backgroundColor: "rgba(255,255,255,0.8)",
                                    }}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {filterModalOpen && (
          <TooltipProvider delayDuration={0}>
            <div
              ref={filterModalRef}
              className="fixed bg-white rounded-lg shadow-2xl border border-gray-200 z-50 w-80 max-h-[500px] flex flex-col"
              style={{
                left: filterModalPosition.x,
                top: filterModalPosition.y,
              }}
            >
              <div
                className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 rounded-t-lg cursor-move"
                onMouseDown={handleFilterModalDragStart}
                onTouchStart={handleFilterModalDragStart}
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Filter by Employee</span>
                </div>
                <button
                  onClick={() => setFilterModalOpen(false)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>

              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search employees..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
              </div>

              <div className="p-3 border-b flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {employees.length === 0 ? (
                  <div className="text-xs text-gray-400 py-2 text-center w-full">No employees</div>
                ) : (
                  filteredEmployeesForModal.map((employee) => {
                    const isSelected = selectedEmployeeFilters.includes(employee.id);
                    return (
                      <Tooltip key={employee.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => toggleEmployeeFilter(employee.id)}
                            className={cn(
                              "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-all border",
                              isSelected
                                ? "text-white border-transparent shadow-sm"
                                : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
                            )}
                            style={isSelected ? { backgroundColor: employee.teamColor } : undefined}
                          >
                            {!isSelected && (
                              <div
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: employee.teamColor }}
                              />
                            )}
                            <span className="truncate max-w-[100px]">{employee.name}</span>
                            {isSelected && <Check className="h-3 w-3 shrink-0" />}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {employee.name}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })
                )}
              </div>

              <div className="p-3 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {selectedEmployeeFilters.length} selected
                </span>
                <div className="flex gap-2">
                  {hasActiveFilter && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setSelectedEmployeeFilters([])}
                    >
                      Clear all
                    </Button>
                  )}
                  <Button
                    variant="default"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setFilterModalOpen(false)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            </div>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
