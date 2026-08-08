import { useCallback, useMemo, useState } from "react";
import { CalendarDays, Download, Info, TableProperties } from "lucide-react";
import * as XLSX from "xlsx";
import { DataTable, type Column } from "../../../components/DataTable";
import { formatMoneyVND } from "../../../lib/utils/data-utils";
import {
  buildBulkPaymentAnalytics,
  type BulkPaymentAnalyticsResult,
  type PayrollTrackingTotals,
} from "../../../lib/utils/bulk-payment-analytics";

interface BulkPaymentAnalyticsProps {
  sheet1Rows: Record<string, unknown>[];
  holdRows: Record<string, unknown>[];
  bankRows: Record<string, unknown>[];
  globalMonth: string;
}

const money = (value: number): string => formatMoneyVND(value).replace(" ₫", "");

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
  {
    key: "Bộ phận",
    label: "Bộ phận",
    type: "text",
    width: 100,
    readOnly: true,
  },
  {
    key: "Tháng lương",
    label: "Tháng lương",
    type: "text",
    width: 110,
    readOnly: true,
  },
  {
    key: "Lương phải trả tháng này",
    label: "Lương phải trả tháng này",
    type: "money",
    width: 175,
    readOnly: true,
  },
  {
    key: "Đã trả lương tháng này",
    label: "Đã trả lương tháng này",
    type: "money",
    width: 175,
    readOnly: true,
  },
  {
    key: "Lương giữ lại tháng này",
    label: "Lương giữ lại tháng này",
    type: "money",
    width: 175,
    readOnly: true,
  },
  {
    key: "Lương giữ lại tháng trước chuyển sang",
    label: "Giữ lại tháng trước chuyển sang",
    type: "money",
    width: 205,
    readOnly: true,
  },
  {
    key: "Đã thanh toán lương giữ lại tháng trước",
    label: "Đã trả khoản giữ lại tháng trước",
    type: "money",
    width: 205,
    readOnly: true,
  },
  {
    key: "Còn giữ lại tháng trước",
    label: "Còn giữ lại tháng trước",
    type: "money",
    width: 175,
    readOnly: true,
  },
  {
    key: "Tổng thực trả trong tháng",
    label: "TOTAL PAYMENT (Tổng thực trả)",
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
    key: "Ngày trả lương tháng này",
    label: "Ngày trả lương tháng này",
    type: "text",
    width: 170,
    readOnly: true,
  },
  {
    key: "Ngày trả khoản giữ lại tháng trước",
    label: "Ngày trả khoản giữ lại tháng trước",
    type: "text",
    width: 215,
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
    width: 260,
    readOnly: true,
  },
];

const YEAR_COLUMNS: Column[] = [
  { key: "Tháng", label: "Tháng", type: "text", width: 100, readOnly: true },
  {
    key: "Lương phải trả",
    label: "Lương phải trả",
    type: "money",
    width: 165,
    readOnly: true,
  },
  {
    key: "Đã trả lương tháng",
    label: "Đã trả lương tháng",
    type: "money",
    width: 165,
    readOnly: true,
  },
  {
    key: "Giữ lại tháng",
    label: "Giữ lại tháng",
    type: "money",
    width: 150,
    readOnly: true,
  },
  {
    key: "Giữ lại tháng trước chuyển sang",
    label: "Giữ lại tháng trước chuyển sang",
    type: "money",
    width: 210,
    readOnly: true,
  },
  {
    key: "Đã trả khoản giữ lại tháng trước",
    label: "Đã trả khoản giữ lại tháng trước",
    type: "money",
    width: 210,
    readOnly: true,
  },
  {
    key: "Còn giữ lại tháng trước",
    label: "Còn giữ lại tháng trước",
    type: "money",
    width: 185,
    readOnly: true,
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
    key: "Tỷ lệ lương tháng đã trả",
    label: "Tỷ lệ lương tháng đã trả",
    type: "label",
    width: 175,
    align: "right",
    readOnly: true,
    render: (value) => `${(Number(value || 0) * 100).toFixed(2)}%`,
  },
];

