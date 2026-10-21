import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSesion } from '../auth/SesionProvider'
import { periodoActual } from '../lib/formato'
import Barra from '../componentes/Barra'
import Resumen from './Resumen'
import Transacciones from './Transacciones'

/*
 * Carcasa de la aplicación. Mantiene el mes consultado y el juego de
 * categorías, para que resumen e historial trabajen sobre lo mismo.
 */

export default function Aplicacion() {
  const { usuario } = useSesion()
  const [pestana, setPestana] = useState('resumen')
  const [periodo, setPeriodo] = useState(periodoActual)
  const [categorias, setCategorias] = useState([])

  const cargarCategorias = useCallback(async () => {
    const { data } = await supabase
      .from('categorias')
      .select('id, nombre, tipo')
      .order('tipo')
      .order('nombre')
    setCategorias(data ?? [])
  }, [])

  useEffect(() => { cargarCategorias() }, [cargarCategorias])

  return (
    <div className="app">
      <Barra activa={pestana} onCambiar={setPestana} />

      <main className="contenido">
        <p className="identidad">Sesión activa como <strong>{usuario?.email}</strong></p>

        {pestana === 'resumen' && (
          <Resumen
            periodo={periodo}
            onCambiarPeriodo={setPeriodo}
            onIrATransacciones={() => setPestana('transacciones')}
          />
        )}

        {pestana === 'transacciones' && (
          <Transacciones
            periodo={periodo}
            onCambiarPeriodo={setPeriodo}
            categorias={categorias}
            onCategoriasCambiadas={cargarCategorias}
          />
        )}
      </main>
    </div>
  )
}
