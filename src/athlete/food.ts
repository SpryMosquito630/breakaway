export type Food = {
  name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
};
export function parseFood(raw: any): Food | null {
  if (
    raw?.status !== 1 ||
    typeof raw.product?.product_name !== "string" ||
    !raw.product.product_name.trim()
  )
    return null;
  const n = raw.product.nutriments ?? {};
  const value = (key: string) =>
    typeof n[key] === "number" &&
    Number.isFinite(n[key]) &&
    n[key] >= 0 &&
    n[key] <= 10000
      ? n[key]
      : undefined;
  return {
    name: raw.product.product_name.slice(0, 120),
    calories: value("energy-kcal_100g"),
    protein: value("proteins_100g"),
    carbs: value("carbohydrates_100g"),
    fat: value("fat_100g"),
  };
}
export const validBarcode = (value: unknown): value is string =>
  typeof value === "string" && /^\d{8,14}$/.test(value);
export async function lookupFood(barcode: string, signal?: AbortSignal) {
  if (!validBarcode(barcode))
    throw new Error("Enter the 8–14 digits printed beneath the barcode.");
  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,nutriments`,
    {
      signal,
      headers: { "X-User-Agent": "Breakaway/1.0 (personal-training-app)" },
    },
  );
  if (!response.ok)
    throw new Error("Food lookup is unavailable. Enter the label manually.");
  const food = parseFood(await response.json());
  if (!food) throw new Error("Product not found. Enter the label manually.");
  return food;
}
