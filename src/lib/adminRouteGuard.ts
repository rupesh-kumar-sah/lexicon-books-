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

export type AdminClientEligibility = {
  windows: boolean;
  chrome: boolean;
  manufacturerHintPresent: boolean;
  eligible: boolean;
};

/**
 * Desktop Chromium does not provide a trustworthy Dell manufacturer identifier in
 * standard User-Agent Client Hints. Route access therefore uses only verifiable
 * Windows + Chrome signals. The real device/user proof remains the platform
 * WebAuthn credential, verified server-side at sign-in.
 */
export function assessAdminClient({ userAgent, platform = '', model = '' }: AdminClientSignals): AdminClientEligibility {
  const ua = userAgent.toLowerCase();
  const windows = /windows nt|win32/.test(ua) || /windows/.test(platform.toLowerCase());
  const chrome = /(?:chrome|crios)\//.test(ua) && !/(?:edg|edge|opr|opera|firefox|fxios)\//.test(ua);
  const manufacturerHintPresent = /\bdell(?:\s+inc\.?)?\b/.test(`${ua} ${model}`.toLowerCase());
  return {
    windows,
    chrome,
    manufacturerHintPresent,
    eligible: windows && chrome,
  };
}

export function isWindowsChromeClient(signals: AdminClientSignals): boolean {
  return assessAdminClient(signals).eligible;
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
      // Low-entropy hints and the standard User-Agent remain the conservative fallback.
    }
  }
  return isWindowsChromeClient({ userAgent: navigator.userAgent, platform, model });
}
