/* Iconos de la navegación. Trazo de 1.5 para que acompañen al peso del texto. */

const base = {
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.5,
  strokeLinecap: 'round', strokeLinejoin: 'round',
  'aria-hidden': true,
}

export const IconoResumen = () => (
  <svg {...base}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
)

export const IconoTransacciones = () => (
  <svg {...base}><path d="M4 8h13l-3-3" /><path d="M20 16H7l3 3" /></svg>
)

export const IconoPresupuesto = () => (
  <svg {...base}><circle cx="12" cy="12" r="9" /><path d="M12 3v9l6.4 3.2" /></svg>
)

export const IconoPerfil = () => (
  <svg {...base}><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>
)

export const IconoSalir = () => (
  <svg {...base}><path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" /><path d="M10 8l-4 4 4 4" /><path d="M6 12h10" /></svg>
)

export const IconoMarca = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="3" y="12" width="4" height="9" rx="1" />
    <rect x="10" y="7" width="4" height="14" rx="1" />
    <rect x="17" y="3" width="4" height="18" rx="1" />
  </svg>
)
