import { pathToRegexp } from './path-to-regexp';
import { Context, Handler, NextFunction, ServerRequest } from './index';
import http from 'http';

interface Middleware {
  use: (urlParam: string | Handler, fParam?: Handler) => Middleware;
  run: (req: ServerRequest, res: http.ServerResponse, ctx?: NextFunction | Context) => void;
}

export function FastifyMiddleware(complete: any): Middleware {
  const middlewares: { regexp: RegExp; fn: Handler }[] = [];

  return {
    use,
    run,
  };

  function use(urlParam: string | Handler, fParam?: Handler): Middleware {
    let url: string | null;
    let fn: Handler;
    if (fParam === undefined) {
      url = null;
      fn = urlParam as Handler;
    } else {
      url = urlParam as string;
      fn = fParam;
    }

    const regexp = pathToRegexp(sanitizePrefixUrl(url), [], { end: false, strict: false });

    middlewares.push({
      regexp,
      fn,
    });

    return this;
  }

  function run(req: ServerRequest, res: http.ServerResponse, ctx?: NextFunction | Context): void {
    if (!middlewares.length) {
      complete(null, req, res, ctx);
      return;
    }

    req.originalUrl = req.url;
    const holder = new Holder(req, res, sanitizeUrl(req.url as string), ctx);
    holder.done();
  }

  function Holder(req: ServerRequest, res: http.ServerResponse, url: string, ctx?: NextFunction | Context): void {
    this.req = req;
    this.res = res;
    this.url = url;
    this.ctx = ctx;
    this.i = 0;

    const that = this;
    this.done = function (err) {
      const { req, res, url, ctx } = that;
      const i = that.i++;

      req.url = req.originalUrl;

      if (res.finished === true || res.writableEnded === true) {
        return;
      }

      if (err || middlewares.length === i) {
        complete(err, req, res, ctx);
      } else {
        const middleware = middlewares[i];
        const fn = middleware.fn;
        const regexp = middleware.regexp;
        if (regexp) {
          const result = regexp.exec(url);
          if (result) {
            req.url = req.url.replace(result[0], '');
            if (req.url.startsWith('/') === false) {
              req.url = '/' + req.url;
            }
            fn(req, res, that.done);
          } else {
            that.done();
          }
        }
      }
    };
  }
}

function sanitizeUrl(url: string): string {
  for (let i = 0, len = url.length; i < len; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 63 || charCode === 35) {
      return url.slice(0, i);
    }
  }
  return url;
}

function sanitizePrefixUrl(url?: string | null) {
  if (url === null || url === undefined || url === '' || url === '/') {
    return '';
  }
  if (url[url.length - 1] === '/') {
    return url.slice(0, -1);
  }
  return url;
}
