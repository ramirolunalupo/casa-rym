'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { ProveedorAvisos, useAviso } from '@/components/Ui';
import { ProveedorDatos, useDatos } from '@/components/Datos';
import Panel from '@/components/Panel';
import Luca from '@/components/Luca';
import Gastos from '@/components/Gastos';
import Cuotas from '@/components/Cuotas';
import Presupuesto from '@/components/Presupuesto';
import Faltantes from '@/components/Faltantes';
import Cambio from '@/components/Cambio';
import Ajustes from '@/components/Ajustes';
import { ars } from '@/lib/formato';

const TABS = [
  ['panel', 'Panel'],
  ['luca', 'LUCA'],
  ['gastos', 'Gastos'],
  ['cuotas', 'Cuotas'],
  ['presupuesto', 'Presupuesto'],
  ['faltantes', 'Faltantes'],
  ['cambio', 'Cambio'],
  ['ajustes', 'Ajustes'],
] as const;

export default function Pagina() {
  const [session, setSession] = useState<Session | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setListo(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!listo) return <div className="login"><p className="cargando">Cargando…</p></div>;

  return (
    <ProveedorAvisos>
      {!session ? <Login /> : (
        <ProveedorDatos>
          <App email={session.user.email || ''} />
        </ProveedorDatos>
      )}
    </ProveedorAvisos>
  );
}

function Login() {
  const avisar = useAviso();
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const entrar = async () => {
    if (!email.trim()) return;
    setEnviando(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setEnviando(false);
    if (error) { avisar(error.message, true); return; }
    setEnviado(true);
  };

  return (
    <div className="login">
      <h1>Control de obra</h1>
      <p className="hint">Entrá con tu mail. Te llega un link y listo, sin contraseña.</p>
      {enviado ? (
        <div className="conv" style={{ marginTop: 16 }}>
          Te mandé el link a {email}. Abrilo desde este mismo teléfono o computadora.
        </div>
      ) : (
        <>
          <label>Mail</label>
          <input
            type="email" value={email} placeholder="vos@ejemplo.com"
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void entrar(); }}
          />
          <button className="btn" onClick={entrar} disabled={enviando}>
            {enviando ? 'Enviando…' : 'Entrar'}
          </button>
        </>
      )}
    </div>
  );
}

function App({ email }: { email: string }) {
  const { cargando, config, fx, rubros } = useDatos();
  const [tab, setTab] = useState<string>('panel');

  const salir = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  if (cargando) {
    return <div className="wrap"><p className="cargando" style={{ paddingTop: 24 }}>Cargando datos…</p></div>;
  }

  if (!rubros.length) {
    return (
      <div className="wrap">
        <header className="top"><h1>Control de obra</h1></header>
        <div className="card">
          <h2>Sin acceso</h2>
          <div className="hint">
            Tu mail ({email}) todavía no está habilitado para este proyecto. Pedile a Rami que
            te agregue desde Ajustes.
          </div>
          <button className="btn sec" onClick={salir}>Cerrar sesión</button>
        </div>
      </div>
    );
  }

  const ultimoTc = fx.length ? fx[fx.length - 1].tc : 0;

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <h1>{config.proyecto}</h1>
          <div className="meta">
            {config.m2_computados} m² computados · último cambio {ars(ultimoTc)}
          </div>
        </div>
      </header>

      <nav className="tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => { setTab(id); window.scrollTo(0, 0); }}>
            {label}
          </button>
        ))}
      </nav>

      {tab === 'panel' && <Panel />}
      {tab === 'luca' && <Luca />}
      {tab === 'gastos' && <Gastos />}
      {tab === 'cuotas' && <Cuotas />}
      {tab === 'presupuesto' && <Presupuesto />}
      {tab === 'faltantes' && <Faltantes />}
      {tab === 'cambio' && <Cambio />}
      {tab === 'ajustes' && <Ajustes email={email} onSalir={salir} />}
    </div>
  );
}
