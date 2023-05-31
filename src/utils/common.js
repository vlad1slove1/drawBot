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

    /**
     * Так как telegram на своей стороне парсит все тексты и ищет в них
     * номера телефонов, ссылки, локации, номера банковских карт, то приходится
     * обработать нашу строку и исключить все совпадения
     *
     * Для этого используется спец. символ нулевой ширины, который не будет
     * отображаться в финальном выводе строки
     */
    const hiddenChar = '\u200B'; // Символ нулевой ширины
    const middleIndex = Math.floor(uniqueTicketId.length / 2); // Делим строку пополам
    const firstHalf = uniqueTicketId.slice(0, middleIndex);
    const secondHalf = uniqueTicketId.slice(middleIndex);
    const protectedTicketId = [firstHalf, hiddenChar, secondHalf].join('');

    arr.push(`Код ${protectedTicketId}, id купона: ${uniqueTicketNumber}`);
  });
};

export default fillArrWithTickets;
