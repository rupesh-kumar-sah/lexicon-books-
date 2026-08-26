type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => unknown;
};

export function navigateWithTransition(update: () => void | Promise<void>) {
  const transitionDocument = document as ViewTransitionDocument;
  // `startViewTransition` is a native Document method. Calling an extracted
  // function loses its `this` receiver and throws "Illegal invocation" in Chromium.
  if (typeof transitionDocument.startViewTransition === 'function') {
    return transitionDocument.startViewTransition(update);
  }
  return update();
}
