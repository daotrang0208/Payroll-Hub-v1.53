import { useMemo, useState } from "react";
import { DataTable, type Column } from "../../../components/DataTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  buildBulkPaymentAnalytics,
  type BulkPaymentAnalyticsResult,
  type PayrollBuMonthSummaryRow,
} from "../../../lib/utils/bulk-payment-analytics";

interface BulkPaymentAnalyticsProps {
  sheet1Rows: Record<string, unknown>[];
  holdRows: Record<string, unknown>[];
  bankRows: Record<string, unknown>[];
  globalMonth: string;
}

const SUMMARY_COLUMNS: Column[] = [
  {
    key: "Tháng phát sinh",
    label: "Tháng phát sinh",
    type: "text",
    width: 125,
    readOnly: true,
  },
  { key: "BU", label: "BU", type: "text", width: 105, readOnly: true },
  {
    key: "Tổng chi phí Gross Pay",
    label: "Tổng chi phí Gross Pay",
    type: "money",
    width: 190,
    readOnly: true,
    showGrandTotal: true,
  },
  {
    key: "Thanh toán lương",
    label: "Thanh toán lương",
    type: "money",
    width: 175,
    readOnly: true,
    showGrandTotal: true,
  },
  {
    key: "Giữ lại phát sinh",
    label: "Giữ lại phát sinh tháng",
    type: "money",
    width: 185,
    readOnly: true,
    showGrandTotal: true,
  },
  {
    key: "Số dư giữ lại đầu kỳ",
    label: "Số dư HOLD đầu kỳ",
    type: "money",
    width: 175,
    readOnly: true,
    showGrandTotal: true,
  },
  {
    key: "Thanh toán HOLD",
    label: "Thanh toán HOLD trong tháng",
    type: "money",
    width: 205,
    readOnly: true,
    showGrandTotal: true,
  },
  {
    key: "CANCEL HOLD",
    label: "CANCEL HOLD",
    type: "money",
    width: 145,
    readOnly: true,
    showGrandTotal: true,
  },
  {
    key: "BONUS",
    label: "BONUS thanh toán",
    type: "money",
    width: 155,
    readOnly: true,
    showGrandTotal: true,
  },
  {
    key: "Số dư giữ lại cuối kỳ",
    label: "Số dư HOLD cuối kỳ",
    type: "money",
    width: 180,
    readOnly: true,
    showGrandTotal: true,
    cellClassName: "font-extrabold text-rose-700 bg-rose-50/40",
  },
  {
    key: "Tổng tiền thanh toán",
    label: "Tổng tiền thanh toán trong tháng",
    type: "money",
    width: 215,
    readOnly: true,
    showGrandTotal: true,
    cellClassName: "font-extrabold text-emerald-700 bg-emerald-50/40",
  },
  {
    key: "Chênh lệch đối soát Gross Pay",
    label: "Chênh lệch Gross Pay",
    type: "money",
    width: 175,
    readOnly: true,
    showGrandTotal: true,
  },
];

const ALL_BUSINESS_UNITS = "__ALL_BUSINESS_UNITS__";

const SUMMARY_MONEY_KEYS: Array<keyof PayrollBuMonthSummaryRow> = [
  "Tổng chi phí Gross Pay",
  "Thanh toán lương",
  "Giữ lại phát sinh",
  "Số dư giữ lại đầu kỳ",
  "Thanh toán HOLD",
  "CANCEL HOLD",
  "BONUS",
  "Số dư giữ lại cuối kỳ",
  "Tổng tiền thanh toán",
  "Chênh lệch đối soát Gross Pay",
];

const formatMoney = (value: number): string =>
  new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));

