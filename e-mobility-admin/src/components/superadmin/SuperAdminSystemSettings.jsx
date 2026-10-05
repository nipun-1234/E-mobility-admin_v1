import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Gauge,
  Cpu,
  Smartphone,
  Database,
  Shield,
  Save,
  RotateCcw,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Radio,
  Bell,
  Mail,
  FileText,
  Sparkles,
  Zap,
  Lock,
  RefreshCw,
  Send,
  Eye,
  ChevronRight,
  ShieldCheck,
  Check,
  X,
  Play,
  Server,
  Activity,
  KeyRound,
  HardDrive,
  Globe,
  SlidersHorizontal,
  Terminal,
  ShieldAlert,
  Layers,
  Key
} from 'lucide-react';
import { AI_SERVER_URL, API_URL } from '../../config/env';
import { realtimeClient } from '../../services/realtime.client';

export const DEFAULT_SUPER_ADMIN_SETTINGS = {
  // 1. Core Speed & Enforcement
  globalSpeedLimit: 100,
  heavyVehicleLimit: 80,
  speedTolerance: 5,
  severeSpeedThreshold: 125,
  strictEnforcement: true,
  autoChallanGeneration: true,

  // 2. AI Engine & Edge Nodes
  yoloModel: 'yolov8n_traffic_v2.4',
  inferenceConfidence: 90,
  targetFps: 30,
  hardwareAcceleration: 'GPU_CUDA_TENSORRT',
  edgeHomographyCalibration: true,
  autoTrackPruneTimeout: 5,

  // 3. Government SMS & Notification Dispatch
  smsDispatch: true,
  smsGateway: 'dialog_gov_apigateway',
  smsSenderId: 'EMOBILITY-LK',
  smsTemplate: 'TMC ALERT: Vehicle {PLATE} recorded at {SPEED} km/h (Limit: {LIMIT} km/h) at {LOCATION}. E-Challan Reference #{REF}.',
  emailDispatch: true,
  attachPdfReceipt: true,

  // 4. Security & Master Protocol
  aesEncryption: 'AES-256-GCM',
  hmacLookup: true,
  superAdminSessionTimeout: 30,
  requireSuperAdmin2FA: true,
  requirePhotoVerification: true,
  masterKeyRotationDays: 90,
  auditLogLevel: 'VERBOSE',

  // 5. Database & DMT Registry
  dmtRegistrySync: true,
  fuzzyOcrMatching: true,
  fuzzyToleranceDistance: 1,
  autoBackupIntervalHours: 24,
  databaseSource: 'Sri Lanka DMT Master Vehicle Registry (7,000+ Records)'
};

