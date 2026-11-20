'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useDatos, nombreRubro } from './Datos';
import { Modal, SelectorMoneda, useAviso } from './Ui';
import { LineaPresupuesto, Moneda } from '@/lib/tipos';
import { ars, usd } from '@/lib/formato';

const ESTADOS = ['Estimado', 'Cotizado', 'Cerrado'] as const;

export default function Presupuesto() {
  const { rubros, config, presupuesto, fx, recargar } = useDatos();
  const avisar = useAviso();
  const tc = fx.length ? fx[fx.length - 1].tc : 0;

  const [rubroId, setRubroId] = useState('');
  const [tipo, setTipo] = useState(config.tipos[0] || 'Materiales');
  const [moneda, setMoneda] = useState<Moneda>('USD');
  const [monto, setMonto] = useState('');
  const [estado, setEstado] = useState<(typeof ESTADOS)[number]>('Estimado');
  const [notas, setNotas] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [editando, setEditando] = useState<LineaPresupuesto | null>(null);

  const guardar = async () => {
    if (!rubroId) { avisar('Elegí un rubro.', true); return; }
    const m = parseFloat(monto) || 0;
    if (m <= 0) { avisar('El monto tiene que ser mayor a cero.', true); return; }

    setOcupado(true);
    const { error } = await supabase.from('obra_presupuesto').upsert(
      { rubro_id: Number(rubroId), tipo, moneda, monto: m, estado, notas: notas || null,
        updated_at: new Date().toISOString() },
      { onConflict: 'rubro_id,tipo' }
    );
    setOcupado(false);
    if (error) { avisar(error.message, true); return; }
    avisar('Línea guardada');
    setMonto(''); setNotas('');
    await recargar();
  };

  const ordenadas = [...presupuesto].sort((a, b) =>
    nombreRubro(rubros, a.rubro_id).localeCompare(nombreRubro(rubros, b.rubro_id)));

  return (
    <section className="pantalla">
      <div className="card">
        <h2>Cargar línea</h2>
        <div className="hint">Una línea por rubro y tipo. Si repetís la combinación, se actualiza.</div>

        <label>Rubro</label>
        <select value={rubroId} onChange={(e) => setRubroId(e.target.value)}>
          <option value="">— elegir —</option>
          {rubros.filter((r) => r.activo).map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
        </select>

        <label>Tipo</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {config.tipos.map((t) => <option key={t}>{t}</option>)}
        </select>

        <label>Moneda</label>
        <SelectorMoneda valor={moneda} onChange={setMoneda} etiquetas={['Pesos', 'Dólares']} />

        <label>Monto estimado</label>
        <input type="number" step="0.01" placeholder="0" value={monto}
          onChange={(e) => setMonto(e.target.value)} />

        <label>Qué tan firme es</label>
        <select value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)}>
          {ESTADOS.map((x) => <option key={x}>{x}</option>)}
        </select>

        <label>Notas</label>
        <input type="text" placeholder="De dónde sale el número" value={notas}
          onChange={(e) => setNotas(e.target.value)} />

        <button className="btn" onClick={guardar} disabled={ocupado}>Guardar línea</button>
      </div>

      <div className="card">
        <h2>Presupuesto cargado <span className="sub">tocá una línea para editarla</span></h2>
        {!ordenadas.length ? (
          <div className="vacio">Sin líneas cargadas. Empezá por el constructor y la arquitecta.</div>
        ) : (
          ordenadas.map((p) => {
            const cls = p.estado === 'Cerrado' ? '' : p.estado === 'Cotizado' ? 'pronto' : 'gris';
            return (
              <button className="item" key={p.id} onClick={() => setEditando(p)}>
                <div>
                  <div className="t">
                    {nombreRubro(rubros, p.rubro_id)} · <span className="d">{p.tipo}</span>{' '}
                    <span className={'chip ' + cls}>{p.estado}</span>
                  </div>
                  <div className="d">{p.notas || ''}</div>
                </div>
                <div className="m">
                  {p.moneda === 'USD' ? usd(p.monto) : ars(p.monto)}
                  <div className="d">
                    {p.moneda === 'USD' ? ars(p.monto * tc) : usd(tc ? p.monto / tc : 0)}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {editando && (
        <EditarLinea
          linea={editando}
          onCerrar={() => setEditando(null)}
          onListo={async (m) => { setEditando(null); avisar(m); await recargar(); }}
          onError={(m) => avisar(m, true)}
        />
      )}
    </section>
  );
}

function EditarLinea({
  linea, onCerrar, onListo, onError,
}: {
  linea: LineaPresupuesto;
  onCerrar: () => void;
  onListo: (m: string) => void;
  onError: (m: string) => void;
}) {
  const { rubros, config } = useDatos();
  const [f, setF] = useState({
    rubro_id: String(linea.rubro_id),
    tipo: linea.tipo,
    moneda: linea.moneda as Moneda,
    monto: String(linea.monto),
    estado: linea.estado,
    notas: linea.notas || '',
  });
  const [ocupado, setOcupado] = useState(false);

  const guardar = async () => {
    setOcupado(true);
    const { error } = await supabase.from('obra_presupuesto').update({
      rubro_id: Number(f.rubro_id), tipo: f.tipo, moneda: f.moneda,
      monto: parseFloat(f.monto) || 0, estado: f.estado, notas: f.notas || null,
      updated_at: new Date().toISOString(),
    }).eq('id', linea.id);
    setOcupado(false);
    if (error) { onError(error.message); return; }
    onListo('Línea actualizada');
  };

  const borrar = async () => {
    if (!confirm('¿Borrar esta línea?')) return;
    setOcupado(true);
    const { error } = await supabase.from('obra_presupuesto').delete().eq('id', linea.id);
    setOcupado(false);
    if (error) { onError(error.message); return; }
    onListo('Línea borrada');
  };

  return (
    <Modal titulo="Editar línea" onCerrar={onCerrar} onGuardar={guardar} onBorrar={borrar} guardando={ocupado}>
      <label>Rubro</label>
      <select value={f.rubro_id} onChange={(e) => setF({ ...f, rubro_id: e.target.value })}>
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
            <option>USD</option><option>ARS</option>
          </select>
        </div>
        <div>
          <label>Monto</label>
          <input type="number" step="0.01" value={f.monto} onChange={(e) => setF({ ...f, monto: e.target.value })} />
        </div>
      </div>

      <label>Qué tan firme es</label>
      <select value={f.estado} onChange={(e) => setF({ ...f, estado: e.target.value as LineaPresupuesto['estado'] })}>
        {ESTADOS.map((x) => <option key={x}>{x}</option>)}
      </select>

      <label>Notas</label>
      <input type="text" value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} />
    </Modal>
  );
}
