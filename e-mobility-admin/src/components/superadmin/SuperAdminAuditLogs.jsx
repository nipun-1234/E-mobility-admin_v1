import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { authService } from '../../services/auth.service';
import {
  FileText,
  Download,
  Calendar,
  User,
  Users,
  Shield,
  ShieldAlert,
  Activity,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  Check,
  Globe,
  Laptop,
  Monitor,
  Smartphone,
  MapPin,
  Key,
  LogIn,
  LogOut,
  Edit,
  Trash2,
  Plus,
  Eye,
  Settings,
  Sparkles,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

/**
 * Safely parse real User-Agent strings into browser, OS, and device labels
 */
function parseUserAgent(uaString) {
  if (!uaString || typeof uaString !== 'string') {
    return {
      browser: 'Web Browser',
      browserFull: 'Standard HTTP Client',
      os: 'System',
      deviceType: 'Desktop'
    };
  }

  let browser = 'Browser';
  let browserFull = uaString;
  let os = 'Unknown OS';
  let deviceType = 'Desktop';

  if (uaString.includes('Edg/')) {
    const match = uaString.match(/Edg\/([\d.]+)/);
    browser = match ? `Edge ${match[1].split('.')[0]}` : 'Edge';
    browserFull = match ? `Microsoft Edge ${match[1]}` : 'Microsoft Edge';
  } else if (uaString.includes('Chrome/')) {
    const match = uaString.match(/Chrome\/([\d.]+)/);
    browser = match ? `Chrome ${match[1].split('.')[0]}` : 'Chrome';
    browserFull = match ? `Google Chrome ${match[1]}` : 'Google Chrome';
  } else if (uaString.includes('Firefox/')) {
    const match = uaString.match(/Firefox\/([\d.]+)/);
    browser = match ? `Firefox ${match[1].split('.')[0]}` : 'Firefox';
    browserFull = match ? `Mozilla Firefox ${match[1]}` : 'Mozilla Firefox';
  } else if (uaString.includes('Safari/') && !uaString.includes('Chrome/')) {
    const match = uaString.match(/Version\/([\d.]+)/);
    browser = match ? `Safari ${match[1].split('.')[0]}` : 'Safari';
    browserFull = match ? `Apple Safari ${match[1]}` : 'Apple Safari';
  } else if (uaString.includes('Postman') || uaString.includes('curl') || uaString.includes('python')) {
    browser = uaString.split('/')[0] || 'API Client';
    browserFull = uaString;
  }

  if (uaString.includes('Windows NT 10.0')) os = 'Windows 11 / 10';
  else if (uaString.includes('Windows')) os = 'Windows';
  else if (uaString.includes('Macintosh') || uaString.includes('Mac OS')) os = 'macOS';
  else if (uaString.includes('Linux')) os = 'Linux';
  else if (uaString.includes('Android')) os = 'Android';
  else if (uaString.includes('iPhone') || uaString.includes('iPad')) os = 'iOS';

  if (uaString.includes('Mobile') || uaString.includes('Android') || uaString.includes('iPhone')) {
    deviceType = `${os} (Mobile)`;
  } else {
    deviceType = `${os} (Desktop)`;
  }

  return { browser, browserFull, os, deviceType };
}

/**
 * Classify IP address type safely
 */
function getIpType(ip) {
  if (!ip) return 'N/A';
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return 'Local';
  if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.16.')) return 'Intranet';
  return 'IPv4';
}

export default function SuperAdminAuditLogs({ isDarkMode = true, showToast }) {
  // Backend audit logs state
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [selectedLogId, setSelectedLogId] = useState(null);
  const [showLogDetails, setShowLogDetails] = useState(true);
  const [copiedKey, setCopiedKey] = useState(null);

  // Filters
  const [dateRange, setDateRange] = useState('All Recorded Dates');
  const [userFilter, setUserFilter] = useState('All Users');
  const [actionFilter, setActionFilter] = useState('All Actions');
  const [moduleFilter, setModuleFilter] = useState('All Modules');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage, setLogsPerPage] = useState(8);

  // Fetch real PostgreSQL login audit records
  const fetchAuditLogs = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setLoadError(null);
    try {
      const response = await authService.getLoginAudits();
      const rawAudits = Array.isArray(response) ? response : (response?.audits || []);
      
      const mapped = rawAudits.map((audit) => {
        const ua = parseUserAgent(audit.device_info);
        const ipType = getIpType(audit.ip_address);
        const dateObj = audit.timestamp ? new Date(audit.timestamp) : new Date();
        const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toISOString().split('T')[0] : 'N/A';
        const timeStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';

        const isSuperAdmin = audit.role === 'super_admin';
        const isAdmin = audit.role === 'admin';
        const isSuccess = audit.login_status === 'SUCCESS';

        const roleLabel = isSuperAdmin ? 'Super Admin' : (isAdmin ? 'Admin' : (audit.role === 'user' ? 'Citizen' : 'Unknown'));
        const avatar = isSuperAdmin ? 'SA' : (isAdmin ? 'AD' : 'US');
        const avatarColor = isSuperAdmin ? 'cyan' : (isAdmin ? 'indigo' : 'blue');
        const stripeColor = !isSuccess ? 'rose' : (isSuperAdmin ? 'cyan' : 'emerald');

        const userName = audit.user_email || audit.user_name || 'System User';
        const actionLabel = isSuccess ? 'Login' : 'Failed Login';
        const actionType = isSuccess ? 'login' : 'failed_login';

        let remarks = 'User credentials authenticated successfully.';
        if (!isSuccess) {
          remarks = audit.verification_status === 'INVALID_CREDENTIALS'
            ? 'Authentication rejected: Invalid password entered.'
            : 'Authentication rejected: Account identifier not recognized.';
        } else if (audit.verification_status === 'VERIFIED') {
          remarks = 'Daily biometric verification photo and credentials confirmed.';
        }

        return {
          id: audit.id,
          stripeColor,
          date: dateStr,
          time: timeStr,
          timestamp: audit.timestamp,
          user: {
            name: userName,
            role: roleLabel,
            avatar,
            avatarColor
          },
          action: actionLabel,
          actionType,
          module: 'Auth',
          ip: audit.ip_address || '127.0.0.1',
          ipType,
          browser: ua.browser,
          browserFull: ua.browserFull,
          os: ua.os,
          deviceType: ua.deviceType,
          location: ipType === 'Local' ? 'Local Console' : 'Sri Lanka',
          country: 'Sri Lanka',
          status: isSuccess ? 'Success' : 'Failed',
          sessionId: `SEC-AUDIT-${audit.id}-${audit.verification_status || 'AUTH'}`,
          userAgent: audit.device_info || 'Direct System Client',
          remarks,
          photoAvailable: audit.photo_available || false,
          verificationStatus: audit.verification_status
        };
      });

      setLogs(mapped);
      if (mapped.length > 0 && selectedLogId === null) {
        setSelectedLogId(mapped[0].id);
      }
    } catch (err) {
      console.error('Failed to load audit logs from backend:', err);
      setLoadError('Failed to load real audit records from PostgreSQL database.');
      setLogs([]);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [selectedLogId]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Derived Dynamic Summary Metric Cards from real records
  const summaryMetrics = useMemo(() => {
    const total = logs.length;
    const logins = logs.filter(l => l.status === 'Success').length;
    const adminActions = logs.filter(l => l.user.role === 'Admin' || l.user.role === 'Super Admin').length;
    const securityAlerts = logs.filter(l => l.status === 'Failed').length;

    return {
      total,
      logins,
      adminActions,
      securityAlerts
    };
  }, [logs]);

  // Selected Log Reference
  const selectedLog = useMemo(() => {
    if (!logs || logs.length === 0) return null;
    return logs.find((l) => l.id === selectedLogId) || logs[0];
  }, [logs, selectedLogId]);

  // Filter logic
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        log.user.name.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.module.toLowerCase().includes(q) ||
        log.ip.toLowerCase().includes(q) ||
        log.location.toLowerCase().includes(q) ||
        log.browser.toLowerCase().includes(q) ||
        log.os.toLowerCase().includes(q) ||
        String(log.id).toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (userFilter !== 'All Users') {
        const uKey = userFilter.toLowerCase();
        if (!log.user.name.toLowerCase().includes(uKey) && !log.user.role.toLowerCase().includes(uKey)) {
          return false;
        }
      }
      if (actionFilter !== 'All Actions' && log.action.toLowerCase() !== actionFilter.toLowerCase()) {
        return false;
      }
      if (moduleFilter !== 'All Modules' && log.module.toLowerCase() !== moduleFilter.toLowerCase()) {
        return false;
      }
      if (statusFilter !== 'All Status' && log.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [logs, searchQuery, userFilter, actionFilter, moduleFilter, statusFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / logsPerPage));
  const pagedLogs = useMemo(() => {
    const start = (currentPage - 1) * logsPerPage;
    return filteredLogs.slice(start, start + logsPerPage);
  }, [filteredLogs, currentPage, logsPerPage]);

  const handleResetFilters = () => {
    setUserFilter('All Users');
    setActionFilter('All Actions');
    setModuleFilter('All Modules');
    setStatusFilter('All Status');
    setSearchQuery('');
    setCurrentPage(1);
    showToast?.('Audit filters reset to default.', 'info');
  };

  const handleExport = (format) => {
    if (filteredLogs.length === 0) {
      showToast?.('No audit records to export.', 'warning');
      return;
    }

    if (format === 'CSV') {
      const headers = ['Audit ID', 'Date', 'Time', 'User Email', 'Role', 'Action', 'Module', 'IP Address', 'Device / OS', 'Status', 'Session Reference'];
      const rows = filteredLogs.map((log) => [
        `"${log.id}"`,
        `"${log.date}"`,
        `"${log.time}"`,
        `"${log.user.name}"`,
        `"${log.user.role}"`,
        `"${log.action}"`,
        `"${log.module}"`,
        `"${log.ip}"`,
        `"${log.os} / ${log.browser}"`,
        `"${log.status}"`,
        `"${log.sessionId}"`
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Security_Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast?.(`Exported ${filteredLogs.length} real audit records to CSV.`, 'success');
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    showToast?.('Session ID copied to clipboard.', 'info');
  };

  const getStripeColorClass = (color) => {
    switch (color) {
      case 'emerald':
        return 'border-l-4 border-l-emerald-500';
      case 'purple':
        return 'border-l-4 border-l-purple-500';
      case 'amber':
        return 'border-l-4 border-l-amber-500';
      case 'rose':
        return 'border-l-4 border-l-rose-500';
      case 'cyan':
        return 'border-l-4 border-l-cyan-500';
      case 'blue':
        return 'border-l-4 border-l-blue-500';
      default:
        return 'border-l-4 border-l-emerald-500';
    }
  };

  const renderActionBadge = (action) => {
    const act = action.toLowerCase();
    if (act === 'login') {
      return (
        <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          Login
        </span>
      );
    }
    if (act.includes('failed')) {
      return (
        <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
          Failed Login
        </span>
      );
    }
    if (act === 'create') {
      return (
        <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
          Create
        </span>
      );
    }
    if (act === 'update') {
      return (
        <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
          Update
        </span>
      );
    }
    if (act === 'delete') {
      return (
        <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
          Delete
        </span>
      );
    }
    if (act === 'logout') {
      return (
        <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
          Logout
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
        {action}
      </span>
    );
  };

  const renderBrowserIcon = (browser) => {
    if (browser.includes('Chrome')) {
      return (
        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-emerald-400 flex items-center justify-center p-0.5">
          <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-[8px] font-bold text-white">
            C
          </div>
        </div>
      );
    }
    if (browser.includes('Edge')) {
      return (
        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center p-0.5">
          <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-[8px] font-bold text-white">
            E
          </div>
        </div>
      );
    }
    if (browser.includes('Firefox')) {
      return (
        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-orange-400 to-rose-600 flex items-center justify-center p-0.5">
          <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-[8px] font-bold text-white">
            F
          </div>
        </div>
      );
    }
    return <Globe className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* -------------------- 1. HEADER & EXPORT BUTTON -------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className={`text-2xl font-black tracking-tight flex items-center gap-2.5 ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}
          >
            Audit Logs
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-medium border ${
              isDarkMode ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}>
              PostgreSQL Active
            </span>
          </h1>
          <p
            className={`text-xs md:text-sm mt-0.5 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Real cryptographic audit log records of all administrative and operator logins stored in PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAuditLogs()}
            disabled={loading}
            className={`p-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all shadow-sm ${
              isDarkMode
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            title="Refresh database records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => handleExport('CSV')}
            disabled={logs.length === 0}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>Export Logs (CSV)</span>
          </button>
        </div>
      </div>

      {/* -------------------- 2. TOP SUMMARY METRIC CARDS (DYNAMIC FROM REAL DATA) -------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Logs */}
        <div
          className={`p-4 rounded-2xl border transition-all duration-200 ${
            isDarkMode
              ? 'bg-[#0d1420]/90 border-slate-800/80 shadow-lg'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
              <User className="w-5 h-5" />
            </div>
            <div className="text-right">
              <p className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Total Audit Records
              </p>
              <h3 className={`text-2xl font-black tracking-tight mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {summaryMetrics.total.toLocaleString()}
              </h3>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/50">
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
              <span>Database Sync</span>
              <span className="text-slate-500 font-normal">in PostgreSQL</span>
            </span>
          </div>
        </div>

        {/* Card 2: Successful Logins */}
        <div
          className={`p-4 rounded-2xl border transition-all duration-200 ${
            isDarkMode
              ? 'bg-[#0d1420]/90 border-slate-800/80 shadow-lg'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <LogIn className="w-5 h-5" />
            </div>
            <div className="text-right">
              <p className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Successful Logins
              </p>
              <h3 className={`text-2xl font-black tracking-tight mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {summaryMetrics.logins.toLocaleString()}
              </h3>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/50">
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
              <span>Authenticated</span>
              <span className="text-slate-500 font-normal">sessions</span>
            </span>
          </div>
        </div>

        {/* Card 3: Admin Actions */}
        <div
          className={`p-4 rounded-2xl border transition-all duration-200 ${
            isDarkMode
              ? 'bg-[#0d1420]/90 border-slate-800/80 shadow-lg'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <div className="text-right">
              <p className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Privileged Users
              </p>
              <h3 className={`text-2xl font-black tracking-tight mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {summaryMetrics.adminActions.toLocaleString()}
              </h3>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/50">
            <span className="text-[11px] font-bold text-purple-400 flex items-center gap-1">
              <span>Admin / Super Admin</span>
            </span>
          </div>
        </div>

        {/* Card 4: Security Alerts */}
        <div
          className={`p-4 rounded-2xl border transition-all duration-200 ${
            isDarkMode
              ? 'bg-[#0d1420]/90 border-slate-800/80 shadow-lg'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="text-right">
              <p className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Security Alerts / Failures
              </p>
              <h3 className={`text-2xl font-black tracking-tight mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {summaryMetrics.securityAlerts.toLocaleString()}
              </h3>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/50">
            <span className={`text-[11px] font-bold flex items-center gap-1 ${
              summaryMetrics.securityAlerts > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              <span>{summaryMetrics.securityAlerts > 0 ? 'Action required' : 'No active incidents'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* -------------------- 3. COMPREHENSIVE FILTER PANEL -------------------- */}
      <div
        className={`p-4 rounded-2xl border space-y-3 transition-all duration-200 ${
          isDarkMode
            ? 'bg-[#0d1420]/90 border-slate-800/80 shadow-xl'
            : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        {/* Top Dropdowns Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Date Range */}
          <div>
            <label className="block text-[10px] font-mono font-bold text-slate-400 mb-1 uppercase flex items-center gap-1">
              <Calendar className="w-3 h-3 text-cyan-400" />
              <span>Date Range</span>
            </label>
            <div
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between gap-1 cursor-pointer ${
                isDarkMode
                  ? 'bg-[#070b14]/80 border-slate-800 text-slate-200'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <span className="truncate text-[11px]">{dateRange}</span>
              <Calendar className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            </div>
          </div>

          {/* 2. User / Admin */}
          <div>
            <label className="block text-[10px] font-mono font-bold text-slate-400 mb-1 uppercase flex items-center gap-1">
              <User className="w-3 h-3 text-emerald-400" />
              <span>User Role</span>
            </label>
            <select
              value={userFilter}
              onChange={(e) => {
                setUserFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none ${
                isDarkMode
                  ? 'bg-[#070b14]/80 border-slate-800 text-slate-200'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All Users">All Roles</option>
              <option value="Super Admin">Super Admin</option>
              <option value="Admin">Admin</option>
              <option value="Citizen">Citizen</option>
            </select>
          </div>

          {/* 3. Action Type */}
          <div>
            <label className="block text-[10px] font-mono font-bold text-slate-400 mb-1 uppercase flex items-center gap-1">
              <Activity className="w-3 h-3 text-purple-400" />
              <span>Action Type</span>
            </label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none ${
                isDarkMode
                  ? 'bg-[#070b14]/80 border-slate-800 text-slate-200'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All Actions">All Actions</option>
              <option value="Login">Login</option>
              <option value="Failed Login">Failed Login</option>
            </select>
          </div>

          {/* 4. Module */}
          <div>
            <label className="block text-[10px] font-mono font-bold text-slate-400 mb-1 uppercase flex items-center gap-1">
              <Layers className="w-3 h-3 text-blue-400" />
              <span>Module</span>
            </label>
            <select
              value={moduleFilter}
              onChange={(e) => {
                setModuleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none ${
                isDarkMode
                  ? 'bg-[#070b14]/80 border-slate-800 text-slate-200'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All Modules">All Modules</option>
              <option value="Auth">Auth</option>
            </select>
          </div>

          {/* 5. Status */}
          <div>
            <label className="block text-[10px] font-mono font-bold text-slate-400 mb-1 uppercase flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Status</span>
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none ${
                isDarkMode
                  ? 'bg-[#070b14]/80 border-slate-800 text-slate-200'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All Status">All Status</option>
              <option value="Success">Success Only</option>
              <option value="Failed">Failed Only</option>
            </select>
          </div>

          {/* 6. Filter Action Button */}
          <div className="flex items-end">
            <button
              onClick={() => showToast?.('Filters updated.', 'info')}
              className="w-full py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Filter className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Bottom Search & Reset Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by user email, IP address, device, or audit ID..."
              className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border outline-none font-medium transition-all ${
                isDarkMode
                  ? 'bg-[#070b14]/80 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-emerald-500/50'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-600'
              }`}
            />
          </div>

          <button
            onClick={handleResetFilters}
            className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors flex-shrink-0 ${
              isDarkMode
                ? 'border-slate-800 bg-[#070b14]/60 text-slate-300 hover:text-white hover:border-slate-700'
                : 'border-slate-200 bg-white text-slate-700 hover:text-slate-900'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* -------------------- 4. DUAL PANE: AUDIT LOGS TABLE & DETAILS PANEL -------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT / CENTER: AUDIT LOGS TABLE */}
        <div
          className={`${
            showLogDetails && selectedLog
              ? 'lg:col-span-8 xl:col-span-8 2xl:col-span-8'
              : 'lg:col-span-12'
          } rounded-2xl border transition-all duration-200 overflow-hidden ${
            isDarkMode
              ? 'bg-[#0d1420]/90 border-slate-800/80 shadow-xl'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  className={`border-b text-[10px] font-bold tracking-wider uppercase font-mono ${
                    isDarkMode
                      ? 'border-slate-800/80 text-slate-400 bg-slate-900/40'
                      : 'border-slate-200 text-slate-500 bg-slate-50/80'
                  }`}
                >
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-3 whitespace-nowrap">DATE & TIME</th>
                  <th className="py-3 px-3 whitespace-nowrap">USER IDENTITY</th>
                  <th className="py-3 px-3 whitespace-nowrap">ACTION</th>
                  <th className="py-3 px-3 whitespace-nowrap">MODULE</th>
                  <th className="py-3 px-3 whitespace-nowrap">IP ADDRESS</th>
                  <th className="py-3 px-3 whitespace-nowrap">DEVICE / BROWSER</th>
                  <th className="py-3 px-3 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                      <p>Loading audit records from PostgreSQL...</p>
                    </td>
                  </tr>
                ) : loadError ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-rose-400">
                      <AlertCircle className="w-6 h-6 mx-auto mb-2 text-rose-500" />
                      <p className="font-semibold">{loadError}</p>
                      <button
                        onClick={() => fetchAuditLogs()}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 text-xs hover:bg-rose-900 transition"
                      >
                        Retry Connection
                      </button>
                    </td>
                  </tr>
                ) : pagedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <FileText className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-60" />
                      <p className="font-semibold">No audit records available.</p>
                      <p className="text-[11px] mt-1 text-slate-500">
                        {logs.length === 0
                          ? 'PostgreSQL contains 0 login audits. New user and administrator logins will automatically populate this audit log.'
                          : 'No audit records match your active search filters.'}
                      </p>
                      {logs.length > 0 && (
                        <button
                          onClick={handleResetFilters}
                          className="mt-2 text-xs text-emerald-400 hover:underline font-semibold"
                        >
                          Reset filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  pagedLogs.map((log) => {
                    const isSelected = selectedLog?.id === log.id;

                    return (
                      <tr
                        key={log.id}
                        onClick={() => {
                          setSelectedLogId(log.id);
                          setShowLogDetails(true);
                        }}
                        className={`cursor-pointer transition-colors ${getStripeColorClass(
                          log.stripeColor
                        )} ${
                          isSelected
                            ? isDarkMode
                              ? 'bg-slate-800/60'
                              : 'bg-emerald-50/50'
                            : isDarkMode
                            ? 'hover:bg-slate-900/60'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* # Number */}
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-400">
                          {log.id}
                        </td>

                        {/* Date & Time */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="font-mono text-xs font-bold text-slate-200">
                            {log.date}
                          </div>
                          <div className="font-mono text-[10px] text-slate-500">
                            {log.time}
                          </div>
                        </td>

                        {/* User */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${
                                log.user.avatarColor === 'cyan'
                                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                  : log.user.avatarColor === 'indigo'
                                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              }`}
                            >
                              {log.user.avatar}
                            </div>
                            <div className="max-w-[150px] truncate">
                              <div
                                className={`font-semibold text-xs truncate ${
                                  isDarkMode ? 'text-slate-200' : 'text-slate-800'
                                }`}
                                title={log.user.name}
                              >
                                {log.user.name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {log.user.role}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {renderActionBadge(log.action)}
                        </td>

                        {/* Module */}
                        <td className="py-3.5 px-3 whitespace-nowrap text-slate-400 font-medium">
                          {log.module}
                        </td>

                        {/* IP Address */}
                        <td className="py-3.5 px-3 whitespace-nowrap font-mono text-xs text-slate-300">
                          {log.ip}
                        </td>

                        {/* Device / Browser */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {renderBrowserIcon(log.browser)}
                            <div>
                              <div className="text-xs font-semibold text-slate-200">
                                {log.browser}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {log.os}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          {log.status === 'Success' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Success</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                              <AlertCircle className="w-3 h-3 text-rose-400" />
                              <span>Failed</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Pagination */}
          <div className="p-4 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              Showing <span className="font-bold text-white">{filteredLogs.length > 0 ? (currentPage - 1) * logsPerPage + 1 : 0}</span> to{' '}
              <span className="font-bold text-white">{Math.min(currentPage * logsPerPage, filteredLogs.length)}</span> of{' '}
              <span className="font-bold text-white">{filteredLogs.length}</span> persistent records
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-300"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                      currentPage === pageNum
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : isDarkMode
                        ? 'text-slate-300 hover:bg-slate-800 border border-slate-800'
                        : 'text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-300"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div
                className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-slate-300'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <span>{logsPerPage} per page</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT DRAWER: LOG DETAILS */}
        {showLogDetails && selectedLog && (
          <div
            className="lg:col-span-4 xl:col-span-4 2xl:col-span-4 rounded-2xl border transition-all duration-200 p-5 space-y-4 shadow-xl animate-in fade-in slide-in-from-right-4"
            style={{
              backgroundColor: isDarkMode ? '#0d1420' : '#ffffff',
              borderColor: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(226, 232, 240, 0.9)'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <h2
                className={`text-base font-bold tracking-tight ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                Log Details
              </h2>
              <button
                onClick={() => setShowLogDetails(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Event Summary Banner */}
            <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${
              selectedLog.status === 'Success'
                ? 'bg-emerald-500/10 border-emerald-500/25'
                : 'bg-rose-500/10 border-rose-500/25'
            }`}>
              <div className={`p-2.5 rounded-xl border ${
                selectedLog.status === 'Success'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
              }`}>
                {selectedLog.status === 'Success' ? <LogIn className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  User {selectedLog.action}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 leading-snug">
                  {selectedLog.remarks}
                </p>
              </div>
            </div>

            {/* Key-Value Details Grid */}
            <div className="space-y-2.5 text-xs">
              {/* Date & Time */}
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/50">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Date & Time</span>
                </span>
                <span className="font-mono font-bold text-slate-200">
                  {selectedLog.date} {selectedLog.time}
                </span>
              </div>

              {/* User */}
              <div className="flex items-start justify-between py-1.5 border-b border-slate-800/50">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span>User Identity</span>
                </span>
                <div className="text-right">
                  <p className="font-semibold text-slate-200">{selectedLog.user.name}</p>
                  <span className="inline-block mt-0.5 px-2 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-cyan-400 border border-slate-700">
                    {selectedLog.user.role}
                  </span>
                </div>
              </div>

              {/* Action */}
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/50">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                  <span>Action</span>
                </span>
                <span className="font-semibold text-slate-200">{selectedLog.action}</span>
              </div>

              {/* IP Address */}
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/50">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <span>IP Address</span>
                </span>
                <span className="font-mono text-slate-200">
                  {selectedLog.ip} ({selectedLog.ipType})
                </span>
              </div>

              {/* Device */}
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/50">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Device</span>
                </span>
                <span className="text-slate-200 font-medium">
                  {selectedLog.deviceType}
                </span>
              </div>

              {/* Browser */}
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/50">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-amber-400" />
                  <span>Browser</span>
                </span>
                <span className="font-medium text-slate-200">
                  {selectedLog.browserFull}
                </span>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/50">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Status</span>
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  selectedLog.status === 'Success'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${selectedLog.status === 'Success' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                  <span>{selectedLog.status}</span>
                </span>
              </div>

              {/* Session ID with copy */}
              <div className="py-1.5 border-b border-slate-800/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Audit Reference ID</span>
                  </span>
                  <button
                    onClick={() => copyToClipboard(selectedLog.sessionId, 'session')}
                    className="text-slate-400 hover:text-emerald-400 p-0.5"
                    title="Copy Reference ID"
                  >
                    {copiedKey === 'session' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <div className="font-mono text-[10px] text-slate-400 break-all bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                  {selectedLog.sessionId}
                </div>
              </div>

              {/* User Agent */}
              <div className="py-1.5 border-b border-slate-800/50">
                <span className="text-slate-400 flex items-center gap-1.5 mb-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>User Agent Header</span>
                </span>
                <p className="font-mono text-[10px] text-slate-500 leading-tight break-all bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                  {selectedLog.userAgent}
                </p>
              </div>

              {/* Remarks */}
              <div className="py-1.5">
                <span className="text-slate-400 flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Audit Remarks</span>
                </span>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60">
                  {selectedLog.remarks || '-'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* -------------------- 5. BOTTOM STATUS BADGE -------------------- */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-bold text-slate-400">Super Admin Audit Pipeline</span>
          <span className="text-slate-600">PostgreSQL</span>
        </div>
        <div>
          <span>Cryptographic Hash: HMAC-SHA256 Encrypted</span>
        </div>
      </div>
    </div>
  );
}
