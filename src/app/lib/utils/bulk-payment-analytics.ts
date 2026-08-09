/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  formatIdNumber,
  isChargeAmountColumn,
  parseMoneyToNumber,
  removeVietnameseTones,
} from "./data-utils";
import { getBusinessFromL07, mapL07 } from "./center-utils";

export type PayrollTrackingStatus =
  | "Đã hoàn tất"
  | "Chưa thanh toán"
  | "Thanh toán một phần";

export interface PayrollTrackingRow {
  id: string;
  STT: number;
  "Mã nhân viên": string;
  "Họ và tên": string;
  L07: string;
  BU: string;
  "Tháng báo cáo": string;
  "Tháng phát sinh": string;
  "Nghiệp vụ kỳ báo cáo": string;
  "Lương phải trả kỳ báo cáo": number;
  "Đã trả lương kỳ báo cáo": number;
  "Giữ lại phát sinh trong kỳ": number;
  "Giữ lại chuyển sang": number;
  "ADD trong kỳ": number;
  "CANCEL trong kỳ": number;
  "BONUS trong kỳ": number;
  "Còn số dư": number;
  "Tổng thực trả trong kỳ": number;
  "Tổng còn phải thanh toán": number;
  "Ngày trả lương kỳ báo cáo": string;
  "Ngày trả khoản ADD": string;
  "Trạng thái": PayrollTrackingStatus;
  "Ghi chú": string;
}

export interface PayrollTrackingTotals {
  "Lương phải trả kỳ báo cáo": number;
  "Đã trả lương kỳ báo cáo": number;
  "Giữ lại phát sinh trong kỳ": number;
  "Giữ lại chuyển sang": number;
  "ADD trong kỳ": number;
  "CANCEL trong kỳ": number;
  "BONUS trong kỳ": number;
  "Còn số dư": number;
  "Tổng thực trả trong kỳ": number;
  "Tổng còn phải thanh toán": number;
}

export interface PayrollBuMonthSummaryRow {
  id: string;
  "Tháng phát sinh": string;
  BU: string;
  "Tổng chi phí Gross Pay": number;
  "Thanh toán lương": number;
  "Số dư giữ lại đầu kỳ": number;
  HOLD: number;
  ADD: number;
  CANCEL: number;
  BONUS: number;
  "Số dư giữ lại cuối kỳ": number;
  "Tổng tiền thanh toán": number;
  "Chênh lệch đối soát Gross Pay": number;
}

export interface BulkPaymentAnalyticsResult {
  currentPeriod: string;
  currentRows: PayrollTrackingRow[];
  currentTotals: PayrollTrackingTotals;
  businessUnits: string[];
  summaryRows: PayrollBuMonthSummaryRow[];
}

interface BuildBulkPaymentAnalyticsParams {
  sheet1Rows: any[];
  holdRows: any[];
  bankRows: any[];
  globalMonth: string;
}

interface MonthPeriod {
  month: number;
  year: number;
  key: string;
}

type HoldOperation = "HOLD" | "ADD" | "BONUS" | "CANCEL";

interface IdentityDescriptor {
  employeeId: string;
  fullName: string;
  l07: string;
  business: string;
}

interface DimensionDescriptor {
  l07: string;
  business: string;
}

interface Sheet1Entry extends IdentityDescriptor {
  identityKey: string;
  groupKey: string;
  period: MonthPeriod;
  amount: number;
}

interface BankEntry extends IdentityDescriptor {
  identityKey: string;
  groupKey: string;
  period: MonthPeriod;
  amount: number;
  paymentDate: string;
}

interface HoldEntry extends IdentityDescriptor {
  identityKey: string;
  groupKey: string;
  reportPeriod: MonthPeriod;
  occurrencePeriod: MonthPeriod;
  operation: HoldOperation;
  amount: number;
  paymentDate: string;
  note: string;
}

