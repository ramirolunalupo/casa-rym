'use client';

import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useDatos, nombreRubro } from './Datos';
import { Modal, SelectorMoneda, useAviso } from './Ui';
import { Gasto, Moneda } from '@/lib/tipos';
import { ars, usd, fechaCorta, hoy, recortar } from '@/lib/formato';

export default function Gastos() {
  const { rubros, config, gastos, fx, recargar } = useDatos();
  const avisar = useAviso();

  const activos = rubros.filter((r) => r.activo);
  const [fecha, setFecha] = useState(hoy());
  const [rubroId, setRubroId] = useState('');
  const [tipo, setTipo] = useState(config.tipos[0] || 'Materiales');
  const [moneda, setMoneda] = useState<Moneda>('ARS');
  const [monto, setMonto] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [detalle, setDetalle] = useState('');
  const [medio, setMedio] = useState(config.medios_pago[0] || 'Transferencia');
  const [fxOp, setFxOp] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [filtroRubro, setFiltroRubro] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState<Gasto | null>(null);

  // operación de cambio sugerida: la más cercana en fecha
  const fxSugerido = useMemo(() => {
    if (!fx.length) return null;
    const t = new Date(fecha).getTime();
    return [...fx].sort(
      (a, b) =>
        Math.abs(new Date(a.fecha).getTime() - t) - Math.abs(new Date(b.fecha).getTime() - t)
    )[0];
  }, [fx, fecha]);

  const fxElegido = fx.find((f) => f.id_operacion === fxOp) || fxSugerido;
  const tc = fxElegido?.tc || 0;
  const montoNum = parseFloat(monto) || 0;

  const guardar = async () => {
    if (!rubroId) { avisar('Elegí un rubro.', true); return; }
    if (montoNum <= 0) { avisar('El monto tiene que ser mayor a cero.', true); return; }
    if (!tc) { avisar('No hay ninguna operación de cambio para tomar la tasa.', true); return; }

    setGuardando(true);
    const { error } = await supabase.from('obra_gastos').insert({
      fecha, rubro_id: Number(rubroId), tipo, proveedor: proveedor || null,
      detalle: detalle || null, moneda, monto: montoNum, tc,
      fx_op: fxElegido?.id_operacion || null, medio_pago: medio,
    });
    setGuardando(false);
    if (error) { avisar(error.message, true); return; }

    avisar(`Gasto guardado: ${ars(moneda === 'ARS' ? montoNum : montoNum * tc)} / ${usd(moneda === 'USD' ? montoNum : montoNum / tc)}`);
    setMonto(''); setDetalle('');
    await recargar();
  };

  const filtrados = gastos.filter((g) => {
    if (filtroRubro && String(g.rubro_id) !== filtroRubro) return false;
    if (busqueda) {
      const t = `${g.proveedor || ''} ${g.detalle || ''} ${nombreRubro(rubros, g.rubro_id)}`.toLowerCase();
      if (!t.includes(busqueda.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <section className="pantalla">
      <div className="card">
        <h2>Nuevo gasto</h2>
        <div className="fila">
          <div>
            <label>Fecha de pago</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div>
            <label>Operación de cambio</label>
            <select value={fxElegido?.id_operacion || ''} onChange={(e) => setFxOp(e.target.value)}>
              {fx.map((f) => (
                <option key={f.id_operacion} value={f.id_operacion}>
                  {fechaCorta(f.fecha)} · {f.tc}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label>Rubro</label>
        <select value={rubroId} onChange={(e) => setRubroId(e.target.value)}>
          <option value="">— elegir —</option>
          {activos.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
        </select>

        <label>Tipo</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {config.tipos.map((t) => <option key={t}>{t}</option>)}
        </select>

        <label>Moneda</label>
        <SelectorMoneda valor={moneda} onChange={setMoneda} />

        <label>Monto</label>
        <input
          type="number" inputMode="decimal" step="0.01" placeholder="0"
          value={monto} onChange={(e) => setMonto(e.target.value)}
        />
        {montoNum > 0 && tc > 0 && (
          <div className="conv">
            {moneda === 'ARS'
              ? `${ars(montoNum)} equivalen a ${usd(montoNum / tc)} al cambio ${ars(tc)}`
              : `${usd(montoNum)} equivalen a ${ars(montoNum * tc)} al cambio ${ars(tc)}`}
          </div>
        )}

        <div className="fila">
          <div>
            <label>Proveedor</label>
            <input type="text" value={proveedor} placeholder="Quién cobró"
              onChange={(e) => setProveedor(e.target.value)} />
          </div>
          <div>
            <label>Medio de pago</label>
            <select value={medio} onChange={(e) => setMedio(e.target.value)}>
              {config.medios_pago.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <label>Detalle</label>
        <textarea value={detalle} placeholder="Qué se pagó" onChange={(e) => setDetalle(e.target.value)} />

        <button className="btn" onClick={guardar} disabled={guardando}>Guardar gasto</button>
      </div>

      <div className="card">
        <h2>Movimientos <span className="sub">tocá uno para editarlo</span></h2>
        <div className="fila">
          <div>
            <select value={filtroRubro} onChange={(e) => setFiltroRubro(e.target.value)}>
              <option value="">Todos los rubros</option>
              {rubros.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          </div>
          <div>
            <input type="text" placeholder="Buscar proveedor o detalle"
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          {!filtrados.length ? (
            <div className="vacio">No hay movimientos con ese filtro.</div>
          ) : (
            filtrados.slice(0, 100).map((g) => (
              <button className="item" key={g.id} onClick={() => setEditando(g)}>
                <div>
                  <div className="t">
                    {nombreRubro(rubros, g.rubro_id)} · <span className="d">{g.tipo}</span>
                  </div>
                  <div className="d">
                    {fechaCorta(g.fecha)}
                    {g.proveedor ? ` · ${g.proveedor}` : ''}
                    {g.detalle ? ` · ${recortar(g.detalle, 60)}` : ''}
                    {g.luca_id ? ' ' : ''}
                    {g.luca_id ? <span className="chip gris">LUCA</span> : null}
                  </div>
                </div>
                <div className="m">
                  {g.moneda === 'USD' ? usd(g.monto) : ars(g.monto)}
                  <div className="d">{g.moneda === 'USD' ? ars(g.monto_ars) : usd(g.monto_usd)}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {editando && (
        <EditarGasto
          gasto={editando}
          onCerrar={() => setEditando(null)}
          onListo={async (msg) => { setEditando(null); avisar(msg); await recargar(); }}
          onError={(m) => avisar(m, true)}
        />
      )}
    </section>
  );
}

function EditarGasto({
  gasto, onCerrar, onListo, onError,
}: {
  gasto: Gasto;
  onCerrar: () => void;
  onListo: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const { rubros, config, fx } = useDatos();
  const [f, setF] = useState({
    fecha: gasto.fecha,
    rubro_id: gasto.rubro_id ? String(gasto.rubro_id) : '',
    tipo: gasto.tipo,
    moneda: gasto.moneda as Moneda,
    monto: String(gasto.monto),
    proveedor: gasto.proveedor || '',
    detalle: gasto.detalle || '',
    medio_pago: gasto.medio_pago || '',
    fx_op: gasto.fx_op || '',
    tc: String(gasto.tc),
  });
  const [ocupado, setOcupado] = useState(false);

  const guardar = async () => {
    setOcupado(true);
    const { error } = await supabase.from('obra_gastos').update({
      fecha: f.fecha,
      rubro_id: f.rubro_id ? Number(f.rubro_id) : null,
      tipo: f.tipo,
      moneda: f.moneda,
      monto: parseFloat(f.monto) || 0,
      tc: parseFloat(f.tc) || gasto.tc,
      fx_op: f.fx_op || null,
      proveedor: f.proveedor || null,
      detalle: f.detalle || null,
      medio_pago: f.medio_pago || null,
      updated_at: new Date().toISOString(),
    }).eq('id', gasto.id);
    setOcupado(false);
    if (error) { onError(error.message); return; }
    onListo('Gasto actualizado');
  };

  const borrar = async () => {
    if (!confirm('¿Borrar este gasto?')) return;
    setOcupado(true);
    const { error } = await supabase.from('obra_gastos').delete().eq('id', gasto.id);
    setOcupado(false);
    if (error) { onError(error.message); return; }
    onListo('Gasto borrado');
  };

  return (
    <Modal titulo="Editar gasto" onCerrar={onCerrar} onGuardar={guardar} onBorrar={borrar} guardando={ocupado}>
      <div className="fila">
        <div>
          <label>Fecha</label>
          <input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} />
        </div>
        <div>
          <label>Operación de cambio</label>
          <select
            value={f.fx_op}
            onChange={(e) => {
              const op = fx.find((x) => x.id_operacion === e.target.value);
              setF({ ...f, fx_op: e.target.value, tc: op ? String(op.tc) : f.tc });
            }}
          >
            <option value="">— tasa manual —</option>
            {fx.map((x) => (
              <option key={x.id_operacion} value={x.id_operacion}>
                {fechaCorta(x.fecha)} · {x.tc}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label>Rubro</label>
      <select value={f.rubro_id} onChange={(e) => setF({ ...f, rubro_id: e.target.value })}>
        <option value="">— sin asignar —</option>
        {rubros.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
      </select>

      <label>Tipo</label>
      <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
        {config.tipos.map((t) => <option key={t}>{t}</option>)}
      </select>

      <div className="fila">
        <div>
          <label>Moneda</label>
          <select value={f.moneda} onChange={(e) => setF({ ...f, moneda: e.target.value as Moneda })}>
            <option>ARS</option><option>USD</option>
          </select>
        </div>
        <div>
          <label>Monto</label>
          <input type="number" step="0.01" value={f.monto} onChange={(e) => setF({ ...f, monto: e.target.value })} />
        </div>
      </div>

      <div className="fila">
        <div>
          <label>Tipo de cambio</label>
          <input type="number" step="0.01" value={f.tc} onChange={(e) => setF({ ...f, tc: e.target.value })} />
        </div>
        <div>
          <label>Medio de pago</label>
          <select value={f.medio_pago} onChange={(e) => setF({ ...f, medio_pago: e.target.value })}>
            <option value="">—</option>
            {config.medios_pago.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <label>Proveedor</label>
      <input type="text" value={f.proveedor} onChange={(e) => setF({ ...f, proveedor: e.target.value })} />

      <label>Detalle</label>
      <input type="text" value={f.detalle} onChange={(e) => setF({ ...f, detalle: e.target.value })} />
    </Modal>
  );
}
