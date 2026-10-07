# 42-Team-Project
Projeto em grupo passado para bolsistas da Turma 4

## How to run the project

Prerequisites: Node.js ≥ 22.12 and pnpm ≥ 12.6.

```bash
# Install dependencies (runs better-sqlite3 native build)
pnpm install

# Start backend (port 3001) and frontend (port 3000) in parallel
pnpm turbo run dev
```

Open <http://localhost:3000>. Demo login (after seeding the DB):

```bash
pnpm --filter @bolder/api db:migrate
pnpm --filter @bolder/api seed
# admin@bolder.local / admin123
```

Useful one-shot commands:

| Command | Effect |
|---|---|
| `pnpm turbo run typecheck` | Strict TypeScript check across all packages |
| `pnpm turbo run test` | Vitest across all packages |
| `pnpm turbo run lint` | ESLint flat config across all packages |
| `pnpm turbo run build` | Production build (Next.js + tsc for backend) |
| `pnpm --filter @bolder/db db:generate` | Regenerate Drizzle migration after schema changes |

Environment variables (see `.env.example` for the full list): `DATABASE_URL`, `AUTH_SECRET`, `API_URL`, `NEXT_PUBLIC_API_URL`.

For the full architecture, three UI shells, module boundaries, and how to add a new module, see [`INFRA.md`](./INFRA.md).