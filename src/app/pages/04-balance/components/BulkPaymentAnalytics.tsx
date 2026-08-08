import { useMemo } from "react";
import { DataTable, type Column } from "../../../components/DataTable";
import {
  buildBulkPaymentAnalytics,
  type BulkPaymentAnalyticsResult,
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
  { key: "L07", label: "L07", type: "text", width: 135, readOnly: true },
  { key: "BU", label: "BU", type: "text", width: 90, readOnly: true },
  {
    key: "Nghiệp vụ",
    label: "Nghiệp vụ",
    type: "text",
    width: 165,
    readOnly: true,
  },
  {
    key: "Lương phải trả",
    label: "Lương phải trả",
    type: "money",
    width: 165,
    readOnly: true,
  },
  {
    key: "Đã trả lương",
    label: "Đã trả lương",
    type: "money",
    width: 165,
    readOnly: true,
  },
  {
    key: "Giữ lại phát sinh",
    label: "Giữ lại phát sinh",
    type: "money",
    width: 165,
    readOnly: true,
  },
  {
    key: "Giữ lại chuyển sang",
    label: "Giữ lại chuyển sang",
    type: "money",
    width: 175,
    readOnly: true,
  },
  { key: "ADD", label: "ADD", type: "money", width: 130, readOnly: true },
  {
    key: "CANCEL",
    label: "CANCEL",
    type: "money",
    width: 130,
    readOnly: true,
  },
  {
    key: "BONUS",
    label: "BONUS",
    type: "money",
    width: 130,
    readOnly: true,
  },
  {
    key: "Còn số dư",
    label: "Còn số dư của tháng phát sinh",
    type: "money",
    width: 195,
    readOnly: true,
    cellClassName: "font-extrabold text-rose-700 bg-rose-50/40",
  },
  {
    key: "Tổng thực trả",
    label: "TOTAL PAYMENT",
    type: "money",
    width: 170,
    readOnly: true,
    cellClassName: "font-extrabold text-emerald-700 bg-emerald-50/40",
  },
  {
    key: "Tổng còn phải thanh toán",
    label: "Tổng còn phải thanh toán",
    type: "money",
    width: 190,
    readOnly: true,
    cellClassName: "font-extrabold text-rose-700 bg-rose-50/40",
  },
  {
    key: "Tỷ lệ lương đã trả",
    label: "Tỷ lệ lương đã trả",
    type: "label",
    width: 165,
    align: "right",
    readOnly: true,
    render: (value) => `${(Number(value || 0) * 100).toFixed(2)}%`,
  },
];

export function BulkPaymentAnalytics({
  sheet1Rows,
  holdRows,
  bankRows,
  globalMonth,
}: BulkPaymentAnalyticsProps) {
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

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white">
      <DataTable
        columns={SUMMARY_COLUMNS}
        data={analytics.yearRows}
        isEditable={false}
        storageKey="analys_bulkpayment_summary_v3"
        showFooter={true}
        showPagination={true}
        defaultItemsPerPage={50}
        stickyHeader={true}
        striped={true}
        headerClassName="bg-[#FAF9F6] text-slate-800 border-slate-300 font-bold text-[9px] uppercase tracking-wider text-center"
        footerClassName="bg-[#FAF9F6] text-slate-800 border-t border-slate-300 font-bold text-[10px]"
      />
    </div>
  );
}
