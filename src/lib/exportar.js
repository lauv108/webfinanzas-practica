import { supabase } from './supabase'

/*
 * RNF-13. Copia de todos los datos de la cuenta en un archivo JSON legible.
 * Se consulta con la sesión del usuario, de modo que las políticas de acceso
 * garantizan que solo salen sus propias filas.
 */

export async function exportarDatos(usuario) {
  const [categorias, transacciones, presupuestos] = await Promise.all([
    supabase.from('categorias').select('id, nombre, tipo, es_predefinida, creado_en').order('tipo').order('nombre'),
    supabase.from('transacciones').select('id, fecha, tipo, monto, descripcion, categoria_id, creado_en, actualizado_en').order('fecha', { ascending: false }),
    supabase.from('presupuestos').select('id, periodo, categoria_id, monto_tope, creado_en, actualizado_en').order('periodo', { ascending: false }),
  ])

  const fallo = categorias.error || transacciones.error || presupuestos.error
  if (fallo) throw fallo

  return {
    aplicacion: 'WebFinanzas',
    exportado_en: new Date().toISOString(),
    cuenta: { correo: usuario.email, creada_en: usuario.created_at },
    categorias: categorias.data ?? [],
    transacciones: transacciones.data ?? [],
    presupuestos: presupuestos.data ?? [],
  }
}

/* Entrega el archivo al navegador sin pasar por ningún servidor. */
export function descargarJSON(objeto, nombre) {
  const contenido = JSON.stringify(objeto, null, 2)
  const blob = new Blob([contenido], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}
