/* Datos de presentación guardados en los metadatos de la cuenta */

export const META_AHORRO_PREDETERMINADA = 20

export function nombreDe(usuario) {
  const nombre = usuario?.user_metadata?.nombre
  return typeof nombre === 'string' && nombre.trim() ? nombre.trim() : null
}

export function metaAhorroDe(usuario) {
  const meta = Number(usuario?.user_metadata?.meta_ahorro)
  return meta >= 1 && meta <= 90 ? meta : META_AHORRO_PREDETERMINADA
}

/* Solo el primer nombre, para el saludo */
export function primerNombre(usuario) {
  const nombre = nombreDe(usuario)
  return nombre ? nombre.split(/\s+/)[0] : null
}

export function validarNombre(nombre) {
  const limpio = (nombre ?? '').trim()
  if (!limpio) return 'Escribe tu nombre.'
  if (limpio.length > 40) return 'Usa máximo 40 caracteres.'
  return null
}
