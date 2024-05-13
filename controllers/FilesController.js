import fs from 'fs';
import { ObjectId } from 'mongodb';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

async function getUser(req) {
  const token = req.headers['x-token'];
  if (!token) {
    return null;
  }

  let user;
  try {
    const userId = await redisClient.get(`auth_${token}`);
    user = await dbClient.findOne('users', { _id: new ObjectId(userId) });
  } catch (err) {
    return null;
  }

  if (!user) {
    return null;
  }

  return user;
}

export async function postUpload(req, res) {
  const user = await getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Missing name' });
  }

  const { type } = req.body;
  if (!type || !['folder', 'file', 'image'].includes(type)) {
    return res.status(400).json({ error: 'Missing type' });
  }

  const { data } = req.body;
  if (!data && type !== 'folder') {
    return res.status(400).json({ error: 'Missing data' });
  }

  let parentId;
  try {
    parentId = req.body.parentId && req.body.parentId !== '0' ? new ObjectId(req.body.parentId) : '0';
  } catch (err) {
    return res.status(400).json({ error: 'Parent not found' });
  }

  if (parentId !== 0) {
    const parentFolder = await dbClient.findOne('files', {
      _id: parentId,
    });
    if (!parentFolder) {
      return res.status(400).json({ error: 'Parent not found' });
    }

    if (parentFolder.type !== 'folder') {
      return res.status(400).json({ error: 'Parent is not a folder' });
    }
  }

  const isPublic = req.body.isPublic ? req.body.isPublic : false;

  if (type === 'folder') {
    const folder = {
      userId: user._id,
      name,
      type,
      isPublic,
      parentId,
    };

    await dbClient.insertOne('files', folder);

    return res.status(201).json({
      id: folder._id.toString(),
      user: user._id.toString(),
      name,
      type,
      isPublic,
      parentId: parentId !== '0' ? parentId.toString() : 0,
    });
  }

  const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
  await promisify(fs.mkdir)(folderPath, { recursive: true });

  const localPath = `${folderPath}/${uuidv4()}`;
  await promisify(fs.writeFile)(
    localPath,
    Buffer.from(data, 'base64').toString('utf-8'),
  );

  const file = {
    userId: user._id,
    name,
    type,
    isPublic,
    parentId,
    localPath,
  };

  await dbClient.insertOne('files', file);

  return res.status(201).json({
    id: file._id.toString(),
    user: user._id.toString(),
    name,
    type,
    isPublic,
    parentId: parentId !== '0' ? parentId.toString() : 0,
  });
}

export async function getShow(req, res) {
  const user = await getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const fileId = req.params.id;

  const file = await dbClient.findOne('files', {
    _id: new ObjectId(fileId),
    userId: user._id,
  });

  if (!file) {
    return res.status(404).json({ error: 'Not found' });
  }

  return res.status(200).json({
    id: file._id.toString(),
    userId: user._id.toString(),
    name: file.name,
    type: file.type,
    isPublic: file.isPublic,
    parentId: file.parentId.toString(),
  });
}

export async function getIndex(req, res) {
  const user = await getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let parentId;
  try {
    parentId = req.query.parentId && req.query.parentId !== '0' ? new ObjectId(req.query.parentId) : '0';
  } catch (err) {
    return res.json([]);
  }

  const page = req.query.page ? Number(req.query.page) : 0;
  if (!(page >= 0)) {
    return res.json([]);
  }

  const filesCollection = dbClient.db.collection('files');
  const matchQuery = {
    userId: user._id,
  };

  if (parentId !== '0') {
    matchQuery.parentId = parentId;
  }

  const files = await filesCollection
    .aggregate([
      { $match: matchQuery },
      { $skip: page * 20 },
      { $limit: 20 },
      {
        $project: {
          _id: 0,
          id: '$_id',
          userId: '$userId',
          name: '$name',
          type: '$type',
          isPublic: '$isPublic',
          parentId: {
            $cond: {
              if: { $eq: ['$parentId', '0'] },
              then: 0,
              else: '$parentId',
            },
          },
        },
      },
    ])
    .toArray();

  return res.status(200).json(files);
}

export async function publish(req, res) {
  const user = await getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const fileId = req.params.id;

  let file;
  try {
    file = await dbClient.findOne('files', {
      _id: new ObjectId(fileId),
      userId: user._id,
    });
  } catch (err) {
    return res.status(404).json({ error: 'Not found' });
  }

  if (!file) {
    return res.status(404).json({ error: 'Not found' });
  }

  dbClient.db.collection('files').updateOne(
    {
      _id: new ObjectId(fileId),
      userId: user._id,
    },
    { $set: { isPublic: true } },
  );

  const updatedFile = await dbClient.findOne('files', {
    _id: new ObjectId(fileId),
    userId: user._id,
  });

  return res.status(200).json({
    id: fileId,
    userId: user._id.toString(),
    name: updatedFile.name,
    type: updatedFile.type,
    isPublic: updatedFile.isPublic,
    parentId:
      updatedFile.parentId === '0' ? 0 : updatedFile.parentId.toString(),
  });
}

export async function unpublish(req, res) {
  const user = await getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const fileId = req.params.id;

  let file;
  try {
    file = await dbClient.findOne('files', {
      _id: new ObjectId(fileId),
      userId: user._id,
    });
  } catch (err) {
    return res.status(404).json({ error: 'Not found' });
  }

  if (!file) {
    return res.status(404).json({ error: 'Not found' });
  }

  dbClient.db.collection('files').updateOne(
    {
      _id: new ObjectId(fileId),
      userId: user._id,
    },
    { $set: { isPublic: false } },
  );

  const updatedFile = await dbClient.findOne('files', {
    _id: new ObjectId(fileId),
    userId: user._id,
  });

  return res.status(200).json({
    id: fileId,
    userId: user._id.toString(),
    name: updatedFile.name,
    type: updatedFile.type,
    isPublic: updatedFile.isPublic,
    parentId:
      updatedFile.parentId === '0' ? 0 : updatedFile.parentId.toString(),
  });
}
