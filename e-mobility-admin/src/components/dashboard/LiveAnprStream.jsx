import React from 'react';
import { ShieldCheck, AlertTriangle, Car, Clock, ChevronRight, Camera } from 'lucide-react';
import { AI_SERVER_URL } from '../../config/env';

export default function LiveAnprStream({
  violations = [],
  onSelectViolation,
  maxItems = 8,
  isDarkMode = true
}) {
  return (
    <div className={`border rounded-2xl p-4 flex flex-col h-full transition-colors ${
      isDarkMode 
        ? 'bg-slate-900/90 border-slate-800 shadow-xl text-slate-100' 
        : 'bg-white border-slate-200 shadow-sm text-slate-800'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between pb-3 border-b mb-3 ${
        isDarkMode ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
          <h3 className={`text-xs font-bold uppercase tracking-wider ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            Live ANPR License Plate Radar
          </h3>
        </div>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
          isDarkMode 
            ? 'text-cyan-400 bg-cyan-950/60 border-cyan-800/40' 
            : 'text-cyan-700 bg-cyan-50 border-cyan-200'
        }`}>
          Real-Time ANPR Engine
        </span>
      </div>

      {/* Plate Stream Items or Empty State */}
      <div className="space-y-2 flex-1 overflow-y-auto pr-1 max-h-[380px]">
        {violations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
            <ShieldCheck className={`w-8 h-8 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} />
            <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              No live violations detected
            </p>
            <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              CCTV AI Radar active across all monitored corridors
            </p>
          </div>
        ) : (
          violations.slice(0, maxItems).map((v, idx) => {
            const speedVal = typeof v.speed === 'number' ? v.speed : parseInt(v.speed, 10) || 0;
            const limitVal = typeof v.limit === 'number' ? v.limit : parseInt(v.limit, 10) || 100;
            const isSpeeding = speedVal > limitVal;
            const evidenceUrl = v.evidenceImageUrl?.startsWith('http') 
              ? v.evidenceImageUrl 
              : (v.evidenceImageUrl ? `${AI_SERVER_URL}${v.evidenceImageUrl}` : null);
            const plateCropUrl = (v.plateCropUrl || v.plate_crop_url)?.startsWith('http')
              ? (v.plateCropUrl || v.plate_crop_url)
              : (v.plateCropUrl || v.plate_crop_url ? `${AI_SERVER_URL}${v.plateCropUrl || v.plate_crop_url}` : null);

            const hasValidPlate = Boolean(v.plate && v.plate !== 'UNREAD' && v.plate !== 'null' && v.plate !== 'VEHICLE');
            const plateDisplay = hasValidPlate ? (v.plate || v.vehiclePlate) : 'UNREAD PLATE';
            const plateConfidence = v.plateConfidence !== undefined && v.plateConfidence !== null
              ? (v.plateConfidence > 1 ? Math.round(v.plateConfidence) : Math.round(v.plateConfidence * 100))
              : (v.plate_confidence ? Math.round(v.plate_confidence * 100) : null);

            return (
              <div
                key={v.id || v.violationId || idx}
                onClick={() => onSelectViolation && onSelectViolation(v)}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${
                  isDarkMode 
                    ? 'bg-slate-950/70 border-slate-800/80 hover:border-cyan-500/50' 
                    : 'bg-slate-50 border-slate-200 hover:border-cyan-500/60 hover:bg-slate-100/60 shadow-xs'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  {/* Sri Lankan Plate Badge (high contrast black & yellow or unread status) */}
                  <div className={`px-2 py-1 border rounded-md font-mono font-black text-xs tracking-wider shadow-inner ${
                    hasValidPlate 
                      ? 'bg-slate-900 border-slate-700 text-amber-300'
                      : 'bg-slate-800/60 border-amber-500/40 text-amber-400/90 text-[10px]'
                  }`}>
                    {plateDisplay}
                  </div>

                  <div>
                    <div className={`text-xs font-bold flex items-center gap-1.5 ${
                      isDarkMode ? 'text-slate-200' : 'text-slate-800'
                    }`}>
                      <span>{hasValidPlate ? (v.makeModel || 'Vehicle') : 'Vehicle (Unread)'}</span>
                      {plateConfidence && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950/80 border border-cyan-800/50 text-cyan-300 font-mono">
                          {plateConfidence}% ANPR
                        </span>
                      )}
                      {evidenceUrl && (
                        <span title="Evidence Snapshot Available" className="text-cyan-400 text-[10px]">
                          📷
                        </span>
                      )}
                    </div>
                    <div className={`text-[10px] flex items-center gap-1 mt-0.5 font-mono ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      <span>{v.cam || (v.cameraId ? `Cam-${v.cameraId.replace('cam_', '')}` : 'Cam-01')}</span>
                      <span>•</span>
                      <span>{v.time || 'Just now'}</span>
                    </div>
                  </div>
                </div>

                {/* Speed & Tag */}
                <div className="text-right">
                  <div className={`text-xs font-mono font-bold ${
                    isSpeeding 
                      ? (isDarkMode ? 'text-rose-400' : 'text-rose-600') 
                      : (isDarkMode ? 'text-emerald-400' : 'text-emerald-600')
                  }`}>
                    {speedVal} <span className={`text-[10px] font-normal ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>km/h</span>
                  </div>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded inline-block mt-0.5 ${
                    isSpeeding 
                      ? (isDarkMode ? 'bg-rose-500/20 text-rose-300' : 'bg-rose-50 text-rose-700 border border-rose-200')
                      : (isDarkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
                  }`}>
                    {isSpeeding ? 'SPEEDING' : 'NORMAL'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
