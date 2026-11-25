import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'framer-motion'

/*
 * Número que sube hasta su valor al cargar. Con "reducir movimiento" activo
 * en el sistema muestra el valor final de una vez.
 */

export default function CifraAnimada({ valor, formato = (n) => String(Math.round(n)), duracion = 0.9 }) {
  const reducir = useReducedMotion()
  const [mostrado, setMostrado] = useState(reducir ? valor : 0)
  const previo = useRef(0)

  useEffect(() => {
    const destino = Number(valor) || 0
    if (reducir) {
      previo.current = destino
      return undefined
    }
    const control = animate(previo.current, destino, {
      duration: duracion,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (n) => setMostrado(n),
    })
    previo.current = destino
    return () => control.stop()
  }, [valor, duracion, reducir])

  return <>{formato(reducir ? Number(valor) || 0 : mostrado)}</>
}
