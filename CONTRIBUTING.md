# Contributing to Apex ERP

Thank you for your interest in contributing to **Apex ERP**! We are building a modern, open-source work operating system designed to bridge the gap between enterprise agile work management, real-time collaboration, and HRIS operations.

We welcome contributions from developers, designers, technical writers, and testers of all backgrounds.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Submitting Pull Requests](#submitting-pull-requests)
- [Local Development Setup](#local-development-setup)
- [Git Workflow & Branching Strategy](#git-workflow--branching-strategy)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Coding Standards](#coding-standards)
- [Security Disclosures](#security-disclosures)

---

## Code of Conduct

Apex ERP is an inclusive, respectful, and collaborative project. All participants are expected to adhere to standard professional conduct:

- **Be Respectful**: Welcome differing viewpoints and experiences. Treat all contributors with dignity.
- **Focus on Constructive Collaboration**: Provide actionable feedback and accept constructive critique gracefully.
- **Maintain Professionalism**: Harassment, exclusionary language, or offensive behavior will not be tolerated.

---

## How Can I Contribute?

### Reporting Bugs

Before submitting a bug report:
1. Search the existing [GitHub Issues](https://github.com/apex-erp/erp/issues) to verify if the issue has already been reported.
2. Ensure the issue reproduces on the latest `main` branch.

When opening a bug report, include:
- **A clear, descriptive title**.
- **Steps to reproduce** the behavior.
- **Expected vs. actual behavior**.
- **Screenshots or terminal logs** where applicable.
- **Environment details** (OS, Node.js version, Browser version).

### Suggesting Features

We welcome ideas that enhance productivity or solve enterprise workflows. When creating a feature request:
- Explain **what problem** this feature solves.
- Describe the **proposed solution** and user experience.
- Compare with existing industry tools (e.g., Jira, Slack, Linear) where helpful.

### Submitting Pull Requests

1. **Fork the repository** and clone your fork locally.
2. **Create a topic branch** from `main` (see [Git Workflow](#git-workflow--branching-strategy)).
3. **Keep PRs focused**: Each pull request should address a single bug fix or feature. Avoid bundling unrelated refactors.
4. **Test thoroughly**: Verify database migrations, real-time socket events, and UI responsiveness.
5. **Open a Pull Request** with a concise title and a detailed description explaining the "why" and "what".

---

## Local Development Setup

### Prerequisites

- **Node.js**: `v20.x` or higher (`node -v`)
- **npm**: `v10.x` or higher (`npm -v`)
- **Docker**: Docker & Docker Compose (recommended for PostgreSQL) or a local PostgreSQL 15+ instance

### Setup Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/apex-erp/erp.git
   cd erp
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the PostgreSQL database:**
   ```bash
   docker compose up -d
   ```

4. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

5. **Run database migrations:**
   ```bash
   node run-migration.mjs
   node run-chat-migration.mjs
   ```

6. **Start the development servers:**
   - In terminal 1 (Frontend & Core Server):
     ```bash
     npm run dev
     ```
   - In terminal 2 (Real-Time Chat & WebSocket Engine):
     ```bash
     npm run chat-server
     ```

7. **Access the application:**
   - Web App: `http://localhost:3000`
   - Real-Time Chat WebSocket: `http://localhost:3001`

---

## Git Workflow & Branching Strategy

We follow standard feature-branch workflows:

| Branch Type | Format | Example |
| :--- | :--- | :--- |
| Feature | `feat/short-description` | `feat/kanban-swimlanes` |
| Bug Fix | `fix/short-description` | `fix/chat-unread-counter` |
| Performance | `perf/short-description` | `perf/query-memoization` |
| Documentation | `docs/short-description` | `docs/api-spec` |
| Refactor | `refactor/short-description` | `refactor/ticket-state` |

---

## Commit Message Guidelines

We enforce the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<optional scope>): <description>

[optional body]

[optional footer(s)]
```

### Common Types:
- `feat`: A new feature for the user
- `fix`: A bug fix
- `docs`: Documentation updates only
- `style`: Formatting, missing semicolons, no code change
- `refactor`: Code restructuring without changing behavior or fixing bugs
- `perf`: Code change that improves performance
- `test`: Adding or correcting tests
- `chore`: Build tasks, package updates, dev tooling

### Examples:
- `feat(chat): add desktop audio cue for direct mentions`
- `fix(tickets): correct drag-and-drop status update state race`
- `docs(readme): add high-level enterprise architecture diagram`

---

## Coding Standards

### TypeScript & React
- **Strict Typing**: Avoid `any`. Use descriptive interfaces and types located in `src/lib/types.ts`.
- **Component Architecture**: Keep UI components modular and single-purpose. Leverage hooks for state and query logic.
- **Icons**: Standardize on `lucide-react`. Maintain consistent sizing (`size={16}` for inline actions, `size={20}` for headers).
- **Styling**: Use Tailwind CSS v4 design tokens. Adhere to the clean, enterprise-neutral color system (70% white / 20% dark neutral / 10% accent).

### SQL & Database
- **Parameterized Queries**: Always use parameterized placeholders (`$1, $2, ...`) with `dbQuery` or `pool.query` to prevent SQL injection vulnerabilities.
- **Idempotent Migrations**: SQL migration scripts must use `IF NOT EXISTS` and `ON CONFLICT` semantics so they can safely re-run.

---

## Security Disclosures

If you discover a security vulnerability within Apex ERP, please do **not** open a public issue. Instead, report it responsibly to `security@apex-erp.org` (or contact the core maintainers privately). We will investigate and address verified vulnerabilities with high priority.

---

Thank you for helping make Apex ERP the premier open-source enterprise work operating system!
