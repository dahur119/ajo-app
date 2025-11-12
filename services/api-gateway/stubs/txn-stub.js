const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const PORT = process.env.TXN_STUB_PORT || 8086;

const groups = new Map();
const cycles = new Map();

// Create group
app.post('/groups', (req, res) => {
  const id = crypto.randomUUID();
  const { name, ownerUserId } = req.body || {};
  groups.set(id, { id, name: name || 'Stub Group', ownerUserId });
  return res.status(201).json({ id });
});

// List members
app.get('/groups/:id/members', (req, res) => {
  const { id } = req.params;
  if (!groups.has(id)) return res.status(404).json({ error: 'group not found' });
  return res.status(200).json([{ id: crypto.randomUUID(), groupId: id, role: 'owner' }]);
});

// Create cycle
app.post('/cycles', (req, res) => {
  const id = crypto.randomUUID();
  const { groupId, amount, frequency, slots } = req.body || {};
  cycles.set(id, { id, groupId, amount, frequency, slots, status: 'created' });
  return res.status(201).json({ id });
});

// Start cycle
app.post('/cycles/:id/start', (req, res) => {
  const { id } = req.params;
  const c = cycles.get(id);
  if (!c) return res.status(404).json({ error: 'cycle not found' });
  c.status = 'active';
  return res.status(200).json({ started: true });
});

// Get cycle status
app.get('/cycles/:id/status', (req, res) => {
  const { id } = req.params;
  const c = cycles.get(id);
  if (!c) return res.status(404).json({ error: 'cycle not found' });
  return res.status(200).json({ id, status: c.status });
});

app.listen(PORT, () => {
  console.log(`[txn-stub] listening on http://localhost:${PORT}`);
});