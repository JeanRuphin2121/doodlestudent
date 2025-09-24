import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

/** ----------------- OpenTelemetry (front) ----------------- */
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';

(() => {
  const provider = new WebTracerProvider();

  const exporter = new OTLPTraceExporter({
    // Collector exposé par docker-compose (port mappé host)
    url: 'http://localhost:4319/v1/traces',
  });

  // Certaines versions de typings ne déclarent pas addSpanProcessor sur WebTracerProvider,
  // alors qu'il existe bien à l'exécution. Petit cast pour lever l'erreur TS.
  (provider as any).addSpanProcessor(new BatchSpanProcessor(exporter));

  provider.register({
    contextManager: new ZoneContextManager(), // indispensable avec Angular (zone.js)
    // propagator par défaut: W3C (OK)
  });

  registerInstrumentations({
    instrumentations: [
      new DocumentLoadInstrumentation(),
      new XMLHttpRequestInstrumentation({
        // propage traceparent vers tes appels HttpClient XHR
        propagateTraceHeaderCorsUrls: [/.*/],
      }),
      new FetchInstrumentation({
        // propage traceparent si tu utilises fetch()
        propagateTraceHeaderCorsUrls: [/.*/],
      }),
    ],
  });
})();
/** --------------------------------------------------------- */

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch(err => console.error(err));