interface BalanceBucket {
  occurrencePeriod: MonthPeriod;
  holdGross: number;
  addBeforePeriod: number;
  cancelBeforePeriod: number;
  addInPeriod: number;
  cancelInPeriod: number;
  addPaymentDates: string[];
  operations: Set<HoldOperation>;
  notes: Set<string>;
}

interface PeriodGroup extends IdentityDescriptor {
  identityKey: string;
  groupKey: string;
  salaryPayable: number;
  bankPaidInPeriod: number;
  bonusInPeriod: number;
  hasBankPayment: boolean;
  salaryPaymentDates: string[];
  buckets: Map<string, BalanceBucket>;
}

const MONEY_TOTAL_KEYS: Array<keyof PayrollTrackingTotals> = [
  "Lương phải trả kỳ báo cáo",
  "Đã trả lương kỳ báo cáo",
  "Giữ lại phát sinh trong kỳ",
  "Giữ lại chuyển sang",
  "ADD trong kỳ",
  "CANCEL trong kỳ",
  "BONUS trong kỳ",
  "Còn số dư",
  "Tổng thực trả trong kỳ",
  "Tổng còn phải thanh toán",
];

const readFirst = (row: any, keys: string[]): unknown => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
};

const normalizeText = (value: unknown): string =>
  removeVietnameseTones(String(value ?? ""))
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

const normalizeAccount = (value: unknown): string =>
  String(value ?? "").replace(/\s+/g, "").trim().toUpperCase();

const periodFromParts = (month: number, year: number): MonthPeriod | null => {
  if (month < 1 || month > 12 || year < 1900 || year > 2200) return null;
  return {
    month,
    year,
    key: `${year}-${String(month).padStart(2, "0")}`,
  };
};

const parseMonthPeriod = (
  value: unknown,
  fallback?: MonthPeriod,
): MonthPeriod | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return periodFromParts(value.getMonth() + 1, value.getFullYear());
  }

  const raw = String(value ?? "").trim();
  if (!raw) return fallback || null;

  const normalized = normalizeText(raw).replace(/NAM|YEAR/g, " ");
  const yearFirst = normalized.match(
    /\b(19\d{2}|20\d{2})\s*[./_\- ]\s*(0?[1-9]|1[0-2])\b/,
  );
  if (yearFirst) {
    return periodFromParts(Number(yearFirst[2]), Number(yearFirst[1]));
  }

  const monthFirst = normalized.match(
    /(?:THANG|THG|T)?\s*(0?[1-9]|1[0-2])\s*[./_\- ]\s*(19\d{2}|20\d{2})\b/,
  );
  if (monthFirst) {
    return periodFromParts(Number(monthFirst[1]), Number(monthFirst[2]));
  }

  const monthOnly = normalized.match(/^(?:THANG|THG|T)\s*(0?[1-9]|1[0-2])$/);
  if (monthOnly && fallback) {
    return periodFromParts(Number(monthOnly[1]), fallback.year);
  }

  return fallback || null;
};

const comparePeriods = (left: MonthPeriod, right: MonthPeriod): number =>
  left.year === right.year ? left.month - right.month : left.year - right.year;

const formatPeriod = (period: MonthPeriod): string =>
  `${String(period.month).padStart(2, "0")}.${period.year}`;

const employeeIdOf = (row: any): string =>
  formatIdNumber(
    readFirst(row, [
      "ID Number",
      "Document ID",
      "Document ID / CCCD",
      "Mã nhân viên",
      "Mã NV",
      "Mã AE",
      "Mã ae",
      "CCCD",
      "CMND",
      "ID",
    ]),
  ).toUpperCase();

const fullNameOf = (row: any): string =>
  String(
    readFirst(row, [
      "Full name",
      "Full Name",
      "Beneficiary Name",
      "Họ và tên",
      "Họ tên",
      "Name",
    ]),
  ).trim();

