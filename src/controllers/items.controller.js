import {
  findAllItems,
  findItemById,
  insertItem,
  updateItemById,
  deleteItemById
} from '../services/items.service.js';
import { findClientById } from '../services/clients.service.js';
import { ObjectId } from 'mongodb';

const VALID_CATEGORIES = ['Parrilla', 'Entrantes', 'Guarniciones', 'Bebidas', 'Postres'];

const URL_REGEX = /^(https?:\/\/.+|\/[^\s].*)$/;

export const getAllItems = async (req, res) => {
  try {
    const { category, name, clientId } = req.query;

    let categories = [];
    if (category) {
      categories = Array.isArray(category) ? category : [category];

      categories = categories.filter(c => c && c.trim() !== '');
    }

    const items = await findAllItems({ categories, name, clientId });

    res.status(200).json({
      success: true,
      total: items.length,
      filters: {
        categories: categories.length > 0 ? categories : 'todas',
        name: name || null,
        clientId: clientId || null
      },
      data: items
    });
  } catch (error) {
    console.error('Error en getAllItems:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getItemById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: 'El ID es obligatorio' });
    }

    const item = await findItemById(id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item no encontrado' });
    }

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    console.error('Error en getItemById:', error.message);
    const status = error.message === 'ID inválido' ? 400 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

export const createItem = async (req, res) => {
  try {
    const { name, description, category, image, link, clientId } = req.body;

    const errors = {};

    if (!name || !name.trim()) {
      errors.name = 'El nombre es obligatorio';
    } else if (name.trim().length < 2) {
      errors.name = 'El nombre debe tener al menos 2 caracteres';
    } else if (name.trim().length > 100) {
      errors.name = 'El nombre no puede superar los 100 caracteres';
    }

    if (!description || !description.trim()) {
      errors.description = 'La descripción es obligatoria';
    } else if (description.trim().length < 10) {
      errors.description = 'La descripción debe tener al menos 10 caracteres';
    } else if (description.trim().length > 500) {
      errors.description = 'La descripción no puede superar los 500 caracteres';
    }

    if (!category || !category.trim()) {
      errors.category = 'La categoría es obligatoria';
    } else if (!VALID_CATEGORIES.includes(category.trim())) {
      errors.category = `La categoría debe ser una de: ${VALID_CATEGORIES.join(', ')}`;
    }

    if (!image || !image.trim()) {
      errors.image = 'La imagen es obligatoria';
    } else if (!URL_REGEX.test(image.trim())) {
      errors.image = 'La imagen debe ser una URL válida (https://...) o una ruta relativa (/images/...)';
    }

    if (!link || !link.trim()) {
      errors.link = 'El link es obligatorio';
    } else if (link.trim() !== '#menu' && !URL_REGEX.test(link.trim()) && !link.trim().startsWith('#')) {
      errors.link = 'El link debe ser una URL válida, una ruta relativa o un ancla (#sección)';
    }

    if (!clientId || !clientId.trim()) {
      errors.clientId = 'El clientId es obligatorio. Todo producto debe pertenecer a un cliente';
    } else if (!ObjectId.isValid(clientId.trim())) {
      errors.clientId = 'El clientId no tiene un formato válido de MongoDB ObjectId';
    } else {

      const clientExists = await findClientById(clientId.trim());
      if (!clientExists) {
        errors.clientId = `No existe un cliente con el ID ${clientId.trim()}`;
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors
      });
    }

    const newItem = {
      name:        name.trim(),
      description: description.trim(),
      category:    category.trim(),
      image:       image.trim(),
      link:        link.trim(),
      clientId:    clientId.trim()
    };

    const created = await insertItem(newItem);

    res.status(201).json({
      success: true,
      message: `Item "${created.name}" creado correctamente`,
      data: created
    });

  } catch (error) {
    console.error('Error en createItem:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'El ID es obligatorio' });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No se enviaron datos para actualizar' });
    }

    const errors = {};

    if (updates.name !== undefined) {
      if (!updates.name.trim()) errors.name = 'El nombre no puede estar vacío';
      else if (updates.name.trim().length < 2) errors.name = 'El nombre debe tener al menos 2 caracteres';
      else if (updates.name.trim().length > 100) errors.name = 'El nombre no puede superar 100 caracteres';
    }

    if (updates.description !== undefined && updates.description.trim().length < 10) {
      errors.description = 'La descripción debe tener al menos 10 caracteres';
    }

    if (updates.category !== undefined && !VALID_CATEGORIES.includes(updates.category.trim())) {
      errors.category = `La categoría debe ser una de: ${VALID_CATEGORIES.join(', ')}`;
    }

    if (updates.image !== undefined && updates.image.trim() && !URL_REGEX.test(updates.image.trim())) {
      errors.image = 'La imagen debe ser una URL válida o una ruta relativa';
    }

    if (updates.clientId !== undefined && updates.clientId !== null) {
      if (!ObjectId.isValid(updates.clientId)) {
        errors.clientId = 'El clientId no tiene un formato válido';
      } else {
        const clientExists = await findClientById(updates.clientId);
        if (!clientExists) errors.clientId = 'El cliente especificado no existe';
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, message: 'Errores de validación', errors });
    }

    const updated = await updateItemById(id, updates);

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Item no encontrado' });
    }

    res.status(200).json({ success: true, data: updated });

  } catch (error) {
    console.error('Error en updateItem:', error.message);
    const status = error.message === 'ID inválido' ? 400 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: 'El ID es obligatorio' });
    }

    const result = await deleteItemById(id);

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Item no encontrado' });
    }

    res.status(200).json({ success: true, message: 'Item eliminado correctamente' });

  } catch (error) {
    console.error('Error en deleteItem:', error.message);
    const status = error.message === 'ID inválido' ? 400 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};