-- Add tipo column to actualizaciones table to store tipo as string (e.g., "manual", "automatico")
ALTER TABLE actualizaciones ADD COLUMN tipo VARCHAR(50);
