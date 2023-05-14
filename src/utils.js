import { MongoClient, ServerApiVersion } from 'mongodb';
import { config } from 'dotenv';

config();

const {
  MONGO_HOST,
  MONGO_DB_NAME,
  MONGO_DRAW_COLL,
  MONGO_STAT_COLL,
} = process.env;

const uri = `mongodb://${MONGO_HOST}`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

export const fillArrWithTickets = (res, arr) => {
  res.forEach((item) => arr.push(Object.values(item)[1]));
};

export const getTicketsFromDb = async (phone) => {
  try {
    await client.connect();
    // console.log('You successfully connected to MongoDB!');

    const database = client.db(MONGO_DB_NAME);
    const drawCollection = database.collection(MONGO_DRAW_COLL);
    const statisticCollection = database.collection(MONGO_STAT_COLL);

    const matches = await drawCollection.find({ Телефон: phone }).toArray((err, res) => {
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
      const [, ticket, name, telephone] = values;
      userState.name = name;
      userState.telephone = telephone;
      userState.tickets.push(ticket);
    });

    await statisticCollection.insertOne(userState, (err) => {
      if (err) throw err;
    });

    return Promise.resolve(matches);
  } finally {
    await client.close();
  }
};
