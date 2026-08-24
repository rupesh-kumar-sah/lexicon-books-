type UserAgentDataLike = {
  platform?: string;
  model?: string;
  getHighEntropyValues?: (hints: string[]) => Promise<{ platform?: string; model?: string }>;
};

export type AdminClientSignals = {
  userAgent: string;
  platform?: string;
  model?: string;
};

export function isDellWindowsChromeClient({ userAgent, platform = '', model = '' }: AdminClientSignals): boolean {
  const ua = userAgent.toLowerCase();
  const fingerprint = `${ua} ${platform} ${model}`.toLowerCase();
  const isWindows = /windows nt|win32/.test(ua) || /windows/.test(platform.toLowerCase());
  const isChrome = /(?:chrome|crios)\//.test(ua) && !/(?:edg|edge|opr|opera|firefox|fxios)\//.test(ua);
  const isDell = /\bdell(?:\s+inc\.?)?\b/.test(fingerprint);
  return isWindows && isChrome && isDell;
}

export async function currentAdminClientIsEligible(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  const userAgentData = (navigator as Navigator & { userAgentData?: UserAgentDataLike }).userAgentData;
  let platform = userAgentData?.platform || '';
  let model = userAgentData?.model || '';
  if (userAgentData?.getHighEntropyValues) {
    try {
      const hints = await userAgentData.getHighEntropyValues(['platform', 'model']);
      platform = hints.platform || platform;
      model = hints.model || model;
    } catch {
      // Use low-entropy browser hints and the User-Agent as the conservative fallback.
    }
  }
  return isDellWindowsChromeClient({ userAgent: navigator.userAgent, platform, model });
}
