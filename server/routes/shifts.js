import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Get all night shifts with optional filters
router.get('/', async (req, res) => {
  try {
    const { employee_id, start_date, end_date, status, week_start_date } = req.query;

    let query = `
      SELECT ns.*, e.name as employee_name, e.color as employee_color
      FROM night_shifts ns
      JOIN employees e ON ns.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (employee_id) {
      query += ` AND ns.employee_id = $${paramCount}`;
      params.push(employee_id);
      paramCount++;
    }

    if (start_date) {
      query += ` AND ns.shift_date >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      query += ` AND ns.shift_date <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    if (status) {
      query += ` AND ns.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (week_start_date) {
      query += ` AND ns.week_start_date = $${paramCount}`;
      params.push(week_start_date);
      paramCount++;
    }

    query += ' ORDER BY ns.shift_date ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific shift by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT ns.*, e.name as employee_name, e.color as employee_color
       FROM night_shifts ns
       JOIN employees e ON ns.employee_id = e.id
       WHERE ns.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching shift:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get shifts by date range (for calendar view)
router.get('/calendar/range', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }

    const result = await pool.query(
      `SELECT ns.*, e.name as employee_name, e.color as employee_color
       FROM night_shifts ns
       JOIN employees e ON ns.employee_id = e.id
       WHERE ns.shift_date BETWEEN $1 AND $2
       ORDER BY ns.shift_date ASC`,
      [start_date, end_date]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching calendar shifts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update shift status (for marking as completed)
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['scheduled', 'completed', 'traded', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(
      `UPDATE night_shifts
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    // If shift is marked as completed, check if there are any active trades
    if (status === 'completed') {
      await checkTradeCompletion(id);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating shift status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to check if both sides of a trade are completed
async function checkTradeCompletion(shiftId) {
  try {
    // Find any accepted trades involving this shift
    const tradeResult = await pool.query(
      `SELECT * FROM shift_trades
       WHERE (initiator_shift_id = $1 OR respondent_shift_id = $1)
       AND status = 'accepted'`,
      [shiftId]
    );

    for (const trade of tradeResult.rows) {
      // Check if both shifts are completed
      const shiftsResult = await pool.query(
        `SELECT id, status FROM night_shifts
         WHERE id IN ($1, $2)`,
        [trade.initiator_shift_id, trade.respondent_shift_id]
      );

      const allCompleted = shiftsResult.rows.every(shift => shift.status === 'completed');

      if (allCompleted) {
        // Mark the trade as completed
        await pool.query(
          `UPDATE shift_trades
           SET status = 'completed',
               initiator_completed = true,
               respondent_completed = true,
               completed_at = NOW()
           WHERE id = $1`,
          [trade.id]
        );

        // The trigger will handle auto swap-back if enabled
      }
    }
  } catch (error) {
    console.error('Error checking trade completion:', error);
  }
}

// Create a new shift (admin only, for manual adjustments)
router.post('/', async (req, res) => {
  try {
    const { employee_id, shift_date, week_start_date, status } = req.body;

    if (!employee_id || !shift_date || !week_start_date) {
      return res.status(400).json({ error: 'employee_id, shift_date, and week_start_date are required' });
    }

    const result = await pool.query(
      `INSERT INTO night_shifts (employee_id, shift_date, week_start_date, status, original_employee_id)
       VALUES ($1, $2, $3, $4, $1)
       RETURNING *`,
      [employee_id, shift_date, week_start_date, status || 'scheduled']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating shift:', error);
    if (error.code === '23505') { // Unique violation
      res.status(409).json({ error: 'A shift already exists for this date' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Delete a shift (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if shift has any active trades
    const tradeCheck = await pool.query(
      `SELECT id FROM shift_trades
       WHERE (initiator_shift_id = $1 OR respondent_shift_id = $1)
       AND status IN ('pending', 'accepted')`,
      [id]
    );

    if (tradeCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Cannot delete shift with active trades' });
    }

    const result = await pool.query(
      'DELETE FROM night_shifts WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    res.json({ message: 'Shift deleted successfully', shift: result.rows[0] });
  } catch (error) {
    console.error('Error deleting shift:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
