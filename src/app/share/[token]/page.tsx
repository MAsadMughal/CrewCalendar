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
  startOfWeek,
  differenceInCalendarDays,
  getISOWeek,
  getISOWeekYear,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Share2,
  AlertCircle,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  X,
  Search,
  Check,
  Maximize2,
  Minimize2,
  Menu
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const CELL_WIDTH = 30;
const ROW_HEIGHT = 30;
const EMPLOYEE_ROW_HEIGHT = 26;
const HEADER_MONTH_HEIGHT = 20;
const HEADER_WEEK_HEIGHT = 20;
const HEADER_DATE_HEIGHT = 32;
const TOTAL_HEADER_HEIGHT = HEADER_MONTH_HEIGHT + HEADER_WEEK_HEIGHT + HEADER_DATE_HEIGHT;

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

const getProfessionalWeek = (date: Date): { week: number; year: number } => {
  return {
    week: getISOWeek(date),
    year: getISOWeekYear(date),
  };
};

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;
  const tCommon = useTranslations("common");

  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [selectedEmployeeFilters, setSelectedEmployeeFilters] = useState<string[]>([]);
  const [filterSearch, setFilterSearch] = useState("");

  const mainScrollRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/public/share/${token}`);
        if (!res.ok) {
          if (res.status === 404) setError("Link not found or expired");
          else setError("Failed to load shared calendar");
          return;
        }
        const shareData = await res.json();
        shareData.projects = shareData.projects.filter((p: Project) => p.status === "active");
        setData(shareData);
        if (shareData.projects.length > 0) {
          setExpandedProjects(shareData.projects.slice(0, 8).map((p: Project) => p.id));
        }
      } catch (err) {
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [token]);

  const effectiveToday = useMemo(() => getEffectiveToday(), []);

  const weeksToShow = 8;
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

  const filteredProjects = useMemo(() => {
    if (!data) return [];
    if (selectedEmployeeFilters.length === 0) return data.projects;
    return data.projects.filter(p =>
      p.assignedEmployees.some(empId => selectedEmployeeFilters.includes(empId))
    );
  }, [data, selectedEmployeeFilters]);

  const toggleProjectExpanded = (id: string) => {
    setExpandedProjects(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const expandAll = () => {
    if (!data) return;
    setExpandedProjects(filteredProjects.map(p => p.id));
  };

  const collapseAll = () => {
    setExpandedProjects([]);
  };

  const isAllExpanded = filteredProjects.length > 0 && expandedProjects.length >= filteredProjects.length;

  const moveWeek = (dir: number) => setWeekOffset(prev => prev + dir);
  const moveMonth = (dir: number) => setWeekOffset(prev => prev + (dir * 4));
  const goToToday = () => setWeekOffset(0);
  const goToDate = (date: Date) => {
    const weekStart = startOfWeek(effectiveToday, { weekStartsOn: 1 });
    const targetWeekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weeksDiff = Math.floor(differenceInCalendarDays(targetWeekStart, weekStart) / 7);
    setWeekOffset(weeksDiff);
    setDatePickerOpen(false);
  };

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      setSidebarWidth(Math.max(40, Math.min(600, e.clientX)));
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500">Connecting to secure calendar...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{error || "Link expired"}</h2>
          <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  const { shareLink, employees, holidays, bookings } = data;

  const monthGroups: { label: string; width: number }[] = [];
  const weekGroups: { label: string; width: number }[] = [];

  dates.forEach((date, i) => {
    const monthKey = format(date, "MMMM yyyy");
    const { week, year } = getProfessionalWeek(date);
    const weekKey = `Week ${week}`;

    if (i === 0 || monthKey !== format(dates[i - 1], "MMMM yyyy")) {
      monthGroups.push({ label: monthKey, width: CELL_WIDTH });
    } else {
      monthGroups[monthGroups.length - 1].width += CELL_WIDTH;
    }

    const prev = i > 0 ? getProfessionalWeek(dates[i - 1]) : null;
    if (i === 0 || week !== prev?.week || year !== prev?.year) {
      weekGroups.push({ label: weekKey, width: CELL_WIDTH });
    } else {
      weekGroups[weekGroups.length - 1].width += CELL_WIDTH;
    }
  });

  const filteredEmployeesForModal = employees.filter(e =>
    e.name.toLowerCase().includes(filterSearch.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden text-slate-900 font-sans">
      <TooltipProvider delayDuration={200}>
        {/* Top Navbar */}
        <header className="h-14 border-b border-slate-200 flex items-center justify-between px-4 shrink-0 bg-white z-[70] relative">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-2 pr-3 border-r border-slate-200 mr-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <CalendarIcon className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-lg font-bold tracking-tight text-slate-800 hidden sm:block">CrewCalendar</h1>
            </div>

            <div className="flex items-center">
              <div className="flex items-center border border-slate-300 rounded-md overflow-hidden bg-white shadow-sm">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => moveMonth(-1)} className="h-8 w-8 rounded-none border-r border-slate-300 hover:bg-slate-50"><ChevronsLeft className="h-4 w-4 text-slate-500" /></Button>
                  </TooltipTrigger>
                  <TooltipContent className="z-[300]">Back 4 weeks</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => moveWeek(-1)} className="h-8 w-8 rounded-none border-r border-slate-300 hover:bg-slate-50"><ChevronLeft className="h-4 w-4 text-slate-500" /></Button>
                  </TooltipTrigger>
                  <TooltipContent className="z-[300]">Previous week</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={goToToday} className="h-8 rounded-none border-r border-slate-300 text-[11px] font-bold px-3 hover:bg-slate-50 text-slate-600">TODAY</Button>
                  </TooltipTrigger>
                  <TooltipContent className="z-[300]">Jump to today</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => moveWeek(1)} className="h-8 w-8 rounded-none border-r border-slate-300 hover:bg-slate-50"><ChevronRight className="h-4 w-4 text-slate-500" /></Button>
                  </TooltipTrigger>
                  <TooltipContent className="z-[300]">Next week</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => moveMonth(1)} className="h-8 w-8 rounded-none hover:bg-slate-50"><ChevronsRight className="h-4 w-4 text-slate-500" /></Button>
                  </TooltipTrigger>
                  <TooltipContent className="z-[300]">Forward 4 weeks</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end mr-1">
              <span className="text-xs font-semibold text-slate-600 leading-none mb-1">{shareLink.userName}</span>
              <span className="text-[10px] text-slate-400 leading-none">{shareLink.name || "Public View"}</span>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-slate-500 h-9 w-9 border border-transparent hover:border-slate-200"><CalendarDays className="h-5 w-5" /></Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 border-none shadow-2xl z-[400]" align="end">
                    <Calendar mode="single" onSelect={(d) => d && goToDate(d)} initialFocus className="rounded-xl" />
                  </PopoverContent>
                </Popover>
              </TooltipTrigger>
              <TooltipContent className="z-[300]">Pick a date</TooltipContent>
            </Tooltip>

          </div>
        </header>

        {/* Outer Scroll Container */}
        <div className="flex-1 overflow-auto custom-scrollbar relative bg-slate-50" ref={mainScrollRef}>
          <div className="flex min-h-full items-start" style={{ width: 'max-content' }}>

            {/* STICKY SIDEBAR (Left) */}
            <div
              ref={sidebarRef}
              className={cn(
                "sticky left-0 z-[60] bg-white border-r border-slate-200 shrink-0 select-none flex flex-col h-full shadow-[5px_0_15px_-5px_rgba(0,0,0,0.05)] transition-[width] duration-300",
                sidebarCollapsed && "w-0 !border-0 overflow-hidden"
              )}
              style={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
            >
              {/* Sidebar Header Row */}
              <div
                className="sticky top-0 z-[61] bg-slate-50/80 backdrop-blur-md border-b border-slate-200 shrink-0 flex items-center justify-between px-3"
                style={{ height: TOTAL_HEADER_HEIGHT }}
              >
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Projects</span>
                  <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded uppercase">{filteredProjects.length} Active</span>
                </div>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={selectedEmployeeFilters.length > 0 ? "default" : "ghost"}
                        size="icon"
                        onClick={() => setFilterModalOpen(true)}
                        className={cn(
                          "h-7 w-7 relative",
                          selectedEmployeeFilters.length > 0 ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-blue-600"
                        )}
                      >
                        <Filter className="h-3.5 w-3.5" />
                        {selectedEmployeeFilters.length > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[7px] font-bold w-2.5 h-2.5 flex items-center justify-center rounded-full border border-white">
                            {selectedEmployeeFilters.length}
                          </span>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="z-[300]">Filter by employees</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-blue-600 transition-colors"
                        onClick={isAllExpanded ? collapseAll : expandAll}
                      >
                        {isAllExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="z-[300]">{isAllExpanded ? "Collapse All" : "Expand All"}</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Project List */}
              <div className="bg-white flex-1">
                {filteredProjects.map(project => {
                  const isExpanded = expandedProjects.includes(project.id);
                  const assigned = employees.filter(e => project.assignedEmployees?.includes(e.id));

                  return (
                    <div key={project.id} className="border-b border-slate-100">
                      <div
                        className="flex items-center h-[30px] px-2 hover:bg-slate-50 cursor-pointer group transition-colors"
                        onClick={() => toggleProjectExpanded(project.id)}
                      >
                        <div className="w-5 flex justify-center shrink-0">
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-blue-600 font-black stroke-[3px]" />
                          ) : (
                            <ChevronRightIcon className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500 transition-transform group-hover:scale-110" />
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 truncate ml-1 leading-none">{project.name}</span>
                      </div>

                      {isExpanded && assigned.map(emp => (
                        <div key={emp.id} className="flex items-center h-[26px] pl-7 pr-2 border-l-2 border-blue-500/10">
                          <div className="w-2 h-2 rounded-full mr-2 shrink-0 ring-1 ring-white shadow-sm" style={{ backgroundColor: emp.teamColor }} />
                          <span className="text-[10px] text-slate-500 font-medium truncate leading-none">{emp.name}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Resize Handle */}
              {!sidebarCollapsed && (
                <div
                  className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400/50 opacity-0 hover:opacity-100 transition-all z-[62] flex items-center justify-center"
                  onMouseDown={handleResizeStart}
                >
                  <div className="w-0.5 h-10 bg-slate-300 rounded-full" />
                </div>
              )}
            </div>

            {/* SCROLLABLE GRID CONTAINER */}
            <div className="flex-1">
              {/* Sticky Grid Headers */}
              <div className="sticky top-0 z-[55] bg-white shadow-sm ring-1 ring-slate-200">
                {/* Month Row */}
                <div className="flex h-[20px] bg-slate-100/80 backdrop-blur-sm border-b border-slate-200">
                  {monthGroups.map((g, i) => (
                    <div key={i} className="flex-none border-r border-white/50 flex items-center justify-center text-[10px] font-black text-slate-500 truncate px-2 tracking-tighter" style={{ width: g.width }}>
                      {g.label.toUpperCase()}
                    </div>
                  ))}
                </div>
                {/* Week Row */}
                <div className="flex h-[20px] bg-slate-50 border-b border-slate-200">
                  {weekGroups.map((g, i) => (
                    <div key={i} className="flex-none border-r border-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-400 uppercase" style={{ width: g.width }}>
                      {g.label}
                    </div>
                  ))}
                </div>
                {/* Date Row */}
                <div className="flex h-[32px] bg-white border-b border-slate-200">
                  {dates.map((date, i) => {
                    const isToday = isSameDay(date, effectiveToday);
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex-none flex items-center justify-center border-r border-slate-100 text-xs font-black relative",
                          isToday ? "bg-blue-50 text-blue-600" : "text-slate-600"
                        )}
                        style={{ width: CELL_WIDTH }}
                      >
                        {format(date, "d")}
                        {isToday && <div className="absolute bottom-1.5 w-1 h-1 bg-blue-600 rounded-full animate-pulse" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Grid Content */}
              <div className="bg-white">
                {filteredProjects.map(project => {
                  const isExpanded = expandedProjects.includes(project.id);
                  const assigned = employees.filter(e => project.assignedEmployees?.includes(e.id));
                  const projectStart = toDateString(parseDate(project.internalStartDate));
                  const projectEnd = toDateString(parseDate(project.internalEndDate));

                  return (
                    <div key={project.id} className="border-b border-slate-100 group/row">
                      {/* Project Row cells */}
                      <div className="flex h-[30px] group-hover/row:bg-slate-50/30 transition-colors">
                        {dates.map((date, i) => {
                          const dateStr = toDateString(date);
                          const isToday = isSameDay(date, effectiveToday);
                          const holiday = isDateHoliday(dateStr, holidays);
                          const teamColor = getTeamColorForDate(dateStr, project.id, bookings, employees);
                          const dayBookings = bookings.filter(b => b.projectId === project.id && b.date === dateStr);
                          const bookingCount = dayBookings.length;

                          const isContractStart = project.contractStartDate === dateStr;
                          const isContractEnd = project.contractEndDate === dateStr;
                          const isInternalStart = project.internalStartDate === dateStr;
                          const isInternalEnd = project.internalEndDate === dateStr;
                          const isDeliveryDate = project.deliveryDate === dateStr;

                          return (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  key={i}
                                  className={cn(
                                    "flex-none border-r border-slate-50 flex items-center justify-center relative",
                                    isToday && "bg-blue-50/10",
                                    holiday && "bg-red-50/40"
                                  )}
                                  style={{
                                    width: CELL_WIDTH,
                                    backgroundColor: bookingCount > 0 ? `${teamColor}20` : undefined
                                  }}
                                >
                                  {bookingCount > 0 && (
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-md ring-2 ring-white z-[2]" style={{ backgroundColor: teamColor }}>
                                      {bookingCount}
                                    </div>
                                  )}
                                  {isContractStart && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500 z-10" />}
                                  {isContractEnd && <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-rose-500 z-10" />}
                                  {isInternalStart && (
                                    <div
                                      className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500 z-10"
                                      style={{ left: isContractStart ? 3 : 0 }}
                                    />
                                  )}
                                  {isInternalEnd && (
                                    <div
                                      className="absolute right-0 top-0 bottom-0 w-[3px] bg-blue-500 z-10"
                                      style={{ right: isContractEnd ? 3 : 0 }}
                                    />
                                  )}
                                  {isDeliveryDate && <div className="absolute inset-0 border-2 border-dashed border-amber-400/50 bg-amber-400/5 pointer-events-none z-10" />}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="z-[300]">
                                <div className="text-[10px] font-medium leading-tight">
                                  <div className="font-bold border-b border-white/20 pb-1 mb-1">{format(date, "EEE, MMM d")}</div>
                                  {bookingCount > 0 && <div>{bookingCount} team members booked</div>}
                                  {holiday && <div className="text-red-400 font-bold">{holiday.name}</div>}
                                  {isContractStart && <div className="text-emerald-400 uppercase">Contract Start</div>}
                                  {isContractEnd && <div className="text-rose-400 uppercase">Contract End</div>}
                                  {isInternalStart && <div className="text-blue-400 uppercase">Internal Start</div>}
                                  {isInternalEnd && <div className="text-blue-400 uppercase">Internal End</div>}
                                  {isDeliveryDate && <div className="text-amber-400 uppercase font-black">Delivery Date</div>}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>

                      {/* Employee Row cells */}
                      {isExpanded && assigned.map(emp => (
                        <div key={emp.id} className="flex h-[26px] hover:bg-slate-50/50 transition-colors">
                          {dates.map((date, i) => {
                            const dateStr = toDateString(date);
                            const isToday = isSameDay(date, effectiveToday);
                            const holiday = isDateHoliday(dateStr, holidays);
                            const isAbsent = isEmployeeAbsent(dateStr, emp);
                            const booking = bookings.find(b => b.projectId === project.id && b.employeeId === emp.id && b.date === dateStr);

                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    key={i}
                                    className={cn(
                                      "flex-none border-r border-slate-50 flex items-center justify-center relative",
                                      isToday && "bg-blue-50/10",
                                      holiday && "bg-red-50/20",
                                      isAbsent && "bg-amber-50/20"
                                    )}
                                    style={{ width: CELL_WIDTH }}
                                  >
                                    {booking && (
                                      <div className="w-3 h-3 rounded-full shadow-sm ring-1 ring-white/20 animate-in fade-in zoom-in" style={{ backgroundColor: emp.teamColor }} />
                                    )}
                                    {isAbsent && !booking && <div className="w-2 h-2 rounded-full bg-amber-400/40 border border-amber-500/20" />}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="z-[300]">
                                  <div className="text-[10px] font-medium leading-tight">
                                    <div className="font-bold border-b border-white/20 pb-1 mb-1">{emp.name} — {format(date, "EEE, MMM d")}</div>
                                    {booking && <div>Booked to {project.name}</div>}
                                    {isAbsent && <div className="text-amber-400">Planned Absence</div>}
                                    {holiday && <div className="text-red-400">{holiday.name}</div>}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
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
        </div>
      </TooltipProvider>

      {/* FILTER MODAL */}
      {filterModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-300">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shadow-sm">
                  <Filter className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-base font-black text-slate-800 tracking-tight uppercase">Filter Team</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setFilterModalOpen(false)} className="h-9 w-9 rounded-full bg-white shadow-sm border border-slate-100 hover:bg-red-50 hover:text-red-500 transition-all">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-6 border-b bg-white">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  placeholder="Find a colleague..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="pl-10 h-12 bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-blue-500 focus-visible:bg-white transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="p-4 gap-2 flex flex-wrap max-h-[350px] overflow-y-auto bg-white custom-scrollbar">
              {filteredEmployeesForModal.length === 0 ? (
                <div className="w-full text-center py-10">
                  <span className="text-slate-400 text-sm font-medium">No results found for "{filterSearch}"</span>
                </div>
              ) : (
                filteredEmployeesForModal.map((emp) => {
                  const isSelected = selectedEmployeeFilters.includes(emp.id);
                  return (
                    <button
                      key={emp.id}
                      onClick={() => {
                        setSelectedEmployeeFilters(prev =>
                          isSelected ? prev.filter(id => id !== emp.id) : [...prev, emp.id]
                        );
                      }}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-2xl text-[11px] font-bold transition-all border shadow-sm",
                        isSelected
                          ? "bg-blue-600 text-white border-blue-700 ring-4 ring-blue-100 scale-[1.02]"
                          : "bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:bg-slate-50"
                      )}
                    >
                      <div className="w-3 h-3 rounded-full border border-white/30" style={{ backgroundColor: emp.teamColor }} />
                      <span className="truncate max-w-[140px] uppercase tracking-tighter">{emp.name}</span>
                      {isSelected && <Check className="h-3 w-3 animate-in fade-in" />}
                    </button>
                  );
                })
              )}
            </div>

            <div className="p-5 bg-slate-50 flex items-center justify-between border-t border-slate-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedEmployeeFilters([])}
                className="text-slate-500 font-bold hover:text-red-500 hover:bg-red-50 transition-all rounded-xl"
              >
                Reset All
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  onClick={() => setFilterModalOpen(false)}
                  className="bg-blue-600 hover:bg-blue-700 px-8 rounded-xl font-black shadow-[0_4px_15px_-4px_rgba(37,99,235,0.4)]"
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 99px;
          border: 2px solid #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in { from { transform: scale(0.9); } to { transform: scale(1); } }
      `}</style>
    </div>
  );
}

function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}
