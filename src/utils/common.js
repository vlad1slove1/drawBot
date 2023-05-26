/**
 * Создаём массив строк (совпадений)
 * для дальнейшего вывода в сообщении
 *
 * @param {Array} res массив объектов (пользователей)
 * @param {Array} arr массив строк (совпадений)
 */
const fillArrWithTickets = (res, arr) => {
  res.forEach((item) => {
    const uniqueTicketId = Object.values(item)[1];
    const uniqueTicketNumber = Object.values(item)[6];

    arr.push(`Код ${uniqueTicketId}, id купона: ${uniqueTicketNumber}`);
  });
};

export default fillArrWithTickets;
