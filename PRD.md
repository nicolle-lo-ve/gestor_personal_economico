\# DOCUMENTO DE ESPECIFICACIONES TÉCNICAS (PRD) — GESTOR ECONÓMICO PERSONAL



> \*\*Versión:\*\* 1.0 · \*\*Idioma de UI:\*\* español (es-PE) · \*\*Idioma del código:\*\* inglés

> \*\*Destinatario:\*\* agente autónomo de codificación (CLI) que construirá \*\*la aplicación completa\*\* (backend + frontend + infraestructura local) a partir de este único documento.

> \*\*Fuente de verdad:\*\* este archivo. Si algo aquí es ambiguo, el agente decide siguiendo KISS/YAGNI y lo registra en `docs/DECISIONS.md` \*\*sin detenerse a preguntar\*\*.



\---



\## 0. PROTOCOLO DE EJECUCIÓN PARA EL AGENTE (LEER PRIMERO)



\### 0.1 Rol

Actúa como Arquitecto de Software Cloud Native, DBA e Ingeniero Full-Stack Senior. Entrega un monorepo funcional, probado y documentado.



\### 0.2 Reglas no negociables

1\. \*\*Monorepo\*\* con `backend/`, `frontend/`, `docker-compose.yml`, `README.md`, `docs/`. Ver §1.5.

2\. \*\*Arquitectura N-Capas estricta\*\* en backend y frontend, con la regla de dependencias de §1.4 y §4.2. Toda violación es un defecto.

3\. \*\*Dinero:\*\* nunca `float`/`number` para cálculos. BD: `NUMERIC(14,2)`. Backend: `Prisma.Decimal`/`decimal.js`. API y frontend: \*\*string decimal\*\* con 2 decimales (`"1250.50"`). Frontend opera en centavos enteros vía `domain/money.ts`.

4\. \*\*Fechas:\*\* `YYYY-MM-DD` para fechas calendario, ISO 8601 UTC para timestamps. Prohibido `new Date("YYYY-MM-DD")` en el frontend; usar `date-fns` (`parseISO`, `format`, locale `es`).

5\. \*\*Toda consulta filtra por `user\_id`\*\* del token. Un recurso de otro usuario responde `404`, nunca `403` (no revelar existencia).

6\. \*\*Usar `PUT` (reemplazo completo), no `PATCH`.\*\*

7\. \*\*No añadir dependencias ni funcionalidades fuera de este documento.\*\* Fuera de alcance: ver §6.3.

8\. \*\*Sin secretos en el repo.\*\* Solo `.env.example`.

9\. \*\*No detenerte\*\* hasta completar la Definición de Hecho (§6.4). No pidas confirmación entre fases.



\### 0.3 Cómo trabajar

\- Ejecuta las \*\*fases de §6.1 en orden\*\*. Al terminar cada fase: corre sus comandos de verificación, corrige hasta que pasen y haz un commit (`feat(fase-N): …`).

\- Escribe primero el dominio y las interfaces; luego implementaciones; luego tests.

\- Si un comando falla, diagnostica y corrige; no omitas tests ni relajes el tipado (`strict: true`).

\- Al final, ejecuta el checklist de §6.4 y escribe el resultado en `docs/ACCEPTANCE.md`.



\### 0.4 Stack tecnológico fijado

| Capa | Tecnología |

|---|---|

| Runtime | Node.js 22 LTS, npm workspaces \*\*no\*\* (dos proyectos independientes) |

| Backend | NestJS 10+ (TypeScript `strict`), `class-validator` + `class-transformer`, `@nestjs/jwt`, `@nestjs/throttler`, `helmet`, `argon2`, `@nestjs/swagger` |

| ORM / BD | Prisma ORM detrás de interfaces de repositorio · PostgreSQL 16 |

| Reportes | `fast-csv`, `pdfkit` |

| Tests backend | Jest, `supertest` (e2e contra PostgreSQL de Docker) |

| Frontend | React 18 + TypeScript `strict` + Vite + Tailwind CSS + shadcn/ui + `lucide-react` |

| Frontend libs | `react-router-dom` v6, `@tanstack/react-query` (+ `react-query-persist-client`, `query-async-storage-persister`), `zustand`, `react-hook-form`, `@hookform/resolvers`, `zod`, `axios`, `idb-keyval`, `recharts`, `date-fns`, `sonner`, `vite-plugin-pwa`, `workbox-window`, `@fontsource-variable/inter`, `vitest`, `@testing-library/react`. `jspdf` \*\*solo\*\* dentro de `services/mock`. |

| Infra local | Docker Compose: `db` (postgres:16), `api`, `web` (nginx sirviendo el build estático) |



\### 0.5 Identidad del producto

Nombre: \*\*Gestor Económico Personal\*\* · Nombre corto PWA: \*\*Mi Gestor\*\* · Moneda por defecto `PEN` (símbolo `S/`) · Locale `es-PE` · Tono: cercano, claro, sin jerga financiera.



\---



\## 1. ARQUITECTURA GENERAL DEL SISTEMA



\### 1.1 Diagrama conceptual de N-Capas (lógicas) sobre 3 tiers físicos



Las capas son \*\*lógicas\*\* (separación por responsabilidad). Se despliegan en \*\*tres tiers físicos\*\*: PWA estática, API y base de datos.



```

┌─────────────────────────────────────────────────────────────────────┐

│ TIER 1 · PWA (navegador / móvil instalada)                          │

│  CAPA 1 · Presentación   pages/ · components/ · layouts/            │

│  CAPA 2 · Aplicación     features/\*/hooks (casos de uso, Facade)    │

│  CAPA 3 · Dominio        domain/ (tipos, Zod, money, reglas puras)  │

│  CAPA 4 · Infraestruct.  services/ (ports · http · mock · factory)  │

│  Service Worker: precaché del shell · caché de queries en IndexedDB │

└───────────────────────────────┬─────────────────────────────────────┘

&#x20;                               │ HTTPS · JSON · REST · JWT Bearer

┌───────────────────────────────▼─────────────────────────────────────┐

│ TIER 2 · API REST (NestJS)                                          │

│  CAPA A · Aplicación/Servicios de entrada (API Gateway/Routers):    │

│           Controllers + DTOs + Guards + Pipes + Filters + Throttler │

│  CAPA B · Negocio: Services + reglas de dominio puras               │

│           (balances, deudas, metas, estadísticas, reportes)         │

│  CAPA C · Datos: interfaces de Repository (puertos) +               │

│           implementaciones Prisma (adaptadores)                     │

└───────────────────────────────┬─────────────────────────────────────┘

&#x20;                               │ SQL (Prisma / driver pg)

┌───────────────────────────────▼─────────────────────────────────────┐

│ TIER 3 · PostgreSQL 16                                              │

└─────────────────────────────────────────────────────────────────────┘

```



\*\*Correspondencia con las capas pedidas:\*\*

| Capa solicitada | Implementación |

|---|---|

| Presentación (PWA Frontend) | Tier 1 completo (capas 1–4 del cliente). |

| Aplicación/Servicios (API Gateway/Routers) | Controllers NestJS, DTOs, guards, pipes, filtros de excepción, versionado `/api/v1`. |

| Negocio (Controladores y Lógica de Balances) | `\*.service.ts` + `domain/rules/\*` (funciones puras). |

| Datos (ORM/Drivers) | `\*.repository.ts` (interfaz) + `prisma-\*.repository.ts` + Prisma/`pg`. |



\### 1.2 Regla de dependencia del backend (validable)

```

Controller ──► Service ──► Repository (INTERFAZ)  ◄── PrismaRepository

&#x20;  (HTTP)     (negocio)      (puerto)                  (adaptador)

```

\- Un \*\*Controller\*\* solo conoce DTOs y Services. Jamás Prisma ni reglas de negocio.

\- Un \*\*Service\*\* solo conoce \*\*interfaces\*\* de repositorio (inyectadas por token) y `domain/rules`. Jamás `PrismaClient`, `Request`, `Response` ni códigos HTTP (lanza excepciones de dominio: `NotFoundError`, `BusinessRuleError`, `ConflictError`).

\- Un \*\*Repository Prisma\*\* solo persiste/consulta. No decide reglas.

\- Un `ExceptionFilter` global traduce excepciones de dominio → respuesta JSON estándar (§3.2).

\- Transacciones atómicas: interfaz `UnitOfWork` (`run<T>(fn: (tx) => Promise<T>)`) implementada con `prisma.$transaction`, usada por los services que escriben en varias tablas.



\### 1.3 Cumplimiento de SoC y SOLID (concreto)

| Principio | Aplicación exacta |

|---|---|

| \*\*SoC\*\* | Cada capa tiene responsabilidad exclusiva (tabla en §1.6). Módulos por dominio: `auth`, `users`, `categories`, `transactions`, `debts`, `goals`, `dashboard`, `reports`, `health`. |

| \*\*SRP\*\* | `DebtsService` solo gestiona deudas y pagos; `ReportsService` solo arma reportes; `DashboardService` solo lectura/estadística; controladores delgados (≤ 10 líneas por handler). |

| \*\*OCP\*\* | Reportes con Strategy: `ReportExporter` (`csv`, `pdf`). Añadir `xlsx` = crear `XlsxExporter` y registrarlo, sin tocar código existente. En el frontend: `ReportDownloader` y `ChartStrategy`. |

| \*\*LSP\*\* | `PrismaTransactionRepository` e `InMemoryTransactionRepository` (tests) son intercambiables; `CsvExporter`/`PdfExporter` también; en el cliente `Mock\*Api` y `Http\*Api` cumplen el mismo contrato (suite de contrato compartida). |

| \*\*ISP\*\* | Interfaces pequeñas: `TransactionReader` (consultas/estadísticas) y `TransactionWriter` (escritura); `UserReader`; en el cliente `TransactionsApi`, `DebtsApi`… nunca un `Api` gigante. |

| \*\*DIP\*\* | Los services reciben tokens de inyección (`TRANSACTION\_READER`, `TRANSACTION\_WRITER`, `DEBT\_REPOSITORY`, `UNIT\_OF\_WORK`, `CLOCK`). Los hooks del cliente obtienen servicios vía `useServices()` (React Context). El reloj (`Clock`) se inyecta para poder testear "hoy". |

| \*\*KISS/YAGNI\*\* | Sin CQRS, sin eventos, sin microservicios, sin cola offline en v1, sin multi-idioma. |

| \*\*DRY\*\* | Un esquema Zod por formulario (cliente); un DTO por operación (servidor); reglas de dominio puras compartidas por Mock y tests. |



Ejemplo obligatorio de DIP (backend):

```ts

export const TRANSACTION\_WRITER = Symbol('TRANSACTION\_WRITER');

export interface TransactionWriter {

&#x20; create(tx: Tx | null, data: NewTransaction): Promise<TransactionEntity>;

&#x20; update(tx: Tx | null, userId: string, id: string, data: NewTransaction): Promise<TransactionEntity | null>;

&#x20; delete(tx: Tx | null, userId: string, id: string): Promise<boolean>;

&#x20; deleteMany(tx: Tx | null, userId: string, range?: { from?: string; to?: string }): Promise<number>;

}

@Injectable()

export class TransactionsService {

&#x20; constructor(

&#x20;   @Inject(TRANSACTION\_READER) private readonly reader: TransactionReader,

&#x20;   @Inject(TRANSACTION\_WRITER) private readonly writer: TransactionWriter,

&#x20;   @Inject(UNIT\_OF\_WORK) private readonly uow: UnitOfWork,

&#x20;   @Inject(CLOCK) private readonly clock: Clock,

&#x20; ) {}

}

```



\### 1.4 Regla de dependencias del frontend

| Desde ↓ / Hacia → | pages | components | features | services | domain |

|---|---|---|---|---|---|

| \*\*pages\*\* | — | ✅ | ✅ | ❌ | ✅ |

| \*\*components\*\* | ❌ | ✅ | ✅ (solo hooks) | ❌ | ✅ |

| \*\*features\*\* | ❌ | ❌ | ✅ | ✅ (solo `ports` vía `useServices`) | ✅ |

| \*\*services\*\* | ❌ | ❌ | ❌ | ✅ | ✅ |

| \*\*domain\*\* | ❌ | ❌ | ❌ | ❌ | ✅ |



Prohibido: `import axios` fuera de `services/http`; `import 'idb-keyval'` fuera de `services/mock` y `app/providers/QueryProvider.tsx`; usar `localStorage` fuera de `services/http/tokenStorage.ts`, `features/ui-store.ts` y `pwa/`. \*\*Añade una regla ESLint `no-restricted-imports` que haga fallar el lint ante estas violaciones.\*\*



\### 1.5 Estructura del monorepo (crear exactamente)



```

gestor-economico/

├── README.md                       # arranque, variables, migración Mock→API

├── SPEC.md                         # copia de este documento

├── docker-compose.yml

├── .env.example

├── docs/  (DECISIONS.md, ACCEPTANCE.md, openapi.json generado)

├── backend/

│   ├── prisma/ (schema.prisma, migrations/, seed.ts)

│   ├── src/

│   │   ├── main.ts, app.module.ts

│   │   ├── common/

│   │   │   ├── errors/ (domain-errors.ts, all-exceptions.filter.ts)

│   │   │   ├── guards/ (jwt-auth.guard.ts), decorators/ (current-user.decorator.ts)

│   │   │   ├── money/ (money.ts: Decimal helpers, toMoneyString)

│   │   │   ├── time/ (clock.ts, month-range.ts)

│   │   │   └── uow/ (unit-of-work.ts, prisma-unit-of-work.ts)

│   │   └── modules/

│   │       ├── auth/ users/ categories/ transactions/ debts/ goals/

│   │       ├── dashboard/ reports/ (exporters/) health/

│   │       └── <mod>/ {controller, dto/, service, rules/, repository (interfaz), prisma-repository}

│   └── test/ (e2e/\*.e2e-spec.ts, fakes/)

└── frontend/

&#x20;   ├── index.html, vite.config.ts, tailwind.config.ts, .env.example

&#x20;   ├── public/icons/ (icon-192.png, icon-512.png, icon-maskable-512.png)

&#x20;   └── src/ (estructura exacta en §4.2)

```



\### 1.6 Responsabilidades por capa (backend)

| Capa | Hace | NO hace |

