# Entrega — Aplicación web con internacionalización y regex

**Curso:** Tecnologías de Construcción de Software  
**Tema:** Internacionalización (i18n) + Validación con Expresiones Regulares  
**Alumno:** Nicolle Lozano 
**Proyecto:** Gestor Económico Personal

---

## 1. Descripción de la solución

Se agregó al **Gestor Económico Personal** (React 18 + Vite + TypeScript):

1. Un **menú desplegable de selección de idioma** con tres idiomas: español (`es-PE`), inglés (`en-US`) y portugués (`pt-BR`).
2. **Validación con Expresiones Regulares** en los formularios de **Registro** y **Nuevo movimiento**, con mensajes de error **traducidos al idioma activo**.

El idioma seleccionado se persiste en `localStorage` (`mg.lang`) y afecta tanto a las **etiquetas de la interfaz** como a los **mensajes de validación**.

---

## 2. Menú desplegable de idioma

### 2.1 Componente

El componente `LanguageSelect` está ubicado en:

```
frontend/src/components/common/LanguageSelect.tsx
```

Es un **dropdown** (no segmentado) construido con `shadcn/ui` (`DropdownMenu`) que muestra:

- Ícono de globo (`Globe` de Lucide) + código del idioma activo (`ES`, `EN`, `PT`).
- Al abrirse: lista de los tres idiomas con **bandera**, **nombre nativo** y **check** en el activo.

### 2.2 Comportamiento

| Acción | Resultado |
|--------|-----------|
| Click en el trigger | Abre el dropdown con los 3 idiomas |
| Click en una opción | Llama a `i18n.changeLanguage(code)` → la UI se traduce al instante |
| Persistencia | `i18next-browser-languagedetector` guarda la elección en `localStorage` (`mg.lang`) |
| Detección inicial | Al abrir la app por primera vez, detecta el idioma del navegador |

### 2.3 Ubicación

- **Pantallas privadas:** en el `Header` (arriba a la derecha).
- **Pantallas públicas** (`/login`, `/registro`, `/bienvenida`): flotante arriba a la derecha.

---

## 3. Validación con Expresiones Regulares

### 3.1 Fuente única de verdad

Todas las regex viven en **un solo archivo**:

```
frontend/src/domain/regex.ts
```

Esto evita duplicación (DRY) y permite testear las regex una sola vez con Vitest.

### 3.2 Catálogo de regex usadas

| Nombre | Regex | Uso | Ejemplo válido | Ejemplo inválido |
|--------|-------|-----|----------------|------------------|
| `EMAIL_RE` | `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/` | Correo electrónico | `ana@gestor.pe` | `ana@`, `@gestor.pe` |
| `PASSWORD_RE` | `/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&._-]{8,}$/` | Contraseña (≥ 8, 1 letra, 1 número) | `Demo1234` | `12345678` (sin letra) |
| `DISPLAY_NAME_RE` | `/^[\p{L}][\p{L}\s'.-]{1,99}$/u` | Nombre (2–100, con acentos y ñ) | `José María` | `A` |
| `POSITIVE_MONEY_RE` | `/^(?!0+(\.0{1,2})?$)\d{1,12}(\.\d{1,2})?$/` | Importes > 0, máx 2 decimales | `1250.50` | `0`, `10.999` |
| `ISO_DATE_RE` | `/^\d{4}-\d{2}-\d{2}$/` | Fecha `YYYY-MM-DD` | `2026-10-11` | `11/10/2026` |
| `YEAR_MONTH_RE` | `/^\d{4}-(0[1-9]\|1[0-2])$/` | Mes `YYYY-MM` | `2026-10` | `2026-13` |
| `UUID_RE` | `/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i` | IDs | `550e8400-e29b-41d4-a716-446655440000` | `123` |
| `HEX_COLOR_RE` | `/^#[0-9a-fA-F]{6}$/` | Color de categoría | `#ea580c` | `#abc` |
| `DESCRIPTION_RE` | `/^[\s\S]{0,255}$/` | Descripción (≤ 255) | `Almuerzo` | 256+ caracteres |
| `CATEGORY_NAME_RE` | `/^.{2,60}$/s` | Nombre de categoría | `Comida` | `A` |
| `COUNTERPARTY_RE` | `/^.{2,100}$/s` | Contraparte de deuda | `Carlos` | `C` |
| `GOAL_NAME_RE` | `/^.{2,100}$/s` | Nombre de meta | `Viaje a Cusco` | `X` |

### 3.3 Cómo se integran con Zod

Los formularios usan **React Hook Form + Zod**. Los schemas importan las regex desde `domain/regex.ts` y devuelven **claves de traducción** (no mensajes literales):

```ts
email: z.string().trim().toLowerCase().max(255)
  .regex(EMAIL_RE, 'validation.email'),
password: z.string().regex(PASSWORD_RE, 'validation.password'),
amount: z.string().regex(POSITIVE_MONEY_RE, 'validation.amountPositive'),
occurredAt: z.string().regex(ISO_DATE_RE, 'validation.date')
  .refine((d) => d <= todayISO(), 'validation.dateNotFuture'),
```

En el componente, la clave se traduce con `t()`:

```tsx
{errors.email && <p role="alert">{t(errors.email.message!)}</p>}
```

De este modo, **la misma validación produce mensajes distintos según el idioma**.

