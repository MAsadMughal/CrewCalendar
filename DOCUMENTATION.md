# CrewCalendar - Complete Technical & Business Documentation

**Version:** 1.0.0  
**Last Updated:** January 25, 2026  
**Framework:** Next.js 14 (App Router)

---

## Table of Contents

1. [Business Overview](#1-business-overview)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Features & Functionality](#3-features--functionality)
4. [Technical Architecture](#4-technical-architecture)
5. [Database Schema](#5-database-schema)
6. [API Reference](#6-api-reference)
7. [Authentication System](#7-authentication-system)
8. [File Structure](#8-file-structure)
9. [Local Development Setup](#9-local-development-setup)
10. [Environment Variables](#10-environment-variables)
11. [Internationalization (i18n)](#11-internationalization-i18n)
12. [Dark Mode Implementation](#12-dark-mode-implementation)
13. [Deployment Guide](#13-deployment-guide)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Business Overview

### Purpose
CrewCalendar is a project management application designed to streamline project tracking, employee assignment, and holiday management. It provides a dual interface for administrators and regular users, featuring an intuitive calendar-based UI with drag-and-drop functionality for efficient scheduling and resource allocation.

### Core Value Proposition
- **Visual Resource Planning:** See at a glance which employees are booked on which projects
- **Conflict Prevention:** Automatically track employee availability and planned absences
- **Multi-User Support:** Each user manages their own projects, employees, and bookings
- **Shareable Calendars:** Generate read-only public links for stakeholders

### Target Users
- Project Managers
- Team Leads
- Resource Coordinators
- Small to Medium Business Owners

---

## 2. User Roles & Permissions

### Regular User (`role: "user"`)
- Create, edit, and delete their own projects
- Manage their own employees
- Create bookings for their employees on their projects
- Manage holidays for their workspace
- Generate and manage share links
- Update their profile and password

### Administrator (`role: "admin"`)
All regular user permissions, plus:
- View and manage all users in the system
- Approve new user registrations
- Assign roles to users
- Access any user's data via the admin dashboard
- Create, edit, and delete data on behalf of any user

### User Registration Flow
1. User signs up with email/password
2. Email verification is sent (if Resend is configured)
3. User verifies email
4. Admin approves the user account
5. User can now log in and use the application

---

## 3. Features & Functionality

### 3.1 Project Management
- **CRUD Operations:** Create, read, update, delete projects
- **Date Fields:**
  - Contract Start/End Date: Official contract dates
  - Internal Start/End Date: Actual working dates (bookings allowed within this range)
  - Delivery Date: Required when status is "delivered"
- **Status:** Active or Delivered (delivered projects are read-only)
- **Drag-and-Drop Sorting:** Reorder projects in the sidebar
- **Employee Assignment:** Assign employees to projects before booking

### 3.2 Employee Management
- **CRUD Operations:** Create, read, update, delete employees
- **Team Color:** Each employee has a color for visual identification on the calendar
- **Planned Absences:** Track future absences (vacations, leaves)

### 3.3 Booking System
- **Two-Phase Process:**
  1. Assign employee to project
  2. Book employee on specific dates
- **Multi-Date Selection:** Drag across calendar cells to book/unbook multiple dates
- **Validation Rules:**
  - Bookings only allowed between project's internal start and end dates
  - Cannot book employees on holidays
  - Cannot book employees during planned absences
- **Visual Indicators:**
  - Employee's team color shown in booked cells
  - Striped pattern for delivery dates

### 3.4 Calendar UI
- **90-Day Grid:** Shows 90 days of weekdays (no weekends)
- **Week Numbers:** Professional week number display
- **Date Navigation:** Navigate to specific dates, go to today
- **Visual Indicators:**
  - Bookings (employee color)
  - Holidays (red marking)
  - Planned absences (gray/striped)
  - Delivery dates (striped pattern)

### 3.5 Holiday Management
- **User-Specific:** Each user maintains their own holiday list
- **Calendar Integration:** Holidays are marked on the calendar grid

### 3.6 Share Links
- **Read-Only Access:** Generate public links for external stakeholders
- **Optional Expiration:** Set expiry dates for share links
- **Named Links:** Give descriptive names to share links
- **Token-Based:** Secure random tokens for each link

### 3.7 Admin Dashboard
- **User List:** View all registered users
- **Approval Queue:** Approve pending user registrations
- **Role Management:** Assign admin or user roles
- **Proxy Access:** View and manage any user's data

---

## 4. Technical Architecture

### 4.1 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL (Neon-backed on Replit) |
| ORM | Drizzle ORM |
| Styling | Tailwind CSS 3.4 |
| UI Components | Radix UI Primitives |
| State Management | Zustand + React Query |
| Drag & Drop | @dnd-kit |
| Date Handling | date-fns |
| Authentication | JWT (jsonwebtoken) + bcrypt |
| Email | Resend (optional) |
| i18n | next-intl |
| Theming | next-themes |

### 4.2 Architecture Patterns

**Data Flow:**
```
Client Components → React Query Hooks → API Routes → Drizzle ORM → PostgreSQL
```

**State Management:**
- **Server State:** React Query for API data caching and synchronization
- **Client State:** Zustand for UI state (modals, selections, filters)

**Authentication:**
- JWT tokens stored in HTTP-only cookies
- Middleware adds security headers to all responses
- API routes verify auth via `getAuthUser()` helper

---

## 5. Database Schema

### 5.1 Entity Relationship Diagram

```
┌─────────────┐
│    users    │
├─────────────┤
│ id (PK)     │
│ name        │
│ email       │
│ password    │
│ role        │
│ isApproved  │
│ emailVerified│
└──────┬──────┘
       │
       │ 1:N
       ├─────────────────────┐
       │                     │
       ▼                     ▼
┌─────────────┐       ┌─────────────┐
│  projects   │       │  employees  │
├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │
│ name        │       │ name        │
│ dates...    │       │ teamColor   │
│ userId (FK) │       │ absences[]  │
└──────┬──────┘       │ userId (FK) │
       │              └──────┬──────┘
       │                     │
       │ 1:N                 │ 1:N
       │                     │
       └──────────┬──────────┘
                  │
                  ▼
           ┌─────────────┐
           │  bookings   │
           ├─────────────┤
           │ id (PK)     │
           │ date        │
           │ projectId   │
           │ employeeId  │
           └─────────────┘

┌─────────────┐       ┌─────────────┐
│  holidays   │       │ share_links │
├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │
│ name        │       │ token       │
│ date        │       │ name        │
│ userId (FK) │       │ userId (FK) │
└─────────────┘       │ expiresAt   │
                      └─────────────┘
```

### 5.2 Table Definitions

#### users
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(255) PK | UUID primary key |
| name | VARCHAR(255) | User's display name |
| email | VARCHAR(255) UNIQUE | Login email |
| password | VARCHAR(255) | bcrypt hashed password |
| role | VARCHAR(50) | "user" or "admin" |
| isApproved | BOOLEAN | Admin approval status |
| emailVerified | BOOLEAN | Email verification status |
| emailVerificationToken | VARCHAR(255) | Token for email verification |
| resetToken | VARCHAR(255) | Password reset token |
| resetTokenExpiry | TIMESTAMP | When reset token expires |
| failedLoginAttempts | INTEGER | For account lockout |
| lockoutUntil | TIMESTAMP | Lockout expiry time |
| lastLoginAt | TIMESTAMP | Last successful login |
| loginHistory | TIMESTAMP[] | Array of login timestamps |
| createdAt | TIMESTAMP | Account creation time |
| updatedAt | TIMESTAMP | Last update time |

#### projects
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(255) PK | UUID primary key |
| name | VARCHAR(255) | Project name |
| contractStartDate | VARCHAR(10) | Contract start (YYYY-MM-DD) |
| contractEndDate | VARCHAR(10) | Contract end (YYYY-MM-DD) |
| internalStartDate | VARCHAR(10) | Work start (YYYY-MM-DD) |
| internalEndDate | VARCHAR(10) | Work end (YYYY-MM-DD) |
| status | VARCHAR(50) | "active" or "delivered" |
| deliveryDate | VARCHAR(10) | Actual delivery date |
| assignedEmployees | TEXT[] | Array of employee IDs |
| sortOrder | VARCHAR(50) | For drag-and-drop ordering |
| userId | VARCHAR(255) FK | Owner user ID |

#### employees
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(255) PK | UUID primary key |
| name | VARCHAR(255) | Employee name |
| teamColor | VARCHAR(50) | Hex color code |
| plannedAbsences | TEXT[] | Array of date strings |
| userId | VARCHAR(255) FK | Owner user ID |

#### holidays
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(255) PK | UUID primary key |
| name | VARCHAR(255) | Holiday name |
| date | VARCHAR(10) | Holiday date (YYYY-MM-DD) |
| userId | VARCHAR(255) FK | Owner user ID |

#### bookings
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(255) PK | UUID primary key |
| date | VARCHAR(10) | Booking date (YYYY-MM-DD) |
| projectId | VARCHAR(255) FK | Project being booked |
| employeeId | VARCHAR(255) FK | Employee being booked |

#### share_links
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(255) PK | UUID primary key |
| token | VARCHAR(255) UNIQUE | Public access token |
| name | VARCHAR(255) | Optional descriptive name |
| userId | VARCHAR(255) FK | User whose data is shared |
| createdBy | VARCHAR(255) FK | Admin who created the link |
| expiresAt | TIMESTAMP | Optional expiration time |

---

## 6. API Reference

### 6.1 Authentication Endpoints

#### POST /api/auth/signup
Create a new user account.
```json
{
  "name": "string",
  "email": "string",
  "password": "string"
}
```

#### POST /api/auth/login
Authenticate and receive a session cookie.
```json
{
  "email": "string",
  "password": "string"
}
```

#### POST /api/auth/logout
Clear the authentication cookie.

#### GET /api/auth/me
Get the currently authenticated user.

#### POST /api/auth/forgot-password
Request a password reset email.
```json
{
  "email": "string"
}
```

#### POST /api/auth/reset-password
Reset password using a token.
```json
{
  "token": "string",
  "password": "string"
}
```

#### POST /api/auth/change-password
Change password (authenticated).
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

#### PUT /api/auth/profile
Update user profile.
```json
{
  "name": "string",
  "email": "string"
}
```

#### GET /api/auth/verify-email?token=xxx
Verify email address.

### 6.2 Project Endpoints

#### GET /api/projects
List all projects for the authenticated user.

#### POST /api/projects
Create a new project.
```json
{
  "name": "string",
  "contractStartDate": "YYYY-MM-DD",
  "contractEndDate": "YYYY-MM-DD",
  "internalStartDate": "YYYY-MM-DD",
  "internalEndDate": "YYYY-MM-DD",
  "status": "active" | "delivered",
  "deliveryDate": "YYYY-MM-DD" | null,
  "assignedEmployees": ["employeeId1", "employeeId2"]
}
```

#### PUT /api/projects/[id]
Update a project.

#### DELETE /api/projects/[id]
Delete a project and all its bookings.

#### PUT /api/projects/order
Update project sort order.
```json
{
  "projectIds": ["id1", "id2", "id3"]
}
```

### 6.3 Employee Endpoints

#### GET /api/employees
List all employees for the authenticated user.

#### POST /api/employees
Create a new employee.
```json
{
  "name": "string",
  "teamColor": "#hexcode",
  "plannedAbsences": ["YYYY-MM-DD", "YYYY-MM-DD"]
}
```

#### PUT /api/employees/[id]
Update an employee.

#### DELETE /api/employees/[id]
Delete an employee and all their bookings.

### 6.4 Holiday Endpoints

#### GET /api/holidays
List all holidays for the authenticated user.

#### POST /api/holidays
Create a new holiday.
```json
{
  "name": "string",
  "date": "YYYY-MM-DD"
}
```

#### PUT /api/holidays/[id]
Update a holiday.

#### DELETE /api/holidays/[id]
Delete a holiday.

### 6.5 Booking Endpoints

#### GET /api/bookings
List all bookings for the authenticated user.

#### POST /api/bookings
Create a booking.
```json
{
  "date": "YYYY-MM-DD",
  "projectId": "string",
  "employeeId": "string"
}
```

#### DELETE /api/bookings/[id]
Delete a booking.

#### POST /api/bookings/toggle
Toggle a booking on/off (create if doesn't exist, delete if exists).
```json
{
  "date": "YYYY-MM-DD",
  "projectId": "string",
  "employeeId": "string"
}
```

#### POST /api/bookings/bulk
Bulk create/delete bookings.
```json
{
  "dates": ["YYYY-MM-DD", "YYYY-MM-DD"],
  "projectId": "string",
  "employeeId": "string",
  "action": "book" | "unbook"
}
```

#### GET /api/bookings/by-assignment
Get bookings grouped by project-employee assignment.

#### GET /api/bookings/by-project/[projectId]
Get all bookings for a specific project.

### 6.6 Share Link Endpoints

#### GET /api/share-links
List all share links for the authenticated user.

#### POST /api/share-links
Create a new share link.
```json
{
  "name": "string" | null,
  "expiresAt": "ISO datetime" | null
}
```

#### DELETE /api/share-links/[id]
Delete a share link.

#### GET /api/public/share/[token]
Public endpoint to access shared calendar data.

### 6.7 Dashboard Endpoint

#### GET /api/dashboard
Get all data for the main calendar view (projects, employees, holidays, bookings).

### 6.8 Admin Endpoints

All admin endpoints require `role: "admin"`.

#### GET /api/admin/users
List all users in the system.

#### GET /api/admin/users/[userId]
Get a specific user's details.

#### PUT /api/admin/users/[userId]
Update a user's role.
```json
{
  "role": "user" | "admin"
}
```

#### POST /api/admin/users/[userId]/approve
Approve a pending user.

#### PUT /api/admin/users/[userId]/save
Update any user's data.

#### Admin Proxy Routes
All standard CRUD operations are available under `/api/admin/proxy/*` to manage any user's data:
- `/api/admin/proxy/projects/*`
- `/api/admin/proxy/employees/*`
- `/api/admin/proxy/holidays/*`
- `/api/admin/proxy/bookings/*`
- `/api/admin/proxy/dashboard`

---

## 7. Authentication System

### 7.1 Overview
The application uses a custom JWT-based authentication system with HTTP-only cookies.

### 7.2 Security Features

| Feature | Implementation |
|---------|----------------|
| Password Hashing | bcrypt with 12 rounds |
| Token Storage | HTTP-only cookies |
| Token Expiry | 24 hours |
| Rate Limiting | 5 attempts per 15 minutes |
| Account Lockout | After 5 failed attempts |
| Email Verification | Optional (requires Resend API key) |
| Admin Approval | Required before first login |

### 7.3 JWT Payload Structure
```typescript
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}
```

### 7.4 Cookie Configuration
```typescript
{
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 86400, // 24 hours
  path: "/"
}
```

### 7.5 Security Headers (Middleware)
```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-XSS-Protection: 1; mode=block
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; ...
```

---

## 8. File Structure

```
project-manager/
├── messages/                    # Translation files
│   ├── en.json                 # English translations
│   ├── pt.json                 # Portuguese translations
│   └── da.json                 # Danish translations
├── shared/
│   └── schema.ts               # Drizzle database schema
├── src/
│   ├── app/
│   │   ├── api/                # API routes
│   │   │   ├── auth/           # Authentication endpoints
│   │   │   ├── projects/       # Project CRUD
│   │   │   ├── employees/      # Employee CRUD
│   │   │   ├── holidays/       # Holiday CRUD
│   │   │   ├── bookings/       # Booking operations
│   │   │   ├── share-links/    # Share link management
│   │   │   ├── dashboard/      # Dashboard data
│   │   │   ├── admin/          # Admin endpoints
│   │   │   └── public/         # Public endpoints
│   │   ├── admin/              # Admin pages
│   │   ├── share/[token]/      # Public share page
│   │   ├── login/              # Login page
│   │   ├── signup/             # Signup page
│   │   ├── forgot-password/    # Forgot password page
│   │   ├── reset-password/     # Reset password page
│   │   ├── profile/            # Profile page
│   │   ├── change-password/    # Change password page
│   │   ├── globals.css         # Global styles + CSS variables
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Main calendar page
│   ├── components/
│   │   ├── ui/                 # Radix UI components
│   │   ├── layout/             # Layout components (navbar, action bar)
│   │   ├── calendar/           # Calendar grid component
│   │   ├── projects/           # Project sidebar
│   │   ├── employees/          # Employee pill bar
│   │   ├── modals/             # Modal dialogs
│   │   ├── auth/               # Auth-related components
│   │   ├── admin/              # Admin dashboard component
│   │   └── providers.tsx       # React Query + Theme providers
│   ├── hooks/                  # Custom React hooks
│   │   ├── use-auth.ts         # Authentication hook
│   │   ├── use-user.ts         # Current user hook
│   │   ├── use-dashboard.ts    # Dashboard data hook
│   │   ├── use-projects.ts     # Projects CRUD hook
│   │   ├── use-employees.ts    # Employees CRUD hook
│   │   ├── use-holidays.ts     # Holidays CRUD hook
│   │   ├── use-bookings.ts     # Bookings operations hook
│   │   └── use-toast.ts        # Toast notifications hook
│   ├── stores/
│   │   └── ui-store.ts         # Zustand UI state store
│   ├── contexts/
│   │   └── admin-mode-context.tsx # Admin mode context
│   ├── i18n/
│   │   ├── config.ts           # i18n configuration
│   │   └── provider.tsx        # Locale provider
│   ├── lib/
│   │   ├── db.ts               # Database connection
│   │   ├── auth.ts             # Auth utilities
│   │   ├── rate-limit.ts       # Rate limiting
│   │   └── utils.ts            # Utility functions
│   └── middleware.ts           # Security middleware
├── drizzle.config.ts           # Drizzle ORM config
├── next.config.js              # Next.js config
├── tailwind.config.ts          # Tailwind CSS config
├── tsconfig.json               # TypeScript config
├── package.json                # Dependencies
└── .env                        # Environment variables (not committed)
```

---

## 9. Local Development Setup

### 9.1 Prerequisites
- Node.js 18+ (recommended: 20.x)
- npm or yarn
- PostgreSQL database (local or cloud)
- Git

### 9.2 Step-by-Step Setup

#### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd project-manager
```

#### Step 2: Install Dependencies
```bash
npm install
```

#### Step 3: Set Up Environment Variables
Create a `.env` file in the root directory:
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/crewcalendar

# Authentication
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters

# Email (Optional - for email verification)
RESEND_API_KEY=re_xxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com

# Base URL (for email links)
NEXT_PUBLIC_APP_URL=http://localhost:5000
```

#### Step 4: Set Up the Database
```bash
# Push the schema to your database
npm run db:push
```

#### Step 5: Create an Admin User
Since the first user needs to be approved by an admin, you need to manually create one:

```sql
-- Connect to your database and run:
INSERT INTO users (id, name, email, password, role, is_approved, email_verified, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Admin User',
  'admin@example.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeOFn7qUeBr.eiM2y', -- password: Admin123!
  'admin',
  true,
  true,
  NOW(),
  NOW()
);
```

#### Step 6: Start the Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

#### Step 7: Log In
- Email: `admin@example.com`
- Password: `Admin123!`

### 9.3 Database Management Commands
```bash
# Push schema changes to database
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio
```

---

## 10. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL connection string |
| JWT_SECRET | Yes | Secret key for JWT signing (min 32 chars) |
| RESEND_API_KEY | No | Resend API key for email verification |
| EMAIL_FROM | No | From address for emails |
| NEXT_PUBLIC_APP_URL | No | Base URL for email links |
| NODE_ENV | No | "development" or "production" |

### Security Notes
- Never commit `.env` files to version control
- Use strong, random JWT_SECRET values
- Rotate secrets periodically in production

---

## 11. Internationalization (i18n)

### 11.1 Supported Languages
- English (en) - Default
- Portuguese (pt)
- Danish (da)

### 11.2 Translation Files Location
```
messages/
├── en.json    # English
├── pt.json    # Portuguese
└── da.json    # Danish
```

### 11.3 Adding Translations

#### Step 1: Add keys to all translation files
```json
// messages/en.json
{
  "namespace": {
    "key": "English text"
  }
}

// messages/pt.json
{
  "namespace": {
    "key": "Portuguese text"
  }
}

// messages/da.json
{
  "namespace": {
    "key": "Danish text"
  }
}
```

#### Step 2: Use in Components
```tsx
import { useTranslations } from "next-intl";

function MyComponent() {
  const t = useTranslations("namespace");
  return <p>{t("key")}</p>;
}
```

### 11.4 Language Switching
The language switcher is a globe icon in the navbar. Language preference is stored in localStorage and persists across sessions.

### 11.5 Translation Namespaces
- `common`: Shared strings (buttons, labels)
- `auth`: Authentication pages
- `projects`: Project-related strings
- `employees`: Employee-related strings
- `calendar`: Calendar UI strings
- `admin`: Admin dashboard strings
- `share`: Share page strings

---

## 12. Dark Mode Implementation

### 12.1 Technology
Dark mode is implemented using `next-themes` with Tailwind CSS dark mode classes.

### 12.2 CSS Variables
Located in `src/app/globals.css`:

```css
/* Light mode */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  /* ... other variables */
}

/* Dark mode */
.dark {
  --background: 224 71% 4%;
  --foreground: 210 40% 98%;
  /* ... other variables */
}
```

### 12.3 Usage in Components
```tsx
// Use Tailwind's dark: prefix
<div className="bg-white dark:bg-gray-900">
  <p className="text-gray-900 dark:text-white">Content</p>
</div>
```

### 12.4 Theme Toggle
The theme toggle is located in the navbar (sun/moon icon). Preference is stored in localStorage.

### 12.5 Common Dark Mode Patterns
```tsx
// Backgrounds
"bg-white dark:bg-gray-900"
"bg-gray-50 dark:bg-gray-950"

// Text
"text-gray-900 dark:text-white"
"text-gray-600 dark:text-gray-400"

// Borders
"border-gray-200 dark:border-gray-800"

// Cards/Panels
"bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
```

---

## 13. Deployment Guide

### 13.1 Replit Deployment
1. Click the "Deploy" or "Publish" button in Replit
2. Choose deployment type (Reserved VM or Autoscale)
3. Ensure environment variables are set in Secrets
4. Deploy

### 13.2 Other Platforms (Vercel, Railway, etc.)

#### Build Command
```bash
npm run build
```

#### Start Command
```bash
npm run start
```

#### Environment Variables
Set all required environment variables in your platform's dashboard.

### 13.3 Database Considerations
- Use a managed PostgreSQL service (Neon, Supabase, Railway, etc.)
- Run `npm run db:push` after deployment to sync schema
- Set up database backups for production

### 13.4 Production Checklist
- [ ] Strong JWT_SECRET set
- [ ] Database connection string configured
- [ ] Email service configured (optional)
- [ ] HTTPS enabled
- [ ] Database backups configured
- [ ] Error monitoring set up

---

## 14. Troubleshooting

### Common Issues

#### "JWT_SECRET environment variable is required"
Set the JWT_SECRET in your `.env` file or environment variables.

#### Database connection errors
- Check DATABASE_URL format: `postgresql://user:password@host:port/database`
- Ensure the database exists and is accessible
- Check firewall/network settings

#### "User not approved"
New users require admin approval. Log in as an admin and approve the user in the Admin Dashboard.

#### Dark mode not working
- Clear browser cache
- Check that `next-themes` provider is in the component tree
- Verify `dark` class is being added to `html` element

#### Translations not showing
- Ensure the key exists in all language files
- Check that the component is wrapped in the i18n provider
- Clear Next.js cache: `rm -rf .next`

#### Bookings not saving
- Check that the date is within project's internal date range
- Verify the employee is assigned to the project
- Ensure the date is not a holiday or planned absence

### Support
For additional help, contact the development team or refer to the project repository.

---

## Appendix: Quick Reference

### API Status Codes
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Server Error |

### Date Formats
All dates in the API use ISO format: `YYYY-MM-DD`

### Color Formats
Employee team colors use hex format: `#RRGGBB`

---

*This documentation is maintained as part of the CrewCalendar project. Last updated: January 25, 2026*