const dimensionsOf = (row: any): DimensionDescriptor => {
  const rawL07 = String(
    readFirst(row, [
      "L07",
      "L07 Code",
      "Center Code",
      "Charge to center",
      "charge_to_center_mkt",
      "Center",
      "Mã trung tâm",
      "Mã AE",
      "Mã ae",
    ]),
  ).trim();
  const mappedL07 = rawL07 ? mapL07(rawL07) : "";
  const l07 = String(mappedL07 || rawL07).trim().toUpperCase();
  const rawBusiness = String(
    readFirst(row, ["BU", "Business", "Bộ phận", "Department", "BUS"]),
  )
    .trim()
    .toUpperCase()
    .replace(/^AHN_HP$/, "AHP");

  return {
    l07,
    business: rawBusiness || (l07 ? getBusinessFromL07(l07) : ""),
  };
};

const accountOf = (row: any): string =>
  normalizeAccount(
    readFirst(row, [
      "Bank Account Number",
      "Beneficiary Account No.",
      "Account Number",
      "Số tài khoản",
      "STK",
    ]),
  );

const identityOf = (
  row: any,
  dimensions: DimensionDescriptor,
): IdentityDescriptor => ({
  employeeId: employeeIdOf(row),
  fullName: fullNameOf(row),
  ...dimensions,
});

const moneyOf = (row: any): number =>
  parseMoneyToNumber(
    readFirst(row, [
      "Payment Amount",
      "Amount",
      "Số tiền",
      "Thành tiền",
      "TOTAL PAYMENT",
      "Total Payment",
      "Grand Total",
      "GRAND TOTAL",
    ]),
  );

/**
 * TOTAL PAYMENT của Sheet 1 luôn được tính lại từ các cột Charge đang hiển thị.
 */
export const calculateDisplayedChargeTotal = (row: any): number => {
  const chargeColumns = Object.keys(row || {}).filter(
    (key) => isChargeAmountColumn(key) && normalizeText(key) !== "TOTAL PAYMENT",
  );
  return chargeColumns.reduce(
    (sum, key) => sum + parseMoneyToNumber(row?.[key]),
    0,
  );
};

