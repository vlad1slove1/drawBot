import { config } from 'dotenv';
import { Telegraf, session } from 'telegraf';
import numeralize from 'numeralize-ru';

import { getTicketsFromDb, fillArrWithTickets } from '../src/utils.js';

export default () => {
  config();

  const { BOT_TOKEN, POST_LINK } = process.env;

  const bot = new Telegraf(BOT_TOKEN);
  bot.use(session());

  bot.context.state = {
    awaitingAnswer: true,
  };

  bot.start((ctx) => {
    ctx.reply('Майский Мегарозыгрыш от ПИВСТОП подошёл к концу!');
    setTimeout(() => ctx.reply('С помощью команды в меню можете проверить ваши купоны по номеру телефона'), 2000);
    setTimeout(() => ctx.replyWithHTML(`\n\nОзнакомиться со списком победителей по <a href="${POST_LINK}">ссылке в нашей группе</a>`), 4000);
    setTimeout(() => ctx.reply('\n\nУвидимся с вами в следующем розыгрыше!\nБудет больше призов и ещё больше победителей!'), 6000);
  });

  bot.command('check', (ctx) => {
    ctx.replyWithHTML(
      'Введите ваш номер телефона в формате <b>71234567890</b>',
      {
        reply_markup: {
          force_reply: true,
          input_field_placeholder: 'Ваш номер',
        },
      },
    );

    bot.on('message', (textCtx) => {
      if (bot.context.state.awaitingAnswer) {
        // Получаем ответ пользователя
        const answer = textCtx.update.message.text;
        const parsedPhone = answer.substring(1); // без кода страны
        getTicketsFromDb(parsedPhone).then((res) => {
          const phoneNumberRegex = /^(7)[0-9]{10}$/;

          if (!phoneNumberRegex.test(answer)) {
            textCtx.reply('Неправильный формат телефона');
            return;
          }

          if (phoneNumberRegex.test(answer) && res.length === 0) {
            textCtx.reply('Купонов по данному номеру не найдено');
            return;
          }

          const ticketsCount = Object.values(res[0])[4];
          const pluralizedTickets = numeralize.pluralize(ticketsCount, 'купон', 'купона', 'купонов');

          const tickets = ['*Номера ваших купонов:*'];
          fillArrWithTickets(res, tickets);

          const stringifiedTickets = tickets.join('\n');

          // Сбрасываем флаг состояния
          bot.context.state.awaitingAnswer = false;

          textCtx.replyWithMarkdownV2(
            `На ваш номер телефона оформлено *${ticketsCount} ${pluralizedTickets}*\n\n${stringifiedTickets}`,
          );
        });
      }
    });

    bot.context.state.awaitingAnswer = true;
  });

  bot.command('help', (ctx) => {
    ctx.reply('Опция временно отключена, находится на доработке.');

    /* old version of handler
    ctx.sendMessage(
      'Укажите ФИО, номер телефона и причину обращения',
      {
        reply_markup: {
          force_reply: true,
          input_field_placeholder: 'У меня...',
        },
      },
    );

    bot.on('message', (textCtx) => {
      if (bot.context.state.awaitingAnswer) {
        const { phoneNumber } = bot.context.state;
        // Получаем ответ пользователя
        const answer = textCtx.update.message.text;

        // Выводим ответ пользователя
        // console.log(`Ответ пользователя: ${answer}`);
        const date = new Date();
        const parsedDate = date.toLocaleDateString('ru-RU');
        bot.telegram
          .sendMessage(FEEDBACK_CHAT_ID, `${parsedDate}\n\nКлиент: ${phoneNumber}\n\n${answer}`);

        // Сбрасываем флаг состояния
        bot.context.state.awaitingAnswer = false;

        // Отвечаем пользователю, что его ответ сохранен
        textCtx.reply('Ваше сообщение отправлено в службу поддержки');
      }
    });
    */

    bot.context.state.awaitingAnswer = true;
  });

  bot.launch();
};