const KPI_CONFIG: Array<{
  key: keyof PayrollTrackingTotals;
  label: string;
  tone: string;
}> = [
  {
    key: "Lương phải trả tháng này",
    label: "Lương phải trả tháng này",
    tone: "text-slate-800",
  },
  {
    key: "Đã trả lương tháng này",
    label: "Đã trả lương tháng này",
    tone: "text-emerald-700",
  },
  {
    key: "Lương giữ lại tháng này",
    label: "Giữ lại tháng này",
    tone: "text-rose-700",
  },
  {
    key: "Lương giữ lại tháng trước chuyển sang",
    label: "Giữ lại tháng trước chuyển sang",
    tone: "text-amber-700",
  },
  {
    key: "Đã thanh toán lương giữ lại tháng trước",
    label: "Đã trả giữ lại tháng trước",
    tone: "text-sky-700",
  },
  {
    key: "Còn giữ lại tháng trước",
    label: "Còn giữ lại tháng trước",
    tone: "text-rose-700",
  },
  {
    key: "Tổng thực trả trong tháng",
    label: "TOTAL PAYMENT",
    tone: "text-emerald-800",
  },
  {
    key: "Tổng còn phải thanh toán",
    label: "Tổng còn phải thanh toán",
    tone: "text-rose-800",
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

  const updatedDate = useMemo(
    () =>
      new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date()),
    [],
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
    XLSX.utils.book_append_sheet(workbook, detailSheet, "Theo dõi lương");
    XLSX.utils.book_append_sheet(workbook, yearSheet, "Tổng hợp 12 tháng");
    XLSX.writeFile(
      workbook,
      `ANALYS_BULKPAYMENT_${analytics.currentPeriod.replace(".", "_")}.xlsx`,
    );
  }, [analytics]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden p-3">
      <div className="shrink-0 border border-slate-200 bg-[#FFFEFA] shadow-xs">
        <div className="flex min-h-[58px] flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <TableProperties className="h-4 w-4 shrink-0 text-[#781D1D]" />
              <h3 className="truncate text-[12px] font-extrabold uppercase tracking-[0.13em] text-slate-800">
                ANALYS_BULKPAYMENT – Bảng theo dõi lương
              </h3>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
              <span>Kỳ theo dõi: {analytics.currentPeriod}</span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> Ngày cập nhật: {updatedDate}
              </span>
              <span>{analytics.currentRows.length} nhân viên</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab("period")}
                className={`h-7 px-3 text-[9px] font-extrabold uppercase tracking-wider transition-colors ${
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
                className={`h-7 px-3 text-[9px] font-extrabold uppercase tracking-wider transition-colors ${
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
              className="inline-flex h-8 items-center gap-1.5 border border-emerald-200 bg-emerald-50 px-3 text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 hover:bg-emerald-100"
              title="Xuất ANALYS_BULKPAYMENT ra Excel"
            >
              <Download className="h-3.5 w-3.5" /> Xuất Excel
            </button>
          </div>
        </div>

        <div className="flex items-start gap-2 border-b border-slate-200 bg-sky-50/60 px-4 py-2 text-[9px] font-semibold leading-relaxed text-sky-900">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            TOTAL PAYMENT được tính tự động = Đã trả lương tháng này + Đã trả
            khoản giữ lại tháng trước. Tổng còn phải thanh toán = Giữ lại tháng
            này + Còn giữ lại tháng trước. Code không lấy TOTAL PAYMENT có sẵn
            trong file.
          </span>
        </div>

        {activeTab === "period" && (
          <div className="grid grid-cols-2 gap-px bg-slate-200 sm:grid-cols-4 xl:grid-cols-8">
            {KPI_CONFIG.map((item) => (
              <div key={item.key} className="min-w-0 bg-white px-3 py-2.5">
                <div className="truncate text-[8px] font-bold uppercase tracking-wider text-slate-400">
                  {item.label}
                </div>
                <div
                  className={`mt-1 truncate font-mono text-[12px] font-black ${item.tone}`}
                  title={money(analytics.currentTotals[item.key])}
                >
                  {money(analytics.currentTotals[item.key])}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden border border-slate-300 bg-white">
        {activeTab === "period" ? (
          <DataTable
            columns={DETAIL_COLUMNS}
            data={analytics.currentRows}
            isEditable={false}
            storageKey="analys_bulkpayment_period"
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
            storageKey="analys_bulkpayment_year"
            showFooter={true}
            showPagination={false}
            stickyHeader={true}
            striped={true}
            headerClassName="bg-[#FAF9F6] text-slate-800 border-slate-300 font-bold text-[9px] uppercase tracking-wider text-center"
            footerClassName="bg-[#FAF9F6] text-slate-800 border-t border-slate-300 font-bold text-[10px]"
          />
        )}
      </div>
    </div>
  );
}
