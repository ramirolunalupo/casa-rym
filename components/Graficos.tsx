'use client';

import { PALETA, usd, mesCorto } from '@/lib/formato';

const polar = (cx: number, cy: number, r: number, a: number) =>
  [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;

export function Donut({ datos, total }: { datos: { nombre: string; valor: number }[]; total: number }) {
  if (!total) return <div className="vacio">Sin gastos cargados todavía.</div>;
  const cx = 100, cy = 100, R = 92, ri = 58;
  let a = -Math.PI / 2;
  const paths = datos.map((d, i) => {
    const ang = (d.valor / total) * Math.PI * 2;
    if (ang <= 0) return null;
    const a1 = a + ang;
    const big = ang > Math.PI ? 1 : 0;
    const p0 = polar(cx, cy, R, a), p1 = polar(cx, cy, R, a1);
    const p2 = polar(cx, cy, ri, a1), p3 = polar(cx, cy, ri, a);
    const d2 = `M${p0}A${R},${R} 0 ${big} 1 ${p1}L${p2}A${ri},${ri} 0 ${big} 0 ${p3}Z`;
    a = a1;
    return <path key={i} d={d2} fill={PALETA[i % PALETA.length]} />;
  });

  return (
    <>
      <div className="grafico">
        <svg viewBox="0 0 200 200" role="img">
          {paths}
          <text x="100" y="96" textAnchor="middle" fontSize="19" fontWeight="600" fill="#16211E">{usd(total)}</text>
          <text x="100" y="114" textAnchor="middle" fontSize="10" fill="#6B7A76">ejecutado</text>
        </svg>
      </div>
      <div className="leyenda" style={{ marginTop: 12 }}>
        {datos.map((d, i) => (
          <span key={i}>
            <b style={{ background: PALETA[i % PALETA.length] }} />
            {d.nombre} · {Math.round((d.valor / total) * 100)}%
          </span>
        ))}
      </div>
    </>
  );
}

export function Curva({ puntos, meta }: { puntos: { mes: string; acum: number }[]; meta: number }) {
  if (!puntos.length) return <div className="vacio">Sin movimientos todavía.</div>;
  const W = 320, H = 170, ml = 44, mr = 8, mt = 12, mb = 24;
  const maxY = Math.max(meta || 0, puntos[puntos.length - 1].acum) * 1.08 || 1;
  const n = puntos.length;
  const px = (i: number) => ml + (n === 1 ? (W - ml - mr) / 2 : (i / (n - 1)) * (W - ml - mr));
  const py = (v: number) => mt + (1 - v / maxY) * (H - mt - mb);

  let linea = '', area = `M${px(0)},${py(0)}`;
  puntos.forEach((p, i) => {
    linea += (i ? 'L' : 'M') + px(i) + ',' + py(p.acum);
    area += `L${px(i)},${py(p.acum)}`;
  });
  area += `L${px(n - 1)},${py(0)}Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img">
      {[0, 0.5, 1].map((f, i) => {
        const y = py(maxY * f);
        return (
          <g key={i}>
            <line x1={ml} y1={y} x2={W - mr} y2={y} stroke="#E8ECEB" />
            <text x={ml - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#6B7A76">
              {Math.round((maxY * f) / 1000)}k
            </text>
          </g>
        );
      })}
      {meta > 0 && (
        <g>
          <line x1={ml} y1={py(meta)} x2={W - mr} y2={py(meta)} stroke="#A32B21" strokeDasharray="4 3" />
          <text x={W - mr} y={py(meta) - 4} textAnchor="end" fontSize="9" fill="#A32B21">presupuesto</text>
        </g>
      )}
      <path d={area} fill="#0F6E5C" opacity=".10" />
      <path d={linea} fill="none" stroke="#0F6E5C" strokeWidth="2" />
      {puntos.map((p, i) => <circle key={i} cx={px(i)} cy={py(p.acum)} r="2.6" fill="#0F6E5C" />)}
      {puntos.map((p, i) =>
        n > 6 && i % Math.ceil(n / 5) !== 0 && i !== n - 1 ? null : (
          <text key={'t' + i} x={px(i)} y={H - 8} textAnchor="middle" fontSize="9" fill="#6B7A76">
            {mesCorto(p.mes)}
          </text>
        )
      )}
    </svg>
  );
}

export function Dispersion({ puntos }: { puntos: { fecha: string; tc: number }[] }) {
  if (puntos.length < 2) return null;
  const W = 320, H = 110, ml = 36, mr = 8, mt = 10, mb = 20;
  const ts = puntos.map((p) => new Date(p.fecha).getTime());
  const t0 = Math.min(...ts), t1 = Math.max(...ts);
  const vs = puntos.map((p) => p.tc);
  const min = Math.min(...vs) * 0.998, max = Math.max(...vs) * 1.002;
  const px = (t: number) => ml + ((t - t0) / (t1 - t0 || 1)) * (W - ml - mr);
  const py = (v: number) => mt + (1 - (v - min) / (max - min || 1)) * (H - mt - mb);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img">
      {[min, (min + max) / 2, max].map((v, i) => (
        <g key={i}>
          <line x1={ml} y1={py(v)} x2={W - mr} y2={py(v)} stroke="#E8ECEB" />
          <text x={ml - 5} y={py(v) + 3} textAnchor="end" fontSize="8" fill="#6B7A76">{Math.round(v)}</text>
        </g>
      ))}
      {puntos.map((p, i) => (
        <circle key={i} cx={px(ts[i])} cy={py(p.tc)} r="3" fill="#0F6E5C" opacity=".8" />
      ))}
    </svg>
  );
}

export function Anillo({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  const r = 40, c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(valor, 100) / 100);
  const color = valor >= 80 ? '#0F6E5C' : valor >= 50 ? '#C9A227' : '#A32B21';
  return (
    <>
      <svg viewBox="0 0 100 100" style={{ maxWidth: 96, margin: '0 auto' }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#EEF1F0" strokeWidth="10" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c.toFixed(1)} strokeDashoffset={off.toFixed(1)}
          transform="rotate(-90 50 50)"
        />
        <text x="50" y="54" textAnchor="middle" fontSize="20" fontWeight="600" fill="#16211E">
          {Math.round(valor)}%
        </text>
      </svg>
      <div className="hint" style={{ textAlign: 'center' }}>{etiqueta}</div>
    </>
  );
}
