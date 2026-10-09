# 42-Team-Project
Projeto em grupo passado para bolsistas da Turma 4

## Como rodar o projeto

Pré-requisitos: Node.js ≥ 22.12 e pnpm ≥ 12.6.

```bash
# 1. Instalar dependências (executa o build nativo do better-sqlite3)
pnpm install

# 2. Criar o .env a partir do exemplo e preencher os secrets.
#    O frontend (apps/web/next.config.ts) e o backend (apps/api) leem
#    este mesmo arquivo, que vive na raiz do monorepo.
cp .env.example .env
# Gere os dois secrets (32 bytes base64 cada) e cole em .env:
#   openssl rand -base64 32
#   openssl rand -base64 32

# 3. Iniciar backend (porta 3001) e frontend (porta 3000) em paralelo.
#    O servidor api sobe sem o banco (a conexão SQLite é preguiçosa);
#    as tabelas e o usuário admin são criados no próximo passo.
#    Deixe este terminal rodando.
pnpm dev
```

Em **outro terminal**:

```bash
# 4. Aplicar a migration (cria as tabelas) e popular o banco com o admin
pnpm --filter @bolder/api db:migrate
pnpm --filter @bolder/api seed
```

Abra <http://localhost:3000>. Login de demonstração: `admin@bolder.local` / `admin123`.

Comandos úteis:

| Comando | Efeito |
|---|---|
| `pnpm turbo run typecheck` | Verificação estrita do TypeScript em todos os pacotes |
| `pnpm turbo run test` | Vitest em todos os pacotes |
| `pnpm turbo run lint` | ESLint flat config em todos os pacotes |
| `pnpm turbo run build` | Build de produção (Next.js + tsc para o backend) |
| `pnpm --filter @bolder/db db:generate` | Regenera a migration do Drizzle após mudanças no schema |
| `pnpm ports:clean` | Libera as portas 3000/3001 e mata processos órfãos do `dev` (recovery quando Ctrl+C não foi suficiente) |

Variáveis de ambiente: veja [`.env.example`](./.env.example) na raiz do monorepo para a lista completa. `AUTH_SECRET` e `JWT_SECRET` precisam ser substituídos por valores gerados (`openssl rand -base64 32`).

Para a arquitetura completa, os três shells de UI, os limites entre módulos e como adicionar um novo módulo, veja [`INFRA.md`](./INFRA.md).