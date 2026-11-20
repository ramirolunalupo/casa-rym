# Casa RYM — Control de obra

App de seguimiento de costos de la obra. Next.js + Supabase.
Presupuesto contra gasto real, en pesos y en dólares, con las tasas reales
de la cuenta Obra Rami de LUCA.

## Para publicarla

La base de datos ya está creada y con los datos cargados. Falta solo el deploy.

### Opción A — Vercel

1. Crear un repo nuevo en GitHub y subir esta carpeta.
2. En vercel.com → Add New → Project → importar el repo.
3. En Environment Variables, pegar las dos de abajo.
4. Deploy.

### Opción B — Netlify

Mismo flujo: importar el repo, cargar las dos variables, deploy.
Build command `npm run build`, el plugin de Next.js lo detecta solo.

### Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL=https://smpzbqmcyfktukoaopre.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_rNGbGBFKOXRCIMdQRrXcKg_NLpVv1tu
```

Las dos son públicas por diseño: los datos están protegidos por RLS, no por la clave.

### Después del deploy

En Supabase → Authentication → URL Configuration, agregar la URL que te dé
Vercel o Netlify en **Site URL** y en **Redirect URLs**. Sin eso el link de
acceso por mail rebota.

## Para correrla local

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Cómo está armado

- `app/page.tsx` — login por link al mail y las solapas
- `components/Datos.tsx` — carga todo de Supabase y calcula los agregados
- `components/Panel.tsx` — KPIs, curva acumulada, donut por rubro, presupuesto vs real
- `components/Luca.tsx` — importador de movimientos de la cuenta Obra Rami
- `components/Gastos.tsx` — alta y edición de gastos
- `components/Presupuesto.tsx` — líneas de presupuesto con estado
- `components/Cuotas.tsx` — planes de pago y registro de cuotas
- `components/Faltantes.tsx` — qué rubros faltan presupuestar o cotizar
- `components/Cambio.tsx` — operaciones de cambio de la cuenta Obra
- `components/Ajustes.tsx` — m², contingencia, rubros y quién puede entrar

## Tablas en Supabase

Todas en el proyecto LUCA, con prefijo `obra_`:

`obra_acceso`, `obra_config`, `obra_rubros`, `obra_reglas`,
`obra_presupuesto`, `obra_fx`, `obra_gastos`, `obra_cuotas`.

Funciones: `obra_sync_fx()` trae las operaciones de cambio de la cuenta Obra Rami,
`obra_fx_para()` elige la tasa que le corresponde a un gasto,
y la vista `obra_v_pendientes` lista lo que todavía no se importó.

El acceso se controla por RLS contra `obra_acceso`: si tu mail no está ahí,
no ves nada, aunque tengas usuario en LUCA.
