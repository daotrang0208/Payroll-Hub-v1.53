/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  formatIdNumber,
  isChargeAmountColumn,
  parseMoneyToNumber,
  removeVietnameseTones,
} from "./data-utils";

export type PayrollTrackingStatus =
  | "Đã hoàn tất"
  | "Chưa thanh toán"
  | "Thanh toán một phần";

export interface PayrollTrackingRow {
  id: string;
  STT: number;
  "Mã nhân viên": string;
  "Họ và tên": string;
  "Bộ phận": string;
  "Tháng lương": string;
  "Lương phải trả tháng này": number;
  "Đã trả lương tháng này": number;
  "Lương giữ lại tháng này": number;
  "Lương giữ lại tháng trước chuyển sang": number;
  "Đã thanh toán lương giữ lại tháng trước": number;
  "Còn giữ lại tháng trước": number;
  "Tổng thực trả trong tháng": number;
  "Tổng còn phải thanh toán": number;
  "Ngày trả lương tháng này": string;
  "Ngày trả khoản giữ lại tháng trước": string;
  "Trạng thái": PayrollTrackingStatus;
  "Ghi chú": string;
}

export interface PayrollTrackingTotals {
  "Lương phải trả tháng này": number;
  "Đã trả lương tháng này": number;
  "Lương giữ lại tháng này": number;
  "Lương giữ lại tháng trước chuyển sang": number;
  "Đã thanh toán lương giữ lại tháng trước": number;
  "Còn giữ lại tháng trước": number;
  "Tổng thực trả trong tháng": number;
  "Tổng còn phải thanh toán": number;
}

export interface PayrollYearSummaryRow {
  id: string;
  "Tháng": string;
  "Lương phải trả": number;
  "Đã trả lương tháng": number;
  "Giữ lại tháng": number;
  "Giữ lại tháng trước chuyển sang": number;
  "Đã trả khoản giữ lại tháng trước": number;
  "Còn giữ lại tháng trước": number;
  "Tổng thực trả": number;
  "Tổng còn phải thanh toán": number;
  "Tỷ lệ lương tháng đã trả": number;
}

export interface BulkPaymentAnalyticsResult {
  currentPeriod: string;
  currentRows: PayrollTrackingRow[];
  currentTotals: PayrollTrackingTotals;
  year: number;
  yearRows: PayrollYearSummaryRow[];
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
  department: string;
}

interface Sheet1Entry extends IdentityDescriptor {
  identityKey: string;
  period: MonthPeriod;
  amount: number;
}

interface BankEntry extends IdentityDescriptor {
  identityKey: string;
  period: MonthPeriod;
  amount: number;
  paymentDate: string;
}

interface HoldEntry extends IdentityDescriptor {
  identityKey: string;
  reportPeriod: MonthPeriod;
  occurrencePeriod: MonthPeriod;
  operation: HoldOperation;
  amount: number;
  paymentDate: string;
  note: string;
}

interface PeriodAccumulator extends IdentityDescriptor {
  identityKey: string;
  salaryPayable: number;
  currentHoldFromSource: number;
  priorHoldGross: number;
  priorHoldPaidBeforePeriod: number;
  priorHoldPaidInPeriod: number;
  bonusPaidInPeriod: number;
  bankPaidInPeriod: number;
  hasBankPayment: boolean;
  currentPaymentDates: string[];
  priorHoldPaymentDates: string[];
  notes: Set<string>;
}

