# Employee Tracking System

React + Vite frontend with a Node.js and Express API backed by Supabase.

## Project Layout

```text
eims/
├── frontend/            # React + Vite frontend
├── backend/             # Express API for Supabase
└── README.md
```

Frontend code lives in `frontend/`. Backend code lives in `backend/`.

## Running with Docker

You can run the entire application stack using Docker Compose. Ensure you have Docker and Docker Compose installed.

1. Ensure you have created `.env` files in both the `frontend` and `backend` directories (you can copy their respective `.env.example` files).
2. Run the following command from the root directory:

```bash
docker-compose up --build
```

This will build and start both the frontend (served via Nginx on `http://localhost:3000`) and the backend (Node.js API on `http://localhost:5001`).

## Frontend Setup

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Set the backend URL and browser-safe Supabase credentials in `.env`:

```env
VITE_API_BASE_URL=http://localhost:5001/api
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
```

Default frontend URL: `http://localhost:3000`

## Backend Setup

```bash
cd backend
npm install
copy .env.example .env
```

Set the Supabase server credentials in `backend/.env`:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
SEED_SUPER_ADMIN_EMAIL=kamote@gmail.com
SEED_SUPER_ADMIN_PASSWORD=kamote123
SEED_SUPER_ADMIN_FULL_NAME=Local Super Admin
SEED_SUPER_ADMIN_DEPARTMENT=Administration
SEED_SUPER_ADMIN_SITE=HQ
```

In local development, the API uses `kamote@gmail.com` / `kamote123` as the seeded super admin when the `SEED_SUPER_ADMIN_*` variables are unset. Production does not use this fallback.

Keep the service-role key out of root `.env` and out of any `VITE_` variable.

Run `backend/sql/auth_setup.sql` in the Supabase SQL Editor before starting the API. It creates/updates `public.user_profiles` for pending account approvals.

Start the API:

```bash
npm run dev
```

Default backend URL: `http://localhost:5001`
