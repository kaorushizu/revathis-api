const express = require('express');
const app = express();

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello, world!' });
});

// Vercel のサーバーレス環境では「app.listen」は不要
module.exports = app;