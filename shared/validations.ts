import { z } from "zod";

const dateStringRegex = /^\d{4}-\d{2}-\d{2}$/;

function isWeekendDate(dateStr: string): boolean {
  const date = new Date(dateStr + "T12:00:00");
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

const weekdayDateString = z.string()
  .regex(dateStringRegex, "Invalid date format (YYYY-MM-DD)")
  .refine(val => !isWeekendDate(val), "Date cannot be on Saturday or Sunday");

export const signupSchema = z.object({
  name: z.string()
    .min(1, "Name is required")
    .max(255, "Name is too long")
    .trim(),
  email: z.string()
    .min(1, "Email is required")
    .max(255, "Email is too long")
    .email("Invalid email address")
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password is too long"),
});

export const loginSchema = z.object({
  email: z.string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(6, "New password must be at least 6 characters")
    .max(100, "Password is too long"),
});

export const forgotPasswordSchema = z.object({
  email: z.string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .toLowerCase()
    .trim(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password is too long"),
});

export const profileUpdateSchema = z.object({
  name: z.string()
    .min(1, "Name is required")
    .max(255, "Name is too long")
    .trim(),
});

export const projectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(255),
  contractStartDate: weekdayDateString,
  contractEndDate: weekdayDateString,
  internalStartDate: weekdayDateString,
  internalEndDate: weekdayDateString,
  status: z.enum(["active", "delivered"]).default("active"),
  deliveryDate: z.string().regex(dateStringRegex, "Invalid date format").optional().nullable(),
  assignedEmployees: z.array(z.string()).default([]),
}).refine(data => data.contractEndDate >= data.contractStartDate, {
  message: "Contract end date must be after start date",
  path: ["contractEndDate"],
}).refine(data => data.internalEndDate >= data.internalStartDate, {
  message: "Internal end date must be after start date",
  path: ["internalEndDate"],
}).refine(data => {
  if (data.status === "delivered" && !data.deliveryDate) {
    return false;
  }
  return true;
}, {
  message: "Delivery date is required when status is 'delivered'",
  path: ["deliveryDate"],
}).refine(data => {
  if (data.deliveryDate) {
    const maxEndDate = data.contractEndDate > data.internalEndDate 
      ? data.contractEndDate 
      : data.internalEndDate;
    return data.deliveryDate > maxEndDate;
  }
  return true;
}, {
  message: "Delivery date must be after both contract and internal end dates",
  path: ["deliveryDate"],
}).refine(data => {
  if (data.deliveryDate) {
    return !isWeekendDate(data.deliveryDate);
  }
  return true;
}, {
  message: "Delivery date cannot be on Saturday or Sunday",
  path: ["deliveryDate"],
});

export const employeeSchema = z.object({
  name: z.string().min(1, "Employee name is required").max(255),
  teamColor: z.string().min(1, "Team color is required").regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
  plannedAbsences: z.array(
    z.string().regex(dateStringRegex).refine(val => !isWeekendDate(val), "Absence date cannot be on Saturday or Sunday")
  ).default([]),
});

export const holidaySchema = z.object({
  name: z.string().min(1, "Holiday name is required").max(255),
  startDate: weekdayDateString,
  endDate: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().regex(dateStringRegex, "Invalid date format")
      .refine(val => !isWeekendDate(val), "End date cannot be on Saturday or Sunday")
      .optional()
  ),
}).refine(data => {
  if (data.endDate && data.endDate < data.startDate) {
    return false;
  }
  return true;
}, {
  message: "End date must be after or equal to start date",
  path: ["endDate"],
});

export const bookingSchema = z.object({
  date: z.string().regex(dateStringRegex, "Invalid date format (YYYY-MM-DD)"),
  projectId: z.string().min(1, "Project is required"),
  employeeId: z.string().min(1, "Employee is required"),
});

export const updateProjectOrderSchema = z.object({
  projectIds: z.array(z.string()),
});

export const shareLinkSchema = z.object({
  name: z.string().max(255).optional(),
  userId: z.string().min(1, "User ID is required"),
  expiresAt: z.string().datetime().optional().nullable(),
});

export type ProjectFormData = z.infer<typeof projectSchema>;
export type EmployeeFormData = z.infer<typeof employeeSchema>;
export type HolidayFormData = z.infer<typeof holidaySchema>;
export type BookingFormData = z.infer<typeof bookingSchema>;
export type ShareLinkFormData = z.infer<typeof shareLinkSchema>;
