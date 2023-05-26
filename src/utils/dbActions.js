import { MongoClient, ServerApiVersion } from 'mongodb';
import { config } from 'dotenv';

config();

const {
  MONGO_HOST,
  MONGO_DB_NAME,
  MONGO_DRAW_COLL,
  MONGO_STAT_COLL,
  MONGO_ANNOUNCE_COLL,
  MONGO_ADMINS_COLL,
} = process.env;

// url к локальной датабазе
const uri = `mongodb://${MONGO_HOST}`;

// создание клиента mongodb для подключения к датабазе
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

/**
 * Сначала выполняется поиск совпадений в общей бд по номеру телефона
 * затем идёт запись нового документа в бд статистики
 * если совпадения есть, то в промисе будет массив объектов
 * в других случаях вернётся пустой массив
 *
 * @param {String} phone номер телефона в формате (71234567890)
 * @returns {Promise} array of objects (массив объектов)
 */
export const getTicketsFromDb = async (phone) => {
  try {
    await client.connect();
    // console.log('You successfully connected to MongoDB!');

    const database = client.db(MONGO_DB_NAME);
    const drawCollection = database.collection(MONGO_DRAW_COLL);
    const statisticCollection = database.collection(MONGO_STAT_COLL);

    const matches = await drawCollection.find({ Телефон: Number(phone) }).toArray((err, res) => {
      if (err) throw err;
      return res;
    });

    const userState = {
      date: new Date(),
      name: '',
      telephone: `${phone}`,
      tickets: [],
    };

    matches.forEach((match) => {
      const values = Object.values(match);
      const [, ticket, name, telephone, , , drawId] = values;
      userState.name = name;
      userState.telephone = telephone;
      userState.tickets.push(`Купон: ${ticket}, id генератора: ${drawId}`);
    });

    await statisticCollection.insertOne(userState, (err) => {
      if (err) throw err;
    });

    return matches;
  } finally {
    await client.close();
  }
};

/**
 * Выполняется поиск совпадений по id в бд для уведомлений
 *
 * @param {String} userId уникальный id пользователя
 * @returns {Promise} array of objects (массив объектов)
 */
export const findUserInAnnounceDb = async (userId) => {
  try {
    await client.connect();
    // console.log('You successfully connected to MongoDB!');

    const database = client.db(MONGO_DB_NAME);
    const announceCollection = database.collection(MONGO_ANNOUNCE_COLL);

    const match = await announceCollection.find({ id: Number(userId) }).toArray((err, res) => {
      if (err) throw err;

      return res;
    });

    return match;
  } finally {
    await client.close();
  }
};

/**
 * Добвить новый документ в бд для уведомлений
 *
 * @param {Object} data объект пользователя
 */
export const addUserToAnnounceDb = async (data) => {
  try {
    await client.connect();
    // console.log('You successfully connected to MongoDB!');

    const database = client.db(MONGO_DB_NAME);
    const announceCollection = database.collection(MONGO_ANNOUNCE_COLL);

    await announceCollection.insertOne(data);
  } finally {
    await client.close();
  }
};

/**
 * Выполняется поиск совпадений по id в бд с админами
 *
 * @param {String} userId уникальный id пользователя
 * @returns {Promise} array of objects (массив объектов)
 */
export const isUserAdmin = async (userId) => {
  try {
    await client.connect();
    // console.log('You successfully connected to MongoDB!');

    const database = client.db(MONGO_DB_NAME);
    const adminsCollection = database.collection(MONGO_ADMINS_COLL);

    const match = await adminsCollection.find({ id: Number(userId) }).toArray((err, res) => {
      if (err) throw err;

      return res;
    });

    return match;
  } finally {
    await client.close();
  }
};

/**
 * Скачать всех пользователей из бд для аннонсов
 * в виде массива объектов
 *
 * @returns {Promise} array of objects (массив объектов)
 */
export const getAnnounceColl = async () => {
  try {
    await client.connect();
    // console.log('You successfully connected to MongoDB!');

    const database = client.db(MONGO_DB_NAME);
    const announceCollection = database.collection(MONGO_ANNOUNCE_COLL);

    const match = await announceCollection.find().toArray((err, res) => {
      if (err) throw err;

      return res;
    });

    return match;
  } finally {
    await client.close();
  }
};

/**
 * Удалить документ из бд для уведомлений по id
 *
 * @param {String} userId уникальный id пользователя
 */
export const deleteFromAnnounceColl = async (userId) => {
  try {
    await client.connect();
    // console.log('You successfully connected to MongoDB!');

    const database = client.db(MONGO_DB_NAME);
    const announceCollection = database.collection(MONGO_ANNOUNCE_COLL);

    await announceCollection.deleteMany({ id: userId });
  } finally {
    await client.close();
  }
};