const MONEY_TOTAL_KEYS: Array<keyof PayrollTrackingTotals> = [
  "Lương phải trả tháng này",
  "Đã trả lương tháng này",
  "Lương giữ lại tháng này",
  "Lương giữ lại tháng trước chuyển sang",
  "Đã thanh toán lương giữ lại tháng trước",
  "Còn giữ lại tháng trước",
  "Tổng thực trả trong tháng",
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

const departmentOf = (row: any): string =>
  String(
    readFirst(row, [
      "Business",
      "BU",
      "Bộ phận",
      "Department",
      "L07",
      "Center",
      "Mã ae",
    ]),
  )
    .trim()
    .toUpperCase()
    .replace(/^AHN_HP$/, "AHP");

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

const identityOf = (row: any): IdentityDescriptor => ({
  employeeId: employeeIdOf(row),
  fullName: fullNameOf(row),
  department: departmentOf(row),
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
 * Sheet1 TOTAL PAYMENT is a calculated field. If charge columns are present,
 * always rebuild the value from those columns and ignore the imported total.
 */
export const calculateDisplayedChargeTotal = (row: any): number => {
  const chargeColumns = Object.keys(row || {}).filter(
    (key) =>
      isChargeAmountColumn(key) &&
      normalizeText(key) !== "TOTAL PAYMENT",
  );

  if (chargeColumns.length === 0) return 0;
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
  if (explicitCode === "H") return "HOLD";
  if (explicitCode === "A") return "ADD";
  if (explicitCode === "B") return "BONUS";
  if (explicitCode === "C") return "CANCEL";

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
  const source = normalizeText(row["Sheet Source"]);
  return !source.includes("SHEET 1");
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

    if (normalizedName) {
      return `NAME:${normalizedName}|${normalizeText(departmentOf(row))}`;
    }
    if (account) return `ACCOUNT:${account}`;
    return `UNKNOWN:${String(row?.id || row?._recordId || fallbackIndex)}`;
  };
};

const createEmptyTotals = (): PayrollTrackingTotals => ({
  "Lương phải trả tháng này": 0,
  "Đã trả lương tháng này": 0,
  "Lương giữ lại tháng này": 0,
  "Lương giữ lại tháng trước chuyển sang": 0,
  "Đã thanh toán lương giữ lại tháng trước": 0,
  "Còn giữ lại tháng trước": 0,
  "Tổng thực trả trong tháng": 0,
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
  const descriptors = new Map<string, IdentityDescriptor>();

  const rememberDescriptor = (identityKey: string, row: any) => {
    const incoming = identityOf(row);
    const existing = descriptors.get(identityKey);
    descriptors.set(identityKey, {
      employeeId: existing?.employeeId || incoming.employeeId,
      fullName: existing?.fullName || incoming.fullName,
      department: existing?.department || incoming.department,
    });
  };

  const sheet1Entries: Sheet1Entry[] = sheet1Rows.flatMap((row, index) => {
    const period = parseMonthPeriod(
      readFirst(row, ["Tháng báo cáo", "_fileMonth", "Tháng", "Month"]),
      defaultPeriod,
    );
    if (!period) return [];
    const identityKey = resolveIdentity(row, index);
    const descriptor = identityOf(row);
    rememberDescriptor(identityKey, row);
    return [
      {
        identityKey,
        period,
        amount: calculateDisplayedChargeTotal(row),
        ...descriptor,
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
    const descriptor = identityOf(row);
    rememberDescriptor(identityKey, row);
    return [
      {
        identityKey,
        period,
        amount: Math.abs(moneyOf(row)),
        paymentDate: paymentDateOf(row),
        ...descriptor,
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
    const descriptor = identityOf(row);
    rememberDescriptor(identityKey, row);
    return [
      {
        identityKey,
        reportPeriod,
        occurrencePeriod,
        operation,
        amount: Math.abs(moneyOf(row)),
        paymentDate: paymentDateOf(row),
        note: noteOf(row),
        ...descriptor,
      },
    ];
  });

  const buildRowsForPeriod = (period: MonthPeriod): PayrollTrackingRow[] => {
    const accumulators = new Map<string, PeriodAccumulator>();
    const hasBankDataForPeriod = bankEntries.some(
      (entry) => comparePeriods(entry.period, period) === 0,
    );

    const ensureAccumulator = (identityKey: string): PeriodAccumulator => {
      const existing = accumulators.get(identityKey);
      if (existing) return existing;
      const descriptor = descriptors.get(identityKey) || {
        employeeId: "",
        fullName: "",
        department: "",
      };
      const next: PeriodAccumulator = {
        identityKey,
        ...descriptor,
        salaryPayable: 0,
        currentHoldFromSource: 0,
        priorHoldGross: 0,
        priorHoldPaidBeforePeriod: 0,
        priorHoldPaidInPeriod: 0,
        bonusPaidInPeriod: 0,
        bankPaidInPeriod: 0,
        hasBankPayment: false,
        currentPaymentDates: [],
        priorHoldPaymentDates: [],
        notes: new Set<string>(),
      };
      accumulators.set(identityKey, next);
      return next;
    };

    sheet1Entries.forEach((entry) => {
      if (comparePeriods(entry.period, period) !== 0) return;
      ensureAccumulator(entry.identityKey).salaryPayable += entry.amount;
    });

    bankEntries.forEach((entry) => {
      if (comparePeriods(entry.period, period) !== 0) return;
      const accumulator = ensureAccumulator(entry.identityKey);
      accumulator.bankPaidInPeriod += entry.amount;
      accumulator.hasBankPayment = true;
      if (entry.paymentDate) accumulator.currentPaymentDates.push(entry.paymentDate);
    });

    holdEntries.forEach((entry) => {
      const reportCompare = comparePeriods(entry.reportPeriod, period);
      const occurrenceCompare = comparePeriods(entry.occurrencePeriod, period);
      if (reportCompare > 0) return;

      const accumulator = ensureAccumulator(entry.identityKey);
      if (entry.operation === "HOLD") {
        if (occurrenceCompare === 0) {
          accumulator.currentHoldFromSource += entry.amount;
        } else if (occurrenceCompare < 0) {
          accumulator.priorHoldGross += entry.amount;
        }
      } else if (
        (entry.operation === "ADD" || entry.operation === "CANCEL") &&
        occurrenceCompare < 0
      ) {
        const signedRelease =
          entry.operation === "ADD" ? entry.amount : -entry.amount;
        if (reportCompare < 0) {
          accumulator.priorHoldPaidBeforePeriod += signedRelease;
        } else if (reportCompare === 0) {
          accumulator.priorHoldPaidInPeriod += signedRelease;
          if (entry.paymentDate) {
            accumulator.priorHoldPaymentDates.push(entry.paymentDate);
          }
        }
      } else if (entry.operation === "BONUS" && reportCompare === 0) {
        accumulator.bonusPaidInPeriod += entry.amount;
      }

      if (
        entry.note &&
        (reportCompare === 0 ||
          (entry.operation === "HOLD" && occurrenceCompare === 0))
      ) {
        accumulator.notes.add(entry.note);
      }
    });

    const rows = Array.from(accumulators.values())
      .map((item) => {
        const priorHoldCarried = Math.max(
          item.priorHoldGross -
            Math.max(item.priorHoldPaidBeforePeriod, 0),
          0,
        );
        const priorHoldPaid = Math.max(item.priorHoldPaidInPeriod, 0);

        const currentSalaryPaid = item.hasBankPayment
          ? Math.max(
              item.bankPaidInPeriod -
                priorHoldPaid -
                item.bonusPaidInPeriod,
              0,
            )
          : !hasBankDataForPeriod
            ? Math.max(
                item.salaryPayable - item.currentHoldFromSource,
                0,
              )
            : 0;

        // All output totals are formulas built from the displayed columns.
        // No imported TOTAL PAYMENT value is copied into these fields.
        const currentHold = Math.max(
          item.salaryPayable - currentSalaryPaid,
          0,
        );
        const priorHoldRemaining = Math.max(
          priorHoldCarried - priorHoldPaid,
          0,
        );
        const totalPaid = currentSalaryPaid + priorHoldPaid;
        const totalOutstanding = currentHold + priorHoldRemaining;

        if (
          item.salaryPayable === 0 &&
          currentSalaryPaid === 0 &&
          currentHold === 0 &&
          priorHoldCarried === 0 &&
          priorHoldPaid === 0 &&
          priorHoldRemaining === 0
        ) {
          return null;
        }

        let status: PayrollTrackingStatus = "Thanh toán một phần";
        if (totalOutstanding === 0) status = "Đã hoàn tất";
        else if (totalPaid === 0) status = "Chưa thanh toán";

        if (item.salaryPayable > 0 && hasBankDataForPeriod && !item.hasBankPayment) {
          item.notes.add("Không tìm thấy khoản thanh toán trong bảng Bank");
        }
        if (priorHoldPaid > priorHoldCarried) {
          item.notes.add("Khoản trả giữ lại lớn hơn số chuyển sang");
        }

        return {
          id: `${period.key}|${item.identityKey}`,
          STT: 0,
          "Mã nhân viên": item.employeeId,
          "Họ và tên": item.fullName,
          "Bộ phận": item.department,
          "Tháng lương": formatPeriod(period),
          "Lương phải trả tháng này": item.salaryPayable,
          "Đã trả lương tháng này": currentSalaryPaid,
          "Lương giữ lại tháng này": currentHold,
          "Lương giữ lại tháng trước chuyển sang": priorHoldCarried,
          "Đã thanh toán lương giữ lại tháng trước": priorHoldPaid,
          "Còn giữ lại tháng trước": priorHoldRemaining,
          "Tổng thực trả trong tháng": totalPaid,
          "Tổng còn phải thanh toán": totalOutstanding,
          "Ngày trả lương tháng này": item.currentPaymentDates.at(-1) || "",
          "Ngày trả khoản giữ lại tháng trước":
            item.priorHoldPaymentDates.at(-1) || "",
          "Trạng thái": status,
          "Ghi chú": Array.from(item.notes).slice(0, 4).join("; "),
        } satisfies PayrollTrackingRow;
      })
      .filter((row): row is PayrollTrackingRow => row !== null)
      .sort((left, right) => {
        const departmentCompare = left["Bộ phận"].localeCompare(
          right["Bộ phận"],
          "vi",
        );
        if (departmentCompare !== 0) return departmentCompare;
        const nameCompare = left["Họ và tên"].localeCompare(
          right["Họ và tên"],
          "vi",
        );
        if (nameCompare !== 0) return nameCompare;
        return left["Mã nhân viên"].localeCompare(right["Mã nhân viên"], "vi");
      });

    return rows.map((row, index) => ({ ...row, STT: index + 1 }));
  };

  const currentRows = buildRowsForPeriod(defaultPeriod);
  const currentTotals = sumTrackingRows(currentRows);
  const yearRows: PayrollYearSummaryRow[] = [];

  for (let month = 1; month <= 12; month++) {
    const period = periodFromParts(month, defaultPeriod.year)!;
    const totals = sumTrackingRows(buildRowsForPeriod(period));
    yearRows.push({
      id: period.key,
      "Tháng": `Tháng ${month}`,
      "Lương phải trả": totals["Lương phải trả tháng này"],
      "Đã trả lương tháng": totals["Đã trả lương tháng này"],
      "Giữ lại tháng": totals["Lương giữ lại tháng này"],
      "Giữ lại tháng trước chuyển sang":
        totals["Lương giữ lại tháng trước chuyển sang"],
      "Đã trả khoản giữ lại tháng trước":
        totals["Đã thanh toán lương giữ lại tháng trước"],
      "Còn giữ lại tháng trước": totals["Còn giữ lại tháng trước"],
      "Tổng thực trả": totals["Tổng thực trả trong tháng"],
      "Tổng còn phải thanh toán": totals["Tổng còn phải thanh toán"],
      "Tỷ lệ lương tháng đã trả":
        totals["Lương phải trả tháng này"] === 0
          ? 0
          : totals["Đã trả lương tháng này"] /
            totals["Lương phải trả tháng này"],
    });
  }

  return {
    currentPeriod: formatPeriod(defaultPeriod),
    currentRows,
    currentTotals,
    year: defaultPeriod.year,
    yearRows,
  };
}
