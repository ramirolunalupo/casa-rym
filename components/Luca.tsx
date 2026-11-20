'use client';

import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useDatos } from './Datos';
import { useAviso } from './Ui';
import { Pendiente } from '@/lib/tipos';
import { ars, usd, fechaCorta, recortar } from '@/lib/formato';

type Item = Pendiente & { sel: boolean };

export default function Luca() {
  const { rubros, reglas, config, fx, recargar } = useDatos();
  const avisar = useAviso();
  const [items, setItems] = useState<Item[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [masRubro, setMasRubro] = useState('');
  const [masTipo, setMasTipo] = useState('');

  const buscar = useCallback(async () => {
    setBuscando(true);
    const { error: e1 } = await supabase.rpc('obra_sync_fx');
    if (e1) { avisar(e1.message, true); setBuscando(false); return; }

    const { data, error } = await supabase
      .from('obra_v_pendientes')
      .select('*')
      .order('fecha');

    setBuscando(false);
    if (error) { avisar(error.message, true); return; }

    const lista = (data || []) as Pendiente[];
    setItems(lista.map((p) => ({ ...p, sel: !!p.rubro_id })));
    await recargar();
    if (!lista.length) avisar('No hay movimientos nuevos.');
  }, [avisar, recargar]);

  const cambiar = (i: number, cambios: Partial<Item>) =>
    setItems((prev) => prev && prev.map((x, j) => (j === i ? { ...x, ...cambios } : x)));

  const seleccionar = (modo: 'todos' | 'ninguno' | 'clasificados' | 'sin') =>
    setItems((prev) => prev && prev.map((x) => ({
      ...x,
      sel: modo === 'todos' ? true
        : modo === 'ninguno' ? false
        : modo === 'clasificados' ? !!x.rubro_id
        : !x.rubro_id,
    })));

  const aplicarMasivo = () => {
    if (!masRubro && !masTipo) { avisar('Elegí un rubro o un tipo.', true); return; }
    let n = 0;
    setItems((prev) => prev && prev.map((x) => {
      if (!x.sel) return x;
      n++;
      return {
        ...x,
        rubro_id: masRubro ? Number(masRubro) : x.rubro_id,
        tipo: masTipo || x.tipo,
      };
    }));
    avisar(`${n} movimientos actualizados`);
  };

  const listos = (items || []).filter((x) => x.sel && x.rubro_id);
  const totalListos = listos.reduce(
    (a, x) => a + (x.moneda === 'USD' ? x.monto : x.tc ? x.monto / x.tc : 0), 0);

  const importar = async () => {
    if (!listos.length) return;
    setImportando(true);
    const filas = listos.map((x) => ({
      fecha: x.fecha,
      rubro_id: x.rubro_id,
      tipo: x.tipo || 'Otros',
      proveedor: x.palabra
        ? x.palabra.replace(/\b\w/g, (c) => c.toUpperCase())
        : /^(caja|transito|banco rami|billetera rami|cocos rami)/i.test(x.contraparte)
          ? null : x.contraparte,
      detalle: x.detalle || null,
      moneda: x.moneda,
      monto: x.monto,
      tc: x.tc,
      fx_op: x.fx_op,
      medio_pago: 'LUCA',
      luca_id: x.luca_id,
    }));

    const { error } = await supabase.from('obra_gastos').insert(filas);
    setImportando(false);
    if (error) { avisar(error.message, true); return; }

    avisar(`Importé ${filas.length} movimientos por ${usd(totalListos)}`);
    setItems((prev) => prev && prev.filter((x) => !(x.sel && x.rubro_id)));
    await recargar();
  };

  const guardarRegla = async (palabra: string, rubroId: number, tipo: string) => {
    const limpia = palabra.trim().toLowerCase();
    if (!limpia || !rubroId) { avisar('Falta la palabra o el rubro.', true); return; }
    const { error } = await supabase
      .from('obra_reglas')
      .upsert({ palabra: limpia, rubro_id: rubroId, tipo }, { onConflict: 'palabra' });
    if (error) { avisar(error.message, true); return; }
    avisar('Regla guardada');
    await recargar();
  };

  const borrarRegla = async (id: number) => {
    const { error } = await supabase.from('obra_reglas').delete().eq('id', id);
    if (error) { avisar(error.message, true); return; }
    avisar('Regla borrada');
    await recargar();
  };

  return (
    <section className="pantalla">
      <div className="card">
        <h2>
          Movimientos de Obra Rami
          <span className="sub">{fx.length} operaciones de cambio sincronizadas</span>
        </h2>
        <div className="hint">
          Trae los pagos cargados en LUCA, sugiere el rubro y le asigna a cada uno la tasa de la
          operación de cambio que le corresponde. Lo ya importado no vuelve a aparecer.
        </div>
        <button className="btn" onClick={buscar} disabled={buscando}>
          {buscando ? 'Consultando LUCA…' : 'Buscar movimientos nuevos'}
        </button>
      </div>

      {items && items.length > 0 && (
        <div className="card">
          <h2>
            Para importar
            <span className="sub">
              {items.length} pendientes · {items.filter((x) => !x.rubro_id).length} sin clasificar
            </span>
          </h2>

          <div className="barra-acciones">
            <button className="btn sec mini" onClick={() => seleccionar('todos')}>Todos</button>
            <button className="btn sec mini" onClick={() => seleccionar('clasificados')}>Solo clasificados</button>
            <button className="btn sec mini" onClick={() => seleccionar('sin')}>Solo sin clasificar</button>
            <button className="btn sec mini" onClick={() => seleccionar('ninguno')}>Ninguno</button>
          </div>

          <div className="fila">
            <div>
              <select value={masRubro} onChange={(e) => setMasRubro(e.target.value)}>
                <option value="">— elegir rubro —</option>
                {rubros.filter((r) => r.activo).map((r) => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <select value={masTipo} onChange={(e) => setMasTipo(e.target.value)}>
                <option value="">— elegir tipo —</option>
                {config.tipos.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <button className="btn sec" style={{ marginTop: 8 }} onClick={aplicarMasivo}>
            Aplicar a los seleccionados
          </button>

          <div style={{ marginTop: 14 }}>
            {items.map((m, i) => (
              <div className={'mov' + (m.rubro_id ? '' : ' sin')} key={m.luca_id}>
                <div className="mov-head">
                  <input
                    type="checkbox" checked={m.sel}
                    onChange={(e) => cambiar(i, { sel: e.target.checked })}
                  />
                  <div className="mov-tit">
                    <div className="t">
                      {fechaCorta(m.fecha)} ·{' '}
                      {m.palabra
                        ? m.palabra.replace(/\b\w/g, (c) => c.toUpperCase())
                        : m.contraparte || 'sin proveedor'}
                    </div>
                    <div className="d">{recortar(m.detalle, 90) || 'sin detalle'}</div>
                  </div>
                  <div className="mov-monto">
                    {m.moneda === 'USD' ? usd(m.monto) : ars(m.monto)}
                    <div className="d">
                      {m.tc
                        ? m.moneda === 'USD' ? ars(m.monto * m.tc) : usd(m.monto / m.tc)
                        : 'sin tasa'}
                    </div>
                  </div>
                </div>
                <div className="mov-sel">
                  <select
                    value={m.rubro_id ?? ''}
                    onChange={(e) => cambiar(i, { rubro_id: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">— sin asignar —</option>
                    {rubros.filter((r) => r.activo).map((r) => (
                      <option key={r.id} value={r.id}>{r.nombre}</option>
                    ))}
                  </select>
                  <select value={m.tipo || 'Otros'} onChange={(e) => cambiar(i, { tipo: e.target.value })}>
                    {config.tipos.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <select
                    value={m.fx_op || ''}
                    onChange={(e) => {
                      const op = fx.find((f) => f.id_operacion === e.target.value);
                      cambiar(i, { fx_op: op?.id_operacion ?? null, tc: op?.tc ?? m.tc });
                    }}
                    title="Operación de cambio"
                  >
                    {fx.map((f) => (
                      <option key={f.id_operacion} value={f.id_operacion}>
                        {fechaCorta(f.fecha)} · {f.tc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <button className="btn" onClick={importar} disabled={!listos.length || importando}>
            {importando
              ? 'Importando…'
              : listos.length
                ? `Importar ${listos.length} movimientos · ${usd(totalListos)}`
                : 'Importar seleccionados'}
          </button>
        </div>
      )}

      <Reglas
        rubros={rubros.filter((r) => r.activo)}
        reglas={reglas}
        tipos={config.tipos}
        onGuardar={guardarRegla}
        onBorrar={borrarRegla}
      />
    </section>
  );
}

function Reglas({
  rubros, reglas, tipos, onGuardar, onBorrar,
}: {
  rubros: { id: number; nombre: string }[];
  reglas: { id: number; palabra: string; rubro_id: number; tipo: string }[];
  tipos: string[];
  onGuardar: (palabra: string, rubroId: number, tipo: string) => void;
  onBorrar: (id: number) => void;
}) {
  const [palabra, setPalabra] = useState('');
  const [rubroId, setRubroId] = useState('');
  const [tipo, setTipo] = useState(tipos[0] || 'Materiales');

  return (
    <div className="card">
      <h2>Reglas de clasificación <span className="sub">palabra clave → rubro</span></h2>
      <div className="hint">
        Se busca dentro del detalle y la contraparte. Gana la palabra más larga que coincida.
      </div>
      <input
        type="text" value={palabra} placeholder="Ej. castellani"
        onChange={(e) => setPalabra(e.target.value)} style={{ marginTop: 10 }}
      />
      <div className="fila" style={{ marginTop: 8 }}>
        <div>
          <select value={rubroId} onChange={(e) => setRubroId(e.target.value)}>
            <option value="">— rubro —</option>
            {rubros.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </div>
        <div>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {tipos.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <button
        className="btn sec"
        onClick={() => { onGuardar(palabra, Number(rubroId), tipo); setPalabra(''); }}
      >
        Guardar regla
      </button>

      <div style={{ marginTop: 12 }}>
        {!reglas.length ? (
          <div className="vacio">Sin reglas cargadas.</div>
        ) : (
          <table>
            <tbody>
              <tr><th>Palabra</th><th>Rubro</th><th /></tr>
              {[...reglas].sort((a, b) => a.palabra.localeCompare(b.palabra)).map((r) => (
                <tr key={r.id}>
                  <td>{r.palabra}</td>
                  <td>
                    {rubros.find((x) => x.id === r.rubro_id)?.nombre || '—'}
                    <div className="d">{r.tipo}</div>
                  </td>
                  <td className="n">
                    <button className="btn sec mini" onClick={() => onBorrar(r.id)}>Quitar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
