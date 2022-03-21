import { AddressInfo } from 'net';
import { FastifyMiddleware } from '../src/engine';
import http from 'http';
import { join } from 'path';
import serveStatic from 'serve-static';

function createSimpleRequest(url: string): http.IncomingMessage {
  const req = new http.IncomingMessage(null);
  req.url = url;
  return req;
}

describe('engine', () => {
  it('use no function', (done) => {
    expect.assertions(3);

    const instance = FastifyMiddleware(function (err, a, b) {
      expect(err).toBeFalsy();
      expect(a).toBe(req);
      expect(b).toBe(res);
      done();
    });

    const req = createSimpleRequest('/test');
    const res = new http.ServerResponse(req);

    instance.run(req, res);
  });

  it('use a function', (done) => {
    expect.assertions(5);

    const instance = FastifyMiddleware(function (err, a, b) {
      expect(err).toBeFalsy();
      expect(a).toBe(req);
      expect(b).toBe(res);
      done();
    });
    const req = createSimpleRequest('/test');
    const res = new http.ServerResponse(req);

    expect(
      instance.use('/', function (req, res, next) {
        // function called
        expect(true).toBeTruthy();
        next();
      })
    ).toBe(instance);

    instance.run(req, res);
  });

  it('use two functions', (done) => {
    expect.assertions(5);

    const instance = FastifyMiddleware(function (err, a, b) {
      expect(err).toBeFalsy();
      expect(a).toBe(req);
      expect(b).toBe(res);
      done();
    });
    const req = createSimpleRequest('/test');
    const res = new http.ServerResponse(req);
    let counter = 0;

    instance
      .use('/', function (req, res, next) {
        expect(counter++).toBe(0);
        next();
      })
      .use('/', function (req, res, next) {
        expect(counter++).toBe(1);
        next();
      });

    instance.run(req, res);
  });

  it('stop the middleware chain if one errors', (done) => {
    expect.assertions(1);

    const instance = FastifyMiddleware(function (err, a, b) {
      expect(err).toBeTruthy();
      done();
    });
    const req = createSimpleRequest('/test');
    const res = new http.ServerResponse(req);

    instance
      .use('/', function (req, res, next) {
        next(new Error('kaboom'));
      })
      .use('/', function (req, res, next) {
        // this should never be called
        expect(true).toBeFalsy();
        next();
      });

    instance.run(req, res);
  });

  it('run restricted by path', (done) => {
    expect.assertions(11);

    const instance = FastifyMiddleware(function (err, a, b) {
      expect(err).toBeFalsy();
      expect(a).toBe(req);
      expect('/test').toBe(req.url);
      expect(b).toBe(res);
      done();
    });
    const req = createSimpleRequest('/test');
    const res = new http.ServerResponse(req);

    expect(
      instance.use('/', function (req, res, next) {
        expect('function called').toBeTruthy();
        next();
      })
    ).toBe(instance);

    expect(
      instance.use('/test', function (req, res, next) {
        expect('function called').toBeTruthy();
        next();
      })
    ).toBe(instance);

    expect(
      instance.use('/test', function (req, res, next) {
        expect('/').toBe(req.url);
        next();
      })
    ).toBe(instance);

    expect(
      instance.use('/no-call', function (req, res, next) {
        // this should never be called
        expect(true).toBeFalsy();
        next();
      })
    ).toBe(instance);

    instance.run(req, res);
  });

  it('run restricted by path - prefix override', (done) => {
    expect.assertions(10);

    const instance = FastifyMiddleware(function (err, a, b) {
      expect(err).toBeFalsy();
      expect(a).toBe(req);
      expect('/test/other/one').toBe(req.url);
      expect(b).toBe(res);
      done();
    });
    const req = createSimpleRequest('/test/other/one');
    const res = new http.ServerResponse(req);

    expect(
      instance.use('/', function (req, res, next) {
        expect('function called').toBeTruthy();
        next();
      })
    ).toBe(instance);

    expect(
      instance.use('/test', function (req, res, next) {
        expect('function called').toBeTruthy();
        next();
      })
    ).toBe(instance);

    expect(
      instance.use('/test', function (req, res, next) {
        expect('/other/one').toBe(req.url);
        next();
      })
    ).toBe(instance);

    instance.run(req, res);
  });

  it('run restricted by path - prefix override 2', (done) => {
    expect.assertions(10);

    const instance = FastifyMiddleware(function (err, a, b) {
      expect(err).toBeFalsy();
      expect(a).toBe(req);
      expect('/tasks-api/task').toBe(req.url);
      expect(b).toBe(res);
      done();
    });
    const req = createSimpleRequest('/tasks-api/task');
    const res = new http.ServerResponse(req);

    expect(
      instance.use('/', function (req, res, next) {
        expect('function called').toBeTruthy();
        next();
      })
    ).toBe(instance);

    expect(
      instance.use('/tasks-api', function (req, res, next) {
        expect('function called').toBeTruthy();
        next();
      })
    ).toBe(instance);

    expect(
      instance.use('/tasks-api', function (req, res, next) {
        expect('/task').toBe(req.url);
        next();
      })
    ).toBe(instance);

    instance.run(req, res);
  });

  it('Should strip the url to only match the pathname', (done) => {
    expect.assertions(6);

    const instance = FastifyMiddleware(function (err, a, b) {
      expect(err).toBeFalsy();
      expect(a).toBe(req);
      expect(req.url).toBe('/test#foo?bin=baz');
      expect(b).toBe(res);
      done();
    });
    const req = createSimpleRequest('/test#foo?bin=baz');
    const res = new http.ServerResponse(req);

    expect(
      instance.use('/test', function (req, res, next) {
        // function called
        expect(true).toBeTruthy();
        next();
      })
    ).toBe(instance);

    instance.run(req, res);
  });

  it('should keep the context', (done) => {
    expect.assertions(6);

    const instance = FastifyMiddleware(function (err, a, b, ctx) {
      expect(err).toBeFalsy();
      expect(a).toBe(req);
      expect(b).toBe(res);
      expect(ctx.key).toBeTruthy();
      done();
    });
    const req = createSimpleRequest('/test');
    const res = new http.ServerResponse(req);

    expect(
      instance.use('/', function (req, res, next) {
        // function called
        expect(true).toBeTruthy();
        next();
      })
    ).toBe(instance);

    instance.run(req, res, { key: true });
  });

  it('should add `originalUrl` property to req', (done) => {
    expect.assertions(2);

    const instance = FastifyMiddleware(function (err) {
      expect(err).toBeFalsy();
      done();
    });
    const req = createSimpleRequest('/test');
    const res = new http.ServerResponse(req);

    instance.use('/', function (req, res, next) {
      expect(req.originalUrl).toBe('/test');
      next();
    });

    instance.run(req, res);
  });

  it('basic serve static', (done) => {
    const instance = FastifyMiddleware(function () {
      // the default route should never be called
      expect(true).toBeFalsy();
    });
    instance.use('/', serveStatic(join(__dirname, '..')));
    const server: http.Server = http.createServer(instance.run.bind(instance));

    server.listen(0, function () {
      http.get(`http://localhost:${(server.address() as AddressInfo).port}/README.md`, function (res) {
        expect(res.statusCode).toBe(200);
        res.resume();
        server.close();
        server.unref();
        done();
      });
    });
  });

  it('limit serve static to a specific folder', (done) => {
    const instance = FastifyMiddleware(function () {
      // the default route should never be called
      expect(true).toBeFalsy();
      req.destroy();
      server.close();
      server.unref();
    });
    instance.use('/assets', serveStatic(join(__dirname, '..')));
    const server = http.createServer(instance.run.bind(instance));
    let req;

    server.listen(0, function () {
      req = http.get(`http://localhost:${(server.address() as AddressInfo).port}/assets/README.md`, function (res) {
        expect(res.statusCode).toBe(200);
        res.resume();
        server.close();
        server.unref();
        done();
      });
    });
  });

  it('should match all chains', (done) => {
    expect.assertions(2);
    const instance = FastifyMiddleware(function (err, req, _res) {
      expect(err).toBeFalsy();
      expect(req).toMatchObject({
        url: '/inner/in/depth',
        originalUrl: '/inner/in/depth',
        undefined: true,
        null: true,
        empty: true,
        root: true,
        inner: true,
        innerSlashed: true,
        innerIn: true,
        innerInSlashed: true,
        innerInDepth: true,
        innerInDepthSlashed: true,
      });
      done();
    });
    const req = createSimpleRequest('/inner/in/depth');
    const res = new http.ServerResponse(req);

    const prefixes = [
      { prefix: undefined, name: 'undefined' },
      { prefix: null, name: 'null' },
      { prefix: '', name: 'empty' },
      { prefix: '/', name: 'root' },
      { prefix: '/inner', name: 'inner' },
      { prefix: '/inner/', name: 'innerSlashed' },
      { prefix: '/inner/in', name: 'innerIn' },
      { prefix: '/inner/in/', name: 'innerInSlashed' },
      { prefix: '/inner/in/depth', name: 'innerInDepth' },
      { prefix: '/inner/in/depth/', name: 'innerInDepthSlashed' },
    ];
    prefixes.forEach(function (o) {
      instance.use(o.prefix, function (req, res, next) {
        if (req[o.name]) throw new Error('Called twice!');
        req[o.name] = true;
        next();
      });
    });

    instance.run(req, res);
  });

  it('should match the same slashed path', (done) => {
    expect.assertions(3);
    const instance = FastifyMiddleware(function (err, req, res) {
      expect(err).toBeFalsy();
      expect(req).toMatchObject({
        url: '/path',
        originalUrl: '/path',
      });
      done();
    });
    const req = createSimpleRequest('/path');
    const res = new http.ServerResponse(req);

    instance.use('/path/', function (req, res, next) {
      // function called
      expect(true).toBeTruthy();
      next();
    });

    instance.use('/path/inner', function (req, res, next) {
      // should not reach here
      expect(true).toBeFalsy();
      next();
    });

    instance.run(req, res);
  });

  it('if the function calls res.end the iterator should stop / 1', (done) => {
    expect.assertions(1);

    const instance = FastifyMiddleware(function () {
      // should not reach here
      expect(true).toBeFalsy();
    });
    const req = createSimpleRequest('/test');
    const res = new http.ServerResponse(req);
    res.finished = false;
    res.end = function (): http.ServerResponse {
      // res.end
      expect(true).toBeTruthy();
      this.finished = true;
      done();
      return this;
    };

    instance
      .use('/', function (req, res, next) {
        res.end('hello');
        next();
      })
      .use('/', function (req, res, next) {
        // should not reach here
        expect(true).toBeFalsy();
      });

    instance.run(req, res);
  });

  it('if the function calls res.end the iterator should stop / 2', () => {
    expect.assertions(0);

    const instance = FastifyMiddleware(function () {
      // should not reach here
      expect(true).toBeFalsy();
    });
    const req = createSimpleRequest('/test');
    const res = new http.ServerResponse(req);
    instance
      .use('/', function (req, res, next) {
        res.end('bye');
        next();
      })
      .use('/', function (req, res, next) {
        // should not reach here
        expect(true).toBeFalsy();
      });

    instance.run(req, res);
  });
});