|---|---|---|

| Controller | Recibe HTTP, valida DTO, extrae `userId`, llama al service, devuelve JSON/stream. | Reglas de negocio, SQL, cálculos. |

| Service | Reglas ("pago ≤ saldo pendiente"), cálculo de balance, progreso de metas, orquestación de transacciones atómicas. | HTTP, JSON, ORM. |

| Repository | Consultas y persistencia detrás de interfaces; agregaciones SQL. | Decidir reglas. |



\### 1.7 Seguridad transversal

\- Contraseñas con \*\*argon2id\*\*. JWT: `accessToken` 15 min, `refreshToken` 7 días con \*\*rotación\*\* y almacenamiento \*\*hasheado\*\* (SHA-256) en `refresh\_tokens`; reutilización de un refresh revocado → revocar toda la familia del usuario.

\- `helmet`, CORS con lista blanca `CORS\_ORIGINS`, `@nestjs/throttler` (global 100 req/min; `/auth/login` y `/auth/register` 10 req/min por IP).

\- `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.

\- Logs sin datos sensibles (nunca contraseñas ni tokens). `GET /health` sin auth.

\- El borrado masivo exige `confirm=true` y corre en una transacción de BD.



\---



\## 2. CAPA DE DATOS (BASE DE DATOS Y PERSISTENCIA)



\### 2.1 Modelo Entidad-Relación



Correspondencia con los nombres solicitados: `Usuarios`→`users`, `Transacciones`→`transactions`, `Categorias`→`categories`, `Deudas`→`debts` (+ `debt\_payments`), `MetasAhorro`→`savings\_goals` (+ `goal\_contributions`). Se añade `refresh\_tokens` para sesiones.



```

users ──< categories

users ──< transactions >── categories

users ──< debts ──< debt\_payments

users ──< savings\_goals ──< goal\_contributions

users ──< refresh\_tokens

transactions >── debts               (debt\_id: préstamo recibido o pago de deuda)

transactions >── debt\_payments       (debt\_payment\_id: 1–1 opcional, espejo en balance)

transactions >── goal\_contributions  (goal\_contribution\_id: 1–1 opcional, espejo en balance)

```



| Relación | Cardinalidad | Borrado |

|---|---|---|

| users → categories/transactions/debts/savings\_goals/refresh\_tokens | 1:N | `ON DELETE CASCADE` |

| categories → transactions | 1:N | `RESTRICT` (no se borra categoría con movimientos) |

| debts → debt\_payments | 1:N | `CASCADE` |

| savings\_goals → goal\_contributions | 1:N | `CASCADE` |

| debts → transactions (`debt\_id`) | 1:N | `SET NULL` |

| debt\_payments → transactions | 1:0..1 | `CASCADE` (borrar el pago borra su movimiento espejo) |

| goal\_contributions → transactions | 1:0..1 | `CASCADE` |



\*\*Semántica de "acreedor/deudor" en `debts`:\*\* cada fila tiene `direction` y `counterparty`.

\- `I\_OWE` ("yo debo"): \*\*deudor = el usuario\*\*, \*\*acreedor = `counterparty`\*\*. Genera egresos futuros.

\- `OWED\_TO\_ME` ("me deben"): \*\*acreedor = el usuario\*\*, \*\*deudor = `counterparty`\*\*. Genera ingresos futuros.



\### 2.2 Diccionario de datos



\*\*Tipos ENUM (PostgreSQL):\*\* `category\_type` (`INCOME`,`EXPENSE`) · `debt\_direction` (`OWED\_TO\_ME`,`I\_OWE`) · `debt\_status` (`OPEN`,`PAID`) · `goal\_status` (`IN\_PROGRESS`,`ACHIEVED`,`CANCELLED`).



\#### `users`

| Campo | Tipo | Restricciones | Descripción |

|---|---|---|---|

| id | UUID | PK, default `gen\_random\_uuid()` | Identificador. |

| email | VARCHAR(255) | NOT NULL, UNIQUE (normalizado en minúsculas) | Login. |

| password\_hash | TEXT | NOT NULL | argon2id. |

| display\_name | VARCHAR(100) | NULL | Nombre visible. |

| currency | CHAR(3) | NOT NULL, default `'PEN'`, CHECK IN (`PEN`,`USD`,`EUR`,`COP`,`MXN`,`ARS`,`CLP`,`BOB`) | Solo símbolo; no convierte. |

| initial\_balance | NUMERIC(14,2) | NOT NULL, default 0, CHECK ≥ 0 | "Dinero actual" al empezar. |

| onboarding\_done | BOOLEAN | NOT NULL, default false | Pasa a true en el primer `PUT /users/me`. |

| created\_at | TIMESTAMPTZ | NOT NULL, default `now()` | |

| updated\_at | TIMESTAMPTZ | NOT NULL, default `now()` | |



\#### `refresh\_tokens`

| Campo | Tipo | Restricciones | Descripción |

|---|---|---|---|

| id | UUID | PK | |

| user\_id | UUID | NOT NULL, FK→users CASCADE | |

| token\_hash | CHAR(64) | NOT NULL, UNIQUE | SHA-256 hex del refresh token. |

| expires\_at | TIMESTAMPTZ | NOT NULL | |

| revoked\_at | TIMESTAMPTZ | NULL | Rotación/logout. |

| replaced\_by | UUID | NULL, FK→refresh\_tokens SET NULL | Cadena de rotación. |

| created\_at | TIMESTAMPTZ | NOT NULL, default `now()` | |



\#### `categories`

| Campo | Tipo | Restricciones | Descripción |

|---|---|---|---|

| id | UUID | PK | |

| user\_id | UUID | NOT NULL, FK→users CASCADE | |

| name | VARCHAR(60) | NOT NULL, CHECK `char\_length(name) >= 2` | |

| type | category\_type | NOT NULL | Inmutable tras crear. |

| system\_key | VARCHAR(30) | NULL | Clave estable (`LOAN`, `SALARY`…); NULL si es del usuario. |

| icon | VARCHAR(40) | NULL | Nombre de ícono lucide. |

| color | CHAR(7) | NULL, CHECK `color \~ '^#\[0-9a-fA-F]{6}$'` | |

| is\_system | BOOLEAN | NOT NULL, default false | No borrable ni cambia de tipo. |

| created\_at | TIMESTAMPTZ | NOT NULL | |

| — | — | UNIQUE (`user\_id`,`name`,`type`); UNIQUE parcial (`user\_id`,`system\_key`) WHERE `system\_key IS NOT NULL` | |



\#### `transactions` (ingresos y gastos en una sola tabla — KISS)

| Campo | Tipo | Restricciones | Descripción |

|---|---|---|---|

| id | UUID | PK | |

| user\_id | UUID | NOT NULL, FK→users CASCADE | |

| category\_id | UUID | NOT NULL, FK→categories RESTRICT | Debe ser del mismo usuario y del mismo `type`. |

| type | category\_type | NOT NULL | Debe coincidir con `categories.type`. |

| amount | NUMERIC(14,2) | NOT NULL, CHECK `amount > 0` | |

| description | VARCHAR(255) | NULL | |

| occurred\_at | DATE | NOT NULL, CHECK `>= '2000-01-01'` | |

| debt\_id | UUID | NULL, FK→debts SET NULL | Préstamo recibido o pago/cobro. |

| debt\_payment\_id | UUID | NULL, UNIQUE, FK→debt\_payments CASCADE | Movimiento espejo de un pago. |

| goal\_contribution\_id | UUID | NULL, UNIQUE, FK→goal\_contributions CASCADE | Espejo de un aporte. |

| created\_at | TIMESTAMPTZ | NOT NULL, default `now()` | |

| updated\_at | TIMESTAMPTZ | NOT NULL, default `now()` | |



\#### `debts`

| Campo | Tipo | Restricciones | Descripción |

|---|---|---|---|

| id | UUID | PK | |

| user\_id | UUID | NOT NULL, FK→users CASCADE | |

| direction | debt\_direction | NOT NULL | Ver semántica acreedor/deudor. |

| counterparty | VARCHAR(100) | NOT NULL, CHECK `char\_length >= 2` | Persona o entidad. |

| principal | NUMERIC(14,2) | NOT NULL, CHECK `> 0` | Monto original ("monto"). |

| due\_date | DATE | NULL | |

| status | debt\_status | NOT NULL, default `'OPEN'` | Derivado, persistido para filtrar/indexar. |

| note | VARCHAR(255) | NULL | |

| created\_at / updated\_at | TIMESTAMPTZ | NOT NULL | |



\#### `debt\_payments`

| Campo | Tipo | Restricciones | Descripción |

|---|---|---|---|

| id | UUID | PK | |

| debt\_id | UUID | NOT NULL, FK→debts CASCADE | |

| amount | NUMERIC(14,2) | NOT NULL, CHECK `> 0` | |

| paid\_at | DATE | NOT NULL | |

| note | VARCHAR(255) | NULL | |

| created\_at | TIMESTAMPTZ | NOT NULL | |



\#### `savings\_goals`

| Campo | Tipo | Restricciones | Descripción |

|---|---|---|---|

| id | UUID | PK | |

| user\_id | UUID | NOT NULL, FK→users CASCADE | |

| name | VARCHAR(100) | NOT NULL, CHECK `char\_length >= 2` | |

| target\_amount | NUMERIC(14,2) | NOT NULL, CHECK `> 0` | |

| deadline | DATE | NULL | |

| status | goal\_status | NOT NULL, default `'IN\_PROGRESS'` | |

| created\_at / updated\_at | TIMESTAMPTZ | NOT NULL | |



\#### `goal\_contributions`

| Campo | Tipo | Restricciones | Descripción |

|---|---|---|---|

| id | UUID | PK | |

| goal\_id | UUID | NOT NULL, FK→savings\_goals CASCADE | |

| amount | NUMERIC(14,2) | NOT NULL, CHECK `> 0` | |

| made\_at | DATE | NOT NULL | |

| note | VARCHAR(255) | NULL | |

| created\_at | TIMESTAMPTZ | NOT NULL | |



\### 2.3 DDL autoritativo (orden de creación correcto)



> `debts`, `debt\_payments` y `goal\_contributions` se crean \*\*antes\*\* que `transactions` (las FK lo exigen). El `schema.prisma` debe mapear exactamente esto (`@@map`, `@map`, `@db.Decimal(14,2)`, `@db.Date`).



```sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;



CREATE TYPE category\_type  AS ENUM ('INCOME', 'EXPENSE');

CREATE TYPE debt\_direction AS ENUM ('OWED\_TO\_ME', 'I\_OWE');

CREATE TYPE debt\_status    AS ENUM ('OPEN', 'PAID');

CREATE TYPE goal\_status    AS ENUM ('IN\_PROGRESS', 'ACHIEVED', 'CANCELLED');



CREATE TABLE users (

&#x20; id              UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

&#x20; email           VARCHAR(255) NOT NULL UNIQUE,

&#x20; password\_hash   TEXT NOT NULL,

&#x20; display\_name    VARCHAR(100),

&#x20; currency        CHAR(3) NOT NULL DEFAULT 'PEN'

&#x20;                 CHECK (currency IN ('PEN','USD','EUR','COP','MXN','ARS','CLP','BOB')),

&#x20; initial\_balance NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (initial\_balance >= 0),

&#x20; onboarding\_done BOOLEAN NOT NULL DEFAULT false,

&#x20; created\_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

&#x20; updated\_at      TIMESTAMPTZ NOT NULL DEFAULT now()

);



CREATE TABLE refresh\_tokens (

&#x20; id          UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

&#x20; user\_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

&#x20; token\_hash  CHAR(64) NOT NULL UNIQUE,

&#x20; expires\_at  TIMESTAMPTZ NOT NULL,

&#x20; revoked\_at  TIMESTAMPTZ,

&#x20; replaced\_by UUID REFERENCES refresh\_tokens(id) ON DELETE SET NULL,

&#x20; created\_at  TIMESTAMPTZ NOT NULL DEFAULT now()

);

CREATE INDEX idx\_rt\_user ON refresh\_tokens (user\_id) WHERE revoked\_at IS NULL;



CREATE TABLE categories (

&#x20; id         UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

&#x20; user\_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

&#x20; name       VARCHAR(60) NOT NULL CHECK (char\_length(name) >= 2),

&#x20; type       category\_type NOT NULL,

&#x20; system\_key VARCHAR(30),

&#x20; icon       VARCHAR(40),

&#x20; color      CHAR(7) CHECK (color \~ '^#\[0-9a-fA-F]{6}$'),

&#x20; is\_system  BOOLEAN NOT NULL DEFAULT false,

&#x20; created\_at TIMESTAMPTZ NOT NULL DEFAULT now(),

&#x20; UNIQUE (user\_id, name, type)

);

CREATE UNIQUE INDEX uq\_cat\_user\_syskey ON categories (user\_id, system\_key) WHERE system\_key IS NOT NULL;



CREATE TABLE debts (

&#x20; id           UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

&#x20; user\_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

&#x20; direction    debt\_direction NOT NULL,

&#x20; counterparty VARCHAR(100) NOT NULL CHECK (char\_length(counterparty) >= 2),

&#x20; principal    NUMERIC(14,2) NOT NULL CHECK (principal > 0),

&#x20; due\_date     DATE,

&#x20; status       debt\_status NOT NULL DEFAULT 'OPEN',

&#x20; note         VARCHAR(255),

&#x20; created\_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

&#x20; updated\_at   TIMESTAMPTZ NOT NULL DEFAULT now()

);

CREATE INDEX idx\_debts\_user\_dir\_status ON debts (user\_id, direction, status, due\_date);



CREATE TABLE debt\_payments (

&#x20; id         UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

&#x20; debt\_id    UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,

&#x20; amount     NUMERIC(14,2) NOT NULL CHECK (amount > 0),

&#x20; paid\_at    DATE NOT NULL,

&#x20; note       VARCHAR(255),

&#x20; created\_at TIMESTAMPTZ NOT NULL DEFAULT now()

);

CREATE INDEX idx\_dp\_debt ON debt\_payments (debt\_id, paid\_at);

\-- Saldo pendiente = principal - SUM(debt\_payments.amount)   (calculado, NO almacenado)



