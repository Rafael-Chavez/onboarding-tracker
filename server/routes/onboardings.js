import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET all onboardings with optional filters
router.get('/', async (req, res) => {
  try {
    const { employee_id, month, attendance, start_date, end_date } = req.query;

    let query = `
      SELECT o.*, e.name as employee_name
      FROM onboardings o
      JOIN employees e ON o.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (employee_id) {
      query += ` AND o.employee_id = $${paramCount}`;
      params.push(employee_id);
      paramCount++;
    }

    if (month) {
      query += ` AND o.month = $${paramCount}`;
      params.push(month);
      paramCount++;
    }

    if (attendance) {
      query += ` AND o.attendance = $${paramCount}`;
      params.push(attendance);
      paramCount++;
    }

    if (start_date) {
      query += ` AND o.date >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      query += ` AND o.date <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    query += ' ORDER BY o.date DESC, o.created_at DESC';

    const result = await pool.query(query, params);

    // Transform to match frontend format
    const onboardings = result.rows.map(row => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      clientName: row.client_name,
      accountNumber: row.account_number,
      sessionNumber: row.session_number,
      attendance: row.attendance,
      date: row.date.toISOString().split('T')[0],
      month: row.month
    }));

    res.json(onboardings);
  } catch (error) {
    console.error('Error fetching onboardings:', error);
    res.status(500).json({ error: 'Failed to fetch onboardings' });
  }
});

// GET single onboarding by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT o.*, e.name as employee_name
       FROM onboardings o
       JOIN employees e ON o.employee_id = e.id
       WHERE o.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Onboarding not found' });
    }

    const row = result.rows[0];
    const onboarding = {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      clientName: row.client_name,
      accountNumber: row.account_number,
      sessionNumber: row.session_number,
      attendance: row.attendance,
      date: row.date.toISOString().split('T')[0],
      month: row.month
    };

    res.json(onboarding);
  } catch (error) {
    console.error('Error fetching onboarding:', error);
    res.status(500).json({ error: 'Failed to fetch onboarding' });
  }
});

// POST create new onboarding
router.post('/', async (req, res) => {
  try {
    const {
      employeeId,
      clientName,
      accountNumber,
      sessionNumber,
      attendance = 'pending',
      date
    } = req.body;

    if (!employeeId || !clientName || !accountNumber || !date) {
      return res.status(400).json({
        error: 'Employee ID, client name, account number, and date are required'
      });
    }

    // Extract month from date (YYYY-MM format)
    const month = date.substring(0, 7);

    const result = await pool.query(
      `INSERT INTO onboardings
       (employee_id, client_name, account_number, session_number, attendance, date, month)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [employeeId, clientName, accountNumber, sessionNumber || 1, attendance, date, month]
    );

    // Get employee name
    const employeeResult = await pool.query(
      'SELECT name FROM employees WHERE id = $1',
      [employeeId]
    );

    const row = result.rows[0];
    const onboarding = {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: employeeResult.rows[0]?.name,
      clientName: row.client_name,
      accountNumber: row.account_number,
      sessionNumber: row.session_number,
      attendance: row.attendance,
      date: row.date.toISOString().split('T')[0],
      month: row.month
    };

    res.status(201).json(onboarding);
  } catch (error) {
    console.error('Error creating onboarding:', error);
    res.status(500).json({ error: 'Failed to create onboarding' });
  }
});

// PUT update onboarding
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      employeeId,
      clientName,
      accountNumber,
      sessionNumber,
      attendance,
      date
    } = req.body;

    // Build dynamic update query
    const updates = [];
    const params = [];
    let paramCount = 1;

    if (employeeId !== undefined) {
      updates.push(`employee_id = $${paramCount}`);
      params.push(employeeId);
      paramCount++;
    }
    if (clientName !== undefined) {
      updates.push(`client_name = $${paramCount}`);
      params.push(clientName);
      paramCount++;
    }
    if (accountNumber !== undefined) {
      updates.push(`account_number = $${paramCount}`);
      params.push(accountNumber);
      paramCount++;
    }
    if (sessionNumber !== undefined) {
      updates.push(`session_number = $${paramCount}`);
      params.push(sessionNumber);
      paramCount++;
    }
    if (attendance !== undefined) {
      updates.push(`attendance = $${paramCount}`);
      params.push(attendance);
      paramCount++;
    }
    if (date !== undefined) {
      updates.push(`date = $${paramCount}`);
      params.push(date);
      paramCount++;

      // Update month as well
      const month = date.substring(0, 7);
      updates.push(`month = $${paramCount}`);
      params.push(month);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const query = `
      UPDATE onboardings
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Onboarding not found' });
    }

    // Get employee name
    const employeeResult = await pool.query(
      'SELECT name FROM employees WHERE id = $1',
      [result.rows[0].employee_id]
    );

    const row = result.rows[0];
    const onboarding = {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: employeeResult.rows[0]?.name,
      clientName: row.client_name,
      accountNumber: row.account_number,
      sessionNumber: row.session_number,
      attendance: row.attendance,
      date: row.date.toISOString().split('T')[0],
      month: row.month
    };

    res.json(onboarding);
  } catch (error) {
    console.error('Error updating onboarding:', error);
    res.status(500).json({ error: 'Failed to update onboarding' });
  }
});

// DELETE onboarding
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM onboardings WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Onboarding not found' });
    }

    res.json({ message: 'Onboarding deleted successfully' });
  } catch (error) {
    console.error('Error deleting onboarding:', error);
    res.status(500).json({ error: 'Failed to delete onboarding' });
  }
});

// POST bulk create onboardings (for migration/import)
router.post('/bulk', async (req, res) => {
  const client = await pool.connect();

  try {
    const { onboardings } = req.body;

    if (!Array.isArray(onboardings) || onboardings.length === 0) {
      return res.status(400).json({ error: 'Onboardings array is required' });
    }

    await client.query('BEGIN');

    const inserted = [];
    for (const ob of onboardings) {
      const {
        employeeId,
        clientName,
        accountNumber,
        sessionNumber = 1,
        attendance = 'pending',
        date
      } = ob;

      if (!employeeId || !clientName || !accountNumber || !date) {
        continue; // Skip invalid entries
      }

      const month = date.substring(0, 7);

      const result = await client.query(
        `INSERT INTO onboardings
         (employee_id, client_name, account_number, session_number, attendance, date, month)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [employeeId, clientName, accountNumber, sessionNumber, attendance, date, month]
      );

      inserted.push(result.rows[0]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Onboardings imported successfully',
      count: inserted.length
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error bulk creating onboardings:', error);
    res.status(500).json({ error: 'Failed to bulk create onboardings' });
  } finally {
    client.release();
  }
});

export default router;
