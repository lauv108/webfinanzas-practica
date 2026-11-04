import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { periodoActual } from '../lib/formato'
import Navegacion from '../componentes/Navegacion'
import FormularioTransaccion from '../componentes/FormularioTransaccion'
import Resumen from './Resumen'
import Transacciones from './Transacciones'
import Presupuesto from './Presupuesto'
import Perfil from './Perfil'
import Privacidad from './Privacidad'

/*
 * Carcasa de la aplicación. Mantiene el mes consultado, el juego de categorías
 * y el formulario de nueva transacción, que es accesible desde cualquier
 * pantalla igual que en la referencia de diseño.
 */

export default function Aplicacion() {
  const [seccion, setSeccion] = useState('resumen')
  const [periodo, setPeriodo] = useState(periodoActual)
  const [categorias, setCategorias] = useState([])
  const [creando, setCreando] = useState(false)
  const [recarga, setRecarga] = useState(0)

  const cargarCategorias = useCallback(async () => {
    const { data, error } = await supabase
      .from('categorias')
      .select('id, nombre, tipo')
      .order('tipo')
      .order('nombre')
    if (error) console.error('[categorias]', error)
    setCategorias(data ?? [])
  }, [])

  useEffect(() => { cargarCategorias() }, [cargarCategorias])

  function trasGuardar() {
    setCreando(false)
    cargarCategorias()
    setRecarga((n) => n + 1)
  }

  const comunes = { periodo, onCambiarPeriodo: setPeriodo, recarga }

  return (
    <div className="marco">
      <Navegacion activa={seccion === 'privacidad' ? 'perfil' : seccion} onCambiar={setSeccion} />

      <main className="lienzo">
        {seccion === 'resumen' && (
          <Resumen
            {...comunes}
            onNuevaTransaccion={() => setCreando(true)}
            onIrA={setSeccion}
          />
        )}

        {seccion === 'transacciones' && (
          <Transacciones
            {...comunes}
            categorias={categorias}
            onNuevaTransaccion={() => setCreando(true)}
            onCategoriasCambiadas={cargarCategorias}
          />
        )}

        {seccion === 'presupuesto' && (
          <Presupuesto {...comunes} categorias={categorias} />
        )}

        {seccion === 'perfil' && (
          <Perfil categorias={categorias} onIrAPrivacidad={() => setSeccion('privacidad')} />
        )}

        {seccion === 'privacidad' && <Privacidad onVolver={() => setSeccion('perfil')} />}
      </main>

      {creando && (
        <FormularioTransaccion
          categorias={categorias}
          onCerrar={() => setCreando(false)}
          onGuardado={trasGuardar}
        />
      )}
    </div>
  )
}
