const { pool } = require('../config/db');

/**
 * Bins Management Controller
 * Handles CRUD operations, searching, filtering, and referential validation.
 */

// 1. Get all bins with joins, filters and search
const getAllBins = async (req, res, next) => {
  try {
    const { location_id, category_id, status, search } = req.query;

    let query = `
      SELECT 
        b.bin_id,
        b.bin_code,
        b.location_id,
        b.category_id,
        b.capacity_kg,
        b.fill_level,
        b.status,
        b.created_at,
        b.updated_at,
        l.area_name,
        l.street,
        l.city,
        l.pincode,
        wc.category_name,
        (SELECT COUNT(*) FROM collection_records cr WHERE cr.bin_id = b.bin_id) AS total_collections,
        (SELECT COALESCE(SUM(cr.collected_quantity_kg), 0) FROM collection_records cr WHERE cr.bin_id = b.bin_id) AS total_collected_kg
      FROM bins b
      JOIN locations l ON b.location_id = l.location_id
      JOIN waste_categories wc ON b.category_id = wc.category_id
      WHERE 1=1
    `;

    const params = [];

    if (location_id) {
      query += ` AND b.location_id = ?`;
      params.push(location_id);
    }

    if (category_id) {
      query += ` AND b.category_id = ?`;
      params.push(category_id);
    }

    if (status) {
      query += ` AND b.status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (b.bin_code LIKE ? OR l.area_name LIKE ? OR wc.category_name LIKE ?)`;
      const searchParam = `%${search.trim()}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    query += ` ORDER BY b.bin_id DESC`;

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

// 2. Get single bin by ID with its collection history
const getBinById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [bins] = await pool.query(`
      SELECT 
        b.bin_id,
        b.bin_code,
        b.location_id,
        b.category_id,
        b.capacity_kg,
        b.fill_level,
        b.status,
        b.created_at,
        b.updated_at,
        l.area_name,
        l.street,
        l.city,
        l.pincode,
        wc.category_name,
        wc.description AS category_description
      FROM bins b
      JOIN locations l ON b.location_id = l.location_id
      JOIN waste_categories wc ON b.category_id = wc.category_id
      WHERE b.bin_id = ?
    `, [id]);

    if (bins.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Bin with ID ${id} was not found.`
      });
    }

    // Fetch last 10 collection history for this bin
    const [history] = await pool.query(`
      SELECT 
        cr.record_id,
        cr.collected_quantity_kg,
        DATE_FORMAT(cr.collection_datetime, '%Y-%m-%d %H:%i') AS collection_datetime,
        cr.remarks,
        t.team_name,
        cr.schedule_id
      FROM collection_records cr
      JOIN teams t ON cr.team_id = t.team_id
      WHERE cr.bin_id = ?
      ORDER BY cr.collection_datetime DESC
      LIMIT 10
    `, [id]);

    return res.status(200).json({
      success: true,
      data: {
        ...bins[0],
        collectionHistory: history
      }
    });
  } catch (error) {
    next(error);
  }
};

// 3. Create a new Bin
const createBin = async (req, res, next) => {
  try {
    const { bin_code, location_id, category_id, capacity_kg, fill_level, status } = req.body;

    // Validation
    if (!bin_code || !location_id || !category_id || !capacity_kg) {
      return res.status(400).json({
        success: false,
        message: 'Bin code, location, category, and capacity (kg) are required fields.'
      });
    }

    const trimmedCode = bin_code.trim().toUpperCase();

    // Check duplicate bin code
    const [existing] = await pool.query('SELECT bin_id FROM bins WHERE bin_code = ?', [trimmedCode]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Bin code '${trimmedCode}' already exists. Please choose a unique bin code.`
      });
    }

    const capacity = parseFloat(capacity_kg);
    if (isNaN(capacity) || capacity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Capacity must be a positive number in kilograms.'
      });
    }

    const initialFill = fill_level !== undefined ? parseFloat(fill_level) : 0.00;
    if (isNaN(initialFill) || initialFill < 0 || initialFill > 100) {
      return res.status(400).json({
        success: false,
        message: 'Fill level percentage must be between 0 and 100.'
      });
    }

    const binStatus = status || 'Active';

    const [result] = await pool.query(`
      INSERT INTO bins (bin_code, location_id, category_id, capacity_kg, fill_level, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [trimmedCode, location_id, category_id, capacity, initialFill, binStatus]);

    return res.status(201).json({
      success: true,
      message: 'Waste bin created successfully.',
      data: {
        bin_id: result.insertId,
        bin_code: trimmedCode,
        location_id,
        category_id,
        capacity_kg: capacity,
        fill_level: initialFill,
        status: binStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

// 4. Update Bin
const updateBin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { bin_code, location_id, category_id, capacity_kg, fill_level, status } = req.body;

    const [existing] = await pool.query('SELECT * FROM bins WHERE bin_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Bin with ID ${id} was not found.`
      });
    }

    const trimmedCode = bin_code ? bin_code.trim().toUpperCase() : existing[0].bin_code;

    // Check duplicate code if changed
    if (bin_code && trimmedCode !== existing[0].bin_code) {
      const [duplicate] = await pool.query('SELECT bin_id FROM bins WHERE bin_code = ? AND bin_id != ?', [trimmedCode, id]);
      if (duplicate.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Bin code '${trimmedCode}' is already in use by another bin.`
        });
      }
    }

    const capacity = capacity_kg !== undefined ? parseFloat(capacity_kg) : existing[0].capacity_kg;
    if (isNaN(capacity) || capacity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Capacity must be a positive number in kilograms.'
      });
    }

    const fill = fill_level !== undefined ? parseFloat(fill_level) : existing[0].fill_level;
    if (isNaN(fill) || fill < 0 || fill > 100) {
      return res.status(400).json({
        success: false,
        message: 'Fill level must be between 0 and 100 percentage.'
      });
    }

    await pool.query(`
      UPDATE bins 
      SET bin_code = ?, location_id = ?, category_id = ?, capacity_kg = ?, fill_level = ?, status = ?
      WHERE bin_id = ?
    `, [
      trimmedCode,
      location_id || existing[0].location_id,
      category_id || existing[0].category_id,
      capacity,
      fill,
      status || existing[0].status,
      id
    ]);

    return res.status(200).json({
      success: true,
      message: 'Waste bin updated successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// 5. Delete Bin
const deleteBin = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if bin exists
    const [existing] = await pool.query('SELECT * FROM bins WHERE bin_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Bin with ID ${id} was not found.`
      });
    }

    // Check if bin is referenced in collection_records
    const [records] = await pool.query('SELECT COUNT(*) AS count FROM collection_records WHERE bin_id = ?', [id]);
    if (records[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete Bin '${existing[0].bin_code}' because it has ${records[0].count} historical collection record(s). Setting status to 'Inactive' instead is recommended.`
      });
    }

    // Check if bin is assigned in schedule_bins
    const [schedules] = await pool.query('SELECT COUNT(*) AS count FROM schedule_bins WHERE bin_id = ?', [id]);
    if (schedules[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete Bin '${existing[0].bin_code}' because it is assigned in ${schedules[0].count} schedule(s).`
      });
    }

    await pool.query('DELETE FROM bins WHERE bin_id = ?', [id]);

    return res.status(200).json({
      success: true,
      message: `Bin '${existing[0].bin_code}' deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllBins,
  getBinById,
  createBin,
  updateBin,
  deleteBin
};
