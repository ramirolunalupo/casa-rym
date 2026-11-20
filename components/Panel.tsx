'use client';

import { useDatos, calcularPanel } from './Datos';
import { Curva, Donut } from './Graficos';
import { ars, usd, usd1, pct, PALETA } from '@/lib/formato';

export default function Panel() {
  const { rubros, gastos, presupuesto, cuotas, fx, config } = useDatos();
  const d = calcularPanel(rubros, gastos, presupuesto, cuotas, fx, config);
  const t = d.total;

  const conGasto = d.lista.filter((r) => r.gastUSD > 0);
  const datosDonut = conGasto.slice(0, 8).map((r) => ({ nombre: r.rubro, valor: r.gastUSD }));
  const resto = conGasto.slice(8).reduce((a, r) => a + r.gastUSD, 0);
  if (resto > 0) datosDonut.push({ nombre: 'Resto', valor: resto });

  const maxBarra = Math.max(1, ...d.lista.map((r) => Math.max(r.presuUSD, r.compUSD)));
  const totTipo = d.porTipo.reduce((a, x) => a + x.usd, 0);

  return (
    <section className="pantalla">
      <div className="kpis">
        <Kpi lbl="Gastado" val={usd(t.gastUSD)} alt={ars(t.gastARS)} />
        <Kpi
          lbl="Presupuestado"
          val={usd(t.presuUSD)}
          alt={`con ${config.contingencia_pct}% contingencia: ${usd(t.presuConContUSD)}`}
        />
        <Kpi
          lbl="Pendiente en cuotas"
          val={usd(t.pendUSD)}
          alt={`${d.cuotasPendientes} cuotas${d.cuotasVencidas ? ` · ${d.cuotasVencidas} vencidas` : ''}`}
        />
        <div className="kpi">
          <div className="lbl">Desvío proyectado</div>
          <div className="val">
            <span className={t.desvUSD > 0 ? 'neg' : 'pos'}>{usd(t.desvUSD)}</span>
          </div>
          <div className="alt">{pct(t.desvPct)} sobre presupuesto</div>
        </div>
      </div>

      <div className="card">
        <h2>Curva de gasto acumulado <span className="sub">en dólares</span></h2>
        <Curva puntos={d.curva} meta={t.presuUSD} />
      </div>

      <div className="card">
        <h2>Dónde se va la plata <span className="sub">gasto ejecutado por rubro</span></h2>
        <Donut datos={datosDonut} total={t.gastUSD} />
      </div>

      <div className="card">
        <h2>Mano de obra vs. materiales</h2>
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
        <h2>Presupuesto vs. real <span className="sub">barra gris: presupuestado</span></h2>
        {!d.lista.length ? (
          <div className="vacio">Todavía no hay presupuesto ni gastos.</div>
        ) : (
          d.lista.map((r) => {
            const excede = !r.sinPresupuesto && r.compUSD > r.presuUSD;
            return (
              <div className="cmp" key={String(r.id)}>
                <div className="cmp-head">
                  <div className="t">
                    {r.rubro}{' '}
                    {r.sinPresupuesto && <span className="chip tarde">sin presupuesto</span>}
                  </div>
                  <div className="m">
                    {usd(r.gastUSD)}
                    <div className="d">de {r.presuUSD ? usd(r.presuUSD) : '—'}</div>
                  </div>
                </div>
                <div className="pista">
                  <i className={excede ? 'x' : 'g'} style={{ width: `${(r.gastUSD / maxBarra) * 100}%` }} />
                  <i className="p" style={{ width: `${(r.pendUSD / maxBarra) * 100}%` }} />
                </div>
                <div className="ref"><i style={{ width: `${(r.presuUSD / maxBarra) * 100}%` }} /></div>
                <div className="d" style={{ marginTop: 5 }}>
                  {r.pendUSD ? `pendiente ${usd(r.pendUSD)} · ` : ''}
                  {!r.sinPresupuesto && (
                    <>desvío <span className={r.desvUSD > 0 ? 'neg' : 'pos'}>{usd(r.desvUSD)}</span> · </>
                  )}
                  {d.m2 ? `${usd1(r.gastUSD / d.m2)}/m²` : ''}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="card">
        <h2>Costo por m² <span className="sub">sobre {d.m2} m²</span></h2>
        <table>
          <tbody>
            <tr><th /><th className="n">USD/m²</th><th className="n">ARS/m²</th></tr>
            <FilaM2 l="Ejecutado" o={d.m2Gastado} />
            <FilaM2 l="Comprometido" o={d.m2Comprometido} />
            <FilaM2 l="Presupuestado" o={d.m2Presupuesto} />
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

function FilaM2({ l, o }: { l: string; o: { ars: number; usd: number } }) {
  return (
    <tr>
      <td>{l}</td>
      <td className="n">{usd1(o.usd)}</td>
      <td className="n">{ars(o.ars)}</td>
    </tr>
  );
}
