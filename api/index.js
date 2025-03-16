const express = require('express');
const app = express();

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello, world!' });
});

app.get('/api/greet', (req, res) => {
  res.json({ message: 'Hello from /api/greet!' });
});


// Vercel の API 用のエクスポート
module.exports = app;

// あげわｇふぁうぇがｗ~



