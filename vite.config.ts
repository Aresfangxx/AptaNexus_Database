import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        {
          name: 'serve-aptamers-jsonl',
          configureServer(server) {
            server.middlewares.use('/APTAMERS.jsonl', (req, res, next) => {
              const filePath = path.resolve(__dirname, 'public/APTAMERS.jsonl');
              if (fs.existsSync(filePath)) {
                res.setHeader('Content-Type', 'application/json');
                fs.createReadStream(filePath).pipe(res);
              } else {
                next();
              }
            });
          }
        },
        {
          name: 'serve-secstr',
          configureServer(server) {
            server.middlewares.use('/SecStr', (req, res, next) => {
              const reqPath = req.url?.replace(/^\/SecStr\/?/, '') || '';
              const filePath = path.resolve(__dirname, 'public/SecStr', reqPath);
              if (!fs.existsSync(filePath)) return next();
              const ext = path.extname(filePath).toLowerCase();
              const mime =
                ext === '.svg' ? 'image/svg+xml' :
                ext === '.png' ? 'image/png' :
                ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                'application/octet-stream';
              res.setHeader('Content-Type', mime);
              fs.createReadStream(filePath).pipe(res);
            });
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
