import React, { useState, useMemo } from 'react';
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

const INITIAL_LOGS = [
  {
    id: 1,
    stripeColor: 'emerald',
    date: '2026-10-05',
    time: '02:15:32 PM',
    user: {
      name: 'emobilitysuperadmin@gmail.com',
      role: 'Super Admin',
      avatar: 'SA',
      avatarColor: 'cyan'
    },
    action: 'Login',
    actionType: 'login',
    module: 'Auth',
    ip: '127.0.0.1',
    ipType: 'Local',
    browser: 'Chrome 138',
    browserFull: 'Chrome 138.0.7204.157',
    os: 'Windows 11',
    deviceType: 'Windows 11 (Desktop)',
    location: 'Colombo',
    country: 'Sri Lanka',
    status: 'Success',
    sessionId: 'a8f3d2e4-7c9b-4d1a-9e5f-2c8d19ab47e1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    remarks: 'MFA Biometric verification passed successfully.'
  },
  {
    id: 2,
    stripeColor: 'purple',
    date: '2026-10-05',
    time: '01:44:17 PM',
    user: {
      name: 'Nimali P.',
      role: 'Admin',
      avatar: 'AD',
      avatarColor: 'indigo'
    },
    action: 'Create',
    actionType: 'create',
    module: 'Users',
    ip: '192.168.1.25',
    ipType: 'Intranet',
    browser: 'Edge 137',
    browserFull: 'Microsoft Edge 137.0.2810.92',
    os: 'Windows 11',
    deviceType: 'Windows 11 (Desktop)',
    location: 'Kandy',
    country: 'Sri Lanka',
    status: 'Success',
    sessionId: 'f72b109e-31dc-4a29-b6aa-55289d0cf318',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0',
    remarks: 'Created operator profile for Southern Expressway plaza.'
  },
  {
    id: 3,
    stripeColor: 'amber',
    date: '2026-10-05',
    time: '12:38:09 PM',
    user: {
      name: 'emobilitysuperadmin@gmail.com',
      role: 'Super Admin',
      avatar: 'SA',
      avatarColor: 'cyan'
    },
    action: 'Update',
    actionType: 'update',
    module: 'Roles',
    ip: '203.94.76.112',
    ipType: 'Public Static',
    browser: 'Chrome 137',
    browserFull: 'Chrome 137.0.7150.120',
    os: 'Windows 11',
    deviceType: 'Windows 11 (Desktop)',
    location: 'Colombo',
    country: 'Sri Lanka',
    status: 'Success',
    sessionId: 'c4e92a11-884b-4ec9-8d77-6f112e4b892a',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    remarks: 'Updated module-wise permission matrix for Operator role.'
  },
  {
    id: 4,
    stripeColor: 'rose',
    date: '2026-10-05',
    time: '11:12:54 AM',
    user: {
      name: 'Kasun R.',
      role: 'Admin',
      avatar: 'AD',
      avatarColor: 'indigo'
    },
    action: 'Delete',
    actionType: 'delete',
    module: 'User',
    ip: '192.168.1.40',
    ipType: 'Intranet',
    browser: 'Firefox 132',
    browserFull: 'Mozilla Firefox 132.0.2',
    os: 'Windows 10',
    deviceType: 'Windows 10 (Desktop)',
    location: 'Galle',
    country: 'Sri Lanka',
    status: 'Success',
    sessionId: 'b188c039-4f22-4889-aa44-123498ff0021',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
    remarks: 'Revoked test account access per security cleanup policy.'
  },
  {
    id: 5,
    stripeColor: 'cyan',
    date: '2026-10-05',
    time: '10:03:21 AM',
    user: {
      name: 'Dinesh M.',
      role: 'Operator',
      avatar: 'OP',
      avatarColor: 'blue'
    },
    action: 'View',
    actionType: 'view',
    module: 'Reports',
    ip: '203.94.76.112',
    ipType: 'Public Static',
    browser: 'Chrome 138',
    browserFull: 'Chrome 138.0.7204.157',
    os: 'Windows 11',
    deviceType: 'Windows 11 (Desktop)',
    location: 'Matara',
    country: 'Sri Lanka',
    status: 'Success',
    sessionId: 'd8924bfe-1029-43c8-a6e5-7729bc3488f1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    remarks: 'Generated daily toll transaction settlement audit.'
  },
  {
    id: 6,
    stripeColor: 'emerald',
    date: '2026-10-04',
    time: '06:28:11 PM',
    user: {
      name: 'emobilitysuperadmin@gmail.com',
      role: 'Super Admin',
      avatar: 'SA',
      avatarColor: 'cyan'
    },
    action: 'Logout',
    actionType: 'logout',
    module: 'Auth',
    ip: '127.0.0.1',
    ipType: 'Local',
    browser: 'Chrome 138',
    browserFull: 'Chrome 138.0.7204.157',
    os: 'Windows 11',
    deviceType: 'Windows 11 (Desktop)',
    location: 'Colombo',
    country: 'Sri Lanka',
    status: 'Success',
    sessionId: 'e245a88c-9821-4f11-9ac2-110022334455',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    remarks: 'Graceful session termination by administrator.'
  },
  {
    id: 7,
    stripeColor: 'purple',
    date: '2026-10-04',
    time: '05:17:44 PM',
    user: {
      name: 'Nimali P.',
      role: 'Admin',
      avatar: 'AD',
      avatarColor: 'indigo'
    },
    action: 'Update',
    actionType: 'update',
    module: 'Settings',
    ip: '192.168.8.15',
    ipType: 'Intranet',
    browser: 'Edge 137',
    browserFull: 'Microsoft Edge 137.0.2810.92',
    os: 'Windows 11',
    deviceType: 'Windows 11 (Desktop)',
    location: 'Kandy',
    country: 'Sri Lanka',
    status: 'Success',
    sessionId: '772b89ac-3129-4d22-8b3a-aa2244668800',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0',
    remarks: 'Adjusted automatic ANPR confidence threshold to 92%.'
  },
  {
    id: 8,
    stripeColor: 'blue',
    date: '2026-10-04',
    time: '04:02:18 PM',
    user: {
      name: 'emobilitysuperadmin@gmail.com',
      role: 'Super Admin',
      avatar: 'SA',
      avatarColor: 'cyan'
    },
    action: 'Create',
    actionType: 'create',
    module: 'Role',
    ip: '203.94.76.112',
    ipType: 'Public Static',
    browser: 'Chrome 137',
    browserFull: 'Chrome 137.0.7150.120',
    os: 'Windows 11',
    deviceType: 'Windows 11 (Desktop)',
    location: 'Colombo',
    country: 'Sri Lanka',
    status: 'Success',
    sessionId: '19aa44c0-55e1-4bb2-9844-332211aabbcc',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    remarks: 'Created Custom Role 1 for Regional Operations team.'
  }
];

