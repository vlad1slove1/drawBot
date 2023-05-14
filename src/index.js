import express from 'express';
import { config } from 'dotenv';
import { Telegraf, Markup, session } from 'telegraf';
import numeralize from 'numeralize-ru';

import { getTicketsFromDb, fillArrWithTickets } from './utils.js';

const { FEEDBACK_CHAT_ID } = process.env;

config();
const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use(session());

let phoneNumber;

const messages = {
  greetingMessage: 'Вас приветствует ассистент по розыгрышу компании ПИВСТОП!',
  requestPersonalDataMessage: 'Чтобы показать все ваши купоны, необходимо подтвердить ваш номер телефона',
  shareContactMessage: 'Пожалуйста, поделитесь с ботом вашим контактом',
};

bot.start((ctx) => {
  ctx.reply(messages.greetingMessage);

  setTimeout(() => ctx.reply(messages.requestPersonalDataMessage), 2500);
  setTimeout(() => ctx.reply(messages.shareContactMessage, {
    reply_markup: {
      keyboard: [
        [{
          text: 'Отправить мой контакт',
          request_contact: true,
        }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  }), 4000);
});

bot.use((actionCtx, next) => {
  if (actionCtx.update.message && actionCtx.update.message.contact) {
    phoneNumber = actionCtx.update.message.contact.phone_number;
    const parsedPhone = phoneNumber.substring(1); // без кода страны

    setTimeout(() => {
      actionCtx.replyWithMarkdownV2(
        `Ищем купоны в нашей базе по номеру телефона: \`${phoneNumber.replace(/`/g, '\\`')}\``,
        Markup.removeKeyboard(),
      );
    }, 1500);

    setTimeout(() => {
      getTicketsFromDb(parsedPhone).then((res) => {
        if (res.length === 0) {
          actionCtx.reply('На ваш номер телефона не оформлено купонов');
          return;
        }

        const ticketsCount = Object.values(res[0])[4];
        const pluralizedTickets = numeralize.pluralize(ticketsCount, 'купон', 'купона', 'купонов');

        const tickets = ['*Номера ваших купонов:*'];
        fillArrWithTickets(res, tickets);

        const stringifiedTickets = tickets.join('\n');

        actionCtx.replyWithMarkdownV2(
          `На ваш номер телефона оформлено *${ticketsCount} ${pluralizedTickets}*\n\n${stringifiedTickets}`,
        );
      });
    }, 5000);
  }

  next();
});

// Установим флаг состояния, что ожидаем ответ на вопрос
let awaitingAnswer = true;

bot.command('help', async (ctx) => {
  ctx.sendMessage(
    'Опишите вашу проблему. Служба поддержки постарается вам помочь',
    {
      reply_markup: {
        force_reply: true,
        input_field_placeholder: 'У меня...',
      },
    },
  );

  bot.on('text', async (textCtx) => {
    if (awaitingAnswer) {
      // Получаем ответ пользователя
      const answer = textCtx.update.message.text;

      // Выводим ответ пользователя
      // console.log(`Ответ пользователя: ${answer}`);
      const date = new Date();
      const parsedDate = date.toLocaleDateString('ru-RU');
      bot.telegram.sendMessage(FEEDBACK_CHAT_ID, `${parsedDate}\n\nКлиент: ${phoneNumber}\n\n${answer}`);

      // Сбрасываем флаг состояния
      awaitingAnswer = false;

      // Отвечаем пользователю, что его ответ сохранен
      textCtx.reply('Ваше сообщение отправлено в службу поддержки');
    }
  });

  awaitingAnswer = true;
});

bot.launch();

app.listen(process.env.PORT);
