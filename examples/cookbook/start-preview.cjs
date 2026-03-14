const { createServer } = require('vite');
const path = require('path');

(async () => {
  const server = await createServer({
    root: __dirname,
    configFile: path.join(__dirname, 'vite.config.ts'),
    server: { port: 4210, open: false, host: 'localhost' },
  });
  await server.listen();
  server.printUrls();
})();
