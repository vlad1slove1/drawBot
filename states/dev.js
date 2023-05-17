import { config } from 'dotenv';
import { Telegraf, session } from 'telegraf';

export default () => {
  config();

  const { BOT_TOKEN } = process.env;

  const bot = new Telegraf(BOT_TOKEN);
  bot.use(session());

  bot.start((ctx) => {
    ctx.reply('Бот на доработке, функционал временно приостановлен');
  });

  bot.launch();
};
