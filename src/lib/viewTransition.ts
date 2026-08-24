type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => unknown;
};

export function navigateWithTransition(update: () => void | Promise<void>) {
  const startViewTransition = (document as ViewTransitionDocument).startViewTransition;
  if (typeof startViewTransition === 'function') {
    return startViewTransition(update);
  }
  return update();
}
