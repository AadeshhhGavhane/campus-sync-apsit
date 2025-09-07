# CampusSync

CampusSync is APSIT’s campus management dashboard — bringing Groups, Timetables, and Academic Calendars together for HODs, Faculty, and Students.

## Overview

Built by APSIT for APSIT, CampusSync streamlines academic operations with:

- Smart Group Management
  - Role-based access (HOD, Faculty, Student) and group permissions (viewer, contributor)
  - Easy member management and secure join codes
- Intelligent Timetables
  - Weekly schedules with flexible slot types (lecture, lab, honors, mentoring, break, mini-project)
  - Per-slot room, and faculty linking by picking a member from a group; HOD can self-assign
- Comprehensive Events
  - Academic calendars for holidays, exams, meetings, and more
  - Today/Tomorrow views surfaced on the dashboard
- Personalized Views
  - Faculty (and HOD when self-assigned) see “My Teaching Schedule” for today and tomorrow
- Polished UI
  - Clean, fast, and distraction-free dropdowns and dialogs

## Why APSIT chooses CampusSync

- Lightning Fast — instant dashboard with preloaded data
- Enterprise Security — role-based access and secure auth
- Great UX — modern UI that works across devices

## Tech Stack (core)

- Next.js 15, React 19
- MongoDB (official driver)
- React Query v5, Zustand
- Tailwind CSS v4, shadcn/ui, lucide-react

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+
- MongoDB connection string

### Environment Variables
Create `.env.local` with:

```
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/...
JWT_SECRET=<strong-random-secret>
```

### Install & Run

```bash
pnpm install
pnpm dev   # http://localhost:3000

# Production
pnpm build
pnpm start
```

## Deployment (Vercel)

1. Import the repo to Vercel.
2. Set env vars `MONGODB_URI`, `JWT_SECRET`.
3. Deploy. The app runs over HTTPS, so the Secure httpOnly auth cookie works by default.

Note: Testing over plain HTTP LAN IP (e.g., http://<your-ip>:3000) won’t store Secure cookies; use HTTPS or localhost for sign-in.

## License

MIT © CampusSync