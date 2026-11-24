const { pool } = require('../config/db');

/**
 * Authentication Controller
 * Manages admin authentication, registration, session verification, and role retrieval from MySQL.
 */

// Phone number validation helper: exactly 10 digits, cannot be all zeros
const validatePhoneNumber = (phone) => {
  if (!phone) return 'Phone number is required.';
  const cleanPhone = String(phone).trim();
  
  if (!/^\d{10}$/.test(cleanPhone)) {
    return 'Phone number must be exactly 10 digits.';
  }
  
  if (/^0{10}$/.test(cleanPhone) || /^0+$/.test(cleanPhone)) {
    return 'Phone number cannot be all zeros (e.g. 0000000000).';
  }
  
  return null;
};

/**
 * Admin User Registration
 * Validates inputs, enforces phone number constraints (10 digits, not all zeros),
 * and creates a new administrator in MySQL.
 */
const register = async (req, res, next) => {
  try {
    const { username, password, full_name, email, phone_number, role } = req.body;

    // Validate required fields
    if (!username || !password || !full_name || !email || !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'All fields (Full Name, Username, Email, 10-Digit Phone, Password) are required.'
      });
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = String(phone_number).trim();
    const cleanFullName = full_name.trim();

    if (cleanUsername.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters long.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.'
      });
    }

    // Phone number validation: exactly 10 digits, cannot be all zeros
    const phoneError = validatePhoneNumber(cleanPhone);
    if (phoneError) {
      return res.status(400).json({
        success: false,
        message: phoneError
      });
    }

    // Check if username already exists
    const [existingUsers] = await pool.query(
      'SELECT admin_id FROM admins WHERE username = ?',
      [cleanUsername]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Username '${cleanUsername}' is already taken. Please choose another username.`
      });
    }

    // Check if email already exists
    const [existingEmail] = await pool.query(
      'SELECT admin_id FROM admins WHERE email = ?',
      [cleanEmail]
    );

    if (existingEmail.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Email '${cleanEmail}' is already registered. Please sign in or use another email.`
      });
    }

    const allowedRoles = ['Super Admin', 'Municipal Officer', 'Dispatcher'];
    const assignedRole = allowedRoles.includes(role) ? role : 'Super Admin';

    // Insert new administrator into MySQL
    const [insertResult] = await pool.query(
      `INSERT INTO admins (username, password, full_name, email, phone_number, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cleanUsername, password.trim(), cleanFullName, cleanEmail, cleanPhone, assignedRole]
    );

    return res.status(201).json({
      success: true,
      message: 'Registration successful! You can now log in with your credentials.',
      user: {
        admin_id: insertResult.insertId,
        username: cleanUsername,
        full_name: cleanFullName,
        email: cleanEmail,
        phone_number: cleanPhone,
        role: assignedRole
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin User Login
 * Only registered users in the database can successfully log in.
 */
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.'
      });
    }

    const [users] = await pool.query(`
      SELECT admin_id, username, password, full_name, email, phone_number, role
      FROM admins
      WHERE username = ?
    `, [username.trim()]);

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Account not found. You must register first before logging in.'
      });
    }

    const user = users[0];

    // Password comparison
    if (user.password !== password.trim()) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Please verify your credentials and try again.'
      });
    }

    // Success response
    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.full_name}!`,
      user: {
        admin_id: user.admin_id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

const getDemoUsers = async (req, res, next) => {
  try {
    const [users] = await pool.query(`
      SELECT admin_id, username, full_name, email, phone_number, role
      FROM admins
      ORDER BY admin_id ASC
    `);

    return res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getDemoUsers
};
