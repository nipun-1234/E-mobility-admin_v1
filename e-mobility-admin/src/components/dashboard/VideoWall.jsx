import React, { useState } from 'react';
import CameraCard from './CameraCard';
import { AI_SERVER_URL } from '../../config/env';
import {
  Grid,
  Layout,
  Maximize2,
  Sliders,
  Radio,
  Tv,
  Eye,
  Layers,
  ChevronRight,
  Plus,
  Camera
} from 'lucide-react';

export default function VideoWall({
  cameras = [],
  onInspectCamera,
  onCalibrateCamera,
  onAddCamera,
  aiServerUrl = AI_SERVER_URL,
  isDarkMode = true
}) {
  const [layoutMode, setLayoutMode] = useState('grid'); // 'grid' | 'focus' | 'quad'
  const [primaryCamId, setPrimaryCamId] = useState('cam_01');

  const primaryCam = cameras.find((c) => c.camId === primaryCamId) || cameras[0];
  const otherCams = cameras.filter((c) => c.camId !== primaryCamId);

  return (
    <div className="space-y-3">
      {/* Video Wall Tactical Controls */}
      <div className={`flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 rounded-xl border transition-colors ${
        isDarkMode 
          ? 'bg-slate-900/90 border-slate-800 shadow-md' 
          : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center space-x-2">
          <Tv className={`w-4 h-4 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
          <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            Expressway CCTV Video Wall
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${
            isDarkMode 
              ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' 
              : 'bg-cyan-50 border-cyan-200 text-cyan-700'
          }`}>
            {cameras.length} Active Channels
          </span>
        </div>

        {/* Layout Switcher */}
        <div className={`flex items-center space-x-1 p-1 rounded-lg border text-xs ${
          isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => setLayoutMode('grid')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md font-semibold transition-colors ${layoutMode === 'grid'
                ? 'bg-cyan-600 text-white shadow-sm'
                : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            title="Surveillance Grid"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Grid View</span>
          </button>

          <button
            onClick={() => setLayoutMode('focus')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md font-semibold transition-colors ${layoutMode === 'focus'
                ? 'bg-cyan-600 text-white shadow-sm'
                : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            title="Command Stage (1 Primary + Thumbnails)"
          >
            <Layout className="w-3.5 h-3.5" />
            <span>Command Stage</span>
          </button>

          <button
            onClick={() => setLayoutMode('quad')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md font-semibold transition-colors ${layoutMode === 'quad'
                ? 'bg-cyan-600 text-white shadow-sm'
                : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            title="Quad 4-Node Split"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Quad Split</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* LAYOUT 1: STANDARD MULTI-NODE GRID */}
      {/* ------------------------------------------------------------- */}
      {layoutMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {cameras.map((cam) => (
            <CameraCard
              key={cam.camId || cam.id}
              camId={cam.camId || `cam_${String(cam.id).padStart(2, '0')}`}
              name={cam.name}
              location={cam.location}
              speedLimit={cam.speedLimit || 100}
              accuracy={cam.accuracy || 98.6}
              status={cam.status || 'Online'}
              activeTracks={cam.activeTracks || 12}
              isDarkMode={isDarkMode}
              onInspect={onInspectCamera}
              onCalibrate={onCalibrateCamera}
              aiServerUrl={aiServerUrl}
            />
          ))}

          {/* Dynamic "+ Add Cameras" Action Slot */}
          {onAddCamera && (
            <button
              onClick={onAddCamera}
              type="button"
              className={`group relative border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[220px] ${
                isDarkMode
                  ? 'bg-slate-900/40 border-slate-800 hover:border-cyan-500 hover:bg-slate-900/80 shadow-lg hover:shadow-cyan-500/10'
                  : 'bg-slate-50/70 border-slate-300 hover:border-cyan-600 hover:bg-white shadow-sm hover:shadow-md'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110 ${
                isDarkMode
                  ? 'bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white border border-cyan-500/30 group-hover:shadow-lg group-hover:shadow-cyan-500/30'
                  : 'bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white border border-cyan-200'
              }`}>
                <Plus className="w-6 h-6 stroke-[2.5]" />
              </div>
              
              <span className={`text-xs font-bold uppercase tracking-wider mb-1 transition-colors ${
                isDarkMode ? 'text-slate-200 group-hover:text-cyan-400' : 'text-slate-800 group-hover:text-cyan-700'
              }`}>
                Add Cameras
              </span>
              
              <p className={`text-[11px] leading-relaxed max-w-[180px] ${
                isDarkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Deploy new CCTV stream or live RTSP optical node
              </p>

              <div className={`mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
                isDarkMode 
                  ? 'bg-slate-950 border-slate-800 text-slate-300 group-hover:border-cyan-500/40 group-hover:text-cyan-300' 
                  : 'bg-slate-100 border-slate-200 text-slate-700 group-hover:border-cyan-300 group-hover:text-cyan-800'
              }`}>
                <Camera className="w-3 h-3" />
                <span>+ Deploy Slot {cameras.length + 1}</span>
              </div>
            </button>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* LAYOUT 2: COMMAND STAGE (1 Large Primary Focus + 7 Thumbnails) */}
      {/* ------------------------------------------------------------- */}
      {layoutMode === 'focus' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {/* Main Hero Stage (3 Cols) */}
          <div className={`lg:col-span-3 rounded-2xl overflow-hidden border flex flex-col transition-colors ${
            isDarkMode ? 'bg-slate-900 border-slate-800 shadow-2xl' : 'bg-white border-slate-200 shadow-md'
          }`}>
            <div className={`px-4 py-2.5 border-b flex items-center justify-between ${
              isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                <span className={`font-bold text-xs uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                  PRIMARY STAGE: {primaryCam?.name}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                  isDarkMode ? 'text-slate-400 bg-slate-900' : 'text-slate-500 bg-slate-200'
                }`}>
                  {primaryCam?.location}
                </span>
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <button
                  onClick={() => onCalibrateCamera && onCalibrateCamera(primaryCam.camId)}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ${
                    isDarkMode 
                      ? 'bg-slate-800 hover:bg-slate-700 text-amber-300' 
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" /> Calibrate
                </button>
                <button
                  onClick={() => onInspectCamera && onInspectCamera(primaryCam.camId)}
                  className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center gap-1 font-semibold transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Deep Dive
                </button>
              </div>
            </div>

            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              <img
                src={`${aiServerUrl}/video_feed/${primaryCam?.camId || 'cam_01'}`}
                alt="Primary Focus Stream"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Side Thumbnail Strip (1 Col) */}
          <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
            <div className={`text-[10px] font-bold uppercase tracking-wider px-1 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Select Stream to Stage
            </div>
            {cameras.map((c) => {
              const num = parseInt(String(c.camId).replace('cam_', ''), 10) || 1;
              const effectiveThumbUrl = (aiServerUrl.includes('localhost:8000') && num >= 5)
                ? aiServerUrl.replace('localhost:8000', '127.0.0.1:8000')
                : aiServerUrl;

              return (
                <button
                  key={c.camId}
                  onClick={() => setPrimaryCamId(c.camId)}
                  className={`w-full text-left p-2 rounded-xl border transition-all flex items-center space-x-2.5 ${
                    c.camId === primaryCamId
                      ? isDarkMode
                        ? 'bg-cyan-950/50 border-cyan-500/80 shadow-md shadow-cyan-500/20 text-white'
                        : 'bg-cyan-50 border-cyan-400 shadow-sm text-cyan-900'
                      : isDarkMode
                        ? 'bg-slate-900/80 border-slate-800 hover:bg-slate-800/80 text-slate-200'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="w-16 aspect-video bg-black rounded-lg overflow-hidden flex-shrink-0 relative">
                    <img
                      src={`${effectiveThumbUrl}/video_feed/${c.camId}`}
                      alt={c.name}
                      className="w-full h-full object-cover opacity-80"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <span className="absolute bottom-0.5 right-0.5 text-[8px] font-mono px-1 rounded bg-black/80 text-white">
                      {c.camId.toUpperCase()}
                    </span>
                  </div>
                  <div className="truncate flex-1">
                    <div className={`text-xs font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{c.name}</div>
                    <div className={`text-[10px] truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{c.location}</div>
                    <div className={`text-[10px] font-mono mt-0.5 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{c.activeTracks || 12} veh • {c.speedLimit} km/h</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* LAYOUT 3: QUAD SPLIT (4 Key Junctions) */}
      {/* ------------------------------------------------------------- */}
      {layoutMode === 'quad' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cameras.slice(0, 4).map((cam) => (
            <CameraCard
              key={cam.camId}
              camId={cam.camId}
              name={cam.name}
              location={cam.location}
              speedLimit={cam.speedLimit || 100}
              accuracy={cam.accuracy || 98.6}
              status={cam.status || 'Online'}
              activeTracks={cam.activeTracks || 12}
              isDarkMode={isDarkMode}
              onInspect={onInspectCamera}
              onCalibrate={onCalibrateCamera}
              aiServerUrl={aiServerUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
}
