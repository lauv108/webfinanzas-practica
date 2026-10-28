import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSesion } from '../auth/SesionProvider'
import { rangoDelPeriodo, nombrePeriodo } from '../lib/formato'

/*
 * Definición y edición de un tope mensual de gasto.
 * RF-15 definición del tope, RF-18 edición.
 * El período se guarda siempre como el primer día del mes: la restricción
 * presupuestos_periodo_primer_dia del esquema lo exige.
 */

export default function FormularioPresupuesto({ tope, categorias, periodo, onCerrar, onGuardado }) {
  const { usuario } = useSesion()
  const [categoriaId, setCategoriaId] = useState(tope ? tope.categoria_id : '')
  const [monto, setMonto] = useState(tope ? String(tope.monto_tope) : '')
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)

  const editando = Boolean(tope)

  function validar() {
    const e = {}
    if (!editando && !categoriaId) e.categoria = 'Elige una categoría.'
    const valor = Number(monto)
    if (!monto || Number.isNaN(valor) || valor <= 0) {
      e.monto = 'El tope debe ser mayor que cero.'
    }
    return e
  }

  async function enviar(evento) {
    evento.preventDefault()

    const e = validar()
    setErrores(e)
    if (Object.keys(e).length > 0) return

    setGuardando(true)
    try {
      const { desde } = rangoDelPeriodo(periodo)

      const { error } = editando
        ? await supabase
            .from('presupuestos')
            .update({ monto_tope: Number(monto) })
            .eq('id', tope.presupuesto_id)
        : await supabase.from('presupuestos').insert({
            usuario_id: usuario.id,
            categoria_id: categoriaId,
            tipo: 'gasto',
            periodo: desde,
            monto_tope: Number(monto),
          })

      if (error) {
        // El detalle queda para quien desarrolla; el usuario ve un mensaje neutro
        console.error('[presupuestos]', error)
        setErrores({
          general:
            error.code === '23505'
              ? 'Ya tienes un tope para esa categoría en este mes.'
              : 'No se pudo guardar el tope. Intenta de nuevo.',
        })
        return
      }

      onGuardado()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="velo" role="dialog" aria-modal="true" aria-label={editando ? 'Editar tope' : 'Definir tope'}>
      <form className="modal" onSubmit={enviar} noValidate>
        <h2>{editando ? 'Editar tope' : 'Definir tope mensual'}</h2>
        <p className="sub">{nombrePeriodo(periodo)}</p>

        <div className="campo">
          <label htmlFor="p-categoria">Categoría de gasto</label>
          {editando ? (
            <input id="p-categoria" value={tope.categoria} readOnly />
          ) : (
            <select id="p-categoria" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
              <option value="">Elige una categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          )}
          {!editando && categorias.length === 0 && (
            <p className="pista">Todas tus categorías de gasto ya tienen un tope este mes.</p>
          )}
          {errores.categoria && <p className="error">{errores.categoria}</p>}
        </div>

        <div className="campo">
          <label htmlFor="p-monto">Tope del mes</label>
          <input
            id="p-monto" type="number" min="1" step="1" inputMode="numeric"
            value={monto} onChange={(e) => setMonto(e.target.value)}
          />
          <p className="pista">Cuando el gasto llegue al 90 % del tope verás una alerta.</p>
          {errores.monto && <p className="error">{errores.monto}</p>}
        </div>

        {errores.general && <p className="error bloque">{errores.general}</p>}

        <div className="par">
          <button type="button" className="boton fantasma" onClick={onCerrar}>Cancelar</button>
          <button type="submit" className="boton" disabled={guardando || (!editando && categorias.length === 0)}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}
