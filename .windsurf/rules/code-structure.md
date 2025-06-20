---
trigger: always_on
---

Here's a summary of your Next.js project structure:

- **Root Directory (`.`):**

  - Contains configuration files crucial for your project's setup and deployment. Key files include:
    - `next.config.js`: Next.js specific configurations.
    - `tailwind.config.js`: Configuration for Tailwind CSS.
    - `tsconfig.json`: TypeScript configuration.
    - `package.json`: Lists project dependencies and scripts.
    - `Dockerfile`, `docker-compose.yml`, `fly.toml`: Files related to containerization and deployment.
  - Also includes other project files like `README.md`, `pm2.json` (for process management), and `pyproject.toml` (if Python is used alongside).

- **`public` Directory:**

  - Serves static assets directly from the root of your application.
  - This is where you place images (`favicon.svg`, `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`), fonts, and other static files that don't need processing by Webpack.

- **`services` Directory:**

  - This directory appears to house backend or auxiliary services written in Python.
  - It includes:
    - `data/mongo.py`: Likely for MongoDB interactions.
    - `mail_analyzer.py`, `mail_watcher.py`: Scripts for email processing.
    - `slack_agent.py`: A script for Slack integration.
    - `templates/default_prompt.md`: A template file, possibly for generating content.

- **`src` Directory:** This is the primary location for your application's source code.

  - **`src/app`:** This is the core of your Next.js application, following the App Router paradigm.
    - **Route Handlers & Pages:** Contains directories for different routes (e.g., `admin`, `api`). Each route directory can have `page.tsx` (for UI) and `route.ts` (for API endpoints).
    - **API Routes (`src/app/api`):** Defines your backend API endpoints. It's structured with subdirectories for different resources like `analyze/status`, `analyze/data`, `auth`, `hubspot`, `instructions`, `models`, `analyze`, and `users`.
    - **Layouts (`layout.tsx`, etc.):** Defines shared UI structures for different parts of your application.
    - **Global Styles (`globals.css`):** Contains global CSS rules.
    - **Core Components/Providers (`AppProvider`, `ThemeProvider`, `context.tsx`):** Likely for managing global state, theme, and context.
    - **Client-side Services (`src/app/services`):** Contains client-side logic, such as `google.ts` and `mongodb.ts` (possibly for client-side interactions with these services).
  - **`src/components`:** Houses reusable UI components used throughout your application.
    - Organized by feature or type, for example: `AnalyzedEmails`, `Dashboard`, `Header`, `Instructions`, `UserCard`.
    - Components often have their own subdirectories for related files (e.g., `AnalyzedMailCard` within `AnalyzedEmails`).
    - May include component-specific state management (e.g., `store` within `AnalyzedEmails`).
  - **`src/types`:** Contains TypeScript type definitions, like `next-auth.d.ts` for NextAuth.
  - **`src/utils`:** Includes utility functions and helpers used across the application, such as `errorHandling.ts`, `formatDate.ts`, `isAdmin.ts`, and `logger`.

- **`venv` Directory:**
  - A standard directory for a Python virtual environment, isolating project-specific Python dependencies.

This summary should give you a good high-level understanding of how your Next.js project is organized
