import Category from '../models/Category.js';
import AppError from '../utils/appError.js';
import mongoose from 'mongoose';

/**
 * Retrieve all categories, optionally filtered by query
 * @param {Object} query - Query parameters
 * @returns {Promise<Array>} List of categories
 */
export const getAllCategories = async (query = {}) => {
  const filter = {};
  
  if (query.status && query.status !== 'all') {
    filter.status = query.status;
  }
  
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } }
    ];
  }

  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;

  const [categories, totalItems] = await Promise.all([
    Category.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    Category.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return {
    categories,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages
    }
  };
};

/**
 * Retrieve a single category by ID
 * @param {string} id - Category ObjectId
 * @returns {Promise<Object>} Category document
 */
export const getCategoryById = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError('Invalid category ID format', 400);
  }

  const category = await Category.findById(id);
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  return category;
};

/**
 * Create a new category
 * @param {Object} categoryData - Category data
 * @returns {Promise<Object>} Created category document
 */
export const createCategory = async (categoryData) => {
  let { name, description, status } = categoryData;
  
  if (!name || name.trim() === '') {
    throw new AppError('Category name is required', 400);
  }
  
  name = name.trim();
  
  // Check for duplicate name (case-insensitive)
  const existingCategory = await Category.findOne({
    name: { $regex: new RegExp(`^${name}$`, 'i') }
  });
  
  if (existingCategory) {
    throw new AppError(`Category with name "${name}" already exists`, 409);
  }

  return await Category.create({ name, description, status });
};

/**
 * Update an existing category
 * @param {string} id - Category ObjectId
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated category document
 */
export const updateCategory = async (id, updateData) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError('Invalid category ID format', 400);
  }

  const category = await Category.findById(id);
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  if (updateData.name !== undefined) {
    let name = updateData.name.trim();
    if (name === '') {
      throw new AppError('Category name is required', 400);
    }
    
    // Check if another category has the same name
    const existingCategory = await Category.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });
    
    if (existingCategory) {
      throw new AppError(`Category with name "${name}" already exists`, 409);
    }
    
    category.name = name;
  }

  if (updateData.description !== undefined) {
    category.description = updateData.description.trim();
  }
  
  if (updateData.status !== undefined) {
    category.status = updateData.status;
  }

  await category.save();
  return category;
};

/**
 * Delete a category
 * @param {string} id - Category ObjectId
 * @returns {Promise<Object>} Deleted category document
 */
export const deleteCategory = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError('Invalid category ID format', 400);
  }

  const category = await Category.findByIdAndDelete(id);
  
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  return category;
};