CREATE TABLE savings\_goals (

&#x20; id            UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

&#x20; user\_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

&#x20; name          VARCHAR(100) NOT NULL CHECK (char\_length(name) >= 2),

&#x20; target\_amount NUMERIC(14,2) NOT NULL CHECK (target\_amount > 0),

&#x20; deadline      DATE,

&#x20; status        goal\_status NOT NULL DEFAULT 'IN\_PROGRESS',

&#x20; created\_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

&#x20; updated\_at    TIMESTAMPTZ NOT NULL DEFAULT now()

);

CREATE INDEX idx\_goals\_user\_status ON savings\_goals (user\_id, status);



CREATE TABLE goal\_contributions (

&#x20; id         UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

&#x20; goal\_id    UUID NOT NULL REFERENCES savings\_goals(id) ON DELETE CASCADE,

&#x20; amount     NUMERIC(14,2) NOT NULL CHECK (amount > 0),

&#x20; made\_at    DATE NOT NULL,

&#x20; note       VARCHAR(255),

&#x20; created\_at TIMESTAMPTZ NOT NULL DEFAULT now()

);

CREATE INDEX idx\_gc\_goal ON goal\_contributions (goal\_id, made\_at);

\-- Progreso = MIN(100, SUM(amount) / target\_amount \* 100)



CREATE TABLE transactions (

&#x20; id                   UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),

&#x20; user\_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

&#x20; category\_id          UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,

&#x20; type                 category\_type NOT NULL,

&#x20; amount               NUMERIC(14,2) NOT NULL CHECK (amount > 0),

&#x20; description          VARCHAR(255),

&#x20; occurred\_at          DATE NOT NULL CHECK (occurred\_at >= DATE '2000-01-01'),

&#x20; debt\_id              UUID REFERENCES debts(id) ON DELETE SET NULL,

&#x20; debt\_payment\_id      UUID UNIQUE REFERENCES debt\_payments(id) ON DELETE CASCADE,

&#x20; goal\_contribution\_id UUID UNIQUE REFERENCES goal\_contributions(id) ON DELETE CASCADE,

&#x20; created\_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

&#x20; updated\_at           TIMESTAMPTZ NOT NULL DEFAULT now()

);

```



\### 2.4 Índices y optimización

| Índice | Consulta que acelera |

|---|---|

| `idx\_tx\_user\_date (user\_id, occurred\_at DESC, created\_at DESC)` | Historial paginado y orden estable. |

| `idx\_tx\_user\_type\_date (user\_id, type, occurred\_at)` | Totales de ingresos/gastos por mes y tendencia. |

| `idx\_tx\_user\_cat\_date (user\_id, category\_id, occurred\_at)` | Filtro por categoría y gastos por categoría. |

| `idx\_tx\_debt (debt\_id) WHERE debt\_id IS NOT NULL` | Movimientos de una deuda. |

| `idx\_tx\_desc\_trgm` GIN `(description gin\_trgm\_ops)` (extensión `pg\_trgm`) | Búsqueda `q` (`ILIKE '%…%'`). |

| `idx\_debts\_user\_dir\_status`, `idx\_goals\_user\_status`, `idx\_dp\_debt`, `idx\_gc\_goal` | Listados y sumas por deuda/meta. |

| `uq\_cat\_user\_syskey`, `UNIQUE(user\_id,name,type)` | Detección de categoría "Préstamo" y unicidad. |



```sql

CREATE EXTENSION IF NOT EXISTS pg\_trgm;

CREATE INDEX idx\_tx\_user\_date      ON transactions (user\_id, occurred\_at DESC, created\_at DESC);

CREATE INDEX idx\_tx\_user\_type\_date ON transactions (user\_id, type, occurred\_at);

CREATE INDEX idx\_tx\_user\_cat\_date  ON transactions (user\_id, category\_id, occurred\_at);

CREATE INDEX idx\_tx\_debt           ON transactions (debt\_id) WHERE debt\_id IS NOT NULL;

CREATE INDEX idx\_tx\_desc\_trgm      ON transactions USING gin (description gin\_trgm\_ops);

```

Reglas de rendimiento: toda agregación (`SUM`, `GROUP BY`) se hace \*\*en SQL\*\* (`prisma.$queryRaw` o `groupBy`), nunca cargando filas a memoria; el rango de mes se expresa como `occurred\_at >= :first AND occurred\_at < :nextFirst` (sargable).



\### 2.5 Catálogo de categorías semilla (se crean para cada usuario al registrarse, en la misma transacción)



\*\*INCOME\*\*

| system\_key | Nombre | Ícono | Color |

|---|---|---|---|

| SALARY | Sueldo | `briefcase` | `#16a34a` |

| ALLOWANCE | Mesada | `wallet` | `#0d9488` |

| GIFT | Regalo | `gift` | `#db2777` |

| SIDE\_JOB | Trabajo extra | `laptop` | `#2563eb` |

| LOAN | Préstamo | `landmark` | `#d97706` |

| DEBT\_COLLECTION | Cobro de deuda | `hand-coins` | `#65a30d` |

| OTHER\_INCOME | Otros ingresos | `circle-plus` | `#64748b` |



\*\*EXPENSE\*\*

| system\_key | Nombre | Ícono | Color |

|---|---|---|---|

| FOOD | Comida | `utensils` | `#ea580c` |

| LEISURE | Ocio | `gamepad-2` | `#7c3aed` |

| CLOTHING | Ropa | `shirt` | `#db2777` |

| PAYMENTS | Pagos | `receipt` | `#0891b2` |

| TRANSPORT | Transporte | `bus` | `#ca8a04` |

| HEALTH | Salud | `heart-pulse` | `#dc2626` |

| EDUCATION | Educación | `graduation-cap` | `#4f46e5` |

| HOME | Hogar | `house` | `#0d9488` |

| SAVINGS | Ahorro | `piggy-bank` | `#6366f1` |

| DEBT\_PAYMENT | Pago de deuda | `banknote` | `#b91c1c` |

| OTHER\_EXPENSE | Otros gastos | `ellipsis` | `#64748b` |



Categorías `is\_system=true`: se puede \*\*renombrar\*\*, no borrar ni cambiar de tipo. Las del usuario: `system\_key=NULL`, `is\_system=false`.



\### 2.6 Datos demo (`prisma/seed.ts`, solo desarrollo)

Usuario `demo@gestor.app` / `Demo1234`, `initial\_balance=500.00`, `PEN`, `onboarding\_done=true`; \~30 transacciones repartidas en el mes actual y los 2 anteriores (sueldo `2500.00` mensual, mesada, un regalo, gastos variados de comida/ocio/ropa/pagos/transporte); 3 deudas (una `I\_OWE` con pago parcial y vencimiento en 5 días, una `OWED\_TO\_ME` sin pagos, una `PAID`); 3 metas ("Laptop nueva" ≈35 %, "Viaje a Cusco" con deadline a 4 meses ≈60 %, "Fondo de emergencia" `ACHIEVED`). Fechas \*\*relativas a hoy\*\*.



\---



\## 3. CAPA DE NEGOCIO Y BACKEND (API REST)



\### 3.1 Convenciones generales

\- \*\*Base:\*\* `/api/v1`. JSON `camelCase`. Auth: `Authorization: Bearer <accessToken>` en todo salvo `/auth/register`, `/auth/login`, `/auth/refresh`, `/health`.

\- \*\*Importes:\*\* string decimal con 2 decimales (`"1250.50"`). En \*\*entrada\*\* se acepta `^\\d{1,12}(\\.\\d{1,2})?$` y se normaliza a 2 decimales.

\- \*\*Fechas:\*\* `YYYY-MM-DD`; \*\*timestamps:\*\* ISO 8601 UTC. \*\*Mes:\*\* `YYYY-MM`.

\- \*\*Paginación:\*\* `page` (base 1, default 1) y `pageSize` (default 20, máx 100).

\- \*\*Documentación:\*\* Swagger en `/api/docs`; exportar `docs/openapi.json` en el build.

\- \*\*"Hoy"\*\* proviene del `Clock` inyectado, en zona horaria `America/Lima` (configurable con `APP\_TIMEZONE`).



\### 3.2 Formato de error estándar y catálogo de códigos

Todas las respuestas 4xx/5xx:

```json

{ "status": 422, "code": "BUSINESS\_RULE\_VIOLATION", "message": "El pago supera el saldo pendiente.",

&#x20; "details": \[ { "field": "amount", "message": "Máximo permitido: 300.00" } ] }

```

| HTTP | `code` | Cuándo | Mensaje típico |

|---|---|---|---|

| 400 | `VALIDATION\_ERROR` | DTO inválido, query inválida, falta `confirm=true` | "Hay campos inválidos." (+ `details\[]`) |

| 401 | `UNAUTHORIZED` | Token ausente, expirado o inválido; credenciales incorrectas | "Correo o contraseña incorrectos." / "Sesión no válida." |

| 403 | `FORBIDDEN` | Reservado (no usar para recursos ajenos: → 404) | "No tienes permiso." |

| 404 | `NOT\_FOUND` | Recurso inexistente \*\*o de otro usuario\*\* | "No se encontró el recurso." |

| 409 | `CONFLICT` | Duplicados, categoría en uso/de sistema, correo ya registrado, movimiento espejo | Específico por caso |

| 422 | `BUSINESS\_RULE\_VIOLATION` | Regla de negocio | Específico por caso |

| 429 | `TOO\_MANY\_REQUESTS` | Throttler | "Demasiados intentos. Intenta más tarde." |

| 500 | `UNKNOWN` | Error no controlado (nunca filtrar stack) | "Ocurrió un error inesperado." |



\### 3.3 Objetos de respuesta (DTOs de salida — estructura exacta)



```jsonc

// User

{ "id": "uuid", "email": "demo@gestor.app", "displayName": "Demo" /\* string|null \*/, "currency": "PEN",

&#x20; "initialBalance": "500.00", "onboardingDone": true, "createdAt": "2026-09-01T12:00:00.000Z" }



// AuthTokens

{ "accessToken": "jwt", "refreshToken": "opaque-string", "expiresIn": 900 }



// AuthSession

{ "user": { /\* User \*/ }, "tokens": { /\* AuthTokens \*/ } }



// Category

{ "id": "uuid", "name": "Comida", "type": "EXPENSE", "systemKey": "FOOD" /\* string|null \*/,

&#x20; "icon": "utensils" /\* string|null \*/, "color": "#ea580c" /\* string|null \*/, "isSystem": true }



// Transaction

{ "id": "uuid", "type": "EXPENSE", "amount": "35.50", "category": { /\* Category \*/ },

&#x20; "description": "Almuerzo" /\* string|null \*/, "occurredAt": "2026-09-18", "debtId": null /\* uuid|null \*/,

&#x20; "createdAt": "2026-09-18T14:03:00.000Z" }



// TransactionPage

{ "items": \[ /\* Transaction\[] \*/ ], "page": 1, "pageSize": 20, "totalItems": 87, "totalPages": 5,

&#x20; "totals": { "income": "2500.00", "expense": "1640.25", "net": "859.75" } }



// Debt

{ "id": "uuid", "direction": "I\_OWE", "counterparty": "Carlos", "principal": "450.00",

&#x20; "paidAmount": "150.00", "remainingAmount": "300.00", "status": "OPEN", "dueDate": "2026-09-25" /\* date|null \*/,

&#x20; "note": null /\* string|null \*/, "createdAt": "2026-08-20T10:00:00.000Z" }



// DebtPayment

{ "id": "uuid", "amount": "150.00", "paidAt": "2026-09-10", "note": null }



// DebtDetail = Debt + { "payments": \[ /\* DebtPayment\[], paidAt desc \*/ ] }



// Goal

{ "id": "uuid", "name": "Viaje a Cusco", "targetAmount": "1500.00", "savedAmount": "900.00",

&#x20; "remainingAmount": "600.00", "progress": 60.0 /\* number 0..100, 1 decimal \*/, "deadline": "2027-01-20",

&#x20; "status": "IN\_PROGRESS", "createdAt": "2026-07-01T10:00:00.000Z" }



// GoalContribution

{ "id": "uuid", "amount": "100.00", "madeAt": "2026-09-05", "note": null }



// GoalDetail = Goal + { "contributions": \[ /\* GoalContribution\[], madeAt desc \*/ ] }



// DashboardSummary

{ "month": "2026-09", "currency": "PEN", "currentBalance": "1834.50", "totalSaved": "750.00",

&#x20; "activeGoalsCount": 2, "monthIncome": "2500.00", "monthExpense": "1640.25", "savingsRate": 34.4 /\* number|null \*/,

&#x20; "debts": { "openCount": 3, "owedToMeOpen": "200.00", "iOweOpen": "450.00" } }



// ExpenseByCategory

{ "categoryId": "uuid", "name": "Comida", "color": "#ea580c", "icon": "utensils", "total": "420.00", "percentage": 25.6 }



// MonthlyTrendPoint

{ "month": "2026-09", "income": "2500.00", "expense": "1640.25", "net": "859.75", "savingsRate": 34.4 /\* number|null \*/ }

```



\### 3.4 Catálogo completo de endpoints



> Notación de errores: además de los listados, \*\*todo endpoint autenticado\*\* puede devolver `401 UNAUTHORIZED` y `500 UNKNOWN`; todo endpoint con `:id` devuelve `404 NOT\_FOUND` si no existe o no pertenece al usuario; todo endpoint con body/query devuelve `400 VALIDATION\_ERROR` si el DTO es inválido. Los listados aquí son los \*\*específicos\*\* del endpoint.



\#### 3.4.0 Salud

\*\*`GET /health`\*\* (sin auth) → `200 { "status": "ok", "db": "up", "time": "2026-09-20T15:04:05.000Z" }`. Error: `500` si la BD no responde (`{"status":500,"code":"UNKNOWN","message":"Base de datos no disponible."}`).



\#### 3.4.1 Auth

\*\*`POST /auth/register`\*\*

Payload: `{ "email": string(email, ≤255), "password": string(≥8, ≥1 letra y ≥1 número), "displayName"?: string(≤100) }`

Éxito `201`: `AuthSession`. Efecto: crea usuario (`onboardingDone=false`, `currency='PEN'`, `initialBalance='0.00'`) + categorías semilla, en una transacción; emite tokens.

Errores: `400` (campos) · `409 CONFLICT` "Este correo ya está registrado." · `429`.



