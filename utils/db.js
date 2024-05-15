import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '27017';
    const dbName = process.env.DB_DATABASE || 'files_manager';

    const url = `mongodb://${host}:${port}`;
    this.client = new MongoClient(url, { useUnifiedTopology: true });

    this.connected = false;
    this.client.connect((err) => {
      if (err) {
        console.log(err.message);
      } else {
        this.connected = true;
        this.db = this.client.db(dbName);
      }
    });
  }

  isAlive() {
    return this.connected;
  }

  async nbUsers() {
    return this.db.collection('users').countDocuments({});
  }

  async nbFiles() {
    return this.db.collection('files').countDocuments({});
  }

  async insertOne(coll, doc) {
    return this.db.collection(coll).insertOne(doc);
  }

  async insertMany(coll, docs) {
    return this.db.collection(coll).insertMany(docs);
  }

  async findOne(coll, filter) {
    return this.db.collection(coll).findOne(filter);
  }

  async deleteMany(coll, filter) {
    return this.db.collection(coll).deleteMany(filter);
  }

  async deleteOne(coll, filter) {
    return this.db.collection(coll).deleteOne(filter);
  }
}

const dbClient = new DBClient();
export default dbClient;
