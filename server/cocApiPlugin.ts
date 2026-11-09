import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { createCocApi } from './cocApi.ts';

type CocApiPluginOptions = {
  token?: string;
};

function writeJson(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.end(JSON.stringify(body));
}

export default function cocApiPlugin(options: CocApiPluginOptions = {}): Plugin {
  const api = createCocApi({ token: options.token });

  const middleware = (request: IncomingMessage, response: ServerResponse): void => {
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      writeJson(response, 405, {
        error: {
          code: 'method_not_allowed',
          message: 'Hanya permintaan GET yang didukung.',
        },
      });
      return;
    }

    void api
      .handle(request.url ?? '/')
      .then((result) => writeJson(response, result.status, result.body))
      .catch(() =>
        writeJson(response, 500, {
          error: {
            code: 'internal_error',
            message: 'Proxy API lokal mengalami kesalahan.',
          },
        }),
      );
  };

  return {
    name: 'clash-monitoring:coc-api',
    configureServer(server) {
      server.middlewares.use('/api/coc', middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/coc', middleware);
    },
  };
}
