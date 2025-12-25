# IronTelemetry SDK for JavaScript/TypeScript

Error monitoring and crash reporting SDK for JavaScript and TypeScript applications. Capture exceptions, track user journeys, and get insights to fix issues faster.

[![npm](https://img.shields.io/npm/v/@ironservices/telemetry.svg)](https://www.npmjs.com/package/@ironservices/telemetry)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install @ironservices/telemetry
# or
yarn add @ironservices/telemetry
# or
pnpm add @ironservices/telemetry
```

## Quick Start

### Basic Exception Capture

```typescript
import IronTelemetry from '@ironservices/telemetry';

// Initialize with your DSN
IronTelemetry.init('https://pk_live_xxx@irontelemetry.com');

// Capture exceptions
try {
  doSomething();
} catch (error) {
  IronTelemetry.captureException(error);
  throw error;
}

// Or use the extension method
try {
  doSomething();
} catch (error) {
  throw error.capture();
}
```

### Journey Tracking

Track user journeys to understand the context of errors:

```typescript
import IronTelemetry from '@ironservices/telemetry';

// Track a complete user journey
{
  using journey = IronTelemetry.startJourney('Checkout Flow');

  IronTelemetry.setUser('user-123', 'user@example.com');

  {
    using step = IronTelemetry.startStep('Validate Cart', 'business');
    validateCart();
  }

  {
    using step = IronTelemetry.startStep('Process Payment', 'business');
    processPayment();
  }

  {
    using step = IronTelemetry.startStep('Send Confirmation', 'notification');
    sendConfirmationEmail();
  }
}
```

Any exceptions captured during the journey are automatically correlated.

## Configuration

```typescript
import IronTelemetry from '@ironservices/telemetry';

IronTelemetry.init({
  dsn: 'https://pk_live_xxx@irontelemetry.com',
  environment: 'production',
  appVersion: '1.2.3',
  sampleRate: 1.0,  // 100% of events
  debug: false,
  beforeSend: (event) => !event.message?.includes('expected error'),
});
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dsn` | string | required | Your Data Source Name |
| `environment` | string | 'production' | Environment name |
| `appVersion` | string | '0.0.0' | Application version |
| `sampleRate` | number | 1.0 | Sample rate (0.0 to 1.0) |
| `maxBreadcrumbs` | number | 100 | Max breadcrumbs to keep |
| `debug` | boolean | false | Enable debug logging |
| `beforeSend` | function | - | Hook to filter/modify events |
| `enableOfflineQueue` | boolean | true | Enable offline queue |
| `maxOfflineQueueSize` | number | 500 | Max offline queue size |

## Features

- **Automatic Exception Capture**: Capture and report exceptions with full stack traces
- **Journey Tracking**: Track user flows and correlate errors with context
- **Breadcrumbs**: Leave a trail of events leading up to an error
- **User Context**: Associate errors with specific users
- **Tags & Extras**: Add custom metadata to your events
- **Offline Queue**: Events are queued when offline and sent when connectivity returns
- **Sample Rate**: Control the volume of events sent
- **Before Send Hook**: Filter or modify events before sending

## Breadcrumbs

```typescript
// Add breadcrumbs to understand what happened before an error
IronTelemetry.addBreadcrumb('User clicked checkout button', 'ui');
IronTelemetry.addBreadcrumb('Payment API called', 'http');

// Or with full control
IronTelemetry.addBreadcrumb({
  category: 'auth',
  message: 'User logged in',
  level: 'info',
  data: { userId: '123' },
});
```

## Global Exception Handling

```typescript
import IronTelemetry, { useUnhandledExceptionHandler } from '@ironservices/telemetry';

IronTelemetry.init('your-dsn');
useUnhandledExceptionHandler();
```

This sets up handlers for:
- Browser: `window.onerror` and `unhandledrejection`
- Node.js: `uncaughtException` and `unhandledRejection`

## Helper Methods

```typescript
import { trackStep, trackStepAsync } from '@ironservices/telemetry';

// Track a step with automatic error handling
trackStep('Process Order', () => {
  processOrder();
});

// Async version
await trackStepAsync('Fetch Data', async () => {
  await fetchData();
});

// With return value
const result = trackStep('Calculate Total', () => {
  return calculateTotal();
});
```

## Flushing

```typescript
// Flush pending events before app shutdown
await IronTelemetry.flush();
```

## TypeScript Support

This package is written in TypeScript and includes full type definitions:

```typescript
import IronTelemetry, {
  TelemetryOptions,
  TelemetryEvent,
  Breadcrumb,
  SeverityLevel
} from '@ironservices/telemetry';
```

## Browser Support

Works in all modern browsers (Chrome, Firefox, Safari, Edge) and Node.js 16+.

## Links

- [Documentation](https://www.irontelemetry.com/docs)
- [Dashboard](https://www.irontelemetry.com)

## License

MIT License - see [LICENSE](LICENSE) for details.
