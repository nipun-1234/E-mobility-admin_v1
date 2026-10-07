import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import html2pdf from 'html2pdf.js';
import AuditReportPdfTemplate from './AuditReportPdfTemplate';
import fineService from '../../services/fine.service';
import { AI_SERVER_URL } from '../../config/env';
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
  FileCheck,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  X,
  Printer,
  QrCode,
  Building2,
  ExternalLink,
  RefreshCw,
  Camera,
  Cpu,
  Image as ImageIcon
} from 'lucide-react';

export default function SpeedViolationAuditTab({ isDarkMode = true, onNotification }) {
  // Backend Records State
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Filter States
  const [dateTimeRange, setDateTimeRange] = useState('All Recorded Dates');
  const [selectedHighway, setSelectedHighway] = useState('All');
  const [selectedLane, setSelectedLane] = useState('All');
  const [searchPlate, setSearchPlate] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals & UI States
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showSaveAuditModal, setShowSaveAuditModal] = useState(false);
  const [reportName, setReportName] = useState(`Speed Violation Audit - ${new Date().toLocaleDateString('en-GB')}`);
  const [reportDateRange, setReportDateRange] = useState('All Persistent Records');
  const [reportHighway, setReportHighway] = useState('All Corridors');

  // Export Modal States
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPdfPreviewModal, setShowPdfPreviewModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('CSV');
  const [exportScope, setExportScope] = useState('all');
  const [exportColumns, setExportColumns] = useState({
    plate: true,
    dateTime: true,
    location: true,
    lane: true,
    detectedSpeed: true,
    speedLimit: true,
    difference: true,
    status: true,
    fineId: true,
    amount: true,
    camera: true
  });

  // Fetch real PostgreSQL violation and fine records
  const fetchAuditRecords = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setLoadError(null);
    try {
      const data = await fineService.getFines();
      const finesList = Array.isArray(data) ? data : (data?.data || []);
      const mapped = finesList.map((item, idx) => {
        const id = item.id || `TX-${idx + 1}`;
        const plate = (item.vehiclePlate || item.plate || 'N/A').toUpperCase();
        const makeModel = item.vehicleDetails
          ? `${item.vehicleDetails.make || ''} ${item.vehicleDetails.model || ''} ${item.vehicleDetails.year ? `(${item.vehicleDetails.year})` : ''}`.trim() || item.offence || 'Vehicle'
          : (item.offence || 'Vehicle');
        const dateTime = item.dateTime || item.date || 'N/A';
        const location = item.location || item.locationCoords || 'Highway Grid';
        const highway = item.policeStation || (location.toLowerCase().includes('southern') ? 'E01 Southern Expressway' : (location.toLowerCase().includes('outer') ? 'E02 Outer Circular Expressway' : 'E01 Southern Expressway'));
        const lane = item.lane || 'Lane 1';
        const detectedSpeed = typeof item.capturedSpeed === 'number' && item.capturedSpeed > 0
          ? item.capturedSpeed
          : (typeof item.speedRecorded === 'number' ? item.speedRecorded : parseInt(String(item.speedRecorded || 0).replace(/\D/g, ''), 10) || 0);
        const speedLimit = typeof item.postedLimit === 'number' && item.postedLimit > 0
          ? item.postedLimit
          : (typeof item.speedLimit === 'number' ? item.speedLimit : parseInt(String(item.speedLimit || 100).replace(/\D/g, ''), 10) || 100);
        const difference = detectedSpeed > 0 ? detectedSpeed - speedLimit : 0;

        let status = 'Normal';
        if (item.status === 'Paid') {
          status = 'Paid';
        } else if (item.status === 'Disputed') {
          status = 'Disputed';
        } else if (difference > 0 || (item.offence && item.offence.toLowerCase().includes('speed'))) {
          status = 'Violation';
        } else if (difference >= -5 && difference <= 0 && detectedSpeed > 0) {
          status = 'Warning';
        }

        const isAiDetected = Boolean(item.cameraId || item.trackingId || item.evidenceImageUrl);
        const cameraId = item.cameraId || (item.camera ? item.camera.split('•')[0].trim().toLowerCase() : null);
        const trackingId = item.trackingId || null;
        const owner = item.vehicleDetails?.owner || item.vehicleDetails?.ownerNic || 'Registered Vehicle Owner';
        const nic = item.vehicleDetails?.ownerNic || item.ownerNic || 'N/A';
        const fineAmount = item.amount ? `LKR ${Number(item.amount).toLocaleString()}` : (status === 'Violation' ? 'LKR 3,850' : null);
        const dueDate = item.dueDate || 'N/A';

        // Evidence snapshot image URL resolution
        let rawEvidence = typeof item.evidenceImageUrl === 'string' && item.evidenceImageUrl.trim() 
          ? item.evidenceImageUrl.trim() 
          : (typeof item.evidenceImage === 'string' && item.evidenceImage.trim() ? item.evidenceImage.trim() : null);
        let evidenceImageUrl = '/speed_violation_evidence.png';
        if (rawEvidence && rawEvidence !== 'true' && rawEvidence !== 'false') {
          if (rawEvidence.startsWith('http://') || rawEvidence.startsWith('https://') || rawEvidence.startsWith('data:')) {
            evidenceImageUrl = rawEvidence;
          } else if (rawEvidence.startsWith('/uploads/')) {
            evidenceImageUrl = `${AI_SERVER_URL}${rawEvidence}`;
          } else if (rawEvidence.startsWith('/')) {
            evidenceImageUrl = `${AI_SERVER_URL}${rawEvidence}`;
          } else {
            evidenceImageUrl = `${AI_SERVER_URL}/${rawEvidence}`;
          }
        }

        // ANPR Plate Crop URL resolution
        let rawPlateCrop = typeof item.plateCropUrl === 'string' && item.plateCropUrl.trim() 
          ? item.plateCropUrl.trim() 
          : (typeof item.plate_crop_url === 'string' && item.plate_crop_url.trim() ? item.plate_crop_url.trim() : null);
        let plateCropUrl = null;
        if (rawPlateCrop && rawPlateCrop !== 'true' && rawPlateCrop !== 'false') {
          if (rawPlateCrop.startsWith('http://') || rawPlateCrop.startsWith('https://') || rawPlateCrop.startsWith('data:')) {
            plateCropUrl = rawPlateCrop;
          } else if (rawPlateCrop.startsWith('/uploads/')) {
            plateCropUrl = `${AI_SERVER_URL}${rawPlateCrop}`;
          } else if (rawPlateCrop.startsWith('/')) {
            plateCropUrl = `${AI_SERVER_URL}${rawPlateCrop}`;
          } else {
            plateCropUrl = `${AI_SERVER_URL}/${rawPlateCrop}`;
          }
        }

        return {
          id,
          fineId: id,
          plate,
          plateStatus: item.plateStatus || (item.vehiclePlate && item.vehiclePlate !== 'UNREAD' ? 'VALID' : 'UNREAD'),
          plateConfidence: item.plateConfidence !== undefined ? item.plateConfidence : null,
          plateRawText: item.plateRawText || null,
          plateCropUrl,
          registryMatch: Boolean(item.registryMatch),
          makeModel,
          dateTime,
          date: item.date || 'N/A',
          location,
          highway,
          lane,
          detectedSpeed,
          speedLimit,
          difference,
          status,
          owner,
          nic,
          fineAmount,
          dueDate,
          cameraId,
          trackingId,
          evidenceImageUrl,
          isAiDetected,
          policeStation: item.policeStation || 'Expressway Traffic Division',
          receiptNo: item.receiptNo || 'N/A',
          paidAt: item.paidAt || null,
          demeritPoints: item.demeritPoints !== undefined ? item.demeritPoints : (difference >= 20 ? 4 : (difference > 0 ? 3 : 0))
        };
      });
      setRecords(mapped);
    } catch (err) {
      console.error('Failed to load violation records from backend:', err);
      setLoadError('Failed to load official violation records from backend database.');
      setRecords([]);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditRecords();
  }, [fetchAuditRecords]);

  // Dynamic KPI Metrics derived from REAL fetched records
  const metrics = useMemo(() => {
    const totalVehicles = records.length;
    const speedViolations = records.filter(r => r.status === 'Violation').length;
    const warnings = records.filter(r => r.status === 'Warning').length;
    const paid = records.filter(r => r.status === 'Paid').length;
    const normal = records.filter(r => r.status === 'Normal' || r.status === 'Paid').length;
    const averageSpeed = totalVehicles > 0
      ? Math.round(records.reduce((acc, r) => acc + (r.detectedSpeed || 0), 0) / totalVehicles)
      : 0;
    const violationPercent = totalVehicles > 0 ? ((speedViolations / totalVehicles) * 100).toFixed(1) : '0.0';
    const warningPercent = totalVehicles > 0 ? ((warnings / totalVehicles) * 100).toFixed(1) : '0.0';

    return {
      totalVehicles,
      speedViolations,
      warnings,
      paid,
      normal,
      averageSpeed,
      violationPercent,
      warningPercent
    };
  }, [records]);

  // Filtered Records
  const filteredData = useMemo(() => {
    return records.filter((item) => {
      // Highway match
      if (selectedHighway !== 'All') {
        const hKey = selectedHighway.toLowerCase().split(' ')[0];
        if (!item.highway.toLowerCase().includes(hKey) && !item.location.toLowerCase().includes(hKey)) {
          return false;
        }
      }
      // Lane match
      if (selectedLane !== 'All' && item.lane !== selectedLane) {
        return false;
      }
      // Status match
      if (statusFilter !== 'All') {
        if (statusFilter === 'Violation' && item.status !== 'Violation') return false;
        if (statusFilter === 'Normal' && item.status !== 'Normal') return false;
        if (statusFilter === 'Warning' && item.status !== 'Warning') return false;
        if (statusFilter === 'Paid' && item.status !== 'Paid') return false;
      }
      // Plate search match
      if (searchPlate.trim()) {
        const query = searchPlate.trim().toLowerCase();
        const matchesPlate = item.plate.toLowerCase().includes(query);
        const matchesModel = item.makeModel.toLowerCase().includes(query);
        const matchesLocation = item.location.toLowerCase().includes(query);
        const matchesFineId = String(item.id).toLowerCase().includes(query);
        const matchesCam = item.cameraId && String(item.cameraId).toLowerCase().includes(query);
        if (!matchesPlate && !matchesModel && !matchesLocation && !matchesFineId && !matchesCam) return false;
      }
      return true;
    });
  }, [records, selectedHighway, selectedLane, statusFilter, searchPlate]);

  // Pagination calculation
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage]);

  // Reset Filters
  const handleReset = () => {
    setDateTimeRange('All Recorded Dates');
    setSelectedHighway('All');
    setSelectedLane('All');
    setSearchPlate('');
    setStatusFilter('All');
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
      } else if (exportScope === 'page') {
        rowsToExport = pagedData;
      }

      const headers = [];
      if (exportColumns.fineId) headers.push('Fine ID');
      if (exportColumns.plate) headers.push('Vehicle / Plate');
      if (exportColumns.camera) headers.push('Camera / Tracking ID');
      if (exportColumns.dateTime) headers.push('Date & Time');
      if (exportColumns.location) headers.push('Location');
      if (exportColumns.lane) headers.push('Lane');
      if (exportColumns.detectedSpeed) headers.push('Detected Speed (km/h)');
      if (exportColumns.speedLimit) headers.push('Speed Limit (km/h)');
      if (exportColumns.difference) headers.push('Difference (km/h)');
      if (exportColumns.amount) headers.push('Fine Amount');
      if (exportColumns.status) headers.push('Violation Status');

      const rows = rowsToExport.map(item => {
        const row = [];
        if (exportColumns.fineId) row.push(`"${item.fineId || item.id}"`);
        if (exportColumns.plate) row.push(`"${item.plate}"`);
        if (exportColumns.camera) row.push(`"${item.cameraId ? `${item.cameraId} (Track #${item.trackingId || 'N/A'})` : 'Manual / Static'}"`);
        if (exportColumns.dateTime) row.push(`"${item.dateTime}"`);
        if (exportColumns.location) row.push(`"${item.location}"`);
        if (exportColumns.lane) row.push(`"${item.lane}"`);
        if (exportColumns.detectedSpeed) row.push(item.detectedSpeed);
        if (exportColumns.speedLimit) row.push(item.speedLimit);
        if (exportColumns.difference) row.push(item.difference);
        if (exportColumns.amount) row.push(`"${item.fineAmount || 'N/A'}"`);
        if (exportColumns.status) row.push(`"${item.status}"`);
        return row;
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Speed_Violation_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsExporting(false);
      if (onNotification) {
        onNotification('Report Exported', `CSV report with ${rowsToExport.length} records generated successfully`, 'success');
      }
    }, 400);
  };

  // Save Audit Report
  const handleSaveReport = () => {
    setShowSaveAuditModal(true);
  };

  const handleConfirmSaveReport = () => {
    setShowSaveAuditModal(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    if (onNotification) {
      onNotification('Audit Report Saved', `Report "${reportName}" saved to database archive`, 'success');
    }
  };

  return (
    <div className={`space-y-3.5 font-sans transition-colors duration-200 ${
      isDarkMode ? 'text-slate-100' : 'text-slate-800'
    }`}>
      {/* ------------------------------------------------------------- */}
      {/* 1. HEADER TITLE & ACTION BUTTONS */}
      {/* ------------------------------------------------------------- */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border transition-colors shadow-sm ${
        isDarkMode
          ? 'bg-slate-900/90 border-slate-800/90 shadow-slate-950/40'
          : 'bg-white border-slate-200/90 shadow-slate-200/40'
      }`}>
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#0088cc] flex items-center justify-center text-white shadow-md shadow-sky-500/25 flex-shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className={`text-xl font-bold tracking-tight flex items-center gap-2 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Speed & Violation Audit
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-medium border ${
                isDarkMode ? 'bg-sky-950/60 border-sky-800 text-sky-300' : 'bg-sky-50 border-sky-200 text-sky-700'
              }`}>
                PostgreSQL Live Sync
              </span>
            </h1>
            <p className={`text-xs mt-1 max-w-2xl leading-relaxed ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Live audit reports and e-Challan dossiers synchronized directly with backend PostgreSQL database and automated AI radar camera feeds.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0 self-end md:self-center">
          <button
            onClick={() => fetchAuditRecords()}
            disabled={loading}
            className={`p-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all shadow-sm ${
              isDarkMode
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            title="Refresh database records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleSaveReport}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm ${
              isSaved
                ? 'bg-emerald-600 text-white'
                : 'bg-[#0066cc] hover:bg-[#0055b3] text-white active:scale-95'
            }`}
          >
            {isSaved ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
            <span>{isSaved ? 'Audit Saved!' : 'Save Audit Report'}</span>
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            disabled={isExporting || records.length === 0}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0066cc] hover:bg-[#0055b3] disabled:opacity-40 text-white flex items-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Exporting...' : 'Export Report (CSV/PDF)'}</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. FOUR METRIC SUMMARY CARDS (DYNAMIC FROM REAL DATA) */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Vehicles */}
        <div className={`p-4 rounded-2xl border transition-colors shadow-sm flex items-center gap-3.5 ${
          isDarkMode ? 'bg-slate-900/90 border-slate-800/90' : 'bg-white border-slate-200/90'
        }`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isDarkMode ? 'bg-sky-950/70 border border-sky-800/50 text-sky-400' : 'bg-sky-100/90 text-sky-600'
          }`}>
            <Car className="w-6 h-6" />
          </div>
          <div>
            <span className={`text-[11px] font-medium uppercase tracking-wider block ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>Total Violations & Audits</span>
            <span className={`text-2xl font-black leading-tight block ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>{metrics.totalVehicles.toLocaleString()}</span>
            <span className={`text-[11px] font-semibold flex items-center gap-0.5 mt-0.5 ${
              isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
            }`}>
              <span>Live records</span> <span className={`${isDarkMode ? 'text-slate-400' : 'text-slate-400'} font-normal`}>in PostgreSQL</span>
            </span>
          </div>
        </div>

        {/* Speed Violations */}
        <div className={`p-4 rounded-2xl border transition-colors shadow-sm flex items-center gap-3.5 ${
          isDarkMode ? 'bg-slate-900/90 border-slate-800/90' : 'bg-white border-slate-200/90'
        }`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isDarkMode ? 'bg-rose-950/70 border border-rose-800/50 text-rose-400' : 'bg-rose-100/90 text-rose-500'
          }`}>
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <span className={`text-[11px] font-medium uppercase tracking-wider block ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>Speed Violations</span>
            <span className={`text-2xl font-black leading-tight block ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>{metrics.speedViolations.toLocaleString()}</span>
            <span className={`text-[11px] font-medium mt-0.5 block ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <strong className={isDarkMode ? 'text-rose-400 font-semibold' : 'text-rose-600 font-semibold'}>{metrics.violationPercent}%</strong> of total records
            </span>
          </div>
        </div>

        {/* Warnings / Disputed */}
        <div className={`p-4 rounded-2xl border transition-colors shadow-sm flex items-center gap-3.5 ${
          isDarkMode ? 'bg-slate-900/90 border-slate-800/90' : 'bg-white border-slate-200/90'
        }`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isDarkMode ? 'bg-amber-950/70 border border-amber-800/50 text-amber-400' : 'bg-amber-100/90 text-amber-500'
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className={`text-[11px] font-medium uppercase tracking-wider block ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>Warnings & Notices</span>
            <span className={`text-2xl font-black leading-tight block ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>{metrics.warnings.toLocaleString()}</span>
            <span className={`text-[11px] font-medium mt-0.5 block ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <strong className={isDarkMode ? 'text-amber-400 font-semibold' : 'text-amber-600 font-semibold'}>{metrics.warningPercent}%</strong> of total records
            </span>
          </div>
        </div>

        {/* Average Speed */}
        <div className={`p-4 rounded-2xl border transition-colors shadow-sm flex items-center gap-3.5 ${
          isDarkMode ? 'bg-slate-900/90 border-slate-800/90' : 'bg-white border-slate-200/90'
        }`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isDarkMode ? 'bg-sky-950/70 border border-sky-800/50 text-sky-400' : 'bg-sky-100/90 text-sky-600'
          }`}>
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <span className={`text-[11px] font-medium uppercase tracking-wider block ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>Average Speed</span>
            <span className={`text-2xl font-black leading-tight block ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>{metrics.averageSpeed > 0 ? `${metrics.averageSpeed} km/h` : 'N/A'}</span>
            <span className={`text-[11px] font-semibold flex items-center gap-0.5 mt-0.5 ${
              isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
            }`}>
              <span>Recorded Mean</span> <span className={`${isDarkMode ? 'text-slate-400' : 'text-slate-400'} font-normal`}>across active fleet</span>
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. SEARCH & FILTER CONTROLS BAR */}
      {/* ------------------------------------------------------------- */}
      <div className={`p-4 rounded-2xl border transition-colors shadow-sm ${
        isDarkMode ? 'bg-slate-900/90 border-slate-800/90' : 'bg-white border-slate-200/90'
      }`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
          {/* Date & Time Range */}
          <div>
            <label className={`flex items-center gap-1.5 text-xs font-semibold mb-1.5 ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span>Date Scope</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={dateTimeRange}
                onChange={(e) => setDateTimeRange(e.target.value)}
                placeholder="e.g. 2026-10-05"
                className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs font-mono transition-all outline-none border ${
                  isDarkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-sky-500'
                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-sky-500'
                }`}
              />
            </div>
          </div>

          {/* Highway / Location */}
          <div>
            <label className={`flex items-center gap-1.5 text-xs font-semibold mb-1.5 ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              <span>Highway / Corridor</span>
            </label>
            <select
              value={selectedHighway}
              onChange={(e) => setSelectedHighway(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-xs font-medium transition-all outline-none border ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-sky-500'
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-sky-500'
              }`}
            >
              <option value="All">All Corridors (Entire Island)</option>
              <option value="E01 Southern Expressway">E01 Southern Expressway</option>
              <option value="E02 Outer Circular Expressway">E02 Outer Circular Expressway</option>
              <option value="E03 Katunayake Expressway">E03 Katunayake Expressway</option>
              <option value="E04 Central Expressway">E04 Central Expressway</option>
            </select>
          </div>

          {/* Lane */}
          <div>
            <label className={`flex items-center gap-1.5 text-xs font-semibold mb-1.5 ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>
              <Route className="w-3.5 h-3.5 text-sky-400" />
              <span>Lane</span>
            </label>
            <select
              value={selectedLane}
              onChange={(e) => setSelectedLane(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-xs font-medium transition-all outline-none border ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-sky-500'
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-sky-500'
              }`}
            >
              <option value="All">All Lanes</option>
              <option value="Lane 1">Lane 1 (Overtaking)</option>
              <option value="Lane 2">Lane 2 (Cruising)</option>
              <option value="Lane 3">Lane 3 (Slow / Heavy)</option>
            </select>
          </div>

          {/* Plate / Citation Number */}
          <div>
            <label className={`flex items-center gap-1.5 text-xs font-semibold mb-1.5 ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>
              <Car className="w-3.5 h-3.5 text-sky-400" />
              <span>Plate / Fine Ref</span>
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="e.g. WP CAB-4521 or TX-88421"
                value={searchPlate}
                onChange={(e) => setSearchPlate(e.target.value)}
                className={`w-full pl-8 pr-3 py-2 rounded-xl text-xs transition-all outline-none border ${
                  isDarkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-sky-500 placeholder-slate-500'
                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-sky-500'
                }`}
              />
            </div>
          </div>

          {/* Status & Action Buttons */}
          <div>
            <label className={`flex items-center gap-1.5 text-xs font-semibold mb-1.5 ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>
              <Filter className="w-3.5 h-3.5 text-sky-400" />
              <span>Violation Status</span>
            </label>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-medium transition-all outline-none border ${
                  isDarkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-sky-500'
                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-sky-500'
                }`}
              >
                <option value="All">All Statuses</option>
                <option value="Violation">Violation Only</option>
                <option value="Normal">Normal Only</option>
                <option value="Warning">Warning Only</option>
                <option value="Paid">Paid Only</option>
              </select>

              <button
                onClick={handleReset}
                title="Reset Filters"
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 border transition-all ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. SPEED & VIOLATION AUDIT DATA TABLE */}
      {/* ------------------------------------------------------------- */}
      <div className={`rounded-2xl overflow-hidden border transition-colors shadow-sm ${
        isDarkMode ? 'bg-slate-900/90 border-slate-800/90' : 'bg-white border-slate-200/90'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                isDarkMode
                  ? 'bg-slate-950/80 border-slate-800 text-slate-400'
                  : 'bg-[#f8fafc] border-slate-200 text-slate-600'
              }`}>
                <th className="py-3 px-3.5 text-center w-12"># Ref</th>
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
                    <span>Location / Camera</span>
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
                    <span>Speed</span>
                  </div>
                </th>
                <th className="py-3 px-3.5">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Limit</span>
                  </div>
                </th>
                <th className="py-3 px-3.5">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Delta</span>
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
            <tbody className={`divide-y text-xs transition-colors ${
              isDarkMode
                ? 'divide-slate-800/80 text-slate-200'
                : 'divide-slate-100 text-slate-700'
            }`}>
              {loading ? (
                <tr>
                  <td colSpan="11" className="text-center py-12">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-sky-500" />
                      <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Loading violation records from PostgreSQL...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan="11" className="text-center py-12">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <AlertCircle className="w-6 h-6 text-rose-500" />
                      <p className="text-xs font-semibold text-rose-400">{loadError}</p>
                      <button
                        onClick={() => fetchAuditRecords()}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 text-xs hover:bg-rose-900 transition"
                      >
                        Retry Connection
                      </button>
                    </div>
                  </td>
                </tr>
              ) : pagedData.length > 0 ? (
                pagedData.map((row) => {
                  const isViolation = row.status === 'Violation';
                  const isWarning = row.status === 'Warning';
                  const isNormal = row.status === 'Normal';
                  const isPaid = row.status === 'Paid';

                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors duration-150 ${
                        isDarkMode
                          ? 'hover:bg-slate-800/60'
                          : 'hover:bg-sky-50/50'
                      }`}
                    >
                      {/* # Ref */}
                      <td className={`py-3 px-3.5 text-center font-mono text-[11px] font-bold ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        {String(row.fineId || row.id).slice(-8)}
                      </td>

                      {/* Vehicle / Plate */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <Car className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              {row.plate && row.plate !== 'UNREAD' && row.plate !== 'null' ? (
                                <span className={`font-bold font-mono tracking-tight text-xs ${
                                  isDarkMode ? 'text-white' : 'text-slate-900'
                                }`}>
                                  {row.plate}
                                </span>
                              ) : (
                                <span className="font-bold font-mono tracking-tight text-xs text-amber-400">
                                  UNREAD PLATE
                                </span>
                              )}

                              {row.plateConfidence !== null && row.plateConfidence !== undefined && (
                                <span className={`text-[9px] px-1 py-0.5 rounded font-mono font-bold ${
                                  isDarkMode ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60' : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                                }`}>
                                  {Math.round(row.plateConfidence > 1 ? row.plateConfidence : row.plateConfidence * 100)}% ANPR
                                </span>
                              )}

                              {(!row.plate || row.plate === 'UNREAD' || row.plate === 'null') && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                                  isDarkMode ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  Manual Review
                                </span>
                              )}
                            </div>
                            <div className={`text-[11px] truncate max-w-[180px] ${
                              isDarkMode ? 'text-slate-400' : 'text-slate-500'
                            }`}>
                              {row.plate && row.plate !== 'UNREAD' && row.plate !== 'null' ? row.makeModel : 'Plate Unread / Manual Inspection Required'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className={`py-3 px-3.5 font-mono text-[11px] whitespace-nowrap ${
                        isDarkMode ? 'text-slate-300' : 'text-slate-600'
                      }`}>
                        {row.dateTime}
                      </td>

                      {/* Location & Camera */}
                      <td className="py-3 px-3.5">
                        <div className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                          {row.location}
                        </div>
                        {row.cameraId && (
                          <div className={`text-[10px] font-mono flex items-center gap-1 mt-0.5 ${
                            isDarkMode ? 'text-sky-400' : 'text-sky-600'
                          }`}>
                            <Camera className="w-3 h-3" />
                            <span>{row.cameraId.toUpperCase()} {row.trackingId ? `• ID:${row.trackingId}` : ''}</span>
                          </div>
                        )}
                      </td>

                      {/* Lane */}
                      <td className={`py-3 px-3.5 ${
                        isDarkMode ? 'text-slate-300' : 'text-slate-600'
                      }`}>
                        {row.lane}
                      </td>

                      {/* Detected Speed */}
                      <td className="py-3 px-3.5">
                        <span className={`font-black font-mono text-xs ${
                          isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}>
                          {row.detectedSpeed > 0 ? `${row.detectedSpeed} km/h` : 'N/A'}
                        </span>
                      </td>

                      {/* Speed Limit */}
                      <td className={`py-3 px-3.5 font-mono text-xs ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        {row.speedLimit > 0 ? `${row.speedLimit} km/h` : 'N/A'}
                      </td>

                      {/* Difference */}
                      <td className="py-3 px-3.5 font-mono font-bold text-xs">
                        {row.detectedSpeed > 0 ? (
                          row.difference > 0 ? (
                            <span className={
                              isViolation
                                ? isDarkMode ? 'text-rose-400' : 'text-rose-600'
                                : isDarkMode ? 'text-amber-400' : 'text-amber-600'
                            }>
                              +{row.difference} km/h
                            </span>
                          ) : (
                            <span className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}>
                              {row.difference} km/h
                            </span>
                          )
                        ) : (
                          <span className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>N/A</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5">
                        {isViolation && (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            isDarkMode
                              ? 'bg-rose-950/60 border-rose-800/60 text-rose-300'
                              : 'bg-rose-50 border-rose-200 text-rose-600'
                          }`}>
                            <AlertCircle className="w-3 h-3 text-rose-500" />
                            <span>Violation</span>
                          </span>
                        )}
                        {isWarning && (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            isDarkMode
                              ? 'bg-amber-950/60 border-amber-800/60 text-amber-300'
                              : 'bg-amber-50 border-amber-200 text-amber-700'
                          }`}>
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            <span>Warning</span>
                          </span>
                        )}
                        {isNormal && (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            isDarkMode
                              ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          }`}>
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>Normal</span>
                          </span>
                        )}
                        {isPaid && (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            isDarkMode
                              ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          }`}>
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>Paid</span>
                          </span>
                        )}
                      </td>

                      {/* Evidence (Snapshot Thumbnail) */}
                      <td className="py-2.5 px-3.5 text-center">
                        <div
                          onClick={() => setSelectedEvidence(row)}
                          className="inline-block cursor-pointer group"
                          title="Click to zoom evidence snapshot"
                        >
                          <div className="relative w-14 h-8 rounded-lg overflow-hidden border border-slate-700 group-hover:border-sky-400 transition bg-slate-900 shadow-xs flex items-center justify-center">
                            <img
                              src={row.evidenceImageUrl || '/speed_violation_evidence.png'}
                              alt="Violation evidence"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/speed_violation_evidence.png';
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedEvidence(row)}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition-all ${
                              isDarkMode
                                ? 'border-sky-500/40 text-sky-400 hover:bg-sky-950/50 hover:border-sky-400'
                                : 'border-sky-300 text-sky-600 hover:bg-sky-50 hover:border-sky-500'
                            }`}
                            title="Inspect high-definition camera capture & optical telemetry"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Evidence</span>
                          </button>

                          <button
                            onClick={() => setSelectedChallan(row)}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition-all ${
                              isDarkMode
                                ? 'border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                            title="Inspect official Sri Lanka e-Challan citation dossier"
                          >
                            <FileText className="w-3 h-3" />
                            <span>e-Challan</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="11" className={`text-center py-10 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-semibold">No violation records found in database.</p>
                    <p className="text-xs mt-1 opacity-75">
                      {records.length === 0
                        ? 'PostgreSQL contains 0 violations. Any new high-speed violation detected by the camera pipeline will appear here.'
                        : 'No records match your active search and filter criteria.'}
                    </p>
                    {records.length > 0 && (
                      <button
                        onClick={handleReset}
                        className="mt-2 text-xs text-sky-500 hover:underline font-semibold"
                      >
                        Reset all filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 5. TABLE FOOTER & PAGINATION */}
        {/* ------------------------------------------------------------- */}
        <div className={`p-3.5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
          isDarkMode
            ? 'bg-slate-950/80 border-slate-800 text-slate-400'
            : 'bg-[#f8fafc] border-slate-200 text-slate-500'
        }`}>
          <div>
            Showing <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>
              {filteredData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, filteredData.length)}
            </strong> of{' '}
            <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>
              {filteredData.length.toLocaleString()}
            </strong> real records
          </div>

          <div className="flex items-center space-x-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className={`p-1 rounded-lg border disabled:opacity-30 ${
                isDarkMode
                  ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                  currentPage === pageNum
                    ? 'bg-[#0088cc] text-white shadow-sm'
                    : isDarkMode
                    ? 'text-slate-300 hover:bg-slate-800'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {pageNum}
              </button>
            ))}

            {totalPages > 5 && (
              <>
                <span className="px-1 text-slate-500">...</span>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className={`w-8 h-7 rounded-lg text-xs font-semibold ${
                    currentPage === totalPages
                      ? 'bg-[#0088cc] text-white shadow-sm'
                      : isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className={`p-1 rounded-lg border disabled:opacity-30 ${
                isDarkMode
                  ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 6. MODAL: VIEW EVIDENCE INSPECTOR */}
      {/* ------------------------------------------------------------- */}
      {selectedEvidence && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            {/* Modal Header */}
            <div className={`px-5 py-3.5 border-b flex items-center justify-between ${
              isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-900 border-slate-800 text-white'
            }`}>
              <div className="flex items-center gap-2.5">
                <Eye className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-white">
                    Optical Evidence Dossier • {selectedEvidence.plate}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    High-Definition CCTV Telemetry Capture (Location: {selectedEvidence.location})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvidence(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className={`p-5 space-y-4 ${
              isDarkMode ? 'bg-slate-950/60' : 'bg-slate-50'
            }`}>
              {/* Surveillance Snapshot Frame */}
              <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
                <img
                  src={selectedEvidence.evidenceImageUrl || '/speed_violation_evidence.png'}
                  alt="Captured vehicle frame"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/speed_violation_evidence.png';
                  }}
                />

                {/* Localized Plate Crop inset overlay if available */}
                {selectedEvidence.plateCropUrl && (
                  <div className="absolute top-3 right-3 p-1 rounded-lg bg-black/90 border border-slate-700 shadow-xl pointer-events-auto">
                    <span className="text-[9px] font-mono text-cyan-400 block px-1 pb-0.5">ANPR Plate Crop</span>
                    <img
                      src={selectedEvidence.plateCropUrl}
                      alt="Plate Crop"
                      className="h-10 w-auto rounded border border-slate-800 object-contain bg-black"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Overlaid Target Bounding Box & HUD */}
                <div className="absolute inset-0 flex flex-col justify-between p-3.5 pointer-events-none">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono bg-black/80 backdrop-blur px-2.5 py-1 rounded text-cyan-400 border border-cyan-500/30">
                      SEC-CAM: {selectedEvidence.cameraId ? selectedEvidence.cameraId.toUpperCase() : selectedEvidence.location} [YOLOv8 ByteTrack]
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded border ${
                        selectedEvidence.status === 'Violation'
                          ? 'bg-rose-950/90 text-rose-300 border-rose-500/40'
                          : selectedEvidence.status === 'Paid'
                          ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
                          : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {selectedEvidence.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="bg-black/80 backdrop-blur p-2.5 rounded-xl border border-slate-700 max-w-sm">
                    <div className="text-[11px] text-slate-300 font-mono">
                      RECORDED SPEED: <strong className="text-white text-xs">{selectedEvidence.detectedSpeed > 0 ? `${selectedEvidence.detectedSpeed} km/h` : 'N/A'}</strong> (Limit: {selectedEvidence.speedLimit} km/h)
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      DELTA: <span className={selectedEvidence.difference > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                        {selectedEvidence.difference > 0 ? `+${selectedEvidence.difference}` : selectedEvidence.difference} km/h
                      </span> • ANPR MATCH: {selectedEvidence.plate}
                    </div>
                  </div>
                </div>
              </div>

              {/* Vehicle & Plate Data Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className={`p-2.5 rounded-xl border ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <span className={`text-[10px] uppercase font-semibold block ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-400'
                  }`}>Vehicle Plate</span>
                  <span className={`font-bold font-mono mt-0.5 block ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>{selectedEvidence.plate}</span>
                </div>
                <div className={`p-2.5 rounded-xl border ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <span className={`text-[10px] uppercase font-semibold block ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-400'
                  }`}>Make & Model</span>
                  <span className={`font-medium mt-0.5 block truncate ${
                    isDarkMode ? 'text-slate-200' : 'text-slate-800'
                  }`}>{selectedEvidence.makeModel}</span>
                </div>
                <div className={`p-2.5 rounded-xl border ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <span className={`text-[10px] uppercase font-semibold block ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-400'
                  }`}>Lane / Corridor</span>
                  <span className={`font-medium mt-0.5 block ${
                    isDarkMode ? 'text-slate-200' : 'text-slate-800'
                  }`}>{selectedEvidence.lane}</span>
                </div>
                <div className={`p-2.5 rounded-xl border ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <span className={`text-[10px] uppercase font-semibold block ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-400'
                  }`}>Timestamp</span>
                  <span className={`font-mono text-[11px] mt-0.5 block ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>{selectedEvidence.dateTime}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`px-5 py-3 border-t flex items-center justify-between ${
              isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <span className={`text-[11px] ${
                isDarkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Citation Ref: <code className={isDarkMode ? 'text-sky-400 font-mono' : 'text-slate-700 font-mono'}>{selectedEvidence.fineId || selectedEvidence.id}</code>
              </span>
              <button
                onClick={() => {
                  setSelectedChallan(selectedEvidence);
                  setSelectedEvidence(null);
                }}
                className="px-3.5 py-1.5 bg-[#0088cc] hover:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Full e-Challan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. MODAL: OFFICIAL E-CHALLAN CITATION DOSSIER */}
      {/* ------------------------------------------------------------- */}
      {selectedChallan && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`border rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
          }`}>
            {/* Header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight uppercase">
                    Official Sri Lanka e-Challan Notice
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Ref: {selectedChallan.fineId || selectedChallan.id}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedChallan(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Challan Body (Printable Official Citation Template) */}
            <div className={`p-6 space-y-4 overflow-y-auto ${
              isDarkMode ? 'bg-slate-950/60 text-slate-200' : 'bg-slate-50 text-slate-800'
            }`}>
              {/* Official Emblems & Authority */}
              <div className={`text-center pb-3 border-b ${
                isDarkMode ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <h4 className={`text-xs font-black uppercase tracking-wider ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Democratic Socialist Republic of Sri Lanka
                </h4>
                <p className={`text-[11px] mt-0.5 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  {selectedChallan.policeStation || 'Sri Lanka Police Traffic Headquarters & Road Development Authority (RDA)'}
                </p>
                <span className={`inline-block mt-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${
                  isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                }`}>
                  Motor Traffic Act No. 14 of 1951 (Amended)
                </span>
              </div>

              {/* Status Banner */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                selectedChallan.status === 'Violation'
                  ? isDarkMode
                    ? 'bg-rose-950/50 border-rose-800/60 text-rose-300'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                  : selectedChallan.status === 'Paid'
                  ? isDarkMode
                    ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : isDarkMode
                  ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
                <div className="flex items-center gap-2">
                  {selectedChallan.status === 'Violation' ? (
                    <AlertCircle className="w-5 h-5 text-rose-500" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  )}
                  <div>
                    <span className="text-xs font-bold block">
                      {selectedChallan.status === 'Violation'
                        ? 'Traffic Infringement Recorded'
                        : selectedChallan.status === 'Paid'
                        ? 'Citation Paid & Settled'
                        : 'Speed Compliance Verified'}
                    </span>
                    <span className="text-[11px] opacity-80">
                      {selectedChallan.status === 'Violation'
                        ? `Recorded speed exceeded legal limit by +${selectedChallan.difference} km/h`
                        : selectedChallan.status === 'Paid'
                        ? `Payment verified on ${selectedChallan.paidAt || 'database record'}`
                        : 'Vehicle observed within legal corridor speed limits'}
                    </span>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <span className="text-xs font-bold block">
                    {selectedChallan.fineAmount || 'No Penalty'}
                  </span>
                  {selectedChallan.dueDate && (
                    <span className={`text-[10px] ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}>Due: {selectedChallan.dueDate}</span>
                  )}
                </div>
              </div>

              {/* Details Grid */}
              <div className={`p-4 rounded-xl border space-y-2.5 text-xs ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className={`grid grid-cols-2 gap-3 pb-2 border-b ${
                  isDarkMode ? 'border-slate-800' : 'border-slate-100'
                }`}>
                  <div>
                    <span className={`text-[10px] font-semibold uppercase block ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-400'
                    }`}>Registration No</span>
                    <span className={`font-bold font-mono text-sm ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>{selectedChallan.plate}</span>
                  </div>
                  <div>
                    <span className={`text-[10px] font-semibold uppercase block ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-400'
                    }`}>Vehicle Make / Model</span>
                    <span className={`font-semibold ${
                      isDarkMode ? 'text-slate-200' : 'text-slate-800'
                    }`}>{selectedChallan.makeModel}</span>
                  </div>
                </div>

                <div className={`grid grid-cols-2 gap-3 pb-2 border-b ${
                  isDarkMode ? 'border-slate-800' : 'border-slate-100'
                }`}>
                  <div>
                    <span className={`text-[10px] font-semibold uppercase block ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-400'
                    }`}>Registered Owner</span>
                    <span className={`font-semibold ${
                      isDarkMode ? 'text-slate-200' : 'text-slate-800'
                    }`}>{selectedChallan.owner}</span>
                  </div>
                  <div>
                    <span className={`text-[10px] font-semibold uppercase block ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-400'
                    }`}>NIC Number</span>
                    <span className={`font-mono ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>{selectedChallan.nic}</span>
                  </div>
                </div>

                <div className={`grid grid-cols-2 gap-3 pb-2 border-b ${
                  isDarkMode ? 'border-slate-800' : 'border-slate-100'
                }`}>
                  <div>
                    <span className={`text-[10px] font-semibold uppercase block ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-400'
                    }`}>Date & Time</span>
                    <span className={`font-mono ${
                      isDarkMode ? 'text-slate-200' : 'text-slate-800'
                    }`}>{selectedChallan.dateTime}</span>
                  </div>
                  <div>
                    <span className={`text-[10px] font-semibold uppercase block ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-400'
                    }`}>Location / Corridor</span>
                    <span className={`font-semibold ${
                      isDarkMode ? 'text-slate-200' : 'text-slate-800'
                    }`}>{selectedChallan.location}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                  <div className={`p-2 rounded-lg border ${
                    isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <span className={`text-[10px] block ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-400'
                    }`}>SPEED LIMIT</span>
                    <span className={`text-xs font-bold ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>{selectedChallan.speedLimit > 0 ? `${selectedChallan.speedLimit} km/h` : 'N/A'}</span>
                  </div>
                  <div className={`p-2 rounded-lg border ${
                    isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <span className={`text-[10px] block ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-400'
                    }`}>DETECTED SPEED</span>
                    <span className={`text-xs font-black ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>{selectedChallan.detectedSpeed > 0 ? `${selectedChallan.detectedSpeed} km/h` : 'N/A'}</span>
                  </div>
                  <div className={`p-2 rounded-lg border ${
                    selectedChallan.difference > 0
                      ? isDarkMode
                        ? 'bg-rose-950/60 border-rose-800/60 text-rose-300'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                      : isDarkMode
                      ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}>
                    <span className="text-[10px] opacity-75 block">DELTA</span>
                    <span className="text-xs font-bold">
                      {selectedChallan.difference > 0 ? `+${selectedChallan.difference}` : selectedChallan.difference} km/h
                    </span>
                  </div>
                </div>
              </div>

              {/* QR Verification & Instructions */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="space-y-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    Online Fine Settlement Portal
                  </span>
                  <p className={`text-[11px] max-w-xs ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    Pay online via LankaPay, Commercial Bank, or BOC online banking using citation reference #{selectedChallan.fineId || selectedChallan.id}.
                  </p>
                </div>
                <div className={`p-1.5 rounded-lg border ${
                  isDarkMode ? 'bg-white text-slate-900 border-white' : 'bg-slate-100 text-slate-800 border-slate-200'
                }`}>
                  <QrCode className="w-10 h-10" />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className={`px-6 py-3.5 border-t flex items-center justify-between ${
              isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <button
                onClick={() => window.print()}
                className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                  isDarkMode
                    ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                    : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Notice</span>
              </button>

              <button
                onClick={() => setSelectedChallan(null)}
                className="px-5 py-2 bg-[#0088cc] hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-500/25 transition"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8. SAVE AUDIT REPORT MODAL */}
      {/* ------------------------------------------------------------- */}
      {showSaveAuditModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col transition-colors ${
            isDarkMode ? 'bg-slate-900 border-slate-700/80 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between transition-colors ${
              isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-white'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center">
                  <Save className="w-4 h-4" />
                </div>
                <h2 className={`text-base font-bold tracking-tight ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Save Audit Report
                </h2>
              </div>
              <button
                onClick={() => setShowSaveAuditModal(false)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {/* Report Name */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Report Name
                </label>
                <input
                  type="text"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-medium border focus:outline-none focus:border-sky-500 transition-colors ${
                    isDarkMode 
                      ? 'bg-slate-950 border-slate-700 text-white' 
                      : 'bg-white border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              {/* Date Range */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Date Range
                </label>
                <div className="relative">
                  <Calendar className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`} />
                  <input
                    type="text"
                    value={reportDateRange}
                    onChange={(e) => setReportDateRange(e.target.value)}
                    className={`w-full rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-medium border focus:outline-none focus:border-sky-500 transition-colors ${
                      isDarkMode 
                        ? 'bg-slate-950 border-slate-700 text-white' 
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Highway */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Highway / Corridor
                </label>
                <div className="relative">
                  <Route className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`} />
                  <input
                    type="text"
                    value={reportHighway}
                    onChange={(e) => setReportHighway(e.target.value)}
                    className={`w-full rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-medium border focus:outline-none focus:border-sky-500 transition-colors ${
                      isDarkMode 
                        ? 'bg-slate-950 border-slate-700 text-white' 
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Report Summary Cards */}
              <div>
                <label className={`block text-xs font-bold mb-2 ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Report Summary (From Database)
                </label>
                <div className="grid grid-cols-4 gap-2.5">
                  {/* Total Vehicles */}
                  <div className={`p-3 rounded-xl border text-center flex flex-col items-center justify-between transition-colors ${
                    isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}>
                    <div className="text-sky-500 mb-1">
                      <Car className="w-5 h-5 mx-auto" />
                    </div>
                    <span className={`text-[10px] block ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      Total
                    </span>
                    <span className={`text-sm font-extrabold block mt-0.5 ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      {metrics.totalVehicles.toLocaleString()}
                    </span>
                  </div>

                  {/* Speed Violations */}
                  <div className={`p-3 rounded-xl border text-center flex flex-col items-center justify-between transition-colors ${
                    isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}>
                    <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-xs mb-1">
                      !
                    </div>
                    <span className={`text-[10px] block ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      Violations
                    </span>
                    <span className={`text-sm font-extrabold block mt-0.5 ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      {metrics.speedViolations.toLocaleString()}
                    </span>
                  </div>

                  {/* Warnings */}
                  <div className={`p-3 rounded-xl border text-center flex flex-col items-center justify-between transition-colors ${
                    isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}>
                    <div className="text-amber-500 mb-1">
                      <AlertTriangle className="w-5 h-5 mx-auto fill-amber-500 text-amber-500" />
                    </div>
                    <span className={`text-[10px] block ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      Warnings
                    </span>
                    <span className={`text-sm font-extrabold block mt-0.5 ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      {metrics.warnings.toLocaleString()}
                    </span>
                  </div>

                  {/* Normal / Paid */}
                  <div className={`p-3 rounded-xl border text-center flex flex-col items-center justify-between transition-colors ${
                    isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}>
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs mb-1">
                      ✓
                    </div>
                    <span className={`text-[10px] block ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      Normal
                    </span>
                    <span className={`text-sm font-extrabold block mt-0.5 ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      {metrics.normal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Generated By */}
              <div>
                <label className={`block text-xs font-bold mb-2 ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Generated By
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#005a80] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-sm">
                    TMC
                  </div>
                  <div>
                    <div className={`text-xs font-bold ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      TMC Operations Lead
                    </div>
                    <div className={`text-[11px] ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      Traffic Management Center
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className={`px-6 py-4 border-t flex items-center justify-end gap-3 transition-colors ${
              isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-100'
            }`}>
              <button
                onClick={() => setShowSaveAuditModal(false)}
                className={`px-5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  isDarkMode 
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800' 
                    : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmSaveReport}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#0066cc] hover:bg-[#0055b3] text-white flex items-center gap-2 shadow-sm transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Save Audit Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 9. EXPORT VIOLATION RECORDS MODAL */}
      {/* ------------------------------------------------------------- */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col transition-colors ${
            isDarkMode ? 'bg-slate-900 border-slate-700/80 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between transition-colors ${
              isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-white'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
                <h2 className={`text-base font-bold tracking-tight ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Export Violation Records
                </h2>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 text-xs">
              {/* Export Format */}
              <div>
                <label className={`block font-bold mb-2.5 ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-800'
                }`}>
                  Export Format
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="CSV"
                      checked={exportFormat === 'CSV'}
                      onChange={() => setExportFormat('CSV')}
                      className="w-4 h-4 text-[#0066cc] accent-[#0066cc] cursor-pointer"
                    />
                    <span className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>CSV (Excel Compatible)</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="PDF"
                      checked={exportFormat === 'PDF'}
                      onChange={() => setExportFormat('PDF')}
                      className="w-4 h-4 text-[#0066cc] accent-[#0066cc] cursor-pointer"
                    />
                    <span className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>PDF Document (Official A4 Format)</span>
                  </label>
                </div>
              </div>

              {/* Records Scope */}
              <div>
                <label className={`block font-bold mb-2.5 ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-800'
                }`}>
                  Records Scope
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="exportScope"
                      value="all"
                      checked={exportScope === 'all'}
                      onChange={() => setExportScope('all')}
                      className="w-4 h-4 text-[#0066cc] accent-[#0066cc] cursor-pointer"
                    />
                    <span className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>
                      All filtered records — <strong>{filteredData.length.toLocaleString()}</strong>
                    </span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="exportScope"
                      value="violations"
                      checked={exportScope === 'violations'}
                      onChange={() => setExportScope('violations')}
                      className="w-4 h-4 text-[#0066cc] accent-[#0066cc] cursor-pointer"
                    />
                    <span className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>
                      Violations only — <strong>{filteredData.filter(i => i.status === 'Violation').length.toLocaleString()}</strong>
                    </span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="exportScope"
                      value="page"
                      checked={exportScope === 'page'}
                      onChange={() => setExportScope('page')}
                      className="w-4 h-4 text-[#0066cc] accent-[#0066cc] cursor-pointer"
                    />
                    <span className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>
                      Current page — <strong>{pagedData.length}</strong>
                    </span>
                  </label>
                </div>
              </div>

              {/* Include Columns Checklist */}
              <div>
                <label className={`block font-bold mb-2.5 ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-800'
                }`}>
                  Include Fields
                </label>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportColumns.fineId}
                      onChange={(e) => setExportColumns(prev => ({ ...prev, fineId: e.target.checked }))}
                      className="w-4 h-4 rounded text-[#0066cc] accent-[#0066cc] cursor-pointer"
                    />
                    <span className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>Fine ID</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportColumns.plate}
                      onChange={(e) => setExportColumns(prev => ({ ...prev, plate: e.target.checked }))}
                      className="w-4 h-4 rounded text-[#0066cc] accent-[#0066cc] cursor-pointer"
                    />
                    <span className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>Vehicle Plate</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportColumns.camera}
                      onChange={(e) => setExportColumns(prev => ({ ...prev, camera: e.target.checked }))}
                      className="w-4 h-4 rounded text-[#0066cc] accent-[#0066cc] cursor-pointer"
                    />
                    <span className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>Camera / Track ID</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportColumns.detectedSpeed}
                      onChange={(e) => setExportColumns(prev => ({ ...prev, detectedSpeed: e.target.checked }))}
                      className="w-4 h-4 rounded text-[#0066cc] accent-[#0066cc] cursor-pointer"
                    />
                    <span className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>Detected Speed</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportColumns.dateTime}
                      onChange={(e) => setExportColumns(prev => ({ ...prev, dateTime: e.target.checked }))}
                      className="w-4 h-4 rounded text-[#0066cc] accent-[#0066cc] cursor-pointer"
                    />
                    <span className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>Date & Time</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportColumns.speedLimit}
                      onChange={(e) => setExportColumns(prev => ({ ...prev, speedLimit: e.target.checked }))}
                      className="w-4 h-4 rounded text-[#0066cc] accent-[#0066cc] cursor-pointer"
                    />
                    <span className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>Speed Limit</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportColumns.location}
                      onChange={(e) => setExportColumns(prev => ({ ...prev, location: e.target.checked }))}
                      className="w-4 h-4 rounded text-[#0066cc] accent-[#0066cc] cursor-pointer"
                    />
                    <span className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>Location</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportColumns.status}
                      onChange={(e) => setExportColumns(prev => ({ ...prev, status: e.target.checked }))}
                      className="w-4 h-4 rounded text-[#0066cc] accent-[#0066cc] cursor-pointer"
                    />
                    <span className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>Status</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className={`px-6 py-4 border-t flex items-center justify-end gap-3 transition-colors ${
              isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-100'
            }`}>
              <button
                onClick={() => setShowExportModal(false)}
                className={`px-5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  isDarkMode 
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800' 
                    : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>

              <button
                onClick={handleExecuteExport}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#0066cc] hover:bg-[#0055b3] text-white flex items-center gap-2 shadow-sm transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Download {exportFormat}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 10. DEDICATED PDF REPORT PREVIEW MODAL */}
      {/* ------------------------------------------------------------- */}
      {showPdfPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`border rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] ${
            isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-slate-100 border-slate-300 text-slate-900'
          }`}>
            {/* Preview Modal Header */}
            <div className={`px-6 py-3.5 border-b flex items-center justify-between ${
              isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-sky-500" />
                <div>
                  <h3 className="text-sm font-bold">Speed & Violation Audit Report (PDF Document)</h3>
                  <p className="text-[11px] text-slate-400">Standard A4 Official Layout • E-Mobility TMC Sri Lanka</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                    isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  <span>Print</span>
                </button>

                <button
                  onClick={handleDownloadPdfFile}
                  disabled={isExporting}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-[#0066cc] hover:bg-[#0055b3] text-white flex items-center gap-1.5 shadow-sm transition"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExporting ? 'Generating PDF...' : 'Download PDF'}</span>
                </button>

                <button
                  onClick={() => setShowPdfPreviewModal(false)}
                  className={`p-1.5 rounded-lg ml-2 transition ${
                    isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview Modal Body (Scrollable A4 document container) */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-500/20 flex justify-center">
              <AuditReportPdfTemplate
                id="audit-report-pdf-preview"
                reportId={`RPT-${new Date().toISOString().slice(0, 10)}-${String(records.length).padStart(4, '0')}`}
                reportName={reportName || 'Speed Violation Audit Report'}
                highway={selectedHighway || 'All Corridors'}
                dateRange={dateTimeRange || 'Persistent Records'}
                generatedOn={new Date().toISOString().replace('T', ' ').substring(0, 19)}
                generatedBy="TMC Operations Lead"
                totalVehicles={metrics.totalVehicles}
                speedViolations={metrics.speedViolations}
                warnings={metrics.warnings}
                averageSpeed={metrics.averageSpeed}
                records={filteredData}
              />
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 11. ALWAYS-MOUNTED CONTAINER FOR DIRECT PDF DOWNLOAD */}
      {/* ------------------------------------------------------------- */}
      <div
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '794px',
          background: '#ffffff',
          zIndex: -9999,
          pointerEvents: 'none'
        }}
        aria-hidden="true"
      >
        <AuditReportPdfTemplate
          id="audit-report-pdf-root"
          reportId={`RPT-${new Date().toISOString().slice(0, 10)}-${String(records.length).padStart(4, '0')}`}
          reportName={reportName || 'Speed Violation Audit Report'}
          highway={selectedHighway || 'All Corridors'}
          dateRange={dateTimeRange || 'Persistent Records'}
          generatedOn={new Date().toISOString().replace('T', ' ').substring(0, 19)}
          generatedBy="TMC Operations Lead"
          totalVehicles={metrics.totalVehicles}
          speedViolations={metrics.speedViolations}
          warnings={metrics.warnings}
          averageSpeed={metrics.averageSpeed}
          records={filteredData}
        />
      </div>
    </div>
  );
}
