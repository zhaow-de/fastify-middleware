import Fastify from 'fastify';
import { concat as sget } from 'simple-get';
import cors from 'cors';
import fastifyMiddlewarePlugin from '../src';

describe('enhance request', () => {
  let fastify;

  beforeEach(() => {
    fastify = Fastify();
  });

  afterEach(async () => {
    await new Promise((r) => setTimeout(r, 200));
    await fastify.close();
  });

  it('Should enhance the Node.js core request/response objects', (done) => {
    expect.assertions(13);

    fastify.register(fastifyMiddlewarePlugin, { hook: 'preHandler' }).after(() => {
      fastify.use('/', cors());
    });

    fastify.post('/', async (req, reply) => {
      expect(req.raw.originalUrl).toBe(req.raw.url);
      expect(req.raw.id).toBe(req.id);
      expect(req.raw.hostname).toBe(req.hostname);
      expect(req.raw.ip).toBe(req.ip);
      expect(req.raw.ips).toEqual(req.ips);
      expect(req.raw.body).toEqual(req.body);
      expect(req.raw.query).toEqual(req.query);
      expect(req.raw.body.bar).toBeTruthy();
      expect(req.raw.query.foo).toBeTruthy();
      expect(req.raw.log).toBeTruthy();
      expect(reply.raw.log).toBeTruthy();
      return { hello: 'world' };
    });

    fastify.listen(0, (err, address) => {
      expect(err).toBeFalsy();
      sget(
        {
          method: 'POST',
          url: `${address}?foo=bar`,
          body: { bar: 'foo' },
          json: true,
        },
        (err, res, data) => {
          expect(err).toBeFalsy();
          done();
        }
      );
    });
  });

  it('Should not enhance the Node.js core request/response objects when there are no middlewares', (done) => {
    expect.assertions(11);

    fastify.register(fastifyMiddlewarePlugin, { hook: 'preHandler' });

    fastify.post('/', async (req, reply) => {
      expect(req.raw.originalUrl).toBe(undefined);
      expect(req.raw.id).toBe(undefined);
      expect(req.raw.hostname).toBe(undefined);
      expect(req.raw.ip).toBe(undefined);
      expect(req.raw.ips).toBe(undefined);
      expect(req.raw.body).toEqual(undefined);
      expect(req.raw.query).toEqual(undefined);
      expect(req.raw.log).toBeFalsy();
      expect(reply.raw.log).toBeFalsy();
      return { hello: 'world' };
    });

    fastify.listen(0, (err, address) => {
      expect(err).toBeFalsy();
      sget(
        {
          method: 'POST',
          url: `${address}?foo=bar`,
          body: { bar: 'foo' },
          json: true,
        },
        (err, res, data) => {
          expect(err).toBeFalsy();
          done();
        }
      );
    });
  });
});