\*\*`POST /auth/login`\*\*

Payload: `{ "email": string, "password": string }` → `200` `AuthSession`.

Errores: `400` · `401 UNAUTHORIZED` "Correo o contraseña incorrectos." (mismo mensaje para email inexistente y contraseña errónea; ejecutar verificación argon2 con hash señuelo para igualar tiempos) · `429`.



\*\*`POST /auth/refresh`\*\*

Payload: `{ "refreshToken": string }` → `200` `AuthTokens` (rotación: revoca el usado, emite uno nuevo).

Errores: `400` · `401 UNAUTHORIZED` "Sesión no válida." (token inexistente/expirado/revocado; si estaba \*\*revocado\*\* → revocar todos los refresh del usuario).



\*\*`POST /auth/logout`\*\* (auth)

Payload: `{ "refreshToken": string }` → `204` sin cuerpo (idempotente).



\#### 3.4.2 Usuario

\*\*`GET /users/me`\*\* → `200` `User`.



\*\*`PUT /users/me`\*\*

Payload: `{ "displayName": string|null (≤100), "currency": "PEN"|"USD"|"EUR"|"COP"|"MXN"|"ARS"|"CLP"|"BOB", "initialBalance": string(≥ 0) }` → `200` `User` con `onboardingDone=true`.

Errores: `400` (moneda inválida, saldo negativo/decimales > 2).



\#### 3.4.3 Categorías

\*\*`GET /categories?type=INCOME|EXPENSE`\*\* → `200` `Category\[]` ordenadas: sistema primero (orden del catálogo §2.5), luego por nombre. Errores: `400` (`type` inválido).



\*\*`POST /categories`\*\*

Payload: `{ "name": string(2–60, trim), "type": "INCOME"|"EXPENSE", "icon"?: string(≤40), "color"?: string(#RRGGBB) }` → `201` `Category` (`isSystem=false`, `systemKey=null`).

Errores: `400` · `409 CONFLICT` "Ya existe una categoría con ese nombre." (mismo `name`+`type`, comparación case-insensitive).



\*\*`PUT /categories/:id`\*\*

Payload: `{ "name": string(2–60), "icon"?: string, "color"?: string }` → `200` `Category`. (`type` es inmutable; si viene, ignorar → o `400` por `forbidNonWhitelisted`.)

Errores: `400` · `404` · `409` (nombre duplicado).



\*\*`DELETE /categories/:id`\*\* → `204`.

Errores: `404` · `409 CONFLICT` "Esta categoría tiene movimientos; no se puede eliminar." / "Las categorías del sistema no se pueden eliminar."



\#### 3.4.4 Movimientos (ingresos y gastos)

\*\*`GET /transactions`\*\*

Query: `month`(YYYY-MM, opcional; si falta = sin filtro de mes) · `type`(INCOME|EXPENSE) · `categoryIds`(uuid,uuid…) · `q`(≤100, `ILIKE` sobre `description`) · `page` · `pageSize` · `sort`(solo `occurredAt:desc`, fijo; orden real: `occurred\_at DESC, created\_at DESC, id DESC`).

Éxito `200`: `TransactionPage`. \*\*`totals` se calcula sobre el conjunto filtrado completo\*\*, no solo la página. `net = income − expense`.

Errores: `400` (mes/uuid/pageSize>100 inválidos).



\*\*`GET /transactions/:id`\*\* → `200` `Transaction`. Errores: `404`.



\*\*`POST /transactions`\*\*

Payload:

```json

{ "type": "INCOME", "amount": "1000.00", "categoryId": "uuid", "occurredAt": "2026-09-20",

&#x20; "description": "Préstamo de Carlos",

&#x20; "debtId": "uuid (opcional; vincula a deuda I\_OWE existente)",

&#x20; "newDebt": { "counterparty": "Carlos", "dueDate": "2026-12-20", "note": "opcional" } }

```

Reglas: `type` debe coincidir con el de la categoría; `occurredAt` ≤ hoy y ≥ `2000-01-01`; si la categoría es `LOAN` → exigir \*\*exactamente uno\*\* de `debtId` XOR `newDebt`; `newDebt`/`debtId` solo válidos con categoría `LOAN`; `newDebt.dueDate ≥ occurredAt`. Con `newDebt`: crea la deuda `I\_OWE` con `principal = amount` y enlaza `debt\_id`, \*\*atómicamente\*\*. Con `debtId`: la deuda debe ser `I\_OWE`, `OPEN`; el préstamo \*\*incrementa\*\* `principal` en `amount` (ampliación de deuda).

Éxito `201`: `Transaction`.

Errores: `400` · `404` (categoría/deuda inexistente) · `422` "El tipo del movimiento no coincide con la categoría." / "Un préstamo requiere una deuda nueva o existente." / "Solo los préstamos pueden asociarse a una deuda." / "La deuda seleccionada no admite préstamos."



\*\*`PUT /transactions/:id`\*\*

Payload: igual que create \*\*sin `newDebt`\*\* (reemplazo completo). → `200` `Transaction`.

Reglas: si el movimiento es espejo de un pago/aporte (`debt\_payment\_id` o `goal\_contribution\_id` no nulos) → `409`. Si es un préstamo vinculado a deuda y cambia `amount`, se ajusta `principal` en la diferencia (debe seguir ≥ pagado, si no `422`).

Errores: `400` · `404` · `409 CONFLICT` "Este movimiento proviene de un pago o aporte; edítalo desde su deuda o meta." · `422`.



\*\*`DELETE /transactions/:id`\*\* → `204`.

Reglas: espejo de pago/aporte → `409` (mismo mensaje, "elimínalo desde…"). Préstamo vinculado a deuda: si la deuda \*\*no tiene pagos\*\*, se elimina también la deuda (si fue creada por ese préstamo, es decir `principal == amount`) o se reduce `principal`; si tiene pagos y el nuevo principal quedaría < pagado → `422`.

Errores: `404` · `409` · `422`.



\*\*`DELETE /transactions?confirm=true\&from=YYYY-MM-DD\&to=YYYY-MM-DD`\*\* (vaciar historial; `from`/`to` opcionales)

→ `200 { "deletedCount": 42 }`.

Reglas: exige `confirm=true` literal; `from ≤ to`; elimina \*\*solo movimientos\*\* del usuario dentro del rango (o todos), \*\*incluidos\*\* los espejo de pagos/aportes (los pagos, aportes, deudas y metas \*\*permanecen\*\*; su estado no cambia). Todo en una transacción de BD.

Errores: `400 VALIDATION\_ERROR` "Debes confirmar el borrado." (falta `confirm=true`) / "Rango de fechas inválido."



\#### 3.4.5 Deudas

\*\*`GET /debts?direction=OWED\_TO\_ME|I\_OWE\&status=OPEN|PAID`\*\* → `200` `Debt\[]` ordenadas por `dueDate ASC NULLS LAST, createdAt DESC`. Errores: `400`.



\*\*`GET /debts/:id`\*\* → `200` `DebtDetail`. Errores: `404`.



\*\*`POST /debts`\*\*

Payload: `{ "direction": "I\_OWE"|"OWED\_TO\_ME", "counterparty": string(2–100), "principal": string(>0), "dueDate"?: date|null, "note"?: string(≤255) }` → `201` `Debt`.

Errores: `400` · `422` "La fecha de vencimiento no puede ser pasada." (`dueDate < hoy`).



\*\*`PUT /debts/:id`\*\* — Payload igual a create → `200` `Debt`.

Reglas: `principal ≥ paidAmount`; `direction` no editable si existen pagos; se recalcula `status`.

Errores: `400` · `404` · `422` "El monto no puede ser menor a lo ya pagado (150.00)." / "No puedes cambiar el tipo de una deuda con pagos."



\*\*`DELETE /debts/:id`\*\* → `204`. Elimina la deuda, sus pagos y los movimientos espejo de esos pagos (cascada). Errores: `404`.



\*\*`POST /debts/:id/payments`\*\*

Payload: `{ "amount": string(>0), "paidAt": date(≤ hoy), "note"?: string(≤255), "registerInBalance": boolean }` → `201` `DebtDetail`.

Reglas: `amount ≤ remainingAmount`; deuda `OPEN`; recalcular `status` (`PAID` si `remaining == 0.00`); si `registerInBalance=true` crea el movimiento espejo (`debt\_payment\_id`, `debt\_id`): categoría `DEBT\_PAYMENT` (EXPENSE) si `I\_OWE`, `DEBT\_COLLECTION` (INCOME) si `OWED\_TO\_ME`, descripción `"Pago a {counterparty}"`/`"Cobro a {counterparty}"`. Todo atómico.

Errores: `400` · `404` · `422 BUSINESS\_RULE\_VIOLATION` `{ "details":\[{"field":"amount","message":"Máximo permitido: 300.00"}] }` con mensaje "El pago no puede superar el saldo pendiente." · `422` "La deuda ya está pagada."



\*\*`DELETE /debts/:id/payments/:paymentId`\*\* → `200` `DebtDetail`. Borra el pago y su movimiento espejo; si la deuda estaba `PAID` y el saldo vuelve a ser > 0 → `OPEN`. Errores: `404` (deuda o pago).



\#### 3.4.6 Metas de ahorro

\*\*`GET /goals?status=IN\_PROGRESS|ACHIEVED|CANCELLED`\*\* → `200` `Goal\[]` (orden `createdAt DESC`). Errores: `400`.



\*\*`GET /goals/:id`\*\* → `200` `GoalDetail`. Errores: `404`.



\*\*`POST /goals`\*\*

Payload: `{ "name": string(2–100), "targetAmount": string(>0), "deadline"?: date|null }` → `201` `Goal`.

Errores: `400` · `422` "La fecha límite debe ser futura." (`deadline ≤ hoy`).



\*\*`PUT /goals/:id`\*\*

Payload: `{ "name": string, "targetAmount": string(>0), "deadline"?: date|null, "status"?: "IN\_PROGRESS"|"CANCELLED" }` → `200` `Goal`.

Reglas: `targetAmount ≥ savedAmount` (si no, `422`); el usuario solo puede fijar `IN\_PROGRESS`↔`CANCELLED`; `ACHIEVED` es derivado (enviar `ACHIEVED` → `400`); tras editar se reevalúa (`saved ≥ target` ⇒ `ACHIEVED`).

Errores: `400` · `404` · `422` "El objetivo no puede ser menor a lo ya ahorrado (900.00)."



\*\*`DELETE /goals/:id`\*\* → `204` (cascada a aportes y sus movimientos espejo). Errores: `404`.



\*\*`POST /goals/:id/contributions`\*\*

Payload: `{ "amount": string(>0), "madeAt": date(≤ hoy), "note"?: string(≤255), "registerInBalance": boolean }` → `201` `GoalDetail`.

Reglas: la meta debe estar `IN\_PROGRESS`; si `registerInBalance=true` crea movimiento espejo (EXPENSE, categoría `SAVINGS`, descripción `"Aporte a {name}"`); tras guardar, si `saved ≥ target` ⇒ `ACHIEVED`. No se limita el sobreaporte.

Errores: `400` · `404` · `422` "Solo puedes aportar a metas en progreso."



\*\*`DELETE /goals/:id/contributions/:contributionId`\*\* → `200` `GoalDetail`. Borra aporte + espejo; si estaba `ACHIEVED` y `saved < target` ⇒ `IN\_PROGRESS`. Errores: `404`.



\#### 3.4.7 Dashboard

\*\*`GET /dashboard/summary?month=YYYY-MM`\*\* → `200` `DashboardSummary`. `month` opcional (default mes actual). Errores: `400`.

\*\*`GET /dashboard/expenses-by-category?month=YYYY-MM`\*\* → `200` `ExpenseByCategory\[]` (orden `total DESC`; `percentage = total/Σ·100`, 1 decimal). Errores: `400`.

\*\*`GET /dashboard/monthly-trend?months=6`\*\* → `200` `MonthlyTrendPoint\[]`, `months` entre 1 y 24 (default 6), orden cronológico \*\*ascendente\*\*, incluye el mes actual, meses sin datos con `"0.00"`. Errores: `400`.



\#### 3.4.8 Reportes

\*\*`GET /reports/monthly?month=YYYY-MM\&format=csv|pdf`\*\* → `200` binario. Cabeceras: `Content-Type: text/csv; charset=utf-8` o `application/pdf`; `Content-Disposition: attachment; filename="gestor-economico\_2026-09.csv"`; `Access-Control-Expose-Headers: Content-Disposition`.

Errores: `400 VALIDATION\_ERROR` (mes o formato inválido). Si no hay movimientos en el mes \*\*no es error\*\*: se genera un reporte vacío con totales `0.00` y respuesta `200`.



\### 3.5 Lógica de negocio crítica



\#### 3.5.1 Algoritmo del Balance General

\*\*Definición:\*\* `currentBalance = initialBalance + Σ ingresos − Σ gastos` (todas las fechas hasta hoy). Los \*\*pagos de deuda realizados\*\* ya restan del balance porque, con `registerInBalance=true`, generan un gasto `DEBT\_PAYMENT`; los \*\*cobros\*\* suman como ingreso `DEBT\_COLLECTION`. Así se cumple "Ingresos − Gastos − Deudas pagadas" \*\*sin doble conteo\*\*.



Pasos (`DashboardService.getSummary(userId, month)`):

1\. Cargar `user` (`initialBalance`, `currency`).

2\. `SUM(amount)` de `transactions` con `type='INCOME'` del usuario → `totalIncome` (SQL, `COALESCE(...,0)`).

3\. Ídem `type='EXPENSE'` → `totalExpense`.

4\. `currentBalance = initialBalance + totalIncome − totalExpense` (aritmética `Decimal`, resultado a 2 decimales; puede ser negativo).

5\. Mes: `first = YYYY-MM-01`, `next = primer día del mes siguiente`; `monthIncome`/`monthExpense` = sumas con `occurred\_at >= first AND < next`.

6\. `savingsRate = monthIncome > 0 ? round1((monthIncome − monthExpense) / monthIncome × 100) : null`.

7\. `totalSaved = Σ goal\_contributions.amount` de metas del usuario con estado `IN\_PROGRESS` o `ACHIEVED` (excluye `CANCELLED`). `activeGoalsCount` = metas `IN\_PROGRESS`.