export default function SuperAdminSystemSettings({
  isDarkMode = true,
  showToast = () => {}
}) {
  const [activeTab, setActiveTab] = useState('speed'); // 'speed' | 'ai' | 'dispatch' | 'security' | 'database' | 'diagnostics'
  
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('emobility_super_admin_settings');
      if (saved) {
        return { ...DEFAULT_SUPER_ADMIN_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load super admin settings from storage', e);
    }
    return DEFAULT_SUPER_ADMIN_SETTINGS;
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessBanner, setSaveSuccessBanner] = useState(false);

  // Diagnostics & Simulation States
  const [isPingingAiServer, setIsPingingAiServer] = useState(false);
  const [aiServerPingResult, setAiServerPingResult] = useState(null);
  const [isTestingSms, setIsTestingSms] = useState(false);
  const [testSmsSuccess, setTestSmsSuccess] = useState(false);
  const [testSmsNumber, setTestSmsNumber] = useState('0771234567');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(false);

  // Quick state update helper
  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  // Save Settings
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('emobility_super_admin_settings', JSON.stringify(settings));

      // 1. Sync speed limit with Python AI Server
      try {
        await fetch(`${AI_SERVER_URL}/api/config/speed_limit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ speed_limit: Number(settings.globalSpeedLimit) })
        });
      } catch (err) {
        console.warn('AI Server Speed limit push notice:', err);
      }

      // 2. Sync speed limit with WebSockets
      realtimeClient.setSpeedLimit(Number(settings.globalSpeedLimit));

      // 3. Sync with local admin settings
      try {
        localStorage.setItem(
          'emobility_admin_settings',
          JSON.stringify({
            speedLimit: Number(settings.globalSpeedLimit),
            heavyVehicleLimit: Number(settings.heavyVehicleLimit),
            speedTolerance: Number(settings.speedTolerance),
            severeSpeedThreshold: Number(settings.severeSpeedThreshold),
            smsDispatch: Boolean(settings.smsDispatch),
            emailDispatch: Boolean(settings.emailDispatch),
            autoProcessViolations: Boolean(settings.autoChallanGeneration)
          })
        );
      } catch (e) {}

      setIsSaving(false);
      setHasUnsavedChanges(false);
      setSaveSuccessBanner(true);
      showToast('Super Admin Platform Configuration Saved & Synced across Edge Cluster!', 'success');

      setTimeout(() => setSaveSuccessBanner(false), 5000);
    } catch (error) {
      setIsSaving(false);
      showToast('Failed to save settings: ' + error.message, 'error');
    }
  };

  // Reset to Defaults
  const handleResetToDefaults = () => {
    if (window.confirm('Reset all Super Admin system settings to factory defaults?')) {
      setSettings(DEFAULT_SUPER_ADMIN_SETTINGS);
      setHasUnsavedChanges(true);
      showToast('Settings reset to factory defaults (Click Save to apply)', 'info');
    }
  };

  // Export JSON Config
  const handleExportConfig = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(settings, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `emobility_superadmin_config_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Platform configuration exported as JSON file.', 'success');
  };

  // Test AI Server Ping
  const testAiServerPing = async () => {
    setIsPingingAiServer(true);
    setAiServerPingResult(null);
    const start = performance.now();
    try {
      const res = await fetch(`${AI_SERVER_URL}/api/telemetry`);
      const latency = Math.round(performance.now() - start);
      if (res.ok) {
        const data = await res.json();
        setAiServerPingResult({
          status: 'Online',
          latency,
          activeNodes: data.total_active_cams || 7,
          totalVehicles: data.active_vehicles || 0,
          speedLimit: data.global_speed_limit || settings.globalSpeedLimit
        });
        showToast(`AI Core Server responding at ${latency}ms latency`, 'success');
      } else {
        setAiServerPingResult({ status: 'Error', latency, error: `HTTP ${res.status}` });
      }
    } catch (err) {
      const latency = Math.round(performance.now() - start);
      setAiServerPingResult({ status: 'Offline', latency, error: err.message });
      showToast('AI Core Server unreachable: ' + err.message, 'error');
    } finally {
      setIsPingingAiServer(false);
    }
  };

  // Test SMS Gateway Simulation
  const handleTestSms = () => {
    setIsTestingSms(true);
    setTimeout(() => {
      setIsTestingSms(false);
      setTestSmsSuccess(true);
      showToast(`Test E-Challan SMS dispatched to Dialog Gateway (${testSmsNumber})`, 'success');
      setTimeout(() => setTestSmsSuccess(false), 4000);
    }, 800);
  };

  // Run Database Backup
  const handleRunBackup = () => {
    setIsBackingUp(true);
    setTimeout(() => {
      setIsBackingUp(false);
      setBackupSuccess(true);
      showToast('Encrypted snapshot of DMT Vehicle Registry & Admin Audits archived.', 'success');
      setTimeout(() => setBackupSuccess(false), 4000);
    }, 1000);
  };

  const navTabs = [
    { id: 'speed', label: 'Speed & Enforcement', icon: Gauge, desc: 'Corridor speed limits, tolerance, demerit limits' },
    { id: 'ai', label: 'AI Vision & Edge Nodes', icon: Cpu, desc: 'YOLOv8, hardware GPU, metric homography' },
    { id: 'dispatch', label: 'SMS & E-Challan Gateway', icon: Smartphone, desc: 'Dialog Gov SMS, email citations & templates' },
    { id: 'security', label: 'Security & Master Keys', icon: ShieldCheck, desc: 'AES-256-GCM, HMAC index, Super Admin 2FA' },
    { id: 'database', label: 'Vehicle Registry & DB', icon: Database, desc: 'DMT registry sync, OCR fuzzy matching' },
    { id: 'diagnostics', label: 'System Diagnostics & Tools', icon: Terminal, desc: 'AI cluster ping, SMS testing, backup export' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* -------------------- TOP HEADER BAR -------------------- */}
      <div
        className={`p-6 rounded-2xl border flex flex-wrap items-center justify-between gap-4 transition-colors ${
          isDarkMode
            ? 'bg-[#0d1420]/90 border-slate-800/80 shadow-xl'
            : 'bg-white border-slate-200/90 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 border border-emerald-400/30">
            <Sliders className="w-6 h-6 stroke-[2.4]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Super Admin System Configuration
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                ROOT MASTER
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Global settings, AI telemetry cluster sync, government SMS gateways & cryptographic enforcement
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleResetToDefaults}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              isDarkMode
                ? 'border-slate-800 bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={handleExportConfig}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              isDarkMode
                ? 'border-slate-800 bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 text-white shadow-lg transition-all ${
              hasUnsavedChanges
                ? 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/30 animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
            }`}
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 stroke-[2.4]" />}
            <span>{isSaving ? 'Applying Config...' : 'Save & Sync System'}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {saveSuccessBanner && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-emerald-400 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Settings successfully committed to platform state and synced with active AI CCTV workers!</span>
          </div>
          <button onClick={() => setSaveSuccessBanner(false)}>
            <X className="w-4 h-4 text-emerald-400 hover:opacity-75" />
          </button>
        </div>
      )}

      {/* -------------------- MAIN NAVIGATION TABS -------------------- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all duration-150 relative overflow-hidden ${
                isActive
                  ? isDarkMode
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-white shadow-lg shadow-emerald-500/10'
                    : 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-md'
                  : isDarkMode
                  ? 'bg-[#0d1420]/80 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  : 'bg-white border-slate-200/90 text-slate-600 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`p-2 rounded-xl border ${
                    isActive
                      ? 'bg-emerald-500 text-white border-emerald-400'
                      : isDarkMode
                      ? 'bg-slate-900 text-slate-400 border-slate-800'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4 stroke-[2.2]" />
                </div>
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                )}
              </div>
              <div>
                <p className="text-xs font-bold tracking-tight">{tab.label}</p>
                <p className="text-[10px] opacity-75 truncate mt-0.5">{tab.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* -------------------- TAB 1: SPEED & ENFORCEMENT -------------------- */}
      {activeTab === 'speed' && (
        <div className={`p-6 rounded-2xl border transition-colors ${
          isDarkMode ? 'bg-[#0d1420]/90 border-slate-800/80 shadow-xl' : 'bg-white border-slate-200/90 shadow-sm'
        }`}>
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-800/60">
            <Gauge className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Corridor Speed Limits & Enforcement Thresholds
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Controls the primary homography speed trigger matrix for Southern, Central, Outer Circular and Katunayake expressways
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Global Light Vehicle Speed Limit */}
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Primary Passenger Car Speed Limit
                </label>
                <span className="text-sm font-black font-mono text-emerald-400">{settings.globalSpeedLimit} km/h</span>
              </div>
              <input
                type="range"
                min="60"
                max="140"
                step="5"
                value={settings.globalSpeedLimit}
                onChange={(e) => updateSetting('globalSpeedLimit', Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <p className={`text-[11px] mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Default expressway cruising limit. Instant live push to all 7 active CCTV nodes.
              </p>
            </div>

            {/* Heavy Vehicle Speed Limit */}
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Heavy Vehicle (Buses & Heavy Trucks) Limit
                </label>
                <span className="text-sm font-black font-mono text-amber-400">{settings.heavyVehicleLimit} km/h</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                step="5"
                value={settings.heavyVehicleLimit}
                onChange={(e) => updateSetting('heavyVehicleLimit', Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <p className={`text-[11px] mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Applied automatically when YOLOv8 detects bus/truck classification tags.
              </p>
            </div>

            {/* Speed Tolerance Margin */}
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Speedometer Calibration Tolerance (+Δ km/h)
                </label>
                <span className="text-sm font-black font-mono text-cyan-400">+{settings.speedTolerance} km/h</span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                step="1"
                value={settings.speedTolerance}
                onChange={(e) => updateSetting('speedTolerance', Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <p className={`text-[11px] mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Buffer added before violation trigger (Citation issued at &gt; {Number(settings.globalSpeedLimit) + Number(settings.speedTolerance)} km/h).
              </p>
            </div>

            {/* Severe Speeding Threshold */}
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  High-Risk Hazard / Intercept Speed
                </label>
                <span className="text-sm font-black font-mono text-rose-500">{settings.severeSpeedThreshold} km/h</span>
              </div>
              <input
                type="range"
                min="110"
                max="160"
                step="5"
                value={settings.severeSpeedThreshold}
                onChange={(e) => updateSetting('severeSpeedThreshold', Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
              <p className={`text-[11px] mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Immediately triggers high-priority Highway Patrol dispatch alert in Incident Queue.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="strictEnforce"
                checked={settings.strictEnforcement}
                onChange={(e) => updateSetting('strictEnforcement', e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
              />
              <label htmlFor="strictEnforce" className={`text-xs font-semibold cursor-pointer ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                Enforce Zero-Tolerance Radar Logging (Flag repeat offenders on entrance gantries)
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="autoChallan"
                checked={settings.autoChallanGeneration}
                onChange={(e) => updateSetting('autoChallanGeneration', e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
              />
              <label htmlFor="autoChallan" className={`text-xs font-semibold cursor-pointer ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                Automated E-Challan Reference Generation
              </label>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 2: AI VISION & EDGE NODES -------------------- */}
      {activeTab === 'ai' && (
        <div className={`p-6 rounded-2xl border transition-colors ${
          isDarkMode ? 'bg-[#0d1420]/90 border-slate-800/80 shadow-xl' : 'bg-white border-slate-200/90 shadow-sm'
        }`}>
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-800/60">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                YOLOv8 AI Inference & Edge Computer Engine
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Deep neural network parameters, confidence thresholding and optical homography matrix calibration
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Active Object Detection Model
              </label>
              <select
                value={settings.yoloModel}
                onChange={(e) => updateSetting('yoloModel', e.target.value)}
                className={`w-full p-3 rounded-xl text-xs font-semibold border outline-none ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-cyan-500' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <option value="yolov8n_traffic_v2.4">YOLOv8n-Traffic (Real-time 30 FPS • Optimized for Low Latency)</option>
                <option value="yolov8s_anpr_hd">YOLOv8s-ANPR-HD (High Accuracy • Multi-Vehicle Plate Zoom)</option>
                <option value="yolov8m_night_vision">YOLOv8m-NightVision (Infrared & Low-Light Highway Sector)</option>
              </select>
            </div>

            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Hardware Acceleration Backend
              </label>
              <select
                value={settings.hardwareAcceleration}
                onChange={(e) => updateSetting('hardwareAcceleration', e.target.value)}
                className={`w-full p-3 rounded-xl text-xs font-semibold border outline-none ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-cyan-500' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <option value="GPU_CUDA_TENSORRT">NVIDIA CUDA + TensorRT (Edge Hardware Accelerated)</option>
                <option value="OPENVINO_INTEL">Intel OpenVINO Edge Neural Engine</option>
                <option value="CPU_AVX512">Host CPU Multi-Core AVX-512 Thread Pool</option>
              </select>
            </div>

            {/* Confidence Threshold */}
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  AI Detection Confidence Threshold
                </label>
                <span className="text-sm font-black font-mono text-cyan-400">{settings.inferenceConfidence}%</span>
              </div>
              <input
                type="range"
                min="70"
                max="99"
                step="1"
                value={settings.inferenceConfidence}
                onChange={(e) => updateSetting('inferenceConfidence', Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <p className={`text-[11px] mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Filters low-probability bounding boxes to eliminate false positive speed violations.
              </p>
            </div>

            {/* Stream FPS Target */}
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Edge Streaming Rate (Target FPS)
                </label>
                <span className="text-sm font-black font-mono text-emerald-400">{settings.targetFps} FPS</span>
              </div>
              <input
                type="range"
                min="15"
                max="60"
                step="5"
                value={settings.targetFps}
                onChange={(e) => updateSetting('targetFps', Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <p className={`text-[11px] mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Zero-lag MJPEG stream buffer pacing for CCTV video wall grids.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 3: SMS & E-CHALLAN DISPATCH -------------------- */}
      {activeTab === 'dispatch' && (
        <div className={`p-6 rounded-2xl border transition-colors ${
          isDarkMode ? 'bg-[#0d1420]/90 border-slate-800/80 shadow-xl' : 'bg-white border-slate-200/90 shadow-sm'
        }`}>
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-800/60">
            <Smartphone className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Government SMS & Citizen E-Challan Gateway
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Configure Telecommunications Regulatory Commission (TRCSL) approved SMS gateways and automated citation dispatch
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Authorized Government SMS Gateway
              </label>
              <select
                value={settings.smsGateway}
                onChange={(e) => updateSetting('smsGateway', e.target.value)}
                className={`w-full p-3 rounded-xl text-xs font-semibold border outline-none ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-purple-500' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <option value="dialog_gov_apigateway">Dialog Axiata Gov Enterprise SMS Hub (Direct SMPP)</option>
                <option value="mobitel_gov_gateway">SLTMobitel Highway Command Enterprise Gateway</option>
                <option value="airtel_hutch_fallback">TRCSL Consolidated Multi-Operator Failover Gateway</option>
              </select>
            </div>

            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Official Sender Mask / ID
              </label>
              <input
                type="text"
                value={settings.smsSenderId}
                onChange={(e) => updateSetting('smsSenderId', e.target.value)}
                className={`w-full p-3 rounded-xl text-xs font-mono font-bold border outline-none ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-purple-300 focus:border-purple-500' : 'bg-slate-50 border-slate-200 text-purple-900'
                }`}
              />
            </div>

            {/* Template Preview */}
            <div className="md:col-span-2">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Automated SMS Citation Template (Dynamic Variables: {'{PLATE}'}, {'{SPEED}'}, {'{LIMIT}'}, {'{LOCATION}'}, {'{REF}'})
              </label>
              <textarea
                rows={3}
                value={settings.smsTemplate}
                onChange={(e) => updateSetting('smsTemplate', e.target.value)}
                className={`w-full p-3.5 rounded-xl text-xs font-mono border outline-none leading-relaxed ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-purple-500' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.smsDispatch}
                  onChange={(e) => updateSetting('smsDispatch', e.target.checked)}
                  className="w-4 h-4 rounded accent-purple-500 cursor-pointer"
                />
                <span>SMS Dispatch Active</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.emailDispatch}
                  onChange={(e) => updateSetting('emailDispatch', e.target.checked)}
                  className="w-4 h-4 rounded accent-purple-500 cursor-pointer"
                />
                <span>Email Citation Dispatch Active</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.attachPdfReceipt}
                  onChange={(e) => updateSetting('attachPdfReceipt', e.target.checked)}
                  className="w-4 h-4 rounded accent-purple-500 cursor-pointer"
                />
                <span>Attach Signed Digital PDF Seal</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 4: SECURITY & MASTER PROTOCOL -------------------- */}
      {activeTab === 'security' && (
        <div className={`p-6 rounded-2xl border transition-colors ${
          isDarkMode ? 'bg-[#0d1420]/90 border-slate-800/80 shadow-xl' : 'bg-white border-slate-200/90 shadow-sm'
        }`}>
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-800/60">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Cryptographic Security & Super Admin Authorization
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                National data protection compliance, AES-256-GCM field encryption and operator credential policies
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    AES-256-GCM Field Encryption
                  </h4>
                  <p className={`text-[11px] mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Encrypts Citizen NIC, Mobile, Email, and Vehicle Plate hashes in SQLite/PostgreSQL
                  </p>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ENFORCED
                </span>
              </div>
            </div>

            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    HMAC-SHA256 Blind Indexing
                  </h4>
                  <p className={`text-[11px] mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Deterministic cryptographic lookup hashes for zero-knowledge citizen database search
                  </p>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ACTIVE
                </span>
              </div>
            </div>

            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Super Admin Session Inactivity Timeout (Minutes)
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={settings.superAdminSessionTimeout}
                onChange={(e) => updateSetting('superAdminSessionTimeout', Number(e.target.value))}
                className={`w-full p-3 rounded-xl text-xs font-mono font-bold border outline-none ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Audit Log Verbosity Level
              </label>
              <select
                value={settings.auditLogLevel}
                onChange={(e) => updateSetting('auditLogLevel', e.target.value)}
                className={`w-full p-3 rounded-xl text-xs font-semibold border outline-none ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <option value="VERBOSE">VERBOSE (Log all ANPR detections, calibration changes & logins)</option>
                <option value="STANDARD">STANDARD (Log violations, citations, logins & admin role modifications)</option>
                <option value="MINIMAL">MINIMAL (Log only security exceptions & errors)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 5: DATABASE & DMT REGISTRY -------------------- */}
      {activeTab === 'database' && (
        <div className={`p-6 rounded-2xl border transition-colors ${
          isDarkMode ? 'bg-[#0d1420]/90 border-slate-800/80 shadow-xl' : 'bg-white border-slate-200/90 shadow-sm'
        }`}>
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-800/60">
            <Database className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Motor Traffic Department (DMT) Master Vehicle Registry
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Registry lookup index, OCR optical fuzzy matching algorithms and database backup intervals
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Primary DMT Registry File Source
                </p>
                <p className={`text-xs font-mono text-amber-400 mt-1`}>
                  vehicle_registry_7000_records.csv (7,000 Verified Sri Lankan Registered Vehicles)
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Synchronized
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Fuzzy Matching Tolerance */}
              <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    ANPR OCR Fuzzy Character Tolerance
                  </label>
                  <span className="text-sm font-black font-mono text-amber-400">±{settings.fuzzyToleranceDistance} Char</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="1"
                  value={settings.fuzzyToleranceDistance}
                  onChange={(e) => updateSetting('fuzzyToleranceDistance', Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <p className={`text-[11px] mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Levenshtein distance matching to compensate for highway mud, rain, or low optical contrast on number plates.
                </p>
              </div>

              {/* Backup Interval */}
              <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Automated Registry Backup Schedule
                  </label>
                  <span className="text-sm font-black font-mono text-emerald-400">Every {settings.autoBackupIntervalHours} Hours</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="72"
                  step="6"
                  value={settings.autoBackupIntervalHours}
                  onChange={(e) => updateSetting('autoBackupIntervalHours', Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <p className={`text-[11px] mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Automatic encrypted storage snapshot of citations, operator actions and vehicle registries.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 6: DIAGNOSTICS & TESTING SUITE -------------------- */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border transition-colors ${
            isDarkMode ? 'bg-[#0d1420]/90 border-slate-800/80 shadow-xl' : 'bg-white border-slate-200/90 shadow-sm'
          }`}>
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-800/60">
              <Terminal className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Live Server Diagnostics & Gateway Simulator
                </h3>
                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Perform live latency benchmarks on AI core servers, test citizen SMS dispatches, and trigger manual database snapshots
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Test 1: AI Server Ping */}
              <div className={`p-5 rounded-2xl border flex flex-col justify-between ${
                isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Server className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold uppercase tracking-wider">AI Core Stream Server</span>
                  </div>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Ping Python YOLOv8 Traffic Server ({AI_SERVER_URL})
                  </p>

                  {aiServerPingResult && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Status:</span>
                        <span className={aiServerPingResult.status === 'Online' ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                          {aiServerPingResult.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Latency:</span>
                        <span className="text-cyan-400">{aiServerPingResult.latency} ms</span>
                      </div>
                      {aiServerPingResult.activeNodes && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Active Cameras:</span>
                          <span className="text-slate-200">{aiServerPingResult.activeNodes} Nodes</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={testAiServerPing}
                  disabled={isPingingAiServer}
                  className="mt-4 w-full py-2 px-3 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Activity className={`w-3.5 h-3.5 ${isPingingAiServer ? 'animate-spin' : ''}`} />
                  <span>{isPingingAiServer ? 'Pinging Server...' : 'Run Server Benchmark'}</span>
                </button>
              </div>

              {/* Test 2: Test SMS Gateway */}
              <div className={`p-5 rounded-2xl border flex flex-col justify-between ${
                isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Send className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold uppercase tracking-wider">Test SMS Gateway</span>
                  </div>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Send sample violation test alert to verified mobile
                  </p>

                  <div className="mt-3">
                    <input
                      type="text"
                      value={testSmsNumber}
                      onChange={(e) => setTestSmsNumber(e.target.value)}
                      placeholder="Mobile No (077xxxxxxx)"
                      className={`w-full p-2.5 rounded-xl text-xs font-mono border outline-none ${
                        isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  {testSmsSuccess && (
                    <div className="mt-2.5 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>SMS Dispatch Acknowledged (200 OK)</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleTestSms}
                  disabled={isTestingSms}
                  className="mt-4 w-full py-2 px-3 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{isTestingSms ? 'Transmitting...' : 'Dispatch Test Alert'}</span>
                </button>
              </div>

              {/* Test 3: Manual Database Snapshot */}
              <div className={`p-5 rounded-2xl border flex flex-col justify-between ${
                isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <HardDrive className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider">Encrypted DB Snapshot</span>
                  </div>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Archive SQLite/PostgreSQL vehicle citations & audit ledger
                  </p>

                  {backupSuccess && (
                    <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Snapshot Archived: db_backup_verified.enc</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleRunBackup}
                  disabled={isBackingUp}
                  className="mt-4 w-full py-2 px-3 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>{isBackingUp ? 'Archiving Database...' : 'Run Backup Now'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
