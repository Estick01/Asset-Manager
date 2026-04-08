UPDATE `personas`
SET `documento` = TRIM(`documento`)
WHERE `documento` IS NOT NULL;
--> statement-breakpoint

UPDATE `lawyer_profiles`
SET `license_number` = NULLIF(TRIM(`license_number`), '')
WHERE `license_number` IS NOT NULL;
--> statement-breakpoint

UPDATE `firm_profiles`
SET `nit` = TRIM(`nit`)
WHERE `nit` IS NOT NULL;
--> statement-breakpoint

UPDATE `clientes_empresa`
SET `nit` = TRIM(`nit`)
WHERE `nit` IS NOT NULL;
--> statement-breakpoint

ALTER TABLE `personas`
  ADD CONSTRAINT `personas_documento_unique` UNIQUE (`documento`);
--> statement-breakpoint

ALTER TABLE `lawyer_profiles`
  ADD CONSTRAINT `lawyer_profiles_license_number_unique` UNIQUE (`license_number`);
--> statement-breakpoint

ALTER TABLE `firm_profiles`
  ADD CONSTRAINT `firm_profiles_nit_unique` UNIQUE (`nit`);
--> statement-breakpoint

ALTER TABLE `clientes_empresa`
  ADD CONSTRAINT `clientes_empresa_nit_unique` UNIQUE (`nit`);
