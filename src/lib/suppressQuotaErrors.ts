// Suppress Firestore quota-exhausted errors from being reported to console or unhandled rejection
export function isQuotaError(...args: any[]): boolean {
  return args.some(arg => {
    if (!arg) return false;
    let str = '';
    if (typeof arg === 'string') {
      str = arg;
    } else if (typeof arg === 'object') {
      str = (arg.message || '') + ' ' + (arg.stack || '') + ' ' + (arg.code || '') + ' ' + (arg.name || '');
      try {
        str += ' ' + JSON.stringify(arg);
      } catch {}
    } else {
      str = String(arg);
    }
    return (
      str.includes('resource-exhausted') ||
      str.includes('Quota limit exceeded') ||
      str.includes('Quota exceeded') ||
      str.includes('Free daily write units') ||
      str.includes('Using maximum backoff delay') ||
      str.includes('maximum backoff delay')
    );
  });
}

if (typeof window !== 'undefined') {
  // Capture unhandled rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (isQuotaError(event.reason)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  // Capture global errors
  window.addEventListener('error', (event) => {
    if (isQuotaError(event.error, event.message)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  // Filter console.error
  const originalConsoleError = console.error;
  console.error = function (...args: any[]) {
    if (isQuotaError(...args)) {
      return; // Silently suppress
    }
    originalConsoleError.apply(console, args);
  };

  // Filter console.warn
  const originalConsoleWarn = console.warn;
  console.warn = function (...args: any[]) {
    if (isQuotaError(...args)) {
      return; // Silently suppress
    }
    originalConsoleWarn.apply(console, args);
  };
}
