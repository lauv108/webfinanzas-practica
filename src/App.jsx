import { lazy, Suspense } from 'react'
import { useSesion } from './auth/SesionProvider'
import Acceso from './pantallas/Acceso'

/*
 * Guarda de rutas. Mientras no haya sesión, lo único alcanzable son las
 * pantallas de acceso. Es la frontera de autenticación del mapa de flujos.
 *
 * La aplicación se carga aparte: las gráficas y animaciones solo se
 * descargan después de iniciar sesión, así la pantalla de acceso abre rápido.
 */

const Aplicacion = lazy(() => import('./pantallas/Aplicacion'))

export default function App() {
  const { sesion, cargando } = useSesion()

  if (cargando) {
    return <div className="cargando">Cargando...</div>
  }

  if (!sesion) return <Acceso />

  return (
    <Suspense fallback={<div className="cargando">Cargando...</div>}>
      <Aplicacion />
    </Suspense>
  )
}
