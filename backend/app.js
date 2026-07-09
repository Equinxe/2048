import express from 'express';
import profilesRouter from './routes/profiles.js';
import gamesRouter from './routes/games.js';

const app = express();

app.disable('x-powered-by');
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use('/api/profiles', profilesRouter);
app.use('/api/games', gamesRouter);

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    status: 404,
  });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const isClientError = status < 500;

  if (!isClientError) {
    console.error('Unhandled server error:', err);
  }

  res.status(status).json({
    error: isClientError ? err.message : 'Internal Server Error',
    status,
  });
});

export default app;
