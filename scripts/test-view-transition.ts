const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

try {
  let receivedThis: unknown;
  let callbackRan = false;
  const fakeDocument = {
    startViewTransition(this: unknown, callback: () => void) {
      receivedThis = this;
      callback();
      return { finished: Promise.resolve() };
    },
  };

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: fakeDocument,
  });

  const { navigateWithTransition } = await import('../src/lib/viewTransition');
  navigateWithTransition(() => {
    callbackRan = true;
  });

  assert(callbackRan, 'The view-transition callback did not run.');
  assert(receivedThis === fakeDocument, 'The native view-transition method lost its document receiver.');
  console.log('VIEW TRANSITION RECEIVER TEST PASSED');
} finally {
  if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
  else delete (globalThis as { document?: unknown }).document;
}
