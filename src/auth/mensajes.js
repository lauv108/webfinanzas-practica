/*
 * Traducción de los errores de Supabase a mensajes en español.
 * RNF-08: el mensaje de credenciales inválidas es deliberadamente genérico,
 * para no revelar si un correo está registrado o no.
 */

export function traducirError(error) {
  if (!error) return null

  const texto = (error.message || '').toLowerCase()

  if (texto.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos.'
  }
  if (texto.includes('already registered') || texto.includes('already been registered')) {
    return 'Ese correo ya tiene una cuenta. Inicia sesión.'
  }
  if (texto.includes('password should be at least')) {
    return 'La contraseña debe tener al menos 8 caracteres.'
  }
  if (texto.includes('password should contain') || texto.includes('weak password') || texto.includes('weak_password')) {
    return 'La contraseña debe tener letras y números.'
  }
  if (texto.includes('unable to validate email') || texto.includes('invalid email')) {
    return 'El correo no tiene un formato válido.'
  }
  if (texto.includes('email not confirmed')) {
    return 'Debes confirmar tu correo antes de entrar. Revisa tu bandeja.'
  }
  if (texto.includes('rate limit') || texto.includes('too many')) {
    return 'Demasiados intentos. Espera un momento y vuelve a probar.'
  }
  if (texto.includes('failed to fetch') || texto.includes('network')) {
    return 'No hay conexión con el servidor. Revisa tu internet.'
  }

  return 'Ocurrió un error inesperado. Intenta de nuevo.'
}

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validarCorreo(correo) {
  if (!correo.trim()) return 'Escribe tu correo electrónico.'
  if (!FORMATO_CORREO.test(correo.trim())) return 'El correo no tiene un formato válido.'
  return null
}

export function validarClave(clave) {
  if (!clave) return 'Escribe una contraseña.'
  if (clave.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
  // Igual que la política del servidor: al menos una letra y un dígito
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(clave) || !/[0-9]/.test(clave)) {
    return 'La contraseña debe tener letras y números.'
  }
  return null
}