export default function SuperAdminAuditLogs({ isDarkMode, showToast }) {
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [selectedLogId, setSelectedLogId] = useState(1);
  const [showLogDetails, setShowLogDetails] = useState(true);
  const [copiedKey, setCopiedKey] = useState(null);

  // Filters
  const [dateRange, setDateRange] = useState('2025-09-01 → 2025-10-05');
  const [userFilter, setUserFilter] = useState('All Users');
  const [actionFilter, setActionFilter] = useState('All Actions');
  const [moduleFilter, setModuleFilter] = useState('All Modules');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage, setLogsPerPage] = useState(8);

  const selectedLog = useMemo(() => {
    return logs.find((l) => l.id === selectedLogId) || logs[0];
  }, [logs, selectedLogId]);

  // Filter logic
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        log.user.name.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.module.toLowerCase().includes(q) ||
        log.ip.toLowerCase().includes(q) ||
        log.location.toLowerCase().includes(q) ||
        log.browser.toLowerCase().includes(q) ||
        log.os.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (userFilter !== 'All Users' && !log.user.name.toLowerCase().includes(userFilter.toLowerCase())) {
        return false;
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

  const handleResetFilters = () => {
    setUserFilter('All Users');
    setActionFilter('All Actions');
    setModuleFilter('All Modules');
    setStatusFilter('All Status');
    setSearchQuery('');
    showToast?.('Audit filters reset to default.', 'info');
  };

  const handleExport = (format) => {
    showToast?.(`Exporting ${filteredLogs.length} audit logs as ${format}...`, 'success');
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
            className={`text-2xl font-black tracking-tight ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}
          >
            Audit Logs
          </h1>
          <p
            className={`text-xs md:text-sm mt-0.5 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Track all system activities, logins, and administrative actions with detailed information.
          </p>
        </div>

        <button
          onClick={() => handleExport('CSV')}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Download className="w-4 h-4 stroke-[2.5]" />
          <span>Export Logs (CSV/PDF)</span>
        </button>
      </div>

      {/* -------------------- 2. TOP SUMMARY METRIC CARDS (4 CARDS) -------------------- */}
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
                Total Logs
              </p>
              <h3 className={`text-2xl font-black tracking-tight mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                12,487
              </h3>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/50">
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
              <span>↑ 18%</span>
              <span className="text-slate-500 font-normal">vs last month</span>
            </span>
            <div className="flex items-end gap-0.5 h-4">
              <span className="w-1 h-2 bg-blue-500/40 rounded-sm"></span>
              <span className="w-1 h-3 bg-blue-500/60 rounded-sm"></span>
              <span className="w-1 h-4 bg-blue-400 rounded-sm"></span>
              <span className="w-1 h-3.5 bg-blue-500 rounded-sm"></span>
            </div>
          </div>
        </div>

        {/* Card 2: Login Events */}
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
                Login Events
              </p>
              <h3 className={`text-2xl font-black tracking-tight mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                3,240
              </h3>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/50">
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
              <span>↑ 12%</span>
              <span className="text-slate-500 font-normal">vs last month</span>
            </span>
            <div className="flex items-end gap-0.5 h-4">
              <span className="w-1 h-1.5 bg-emerald-500/40 rounded-sm"></span>
              <span className="w-1 h-2.5 bg-emerald-500/60 rounded-sm"></span>
              <span className="w-1 h-3 bg-emerald-500/80 rounded-sm"></span>
              <span className="w-1 h-4 bg-emerald-400 rounded-sm"></span>
            </div>
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
                Admin Actions
              </p>
              <h3 className={`text-2xl font-black tracking-tight mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                1,856
              </h3>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/50">
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
              <span>↑ 6%</span>
              <span className="text-slate-500 font-normal">vs last month</span>
            </span>
            <div className="flex items-end gap-0.5 h-4">
              <span className="w-1 h-2 bg-purple-500/40 rounded-sm"></span>
              <span className="w-1 h-3 bg-purple-500/60 rounded-sm"></span>
              <span className="w-1 h-2.5 bg-purple-500/80 rounded-sm"></span>
              <span className="w-1 h-4 bg-purple-400 rounded-sm"></span>
            </div>
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
                Security Alerts
              </p>
              <h3 className={`text-2xl font-black tracking-tight mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                27
              </h3>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/50">
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
              <span>↓ 45%</span>
              <span className="text-slate-500 font-normal">vs last month</span>
            </span>
            <div className="flex items-end gap-0.5 h-4">
              <span className="w-1 h-3.5 bg-rose-500/40 rounded-sm"></span>
              <span className="w-1 h-2 bg-rose-500/60 rounded-sm"></span>
              <span className="w-1 h-1.5 bg-rose-400 rounded-sm"></span>
              <span className="w-1 h-1 bg-emerald-400 rounded-sm"></span>
            </div>
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
              <span>User / Admin</span>
            </label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none ${
                isDarkMode
                  ? 'bg-[#070b14]/80 border-slate-800 text-slate-200'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All Users">All Users</option>
              <option value="emobilitysuperadmin">Super Admin</option>
              <option value="Nimali">Nimali P. (Admin)</option>
              <option value="Kasun">Kasun R. (Admin)</option>
              <option value="Dinesh">Dinesh M. (Operator)</option>
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
              onChange={(e) => setActionFilter(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none ${
                isDarkMode
                  ? 'bg-[#070b14]/80 border-slate-800 text-slate-200'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All Actions">All Actions</option>
              <option value="Login">Login</option>
              <option value="Create">Create</option>
              <option value="Update">Update</option>
              <option value="Delete">Delete</option>
              <option value="View">View</option>
              <option value="Logout">Logout</option>
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
              onChange={(e) => setModuleFilter(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none ${
                isDarkMode
                  ? 'bg-[#070b14]/80 border-slate-800 text-slate-200'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All Modules">All Modules</option>
              <option value="Auth">Auth</option>
              <option value="Users">Users</option>
              <option value="Roles">Roles</option>
              <option value="Settings">Settings</option>
              <option value="Reports">Reports</option>
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
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none ${
                isDarkMode
                  ? 'bg-[#070b14]/80 border-slate-800 text-slate-200'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All Status">All Status</option>
              <option value="Success">Success</option>
              <option value="Failed">Failed</option>
              <option value="Warning">Warning</option>
            </select>
          </div>

          {/* 6. Filter Action Button */}
          <div className="flex items-end">
            <button
              onClick={() => showToast?.('Filter query applied.', 'info')}
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
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by user, action, IP address, device, or location..."
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
                  <th className="py-3 px-3 whitespace-nowrap">DATE & TIME ⇅</th>
                  <th className="py-3 px-3 whitespace-nowrap">USER ⇅</th>
                  <th className="py-3 px-3 whitespace-nowrap">ACTION ⇅</th>
                  <th className="py-3 px-3 whitespace-nowrap">MODULE ⇅</th>
                  <th className="py-3 px-3 whitespace-nowrap">IP ADDRESS ⇅</th>
                  <th className="py-3 px-3 whitespace-nowrap">DEVICE / BROWSER ⇅</th>
                  <th className="py-3 px-3 whitespace-nowrap">LOCATION ⇅</th>
                  <th className="py-3 px-3 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs font-medium">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      <FileText className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-60" />
                      <p>No audit records found for the selected query.</p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
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
                            <div className="max-w-[130px] truncate">
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

                        {/* Location */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <div>
                              <div className="text-xs font-medium text-slate-200">
                                {log.location}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {log.country}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Success
                          </span>
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
              Showing <span className="font-bold text-white">1</span> to{' '}
              <span className="font-bold text-white">{filteredLogs.length}</span> of{' '}
              <span className="font-bold text-white">12,487</span> logs
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  disabled
                  className="p-1.5 rounded-lg border border-slate-800 text-slate-600 cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-xs shadow-md shadow-emerald-500/20">
                  1
                </button>
                <button className="w-7 h-7 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold flex items-center justify-center text-xs">
                  2
                </button>
                <button className="w-7 h-7 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold flex items-center justify-center text-xs">
                  3
                </button>
                <button className="w-7 h-7 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold flex items-center justify-center text-xs">
                  4
                </button>
                <button className="w-7 h-7 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold flex items-center justify-center text-xs">
                  5
                </button>
                <span className="text-slate-500 px-1">...</span>
                <button className="px-2 h-7 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold flex items-center justify-center text-xs font-mono">
                  1561
                </button>
                <button className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300">
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
                <span>8 per page</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
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
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <LogIn className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  User {selectedLog.action}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 leading-snug">
                  {selectedLog.remarks || 'User successfully performed this administrative action.'}
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
                  <span>User</span>
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

              {/* Location */}
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/50">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>Location</span>
                </span>
                <span className="text-slate-200 flex items-center gap-1 font-medium">
                  <span>{selectedLog.location}, {selectedLog.country}</span>
                  <span>🇱🇰</span>
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
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Success</span>
                </span>
              </div>

              {/* Session ID with copy */}
              <div className="py-1.5 border-b border-slate-800/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Session ID</span>
                  </span>
                  <button
                    onClick={() => copyToClipboard(selectedLog.sessionId, 'session')}
                    className="text-slate-400 hover:text-emerald-400 p-0.5"
                    title="Copy Session ID"
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
                  <span>User Agent</span>
                </span>
                <p className="font-mono text-[10px] text-slate-500 leading-tight break-all bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                  {selectedLog.userAgent}
                </p>
              </div>

              {/* Remarks */}
              <div className="py-1.5">
                <span className="text-slate-400 flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Remarks</span>
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
          <span className="font-bold text-slate-400">Super Admin panel</span>
          <span className="text-slate-600">v2.4</span>
        </div>
        <div>
          <span>Cryptographic Hash: HMAC-SHA256 Encrypted</span>
        </div>
      </div>
    </div>
  );
}
