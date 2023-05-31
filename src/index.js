import express from 'express';
import { config } from 'dotenv';
import cron from 'node-cron';

import state from '../states/index.js';
import syncSheetsToMongo from './utils/syncSheetsToMongo.js';

const { PORT } = process.env;

config();
const app = express();

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
