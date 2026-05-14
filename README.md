# Ellybear POS

A web-based Point of Sale system for cafes — with inventory management, composite recipes, kitchen display, analytics, and multi-tenant support.

## Tech Stack

- **Frontend** — Next.js 15 (App Router), TypeScript, TailwindCSS, Redux Toolkit, Framer Motion
- **Backend** — NestJS, TypeScript, Prisma ORM
- **Database** — PostgreSQL 16
- **Cache / Queues** — Redis 7
- **Package manager** — Yarn workspaces

---

## Running Locally (without Docker)

You need **Node.js 18+**, **Yarn**, **PostgreSQL**, and **Redis** running on your machine.

### 1. Clone and install

```bash
git clone <repo-url>
cd ellybear-pos
yarn install
```

### 2. Configure environment

```bash
cp apps/backend/.env.example apps/backend/.env
```

Open `apps/backend/.env` and fill in:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/ellybear_pos"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
```

### 3. Set up the database

```bash
cd apps/backend
yarn db:generate   # generate Prisma client
yarn db:migrate    # run migrations
yarn db:seed       # seed demo data
```

### 4. Start the backend

```bash
# still inside apps/backend
yarn dev
# API running at http://localhost:4000
```

### 5. Start the frontend

Open a new terminal tab:

```bash
cd apps/frontend
yarn dev
# App running at http://localhost:3000
```

---

## Demo Login

After seeding, log in with:

| Field    | Value                  |
|----------|------------------------|
| Email    | `owner@democafe.com`   |
| Password | `password123`          |

---

## Pages

| Route          | Description                              |
|----------------|------------------------------------------|
| `/login`       | Email + password auth                    |
| `/home`        | Dashboard — KPIs, recent orders, modules |
| `/pos`         | POS terminal — take orders + checkout    |
| `/inventory`   | Products + stock levels + recipe builder |
| `/analytics`   | Revenue charts, top products             |
| `/employees`   | Team management with PIN assignment      |
| `/customers`   | Customer list + loyalty tiers            |
| `/settings`    | Store info, tax rates, categories        |
| `/kds`         | Kitchen Display System (dark board)      |

---

## Project Structure

```
ellybear-pos/
├── apps/
│   ├── backend/        # NestJS API (port 4000)
│   │   ├── prisma/     # schema + migrations + seed
│   │   └── src/
│   │       └── modules/  # auth, products, orders, inventory, kds, ...
│   └── frontend/       # Next.js app (port 3000)
│       └── src/
│           ├── app/    # App Router pages
│           ├── components/
│           └── store/  # Redux slices
└── package.json        # Yarn workspace root
```
