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

app.use(bodyParser.json({ limit: '10mb' }));
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
      const body = JSON.parse(req.body);
      handleRequestData(body);
      syncSheetsToMongo();

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

app.listen(PORT);
https.createServer(options, app).listen(8443);
