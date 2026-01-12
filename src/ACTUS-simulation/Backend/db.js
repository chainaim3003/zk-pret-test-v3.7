const { MongoClient } = require('mongodb');

let db;

const connectToDb = (cb) => {
  MongoClient.connect('mongodb://localhost:27017/excelDB')  // Replace with your connection string
    .then((client) => {
      db = client.db();
      return cb();
    })
    .catch((err) => {
      console.error(err);
      return cb(err);
    });
};

const getDb = () => db;

module.exports = { connectToDb, getDb };
