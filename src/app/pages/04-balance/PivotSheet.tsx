/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, react-hooks/purity */
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import { Download, RefreshCw, FileSpreadsheet, Eye, Upload, SlidersHorizontal, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Trash2, Columns, Rows } from "lucide-react";
import { useAppData } from "../../lib/contexts/AppDataContext";
import { buildPivotFromAppData } from "../../lib/utils/pivot-utils";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

// ==========================================
// MAPPING DEFINITIONS & LOGIC FROM USER SPEC
// ==========================================

const rawCenterToMktMap: Record<string, string> = {
  "Ly Thai To": "BN0001.LTT", "Tu Son": "BN0002.TSN", "Pho Hue": "HN0001.PHY",
  "Thai Ha": "HN0002.THA", "Hoang Quoc Viet": "HN0003.HQV", "Lieu Giai": "HN0004.LGI",
  "Nguyen Van Linh": "HN0005.NVL", "Van Quan": "HN0007.VQN", "The Garden": "HN0010.MDH",
  "Nguyen Huu Tho": "HN0012.NHT", "Tan Mai": "HN0014.TMI", "Van Phu": "HN0015.VPU",
  "Phan Dinh Phung": "HN0016.PDP", "Ham Nghi": "HN0017.HNI", "Vu Tong Phan": "HN0018.VTP",
  "Nguyen Tuan": "HN0019.NTN", "Ngoai Giao Doan": "HN0021.NGD", "Mo Lao": "HN0022.NVO",
  "Linh Dam": "HN0023.LDM", "Times City": "HN0024.TCY", "Le Trong Tan": "HN0025.LTT",
  "Viet Hung": "HN0026.VHG", "Ocean Park": "HN0027.OPK", "Pham Van Dong": "HN0028.PVD",
  "Vu Pham Ham": "HN0029.VPH", "An Khanh": "HN0030.AKH", "An Hung": "HN0031.AHG",
  "Lac Long Quan": "HN0032.LLQ", "Dong Anh": "HN0033.DAH", "Hong Tien": "HN0034.HTN",
  "Ecopark": "HY0001.ECP", "Hai Phong": "Hai Phong", "Quang Ninh": "QN0001.HLG",
  "Vinh": "VIN001.CTG", "Vinh Phuc": "VP0001.PCT", "Thanh Hoa": "TH0001.TPU",
  "Thai Nguyen": "TN0001.LNQ", "Phu Tho": "PT0001.HVG", "NTW": "NTW"
};

const aeCodeToL07Map: Record<string, string> = {
  "Ngo Si Lien": "BN0001.LTT",
  "Tu Son": "BN0002.TSN",
  "Pho Hue Junior": "HN0001.PHY",
  "Pho Hue": "HN0001.PHY",
  "Thai Ha": "HN0002.THA",
  "Thai Ha (center Láng Hạ)": "HN0002.THA",
  "Thai Ha (center Lang Ha)": "HN0002.THA",
  "Hoang Quoc Viet": "HN0003.HQV",
  "Lieu Giai": "HN0004.LGI",
  "Nguyen Van Linh": "HN0005.NVL",
  "Van Quan": "HN0007.VQN",
  "My Dinh": "HN0010.MDH",
  "The Garden": "HN0010.MDH",
  "Hoang Mai": "HN0012.NHT",
  "Nguyen Huu Tho": "HN0012.NHT",
  "Tan Mai": "HN0014.TMI",
  "Van Phu": "HN0015.VPU",
  "Phan Dinh Phung": "HN0016.PDP",
  "Ham Nghi": "HN0017.HNI",
  "Vu Tong Phan": "HN0018.VTP",
  "Nguyen Tuan": "HN0019.NTN",
  "Ngoai Giao Doan": "HN0021.NGD",
  "Nguyen Van Loc": "HN0022.NVO",
  "Mo Lao": "HN0022.NVO",
  "Linh Dam": "HN0023.LDM",
  "TIMES CITY": "HN0024.TCY",
  "Le Trong Tan": "HN0025.LTT",
  "Viet Hung": "HN0026.VHG",
  "Ocepark": "HN0027.OPK",
  "Ocean Park": "HN0027.OPK",
  "Pham Van Dong": "HN0028.PVD",
  "Vu Pham Ham": "HN0029.VPH",
  "An Khanh": "HN0030.AKH",
  "An Hung": "HN0031.AHG",
  "Xuan Dieu (đổi thành Lạc Long Quân)": "HN0032.LLQ",
  "Xuan Dieu": "HN0032.LLQ",
  "Lac Long Quan": "HN0032.LLQ",
  "HN33.DAH": "HN0033.DAH",
  "Dong Anh": "HN0033.DAH",
  "HN34.HTN": "HN0034.HTN",
  "Hong Tien": "HN0034.HTN",
  "Ecopark": "HY0001.ECP",
  "Hai Phong": "MKT LOCAL NORTH_HP",
  "Hai Phong 1": "HP0001.LHP",
  "Hai Phong 2": "HP0002.HBT",
  "Hai Phong 3": "HP0003.VIN",
  "Ha Long": "QN0001.HLG",
  "Quang Ninh": "QN0001.HLG",
  "Vinh": "VIN001.CTG",
  "Vinh Phuc": "VP0001.PCT",
  "TH01.TPU": "TH0001.TPU",
  "Thanh Hoa": "TH0001.TPU",
  "TN01.LNQ": "TN0001.LNQ",
  "Thai Nguyen": "TN0001.LNQ",
  "PT01.HVG": "PT0001.HVG",
  "Phu Tho": "PT0001.HVG",
  "Apollo Advance -South": "AA",
  "ASP - HN": "HN0200.ASP",
  "MKT LOCAL NORTH": "MKT LOCAL NORTH",
  "Cambridge": "ZHN0000.GY",
  "MKT HP": "MKT LOCAL NORTH_HP",
  "MKT TN01.LNQ": "MKT LOCAL NORTH_TN",
  "MKT PT01.HVG": "MKT LOCAL NORTH_PT",
  "MKT TH01.TPU": "MKT LOCAL NORTH_TH",
  "NTW": "NTW",
  "Contest": "ZHN0000.GY"
};

function extractBankName(fileName: string, bankLabel?: string) {
  if (bankLabel) {
    const upperBank = bankLabel.toUpperCase();
    if (upperBank.includes("MKT")) return "MKT LOCAL";
  }
  const name = fileName.toUpperCase().replace(/\.[^/.]+$/, "");
  const tokens = name.replace(/[^A-Z0-9]/g, ' ').split(/\s+/);
  
  if (tokens.includes('MKT')) return 'MKT LOCAL';
  if (tokens.includes('TH')) return 'TH';
  if (tokens.includes('HP')) return 'HP';
  if (tokens.includes('TN')) return 'TN';
  if (tokens.includes('PT')) return 'PT';
  if (tokens.includes('NORTH')) return 'NORTH';
  
  return 'NORTH';
}

function processNorthLogic(rawCenter: string) {
  const cleaned = rawCenter ? String(rawCenter).trim() : "";
  let l07 = cleaned;

  for (const [key, value] of Object.entries(aeCodeToL07Map)) {
    if (key.toUpperCase() === cleaned.toUpperCase()) {
      l07 = value;
      break;
    }
  }

  if (l07 === cleaned) {
    const upperClean = cleaned.toUpperCase();
    if (upperClean.includes("THAI HA") || upperClean.includes("THÁI HÀ")) l07 = "HN0002.THA";
    else if (upperClean.includes("XUAN DIEU") || upperClean.includes("XUÂN DIỆU") || upperClean.includes("LAC LONG QUAN") || upperClean.includes("LẠC LONG QUÂN")) l07 = "HN0032.LLQ";
    else if (upperClean.includes("OCEAN PARK") || upperClean.includes("OCEPARK")) l07 = "HN0027.OPK";
  }

  let bu = "OTHER";
  if (l07 === "AA" || l07 === "ZHN0000.GY" || l07 === "HN0200.ASP" || l07.startsWith("HN") || l07.startsWith("BN") || l07.startsWith("HY") || l07.startsWith("QN") || l07.startsWith("VIN") || l07.startsWith("VP") || l07 === "MKT LOCAL NORTH") {
    bu = "AHN";
  } else if (l07.startsWith("HP") || l07.toUpperCase() === "HAI PHONG" || l07 === "MKT LOCAL NORTH_HP") {
    bu = "AHP";
  } else if (l07.startsWith("TN") || l07 === "MKT LOCAL NORTH_TN") {
    bu = "ATN";
  } else if (l07.startsWith("TH") || l07 === "MKT LOCAL NORTH_TH") {
    bu = "ATH";
  } else if (l07.startsWith("PT") || l07 === "MKT LOCAL NORTH_PT") {
    bu = "APT";
  }

  return { chargeToCenterMkt: "", l07, bu };
}