8\. Deudas abiertas: para cada deuda `OPEN`, `remaining = principal − Σ pagos`; `openCount` = nº de deudas `OPEN`; `owedToMeOpen` = Σ remaining de `OWED\_TO\_ME`; `iOweOpen` = Σ remaining de `I\_OWE`.

9\. Serializar todo importe con 2 decimales.



Nota: los aportes a metas \*\*no\*\* restan del balance salvo `registerInBalance=true` (gasto `SAVINGS`); el KPI "Total ahorrado" es independiente del balance.



\#### 3.5.2 Reglas puras (`modules/\*/rules/\*.ts`, 100 % testeadas)

\- `debtRemaining(principal, payments\[])`, `debtStatus(remaining)`; `goalProgress(saved, target)` = `min(100, saved/target·100)` (1 decimal); `goalStatus(saved, target, current)`; `savingsRate(income, expense)`; `monthRange(YYYY-MM)`; `normalizeMoney(str)`; `suggestedMonthlyContribution(remaining, deadline, today)` (solo cliente).



\#### 3.5.3 Generación del reporte mensual descargable

`ReportsService.generate(userId, month, format)`:

1\. Validar `month` y `format`; obtener `MonthlyReport` `{ month, currency, generatedAt, rows\[], totals{income,expense,net}, byCategory\[] }` con `rows` ordenadas por fecha ASC (luego `created\_at`).

2\. Resolver `ReportExporter` por `format` (Strategy, `Map<format, exporter>`); si no existe → `400`.

3\. `exporter.export(report)` → `{ buffer, contentType, extension }`. Nombre: `gestor-economico\_{YYYY-MM}.{ext}`.



\*\*CSV (`CsvExporter`):\*\* UTF-8 \*\*con BOM\*\* (`\\uFEFF`), separador `,`, saltos `\\r\\n`, campos con comillas dobles si contienen `,`, `"` o salto de línea (escapar `"` como `""`), importes con punto decimal y 2 decimales, fechas `YYYY-MM-DD`. Estructura:

```

Fecha,Tipo,Categoría,Descripción,Monto

2026-09-01,Ingreso,Sueldo,"Sueldo de septiembre",2500.00

2026-09-03,Gasto,Comida,"Almuerzo, menú",35.50

,,,,

,,,Total ingresos,2500.00

,,,Total gastos,1640.25

,,,Neto,859.75

```

`Tipo` ∈ {`Ingreso`,`Gasto`}. Los gastos se exportan como importes \*\*positivos\*\* (el tipo indica el signo).



\*\*PDF (`PdfExporter`, `pdfkit`, A4 vertical):\*\* encabezado "Gestor Económico Personal — Reporte {mes en español} {año}" y fecha de generación; bloque de resumen (Ingresos, Gastos, Neto, Tasa de ahorro); tabla `Fecha | Tipo | Categoría | Descripción | Monto` con salto de página y encabezado repetido; sección "Gastos por categoría" (nombre, total, %); pie con "Página X de Y". Importes formateados `S/ 1,234.50` según moneda.



\#### 3.5.4 Flujo seguro de borrado/vaciado del historial

1\. \*\*Cliente:\*\* `ClearHistoryDialog` con doble confirmación (casilla de irreversibilidad + escribir `BORRAR`), alcance total o por rango.

2\. \*\*API:\*\* `DELETE /transactions?confirm=true\[\&from\&to]`. Sin `confirm=true` literal → `400`.

3\. \*\*Service:\*\* valida rango; abre `UnitOfWork`; `deleteMany(tx, userId, range)` con `WHERE user\_id = :userId \[AND occurred\_at BETWEEN :from AND :to]`; devuelve `count`.

4\. \*\*Auditoría ligera:\*\* registrar en el log (`info`) `userId`, rango y `deletedCount` (sin datos financieros).

5\. \*\*Respuesta:\*\* `{ "deletedCount": n }`. \*\*Cliente:\*\* toast e invalidación de `transactions`, `dashboard`.

6\. Nunca se elimina: usuario, categorías, deudas, metas, pagos ni aportes.



\#### 3.5.5 Reglas de consistencia adicionales

\- Crear/editar movimiento: la categoría debe pertenecer al usuario y coincidir en `type`; `occurredAt` no futura.

\- Los cálculos de saldo, progreso y estado se hacen en el \*\*service\*\* dentro de la misma transacción que la escritura (nunca se confía en valores del cliente).

\- `debt.status` se recalcula en toda operación que cambie pagos o principal.

\- Concurrencia: en `addPayment`/`addContribution` bloquear la fila padre (`SELECT … FOR UPDATE` vía `$queryRaw` dentro de `$transaction`) antes de validar el saldo.



\### 3.6 Estrategia de pruebas del backend

\- \*\*Unitarias (Jest):\*\* todas las reglas puras y cada service con repositorios en memoria (`InMemory\*Repository`), incluido `FakeClock`.

\- \*\*e2e (supertest + PostgreSQL de Docker, BD de test aislada):\*\* flujos: registro→login→refresh rotado→logout; CRUD de categorías (409 en uso/sistema); movimientos (filtros, paginación, `totals`); préstamo con `newDebt` atómico; pago > saldo → 422; pago con `registerInBalance` crea y borra espejo; meta se vuelve `ACHIEVED` y revierte; vaciado con y sin `confirm`; aislamiento entre dos usuarios (404); reportes CSV (BOM, cabecera) y PDF (magic bytes `%PDF`).

\- Cobertura mínima de `modules/\*\*/rules` y `services`: 90 %.



\---



\## 4. CAPA DE PRESENTACIÓN (FRONTEND PWA RIGUROSO)



\### 4.1 Configuración y capacidades PWA



\#### 4.1.1 `manifest.webmanifest` (vía `vite-plugin-pwa`)

```json

{

&#x20; "name": "Gestor Económico Personal", "short\_name": "Mi Gestor",

&#x20; "description": "Controla tus ingresos, gastos, deudas y metas de ahorro.",

&#x20; "lang": "es", "start\_url": "/?source=pwa", "scope": "/", "id": "/",

&#x20; "display": "standalone", "orientation": "portrait-primary",

&#x20; "background\_color": "#0f172a", "theme\_color": "#059669",

&#x20; "categories": \["finance", "productivity"],

&#x20; "icons": \[

&#x20;   { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },

&#x20;   { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },

&#x20;   { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }

&#x20; ],

&#x20; "shortcuts": \[

&#x20;   { "name": "Nuevo gasto", "url": "/movimientos/nuevo?type=EXPENSE" },

&#x20;   { "name": "Nuevo ingreso", "url": "/movimientos/nuevo?type=INCOME" }

&#x20; ]

}

```

Generar íconos placeholder (fondo `#059669`, símbolo `S/` blanco) en `public/icons/` con un script Node (`sharp` como devDependency, o SVG→PNG) y ejecutarlo. En `index.html`: `viewport` con `viewport-fit=cover`, `theme-color #059669`, `apple-touch-icon`, `apple-mobile-web-app-capable=yes`, `apple-mobile-web-app-status-bar-style=default`.



\#### 4.1.2 Service Worker (Workbox, `registerType: 'prompt'`)

\- \*\*Precaché\*\* del shell y assets (`globPatterns: \['\*\*/\*.{js,css,html,svg,png,woff2}']`); `navigateFallback: '/index.html'`, `navigateFallbackDenylist: \[/^\\/api\\//]` → carga inmediata del shell.

\- \*\*API:\*\* `NetworkOnly` para `/api/\*\*`. \*\*No\*\* cachear respuestas de la API en el SW (datos financieros sensibles). La lectura offline se logra con el \*\*caché persistido de TanStack Query\*\* (§4.1.4).

\- Registrar el SW solo si `import.meta.env.PROD` (con `try/catch`). `<UpdatePrompt />`: toast persistente "Nueva versión disponible" + botón \*\*Actualizar\*\* (`updateServiceWorker(true)`).



\#### 4.1.3 Ciclo de vida de instalación

\- \*\*Android/Chrome/Edge:\*\* capturar `beforeinstallprompt`, guardarlo (`useInstallPrompt`); `InstallPrompt` (tarjeta descartable en Dashboard) + botón "Instalar app" en Ajustes; al aceptar → `prompt()`.

\- \*\*iOS Safari (sin evento):\*\* detectar iOS y mostrar: \*"Toca Compartir y luego \*\*Añadir a pantalla de inicio\*\*"\*.

\- Ocultar todo si `display-mode: standalone`. Recordar descarte 14 días (`mg.installDismissedAt`).

\- Actualización: `UpdatePrompt` (arriba). Al recuperar la conexión se revalida el caché.



\#### 4.1.4 Almacenamiento local (modo híbrido)

| Dato | Almacén | Notas |

|---|---|---|

| Base de datos Mock (`mock:users`, `mock:categories`, `mock:transactions`, `mock:debts`, `mock:debtPayments`, `mock:goals`, `mock:contributions`, `mock:session`) | \*\*IndexedDB\*\* (`idb-keyval`) | Solo `VITE\_DATA\_SOURCE=mock`. |

| Caché de TanStack Query | \*\*IndexedDB\*\* (`createAsyncStoragePersister`, key `mi-gestor-query-cache`, `maxAge` 24 h, `buster: APP\_VERSION`) | Lectura offline. No persistir `reports`. Al cerrar sesión: `queryClient.clear()` + borrar la clave. |

| `refreshToken` | `localStorage` (`mg.refreshToken`) vía `tokenStorage` | Comentar: migrar a cookie `httpOnly`. |

| `accessToken` | Memoria (variable de módulo) | No persistir. |

| Preferencias UI (`theme`, `selectedMonth`, `onboardingDone`) | `localStorage` (Zustand `persist`, clave `mg.ui`) | |



\*\*Comportamiento offline (v1):\*\*

| Situación | Comportamiento |

|---|---|

| Sin conexión, app abierta | Banner fijo ámbar: \*\*"Sin conexión — modo solo lectura"\*\* (`OfflineBanner`, `useOnlineStatus`). |

| Sin conexión, lectura | Última data cacheada + sello "Datos al {fecha/hora}". |

| Sin conexión, escritura | Botones de crear/editar/borrar/aportar/descargar \*\*deshabilitados\*\* con `title="Requiere conexión"`. |

| Reconexión | Banner verde 3 s "Conexión restablecida" + `queryClient.invalidateQueries()`. |

| Fuera de alcance v1 | Cola de escritura offline (dejar interfaz `OutboxPort` \*\*sin implementar\*\*). |



\### 4.2 Estructura del frontend (crear exactamente)



```

frontend/src/

├── app/ (App.tsx, router.tsx \[lazy], providers/{ServicesProvider,QueryProvider,ThemeProvider,AuthProvider}.tsx, guards/RequireAuth.tsx)

├── config/ (env.ts, constants.ts)                 # PAGE\_SIZE=20, CURRENCIES

├── domain/                                        # TypeScript PURO

│   ├── models/  schemas/ (Zod)  money.ts  dates.ts  rules/ (debt.ts, goal.ts, savings.ts)

├── services/                                      # INFRAESTRUCTURA

│   ├── ports/ (interfaces \*Api)

│   ├── http/ (httpClient.ts, ApiError.ts, tokenStorage.ts, mappers/, Http\*Api.ts)

│   ├── mock/ (db.ts, seed.ts, latency.ts, Mock\*Api.ts)

│   ├── createServices.ts   index.ts

├── features/                                      # APLICACIÓN (hooks)

│   ├── auth/ transactions/ categories/ debts/ goals/ dashboard/ reports/ settings/

│   ├── queryKeys.ts   ui-store.ts

├── components/ (ui/ \[shadcn], layout/, common/, charts/, transactions/, debts/, goals/)

├── pages/ (Login, Register, Onboarding, Dashboard, TransactionForm, History, Debts, Goals, Settings, NotFound)

├── pwa/ (registerSW.ts, useInstallPrompt.ts, useOnlineStatus.ts)

├── lib/utils.ts   test/ (setup.ts, fakes/)   main.tsx

```



\*\*Nombres:\*\* componentes `PascalCase.tsx`; hooks `useXxx.ts`; interfaces de puerto terminan en `Api`.

\*\*Hooks obligatorios (nombres exactos):\*\* `useLogin, useRegister, useCurrentUser, useLogout` · `useTransactions, useTransaction, useCreateTransaction, useUpdateTransaction, useDeleteTransaction, useClearHistory` · `useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory` · `useDebts, useDebt, useCreateDebt, useUpdateDebt, useDeleteDebt, useRegisterDebtPayment, useDeleteDebtPayment` · `useGoals, useGoal, useCreateGoal, useUpdateGoal, useDeleteGoal, useAddContribution, useDeleteContribution` · `useDashboardSummary, useExpensesByCategory, useMonthlyTrend` · `useDownloadReport` · `useUpdateProfile`.



\*\*Utilidades base (`domain/money.ts`, con tests incluyendo `0.1 + 0.2`):\*\*

```ts

export type MoneyString = string; // "1250.50"

export const toCents = (v: MoneyString): number => { /\* parse exacto sin floats \*/ };

export const fromCents = (c: number): MoneyString => { /\* "1250.50" \*/ };

export const addMoney = (a: MoneyString, b: MoneyString) => fromCents(toCents(a) + toCents(b));

export const subMoney = (a: MoneyString, b: MoneyString) => fromCents(toCents(a) - toCents(b));

export const compareMoney = (a: MoneyString, b: MoneyString): -1 | 0 | 1 => { /\* … \*/ };

export const formatMoney = (v: MoneyString, currency = 'PEN', locale = 'es-PE') =>

&#x20; new Intl.NumberFormat(locale, { style: 'currency', currency }).format(toCents(v) / 100);

```

Regex de importe canónico: `^\\d{1,12}(\\.\\d{1,2})?$` y valor `> 0`.



\*\*Tipos base:\*\* `ID`, `ISODate`, `ISODateTime`, `YearMonth`, `CategoryType`, `DebtDirection`, `DebtStatus`, `GoalStatus`, `CurrencyCode`, `Paginated<T>`; los modelos de respuesta son \*\*idénticos\*\* a §3.3 (`User`, `Category`, `Transaction`, `TransactionPage`, `Debt`, `DebtDetail`, `Goal`, `GoalDetail`, `DashboardSummary`, `ExpenseByCategory`, `MonthlyTrendPoint`).



