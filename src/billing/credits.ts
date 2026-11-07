/** Server-only credits: no local balance, free grant, decrement or purchase simulation. */
export type CreditBalance = { available: true; remaining: number; verifiedAt: string } | { available: false; reason: string };
export interface CreditBalanceProvider { readBalance(): Promise<CreditBalance> }
export const analysisCredits: CreditBalanceProvider = {
  async readBalance() { return { available: false, reason: 'Analysis credits are unavailable until an authenticated credit service is connected.' }; },
};
// The future authenticated endpoint must verify its caller, read the server ledger and
// atomically reserve/debit credits alongside each analysis. UI values never authorize work.
