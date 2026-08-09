import { useMemo } from "react";
import { History } from "lucide-react";
import { DataTable, type Column } from "../../../components/DataTable";
import { type BulkPaymentAnalyticsResult } from "../../../lib/utils/bulk-payment-analytics";

interface BulkPaymentAnalyticsProps {
  analytics: BulkPaymentAnalyticsResult;
  selectedBusiness: string;
  allBusinessUnitsValue: string;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
}

const CONTEXT_GROUP = "Thông tin kỳ theo dõi";
const ORIGIN_GROUP = "Nguồn gốc HOLD";
const MOVEMENT_GROUP = "Phát sinh tại kỳ báo cáo";
const HISTORY_GROUP = "Lịch sử thanh toán";
const RESULT_GROUP = "Kết quả đến cuối kỳ";

const CONTEXT_GROUP_STYLE =
  "!bg-[#EEE9EC] !text-[#61575C] border-slate-300 tracking-[0.12em]";
const ORIGIN_GROUP_STYLE =
  "!bg-[#FFF5DA] !text-[#8A5A00] border-slate-300 tracking-[0.12em]";
const MOVEMENT_GROUP_STYLE =
  "!bg-[#F1E6E7] !text-[#781D1D] border-slate-300 tracking-[0.12em]";
const HISTORY_GROUP_STYLE =
  "!bg-[#EAF7FB] !text-[#176B87] border-slate-300 tracking-[0.12em]";
const RESULT_GROUP_STYLE =
  "!bg-[#EAF5EF] !text-[#16734A] border-slate-300 tracking-[0.12em]";

const SUMMARY_COLUMNS: Column[] = [
  {
    key: "No.",
    label: "No.",
    group: CONTEXT_GROUP,
    groupHeaderClassName: CONTEXT_GROUP_STYLE,
    type: "text",
    width: 52,
    align: "center",
    sortable: false,
    filterable: false,
    readOnly: true,
  },
  {
    key: "BU",
    label: "BU",
    group: CONTEXT_GROUP,
    groupHeaderClassName: CONTEXT_GROUP_STYLE,
    type: "text",
    width: 82,
    align: "left",
    cellClassName: "font-extrabold text-slate-700",
    readOnly: true,
  },
  {
    key: "Tháng HOLD",
    label: "Tháng phát sinh HOLD",
    group: CONTEXT_GROUP,
    groupHeaderClassName: CONTEXT_GROUP_STYLE,
    type: "text",
    width: 126,
    align: "center",
    cellClassName: "font-bold text-slate-700",
    readOnly: true,
  },
  {
    key: "Kỳ báo cáo",
    label: "Kỳ đang theo dõi",
    group: CONTEXT_GROUP,
    groupHeaderClassName: CONTEXT_GROUP_STYLE,
    type: "text",
    width: 116,
    align: "center",
    readOnly: true,
  },
  {
    key: "HOLD phát sinh",
    label: "Tổng HOLD phát sinh",
    group: ORIGIN_GROUP,
    groupHeaderClassName: ORIGIN_GROUP_STYLE,
    type: "money",
    width: 144,
    align: "right",
    headerClassName: "!bg-[#FFF5DA] !text-[#8A5A00]",
    cellClassName: "font-bold text-[#8A5A00] bg-[#FFFBEE]",
    readOnly: true,
    showGrandTotal: true,
  },
  {
    key: "Số dư HOLD đầu kỳ",
    label: "Số dư trước kỳ báo cáo",
    group: ORIGIN_GROUP,
    groupHeaderClassName: ORIGIN_GROUP_STYLE,
    type: "money",
    width: 154,
    align: "right",
    readOnly: true,
    showGrandTotal: true,
  },
  {
    key: "Thanh toán HOLD tại kỳ",
    label: "Thanh toán HOLD",
    group: MOVEMENT_GROUP,
    groupHeaderClassName: MOVEMENT_GROUP_STYLE,
    type: "money",
    width: 146,
    align: "right",
    headerClassName: "!bg-[#EAF7FB] !text-[#176B87]",
    cellClassName: "font-extrabold text-[#176B87] bg-[#F2FAFC]",
    readOnly: true,
    showGrandTotal: true,
  },
  {
    key: "Tháng thanh toán tại kỳ",
    label: "Thanh toán vào tháng",
    group: MOVEMENT_GROUP,
    groupHeaderClassName: MOVEMENT_GROUP_STYLE,
    type: "text",
    width: 132,
    align: "center",
    cellClassName: "font-bold text-[#176B87]",
    readOnly: true,
  },
  {
    key: "CANCEL tại kỳ",
    label: "CANCEL",
    group: MOVEMENT_GROUP,
    groupHeaderClassName: MOVEMENT_GROUP_STYLE,
    type: "money",
    width: 118,
    align: "right",
    headerClassName: "!bg-[#FDECEF] !text-[#A51E36]",
    cellClassName: "font-bold text-[#A51E36] bg-[#FFF5F6]",
    readOnly: true,
    showGrandTotal: true,
  },
  {
    key: "BONUS tại kỳ",
    label: "BONUS",
    group: MOVEMENT_GROUP,
    groupHeaderClassName: MOVEMENT_GROUP_STYLE,
    type: "money",
    width: 112,
    align: "right",
    headerClassName: "!bg-[#F2EEF5] !text-[#694D72]",
    cellClassName: "font-bold text-[#694D72] bg-[#FAF7FB]",
    readOnly: true,
    showGrandTotal: true,
  },
  {
    key: "Các tháng đã thanh toán",
    label: "Các tháng từng thanh toán HOLD",
    group: HISTORY_GROUP,
    groupHeaderClassName: HISTORY_GROUP_STYLE,
    type: "text",
    width: 188,
    align: "left",
    cellClassName: "font-semibold text-[#176B87]",
    readOnly: true,
  },
  {
    key: "Số dư HOLD còn lại",
    label: "Số dư HOLD còn lại",
    group: RESULT_GROUP,
    groupHeaderClassName: RESULT_GROUP_STYLE,
    type: "money",
    width: 154,
    align: "right",
    readOnly: true,
    showGrandTotal: true,
    cellClassName: "font-extrabold text-[#16734A] bg-[#F3FAF6]",
  },
  {
    key: "Diễn biến tại kỳ",
    label: "Diễn biến kỳ báo cáo",
    group: RESULT_GROUP,
    groupHeaderClassName: RESULT_GROUP_STYLE,
    type: "text",
    width: 166,
    align: "left",
    readOnly: true,
  },
  {
    key: "Trạng thái HOLD",
    label: "Trạng thái HOLD",
    group: RESULT_GROUP,
    groupHeaderClassName: RESULT_GROUP_STYLE,
    type: "text",
    width: 146,
    align: "left",
    cellClassName: "font-bold text-slate-700",
    readOnly: true,
  },
];

