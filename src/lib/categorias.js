import {
  House, ShoppingBasket, Bus, HeartPulse, Ticket, Package, Briefcase, Coins, Tag,
} from 'lucide-react'

/*
 * Color e ícono de cada categoría.
 * Una categoría tiene siempre el mismo color en toda la app: las ocho
 * predefinidas tienen uno fijo y las que crea el usuario reciben uno de la
 * paleta según su nombre, de modo que no cambia entre pantallas ni visitas.
 */

const FIJAS = {
  vivienda: { color: '#1d3f73', Icono: House },
  alimentacion: { color: '#d9a33a', Icono: ShoppingBasket },
  transporte: { color: '#8fb3e0', Icono: Bus },
  salud: { color: '#4f9e78', Icono: HeartPulse },
  entretenimiento: { color: '#d4785c', Icono: Ticket },
  otros: { color: '#8a96a8', Icono: Package },
  salario: { color: '#2f6b4f', Icono: Briefcase },
  'otros ingresos': { color: '#4f9e78', Icono: Coins },
}

const PALETA_EXTRA = ['#9c4a35', '#8a6413', '#5d6b80', '#16325c', '#d4785c', '#4f9e78', '#d9a33a', '#8fb3e0']

const normalizar = (texto) =>
  (texto ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

export function estiloCategoria(nombre) {
  const clave = normalizar(nombre)
  if (FIJAS[clave]) return FIJAS[clave]
  let h = 0
  for (const c of clave) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return { color: PALETA_EXTRA[h % PALETA_EXTRA.length], Icono: Tag }
}
