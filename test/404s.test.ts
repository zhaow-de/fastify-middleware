import fp from 'fastify-plugin';
import Fastify from 'fastify';
import { concat as sget } from 'simple-get';
import fastifyMiddlewarePlugin from '../src';

describe('404s', () => {
  let fastify;

  beforeEach(() => {
    fastify = Fastify();
  });

  afterEach(async () => {
    await new Promise((r) => setTimeout(r, 200));
    await fastify.close();
  });

  it('run hooks and middleware on default 404', (done) => {
    expect.assertions(8);

    fastify.register(fastifyMiddlewarePlugin).after(() => {
      fastify.use(function (req, res, next) {
        // middleware called
        expect(true).toBeTruthy();
        next();
      });
    });

    fastify.addHook('onRequest', function (req, res, next) {
      // onRequest called
      expect(true).toBeTruthy();
      next();
    });

    fastify.addHook('preHandler', function (request, reply, next) {
      // preHandler called
      expect(true).toBeTruthy();
      next();
    });

    fastify.addHook('onSend', function (request, reply, payload, next) {
      // onSend called
      expect(true).toBeTruthy();
      next();
    });

    fastify.addHook('onResponse', function (request, reply, next) {
      // onResponse called
      expect(true).toBeTruthy();
      next();
    });

    fastify.get('/', function (req, reply) {
      reply.send({ hello: 'world' });
    });

    fastify.listen(0, (err) => {
      expect(err).toBeFalsy();

      sget(
        {
          method: 'PUT',
          url: 'http://localhost:' + fastify.server.address().port,
          body: JSON.stringify({ hello: 'world' }),
          headers: { 'Content-Type': 'application/json' },
        },
        (err, response, body) => {
          expect(err).toBeFalsy();
          expect(response.statusCode).toBe(404);
          done();
        }
      );
    });
  });

  it('run non-encapsulated plugin hooks and middleware on default 404', (done) => {
    expect.assertions(8);

    fastify.register(fastifyMiddlewarePlugin);

    fastify.register(
      fp(function (instance, options, next) {
        instance.addHook('onRequest', function (req, res, next) {
          // onRequest called
          expect(true).toBeTruthy();
          next();
        });

        instance.use(function (req, res, next) {
          // middleware called
          expect(true).toBeTruthy();
          next();
        });

        instance.addHook('preHandler', function (request, reply, next) {
          // preHandler called
          expect(true).toBeTruthy();
          next();
        });

        instance.addHook('onSend', function (request, reply, payload, next) {
          // onSend called
          expect(true).toBeTruthy();
          next();
        });

        instance.addHook('onResponse', function (request, reply, next) {
          // onResponse called
          expect(true).toBeTruthy();
          next();
        });

        next();
      })
    );

    fastify.get('/', function (req, reply) {
      reply.send({ hello: 'world' });
    });

    fastify.listen(0, (err, address) => {
      expect(err).toBeFalsy();
      sget(
        {
          method: 'POST',
          url: address,
          body: JSON.stringify({ hello: 'world' }),
          headers: { 'Content-Type': 'application/json' },
        },
        (err, response, body) => {
          expect(err).toBeFalsy();
          expect(response.statusCode).toBe(404);
          done();
        }
      );
    });
  });

  it('run non-encapsulated plugin hooks and middleware on custom 404', (done) => {
    expect.assertions(14);

    fastify.register(fastifyMiddlewarePlugin);

    const plugin = fp((instance, opts, next) => {
      instance.addHook('onRequest', function (req, res, next) {
        // onRequest called
        expect(true).toBeTruthy();
        next();
      });

      instance.use(function (req, res, next) {
        // middleware called
        expect(true).toBeTruthy();
        next();
      });

      instance.addHook('preHandler', function (request, reply, next) {
        // preHandler called
        expect(true).toBeTruthy();
        next();
      });

      instance.addHook('onSend', function (request, reply, payload, next) {
        // onSend called
        expect(true).toBeTruthy();
        next();
      });

      instance.addHook('onResponse', function (request, reply, next) {
        // 'onResponse called'
        expect(true).toBeTruthy();
        next();
      });

      next();
    });

    fastify.register(plugin);

    fastify.get('/', function (req, reply) {
      reply.send({ hello: 'world' });
    });

    fastify.setNotFoundHandler(function (req, reply) {
      reply.code(404).send('this was not found');
    });

    fastify.register(plugin); // Registering plugin after handler also works

    fastify.listen(0, (err, address) => {
      expect(err).toBeFalsy();
      sget(
        {
          method: 'GET',
          url: address + '/not-found',
        },
        (err, response, body) => {
          expect(err).toBeFalsy();
          expect(body.toString()).toBe('this was not found');
          expect(response.statusCode).toBe(404);
          done();
        }
      );
    });
  });

  test('run hooks and middleware with encapsulated 404', (done) => {
    expect.assertions(13);

    fastify.register(fastifyMiddlewarePlugin).after(() => {
      fastify.use(function (req, res, next) {
        // middleware called
        expect(true).toBeTruthy();
        next();
      });
    });

    fastify.addHook('onRequest', function (req, res, next) {
      // onRequest called
      expect(true).toBeTruthy();
      next();
    });

    fastify.addHook('preHandler', function (request, reply, next) {
      // preHandler called
      expect(true).toBeTruthy();
      next();
    });

    fastify.addHook('onSend', function (request, reply, payload, next) {
      // onSend called
      expect(true).toBeTruthy();
      next();
    });

    fastify.addHook('onResponse', function (request, reply, next) {
      // onResponse called
      expect(true).toBeTruthy();
      next();
    });

    fastify.register(
      function (f, opts, next) {
        f.setNotFoundHandler(function (req, reply) {
          reply.code(404).send('this was not found 2');
        });

        f.addHook('onRequest', function (req, res, next) {
          // onRequest 2 called
          expect(true).toBeTruthy();
          next();
        });

        f.use(function (req, res, next) {
          // middleware 2 called
          expect(true).toBeTruthy();
          next();
        });

        f.addHook('preHandler', function (request, reply, next) {
          // preHandler 2 called
          expect(true).toBeTruthy();
          next();
        });

        f.addHook('onSend', function (request, reply, payload, next) {
          // onSend 2 called
          expect(true).toBeTruthy();
          next();
        });

        f.addHook('onResponse', function (request, reply, next) {
          // onResponse 2 called
          expect(true).toBeTruthy();
          next();
        });

        next();
      },
      { prefix: '/test' }
    );

    fastify.listen(0, (err) => {
      expect(err).toBeFalsy();

      sget(
        {
          method: 'PUT',
          url: 'http://localhost:' + fastify.server.address().port + '/test',
          body: JSON.stringify({ hello: 'world' }),
          headers: { 'Content-Type': 'application/json' },
        },
        (err, response, body) => {
          expect(err).toBeFalsy();
          expect(response.statusCode).toBe(404);
          done();
        }
      );
    });
  });

  it('run middlewares on default 404', (done) => {
    expect.assertions(4);

    fastify.register(fastifyMiddlewarePlugin).after(() => {
      fastify.use(function (req, res, next) {
        // middleware called
        expect(true).toBeTruthy();
        next();
      });
    });

    fastify.get('/', function (req, reply) {
      reply.send({ hello: 'world' });
    });

    fastify.listen(0, (err) => {
      expect(err).toBeFalsy();

      sget(
        {
          method: 'PUT',
          url: 'http://localhost:' + fastify.server.address().port,
          body: JSON.stringify({ hello: 'world' }),
          headers: { 'Content-Type': 'application/json' },
        },
        (err, response, body) => {
          expect(err).toBeFalsy();
          expect(response.statusCode).toBe(404);
          done();
        }
      );
    });
  });

  it('run middlewares with encapsulated 404', (done) => {
    expect.assertions(5);

    fastify.register(fastifyMiddlewarePlugin).after(() => {
      fastify.use(function (req, res, next) {
        // middleware called
        expect(true).toBeTruthy();
        next();
      });
    });

    fastify.register(
      function (f, opts, next) {
        f.setNotFoundHandler(function (req, reply) {
          reply.code(404).send('this was not found 2');
        });

        f.use(function (req, res, next) {
          // middleware 2 called
          expect(true).toBeTruthy();
          next();
        });

        next();
      },
      { prefix: '/test' }
    );

    fastify.listen(0, (err) => {
      expect(err).toBeFalsy();

      sget(
        {
          method: 'PUT',
          url: 'http://localhost:' + fastify.server.address().port + '/test',
          body: JSON.stringify({ hello: 'world' }),
          headers: { 'Content-Type': 'application/json' },
        },
        (err, response, body) => {
          expect(err).toBeFalsy();
          expect(response.statusCode).toBe(404);
          done();
        }
      );
    });
  });
});
