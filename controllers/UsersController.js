import { ObjectId } from 'mongodb';
import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export async function postNew(req, res) {
  const email = req.body ? req.body.email : null;
  const password = req.body ? req.body.password : null;

  if (!email) {
    res.status(400).json({ error: 'Missing email' });
    res.end();
    return;
  }
  if (!password) {
    res.status(400).json({ error: 'Missing password' });
    res.end();
    return;
  }

  const user = await dbClient.db.collection('users').findOne({ email });
  if (user) {
    res.status(400).json({ error: 'Already exist' });
    res.end();
    return;
  }
  const insertInfo = await dbClient.db.collection('users').insertOne({
    email,
    password: sha1(password),
  });

  const userID = insertInfo.insertedId.toString();

  res.status(201).json({ id: userID, email });
}

export async function getMe(req, res) {
  const token = req.headers['x-token'];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = await redisClient.get(`auth_${token}`);
  const user = await dbClient.findOne('users', { _id: new ObjectId(userId) });
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return res.json({ id: user._id, email: user.email });
}