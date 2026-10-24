import 'server-only';

export type LogLevel = 'info' | 'warn' | 'error';

export interface StructuredLogPayload {
  level: LogLevel;
  event: string;
  route?: string;
  engine?: string;
  country?: string;
  durationMs?: number;
  status?: number;
  meta?: Record<string, unknown>;
  timestamp: string;
}

export function logServerEvent(
  level: LogLevel,
  event: string,
  details: Omit<StructuredLogPayload, 'level' | 'event' | 'timestamp'> = {},
): StructuredLogPayload {
  const entry: StructuredLogPayload = {
    level,
    event,
    ...details,
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV !== 'test') {
    const serialized = JSON.stringify(entry);
    if (level === 'error') {
      console.error(serialized);
    } else if (level === 'warn') {
      console.warn(serialized);
    } else {
      console.info(serialized);
    }
  }

  return entry;
}
