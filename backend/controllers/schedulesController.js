const { pool } = require('../config/db');

/**
 * Collection Schedules Controller
 * Manages scheduling workflows and the Many-to-Many bridge table (schedule_bins).
 * Uses MySQL transactions for atomic schedule creation and bin assignment.
 */

// 1. Get all schedules with joins, counts, and filters
const getAllSchedules = async (req, res, next) => {
  try {
    const { date, location_id, team_id, status, search } = req.query;

    let query = `
      SELECT 
        s.schedule_id,
        DATE_FORMAT(s.collection_date, '%Y-%m-%d') AS collection_date,
        s.start_time,
        s.status,
        s.created_at,
        s.location_id,
        l.area_name,
        l.street,
        l.city,
        s.team_id,
        t.team_name,
        t.team_leader,
        t.contact_number,
        COUNT(sb.schedule_bin_id) AS total_assigned_bins,
        SUM(CASE WHEN sb.is_collected = TRUE THEN 1 ELSE 0 END) AS collected_bins
      FROM schedules s
      JOIN locations l ON s.location_id = l.location_id
      JOIN teams t ON s.team_id = t.team_id
      LEFT JOIN schedule_bins sb ON sb.schedule_id = s.schedule_id
      WHERE 1=1
    `;

    const params = [];

    if (date) {
      query += ` AND s.collection_date = ?`;
      params.push(date);
    }

    if (location_id) {
      query += ` AND s.location_id = ?`;
      params.push(location_id);
    }

    if (team_id) {
      query += ` AND s.team_id = ?`;
      params.push(team_id);
    }

    if (status) {
      query += ` AND s.status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (l.area_name LIKE ? OR t.team_name LIKE ? OR t.team_leader LIKE ?)`;
      const searchParam = `%${search.trim()}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    query += ` GROUP BY s.schedule_id ORDER BY s.collection_date DESC, s.start_time ASC`;

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

// 2. Get single schedule by ID with full list of assigned bins & their status
const getScheduleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [schedules] = await pool.query(`
      SELECT 
        s.schedule_id,
        DATE_FORMAT(s.collection_date, '%Y-%m-%d') AS collection_date,
        s.start_time,
        s.status,
        s.created_at,
        s.location_id,
        l.area_name,
        l.street,
        l.city,
        l.pincode,
        s.team_id,
        t.team_name,
        t.team_leader,
        t.contact_number
      FROM schedules s
      JOIN locations l ON s.location_id = l.location_id
      JOIN teams t ON s.team_id = t.team_id
      WHERE s.schedule_id = ?
    `, [id]);

    if (schedules.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Schedule with ID ${id} was not found.`
      });
    }

    // Fetch assigned bins from schedule_bins bridge table
    const [assignedBins] = await pool.query(`
      SELECT 
        sb.schedule_bin_id,
        sb.bin_id,
        sb.is_collected,
        DATE_FORMAT(sb.collected_at, '%Y-%m-%d %H:%i') AS collected_at,
        b.bin_code,
        b.capacity_kg,
        b.fill_level,
        b.status AS bin_status,
        wc.category_name,
        (
          SELECT cr.collected_quantity_kg 
          FROM collection_records cr 
          WHERE cr.schedule_id = sb.schedule_id AND cr.bin_id = sb.bin_id 
          ORDER BY cr.record_id DESC 
          LIMIT 1
        ) AS collected_quantity_kg
      FROM schedule_bins sb
      JOIN bins b ON sb.bin_id = b.bin_id
      JOIN waste_categories wc ON b.category_id = wc.category_id
      WHERE sb.schedule_id = ?
      ORDER BY sb.is_collected ASC, b.bin_code ASC
    `, [id]);

    return res.status(200).json({
      success: true,
      data: {
        ...schedules[0],
        assignedBins
      }
    });
  } catch (error) {
    next(error);
  }
};

