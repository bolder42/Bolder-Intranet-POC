# 42-Team-Project
Projeto em grupo passado para bolsistas da Turma 4

## Como rodar o projeto

Pré-requisitos: Node.js ≥ 22.12 e pnpm ≥ 12.6.

```bash
# Instalar dependências (executa o build nativo do better-sqlite3)
pnpm install

# Iniciar backend (porta 3001) e frontend (porta 3000) em paralelo
pnpm turbo run dev
```

Abra <http://localhost:3000>. Login de demonstração (após popular o banco):

```bash
pnpm --filter @bolder/api db:migrate
pnpm --filter @bolder/api seed
# admin@bolder.local / admin123
```

Comandos úteis:

| Comando | Efeito |
|---|---|
| `pnpm turbo run typecheck` | Verificação estrita do TypeScript em todos os pacotes |
| `pnpm turbo run test` | Vitest em todos os pacotes |
| `pnpm turbo run lint` | ESLint flat config em todos os pacotes |
| `pnpm turbo run build` | Build de produção (Next.js + tsc para o backend) |
| `pnpm --filter @bolder/db db:generate` | Regenera a migration do Drizzle após mudanças no schema |

Variáveis de ambiente (veja `.env.example` para a lista completa): `DATABASE_URL`, `AUTH_SECRET`, `API_URL`, `NEXT_PUBLIC_API_URL`.

Para a arquitetura completa, os três shells de UI, os limites entre módulos e como adicionar um novo módulo, veja [`INFRA.md`](./INFRA.md).