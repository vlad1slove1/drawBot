import { config } from 'dotenv';
import { Telegraf, Markup, session } from 'telegraf';
import numeralize from 'numeralize-ru';

import { getTicketsFromDb, fillArrWithTickets } from '../src/utils.js';

export default () => {
  config();

  const { BOT_TOKEN } = process.env;

  const bot = new Telegraf(BOT_TOKEN);
  bot.use(session());

  bot.context.state = {
    awaitingAnswer: true,
    phoneNumber: '',
  };

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
      let { phoneNumber } = bot.context.state;
      phoneNumber = actionCtx.update.message.contact.phone_number;
      const parsedPhone = phoneNumber.substring(1); // без кода страны

      setTimeout(() => {
        actionCtx.replyWithMarkdownV2(
          `Ищем купоны в нашей базе по номеру телефона: *${phoneNumber}*`,
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
