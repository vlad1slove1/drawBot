import { config } from 'dotenv';
import { Telegraf, Markup, session } from 'telegraf';
import numeralize from 'numeralize-ru';

import fillArrWithTickets from '../src/utils/common.js';
import {
  getTicketsFromDb,
  findUserInAnnounceDb,
  addUserToAnnounceDb,
  isUserAdmin,
  getAnnounceColl,
  deleteFromAnnounceColl,
} from '../src/utils/dbActions.js';
import { adminKeyboard, yesNoKeyboard } from '../src/utils/keyboards.js';

export default () => {
  config();

  const { BOT_TOKEN, FEEDBACK_LINK } = process.env;

  const bot = new Telegraf(BOT_TOKEN);
  bot.use(session());

  /**
   * В состоянии хранится автомат awaitingAnswer
   * и обработчик номера телефона phoneNumber
   */
  bot.context.state = {
    awaitingAnswer: true,
    phoneNumber: '',
  };

  // Объект с шаблонами сообщений
  const messages = {
    greetingMessage: 'Вас приветствует ассистент по розыгрышу компании ПИВСТОП!',
    requestPersonalDataMessage: 'Чтобы показать все ваши купоны, необходимо подтвердить ваш номер телефона',
  };

  bot.start((ctx) => {
    ctx.reply(messages.greetingMessage);

    /**
     * Проверка на админа:
     * если пользователь есть в коллекции админов, то у него появятся доп. кнопки
     * остальные пользователи получат стандартный вывод от бота
     */
    setTimeout(() => {
      // проверка на админа по userID (chatId в telegram)
      isUserAdmin(ctx.update.message.from.id).then((match) => {
        const isUserInColl = match
          .find((item) => item.id === ctx.update.message.from.id);

        if (isUserInColl) {
          ctx.reply('У вас права админа. Вам доступны дополнительные кнопки в меню', adminKeyboard());
        } else {
          // запрос контакта от пользователя
          ctx.reply(messages.requestPersonalDataMessage, {
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
          });
        }
      });
    }, 2000);
  });

  /**
   * Обработчик контакта от пользователя
   * здесь происходит парсинг номера телефона из контакта
   * и его дальнейшая обработка
   */
  bot.use((actionCtx, next) => {
    if (actionCtx.update.message && actionCtx.update.message.contact) {
      let { phoneNumber } = bot.context.state;
      phoneNumber = actionCtx.update.message.contact.phone_number;
      let parsedPhone = phoneNumber.slice(1); // без кода страны

      setTimeout(() => {
        // с ПК номер отправляется в формате '+7...'
        if (phoneNumber.startsWith('+')) {
          parsedPhone = phoneNumber.slice(2);
        }

        // со смартфонов номер отправляется в формате '7...'
        actionCtx.replyWithMarkdownV2(
          `Ищем купоны в нашей базе по номеру телефона: *${Number(phoneNumber)}*`,
          Markup.removeKeyboard(),
        );
      }, 1500);

      // поиск по номеру телефона совпадений в базе данных
      setTimeout(() => {
        getTicketsFromDb(parsedPhone).then((res) => {
          if (res.length === 0) {
            actionCtx.reply('На ваш номер телефона не оформлено купонов');

            setTimeout(() => {
              actionCtx.replyWithMarkdownV2('Хотите проверить купоны на другом номере? */check*');
            }, 2000);

            /**
             * если пользователь есть в базе данных для аннонса, ничего не показываем
             * в других случаях показываем ему инлайн кнопки "Да/Нет"
             * с вопросом "Хотите подписаться на уведомления?"
             */
            findUserInAnnounceDb(actionCtx.update.message.from.id)
              .then((match) => {
                const isUserInColl = match
                  .find((item) => item.id === actionCtx.update.message.from.id);

                if (!isUserInColl) {
                  setTimeout(() => actionCtx.reply(
                    'Хотите получить уведомление о начале трансляции розыгрыша ПИВСТОП?',
                    yesNoKeyboard(),
                  ), 4000);
                }
              });

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

          actionCtx.replyWithMarkdownV2(
            `На ваш номер телефона оформлено *${ticketsCount} ${pluralizedTickets}*\n\n${stringifiedTickets}`,
          );

          setTimeout(() => {
            actionCtx.reply('Вы можете проверить купоны на другом номере телефона по кнопке в меню');
          }, 2000);

          /**
           * если пользователь есть в базе данных для аннонса, ничего не показываем
           * в других случаях показываем ему инлайн кнопки "Да/Нет"
           * с вопросом "Хотите подписаться на уведомления?"
           */
          findUserInAnnounceDb(actionCtx.update.message.from.id)
            .then((match) => {
              const isUserInColl = match
                .find((item) => item.id === actionCtx.update.message.from.id);

              if (!isUserInColl) {
                setTimeout(() => actionCtx.reply(
                  'Хотите получить уведомление о начале трансляции?',
                  yesNoKeyboard(),
                ), 4000);
              }
            });
        });
      }, 3000);
    }

    next();
  });

  /**
   * Обработчик админ-кнопки:
   * при нажатии будет запрос от бота, в который нужно вставить ссылку на трансляцию
   * бот разошлёт сообщение всем пользователям, находящимся в коллцекции MONGO_ANNOUNCE_COLL
   */
  bot.hears('Начало трансляции ▶️', (ctx) => {
    ctx.reply(
      'Вставьте ссылку на трансляцию',
      {
        reply_markup: {
          force_reply: true,
          input_field_placeholder: 'Ссылка',
        },
      },
    ).then(() => {
      if (bot.context.state.awaitingAnswer) {
        bot.url((urlCtx) => {
          getAnnounceColl().then((res) => res.forEach((item) => {
            bot.telegram.sendMessage(item.id, `Трансляция уже началась, присоединяйтесь: ${urlCtx.message.text}`);
          }));

          urlCtx.reply('Делаю рассылку на трансляцию', adminKeyboard());
          // Сбрасываем флаг состояния
          bot.context.state.awaitingAnswer = false;
        });
      }

      // Сбрасываем флаг состояния
      bot.context.state.awaitingAnswer = true;
    });
  });

  /**
   * Обработчик админ-кнопки:
   * при нажатии будет запрос от бота, в который нужно вставить ссылку на пост с победителями
   * бот разошлёт сообщение всем пользователям, находящимся в коллцекции MONGO_ANNOUNCE_COLL
   */
  bot.hears('Список победителей 🎟', (ctx) => {
    ctx.reply(
      'Вставьте ссылку на пост с победителями',
      {
        reply_markup: {
          force_reply: true,
          input_field_placeholder: 'Ссылка',
        },
      },
    ).then(() => {
      if (bot.context.state.awaitingAnswer) {
        bot.url((urlCtx) => {
          getAnnounceColl().then((res) => res.forEach((item) => {
            bot.telegram.sendMessage(
              item.id,
              `Наш розыгрыш подошел к концу, и мы рады объявить победителей. Узнать, кто получил ценные призы, можете по ссылке: ${urlCtx.message.text}`,
            );
          }));

          urlCtx.reply('Делаю рассылку с победителями', adminKeyboard());
          // Сбрасываем флаг состояния
          bot.context.state.awaitingAnswer = false;
        });
      }

      // Сбрасываем флаг состояния
      bot.context.state.awaitingAnswer = true;
    });
  });

  // Обработчик инлайн-кнопок "Да/Нет" по уведомлениям
  bot.action(['yes', 'no'], (ctx) => {
    if (ctx.callbackQuery.data === 'yes') {
      ctx.answerCbQuery('Вы подписались на уведомления');
      addUserToAnnounceDb(ctx.callbackQuery.from);
    }

    if (ctx.callbackQuery.data === 'no') {
      ctx.answerCbQuery('Вы отказались от уведомлений');
    }

    ctx.deleteMessage();
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

    bot.on('message', async (textCtx) => {
      if (bot.context.state.awaitingAnswer) {
        // Получаем ответ пользователя
        const answer = textCtx.update.message.text;

        let parsedPhone;

        if (answer.startsWith('+')) {
          parsedPhone = answer.slice(2);
        }
        if (answer.startsWith('7') || answer.startsWith('8')) {
          parsedPhone = answer.slice(1);
        }

        getTicketsFromDb(parsedPhone).then((res) => {
          const phoneNumberRegex = /^(\+7|7|8)\d{10}$/;

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
  bot.command('help', (ctx) => {
    ctx.reply(`Перейдите по ссылке для заполнения формы: ${FEEDBACK_LINK}`, { disable_web_page_preview: true });
  });

  // Обработчик команды /subscribe (подписаться на уведомления)
  bot.command('subscribe', (ctx) => {
    // бот ищет совпадения по userId в базе данных MONGO_ANNOUNCE_COLL
    findUserInAnnounceDb(ctx.update.message.from.id).then((res) => {
      if (res.length !== 0) {
        ctx.reply('Вы уже подписаны на уведомления');
      } else {
        addUserToAnnounceDb(ctx.update.message.from);
        ctx.reply('Вы успешно подписались на уведомления');
      }
    });
  });

  // Обработчик команды /unsubscribe (отподписаться от уведомлений)
  bot.command('unsubscribe', (ctx) => {
    // бот ищет совпадения по userId в базе данных MONGO_ANNOUNCE_COLL
    findUserInAnnounceDb(ctx.update.message.from.id).then((res) => {
      if (res.length === 0) {
        ctx.reply('Вы не были подписаны на уведомления');
      } else {
        deleteFromAnnounceColl(ctx.update.message.from.id);
        ctx.reply('Вы успешно отписались от уведомлений');
      }
    });
  });

  bot.launch();
};
