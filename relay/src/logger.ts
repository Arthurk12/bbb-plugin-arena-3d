import { Logger } from './types';

/**
 * One JSON object per line on stdout: the relay runs under a process supervisor, which keeps
 * and greps these lines, so nothing else is written there.
 */
export const createLogger = (
  write: (line: string) => void = (line) => process.stdout.write(`${line}\n`),
): Logger => {
  const log = (level: string) => (message: string, extra: Record<string, unknown> = {}) => {
    write(JSON.stringify({ t: new Date().toISOString(), level, msg: message, ...extra }));
  };
  return {
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
  };
};
