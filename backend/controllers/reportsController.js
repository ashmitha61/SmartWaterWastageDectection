const { pool } = require('../config/db');

/**
 * Reports & Advanced Analytics Controller
 * Implements SQL JOIN, SUM, COUNT, AVG, GROUP BY, and Date-based aggregations
 * for in-depth waste management reporting and DBMS viva demonstrations.
 */

const getComprehensiveReports = async (req, res, next) => {
  try {
    // 1. Overall Summary KPIs
    const [summaryKpis] = await pool.query(`
      SELECT 
        COUNT(cr.record_id) AS total_collection_events,
        ROUND(COALESCE(SUM(cr.collected_quantity_kg), 0), 2) AS total_waste_kg,
        ROUND(COALESCE(AVG(cr.collected_quantity_kg), 0), 2) AS avg_waste_per_collection_kg,
        COUNT(DISTINCT cr.bin_id) AS distinct_bins_serviced,
        COUNT(DISTINCT b.location_id) AS distinct_locations_serviced,
        COUNT(DISTINCT cr.team_id) AS active_teams_count
      FROM collection_records cr
      JOIN bins b ON cr.bin_id = b.bin_id
    `);

    // 2. Report by Waste Category (JOIN, SUM, COUNT, AVG, GROUP BY)
    const [wasteByCategory] = await pool.query(`
      SELECT 
        wc.category_id,
        wc.category_name,
        COUNT(cr.record_id) AS total_pickups,
        ROUND(COALESCE(SUM(cr.collected_quantity_kg), 0), 2) AS total_kg,
        ROUND(COALESCE(AVG(cr.collected_quantity_kg), 0), 2) AS avg_kg_per_pickup,
        ROUND(
          COALESCE(SUM(cr.collected_quantity_kg), 0) * 100.0 / 
          NULLIF((SELECT SUM(collected_quantity_kg) FROM collection_records), 0), 
          2
        ) AS percentage_of_total
      FROM waste_categories wc
      LEFT JOIN bins b ON b.category_id = wc.category_id
      LEFT JOIN collection_records cr ON cr.bin_id = b.bin_id
      GROUP BY wc.category_id, wc.category_name
      ORDER BY total_kg DESC
    `);

    // 3. Report by Location (JOIN, SUM, COUNT, GROUP BY)
    const [wasteByLocation] = await pool.query(`
      SELECT 
        l.location_id,
        l.area_name,
        l.city,
        l.pincode,
        COUNT(DISTINCT b.bin_id) AS total_bins_installed,
        COUNT(cr.record_id) AS total_collections,
        ROUND(COALESCE(SUM(cr.collected_quantity_kg), 0), 2) AS total_kg,
        ROUND(COALESCE(AVG(cr.collected_quantity_kg), 0), 2) AS avg_kg
      FROM locations l
      LEFT JOIN bins b ON b.location_id = l.location_id
      LEFT JOIN collection_records cr ON cr.bin_id = b.bin_id
      GROUP BY l.location_id, l.area_name, l.city, l.pincode
      ORDER BY total_kg DESC
    `);

    // 4. Report by Team (JOIN, SUM, COUNT, GROUP BY)
    const [wasteByTeam] = await pool.query(`
      SELECT 
        t.team_id,
        t.team_name,
        t.team_leader,
        t.status AS team_status,
        (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.team_id) AS team_size,
        COUNT(cr.record_id) AS total_collections_done,
        ROUND(COALESCE(SUM(cr.collected_quantity_kg), 0), 2) AS total_kg_collected,
        ROUND(COALESCE(AVG(cr.collected_quantity_kg), 0), 2) AS avg_kg_per_run
      FROM teams t
      LEFT JOIN collection_records cr ON cr.team_id = t.team_id
      GROUP BY t.team_id, t.team_name, t.team_leader, t.status
      ORDER BY total_kg_collected DESC
    `);

    // 5. Daily Collection Report (Last 14 days)
    const [dailyReport] = await pool.query(`
      SELECT 
        DATE_FORMAT(collection_datetime, '%Y-%m-%d') AS collection_date,
        DATE_FORMAT(collection_datetime, '%d %b %Y') AS formatted_date,
        COUNT(record_id) AS collections_count,
        ROUND(SUM(collected_quantity_kg), 2) AS daily_total_kg,
        COUNT(DISTINCT team_id) AS active_teams,
        COUNT(DISTINCT bin_id) AS bins_cleared
      FROM collection_records
      GROUP BY collection_date, formatted_date
      ORDER BY collection_date DESC
      LIMIT 14
    `);

    // 6. Monthly Collection Report
    const [monthlyReport] = await pool.query(`
      SELECT 
        DATE_FORMAT(collection_datetime, '%Y-%m') AS month_key,
        DATE_FORMAT(collection_datetime, '%M %Y') AS month_name,
        COUNT(record_id) AS total_pickups,
        ROUND(SUM(collected_quantity_kg), 2) AS monthly_total_kg,
        ROUND(AVG(collected_quantity_kg), 2) AS avg_pickup_weight_kg
      FROM collection_records
      GROUP BY month_key, month_name
      ORDER BY month_key DESC
    `);

    // 7. Schedules Performance & Completion Rate
    const [schedulesSummary] = await pool.query(`
      SELECT 
        status,
        COUNT(*) AS total_schedules,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM schedules), 1) AS percentage
      FROM schedules
      GROUP BY status
      ORDER BY total_schedules DESC
    `);

    return res.status(200).json({
      success: true,
      data: {
        summary: summaryKpis[0],
        wasteByCategory,
        wasteByLocation,
        wasteByTeam,
        dailyReport,
        monthlyReport,
        schedulesSummary
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getComprehensiveReports
};
