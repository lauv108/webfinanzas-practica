/*
 * Política de tratamiento de datos personales (RNF-12).
 * Se redacta conforme a la Ley Estatutaria 1581 de 2012 y su decreto
 * reglamentario. Vive como datos para poder mostrarse en el acceso, antes de
 * crear la cuenta, y dentro de la aplicación.
 */

export const FECHA_POLITICA = '4 de noviembre de 2026'

export const CONTACTO_POLITICA = 'lauravelasquez108@gmail.com'

export const POLITICA = [
  {
    titulo: 'Responsable del tratamiento',
    parrafos: [
      'WebFinanzas es una aplicación desarrollada y operada por Laura Daniela Velásquez Marín. Las consultas y solicitudes sobre datos personales se atienden en el correo ' + CONTACTO_POLITICA + '.',
    ],
  },
  {
    titulo: 'Qué datos se tratan',
    parrafos: [
      'Datos de la cuenta: correo electrónico y contraseña. La contraseña se almacena cifrada por el servicio de autenticación y nunca es legible por la aplicación ni por su responsable.',
      'Datos financieros que la persona registra voluntariamente: movimientos (tipo, monto, fecha, categoría y descripción), categorías propias y topes de presupuesto.',
      'No se recogen datos de entidades bancarias, de ubicación, de contactos ni del dispositivo más allá de lo necesario para mantener la sesión abierta.',
    ],
  },
  {
    titulo: 'Finalidad',
    parrafos: [
      'Los datos se usan únicamente para prestar el servicio: autenticar a la persona, guardar sus movimientos, calcular su resumen mensual y el estado de sus topes, y mostrárselos solo a ella.',
      'No se usan para publicidad, no se venden ni se ceden a terceros, y no se construyen perfiles con ellos.',
    ],
  },
  {
    titulo: 'Quién puede ver los datos',
    parrafos: [
      'Solo la persona titular de la cuenta. El aislamiento entre cuentas se aplica en la base de datos mediante políticas a nivel de fila, de modo que una consulta de un usuario nunca alcanza las filas de otro, incluso si se hace por fuera de la aplicación.',
      'El proveedor de infraestructura (Supabase) aloja la base de datos y el servicio de autenticación y actúa como encargado del tratamiento. No accede a los datos para fines propios.',
    ],
  },
  {
    titulo: 'Derechos de la persona titular',
    parrafos: [
      'Conforme a la Ley 1581 de 2012, la persona puede conocer, actualizar, rectificar y suprimir sus datos, y revocar la autorización otorgada.',
      'Conocer y actualizar: desde la propia aplicación, en las secciones de movimientos y presupuesto.',
      'Obtener una copia: desde Perfil, con la opción Exportar mis datos, que descarga todos los datos de la cuenta en un archivo legible.',
      'Suprimir y revocar la autorización: desde Perfil, con la opción Eliminar mi cuenta. La eliminación borra la cuenta y todos sus datos de forma inmediata e irreversible.',
    ],
  },
  {
    titulo: 'Conservación',
    parrafos: [
      'Los datos se conservan mientras la cuenta exista. Al eliminarla, se borran en la misma operación. No se guardan copias con fines distintos a la prestación del servicio.',
    ],
  },
  {
    titulo: 'Seguridad',
    parrafos: [
      'Toda la comunicación entre el navegador y el servicio viaja cifrada. Las reglas de integridad y de acceso residen en la base de datos y no dependen de la interfaz. La aplicación no muestra al usuario detalles internos del sistema en sus mensajes de error.',
    ],
  },
  {
    titulo: 'Autorización',
    parrafos: [
      'Al crear la cuenta la persona autoriza de forma previa, expresa e informada este tratamiento. Puede revocarlo en cualquier momento eliminando la cuenta.',
    ],
  },
]
