const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const PORT = process.env.USER_STUB_PORT || 8085;
const JWT_SECRET = process.env.JWT_SECRET || 'local-dev-secret';

function mintToken(email) {
  const sub = crypto.randomUUID();
  const payload = {
    sub,
    email,
    // Default to NOT verified; tests will use header to mark verified
    email_verified_at: null,
    iss: 'https://auth.local',
    aud: 'api-gateway',
  };
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
}

app.post('/api/register', (req, res) => {
  const { email } = req.body || {};
  const token = mintToken(email || `stub_${Date.now()}@example.com`);
  return res.status(201).json({ user: { id: jwt.decode(token)?.sub, email }, token });
});

app.post('/api/login', (req, res) => {
  const { email } = req.body || {};
  const token = mintToken(email || `stub_${Date.now()}@example.com`);
  return res.status(200).json({ token });
});

app.listen(PORT, () => {
  console.log(`[user-stub] listening on http://localhost:${PORT}`);
});