-- migrations/0067_add_tipo_documento.sql
-- Agrega campo tipo_documento para categorizar documentos como PROCESAL o PROBATORIO

ALTER TABLE documentos
  ADD COLUMN tipo_documento VARCHAR(20) NOT NULL DEFAULT 'PROCESAL' COMMENT 'Tipo de documento: PROCESAL o PROBATORIO';