const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pool, encryptData, decryptData } = require('../database/db');
const { body, validationResult } = require('express-validator');

// Get all cases for user
router.get('/my-cases', authenticateToken(), async (req, res) => {
  try {
    let query;
    let params = [req.user.id];

    if (req.user.user_type === 'athlete') {
      query = `
        SELECT c.*, 
               u.first_name as lawyer_first_name,
               u.last_name as lawyer_last_name
        FROM doping_cases c
        LEFT JOIN users u ON c.lawyer_id = u.id
        WHERE c.athlete_id = $1
        ORDER BY c.created_at DESC
      `;
    } else if (req.user.user_type === 'lawyer') {
      query = `
        SELECT c.*,
               a.first_name as athlete_first_name,
               a.last_name as athlete_last_name
        FROM doping_cases c
        JOIN users a ON c.athlete_id = a.id
        WHERE c.lawyer_id = $1 OR c.lawyer_id IS NULL
        ORDER BY c.created_at DESC
      `;
    } else {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const result = await pool.query(query, params);
    
    // Decrypt sensitive data for each case
    const cases = result.rows.map(caseRow => ({
      ...caseRow,
      case_details: caseRow.encrypted_details ? decryptData(caseRow.encrypted_details) : null
    }));

    res.json({ cases });
  } catch (error) {
    console.error('Error fetching cases:', error);
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
});

// Create new doping case
router.post('/', 
  authenticateToken(['lawyer', 'admin', 'federation']),
  [
    body('athlete_id').isUUID().notEmpty(),
    body('alleged_violation').notEmpty(),
    body('sample_date').isISO8601().toDate(),
    body('test_result').notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        athlete_id,
        alleged_violation,
        substance_name,
        sample_date,
        test_result,
        ada_notification_date,
        hearing_date,
        case_summary
      } = req.body;

      // Generate case number
      const caseNumber = `ADV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Encrypt sensitive details
      const encryptedDetails = encryptData(JSON.stringify({
        test_result,
        case_summary,
        created_by: req.user.id
      }));

      const query = `
        INSERT INTO doping_cases (
          case_number, athlete_id, lawyer_id, alleged_violation, 
          substance_name, sample_date, ada_notification_date,
          hearing_date, encrypted_details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const values = [
        caseNumber,
        athlete_id,
        req.user.user_type === 'lawyer' ? req.user.id : null,
        alleged_violation,
        substance_name,
        sample_date,
        ada_notification_date,
        hearing_date,
        encryptedDetails
      ];

      const result = await pool.query(query, values);
      
      // Create notification for athlete
      await pool.query(
        `INSERT INTO notifications (user_id, notification_type, title, message, priority, related_entity_type, related_entity_id)
         VALUES ($1, 'new_case', 'New Doping Case Filed', 'A new doping case has been filed regarding your sample from ${sample_date}.', 'high', 'case', $2)`,
        [athlete_id, result.rows[0].id]
      );

      res.status(201).json({
        success: true,
        case: result.rows[0],
        message: 'Case created successfully'
      });
    } catch (error) {
      console.error('Error creating case:', error);
      res.status(500).json({ error: 'Failed to create case' });
    }
});

// Update case status
router.patch('/:caseId/status', authenticateToken(['lawyer', 'admin']), async (req, res) => {
  try {
    const { caseId } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['investigation', 'charged', 'hearing', 'appeal', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Fetch current status to capture old value
    const currentRes = await pool.query(
      'SELECT case_status FROM doping_cases WHERE id = $1',
      [caseId]
    );

    if (currentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const oldStatus = currentRes.rows[0].case_status;

    const updateQuery = `
      UPDATE doping_cases 
      SET case_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [status, caseId]);

    // Log status change (store changes as JSON)
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes)
       VALUES ($1, 'case_status_update', 'doping_case', $2, $3)`,
      [req.user.id, caseId, JSON.stringify({ old_status: oldStatus, new_status: status, notes })]
    );

    res.json({
      success: true,
      case: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating case status:', error);
    res.status(500).json({ error: 'Failed to update case status' });
  }
});

// Get case timeline/audit trail
router.get('/:caseId/timeline', authenticateToken(), async (req, res) => {
  try {
    const { caseId } = req.params;

    // Verify user has access to this case
    const accessCheck = await pool.query(
      `SELECT athlete_id, lawyer_id FROM doping_cases WHERE id = $1`,
      [caseId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const caseData = accessCheck.rows[0];
    if (req.user.user_type === 'athlete' && caseData.athlete_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all case events
    const timelineQuery = `
      (SELECT 
        'document_upload' as event_type,
        created_at as timestamp,
        'Document: ' || document_type as description,
        uploaded_by as user_id
       FROM legal_documents 
       WHERE case_id = $1)
      
      UNION ALL
      
      (SELECT 
        'status_change' as event_type,
        timestamp,
        'Status changed: ' || action as description,
        user_id
       FROM audit_logs 
       WHERE entity_type = 'doping_case' AND entity_id = $1)
      
      UNION ALL
      
      (SELECT 
        'consultation' as event_type,
        scheduled_time as timestamp,
        'Video consultation scheduled' as description,
        host_id as user_id
       FROM video_consultations 
       WHERE case_id = $1)
      
      ORDER BY timestamp DESC
    `;

    const timelineResult = await pool.query(timelineQuery, [caseId]);

    res.json({
      timeline: timelineResult.rows
    });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

module.exports = router;
