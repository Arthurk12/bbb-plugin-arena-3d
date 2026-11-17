import { RELAY_DEFAULTS } from './constants';
import { createLogger } from './logger';
import { createRelayServer } from './server';

/** Unset, empty or out-of-range values fall back to the default, so a typo cannot pick a port. */
const readPort = (raw: string | undefined): number => {
  if (raw === undefined || raw.trim() === '') {
    return RELAY_DEFAULTS.port;
  }
  const port = Number(raw);
  return Number.isInteger(port) && port >= 0 && port <= 65535 ? port : RELAY_DEFAULTS.port;
};

const logger = createLogger();
const host = process.env.RELAY_HOST || RELAY_DEFAULTS.host;
const server = createRelayServer({
  host,
  port: readPort(process.env.RELAY_PORT),
  logger,
});

const shutdown = async () => {
  logger.info('shutting down');
  await server.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

server.listen().then((port) => {
  logger.info('relay listening', { host, port });
}).catch((error) => {
  logger.error('relay failed to start', { error: String(error) });
  process.exit(1);
});
