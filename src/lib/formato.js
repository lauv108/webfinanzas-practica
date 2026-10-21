/* Formato de moneda y fechas para Colombia (RNF-16). */

const PESOS = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const FECHA_CORTA = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' })
const FECHA_LARGA = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
const MES_ANIO = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' })

/* Una fecha 'YYYY-MM-DD' de PostgreSQL se interpreta como UTC si se pasa
   directa a new Date(). Separar las partes evita que se corra un día. */
function aFechaLocal(iso) {
  const [anio, mes, dia] = iso.split('-').map(Number)
  return new Date(anio, mes - 1, dia)
}

export function pesos(valor) {
  return PESOS.format(Number(valor))
}

export function fechaCorta(iso) {
  return FECHA_CORTA.format(aFechaLocal(iso)).replace('.', '')
}

export function fechaLarga(iso) {
  return FECHA_LARGA.format(aFechaLocal(iso))
}

/* periodo llega como 'YYYY-MM' */
export function nombrePeriodo(periodo) {
  const [anio, mes] = periodo.split('-').map(Number)
  const texto = MES_ANIO.format(new Date(anio, mes - 1, 1))
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export function periodoActual() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
}

export function periodoVecino(periodo, pasos) {
  const [anio, mes] = periodo.split('-').map(Number)
  const d = new Date(anio, mes - 1 + pasos, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/* Límites del mes en formato ISO, para filtrar la columna fecha */
export function rangoDelPeriodo(periodo) {
  const [anio, mes] = periodo.split('-').map(Number)
  const ultimo = new Date(anio, mes, 0).getDate()
  return {
    desde: `${periodo}-01`,
    hasta: `${periodo}-${String(ultimo).padStart(2, '0')}`,
  }
}

export function hoyISO() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
}
