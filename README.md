<div align="center">

# ⚡ Apex ERP

### The Next-Generation Unified Enterprise Work & Collaboration OS

**Consolidating Jira-grade agile management, Slack-level real-time communication, and enterprise HRIS into one coherent, open-source platform.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.x-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TanStack](https://img.shields.io/badge/TanStack-Router%20%7C%20Query%20%7C%20Start-ff4154?style=flat-square)](https://tanstack.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.x-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Socket.IO](https://img.shields.io/badge/Real--Time-Socket.IO-010101?style=flat-square&logo=socketdotio&logoColor=white)](https://socket.io/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)
[![Status](https://img.shields.io/badge/Status-Production--Ready-success?style=flat-square)]()

[Explore Features](#-core-capabilities) • [Live Demo](#-quick-start) • [Architecture](#-system-architecture) • [Comparison Matrix](#-why-apex-erp-vs-the-fragmented-enterprise-stack) • [Documentation](#-getting-started) • [Contributing](CONTRIBUTING.md)

</div>

---

## 📌 Executive Summary

Modern enterprises operate in an era of severe **SaaS fragmentation**. The typical knowledge worker switches between:
- **Jira** for tickets, sprints, and task tracking
- **Slack** for conversations, huddles, and status updates
- **Workday / BambooHR** for employee records, payroll, and leave management
- **Zendesk / ServiceNow** for internal IT support tickets
- **Spreadsheets & legacy ERPs** for inventory and asset tracking

This fragmentation induces context-switching fatigue, data synchronization failures, delayed approvals, and soaring software licensing overhead ($50–$150 per seat/month).

**Apex ERP** solves this by unifying **Agile Work Execution**, **Real-Time Collaboration**, and **Core People Operations** into a single, high-performance, single-tenant or VPC-deployable platform.

---

## ⚔️ Why Apex ERP? (vs The Fragmented Enterprise Stack)

| Capability | ⚡ Apex ERP | 🎯 Jira Software | 💬 Slack | 🏢 BambooHR / Workday |
| :--- | :---: | :---: | :---: | :---: |
| **Interactive Kanban & Agile Task Boards** | ✅ Included | ✅ Included | ❌ No | ❌ No |
| **Real-Time Team Chat & Direct Messaging** | ✅ Included | ❌ No | ✅ Included | ❌ No |
| **Floating Persistent Presence & Contact Rail** | ✅ Included | ❌ No | ⚠️ App-only | ❌ No |
| **Support Desk & IT Helpdesk Ticketing** | ✅ Included | ⚠️ Paid Add-on (JSM) | ❌ No | ❌ No |
| **Centralized Employee HRIS Directory** | ✅ Included | ❌ No | ❌ Directory only | ✅ Included |
| **Daily Attendance, Check-in/Out & Work Hours** | ✅ Included | ❌ No | ❌ No | ✅ Included |
| **Leave / PTO Approval Workflows** | ✅ Included | ❌ No | ❌ No | ✅ Included |
| **Inventory & Asset Reorder Management** | ✅ Included | ❌ No | ❌ No | ❌ No |
| **Payroll Ledger & Compensation Registers** | ✅ Included | ❌ No | ❌ No | ⚠️ Extra module |
| **Unified Cross-Module Context** | ✅ Single DB & state | ❌ Disconnected | ❌ Disconnected | ❌ Disconnected |
| **Licensing / Cost Per Seat** | **100% Open Source (Free)** | $7.75 – $15.25 /mo | $8.75 – $15.00 /mo | $10.00 – $25.00 /mo |
| **Self-Hostable / Data Sovereignty** | ✅ Yes (Docker / Postgres) | ❌ Cloud-only (Server EOL) | ❌ Cloud-only | ❌ Cloud-only |

---

## 🚀 Core Capabilities

### 🎯 1. Agile Project & Task Management (Jira Competitor)
- **Multi-Column Kanban Boards**: Drag-and-drop state progression (`To Do` ➔ `In Progress` ➔ `Need Review` ➔ `Done`) with optimistic UI updates.
- **Radial Avatar Fan-out**: Dynamic assignee clusters expand into radial inspection rings with one hover, displaying assignees and roles without screen clutter.
- **Micro-Scheduling**: Exact due-date calendars, 24-hour time pickers, and overdue state indicators.
- **Cross-Functional Assignment**: Associate any task with multiple employees across engineering, design, and operations.

### 💬 2. Real-Time Team Collaboration & Chat (Slack Competitor)
- **Sub-Millisecond Messaging Engine**: Powered by an event-driven Socket.IO server connected to PostgreSQL.
- **Floating Contact Rail**: Persistent right-edge drawer providing instant team presence status (Active, Away, Offline) without interrupting active work.
- **Docked Chat Popovers**: Pop up conversations directly inside any route (Tasks, Inventory, Leave) for zero-latency multitasking.
- **Threaded Conversations & Channels**: Direct 1-on-1 messaging, team channels, group chats, message history search, and unread counters.
- **Desktop Toast & Push Notifications**: Web Notifications API integration with audio cues and native OS permission handshake.

### 🎫 3. IT Service Desk & Support Ticketing
- **Multi-Category Incident Triage**: File and route requests across Hardware, Software Access, Network, and HR Operations.
- **Dual Perspective**:
  - *Employee Portal*: Simplified submission modal, real-time ticket progress status, and resolution history.
  - *Administrator Board*: Dual-view toggle between Kanban columns and interactive data tables with priority sorting (`Critical`, `High`, `Medium`, `Low`).
- **SLA & Status Transitions**: `New` ➔ `Open` ➔ `Pending` ➔ `Resolved` ➔ `Closed` with audit timestamps.

### 👥 4. Comprehensive HRIS & People Operations
- **Staff Directory**: Complete employee profiles with roles, departments, employment types (`Full-time`, `Contract`, `Intern`), compensation, DOB, and avatars.
- **Interactive Calendar Dashboard**: Month/week visual calendar tracking personal shifts, company holidays, employee birthdays, and work milestones.
- **Role-Based Access Control (RBAC)**: Distinct access tiers for `Admin` (full system management) and `User` (focused self-service portal).

### ⏱️ 5. Smart Attendance & Leave Management
- **Punch-Clock Tracking**: Daily check-in / check-out with automatic elapsed work duration calculations.
- **PTO & Absence Management**: Leave requests with start/end date range calculations, reason tracking, and one-click admin approval/rejection pipelines.
- **Badge Indicators**: Instant sidebar badge alerts notifying administrators of pending time-off requests.

### 📦 6. Asset & Inventory Control
- **Real-Time Stock Depletion**: SKU cataloging, categorization, warehouse location mapping, and unit pricing.
- **Automated Reorder Alerts**: Visual warnings when stock falls below safety thresholds.

### 💰 7. Compensation & Payroll Registers
- **Monthly Ledger Calculations**: Detailed compensation structures including base pay, performance bonuses, tax withholdings, and net distributions.
- **Export & Audit Compliance**: Track pay period disbursement states (`Draft`, `Approved`, `Paid`).

### 📜 8. Corporate Governance & Knowledge Policies
- **Versioned Policy Repository**: Centralized company policies, employee handbooks, and compliance standards with rich typography rendering.
- **Immutable Audit Trails**: Full audit logging of administrative actions, status transitions, and authorization changes for SOC2 / ISO compliance readiness.

---

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph Client ["Client Tier (Browser)"]
        UI["React 19 + TanStack Router"]
        TQ["TanStack Query (Cache & State)"]
        TW["Tailwind CSS v4 (Design System)"]
        SC["Socket.IO Client (Presence & Chat)"]
    end

    subgraph AppServer ["Application Server (Port 3000)"]
        Start["TanStack Start / Nitro SSR"]
        Proxy["Vite Dev / Reverse Proxy"]
        API["Postgres SQL Data Engine"]
    end

    subgraph ChatServer ["Real-Time Gateway (Port 3001)"]
        SocketEngine["Express + Socket.IO Server"]
        PresenceMgr["Presence & Heartbeat Manager"]
        Notifier["Web Notification Broadcaster"]
    end

    subgraph Persistence ["Persistence Layer"]
        PG[("PostgreSQL 15+ Database")]
        Tables["Employees | Tasks | Tickets\nMessages | Attendance | Payroll"]
        PG --- Tables
    end

    UI --> Start
    TQ --> API
    API --> PG
    SC <--> SocketEngine
    SocketEngine --> PresenceMgr
    SocketEngine --> PG
    Proxy -.-> SocketEngine
```

---

## 🛠️ Technology Stack

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev/) | Latest concurrent rendering engine with server components support |
| **Routing** | [TanStack Router](https://tanstack.com/router) | 100% type-safe, file-based client and SSR routing |
| **Server Engine** | [TanStack Start](https://tanstack.com/start) / [Nitro](https://nitro.unjs.io/) | Full-stack production web server and high-speed SSR engine |
| **State & Cache** | [TanStack Query](https://tanstack.com/query) | Declarative asynchronous caching, optimistic updates, and background refetching |
| **Data Tables** | [TanStack Table v8](https://tanstack.com/table) | Headless data grids with sorting, filtering, and virtualization |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Modern CSS engine with dynamic CSS variables and fluid responsive design |
| **Real-Time WebSockets**| [Socket.IO](https://socket.io/) | High-throughput bi-directional messaging and presence synchronization |
| **Database** | [PostgreSQL](https://www.postgresql.org/) | Relational database with UUID extensions and ACID transaction guarantees |
| **Icons & Micro-animations** | [Lucide React](https://lucide.dev/) + [Framer Motion](https://www.framer.com/motion/) | Consistent icon system and physics-based fluid UI transitions |

---

## 🏁 Quick Start

### Prerequisites

Ensure you have the following installed on your host machine:
- **Node.js**: `v20.x` or higher ([Download](https://nodejs.org/))
- **npm**: `v10.x` or higher
- **Docker & Docker Compose**: ([Install Docker Desktop](https://www.docker.com/products/docker-desktop/))

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/apex-erp/erp.git
cd erp
```

### Step 2: Configure Environment Variables

Copy the sample environment file:

```bash
cp .env.example .env
```

The default `.env` is pre-configured for local Docker development:
```env
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/erp"
PORT=3000
CHAT_SERVER_PORT=3001
VITE_CHAT_SERVER_URL="http://localhost:3001"
```

### Step 3: Launch PostgreSQL with Docker

Spin up the containerized database instance:

```bash
docker compose up -d
```

### Step 4: Install Dependencies & Run Database Migrations

```bash
# Install packages
npm install

# Run database schema migrations
node run-migration.mjs
node run-chat-migration.mjs
```

### Step 5: Start Development Services

Run the web application server and real-time messaging gateway:

```bash
# Terminal 1: Core Application (Frontend + SSR Server)
npm run dev

# Terminal 2: Real-Time Chat & Presence WebSocket Server
npm run chat-server
```

Open your browser and navigate to:
👉 **`http://localhost:3000`**

---

## 📂 Project Structure

```
├── database/                    # SQL initialization scripts and baseline schemas
│   ├── init.sql                 # Primary PostgreSQL tables (employees, tasks, inventory, etc.)
│   ├── migration_auth.sql       # Authentication and credential schema
│   ├── migration_tasks.sql      # Task status, assignees, and sprint models
│   └── migration_tickets.sql    # Support ticket and incident triage schemas
├── supabase/migrations/         # Additional incremental migrations
│   └── 20260919_chat_schema.sql # Real-time conversation, membership & presence schemas
├── src/
│   ├── components/              # Modular UI components
│   │   ├── chat/                # Real-time chat: ChatPopover, FloatingContactRail, ThreadView
│   │   ├── tickets/             # TicketBoard, UserTickets, ticket configuration
│   │   ├── AddTaskModal.tsx     # Task creation dialog
│   │   ├── Sidebar.tsx          # Role-aware primary navigation
│   │   └── UserCalendarDashboard.tsx # Comprehensive personal workspace dashboard
│   ├── lib/                     # Utilities, contexts, and database client
│   │   ├── AuthContext.tsx      # Role authentication and session management
│   │   ├── ChatContext.tsx      # Real-time Socket.IO presence and message listeners
│   │   ├── dbClient.ts          # Type-safe client-side query proxy
│   │   └── types.ts             # Canonical TypeScript interfaces
│   ├── routes/                  # File-based routing tree (TanStack Router)
│   │   ├── __root.tsx           # Global application shell, navigation & context providers
│   │   ├── index.tsx            # Main dashboard overview
│   │   ├── tasks/               # Agile Kanban & task management route
│   │   ├── messages/            # Full-page collaborative messaging hub
│   │   ├── tickets/             # Support & incident management desk
│   │   ├── employees/           # Workforce and HRIS management
│   │   ├── attendance/          # Time-tracking and check-in register
│   │   ├── leave/               # PTO and absence request pipeline
│   │   ├── inventory/           # Stock control and reorder tracking
│   │   ├── payroll/             # Compensation registers and payroll records
│   │   ├── policies/            # Corporate policies and guidelines
│   │   └── audits/              # Governance and administrative audit logs
│   ├── router.tsx               # TanStack Router configuration
│   └── styles.css               # Design system tokens and Tailwind CSS imports
├── chat-server.mjs              # Standalone Node.js Express + Socket.IO real-time daemon
├── docker-compose.yml           # PostgreSQL container deployment specification
├── package.json                 # Project dependencies and script definitions
└── tsconfig.json                # Strict TypeScript configuration
```

---

## 🔒 Security & Enterprise Compliance

- **Zero Third-Party Telemetry**: Apex ERP operates completely on your infrastructure. No external trackers, telemetry pings, or data leaks.
- **SQL Injection Defense**: Every database query utilizes strictly parameterized queries (`$1, $2, ...`) via the Node `pg` connection pool.
- **Single-Tenant & VPC Isolation**: Deploy within private subnets, behind enterprise firewalls, or on air-gapped corporate intranets.
- **Role-Based Access Control (RBAC)**: Clear boundaries between administrative oversight (`admin`) and employee self-service (`user`).
- **Audit Logging**: Sensitive actions (payroll approvals, ticket status changes, employee profile modifications) are systematically recorded.

---

## 🚢 Production Deployment

### Option A: Node.js Nitro Production Server
```bash
# 1. Compile the production bundle
npm run build

# 2. Launch the standalone Nitro server
node .output/server/index.mjs

# 3. In a process manager (e.g., PM2 or systemd), run the chat server
node chat-server.mjs
```

### Option B: Dockerized Microservices
Use standard container orchestrators (Kubernetes, AWS ECS, or Docker Swarm) to run:
1. **Web App Service** (port 3000)
2. **Real-Time Chat Daemon** (port 3001)
3. **Managed PostgreSQL** (AWS RDS, GCP Cloud SQL, or self-hosted)

---

## 🤝 Contributing

We welcome community contributions! Please read our [Contributing Guide](CONTRIBUTING.md) to learn about our development process, branching model, and code style standards.

1. Fork the repo
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is distributed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Built with ❤️ for modern engineering organizations. Apex ERP is an open-source project and is not affiliated with Atlassian, Jira, or Slack.</sub>
</div>
