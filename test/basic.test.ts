import Fastify, { FastifyInstance } from 'fastify';
import { concat as sget } from 'simple-get';
import cors from 'cors';

import fastifyMiddlewarePlugin from '../src';

describe('basics', () => {
  let fastify: FastifyInstance;

  beforeEach(() => {
    fastify = Fastify();
  });

  afterEach(async () => {
    await new Promise((r) => setTimeout(r, 200));
    await fastify.close();
  });

  it('Should support connect style middlewares', (done) => {
    expect.assertions(4);

    fastify.register(fastifyMiddlewarePlugin).after(() => {
      fastify.use(cors());
    });

    fastify.get('/', async (req, reply) => {
      return { hello: 'world' };
    });

    fastify.listen(0, (err, address) => {
      expect(err).toBeFalsy();
      sget(
        {
          method: 'GET',
          url: address,
        },
        (err, res, data) => {
          expect(err).toBeFalsy();
          expect(res.headers).toMatchObject({ 'access-control-allow-origin': '*' });
          expect(JSON.parse(data)).toEqual({ hello: 'world' });
          done();
        }
      );
    });
  });

  it('Should support connect style middlewares (async await)', async () => {
    expect.assertions(3);

    await fastify.register(fastifyMiddlewarePlugin);
    fastify.use(cors());

    fastify.get('/', async (req, reply) => {
      return { hello: 'world' };
    });

    const address = await fastify.listen(0);
    return new Promise<void>((resolve, reject) => {
      sget(
        {
          method: 'GET',
          url: address,
        },
        (err, res, data) => {
          expect(err).toBeFalsy();
          expect(res.headers).toMatchObject({
            'access-control-allow-origin': '*',
          });
          expect(JSON.parse(data)).toEqual({ hello: 'world' });
          resolve();
        }
      );
    });
  });

  it('Should support connect style middlewares (async await after)', async () => {
    expect.assertions(3);

    await fastify.register(fastifyMiddlewarePlugin);
    await fastify.after();
    fastify.use(cors());

    fastify.get('/', async (req, reply) => {
      return { hello: 'world' };
    });

    const address = await fastify.listen(0);
    return new Promise<void>((resolve, reject) => {
      sget(
        {
          method: 'GET',
          url: address,
        },
        (err, res, data) => {
          expect(err).toBeFalsy();
          expect(res.headers).toMatchObject({
            'access-control-allow-origin': '*',
          });
          expect(JSON.parse(data)).toEqual({ hello: 'world' });
          resolve();
        }
      );
    });
  });

  it('Should support per path middlewares', (done) => {
    expect.assertions(5);

    fastify.register(fastifyMiddlewarePlugin).after(() => {
      fastify.use('/cors', cors());
    });

    fastify.get('/cors/hello', async (req, reply) => {
      return { hello: 'world' };
    });

    fastify.get('/', async (req, reply) => {
      return { hello: 'world' };
    });

    fastify.listen(0, (err, address) => {
      expect(err).toBeFalsy();
      sget(
        {
          method: 'GET',
          url: address + '/cors/hello',
        },
        (err, res, data) => {
          expect(err).toBeFalsy();
          expect(res.headers).toMatchObject({
            'access-control-allow-origin': '*',
          });
        }
      );

      sget(
        {
          method: 'GET',
          url: address,
        },
        (err, res, data) => {
          expect(err).toBeFalsy();
          expect(res.headers['access-control-allow-origin']).toBeFalsy();
          done();
        }
      );
    });
  });

  it('Encapsulation support / 1', (done) => {
    expect.assertions(2);

    fastify.register((instance, opts, next) => {
      instance.register(fastifyMiddlewarePlugin).after(() => {
        instance.use(middleware);
      });

      instance.get('/plugin', (req, reply) => {
        reply.send('ok');
      });

      next();
    });

    fastify.get('/', (req, reply) => {
      reply.send('ok');
    });

    fastify.listen(0, (err, address) => {
      expect(err).toBeFalsy();
      sget(
        {
          method: 'GET',
          url: address,
        },
        (err, res, data) => {
          expect(err).toBeFalsy();
          fastify.close();
          done();
        }
      );
    });

    function middleware(req, res, next) {
      // Should not be called
      expect(true).toBeFalsy();
    }
  });

  it('Encapsulation support / 2', (done) => {
    expect.assertions(2);

    fastify.register(fastifyMiddlewarePlugin);

    fastify.register((instance, opts, next) => {
      instance.use(middleware);
      instance.get('/plugin', (req, reply) => {
        reply.send('ok');
      });

      next();
    });

    fastify.get('/', (req, reply) => {
      reply.send('ok');
    });

    fastify.listen(0, (err, address) => {
      expect(err).toBeFalsy();
      sget(
        {
          method: 'GET',
          url: address,
        },
        (err, res, data) => {
          expect(err).toBeFalsy();
          fastify.close();
          done();
        }
      );
    });

    function middleware(req, res, next) {
      // Should not be called
      expect(true).toBeFalsy();
    }
  });

  it('Encapsulation support / 3', (done) => {
    expect.assertions(5);

    fastify.register(fastifyMiddlewarePlugin);

    fastify.register((instance, opts, next) => {
      instance.use(cors());
      instance.get('/plugin', (req, reply) => {
        reply.send('ok');
      });

      next();
    });

    fastify.get('/', (req, reply) => {
      reply.send('ok');
    });

    fastify.listen(0, (err, address) => {
      expect(err).toBeFalsy();
      sget(
        {
          method: 'GET',
          url: address + '/plugin',
        },
        (err, res, data) => {
          expect(err).toBeFalsy();
          expect(res.headers).toMatchObject({
            'access-control-allow-origin': '*',
          });
        }
      );

      sget(
        {
          method: 'GET',
          url: address,
        },
        (err, res, data) => {
          expect(err).toBeFalsy();
          expect(res.headers).not.toMatchObject({
            'access-control-allow-origin': '*',
          });
          done();
        }
      );
    });
  });

  it('Encapsulation support / 4', (done) => {
    expect.assertions(5);

    fastify.register(fastifyMiddlewarePlugin);
    fastify.after(() => {
      fastify.use(middleware1);
    });

    fastify.register((instance, opts, next) => {
      instance.use(middleware2);
      instance.get('/plugin', (req, reply) => {
        reply.send('ok');
      });

      next();
    });

    fastify.get('/', (req, reply) => {
      reply.send('ok');
    });

    fastify.listen(0, (err, address) => {
      expect(err).toBeFalsy();
      sget(
        {
          method: 'GET',
          url: address + '/plugin',
        },
        (err, res, data) => {
          expect(err).toBeFalsy();
          expect(res.headers).toMatchObject({
            'x-middleware-1': 'true',
            'x-middleware-2': 'true',
          });
        }
      );

      sget(
        {
          method: 'GET',
          url: address,
        },
        (err, res, data) => {
          expect(err).toBeFalsy();
          expect(res.headers).toMatchObject({
            'x-middleware-1': 'true',
          });
          done();
        }
      );
    });

    function middleware1(req, res, next) {
      res.setHeader('x-middleware-1', true);
      next();
    }

    function middleware2(req, res, next) {
      res.setHeader('x-middleware-2', true);
      next();
    }
  });

  it('Encapsulation support / 5', (done) => {
    expect.assertions(7);

    fastify.register(fastifyMiddlewarePlugin);
    fastify.after(() => {
      fastify.use(middleware1);
    });

    fastify.register(
      (instance, opts, next) => {
        instance.use(middleware2);
        instance.get('/', (req, reply) => {
          reply.send('ok');
        });

        instance.register((i, opts, next) => {
          i.use(middleware3);
          i.get('/nested', (req, reply) => {
            reply.send('ok');
          });

          next();
        });

        next();
      },
      { prefix: '/plugin' }
    );

    fastify.get('/', (req, reply) => {
      reply.send('ok');
    });

    fastify.listen(0, (err, address) => {
      expect(err).toBeFalsy();
      sget(
        {
          method: 'GET',
          url: address + '/plugin/nested',
        },
        (err, res, data) => {
          expect(err).toBeFalsy();
          expect(res.headers).toMatchObject({
            'x-middleware-1': 'true',
            'x-middleware-2': 'true',
            'x-middleware-3': 'true',
          });
        }
      );

      sget(
        {
          method: 'GET',
          url: address + '/plugin',
        },
        (err, res, data) => {
          expect(err).toBeFalsy();
          expect(res.headers).toMatchObject({
            'x-middleware-1': 'true',
            'x-middleware-2': 'true',
          });
        }
      );

      sget(
        {
          method: 'GET',
          url: address,
        },
        (err, res, data) => {
          expect(err).toBeFalsy();
          expect(res.headers).toMatchObject({
            'x-middleware-1': 'true',
          });
          done();
        }
      );
    });

    function middleware1(req, res, next) {
      res.setHeader('x-middleware-1', true);
      next();
    }

    function middleware2(req, res, next) {
      res.setHeader('x-middleware-2', true);
      next();
    }

    function middleware3(req, res, next) {
      res.setHeader('x-middleware-3', true);
      next();
    }
  });

  it('Middleware chain', (done) => {
    expect.assertions(5);

    const order = [1, 2, 3];

    fastify.register(fastifyMiddlewarePlugin).after(() => {
      fastify.use(middleware1).use(middleware2).use(middleware3);
    });

    fastify.get('/', async (req, reply) => {
      return { hello: 'world' };
    });

    fastify.listen(0, (err, address) => {
      expect(err).toBeFalsy();
      sget(
        {
          method: 'GET',
          url: address,
        },
        (err, res, data) => {
          expect(err).toBeFalsy();
          done();
        }
      );
    });

    function middleware1(req, res, next) {
      expect(order.shift()).toBe(1);
      next();
    }

    function middleware2(req, res, next) {
      expect(order.shift()).toBe(2);
      next();
    }

    function middleware3(req, res, next) {
      expect(order.shift()).toBe(3);
      next();
    }
  });

  it('Middleware chain (with errors) / 1', (done) => {
    expect.assertions(3);

    fastify.register(fastifyMiddlewarePlugin).after(() => {
      fastify.use(middleware1).use(middleware2).use(middleware3);
    });

    fastify.get('/', async (req, reply) => {
      return { hello: 'world' };
    });

    fastify.listen(0, (err, address) => {
      expect(err).toBeFalsy();
      sget(
        {
          method: 'GET',
          url: address,
        },
        (err, res, data) => {
          expect(err).toBeFalsy();
          expect(res.statusCode).toBe(500);
          done();
        }
      );
    });

    function middleware1(req, res, next) {
      next(new Error('middleware1'));
    }

    function middleware2(req, res, next) {
      // this should not be executed
      expect(true).toBeFalsy();
    }

    function middleware3(req, res, next) {
      // this should not be executed
      expect(true).toBeFalsy();
    }
  });

  it('Middleware chain (with errors) / 2', (done) => {
    expect.assertions(5);

    fastify.setErrorHandler((err, req, reply) => {
      expect(err.message).toBe('middleware2');
      reply.send(err);
    });

    fastify.register(fastifyMiddlewarePlugin).after(() => {
      fastify.use(middleware1).use(middleware2).use(middleware3);
    });

    fastify.get('/', async (req, reply) => {
      return { hello: 'world' };
    });

    fastify.listen(0, (err, address) => {
      expect(err).toBeFalsy();
      sget(
        {
          method: 'GET',
          url: address,
        },
        (err, res, data) => {
          expect(err).toBeFalsy();
          expect(res.statusCode).toBe(500);
          done();
        }
      );
    });

    function middleware1(req, res, next) {
      // called
      expect(true).toBeTruthy();
      next();
    }

    function middleware2(req, res, next) {
      next(new Error('middleware2'));
    }

    function middleware3(req, res, next) {
      // this should not be executed
      expect(true).toBeFalsy();
    }
  });

  it('Send a response from a middleware', (done) => {
    expect.assertions(4);

    fastify.register(fastifyMiddlewarePlugin).after(() => {
      fastify.use(middleware1).use(middleware2);
    });

    fastify.addHook('preValidation', (req, reply, next) => {
      // this should not be executed
      expect(true).toBeFalsy();
    });

    fastify.addHook('preParsing', (req, reply, payload, next) => {
      // this should not be executed
      expect(true).toBeFalsy();
    });

    fastify.addHook('preHandler', (req, reply, next) => {
      // this should not be executed
      expect(true).toBeFalsy();
    });

    fastify.addHook('onSend', (req, reply, next) => {
      // this should not be executed
      expect(true).toBeFalsy();
    });

    fastify.addHook('onResponse', (req, reply, next) => {
      expect('called').toBeTruthy();
      next();
    });

    fastify.get('/', (req, reply) => {
      // this should not be executed
      expect(true).toBeFalsy();
    });

    fastify.listen(0, (err, address) => {
      expect(err).toBeFalsy();
      sget(
        {
          method: 'GET',
          url: address,
          json: true,
        },
        (err, res, data) => {
          expect(err).toBeFalsy();
          expect(data).toEqual({ hello: 'world' });
          done();
        }
      );
    });

    function middleware1(req, res, next) {
      res.end(JSON.stringify({ hello: 'world' }));
    }

    function middleware2(req, res, next) {
      // this should not be executed
      expect(true).toBeFalsy();
    }
  });

  it('Should support plugin level prefix', (done) => {
    expect.assertions(4);

    fastify.register(fastifyMiddlewarePlugin);

    fastify.register(
      (instance, opts, next) => {
        instance.use('/world', (req, res, next) => {
          res.setHeader('x-foo', 'bar');
          next();
        });

        instance.get('/world', (req, reply) => {
          reply.send({ hello: 'world' });
        });

        next();
      },
      { prefix: '/hello' }
    );

    fastify.listen(0, (err, address) => {
      expect(err).toBeFalsy();
      sget(
        {
          method: 'GET',
          url: address + '/hello/world',
        },
        (err, res, data) => {
          expect(err).toBeFalsy();
          expect(res.headers['x-foo']).toBe('bar');
          expect(JSON.parse(data)).toEqual({ hello: 'world' });
          done();
        }
      );
    });
  });

  it('register the middleware at a different hook', async () => {
    let onRequestCalled = false;

    await fastify.register(fastifyMiddlewarePlugin, {
      hook: 'preHandler',
    });

    fastify.use(function (req, res, next) {
      expect(onRequestCalled).toBeTruthy();
      next();
    });

    fastify.addHook('onRequest', function (req, reply, next) {
      onRequestCalled = true;
      next();
    });

    fastify.get('/', async (req, reply) => {
      return { hello: 'world' };
    });

    const res = await fastify.inject('/');
    expect(res.json()).toEqual({ hello: 'world' });
  });
});
