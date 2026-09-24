import { logs } from '@opentelemetry/api-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';

let logger = null;
let configured = false;

export function configurePostHogLogs({ posthogKey, posthogHost }) {
  if (configured) return logger;
  configured = true;

  // optional: no key, no server logs, and never an error that stops the server
  if (!posthogKey || !posthogHost) return null;

  const provider = new LoggerProvider({
    resource: resourceFromAttributes({
      'service.name': 'tarot-pepe-api',
      'deployment.environment': process.env.NODE_ENV ?? 'development',
    }),
    processors: [
      new BatchLogRecordProcessor(new OTLPLogExporter({
        url: `${posthogHost.replace(/\/$/, '')}/i/v1/logs`,
        headers: { Authorization: `Bearer ${posthogKey}` },
      })),
    ],
  });
  logs.setGlobalLoggerProvider(provider);
  logger = logs.getLogger('tarot-pepe-posthog-export');
  return logger;
}

export function posthogLog(record) {
  logger?.emit(record);
}