// 3. Create a new collection schedule with multiple assigned bins (Transaction)
const createSchedule = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { collection_date, start_time, location_id, team_id, bin_ids, status } = req.body;

    if (!collection_date || !start_time || !location_id || !team_id) {
      return res.status(400).json({
        success: false,
        message: 'Collection date, start time, location, and team are required.'
      });
    }

    if (!bin_ids || !Array.isArray(bin_ids) || bin_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one bin for this collection schedule.'
      });
    }

    // Check duplicate bin IDs in request
    const uniqueBinIds = [...new Set(bin_ids)];

    await connection.beginTransaction();

    // 1. Insert schedule
    const [scheduleResult] = await connection.query(`
      INSERT INTO schedules (collection_date, start_time, location_id, team_id, status)
      VALUES (?, ?, ?, ?, ?)
    `, [collection_date, start_time, location_id, team_id, status || 'Pending']);

    const scheduleId = scheduleResult.insertId;

    // 2. Insert assigned bins into schedule_bins
    const scheduleBinValues = uniqueBinIds.map(binId => [scheduleId, binId, false, null]);
    await connection.query(`
      INSERT INTO schedule_bins (schedule_id, bin_id, is_collected, collected_at)
      VALUES ?
    `, [scheduleBinValues]);

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: `Schedule #${scheduleId} created successfully with ${uniqueBinIds.length} assigned bin(s).`,
      data: {
        schedule_id: scheduleId,
        collection_date,
        start_time,
        location_id,
        team_id,
        status: status || 'Pending',
        assigned_bins_count: uniqueBinIds.length
      }
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

// 4. Update schedule (status, date, time, team, bins)
const updateSchedule = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { collection_date, start_time, location_id, team_id, status, bin_ids } = req.body;

    const [existing] = await connection.query('SELECT * FROM schedules WHERE schedule_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Schedule with ID ${id} was not found.`
      });
    }

    await connection.beginTransaction();

    // Update schedule table
    await connection.query(`
      UPDATE schedules
      SET collection_date = ?, start_time = ?, location_id = ?, team_id = ?, status = ?
      WHERE schedule_id = ?
    `, [
      collection_date || existing[0].collection_date,
      start_time || existing[0].start_time,
      location_id || existing[0].location_id,
      team_id || existing[0].team_id,
      status || existing[0].status,
      id
    ]);

    // If new bin_ids array is provided, sync schedule_bins
    if (bin_ids && Array.isArray(bin_ids)) {
      const uniqueBinIds = [...new Set(bin_ids)];

      // Keep existing bins that were already marked collected, delete uncollected that were removed
      // First, get currently collected bins for this schedule
      const [collectedRows] = await connection.query(`
        SELECT bin_id FROM schedule_bins WHERE schedule_id = ? AND is_collected = TRUE
      `, [id]);
      const collectedBinIds = collectedRows.map(r => r.bin_id);

      // Merge: ensure already collected bins remain in the schedule
      const finalBinIds = [...new Set([...uniqueBinIds, ...collectedBinIds])];

      // Delete existing uncollected bins
      await connection.query(`
        DELETE FROM schedule_bins WHERE schedule_id = ? AND is_collected = FALSE
      `, [id]);

      // Insert bins that are not already in schedule_bins
      for (const binId of finalBinIds) {
        if (!collectedBinIds.includes(binId)) {
          await connection.query(`
            INSERT IGNORE INTO schedule_bins (schedule_id, bin_id, is_collected)
            VALUES (?, ?, FALSE)
          `, [id, binId]);
        }
      }
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: 'Schedule updated successfully.'
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

// 5. Delete schedule
const deleteSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT * FROM schedules WHERE schedule_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Schedule with ID ${id} was not found.`
      });
    }

    // Deleting schedule will cascade delete schedule_bins (via FK ON DELETE CASCADE)
    // Any linked collection_records will have schedule_id set to NULL (via FK ON DELETE SET NULL)
    await pool.query('DELETE FROM schedules WHERE schedule_id = ?', [id]);

    return res.status(200).json({
      success: true,
      message: `Schedule #${id} deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};

// 6. Helper: Get available bins for a given location to schedule
const getAvailableBinsForLocation = async (req, res, next) => {
  try {
    const { locationId } = req.params;

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
      WHERE b.location_id = ? AND b.status = 'Active'
      ORDER BY b.fill_level DESC, b.bin_code ASC
    `, [locationId]);

    return res.status(200).json({
      success: true,
      count: bins.length,
      data: bins
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getAvailableBinsForLocation
};
