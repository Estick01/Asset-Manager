-- Add responsable_id to procesos table
-- A proceso can have exactly one responsable (a lawyer from the firm)
-- Only bufete can assign/change the responsable

ALTER TABLE `procesos`
  ADD COLUMN `responsable_id` varchar(36) NULL,
  ADD CONSTRAINT `procesos_responsable_id_fk`
    FOREIGN KEY (`responsable_id`) REFERENCES `lawyer_profiles`(`id`)
    ON DELETE SET NULL;
