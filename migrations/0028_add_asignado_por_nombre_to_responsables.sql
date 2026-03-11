-- Fix proceso_responsables: drop broken FK on asignado_por (referenced lawyer_profiles but stored user.id)
-- Add asignado_por_nombre to store display name directly

ALTER TABLE proceso_responsables
  DROP FOREIGN KEY fk_proceso_responsables_asignado_por;

ALTER TABLE proceso_responsables
  ADD COLUMN asignado_por_nombre VARCHAR(255) NULL AFTER asignado_por;
