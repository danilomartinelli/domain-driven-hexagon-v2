# Playbook

Guia prático para rodar o projeto localmente e preparar para produção.

**Pré-requisitos:** Docker, Node 22 (via Volta), pnpm 9.15.4.

## 1. Rodando a API localmente

### 1.1 Subir a infraestrutura

O docker-compose de dev sobe PostgreSQL, Flyway (migrations automáticas) e PgAdmin:

```bash
cd apps/api
pnpm docker:env
```

Isso cria:

| Serviço    | Porta | Descrição                          |
|------------|-------|------------------------------------|
| PostgreSQL | 5432  | Banco `ddh` (user/password)        |
| PgAdmin    | 5050  | UI do banco (admin@email.com/admin)|
| Flyway     | —     | Roda migrations e encerra          |

### 1.2 Configurar variáveis de ambiente

```bash
cd apps/api
cp .env.example .env
```

O `.env` padrão já aponta para o PostgreSQL do compose:

```
DB_HOST='localhost'
DB_PORT=5432
DB_USERNAME='user'
DB_PASSWORD='password'
DB_NAME='ddh'
```

### 1.3 Seed (dados iniciais)

```bash
cd apps/api
pnpm seed:up
```

Executa todos os arquivos `.sql` em `database/seeds/` em ordem alfabética.

### 1.4 Iniciar o servidor

```bash
# Da raiz do monorepo (usa turbo, builda dependências automaticamente)
pnpm dev

# Ou direto do app
cd apps/api
pnpm start:dev
```

### 1.5 Endpoints disponíveis

| URL                          | Descrição       |
|------------------------------|-----------------|
| http://localhost:3000         | API REST        |
| http://localhost:3000/docs    | Swagger/OpenAPI |
| http://localhost:3000/graphql | GraphQL         |
| http://localhost:5050         | PgAdmin         |

---

## 2. Migrations

