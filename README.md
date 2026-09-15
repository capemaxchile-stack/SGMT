# SGMT — Sistema de Gestión Movimiento de Tierra

Management system for earthmoving companies operating multiple job sites. Handles purchases, warehouse/inventory, fleet management, budget control, and hierarchical authorization workflows.

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) 24+
- [Docker Compose](https://docs.docker.com/compose/) v2+
- [Node.js](https://nodejs.org/) 20 LTS (for local development)

### Setup

```bash
# 1. Clone and enter the project
cd sgmt

# 2. Copy environment variables
cp .env.example .env

# 3. Start all services
docker compose up -d

# 4. Run database migrations
docker compose exec api npx prisma migrate dev

# 5. Seed the database
docker compose exec api npm run db:seed
```

### Access

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | — |
| API | http://localhost:3000/api | — |
| API Health | http://localhost:3000/api/health | — |
| DB Admin | http://localhost:8080 | (start with `--profile dev-tools`) |

### Default Users (after seed)

| Email | Password | Role |
|-------|----------|------|
| admin@sgmt.local | admin123 | System Admin |
| super@sgmt.local | super123 | Super User (auth key: super_auth_2026) |

## Project Structure

```
sgmt/
├── api/                  # Backend — NestJS + Prisma
│   ├── prisma/           # Schema, migrations, seed
│   └── src/
│       ├── common/       # Guards, decorators, interceptors
│       └── modules/      # Feature modules (auth, faenas, bodega, etc.)
├── web/                  # Frontend — React + Vite + shadcn/ui
│   └── src/
│       ├── components/   # UI components + layout
│       ├── pages/        # Page components
│       ├── stores/       # Zustand state stores
│       └── types/        # TypeScript interfaces
├── docker/               # Docker support files
│   ├── nginx/            # Nginx config (production)
│   └── postgres/         # DB init scripts
├── docker-compose.yml    # Local development orchestration
└── .env.example          # Environment variable template
```

## Development

### Local development (without Docker)

```bash
# Start PostgreSQL (Docker or local install)
docker compose up db -d

# Backend
cd api
npm install
npx prisma migrate dev
npm run db:seed
npm run start:dev

# Frontend (separate terminal)
cd web
npm install
npm run dev
```

### Useful commands

```bash
# View logs
docker compose logs -f api

# Open Prisma Studio (DB GUI)
cd api && npx prisma studio

# Reset database
docker compose exec api npx prisma migrate reset

# Run with DB admin tool
docker compose --profile dev-tools up -d
```

## Architecture

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: NestJS + TypeScript + Prisma ORM
- **Database**: PostgreSQL 16
- **Auth**: JWT (access + refresh tokens) + bcrypt
- **Containerization**: Docker + Docker Compose

## License

Private — SAMTECH S.A.