export function BulkPaymentAnalytics({
  sheet1Rows,
  holdRows,
  bankRows,
  globalMonth,
}: BulkPaymentAnalyticsProps) {
  const [selectedBusiness, setSelectedBusiness] = useState(
    ALL_BUSINESS_UNITS,
  );
  const analytics: BulkPaymentAnalyticsResult = useMemo(
    () =>
      buildBulkPaymentAnalytics({
        sheet1Rows,
        holdRows,
        bankRows,
        globalMonth,
      }),
    [bankRows, globalMonth, holdRows, sheet1Rows],
  );
  const effectiveSelectedBusiness =
    selectedBusiness === ALL_BUSINESS_UNITS ||
    analytics.businessUnits.includes(selectedBusiness)
      ? selectedBusiness
      : ALL_BUSINESS_UNITS;

  const filteredRows = useMemo(
    () =>
      effectiveSelectedBusiness === ALL_BUSINESS_UNITS
        ? analytics.summaryRows
        : analytics.summaryRows.filter(
            (row) => row.BU === effectiveSelectedBusiness,
          ),
    [analytics.summaryRows, effectiveSelectedBusiness],
  );

  const summaryTotals = useMemo(() => {
    const totals = Object.fromEntries(
      SUMMARY_MONEY_KEYS.map((key) => [key, 0]),
    ) as Record<(typeof SUMMARY_MONEY_KEYS)[number], number>;
    filteredRows.forEach((row) => {
      SUMMARY_MONEY_KEYS.forEach((key) => {
        totals[key] += Number(row[key] || 0);
      });
    });
    return totals;
  }, [filteredRows]);

  const kpis = [
    {
      label: "Tổng chi phí Gross Pay",
      value: summaryTotals["Tổng chi phí Gross Pay"],
      tone: "text-slate-900",
    },
    {
      label: "Tổng tiền thanh toán",
      value: summaryTotals["Tổng tiền thanh toán"],
      tone: "text-emerald-700",
    },
    {
      label: "Giữ lại phát sinh",
      value: summaryTotals["Giữ lại phát sinh"],
      tone: "text-amber-700",
    },
    {
      label: "Thanh toán HOLD",
      value: summaryTotals["Thanh toán HOLD"],
      tone: "text-sky-700",
    },
    {
      label: "Số dư HOLD cuối kỳ",
      value: summaryTotals["Số dư giữ lại cuối kỳ"],
      tone: "text-rose-700",
    },
  ];

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden border border-slate-300 bg-white">
      <div className="shrink-0 border-b border-slate-300 bg-[#FAF9F6]">
        <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-b border-slate-300 px-3 py-2">
          <div className="min-w-0">
            <div className="truncate text-[10px] font-black uppercase tracking-[0.13em] text-slate-800">
              ANALYS — Tổng hợp thanh toán theo BU
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
              <span>Tháng báo cáo theo card Sidebar</span>
              <span className="font-mono text-[11px] font-black text-[#781D1D]">
                {analytics.currentPeriod}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="whitespace-nowrap text-[9px] font-extrabold uppercase tracking-wider text-slate-600">
              BU theo dõi
            </label>
            <Select
              value={effectiveSelectedBusiness}
              onValueChange={setSelectedBusiness}
            >
              <SelectTrigger className="h-8 w-[180px] rounded-none border-slate-300 bg-white text-[10px] font-bold">
                <SelectValue placeholder="Chọn BU" />
              </SelectTrigger>
              <SelectContent className="border-slate-300 bg-white">
                <SelectItem value={ALL_BUSINESS_UNITS}>
                  Tất cả BU
                </SelectItem>
                {analytics.businessUnits.map((business) => (
                  <SelectItem key={business} value={business}>
                    {business}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-slate-300 bg-white sm:grid-cols-3 xl:grid-cols-5">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="min-w-0 px-3 py-2">
              <div className="truncate text-[8px] font-bold uppercase tracking-wider text-slate-500">
                {kpi.label}
              </div>
              <div
                className={`mt-0.5 truncate font-mono text-[12px] font-black ${kpi.tone}`}
                title={formatMoney(kpi.value)}
              >
                {formatMoney(kpi.value)}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-300 px-3 py-1.5 text-[8px] font-semibold text-slate-500">
          <span>
            Tổng thanh toán = Thanh toán lương + Thanh toán HOLD + BONUS
          </span>
          <span>
            Số dư HOLD cuối kỳ = Số dư đầu kỳ + Giữ lại phát sinh − Thanh toán HOLD + CANCEL
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <DataTable
          columns={SUMMARY_COLUMNS}
          data={filteredRows}
          isEditable={false}
          storageKey="analys_bulkpayment_summary_v4"
          showFooter={true}
          showPagination={true}
          defaultItemsPerPage={50}
          stickyHeader={true}
          striped={true}
          headerClassName="bg-[#FAF9F6] text-slate-800 border-slate-300 font-bold text-[9px] uppercase tracking-wider text-center"
          footerClassName="bg-[#FAF9F6] text-slate-800 border-t border-slate-300 font-bold text-[10px]"
        />
      </div>
    </div>
  );
}
