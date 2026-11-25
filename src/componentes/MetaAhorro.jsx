import { useState } from 'react'
import { motion } from 'framer-motion'
import { PiggyBank, Pencil } from 'lucide-react'
import { useSesion } from '../auth/SesionProvider'
import { metaAhorroDe } from '../lib/perfil'
import { pesos } from '../lib/formato'

/*
 * Meta de ahorro del mes: un porcentaje de los ingresos que cada persona
 * elige (20 % por defecto). Se guarda en los metadatos de la cuenta.
 */

export default function MetaAhorro({ ingresos, gastos }) {
  const { usuario, actualizarPerfil } = useSesion()
  const pct = metaAhorroDe(usuario)
  const [editando, setEditando] = useState(false)
  const [escrito, setEscrito] = useState('')
  const [error, setError] = useState(null)

  const meta = ingresos * (pct / 100)
  const ahorro = ingresos - gastos
  const avance = meta ? Math.max(0, Math.min((ahorro / meta) * 100, 100)) : 0

  async function guardar(e) {
    e.preventDefault()
    const valor = Math.round(Number(escrito))
    if (!(valor >= 1 && valor <= 90)) { setError('Escribe un porcentaje entre 1 y 90.'); return }
    const { error: fallo } = await actualizarPerfil({ meta_ahorro: valor })
    if (fallo) { setError('No se pudo guardar. Intenta de nuevo.'); return }
    setEditando(false)
  }

  return (
    <motion.section className="tarjeta-t meta-presupuesto" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="seccion-cabeza">
        <span className="kpi-icono ocre"><PiggyBank size={20} /></span>
        <div className="meta-presupuesto-titulo">
          <h2>Meta de ahorro</h2>
          <p className="tarjeta-t-sub">Lo que quieres guardar de lo que entra cada mes</p>
        </div>
        {!editando && (
          <button className="boton-icono" onClick={() => { setEscrito(String(pct)); setError(null); setEditando(true) }}
            aria-label="Editar la meta de ahorro" title="Editar la meta"><Pencil size={16} /></button>
        )}
      </div>

      {editando ? (
        <form className="meta-editar" onSubmit={guardar} noValidate>
          <label htmlFor="meta-presupuesto">Quiero ahorrar el</label>
          <input id="meta-presupuesto" type="number" min="1" max="90" inputMode="numeric"
            value={escrito} onChange={(e) => { setEscrito(e.target.value); setError(null) }} />
          <span>% de mis ingresos</span>
          {error && <p className="error" style={{ flexBasis: '100%', margin: 0 }}>{error}</p>}
          <div className="meta-editar-botones">
            <button type="button" className="boton auto fantasma" onClick={() => setEditando(false)}>Cancelar</button>
            <button type="submit" className="boton auto">Guardar</button>
          </div>
        </form>
      ) : (
        <p className="meta-texto">Ahorrar el <b>{pct} %</b> de tus ingresos: <b>{pesos(meta)}</b> este mes</p>
      )}

      <div className="barra-progreso grande">
        <motion.i className="meta" initial={{ width: 0 }} animate={{ width: `${avance}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} />
      </div>
      <p className="meta-pie">
        {!ingresos
          ? 'Cuando registres tus ingresos del mes, aquí verás tu avance.'
          : ahorro > 0
            ? <>Llevas <b>{pesos(ahorro)}</b> · {avance.toFixed(0)} % de la meta</>
            : 'Este mes todavía no queda ahorro. Revisa tus topes para lograrlo.'}
      </p>
    </motion.section>
  )
}
