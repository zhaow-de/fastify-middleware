import fp from 'fastify-plugin';
import symbols from 'fastify/lib/symbols';
import { FastifyMiddleware } from './engine';
import { FastifyInstance, FastifyPluginCallback } from 'fastify';
import http from 'http';

const kMiddlewares = Symbol('fastify-middlewares');
const kFastifyMiddleware = Symbol('fastify-middleware-instance');

export interface IncomingMessageExtended {
  body?: any;
  query?: any;
}

export class IncomingMessageWithOrigUrl extends http.IncomingMessage {
  originalUrl?: http.IncomingMessage['url'] | undefined;
}

export type NextFunction = (err?: any) => void;
type SimpleHandleFunction = (req: http.IncomingMessage & IncomingMessageExtended, res: http.ServerResponse) => void;
type NextHandleFunction = (
  req: IncomingMessageWithOrigUrl & IncomingMessageExtended,
  res: http.ServerResponse,
  next: NextFunction
) => void;

export type Handler = SimpleHandleFunction | NextHandleFunction;

export type Context = { [key: string]: string | boolean | number | null };

declare module 'fastify' {
  interface FastifyInstance {
    use(fn: Handler): this;
    use(route: string, fn: Handler): this;
  }
}

export class IncomingMessage extends http.IncomingMessage {
  originalUrl?: http.IncomingMessage['url'];
}

export interface IncomingMessageExtended {
  body?: any;
  query?: any;
}

interface SimpleMessage {
  url?: string;
  originalUrl?: http.IncomingMessage['url'];
}

export type ServerRequest = SimpleMessage | (IncomingMessage & IncomingMessageExtended);

export interface FastifyMiddlewarePluginOptions {
  hook?:
    | 'onRequest'
    | 'preParsing'
    | 'preValidation'
    | 'preHandler'
    | 'preSerialization'
    | 'onSend'
    | 'onResponse'
    | 'onTimeout'
    | 'onError';
}

function FastifyMiddlewarePlugin(fastify: FastifyInstance, options, next) {
  fastify.decorate('use', use);
  fastify[kMiddlewares] = [];
  fastify[kFastifyMiddleware] = FastifyMiddleware(onFastifyMiddlewareEnd);

  fastify.addHook(options.hook || 'onRequest', runFastifyMiddleware).addHook('onRegister', onRegister);

  function use(path, fn) {
    if (typeof path === 'string') {
      const prefix = this[symbols.kRoutePrefix];
      path = prefix + path;
    }
    this[kMiddlewares].push([path, fn]);
    if (fn == null) {
      this[kFastifyMiddleware].use(path);
    } else {
      this[kFastifyMiddleware].use(path, fn);
    }
    return this;
  }

  function runFastifyMiddleware(req, reply, next) {
    if (this[kMiddlewares].length > 0) {
      req.raw.originalUrl = req.raw.url;
      req.raw.id = req.id;
      req.raw.hostname = req.hostname;
      req.raw.ip = req.ip;
      req.raw.ips = req.ips;
      req.raw.log = req.log;
      req.raw.body = req.body;
      req.raw.query = req.query;
      reply.raw.log = req.log;
      this[kFastifyMiddleware].run(req.raw, reply.raw, next);
    } else {
      next();
    }
  }

  function onFastifyMiddlewareEnd(err, req, res, next) {
    next(err);
  }

  function onRegister(instance) {
    const middlewares = instance[kMiddlewares].slice();
    instance[kMiddlewares] = [];
    instance[kFastifyMiddleware] = FastifyMiddleware(onFastifyMiddlewareEnd);
    instance.decorate('use', use);
    for (const middleware of middlewares) {
      instance.use(...middleware);
    }
  }

  next();
}

const plugin: FastifyPluginCallback<FastifyMiddlewarePluginOptions> = fp(FastifyMiddlewarePlugin, {
  fastify: '>=3.0.0',
  name: 'fastify-middleware',
});

export default plugin;
