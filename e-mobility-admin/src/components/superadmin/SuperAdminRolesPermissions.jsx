import React, { useState, useMemo, useEffect } from 'react';
import { rbacService } from '../../services/rbac.service';
import {
  Shield,
  ShieldCheck,
  Users,
  Search,
  Car,
  Settings,
  Plus,
  Eye,
  MoreVertical,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  Key,
  Lock,
  Edit2,
  Trash2,
  Copy,
  Info,
  Check,
  AlertCircle,
  Sliders,
  Sparkles,
  Layers,
  FileText,
  Loader2,
  RefreshCw
} from 'lucide-react';

const MODULE_LIST = [
  'Dashboard',
  'Admins',
  'Login Photo Audit',
  'Users',
  'Roles & Permissions',
  'Vehicles',
  'ANPR & CCTV',
  'Toll & Revenue',
  'Reports',
  'Audit Logs',
  'Settings'
];

export default function SuperAdminRolesPermissions({ isDarkMode, showToast }) {
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState(1);
  const [activeDetailsTab, setActiveDetailsTab] = useState('Permissions'); // 'Permissions' | 'Information'
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Roles'); // 'All Roles' | 'System' | 'Custom' | 'Active' | 'Inactive'
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const [showRoleDetails, setShowRoleDetails] = useState(true);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  // New role form state
  const [newRoleForm, setNewRoleForm] = useState({
    name: '',
    type: 'Custom',
    icon: 'Settings',
    color: 'rose',
    description: '',
    status: 'Active',
    permissions: MODULE_LIST.map((mod, idx) => ({
      id: idx + 1,
      module: mod,
      access: 'Read Only',
      level: 'read'
    }))
  });

  // Load roles from backend PostgreSQL API
  const loadRoles = async (maintainSelectedId = null) => {
    try {
      setIsLoading(true);
      const data = await rbacService.fetchRoles();
      setRoles(data);
      if (maintainSelectedId) {
        setSelectedRoleId(maintainSelectedId);
      } else if (data.length > 0 && (!selectedRoleId || !data.find(r => r.id === selectedRoleId))) {
        setSelectedRoleId(data[0].id);
      }
    } catch (err) {
      console.error('❌ Failed to load roles:', err);
      showToast?.(err.response?.data?.message || 'Failed to load roles from database.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  // Currently selected role
  const selectedRole = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId) || roles[0];
  }, [roles, selectedRoleId]);

  // Filtered roles list
  const filteredRoles = useMemo(() => {
    return roles.filter((role) => {
      const matchesSearch =
        role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        role.description.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (typeFilter === 'System') return role.type === 'System';
      if (typeFilter === 'Custom') return role.type === 'Custom';
      if (typeFilter === 'Active') return role.status === 'Active';
      if (typeFilter === 'Inactive') return role.status === 'Inactive';

      return true;
    });
  }, [roles, searchQuery, typeFilter]);

  // Render role icon by name and color
  const renderRoleIcon = (role, size = 'w-5 h-5') => {
    switch (role.icon) {
      case 'Crown':
        return <Crown className={size} />;
      case 'Shield':
        return <Shield className={size} />;
      case 'Users':
        return <Users className={size} />;
      case 'Search':
        return <Search className={size} />;
      case 'Car':
        return <Car className={size} />;
      case 'Settings':
        return <Settings className={size} />;
      default:
        return <ShieldCheck className={size} />;
    }
  };

  const getRoleIconBg = (color) => {
    switch (color) {
      case 'purple':
        return 'bg-[#7c3aed] text-white shadow-md shadow-purple-500/25';
      case 'emerald':
        return 'bg-[#059669] text-white shadow-md shadow-emerald-500/25';
      case 'blue':
        return 'bg-[#2563eb] text-white shadow-md shadow-blue-500/25';
      case 'amber':
        return 'bg-[#d97706] text-white shadow-md shadow-amber-500/25';
      case 'cyan':
        return 'bg-[#0891b2] text-white shadow-md shadow-cyan-500/25';
      case 'rose':
        return 'bg-[#e11d48] text-white shadow-md shadow-rose-500/25';
      default:
        return 'bg-emerald-600 text-white';
    }
  };

  const renderAccessBadge = (access, level) => {
    if (level === 'full' || access === 'Full Access') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
          Full Access
        </span>
      );
    }
    if (level === 'read' || access === 'Read Only') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
          Read Only
        </span>
      );
    }
    if (level === 'limited' || access === 'Limited Access') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
          Limited Access
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700/60">
        Restricted
      </span>
    );
  };

  // Handlers
  const handleSelectRole = (role) => {
    setSelectedRoleId(role.id);
    setShowRoleDetails(true);
  };

  const handleToggleStatus = async (roleId) => {
    const targetRole = roles.find((r) => r.id === roleId);
    if (!targetRole) return;
    const newStatus = targetRole.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await rbacService.updateRole(roleId, { status: newStatus });
      await loadRoles(selectedRoleId);
      setActiveActionMenuId(null);
      showToast?.(`Role status updated to ${newStatus}.`, 'success');
    } catch (err) {
      showToast?.(err.response?.data?.message || 'Failed to update status.', 'error');
    }
  };

  const handleDeleteRole = async (roleId) => {
    const roleToDelete = roles.find((r) => r.id === roleId);
    if (roleToDelete?.type === 'System') {
      showToast?.('System roles cannot be deleted.', 'error');
      return;
    }
    if (window.confirm(`Are you sure you want to delete role "${roleToDelete?.name}"?`)) {
      try {
        await rbacService.deleteRole(roleId);
        showToast?.(`Role "${roleToDelete?.name}" deleted successfully.`, 'success');
        if (selectedRoleId === roleId) {
          setSelectedRoleId(1);
        }
        await loadRoles(1);
        setActiveActionMenuId(null);
      } catch (err) {
        showToast?.(err.response?.data?.message || 'Failed to delete role.', 'error');
      }
    }
  };

  const handleCreateRoleSubmit = async (e) => {
    e.preventDefault();
    if (!newRoleForm.name.trim()) {
      showToast?.('Please enter a valid role name.', 'error');
      return;
    }
    try {
      setIsSaving(true);
      const created = await rbacService.createRole(newRoleForm);
      showToast?.(`New role "${newRoleForm.name}" created and saved to database.`, 'success');
      setIsCreateModalOpen(false);
      await loadRoles(created.role?.id);
    } catch (err) {
      showToast?.(err.response?.data?.message || 'Failed to create role.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditRoleSave = async (e) => {
    e.preventDefault();
    if (!editingRole) return;
    try {
      setIsSaving(true);
      await rbacService.updateRolePermissions(editingRole.id, editingRole.permissions);
      await rbacService.updateRole(editingRole.id, { description: editingRole.description });
      showToast?.(`Permissions for "${editingRole.name}" successfully saved to PostgreSQL.`, 'success');
      setIsEditModalOpen(false);
      await loadRoles(editingRole.id);
    } catch (err) {
      showToast?.(err.response?.data?.message || 'Failed to save permissions to database.', 'error');
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* -------------------- 1. HEADER WITH TITLE & CREATE BUTTON -------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className={`text-2xl font-black tracking-tight ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}
          >
            Roles & Permissions
          </h1>
          <p
            className={`text-xs md:text-sm mt-0.5 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Manage system roles and their module-wise permissions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadRoles(selectedRoleId)}
            disabled={isLoading}
            className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold ${
              isDarkMode
                ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300'
                : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title="Reload from PostgreSQL"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create Role</span>
          </button>
        </div>
      </div>

      {/* -------------------- 2. DUAL PANE LAYOUT -------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT PANE: ROLES TABLE CARD */}
        <div
          className={`${
            showRoleDetails && selectedRole
              ? 'lg:col-span-7 xl:col-span-7 2xl:col-span-8'
              : 'lg:col-span-12'
          } rounded-2xl border transition-all duration-200 ${
            isDarkMode
              ? 'bg-[#0d1420]/90 border-slate-800/80 shadow-xl'
              : 'bg-white border-slate-200/90 shadow-sm'
          }`}
        >
          {/* Top Filter & Search Bar */}
          <div className="p-4 border-b border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search role name or description..."
                className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border outline-none font-medium transition-all ${
                  isDarkMode
                    ? 'bg-[#070b14]/80 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-emerald-500/50'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-600'
                }`}
              />
            </div>

            {/* Filter dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2.5 min-w-[130px] transition-all ${
                  isDarkMode
                    ? 'bg-[#070b14]/80 border-slate-800 text-slate-300 hover:border-slate-700'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <span>{typeFilter}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showFilterDropdown && (
                <div
                  className={`absolute right-0 mt-1.5 w-44 rounded-xl border py-1.5 shadow-2xl z-20 animate-in fade-in zoom-in-95 duration-150 ${
                    isDarkMode
                      ? 'bg-[#0c121d] border-slate-800 text-slate-200'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  {['All Roles', 'System', 'Custom', 'Active', 'Inactive'].map(
                    (filterOption) => (
                      <button
                        key={filterOption}
                        onClick={() => {
                          setTypeFilter(filterOption);
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-3.5 py-1.5 text-xs font-medium flex items-center justify-between hover:bg-emerald-500/10 hover:text-emerald-400 ${
                          typeFilter === filterOption
                            ? 'text-emerald-400 font-bold bg-emerald-500/10'
                            : ''
                        }`}
                      >
                        <span>{filterOption === 'All Roles' ? 'All Roles' : `${filterOption} Roles`}</span>
                        {typeFilter === filterOption && (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Roles Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  className={`border-b text-[11px] font-bold tracking-wider uppercase font-mono ${
                    isDarkMode
                      ? 'border-slate-800/80 text-slate-400 bg-slate-900/40'
                      : 'border-slate-200 text-slate-500 bg-slate-50/80'
                  }`}
                >
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">ROLE NAME</th>
                  <th className="py-3 px-4 hidden sm:table-cell">DESCRIPTION</th>
                  <th className="py-3 px-4 text-center">STATUS</th>
                  <th className="py-3 px-4 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-8 h-8 mx-auto text-emerald-400 animate-spin mb-2" />
                      <p className="font-mono text-xs">Loading roles and permissions from PostgreSQL...</p>
                    </td>
                  </tr>
                ) : filteredRoles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      <Shield className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-60" />
                      <p>No roles found matching your filter criteria.</p>
                    </td>
                  </tr>
                ) : (
                  filteredRoles.map((role, idx) => {

                    const isSelected = selectedRole?.id === role.id;

                    return (
                      <tr
                        key={role.id}
                        className={`group transition-colors ${
                          isSelected
                            ? isDarkMode
                              ? 'bg-slate-800/40'
                              : 'bg-emerald-50/40'
                            : isDarkMode
                            ? 'hover:bg-slate-900/50'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* # Number */}
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                          {idx + 1}
                        </td>

                        {/* Role Name + Icon + Type badge */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${getRoleIconBg(
                                role.color
                              )}`}
                            >
                              {renderRoleIcon(role, 'w-4 h-4')}
                            </div>
                            <div>
                              <div
                                className={`font-bold text-xs sm:text-sm tracking-tight ${
                                  isDarkMode ? 'text-white' : 'text-slate-900'
                                }`}
                              >
                                {role.name}
                              </div>
                              <span
                                className={`inline-block mt-0.5 text-[9px] font-semibold font-mono px-2 py-0.5 rounded border ${
                                  role.type === 'System'
                                    ? 'bg-slate-800/90 text-cyan-400 border-cyan-500/30'
                                    : 'bg-purple-900/40 text-purple-300 border-purple-600/40'
                                }`}
                              >
                                {role.type}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Description */}
                        <td className="py-3.5 px-4 hidden sm:table-cell">
                          <p
                            className={`text-xs max-w-xs leading-relaxed ${
                              isDarkMode ? 'text-slate-400' : 'text-slate-600'
                            }`}
                          >
                            {role.description}
                          </p>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          {role.status === 'Active' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                              <span>Inactive</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleSelectRole(role)}
                              className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                                isSelected
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                                  : isDarkMode
                                  ? 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
                                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                              }`}
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-400" />
                              <span>View</span>
                            </button>

                            {/* 3-dots Menu */}
                            <div className="relative">
                              <button
                                onClick={() =>
                                  setActiveActionMenuId(
                                    activeActionMenuId === role.id ? null : role.id
                                  )
                                }
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  isDarkMode
                                    ? 'border-slate-800 hover:bg-slate-800/80 text-slate-400 hover:text-white'
                                    : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                                }`}
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {activeActionMenuId === role.id && (
                                <div
                                  className={`absolute right-0 mt-1 w-40 rounded-xl border py-1.5 shadow-2xl z-30 animate-in fade-in zoom-in-95 duration-150 ${
                                    isDarkMode
                                      ? 'bg-[#0c121d] border-slate-800 text-slate-200'
                                      : 'bg-white border-slate-200 text-slate-800'
                                  }`}
                                >
                                  <button
                                    onClick={() => {
                                      handleSelectRole(role);
                                      setActiveActionMenuId(null);
                                    }}
                                    className="w-full text-left px-3.5 py-1.5 text-xs flex items-center gap-2 hover:bg-slate-800/60"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                                    <span>View Details</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingRole(JSON.parse(JSON.stringify(role)));
                                      setIsEditModalOpen(true);
                                      setActiveActionMenuId(null);
                                    }}
                                    className="w-full text-left px-3.5 py-1.5 text-xs flex items-center gap-2 hover:bg-slate-800/60"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                                    <span>Edit Permissions</span>
                                  </button>
                                  <button
                                    onClick={() => handleToggleStatus(role.id)}
                                    className="w-full text-left px-3.5 py-1.5 text-xs flex items-center gap-2 hover:bg-slate-800/60"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                                    <span>
                                      {role.status === 'Active'
                                        ? 'Set Inactive'
                                        : 'Set Active'}
                                    </span>
                                  </button>
                                  {role.type === 'Custom' && (
                                    <button
                                      onClick={() => handleDeleteRole(role.id)}
                                      className="w-full text-left px-3.5 py-1.5 text-xs flex items-center gap-2 text-rose-400 hover:bg-rose-500/10"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Delete Role</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Pagination Controls */}
          <div className="p-4 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              Showing <span className="font-bold text-white">1</span> to{' '}
              <span className="font-bold text-white">{filteredRoles.length}</span> of{' '}
              <span className="font-bold text-white">{roles.length}</span> roles
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
                <button
                  disabled
                  className="p-1.5 rounded-lg border border-slate-800 text-slate-600 cursor-not-allowed"
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
                <span>10 per page</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANE: ROLE DETAILS DRAWER */}
        {showRoleDetails && selectedRole && (
          <div
            className="lg:col-span-5 xl:col-span-5 2xl:col-span-4 rounded-2xl border transition-all duration-200 p-5 space-y-4 shadow-xl animate-in fade-in slide-in-from-right-4"
            style={{
              backgroundColor: isDarkMode ? '#0d1420' : '#ffffff',
              borderColor: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(226, 232, 240, 0.9)'
            }}
          >
            {/* Header with Title and Close button */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <h2
                className={`text-base font-bold tracking-tight ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                Role Details
              </h2>
              <button
                onClick={() => setShowRoleDetails(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Role Header Banner */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${getRoleIconBg(
                    selectedRole.color
                  )}`}
                >
                  {renderRoleIcon(selectedRole, 'w-6 h-6')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3
                      className={`text-base font-black tracking-tight ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {selectedRole.name}
                    </h3>
                    <span
                      className={`text-[9px] font-semibold font-mono px-2 py-0.5 rounded border ${
                        selectedRole.type === 'System'
                          ? 'bg-slate-800/90 text-cyan-400 border-cyan-500/30'
                          : 'bg-purple-900/40 text-purple-300 border-purple-600/40'
                      }`}
                    >
                      {selectedRole.type}
                    </span>
                  </div>
                  <p
                    className={`text-xs mt-1 leading-relaxed ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}
                  >
                    {selectedRole.description}
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Active</span>
              </span>
            </div>

            {/* Tab Navigation: Permissions vs Information */}
            <div className="flex items-center gap-6 border-b border-slate-800/80 pt-2">
              <button
                onClick={() => setActiveDetailsTab('Permissions')}
                className={`pb-2.5 text-xs font-bold transition-all relative ${
                  activeDetailsTab === 'Permissions'
                    ? 'text-white border-b-2 border-emerald-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Permissions
              </button>
              <button
                onClick={() => setActiveDetailsTab('Information')}
                className={`pb-2.5 text-xs font-bold transition-all relative ${
                  activeDetailsTab === 'Information'
                    ? 'text-white border-b-2 border-emerald-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Information
              </button>
            </div>

            {/* TAB CONTENT: PERMISSIONS LIST */}
            {activeDetailsTab === 'Permissions' && (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-xl border border-slate-800/60">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr
                        className={`border-b text-[10px] font-mono uppercase tracking-wider ${
                          isDarkMode
                            ? 'bg-slate-900/60 border-slate-800 text-slate-400'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <th className="py-2.5 px-3 w-10 text-center font-bold">#</th>
                        <th className="py-2.5 px-3 font-bold">MODULE</th>
                        <th className="py-2.5 px-3 text-right font-bold">ACCESS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {selectedRole.permissions.map((perm, pIdx) => (
                        <tr
                          key={perm.id || pIdx}
                          className={
                            isDarkMode
                              ? 'hover:bg-slate-900/40 transition-colors'
                              : 'hover:bg-slate-50'
                          }
                        >
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-400 text-[11px]">
                            {pIdx + 1}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-200 text-xs">
                            {perm.module}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {renderAccessBadge(perm.access, perm.level)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => {
                      setEditingRole(JSON.parse(JSON.stringify(selectedRole)));
                      setIsEditModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Permissions</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB CONTENT: INFORMATION */}
            {activeDetailsTab === 'Information' && (
              <div className="space-y-3 animate-in fade-in duration-150 text-xs">
                <div
                  className={`p-3.5 rounded-xl border space-y-2.5 ${
                    isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Role Identifier</span>
                    <span className="font-mono font-bold text-cyan-400">{selectedRole.code}</span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Security Clearance</span>
                    <span className="font-semibold text-slate-200">{selectedRole.clearance}</span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Operational Scope</span>
                    <span className="font-semibold text-slate-200">{selectedRole.scope}</span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Assigned Users</span>
                    <span className="font-bold text-emerald-400">
                      {selectedRole.usersCount} Active Accounts
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">MFA Enforced</span>
                    <span
                      className={`font-semibold ${
                        selectedRole.mfaEnforced ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    >
                      {selectedRole.mfaEnforced ? 'Mandatory (TOTP)' : 'Optional'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-400">Session Guard Timeout</span>
                    <span className="font-mono text-amber-400">{selectedRole.sessionTimeout}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500 px-1 font-mono">
                  <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                  <span>
                    Cryptographically protected role profile. Updates require Root key signature.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* -------------------- 3. CREATE ROLE MODAL -------------------- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`w-full max-w-2xl rounded-2xl border p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto ${
              isDarkMode
                ? 'bg-[#0d1420] border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black">Create New Role</h3>
                  <p className="text-xs text-slate-400">
                    Define permissions and access boundaries for this role.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase font-mono">
                    Role Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Regional Highway Controller"
                    value={newRoleForm.name}
                    onChange={(e) =>
                      setNewRoleForm({ ...newRoleForm, name: e.target.value })
                    }
                    className={`w-full px-3.5 py-2 rounded-xl border outline-none font-medium ${
                      isDarkMode
                        ? 'bg-slate-900/90 border-slate-800 focus:border-emerald-500 text-white'
                        : 'bg-slate-50 border-slate-200 focus:border-emerald-600'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase font-mono">
                    Role Type
                  </label>
                  <select
                    value={newRoleForm.type}
                    onChange={(e) =>
                      setNewRoleForm({ ...newRoleForm, type: e.target.value })
                    }
                    className={`w-full px-3.5 py-2 rounded-xl border outline-none font-medium ${
                      isDarkMode
                        ? 'bg-slate-900/90 border-slate-800 focus:border-emerald-500 text-white'
                        : 'bg-slate-50 border-slate-200 focus:border-emerald-600'
                    }`}
                  >
                    <option value="Custom">Custom Role</option>
                    <option value="System">System Role</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase font-mono">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe the operational responsibilities of this role..."
                  value={newRoleForm.description}
                  onChange={(e) =>
                    setNewRoleForm({ ...newRoleForm, description: e.target.value })
                  }
                  className={`w-full px-3.5 py-2 rounded-xl border outline-none font-medium ${
                    isDarkMode
                      ? 'bg-slate-900/90 border-slate-800 focus:border-emerald-500 text-white'
                      : 'bg-slate-50 border-slate-200 focus:border-emerald-600'
                  }`}
                />
              </div>

              {/* Module Permissions Matrix */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase font-mono">
                  Module Permissions Configuration
                </label>
                <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800">
                  {newRoleForm.permissions.map((p, idx) => (
                    <div
                      key={p.module}
                      className="flex items-center justify-between px-3.5 py-2 bg-slate-900/40 hover:bg-slate-900/80"
                    >
                      <span className="font-semibold text-slate-200">{p.module}</span>
                      <select
                        value={p.access}
                        onChange={(e) => {
                          const val = e.target.value;
                          let lvl = 'none';
                          if (val === 'Full Access') lvl = 'full';
                          if (val === 'Read Only') lvl = 'read';
                          if (val === 'Limited Access') lvl = 'limited';
                          const updated = [...newRoleForm.permissions];
                          updated[idx] = { ...updated[idx], access: val, level: lvl };
                          setNewRoleForm({ ...newRoleForm, permissions: updated });
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200 outline-none"
                      >
                        <option value="Full Access">Full Access</option>
                        <option value="Read Only">Read Only</option>
                        <option value="Limited Access">Limited Access</option>
                        <option value="Restricted">Restricted</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isSaving ? 'Creating...' : 'Save & Create Role'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- 4. EDIT ROLE PERMISSIONS MODAL -------------------- */}
      {isEditModalOpen && editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`w-full max-w-2xl rounded-2xl border p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto ${
              isDarkMode
                ? 'bg-[#0d1420] border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">Edit Role: {editingRole.name}</h3>
                  <p className="text-xs text-slate-400">
                    Modify module privileges and authorization scopes.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditRoleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase font-mono">
                  Role Description
                </label>
                <textarea
                  rows={2}
                  value={editingRole.description}
                  onChange={(e) =>
                    setEditingRole({ ...editingRole, description: e.target.value })
                  }
                  className={`w-full px-3.5 py-2 rounded-xl border outline-none font-medium ${
                    isDarkMode
                      ? 'bg-slate-900/90 border-slate-800 focus:border-cyan-500 text-white'
                      : 'bg-slate-50 border-slate-200 focus:border-cyan-600'
                  }`}
                />
              </div>

              {/* Module Permissions Matrix */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase font-mono">
                  Module Permissions
                </label>
                <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800">
                  {editingRole.permissions.map((p, idx) => (
                    <div
                      key={p.module}
                      className="flex items-center justify-between px-3.5 py-2 bg-slate-900/40 hover:bg-slate-900/80"
                    >
                      <span className="font-semibold text-slate-200">{p.module}</span>
                      <select
                        value={p.access}
                        onChange={(e) => {
                          const val = e.target.value;
                          let lvl = 'none';
                          if (val === 'Full Access') lvl = 'full';
                          if (val === 'Read Only') lvl = 'read';
                          if (val === 'Limited Access') lvl = 'limited';
                          const updated = [...editingRole.permissions];
                          updated[idx] = { ...updated[idx], access: val, level: lvl };
                          setEditingRole({ ...editingRole, permissions: updated });
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200 outline-none"
                      >
                        <option value="Full Access">Full Access</option>
                        <option value="Read Only">Read Only</option>
                        <option value="Limited Access">Limited Access</option>
                        <option value="Restricted">Restricted</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

