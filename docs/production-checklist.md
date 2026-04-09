# Checklist de Produccion V1

## 1. Identidad de la App

- Definir `ios.bundleIdentifier` real en `app.json`.
- Definir `android.package` real en `app.json`.
- Confirmar que `scheme` quede en `procesoclaro`.
- Verificar icono, splash y nombre final de la app.

## 2. Variables de Entorno

- Configurar `DATABASE_URL` de produccion.
- Configurar `JWT_SECRET` real con longitud segura.
- Configurar `REDIS_URL` de produccion.
- Configurar `APP_URL`.
- Configurar `EXPO_PUBLIC_API_URL`.
- Configurar `PRODUCTION_API_URL`.
- Configurar `CORS_ALLOWED_ORIGINS`.
- Confirmar dominio final `https://procesoclaro.co`.
- Confirmar API final `https://api.procesoclaro.co`.
- Confirmar `RUN_STARTUP_SEEDS=false` en produccion.
- Cambiar Wompi a `https://production.wompi.co/v1`.
- Configurar `WOMPI_REDIRECT_URL` con dominio real.
- Configurar `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_BUCKET_NAME`.
- Configurar `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.

## 3. Base de Datos y Seeds

- Ejecutar `npm run db:migrate` contra la base de datos productiva.
- Definir si los datos base se cargan con script dedicado o proceso manual controlado.
- Confirmar que no se dependan seeds automaticos al arrancar el backend.
- Validar tablas de sesiones, OTP, pagos, suscripciones y auditoria.
- Confirmar politica de backup y restore de MySQL.

## 4. Infraestructura

- Definir hosting del backend.
- Definir hosting del frontend web si aplica.
- Configurar dominio y SSL.
- Configurar Redis persistente o administrado.
- Configurar bucket S3 productivo y permisos minimos necesarios.
- Confirmar reglas de firewall o security groups.
- Confirmar reinicio controlado del proceso Node.

## 5. Seguridad

- Confirmar cookies seguras bajo HTTPS.
- Confirmar `trust proxy` correcto detras de Nginx o Cloudflare.
- Revisar lista final de dominios CORS permitidos.
- Verificar secretos fuera del repositorio.
- Verificar webhook de Wompi con `WOMPI_EVENTS_SECRET` real.
- Revisar si reCAPTCHA se activara en produccion.

## 6. Verificaciones Tecnicas

- Ejecutar `npm run lint`.
- Ejecutar `npm run server:build`.
- Ejecutar `npm run expo:static:build` si se publica web.
- Validar arranque del backend con variables reales.
- Validar endpoint `GET /health`.

## 7. Smoke Tests Funcionales

- Login exitoso.
- Refresh de sesion.
- Logout.
- Recuperacion de contraseña.
- Registro y verificacion de correo.
- Carga y consulta de documentos.
- Chat por WebSocket.
- Notificaciones in-app.
- Pago aprobado por Wompi.
- Pago rechazado por Wompi.
- Activacion y vencimiento de suscripcion.

## 8. Observabilidad

- Confirmar logs del backend accesibles en produccion.
- Definir herramienta de monitoreo o captura de errores.
- Confirmar como se revisan errores de cron, webhook y websocket.
- Definir responsable de revisar salud del sistema el dia del release.

## 9. Go-Live

- Hacer deploy en ventana controlada.
- Ejecutar smoke test post-deploy.
- Confirmar conectividad a MySQL, Redis, S3 y SMTP.
- Confirmar pagos y webhooks.
- Tener rollback definido.

## Pendientes del Repo

- Reemplazar `com.myapp` en `app.json`.
- Definir si `ios.bundleIdentifier` y `android.package` usarán namespace `co.procesoclaro`.
- Correr checks reales fuera del sandbox actual.
- Revisar si se quiere reducir mas logging informativo antes del release.
