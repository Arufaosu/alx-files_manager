import chai from 'chai';
import chaiHttp from 'chai-http';
import app from '../server';
import dbClient from '../utils/db';
import waitConnection from './wait_connection.js';

const { expect } = chai;
chai.use(chaiHttp);

describe('test AppController routes', () => {
  let server;

  before((done) => {
    server = app.listen(3000, async () => {
      await waitConnection();

      await dbClient.insertMany('users', [{ name: 'Youssef' }, { name: 'Omar' }]);
      await dbClient.insertMany('files', [{ name: 'image.jpg' }, { name: 'poem.txt' }, { name: 'script.sh' }]);

      done();
    });
  });

  after(async () => {
    await dbClient.deleteMany('users', {});
    await dbClient.deleteMany('files', {});

    server.close();
  });

  it('check response of GET /status', async () => {
    const res = await chai.request(server).get('/status');

    expect(res).to.have.status(200);
    expect(res.body).to.eql({ redis: true, db: true });
  });

  it('check response of GET /stats', async () => {
    const res = await chai.request(server).get('/stats');

    expect(res).to.have.status(200);
    expect(res.body).to.eql({ users: 2, files: 3 });
  });
});
