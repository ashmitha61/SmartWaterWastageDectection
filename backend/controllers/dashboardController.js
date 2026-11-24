const { pool } = require('../config/db');

/**
 * Controller for Admin Dashboard Statistics & Analytics
 * Fetches dynamic KPIs, chart datasets, urgent alerts, and recent activities.
 */
const getDashboardStats = async (req, res, next) => {
  try {
    // 1. KPI Queries
    const [kpiRows] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM bins) AS total_bins,
        (SELECT COUNT(*) FROM bins WHERE status = 'Active') AS active_bins,
        (SELECT COUNT(*) FROM locations) AS total_locations,
        (SELECT COUNT(*) FROM teams WHERE status = 'Active' OR status = 'On Duty') AS active_teams,
        (SELECT COUNT(*) FROM schedules WHERE collection_date = CURDATE()) AS today_schedules,
        (SELECT COUNT(*) FROM schedules WHERE status IN ('Pending', 'In Progress')) AS pending_collections,
        (SELECT COUNT(*) FROM schedules WHERE status = 'Completed') AS completed_collections,
        (SELECT COALESCE(SUM(collected_quantity_kg), 0) FROM collection_records) AS total_waste_collected_kg
    `);

    // 2. Chart 1: Waste Collected by Category
    const [categoryWaste] = await pool.query(`
      SELECT 
        wc.category_id,
        wc.category_name,
        COALESCE(SUM(cr.collected_quantity_kg), 0) AS total_kg,
        COUNT(cr.record_id) AS collection_count
      FROM waste_categories wc
      LEFT JOIN bins b ON b.category_id = wc.category_id
      LEFT JOIN collection_records cr ON cr.bin_id = b.bin_id
      GROUP BY wc.category_id, wc.category_name
      ORDER BY total_kg DESC
    `);

    // 3. Chart 2: Monthly Waste Collection (Last 6-12 months)
    const [monthlyWaste] = await pool.query(`
      SELECT 
        DATE_FORMAT(collection_datetime, '%Y-%m') AS month_key,
        DATE_FORMAT(collection_datetime, '%b %Y') AS month_label,
        ROUND(COALESCE(SUM(collected_quantity_kg), 0), 2) AS total_kg,
        COUNT(record_id) AS total_pickups
      FROM collection_records
      WHERE collection_datetime >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY month_key, month_label
      ORDER BY month_key ASC
    `);

    // 4. Chart 3: Waste Collected by Teams
    const [teamWaste] = await pool.query(`
      SELECT 
        t.team_id,
        t.team_name,
        ROUND(COALESCE(SUM(cr.collected_quantity_kg), 0), 2) AS total_kg,
        COUNT(cr.record_id) AS pickups_completed
      FROM teams t
      LEFT JOIN collection_records cr ON cr.team_id = t.team_id
      GROUP BY t.team_id, t.team_name
      ORDER BY total_kg DESC
    `);

    // 5. Chart 4: Schedule Status Breakdown
    const [scheduleStatus] = await pool.query(`
      SELECT 
        status,
        COUNT(*) AS count
      FROM schedules
      GROUP BY status
    `);

    // 6. Recent Collection Records (Last 5 records with complete relational joins)
    const [recentCollections] = await pool.query(`
      SELECT 
        cr.record_id,
        cr.collected_quantity_kg,
        DATE_FORMAT(cr.collection_datetime, '%Y-%m-%d %H:%i') AS collection_datetime,
        cr.remarks,
        b.bin_code,
        wc.category_name,
        l.area_name,
        t.team_name
      FROM collection_records cr
      JOIN bins b ON cr.bin_id = b.bin_id
      JOIN waste_categories wc ON b.category_id = wc.category_id
      JOIN locations l ON b.location_id = l.location_id
      JOIN teams t ON cr.team_id = t.team_id
      ORDER BY cr.collection_datetime DESC, cr.record_id DESC
      LIMIT 5
    `);

    // 7. Upcoming Collection Schedules (Next 5 upcoming or today)
    const [upcomingSchedules] = await pool.query(`
      SELECT 
        s.schedule_id,
        DATE_FORMAT(s.collection_date, '%Y-%m-%d') AS collection_date,
        s.start_time,
        s.status,
        l.area_name,
        l.city,
        t.team_name,
        t.contact_number,
        (SELECT COUNT(*) FROM schedule_bins sb WHERE sb.schedule_id = s.schedule_id) AS total_bins,
        (SELECT COUNT(*) FROM schedule_bins sb WHERE sb.schedule_id = s.schedule_id AND sb.is_collected = TRUE) AS collected_bins
      FROM schedules s
      JOIN locations l ON s.location_id = l.location_id
      JOIN teams t ON s.team_id = t.team_id
      WHERE s.status IN ('Pending', 'In Progress')
      ORDER BY s.collection_date ASC, s.start_time ASC
      LIMIT 5
    `);

    // 8. Urgent Bins (Bins with fill_level >= 80% needing immediate attention)
    const [urgentBins] = await pool.query(`
      SELECT 
        b.bin_id,
        b.bin_code,
        b.capacity_kg,
        b.fill_level,
        b.status,
        l.area_name,
        wc.category_name
      FROM bins b
      JOIN locations l ON b.location_id = l.location_id
      JOIN waste_categories wc ON b.category_id = wc.category_id
      WHERE b.fill_level >= 80.00 AND b.status = 'Active'
      ORDER BY b.fill_level DESC
      LIMIT 6
    `);

    return res.status(200).json({
      success: true,
      data: {
        kpis: {
          totalBins: Number(kpiRows[0].total_bins || 0),
          activeBins: Number(kpiRows[0].active_bins || 0),
          totalLocations: Number(kpiRows[0].total_locations || 0),
          activeTeams: Number(kpiRows[0].active_teams || 0),
          todaySchedules: Number(kpiRows[0].today_schedules || 0),
          pendingCollections: Number(kpiRows[0].pending_collections || 0),
          completedCollections: Number(kpiRows[0].completed_collections || 0),
          totalWasteCollectedKg: Number(kpiRows[0].total_waste_collected_kg || 0)
        },
        charts: {
          categoryWaste,
          monthlyWaste,
          teamWaste,
          scheduleStatus
        },
        recentCollections,
        upcomingSchedules,
        urgentBins
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats
};
