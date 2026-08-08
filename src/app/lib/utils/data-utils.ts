export function parseMoneyToNumber(val: any): number {
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  if (typeof val === "bigint") return Number(val);
  if (val === null || val === undefined || val === "") return 0;

  const source = String(val).trim();
  if (!source) return 0;

  // Preserve scientific notation when Excel/browser already supplied it.
  if (/^[+-]?\d+(?:\.\d+)?[eE][+-]?\d+$/.test(source)) {
    const scientificValue = Number(source);
    return Number.isFinite(scientificValue) ? scientificValue : 0;
  }

  const isNegativeByParentheses = /^\(.*\)$/.test(source);
  let numericText = source
    .replace(/[\s\u00a0]/g, "")
    .replace(/[^\d.,+-]/g, "");

  const isNegative = isNegativeByParentheses || numericText.includes("-");
  numericText = numericText.replace(/[+-]/g, "");
  if (!numericText || !/\d/.test(numericText)) return 0;

  const dotCount = (numericText.match(/\./g) || []).length;
  const commaCount = (numericText.match(/,/g) || []).length;

  if (dotCount > 0 && commaCount > 0) {
    // When both separators exist, the last one is the decimal separator and
    // every earlier separator is a thousands separator.
    const decimalIndex = Math.max(
      numericText.lastIndexOf("."),
      numericText.lastIndexOf(","),
    );
    const integerPart = numericText.slice(0, decimalIndex).replace(/[.,]/g, "");
    const decimalPart = numericText.slice(decimalIndex + 1).replace(/[.,]/g, "");
    numericText = decimalPart
      ? `${integerPart}.${decimalPart}`
      : integerPart;
  } else if (dotCount > 0 || commaCount > 0) {
    const separator = dotCount > 0 ? "." : ",";
    const parts = numericText.split(separator);
    const lastPart = parts[parts.length - 1];
    const separatorIsDecimal =
      lastPart.length > 0 &&
      (lastPart.length <= 2 ||
        (parts.length === 2 &&
          lastPart.length === 3 &&
          parts[0].length > 3));

    numericText = separatorIsDecimal
      ? `${parts.slice(0, -1).join("")}.${lastPart}`
      : parts.join("");
  }

  const parsedValue = Number(numericText);
  if (!Number.isFinite(parsedValue)) return 0;
  return isNegative ? -Math.abs(parsedValue) : parsedValue;
}
export function formatNumber(
  val: any,
  type: "string" | "number" | "money" | "date" = "number",
): string {
  if (val === null || val === undefined || val === "") return "";
  if (type === "string") return String(val);
  if (type === "date") {
    const dateValue = val instanceof Date ? val : parseAnyDate(String(val));
    if (!dateValue || isNaN(dateValue.getTime())) return String(val);
    return dateValue.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const numericValue = parseMoneyToNumber(val);
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: type === "money" ? 0 : 2,
  }).format(numericValue);
}
export function formatMoneyVND(val: any): string {
  const n = parseMoneyToNumber(val);
  return n.toLocaleString("vi-VN");
}
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}

