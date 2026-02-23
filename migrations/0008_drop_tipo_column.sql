-- Drop tipo column from actualizaciones table (now using tipoId with lookup)
ALTER TABLE actualizaciones DROP COLUMN tipo;
