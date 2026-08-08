import { useCallback, useMemo, useState } from "react";
import { Download, TableProperties } from "lucide-react";
import * as XLSX from "xlsx";
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

const stripInternalId = <T extends { id: string }>(row: T): Omit<T, "id"> => {
  const exportedRow = { ...row } as Partial<T>;
  delete exportedRow.id;
  return exportedRow as Omit<T, "id">;
};

const DETAIL_COLUMNS: Column[] = [
  { key: "STT", label: "STT", type: "number", width: 62, readOnly: true },
  {
    key: "Mã nhân viên",
    label: "Mã nhân viên",
    type: "text",
    width: 130,
    readOnly: true,
  },
  {
    key: "Họ và tên",
    label: "Họ và tên",
    type: "text",
    width: 190,
    readOnly: true,
  },
  { key: "L07", label: "L07", type: "text", width: 135, readOnly: true },
  { key: "BU", label: "BU", type: "text", width: 90, readOnly: true },
  {
    key: "Tháng báo cáo",
    label: "Tháng báo cáo",
    type: "text",
    width: 125,
    readOnly: true,
  },
  {
    key: "Tháng phát sinh",
    label: "Tháng phát sinh",
    type: "text",
    width: 125,
    readOnly: true,
  },
  {
    key: "Nghiệp vụ kỳ báo cáo",
    label: "Nghiệp vụ kỳ báo cáo",
    type: "text",
    width: 180,
    readOnly: true,
  },
  {
    key: "Lương phải trả kỳ báo cáo",
    label: "Lương phải trả kỳ báo cáo",
    type: "money",
    width: 190,
    readOnly: true,
  },
  {
    key: "Đã trả lương kỳ báo cáo",
    label: "Đã trả lương kỳ báo cáo",
    type: "money",
    width: 190,
    readOnly: true,
  },
  {
    key: "Giữ lại phát sinh trong kỳ",
    label: "Giữ lại phát sinh trong kỳ",
    type: "money",
    width: 185,
    readOnly: true,
  },
  {
    key: "Giữ lại chuyển sang",
    label: "Giữ lại chuyển sang",
    type: "money",
    width: 175,
    readOnly: true,
  },
  {
    key: "ADD trong kỳ",
    label: "ADD trong kỳ",
    type: "money",
    width: 145,
    readOnly: true,
    cellClassName: "font-extrabold text-emerald-700 bg-emerald-50/40",
  },
  {
    key: "CANCEL trong kỳ",
    label: "CANCEL trong kỳ",
    type: "money",
    width: 155,
    readOnly: true,
    cellClassName: "font-extrabold text-amber-700 bg-amber-50/40",
  },
  {
    key: "BONUS trong kỳ",
    label: "BONUS trong kỳ",
    type: "money",
    width: 150,
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
    key: "Tổng thực trả trong kỳ",
    label: "TOTAL PAYMENT kỳ báo cáo",
    type: "money",
    width: 190,
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
    key: "Ngày trả lương kỳ báo cáo",
    label: "Ngày trả lương kỳ báo cáo",
    type: "text",
    width: 195,
    readOnly: true,
  },
  {
    key: "Ngày trả khoản ADD",
    label: "Ngày trả khoản ADD",
    type: "text",
    width: 175,
    readOnly: true,
  },
  {
    key: "Trạng thái",
    label: "Trạng thái",
    type: "label",
    width: 160,
    readOnly: true,
    render: (value) => {
      const classes =
        value === "Đã hoàn tất"
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : value === "Chưa thanh toán"
            ? "bg-rose-50 text-rose-700 border-rose-200"
            : "bg-amber-50 text-amber-700 border-amber-200";
      return (
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${classes}`}
        >
          {value}
        </span>
      );
    },
  },
  {
    key: "Ghi chú",
    label: "Ghi chú",
    type: "text",
    width: 310,
    readOnly: true,
  },
];

const YEAR_COLUMNS: Column[] = [
  {
    key: "Tháng báo cáo",
    label: "Tháng báo cáo",
    type: "text",
    width: 125,
    readOnly: true,
  },
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
  const [activeTab, setActiveTab] = useState<"period" | "year">("period");
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

  const exportAnalytics = useCallback(() => {
    const detailRows = analytics.currentRows.map(stripInternalId);
    const yearRows = analytics.yearRows.map(stripInternalId);
    const detailSheet = XLSX.utils.json_to_sheet(detailRows);
    const yearSheet = XLSX.utils.json_to_sheet(yearRows);
    detailSheet["!cols"] = DETAIL_COLUMNS.map((column) => ({
      wch: Math.max(12, Math.round(Number(column.width || 120) / 8)),
    }));
    yearSheet["!cols"] = YEAR_COLUMNS.map((column) => ({
      wch: Math.max(12, Math.round(Number(column.width || 120) / 8)),
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, detailSheet, "ANALYS");
    XLSX.utils.book_append_sheet(workbook, yearSheet, "Tổng hợp");
    XLSX.writeFile(
      workbook,
      `ANALYS_BULKPAYMENT_${analytics.currentPeriod.replace(".", "_")}.xlsx`,
    );
  }, [analytics]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden p-3">
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden border border-slate-300 bg-white shadow-xs">
        <header className="flex min-h-[48px] shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-[#FAF9F6] px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <TableProperties className="h-4 w-4 shrink-0 text-[#781D1D]" />
            <div className="min-w-0">
              <h3 className="truncate text-[11px] font-extrabold uppercase tracking-[0.13em] text-slate-800">
                ANALYS
              </h3>
              <p className="truncate text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                {activeTab === "period"
                  ? `Theo dõi kỳ ${analytics.currentPeriod} · ${analytics.currentRows.length} dòng`
                  : `Tổng hợp ${analytics.year} · ${analytics.yearRows.length} dòng`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex border border-slate-300 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab("period")}
                className={`h-7 whitespace-nowrap px-3 text-[9px] font-extrabold uppercase tracking-wider transition-colors active:translate-y-px ${
                  activeTab === "period"
                    ? "bg-[#781D1D] text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Theo dõi kỳ
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("year")}
                className={`h-7 whitespace-nowrap px-3 text-[9px] font-extrabold uppercase tracking-wider transition-colors active:translate-y-px ${
                  activeTab === "year"
                    ? "bg-[#781D1D] text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Tổng hợp {analytics.year}
              </button>
            </div>
            <button
              type="button"
              onClick={exportAnalytics}
              className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap border border-emerald-300 bg-emerald-50 px-3 text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 transition-colors hover:bg-emerald-100 active:translate-y-px"
              title="Xuất ANALYS ra Excel"
            >
              <Download className="h-3.5 w-3.5" /> Xuất Excel
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          {activeTab === "period" ? (
            <DataTable
              columns={DETAIL_COLUMNS}
              data={analytics.currentRows}
              isEditable={false}
              storageKey="analys_bulkpayment_period_v2"
              showFooter={true}
              showPagination={true}
              defaultItemsPerPage={50}
              stickyHeader={true}
              striped={true}
              headerClassName="bg-[#FAF9F6] text-slate-800 border-slate-300 font-bold text-[9px] uppercase tracking-wider text-center"
              footerClassName="bg-[#FAF9F6] text-slate-800 border-t border-slate-300 font-bold text-[10px]"
            />
          ) : (
            <DataTable
              columns={YEAR_COLUMNS}
              data={analytics.yearRows}
              isEditable={false}
              storageKey="analys_bulkpayment_year_v2"
              showFooter={true}
              showPagination={true}
              defaultItemsPerPage={50}
              stickyHeader={true}
              striped={true}
              headerClassName="bg-[#FAF9F6] text-slate-800 border-slate-300 font-bold text-[9px] uppercase tracking-wider text-center"
              footerClassName="bg-[#FAF9F6] text-slate-800 border-t border-slate-300 font-bold text-[10px]"
            />
          )}
        </div>
      </section>
    </div>
  );
}
