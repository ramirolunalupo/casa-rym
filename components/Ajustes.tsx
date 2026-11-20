'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useDatos } from './Datos';
import { useAviso } from './Ui';

export default function Ajustes({ email, onSalir }: { email: string; onSalir: () => void }) {
  const { config, rubros, gastos, presupuesto, cuotas, recargar } = useDatos();
  const avisar = useAviso();

  const [proyecto, setProyecto] = useState(config.proyecto);
  const [m2, setM2] = useState(String(config.m2_computados));
  const [cont, setCont] = useState(String(config.contingencia_pct));
  const [nuevoRubro, setNuevoRubro] = useState('');
  const [nuevoAcceso, setNuevoAcceso] = useState('');
  const [acceso, setAcceso] = useState<{ email: string; nombre: string | null }[]>([]);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    setProyecto(config.proyecto);
    setM2(String(config.m2_computados));
    setCont(String(config.contingencia_pct));
  }, [config]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from('obra_acceso').select('email,nombre');
      setAcceso(data || []);
    })();
  }, []);

  const guardarConfig = async () => {
    setOcupado(true);
    const { error } = await supabase.from('obra_config').upsert([
      { key: 'proyecto', value: proyecto },
      { key: 'm2_computados', value: Number(m2) || 0 },
      { key: 'contingencia_pct', value: Number(cont) || 0 },
    ], { onConflict: 'key' });
    setOcupado(false);
    if (error) { avisar(error.message, true); return; }
    avisar('Datos guardados');
    await recargar();
  };

  const usos = (id: number) => ({
    gastos: gastos.filter((g) => g.rubro_id === id).length,
    presupuesto: presupuesto.filter((p) => p.rubro_id === id).length,
    cuotas: cuotas.filter((c) => c.rubro_id === id).length,
  });

  const agregarRubro = async () => {
    const nombre = nuevoRubro.trim();
    if (!nombre) return;
    const { error } = await supabase.from('obra_rubros')
      .upsert({ nombre, activo: true }, { onConflict: 'nombre' });
    if (error) { avisar(error.message, true); return; }
    setNuevoRubro('');
    avisar('Rubro agregado');
    await recargar();
  };

  const quitarRubro = async (id: number, nombre: string) => {
    const u = usos(id);
    const total = u.gastos + u.presupuesto + u.cuotas;
    if (!confirm(`¿Quitar "${nombre}"?`)) return;
    if (total > 0) {
      const { error } = await supabase.from('obra_rubros').update({ activo: false }).eq('id', id);
      if (error) { avisar(error.message, true); return; }
      avisar(`Tiene ${total} registros asociados, así que lo desactivé en vez de borrarlo.`);
    } else {
      const { error } = await supabase.from('obra_rubros').delete().eq('id', id);
      if (error) { avisar(error.message, true); return; }
      avisar('Rubro borrado');
    }
    await recargar();
  };

  const reactivar = async (id: number) => {
    const { error } = await supabase.from('obra_rubros').update({ activo: true }).eq('id', id);
    if (error) { avisar(error.message, true); return; }
    avisar('Rubro reactivado');
    await recargar();
  };

  const darAcceso = async () => {
    const mail = nuevoAcceso.trim().toLowerCase();
    if (!mail) return;
    const { error } = await supabase.from('obra_acceso')
      .upsert({ email: mail }, { onConflict: 'email' });
    if (error) { avisar(error.message, true); return; }
    setNuevoAcceso('');
    avisar(`${mail} ya puede entrar`);
    const { data } = await supabase.from('obra_acceso').select('email,nombre');
    setAcceso(data || []);
  };

  const quitarAcceso = async (mail: string) => {
    if (mail === email) { avisar('No te saques el acceso a vos mismo.', true); return; }
    if (!confirm(`¿Sacarle el acceso a ${mail}?`)) return;
    const { error } = await supabase.from('obra_acceso').delete().eq('email', mail);
    if (error) { avisar(error.message, true); return; }
    const { data } = await supabase.from('obra_acceso').select('email,nombre');
    setAcceso(data || []);
  };

  return (
    <section className="pantalla">
      <div className="card">
        <h2>Datos del proyecto</h2>
        <label>Nombre</label>
        <input type="text" value={proyecto} onChange={(e) => setProyecto(e.target.value)} />

        <label>Metros cuadrados computados</label>
        <input type="number" step="0.01" value={m2} onChange={(e) => setM2(e.target.value)} />
        <div className="hint">
          Incluí lo semicubierto ya ponderado. Es el divisor de todas las métricas por m².
        </div>

        <label>Contingencia sobre el presupuesto (%)</label>
        <input type="number" step="0.5" value={cont} onChange={(e) => setCont(e.target.value)} />

        <button className="btn" onClick={guardarConfig} disabled={ocupado}>Guardar</button>
      </div>

      <div className="card">
        <h2>Rubros</h2>
        <div className="fila">
          <div>
            <input type="text" placeholder="Nombre del rubro nuevo" value={nuevoRubro}
              onChange={(e) => setNuevoRubro(e.target.value)} />
          </div>
          <div style={{ flex: '0 0 auto' }}>
            <button className="btn mini" style={{ padding: '10px 14px' }} onClick={agregarRubro}>
              Agregar
            </button>
          </div>
        </div>
        <div className="hint">
          Los rubros con movimientos no se borran: se desactivan y dejan de aparecer en las listas.
        </div>
        <div style={{ marginTop: 12 }}>
          {rubros.map((r) => {
            const u = usos(r.id);
            const total = u.gastos + u.presupuesto + u.cuotas;
            return (
              <div className="item" style={{ cursor: 'default' }} key={r.id}>
                <div>
                  <div className="t">
                    {r.nombre} {!r.activo && <span className="chip gris">desactivado</span>}
                  </div>
                  <div className="d">
                    {total
                      ? `${u.gastos} gastos · ${u.presupuesto} líneas · ${u.cuotas} cuotas`
                      : 'sin movimientos'}
                  </div>
                </div>
                <div className="m">
                  {r.activo ? (
                    <button className="btn sec mini" onClick={() => quitarRubro(r.id, r.nombre)}>Quitar</button>
                  ) : (
                    <button className="btn sec mini" onClick={() => reactivar(r.id)}>Reactivar</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h2>Quién puede entrar</h2>
        <div className="hint">
          Agregá el mail y después que esa persona entre con su correo. Sin estar en la lista no ve nada.
        </div>
        <div className="fila" style={{ marginTop: 10 }}>
          <div>
            <input type="email" placeholder="mail@ejemplo.com" value={nuevoAcceso}
              onChange={(e) => setNuevoAcceso(e.target.value)} />
          </div>
          <div style={{ flex: '0 0 auto' }}>
            <button className="btn mini" style={{ padding: '10px 14px' }} onClick={darAcceso}>
              Dar acceso
            </button>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          {acceso.map((a) => (
            <div className="item" style={{ cursor: 'default' }} key={a.email}>
              <div>
                <div className="t">{a.nombre || a.email}</div>
                <div className="d">{a.email}</div>
              </div>
              <div className="m">
                <button className="btn sec mini" onClick={() => quitarAcceso(a.email)}>Quitar</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Sesión</h2>
        <div className="hint">Estás entrando como {email}.</div>
        <button className="btn sec" onClick={onSalir}>Cerrar sesión</button>
      </div>
    </section>
  );
}
