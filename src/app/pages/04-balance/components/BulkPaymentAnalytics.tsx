import { useMemo } from "react";
import { DataTable, type Column } from "../../../components/DataTable";
import { type BulkPaymentAnalyticsResult } from "../../../lib/utils/bulk-payment-analytics";

interface BulkPaymentAnalyticsProps {
  analytics: BulkPaymentAnalyticsResult;
  selectedBusiness: string;
  allBusinessUnitsValue: string;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
}

const CONTEXT_GROUP = "Ngữ cảnh";
const PAYMENT_GROUP = "Chi phí & thanh toán";
const ADJUSTMENT_GROUP = "Điều chỉnh trong kỳ";
const BALANCE_GROUP = "Số dư & đối soát";

const CONTEXT_GROUP_STYLE =
  "!bg-[#EEE9EC] !text-[#61575C] border-slate-300 tracking-[0.12em]";
const PAYMENT_GROUP_STYLE =
  "!bg-[#F1EDEE] !text-[#554C51] border-slate-300 tracking-[0.12em]";
const ADJUSTMENT_GROUP_STYLE =
  "!bg-[#F1E6E7] !text-[#781D1D] border-slate-300 tracking-[0.12em]";
const BALANCE_GROUP_STYLE =
  "!bg-[#EEE9EC] !text-[#61575C] border-slate-300 tracking-[0.12em]";

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
    key: "Tháng phát sinh",
    label: "Tháng phát sinh",
    group: CONTEXT_GROUP,
    groupHeaderClassName: CONTEXT_GROUP_STYLE,
    type: "text",
    width: 108,
    align: "center",
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
    key: "Tổng chi phí Gross Pay",
    label: "Gross Pay",
    group: PAYMENT_GROUP,
    groupHeaderClassName: PAYMENT_GROUP_STYLE,
    type: "money",
    width: 148,
    align: "right",
    readOnly: true,
    showGrandTotal: true,
  },
  {
    key: "Thanh toán lương",
    label: "Thanh toán lương",
    group: PAYMENT_GROUP,
    groupHeaderClassName: PAYMENT_GROUP_STYLE,
    type: "money",
    width: 148,
    align: "right",
    readOnly: true,
    showGrandTotal: true,
  },
  {
    key: "Số dư giữ lại đầu kỳ",
    label: "Số dư HOLD đầu kỳ",
    group: PAYMENT_GROUP,
    groupHeaderClassName: PAYMENT_GROUP_STYLE,
    type: "money",
    width: 148,
    align: "right",
    readOnly: true,
    showGrandTotal: true,
  },
  {
    key: "HOLD",
    label: "HOLD",
    group: ADJUSTMENT_GROUP,
    groupHeaderClassName: ADJUSTMENT_GROUP_STYLE,
    type: "money",
    width: 112,
    align: "right",
    headerClassName: "!bg-[#FFF5DA] !text-[#8A5A00]",
    cellClassName: "font-bold text-[#8A5A00] bg-[#FFFBEE]",
    readOnly: true,
    showGrandTotal: true,
  },
  {
    key: "ADD",
    label: "ADD",
    group: ADJUSTMENT_GROUP,
    groupHeaderClassName: ADJUSTMENT_GROUP_STYLE,
    type: "money",
    width: 112,
    align: "right",
    headerClassName: "!bg-[#EAF7FB] !text-[#176B87]",
    cellClassName: "font-bold text-[#176B87] bg-[#F2FAFC]",
    readOnly: true,
    showGrandTotal: true,
  },
  {
    key: "CANCEL",
    label: "CANCEL",
    group: ADJUSTMENT_GROUP,
    groupHeaderClassName: ADJUSTMENT_GROUP_STYLE,
    type: "money",
    width: 112,
    align: "right",
    headerClassName: "!bg-[#FDECEF] !text-[#A51E36]",
    cellClassName: "font-bold text-[#A51E36] bg-[#FFF5F6]",
    readOnly: true,
    showGrandTotal: true,
  },
  {
    key: "BONUS",
    label: "BONUS",
    group: ADJUSTMENT_GROUP,
    groupHeaderClassName: ADJUSTMENT_GROUP_STYLE,
    type: "money",
    width: 112,
    align: "right",
    headerClassName: "!bg-[#F2EEF5] !text-[#694D72]",
    cellClassName: "font-bold text-[#694D72] bg-[#FAF7FB]",
    readOnly: true,
    showGrandTotal: true,
  },
  {
    key: "Số dư giữ lại cuối kỳ",
    label: "Số dư HOLD cuối kỳ",
    group: BALANCE_GROUP,
    groupHeaderClassName: BALANCE_GROUP_STYLE,
    type: "money",
    width: 154,
    align: "right",
    readOnly: true,
    showGrandTotal: true,
    cellClassName: "font-extrabold text-[#A51E36] bg-[#FFF7F8]",
  },
  {
    key: "Tổng tiền thanh toán",
    label: "Tổng tiền thanh toán",
    group: BALANCE_GROUP,
    groupHeaderClassName: BALANCE_GROUP_STYLE,
    type: "money",
    width: 168,
    align: "right",
    readOnly: true,
    showGrandTotal: true,
    cellClassName: "font-extrabold text-[#16734A] bg-[#F3FAF6]",
  },
  {
    key: "Chênh lệch đối soát Gross Pay",
    label: "Chênh lệch Gross Pay",
    group: BALANCE_GROUP,
    groupHeaderClassName: BALANCE_GROUP_STYLE,
    type: "money",
    width: 148,
    align: "right",
    readOnly: true,
    showGrandTotal: true,
  },
];

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

  const filteredRows = useMemo(
    () => {
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
    },
    [
      allBusinessUnitsValue,
      analytics.summaryRows,
      effectiveSelectedBusiness,
    ],
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden border border-slate-300 bg-white">
      <div className="min-h-0 flex-1 overflow-hidden">
        <DataTable
          key={`${analytics.currentPeriod}|${effectiveSelectedBusiness}`}
          columns={SUMMARY_COLUMNS}
          data={filteredRows}
          isEditable={false}
          externalSearchTerm={searchTerm}
          onExternalSearchChange={onSearchTermChange}
          storageKey="analys_bulkpayment_summary_v7"
          showFooter={true}
          showPagination={true}
          defaultItemsPerPage={50}
          rowHeight={38}
          stickyHeader={true}
          stickyFirstColumn={true}
          striped={true}
          ignoreSavedHiddenColumns={true}
          ignoreSavedPagination={true}
          headerClassName="bg-[#FAF9F6] text-slate-800 border-slate-300 font-bold text-[9px] uppercase tracking-[0.08em] text-center"
          footerClassName="bg-[#ECE5E8] text-slate-800 border-t border-slate-400 font-extrabold text-[10px]"
        />
      </div>
    </div>
  );
}
