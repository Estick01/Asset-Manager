ALTER TABLE `firm_settings`
  ADD COLUMN `notif_mensajes` boolean NOT NULL DEFAULT true,
  ADD COLUMN `notif_vencimientos` boolean NOT NULL DEFAULT true,
  ADD COLUMN `notif_cambios_procesos` boolean NOT NULL DEFAULT true,
  ADD COLUMN `notif_equipo_invitaciones` boolean NOT NULL DEFAULT true,
  ADD COLUMN `notif_alertas_plan` boolean NOT NULL DEFAULT true,
  ADD COLUMN `notif_resumen_semanal` boolean NOT NULL DEFAULT false;