function normalizeColumnRuleKey(columnKey: string): string {
  return removeVietnameseTones(String(columnKey || ""))
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isNonSummableTextColumn(columnKey: string): boolean {
  const normalized = normalizeColumnRuleKey(columnKey);
  return (
    normalized.includes("THANG BAO CAO") ||
    normalized.includes("THANG PHAT SINH") ||
    normalized.includes("REPORTING MONTH") ||
    normalized.includes("ARISING MONTH") ||
    normalized.includes("SALARY SCALE")
  );
}

export function isChargeAmountColumn(columnKey: string): boolean {
  const normalized = normalizeColumnRuleKey(columnKey);
  const compact = normalized.replace(/\s+/g, "");

  if (
    normalized.includes("CHARGE TYPE") ||
    normalized.includes("CHARGE TO CENTER") ||
    normalized.includes("CHARGE CENTER") ||
    normalized.includes("CHARGE CODE")
  ) {
    return false;
  }

  return (
    normalized.includes("CHARGE") ||
    /^(LDEC|LDEM|LPAR|LRET|MOTH)\d*/.test(compact) ||
    normalized.includes("EXTRA SUMMER INSTRUCTORS")
  );
}
export function formatIdNumber(id: any): string {
  return String(id || '').trim();
}
export function prepareDataForExport(data: any[]): any[] {
  return data;
}
export function parseAnyDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}
export function getVal(row: any, key: string): any {
  return row ? row[key] : null;
}
export function parseTimeStrToHours(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = String(timeStr).split(':').map(Number);
  return (h || 0) + (m || 0) / 60;
}
export async function getExcelFileBuffer(
  file: File,
): Promise<{ buffer: ArrayBuffer; name: string }> {
  if (!file) {
    throw new Error("Không tìm thấy thông tin file để đọc.");
  }

  return {
    buffer: await file.arrayBuffer(),
    name: file.name,
  };
}
export function formatTime12Hour(timeStr: string): string {
  return String(timeStr);
}
export const COMMON_FIELD_ALIASES: Record<string, string[]> = {
  No: ["STT", "NO", "NUMBER", "SỐ THỨ TỰ"],
  "ID Number": [
    "ID",
    "MÃ NV",
    "CMND",
    "CCCD",
    "MÃ NHÂN VIÊN",
    "EMPLOYEE ID",
    "MÃ SỐ",
    "ID NUMBER",
  ],
  "Full Name": [
    "NAME",
    "TÊN",
    "HỌ VÀ TÊN",
    "TÊN NHÂN VIÊN",
    "FULL NAME",
    "TEACHER",
    "GIÁO VIÊN",
  ],
  "Full name": [
    "NAME",
    "TÊN",
    "HỌ VÀ TÊN",
    "TÊN NHÂN VIÊN",
    "FULL NAME",
  ],
  "Salary Scale": [
    "SCALE",
    "MỨC LƯƠNG",
    "RANK",
    "BẬC LƯƠNG",
    "SALARY RANK",
  ],
  From: [
    "FROM",
    "TỪ",
    "TỪ NGÀY",
    "START DATE",
    "NGÀY BẮT ĐẦU",
    "START",
    "DATE FROM",
    "FROM DATE",
  ],
  To: [
    "TO",
    "ĐẾN",
    "ĐẾN NGÀY",
    "END DATE",
    "NGÀY KẾT THÚC",
    "END",
    "DATE TO",
    "TO DATE",
  ],
  "Bank Account Number": [
    "ACCOUNT",
    "TÀI KHOẢN",
    "STK",
    "SỐ TÀI KHOẢN",
    "BANK ACCOUNT",
  ],
  "Bank Name": [
    "BANK NAME",
    "NGÂN HÀNG",
    "TÊN NGÂN HÀNG",
    "TEN NGAN HANG",
  ],
  "CITAD code": ["CITAD", "MÃ CITAD", "CITAD CODE"],
  "TAX CODE": ["TAX", "MST", "MÃ SỐ THUẾ", "TAX CODE"],
  "Contract No": [
    "CONTRACT",
    "HỢP ĐỒNG",
    "SỐ HỢP ĐỒNG",
    "CONTRACT NO",
  ],
  "CHARGE TO LXO": ["LXO", "CHARGE LXO", "CHARGE TO LXO"],
  "CHARGE TO EC": ["EC", "CHARGE EC", "CHARGE TO EC"],
  "CHARGE TO PT-DEMO": [
    "PT-DEMO",
    "CHARGE PT-DEMO",
    "CHARGE TO PT-DEMO",
  ],
  "Charge MKT Local": [
    "MKT",
    "MKT LOCAL",
    "CHARGE MKT LOCAL",
    "CHARGE TO MKT LOCAL",
    "CHARGE MKT",
    "CHARGE TO CENTER MKT",
  ],
  "CHARGE TO OTHER": ["CHARGE OTHER", "CHARGE TO OTHER", "OTHER"],
  "Charge Renewal Projects": [
    "RENEWAL",
    "RENEWAL PROJECTS",
    "CHARGE TO RENEWAL PROJECTS",
  ],
  "Charge Discovery Camp": [
    "DISCOVERY",
    "DISCOVERY CAMP",
    "CHARGE TO DISCOVERY CAMP",
  ],
  "Charge Summer Outing": [
    "SUMMER OUTING",
    "CHARGE TO SUMMER OUTING",
  ],
  "Charge Summer Instructors": [
    "SUMMER INSTRUCTORS",
    "CHARGE TO SUMMER INSTRUCTORS",
  ],
  "TOTAL PAYMENT": [
    "TOTAL",
    "TỔNG",
    "THỰC NHẬN",
    "TỔNG THANH TOÁN",
    "TOTAL PAYMENT",
    "NET PAY",
    "AMOUNT",
    "BONUS",
  ],
  Center: [
    "CENTER",
    "COST CENTER",
    "TRUNG TÂM",
    "AE CODE",
    "AE",
    "MÃ AE",
    "MÃ TT",
    "MÃ TRUNG TÂM",
    "L07",
  ],
  Business: ["BUSINESS", "KHỐI", "BUS", "BỘ PHẬN", "BU"],
  Type: ["TYPE", "EVENT TYPE", "CLASS TYPE", "LOẠI LỚP", "LOẠI"],
  Class: [
    "CLASS",
    "CLASS NAME",
    "TÊN LỚP",
    "LỚP",
    "MÃ LỚP",
    "CLASS CODE",
  ],
  Date: ["DATE", "NGÀY", "DATE OF CLASS", "NGÀY DẠY", "SCHEDULE DATE"],
  Duration: ["DURATION", "HOURS", "SỐ GIỜ", "GIỜ", "TOTAL HOURS"],
};

