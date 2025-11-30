// express_backend/routes/telegram.js
import express from 'express';
import { handleTelegramUpdate } from '../telegramBot.js';

const router = express.Router();

router.post('/webhook', async (req, res) => {
  try {
    await handleTelegramUpdate(req.body);
    res.status(200).send('OK');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

export default router;