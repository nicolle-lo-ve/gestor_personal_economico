# Estado y funciones del Gestor Económico Personal

> Documento complementario a `SPEC.md`. Explica **dónde** vive el estado del
> sistema, **cómo** se usa, y **cuáles** son las funciones puramente
> stateless (sin memoria entre llamadas), siguiendo la teoría de
> *Técnicas de construcción de software basada en estados*
> (`entrada → salida`, sin `s'` persistido).

---

## 1. Resumen ejecutivo

| Tipo | Cantidad | Dónde | Persiste entre llamadas |
|---|---|---|---|
| **Stateless (puro)** | 2 | `frontend/src/domain/rules/calculators.ts` | ❌ No |
| **Stateful** | 3 mecanismos | Frontend (componente / global / navegador) | ✅ Sí |
| **Stateless (servidor)** | 1 | API REST NestJS con JWT | ❌ No (el estado va a PostgreSQL) |

Regla de oro aplicada:

- **Stateless** = `δ(e) → s'` sin guardar `s`. Mismo input → mismo output.
- **Stateful** = guarda `s` entre llamadas (memoria, store, IndexedDB, BD).

---

## 2. Funciones STATELESS (2)

### 2.1 `projectGoalCompletion`

**Archivo:** `frontend/src/domain/rules/calculators.ts`
**Firma:** `(saved, target, monthly, today) → { months, projectedDate } | null`
**Naturaleza:** función pura. No lee ni escribe nada. No depende del reloj real
(el `today` llega como parámetro).

```ts
export function projectGoalCompletion(
  savedAmount: MoneyString,
  targetAmount: MoneyString,
  monthlyContribution: MoneyString,
  today: ISODate,
): { months: number; projectedDate: ISODate } | null {
  const remainingCents = toCents(targetAmount) - toCents(savedAmount);
  const perMonthCents  = toCents(monthlyContribution);
  if (perMonthCents <= 0 || remainingCents <= 0) return null;
  const months = Math.ceil(remainingCents / perMonthCents);
  const projectedDate = format(addMonths(parseISO(today), months), 'yyyy-MM-dd');
  return { months, projectedDate };
}
```

**Dónde se usa (UI):**

- `frontend/src/components/goals/GoalCard.tsx`
  Se llama al renderizar cada tarjeta para mostrar:
  *“A este ritmo, logras tu meta el 12 mar 2027 (≈ 6 meses)”*.
- `frontend/src/pages/GoalsPage.tsx`
  En el cálculo agregado “total a ahorrar por mes para terminar todas las
  metas activas antes de su deadline”.

**Cómo se usa :**

```tsx
const projection = projectGoalCompletion(
  goal.savedAmount,
  goal.targetAmount,
  suggestedMonthlyContribution(goal.remainingAmount, goal.deadline, today),
  today,
);

return projection ? (
  <p className="text-sm text-muted-foreground">
    A este ritmo, logras tu meta el {formatDate(projection.projectedDate)}
  </p>
) : null;
```

**Por qué es stateless (según la teoría):**

- No hay `S` guardado; cada llamada recalcula desde cero.
- Es una **función de transición** `δ(entrada) → salida` sin `s'`.
- Testeable con Vitest sin mocks ni setup: `expect(f(...)).toEqual(...)`.

---

### 2.2 `compoundProjection`

**Archivo:** `frontend/src/domain/rules/calculators.ts`
**Firma:** `(initial, monthly, annualRatePct, months) → MoneyString`
**Naturaleza:** función pura. Solo aritmética entera (centavos) + un bucle.

```ts
export function compoundProjection(
  initial: MoneyString,
  monthly: MoneyString,
  annualRatePct: number,
  months: number,
): MoneyString {
  const r = annualRatePct / 100 / 12;
  let total = toCents(initial);
  for (let i = 0; i < months; i++) {
    total = Math.round(total * (1 + r)) + toCents(monthly);
  }
  return fromCents(total);
}
```

**Dónde se usa (UI):**

- `frontend/src/components/goals/ContributionSimulator.tsx`
  Panel colapsable dentro de `ContributionDialog`:
  *“Si aportas S/ 200 al mes durante 12 meses al 4 % anual, tendrías S/ 2 456.10”*.
- `frontend/src/pages/SettingsPage.tsx` (opcional)
  En la sección “Aplicación” como demo de cálculo offline.

**Cómo se usa :**

```tsx
const [months, setMonths] = useState(12);
const [rate, setRate]     = useState(4);

const projected = compoundProjection(
  goal.savedAmount,
  monthlyContribution,
  rate,
  months,
);
// Se muestra con <MoneyText value={projected} tone="goal" />
```

**Por qué es stateless:**

- No cachea `total` ni el resultado.
- No depende de React, del navegador ni del servidor.
- `compoundProjection("100.00","10.00",4,12)` devuelve **siempre** lo mismo.

---

## 3. Mecanismos STATEFUL (frontend)

El frontend del Gestor es **stateful por diseño** (UI reactiva). Usa tres
niveles de estado, igual que describe la teoría:

### 3.1 Estado a nivel de componente

**Ubicación:** hooks `useState` dentro de `pages/` y `components/`.
**Qué guarda:** datos locales y efímeros de la UI.
**Ejemplos concretos:**

