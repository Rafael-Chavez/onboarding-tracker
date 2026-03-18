import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Get all trade requests with optional filters
router.get('/', async (req, res) => {
  try {
    const { employee_id, status } = req.query;

    let query = `
      SELECT
        st.*,
        ie.name as initiator_name,
        ie.color as initiator_color,
        re.name as respondent_name,
        re.color as respondent_color,
        ins.shift_date as initiator_shift_date,
        ins.week_start_date as initiator_week_start,
        rns.shift_date as respondent_shift_date,
        rns.week_start_date as respondent_week_start
      FROM shift_trades st
      JOIN employees ie ON st.initiator_employee_id = ie.id
      JOIN employees re ON st.respondent_employee_id = re.id
      JOIN night_shifts ins ON st.initiator_shift_id = ins.id
      JOIN night_shifts rns ON st.respondent_shift_id = rns.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (employee_id) {
      query += ` AND (st.initiator_employee_id = $${paramCount} OR st.respondent_employee_id = $${paramCount})`;
      params.push(employee_id);
      paramCount++;
    }

    if (status) {
      query += ` AND st.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ' ORDER BY st.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching trades:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get pending trades for a specific employee
router.get('/pending/:employee_id', async (req, res) => {
  try {
    const { employee_id } = req.params;

    const result = await pool.query(
      `SELECT
        st.*,
        ie.name as initiator_name,
        ie.color as initiator_color,
        re.name as respondent_name,
        re.color as respondent_color,
        ins.shift_date as initiator_shift_date,
        ins.week_start_date as initiator_week_start,
        rns.shift_date as respondent_shift_date,
        rns.week_start_date as respondent_week_start
       FROM shift_trades st
       JOIN employees ie ON st.initiator_employee_id = ie.id
       JOIN employees re ON st.respondent_employee_id = re.id
       JOIN night_shifts ins ON st.initiator_shift_id = ins.id
       JOIN night_shifts rns ON st.respondent_shift_id = rns.id
       WHERE (st.initiator_employee_id = $1 OR st.respondent_employee_id = $1)
       AND st.status = 'pending'
       ORDER BY st.created_at DESC`,
      [employee_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending trades:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific trade by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        st.*,
        ie.name as initiator_name,
        ie.color as initiator_color,
        re.name as respondent_name,
        re.color as respondent_color,
        ins.shift_date as initiator_shift_date,
        ins.week_start_date as initiator_week_start,
        rns.shift_date as respondent_shift_date,
        rns.week_start_date as respondent_week_start
       FROM shift_trades st
       JOIN employees ie ON st.initiator_employee_id = ie.id
       JOIN employees re ON st.respondent_employee_id = re.id
       JOIN night_shifts ins ON st.initiator_shift_id = ins.id
       JOIN night_shifts rns ON st.respondent_shift_id = rns.id
       WHERE st.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trade request not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching trade:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new trade request
router.post('/', async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      initiator_employee_id,
      respondent_employee_id,
      initiator_shift_id,
      respondent_shift_id,
      trade_message,
      auto_swap_back = true
    } = req.body;

    // Validate required fields
    if (!initiator_employee_id || !respondent_employee_id || !initiator_shift_id || !respondent_shift_id) {
      return res.status(400).json({
        error: 'initiator_employee_id, respondent_employee_id, initiator_shift_id, and respondent_shift_id are required'
      });
    }

    // Validate that employees are different
    if (initiator_employee_id === respondent_employee_id) {
      return res.status(400).json({ error: 'Cannot trade shifts with yourself' });
    }

    // Validate that shifts are different
    if (initiator_shift_id === respondent_shift_id) {
      return res.status(400).json({ error: 'Cannot trade the same shift' });
    }

    await client.query('BEGIN');

    // Verify both shifts exist and belong to the correct employees
    const shiftsCheck = await client.query(
      `SELECT id, employee_id, shift_date, status FROM night_shifts
       WHERE id IN ($1, $2)`,
      [initiator_shift_id, respondent_shift_id]
    );

    if (shiftsCheck.rows.length !== 2) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'One or both shifts not found' });
    }

    const initiatorShift = shiftsCheck.rows.find(s => s.id == initiator_shift_id);
    const respondentShift = shiftsCheck.rows.find(s => s.id == respondent_shift_id);

    if (initiatorShift.employee_id != initiator_employee_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Initiator shift does not belong to initiator employee' });
    }

    if (respondentShift.employee_id != respondent_employee_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Respondent shift does not belong to respondent employee' });
    }

    // Check if shifts are already traded or cancelled
    if (initiatorShift.status === 'traded' || respondentShift.status === 'traded') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'One or both shifts are already involved in a trade' });
    }

    // Check if there's already a pending trade for either shift
    const existingTrade = await client.query(
      `SELECT id FROM shift_trades
       WHERE (initiator_shift_id IN ($1, $2) OR respondent_shift_id IN ($1, $2))
       AND status = 'pending'`,
      [initiator_shift_id, respondent_shift_id]
    );

    if (existingTrade.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'One or both shifts already have a pending trade request' });
    }

    // Create the trade request
    const result = await client.query(
      `INSERT INTO shift_trades (
        initiator_employee_id,
        respondent_employee_id,
        initiator_shift_id,
        respondent_shift_id,
        trade_message,
        auto_swap_back,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *`,
      [
        initiator_employee_id,
        respondent_employee_id,
        initiator_shift_id,
        respondent_shift_id,
        trade_message,
        auto_swap_back
      ]
    );

    await client.query('COMMIT');

    // Fetch the full trade details to return
    const fullTrade = await pool.query(
      `SELECT
        st.*,
        ie.name as initiator_name,
        re.name as respondent_name,
        ins.shift_date as initiator_shift_date,
        rns.shift_date as respondent_shift_date
       FROM shift_trades st
       JOIN employees ie ON st.initiator_employee_id = ie.id
       JOIN employees re ON st.respondent_employee_id = re.id
       JOIN night_shifts ins ON st.initiator_shift_id = ins.id
       JOIN night_shifts rns ON st.respondent_shift_id = rns.id
       WHERE st.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(fullTrade.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating trade request:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Accept a trade request
router.post('/:id/accept', async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { response_message } = req.body;

    await client.query('BEGIN');

    // Get the trade details
    const tradeResult = await client.query(
      `SELECT * FROM shift_trades WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (tradeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Trade request not found' });
    }

    const trade = tradeResult.rows[0];

    if (trade.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Trade request is ${trade.status}, cannot accept` });
    }

    // Update the trade status to accepted
    await client.query(
      `UPDATE shift_trades
       SET status = 'accepted', response_message = $1, updated_at = NOW()
       WHERE id = $2`,
      [response_message, id]
    );

    // Swap the employees for the shifts
    await client.query(
      `UPDATE night_shifts
       SET employee_id = $1, status = 'traded'
       WHERE id = $2`,
      [trade.respondent_employee_id, trade.initiator_shift_id]
    );

    await client.query(
      `UPDATE night_shifts
       SET employee_id = $1, status = 'traded'
       WHERE id = $2`,
      [trade.initiator_employee_id, trade.respondent_shift_id]
    );

    await client.query('COMMIT');

    // Fetch updated trade details
    const updatedTrade = await pool.query(
      `SELECT
        st.*,
        ie.name as initiator_name,
        re.name as respondent_name,
        ins.shift_date as initiator_shift_date,
        rns.shift_date as respondent_shift_date
       FROM shift_trades st
       JOIN employees ie ON st.initiator_employee_id = ie.id
       JOIN employees re ON st.respondent_employee_id = re.id
       JOIN night_shifts ins ON st.initiator_shift_id = ins.id
       JOIN night_shifts rns ON st.respondent_shift_id = rns.id
       WHERE st.id = $1`,
      [id]
    );

    res.json(updatedTrade.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error accepting trade:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Reject a trade request
router.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { response_message } = req.body;

    const tradeResult = await pool.query(
      `SELECT * FROM shift_trades WHERE id = $1`,
      [id]
    );

    if (tradeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trade request not found' });
    }

    const trade = tradeResult.rows[0];

    if (trade.status !== 'pending') {
      return res.status(400).json({ error: `Trade request is ${trade.status}, cannot reject` });
    }

    const result = await pool.query(
      `UPDATE shift_trades
       SET status = 'rejected', response_message = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [response_message, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error rejecting trade:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel a trade request (by initiator only, before acceptance)
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { initiator_employee_id } = req.body;

    if (!initiator_employee_id) {
      return res.status(400).json({ error: 'initiator_employee_id is required' });
    }

    const tradeResult = await pool.query(
      `SELECT * FROM shift_trades WHERE id = $1`,
      [id]
    );

    if (tradeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Trade request not found' });
    }

    const trade = tradeResult.rows[0];

    if (trade.initiator_employee_id != initiator_employee_id) {
      return res.status(403).json({ error: 'Only the initiator can cancel this trade request' });
    }

    if (trade.status !== 'pending') {
      return res.status(400).json({ error: `Trade request is ${trade.status}, cannot cancel` });
    }

    const result = await pool.query(
      `UPDATE shift_trades
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error cancelling trade:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a trade request (admin only, or cleanup old rejected/cancelled trades)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM shift_trades WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trade request not found' });
    }

    res.json({ message: 'Trade request deleted successfully', trade: result.rows[0] });
  } catch (error) {
    console.error('Error deleting trade:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