function processTimesheetMktLogic(inputData: { chargetocenterCode: string }) {
  const { chargetocenterCode } = inputData;
  const cleaned = chargetocenterCode ? String(chargetocenterCode).trim() : "";
  let chargeToCenterMkt = cleaned;

  for (const [key, value] of Object.entries(rawCenterToMktMap)) {
    if (key.toUpperCase() === cleaned.toUpperCase()) {
      chargeToCenterMkt = value;
      break;
    }
  }

  if (chargeToCenterMkt === cleaned) {
    const upperClean = cleaned.toUpperCase();
    if (upperClean.includes("THAI HA") || upperClean.includes("THÁI HÀ")) chargeToCenterMkt = "HN0002.THA";
    else if (upperClean.includes("XUAN DIEU") || upperClean.includes("XUÂN DIỆU") || upperClean.includes("LAC LONG QUAN") || upperClean.includes("LẠC LONG QUÂN")) chargeToCenterMkt = "HN0032.LLQ";
    else if (upperClean.includes("OCEAN PARK") || upperClean.includes("OCEPARK")) chargeToCenterMkt = "HN0027.OPK";
  }

  const l07 = chargeToCenterMkt;
  let bu = "OTHER";

  if (l07 === "AA" || l07 === "ZHN0000.GY" || l07 === "HN0200.ASP" || l07.startsWith("HN") || l07.startsWith("BN") || l07.startsWith("HY") || l07.startsWith("QN") || l07.startsWith("VIN") || l07.startsWith("VP")) {
    bu = "AHN";
  } else if (l07.startsWith("HP") || l07.toUpperCase() === "HAI PHONG") {
    bu = "AHP";
  } else if (l07.startsWith("TN") || l07 === "Thai Nguyen") {
    bu = "ATN";
  } else if (l07.startsWith("TH") || l07 === "Thanh Hoa") {
    bu = "ATH";
  } else if (l07.startsWith("PT") || l07 === "Phu Tho") {
    bu = "APT";
  }

  return { chargeToCenterMkt, l07, bu };
}

// ==========================================
// PIVOT SHEET COMPONENT
// ==========================================

function parseMonthFromFileName(fileName: string, globalMonth?: string): string | null {
  if (!fileName) return null;
  // Match patterns like 1.2026, 01.2026, 12.2026, or with dashes/slashes 01-2026
  const match = fileName.match(/\b(0?[1-9]|1[0-2])[./-](20\d{2})\b/);
  if (match) {
    const m = parseInt(match[1], 10);
    const y = parseInt(match[2], 10);
    return `${m < 10 ? "0" + m : m}.${y}`;
  }
  // Try backup pattern: Month name or single digits like T1.2026 or Thang 1
  const tMatch = fileName.match(/(Th\w*|T|Month\s*)(0?[1-9]|1[0-2])\b/i);
  if (tMatch) {
    const m = parseInt(tMatch[2], 10);
    const ref = globalMonth || "03.2026";
    const refParts = ref.split(".");
    const currentMonthNum = parseInt(refParts[0], 10) || 3;
    const currentYearNum = parseInt(refParts[1], 10) || 2026;
    let y = currentYearNum;
    if (m === 11 || m === 12) {
      y = 2025;
    } else if (m > currentMonthNum) {
      y = currentYearNum - 1;
    }
    return `${m < 10 ? "0" + m : m}.${y}`;
  }
  return null;
}