\### 4.3 Rutas y layout responsivo



| Ruta | Página | Auth | Descripción |

|---|---|---|---|

| `/login` | `LoginPage` | Pública | Iniciar sesión |

| `/registro` | `RegisterPage` | Pública | Crear cuenta |

| `/bienvenida` | `OnboardingPage` | Privada | Saldo inicial y moneda (primera vez) |

| `/` | `DashboardPage` | Privada | Resumen y gráficos |

| `/movimientos` | `HistoryPage` | Privada | Historial + reporte |

| `/movimientos/nuevo` | `TransactionFormPage` | Privada | Crear (`?type=INCOME\\|EXPENSE`) |

| `/movimientos/:id/editar` | `TransactionFormPage` | Privada | Editar |

| `/deudas` | `DebtsPage` | Privada | Deudas |

| `/metas` | `GoalsPage` | Privada | Metas |

| `/ajustes` | `SettingsPage` | Privada | Perfil, categorías, zona de peligro |

| `\*` | `NotFoundPage` | Pública | 404 + "Ir al inicio" |



`RequireAuth`: sin sesión → `/login?redirect=<ruta>`; con sesión y `onboardingDone=false` → `/bienvenida`; `/login` y `/registro` redirigen a `/` con sesión.



| Elemento | Móvil (`< 768px`) | Tablet/Escritorio (`≥ md`) |

|---|---|---|

| Navegación | \*\*`BottomNav`\*\* fijo: Inicio · Movimientos · \*\*➕ FAB central\*\* · Deudas · Metas | \*\*`Sidebar`\*\* izquierdo (íconos en `md`, expandido en `lg`): Inicio · Movimientos · Deudas · Metas · Ajustes + botón \*\*"Nuevo movimiento"\*\* |

| Ajustes | Engranaje en `Header` | Ítem del Sidebar |

| FAB / Nuevo | \*\*Sheet inferior\*\* con "Registrar ingreso" (verde) y "Registrar gasto" (rojo) → `/movimientos/nuevo?type=…` | Menú desplegable con las mismas 2 opciones |

| Safe areas | `pb-\[calc(4rem+env(safe-area-inset-bottom))]`, `pt-\[env(safe-area-inset-top)]` | — |



`AppShell` = `OfflineBanner` + `Header` + (`Sidebar` | `BottomNav`) + `<Outlet/>` en `PageContainer` (`max-w-6xl`; formularios `max-w-xl`). Login/Registro/Onboarding sin AppShell (tarjeta `max-w-sm` centrada). Breakpoints Tailwind: `md 768`, `lg 1024`. Funcional de 360 a 1440 px.



\*\*Tokens de diseño:\*\* `--primary` esmeralda `160 84% 30%` · `--income` `142 71% 35%` · `--expense` `0 72% 48%` · `--warning` `38 92% 45%` · `--goal` índigo `239 84% 60%`; modo oscuro equivalente (fondo `222 47% 8%`); radio `0.75rem`; fuente Inter Variable; importes con `tabular-nums`. `ThemeProvider` (claro/oscuro/sistema) aplica clase `dark` en `<html>` y actualiza `<meta name="theme-color">`.

\*\*`MoneyText`\*\*: `{ value, currency?, tone?: 'auto'|'income'|'expense'|'neutral', showSign? }` (`auto`: verde si > 0, rojo si < 0).



\### 4.4 Estado del cliente

| Tipo | Herramienta | Ejemplos |

|---|---|---|

| Datos del servidor | \*\*TanStack Query\*\* | transacciones, deudas, metas, dashboard |

| UI global | \*\*Zustand\*\* (`persist`) | `selectedMonth`, `theme`, `sidebarCollapsed` |

| Formularios | \*\*React Hook Form + Zod\*\* (`mode: 'onChange'`) | todos |

| Efímero | `useState` | apertura de diálogos |



`QueryClient`: `staleTime 60\_000`, `gcTime 24h`, `retry: (n, err) => n < 2 \&\& err.retryable`, `refetchOnWindowFocus: true`, `networkMode: 'offlineFirst'`.



\*\*`features/queryKeys.ts`\*\* (única fuente; claves jerárquicas):

`qk.me` · `qk.categories(type?)` · `qk.transactions.{all,list(filters),detail(id)}` · `qk.debts.{all,list(f),detail(id)}` · `qk.goals.{all,list(f),detail(id)}` · `qk.dashboard.{all,summary(m),byCategory(m),trend(n)}`.



\*\*Invalidación:\*\*

| Mutación | Invalida |

|---|---|

| crear/editar/borrar movimiento, vaciar historial | `transactions.all`, `dashboard.all`, `debts.all` |

| registrar/borrar pago de deuda | `debts.all`, `dashboard.all`, `transactions.all` |

| aportar/borrar aporte | `goals.all`, `dashboard.all`, `transactions.all` |

| crear/editar/borrar categoría | `categories`, `transactions.all`, `dashboard.all` |

| actualizar perfil | `me`, `dashboard.all` |



\*\*Errores/carga/vacíos (transversal):\*\* `ApiError { status, code, message, details?, retryable }` (`code` ∈ `VALIDATION\_ERROR|UNAUTHORIZED|FORBIDDEN|NOT\_FOUND|CONFLICT|BUSINESS\_RULE\_VIOLATION|NETWORK\_ERROR|UNKNOWN`). Cada bloque muestra `LoadingSkeleton` con la forma del contenido (no spinners a pantalla completa); lectura fallida → `ErrorState` + \*\*"Reintentar"\*\*; vacío → `EmptyState` con CTA; escritura fallida → toast rojo (`sonner`) y `details\[]` → `setError(field)`; éxito → toast verde; `<AppErrorBoundary>` envuelve el router ("Algo salió mal" + "Recargar").



\### 4.5 Especificación de vistas y componentes UI/UX



\#### 4.5.1 Login, Registro y Onboarding

\*\*Login:\*\* `email` (email, ≤255; "Ingresa un correo válido.") · `password` (mín 8, botón mostrar/ocultar; "La contraseña debe tener al menos 8 caracteres."). Botón \*\*"Iniciar sesión"\*\* (deshabilitado hasta ser válido, spinner al enviar). Enlace a registro. `401` → alerta inline "Correo o contraseña incorrectos."

\*\*Registro:\*\* `displayName` (opcional, ≤100) · `email` · `password` (mín 8, ≥1 letra y ≥1 número; "Usa al menos 8 caracteres, con letras y números.") · `confirmPassword` ("Las contraseñas no coinciden."). Medidor de fortaleza (débil/media/fuerte). `409` → error en `email`: "Este correo ya está registrado."

\*\*Onboarding\*\* ("¿Con cuánto dinero empiezas?"): `initialBalance` (`MoneyInput`, permite 0; "Ingresa un monto válido (máx. 2 decimales).") · `currency` (`Select` de 8 monedas). Ayuda: "Es el dinero que tienes hoy. Podrás cambiarlo luego en Ajustes." Botón \*\*"Comenzar"\*\* → `PUT /users/me` → `/`.



\#### 4.5.2 Dashboard Principal (`/`)

1\. \*\*Bienvenida:\*\* "Hola, {displayName ?? 'bienvenido'} 👋" + `MonthPicker` (◀ septiembre 2026 ▶; no avanza más allá del mes actual; guarda `selectedMonth`).

2\. `InstallPrompt` (si aplica).

3\. \*\*KPIs\*\* (`StatCard`, 2×2 móvil, 4×1 `lg`):

| KPI | Valor | Detalle | Acción |

|---|---|---|---|

| \*\*Saldo actual\*\* | `summary.currentBalance` (`MoneyText auto`, tarjeta destacada) | Tooltip ⓘ "Saldo inicial + ingresos − gastos (acumulado)" | → `/movimientos` |

| \*\*Gastos del mes\*\* | `summary.monthExpense` (tono expense) | "de {monthIncome} en ingresos" | → `/movimientos?month=…\&type=EXPENSE` |

| \*\*Meta de ahorro actual / Total ahorrado\*\* | `summary.totalSaved` (color `--goal`, `piggy-bank`) | "En {activeGoalsCount} metas activas" | → `/metas` |

| \*\*Deudas totales\*\* | `summary.debts.openCount` | "Me deben {owedToMeOpen}" (verde) · "Debo {iOweOpen}" (rojo) | → `/deudas` |

Adicional bajo los KPIs: \*\*insignia de Ahorro del mes\*\* (`savingsRate`): ≥ 20 % "Excelente" (verde) · 10–19,9 % "Bien" (lima) · 0–9,9 % "Ajustado" (ámbar) · < 0 % "Déficit" (rojo) · `null` → "—" y "Sin ingresos este mes". Siempre ícono + texto (no solo color).

4\. \*\*Gráfico circular "Gastos por categoría"\*\* (`ExpensesDonutChart`, Recharts `PieChart innerRadius`): datos `useExpensesByCategory(month)`; colores = `category.color`; centro "Total gastado" + importe; tooltip nombre/importe/%; clic en porción o leyenda resalta; leyenda ordenada desc con punto de color, nombre, % y monto; vacío → "Aún no tienes gastos este mes" + \*\*"Registrar gasto"\*\*.

5\. \*\*Gráfico de barras "Ingresos vs. Gastos (últimos 6 meses)"\*\* (`IncomeExpenseBarChart`): barras verde/rojo, eje X mes abreviado (`ene`, `feb`…), eje Y abreviado (`1k`), tooltip con ambos y el neto. `useMonthlyTrend(6)`.

6\. \*\*Gráfico de líneas "Tendencia de ahorro"\*\* (`SavingsTrendLineChart`, Recharts `LineChart`): serie `net` mensual (y `savingsRate` % en tooltip) de `useMonthlyTrend(6)`; línea `--goal`, línea de referencia en 0. Interactivo (tooltip y punto activo).

7\. \*\*"Metas en progreso"\*\* (máx. 3): nombre, `Progress` (`--goal`), "{saved} / {target} · {progress}%", enlace "Ver todas".

8\. \*\*"Últimos movimientos"\*\* (5) con `TransactionListItem` compacto + "Ver historial".

Cada bloque gestiona su \*\*propio\*\* carga/error/vacío mediante `ChartCard` (`title`, `isLoading`, `error?`, `isEmpty`, `children`). Recharts solo se carga en el Dashboard (lazy).



\#### 4.5.3 Formulario de Ingresos y Gastos (`/movimientos/nuevo`, `/movimientos/:id/editar`)

Título dinámico: "Nuevo ingreso" / "Nuevo gasto" / "Editar movimiento". Un único `TransactionForm` para crear y editar (en edición precarga con `useTransaction(id)`).



| # | Campo | Control UI | Tipo | Req. | Defecto | Validación en tiempo real | Mensajes |

|---|---|---|---|---|---|---|---|

| 1 | `type` | Segmented "Ingreso" (verde) / "Gasto" (rojo) | enum | Sí | `?type` o `EXPENSE` | Al cambiar: resetea `categoryId`, `debtId`, sección préstamo; recolorea | — |

| 2 | `amount` | `MoneyInput`: prefijo `S/`, `inputMode="decimal"`, autofocus | `MoneyString` | Sí | vacío | Bloquea no numéricos (dígitos y un `.`/`,` → `.`); máx 12 enteros y 2 decimales; regex canónico; `> 0`; máscara de miles solo al blur (`1 250,50`), se envía `"1250.50"` | "Ingresa el monto." · "El monto debe ser mayor a 0." · "Máximo 2 decimales." · "Monto demasiado grande." |

| 3 | `categoryId` | Rejilla de chips (ícono + nombre; 2 col móvil, 3–4 desktop) filtrada por `type`; última chip \*\*"+ Nueva categoría"\*\* (diálogo: nombre 2–60, ícono, color → `useCreateCategory` y la selecciona) | uuid | Sí | ninguna | Requerido; existente en el conjunto filtrado; seleccionada con borde `--primary` + check | "Selecciona una categoría." |

| 4 | `occurredAt` | `DateInput` (`date`) + atajos \*\*Hoy\*\* / \*\*Ayer\*\* | `ISODate` | Sí | hoy (local) | Válida; no futura; ≥ `2000-01-01` | "Selecciona una fecha." · "La fecha no puede ser futura." |

| 5 | `description` | `Textarea` 2 filas + contador `n/255` | string | No | vacío | máx 255; `trim()` | "Máximo 255 caracteres." |

| 6 | \*\*Sección "Deuda asociada"\*\* (solo si `type=INCOME` y categoría `systemKey='LOAN'`) | Radio "Crear deuda nueva" / "Vincular a una existente" | — | Sí (en ese caso) | "Crear deuda nueva" | ver 6a–6c | — |

| 6a | `newDebt.counterparty` | text "¿Quién te prestó?" | string | Sí (nueva) | vacío | 2–100, `trim` | "Indica quién te prestó (2–100 caracteres)." |

| 6b | `newDebt.dueDate` | date | `ISODate\\|null` | No | vacío | `≥ occurredAt` | "El vencimiento no puede ser anterior a la fecha del préstamo." |

| 6c | `debtId` | `Select` de deudas `I\_OWE` `OPEN` ("{contraparte} · saldo {remaining}") | uuid | Sí (vincular) | — | requerido; si no hay: "No tienes deudas pendientes. Crea una nueva." | "Selecciona una deuda." |



\*\*Comportamiento:\*\*

\- Botón \*\*"Guardar ingreso" / "Guardar gasto" / "Guardar cambios"\*\*: `disabled` si `!isValid || isSubmitting`; spinner y anti doble envío. \*\*"Cancelar"\*\*: si `isDirty` → `ConfirmDialog` "¿Descartar los cambios?".

\- Estado visual del campo: neutro → \*\*rojo\*\* + ⚠ + texto (`role="alert"`, `aria-describedby`) si `touched \&\& invalid` → check verde discreto si `touched \&\& valid`.

\- Edición: botón \*\*"Eliminar"\*\* (rojo) → `ConfirmDialog` "¿Eliminar este movimiento?". Si el movimiento es espejo de pago/aporte (`409`), mostrar el mensaje del servidor.

\- Tras éxito: toast y volver a la ruta previa (o `/movimientos`). Al crear: casilla \*\*"Guardar y añadir otro"\*\* (desmarcada) que resetea manteniendo `type` y `occurredAt`.

