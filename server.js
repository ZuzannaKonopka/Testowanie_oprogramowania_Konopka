const { createApp } = require('./app');
const port = Number(process.env.PORT) || 3000;
const { server } = createApp();
server.listen(port, '127.0.0.1', () => console.log(`Shopping List działa: http://127.0.0.1:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
