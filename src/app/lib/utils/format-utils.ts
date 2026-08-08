// Robust VN number formatter — does NOT depend on browser locale
export function formatVNRobust(num: number, decimals: number = 0): string {
  if (isNaN(num)) return "0";

  // Using Intl.NumberFormat with 'vi-VN' locale ensures:
  // - Thousands separator is '.'
  // - Decimal separator is ','
  // - Handles negative numbers correctly
  // - minimumFractionDigits: 0 prevents trailing zero decimals (.00) on integers
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(num);
}