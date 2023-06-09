import express from 'express';
import { config } from 'dotenv';
import bodyParser from 'body-parser';
import https from 'https';
import helmet from 'helmet';
import { readFileSync } from 'fs';

import state from '../states/index.js';
import { syncSheetsToMongo, handleRequestData } from './utils/syncSheetsToMongo.js';

config();

const { PORT, EXPRESS_ACCESS_TOKEN } = process.env;

const app = express();

// При необходимости, нужно изменить парсер на raw или text
app.use(bodyParser.json({ limit: '32mb' }));
app.use(express.static('static'));
app.use(helmet());

const options = {
  cert: readFileSync('./fullchain.pem'),
  key: readFileSync('./privkey.pem'),
};

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
      // Обработка данных
      handleRequestData(req.body);
      syncSheetsToMongo();

      res.json({ message: 'Data successfully synchronized' });
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

app.listen(PORT);
https.createServer(options, app).listen(8443);