export function PivotSheet() {
  const { appData } = useAppData();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>(() => {
    try {
      const cached = localStorage.getItem("pivot_master_selected_month_filter");
      return cached || "ALL";
    } catch {
      return "ALL";
    }
  });

  const [groupedData, setGroupedData] = useState<Record<string, Record<string, Record<string, Record<string, number>>>>>(() => {
    try {
      const cached = localStorage.getItem("pivot_master_processed_data");
      if (cached) {
        const parsed = JSON.parse(cached);
        const filter = localStorage.getItem("pivot_master_selected_month_filter") || "ALL";
        if (parsed.filter === filter) {
          return parsed.groupedData || {};
        }
      }
    } catch (e) {
      console.warn("Error reading pivot cache", e);
    }
    return {};
  });

  const [typeColumns, setTypeColumns] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem("pivot_master_processed_data");
      if (cached) {
        const parsed = JSON.parse(cached);
        const filter = localStorage.getItem("pivot_master_selected_month_filter") || "ALL";
        if (parsed.filter === filter) {
          return parsed.typeColumns || [];
        }
      }
    } catch {
      // ignore cache error
    }
    return [];
  });

  const [diagnosticLogs, setDiagnosticLogs] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem("pivot_master_processed_data");
      if (cached) {
        const parsed = JSON.parse(cached);
        const filter = localStorage.getItem("pivot_master_selected_month_filter") || "ALL";
        if (parsed.filter === filter) {
          return parsed.diagnosticLogs || [];
        }
      }
    } catch {
      // ignore cache error
    }
    return [];
  });

  const [_sourceInfo, _setSourceInfo] = useState<string>(() => {
    try {
      const cached = localStorage.getItem("pivot_master_processed_data");
      if (cached) {
        const parsed = JSON.parse(cached);
        const filter = localStorage.getItem("pivot_master_selected_month_filter") || "ALL";
        if (parsed.filter === filter) {
          return parsed.sourceInfo || "";
        }
      }
    } catch {
      // ignore cache error
    }
    return "";
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPivotSheetVisible, setIsPivotSheetVisible] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hiddenColumns, setHiddenColumns] = useState<Record<string, boolean>>({});
  const [sortField] = useState<string | null>(null);
  const [sortDirection] = useState<"asc" | "desc">("asc");

  const uniqueMonths = useMemo(() => {
    const set = new Set<string>();

    const normalizeStr = (m: any) => {
      if (!m) return null;
      const str = String(m).trim();
      if (!str) return null;
      const match = str.match(/(?:THÁNG|THANG|T)?\s*(\d{1,2})[./\- ]\s*(\d{4})/i);
      if (match) {
        const mm = match[1].padStart(2, "0");
        const yyyy = match[2];
        return `${mm}.${yyyy}`;
      }
      const mOnly = str.match(/(?:THÁNG|THANG|T)?\s*(\d{1,2})\b/i);
      if (mOnly) {
        const mm = mOnly[1].padStart(2, "0");
        return `${mm}.2026`;
      }
      return str;
    };

    // 1. From Ae_Global_Inputs
    (appData.Ae_Global_Inputs || []).forEach((row) => {
      const m = row.month || parseMonthFromFileName(row.name || row.fileName || "", appData.globalMonth);
      const norm = normalizeStr(m);
      if (norm) set.add(norm);
    });

    // 2. From parsed Sheet1_AE
    (appData.Sheet1_AE?.data || []).forEach((r: any) => {
      const m = r["Tháng báo cáo"] || r["_fileMonth"] || r["Tháng"];
      const norm = normalizeStr(m);
      if (norm) set.add(norm);
    });

    // 3. From parsed Hold_AE
    (appData.Hold_AE?.data || []).forEach((r: any) => {
      const m = r["Tháng báo cáo"] || r["_fileMonth"] || r["Tháng phát sinh"];
      const norm = normalizeStr(m);
      if (norm) set.add(norm);
    });

    // 4. From current groupedData
    for (const bu in groupedData) {
      for (const l07 in groupedData[bu]) {
        for (const month in groupedData[bu][l07]) {
          const norm = normalizeStr(month);
          if (norm) set.add(norm);
        }
      }
    }

    if (set.size === 0 && appData.globalMonth) {
      const norm = normalizeStr(appData.globalMonth);
      if (norm) set.add(norm);
    }

    return Array.from(set).sort((a, b) => {
      const [ma, ya] = a.split(".").map(Number);
      const [mb, yb] = b.split(".").map(Number);
      if ((ya || 0) !== (yb || 0)) return (ya || 0) - (yb || 0);
      return (ma || 0) - (mb || 0);
    });
  }, [appData.Ae_Global_Inputs, appData.Sheet1_AE?.data, appData.Hold_AE?.data, appData.globalMonth, groupedData]);

  // Default value: Automatically set selectedMonthFilter to the month of the first file (or nearest month)
  useEffect(() => {
    if (uniqueMonths.length > 0) {
      if (!selectedMonthFilter || (selectedMonthFilter !== "ALL" && !uniqueMonths.includes(selectedMonthFilter))) {
        const defaultMonth = uniqueMonths[0];
        setSelectedMonthFilter(defaultMonth);
        try {
          localStorage.setItem("pivot_master_selected_month_filter", defaultMonth);
        } catch {
          // ignore
        }
      }
    }
  }, [uniqueMonths, selectedMonthFilter]);

  // Column Widths state & resize logic
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    try {
      const cached = localStorage.getItem("pivot_master_column_widths");
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return {
      no: 50,
      month: 90,
      business: 90,
      charge: 220,
      grandTotal: 140,
    };
  });

  const resizingColRef = useRef<{ colKey: string; startX: number; startWidth: number } | null>(null);

  const handleResizeStart = (e: React.MouseEvent, colKey: string, defaultW = 120) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = columnWidths[colKey] || defaultW;
    resizingColRef.current = { colKey, startX, startWidth };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingColRef.current) return;
      const deltaX = moveEvent.clientX - resizingColRef.current.startX;
      const newWidth = Math.max(45, resizingColRef.current.startWidth + deltaX);
      setColumnWidths(prev => {
        const next = { ...prev, [resizingColRef.current!.colKey]: newWidth };
        try {
          localStorage.setItem("pivot_master_column_widths", JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    };

    const handleMouseUp = () => {
      resizingColRef.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Cell editing state
  const [editingCell, setEditingCell] = useState<{
    bu: string;
    l07: string;
    month: string;
    field: string;
  } | null>(null);

  const [editValue, setEditValue] = useState<string>("");

  const handleStartEdit = (bu: string, l07: string, month: string, field: string, currentValue: any) => {
    setEditingCell({ bu, l07, month, field });
    setEditValue(currentValue === undefined || currentValue === null ? "" : String(currentValue));
  };

  const saveToCache = (newGroupedData: any, newTypeColumns = typeColumns) => {
    try {
      localStorage.setItem("pivot_master_processed_data", JSON.stringify({
        groupedData: newGroupedData,
        typeColumns: newTypeColumns,
        diagnosticLogs,
        sourceInfo: _sourceInfo,
        filter: selectedMonthFilter,
        updatedAt: Date.now()
      }));
    } catch (e) {
      console.warn("Failed saving pivot data to cache", e);
    }
  };

  const handleSaveEdit = () => {
    if (!editingCell) return;
    const { bu, l07, month, field } = editingCell;

    setGroupedData(prev => {
      const nextData = JSON.parse(JSON.stringify(prev));
      if (!nextData[bu] || !nextData[bu][l07] || !nextData[bu][l07][month]) return prev;

      if (field === "bu") {
        const newBu = editValue.trim().toUpperCase() || "UNKNOWN";
        if (newBu !== bu) {
          if (!nextData[newBu]) nextData[newBu] = {};
          if (!nextData[newBu][l07]) nextData[newBu][l07] = {};
          nextData[newBu][l07][month] = nextData[bu][l07][month];
          delete nextData[bu][l07][month];
          if (Object.keys(nextData[bu][l07]).length === 0) delete nextData[bu][l07];
          if (Object.keys(nextData[bu]).length === 0) delete nextData[bu];
        }
      } else if (field === "l07") {
        const newL07 = editValue.trim() || "UNKNOWN";
        if (newL07 !== l07) {
          if (!nextData[bu][newL07]) nextData[bu][newL07] = {};
          nextData[bu][newL07][month] = nextData[bu][l07][month];
          delete nextData[bu][l07][month];
          if (Object.keys(nextData[bu][l07]).length === 0) delete nextData[bu][l07];
        }
      } else if (field === "month") {
        const newMonth = editValue.trim() || "UNKNOWN";
        if (newMonth !== month) {
          nextData[bu][l07][newMonth] = nextData[bu][l07][month];
          delete nextData[bu][l07][month];
        }
      } else {
        const rawNum = editValue.replace(/,/g, "").trim();
        const numVal = parseFloat(rawNum);
        const finalVal = isNaN(numVal) ? 0 : numVal;
        nextData[bu][l07][month][field] = finalVal;
      }

      saveToCache(nextData);
      return nextData;
    });

    setEditingCell(null);
    setEditValue("");
    toast.success("Đã cập nhật dữ liệu ô Pivot Master");
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const handleAddRow = () => {
    const defaultBU = "AHN";
    const defaultL07 = `CENTER_${Date.now().toString().slice(-4)}`;
    const defaultMonth = selectedMonthFilter !== 'ALL' ? selectedMonthFilter : (appData.globalMonth || '03.2026');
    setGroupedData(prev => {
      const nextData = JSON.parse(JSON.stringify(prev));
      if (!nextData[defaultBU]) nextData[defaultBU] = {};
      if (!nextData[defaultBU][defaultL07]) nextData[defaultBU][defaultL07] = {};
      nextData[defaultBU][defaultL07][defaultMonth] = {};
      typeColumns.forEach(t => {
        nextData[defaultBU][defaultL07][defaultMonth][t] = 0;
      });
      saveToCache(nextData);
      return nextData;
    });
    toast.success(`Đã thêm dòng mới với Center/L07: ${defaultL07}`);
  };

  const handleAddColumn = () => {
    const colName = window.prompt("Nhập tên cột mới:");
    if (!colName) return;
    const trimmed = colName.trim();
    if (!trimmed) return;
    
    if (typeColumns.includes(trimmed)) {
      toast.error(`Cột "${trimmed}" đã tồn tại!`);
      return;
    }
    
    setTypeColumns(prev => {
      const next = [...prev, trimmed];
      try {
        const cached = localStorage.getItem("pivot_master_processed_data");
        if (cached) {
          const parsed = JSON.parse(cached);
          parsed.typeColumns = next;
          localStorage.setItem("pivot_master_processed_data", JSON.stringify(parsed));
        }
      } catch {
        // ignore
      }
      return next;
    });
    
    toast.success(`Đã thêm cột mới: ${trimmed}`);
  };

  const handleDeleteRow = (bu: string, l07: string, month: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa dòng ${bu} - ${l07} (Tháng ${month})?`)) {
      setGroupedData(prev => {
        const nextData = JSON.parse(JSON.stringify(prev));
        if (nextData[bu] && nextData[bu][l07] && nextData[bu][l07][month]) {
          delete nextData[bu][l07][month];
          if (Object.keys(nextData[bu][l07]).length === 0) delete nextData[bu][l07];
          if (Object.keys(nextData[bu]).length === 0) delete nextData[bu];
        }
        saveToCache(nextData);
        return nextData;
      });
      toast.success(`Đã xóa dòng ${bu} - ${l07}`);
    }
  };
  
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset to page 1 when rowsPerPage or groupedData changes
  useEffect(() => {
    setCurrentPage(1);
  }, [rowsPerPage, groupedData, typeColumns]);

  const processFileBuffers = useCallback(async (fileList: { name: string; bank?: string; buffer: ArrayBuffer; month: string }[]) => {
    const newGroupedData: Record<string, Record<string, Record<string, Record<string, number>>>> = {};
    const uniqueTypes = new Set<string>();
    const newLogs: any[] = [];

    for (const item of fileList) {
      try {
        const displayBankName = extractBankName(item.name, item.bank);
        let processType = (displayBankName === 'MKT LOCAL') ? "MKT LOCAL NORTH" : "NORTH";
        
        const workbook = XLSX.read(item.buffer, { type: "array" });
        let targetSheetName = "";

        const rosterSheet = workbook.SheetNames.find(n => 
          n.toUpperCase().includes('ROSTER') || n.toUpperCase().includes('Q_ROSTER')
        );

        if (processType === "MKT LOCAL NORTH" || rosterSheet) {
          processType = "MKT LOCAL NORTH";
          if (rosterSheet) {
            targetSheetName = rosterSheet;
          } else {
            // "KHÔNG MẶC ĐỊNH SHEET Ở VỊ TRÍ ĐẦU TIÊN CỦA FILE"
            continue;
          }
        } else {
          targetSheetName = workbook.SheetNames.find(n => 
            n.toUpperCase() === 'SHEET 1' || n.toUpperCase() === 'SHEET1' || n.toUpperCase() === 'INTERN' || n.toUpperCase() === 'REPORT'
          ) || workbook.SheetNames.find(n => n.toUpperCase().includes('DATA') || n.toUpperCase().includes('DỮ LIỆU')) || workbook.SheetNames[0];
        }

        const worksheet = workbook.Sheets[targetSheetName];
        if (!worksheet) continue;

        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        if (jsonData.length <= 1) continue;

        let headerRowIdx = 0;
        for (let r = 0; r < Math.min(15, jsonData.length); r++) {
          const row = jsonData[r];
          if (!row || row.length === 0) continue;
          const rowStr = row.join(' ').toUpperCase();
          if (rowStr.includes('CENTER') || rowStr.includes('CHARGE') || rowStr.includes('TYPE') || rowStr.includes('MÃ TT')) {
            headerRowIdx = r;
            break;
          }
        }

        const headers = jsonData[headerRowIdx];
        if (!headers) continue;

        if (processType === "NORTH") {
          const centerColIdx = headers.findIndex((h: any) => {
            if (!h) return false;
            const val = String(h).trim().toUpperCase();
            return val === 'CENTER' || val === 'CENTERS' || val === 'CENTER CODE' || val === 'MÃ TT' || val.includes('TRUNG TÂM');
          });

          const bankAccColIdx = headers.findIndex((h: any) => {
            if (!h) return false;
            const val = String(h).trim().toUpperCase();
            return val === 'BANK ACCOUNT NUMBER' || val.includes('BANK ACCOUNT');
          });

          if (centerColIdx === -1 || bankAccColIdx === -1) continue;

          const chargeCols: { index: number; label: string }[] = [];
          headers.forEach((h: any, idx: number) => {
            if (h && String(h).toUpperCase().includes('CHARGE')) {
              let label = String(h).toUpperCase().replace('CHARGE TO ', '').replace('CHARGE ', '').trim();
              if (label === '') label = 'OTHER';
              chargeCols.push({ index: idx, label });
              uniqueTypes.add(label);
            }
          });

          for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;

            const bankAccVal = row[bankAccColIdx];
            if (bankAccVal === undefined || bankAccVal === null || String(bankAccVal).trim() === "") {
              continue;
            }

            const rawCenter = row[centerColIdx];
            if (!rawCenter) continue;

            if (String(rawCenter).toUpperCase().includes("MKT")) {
              continue;
            }

            const mapped = processNorthLogic(String(rawCenter));
            const { bu, l07 } = mapped;

            if (!newGroupedData[bu]) newGroupedData[bu] = {};
            if (!newGroupedData[bu][l07]) newGroupedData[bu][l07] = {};
            if (!newGroupedData[bu][l07][item.month]) newGroupedData[bu][l07][item.month] = {};

            chargeCols.forEach(col => {
              const rawVal = row[col.index];
              let val = parseFloat(rawVal);
              if (isNaN(val)) val = 0;

              if (val === 0 && rawVal) {
                newLogs.push({ Source: "NORTH", File: item.name, RawCenter: rawCenter, Column: col.label, RawValue: rawVal });
              }

              if (!newGroupedData[bu][l07][item.month][col.label]) {
                newGroupedData[bu][l07][item.month][col.label] = 0;
              }
              newGroupedData[bu][l07][item.month][col.label] += val;
            });
          }
        } else if (processType === "MKT LOCAL NORTH") {
          const centerColIdx = headers.findIndex((h: any) => {
            if (!h) return false;
            const val = String(h).trim().toUpperCase();
            return val === 'CHARGE TO CENTER' || val === 'CHARGETOCENTERCODE' || val.includes('CHARGE TO CENTER');
          });
          const typeColIdx = headers.findIndex((h: any) => h && String(h).trim().toUpperCase() === 'TYPE');
          const durationColIdx = headers.findIndex((h: any) => h && String(h).trim().toUpperCase() === 'DURATION');

          if (centerColIdx === -1) continue;

          for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;

            const rawCenter = row[centerColIdx];
            if (!rawCenter) continue;

            let durationVal = (durationColIdx !== -1) ? parseFloat(row[durationColIdx]) : 0;
            if (isNaN(durationVal)) durationVal = 0;
            const calculatedSalary = durationVal * 24 * 20000;

            let typeVal = (typeColIdx !== -1 && row[typeColIdx]) ? String(row[typeColIdx]).trim().toUpperCase() : "UNSPECIFIED";
            if (typeVal === "") typeVal = "BLANK";
            uniqueTypes.add(typeVal);

            const mapped = processTimesheetMktLogic({ chargetocenterCode: String(rawCenter) });
            const { bu, l07 } = mapped;

            if (!newGroupedData[bu]) newGroupedData[bu] = {};
            if (!newGroupedData[bu][l07]) newGroupedData[bu][l07] = {};
            if (!newGroupedData[bu][l07][item.month]) newGroupedData[bu][l07][item.month] = {};

            if (!newGroupedData[bu][l07][item.month][typeVal]) {
              newGroupedData[bu][l07][item.month][typeVal] = 0;
            }
            newGroupedData[bu][l07][item.month][typeVal] += calculatedSalary;
          }
        }
      } catch (err) {
        console.error("Error processing file buffer:", item.name, err);
      }
    }

    // Cleanup UNSPECIFIED if 0
    let unspecifiedTotal = 0;
    for (const bu in newGroupedData) {
      for (const l07 in newGroupedData[bu]) {
        for (const month in newGroupedData[bu][l07]) {
          unspecifiedTotal += newGroupedData[bu][l07][month]["UNSPECIFIED"] || 0;
        }
      }
    }
    if (unspecifiedTotal === 0) {
      uniqueTypes.delete("UNSPECIFIED");
    }

    return {
      groupedData: newGroupedData,
      typeColumns: Array.from(uniqueTypes).sort(),
      logs: newLogs,
    };
  }, []);

  useEffect(() => {
    if (appData.globalMonth) {
      setSelectedMonthFilter(appData.globalMonth);
    }
  }, [appData.globalMonth]);

  const loadMasterData = useCallback(async (showToastMsg = false) => {
    const cachedStr = localStorage.getItem("pivot_master_processed_data");
    let hasCache = false;
    if (cachedStr) {
      try {
        const parsed = JSON.parse(cachedStr);
        if (parsed.groupedData && Object.keys(parsed.groupedData).length > 0 && parsed.filter === selectedMonthFilter) {
          hasCache = true;
        }
      } catch {
        // ignore cache parse error
      }
    }

    if (!hasCache) {
      setIsProcessing(true);
    }

    try {
      const masterRows = appData.Ae_Global_Inputs || [];
      const fileBuffers: { name: string; bank?: string; buffer: ArrayBuffer }[] = [];

      for (const row of masterRows) {
        const rowMonth = row.month || parseMonthFromFileName(row.name || "", appData.globalMonth) || appData.globalMonth || "03.2026";

        if (row.fileObj && row.fileObj instanceof File) {
          try {
            const buffer = await row.fileObj.arrayBuffer();
            fileBuffers.push({ name: row.fileName || row.fileObj.name, bank: row.bank, buffer, month: rowMonth });
          } catch (fileErr) {
            console.warn(`Không thể đọc file buffer cho file ${row.fileName || row.name}:`, fileErr);
          }
        } else if (row.buffer && row.buffer instanceof ArrayBuffer) {
          fileBuffers.push({ name: row.fileName || row.name, bank: row.bank, buffer: row.buffer, month: rowMonth });
        }
      }

      if (fileBuffers.length > 0) {
        const res = await processFileBuffers(fileBuffers);
        setGroupedData(res.groupedData);
        setTypeColumns(res.typeColumns);
        setDiagnosticLogs(res.logs);
        const infoStr = `Đồng bộ từ ${fileBuffers.length} file Master`;
        _setSourceInfo(infoStr);

        try {
          localStorage.setItem("pivot_master_processed_data", JSON.stringify({
            groupedData: res.groupedData,
            typeColumns: res.typeColumns,
            diagnosticLogs: res.logs,
            sourceInfo: infoStr,
            filter: selectedMonthFilter,
            updatedAt: Date.now()
          }));
        } catch {
          // ignore cache write error
        }

        if (showToastMsg) {
          toast.success(`Đã đồng bộ ${fileBuffers.length} file từ bảng Cài đặt & tải file (Master)`);
        }
      } else if (appData.Sheet1_AE?.data && appData.Sheet1_AE.data.length > 0) {
        // Fallback: build Pivot directly from verified Sheet1_AE / Hold_AE / Q_Roster in appData
        const filteredSheet1 = appData.Sheet1_AE.data || [];
        const filteredRoster = appData.Q_Roster || [];

        const res = buildPivotFromAppData(
          filteredSheet1,
          [],
          filteredRoster
        );
        setGroupedData(res.groupedData);
        setTypeColumns(res.typeColumns);
        setDiagnosticLogs([]);
        const infoStr = `Đồng bộ từ dữ liệu Sheet1 AE (${filteredSheet1.length} dòng)`;
        _setSourceInfo(infoStr);
        if (showToastMsg) {
          toast.success(`Đã đồng bộ Pivot Master từ dữ liệu Sheet1 AE`);
        }
      } else {
        setGroupedData({});
        setTypeColumns([]);
        setDiagnosticLogs([]);
        _setSourceInfo("");
        try {
          localStorage.removeItem("pivot_master_processed_data");
        } catch {
          // ignore
        }
        if (showToastMsg) {
          if (selectedMonthFilter !== "ALL") {
            toast.info(`Chưa có file nào khớp với tháng ${selectedMonthFilter} trong bảng Master`);
          } else {
            toast.info("Chưa có file nào trong bảng Cài đặt & tải file (Master)");
          }
        }
      }
    } catch (err) {
      console.error("Error loading master data:", err);
      if (showToastMsg) {
        toast.error("Lỗi khi xử lý dữ liệu từ bảng Master");
      }
    } finally {
      setIsProcessing(false);
    }
  }, [
    appData.Ae_Global_Inputs,
    appData.globalMonth,
    appData.Sheet1_AE?.data,
    appData.Q_Roster,
    selectedMonthFilter,
    processFileBuffers
  ]);

  useEffect(() => {
    loadMasterData(false);
  }, [loadMasterData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    try {
      const fileBuffers: { name: string; buffer: ArrayBuffer; month: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const buffer = await file.arrayBuffer();
          const fileMonth = parseMonthFromFileName(file.name, appData.globalMonth) || appData.globalMonth || "06.2026";
          fileBuffers.push({ name: file.name, buffer, month: fileMonth });
        } catch (fErr) {
          console.warn(`Lỗi khi đọc file ${file.name}:`, fErr);
        }
      }

      const res = await processFileBuffers(fileBuffers);
      setGroupedData(res.groupedData);
      setTypeColumns(res.typeColumns);
      setDiagnosticLogs(res.logs);
      const infoStr = `Tải trực tiếp từ ${fileBuffers.length} file vừa chọn`;
      _setSourceInfo(infoStr);
      try {
        localStorage.setItem("pivot_master_processed_data", JSON.stringify({
          groupedData: res.groupedData,
          typeColumns: res.typeColumns,
          diagnosticLogs: res.logs,
          sourceInfo: infoStr,
          updatedAt: Date.now()
        }));
      } catch {
        // ignore cache write error
      }
      toast.success(`Đã xử lý xong ${fileBuffers.length} file tải lên trực tiếp`);
    } catch (err) {
      console.error("Error processing manual upload:", err);
      toast.error("Lỗi khi xử lý các file vừa chọn");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDownloadDiagnosticCSV = () => {
    setIsSettingsOpen(false);
    if (diagnosticLogs.length === 0) {
      toast.info("Không có dòng log lỗi nào cần kiểm tra.");
      return;
    }

    const headers = ["Source", "File", "RawCenter", "Column", "RawValue"];
    const csvRows = [headers.join(",")];

    diagnosticLogs.forEach(log => {
      const row = [
        `"${log.Source || ""}"`,
        `"${log.File || ""}"`,
        `"${String(log.RawCenter || "").replace(/"/g, '""')}"`,
        `"${log.Column || ""}"`,
        `"${String(log.RawValue || "").replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `pivot-diagnostic-logs-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    setIsSettingsOpen(false);
    if (Object.keys(groupedData).length === 0) {
      toast.error("Không có dữ liệu để xuất Excel!");
      return;
    }

    const wsData: any[][] = [];
    const headers = ["No.", "Business", "L07", "Tháng", ...typeColumns, "TỔNG CỘNG"];
    wsData.push(headers);

    let rowId = 1;
    const grandTotals = new Array(typeColumns.length).fill(0);
    let superGrandTotal = 0;
    const sortedBUs = Object.keys(groupedData).sort();

    sortedBUs.forEach(bu => {
      const buTotals = new Array(typeColumns.length).fill(0);
      let buGrandTotal = 0;
      const l07s = Object.keys(groupedData[bu]).sort();

      l07s.forEach(l07 => {
        const months = Object.keys(groupedData[bu][l07]).sort();
        months.forEach(month => {
          if (selectedMonthFilter !== "ALL") {
            const normM = month.match(/(?:THÁNG|THANG|T)?\s*(\d{1,2})[./\- ]\s*(\d{4})/i);
            const mNorm = normM ? `${normM[1].padStart(2, "0")}.${normM[2]}` : month;
            if (mNorm !== selectedMonthFilter && month !== selectedMonthFilter) return;
          }
          
          let rowTotal = 0;
          const rowVals = typeColumns.map((type, idx) => {
            const val = groupedData[bu][l07][month][type] || 0;
            buTotals[idx] += val;
            grandTotals[idx] += val;
            rowTotal += val;
            return val;
          });
          buGrandTotal += rowTotal;
          superGrandTotal += rowTotal;

          wsData.push([rowId++, bu, l07, month, ...rowVals, rowTotal]);
        });
      });

      wsData.push(["", bu, `${bu} Total`, "", ...buTotals, buGrandTotal]);
    });

    wsData.push(["", "", "", "TỔNG CỘNG", ...grandTotals, superGrandTotal]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pivot_Data");
    XLSX.writeFile(wb, "Pivot_Salary_Report.xlsx");
    toast.success("Đã xuất báo cáo Excel thành công!");
  };

  let totalCenters = 0;
  let totalSalarySum = 0;
  const grandTotals = new Array(typeColumns.length).fill(0);
  let superGrandTotal = 0;

  const allFlatRows: Array<{
    globalRowId: number;
    month: string;
    bu: string;
    l07: string;
    values: number[];
    rowTotal: number;
  }> = [];

  let rIdx = 1;
  const currentSortedBUs = Object.keys(groupedData).sort();
  currentSortedBUs.forEach(bu => {
    const l07s = Object.keys(groupedData[bu]).sort();
    l07s.forEach(l07 => {
      const months = Object.keys(groupedData[bu][l07]).sort();
      months.forEach(month => {
        if (selectedMonthFilter !== "ALL") {
          const normM = month.match(/(?:THÁNG|THANG|T)?\s*(\d{1,2})[./\- ]\s*(\d{4})/i);
          const mNorm = normM ? `${normM[1].padStart(2, "0")}.${normM[2]}` : month;
          if (mNorm !== selectedMonthFilter && month !== selectedMonthFilter) return;
        }
        
        let rowTotal = 0;
        const values = typeColumns.map((type, idx) => {
          const val = groupedData[bu][l07][month][type] || 0;
          grandTotals[idx] += val;
          rowTotal += val;
          return val;
        });

        if (rowTotal === 0 && bu === "OTHER" && (l07 === "UNKNOWN" || !l07)) {
          return;
        }

        totalCenters++;
        superGrandTotal += rowTotal;
        totalSalarySum += rowTotal;

        allFlatRows.push({
          globalRowId: rIdx++,
          month,
          bu,
          l07,
          values,
          rowTotal
        });
      });
    });
  });

  // Sorting
  const sortedFlatRows = useMemo(() => {
    if (!sortField) return allFlatRows;
    return [...allFlatRows].sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;
      if (sortField === "no") {
        valA = a.globalRowId;
        valB = b.globalRowId;
      } else if (sortField === "month") {
        valA = a.month;
        valB = b.month;
      } else if (sortField === "bu") {
        valA = a.bu;
        valB = b.bu;
      } else if (sortField === "l07") {
        valA = a.l07;
        valB = b.l07;
      } else if (sortField === "rowTotal") {
        valA = a.rowTotal;
        valB = b.rowTotal;
      } else if (sortField.startsWith("type_")) {
        const typeName = sortField.replace("type_", "");
        const typeIdx = typeColumns.indexOf(typeName);
        if (typeIdx !== -1) {
          valA = a.values[typeIdx] || 0;
          valB = b.values[typeIdx] || 0;
        }
      }
      if (typeof valA === "string") {
        const cmp = valA.localeCompare(valB, 'vi');
        return sortDirection === "asc" ? cmp : -cmp;
      }
      return sortDirection === "asc" ? valA - valB : valB - valA;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupedData, typeColumns, sortField, sortDirection]);

  const totalRowsCount = sortedFlatRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRowsCount / rowsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = totalRowsCount === 0 ? 0 : (validCurrentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalRowsCount);
  const paginatedRows = sortedFlatRows.slice(startIndex, endIndex);

  const renderRows = () => {
    if (paginatedRows.length === 0) {
      return (
        <tr>
          <td colSpan={6 + typeColumns.length} className="py-12 text-center text-slate-400 text-sm bg-white">
            <span>Chưa có dữ liệu. Vui lòng tải file ở bảng <span className="font-semibold text-slate-600">Cài đặt & Tải file (Master)</span> và nhấn <span className="font-semibold text-slate-600">Xử lý dữ liệu</span>.</span>
          </td>
        </tr>
      );
    }

    return paginatedRows.map((item, idx) => {
      const isEditingThisRow = editingCell?.bu === item.bu && editingCell?.l07 === item.l07 && editingCell?.month === item.month;

      return (
        <tr 
          key={`${item.bu}-${item.l07}-${item.month}`} 
          className={`transition-colors border-b border-[#e7dbdc] ${idx % 2 === 0 ? "bg-white" : "bg-[#FAF9F6]/40"} hover:bg-amber-50/40`}
        >
          {!hiddenColumns.no && (
            <td 
              style={{ width: columnWidths["no"] || 50, minWidth: columnWidths["no"] || 50, maxWidth: columnWidths["no"] || 50 }}
              className="py-2 px-2 text-center border-r border-b border-[#e7dbdc] font-mono text-slate-600 text-xs relative group/no"
            >
              <span>{item.globalRowId}</span>
              <button
                onClick={() => handleDeleteRow(item.bu, item.l07, item.month)}
                className="opacity-0 group-hover/no:opacity-100 absolute right-1 top-1/2 -translate-y-1/2 text-rose-500 hover:text-rose-700 transition-opacity p-0.5 cursor-pointer"
                title="Xóa dòng"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </td>
          )}
          {!hiddenColumns.business && (
            <td 
              style={{ width: columnWidths["business"] || 90, minWidth: columnWidths["business"] || 90, maxWidth: columnWidths["business"] || 90 }}
              onDoubleClick={() => handleStartEdit(item.bu, item.l07, item.month, "bu", item.bu)}
              className="py-2 px-2.5 text-center border-r border-b border-[#e7dbdc] font-bold text-slate-800 text-xs bg-slate-50/50 cursor-pointer hover:bg-amber-100/60 transition-colors"
              title="Nhấp đúp để sửa Business"
            >
              {isEditingThisRow && editingCell.field === "bu" ? (
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit();
                    if (e.key === "Escape") handleCancelEdit();
                  }}
                  onBlur={handleSaveEdit}
                  className="w-full bg-amber-50 border border-amber-400 font-bold text-slate-900 text-xs px-1.5 py-0.5 rounded outline-none focus:ring-1 focus:ring-amber-500 text-center"
                />
              ) : (
                <span>{item.bu}</span>
              )}
            </td>
          )}
          {!hiddenColumns.charge && (
            <td 
              style={{ width: columnWidths["charge"] || 220, minWidth: columnWidths["charge"] || 220, maxWidth: columnWidths["charge"] || 220 }}
              onDoubleClick={() => handleStartEdit(item.bu, item.l07, item.month, "l07", item.l07)}
              className="py-2 px-2.5 text-left border-r border-b border-[#e7dbdc] text-slate-800 font-medium truncate text-xs cursor-pointer hover:bg-amber-100/60 transition-colors"
              title={`Nhấp đúp để sửa L07 (${item.l07})`}
            >
              {isEditingThisRow && editingCell.field === "l07" ? (
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit();
                    if (e.key === "Escape") handleCancelEdit();
                  }}
                  onBlur={handleSaveEdit}
                  className="w-full bg-amber-50 border border-amber-400 font-medium text-slate-900 text-xs px-1.5 py-0.5 rounded outline-none focus:ring-1 focus:ring-amber-500"
                />
              ) : (
                <span>{item.l07}</span>
              )}
            </td>
          )}
          {!hiddenColumns.month && (
            <td 
              style={{ width: columnWidths["month"] || 90, minWidth: columnWidths["month"] || 90, maxWidth: columnWidths["month"] || 90 }}
              onDoubleClick={() => handleStartEdit(item.bu, item.l07, item.month, "month", item.month)}
              className="py-2 px-2.5 text-center border-r border-b border-[#e7dbdc] font-bold text-slate-800 text-xs bg-slate-50/50 cursor-pointer hover:bg-amber-100/60 transition-colors"
              title="Nhấp đúp để sửa Tháng"
            >
              {isEditingThisRow && editingCell.field === "month" ? (
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit();
                    if (e.key === "Escape") handleCancelEdit();
                  }}
                  onBlur={handleSaveEdit}
                  className="w-full bg-amber-50 border border-amber-400 font-bold text-slate-900 text-xs px-1.5 py-0.5 rounded outline-none focus:ring-1 focus:ring-amber-500 text-center"
                />
              ) : (
                <span>{item.month}</span>
              )}
            </td>
          )}
          {typeColumns.map((type, tIdx) => {
            if (hiddenColumns[`type_${type}`]) return null;
            const val = item.values[tIdx];
            const colKey = `type_${type}`;
            const w = columnWidths[colKey] || 120;
            const isEditingCell = isEditingThisRow && editingCell.field === type;

            return (
              <td 
                key={type} 
                style={{ width: w, minWidth: w, maxWidth: w }}
                onDoubleClick={() => handleStartEdit(item.bu, item.l07, item.month, type, val)}
                className="py-2 px-2.5 text-right border-r border-b border-[#e7dbdc] font-mono text-slate-700 text-xs cursor-pointer hover:bg-amber-100/60 transition-colors"
                title={`Nhấp đúp để sửa số tiền (${type})`}
              >
                {isEditingCell ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit();
                      if (e.key === "Escape") handleCancelEdit();
                    }}
                    onBlur={handleSaveEdit}
                    className="w-full bg-amber-50 border border-amber-400 font-mono text-slate-900 text-xs text-right px-1.5 py-0.5 rounded outline-none focus:ring-1 focus:ring-amber-500"
                  />
                ) : (
                  <span>{val === 0 ? <span className="text-slate-300">0</span> : val.toLocaleString('vi-VN')}</span>
                )}
              </td>
            );
          })}
          {!hiddenColumns.grandTotal && (
            <td 
              style={{ width: columnWidths["grandTotal"] || 140, minWidth: columnWidths["grandTotal"] || 140, maxWidth: columnWidths["grandTotal"] || 140 }}
              className="py-2 px-2.5 text-right border-r border-b border-[#e7dbdc] font-bold text-[#781D1D] bg-amber-50/40 font-mono text-xs"
            >
              {item.rowTotal === 0 ? <span className="text-slate-300">0</span> : Math.round(item.rowTotal).toLocaleString('vi-VN')}
            </td>
          )}
        </tr>
      );
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden bg-white rounded-none border border-[#e7dbdc] shadow-2xs relative z-10">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".xlsx,.xls,.csv"
        className="hidden"
        id="pivot-upload"
        onChange={handleFileUpload}
      />
      {/* TOP HEADER TOOLBAR & STATS BADGES */}
      <div 
        className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-[#e7dbdc]"
        style={{ backgroundColor: "var(--table-header-bg, #FAF9F6)" }}
      >
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#781D1D] shrink-0 inline-block"></span>
            <span className="text-[#781D1D] font-extrabold uppercase tracking-wider" style={{ fontSize: "13px" }}>
              PIVOT MASTER
            </span>
          </div>

          <div className="h-4 w-px bg-slate-300 mx-1 hidden sm:block" />

          {/* Month Filter Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap">
              Tháng:
            </span>
            <Select
              value={selectedMonthFilter}
              onValueChange={(val) => {
                setSelectedMonthFilter(val);
                try {
                  localStorage.setItem("pivot_master_selected_month_filter", val);
                } catch {
                  // ignore
                }
              }}
            >
              <SelectTrigger 
                className="h-[28px] rounded-full px-3 text-[11px] font-bold text-slate-800 border-[#e7dbdc] bg-white hover:bg-slate-50 transition-colors shadow-2xs focus:ring-0 outline-none"
                style={{ width: "130px", height: "28px" }}
              >
                <SelectValue placeholder="Tất cả tháng" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#e7dbdc] z-[99999] opacity-100 shadow-xl rounded-xl">
                <SelectItem value="ALL" className="text-[12px] font-bold cursor-pointer">Tất cả tháng</SelectItem>
                {uniqueMonths.map((m) => (
                  <SelectItem key={m} value={m} className="text-[12px] font-bold cursor-pointer">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center gap-2 pt-2 pb-2">
          <div className="text-right px-3 py-1 bg-white rounded border border-[#e7dbdc]/80 shadow-2xs">
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">CENTERS</p>
            <p className="text-sm font-bold text-slate-800 font-mono leading-tight">{totalCenters}</p>
          </div>
          <div className="text-right px-3 py-1 bg-white rounded border border-[#e7dbdc]/80 shadow-2xs">
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">TOTAL</p>
            <p className="text-sm font-bold text-[#781D1D] font-mono leading-tight">{Math.round(totalSalarySum).toLocaleString('vi-VN')}</p>
          </div>
        </div>
      </div>

      {/* PIVOT TABLE DISPLAY WITH HIGH-CONTRAST HEADERS & GRIDLINES */}
      <div className="overflow-auto relative flex-1 custom-scrollbar bg-white pivot-table-container">
        {isPivotSheetVisible && (
          <table className="w-full text-right text-xs whitespace-nowrap border-separate border-spacing-0">
            <thead 
              className="text-[#781D1D] font-bold uppercase text-[11px] border-b border-[#e7dbdc] sticky top-0 z-30 shadow-2xs"
              style={{ backgroundColor: "var(--table-header-bg, #FAF9F6)" }}
            >
              <tr>
                {!hiddenColumns.no && (
                  <th 
                    style={{ width: columnWidths["no"] || 50, minWidth: columnWidths["no"] || 50, maxWidth: columnWidths["no"] || 50, backgroundColor: "var(--table-header-bg, #FAF9F6)" }}
                    className="py-2.5 px-2 text-center border-r border-b border-[#e7dbdc] sticky top-0 transition-colors select-none text-[#781D1D] relative group"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>No.</span>
                    </div>
                    <div 
                      onMouseDown={(e) => handleResizeStart(e, "no", 50)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500/60 group-hover:bg-slate-300/60 z-20 select-none"
                      title="Kéo cạnh phải để thay đổi độ rộng cột"
                    />
                  </th>
                )}
                {!hiddenColumns.business && (
                  <th 
                    style={{ width: columnWidths["business"] || 90, minWidth: columnWidths["business"] || 90, maxWidth: columnWidths["business"] || 90, backgroundColor: "var(--table-header-bg, #FAF9F6)" }}
                    className="py-2.5 px-2.5 text-center border-r border-b border-[#e7dbdc] sticky top-0 transition-colors select-none text-[#781D1D] relative group"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Business</span>
                    </div>
                    <div 
                      onMouseDown={(e) => handleResizeStart(e, "business", 90)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500/60 group-hover:bg-slate-300/60 z-20 select-none"
                      title="Kéo cạnh phải để thay đổi độ rộng cột"
                    />
                  </th>
                )}
                {!hiddenColumns.charge && (
                  <th 
                    style={{ width: columnWidths["charge"] || 220, minWidth: columnWidths["charge"] || 220, maxWidth: columnWidths["charge"] || 220, backgroundColor: "var(--table-header-bg, #FAF9F6)" }}
                    className="py-2.5 px-2.5 text-center border-r border-b border-[#e7dbdc] sticky top-0 transition-colors select-none text-[#781D1D] relative group"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>L07</span>
                    </div>
                    <div 
                      onMouseDown={(e) => handleResizeStart(e, "charge", 220)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500/60 group-hover:bg-slate-300/60 z-20 select-none"
                      title="Kéo cạnh phải để thay đổi độ rộng cột"
                    />
                  </th>
                )}
                {!hiddenColumns.month && (
                  <th 
                    style={{ width: columnWidths["month"] || 90, minWidth: columnWidths["month"] || 90, maxWidth: columnWidths["month"] || 90, backgroundColor: "var(--table-header-bg, #FAF9F6)" }}
                    className="py-2.5 px-2.5 text-center border-r border-b border-[#e7dbdc] sticky top-0 transition-colors select-none text-[#781D1D] relative group"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Tháng</span>
                    </div>
                    <div 
                      onMouseDown={(e) => handleResizeStart(e, "month", 90)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500/60 group-hover:bg-slate-300/60 z-20 select-none"
                      title="Kéo cạnh phải để thay đổi độ rộng cột"
                    />
                  </th>
                )}
                {typeColumns.map(type => {
                  if (hiddenColumns[`type_${type}`]) return null;
                  const colKey = `type_${type}`;
                  const w = columnWidths[colKey] || 120;
                  return (
                    <th 
                      key={type} 
                      style={{ width: w, minWidth: w, maxWidth: w, backgroundColor: "var(--table-header-bg, #FAF9F6)" }}
                      className="py-2.5 px-2.5 text-center border-r border-b border-[#e7dbdc] sticky top-0 transition-colors select-none text-[#781D1D] relative group"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="truncate">{type}</span>
                      </div>
                      <div 
                        onMouseDown={(e) => handleResizeStart(e, colKey, 120)}
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500/60 group-hover:bg-slate-300/60 z-20 select-none"
                        title="Kéo cạnh phải để thay đổi độ rộng cột"
                      />
                    </th>
                  );
                })}
                {!hiddenColumns.grandTotal && (
                  <th 
                    style={{ width: columnWidths["grandTotal"] || 140, minWidth: columnWidths["grandTotal"] || 140, maxWidth: columnWidths["grandTotal"] || 140 }}
                    className="py-2.5 px-2.5 text-center border-r border-b border-[#e7dbdc] bg-amber-100/70 text-[#781D1D] font-bold sticky top-0 transition-colors select-none relative group"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>TỔNG CỘNG</span>
                    </div>
                    <div 
                      onMouseDown={(e) => handleResizeStart(e, "grandTotal", 140)}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500/60 group-hover:bg-slate-300/60 z-20 select-none"
                      title="Kéo cạnh phải để thay đổi độ rộng cột"
                    />
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7dbdc] border-b border-[#e7dbdc] text-slate-700 font-medium">
              {renderRows()}
            </tbody>
            <tfoot 
              className="font-bold text-[#781D1D] sticky bottom-[-1px] z-20 shadow-[0_-2px_6px_rgba(0,0,0,0.06)]"
              style={{ backgroundColor: "var(--table-header-bg, #FAF9F6)" }}
            >
              <tr style={{ backgroundColor: "var(--table-header-bg, #FAF9F6)" }}>
                {!hiddenColumns.no && (
                  <td 
                    style={{ width: columnWidths["no"] || 50, minWidth: columnWidths["no"] || 50, maxWidth: columnWidths["no"] || 50, backgroundColor: "var(--table-header-bg, #FAF9F6)" }}
                    className="py-2.5 px-2.5 text-center border-r border-t border-b border-[#e7dbdc]"
                  ></td>
                )}
                {!hiddenColumns.business && (
                  <td 
                    style={{ width: columnWidths["business"] || 90, minWidth: columnWidths["business"] || 90, maxWidth: columnWidths["business"] || 90, backgroundColor: "var(--table-header-bg, #FAF9F6)" }}
                    className="py-2.5 px-2.5 text-center border-r border-t border-b border-[#e7dbdc]"
                  ></td>
                )}
                {!hiddenColumns.charge && (
                  <td 
                    style={{ width: columnWidths["charge"] || 220, minWidth: columnWidths["charge"] || 220, maxWidth: columnWidths["charge"] || 220, backgroundColor: "var(--table-header-bg, #FAF9F6)" }}
                    className="py-2.5 px-2.5 text-left border-r border-t border-b border-[#e7dbdc] uppercase tracking-wide font-bold text-[#781D1D]"
                  >TỔNG CỘNG ({totalRowsCount})</td>
                )}
                {!hiddenColumns.month && (
                  <td 
                    style={{ width: columnWidths["month"] || 90, minWidth: columnWidths["month"] || 90, maxWidth: columnWidths["month"] || 90, backgroundColor: "var(--table-header-bg, #FAF9F6)" }}
                    className="py-2.5 px-2.5 text-center border-r border-t border-b border-[#e7dbdc]"
                  ></td>
                )}
                {grandTotals.map((v, idx) => {
                  const type = typeColumns[idx];
                  if (hiddenColumns[`type_${type}`]) return null;
                  const colKey = `type_${type}`;
                  const w = columnWidths[colKey] || 120;
                  return (
                    <td 
                      key={`grand-${idx}`} 
                      style={{ width: w, minWidth: w, maxWidth: w, backgroundColor: "var(--table-header-bg, #FAF9F6)" }}
                      className="py-2.5 px-2.5 text-right border-r border-t border-b border-[#e7dbdc] text-[#781D1D] font-mono font-bold"
                    >
                      {v === 0 ? "0" : Math.round(v).toLocaleString('vi-VN')}
                    </td>
                  );
                })}
                {!hiddenColumns.grandTotal && (
                  <td 
                    style={{ width: columnWidths["grandTotal"] || 140, minWidth: columnWidths["grandTotal"] || 140, maxWidth: columnWidths["grandTotal"] || 140 }}
                    className="py-2.5 px-2.5 text-right border-r border-t border-b border-[#e7dbdc] text-[#781D1D] font-black bg-amber-100/90 font-mono"
                  >
                    {superGrandTotal === 0 ? "0" : Math.round(superGrandTotal).toLocaleString('vi-VN')}
                  </td>
                )}
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* FOOTER BAR WITH PAGE SIZE MATCHING HOLD AE_MASTER, SETTINGS ICON MENU, AND PAGINATION */}
      <div 
        className="px-4 py-[10px] border-t border-[#e7dbdc] flex flex-wrap items-center justify-between gap-4 text-xs text-slate-700"
        style={{ backgroundColor: "var(--table-header-bg, #FAF9F6)" }}
      >
        {/* LEFT SIDE: PAGE SIZE DROPDOWN MATCHING HOLD AE_MASTER & SETTINGS ICON BUTTON */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-600 whitespace-nowrap">
              Hiển thị:
            </span>
            <Select
              value={rowsPerPage >= 99999 ? "all" : String(rowsPerPage)}
              onValueChange={(val) => {
                setRowsPerPage(val === "all" ? 999999 : Number(val));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger 
                className="h-[28px] rounded-full px-3 text-[11px] font-bold text-slate-800 border-[#e7dbdc] bg-white hover:bg-slate-50 transition-colors shadow-2xs"
                style={{ width: "110px", height: "28px" }}
              >
                <SelectValue placeholder="Chọn..." />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#e7dbdc] z-[99999] opacity-100 shadow-xl rounded-xl">
                <SelectItem value="10" className="text-[12px] font-bold cursor-pointer">10 dòng</SelectItem>
                <SelectItem value="20" className="text-[12px] font-bold cursor-pointer">20 dòng</SelectItem>
                <SelectItem value="50" className="text-[12px] font-bold cursor-pointer">50 dòng</SelectItem>
                <SelectItem value="100" className="text-[12px] font-bold cursor-pointer">100 dòng</SelectItem>
                <SelectItem value="200" className="text-[12px] font-bold cursor-pointer">200 dòng</SelectItem>
                <SelectItem value="500" className="text-[12px] font-bold cursor-pointer">500 dòng</SelectItem>
                <SelectItem value="all" className="text-[12px] font-bold cursor-pointer">Tất cả</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* SETTINGS / ACTION MENU BUTTON IN FOOTER */}
          <div className="relative" ref={settingsMenuRef}>
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="w-7 h-7 bg-white border border-[#e7dbdc] rounded-lg hover:bg-slate-100 transition-colors text-slate-700 shadow-2xs cursor-pointer flex items-center justify-center"
              title="Cài đặt & Tác vụ Pivot"
            >
              <SlidersHorizontal className={`w-3.5 h-3.5 text-slate-700 ${isProcessing ? "animate-spin" : ""}`} />
            </button>

            {isSettingsOpen && (
              <div className="absolute left-0 bottom-full mb-2 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-1 text-slate-700 text-xs font-medium divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150">
                {/* Section: Chỉnh sửa dữ liệu */}
                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chỉnh sửa Dữ liệu</div>
                  <button
                    onClick={() => {
                      setIsSettingsOpen(false);
                      handleAddRow();
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2.5 cursor-pointer transition-colors"
                  >
                    <Rows className="w-4 h-4 text-indigo-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Thêm dòng mới</div>
                      <div className="text-[10px] text-slate-400 font-normal">Thêm một dòng dữ liệu trống</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setIsSettingsOpen(false);
                      handleAddColumn();
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2.5 cursor-pointer transition-colors"
                  >
                    <Columns className="w-4 h-4 text-indigo-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Thêm cột mới</div>
                      <div className="text-[10px] text-slate-400 font-normal">Thêm một cột dữ liệu mới (ví dụ: PHỤ CẤP)</div>
                    </div>
                  </button>
                </div>

                {/* Section 1: Quick Actions */}
                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tác vụ Bảng</div>
                  <button
                    onClick={() => {
                      setIsSettingsOpen(false);
                      loadMasterData(true);
                    }}
                    disabled={isProcessing}
                    className="w-full text-left px-3 py-2 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 text-emerald-600 ${isProcessing ? "animate-spin" : ""}`} />
                    <div>
                      <div className="font-semibold text-slate-800">Đồng bộ từ Cài đặt Master</div>
                      <div className="text-[10px] text-slate-400 font-normal">Cập nhật dữ liệu từ danh sách file Master đã tải</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsSettingsOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Tải file Excel mới</div>
                      <div className="text-[10px] text-slate-400 font-normal">Tải trực tiếp file Excel dữ liệu Pivot</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsSettingsOpen(false);
                      handleExportExcel();
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-teal-50 hover:text-teal-700 flex items-center gap-2.5 cursor-pointer transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Xuất Báo Cáo Excel</div>
                      <div className="text-[10px] text-slate-400 font-normal">Tải về file Excel Pivot hiện tại</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsSettingsOpen(false);
                      handleDownloadDiagnosticCSV();
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer transition-colors"
                  >
                    <Download className="w-4 h-4 text-slate-500" />
                    <div>
                      <div className="font-semibold text-slate-800">Tải Logs CSV</div>
                      <div className="text-[10px] text-slate-400 font-normal">Xuất dữ liệu log kiểm tra các dòng lỗi</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsPivotSheetVisible(!isPivotSheetVisible);
                      setIsSettingsOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer transition-colors"
                  >
                    <Eye className="w-4 h-4 text-slate-600" />
                    <div>
                      <div className="font-semibold text-slate-800">{isPivotSheetVisible ? "Ẩn Bảng Pivot" : "Hiện Bảng Pivot"}</div>
                      <div className="text-[10px] text-slate-400 font-normal">Bật/tắt hiển thị dữ liệu bảng</div>
                    </div>
                  </button>
                </div>

                {/* Section 2: Column Visibility */}
                <div className="p-3 space-y-2">
                  <div className="font-bold text-slate-800 pb-1 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">Ẩn / Hiện Cột</span>
                    <button
                      onClick={() => setHiddenColumns({})}
                      className="text-[10px] text-primary hover:underline font-normal cursor-pointer"
                    >
                      Hiện tất cả
                    </button>
                  </div>
                  <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    <label className="flex items-center gap-2 hover:bg-slate-50 p-1 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!hiddenColumns.no}
                        onChange={(e) => setHiddenColumns(prev => ({ ...prev, no: !e.target.checked }))}
                        className="rounded border-[#e7dbdc] text-primary focus:ring-primary"
                      />
                      <span className="text-xs font-medium text-slate-700">No.</span>
                    </label>
                    <label className="flex items-center gap-2 hover:bg-slate-50 p-1 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!hiddenColumns.business}
                        onChange={(e) => setHiddenColumns(prev => ({ ...prev, business: !e.target.checked }))}
                        className="rounded border-[#e7dbdc] text-primary focus:ring-primary"
                      />
                      <span>Business</span>
                    </label>
                    <label className="flex items-center gap-2 hover:bg-slate-50 p-1 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!hiddenColumns.charge}
                        onChange={(e) => setHiddenColumns(prev => ({ ...prev, charge: !e.target.checked }))}
                        className="rounded border-[#e7dbdc] text-primary focus:ring-primary"
                      />
                      <span>CHARGE TO CENTER MKT / L07</span>
                    </label>
                    <label className="flex items-center gap-2 hover:bg-slate-50 p-1 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!hiddenColumns.month}
                        onChange={(e) => setHiddenColumns(prev => ({ ...prev, month: !e.target.checked }))}
                        className="rounded border-[#e7dbdc] text-primary focus:ring-primary"
                      />
                      <span className="text-xs font-medium text-slate-700">Tháng</span>
                    </label>
                    {typeColumns.map(type => (
                      <label key={type} className="flex items-center gap-2 hover:bg-slate-50 p-1 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!hiddenColumns[`type_${type}`]}
                          onChange={(e) => setHiddenColumns(prev => ({ ...prev, [`type_${type}`]: !e.target.checked }))}
                          className="rounded border-[#e7dbdc] text-primary focus:ring-primary"
                        />
                        <span className="truncate" title={type}>{type}</span>
                      </label>
                    ))}
                    <label className="flex items-center gap-2 hover:bg-slate-50 p-1 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!hiddenColumns.grandTotal}
                        onChange={(e) => setHiddenColumns(prev => ({ ...prev, grandTotal: !e.target.checked }))}
                        className="rounded border-[#e7dbdc] text-primary focus:ring-primary"
                      />
                      <span>TỔNG CỘNG</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE: PAGINATION CONTROLS */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={validCurrentPage === 1}
            onClick={() => setCurrentPage(1)}
            className="w-7 h-7 flex items-center justify-center rounded border border-[#e7dbdc] bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs active:scale-95 cursor-pointer"
            title="Trang đầu"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={validCurrentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="w-7 h-7 flex items-center justify-center rounded border border-[#e7dbdc] bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs active:scale-95 cursor-pointer"
            title="Trang trước"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          
          <span className="px-3 text-[11px] leading-[14px] font-bold text-slate-800 uppercase tracking-wide">
            TRANG {validCurrentPage} / {totalPages}
          </span>

          <button
            type="button"
            disabled={validCurrentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className="w-7 h-7 flex items-center justify-center rounded border border-[#e7dbdc] bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs active:scale-95 cursor-pointer"
            title="Trang sau"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={validCurrentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage(totalPages)}
            className="w-7 h-7 flex items-center justify-center rounded border border-[#e7dbdc] bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs active:scale-95 cursor-pointer"
            title="Trang cuối"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
