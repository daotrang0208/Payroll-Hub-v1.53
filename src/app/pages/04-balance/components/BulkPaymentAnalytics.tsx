import { useMemo } from "react";
import { DataTable, type Column } from "../../../components/DataTable";
import {
  type BulkPaymentAnalyticsResult,
} from "../../../lib/utils/bulk-payment-analytics";

interface BulkPaymentAnalyticsProps {
  analytics: BulkPaymentAnalyticsResult;
  selectedBusiness: string;
  allBusinessUnitsValue: string;
}

const SUMMARY_COLUMNS: Column[] = [
  {
    key: "No.",
    label: "No.",
    type: "text",
    width: 55,
    readOnly: true,
  },
  {
    key: "Tháng phát sinh",
    label: "Tháng phát sinh",
    type: "text",
    width: 115,
    readOnly: true,
  },
  { key: "BU", label: "BU", type: "text", width: 85, readOnly: true },
  {
    key: "Tổng chi phí Gross Pay",
    label: "Tổng chi phí Gross Pay",
    type: "money",
    width: 155,
    readOnly: true,
    showGrandTotal: true,
  },
  {
    key: "Thanh toán lương",
    label: "Thanh toán lương",
    type: "money",
    width: 150,
    readOnly: true,
    showGrandTotal: true,
  },
  {
    key: "Số dư giữ lại đầu kỳ",
    label: "Số dư HOLD đầu kỳ",
    type: "money",
    width: 155,
    readOnly: true,
    showGrandTotal: true,
  },
  {
    key: "HOLD",
    label: "HOLD",
    type: "money",
    width: 125,
    readOnly: true,
    showGrandTotal: true,
  },
  {
    key: "ADD",
    label: "ADD",
    type: "money",
    width: 125,
    readOnly: true,
    showGrandTotal: true,
  },
  {
    key: "CANCEL",
    label: "CANCEL",
    type: "money",
    width: 125,
    readOnly: true,
    showGrandTotal: true,
  },
  {
    key: "BONUS",
    label: "BONUS",
    type: "money",
    width: 125,
    readOnly: true,
    showGrandTotal: true,
  },
  {
    key: "Số dư giữ lại cuối kỳ",
    label: "Số dư HOLD cuối kỳ",
    type: "money",
    width: 160,
    readOnly: true,
    showGrandTotal: true,
    cellClassName: "font-extrabold text-rose-700 bg-rose-50/40",
  },
  {
    key: "Tổng tiền thanh toán",
    label: "Tổng tiền thanh toán trong tháng",
    type: "money",
    width: 180,
    readOnly: true,
    showGrandTotal: true,
    cellClassName: "font-extrabold text-emerald-700 bg-emerald-50/40",
  },
  {
    key: "Chênh lệch đối soát Gross Pay",
    label: "Chênh lệch Gross Pay",
    type: "money",
    width: 155,
    readOnly: true,
    showGrandTotal: true,
  },
];

export function BulkPaymentAnalytics({
  analytics,
  selectedBusiness,
  allBusinessUnitsValue,
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
          storageKey="analys_bulkpayment_summary_v6"
          showFooter={true}
          showPagination={true}
          defaultItemsPerPage={50}
          stickyHeader={true}
          stickyFirstColumn={true}
          striped={true}
          ignoreSavedHiddenColumns={true}
          headerClassName="bg-[#FAF9F6] text-slate-800 border-slate-300 font-bold text-[9px] uppercase tracking-wider text-center"
          footerClassName="bg-[#FAF9F6] text-slate-800 border-t border-slate-300 font-bold text-[10px]"
        />
      </div>
    </div>
  );
}
