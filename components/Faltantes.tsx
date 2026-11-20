'use client';

import { useDatos, nombreRubro } from './Datos';
import { Anillo } from './Graficos';
import { usd } from '@/lib/formato';

export default function Faltantes() {
  const { rubros, presupuesto, gastos, fx } = useDatos();
  const tc = fx.length ? fx[fx.length - 1].tc : 0;
  const activos = rubros.filter((r) => r.activo);

  type Caja = {
    presuUSD: number; gastUSD: number;
    tipos: Set<string>; tiposGasto: Set<string>;
    estados: Record<string, number>;
  };
  const porRubro = new Map<number, Caja>();
  activos.forEach((r) =>
    porRubro.set(r.id, { presuUSD: 0, gastUSD: 0, tipos: new Set(), tiposGasto: new Set(), estados: {} }));

  presupuesto.forEach((p) => {
    const b = porRubro.get(p.rubro_id);
    if (!b) return;
    const u = p.moneda === 'USD' ? p.monto : tc ? p.monto / tc : 0;
    b.presuUSD += u;
    b.tipos.add(p.tipo);
    b.estados[p.estado] = (b.estados[p.estado] || 0) + u;
  });

  let sinClasificar = 0;
  gastos.forEach((g) => {
    if (!g.rubro_id) { sinClasificar += Number(g.monto_usd); return; }
    const b = porRubro.get(g.rubro_id);
    if (!b) return;
    b.gastUSD += Number(g.monto_usd);
    b.tiposGasto.add(g.tipo);
  });

  const pendientes: { rubro: string; motivo: string; detalle: string; gastUSD: number; gravedad: number }[] = [];
  let firme = 0, totalPresu = 0, conPresu = 0;

  activos.forEach((r) => {
    const b = porRubro.get(r.id)!;
    totalPresu += b.presuUSD;
    firme += (b.estados['Cotizado'] || 0) + (b.estados['Cerrado'] || 0);
    if (b.presuUSD > 0) conPresu++;

    if (b.presuUSD <= 0) {
      pendientes.push({
        rubro: r.nombre, motivo: 'Sin presupuesto',
        detalle: b.gastUSD > 0 ? 'Ya hay gasto cargado sin monto estimado' : '',
        gastUSD: b.gastUSD, gravedad: b.gastUSD > 0 ? 2 : 1,
      });
      return;
    }
    const faltaTipo = [...b.tiposGasto].filter((t) => !b.tipos.has(t));
    if (faltaTipo.length) {
      pendientes.push({
        rubro: r.nombre, motivo: 'Falta presupuestar',
        detalle: faltaTipo.join(', '), gastUSD: b.gastUSD, gravedad: 2,
      });
    }
    if (!(b.estados['Cotizado'] || b.estados['Cerrado'])) {
      pendientes.push({
        rubro: r.nombre, motivo: 'Falta cotizar',
        detalle: 'Todo el rubro está en estimado', gastUSD: b.gastUSD, gravedad: 0,
      });
    }
  });

  pendientes.sort((a, b) => b.gravedad - a.gravedad || b.gastUSD - a.gastUSD);

  const cobertura = activos.length ? (conPresu / activos.length) * 100 : 0;
  const firmeza = totalPresu > 0 ? (firme / totalPresu) * 100 : 0;

  return (
    <section className="pantalla">
      <div className="kpis">
        <div className="kpi" style={{ gridColumn: 'span 2' }}>
          <Anillo valor={cobertura} etiqueta={`${conPresu} de ${activos.length} rubros presupuestados`} />
        </div>
        <div className="kpi" style={{ gridColumn: 'span 2' }}>
          <Anillo valor={firmeza} etiqueta="del presupuesto está cotizado o cerrado" />
        </div>
      </div>

      {sinClasificar > 0 && (
        <div className="card">
          <h2>Gastos sin rubro</h2>
          <div className="faltante alto">
            <div>
              <div className="t">Hay movimientos sin clasificar</div>
              <div className="d">Asignales rubro desde Gastos para que entren en el análisis</div>
            </div>
            <div className="m">{usd(sinClasificar)}</div>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Qué falta definir</h2>
        {!pendientes.length ? (
          <div className="vacio">Está todo definido.</div>
        ) : (
          pendientes.map((p, i) => (
            <div className={'faltante ' + (p.gravedad === 2 ? 'alto' : p.gravedad === 1 ? 'medio' : 'bajo')} key={i}>
              <div>
                <div className="t">{p.rubro}</div>
                <div className="d">{p.motivo}{p.detalle ? ` — ${p.detalle}` : ''}</div>
              </div>
              <div className="m">
                {p.gastUSD ? (<>{usd(p.gastUSD)}<div className="d">ya gastado</div></>) : null}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h2>Estado rubro por rubro</h2>
        <table>
          <tbody>
            <tr><th>Rubro</th><th className="n">Presupuesto</th><th className="n">Gastado</th><th>Estado</th></tr>
            {activos.map((r) => {
              const b = porRubro.get(r.id)!;
              const estado = b.presuUSD <= 0 ? 'falta'
                : (b.estados['Cerrado'] || 0) >= b.presuUSD * 0.999 ? 'cerrado'
                : (b.estados['Estimado'] || 0) > 0 ? 'estimado' : 'cotizado';
              const etiqueta = { falta: 'falta cargar', estimado: 'estimado', cotizado: 'cotizado', cerrado: 'cerrado' }[estado];
              const cls = { falta: 'tarde', estimado: 'gris', cotizado: 'pronto', cerrado: '' }[estado];
              return (
                <tr key={r.id}>
                  <td>{r.nombre}</td>
                  <td className="n">{b.presuUSD ? usd(b.presuUSD) : '—'}</td>
                  <td className="n">{b.gastUSD ? usd(b.gastUSD) : '—'}</td>
                  <td><span className={'chip ' + cls}>{etiqueta}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
