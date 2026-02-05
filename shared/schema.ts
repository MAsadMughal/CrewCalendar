import { pgTable, varchar, timestamp, text, index, uniqueIndex, boolean, integer } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).default("user").notNull(),
  isApproved: boolean("is_approved").default(false).notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  emailVerificationToken: varchar("email_verification_token", { length: 255 }),
  resetToken: varchar("reset_token", { length: 255 }),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
  lockoutUntil: timestamp("lockout_until"),
  lastLoginAt: timestamp("last_login_at"),
  loginHistory: timestamp("login_history", { mode: "date" }).array().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  contractStartDate: varchar("contract_start_date", { length: 10 }).notNull(),
  contractEndDate: varchar("contract_end_date", { length: 10 }).notNull(),
  internalStartDate: varchar("internal_start_date", { length: 10 }).notNull(),
  internalEndDate: varchar("internal_end_date", { length: 10 }).notNull(),
  status: varchar("status", { length: 50 }).default("active").notNull(),
  deliveryDate: varchar("delivery_date", { length: 10 }),
  assignedEmployees: text("assigned_employees").array().default([]),
  snapshotHolidays: text("snapshot_holidays"), // Store as JSON string 
  snapshotAbsences: text("snapshot_absences"), // Store as JSON string
  sortOrder: varchar("sort_order", { length: 50 }).default("0"),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("project_user_idx").on(table.userId),
  uniqueIndex("project_user_name_idx").on(table.userId, table.name),
]);

export const employees = pgTable("employees", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  teamColor: varchar("team_color", { length: 50 }).notNull(),
  plannedAbsences: text("planned_absences").array().default([]),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("employee_user_idx").on(table.userId),
  uniqueIndex("employee_user_name_idx").on(table.userId, table.name),
]);

export const holidays = pgTable("holidays", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("holiday_user_date_idx").on(table.userId, table.date),
]);

export const bookings = pgTable("bookings", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  date: varchar("date", { length: 10 }).notNull(),
  projectId: varchar("project_id", { length: 255 }).notNull().references(() => projects.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id", { length: 255 }).notNull().references(() => employees.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("booking_employee_date_idx").on(table.employeeId, table.date),
  index("booking_project_date_idx").on(table.projectId, table.date),
  uniqueIndex("booking_unique_idx").on(table.employeeId, table.projectId, table.date),
]);

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  employees: many(employees),
  holidays: many(holidays),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  bookings: many(bookings),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  user: one(users, {
    fields: [employees.userId],
    references: [users.id],
  }),
  bookings: many(bookings),
}));

export const holidaysRelations = relations(holidays, ({ one }) => ({
  user: one(users, {
    fields: [holidays.userId],
    references: [users.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  project: one(projects, {
    fields: [bookings.projectId],
    references: [projects.id],
  }),
  employee: one(employees, {
    fields: [bookings.employeeId],
    references: [employees.id],
  }),
}));

export const shareLinks = pgTable("share_links", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  token: varchar("token", { length: 255 }).unique().notNull(),
  name: varchar("name", { length: 255 }),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("share_link_user_idx").on(table.userId),
  index("share_link_token_idx").on(table.token),
  uniqueIndex("share_link_user_name_idx").on(table.userId, table.name),
]);

export const shareLinksRelations = relations(shareLinks, ({ one }) => ({
  user: one(users, {
    fields: [shareLinks.userId],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [shareLinks.createdBy],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;
export type Holiday = typeof holidays.$inferSelect;
export type InsertHoliday = typeof holidays.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;
export type ShareLink = typeof shareLinks.$inferSelect;
export type InsertShareLink = typeof shareLinks.$inferInsert;
