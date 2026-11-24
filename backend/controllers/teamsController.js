const { pool } = require('../config/db');

/**
 * Teams & Team Members Controller
 * Manages 1-to-Many relational structure between teams and team members,
 * including operational statuses, schedules assigned, and member roster.
 */

// 1. Get all teams with member count, schedule count, and total waste collected
const getAllTeams = async (req, res, next) => {
  try {
    const { search, status } = req.query;

    let query = `
      SELECT 
        t.team_id,
        t.team_name,
        t.team_leader,
        t.contact_number,
        t.status,
        t.created_at,
        COUNT(DISTINCT tm.member_id) AS total_members,
        COUNT(DISTINCT s.schedule_id) AS total_schedules,
        COALESCE(SUM(cr.collected_quantity_kg), 0) AS total_collected_kg
      FROM teams t
      LEFT JOIN team_members tm ON tm.team_id = t.team_id
      LEFT JOIN schedules s ON s.team_id = t.team_id
      LEFT JOIN collection_records cr ON cr.team_id = t.team_id
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      query += ` AND t.status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (t.team_name LIKE ? OR t.team_leader LIKE ? OR t.contact_number LIKE ?)`;
      const searchParam = `%${search.trim()}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    query += ` GROUP BY t.team_id ORDER BY t.team_id DESC`;

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

// 2. Get single team by ID with complete team members list
const getTeamById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [teams] = await pool.query(`
      SELECT * FROM teams WHERE team_id = ?
    `, [id]);

    if (teams.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Team with ID ${id} was not found.`
      });
    }

    // Fetch team members
    const [members] = await pool.query(`
      SELECT member_id, team_id, member_name, phone_number, role, created_at
      FROM team_members
      WHERE team_id = ?
      ORDER BY member_id ASC
    `, [id]);

    // Fetch recent schedules
    const [recentSchedules] = await pool.query(`
      SELECT 
        s.schedule_id,
        DATE_FORMAT(s.collection_date, '%Y-%m-%d') AS collection_date,
        s.start_time,
        s.status,
        l.area_name
      FROM schedules s
      JOIN locations l ON s.location_id = l.location_id
      WHERE s.team_id = ?
      ORDER BY s.collection_date DESC
      LIMIT 5
    `, [id]);

    return res.status(200).json({
      success: true,
      data: {
        ...teams[0],
        members,
        recentSchedules
      }
    });
  } catch (error) {
    next(error);
  }
};

// 3. Create Team
const createTeam = async (req, res, next) => {
  try {
    const { team_name, team_leader, contact_number, status } = req.body;

    if (!team_name || !team_leader || !contact_number) {
      return res.status(400).json({
        success: false,
        message: 'Team name, team leader, and contact number are required.'
      });
    }

    const trimmedName = team_name.trim();

    // Check duplicate
    const [existing] = await pool.query('SELECT team_id FROM teams WHERE team_name = ?', [trimmedName]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Team name '${trimmedName}' already exists. Please choose a unique name.`
      });
    }

    const [result] = await pool.query(`
      INSERT INTO teams (team_name, team_leader, contact_number, status)
      VALUES (?, ?, ?, ?)
    `, [trimmedName, team_leader.trim(), contact_number.trim(), status || 'Active']);

    return res.status(201).json({
      success: true,
      message: 'Collection team created successfully.',
      data: {
        team_id: result.insertId,
        team_name: trimmedName,
        team_leader,
        contact_number,
        status: status || 'Active'
      }
    });
  } catch (error) {
    next(error);
  }
};

// 4. Update Team
const updateTeam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { team_name, team_leader, contact_number, status } = req.body;

    const [existing] = await pool.query('SELECT * FROM teams WHERE team_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Team with ID ${id} was not found.`
      });
    }

    const trimmedName = team_name ? team_name.trim() : existing[0].team_name;

    if (team_name && trimmedName !== existing[0].team_name) {
      const [duplicate] = await pool.query('SELECT team_id FROM teams WHERE team_name = ? AND team_id != ?', [trimmedName, id]);
      if (duplicate.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Team name '${trimmedName}' is already in use.`
        });
      }
    }

    await pool.query(`
      UPDATE teams
      SET team_name = ?, team_leader = ?, contact_number = ?, status = ?
      WHERE team_id = ?
    `, [
      trimmedName,
      team_leader ? team_leader.trim() : existing[0].team_leader,
      contact_number ? contact_number.trim() : existing[0].contact_number,
      status || existing[0].status,
      id
    ]);

    return res.status(200).json({
      success: true,
      message: 'Team updated successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// 5. Delete Team
const deleteTeam = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT * FROM teams WHERE team_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Team with ID ${id} was not found.`
      });
    }

    // Check if team is assigned to any active schedules
    const [schedules] = await pool.query('SELECT COUNT(*) AS count FROM schedules WHERE team_id = ?', [id]);
    if (schedules[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete team '${existing[0].team_name}' because it has ${schedules[0].count} scheduled collection assignment(s).`
      });
    }

    // Check if team has collection records
    const [records] = await pool.query('SELECT COUNT(*) AS count FROM collection_records WHERE team_id = ?', [id]);
    if (records[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete team '${existing[0].team_name}' because it is linked to ${records[0].count} historical collection records.`
      });
    }

    await pool.query('DELETE FROM teams WHERE team_id = ?', [id]);

    return res.status(200).json({
      success: true,
      message: `Team '${existing[0].team_name}' and its member records removed successfully.`
    });
  } catch (error) {
    next(error);
  }
};

// ----------------- TEAM MEMBERS CRUD -----------------

// 6. Get team members of a team
const getTeamMembers = async (req, res, next) => {
  try {
    const { teamId } = req.params;

    const [members] = await pool.query(`
      SELECT member_id, team_id, member_name, phone_number, role, created_at
      FROM team_members
      WHERE team_id = ?
      ORDER BY member_id ASC
    `, [teamId]);

    return res.status(200).json({
      success: true,
      count: members.length,
      data: members
    });
  } catch (error) {
    next(error);
  }
};

// 7. Add a team member
const addTeamMember = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const { member_name, phone_number, role } = req.body;

    if (!member_name || !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Member name and phone number are required.'
      });
    }

    // Verify team exists
    const [team] = await pool.query('SELECT team_id FROM teams WHERE team_id = ?', [teamId]);
    if (team.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Team with ID ${teamId} does not exist.`
      });
    }

    const [result] = await pool.query(`
      INSERT INTO team_members (team_id, member_name, phone_number, role)
      VALUES (?, ?, ?, ?)
    `, [teamId, member_name.trim(), phone_number.trim(), role ? role.trim() : 'Waste Collector']);

    return res.status(201).json({
      success: true,
      message: 'Team member added successfully.',
      data: {
        member_id: result.insertId,
        team_id: Number(teamId),
        member_name,
        phone_number,
        role: role || 'Waste Collector'
      }
    });
  } catch (error) {
    next(error);
  }
};

// 8. Delete a team member
const deleteTeamMember = async (req, res, next) => {
  try {
    const { memberId } = req.params;

    const [result] = await pool.query('DELETE FROM team_members WHERE member_id = ?', [memberId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: `Team member with ID ${memberId} was not found.`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Team member removed successfully.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamMembers,
  addTeamMember,
  deleteTeamMember
};
