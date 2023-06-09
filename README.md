# Telegram bot для проведения розыгрышей

Бот упростит проведение розыгрышей как для компании, так и для участников розыгрыша.

* пользователь сможет без сторонней помощи проверить свои купоны по разным номерам телефона, сможет подписаться на уведомления и не пропустить трансляцию, и объявление победителей
* компания освобождает человеческие ресурсы на ручную обработку всех запросов и фокусируется только на обращения, отправленные через форму
* сохраняется статистика использования бота

## Функциональность

Бот включает в себя несколько состояний. Чтобы включить нужное состояние, нужно закомментировать активное состояние и раскомментировать нужно в файле
[**src/index.js**](https://github.com/vlad1slove1/drawBot/blob/f53f5f6ae8352948d3e63e7784ce196acb1ccb8c/src/index.js). По умолчанию включен режим **idle**. Бот запущен на [**node express**](https://github.com/vlad1slove1/drawBot/blob/3f479256e9853ea5d7446985ae06a377b8bd8ae3/src/index.js#L15-L63). Открыт https и домен. Используется **helmet** для защиты от сторонних инъекций и подстановок заголовков. База данных бота синхронизируется с помощью отправки POST запроса, где пользователи (как сущность) передаются в теле запроса. Сервер обрабатывает запросы через уникальный **JWT token**, передаваемый в заголовок **Authorization**. При успешном запросе, бот обновит базу данных и загрузит её в гугл табличку.

1) [**dev**](https://github.com/vlad1slove1/drawBot/blob/f53f5f6ae8352948d3e63e7784ce196acb1ccb8c/states/dev.js) - для проведения тех. работ. Весь функционал отключен. При инициализации бота выведется инф. сообщение

2) [**draw**](https://github.com/vlad1slove1/drawBot/blob/f53f5f6ae8352948d3e63e7784ce196acb1ccb8c/states/draw.js) - активная фаза розыгрыша. Стостояние включается за несколько дней до розыгрыша. При инициализации, бот выведет
приветствие, затем сделает [проверку](https://github.com/vlad1slove1/drawBot/blob/f53f5f6ae8352948d3e63e7784ce196acb1ccb8c/states/draw.js#L49) пользователя на админа по его id. Если пользователь админ - ему станут
доступны кнопки для рассылки [уведомления о начале трансляции](https://github.com/vlad1slove1/drawBot/blob/f53f5f6ae8352948d3e63e7784ce196acb1ccb8c/states/draw.js#L180-L205) и [уведомления с победителями](https://github.com/vlad1slove1/drawBot/blob/f53f5f6ae8352948d3e63e7784ce196acb1ccb8c/states/draw.js#L212-L240). Если это обычный пользователь, бот попросит его
[поделиться своим контактом](https://github.com/vlad1slove1/drawBot/blob/f53f5f6ae8352948d3e63e7784ce196acb1ccb8c/states/draw.js#L55-L70). Далее бот выполняет парсинг номера телефона, обращается в базу данных и выводит
соответствия в виде списка всех купонов пользователя. Если соответствия не найдены, пользователь получит инф. сообщение.

### Доступные команды:

_*команды находятся в кнопке МЕНЮ в левой нижней части экрана*_
```javascript
1. '/start' - инициализирует/перезапускает бота
2. '/check' - проверить купоны на другом номере
3. '/help' - написать в поддержку
4. '/subscribe' - подписаться на уведомления
5. '/unsubscribe' - отписаться от уведомлений
```

При нажатии кнопки **'/check'** бот отправит сообщение с правильным форматом номера телефона и будет ждать ответа от пользователя. Ответ проверяется на соответствия в базе данных. Бот покажет совпадения в виде списка, либо
выведет инф. сообщение.

При нажатии кнопки **'/help'** бот отправит сообщение с ссылкой на гугл-форму. Поддержка вручную проверяет все обращения.

При нажатии кнопки **'/subscribe'** бот добавляет пользователя в базу данных для уведомлений.

При нажатии кнопки **'/unsubscribe'** бот удаляет пользователя из базы для уведомлений.

### Админ-кнопки:

_*команды находятся в раскрывающемся меню в правой нижней части экрана*_
```javascript
1. 'Отправить аннонс 📲' - отправить текстовый аннонс
2. 'Начало трансляции ▶️' - отправить уведомление с ссылкой на трансляцию
3. 'Список победителей 🎟' - отправить уведомление с ссылкой на победителей
```

При нажатии админ-кнопок бот отправит инф. сообщение и будет ожидать от админа текстовое сообщение (если это аннонс) или ссылку (если это начало трансляции или вывод списка победителей). Далее бот отправит сообщение всем пользователям из базы данных для уведомлений.

3) [**idle**](https://github.com/vlad1slove1/drawBot/blob/f53f5f6ae8352948d3e63e7784ce196acb1ccb8c/states/idle.js) - розыгрыш закончен (своего рода "заглушка" между розыгрышами). Состояние включено по умолчанию. При инициализации,
бот выведет приветствие, затем несколько инф. сообщений о том, что розыгрыш закончился и пришлёт ссылку на победителей последнего розыгрыша. (_**ссылку нужно вручную обновлять в файле .env*_). Пользователю доступны некоторые команды
из общего Меню. Админ-кнопки выключены.

### Доступные команды:

_*команды находятся в кнопке МЕНЮ в левой нижней части экрана*_
```javascript
1. '/start' - инициализирует/перезапускает бота
2. '/check' - проверить купоны на другом номере
3. '/help' - написать в поддержку
4. '/subscribe' - отключена
5. '/unsubscribe' - отключена
```

## Запуск локально

_*Для запуска требуются: **ОС Linux**, пакетный менеджер **npm**, **Node.js** версии не ниже 18.х_

1. Скопируйте репозиторий в локальное хранилище
```
git clone https://github.com/vlad1slove1/drawBot.git <имя_директории>
```
2. Перейдите в директорию с ботом
```
cd <имя_директории>
```
3. Установите зависимости
```
npm ci
```
4. Создайте нового телеграм-бота с помощью [BotFather](https://t.me/botfather) по [Инструкции](https://botcreators.ru/blog/botfather-instrukciya/)
5. Скопируйте персональный *TELEGRAM_BOT_TOKEN* из чата с BotFather
6. Отредактируйте файл [.env.example](https://github.com/vlad1slove1/drawBot/blob/f53f5f6ae8352948d3e63e7784ce196acb1ccb8c/.env.example)
```javascript
BOT_TOKEN=<token вашего бота>
PORT=<рекомендуется поставить 3000>
MONGO_HOST=<локальный путь к датабазе>
MONGO_DB_NAME=<наименование датабазы>
MONGO_PARTICIPANTS_COLL=<наименование коллекции с участниками розыгрыша>
MONGO_STAT_USERS_COLL=<наименование коллекции с пользователями для статистики>
MONGO_ADMIN_USERS_COLL=<наименование коллекции с пользователями, которым будут доступны админ-кнопки>
MONGO_USERS_TO_ANNOUNCE_COLL=<наименование коллекции с пользователями для рассылки уведомлений>
FEEDBACK_LINK=<ссылка на гугл-форму>
POST_LINK=<пост с победителями в прошедшем розыгрыше в группе telegram>
GOOGLE_SPREADSHEET_ID=<уникальный ID гугл таблицы с участниками>
GOOGLE_SERVICE_ACCOUNT_EMAIL=<почта гугл service account>
GOOGLE_PRIVATE_KEY=<уникальный ключ, сгенерированный в гугл service account>
EXPRESS_ACCESS_TOKEN=<token для авторизации на сервере при отправке запросов по http>
```
7. Переименуйте файл [.env.example](https://github.com/vlad1slove1/drawBot/blob/f53f5f6ae8352948d3e63e7784ce196acb1ccb8c/.env.example) на **.env**
8. Запустите приложение командой
```
npm run dev
```
9. Найдите вашего бота через ___@<имя_нового_бота>___

_*Пока приложение запущено, терминал у вас будет занят. Если вы не хотите останавливать приложение и пользоваться терминалом - откройте новый терминал.
Чтобы остановить приложение в текущем терминале дважды нажмите комбинацию **ctrl + C**_

## Стек

<p align="left"> <a href="https://expressjs.com" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/express/express-original-wordmark.svg" alt="express" width="40" height="40"/> </a> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/javascript/javascript-original.svg" alt="javascript" width="40" height="40"/> </a> <a href="https://www.mongodb.com/" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/mongodb/mongodb-original-wordmark.svg" alt="mongodb" width="40" height="40"/> </a> <a href="https://nodejs.org" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original-wordmark.svg" alt="nodejs" width="40" height="40"/> </a> <a href="https://telegrafjs.org/#/" target="_blank" rel="noreferrer"> <img src="https://telegraf.js.org/media/logo.svg" alt="express" width="40" height="40"/> </a> <a href="https://developers.google.com/sheets/api/quickstart/js" target="_blank" rel="noreferrer"> <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Google_Sheets_logo_%282014-2020%29.svg/49px-Google_Sheets_logo_%282014-2020%29.svg.png?20201024100414" alt="express" width="40" height="40"/> </a> </p>

* [numeralize-ru](https://github.com/anotherpit/numeralize-ru)
* [JWT](https://jwt.io/)
* [helmet](https://helmetjs.github.io/)
