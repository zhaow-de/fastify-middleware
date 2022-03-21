import Fastify from 'fastify';
import fastifyMiddlewarePlugin from '../src';

describe('hooks', () => {
  it('onSend hook should receive valid request and reply objects if middleware fails', (done) => {
    expect.assertions(4);
    const fastify = Fastify();
    fastify.register(fastifyMiddlewarePlugin).after(() => {
      fastify.use('/', function (req, res, next) {
        next(new Error('middlware failed'));
      });
    });

    fastify.decorateRequest('testDecorator', 'testDecoratorVal');
    fastify.decorateReply('testDecorator', 'testDecoratorVal');

    fastify.addHook('onSend', function (request, reply, payload, next) {
      // @ts-ignore
      expect(request.testDecorator).toBe('testDecoratorVal');
      // @ts-ignore
      expect(reply.testDecorator).toBe('testDecoratorVal');
      next();
    });

    fastify.inject(
      {
        method: 'GET',
        url: '/',
      },
      (err, res) => {
        expect(err).toBeFalsy();
        expect(res.statusCode).toBe(500);
        done();
      }
    );

    fastify.get('/', (req, reply) => {
      reply.send('hello');
    });
  });
});
