-- Add rol_id and plan_id to users table
ALTER TABLE `users` ADD COLUMN `rol_id` INT NULL;
ALTER TABLE `users` ADD COLUMN `plan_id` VARCHAR(36) NULL;

-- Add foreign key constraints
ALTER TABLE `users` ADD CONSTRAINT `users_rol_id_fkey` FOREIGN KEY (`rol_id`) REFERENCES `roles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `users` ADD CONSTRAINT `users_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `planes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Copy existing rol_id from lawyer_profiles, firm_profiles, client_profiles to users
-- This assumes the profiles already have the correct rol based on their type
UPDATE users u
INNER JOIN lawyer_profiles lp ON u.id = lp.user_id
SET u.rol_id = 2; -- 'abogado' role

UPDATE users u
INNER JOIN firm_profiles fp ON u.id = fp.user_id
SET u.rol_id = 3; -- 'bufete' role (if it exists)

UPDATE users u
INNER JOIN client_profiles cp ON u.id = cp.user_id
SET u.rol_id = 1; -- 'cliente' role (if it exists)

-- Copy plan_id from profiles to users
UPDATE users u
INNER JOIN lawyer_profiles lp ON u.id = lp.user_id
SET u.plan_id = lp.plan_id;

UPDATE users u
INNER JOIN firm_profiles fp ON u.id = fp.user_id
SET u.plan_id = fp.plan_id;
