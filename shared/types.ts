import type { Project, Employee, Holiday, Booking, User } from "./schema";

export type ProjectStatus = "active" | "delivered";
export type UserRole = "admin" | "user";

export interface ProjectWithBookings extends Project {
  bookings: BookingWithEmployee[];
}

export interface BookingWithEmployee extends Booking {
  employee: Employee;
}

export interface BookingWithProject extends Booking {
  project: Project;
}

export interface EmployeeWithBookings extends Employee {
  bookings: BookingWithProject[];
}

export interface CalendarDay {
  date: Date;
  isHoliday: boolean;
  isWeekend: boolean;
  bookings: BookingWithEmployee[];
  holidayName?: string;
}

export interface DailyMetrics {
  date: Date;
  bookedCount: number;
  assignedCount: number;
  absentCount: number;
}

export interface BookingConflict {
  date: Date;
  reason: "employee_absence" | "holiday" | "already_booked" | "not_assigned";
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface DateMarker {
  type: "contract_start" | "contract_end" | "internal_start" | "internal_end";
  date: Date;
}

export interface CalendarCellColor {
  type: "same_team" | "multi_team" | "no_booking" | "holiday" | "absent";
  color: string;
}
