import express from 'express';
import { getStatus, getStats } from '../controllers/AppController';
import { getConnect, disconnect } from '../controllers/AuthController';
import { postNew, getMe } from '../controllers/UsersController';
import {
  postUpload, getShow, getIndex, publish, unpublish, getFile,
} from '../controllers/FilesController';

const router = express.Router();

router.get('/status', (req, res) => {
  res.json(getStatus());
});

router.get('/stats', async (req, res) => {
  res.json(await getStats());
});

router.post('/users', async (req, res) => {
  await postNew(req, res);
});

router.get('/users/me', async (req, res) => {
  await getMe(req, res);
});

router.get('/connect', async (req, res) => {
  await getConnect(req, res);
});

router.get('/disconnect', async (req, res) => {
  await disconnect(req, res);
});

router.post('/files', async (req, res) => {
  await postUpload(req, res);
});

router.get('/files/:id', async (req, res) => {
  await getShow(req, res);
});

router.get('/files', async (req, res) => {
  await getIndex(req, res);
});

router.put('/files/:id/publish', async (req, res) => {
  await publish(req, res);
});

router.put('/files/:id/unpublish', async (req, res) => {
  await unpublish(req, res);
});

router.get('/files/:id/data', async (req, res) => {
  await getFile(req, res);
});

export default router;
