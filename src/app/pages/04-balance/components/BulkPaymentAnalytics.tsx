import { useMemo } from "react";
import {
  ChevronDown,
  LayoutDashboard,
  RefreshCw,
  Search,
  Settings,
  Table2,
  Scale,
  X,
} from "lucide-react";
import { DataTable, type Column } from "../../../components/DataTable";
import { type BulkPaymentAnalyticsResult } from "../../../lib/utils/bulk-payment-analytics";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";

interface BulkPaymentAnalyticsProps {
  analytics: BulkPaymentAnalyticsResult;
  selectedBusiness: string;
  allBusinessUnitsValue: string;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onSelectedBusinessChange: (value: string) => void;
  searchVisible: boolean;
  onSearchVisibleChange: (visible: boolean) => void;
  onResetFilters: () => void;
  isBulkPaymentCardVisible: boolean;
  onToggleBulkPaymentCard: () => void;
  onViewChange: (view: "table" | "reconcile") => void;
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
    showGrandTotal: false,
    footerClassName: "!text-transparent",
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
    showGrandTotal: false,
    footerClassName: "!text-transparent",
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
  onSelectedBusinessChange,
  searchVisible,
  onSearchVisibleChange,
  onResetFilters,
  isBulkPaymentCardVisible,
  onToggleBulkPaymentCard,
  onViewChange,
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
    <div className="unified-table-frame flex h-full min-h-0 w-full flex-col overflow-hidden bg-white">
      <div className="unified-table-frame-header flex h-[54px] min-h-[54px] shrink-0 items-center justify-between gap-3 bg-primary/[0.035] px-3 py-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <button
            type="button"
            onClick={onToggleBulkPaymentCard}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-2xs transition-all active:scale-95 ${
              isBulkPaymentCardVisible
                ? "border-primary/20 bg-white text-primary hover:bg-primary/[0.05]"
                : "border-primary bg-primary text-white hover:brightness-95"
            }`}
            title={
              isBulkPaymentCardVisible
                ? "Ẩn card Bulk Payment"
                : "Hiện card Bulk Payment"
            }
            aria-label={
              isBulkPaymentCardVisible
                ? "Ẩn card Bulk Payment"
                : "Hiện card Bulk Payment"
            }
            aria-pressed={isBulkPaymentCardVisible}
          >
            <LayoutDashboard className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-5 items-center gap-2 text-[12px] font-black uppercase tracking-[0.18em] text-primary transition-colors hover:text-primary/80"
                  title="Chuyển bảng"
                >
                  <span>ANALYS</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Chuyển bảng
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onViewChange("table")}>
                  <Table2 className="h-4 w-4 shrink-0 text-slate-600" />
                  <span>Transaction</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewChange("reconcile")}>
                  <Scale className="h-4 w-4 shrink-0 text-sky-600" />
                  <span>Đối soát</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <p
              className="mt-0.5 max-w-[min(46vw,620px)] truncate text-[8.5px] font-semibold text-slate-500"
              title={`Theo dõi vòng đời HOLD · Kỳ ${analytics.currentPeriod} · ${filteredRows.length} dòng · Số dư ${formatAmount(periodSummary.remaining)}`}
            >
              Vòng đời HOLD · Kỳ {analytics.currentPeriod} · {filteredRows.length} dòng · Số dư {formatAmount(periodSummary.remaining)}
            </p>
          </div>
        </div>

        <div className="ml-auto flex min-w-0 shrink-0 items-center justify-end gap-1.5">
          {searchVisible && (
            <div className="relative hidden w-[clamp(150px,18vw,240px)] min-w-0 sm:block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                value={searchTerm}
                onChange={(event) => onSearchTermChange(event.target.value)}
                className="h-7 w-full rounded-full border border-primary/20 bg-white pl-8 pr-8 text-[9px] font-semibold text-slate-700 outline-none placeholder:text-slate-400 hover:border-primary/40 focus:border-primary"
                placeholder="Tìm BU hoặc tháng…"
                aria-label="Tìm kiếm trong bảng ANALYSIS"
              />
              <button
                type="button"
                onClick={() => {
                  onSearchTermChange("");
                  onSearchVisibleChange(false);
                }}
                className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-primary/[0.08] hover:text-primary"
                title="Đóng tìm kiếm"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <div className="relative">
            <select
              id="analys-business-filter"
              value={effectiveSelectedBusiness}
              onChange={(event) => onSelectedBusinessChange(event.target.value)}
              className="h-[27px] w-[112px] appearance-none rounded-full border border-primary/25 bg-white pl-3 pr-7 text-[12px] font-extrabold uppercase leading-none text-slate-700 outline-none transition-colors hover:border-primary/45 focus:border-primary"
              title="Chọn BU theo dõi trên bảng ANALYS"
            >
              <option value={allBusinessUnitsValue}>Tất cả BU</option>
              {analytics.businessUnits.map((business) => (
                <option key={business} value={business}>
                  {business}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-white text-slate-600 shadow-2xs transition-colors hover:border-primary/40 hover:bg-primary/[0.05] hover:text-primary"
                title="Cài đặt bảng ANALYSIS"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                Công cụ ANALYSIS
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => onSearchVisibleChange(!searchVisible)}
              >
                <Search className="h-4 w-4 shrink-0 text-primary" />
                <span>{searchVisible ? "Ẩn tìm kiếm" : "Tìm kiếm"}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onResetFilters}>
                <RefreshCw className="h-4 w-4 shrink-0 text-primary" />
                <span>Đặt lại bộ lọc</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  window.dispatchEvent(new Event("open-ui-settings"))
                }
              >
                <Settings className="h-4 w-4 shrink-0 text-slate-500" />
                <span>Cài đặt giao diện</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                Chuyển bảng
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onViewChange("table")}>
                <Table2 className="h-4 w-4 shrink-0 text-slate-600" />
                <span>Transaction</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewChange("reconcile")}>
                <Scale className="h-4 w-4 shrink-0 text-sky-600" />
                <span>Đối soát</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <DataTable
          key={`${analytics.currentPeriod}|${effectiveSelectedBusiness}`}
          columns={SUMMARY_COLUMNS}
          data={filteredRows}
          isEditable={false}
          externalSearchTerm={searchTerm}
          onExternalSearchChange={onSearchTermChange}
          storageKey="analys_hold_lifecycle_v9"
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
