const express = require('express');
const app = express();

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello, world!' });
});

// Vercel の API 用のエクスポート
module.exports = app;