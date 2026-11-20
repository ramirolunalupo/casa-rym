export const ars = (n: number | null | undefined) =>
  '$ ' + Math.round(n || 0).toLocaleString('es-AR');

export const usd = (n: number | null | undefined) =>
  'US$ ' + Math.round(n || 0).toLocaleString('es-AR');

export const usd1 = (n: number | null | undefined) =>
  'US$ ' + (n || 0).toLocaleString('es-AR', { maximumFractionDigits: 1 });

export const pct = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : (n > 0 ? '+' : '') + n.toFixed(0) + '%';

export const fechaCorta = (f: string) => {
  if (!f) return '';
  const p = f.split('-');
  return p[2] + '/' + p[1];
};

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const mesCorto = (m: string) => {
  const p = m.split('-');
  return MESES[parseInt(p[1], 10) - 1] + ' ' + p[0].slice(2);
};

export const hoy = () => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};

export const recortar = (s: string | null | undefined, n: number) => {
  const t = String(s || '');
  return t.length > n ? t.slice(0, n) + '…' : t;
};

export const sumarMeses = (fecha: string, meses: number) => {
  const [y, m, d] = fecha.split('-').map(Number);
  const base = new Date(y, m - 1 + meses, 1);
  const ultimo = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const dd = Math.min(d, ultimo);
  return (
    base.getFullYear() +
    '-' + String(base.getMonth() + 1).padStart(2, '0') +
    '-' + String(dd).padStart(2, '0')
  );
};

export const PALETA = [
  '#0F6E5C', '#3E8E7E', '#6FAE9C', '#9BC4B4', '#C9A227',
  '#B3671E', '#A32B21', '#7B5E8A', '#8FA39D', '#C2C9C6',
];