const formatDateValue = (value: unknown): string => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${String(value.getDate()).padStart(2, "0")}/${String(
      value.getMonth() + 1,
    ).padStart(2, "0")}/${value.getFullYear()}`;
  }
  return String(value ?? "").trim();
};

const paymentDateOf = (row: any): string =>
  formatDateValue(
    readFirst(row, [
      "Payment Date",
      "Ngày thanh toán",
      "Ngày trả lương",
      "Ngày trả",
      "Transaction Date",
      "Value Date",
    ]),
  );

const noteOf = (row: any): string =>
  String(
    readFirst(row, [
      "Note",
      "Ghi chú",
      "Payment details",
      "Tình trạng thanh toán",
      "Sheet Source",
    ]),
  ).trim();

const classifyHoldOperation = (row: any): HoldOperation | null => {
  const explicitCode = normalizeText(row?.["Nghiệp vụ"]);
  if (explicitCode === "H" || explicitCode === "HOLD") return "HOLD";
  if (explicitCode === "A" || explicitCode === "ADD") return "ADD";
  if (explicitCode === "B" || explicitCode === "BONUS") return "BONUS";
  if (explicitCode === "C" || explicitCode === "CANCEL") return "CANCEL";

  const source = normalizeText(row?.["Sheet Source"]);
  const status = normalizeText(
    readFirst(row, ["Trạng thái", "Tình trạng thanh toán"]),
  );
  const combined = `${explicitCode} ${source} ${status}`;

  if (combined.includes("CANCEL") || combined.includes("HUY")) return "CANCEL";
  if (
    combined.includes("BONUS") ||
    combined.includes("SUMMER") ||
    combined.includes("INSTRUCTOR") ||
    combined.includes("⏯") ||
    combined.includes("⏩")
  ) {
    return "BONUS";
  }
  if (
    combined.includes("ADD") ||
    combined.includes("RELEASE") ||
    combined.includes("UNHOLD") ||
    combined.includes("THANH TOAN") ||
    combined.includes("PAID")
  ) {
    return "ADD";
  }
  if (combined.includes("HOLD") || combined.includes("GIU LAI")) return "HOLD";

  return moneyOf(row) < 0 ? "HOLD" : "ADD";
};

const isUsableHoldRow = (row: any): boolean => {
  if (!row || row._dimmed) return false;
  if (normalizeText(row["Lệnh"]) === "-") return false;
  return !normalizeText(row["Sheet Source"]).includes("SHEET 1");
};

const buildIdentityResolver = (rows: any[]) => {
  const nameToIdentity = new Map<string, string>();
  const accountToIdentity = new Map<string, string>();
  const ambiguousNames = new Set<string>();
  const ambiguousAccounts = new Set<string>();

  const registerAlias = (
    alias: string,
    identityKey: string,
    target: Map<string, string>,
    ambiguous: Set<string>,
  ) => {
    if (!alias || ambiguous.has(alias)) return;
    const existing = target.get(alias);
    if (existing && existing !== identityKey) {
      target.delete(alias);
      ambiguous.add(alias);
      return;
    }
    target.set(alias, identityKey);
  };

  rows.forEach((row) => {
    const employeeId = employeeIdOf(row);
    if (!employeeId) return;
    const identityKey = `ID:${employeeId}`;
    registerAlias(
      normalizeText(fullNameOf(row)),
      identityKey,
      nameToIdentity,
      ambiguousNames,
    );
    registerAlias(
      accountOf(row),
      identityKey,
      accountToIdentity,
      ambiguousAccounts,
    );
  });

  return (row: any, fallbackIndex: number): string => {
    const employeeId = employeeIdOf(row);
    if (employeeId) return `ID:${employeeId}`;

    const account = accountOf(row);
    if (account && accountToIdentity.has(account)) {
      return accountToIdentity.get(account)!;
    }

    const normalizedName = normalizeText(fullNameOf(row));
    if (normalizedName && nameToIdentity.has(normalizedName)) {
      return nameToIdentity.get(normalizedName)!;
    }
    if (normalizedName) return `NAME:${normalizedName}`;
    if (account) return `ACCOUNT:${account}`;
    return `UNKNOWN:${String(row?.id || row?._recordId || fallbackIndex)}`;
  };
};

const createEmptyTotals = (): PayrollTrackingTotals => ({
  "Lương phải trả kỳ báo cáo": 0,
  "Đã trả lương kỳ báo cáo": 0,
  "Giữ lại phát sinh trong kỳ": 0,
  "Giữ lại chuyển sang": 0,
  "ADD trong kỳ": 0,
  "CANCEL trong kỳ": 0,
  "BONUS trong kỳ": 0,
  "Còn số dư": 0,
  "Tổng thực trả trong kỳ": 0,
  "Tổng còn phải thanh toán": 0,
});

const sumTrackingRows = (rows: PayrollTrackingRow[]): PayrollTrackingTotals =>
  rows.reduce((totals, row) => {
    MONEY_TOTAL_KEYS.forEach((key) => {
      totals[key] += row[key];
    });
    return totals;
  }, createEmptyTotals());

export function buildBulkPaymentAnalytics({
  sheet1Rows,
  holdRows,
  bankRows,
  globalMonth,
}: BuildBulkPaymentAnalyticsParams): BulkPaymentAnalyticsResult {
  const now = new Date();
  const defaultPeriod =
    parseMonthPeriod(globalMonth) ||
    periodFromParts(now.getMonth() + 1, now.getFullYear())!;
  const allRows = [...sheet1Rows, ...holdRows, ...bankRows];
  const resolveIdentity = buildIdentityResolver(allRows);
  const dimensionHints = new Map<string, DimensionDescriptor>();

  allRows.forEach((row, index) => {
    const identityKey = resolveIdentity(row, index);
    const incoming = dimensionsOf(row);
    const existing = dimensionHints.get(identityKey);
    dimensionHints.set(identityKey, {
      l07: existing?.l07 || incoming.l07,
      business: existing?.business || incoming.business,
    });
  });

  const resolveDimensions = (
    row: any,
    identityKey: string,
  ): DimensionDescriptor => {
    const direct = dimensionsOf(row);
    const hint = dimensionHints.get(identityKey);
    const l07 = direct.l07 || hint?.l07 || "CHƯA XÁC ĐỊNH";
    const business =
      direct.business ||
      hint?.business ||
      (l07 !== "CHƯA XÁC ĐỊNH" ? getBusinessFromL07(l07) : "") ||
      "OTHER";
    return { l07, business };
  };

  const groupKeyOf = (
    identityKey: string,
    dimensions: DimensionDescriptor,
  ): string => `${identityKey}|L07:${dimensions.l07}|BU:${dimensions.business}`;

  const sheet1Entries: Sheet1Entry[] = sheet1Rows.flatMap((row, index) => {
    const period = parseMonthPeriod(
      readFirst(row, ["Tháng báo cáo", "_fileMonth", "Tháng", "Month"]),
      defaultPeriod,
    );
    if (!period) return [];
    const identityKey = resolveIdentity(row, index);
    const dimensions = resolveDimensions(row, identityKey);
    return [
      {
        identityKey,
        groupKey: groupKeyOf(identityKey, dimensions),
        period,
        amount: calculateDisplayedChargeTotal(row),
        ...identityOf(row, dimensions),
      },
    ];
  });

  const bankEntries: BankEntry[] = bankRows.flatMap((row, index) => {
    const period = parseMonthPeriod(
      readFirst(row, ["Tháng báo cáo", "_fileMonth", "Tháng", "Month"]),
      defaultPeriod,
    );
    if (!period) return [];
    const identityKey = resolveIdentity(row, sheet1Rows.length + index);
    const dimensions = resolveDimensions(row, identityKey);
    return [
      {
        identityKey,
        groupKey: groupKeyOf(identityKey, dimensions),
        period,
        amount: Math.abs(moneyOf(row)),
        paymentDate: paymentDateOf(row),
        ...identityOf(row, dimensions),
      },
    ];
  });

  const holdEntries: HoldEntry[] = holdRows.flatMap((row, index) => {
    if (!isUsableHoldRow(row)) return [];
    const operation = classifyHoldOperation(row);
    if (!operation) return [];
    const reportPeriod = parseMonthPeriod(
      readFirst(row, ["Tháng báo cáo", "_fileMonth", "Tháng", "Month"]),
      defaultPeriod,
    );
    if (!reportPeriod) return [];
    const occurrencePeriod = parseMonthPeriod(
      readFirst(row, [
        "Tháng phát sinh",
        "Month of Occurrence",
        "Tháng lương",
      ]),
      reportPeriod,
    );
    if (!occurrencePeriod) return [];

    const identityKey = resolveIdentity(
      row,
      sheet1Rows.length + bankRows.length + index,
    );
    const dimensions = resolveDimensions(row, identityKey);
    return [
      {
        identityKey,
        groupKey: groupKeyOf(identityKey, dimensions),
        reportPeriod,
        occurrencePeriod,
        operation,
        amount: Math.abs(moneyOf(row)),
        paymentDate: paymentDateOf(row),
        note: noteOf(row),
        ...identityOf(row, dimensions),
      },
    ];
  });

  const buildRowsForPeriod = (period: MonthPeriod): PayrollTrackingRow[] => {
    const groups = new Map<string, PeriodGroup>();
    const hasBankDataForPeriod = bankEntries.some(
      (entry) => comparePeriods(entry.period, period) === 0,
    );

    const ensureGroup = (entry: IdentityDescriptor & {
      identityKey: string;
      groupKey: string;
    }): PeriodGroup => {
      const existing = groups.get(entry.groupKey);
      if (existing) return existing;
      const group: PeriodGroup = {
        identityKey: entry.identityKey,
        groupKey: entry.groupKey,
        employeeId: entry.employeeId,
        fullName: entry.fullName,
        l07: entry.l07,
        business: entry.business,
        salaryPayable: 0,
        bankPaidInPeriod: 0,
        bonusInPeriod: 0,
        hasBankPayment: false,
        salaryPaymentDates: [],
        buckets: new Map<string, BalanceBucket>(),
      };
      groups.set(entry.groupKey, group);
      return group;
    };

    const ensureBucket = (
      group: PeriodGroup,
      occurrencePeriod: MonthPeriod,
    ): BalanceBucket => {
      const existing = group.buckets.get(occurrencePeriod.key);
      if (existing) return existing;
      const bucket: BalanceBucket = {
        occurrencePeriod,
        holdGross: 0,
        addBeforePeriod: 0,
        cancelBeforePeriod: 0,
        addInPeriod: 0,
        cancelInPeriod: 0,
        addPaymentDates: [],
        operations: new Set<HoldOperation>(),
        notes: new Set<string>(),
      };
      group.buckets.set(occurrencePeriod.key, bucket);
      return bucket;
    };

    sheet1Entries.forEach((entry) => {
      if (comparePeriods(entry.period, period) !== 0) return;
      ensureGroup(entry).salaryPayable += entry.amount;
    });

    bankEntries.forEach((entry) => {
      if (comparePeriods(entry.period, period) !== 0) return;
      const group = ensureGroup(entry);
      group.bankPaidInPeriod += entry.amount;
      group.hasBankPayment = true;
      if (entry.paymentDate) group.salaryPaymentDates.push(entry.paymentDate);
    });

    holdEntries.forEach((entry) => {
      const reportCompare = comparePeriods(entry.reportPeriod, period);
      const occurrenceCompare = comparePeriods(entry.occurrencePeriod, period);
      if (reportCompare > 0 || occurrenceCompare > 0) return;

      const group = ensureGroup(entry);
      if (entry.operation === "BONUS") {
        if (reportCompare === 0) group.bonusInPeriod += entry.amount;
        return;
      }

      const bucket = ensureBucket(group, entry.occurrencePeriod);
      if (entry.operation === "HOLD") {
        bucket.holdGross += entry.amount;
      } else if (entry.operation === "ADD") {
        if (reportCompare < 0) bucket.addBeforePeriod += entry.amount;
        else if (reportCompare === 0) {
          bucket.addInPeriod += entry.amount;
          if (entry.paymentDate) bucket.addPaymentDates.push(entry.paymentDate);
        }
      } else if (entry.operation === "CANCEL") {
        if (reportCompare < 0) bucket.cancelBeforePeriod += entry.amount;
        else if (reportCompare === 0) bucket.cancelInPeriod += entry.amount;
      }

      if (reportCompare === 0) {
        bucket.operations.add(entry.operation);
        if (entry.note) bucket.notes.add(entry.note);
      }
    });

    const rows: PayrollTrackingRow[] = [];
    groups.forEach((group) => {
      const totalAddInPeriod = Array.from(group.buckets.values()).reduce(
        (sum, bucket) => sum + bucket.addInPeriod,
        0,
      );
      const currentSalaryPaid = group.hasBankPayment
        ? Math.max(
            group.bankPaidInPeriod - totalAddInPeriod - group.bonusInPeriod,
            0,
          )
        : !hasBankDataForPeriod
          ? Math.max(
              group.salaryPayable -
                (group.buckets.get(period.key)?.holdGross || 0),
              0,
            )
          : 0;
      const calculatedCurrentHold = Math.max(
        group.salaryPayable - currentSalaryPaid,
        0,
      );

      if (
        group.salaryPayable !== 0 ||
        currentSalaryPaid !== 0 ||
        calculatedCurrentHold !== 0 ||
        group.bonusInPeriod !== 0
      ) {
        ensureBucket(group, period);
      }

      const orderedBuckets = Array.from(group.buckets.values()).sort(
        (left, right) => comparePeriods(left.occurrencePeriod, right.occurrencePeriod),
      );

      orderedBuckets.forEach((bucket) => {
        const isCurrentOccurrence =
          comparePeriods(bucket.occurrencePeriod, period) === 0;
        const carryIn = isCurrentOccurrence
          ? 0
          : Math.max(
              bucket.holdGross -
                bucket.addBeforePeriod +
                bucket.cancelBeforePeriod,
              0,
            );
        const currentHold = isCurrentOccurrence
          ? Math.max(calculatedCurrentHold, bucket.holdGross)
          : 0;
        const openingBalance = carryIn + currentHold;
        const remainingBalance = Math.max(
          openingBalance - bucket.addInPeriod + bucket.cancelInPeriod,
          0,
        );
        const salaryPaid = isCurrentOccurrence ? currentSalaryPaid : 0;
        const salaryPayable = isCurrentOccurrence ? group.salaryPayable : 0;
        const bonus = isCurrentOccurrence ? group.bonusInPeriod : 0;
        const totalPaid = salaryPaid + bucket.addInPeriod + bonus;
        const operationLabels: string[] = Array.from(bucket.operations);
        if (bonus > 0 && !operationLabels.includes("BONUS")) {
          operationLabels.push("BONUS");
        }
        if (
          isCurrentOccurrence &&
          currentHold > 0 &&
          !operationLabels.includes("HOLD")
        ) {
          operationLabels.push("HOLD");
        }
        if (operationLabels.length === 0 && carryIn > 0) {
          operationLabels.push("SỐ DƯ");
        }

        if (
          salaryPayable === 0 &&
          salaryPaid === 0 &&
          currentHold === 0 &&
          carryIn === 0 &&
          bucket.addInPeriod === 0 &&
          bucket.cancelInPeriod === 0 &&
          bonus === 0 &&
          remainingBalance === 0
        ) {
          return;
        }

        const notes = new Set(bucket.notes);
        const reportLabel = formatPeriod(period);
        const occurrenceLabel = formatPeriod(bucket.occurrencePeriod);
        if (carryIn > 0) notes.add(`Số dư của tháng ${occurrenceLabel}`);
        if (bucket.addInPeriod > 0) {
          notes.add(`ADD ${reportLabel} cho tháng ${occurrenceLabel}`);
        }
        if (bucket.cancelInPeriod > 0) {
          notes.add(`CANCEL ${reportLabel} của tháng ${occurrenceLabel}`);
        }
        if (
          salaryPayable > 0 &&
          hasBankDataForPeriod &&
          !group.hasBankPayment
        ) {
          notes.add("Không tìm thấy khoản thanh toán trong bảng Bank");
        }
        if (bucket.addInPeriod > openingBalance) {
          notes.add("Khoản ADD lớn hơn số dư trước thanh toán");
        }

        let status: PayrollTrackingStatus = "Thanh toán một phần";
        if (remainingBalance === 0) status = "Đã hoàn tất";
        else if (totalPaid === 0) status = "Chưa thanh toán";

        rows.push({
          id: `${period.key}|${group.groupKey}|${bucket.occurrencePeriod.key}`,
          STT: 0,
          "Mã nhân viên": group.employeeId,
          "Họ và tên": group.fullName,
          L07: group.l07,
          BU: group.business,
          "Tháng báo cáo": reportLabel,
          "Tháng phát sinh": occurrenceLabel,
          "Nghiệp vụ kỳ báo cáo": operationLabels.join(" + "),
          "Lương phải trả kỳ báo cáo": salaryPayable,
          "Đã trả lương kỳ báo cáo": salaryPaid,
          "Giữ lại phát sinh trong kỳ": currentHold,
          "Giữ lại chuyển sang": carryIn,
          "ADD trong kỳ": bucket.addInPeriod,
          "CANCEL trong kỳ": bucket.cancelInPeriod,
          "BONUS trong kỳ": bonus,
          "Còn số dư": remainingBalance,
          "Tổng thực trả trong kỳ": totalPaid,
          "Tổng còn phải thanh toán": remainingBalance,
          "Ngày trả lương kỳ báo cáo":
            isCurrentOccurrence ? group.salaryPaymentDates.at(-1) || "" : "",
          "Ngày trả khoản ADD": bucket.addPaymentDates.at(-1) || "",
          "Trạng thái": status,
          "Ghi chú": Array.from(notes).slice(0, 6).join("; "),
        });
      });
    });

    return rows
      .sort((left, right) => {
        const buCompare = left.BU.localeCompare(right.BU, "vi");
        if (buCompare !== 0) return buCompare;
        const l07Compare = left.L07.localeCompare(right.L07, "vi");
        if (l07Compare !== 0) return l07Compare;
        const monthCompare = left["Tháng phát sinh"].localeCompare(
          right["Tháng phát sinh"],
          "vi",
        );
        if (monthCompare !== 0) return monthCompare;
        return left["Họ và tên"].localeCompare(right["Họ và tên"], "vi");
      })
      .map((row, index) => ({ ...row, STT: index + 1 }));
  };

  const currentRows = buildRowsForPeriod(defaultPeriod);
  const currentTotals = sumTrackingRows(currentRows);
  const summaryMap = new Map<string, PayrollBuMonthSummaryRow>();

  currentRows.forEach((row) => {
    const key = `${row.BU}|${row["Tháng phát sinh"]}`;
    const existing = summaryMap.get(key) || {
      id: key,
      "Tháng phát sinh": row["Tháng phát sinh"],
      BU: row.BU,
      "Tổng chi phí Gross Pay": 0,
      "Thanh toán lương": 0,
      "Số dư giữ lại đầu kỳ": 0,
      HOLD: 0,
      ADD: 0,
      CANCEL: 0,
      BONUS: 0,
      "Số dư giữ lại cuối kỳ": 0,
      "Tổng tiền thanh toán": 0,
      "Chênh lệch đối soát Gross Pay": 0,
    };

    existing["Tổng chi phí Gross Pay"] +=
      row["Lương phải trả kỳ báo cáo"];
    existing["Thanh toán lương"] += row["Đã trả lương kỳ báo cáo"];
    existing["Số dư giữ lại đầu kỳ"] += row["Giữ lại chuyển sang"];
    existing.HOLD += row["Giữ lại phát sinh trong kỳ"];
    existing.ADD += row["ADD trong kỳ"];
    existing.CANCEL += row["CANCEL trong kỳ"];
    existing.BONUS += row["BONUS trong kỳ"];
    existing["Số dư giữ lại cuối kỳ"] += row["Còn số dư"];
    existing["Tổng tiền thanh toán"] += row["Tổng thực trả trong kỳ"];
    existing["Chênh lệch đối soát Gross Pay"] =
      existing["Tổng chi phí Gross Pay"] -
      existing["Thanh toán lương"] -
      existing.HOLD;
    summaryMap.set(key, existing);
  });

  const summaryRows = Array.from(summaryMap.values()).sort((left, right) => {
    const leftPeriod = parseMonthPeriod(left["Tháng phát sinh"]);
    const rightPeriod = parseMonthPeriod(right["Tháng phát sinh"]);
    if (leftPeriod && rightPeriod) {
      const periodCompare = comparePeriods(leftPeriod, rightPeriod);
      if (periodCompare !== 0) return periodCompare;
    }
    return left.BU.localeCompare(right.BU, "vi");
  });
  const businessUnits = Array.from(
    new Set(summaryRows.map((row) => row.BU).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right, "vi"));

  return {
    currentPeriod: formatPeriod(defaultPeriod),
    currentRows,
    currentTotals,
    businessUnits,
    summaryRows,
  };
}
