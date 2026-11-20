'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  CONFIG_DEFAULT, Config, Cuota, Fx, Gasto, LineaPresupuesto, Regla, Rubro,
} from '@/lib/tipos';

type Estado = {
  cargando: boolean;
  config: Config;
  rubros: Rubro[];
  reglas: Regla[];
  gastos: Gasto[];
  presupuesto: LineaPresupuesto[];
  cuotas: Cuota[];
  fx: Fx[];
  recargar: () => Promise<void>;
};

const Ctx = createContext<Estado | null>(null);

export const useDatos = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useDatos fuera del proveedor');
  return c;
};

export function ProveedorDatos({ children }: { children: React.ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [config, setConfig] = useState<Config>(CONFIG_DEFAULT);
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [reglas, setReglas] = useState<Regla[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [presupuesto, setPresupuesto] = useState<LineaPresupuesto[]>([]);
  const [cuotas, setCuotas] = useState<Cuota[]>([]);
  const [fx, setFx] = useState<Fx[]>([]);

  const recargar = useCallback(async () => {
    const [cfg, rub, reg, gas, pre, cuo, fxs] = await Promise.all([
      supabase.from('obra_config').select('key,value'),
      supabase.from('obra_rubros').select('*').order('orden').order('nombre'),
      supabase.from('obra_reglas').select('*'),
      supabase.from('obra_gastos').select('*').order('fecha', { ascending: false }).limit(2000),
      supabase.from('obra_presupuesto').select('*'),
      supabase.from('obra_cuotas').select('*').order('vencimiento'),
      supabase.from('obra_fx').select('*').order('fecha'),
    ]);

    if (cfg.data) {
      const o: Record<string, unknown> = {};
      cfg.data.forEach((r) => { o[r.key] = r.value; });
      setConfig({ ...CONFIG_DEFAULT, ...(o as Partial<Config>) });
    }
    setRubros((rub.data || []) as Rubro[]);
    setReglas((reg.data || []) as Regla[]);
    setGastos((gas.data || []) as Gasto[]);
    setPresupuesto((pre.data || []) as LineaPresupuesto[]);
    setCuotas((cuo.data || []) as Cuota[]);
    setFx((fxs.data || []) as Fx[]);
    setCargando(false);
  }, []);

  useEffect(() => { void recargar(); }, [recargar]);

  return (
    <Ctx.Provider value={{ cargando, config, rubros, reglas, gastos, presupuesto, cuotas, fx, recargar }}>
      {children}
    </Ctx.Provider>
  );
}

/* ---------- derivados ---------- */

export function nombreRubro(rubros: Rubro[], id: number | null) {
  if (!id) return 'Sin clasificar';
  return rubros.find((r) => r.id === id)?.nombre || 'Sin clasificar';
}

export type ResumenRubro = {
  id: number | null;
  rubro: string;
  presuARS: number; presuUSD: number;
  gastARS: number; gastUSD: number;
  pendARS: number; pendUSD: number;
  compUSD: number; compARS: number;
  desvUSD: number;
  sinPresupuesto: boolean;
};

export function calcularPanel(
  rubros: Rubro[], gastos: Gasto[], presupuesto: LineaPresupuesto[], cuotas: Cuota[],
  fx: Fx[], config: Config
) {
  const tc = fx.length ? fx[fx.length - 1].tc : 0;
  const mapa = new Map<number | null, ResumenRubro>();

  const bucket = (id: number | null): ResumenRubro => {
    if (!mapa.has(id)) {
      mapa.set(id, {
        id, rubro: nombreRubro(rubros, id),
        presuARS: 0, presuUSD: 0, gastARS: 0, gastUSD: 0, pendARS: 0, pendUSD: 0,
        compUSD: 0, compARS: 0, desvUSD: 0, sinPresupuesto: true,
      });
    }
    return mapa.get(id)!;
  };

  presupuesto.forEach((p) => {
    const b = bucket(p.rubro_id);
    if (p.moneda === 'USD') { b.presuUSD += p.monto; b.presuARS += p.monto * tc; }
    else { b.presuARS += p.monto; b.presuUSD += tc ? p.monto / tc : 0; }
  });

  const porMes = new Map<string, number>();
  const porTipo = new Map<string, number>();

  gastos.forEach((g) => {
    const b = bucket(g.rubro_id);
    b.gastARS += Number(g.monto_ars); b.gastUSD += Number(g.monto_usd);
    const mes = g.fecha.slice(0, 7);
    porMes.set(mes, (porMes.get(mes) || 0) + Number(g.monto_usd));
    porTipo.set(g.tipo, (porTipo.get(g.tipo) || 0) + Number(g.monto_usd));
  });

  const hoyStr = new Date().toISOString().slice(0, 10);
  let vencidas = 0;
  cuotas.filter((c) => c.estado === 'Pendiente').forEach((c) => {
    const b = bucket(c.rubro_id);
    const a = c.moneda === 'USD' ? c.monto * tc : c.monto;
    const u = c.moneda === 'USD' ? c.monto : tc ? c.monto / tc : 0;
    b.pendARS += a; b.pendUSD += u;
    if (c.vencimiento < hoyStr) vencidas++;
  });

  const lista = [...mapa.values()].map((b) => {
    b.compARS = b.gastARS + b.pendARS;
    b.compUSD = b.gastUSD + b.pendUSD;
    b.sinPresupuesto = b.presuUSD <= 0;
    b.desvUSD = b.presuUSD > 0 ? b.compUSD - b.presuUSD : 0;
    return b;
  }).sort((a, b) => b.compUSD - a.compUSD);

  const tot = lista.reduce(
    (a, b) => ({
      presuARS: a.presuARS + b.presuARS, presuUSD: a.presuUSD + b.presuUSD,
      gastARS: a.gastARS + b.gastARS, gastUSD: a.gastUSD + b.gastUSD,
      pendARS: a.pendARS + b.pendARS, pendUSD: a.pendUSD + b.pendUSD,
    }),
    { presuARS: 0, presuUSD: 0, gastARS: 0, gastUSD: 0, pendARS: 0, pendUSD: 0 }
  );

  const compUSD = tot.gastUSD + tot.pendUSD;
  const compARS = tot.gastARS + tot.pendARS;
  const desvUSD = tot.presuUSD > 0 ? compUSD - tot.presuUSD : 0;
  const m2 = Number(config.m2_computados) || 0;

  let acum = 0;
  const curva = [...porMes.entries()].sort().map(([mes, u]) => {
    acum += u;
    return { mes, acum: Math.round(acum) };
  });

  return {
    tc, m2, lista, curva,
    porTipo: [...porTipo.entries()].map(([tipo, u]) => ({ tipo, usd: u })).sort((a, b) => b.usd - a.usd),
    total: {
      ...tot, compUSD, compARS, desvUSD,
      desvPct: tot.presuUSD > 0 ? (desvUSD / tot.presuUSD) * 100 : null,
      presuConContUSD: tot.presuUSD * (1 + Number(config.contingencia_pct) / 100),
    },
    cuotasPendientes: cuotas.filter((c) => c.estado === 'Pendiente').length,
    cuotasVencidas: vencidas,
    m2Gastado: { ars: m2 ? tot.gastARS / m2 : 0, usd: m2 ? tot.gastUSD / m2 : 0 },
    m2Comprometido: { ars: m2 ? compARS / m2 : 0, usd: m2 ? compUSD / m2 : 0 },
    m2Presupuesto: { ars: m2 ? tot.presuARS / m2 : 0, usd: m2 ? tot.presuUSD / m2 : 0 },
  };
}
