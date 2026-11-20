'use client';

import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useDatos, nombreRubro } from './Datos';
import { Modal, SelectorMoneda, useAviso } from './Ui';
import { Cuota, Moneda } from '@/lib/tipos';
import { ars, usd, fechaCorta, hoy, sumarMeses } from '@/lib/formato';

export default function Cuotas() {
  const { rubros, config, cuotas, fx, recargar } = useDatos();
  const avisar = useAviso();
  const pendientes = cuotas.filter((c) => c.estado === 'Pendiente');
  const [pagando, setPagando] = useState<Cuota | null>(null);

  const [f, setF] = useState({
    rubro_id: '', tipo: config.tipos[0] || 'Materiales', proveedor: '',
    moneda: 'ARS' as Moneda, total: '', porCuota: '', cantidad: '6', cada: '1',
    primer: hoy(), detalle: '',
  });
  const [ocupado, setOcupado] = useState(false);

  const crearPlan = async () => {
    const cant = parseInt(f.cantidad, 10);
    if (!f.rubro_id) { avisar('Elegí un rubro.', true); return; }
    if (!cant || cant < 1) { avisar('Indicá cuántas cuotas son.', true); return; }

    let porCuota = parseFloat(f.porCuota) || 0;
    if (porCuota <= 0) {
      const tot = parseFloat(f.total) || 0;
      if (tot <= 0) { avisar('Cargá el monto total o el de cada cuota.', true); return; }
      porCuota = Math.round((tot / cant) * 100) / 100;
    }

    const planId = `PL${Date.now()}`;
    const cada = parseInt(f.cada, 10) || 1;
    const filas = Array.from({ length: cant }, (_, i) => ({
      plan_id: planId, rubro_id: Number(f.rubro_id), tipo: f.tipo,
      proveedor: f.proveedor || null, detalle: f.detalle || null,
      moneda: f.moneda, monto: porCuota, nro: i + 1, total: cant,
      vencimiento: sumarMeses(f.primer, i * cada),
    }));

    setOcupado(true);
    const { error } = await supabase.from('obra_cuotas').insert(filas);
    setOcupado(false);
    if (error) { avisar(error.message, true); return; }
    avisar(`Plan creado: ${cant} cuotas`);
    setF({ ...f, total: '', porCuota: '', detalle: '' });
    await recargar();
  };

  return (
    <section className="pantalla">
      <div className="card">
        <h2>Cuotas por vencer</h2>
        <div className="hint">
          Al registrar el pago elegís la operación de cambio y la cuota pasa a la base de gastos.
        </div>
        <div style={{ marginTop: 10 }}>
          {!pendientes.length ? (
            <div className="vacio">No hay cuotas pendientes.</div>
          ) : (
            pendientes.map((c) => {
              const tarde = c.vencimiento < hoy();
              return (
                <button className="item" key={c.id} onClick={() => setPagando(c)}>
                  <div>
                    <div className="t">
                      {c.proveedor || nombreRubro(rubros, c.rubro_id)}{' '}
                      <span className={'chip ' + (tarde ? 'tarde' : 'pronto')}>
                        {tarde ? 'vencida ' : 'vence '}{fechaCorta(c.vencimiento)}
                      </span>
                    </div>
                    <div className="d">
                      {nombreRubro(rubros, c.rubro_id)} · cuota {c.nro}/{c.total}
                      {c.detalle ? ` · ${c.detalle}` : ''}
                    </div>
                  </div>
                  <div className="m">
                    {c.moneda === 'USD' ? usd(c.monto) : ars(c.monto)}
                    <div className="d">registrar pago</div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="card">
        <h2>Nuevo plan de pagos</h2>

        <label>Rubro</label>
        <select value={f.rubro_id} onChange={(e) => setF({ ...f, rubro_id: e.target.value })}>
          <option value="">— elegir —</option>
          {rubros.filter((r) => r.activo).map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
        </select>

        <label>Tipo</label>
        <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
          {config.tipos.map((t) => <option key={t}>{t}</option>)}
        </select>

        <label>Proveedor</label>
        <input type="text" value={f.proveedor} placeholder="Constructor, arquitecta, etc."
          onChange={(e) => setF({ ...f, proveedor: e.target.value })} />

        <label>Moneda de las cuotas</label>
        <SelectorMoneda valor={f.moneda} onChange={(m) => setF({ ...f, moneda: m })} />

        <div className="fila">
          <div>
            <label>Monto total</label>
            <input type="number" step="0.01" value={f.total} onChange={(e) => setF({ ...f, total: e.target.value })} />
          </div>
          <div>
            <label>o monto por cuota</label>
            <input type="number" step="0.01" value={f.porCuota} onChange={(e) => setF({ ...f, porCuota: e.target.value })} />
          </div>
        </div>

        <div className="fila">
          <div>
            <label>Cantidad de cuotas</label>
            <input type="number" min="1" value={f.cantidad} onChange={(e) => setF({ ...f, cantidad: e.target.value })} />
          </div>
          <div>
            <label>Cada cuántos meses</label>
            <input type="number" min="1" value={f.cada} onChange={(e) => setF({ ...f, cada: e.target.value })} />
          </div>
        </div>

        <label>Primer vencimiento</label>
        <input type="date" value={f.primer} onChange={(e) => setF({ ...f, primer: e.target.value })} />

        <label>Detalle</label>
        <input type="text" value={f.detalle} placeholder="Ej. Anticipo obra gris"
          onChange={(e) => setF({ ...f, detalle: e.target.value })} />

        <button className="btn" onClick={crearPlan} disabled={ocupado}>Crear plan</button>
      </div>

      {pagando && (
        <PagarCuota
          cuota={pagando}
          onCerrar={() => setPagando(null)}
          onListo={async (m) => { setPagando(null); avisar(m); await recargar(); }}
          onError={(m) => avisar(m, true)}
        />
      )}
    </section>
  );
}

function PagarCuota({
  cuota, onCerrar, onListo, onError,
}: {
  cuota: Cuota;
  onCerrar: () => void;
  onListo: (m: string) => void;
  onError: (m: string) => void;
}) {
  const { fx, config, rubros } = useDatos();
  const sugerido = useMemo(() => {
    if (!fx.length) return null;
    const t = new Date(cuota.vencimiento).getTime();
    return [...fx].sort(
      (a, b) => Math.abs(new Date(a.fecha).getTime() - t) - Math.abs(new Date(b.fecha).getTime() - t)
    )[0];
  }, [fx, cuota.vencimiento]);

  const [fecha, setFecha] = useState(cuota.vencimiento);
  const [fxOp, setFxOp] = useState(sugerido?.id_operacion || '');
  const [monto, setMonto] = useState(String(cuota.monto));
  const [medio, setMedio] = useState(config.medios_pago[0] || 'Transferencia');
  const [ocupado, setOcupado] = useState(false);

  const op = fx.find((x) => x.id_operacion === fxOp) || sugerido;

  const guardar = async () => {
    const m = parseFloat(monto) || 0;
    if (m <= 0) { onError('El monto tiene que ser mayor a cero.'); return; }
    if (!op) { onError('No hay operación de cambio disponible.'); return; }

    setOcupado(true);
    const { error: e1 } = await supabase.from('obra_gastos').insert({
      fecha, rubro_id: cuota.rubro_id, tipo: cuota.tipo, proveedor: cuota.proveedor,
      detalle: `${cuota.detalle || nombreRubro(rubros, cuota.rubro_id)} — cuota ${cuota.nro}/${cuota.total}`,
      moneda: cuota.moneda, monto: m, tc: op.tc, fx_op: op.id_operacion,
      medio_pago: medio, cuota_id: cuota.id,
    });
    if (e1) { setOcupado(false); onError(e1.message); return; }

    const { error: e2 } = await supabase.from('obra_cuotas')
      .update({ estado: 'Pagada' }).eq('id', cuota.id);
    setOcupado(false);
    if (e2) { onError(e2.message); return; }
    onListo(`Pago registrado: ${cuota.moneda === 'USD' ? usd(m) : ars(m)}`);
  };

  const borrarPlan = async () => {
    if (!confirm('¿Borrar las cuotas pendientes de este plan?')) return;
    setOcupado(true);
    const { error } = await supabase.from('obra_cuotas').delete()
      .eq('plan_id', cuota.plan_id).eq('estado', 'Pendiente');
    setOcupado(false);
    if (error) { onError(error.message); return; }
    onListo('Cuotas pendientes borradas');
  };

  return (
    <Modal titulo="Registrar pago" onCerrar={onCerrar} onGuardar={guardar} onBorrar={borrarPlan} guardando={ocupado}>
      <div className="hint">
        {nombreRubro(rubros, cuota.rubro_id)} · cuota {cuota.nro}/{cuota.total} ·{' '}
        {cuota.moneda === 'USD' ? usd(cuota.monto) : ars(cuota.monto)}
      </div>

      <div className="fila">
        <div>
          <label>Fecha del pago</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div>
          <label>Operación de cambio</label>
          <select value={op?.id_operacion || ''} onChange={(e) => setFxOp(e.target.value)}>
            {fx.map((x) => (
              <option key={x.id_operacion} value={x.id_operacion}>
                {fechaCorta(x.fecha)} · {x.tc}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="fila">
        <div>
          <label>Monto pagado ({cuota.moneda})</label>
          <input type="number" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} />
        </div>
        <div>
          <label>Medio de pago</label>
          <select value={medio} onChange={(e) => setMedio(e.target.value)}>
            {config.medios_pago.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}