const formatAmount = (value: number) =>
  Math.round(value).toLocaleString("vi-VN");

export function BulkPaymentAnalytics({
  analytics,
  selectedBusiness,
  allBusinessUnitsValue,
  searchTerm,
  onSearchTermChange,
}: BulkPaymentAnalyticsProps) {
  const effectiveSelectedBusiness =
    selectedBusiness === allBusinessUnitsValue ||
    analytics.businessUnits.includes(selectedBusiness)
      ? selectedBusiness
      : allBusinessUnitsValue;

  const filteredRows = useMemo(() => {
    const rows =
      effectiveSelectedBusiness === allBusinessUnitsValue
        ? analytics.summaryRows
        : analytics.summaryRows.filter(
            (row) => row.BU === effectiveSelectedBusiness,
          );

    return rows.map((row, index) => ({
      ...row,
      "No.": index + 1,
    }));
  }, [
    allBusinessUnitsValue,
    analytics.summaryRows,
    effectiveSelectedBusiness,
  ]);

  const periodSummary = useMemo(
    () =>
      filteredRows.reduce(
        (summary, row) => {
          summary.paid += Number(row["Thanh toán HOLD tại kỳ"] || 0);
          summary.cancel += Number(row["CANCEL tại kỳ"] || 0);
          summary.remaining += Number(row["Số dư HOLD còn lại"] || 0);
          if (Number(row["Thanh toán HOLD tại kỳ"] || 0) > 0) {
            summary.paidOccurrenceMonths.add(String(row["Tháng HOLD"] || ""));
          }
          return summary;
        },
        {
          paid: 0,
          cancel: 0,
          remaining: 0,
          paidOccurrenceMonths: new Set<string>(),
        },
      ),
    [filteredRows],
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden border border-slate-300 bg-white">
      <div className="flex min-h-[48px] shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-primary/[0.035] px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm">
            <History className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[11px] font-black uppercase tracking-[0.14em] text-primary">
              ANALYSIS · Theo dõi vòng đời HOLD
            </h2>
            <p className="mt-0.5 text-[9px] font-semibold text-slate-500">
              Kỳ {analytics.currentPeriod}: thanh toán {formatAmount(periodSummary.paid)} cho HOLD của {periodSummary.paidOccurrenceMonths.size} tháng phát sinh · CANCEL {formatAmount(periodSummary.cancel)} · còn dư {formatAmount(periodSummary.remaining)}
            </p>
          </div>
        </div>
        <span className="hidden shrink-0 text-[8px] font-bold uppercase tracking-wider text-slate-400 xl:block">
          Mỗi dòng = 1 BU + 1 tháng phát sinh HOLD
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <DataTable
          key={`${analytics.currentPeriod}|${effectiveSelectedBusiness}`}
          columns={SUMMARY_COLUMNS}
          data={filteredRows}
          isEditable={false}
          externalSearchTerm={searchTerm}
          onExternalSearchChange={onSearchTermChange}
          storageKey="analys_hold_lifecycle_v8"
          showFooter={true}
          showPagination={true}
          defaultItemsPerPage={50}
          rowHeight={38}
          stickyHeader={true}
          stickyFirstColumn={false}
          striped={false}
          ignoreSavedHiddenColumns={true}
          ignoreSavedPagination={true}
          headerClassName="bg-[#FAF9F6] text-slate-800 border-slate-300 font-bold text-[9px] uppercase tracking-[0.08em] text-center"
          footerClassName="bg-[#ECE5E8] text-slate-800 border-t border-slate-400 font-extrabold text-[10px]"
        />
      </div>
    </div>
  );
}