### 3.4 Validación en tiempo real

`useForm` está configurado con `mode: 'onChange'`:

- Mientras el usuario escribe, la regex se evalúa en cada pulsación.
- El campo muestra borde rojo + ⚠ + mensaje traducido cuando es inválido.
- Muestra borde verde + ✓ cuando es válido.
- El botón **"Crear cuenta"** / **"Guardar"** permanece deshabilitado hasta que `isValid === true`.

### 3.5 Ejemplos de validación por formulario

**Registro:**

| Campo | Regla | Mensaje ES | Mensaje EN | Mensaje PT |
|-------|-------|------------|------------|------------|
| Correo | `EMAIL_RE` | "Ingresa un correo válido." | "Enter a valid email address." | "Digite um e-mail válido." |
| Contraseña | `PASSWORD_RE` | "Mínimo 8 caracteres, con al menos una letra y un número." | "At least 8 characters, with one letter and one number." | "Mínimo de 8 caracteres, com uma letra e um número." |
| Confirmación | `refine` | "Las contraseñas no coinciden." | "Passwords do not match." | "As senhas não coincidem." |
| Nombre | `DISPLAY_NAME_RE` | "Nombre inválido (2–100 caracteres)." | "Invalid name (2–100 characters)." | "Nome inválido (2–100 caracteres)." |

**Nuevo movimiento:**

| Campo | Regla | Mensaje ES | Mensaje EN | Mensaje PT |
|-------|-------|------------|------------|------------|
| Monto | `POSITIVE_MONEY_RE` | "El monto debe ser mayor a 0 y tener máximo 2 decimales." | "Amount must be greater than 0 and have at most 2 decimals." | "O valor deve ser maior que 0 e ter no máximo 2 decimais." |
| Fecha | `ISO_DATE_RE` + `≤ hoy` | "La fecha no puede ser futura." | "The date cannot be in the future." | "A data não pode ser futura." |
| Descripción | `DESCRIPTION_RE` | "Máximo 255 caracteres." | "Maximum 255 characters." | "Máximo 255 caracteres." |

### 3.6 Test unitario de las regex

```ts
// frontend/src/domain/__tests__/regex.test.ts
import { describe, it, expect } from 'vitest';
import { EMAIL_RE, PASSWORD_RE, POSITIVE_MONEY_RE, ISO_DATE_RE } from '../regex';

describe('regex de validación', () => {
  it.each([
    ['ana@gestor.pe', true],
    ['ana@', false],
    ['ana gestor@x.com', false],
    ['@x.com', false],
  ])('EMAIL_RE(%s) → %s', (input, expected) => {
    expect(EMAIL_RE.test(input)).toBe(expected);
  });

  it.each([
    ['Demo1234', true],
    ['12345678', false],   // sin letra
    ['abcdefgh', false],   // sin número
    ['De1',      false],   // < 8
  ])('PASSWORD_RE(%s) → %s', (input, expected) => {
    expect(PASSWORD_RE.test(input)).toBe(expected);
  });

  it.each([
    ['0',        false],
    ['0.00',     false],
    ['10.5',     true],
    ['10.999',   false],
    ['1250.50',  true],
  ])('POSITIVE_MONEY_RE(%s) → %s', (input, expected) => {
    expect(POSITIVE_MONEY_RE.test(input)).toBe(expected);
  });
});
```

---

## 4. Evidencia de ejecución

![pantalla principal](screenshots/idiomas.png)
---

## 5. Cómo reproducir la ejecución

### 5.1 Arrancar el frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### 5.2 Probar el menú desplegable

1. Abrir `/login`.
2. Hacer click en el botón del globo (arriba a la derecha).
3. Seleccionar **English** o **Português**.
4. La interfaz se traduce **al instante**, sin recargar.

### 5.3 Probar la validación con regex

**Registro:**

1. Ir a `/registro`.
2. Escribir un correo inválido como `ana@` → error en tiempo real.
3. Escribir una contraseña corta como `1234` → error "Mínimo 8 caracteres…".
4. Escribir un nombre de 1 letra como `A` → error "Nombre inválido…".
5. Corregir todo → el botón **"Crear cuenta"** se habilita.

**Nuevo movimiento:**

1. Ir a `/movimientos/nuevo`.
2. Escribir `0` o `10.999` en el monto → error de regex.
3. Escribir una fecha futura → error "La fecha no puede ser futura.".
4. Cambiar el idioma desde el dropdown → los mensajes se traducen.

### 5.4 Ejecutar los tests de regex

```bash
cd frontend
npm test
# → Todos los tests de regex.test.ts en verde
```

---

## 6. Conclusiones

- Se implementó un **menú desplegable de idioma** con tres idiomas
  (español, inglés, portugués), persistente en `localStorage`.
- Se centralizaron **todas las expresiones regulares** en un único archivo
  (`domain/regex.ts`), evitando duplicación y facilitando el testeo.
- Los formularios de **Registro** y **Nuevo movimiento** validan en tiempo
  real con **React Hook Form + Zod**, usando las regex centralizadas.
- Los **mensajes de error están traducidos** y cambian automáticamente
  según el idioma activo (es/en/pt), demostrando que i18n y regex se
  integran sin fricción.
- Las regex tienen **tests unitarios** que garantizan que aceptan los
  casos válidos y rechazan los inválidos.

---
