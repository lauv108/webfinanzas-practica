import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSesion } from '../auth/SesionProvider'
import { hoyISO } from '../lib/formato'

/*
 * Formulario de registro y edición de transacciones.
 * RF-08 registro, RF-09 validación, RF-10 control de duplicados,
 * RF-11 edición, RF-07 creación de categoría propia.
 * RNF-02: una sola pantalla, cinco campos.
 */

const NUEVA = '__nueva__'

function estadoInicial(transaccion) {
  if (transaccion) {
    return {
      tipo: transaccion.tipo,
      monto: String(transaccion.monto),
      fecha: transaccion.fecha,
      categoriaId: transaccion.categoria_id,
      descripcion: transaccion.descripcion,
      nombreNuevaCategoria: '',
    }
  }
  return {
    tipo: 'gasto',
    monto: '',
    fecha: hoyISO(),
    categoriaId: '',
    descripcion: '',
    nombreNuevaCategoria: '',
  }
}

export default function FormularioTransaccion({ transaccion, categorias, onCerrar, onGuardado }) {
  const { usuario } = useSesion()
  const [datos, setDatos] = useState(() => estadoInicial(transaccion))
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)

  const deEsteTipo = categorias.filter((c) => c.tipo === datos.tipo)

  // Si el tipo cambia, la categoría elegida puede dejar de ser válida
  useEffect(() => {
    if (datos.categoriaId === NUEVA) return
    const sigueValida = deEsteTipo.some((c) => c.id === datos.categoriaId)
    if (!sigueValida) {
      setDatos((d) => ({ ...d, categoriaId: '' }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos.tipo])

  function cambiar(campo, valor) {
    setDatos((d) => ({ ...d, [campo]: valor }))
  }

  function validar() {
    const e = {}
    const monto = Number(datos.monto)

    // RF-09. Las mismas reglas existen como restricciones en la base de datos
    if (!datos.monto || Number.isNaN(monto) || monto <= 0) {
      e.monto = 'El monto debe ser mayor que cero.'
    }
    if (!datos.fecha) {
      e.fecha = 'Elige una fecha.'
    } else if (datos.fecha > hoyISO()) {
      e.fecha = 'No se admiten fechas futuras.'
    }
    if (!datos.categoriaId) {
      e.categoria = 'Elige una categoría.'
    }
    if (datos.categoriaId === NUEVA && !datos.nombreNuevaCategoria.trim()) {
      e.categoria = 'Escribe el nombre de la categoría nueva.'
    }
    if (!datos.descripcion.trim()) {
      e.descripcion = 'Escribe una descripción.'
    } else if (datos.descripcion.trim().length > 120) {
      e.descripcion = 'Máximo 120 caracteres.'
    }
    return e
  }

  async function enviar(evento) {
    evento.preventDefault()

    const e = validar()
    setErrores(e)
    if (Object.keys(e).length > 0) return

    // RF-10. El botón queda deshabilitado mientras la petición está en curso
    setGuardando(true)
    try {
      let categoriaId = datos.categoriaId

      // RF-07. Categoría propia creada desde el mismo formulario
      if (categoriaId === NUEVA) {
        const { data, error } = await supabase
          .from('categorias')
          .insert({
            usuario_id: usuario.id,
            nombre: datos.nombreNuevaCategoria.trim(),
            tipo: datos.tipo,
          })
          .select('id')
          .single()

        if (error) {
          console.error('[categorias]', error)
          setErrores({
            general: error.code === '23505'
              ? 'Ya tienes una categoría con ese nombre.'
              : 'No se pudo crear la categoría. Intenta de nuevo.',
          })
          return
        }
        categoriaId = data.id
      }

      const fila = {
        usuario_id: usuario.id,
        categoria_id: categoriaId,
        tipo: datos.tipo,
        monto: Number(datos.monto),
        fecha: datos.fecha,
        descripcion: datos.descripcion.trim(),
      }

      const { error } = transaccion
        ? await supabase.from('transacciones').update(fila).eq('id', transaccion.id)
        : await supabase.from('transacciones').insert(fila)

      if (error) {
        console.error('[transacciones]', error)
        setErrores({ general: 'No se pudo guardar el movimiento. Revisa los datos e intenta de nuevo.' })
        return
      }

      onGuardado()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="velo" role="dialog" aria-modal="true" aria-label={transaccion ? 'Editar transacción' : 'Nueva transacción'}>
      <form className="modal" onSubmit={enviar} noValidate>
        <h2>{transaccion ? 'Editar transacción' : 'Nueva transacción'}</h2>
        <p className="sub">Cinco campos, una sola pantalla.</p>

        <div className="campo">
          <label>Tipo</label>
          <div className="par">
            <button
              type="button"
              className={datos.tipo === 'gasto' ? 'boton' : 'boton fantasma'}
              onClick={() => cambiar('tipo', 'gasto')}
            >Gasto</button>
            <button
              type="button"
              className={datos.tipo === 'ingreso' ? 'boton' : 'boton fantasma'}
              onClick={() => cambiar('tipo', 'ingreso')}
            >Ingreso</button>
          </div>
        </div>

        <div className="par">
          <div className="campo">
            <label htmlFor="monto">Monto</label>
            <input
              id="monto" type="number" min="1" step="1" inputMode="numeric"
              value={datos.monto}
              onChange={(e) => cambiar('monto', e.target.value)}
            />
            {errores.monto && <p className="error">{errores.monto}</p>}
          </div>
          <div className="campo">
            <label htmlFor="fecha">Fecha</label>
            <input
              id="fecha" type="date" max={hoyISO()}
              value={datos.fecha}
              onChange={(e) => cambiar('fecha', e.target.value)}
            />
            {errores.fecha && <p className="error">{errores.fecha}</p>}
          </div>
        </div>

        <div className="campo">
          <label htmlFor="categoria">Categoría</label>
          <select
            id="categoria"
            value={datos.categoriaId}
            onChange={(e) => cambiar('categoriaId', e.target.value)}
          >
            <option value="">Elige una categoría</option>
            {deEsteTipo.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            <option value={NUEVA}>+ Crear categoría nueva</option>
          </select>
          {datos.categoriaId === NUEVA && (
            <input
              className="separado"
              placeholder="Nombre de la categoría nueva"
              value={datos.nombreNuevaCategoria}
              onChange={(e) => cambiar('nombreNuevaCategoria', e.target.value)}
            />
          )}
          {errores.categoria && <p className="error">{errores.categoria}</p>}
        </div>

        <div className="campo">
          <label htmlFor="descripcion">Descripción</label>
          <input
            id="descripcion" maxLength={120}
            value={datos.descripcion}
            onChange={(e) => cambiar('descripcion', e.target.value)}
          />
          {errores.descripcion && <p className="error">{errores.descripcion}</p>}
        </div>

        {errores.general && <p className="error bloque">{errores.general}</p>}

        <div className="par">
          <button type="button" className="boton fantasma" onClick={onCerrar}>Cancelar</button>
          <button type="submit" className="boton" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}
