const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const PORT = process.env.INV_STUB_PORT || 8087;

const products = new Map();

// Create product
app.post('/products', (req, res) => {
  const id = crypto.randomUUID();
  const prod = { id, ...(req.body || {}), active: true };
  products.set(id, prod);
  return res.status(201).json(prod);
});

// List products
app.get('/products', (_req, res) => {
  return res.status(200).json(Array.from(products.values()));
});

// Update product
app.put('/products/:id', (req, res) => {
  const { id } = req.params;
  if (!products.has(id)) return res.status(404).json({ error: 'product not found' });
  const updated = { ...products.get(id), ...(req.body || {}) };
  products.set(id, updated);
  return res.status(200).json(updated);
});

// Soft delete
app.delete('/products/:id', (req, res) => {
  const { id } = req.params;
  products.delete(id);
  return res.status(204).send();
});

// Create subscription
app.post('/subscriptions', (req, res) => {
  const id = crypto.randomUUID();
  return res.status(201).json({ id, ...(req.body || {}) });
});

// List subscription transactions
app.get('/subscriptions/:id/transactions', (req, res) => {
  const { id } = req.params;
  return res.status(200).json([]);
});

// Contribute
app.post('/subscriptions/:id/contributions', (req, res) => {
  return res.status(202).json({ status: 'pending' });
});

// Withdraw
app.post('/subscriptions/:id/withdrawals', (req, res) => {
  return res.status(202).json({ status: 'posted' });
});

// Health and readiness endpoints with correlation echo
app.get('/health', (req, res) => {
  const requestId = req.header('x-request-id') || crypto.randomUUID();
  res.set('x-request-id', requestId);
  return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), requestId });
});

app.get('/ready', (req, res) => {
  const requestId = req.header('x-request-id') || crypto.randomUUID();
  res.set('x-request-id', requestId);
  return res.status(200).json({ ready: true, timestamp: new Date().toISOString(), requestId });
});

app.listen(PORT, () => {
  console.log(`[investment-stub] listening on http://localhost:${PORT}`);
});