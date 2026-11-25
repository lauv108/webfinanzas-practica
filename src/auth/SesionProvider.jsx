import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/*
 * Contexto de sesion.
 * Centraliza el estado de autenticacion para que cualquier pantalla sepa
 * si hay una sesion activa sin volver a preguntarle a Supabase.
 */

const SesionContexto = createContext(null)

export function useSesion() {
  const valor = useContext(SesionContexto)
  if (!valor) {
    throw new Error('useSesion debe usarse dentro de SesionProvider')
  }
  return valor
}

export function SesionProvider({ children }) {
  const [sesion, setSesion] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    // RF-04. Supabase guarda la sesion en el navegador. Al abrir la aplicacion
    // la recuperamos, de modo que el usuario no tenga que entrar otra vez.
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      setCargando(false)
    })

    // Cualquier cambio posterior (entrar, salir, renovar el token) llega aqui.
    const { data } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSesion(nuevaSesion)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  const valor = {
    sesion,
    cargando,
    usuario: sesion ? sesion.user : null,

    // RF-01. El disparador de la base de datos siembra las categorias iniciales.
    // El nombre se guarda en los metadatos de la cuenta, no en una tabla
    registrar: (correo, clave, nombre) =>
      supabase.auth.signUp({
        email: correo,
        password: clave,
        options: nombre ? { data: { nombre } } : undefined,
      }),

    // RF-02
    iniciar: (correo, clave) =>
      supabase.auth.signInWithPassword({ email: correo, password: clave }),

    // RF-05
    recuperar: (correo) =>
      supabase.auth.resetPasswordForEmail(correo, {
        redirectTo: window.location.origin,
      }),

    // RF-03
    cerrar: () => supabase.auth.signOut(),

    // Nombre y meta de ahorro: metadatos de la cuenta en el servicio de
    // autenticación. Al guardar, la sesión llega actualizada por onAuthStateChange.
    actualizarPerfil: async (datos) => {
      const { data, error } = await supabase.auth.updateUser({ data: datos })
      if (!error && data?.user) setSesion((s) => (s ? { ...s, user: data.user } : s))
      return { error }
    },
  }

  return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>
}
