import { useSesion } from './auth/SesionProvider'
import Acceso from './pantallas/Acceso'
import Aplicacion from './pantallas/Aplicacion'

/*
 * Guarda de rutas. Mientras no haya sesión, lo único alcanzable son las
 * pantallas de acceso. Es la frontera de autenticación del mapa de flujos.
 */

export default function App() {
  const { sesion, cargando } = useSesion()

  if (cargando) {
    return <div className="cargando">Cargando...</div>
  }

  return sesion ? <Aplicacion /> : <Acceso />
}
