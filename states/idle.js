import { config } from 'dotenv';
import { Telegraf, session } from 'telegraf';
import numeralize from 'numeralize-ru';

import fillArrWithTickets from '../src/utils/common.js';
import { getTicketsFromDb } from '../src/utils/dbActions.js';

export default () => {
  config();

  const { BOT_TOKEN, POST_LINK, FEEDBACK_LINK } = process.env;

  const bot = new Telegraf(BOT_TOKEN);
  bot.use(session());

  // В состоянии хранится автомат awaitingAnswer
  bot.context.state = {
    awaitingAnswer: true,
  };

  // Объект с шаблонами сообщений
  const messages = {
    checkMessage: 'С помощью команды в меню можете проверить ваши купоны по номеру телефона',
    winnersMessage: `Ознакомиться со списком победителей по <a href="${POST_LINK}">ссылке в нашей группе</a>`,
    finalMessage: 'Увидимся с вами в следующем розыгрыше! Будет больше призов и ещё больше победителей!',
  };

  bot.start((ctx) => {
    // бот выводит несколько инф. сообщений подряд
    ctx.reply('Майский Мегарозыгрыш от ПИВСТОП подошёл к концу!');
    setTimeout(() => ctx.reply(messages.checkMessage), 2000);
    setTimeout(() => ctx.replyWithHTML(messages.winnersMessage), 4000);
    setTimeout(() => ctx.reply(messages.finalMessage), 6000);
  });

  /**
   * Обработчик команды /check (проверить купоны на другом номере)
   * бот присылает сообщение и ожидает ответа от пользователя
   * ответ должен быть в виде номера телефона формата "71234567890"
   */
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

        const parsedPhone = answer.slice(1); // без кода страны
        getTicketsFromDb(parsedPhone).then((res) => {
          const phoneNumberRegex = /^(7)[0-9]{10}$/;

          // проверка формата
          if (!phoneNumberRegex.test(answer)) {
            textCtx.reply('Неправильный формат телефона');
            bot.context.state.awaitingAnswer = false;

            return;
          }

          // формат правильный, но совпадений не найдено
          if (phoneNumberRegex.test(answer) && res.length === 0) {
            textCtx.reply('Купонов по данному номеру не найдено');
            bot.context.state.awaitingAnswer = false;

            return;
          }

          const ticketsCount = Object.values(res[0])[4];
          const pluralizedTickets = numeralize.pluralize(ticketsCount, 'купон', 'купона', 'купонов');

          /**
           * формируем массив из строк с купонами формата:
           * Номера ваших купонов:
           * Код 1234567890, id купона: 0
           * Код 1234567890, id купона: 1
           */
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

  /**
   * Обработчик команды /help (обратиться в поддержку)
   * бот присылает ссылку на гугл-форму для обратной связи
   */
  bot.command('help', async (ctx) => {
    ctx.reply(`Нажмите на ссылку для заполнения формы: ${FEEDBACK_LINK}`, { disable_web_page_preview: true });
  });

  // Обработчик команды /subscribe (подписаться на уведомления) выключен
  bot.command('subscribe', (ctx) => {
    ctx.reply('Уведомления преостановлены до следующего розыгрыша');
  });

  // Обработчик команды /unsubscribe (отподписаться от уведомлений) выключен
  bot.command('unsubscribe', (ctx) => {
    ctx.reply('Уведомления преостановлены до следующего розыгрыша');
  });

  bot.launch();
};
