import { getDB } from '../config/db.js';
import { ObjectId } from 'mongodb';

const COLLECTION = 'items';

export const findAllItems = async (filters = {}) => {
    const db = getDB();
    const query = {};

    if (filters.categories && filters.categories.length > 0) {
        if (filters.categories.length === 1) {
        query.category = { $regex: filters.categories[0].trim(), $options: 'i' };
        } else {
        query.category = { $in: filters.categories.map(c => c.trim()) };
        }
    }

    if (filters.name && filters.name.trim() !== '') {
        query.name = { $regex: filters.name.trim(), $options: 'i' };
    }

    if (filters.clientId && ObjectId.isValid(filters.clientId)) {
        query.clientId = new ObjectId(filters.clientId);
    }

    return await db.collection(COLLECTION).find(query).toArray();
};

export const findItemById = async (id) => {
    const db = getDB();

    if (!ObjectId.isValid(id)) {
        throw new Error('ID inválido');
    }

    return await db.collection(COLLECTION).findOne({ _id: new ObjectId(id) });
};

export const insertItem = async (item) => {
    const db = getDB();

    const newItem = {
        ...item,
        clientId: item.clientId ? new ObjectId(item.clientId) : null,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const result = await db.collection(COLLECTION).insertOne(newItem);
    return { ...newItem, _id: result.insertedId };
};

export const updateItemById = async (id, updates) => {
    const db = getDB();

    if (!ObjectId.isValid(id)) {
        throw new Error('ID inválido');
    }

    const updateData = { ...updates, updatedAt: new Date() };

    delete updateData._id;
    delete updateData.createdAt;

    if (updateData.clientId && typeof updateData.clientId === 'string') {
        if (!ObjectId.isValid(updateData.clientId)) {
        throw new Error('clientId inválido');
        }
        updateData.clientId = new ObjectId(updateData.clientId);
    }

    const result = await db.collection(COLLECTION).findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
    );

    return result;
};

export const deleteItemById = async (id) => {
    const db = getDB();

    if (!ObjectId.isValid(id)) {
        throw new Error('ID inválido');
    }

    const result = await db.collection(COLLECTION).deleteOne({
        _id: new ObjectId(id)
    });

    return result;
};