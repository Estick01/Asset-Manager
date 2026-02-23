-- ================================
-- INDICES PROCESOS
-- ================================

ALTER TABLE procesos
ADD INDEX idx_procesos_abogado_estado_fecha (abogado_Id, estado_Id, fechaCreacion);

-- ================================
-- INDICES CLIENTES
-- ================================

ALTER TABLE clientes
ADD INDEX idx_clientes_abogado_nombre (abogado_Id, nombre);

-- ================================
-- INDICES ACTUALIZACIONES
-- ================================

ALTER TABLE actualizaciones
ADD INDEX idx_actualizaciones_proceso_fecha (proceso_Id, fecha);


CREATE INDEX idx_clientes_abogado
ON clientes (abogado_id);

CREATE INDEX idx_clientes_abogado_fecha
ON clientes (abogado_id, fecha_creacion);

CREATE INDEX idx_clientes_abogado_fecha
ON clientes (abogado_id, fecha_creacion);

CREATE INDEX idx_clientes_correo
ON clientes (correo(100));

ALTER TABLE clientes
MODIFY documento VARCHAR(50) NOT NULL;

CREATE INDEX idx_clientes_panel
ON clientes (abogado_id, activo, fecha_creacion);

CREATE INDEX idx_clientes_nombre
ON clientes (nombre(100));