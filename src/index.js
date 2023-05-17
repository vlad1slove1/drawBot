import express from 'express';
import { config } from 'dotenv';

import state from '../states/index.js';

const { PORT } = process.env;

config();
const app = express();

// Запустить бот с текущим состоянием (раскомментировать нужный)

// dev - разработка
// state.dev();

// draw - идёт розыгрыш
// state.draw();

// draw - розыгрыш закончился ("заглушка")
state.idle();

app.listen(PORT);