\- `details\[]` → `setError`; `BUSINESS\_RULE\_VIOLATION` → alerta sobre el formulario. Offline → guardar deshabilitado con aviso.



Esquema Zod (`domain/schemas/transaction.ts`, fuente única): `type` enum; `amount` regex canónico + `> 0`; `categoryId` uuid; `occurredAt` `^\\d{4}-\\d{2}-\\d{2}$` no futura; `description` trim ≤255 opcional; `debtId` uuid opcional; `newDebt {counterparty trim 2–100, dueDate nullable, note ≤255}` opcional; `superRefine`: si la categoría es `LOAN` → `debtId` XOR `newDebt`.



\#### 4.5.4 Módulo de Deudas (`/deudas`) — "A quién le debo" y "Quién me debe"

Encabezado: título + \*\*"+ Nueva deuda"\*\*. `Tabs` persistidos en `?tab=`: \*\*"Yo debo"\*\* (`I\_OWE`, egresos futuros; subtítulo con total pendiente en \*\*rojo\*\*) y \*\*"Me deben"\*\* (`OWED\_TO\_ME`, ingresos futuros; total en \*\*verde\*\*). Filtro segmentado \*\*Pendientes (defecto) / Pagadas / Todas\*\*. Rejilla de `DebtCard` (1/2/3 col), orden por `dueDate` asc (nulos al final).



\*\*`DebtCard` (Compound: Header/Body/Actions):\*\*

\- Header: ícono de dirección (↑ rojo "Yo debo" / ↓ verde "Me deben"), contraparte, insignia: `Pendiente` · `Pagada` (verde) · \*\*`Vencida`\*\* (rojo, `dueDate < hoy` y `OPEN`) · \*\*`Vence en N días`\*\* (ámbar, 0 ≤ N ≤ 7).

\- Body: monto \*\*pendiente\*\* grande; "Total {principal} · Pagado {paidAmount}"; `Progress` (`paid/principal`); "Vence: {dd MMM yyyy}"; nota (2 líneas).

\- Actions: \*\*"Registrar pago"\*\* (`I\_OWE`) / \*\*"Registrar cobro"\*\* (`OWED\_TO\_ME`) si `OPEN`; menú `⋯`: Editar · Ver pagos (`DebtPaymentList` con `useDebt(id)`, permite borrar pago) · Eliminar (`ConfirmDialog`: "Se eliminarán también sus pagos registrados").



\*\*`DebtForm`\*\* (`Dialog`, `Sheet` inferior en móvil):

| Campo | Control | Req. | Validación | Mensaje |

|---|---|---|---|---|

| `direction` | Segmented "Yo debo"/"Me deben" (editable solo sin pagos) | Sí | enum | — |

| `counterparty` | text ("¿A quién le debes?" / "¿Quién te debe?") | Sí | 2–100, trim | "Indica el nombre (2–100 caracteres)." |

| `principal` | `MoneyInput` | Sí | regex, `> 0`; en edición ≥ pagado | "Ingresa el monto." · "No puede ser menor a lo ya pagado ({paid})." |

| `dueDate` | date | No | `≥ hoy` al crear | "La fecha de vencimiento no puede ser pasada." |

| `note` | textarea + contador | No | máx 255 | "Máximo 255 caracteres." |



\*\*`DebtPaymentDialog`:\*\*

| Campo | Control | Req. | Validación | Mensaje |

|---|---|---|---|---|

| `amount` | `MoneyInput` + botón \*\*"Pagar todo ({remaining})"\*\* | Sí | regex, `> 0`, \*\*`≤ remainingAmount`\*\* | "El pago no puede superar el saldo pendiente ({remaining})." |

| `paidAt` | date (hoy) | Sí | no futura | "La fecha no puede ser futura." |

| `note` | text | No | ≤255 | — |

| `registerInBalance` | `Switch` "Reflejar en mi balance" (\*\*activado\*\* por defecto; ayuda "Crea un {gasto/ingreso} automático") | Sí | — | — |

Al llegar `remainingAmount` a `0.00`: toast "¡Deuda saldada!".

Estados: vacío ("No tienes deudas pendientes 🎉" / "Nadie te debe dinero por ahora"), skeleton, error con reintento.



\#### 4.5.5 Módulo de Metas de ahorro (`/metas`)

Encabezado: título, "Total ahorrado: {sum}", \*\*"+ Nueva meta"\*\*. Filtro: \*\*En progreso (defecto) / Logradas / Canceladas\*\*.

\*\*`GoalCard`:\*\* nombre; insignia (`En progreso` índigo, `Lograda` verde, `Cancelada` gris); \*\*barra de progreso porcentual\*\* grande (`Progress`, `--goal`, `aria-valuenow`, etiqueta "{progress}%"); "{saved} de {target}" y "Faltan {remaining}"; con `deadline`: "Meta para {fecha}" + "Ahorra ≈ {remaining / mesesRestantes} al mes" (`suggestedMonthlyContribution`, mínimo 1 mes; vencida y no lograda → insignia ámbar "Plazo vencido"); acciones: \*\*"Aportar"\*\* (solo `IN\_PROGRESS`), `⋯` → Editar · Ver aportes (con borrar) · Cancelar meta · Eliminar (`ConfirmDialog`). Al lograrse: toast "🎉 ¡Meta lograda!".

\*\*`GoalForm`:\*\* `name` (2–100; "Ponle un nombre a tu meta (2–100 caracteres).") · `targetAmount` (`MoneyInput` `> 0`; en edición ≥ ahorrado; "Ingresa el monto objetivo.") · `deadline` (date, `> hoy`; "La fecha límite debe ser futura.").

\*\*`ContributionDialog`:\*\* `amount` (`MoneyInput` + chips +10/+50/+100/"Completar"; `> 0`; "El aporte debe ser mayor a 0.") · `madeAt` (hoy, no futura) · `note` (≤255) · `registerInBalance` (`Switch` "Descontar de mi balance", \*\*desactivado\*\* por defecto).



\#### 4.5.6 Historial y Descargas (`/movimientos`)

\*\*Filtros\*\* (`TransactionFilters`, sincronizados con la URL `?month=\&type=\&cat=\&q=\&page=`): `MonthPicker` (defecto `selectedMonth`) · Segmented Todos/Ingresos/Gastos · multiselect de categorías (chips) · búsqueda con debounce 300 ms · "Limpiar filtros". Al cambiar filtro → `page=1`.

\*\*Resumen del filtro:\*\* "Ingresos {totals.income} · Gastos {totals.expense} · Neto {net}" (de la respuesta paginada).

\*\*Lista paginada\*\* (`pageSize=20`, paginación por mes con controles Anterior / "Página 2 de 5" / Siguiente; `placeholderData: keepPreviousData`), agrupada por día ("Hoy", "Ayer", "lun 14 sep"). `TransactionListItem`: círculo con ícono/color de categoría, nombre, descripción truncada, importe con signo y color (`+ S/ 1 200,00` / `− S/ 35,50`), badge "Deuda" si hay `debtId`. Toque → editar; deslizar izquierda (móvil) o `⋯` → Editar / Eliminar (`ConfirmDialog`). Vacío: "No hay movimientos en este mes" + CTA; skeleton de 6 filas.

\*\*Tarjeta "Reporte mensual"\*\* (arriba en desktop, colapsable en móvil): `MonthPicker` propio · radio \*\*CSV / PDF\*\* (`Strategy`: `CsvDownloader`, `PdfDownloader`) · botón explícito \*\*"Descargar Reporte Mensual"\*\* (spinner "Generando…", deshabilitado offline) → descarga con `Blob` + `<a download>` `gestor-economico\_{YYYY-MM}.{csv|pdf}`; toast "Reporte descargado"; error → toast rojo con reintento.

\*\*Botón "Borrar historial":\*\* visible en la tarjeta; navega a la zona de peligro de Ajustes o abre directamente `ClearHistoryDialog` (misma implementación, §4.5.7-D).



\#### 4.5.7 Ajustes (`/ajustes`)

\*\*A. Perfil y preferencias:\*\* `displayName` (≤100) · `email` (solo lectura) · `currency` (Select; aviso "Solo cambia el símbolo; no convierte tus importes.") · `initialBalance` (`MoneyInput` ≥ 0; "Ingresa un monto válido.") · `theme` (Claro/Oscuro/Sistema). \*\*"Guardar cambios"\*\* deshabilitado si `!isDirty || !isValid`.

\*\*B. Categorías:\*\* listas Ingresos/Gastos con `CategoryBadge`; "+ Nueva categoría" (nombre 2–60 único por tipo, ícono, color); editar; eliminar solo `!isSystem` (`409` → "Esta categoría tiene movimientos; no se puede eliminar.").

\*\*C. Aplicación:\*\* "Instalar app", estado de conexión, versión (`APP\_VERSION`), fuente de datos (`Mock`/`API`, solo `DEV`) y botón "Restablecer datos demo" (solo `DEV` + Mock).

\*\*D. Zona de peligro\*\* (borde/fondo rojo tenue):

\- \*\*"Vaciar historial de movimientos"\*\* → `ClearHistoryDialog`: (1) título "¿Vaciar historial?" con ⚠; (2) texto "Se eliminarán \*\*definitivamente\*\* tus ingresos y gastos. Esta acción no se puede deshacer. Tus deudas y metas no se eliminan."; (3) radio \*\*"Todo el historial"\*\* (defecto) / \*\*"Un rango de fechas"\*\* (`from ≤ to`); (4) \*\*doble confirmación:\*\* casilla obligatoria "Entiendo que esta acción es irreversible" \*\*y\*\* input "Escribe \*\*BORRAR\*\* para confirmar" (exacto, sensible a mayúsculas); (5) botones \*\*Cancelar\*\* (foco inicial) y \*\*"Vaciar historial"\*\* (rojo, `disabled` hasta casilla + texto + conexión); (6) éxito: toast "Se eliminaron {deletedCount} movimientos" e invalidación de caché.

\- \*\*"Cerrar sesión"\*\*: `ConfirmDialog` → `POST /auth/logout`, limpia tokens y caché.



\#### 4.5.8 Componentes comunes (contrato de props)

`MoneyInput {value, onChange, currency, allowZero?, error?}` · `MonthPicker {value, onChange, max?}` · `ConfirmDialog {title, description, confirmLabel, tone:'default'|'danger', onConfirm, loading?}` (foco inicial en Cancelar si `danger`) · `EmptyState {icon, title, description?, action?}` · `ErrorState {error, onRetry}` · `CategoryBadge {category, size?}` · `StatCard {title, value, subtitle?, icon, tone?, onClick?, loading?}` · `ChartCard {title, isLoading, error?, isEmpty, children}`.



\#### 4.5.9 Accesibilidad y rendimiento

WCAG 2.1 AA: todo input con `<label>`, errores con `role="alert"` y `aria-describedby`, diálogos con foco atrapado y `Esc`, objetivos táctiles ≥ 44×44 px, nunca solo color, `prefers-reduced-motion`. Rutas con `React.lazy`+`Suspense`. Lighthouse: PWA instalable, Accesibilidad ≥ 90.



\---



\## 5. CONTRATO DE ACOPLAMIENTO (INTEGRACIÓN FRONT-BACK)



\### 5.1 Manejo de estados del cliente mientras responde la API

\- Toda lectura pasa por TanStack Query: `isLoading` → skeleton por bloque; `isFetching` con datos previos → contenido visible + indicador sutil; `error` → `ErrorState`.

\- Mutaciones: `isPending` deshabilita el botón; opcionalmente actualización optimista \*\*solo\*\* para borrados en lista con rollback `onError`.

\- Estado de UI global en Zustand (`selectedMonth`, `theme`, `sidebarCollapsed`); estado del servidor \*\*nunca\*\* en Zustand.

\- Sesión: `AuthProvider` mantiene `user` (de `useCurrentUser`) y escucha el evento `auth:expired` para redirigir a `/login`.



\### 5.2 Puertos (interfaces) — `services/ports`

```ts

export interface AuthApi { register(p): Promise<AuthSession>; login(p): Promise<AuthSession>;

&#x20; refresh(refreshToken: string): Promise<AuthTokens>; logout(refreshToken: string): Promise<void>;

&#x20; getMe(): Promise<User>; updateMe(p): Promise<User>; }

export interface CategoriesApi { list(type?): Promise<Category\[]>; create(p): Promise<Category>;

&#x20; update(id, p): Promise<Category>; remove(id): Promise<void>; }

export interface TransactionsApi { list(f): Promise<TransactionPage>; get(id): Promise<Transaction>;

&#x20; create(p): Promise<Transaction>; update(id, p): Promise<Transaction>; remove(id): Promise<void>;

&#x20; clear(p: { from?: ISODate; to?: ISODate }): Promise<{ deletedCount: number }>; }

export interface DebtsApi { list(f): Promise<Debt\[]>; get(id): Promise<DebtDetail>; create(p): Promise<Debt>;

&#x20; update(id, p): Promise<Debt>; remove(id): Promise<void>;

&#x20; addPayment(id, p): Promise<DebtDetail>; removePayment(id, paymentId): Promise<DebtDetail>; }

export interface GoalsApi { list(f): Promise<Goal\[]>; get(id): Promise<GoalDetail>; create(p): Promise<Goal>;

&#x20; update(id, p): Promise<Goal>; remove(id): Promise<void>;

&#x20; addContribution(id, p): Promise<GoalDetail>; removeContribution(id, contributionId): Promise<GoalDetail>; }

export interface DashboardApi { getSummary(month): Promise<DashboardSummary>;

&#x20; getExpensesByCategory(month): Promise<ExpenseByCategory\[]>; getMonthlyTrend(months: number): Promise<MonthlyTrendPoint\[]>; }

export interface ReportsApi { downloadMonthly(month, format: 'csv'|'pdf'): Promise<{ blob: Blob; filename: string }>; }

export interface Services { auth; categories; transactions; debts; goals; dashboard; reports; }

```

Los métodos y sus rutas HTTP se corresponden \*\*1:1\*\* con el catálogo de §3.4 (ej. `transactions.clear` → `DELETE /transactions?confirm=true\&from\&to`).



\### 5.3 Capa de servicios de Mocking (Ports \& Adapters + Abstract Factory + DI)

