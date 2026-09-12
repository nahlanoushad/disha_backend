import * as categoryService from '../services/categoryService.js';

/**
 * @desc    Get all categories
 * @route   GET /api/categories
 * @access  Public
 */
export const getAllCategories = async (req, res, next) => {
  try {
    let { search, status, page, limit } = req.query;

    if (search) {
      search = search.trim();
    }

    if (status && !['active', 'inactive', 'all'].includes(status)) {
      const error = new Error('Invalid status filter');
      error.statusCode = 400;
      return next(error);
    }

    let parsedPage = parseInt(page);
    let parsedLimit = parseInt(limit);

    if (page !== undefined && (isNaN(parsedPage) || parsedPage < 1)) {
      const error = new Error('Invalid page number');
      error.statusCode = 400;
      return next(error);
    }

    if (limit !== undefined && (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100)) {
      const error = new Error('Invalid limit number');
      error.statusCode = 400;
      return next(error);
    }

    const { categories, pagination } = await categoryService.getAllCategories({
      search,
      status,
      page: parsedPage || 1,
      limit: parsedLimit || 10
    });

    res.status(200).json({
      status: 'success',
      results: categories.length,
      data: {
        categories
      },
      pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get category by ID
 * @route   GET /api/categories/:id
 * @access  Public
 */
export const getCategoryById = async (req, res, next) => {
  try {
    const category = await categoryService.getCategoryById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: {
        category
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new category
 * @route   POST /api/categories
 * @access  Private/Admin
 */
export const createCategory = async (req, res, next) => {
  try {
    const category = await categoryService.createCategory(req.body);
    res.status(201).json({
      status: 'success',
      message: 'Category created successfully',
      data: {
        category
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      error.statusCode = 400;
    }
    // Handle mongoose unique constraint error if it bypassed service layer checks somehow
    if (error.code === 11000) {
      error.statusCode = 409;
      error.message = `Category with name "${req.body.name}" already exists`;
    }
    next(error);
  }
};

/**
 * @desc    Update a category
 * @route   PUT /api/categories/:id
 * @route   PATCH /api/categories/:id
 * @access  Private/Admin
 */
export const updateCategory = async (req, res, next) => {
  try {
    const category = await categoryService.updateCategory(req.params.id, req.body);
    res.status(200).json({
      status: 'success',
      message: 'Category updated successfully',
      data: {
        category
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      error.statusCode = 400;
    }
    next(error);
  }
};

/**
 * @desc    Delete a category
 * @route   DELETE /api/categories/:id
 * @access  Private/Admin
 */
export const deleteCategory = async (req, res, next) => {
  try {
    await categoryService.deleteCategory(req.params.id);
    res.status(200).json({
      status: 'success',
      message: 'Category deleted successfully',
      data: null
    });
  } catch (error) {
    next(error);
  }
};
