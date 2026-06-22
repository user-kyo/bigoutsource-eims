# Employee Information Management System (EIMS)

A modern, full-stack Employee Information Management System built with a React + Vite frontend, a Node.js + Express backend, and powered by Supabase.

---

## 🚀 Tech Stack

- **Frontend:** React, Vite, TypeScript
- **Backend:** Node.js, Express.js
- **Database & Auth:** Supabase (PostgreSQL, Row Level Security)
- **Containerization:** Docker & Docker Compose

---

## 📂 Project Structure

```text
eims/
├── frontend/            # React + Vite frontend application
├── backend/             # Express API server
├── docker-compose.yml   # Docker local development configuration
└── README.md
```

---

## 🐳 Quick Start (Recommended)

The easiest way to run the project locally with **hot-reloading** enabled is by using Docker Compose.

### 1. Environment Variables
Create `.env` files in both the `frontend` and `backend` directories by copying their respective templates:

**Frontend** (`frontend/.env`):
```env
VITE_API_BASE_URL=http://localhost:5001/api
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
```

**Backend** (`backend/.env`):
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
*(Note: Keep the service-role key out of any `VITE_` variables to ensure security).*

### 2. Database Setup
Before starting the API, run the following SQL script in your Supabase SQL Editor:
- `backend/sql/auth_setup.sql`: Creates/updates `public.user_profiles` for pending account approvals.

### 3. Spin up the Containers
From the root directory, run:
```bash
docker compose up --build
```
- The **Frontend** will be available at `http://localhost:3000`
- The **Backend API** will be available at `http://localhost:5001`

When you're done, gracefully shut everything down with:
```bash
docker compose down
```

---

## 💻 Manual Setup (Without Docker)

If you prefer to run the servers directly on your host machine without Docker:

### Backend Setup
```bash
cd backend
npm install
npm run dev
```
*The backend server will start on `http://localhost:5001`.*

### Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*The React app will start on `http://localhost:3000`.*

---

## 🔐 Super Admin Access

In local development, the system will automatically seed a Super Admin account using the `SEED_SUPER_ADMIN_*` variables in `backend/.env`. If you do not explicitly set them, it defaults to:
- **Email:** `kamote@gmail.com`
- **Password:** `kamote123`

*Note: Production environments do not use this fallback for security reasons.*