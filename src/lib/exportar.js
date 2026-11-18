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
function descargarArchivo(contenido, nombre, tipo) {
  const blob = new Blob([contenido], { type: tipo })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}

export function descargarJSON(objeto, nombre) {
  descargarArchivo(JSON.stringify(objeto, null, 2), nombre, 'application/json;charset=utf-8')
}

/*
 * RF-23. Movimientos en CSV para abrir en una hoja de cálculo.
 * - Separador punto y coma: es el que Excel espera con la configuración
 *   regional de Colombia, donde la coma es el separador decimal.
 * - Marca BOM al inicio para que Excel lea las tildes como UTF-8.
 * - Los valores que empiezan por = + - @ se anteponen con un apóstrofo para
 *   que la hoja no los ejecute como fórmula (inyección en CSV).
 */
const SEPARADOR = ';'

function celda(valor) {
  let texto = valor == null ? '' : String(valor)
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`
  if (/[";\n\r]/.test(texto)) texto = `"${texto.replace(/"/g, '""')}"`
  return texto
}

function montoPlano(valor) {
  const n = Number(valor)
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',')
}

export function transaccionesACSV(filas) {
  const encabezado = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto']
  const lineas = filas.map((f) => [
    f.fecha,
    f.tipo === 'ingreso' ? 'Ingreso' : 'Gasto',
    f.categorias?.nombre ?? '',
    f.descripcion,
    montoPlano(f.monto),
  ].map(celda).join(SEPARADOR))
  return [encabezado.map(celda).join(SEPARADOR), ...lineas].join('\r\n')
}

export function descargarCSV(texto, nombre) {
  descargarArchivo('﻿' + texto, nombre, 'text/csv;charset=utf-8')
}
