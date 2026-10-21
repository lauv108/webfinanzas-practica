import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { pesos, rangoDelPeriodo } from '../lib/formato'
import SelectorMes from '../componentes/SelectorMes'

/*
 * Resumen del mes. Lee las vistas de cálculo del esquema, de modo que la
 * lógica de los totales vive en la base de datos y no se repite en la interfaz.
 * RF-19 totales, RF-20 selector de mes, RF-22 desglose por categoría.
 * El gráfico de distribución (RF-21) corresponde a la Fase 3.
 */

const VACIO = { total_ingresos: 0, total_gastos: 0, balance: 0, num_transacciones: 0 }

export default function Resumen({ periodo, onCambiarPeriodo, onIrATransacciones }) {
  const [totales, setTotales] = useState(VACIO)
  const [desglose, setDesglose] = useState([])
  const [estado, setEstado] = useState('cargando')
  const [error, setError] = useState(null)

  useEffect(() => {
    let activo = true
    const { desde } = rangoDelPeriodo(periodo)

    async function traer() {
      setEstado('cargando')

      const [resumen, categorias] = await Promise.all([
        supabase.from('v_resumen_mensual')
          .select('total_ingresos, total_gastos, balance, num_transacciones')
          .eq('periodo', desde).maybeSingle(),
        supabase.from('v_gasto_por_categoria')
          .select('categoria_id, categoria, monto, porcentaje')
          .eq('periodo', desde).order('monto', { ascending: false }),
      ])

      if (!activo) return

      if (resumen.error || categorias.error) {
        setError((resumen.error || categorias.error).message)
        setEstado('error')
        return
      }

      setTotales(resumen.data ?? VACIO)
      setDesglose(categorias.data ?? [])
      setEstado('listo')
    }

    traer()
    return () => { activo = false }
  }, [periodo])

  const sinDatos = estado === 'listo' && totales.num_transacciones === 0

  return (
    <>
      <div className="encabezado-mes">
        <SelectorMes periodo={periodo} onCambiar={onCambiarPeriodo} />
        <button className="boton fantasma auto" onClick={onIrATransacciones}>
          + Nueva transacción
        </button>
      </div>

      {estado === 'error' && <p className="error bloque">No se pudo cargar el resumen: {error}</p>}

      <div className="indicadores">
        <div className="indicador">
          <span className="etiqueta-dato">Ingresos</span>
          <span className="cifra-grande entra">{pesos(totales.total_ingresos)}</span>
        </div>
        <div className="indicador">
          <span className="etiqueta-dato">Gastos</span>
          <span className="cifra-grande sale">{pesos(totales.total_gastos)}</span>
        </div>
        <div className="indicador">
          <span className="etiqueta-dato">Balance</span>
          <span className="cifra-grande">{pesos(totales.balance)}</span>
        </div>
      </div>

      {sinDatos && (
        <section className="tarjeta ancha">
          <div className="vacio">
            <p className="fuerte">Todavía no hay movimientos en este mes.</p>
            <p>Registra el primero y el resumen se arma solo.</p>
            <button className="boton auto" onClick={onIrATransacciones}>
              Registrar mi primer movimiento
            </button>
          </div>
        </section>
      )}

      {estado === 'listo' && desglose.length > 0 && (
        <section className="tarjeta ancha">
          <h2>Desglose del gasto por categoría</h2>
          <p className="sub">{totales.num_transacciones} movimientos registrados en el mes.</p>

          <div className="tabla-scroll">
            <table>
              <thead>
                <tr><th>Categoría</th><th className="der">Monto</th><th className="der">% del gasto</th></tr>
              </thead>
              <tbody>
                {desglose.map((d) => (
                  <tr key={d.categoria_id}>
                    <td>
                      {d.categoria}
                      <span className="medidor"><i style={{ width: `${d.porcentaje}%` }} /></span>
                    </td>
                    <td className="der cifra">{pesos(d.monto)}</td>
                    <td className="der cifra">{Number(d.porcentaje).toFixed(1)} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  )
}
