const { pool } = require('../config/db');

/**
 * Collection Records Controller
 * Handles waste collection logging, inventory updates, and atomic schedule state transitions.
 * Uses MySQL transactions to ensure database consistency.
 */

// 1. Get all collection records with filters, joins and aggregate totals
const getAllRecords = async (req, res, next) => {
  try {
    const { start_date, end_date, team_id, location_id, category_id, bin_code, search } = req.query;

    let query = `
      SELECT 
        cr.record_id,
        cr.schedule_id,
        cr.bin_id,
        cr.team_id,
        cr.collected_quantity_kg,
        DATE_FORMAT(cr.collection_datetime, '%Y-%m-%d %H:%i') AS collection_datetime,
        cr.remarks,
        cr.created_at,
        b.bin_code,
        b.capacity_kg,
        wc.category_id,
        wc.category_name,
        l.location_id,
        l.area_name,
        l.city,
        t.team_name,
        t.team_leader
      FROM collection_records cr
      JOIN bins b ON cr.bin_id = b.bin_id
      JOIN waste_categories wc ON b.category_id = wc.category_id
      JOIN locations l ON b.location_id = l.location_id
      JOIN teams t ON cr.team_id = t.team_id
      WHERE 1=1
    `;

    const params = [];

    if (start_date) {
      query += ` AND DATE(cr.collection_datetime) >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(cr.collection_datetime) <= ?`;
      params.push(end_date);
    }

    if (team_id) {
      query += ` AND cr.team_id = ?`;
      params.push(team_id);
    }

    if (location_id) {
      query += ` AND b.location_id = ?`;
      params.push(location_id);
    }

    if (category_id) {
      query += ` AND b.category_id = ?`;
      params.push(category_id);
    }

    if (bin_code) {
      query += ` AND b.bin_code = ?`;
      params.push(bin_code.trim().toUpperCase());
    }

    if (search) {
      query += ` AND (b.bin_code LIKE ? OR l.area_name LIKE ? OR wc.category_name LIKE ? OR t.team_name LIKE ? OR cr.remarks LIKE ?)`;
      const searchParam = `%${search.trim()}%`;
      params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
    }

    query += ` ORDER BY cr.collection_datetime DESC, cr.record_id DESC`;

    const [rows] = await pool.query(query, params);

    // Compute summary metrics for filtered records
    const totalCollected = rows.reduce((acc, row) => acc + Number(row.collected_quantity_kg || 0), 0);
    const averageCollected = rows.length > 0 ? (totalCollected / rows.length).toFixed(2) : 0;

    return res.status(200).json({
      success: true,
      count: rows.length,
      summary: {
        totalCollectedKg: Number(totalCollected.toFixed(2)),
        averageCollectedKg: Number(averageCollected),
        totalRecords: rows.length
      },
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get single record by ID
const getRecordById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [records] = await pool.query(`
      SELECT 
        cr.record_id,
        cr.schedule_id,
        cr.bin_id,
        cr.team_id,
        cr.collected_quantity_kg,
        DATE_FORMAT(cr.collection_datetime, '%Y-%m-%d %H:%i') AS collection_datetime,
        cr.remarks,
        cr.created_at,
        b.bin_code,
        b.capacity_kg,
        wc.category_name,
        l.area_name,
        l.street,
        l.city,
        t.team_name,
        t.team_leader,
        t.contact_number
      FROM collection_records cr
      JOIN bins b ON cr.bin_id = b.bin_id
      JOIN waste_categories wc ON b.category_id = wc.category_id
      JOIN locations l ON b.location_id = l.location_id
      JOIN teams t ON cr.team_id = t.team_id
      WHERE cr.record_id = ?
    `, [id]);

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Collection record with ID ${id} was not found.`
      });
    }

    return res.status(200).json({
      success: true,
      data: records[0]
    });
  } catch (error) {
    next(error);
  }
};

// 3. Create a collection record (Atomic Transaction)
const createRecord = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { schedule_id, bin_id, team_id, collected_quantity_kg, collection_datetime, remarks, reset_fill_level } = req.body;

    if (!bin_id || !team_id || collected_quantity_kg === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Bin ID, Team ID, and Collected Quantity (kg) are required.'
      });
    }

    const quantity = parseFloat(collected_quantity_kg);
    if (isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Collected quantity must be a positive number greater than 0.'
      });
    }

    // 1. Fetch Bin details to validate capacity
    const [bins] = await connection.query('SELECT bin_id, bin_code, capacity_kg, fill_level, status FROM bins WHERE bin_id = ?', [bin_id]);
    if (bins.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Bin with ID ${bin_id} does not exist.`
      });
    }

    const bin = bins[0];
    const maxCapacity = parseFloat(bin.capacity_kg);

    // Business Constraint: Prevent collected quantity from exceeding bin capacity
    if (quantity > maxCapacity) {
      return res.status(400).json({
        success: false,
        message: `Validation Error: Collected quantity (${quantity} kg) cannot exceed bin maximum capacity (${maxCapacity} kg).`
      });
    }

    // 2. Start MySQL Transaction
    await connection.beginTransaction();

    // 3. Insert collection record
    const recordTimestamp = collection_datetime || new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [recordResult] = await connection.query(`
      INSERT INTO collection_records (schedule_id, bin_id, team_id, collected_quantity_kg, collection_datetime, remarks)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      schedule_id || null,
      bin_id,
      team_id,
      quantity,
      recordTimestamp,
      remarks ? remarks.trim() : null
    ]);

    const recordId = recordResult.insertId;

    // 4. Update Bin Fill Level (defaults to 0.00% emptied, or custom value if specified)
    const newFillLevel = reset_fill_level !== undefined ? Math.max(0, Math.min(100, parseFloat(reset_fill_level))) : 0.00;
    await connection.query(`
      UPDATE bins
      SET fill_level = ?
      WHERE bin_id = ?
    `, [newFillLevel, bin_id]);

    // 5. If schedule_id is provided, update schedule_bins and verify if schedule is complete
    let scheduleUpdatedToCompleted = false;

    if (schedule_id) {
      // Mark bin as collected in schedule_bins
      await connection.query(`
        UPDATE schedule_bins
        SET is_collected = TRUE, collected_at = ?
        WHERE schedule_id = ? AND bin_id = ?
      `, [recordTimestamp, schedule_id, bin_id]);

      // Check if all bins in this schedule are now collected
      const [remaining] = await connection.query(`
        SELECT COUNT(*) AS uncollected_count
        FROM schedule_bins
        WHERE schedule_id = ? AND is_collected = FALSE
      `, [schedule_id]);

      if (remaining[0].uncollected_count === 0) {
        await connection.query(`
          UPDATE schedules
          SET status = 'Completed'
          WHERE schedule_id = ?
        `, [schedule_id]);
        scheduleUpdatedToCompleted = true;
      } else {
        // If some bins collected and status was Pending, move to In Progress
        await connection.query(`
          UPDATE schedules
          SET status = 'In Progress'
          WHERE schedule_id = ? AND status = 'Pending'
        `, [schedule_id]);
      }
    }

    // 6. Commit Transaction
    await connection.commit();

    return res.status(201).json({
      success: true,
      message: `Collection of ${quantity} kg for bin ${bin.bin_code} recorded successfully.`,
      data: {
        record_id: recordId,
        schedule_id: schedule_id || null,
        bin_id,
        bin_code: bin.bin_code,
        collected_quantity_kg: quantity,
        new_fill_level: newFillLevel,
        scheduleUpdatedToCompleted
      }
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

// 4. Delete collection record (Admin correction)
const deleteRecord = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query('DELETE FROM collection_records WHERE record_id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: `Collection record with ID ${id} was not found.`
      });
    }

    return res.status(200).json({
      success: true,
      message: `Collection record #${id} removed successfully.`
    });
  } catch (error) {
    next(error);
  }
};

// 5. Get collection history for a specific bin
const getRecordsByBin = async (req, res, next) => {
  try {
    const { binId } = req.params;

    const [records] = await pool.query(`
      SELECT 
        cr.record_id,
        cr.schedule_id,
        cr.collected_quantity_kg,
        DATE_FORMAT(cr.collection_datetime, '%Y-%m-%d %H:%i') AS collection_datetime,
        cr.remarks,
        t.team_name,
        t.team_leader
      FROM collection_records cr
      JOIN teams t ON cr.team_id = t.team_id
      WHERE cr.bin_id = ?
      ORDER BY cr.collection_datetime DESC
    `, [binId]);

    const totalCollected = records.reduce((acc, row) => acc + Number(row.collected_quantity_kg || 0), 0);

    return res.status(200).json({
      success: true,
      bin_id: Number(binId),
      total_collections: records.length,
      total_collected_kg: Number(totalCollected.toFixed(2)),
      data: records
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllRecords,
  getRecordById,
  createRecord,
  deleteRecord,
  getRecordsByBin
};
