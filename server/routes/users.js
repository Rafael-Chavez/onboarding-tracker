import express from 'express';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Get user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const pool = req.app.get('db');
    const result = await pool.query(
      `SELECT u.id, u.firebase_uid, u.email, u.role, u.employee_id, u.display_name,
              e.name as employee_name, e.color as employee_color
       FROM users u
       LEFT JOIN employees e ON u.employee_id = e.id
       WHERE u.firebase_uid = $1`,
      [req.user.uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      firebaseUid: user.firebase_uid,
      email: user.email,
      role: user.role,
      employeeId: user.employee_id,
      employeeName: user.employee_name,
      employeeColor: user.employee_color,
      displayName: user.display_name
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new user
router.post('/', verifyToken, async (req, res) => {
  try {
    const { firebaseUid, email, displayName, role = 'team', employeeId } = req.body;

    // Only allow creating user for the authenticated user
    if (firebaseUid !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const pool = req.app.get('db');
    const result = await pool.query(
      `INSERT INTO users (firebase_uid, email, display_name, role, employee_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, firebase_uid, email, display_name, role, employee_id`,
      [firebaseUid, email, displayName, role, employeeId]
    );

    const user = result.rows[0];
    res.status(201).json({
      id: user.id,
      firebaseUid: user.firebase_uid,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      employeeId: user.employee_id
    });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'User already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (assign employee)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeId, role } = req.body;

    const pool = req.app.get('db');

    // Check if user is updating their own profile or is admin
    const userCheck = await pool.query(
      'SELECT firebase_uid, role FROM users WHERE id = $1',
      [id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isOwnProfile = userCheck.rows[0].firebase_uid === req.user.uid;
    const isAdmin = userCheck.rows[0].role === 'admin';

    // Only allow users to update their own employee assignment
    // Admins can update roles
    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Only admins can change roles
    if (role && !isAdmin) {
      return res.status(403).json({ error: 'Only admins can change roles' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (employeeId !== undefined) {
      updates.push(`employee_id = $${paramCount++}`);
      values.push(employeeId);
    }

    if (role && isAdmin) {
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json({
      id: result.rows[0].id,
      firebaseUid: result.rows[0].firebase_uid,
      email: result.rows[0].email,
      role: result.rows[0].role,
      employeeId: result.rows[0].employee_id,
      displayName: result.rows[0].display_name
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users (admin only)
router.get('/', verifyToken, async (req, res) => {
  try {
    const pool = req.app.get('db');

    // Check if requester is admin
    const adminCheck = await pool.query(
      'SELECT role FROM users WHERE firebase_uid = $1',
      [req.user.uid]
    );

    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await pool.query(
      `SELECT u.id, u.firebase_uid, u.email, u.role, u.employee_id, u.display_name,
              e.name as employee_name, e.color as employee_color
       FROM users u
       LEFT JOIN employees e ON u.employee_id = e.id
       ORDER BY u.created_at DESC`
    );

    const users = result.rows.map(user => ({
      id: user.id,
      firebaseUid: user.firebase_uid,
      email: user.email,
      role: user.role,
      employeeId: user.employee_id,
      employeeName: user.employee_name,
      employeeColor: user.employee_color,
      displayName: user.display_name
    }));

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
