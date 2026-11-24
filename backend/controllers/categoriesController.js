const { pool } = require('../config/db');

/**
 * Waste Categories Management Controller
 * Handles CRUD operations, category statistics, and foreign key integrity protection.
 */

// 1. Get all categories with assigned bin counts and collected waste metrics
const getAllCategories = async (req, res, next) => {
  try {
    const { search } = req.query;

    let query = `
      SELECT 
        wc.category_id,
        wc.category_name,
        wc.description,
        wc.created_at,
        COUNT(DISTINCT b.bin_id) AS total_bins,
        COALESCE(SUM(cr.collected_quantity_kg), 0) AS total_collected_kg
      FROM waste_categories wc
      LEFT JOIN bins b ON b.category_id = wc.category_id
      LEFT JOIN collection_records cr ON cr.bin_id = b.bin_id
      WHERE 1=1
    `;

    const params = [];

    if (search) {
      query += ` AND (wc.category_name LIKE ? OR wc.description LIKE ?)`;
      const searchParam = `%${search.trim()}%`;
      params.push(searchParam, searchParam);
    }

    query += ` GROUP BY wc.category_id ORDER BY wc.category_id ASC`;

    const [rows] = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get single category by ID
const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [categories] = await pool.query(`
      SELECT * FROM waste_categories WHERE category_id = ?
    `, [id]);

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Waste category with ID ${id} was not found.`
      });
    }

    // Fetch bins in this category
    const [bins] = await pool.query(`
      SELECT 
        b.bin_id,
        b.bin_code,
        b.capacity_kg,
        b.fill_level,
        b.status,
        l.area_name
      FROM bins b
      JOIN locations l ON b.location_id = l.location_id
      WHERE b.category_id = ?
      ORDER BY b.bin_id ASC
    `, [id]);

    return res.status(200).json({
      success: true,
      data: {
        ...categories[0],
        bins
      }
    });
  } catch (error) {
    next(error);
  }
};

// 3. Create a new waste category
const createCategory = async (req, res, next) => {
  try {
    const { category_name, description } = req.body;

    if (!category_name || !category_name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required.'
      });
    }

    const trimmedName = category_name.trim();

    // Check duplicate
    const [existing] = await pool.query('SELECT category_id FROM waste_categories WHERE category_name = ?', [trimmedName]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Category '${trimmedName}' already exists. Please choose a distinct name.`
      });
    }

    const [result] = await pool.query(`
      INSERT INTO waste_categories (category_name, description)
      VALUES (?, ?)
    `, [trimmedName, description ? description.trim() : null]);

    return res.status(201).json({
      success: true,
      message: 'Waste category created successfully.',
      data: {
        category_id: result.insertId,
        category_name: trimmedName,
        description
      }
    });
  } catch (error) {
    next(error);
  }
};

// 4. Update waste category
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category_name, description } = req.body;

    const [existing] = await pool.query('SELECT * FROM waste_categories WHERE category_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Category with ID ${id} was not found.`
      });
    }

    if (!category_name || !category_name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required.'
      });
    }

    const trimmedName = category_name.trim();

    if (trimmedName !== existing[0].category_name) {
      const [duplicate] = await pool.query('SELECT category_id FROM waste_categories WHERE category_name = ? AND category_id != ?', [trimmedName, id]);
      if (duplicate.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Category '${trimmedName}' already exists.`
        });
      }
    }

    await pool.query(`
      UPDATE waste_categories
      SET category_name = ?, description = ?
      WHERE category_id = ?
    `, [trimmedName, description !== undefined ? description : existing[0].description, id]);

    return res.status(200).json({
      success: true,
      message: 'Waste category updated successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// 5. Delete category with foreign key prevention
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT * FROM waste_categories WHERE category_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Category with ID ${id} was not found.`
      });
    }

    // Check if category is assigned to any bins
    const [bins] = await pool.query('SELECT COUNT(*) AS count FROM bins WHERE category_id = ?', [id]);
    if (bins[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete waste category '${existing[0].category_name}' because ${bins[0].count} active or existing bin(s) are assigned to it.`
      });
    }

    await pool.query('DELETE FROM waste_categories WHERE category_id = ?', [id]);

    return res.status(200).json({
      success: true,
      message: `Waste category '${existing[0].category_name}' deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};
