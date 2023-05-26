import { Markup } from 'telegraf';

/**
 * @returns {Array} массив админ-кнопок
 */
export const adminKeyboard = () => Markup.keyboard([
  ['Начало трансляции ▶️'],
  ['Список победителей 🎟'],
]).resize();

/**
 * @returns {Array} массив инлайн кнопок
 */
export const yesNoKeyboard = () => Markup.inlineKeyboard([
  Markup.button.callback('Да', 'yes'),
  Markup.button.callback('Нет', 'no'),
]).resize();