const normalizeHeaderForMatching = (value: string): string =>
  removeVietnameseTones(String(value || ""))
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getHeaderTokenScore = (left: string, right: string): number => {
  const leftTokens = new Set(left.split(" ").filter(Boolean));
  const rightTokens = new Set(right.split(" ").filter(Boolean));
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
  let intersectionSize = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) intersectionSize++;
  });
  return (
    (intersectionSize / (leftTokens.size + rightTokens.size - intersectionSize)) *
    100
  );
};

export function scoreMatch(
  header: string,
  target: string,
  aliases: string[] = [],
): number {
  const normalizedHeader = normalizeHeaderForMatching(header);
  const normalizedTarget = normalizeHeaderForMatching(target);
  if (!normalizedHeader || !normalizedTarget) return 0;
  if (normalizedHeader === normalizedTarget) return 100;

  const normalizedAliases = aliases.map(normalizeHeaderForMatching);
  if (normalizedAliases.includes(normalizedHeader)) return 95;

  if (
    normalizedHeader.includes(normalizedTarget) ||
    normalizedTarget.includes(normalizedHeader)
  ) {
    return 85;
  }

  if (
    normalizedAliases.some(
      (alias) =>
        alias &&
        (normalizedHeader.includes(alias) || alias.includes(normalizedHeader)),
    )
  ) {
    return 80;
  }

  const candidateScores = [
    getHeaderTokenScore(normalizedHeader, normalizedTarget),
    ...normalizedAliases.map((alias) =>
      getHeaderTokenScore(normalizedHeader, alias),
    ),
  ];
  const bestTokenScore = Math.max(...candidateScores);
  return bestTokenScore >= 60 ? Math.min(79, bestTokenScore) : 0;
}
export function normalizeId(id: any): string { return String(id); }
export function toVietnamDateString(date: Date): string { return String(date); }
export function generateUUID(): string { return Math.random().toString(); }
export async function fetchGoogleSheetAsFile(url: string, name: string): Promise<File> { return new File([], name); }
export function isMoneyColumn(col: string): boolean { return false; }
export async function fetchWithBackoff(fn: any): Promise<any> { return await fn(); }
