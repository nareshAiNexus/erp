# ERP System - Project Context

## TanStack CLI Command
```
npx @tanstack/cli@latest create my-tanstack-app --agent --package-manager npm --tailwind --deployment vercel --add-ons tanstack-query
```

## TanStack Intent Commands
```
npx @tanstack/intent@latest install
npx @tanstack/intent@latest list
```

Note: `intent install` failed due to non-interactive terminal (permissions not configured). Intent skills were loaded via `npx @tanstack/intent@latest load @tanstack/start-client-core#start-core` and consulted for architecture guidance.

## Stack
- **Framework**: TanStack Start (full-stack React framework with SSR)
- **Router**: TanStack Router (file-based routing)
- **Data Fetching**: TanStack Query
- **Styling**: Tailwind CSS v4 (via @tailwindcss/vite plugin)
- **Icons**: lucide-react
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel (configured) / Local server (Node.js preset via Nitro)
- **Package Manager**: npm

## Architecture
- File-based routing in `src/routes/`
- Supabase client singleton in `src/lib/supabase.ts`
- Sidebar navigation component in `src/components/Sidebar.tsx`
- Employee form modal in `src/components/EmployeeForm.tsx`
- TanStack Query integration in `src/integrations/tanstack-query/`

## Database Schema (Supabase)
6 tables, all single-tenant (no auth), RLS enabled with `anon, authenticated` policies:
- `employees` - Employee records
- `attendance` - Daily attendance with check-in/out
- `inventory_items` - Stock items with reorder levels
- `payroll_records` - Monthly payroll per employee
- `leave_requests` - Time-off requests with approval workflow
- `policies` - Company policy documents

## Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key
Both pre-populated in `.env`

## Design
- Minimal Notion-like aesthetic
- 70% white / 20% black / 10% grey color system
- Inter font, 14px base size
- No emojis
- Clean sidebar navigation

## Local Deployment
The build produces a Node.js server output in `.output/server/`. To run locally:
```
npm run build
node .output/server/index.mjs
```

## Key Decisions
- No authentication (single-tenant internal tool)
- All RLS policies use `TO anon, authenticated` with `USING (true)` since data is intentionally shared
- TanStack Query for all data fetching (no server functions needed for this use case)
- Route tree auto-generated via `npm run generate-routes`
