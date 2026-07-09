import express from 'express';

const router = express.Router();

router.get('/ping', (req, res) => {
  res.json({ message: 'games endpoint online' });
});

export default router;
