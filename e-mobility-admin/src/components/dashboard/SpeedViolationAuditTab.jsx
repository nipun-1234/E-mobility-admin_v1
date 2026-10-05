import React, { useState, useMemo } from 'react';
import html2pdf from 'html2pdf.js';
import AuditReportPdfTemplate from './AuditReportPdfTemplate';
import {
  FileText,
  Save,
  Download,
  Car,
  AlertCircle,
  AlertTriangle,
  Gauge,
  Calendar,
  MapPin,
  Route,
  Search,
  Filter,
  RotateCcw,
  CheckCircle2,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShieldAlert,
  ShieldCheck,
  X,
  MoreVertical,
  Home,
  ChevronDown,
  Check,
  ArrowUp,
  ArrowDown,
  Printer,
  QrCode,
  Building2,
  ExternalLink,
  Zap,
  Radio,
  SlidersHorizontal,
  Bookmark
} from 'lucide-react';

// Baseline audit records matching user screenshot exactly
const INITIAL_AUDIT_DATA = [
  {
    id: 1,
    plate: 'CAK 1234',
    makeModel: 'Toyota Corolla (White)',
    dateTime: '2025-06-16 13:28:14',
    location: 'Galle (Km 112.4)',
    highway: 'E01 Southern Expressway',
    lane: 'Lane 2',
    detectedSpeed: 118,
    speedLimit: 100,
    difference: 18,
    status: 'Violation',
    owner: 'Nimal Jayawardena',
    nic: '841920394V',
    fineAmount: 'LKR 3,000',
    dueDate: '2025-06-30'
  },
  {
    id: 2,
    plate: 'WP KD 7788',
    makeModel: 'Honda Civic (Black)',
    dateTime: '2025-06-16 13:24:37',
    location: 'Homagama (Km 98.7)',
    highway: 'E01 Southern Expressway',
    lane: 'Lane 1',
    detectedSpeed: 96,
    speedLimit: 100,
    difference: -4,
    status: 'Normal',
    owner: 'Kasun Wickramasinghe',
    nic: '912830491V',
    fineAmount: null,
    dueDate: null
  },
  {
    id: 3,
    plate: 'NC 4567',
    makeModel: 'Nissan X-Trail (Silver)',
    dateTime: '2025-06-16 13:21:03',
    location: 'Kottawa (Km 89.2)',
    highway: 'E01 Southern Expressway',
    lane: 'Lane 3',
    detectedSpeed: 142,
    speedLimit: 100,
    difference: 42,
    status: 'Violation',
    owner: 'Priyashantha Dissanayake',
    nic: '772910482V',
    fineAmount: 'LKR 5,000',
    dueDate: '2025-06-30'
  },
  {
    id: 4,
    plate: 'WP BE 1122',
    makeModel: 'Suzuki Swift (Blue)',
    dateTime: '2025-06-16 13:18:09',
    location: 'Matara (Km 45.1)',
    highway: 'E01 Southern Expressway',
    lane: 'Lane 1',
    detectedSpeed: 88,
    speedLimit: 100,
    difference: -12,
    status: 'Normal',
    owner: 'Chamari Gunawardena',
    nic: '958291029V',
    fineAmount: null,
    dueDate: null
  },
  {
    id: 5,
    plate: 'WP NP 9987',
    makeModel: 'Honda Vezel (White)',
    dateTime: '2025-06-16 13:15:27',
    location: 'Kurunegala (Km 78.6)',
    highway: 'E01 Southern Expressway',
    lane: 'Lane 2',
    detectedSpeed: 121,
    speedLimit: 100,
    difference: 21,
    status: 'Violation',
    owner: 'Sunil Weerakkody',
    nic: '802910392V',
    fineAmount: 'LKR 3,000',
    dueDate: '2025-06-30'
  }
];