| Componente | Estado | Para qué |
|---|---|---|
| `TransactionFormPage` | `type`, `categoryId`, `amount`, `occurredAt`, `isDirty` | Borrador del formulario antes de guardar |
| `ClearHistoryDialog` | `scope`, `confirmText`, `checked` | Doble confirmación de borrado |
| `DebtPaymentDialog` | `registerInBalance` | Switch “Reflejar en mi balance” |
| `MonthPicker` | `value` | Mes visible en el dashboard |
| `ContributionDialog` | `amount`, `madeAt` | Aporte antes de enviarlo |

**Código:**

```tsx
const [registerInBalance, setRegisterInBalance] = useState(true);
```

**Por qué es stateful:** el valor sobrevive a re-renders del componente
(no a un refresh de página). Es “memoria a nivel de componente”.

---

### 3.2 Estado global (compartido entre pantallas)

**Ubicación:**

- `frontend/src/features/ui-store.ts` → **Zustand** con `persist`.
- `frontend/src/app/providers/QueryProvider.tsx` → **TanStack Query**.
- `frontend/src/app/providers/AuthProvider.tsx` → sesión en memoria.

**Qué guarda:**

| Store | Claves | Persistencia |
|---|---|---|
| Zustand (`mg.ui`) | `theme`, `selectedMonth`, `sidebarCollapsed` | `localStorage` |
| TanStack Query (`mi-gestor-query-cache`) | transacciones, deudas, metas, dashboard | **IndexedDB** (24 h) |
| `AuthProvider` | `user` actual | memoria (se rehidrata vía `useCurrentUser`) |

**Código:**

```ts
// features/ui-store.ts
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'system',
      selectedMonth: format(new Date(), 'yyyy-MM'),
      setMonth: (m) => set({ selectedMonth: m }),
      setTheme: (t) => set({ theme: t }),
    }),
    { name: 'mg.ui' },
  ),
);
```

**Uso en UI:**

```tsx
const month = useUiStore((s) => s.selectedMonth);
const { data } = useDashboardSummary(month); // TanStack Query
```

**Por qué es stateful:** el estado se comparte entre páginas y **sobrevive**
a la navegación e incluso a un refresh (por `persist` / IndexedDB).

---

### 3.3 Estado en el navegador (persistente)

**Ubicación:**

- `frontend/src/services/http/tokenStorage.ts` → `localStorage` (`mg.refreshToken`).
- `frontend/src/services/mock/db.ts` → **IndexedDB** (`idb-keyval`) con
  `mock:users`, `mock:categories`, `mock:transactions`, `mock:debts`,
  `mock:goals`, `mock:session`.
- `frontend/src/app/providers/QueryProvider.tsx` → caché persistido en
  IndexedDB (`mi-gestor-query-cache`).
- `frontend/src/pwa/useInstallPrompt.ts` → `mg.installDismissedAt`.

**Código:**

```ts
// services/mock/db.ts
import { get, set } from 'idb-keyval';
export const readTx = () => get<Transaction[]>('mock:transactions') ?? [];
export const writeTx = (rows: Transaction[]) => set('mock:transactions', rows);
```

**Uso en UI:** el mock, al recargar la PWA, sigue mostrando los mismos
movimientos porque viven en IndexedDB.

**Por qué es stateful:** el estado **sobrevive al cierre del navegador**.
Es la forma más fuerte de estado descrita por la teoría.

---

## 4. Mecanismo STATELESS del backend (recordatorio)

**Ubicación:** toda la API NestJS (`backend/src/modules/**`).
**Naturaleza:** stateless. El servidor **no recuerda** nada entre requests.

| Señal | Estado en el Gestor |
|---|---|
| Sesión en memoria del proceso | No, usa JWT Bearer |
| Sticky sessions | No, cualquier instancia sirve |
| WebSockets |  No, solo REST/HTTPS |
| Estado real | PostgreSQL (`users`, `transactions`, `refresh_tokens`, …) |

**Endpoint stateless:**

```ts
@Get('summary')
getSummary(@CurrentUser() u: User, @Query('month') month: string) {
  return this.service.getSummary(u.id, month); // no guarda nada entre llamadas
}
```

**Por qué es stateless:** dos llamadas iguales devuelven lo mismo (mientras
la BD no cambie) y no se guarda `s` en el proceso.

---

## 5. Tabla comparativa final

| Función / mecanismo | Archivo | Tipo | Persiste | Test |
|---|---|---|---|---|
| `projectGoalCompletion` | `domain/rules/calculators.ts` | Stateless | ❌ | Vitest puro |
| `compoundProjection` | `domain/rules/calculators.ts` | Stateless | ❌ | Vitest puro |
| `useState` en componentes | `pages/`, `components/` | Stateful | Solo sesión de componente | RTL |
| Zustand `mg.ui` | `features/ui-store.ts` | Stateful | `localStorage` | Vitest |
| TanStack Query | `app/providers/QueryProvider.tsx` | Stateful | IndexedDB (24 h) | Vitest + mocks |
| Mock IndexedDB | `services/mock/db.ts` | Stateful | IndexedDB | Vitest + fake-indexeddb |
| API NestJS | `backend/src/modules/**` | Stateless | ❌ (BD aparte) | Jest + supertest |

