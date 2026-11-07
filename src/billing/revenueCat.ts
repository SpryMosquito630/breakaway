import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { hasVerifiedEntitlement, purchaseError, readStoreConfig, storePrice, type StoreConfig } from './policy';
export type MembershipProduct = { id: string; title: string; description: string; price: string };
export type MembershipSnapshot = { available: boolean; active: boolean; message: string; products: MembershipProduct[]; config: StoreConfig | null };
const gate = () => readStoreConfig({ platform: Platform.OS, executionEnvironment: Constants.executionEnvironment,
  iosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY, androidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  entitlement: process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT, termsUrl: process.env.EXPO_PUBLIC_MEMBERSHIP_TERMS_URL,
  privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL });
let sdkPromise: Promise<typeof import('react-native-purchases')> | undefined;
let packages = new Map<string, PurchasesPackage>();
let transactionBusy = false;
async function sdk() {
  const checked = gate();
  if (!checked.config) throw Error(checked.message);
  // Never evaluate the native SDK in Expo Go/web. Its mock preview mode is intentionally unused.
  if (!sdkPromise) sdkPromise = import('react-native-purchases').then(module => {
    module.default.configure({ apiKey: checked.config!.apiKey, entitlementVerificationMode: module.default.ENTITLEMENT_VERIFICATION_MODE.INFORMATIONAL });
    return module;
  }).catch(error => { sdkPromise = undefined; throw error; });
  return sdkPromise;
}
function verified(info: CustomerInfo): boolean { const config = gate().config; return !!config && hasVerifiedEntitlement(info, config.entitlement); }
export async function readMembership(): Promise<MembershipSnapshot> {
  const checked = gate();
  if (!checked.config) return { available: false, active: false, products: [], ...checked };
  try {
    const { default: purchases } = await sdk();
    const info = await purchases.getCustomerInfo();
    let current: PurchasesPackage[] = [];
    let offeringMessage = '';
    try { current = (await purchases.getOfferings()).current?.availablePackages ?? []; }
    catch { offeringMessage = 'Store products could not be loaded. Refresh to try again. Existing membership status is shown above.'; }
    packages = new Map(current.map(item => [item.identifier, item]));
    const products = current.flatMap(item => {
      const price = storePrice(item.product.priceString, item.product.subscriptionPeriod);
      // This screen only sells recurring memberships, never consumable analysis credits.
      return price && item.product.subscriptionPeriod ? [{ id: item.identifier, title: item.product.title, description: item.product.description, price }] : [];
    });
    return { available: true, active: verified(info), products, config: checked.config, message: offeringMessage || (products.length ? '' : 'No membership products are available from the store right now.') };
  } catch (error) {
    packages.clear();
    return { available: false, active: false, products: [], config: checked.config, message: purchaseError(error).message };
  }
}
export async function purchaseMembership(packageId: string) {
  if (transactionBusy) return { active: false, message: 'A store request is already in progress.' };
  transactionBusy = true;
  try {
    const { default: purchases } = await sdk();
    const selected = packages.get(packageId);
    if (!selected || !selected.product.subscriptionPeriod) return { active: false, message: 'Refresh membership to load the current store products.' };
    const result = await purchases.purchasePackage(selected);
    const active = verified(result.customerInfo);
    return { active, message: active ? 'Your store-confirmed membership is active.' : 'The store has not confirmed an active membership. Refresh or restore to check again.' };
  } catch (error) { return { active: false, ...purchaseError(error) }; }
  finally { transactionBusy = false; }
}
export async function restoreMembership() {
  if (transactionBusy) return { active: false, message: 'A store request is already in progress.' };
  transactionBusy = true;
  try {
    const { default: purchases } = await sdk();
    const active = verified(await purchases.restorePurchases());
    return { active, message: active ? 'Your membership was restored.' : 'No verified active membership was found for this store account.' };
  } catch (error) { return { active: false, ...purchaseError(error) }; }
  finally { transactionBusy = false; }
}
export async function watchMembership(listener: () => void): Promise<() => void> {
  if (!gate().config) return () => {};
  try {
    const { default: purchases } = await sdk();
    const onInfo = () => listener();
    purchases.addCustomerInfoUpdateListener(onInfo);
    return () => purchases.removeCustomerInfoUpdateListener(onInfo);
  } catch { return () => {}; }
}
export async function submitCreatorAttribution(code: string): Promise<string> {
  const { normalizeCreatorCode } = await import('./policy');
  const normalized = normalizeCreatorCode(code);
  if (!normalized) return 'Use 3–24 letters, numbers, underscores or hyphens.';
  try {
    const { default: purchases } = await sdk();
    await purchases.setAttributes({ creator_code: normalized });
    return 'Creator attribution submitted. This does not validate a campaign, apply a discount, or change membership.';
  } catch { return 'Creator attribution is unavailable. No code was applied.'; }
}