export default function SpeedViolationAuditTab({ isDarkMode = true, onNotification }) {
  // Filter States
  const [dateTimeRange, setDateTimeRange] = useState('2025-06-16 00:00  →  2025-06-16 23:59');
  const [selectedHighway, setSelectedHighway] = useState('E01 Southern Expressway');
  const [selectedLane, setSelectedLane] = useState('All');
  const [violationTypeFilter, setViolationTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchPlate, setSearchPlate] = useState('');

  // Modals & UI States
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showSaveAuditModal, setShowSaveAuditModal] = useState(false);
  const [reportName, setReportName] = useState('Speed & Violation Audit Report - 2025-06-16');

  // Export Modal States
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('CSV');
  const [exportScope, setExportScope] = useState('all');

  // Filtered Records
  const filteredData = useMemo(() => {
    return INITIAL_AUDIT_DATA.filter((item) => {
      // Highway match
      if (selectedHighway !== 'All' && !item.highway.toLowerCase().includes(selectedHighway.toLowerCase().split(' ')[0])) {
        if (selectedHighway === 'E01 Southern Expressway' && !item.highway.includes('E01')) return false;
      }
      // Lane match
      if (selectedLane !== 'All' && item.lane !== selectedLane) {
        return false;
      }
      // Violation Type match
      if (violationTypeFilter !== 'All') {
        if (violationTypeFilter === 'Violation' && item.status !== 'Violation') return false;
        if (violationTypeFilter === 'Normal' && item.status !== 'Normal') return false;
        if (violationTypeFilter === 'Excess' && item.detectedSpeed <= 120) return false;
      }
      // Status match
      if (statusFilter !== 'All') {
        if (statusFilter === 'Violation' && item.status !== 'Violation') return false;
        if (statusFilter === 'Normal' && item.status !== 'Normal') return false;
        if (statusFilter === 'Warning' && item.status !== 'Warning') return false;
      }
      // Plate search match
      if (searchPlate.trim()) {
        const query = searchPlate.trim().toLowerCase();
        const matchesPlate = item.plate.toLowerCase().includes(query);
        const matchesModel = item.makeModel.toLowerCase().includes(query);
        const matchesLocation = item.location.toLowerCase().includes(query);
        if (!matchesPlate && !matchesModel && !matchesLocation) return false;
      }
      return true;
    });
  }, [selectedHighway, selectedLane, violationTypeFilter, statusFilter, searchPlate]);

  // Reset Filters
  const handleReset = () => {
    setDateTimeRange('2025-06-16 00:00  →  2025-06-16 23:59');
    setSelectedHighway('E01 Southern Expressway');
    setSelectedLane('All');
    setViolationTypeFilter('All');
    setStatusFilter('All');
    setSearchPlate('');
    setCurrentPage(1);
    if (onNotification) onNotification('Filters Reset', 'Audit filters restored to default parameters', 'info');
  };

  // Download PDF directly with html2pdf.js
  const handleDownloadPdfFile = () => {
    setIsExporting(true);
    const element = document.getElementById('audit-report-pdf-root');
    if (!element) {
      setIsExporting(false);
      return;
    }

    const opt = {
      margin: 0,
      filename: `Speed_Violation_Audit_Report_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        scrollY: 0,
        windowWidth: 794
      },
      jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait', hotfixes: ['px_scaling'] },
      pagebreak: { mode: 'avoid-all' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      setIsExporting(false);
      if (onNotification) {
        onNotification('PDF Downloaded', 'Audit report PDF generated and downloaded successfully', 'success');
      }
    }).catch((err) => {
      console.error('Error generating PDF with html2pdf:', err);
      setIsExporting(false);
      window.print();
    });
  };

  // Export Violations (CSV or PDF)
  const handleExecuteExport = () => {
    setShowExportModal(false);

    if (exportFormat === 'PDF') {
      setIsExporting(true);
      setTimeout(() => {
        handleDownloadPdfFile();
      }, 300);
      return;
    }

    setIsExporting(true);
    setTimeout(() => {
      let rowsToExport = filteredData;
      if (exportScope === 'violations') {
        rowsToExport = filteredData.filter(i => i.status === 'Violation');
      }

      const headers = [
        'Vehicle / Plate',
        'Make & Model',
        'Date & Time',
        'Location',
        'Highway',
        'Lane',
        'Detected Speed (km/h)',
        'Speed Limit (km/h)',
        'Difference (km/h)',
        'Status'
      ];

      const rows = rowsToExport.map(item => [
        `"${item.plate}"`,
        `"${item.makeModel}"`,
        `"${item.dateTime}"`,
        `"${item.location}"`,
        `"${item.highway}"`,
        `"${item.lane}"`,
        item.detectedSpeed,
        item.speedLimit,
        item.difference,
        item.status
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Speed_Violation_Audit_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsExporting(false);
      if (onNotification) {
        onNotification('Report Exported', `CSV audit file with ${rowsToExport.length} records generated successfully`, 'success');
      }
    }, 400);
  };

  const handleConfirmSaveReport = () => {
    setShowSaveAuditModal(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    if (onNotification) {
      onNotification('Audit Report Saved', `Report "${reportName}" archived to security vault`, 'success');
    }
  };

  return (
    <div className="space-y-4 font-sans animate-in fade-in duration-200">
      {/* ------------------------------------------------------------- */}
      {/* 1. HEADER TITLE, BREADCRUMB & ACTION BUTTONS */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Icon & Title */}
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#0088cc] flex items-center justify-center text-white shadow-lg shadow-sky-500/25 flex-shrink-0">
            <FileText className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1
              className={`text-xl font-black tracking-tight ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}
            >
              Speed & Violation Audit
            </h1>
            <p
              className={`text-xs mt-0.5 max-w-3xl leading-relaxed ${
                isDarkMode ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Automatically detect vehicle speeds on highways and generate a complete audit report for every detected vehicle — including both normal and violation cases.
            </p>
          </div>
        </div>

        {/* Right: Breadcrumbs & Action Buttons */}
        <div className="flex flex-col items-end gap-2.5 flex-shrink-0 self-end md:self-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <Home className="w-3.5 h-3.5 text-slate-400" />
            <span>Home</span>
            <span>&gt;</span>
            <span>Reports</span>
            <span>&gt;</span>
            <span className="text-slate-200 font-semibold">Speed & Violation Audit</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowSaveAuditModal(true)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg ${
                isSaved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#2563eb] hover:bg-blue-600 text-white shadow-blue-600/20 active:scale-95'
              }`}
            >
              <Bookmark className="w-4 h-4 fill-white/20" />
              <span>{isSaved ? 'Audit Saved!' : 'Save Audit Report'}</span>
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>{isExporting ? 'Exporting...' : 'Export Report (CSV/PDF)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. FOUR METRIC SUMMARY CARDS WITH MINI CHARTS */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Vehicles Card */}
        <div
          className={`p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 shadow-xl ${
            isDarkMode
              ? 'bg-[#0d1420]/90 border-slate-800/80 shadow-black/20'
              : 'bg-white border-slate-200/90 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center flex-shrink-0">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total Vehicles
              </span>
              <span className="text-2xl font-black text-white leading-tight block">
                2,487
              </span>
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 mt-0.5">
                <span>↑ 12%</span>
                <span className="text-slate-400 font-normal">vs. previous period</span>
              </span>
            </div>
          </div>
          {/* Mini cyan sparkline bars */}
          <div className="flex items-end gap-1 h-8 pr-1 opacity-85">
            <div className="w-1.5 h-3 bg-cyan-400/50 rounded-sm"></div>
            <div className="w-1.5 h-5 bg-cyan-400/70 rounded-sm"></div>
            <div className="w-1.5 h-4 bg-cyan-400/60 rounded-sm"></div>
            <div className="w-1.5 h-7 bg-cyan-400 rounded-sm"></div>
          </div>
        </div>

        {/* Speed Violations Card */}
        <div
          className={`p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 shadow-xl ${
            isDarkMode
              ? 'bg-[#0d1420]/90 border-slate-800/80 shadow-black/20'
              : 'bg-white border-slate-200/90 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Speed Violations
              </span>
              <span className="text-2xl font-black text-white leading-tight block">
                312
              </span>
              <span className="text-[11px] font-medium text-rose-400 mt-0.5 block">
                <strong className="font-bold">12.6%</strong> of total vehicles
              </span>
            </div>
          </div>
          {/* Mini red sparkline bars */}
          <div className="flex items-end gap-1 h-8 pr-1 opacity-85">
            <div className="w-1.5 h-4 bg-rose-500/50 rounded-sm"></div>
            <div className="w-1.5 h-7 bg-rose-500 rounded-sm"></div>
            <div className="w-1.5 h-3 bg-rose-500/60 rounded-sm"></div>
            <div className="w-1.5 h-5 bg-rose-500/80 rounded-sm"></div>
          </div>
        </div>

        {/* Warnings Card */}
        <div
          className={`p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 shadow-xl ${
            isDarkMode
              ? 'bg-[#0d1420]/90 border-slate-800/80 shadow-black/20'
              : 'bg-white border-slate-200/90 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Warnings
              </span>
              <span className="text-2xl font-black text-white leading-tight block">
                86
              </span>
              <span className="text-[11px] font-medium text-amber-400 mt-0.5 block">
                <strong className="font-bold">3.5%</strong> of total vehicles
              </span>
            </div>
          </div>
          {/* Mini amber sparkline bars */}
          <div className="flex items-end gap-1 h-8 pr-1 opacity-85">
            <div className="w-1.5 h-2 bg-amber-400/50 rounded-sm"></div>
            <div className="w-1.5 h-4 bg-amber-400/70 rounded-sm"></div>
            <div className="w-1.5 h-6 bg-amber-400 rounded-sm"></div>
            <div className="w-1.5 h-3 bg-amber-400/60 rounded-sm"></div>
          </div>
        </div>

        {/* Average Speed Card */}
        <div
          className={`p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 shadow-xl ${
            isDarkMode
              ? 'bg-[#0d1420]/90 border-slate-800/80 shadow-black/20'
              : 'bg-white border-slate-200/90 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center flex-shrink-0">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Average Speed
              </span>
              <span className="text-2xl font-black text-white leading-tight block">
                82 km/h
              </span>
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 mt-0.5">
                <span>↓ 6%</span>
                <span className="text-slate-400 font-normal">vs. previous period</span>
              </span>
            </div>
          </div>
          {/* Mini teal sparkline bars */}
          <div className="flex items-end gap-1 h-8 pr-1 opacity-85">
            <div className="w-1.5 h-5 bg-teal-400/60 rounded-sm"></div>
            <div className="w-1.5 h-3 bg-teal-400/40 rounded-sm"></div>
            <div className="w-1.5 h-6 bg-teal-400/80 rounded-sm"></div>
            <div className="w-1.5 h-4 bg-teal-400 rounded-sm"></div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. SEARCH & FILTER CONTROLS BAR (2-ROW SYSTEM) */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`p-4 rounded-2xl border space-y-3.5 transition-colors shadow-xl ${
          isDarkMode
            ? 'bg-[#0d1420]/90 border-slate-800/80'
            : 'bg-white border-slate-200/90 shadow-sm'
        }`}
      >
        {/* ROW 1: Date & Time Range | Highway / Location | Lane */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Date & Time Range */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span>Date & Time Range</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={dateTimeRange}
                onChange={(e) => setDateTimeRange(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs font-mono font-medium outline-none border transition-all ${
                  isDarkMode
                    ? 'bg-[#070b14]/90 border-slate-800 text-slate-100 focus:border-sky-500'
                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-sky-500'
                }`}
              />
            </div>
          </div>

          {/* Highway / Location */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              <span>Highway / Location</span>
            </label>
            <select
              value={selectedHighway}
              onChange={(e) => setSelectedHighway(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-xs font-medium outline-none border transition-all ${
                isDarkMode
                  ? 'bg-[#070b14]/90 border-slate-800 text-slate-100 focus:border-sky-500'
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-sky-500'
              }`}
            >
              <option value="E01 Southern Expressway">E01 Southern Expressway</option>
              <option value="E02 Outer Circular Expressway">E02 Outer Circular Expressway</option>
              <option value="E03 Katunayake Expressway">E03 Katunayake Expressway</option>
              <option value="E04 Central Expressway">E04 Central Expressway</option>
              <option value="All">All Expressways</option>
            </select>
          </div>

          {/* Lane */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1.5">
              <Route className="w-3.5 h-3.5 text-sky-400" />
              <span>Lane</span>
            </label>
            <select
              value={selectedLane}
              onChange={(e) => setSelectedLane(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-xs font-medium outline-none border transition-all ${
                isDarkMode
                  ? 'bg-[#070b14]/90 border-slate-800 text-slate-100 focus:border-sky-500'
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-sky-500'
              }`}
            >
              <option value="All">/All Lanes</option>
              <option value="Lane 1">Lane 1</option>
              <option value="Lane 2">Lane 2</option>
              <option value="Lane 3">Lane 3</option>
            </select>
          </div>
        </div>

        {/* ROW 2: Violation Type | Status | Search Plate | Reset */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
          {/* Violation Type */}
          <div className="lg:col-span-3">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-sky-400" />
              <span>Violation Type</span>
            </label>
            <select
              value={violationTypeFilter}
              onChange={(e) => setViolationTypeFilter(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-xs font-medium outline-none border transition-all ${
                isDarkMode
                  ? 'bg-[#070b14]/90 border-slate-800 text-slate-100 focus:border-sky-500'
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-sky-500'
              }`}
            >
              <option value="All">All (Normal + Violation)</option>
              <option value="Violation">Violations Only</option>
              <option value="Normal">Normal Only</option>
              <option value="Excess">Excess Speed (&gt;120 km/h)</option>
            </select>
          </div>

          {/* Status */}
          <div className="lg:col-span-3">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1.5">
              <Filter className="w-3.5 h-3.5 text-sky-400" />
              <span>Status</span>
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-xs font-medium outline-none border transition-all ${
                isDarkMode
                  ? 'bg-[#070b14]/90 border-slate-800 text-slate-100 focus:border-sky-500'
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-sky-500'
              }`}
            >
              <option value="All">All Statuses</option>
              <option value="Violation">Violation</option>
              <option value="Normal">Normal</option>
              <option value="Warning">Warning</option>
            </select>
          </div>

          {/* Search Plate Input */}
          <div className="lg:col-span-4">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by plate number..."
                value={searchPlate}
                onChange={(e) => setSearchPlate(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs outline-none border transition-all ${
                  isDarkMode
                    ? 'bg-[#070b14]/90 border-slate-800 text-slate-100 focus:border-sky-500 placeholder-slate-500'
                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-sky-500'
                }`}
              />
            </div>
          </div>

          {/* Reset Button */}
          <div className="lg:col-span-2">
            <button
              onClick={handleReset}
              className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                isDarkMode
                  ? 'bg-[#070b14]/90 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. SPEED & VIOLATION AUDIT DATA TABLE */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`rounded-2xl overflow-hidden border transition-colors shadow-xl ${
          isDarkMode
            ? 'bg-[#0d1420]/90 border-slate-800/80'
            : 'bg-white border-slate-200/90 shadow-sm'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr
                className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                  isDarkMode
                    ? 'bg-slate-900/60 border-slate-800 text-slate-400'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <th className="py-3 px-3.5 text-center w-10">#</th>
                <th className="py-3 px-3.5">
                  <div className="flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-slate-400" />
                    <span>Vehicle / Plate</span>
                  </div>
                </th>
                <th className="py-3 px-3.5">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Date & Time</span>
                  </div>
                </th>
                <th className="py-3 px-3.5">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Location</span>
                  </div>
                </th>
                <th className="py-3 px-3.5">
                  <div className="flex items-center gap-1.5">
                    <Route className="w-3.5 h-3.5 text-slate-400" />
                    <span>Lane</span>
                  </div>
                </th>
                <th className="py-3 px-3.5">
                  <div className="flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-slate-400" />
                    <span>Detected Speed</span>
                  </div>
                </th>
                <th className="py-3 px-3.5">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Speed Limit</span>
                  </div>
                </th>
                <th className="py-3 px-3.5">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Difference</span>
                  </div>
                </th>
                <th className="py-3 px-3.5">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                    <span>Status</span>
                  </div>
                </th>
                <th className="py-3 px-3.5 text-center">Evidence</th>
                <th className="py-3 px-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y text-xs transition-colors ${
                isDarkMode
                  ? 'divide-slate-800/50 text-slate-200'
                  : 'divide-slate-100 text-slate-700'
              }`}
            >
              {filteredData.length > 0 ? (
                filteredData.map((row, idx) => {
                  const isViolation = row.status === 'Violation';
                  const isNormal = row.status === 'Normal';

                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors duration-150 ${
                        isDarkMode
                          ? 'hover:bg-slate-900/50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* # Number */}
                      <td className="py-3.5 px-3.5 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Vehicle / Plate */}
                      <td className="py-3.5 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center flex-shrink-0">
                            <Car className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold font-mono tracking-tight text-xs text-white">
                              {row.plate}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {row.makeModel}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-3.5 font-mono text-[11px] whitespace-nowrap text-slate-300">
                        {row.dateTime}
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-3.5 font-medium text-slate-200">
                        {row.location}
                      </td>

                      {/* Lane */}
                      <td className="py-3.5 px-3.5 text-slate-300">
                        {row.lane}
                      </td>

                      {/* Detected Speed */}
                      <td className="py-3.5 px-3.5">
                        <span className="font-black font-mono text-xs text-white">
                          {row.detectedSpeed} km/h
                        </span>
                      </td>

                      {/* Speed Limit */}
                      <td className="py-3.5 px-3.5 font-mono text-xs text-slate-400">
                        {row.speedLimit} km/h
                      </td>

                      {/* Difference */}
                      <td className="py-3.5 px-3.5 font-mono font-bold text-xs">
                        {row.difference > 0 ? (
                          <span className="text-rose-400">
                            +{row.difference} km/h
                          </span>
                        ) : (
                          <span className="text-emerald-400">
                            {row.difference} km/h
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3.5">
                        {isViolation ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-950/60 border border-rose-800/60 text-rose-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                            <span>Violation</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/60 border border-emerald-800/60 text-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>Normal</span>
                          </span>
                        )}
                      </td>

                      {/* Evidence (Plate badge) */}
                      <td className="py-3.5 px-3.5 text-center">
                        <button
                          onClick={() => setSelectedEvidence(row)}
                          className="px-2.5 py-1 rounded bg-[#070b14] border border-slate-700 hover:border-sky-400 text-slate-200 text-[10px] font-mono font-bold tracking-wider transition-all"
                        >
                          {row.plate}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedEvidence(row)}
                            className="px-2.5 py-1 rounded-lg border border-slate-800 bg-[#070b14]/80 hover:border-sky-500/50 text-slate-300 hover:text-sky-400 text-[11px] font-semibold flex items-center gap-1 transition-all"
                          >
                            <Eye className="w-3 h-3 text-sky-400" />
                            <span>View Evidence</span>
                          </button>

                          <button
                            onClick={() => setSelectedChallan(row)}
                            className="px-2.5 py-1 rounded-lg border border-slate-800 bg-[#070b14]/80 hover:border-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-all"
                          >
                            <FileText className="w-3 h-3 text-slate-400" />
                            <span>Details</span>
                          </button>

                          {/* 3 dots */}
                          <div className="relative">
                            <button
                              onClick={() =>
                                setActiveMenuId(activeMenuId === row.id ? null : row.id)
                              }
                              className="p-1 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {activeMenuId === row.id && (
                              <div className="absolute right-0 mt-1 w-36 rounded-xl border border-slate-800 bg-[#0c121d] py-1.5 shadow-2xl z-30 animate-in fade-in zoom-in-95 duration-150">
                                <button
                                  onClick={() => {
                                    setSelectedEvidence(row);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                                >
                                  <Eye className="w-3.5 h-3.5 text-sky-400" />
                                  <span>View Frame</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedChallan(row);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                                >
                                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Full Dossier</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="11" className="text-center py-10 text-slate-500">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-semibold">No audit records match your current filter criteria</p>
                    <button
                      onClick={handleReset}
                      className="mt-2 text-xs text-sky-400 hover:underline font-semibold"
                    >
                      Reset all filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 5. TABLE FOOTER & PAGINATION (MATCHING SCREENSHOT) */}
        {/* ------------------------------------------------------------- */}
        <div
          className={`p-3.5 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
            isDarkMode ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          <div>
            Showing <strong className="text-white">1 to {filteredData.length}</strong> of{' '}
            <strong className="text-white">2,487</strong> records
          </div>

          <div className="flex items-center gap-3">
            {/* Pagination Buttons */}
            <div className="flex items-center gap-1">
              <button
                disabled
                className="p-1 rounded-lg border border-slate-800 text-slate-600 cursor-not-allowed"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled
                className="p-1 rounded-lg border border-slate-800 text-slate-600 cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-xs shadow-md shadow-emerald-500/20">
                1
              </button>
              <button className="w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-800 flex items-center justify-center text-xs">
                2
              </button>
              <button className="w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-800 flex items-center justify-center text-xs">
                3
              </button>
              <button className="w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-800 flex items-center justify-center text-xs">
                4
              </button>
              <button className="w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-800 flex items-center justify-center text-xs">
                5
              </button>

              <span className="px-1 text-slate-600">...</span>

              <button className="w-8 h-7 rounded-lg text-slate-400 hover:bg-slate-800 flex items-center justify-center text-xs font-mono">
                498
              </button>

              <button className="p-1 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button className="p-1 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800">
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Per page dropdown */}
            <div
              className={`px-2.5 py-1 rounded-lg border border-slate-800 text-xs font-medium flex items-center gap-1.5 ${
                isDarkMode ? 'bg-[#070b14] text-slate-300' : 'bg-slate-100 text-slate-700'
              }`}
            >
              <span>5 per page</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 6. MODAL: VIEW EVIDENCE INSPECTOR */}
      {/* ------------------------------------------------------------- */}
      {selectedEvidence && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className={`border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col ${
              isDarkMode
                ? 'bg-[#0d1420] border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-800 bg-[#070b14] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Eye className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    ANPR & Radar Evidence Capture
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    High-definition automated enforcement frame #CAM-E01-KM112
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvidence(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video flex items-center justify-center">
                {/* Simulated Camera Feed Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 flex flex-col justify-between p-4 pointer-events-none">
                  <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400">
                    <span>LIVE REC ● HIGHWAY ENFORCEMENT</span>
                    <span>2025-06-16 13:28:14 UTC+5:30</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono text-white">
                    <span className="bg-black/70 px-2 py-1 rounded border border-slate-700">
                      PLATE: {selectedEvidence.plate} (CONFIDENCE: 98.6%)
                    </span>
                    <span className="bg-rose-950/80 text-rose-300 px-2 py-1 rounded border border-rose-800">
                      RADAR: {selectedEvidence.detectedSpeed} KM/H
                    </span>
                  </div>
                </div>

                {/* Central Plate Mockup */}
                <div className="p-6 rounded-2xl border-2 border-dashed border-sky-400/80 bg-slate-900/80 text-center shadow-2xl">
                  <span className="text-3xl font-black font-mono tracking-widest text-amber-300">
                    {selectedEvidence.plate}
                  </span>
                  <p className="text-xs text-slate-300 mt-1">{selectedEvidence.makeModel}</p>
                </div>
              </div>

              {/* Telemetry Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-medium">
                <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60">
                  <span className="text-slate-400 text-[10px] block">LOCATION</span>
                  <span className="text-white font-semibold">{selectedEvidence.location}</span>
                </div>
                <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60">
                  <span className="text-slate-400 text-[10px] block">LANE</span>
                  <span className="text-white font-semibold">{selectedEvidence.lane}</span>
                </div>
                <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60">
                  <span className="text-slate-400 text-[10px] block">RADAR SPEED</span>
                  <span className="text-rose-400 font-bold font-mono">{selectedEvidence.detectedSpeed} km/h</span>
                </div>
                <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60">
                  <span className="text-slate-400 text-[10px] block">POSTED LIMIT</span>
                  <span className="text-emerald-400 font-bold font-mono">{selectedEvidence.speedLimit} km/h</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-800 bg-[#070b14] flex justify-end">
              <button
                onClick={() => setSelectedEvidence(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white"
              >
                Close Evidence Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. MODAL: E-CHALLAN DOSSIER & DETAILS */}
      {/* ------------------------------------------------------------- */}
      {selectedChallan && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className={`border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col ${
              isDarkMode
                ? 'bg-[#0d1420] border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="px-5 py-3.5 border-b border-slate-800 bg-[#070b14] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Vehicle Audit Particulars</h3>
              </div>
              <button
                onClick={() => setSelectedChallan(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-slate-400 text-[10px] block">VEHICLE PLATE</span>
                  <span className="text-lg font-black font-mono text-white">{selectedChallan.plate}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  selectedChallan.status === 'Violation'
                    ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                    : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                }`}>
                  {selectedChallan.status}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Registered Owner</span>
                  <span className="font-semibold text-slate-200">{selectedChallan.owner}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Owner NIC Number</span>
                  <span className="font-mono text-slate-200">{selectedChallan.nic}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Highway Segment</span>
                  <span className="font-medium text-slate-200">{selectedChallan.highway} - {selectedChallan.location}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Detected Speed vs Limit</span>
                  <span className="font-mono font-bold text-white">{selectedChallan.detectedSpeed} km/h (Limit: {selectedChallan.speedLimit} km/h)</span>
                </div>
                {selectedChallan.fineAmount && (
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Fine Assessment</span>
                    <span className="font-bold text-rose-400">{selectedChallan.fineAmount}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-800 bg-[#070b14] flex justify-end">
              <button
                onClick={() => setSelectedChallan(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8. MODAL: SAVE AUDIT REPORT */}
      {/* ------------------------------------------------------------- */}
      {showSaveAuditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="border border-slate-800 rounded-2xl w-full max-w-md bg-[#0d1420] text-white p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold">Save Audit Report to Archive</h3>
              </div>
              <button onClick={() => setShowSaveAuditModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Report Identifier / Name</label>
                <input
                  type="text"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-blue-500"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Archived reports are permanently hashed and indexed for judicial and transport ministry verification.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowSaveAuditModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSaveReport}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
              >
                Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 9. MODAL: EXPORT AUDIT REPORT (CSV / PDF) */}
      {/* ------------------------------------------------------------- */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="border border-slate-800 rounded-2xl w-full max-w-md bg-[#0d1420] text-white p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold">Export Audit Dossier</h3>
              </div>
              <button onClick={() => setShowExportModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5 font-semibold">Export Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportFormat('CSV')}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                      exportFormat === 'CSV'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    CSV Spreadsheet
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat('PDF')}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                      exportFormat === 'PDF'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    Official PDF Document
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 font-semibold">Scope</label>
                <select
                  value={exportScope}
                  onChange={(e) => setExportScope(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none"
                >
                  <option value="all">All Vehicles in Audit Range (2,487 Records)</option>
                  <option value="violations">Violations Only (312 Records)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteExport}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"
              >
                Generate & Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden PDF Container for html2pdf generation */}
      <div className="hidden">
        <AuditReportPdfTemplate
          id="audit-report-pdf-root"
          reportId="RPT-2025-06-16-0001"
          reportName="Speed & Violation Audit Report"
          highway={selectedHighway}
          lane={selectedLane}
          dateTimeRange={dateTimeRange}
          records={filteredData}
          totalVehicles="2,487"
          speedViolations="312"
          warnings="86"
          averageSpeed="82 km/h"
        />
      </div>
    </div>
  );
}
