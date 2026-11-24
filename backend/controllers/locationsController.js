const { pool } = require('../config/db');

/**
 * Locations Management Controller
 * Handles CRUD operations, searching, bin count aggregation, and referential integrity checks.
 */

// 1. Get all locations with bin counts and active bins count
const getAllLocations = async (req, res, next) => {
  try {
    const { search } = req.query;

    let query = `
      SELECT 
        l.location_id,
        l.area_name,
        l.street,
        l.city,
        l.pincode,
        l.description,
        l.created_at,
        COUNT(b.bin_id) AS total_bins,
        SUM(CASE WHEN b.status = 'Active' THEN 1 ELSE 0 END) AS active_bins,
        (SELECT COUNT(*) FROM schedules s WHERE s.location_id = l.location_id) AS total_schedules
      FROM locations l
      LEFT JOIN bins b ON b.location_id = l.location_id
      WHERE 1=1
    `;

    const params = [];

    if (search) {
      query += ` AND (l.area_name LIKE ? OR l.street LIKE ? OR l.city LIKE ? OR l.pincode LIKE ?)`;
      const searchParam = `%${search.trim()}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    query += ` GROUP BY l.location_id ORDER BY l.location_id DESC`;

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

// 2. Get single location by ID with all its bins
const getLocationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [locations] = await pool.query(`
      SELECT * FROM locations WHERE location_id = ?
    `, [id]);

    if (locations.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Location with ID ${id} was not found.`
      });
    }

    // Fetch bins at this location
    const [bins] = await pool.query(`
      SELECT 
        b.bin_id,
        b.bin_code,
        b.capacity_kg,
        b.fill_level,
        b.status,
        wc.category_name
      FROM bins b
      JOIN waste_categories wc ON b.category_id = wc.category_id
      WHERE b.location_id = ?
      ORDER BY b.bin_id ASC
    `, [id]);

    return res.status(200).json({
      success: true,
      data: {
        ...locations[0],
        bins
      }
    });
  } catch (error) {
    next(error);
  }
};

// 3. Create a new location
const createLocation = async (req, res, next) => {
  try {
    const { area_name, street, city, pincode, description } = req.body;

    if (!area_name || !street || !city || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'Area name, street, city, and pincode are required fields.'
      });
    }

    const [result] = await pool.query(`
      INSERT INTO locations (area_name, street, city, pincode, description)
      VALUES (?, ?, ?, ?, ?)
    `, [area_name.trim(), street.trim(), city.trim(), pincode.trim(), description ? description.trim() : null]);

    return res.status(201).json({
      success: true,
      message: 'Location added successfully.',
      data: {
        location_id: result.insertId,
        area_name,
        street,
        city,
        pincode,
        description
      }
    });
  } catch (error) {
    next(error);
  }
};

// 4. Update location
const updateLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { area_name, street, city, pincode, description } = req.body;

    const [existing] = await pool.query('SELECT * FROM locations WHERE location_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Location with ID ${id} was not found.`
      });
    }

    if (!area_name || !street || !city || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'Area name, street, city, and pincode are required.'
      });
    }

    await pool.query(`
      UPDATE locations
      SET area_name = ?, street = ?, city = ?, pincode = ?, description = ?
      WHERE location_id = ?
    `, [area_name.trim(), street.trim(), city.trim(), pincode.trim(), description !== undefined ? description : existing[0].description, id]);

    return res.status(200).json({
      success: true,
      message: 'Location updated successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// 5. Delete location with referential integrity prevention
const deleteLocation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT * FROM locations WHERE location_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Location with ID ${id} was not found.`
      });
    }

    // Check if location is referenced by any bins
    const [bins] = await pool.query('SELECT COUNT(*) AS count FROM bins WHERE location_id = ?', [id]);
    if (bins[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete location '${existing[0].area_name}' because it contains ${bins[0].count} bin(s). Reassign or delete those bins first.`
      });
    }

    // Check if location is referenced by any schedules
    const [schedules] = await pool.query('SELECT COUNT(*) AS count FROM schedules WHERE location_id = ?', [id]);
    if (schedules[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete location '${existing[0].area_name}' because it is linked to ${schedules[0].count} collection schedule(s).`
      });
    }

    await pool.query('DELETE FROM locations WHERE location_id = ?', [id]);

    return res.status(200).json({
      success: true,
      message: `Location '${existing[0].area_name}' deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation
};
