import express from 'express';
import { config } from 'dotenv';
import cron from 'node-cron';
import bodyParser from 'body-parser';

import state from '../states/index.js';
import syncSheetsToMongo from './utils/syncSheetsToMongo.js';
import { logData } from './utils/common.js';

config();

const { PORT, EXPRESS_ACCESS_TOKEN } = process.env;

const app = express();

app.use(bodyParser.json());

app.post('/api/v1/coupons', (req, res) => {
  try {
    // Получаем токен из заголовка Authorization
    const token = req.headers.authorization.split(' ')[1];

    if (!token) {
      res.status(403);
    }

    if (token !== EXPRESS_ACCESS_TOKEN) {
      res.status(401).json({ message: 'Auth failed' });
    } else {
      // здесь получить данные
      const data = JSON.stringify(req.body);
      logData('log.json', data);

      res.json({ message: "you're done!" });
    }
  } catch (error) {
    console.log(error.message);
    res.status(403);
  }
});

// Запустить бот с текущим состоянием (раскомментировать нужный)

// dev - разработка
// state.dev();

// draw - идёт розыгрыш
state.draw();

// idle - розыгрыш закончился ("заглушка")
// state.idle();

// Синхронизируем таблицу с базой данных каждый день в 6:00, 12:00, 18:00 и 23:59
cron.schedule('0 0 6,12,18,23 * * *', () => {
  syncSheetsToMongo();
});

app.listen(PORT);
