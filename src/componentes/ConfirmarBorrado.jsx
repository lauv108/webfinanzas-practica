import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { pesos, fechaLarga } from '../lib/formato'

/*
 * RF-12 y RNF-03. Toda acción destructiva pide confirmación explícita
 * y muestra exactamente qué se va a eliminar.
 */

export default function ConfirmarBorrado({ transaccion, onCerrar, onEliminado }) {
  const [borrando, setBorrando] = useState(false)
  const [error, setError] = useState(null)

  async function eliminar() {
    setBorrando(true)
    const { error } = await supabase.from('transacciones').delete().eq('id', transaccion.id)
    setBorrando(false)

    if (error) {
      setError('No se pudo eliminar: ' + error.message)
      return
    }
    onEliminado()
  }

  return (
    <div className="velo" role="dialog" aria-modal="true" aria-label="Confirmar eliminación">
      <div className="modal">
        <h2>¿Eliminar esta transacción?</h2>
        <p className="sub">
          Esta acción no se puede deshacer. El balance del mes y el presupuesto de la
          categoría se recalculan de inmediato.
        </p>

        <div className="resumen-fila">
          <strong>{transaccion.descripcion}</strong>
          <span>{fechaLarga(transaccion.fecha)} · {transaccion.categorias?.nombre}</span>
          <strong>{transaccion.tipo === 'gasto' ? '-' : '+'}{pesos(transaccion.monto)}</strong>
        </div>

        {error && <p className="error bloque">{error}</p>}

        <div className="par">
          <button className="boton fantasma" onClick={onCerrar}>Cancelar</button>
          <button className="boton peligro" onClick={eliminar} disabled={borrando}>
            {borrando ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}
