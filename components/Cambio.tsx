'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useDatos } from './Datos';
import { useAviso } from './Ui';
import { Dispersion } from './Graficos';
import { ars, usd } from '@/lib/formato';

export default function Cambio() {
  const { fx, gastos, recargar } = useDatos();
  const avisar = useAviso();
  const [sincronizando, setSincronizando] = useState(false);

  const sincronizar = async () => {
    setSincronizando(true);
    const { data, error } = await supabase.rpc('obra_sync_fx');
    setSincronizando(false);
    if (error) { avisar(error.message, true); return; }
    avisar(`${data ?? 0} operaciones de cambio sincronizadas`);
    await recargar();
  };

  const usadas = new Map<string, number>();
  gastos.forEach((g) => {
    if (g.fx_op) usadas.set(g.fx_op, (usadas.get(g.fx_op) || 0) + 1);
  });

  const ordenadas = [...fx].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  const tcs = fx.map((f) => f.tc);
  const min = tcs.length ? Math.min(...tcs) : 0;
  const max = tcs.length ? Math.max(...tcs) : 0;
  const prom = fx.length
    ? fx.reduce((a, f) => a + f.ars, 0) / fx.reduce((a, f) => a + f.usd, 0)
    : 0;

  return (
    <section className="pantalla">
      <div className="kpis">
        <div className="kpi">
          <div className="lbl">Operaciones</div>
          <div className="val">{fx.length}</div>
          <div className="alt">de la cuenta Obra</div>
        </div>
        <div className="kpi">
          <div className="lbl">Tasa promedio</div>
          <div className="val">{ars(prom)}</div>
          <div className="alt">ponderada por monto</div>
        </div>
        <div className="kpi">
          <div className="lbl">Mínima</div>
          <div className="val">{ars(min)}</div>
          <div className="alt">&nbsp;</div>
        </div>
        <div className="kpi">
          <div className="lbl">Máxima</div>
          <div className="val">{ars(max)}</div>
          <div className="alt">&nbsp;</div>
        </div>
      </div>

      <div className="card">
        <h2>
          Tasas de la cuenta Obra
          <span className="sub">cada punto es una operación</span>
        </h2>
        <div className="hint">
          Cada gasto toma la tasa de la operación de cambio que lo financió, no un promedio del día.
          Puede haber dos tasas distintas en la misma fecha.
        </div>
        <div style={{ marginTop: 12 }}>
          <Dispersion puntos={[...fx].sort((a, b) => (a.fecha < b.fecha ? -1 : 1))} />
        </div>
        <button className="btn sec" onClick={sincronizar} disabled={sincronizando}>
          {sincronizando ? 'Consultando LUCA…' : 'Traer operaciones nuevas de LUCA'}
        </button>
      </div>

      <div className="card">
        <h2>Detalle</h2>
        {!ordenadas.length ? (
          <div className="vacio">Sin operaciones sincronizadas.</div>
        ) : (
          <table>
            <tbody>
              <tr>
                <th>Fecha</th><th className="n">Pesos</th><th className="n">Dólares</th>
                <th className="n">Tasa</th><th className="n">Gastos</th>
              </tr>
              {ordenadas.map((f) => (
                <tr key={f.id_operacion}>
                  <td>{f.fecha}</td>
                  <td className="n">{ars(f.ars)}</td>
                  <td className="n">{usd(f.usd)}</td>
                  <td className="n">{ars(f.tc)}</td>
                  <td className="n">{usadas.get(f.id_operacion) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
