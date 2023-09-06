const MongoClient = require("mongodb").MongoClient;
require("dotenv").config();
var MONGO_URI = process.env.MONGO_DB_URI;
const MONGO_DB_NAME = process.env.MONGO_DB_NAME
  ? process.env.MONGO_DB_NAME
  : "igExilesDB";

let _connection;

const connectDB = async (callback) => {
  console.log(`Mongo uri is`, MONGO_URI);
  await MongoClient.connect(MONGO_URI, { useNewUrlParser: true }, (err, db) => {
    _connection = db;
    return callback(err);
  });
};

const getDB = () => _connection.db(MONGO_DB_NAME);

const disconnectDB = () => _connection.close();

module.exports = {
  connectDB,
  getDB,
  disconnectDB,
};
