import { concat as sget } from 'simple-get';
import fp from 'fastify-plugin';
import cors from 'cors';
import helmet from 'helmet';
import { createReadStream } from 'fs';
import fastifyMiddlewarePlugin from '../src';
import Fastify from 'fastify';

describe('middleware', () => {
  let instance;

  beforeEach(() => {
    instance = Fastify();
  });

  afterEach(async () => {
    await new Promise((r) => setTimeout(r, 500));
    await instance.server.close();
  });

  it('use a middleware', (done) => {
    expect.assertions(7);

    instance.register(fastifyMiddlewarePlugin).after(() => {
      const useRes = instance.use('/', function (req, res, next) {
        // middleware called
        expect(true).toBeTruthy();
        next();
      });

      expect(useRes).toBe(instance);
    });

    instance.get('/', function (request, reply) {
      reply.send({ hello: 'world' });
    });

    instance.listen(0, (err) => {
      expect(err).toBeFalsy();

      sget(
        {
          method: 'GET',
          url: 'http://localhost:' + instance.server.address().port,
        },
        (err, response, body) => {
          expect(err).toBeFalsy();
          expect(response.statusCode).toBe(200);
          expect(response.headers['content-length']).toBe('' + body.length);
          expect(JSON.parse(body)).toEqual({ hello: 'world' });
          done();
        }
      );
    });
  });

  it('use cors', (done) => {
    expect.assertions(3);

    instance.register(fastifyMiddlewarePlugin).after(() => {
      instance.use('/', cors());
    });

    instance.get('/', function (request, reply) {
      reply.send({ hello: 'world' });
    });

    instance.listen(0, (err) => {
      expect(err).toBeFalsy();

      sget(
        {
          method: 'GET',
          url: 'http://localhost:' + instance.server.address().port,
        },
        (err, response, body) => {
          expect(err).toBeFalsy();
          expect(response.headers['access-control-allow-origin']).toBe('*');
          done();
        }
      );
    });
  });

  it('use helmet', (done) => {
    expect.assertions(3);

    instance.register(fastifyMiddlewarePlugin).after(() => {
      instance.use('/', helmet());
    });

    instance.get('/', function (request, reply) {
      reply.send({ hello: 'world' });
    });

    instance.listen(0, (err) => {
      expect(err).toBeFalsy();

      sget(
        {
          method: 'GET',
          url: 'http://localhost:' + instance.server.address().port,
        },
        (err, response, body) => {
          expect(err).toBeFalsy();
          expect(response.headers['x-xss-protection']).toBeTruthy();
          done();
        }
      );
    });
  });

  it('use helmet and cors', (done) => {
    expect.assertions(4);

    instance.register(fastifyMiddlewarePlugin).after(() => {
      instance.use('/', cors());
      instance.use('/', helmet());
    });

    instance.get('/', function (request, reply) {
      reply.send({ hello: 'world' });
    });

    instance.listen(0, (err) => {
      expect(err).toBeFalsy();

      sget(
        {
          method: 'GET',
          url: 'http://localhost:' + instance.server.address().port,
        },
        (err, response, body) => {
          expect(err).toBeFalsy();
          expect(response.headers['x-xss-protection']).toBeTruthy();
          expect(response.headers['access-control-allow-origin']).toBe('*');
          done();
        }
      );
    });
  });

  describe('middlewares with prefix', () => {
    beforeEach(() => {
      instance.register(fastifyMiddlewarePlugin).after(() => {
        instance.use('', function (req, res, next) {
          req.global2 = true;
          next();
        });
        instance.use('/', function (req, res, next) {
          req.root = true;
          next();
        });
        instance.use('/prefix', function (req, res, next) {
          req.prefixed = true;
          next();
        });
        instance.use('/prefix/', function (req, res, next) {
          req.slashed = true;
          next();
        });
      });

      function handler(request, reply) {
        reply.send({
          prefixed: request.raw.prefixed,
          slashed: request.raw.slashed,
          global2: request.raw.global2,
          root: request.raw.root,
        });
      }

      instance.get('/', handler);
      instance.get('/prefix', handler);
      instance.get('/prefix/', handler);
      instance.get('/prefix/inner', handler);
    });

    it('/', (done) => {
      expect.assertions(3);
      instance.listen(0, (err) => {
        expect(err).toBeFalsy();
        sget(
          {
            method: 'GET',
            url: 'http://localhost:' + instance.server.address().port + '/',
            json: true,
          },
          (err, response, body) => {
            expect(err).toBeFalsy();
            expect(body).toEqual({
              global2: true,
              root: true,
            });
            done();
          }
        );
      });
    });

    it('/prefix', (done) => {
      expect.assertions(3);
      instance.listen(0, (err) => {
        expect(err).toBeFalsy();
        sget(
          {
            method: 'GET',
            url: 'http://localhost:' + instance.server.address().port + '/prefix',
            json: true,
          },
          (err, response, body) => {
            expect(err).toBeFalsy();
            expect(body).toEqual({
              prefixed: true,
              global2: true,
              root: true,
              slashed: true,
            });
            done();
          }
        );
      });
    });

    it('/prefix/', (done) => {
      expect.assertions(3);
      instance.listen(0, (err) => {
        expect(err).toBeFalsy();
        sget(
          {
            method: 'GET',
            url: 'http://localhost:' + instance.server.address().port + '/prefix/',
            json: true,
          },
          (err, response, body) => {
            expect(err).toBeFalsy();
            expect(body).toEqual({
              prefixed: true,
              slashed: true,
              global2: true,
              root: true,
            });
            done();
          }
        );
      });
    });

    it('/prefix/inner', (done) => {
      expect.assertions(3);
      instance.listen(0, (err) => {
        expect(err).toBeFalsy();
        sget(
          {
            method: 'GET',
            url: 'http://localhost:' + instance.server.address().port + '/prefix/inner',
            json: true,
          },
          (err, response, body) => {
            expect(err).toBeFalsy();
            expect(body).toEqual({
              prefixed: true,
              slashed: true,
              global2: true,
              root: true,
            });
            done();
          }
        );
      });
    });
  });

  it('res.end should block middleware execution', (done) => {
    expect.assertions(4);

    instance.register(fastifyMiddlewarePlugin).after(() => {
      instance.use('/', function (req, res, next) {
        res.end('hello');
      });

      instance.use('/', function (req, res, next) {
        // we should not be here
        expect(true).toBeFalsy();
      });
    });

    instance.addHook('onRequest', (req, res, next) => {
      expect('called').toBeTruthy();
      next();
    });

    instance.addHook('preHandler', (req, reply, next) => {
      // we should not be here
      expect(true).toBeFalsy();
    });

    instance.addHook('onSend', (req, reply, payload, next) => {
      // we should not be here
      expect(true).toBeFalsy();
    });

    instance.addHook('onResponse', (request, reply, next) => {
      expect('called').toBeTruthy();
      next();
    });

    instance.get('/', function (request, reply) {
      // we should not be here
      expect(true).toBeFalsy();
    });

    instance.inject(
      {
        url: '/',
        method: 'GET',
      },
      (err, res) => {
        expect(err).toBeFalsy();
        expect(res.statusCode).toBe(200);
        expect(res.payload).toBe('hello');
        done();
      }
    );
  });

  it('middlewares should be able to respond with a stream', (done) => {
    expect.assertions(4);

    instance.addHook('onRequest', (req, res, next) => {
      expect('called').toBeTruthy();
      next();
    });

    instance.register(fastifyMiddlewarePlugin).after(() => {
      instance.use('/', function (req, res, next) {
        const stream = createReadStream(process.cwd() + '/test/middleware.test.ts', 'utf8');
        stream.pipe(res);
        res.once('finish', next);
      });

      instance.use('/', function (req, res, next) {
        // we should not be here
        expect(true).toBeFalsy();
      });
    });

    instance.addHook('preHandler', (req, reply, next) => {
      // we should not be here
      expect(true).toBeFalsy();
    });

    instance.addHook('onSend', (req, reply, payload, next) => {
      // we should not be here
      expect(true).toBeFalsy();
    });

    instance.addHook('onResponse', (request, reply, next) => {
      expect('called').toBeTruthy();
      next();
    });

    instance.get('/', function (request, reply) {
      // we should not be here
      expect(true).toBeFalsy();
    });

    instance.inject(
      {
        url: '/',
        method: 'GET',
      },
      (err, res) => {
        expect(err).toBeFalsy();
        expect(res.statusCode).toBe(200);
        done();
      }
    );
  });

  it('Use a middleware inside a plugin after an encapsulated plugin', (done) => {
    expect.assertions(4);

    instance.register(fastifyMiddlewarePlugin);

    instance.register(function (instance, opts, next) {
      instance.use('/', function (req, res, next) {
        expect('first middleware called').toBeTruthy();
        next();
      });

      instance.get('/', function (request, reply) {
        reply.send({ hello: 'world' });
      });

      next();
    });

    instance.register(
      fp(function (instance, opts, next) {
        instance.use('/', function (req, res, next) {
          expect('second middleware called').toBeTruthy();
          next();
        });

        next();
      })
    );

    instance.inject('/', (err, res) => {
      expect(err).toBeFalsy();
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload)).toEqual({ hello: 'world' });
      done();
    });
  });

  it('middlewares should run in the order in which they are defined', (done) => {
    expect.assertions(9);
    instance.register(fastifyMiddlewarePlugin);

    instance.register(
      fp(function (instance, opts, next) {
        instance.use('/', function (req, res, next) {
          expect(req.previous).toBe(undefined);
          req.previous = 1;
          next();
        });

        instance.register(
          fp(function (i, opts, next) {
            i.use('/', function (req, res, next) {
              expect(req.previous).toBe(2);
              req.previous = 3;
              next();
            });
            next();
          })
        );

        instance.use('/', function (req, res, next) {
          expect(req.previous).toBe(1);
          req.previous = 2;
          next();
        });

        next();
      })
    );

    instance.register(function (instance, opts, next) {
      instance.use('/', function (req, res, next) {
        expect(req.previous).toBe(3);
        req.previous = 4;
        next();
      });

      instance.get('/', function (request, reply) {
        expect(request.raw.previous).toBe(5);
        reply.send({ hello: 'world' });
      });

      instance.register(
        fp(function (i, opts, next) {
          i.use('/', function (req, res, next) {
            expect(req.previous).toBe(4);
            req.previous = 5;
            next();
          });
          next();
        })
      );

      next();
    });

    instance.inject('/', (err, res) => {
      expect(err).toBeFalsy();
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload)).toEqual({ hello: 'world' });
      done();
    });
  });
});
