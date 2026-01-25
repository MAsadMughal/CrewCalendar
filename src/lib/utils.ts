import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isWeekend, addDays } from "date-fns";
import type { Employee, Booking, Holiday } from "@shared/schema";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayString(): string {
  return toDateString(new Date());
}

export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function formatDateString(dateStr: string, formatStr: string = "MMM dd, yyyy"): string {
  return format(parseDateString(dateStr), formatStr);
}

export function isDateStringWeekend(dateStr: string): boolean {
  return isWeekend(parseDateString(dateStr));
}

export function isDateHoliday(dateStr: string, holidays: Holiday[]): Holiday | undefined {
  return holidays.find(h => h.date === dateStr);
}

export function isEmployeeAbsent(dateStr: string, employee: Employee): boolean {
  return (employee.plannedAbsences || []).includes(dateStr);
}

export function isEmployeeBookedOnDate(
  dateStr: string,
  employeeId: string,
  bookings: Booking[]
): Booking | undefined {
  return bookings.find(b => 
    b.employeeId === employeeId && b.date === dateStr
  );
}

export function canBookEmployee(
  dateStr: string,
  employee: Employee,
  projectId: string,
  holidays: Holiday[],
  allBookings: Booking[],
  assignedEmployees: string[]
): { canBook: boolean; reason?: string } {
  if (!assignedEmployees.includes(employee.id)) {
    return { canBook: false, reason: "Employee not assigned to this project" };
  }
  
  if (isDateHoliday(dateStr, holidays)) {
    return { canBook: false, reason: "Holiday" };
  }
  
  if (isEmployeeAbsent(dateStr, employee)) {
    return { canBook: false, reason: "Employee is absent" };
  }
  
  const existingBooking = isEmployeeBookedOnDate(dateStr, employee.id, allBookings);
  if (existingBooking && existingBooking.projectId !== projectId) {
    return { canBook: false, reason: "Already booked on another project" };
  }
  
  return { canBook: true };
}

export function getDateStringsBetween(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  let current = parseDateString(startStr);
  const end = parseDateString(endStr);
  
  while (current <= end) {
    dates.push(toDateString(current));
    current = addDays(current, 1);
  }
  
  return dates;
}

export function getWeekdayStringsBetween(startStr: string, endStr: string): string[] {
  return getDateStringsBetween(startStr, endStr).filter(d => !isDateStringWeekend(d));
}

export function filterLoginsLastMonth(logins: Date[]): Date[] {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return logins.filter(login => new Date(login) > thirtyDaysAgo);
}

export function getTeamColorForDate(
  dateStr: string,
  projectId: string,
  bookings: Booking[],
  employees: Employee[]
): string {
  const dayBookings = bookings.filter(
    b => b.projectId === projectId && b.date === dateStr
  );
  
  if (dayBookings.length === 0) {
    return "transparent";
  }
  
  const teamColors = dayBookings.map(b => {
    const employee = employees.find(e => e.id === b.employeeId);
    return employee?.teamColor || "#9CA3AF";
  });
  
  const uniqueColors = [...new Set(teamColors)];
  
  if (uniqueColors.length === 1) {
    return uniqueColors[0];
  }
  
  return "#D1D5DB";
}

export const CALENDAR_COLORS = {
  HOLIDAY: "#FEE2E2",
  EMPLOYEE_ABSENT: "#FECACA",
  WEEKEND: "#F9FAFB",
  CONTRACT_START: "#10B981",
  CONTRACT_END: "#EF4444",
  INTERNAL_START: "#3B82F6",
  INTERNAL_END: "#F59E0B",
  TODAY: "#8B5CF6",
  MULTI_TEAM: "#D1D5DB",
  NO_BOOKING: "transparent",
};