```ts

// config/env.ts

export const env = {

&#x20; dataSource: (import.meta.env.VITE\_DATA\_SOURCE ?? 'mock') as 'mock' | 'http',

&#x20; apiBaseUrl: import.meta.env.VITE\_API\_BASE\_URL ?? '/api/v1',

&#x20; mockLatencyMs: Number(import.meta.env.VITE\_MOCK\_LATENCY\_MS ?? 350),

&#x20; mockFailRate: Number(import.meta.env.VITE\_MOCK\_FAIL\_RATE ?? 0),

};

// services/createServices.ts

export function createServices(): Services {

&#x20; return env.dataSource === 'http' ? createHttpServices(httpClient) : createMockServices();

}

```

`ServicesProvider` (React Context) + `useServices()`. \*\*Cambiar Mock → API real = definir `VITE\_DATA\_SOURCE=http` y `VITE\_API\_BASE\_URL`; ningún otro archivo cambia.\*\*



\*\*El Mock se comporta como el backend\*\* (mismas firmas `async`, mismos DTOs y códigos de error):

1\. \*\*Persistencia\*\* en IndexedDB (`idb-keyval`) con las claves de §4.1.4; inicializa con `seed.ts` (idéntico a §2.6).

2\. \*\*`simulate()`\*\*: espera `mockLatencyMs` (±30 % aleatorio) y con probabilidad `mockFailRate` lanza `ApiError NETWORK\_ERROR` (`retryable: true`).

3\. \*\*Sesión:\*\* tokens falsos `"mock-access-<uuid>"`; `refresh` funcional; demo `demo@gestor.app` / `Demo1234`.

4\. \*\*Reglas de negocio replicadas con `domain/rules/\*`\*\* (las mismas funciones puras): balance, saldo/estado de deuda, `422` pago > saldo con `details\[{field:'amount'}]`, espejo en balance (`DEBT\_PAYMENT`/`DEBT\_COLLECTION`/`SAVINGS`), préstamo con `newDebt` crea deuda `I\_OWE`, `409` en categorías de sistema o con movimientos, `400` en `clear` sin `confirm`, `savingsRate` (null si ingreso 0), gastos por categoría (1 decimal, desc), tendencia N meses con `"0.00"`, listado con filtros/orden/paginación y `totals` sobre el conjunto filtrado, \*\*CSV real\*\* (BOM, cabecera `Fecha,Tipo,Categoría,Descripción,Monto`) y PDF simple con `jspdf` (solo en `services/mock`).

5\. \*\*Aislamiento\*\* por `userId` de la sesión.



\### 5.4 Adaptador HTTP y cliente Axios

\- `services/http/httpClient.ts`: instancia única, `baseURL: env.apiBaseUrl`, `timeout: 15\_000`, JSON.

\- \*\*Interceptor de petición:\*\* `Authorization: Bearer <accessToken>`.

\- \*\*Interceptor de respuesta:\*\* `401` (excepto `/auth/\*`) → una sola llamada compartida a `POST /auth/refresh` (\*single-flight\* con cola); éxito → reintenta; fallo → `tokenStorage.clear()` + evento `auth:expired`. Todo error → `ApiError` normalizado (`toApiError`): sin respuesta → `NETWORK\_ERROR` (retryable), `5xx` → `UNKNOWN` (retryable), `4xx` → según `code` del cuerpo.

\- Reportes: `responseType: 'blob'`; nombre desde `Content-Disposition` o `gestor-economico\_{month}.{format}`.

\- \*\*Mappers\*\* (`services/http/mappers`, Anti-Corruption Layer): normalizan `undefined→null` e importes a 2 decimales; único punto editable si cambian nombres de campos.

\- Un `Http<Recurso>Api` por puerto implementando la interfaz con `httpClient` y mappers.



\### 5.5 Pruebas de contrato (LSP)

Una \*\*misma suite\*\* (`test/contract/transactionsApi.contract.ts`, parametrizada por implementación) se ejecuta contra `MockTransactionsApi` y contra `HttpTransactionsApi` apuntando a un `FakeHttp` (adaptador de Axios en memoria). Además, `scripts/contract-e2e.ts` (opcional, con `RUN\_E2E=1`) la ejecuta contra la API real levantada con Docker.



\### 5.6 Checklist de migración Mock → API real (documentar en `README.md`)

1\. `.env`: `VITE\_DATA\_SOURCE=http`, `VITE\_API\_BASE\_URL=https://<host>/api/v1`.

2\. CORS del backend (`CORS\_ORIGINS`) incluye el origen de la PWA.

3\. Ejecutar la suite de contrato contra el backend.

4\. Ajustar \*\*solo\*\* los `mappers` si hay diferencias.

5\. Confirmar `Access-Control-Expose-Headers: Content-Disposition`.

6\. Revisar política de refresh token (cookie `httpOnly` recomendada).



\---



\## 6. PLAN DE CONSTRUCCIÓN, INFRAESTRUCTURA Y ACEPTACIÓN



\### 6.1 Fases de ejecución (una tras otra; verificar y hacer commit al terminar cada una)



| Fase | Entregable | Verificación (debe pasar antes de continuar) |

|---|---|---|

| \*\*1. Andamiaje e infraestructura\*\* | Monorepo (§1.5), `docker-compose.yml`, `.env.example`, `backend/` NestJS inicial con `health`, Prisma conectado a PostgreSQL, `frontend/` Vite + Tailwind + shadcn inicial | `docker compose up -d db`; `cd backend \&\& npm run build`; `cd frontend \&\& npm run build` |

| \*\*2. Datos\*\* | `schema.prisma` que refleja §2.3, migración inicial + SQL de índices §2.4 (incluye `pg\_trgm`), seed de categorías (función reutilizable) y `prisma/seed.ts` demo | `npx prisma migrate deploy`; `npx prisma db seed`; `\\d` de tablas coincide con §2.2 |

| \*\*3. Núcleo backend\*\* | `common/` (errores, filtro, guard, `Clock`, `UnitOfWork`, money), módulos `auth` (rotación de refresh) y `users`, `categories`; seed de categorías al registrar | Tests unitarios + e2e de auth/categorías verdes |

| \*\*4. Movimientos y deudas/metas (backend)\*\* | Módulos `transactions`, `debts`, `goals` con reglas puras, repositorios (interfaz + Prisma + InMemory), espejo en balance, `newDebt` atómico, vaciado | Tests unitarios + e2e de §3.6 verdes |

| \*\*5. Dashboard y reportes (backend)\*\* | `dashboard` (summary, by-category, monthly-trend con SQL agregado), `reports` con Strategy CSV/PDF, Swagger + `docs/openapi.json` | e2e de dashboard y reportes verdes; CSV con BOM; PDF válido |

| \*\*6. Fundaciones del frontend\*\* | `domain/` (modelos, `money`, reglas, esquemas Zod), tema/tokens, `env`, `queryKeys`, tests de dominio | `npm test` verde (incluye `0.1 + 0.2`) |

| \*\*7. Servicios del frontend\*\* | Puertos, `ApiError`, Mock completo (IndexedDB + seed + reglas), `httpClient` + `Http\*Api` + mappers, factory + `ServicesProvider`, `QueryProvider` con persistencia; suite de contrato | Suite de contrato pasa en Mock \*\*y\*\* FakeHttp |

| \*\*8. Shell y auth\*\* | Router (lazy), guards, `AppShell` (BottomNav/Sidebar/Header), Login, Registro, Onboarding, `OfflineBanner` | Navegación completa móvil/desktop, flujo de sesión |

| \*\*9. Movimientos (UI)\*\* | `TransactionFormPage`, `HistoryPage` (filtros, paginación, resumen), categorías, reporte CSV/PDF | Crear/editar/borrar y descargar funcionan contra Mock \*\*y\*\* contra la API real |

| \*\*10. Dashboard (UI)\*\* | KPIs, donut, barras, líneas de tendencia, metas, últimos movimientos | Datos coherentes con el historial |

| \*\*11. Deudas y metas (UI)\*\* | Páginas, formularios, `DebtPaymentDialog`, `ContributionDialog`, reglas de saldo | Casos límite: pago > saldo, meta lograda/revertida |

| \*\*12. Ajustes y zona de peligro\*\* | Perfil, categorías, tema, `ClearHistoryDialog` con doble confirmación, logout | Vaciar historial con doble confirmación |

| \*\*13. PWA y pulido\*\* | Manifest, íconos, SW, `InstallPrompt`, `UpdatePrompt`, offline, a11y, ESLint de dependencias, README | Checklist §6.4 completo |

| \*\*14. Integración final\*\* | `web` (nginx) + `api` + `db` en Compose; `VITE\_DATA\_SOURCE=http` en el build de `web`; smoke test end-to-end manual/automatizado | `docker compose up --build` → registro, movimiento, deuda, meta, reporte y vaciado funcionando |



\### 6.2 Infraestructura local



\*\*`docker-compose.yml` (esquema):\*\*

```yaml

services:

&#x20; db:

&#x20;   image: postgres:16

&#x20;   environment: { POSTGRES\_USER: gestor, POSTGRES\_PASSWORD: gestor, POSTGRES\_DB: gestor }

&#x20;   ports: \["5432:5432"]

&#x20;   volumes: \[ "pgdata:/var/lib/postgresql/data" ]

&#x20;   healthcheck: { test: \["CMD-SHELL","pg\_isready -U gestor"], interval: 5s, retries: 10 }

&#x20; api:

&#x20;   build: ./backend

&#x20;   env\_file: .env

&#x20;   depends\_on: { db: { condition: service\_healthy } }

&#x20;   ports: \["3000:3000"]

&#x20;   command: sh -c "npx prisma migrate deploy \&\& node dist/main.js"

&#x20; web:

&#x20;   build: { context: ./frontend, args: { VITE\_DATA\_SOURCE: http, VITE\_API\_BASE\_URL: /api/v1 } }

&#x20;   depends\_on: \[api]

&#x20;   ports: \["8080:80"]      # nginx: sirve estáticos, fallback SPA a /index.html, proxy /api → api:3000

volumes: { pgdata: {} }

```



\*\*Variables (`.env.example`):\*\*

| Variable | Ejemplo | Uso |

|---|---|---|

| `DATABASE\_URL` | `postgresql://gestor:gestor@db:5432/gestor` | Prisma |

| `JWT\_ACCESS\_SECRET` / `JWT\_REFRESH\_SECRET` | (≥ 32 chars aleatorios) | Firma |

| `JWT\_ACCESS\_TTL` / `JWT\_REFRESH\_TTL` | `15m` / `7d` | Vigencia |

| `CORS\_ORIGINS` | `http://localhost:5173,http://localhost:8080` | CORS |

| `APP\_TIMEZONE` | `America/Lima` | "Hoy" del servidor |

| `PORT` | `3000` | API |

| `VITE\_DATA\_SOURCE` | `mock` \\| `http` | Frontend |

| `VITE\_API\_BASE\_URL` | `/api/v1` | Frontend |

| `VITE\_MOCK\_LATENCY\_MS` / `VITE\_MOCK\_FAIL\_RATE` | `350` / `0` | Mock |



Scripts obligatorios — backend: `start:dev`, `build`, `test`, `test:e2e`, `lint`, `prisma:migrate`, `prisma:seed`. Frontend: `dev`, `build`, `preview`, `test`, `lint`, `typecheck`. Raíz: `README.md` con arranque (Docker y local), credenciales demo y checklist §5.6.



\### 6.3 Fuera de alcance (v1) — dejar puntos de extensión, \*\*no implementar\*\*

Cola de escritura offline con sincronización, multi-idioma, multi-moneda con conversión, adjuntos/recibos, presupuestos por categoría, movimientos recurrentes, notificaciones push, importación de extractos bancarios, autenticación social, multiusuario colaborativo.



\### 6.4 Definición de Hecho (checklist final → `docs/ACCEPTANCE.md`)

\*\*Backend\*\*

\- \[ ] `npm run build`, `npm run lint`, `npm test` y `npm run test:e2e` sin errores; cobertura ≥ 90 % en reglas y services.

\- \[ ] Ningún Controller importa Prisma; ningún Service importa `@prisma/client` ni `@nestjs/common` HTTP exceptions (solo errores de dominio).

\- \[ ] Todos los endpoints de §3.4 existen, con las formas exactas de §3.3 y los códigos de error de §3.2.

\- \[ ] Aislamiento multiusuario verificado (recurso ajeno → 404).

\- \[ ] Importes siempre `NUMERIC`/`Decimal`; ningún `float` en el código monetario.

\- \[ ] Swagger disponible y `docs/openapi.json` generado.



\*\*Frontend\*\*

\- \[ ] `npm run build` sin errores de TypeScript `strict` ni warnings de ESLint; regla `no-restricted-imports` activa (§1.4).

\- \[ ] Cambiar `VITE\_DATA\_SOURCE` entre `mock` y `http` \*\*no\*\* requiere tocar código de UI.

\- \[ ] Todas las pantallas usables de 360 a 1440 px; cada formulario respeta \*\*todos\*\* los campos, validaciones y mensajes de §4.5 con validación en tiempo real.

\- \[ ] Ningún cálculo monetario usa coma flotante (tests de `money.ts`).

\- \[ ] App instalable (manifest válido), lectura offline y banner de conexión funcionando.

\- \[ ] Estados de carga, vacío y error implementados por bloque.

\- \[ ] Lighthouse: PWA instalable y Accesibilidad ≥ 90.



\*\*Integración\*\*

\- \[ ] `docker compose up --build` levanta `db`, `api` y `web`; flujo completo (registro → onboarding → movimiento → préstamo con deuda → pago → aporte a meta → reporte CSV/PDF → vaciar historial) funciona contra la API real.

\- \[ ] La suite de contrato pasa en Mock, FakeHttp y (con `RUN\_E2E=1`) API real.



> \*\*Nota final para el agente:\*\* ante cualquier ambigüedad, prioriza (1) las reglas de dependencia de §1.2 y §1.4, (2) la intercambiabilidad Mock ↔ HTTP, (3) la exactitud del dinero y (4) la simplicidad (KISS/YAGNI). No añadas funcionalidades ni dependencias que no estén en este documento. Registra cada decisión no cubierta en `docs/DECISIONS.md`.