O projeto usa [Flyway](https://flywaydb.org/) para migrations versionadas.

### 2.1 Como funciona

- Migrations ficam em `apps/api/database/migrations/`
- Convenção de nome: `V<número>__<descrição>.sql` (dois underscores)
- Flyway roda automaticamente ao subir o docker-compose (dev ou test)
- Ele rastreia quais migrations já foram aplicadas na tabela `flyway_schema_history`

### 2.2 Criar uma nova migration

Crie um arquivo SQL com o próximo número da sequência:

```bash
# Verificar o último número
ls apps/api/database/migrations/
# V1__users.sql  V2__wallets.sql

# Criar a próxima
touch apps/api/database/migrations/V3__orders.sql
```

Exemplo de conteúdo:

```sql
CREATE TABLE "orders" (
  "id" character varying NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "userId" character varying NOT NULL,
  "amount" integer NOT NULL DEFAULT 0,
  CONSTRAINT "PK_orders" PRIMARY KEY ("id")
);
```

### 2.3 Aplicar migrations

Basta reiniciar o compose — o Flyway roda automaticamente:

```bash
cd apps/api

# Derrubar e subir novamente
docker compose --file docker/docker-compose.yml down
pnpm docker:env
```

### 2.4 Resetar o banco do zero

Para re-aplicar todas as migrations desde o início:

```bash
cd apps/api

# Derrubar incluindo o volume persistido
docker compose --file docker/docker-compose.yml down -v

# Subir novamente (Flyway roda todas as migrations)
pnpm docker:env

# Re-aplicar seeds se necessário
pnpm seed:up
```

---

## 3. Rodando testes

### 3.1 Testes unitários

Não precisam de banco de dados:

```bash
# Da raiz (todos os workspaces via turbo)
pnpm test

# Ou direto do app
cd apps/api
pnpm test

# Arquivo específico
cd apps/api
npx jest --config .jestrc.json src/modules/user/domain/user.entity.spec.ts
```

### 3.2 Testes E2E

Precisam de um banco de testes rodando. O compose de teste usa porta e banco separados (5433 / `ddh_tests`):

```bash
cd apps/api

# 1. Subir o banco de testes (PostgreSQL + Flyway)
pnpm docker:test

# 2. Rodar os testes E2E
pnpm test:e2e

# 3. Derrubar o banco de testes
pnpm docker:test:down
```

**Safety check:** O Jest verifica que o nome do banco contém "test" antes de rodar. Se o `.env.test` estiver apontando para o banco de dev, os testes falham com erro explicativo.

### 3.3 Resetar o banco de testes

```bash
cd apps/api
docker compose -f docker/docker-compose.test.yml down -v
pnpm docker:test
```

---

## 4. Produção

### 4.1 Estratégia recomendada

A abordagem sugerida é:

1. **Multi-stage Dockerfile** — build leve com apenas o necessário para runtime
2. **Flyway como init container** — roda migrations antes da API subir, sem acoplar migration no entrypoint da app
3. **docker-compose.prod.yml** — orquestra PostgreSQL + Flyway (init) + API

Vantagens dessa abordagem:
- A API não precisa saber rodar migrations — separação de responsabilidades
- Flyway roda e encerra antes da API iniciar (via `depends_on` + `service_completed_successfully`)
- Se a migration falhar, a API não sobe

### 4.2 Dockerfile

```dockerfile
# ---- Build stage ----
FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copiar manifests primeiro (cache de dependências)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/core/package.json packages/core/
COPY packages/nestjs-slonik/package.json packages/nestjs-slonik/

RUN pnpm install --frozen-lockfile

# Copiar código fonte
COPY apps/api/ apps/api/
COPY packages/core/ packages/core/
COPY packages/nestjs-slonik/ packages/nestjs-slonik/

RUN pnpm build

# Podar devDependencies
RUN pnpm prune --prod

# ---- Runtime stage ----
FROM node:22-alpine AS runtime

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copiar apenas o necessário do build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/
COPY --from=build /app/packages/core/dist ./packages/core/dist
COPY --from=build /app/packages/core/package.json ./packages/core/
COPY --from=build /app/packages/nestjs-slonik/dist ./packages/nestjs-slonik/dist
COPY --from=build /app/packages/nestjs-slonik/package.json ./packages/nestjs-slonik/
COPY --from=build /app/package.json ./
COPY --from=build /app/pnpm-workspace.yaml ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]
```

### 4.3 docker-compose.prod.yml

```yaml
services:
  postgres:
    image: postgres:alpine
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: '${DB_USERNAME}'
      POSTGRES_PASSWORD: '${DB_PASSWORD}'
      POSTGRES_DB: '${DB_NAME}'
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${DB_USERNAME} -d ${DB_NAME}']
      interval: 5s
      timeout: 5s
      retries: 5

  flyway:
    image: redgate/flyway
    command: >
      -url=jdbc:postgresql://postgres:5432/${DB_NAME}
      -user=${DB_USERNAME}
      -password=${DB_PASSWORD}
      migrate
    volumes:
      - ./apps/api/database/migrations:/flyway/sql
    depends_on:
      postgres:
        condition: service_healthy

  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - '3000:3000'
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USERNAME: '${DB_USERNAME}'
      DB_PASSWORD: '${DB_PASSWORD}'
      DB_NAME: '${DB_NAME}'
      NODE_ENV: production
    depends_on:
      flyway:
        condition: service_completed_successfully

volumes:
  pgdata:
```

### 4.4 Como rodar

```bash
# Criar um .env.prod com as credenciais
cat > .env.prod <<EOF
DB_USERNAME=prod_user
DB_PASSWORD=strong_password_here
DB_NAME=ddh
EOF

# Subir tudo (Flyway roda migrations, depois API inicia)
docker compose -f docker-compose.prod.yml --env-file .env.prod up --build -d

# Ver logs
docker compose -f docker-compose.prod.yml logs -f api
```

### 4.5 Rodando migrations em produção isoladamente

Para rodar migrations sem subir a API (ex: antes de um deploy):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up flyway
```

O Flyway roda as migrations pendentes e encerra. Depois basta fazer deploy da nova versão da API.
