import { Router } from 'express';
import { storage } from '../storage/storeage/database-storage.js';
import { authenticate } from '../auth.js';

const router = Router();

// GET /api/departamentos - Obtener todos los departamentos
router.get('/departamentos', authenticate, async (req, res) => {
  try {
    const departamentos = await storage.departamentos.findAll();
    res.json(departamentos);
  } catch (error) {
    console.error('Error fetching departamentos:', error);
    res.status(500).json({ error: 'Error al obtener departamentos' });
  }
});

// GET /api/departamentos/:id - Obtener un departamento por ID
router.get('/departamentos/:id', authenticate, async (req, res) => {
  try {
    const departamento = await storage.departamentos.findById(req.params.id as string);
    if (!departamento) {
      return res.status(404).json({ error: 'Departamento no encontrado' });
    }
    res.json(departamento);
  } catch (error) {
    console.error('Error fetching departamento:', error);
    res.status(500).json({ error: 'Error al obtener departamento' });
  }
});

// GET /api/municipios - Obtener municipios por departamento con paginación
router.get('/municipios', authenticate, async (req, res) => {
  try {
    const { departamentoId, page = '1', pageSize = '10', search } = req.query;
    
    if (!departamentoId) {
      return res.status(400).json({ error: 'Se requiere departamentoId' });
    }
    
    const result = await storage.municipios.findByDepartamentoPaginated(
      departamentoId as string,
      parseInt(page as string, 10),
      parseInt(pageSize as string, 10),
      search as string | undefined
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching municipios:', error);
    res.status(500).json({ error: 'Error al obtener municipios' });
  }
});

// GET /api/municipios/:id - Obtener un municipio por ID
router.get('/municipios/:id', authenticate, async (req, res) => {
  try {
    const municipio = await storage.municipios.findById(req.params.id as string);
    if (!municipio) {
      return res.status(404).json({ error: 'Municipio no encontrado' });
    }
    res.json(municipio);
  } catch (error) {
    console.error('Error fetching municipio:', error);
    res.status(500).json({ error: 'Error al obtener municipio' });
  }
});

export default router;
