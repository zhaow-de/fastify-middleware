![npm (scoped)](https://img.shields.io/npm/v/@zhaow-de/fastify-middleware)
![Coveralls](https://img.shields.io/coveralls/github/zhaow-de/fastify-middleware)
![npm bundle size (scoped)](https://img.shields.io/bundlephobia/min/@zhaow-de/fastify-middleware)
![npm bundle zip size (scoped)](https://img.shields.io/bundlephobia/minzip/@zhaow-de/fastify-middleware)
![Depfu](https://img.shields.io/depfu/dependencies/github/zhaow-de/fastify-middleware)
![NPM](https://img.shields.io/npm/l/@zhaow-de/fastify-middleware)
![npm](https://img.shields.io/npm/dm/@zhaow-de/fastify-middleware)

# fastify-middleware

**Current version: v1.0.26**

*fastify-middleware* is the plugin that adds middleware support on steroids to [Fastify](https://www.npmjs.com/package/fastify).

The syntax style is the same as [express](http://npm.im/express).
Does not support the full syntax `middleware(err, req, res, next)`, because error handling is done inside Fastify.

## Acknowledgement

This npm package is based on https://github.com/fastify/middie.
For the specific use cases, some opinionated tweaks are implemented, precisely:
* In-sourced [path-to-regexp](https://github.com/pillarjs/path-to-regexp)
* Removed [reusify](https://github.com/mcollina/reusify)
* Removed the support of multi-paths and multi-middlewares
* Switched the test framework from [node-tap](https://github.com/tapjs/node-tap) to jest
* Reached 100% test coverage
* More TypeScript compatible
* Changed code style

## Install

```
npm install @zhaow-de/fastify-middleware
```

## Usage
Register the plugin and start using your middleware.
```js
const Fastify = require('fastify')

async function build () {
  const fastify = Fastify();
  await fastify.register(require('@zhaow-de/fastify-middleware'), {
    hook: 'onRequest' // default
  });
  // here is just an exmaple. particularlly for cors, Fastify has a dedicated plugin to support it 
  // https://github.com/fastify/fastify-cors
  fastify.use(require('cors')());
  return fastify;
}

build()
  .then(fastify => fastify.listen(3000))
  .catch(console.error);
```

### Hooks and middleware

__Every registered middleware will be run during the `onRequest` hook phase__, so the registration order is important.
Take a look at the [Lifecycle](https://www.fastify.io/docs/latest/Reference/Lifecycle/) documentation page to understand better how every request is executed.

```js
const fastify = require('fastify')();

fastify
  .register(require('@zhaow-de/fastify-middleware'))
  .register(subsystem);

async function subsystem (fastify, opts) {
  fastify.addHook('onRequest', async (req, reply) => {
    console.log('first');
  });

  fastify.use((req, res, next) => {
    console.log('second');
    next();
  });

  fastify.addHook('onRequest', async (req, reply) => {
    console.log('third');
  });
}
```

If you want to change the Fastify hook that the middleware will be attached to, pass a `hook` option like so:

*Note you can access `req.body` from the `preValidation` lifecycle step onwards. Take a look at the [Lifecycle](https://www.fastify.io/docs/latest/Reference/Lifecycle/) documentation page to see the order of the steps.*

```js
const fastify = require('fastify')();

fastify
  .register(require('@zhaow-de/fastify-middleware'), { hook: 'preHandler' })
  .register(subsystem);

async function subsystem (fastify, opts) {
  fastify.addHook('onRequest', async (req, reply) => {
    console.log('first');
  });

  fastify.use((req, res, next) => {
    console.log('third');
    next();
  });

  fastify.addHook('onRequest', async (req, reply) => {
    console.log('second');
  });

  fastify.addHook('preHandler', async (req, reply) => {
    console.log('fourth');
  });
}
```

### Restrict middleware execution to a certain path(s)

If you need to run a middleware only under certain path(s), just pass the path as first parameter to use, and you are done!

```js
const fastify = require('fastify')();
const path = require('path');
const serveStatic = require('serve-static');

fastify
  .register(require('@zhaow-de/fastify-middleware'))
  .register(subsystem);

async function subsystem (fastify, opts) {
  // Single path
  fastify.use('/css', serveStatic(path.join(__dirname, '/assets')));

  // Wildcard path
  fastify.use('/css/*', serveStatic(path.join(__dirname, '/assets')));
}
```

# FastifyMiddleware Engine

You can also use the engine itself without the Fastify plugin system.

## Usage
```js
const FastifyMiddleware = require('@zhaow-de/fastify-middleware/engine');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');

const fastifyMiddleware = FastifyMiddleware(_runMiddlewares);
fastifyMiddleware.use(helmet());
fastifyMiddleware.use(cors());

http
  .createServer(function handler (req, res) {
    fastifyMiddleware.run(req, res);
  })
  .listen(3000);

function _runMiddlewares (err, req, res) {
  if (err) {
    console.log(err);
    res.end(err);
    return;
  }

  // => routing function
}
```
<a name="keep-context"></a>
#### Keep the context
If you need it you can also keep the context of the calling function by calling `run` with `run(req, res, this)`, in this way you can avoid closures allocation.

```js
http
  .createServer(function handler (req, res) {
    fastifyMiddleware.run(req, res, { context: 'object' })
  })
  .listen(3000);

function _runMiddlewares (err, req, res, ctx) {
  if (err) {
    console.log(err);
    res.end(err);
    return;
  }
  console.log(ctx);
}
```

<a name="restrict-usage"></a>
#### Restrict middleware execution to a certain path(s)
If you need to run a middleware only under certain path(s), just pass the path as first parameter to `use` and you are done!

*Note that this does support routes with parameters, e.g. `/user/:id/comments`, but all the matched parameters will be discarded*

```js
// Single path
fastifyMiddleware.use('/public', staticFiles('/assets'));
```

## License

Licensed under [MIT](./LICENSE).
