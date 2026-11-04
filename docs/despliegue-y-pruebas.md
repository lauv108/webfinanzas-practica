# Despliegue y pruebas de aceptación

## Antes de publicar (bloqueante)

Estas dos acciones viven en el panel de Supabase y condicionan la publicación.

1. **Authentication → Sign In / Providers → Email**: activar **Confirm email**.
   Desde el 21 de octubre está apagado para desarrollar; apagado permite crear
   cuentas con correos que no existen.
2. **Authentication → Sign In / Providers → Email**: **Minimum password length**
   en 8 y **Password requirements** en letras y dígitos. Dejar apagados *Secure
   password change* y *Require current password when updating*: la pantalla de
   Perfil no pide la contraseña actual y la sesión dura más de 24 horas, así que
   encenderlos rompe el cambio de contraseña. *Prevent use of leaked passwords*
   solo existe en el plan Pro; en el plan gratuito queda como riesgo aceptado,
   mitigado por longitud mínima y complejidad.
3. **SQL Editor**: ejecutar `webfinanzas_eliminacion-cuenta_v1.sql` (habilita
   la eliminación de cuenta desde Perfil) y después
   `webfinanzas_verificacion-seguridad_v1.sql` (comprueba el estado de las
   políticas de acceso). Guardar la salida como evidencia.

## Publicar en Vercel

1. Entrar a vercel.com e iniciar sesión con la cuenta de GitHub.
2. **Add New → Project** e importar el repositorio `webfinanzas-practica`.
3. Framework: Vite (lo detecta solo). Build: `npm run build`. Output: `dist`.
4. **Environment Variables**, antes del primer despliegue:
   - `VITE_SUPABASE_URL` = la URL del proyecto
   - `VITE_SUPABASE_ANON_KEY` = la llave **publicable** (`sb_publishable_...`)

   Sin estas variables el sitio compila pero queda en blanco: la comprobación de
   arranque elimina toda la aplicación como código inalcanzable. Nunca poner la
   llave secreta.
5. **Deploy**. Anotar la URL resultante.
6. En Supabase, **Authentication → URL Configuration**: poner la URL del sitio
   en **Site URL** y añadirla a **Redirect URLs**. Sin esto los enlaces de
   recuperación de contraseña apuntan a localhost.

`vercel.json` ya lleva los encabezados de seguridad. En Netlify el equivalente
es `public/_headers`, y los pasos son los mismos con **Add new site → Import**.

## Verificar los encabezados (después de publicar)

```bash
curl -sI https://<tu-sitio>/ | grep -iE "content-security|strict-transport|x-frame|x-content|referrer|permissions"
```

Deben aparecer los seis. Si no, el archivo de configuración no se aplicó.

## Pruebas de aceptación sobre el sitio publicado

Se ejecutan con una cuenta recién creada, en el navegador, sobre la URL
publicada. Anotar el resultado y la fecha en cada fila.

| ID | Prueba | Resultado esperado |
|---|---|---|
| RF-01 | Registrarse con correo inválido, luego con contraseña de 5 caracteres, luego sin aceptar la política | Tres errores distintos, ninguna cuenta creada |
| RF-01 | Registrarse correctamente con correo real | Llega correo de confirmación; sin confirmar no se puede entrar |
| RF-06 | Entrar tras confirmar | Perfil muestra 6 categorías de gasto y 2 de ingreso |
| RF-02 | Salir y entrar con contraseña incorrecta | Mensaje genérico, sin revelar si el correo existe |
| RF-04 | Entrar, cerrar el navegador, volver a abrir el sitio | Entra sin pedir credenciales |
| RF-05 | Olvidé mi contraseña con el correo real | Llega el enlace; la contraseña nueva funciona |
| RF-08 / RF-09 | Nueva transacción con monto 0, fecha de mañana y descripción vacía | Tres errores; nada se guarda |
| RF-08 | Nueva transacción válida de gasto y otra de ingreso | Aparecen en Movimientos y en Resumen |
| RF-07 | Crear categoría propia desde el formulario | Queda disponible y asignada al movimiento |
| RF-10 | Doble clic rápido en Guardar | Un solo registro |
| RF-11 | Editar el monto de un movimiento | Resumen y Movimientos cambian |
| RF-12 | Borrar un movimiento | Pide confirmación con el detalle; desaparece al confirmar |
| RF-13 / RF-14 | Buscar por texto, filtrar por tipo y por categoría | La lista se reduce y el contador lo refleja |
| RF-15 | Definir un tope menor que lo ya gastado en una categoría | Tarjeta en rojo, "Excedido" |
| RF-16 / RF-17 | Subir el tope hasta superar el gasto por poco | Pasa a amarillo (90-99 %) y luego a verde |
| RF-15 | Intentar un segundo tope para la misma categoría | La categoría no aparece disponible |
| RF-18 | Editar y luego borrar el tope | El movimiento no se toca |
| RF-19 / RF-20 | Cambiar de mes en Resumen | Totales, gráfico y desglose cambian; mes futuro deshabilitado |
| RF-21 / RF-22 | Resumen con gastos en varias categorías | Anillo y tabla coinciden en porcentajes |
| RNF-13 | Perfil → Exportar mis datos | Descarga un JSON con cuenta, categorías, movimientos y topes |
| RNF-12 | Perfil → Leer la política | Se muestra completa; también desde el registro |
| RNF-09 | Entrar con una segunda cuenta | No ve nada de la primera |
| RNF-13 | Perfil → Eliminar mi cuenta, escribiendo el correo | Cierra sesión; no se puede volver a entrar |
| RNF-05 | Abrir el sitio en un móvil o con el navegador a 360 px | Barra inferior; sin desplazamiento horizontal |
| RNF-10 | Candado en la barra del navegador | HTTPS válido |
