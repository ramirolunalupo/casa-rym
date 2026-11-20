'use client';

import { useEffect, useState, createContext, useContext, useCallback } from 'react';

/* ---------- avisos ---------- */

type Aviso = { texto: string; error: boolean } | null;
const AvisoCtx = createContext<(texto: string, error?: boolean) => void>(() => {});

export const useAviso = () => useContext(AvisoCtx);

export function ProveedorAvisos({ children }: { children: React.ReactNode }) {
  const [aviso, setAviso] = useState<Aviso>(null);

  const avisar = useCallback((texto: string, error = false) => {
    setAviso({ texto, error });
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 4200);
    return () => clearTimeout(t);
  }, [aviso]);

  return (
    <AvisoCtx.Provider value={avisar}>
      {children}
      {aviso && <div className={'aviso' + (aviso.error ? ' err' : '')} role="status">{aviso.texto}</div>}
    </AvisoCtx.Provider>
  );
}

/* ---------- modal ---------- */

export function Modal({
  titulo, children, onCerrar, onGuardar, onBorrar, guardando,
}: {
  titulo: string;
  children: React.ReactNode;
  onCerrar: () => void;
  onGuardar: () => void;
  onBorrar?: () => void;
  guardando?: boolean;
}) {
  return (
    <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="modal-box">
        <h3>{titulo}</h3>
        {children}
        <div className="modal-acciones">
          {onBorrar && (
            <button className="btn peligro" onClick={onBorrar} disabled={guardando}>Borrar</button>
          )}
          <button className="btn sec" onClick={onCerrar}>Cancelar</button>
          <button className="btn" onClick={onGuardar} disabled={guardando}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- campos ---------- */

export function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <label>{label}</label>
      {children}
    </>
  );
}

export function DosCol({ children }: { children: React.ReactNode }) {
  return <div className="fila">{children}</div>;
}

export function SelectorMoneda({
  valor, onChange, etiquetas = ['Pesos', 'Dólares'],
}: {
  valor: 'ARS' | 'USD';
  onChange: (m: 'ARS' | 'USD') => void;
  etiquetas?: [string, string] | string[];
}) {
  return (
    <div className="seg">
      <button type="button" aria-pressed={valor === 'ARS'} onClick={() => onChange('ARS')}>
        {etiquetas[0]}
      </button>
      <button type="button" aria-pressed={valor === 'USD'} onClick={() => onChange('USD')}>
        {etiquetas[1]}
      </button>
    </div>
  );
}
