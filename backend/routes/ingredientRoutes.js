const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM prefixes ORDER BY code ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { code, description } = req.body;
  try {
    await db.query('INSERT INTO prefixes (code, description) VALUES (?, ?)', [code, description]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/delete', async (req, res) => {
  const { code } = req.body;
  try {
    await db.query('DELETE FROM prefixes WHERE code = ?', [code]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;