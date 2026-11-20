export type Moneda = 'ARS' | 'USD';

export type Rubro = { id: number; nombre: string; activo: boolean; orden: number };

export type Regla = { id: number; palabra: string; rubro_id: number; tipo: string };

export type Fx = {
  id_operacion: string;
  fecha: string;
  ars: number;
  usd: number;
  tc: number;
  nota: string | null;
};

export type Gasto = {
  id: number;
  fecha: string;
  rubro_id: number | null;
  tipo: string;
  proveedor: string | null;
  detalle: string | null;
  moneda: Moneda;
  monto: number;
  tc: number;
  fx_op: string | null;
  monto_ars: number;
  monto_usd: number;
  medio_pago: string | null;
  luca_id: number | null;
  cuota_id: number | null;
};

export type LineaPresupuesto = {
  id: number;
  rubro_id: number;
  tipo: string;
  moneda: Moneda;
  monto: number;
  estado: 'Estimado' | 'Cotizado' | 'Cerrado';
  notas: string | null;
};

export type Cuota = {
  id: number;
  plan_id: string;
  rubro_id: number;
  tipo: string;
  proveedor: string | null;
  detalle: string | null;
  moneda: Moneda;
  monto: number;
  nro: number;
  total: number;
  vencimiento: string;
  estado: 'Pendiente' | 'Pagada';
};

export type Pendiente = {
  luca_id: number;
  fecha: string;
  moneda: Moneda;
  monto: number;
  contraparte: string;
  detalle: string;
  id_operacion: string;
  rubro_id: number | null;
  tipo: string | null;
  palabra: string | null;
  tc: number | null;
  fx_op: string | null;
};

export type Config = {
  proyecto: string;
  m2_computados: number;
  contingencia_pct: number;
  tipos: string[];
  medios_pago: string[];
};

export const CONFIG_DEFAULT: Config = {
  proyecto: 'Obra',
  m2_computados: 0,
  contingencia_pct: 0,
  tipos: ['Mano de obra', 'Materiales', 'Otros'],
  medios_pago: ['Transferencia'],
};
