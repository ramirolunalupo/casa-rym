'use client';

import { useState } from 'react';
import { useDatos, calcularPanel } from './Datos';
import { Curva, Donut } from './Graficos';
import { ars, usd, usd1, PALETA } from '@/lib/formato';

export default function Panel() {
  const { rubros, gastos, presupuesto, cuotas, fx, config } = useDatos();
  const d = calcularPanel(rubros, gastos, presupuesto, cuotas, fx, config);
  const t = d.total;
  const [verTodo, setVerTodo] = useState(false);

  const conGasto = d.lista.filter((r) => r.gastUSD > 0);
  const datosDonut = conGasto.slice(0, 8).map((r) => ({ nombre: r.rubro, valor: r.gastUSD }));
  const resto = conGasto.slice(8).reduce((a, r) => a + r.gastUSD, 0);
  if (resto > 0) datosDonut.push({ nombre: 'Resto', valor: resto });

  const activos = d.lista.filter((r) => r.proyUSD > 0);
  const visibles = verTodo ? activos : activos.slice(0, 10);
  const maxProy = Math.max(1, ...activos.map((r) => r.proyUSD));
  const totTipo = d.porTipo.reduce((a, x) => a + x.usd, 0);
  const falta = t.proyUSD - t.gastUSD;

  return (
    <section className="pantalla">
      {/* ---- el número grande: cuánto va a salir ---- */}
      <div className="card destacado">
        <div className="lbl">La obra va a salir</div>
        <div className="grande">{usd(t.proyUSD)}</div>
        <div className="sub-grande">
          {usd1(d.m2Proyectado.usd)} por m² sobre {d.m2} m² · {ars(t.proyARS)}
        </div>

        <div className="progreso">
          <i className="hecho" style={{ width: `${Math.min((t.gastUSD / t.proyUSD) * 100, 100)}%` }} />
        </div>
        <div className="progreso-pie">
          <span><b>{usd(t.gastUSD)}</b> pagado · {Math.round(t.avance)}%</span>
          <span>faltan <b>{usd(falta)}</b></span>
        </div>
      </div>

      <div className="kpis">
        <Kpi lbl="Presupuestado" val={usd(t.presuUSD)} alt={`${usd1(d.m2Presupuesto.usd)}/m²`} />
        <Kpi lbl="Pagado" val={usd(t.gastUSD)} alt={ars(t.gastARS)} />
        <Kpi
          lbl="Sin presupuestar"
          val={usd(d.sinPresupuesto.reduce((a, r) => a + r.gastUSD, 0))}
          alt={`${d.sinPresupuesto.length} rubros con gasto sin estimar`}
        />
        <Kpi
          lbl="Cuotas pendientes"
          val={usd(t.pendUSD)}
          alt={`${d.cuotasPendientes} cuotas${d.cuotasVencidas ? ` · ${d.cuotasVencidas} vencidas` : ''}`}
        />
      </div>

      {/* ---- el detalle rubro por rubro ---- */}
      <div className="card">
        <h2>
          Rubro por rubro
          <span className="sub">presupuesto, pagado y lo que va a costar</span>
        </h2>

        <div className="ref-colores">
          <span><b style={{ background: 'var(--verde)' }} />pagado</span>
          <span><b style={{ background: 'var(--ambar)' }} />falta pagar</span>
          <span><b style={{ background: 'var(--rojo)' }} />se pasó del presupuesto</span>
        </div>

        {visibles.map((r) => {
          const excede = !r.sinPresupuesto && r.compUSD > r.presuUSD;
          const pagadoPct = (r.gastUSD / maxProy) * 100;
          const faltaPct = ((r.proyUSD - r.gastUSD) / maxProy) * 100;
          return (
            <div className="rubro" key={String(r.id)}>
              <div className="rubro-head">
                <div className="rubro-nom">
                  {r.rubro}
                  {r.sinPresupuesto && <span className="chip tarde">sin presupuesto</span>}
                  {r.sinGasto && !r.sinPresupuesto && <span className="chip gris">no empezó</span>}
                </div>
                <div className="rubro-tot">{usd(r.proyUSD)}</div>
              </div>

              <div className="pista">
                <i className={excede ? 'x' : 'g'} style={{ width: `${pagadoPct}%` }} />
                <i className="p" style={{ width: `${Math.max(faltaPct, 0)}%` }} />
              </div>

              <div className="rubro-pie">
                <span>
                  pagado {usd(r.gastUSD)}
                  {r.presuUSD > 0 && <> de {usd(r.presuUSD)}</>}
                  {r.avance !== null && <> · {Math.round(r.avance)}%</>}
                </span>
                {excede && (
                  <span className="neg">+{usd(r.compUSD - r.presuUSD)} sobre lo estimado</span>
                )}
              </div>
            </div>
          );
        })}

        {activos.length > 10 && (
          <button className="btn sec" onClick={() => setVerTodo(!verTodo)}>
            {verTodo ? 'Ver solo los diez más grandes' : `Ver los ${activos.length} rubros`}
          </button>
        )}
      </div>

      <div className="card">
        <h2>Curva de gasto acumulado <span className="sub">línea roja: lo que va a salir</span></h2>
        <Curva puntos={d.curva} meta={t.proyUSD} />
      </div>

      <div className="card">
        <h2>Dónde se fue la plata <span className="sub">solo lo ya pagado</span></h2>
        <Donut datos={datosDonut} total={t.gastUSD} />
      </div>

      <div className="card">
        <h2>Mano de obra vs. materiales <span className="sub">de lo pagado</span></h2>
        {!d.porTipo.length ? (
          <div className="vacio">Sin gastos cargados todavía.</div>
        ) : (
          <>
            <div className="apil">
              {d.porTipo.map((x, i) => (
                <i key={x.tipo} style={{ width: `${(x.usd / totTipo) * 100}%`, background: PALETA[i % PALETA.length] }} />
              ))}
            </div>
            <div className="leyenda">
              {d.porTipo.map((x, i) => (
                <span key={x.tipo}>
                  <b style={{ background: PALETA[i % PALETA.length] }} />
                  {x.tipo} · {usd(x.usd)}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2>Costo por m² <span className="sub">sobre {d.m2} m² computados</span></h2>
        <table>
          <tbody>
            <tr><th /><th className="n">USD/m²</th><th className="n">ARS/m²</th></tr>
            <FilaM2 l="Pagado hasta hoy" o={d.m2Gastado} />
            <FilaM2 l="Presupuestado" o={d.m2Presupuesto} />
            <FilaM2 l="Va a salir" o={d.m2Proyectado} fuerte />
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Kpi({ lbl, val, alt }: { lbl: string; val: string; alt: string }) {
  return (
    <div className="kpi">
      <div className="lbl">{lbl}</div>
      <div className="val">{val}</div>
      <div className="alt">{alt}</div>
    </div>
  );
}

function FilaM2({ l, o, fuerte }: { l: string; o: { ars: number; usd: number }; fuerte?: boolean }) {
  return (
    <tr style={fuerte ? { fontWeight: 650 } : undefined}>
      <td>{l}</td>
      <td className="n">{usd1(o.usd)}</td>
      <td className="n">{ars(o.ars)}</td>
    </tr>
  );
}
