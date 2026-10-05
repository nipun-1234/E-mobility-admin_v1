import React, { useState, useEffect } from 'react';
import { Maximize2, Sliders, ShieldCheck, AlertTriangle, Zap, Radio } from 'lucide-react';
import { AI_SERVER_URL } from '../../config/env';

export default function CameraCard({
  camId = 'cam_01',
  name = 'Cam-01',
  location = 'Highway Sector',
  speedLimit = 100,
  accuracy = 98.6,
  status = 'Online',
  activeTracks = 12,
  onInspect,
  onCalibrate,
  aiServerUrl = AI_SERVER_URL,
  isDarkMode = true
}) {
  const [imgError, setImgError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const numId = String(camId).replace('cam_', '').padStart(2, '0');
  const camNum = parseInt(numId, 10) || 1;

  // Domain sharding between localhost and 127.0.0.1 to avoid Chrome/Edge 6 concurrent connection bottleneck
  const effectiveBaseUrl = (aiServerUrl.includes('localhost:8000') && camNum >= 5)
    ? aiServerUrl.replace('localhost:8000', '127.0.0.1:8000')
    : (aiServerUrl.includes('127.0.0.1:8000') && camNum >= 5)
    ? aiServerUrl.replace('127.0.0.1:8000', 'localhost:8000')
    : aiServerUrl;

  const streamUrl = `${effectiveBaseUrl}/video_feed/${camId}?t=${retryKey}`;
  const fallbackVideoUrl = `/camera_${numId}_feed.mp4`;

  // Auto retry connection every 2 seconds if stream temporarily drops
  useEffect(() => {
    let timer;
    if (imgError) {
      timer = setTimeout(() => {
        setRetryKey(k => k + 1);
        setImgError(false);
      }, 2000);
    }
    return () => clearTimeout(timer);
  }, [imgError]);

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all duration-300 flex flex-col group relative ${
      isDarkMode 
        ? 'bg-slate-900 border-slate-800 shadow-xl hover:border-cyan-500/50' 
        : 'bg-white border-slate-200 shadow-sm hover:border-cyan-500/60'
    }`}>
      {/* Top Card Header */}
      <div className={`px-3.5 py-2.5 border-b flex items-center justify-between z-10 transition-colors ${
        isDarkMode 
          ? 'bg-slate-950/85 border-slate-800/80 text-slate-200' 
          : 'bg-slate-50/95 border-slate-200 text-slate-800'
      }`}>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:bg-rose-500/20 dark:border-rose-500/40 dark:text-rose-400 text-[11px] font-bold tracking-wider uppercase animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            LIVE ANPR
          </div>
          <span className={`text-xs font-semibold tracking-tight truncate max-w-[170px] ${
            isDarkMode ? 'text-slate-200' : 'text-slate-800'
          }`} title={name}>
            {name}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {onCalibrate && (
            <button
              onClick={() => onCalibrate(camId)}
              title="Camera Geometry Calibration"
              className={`p-1 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'hover:bg-slate-800 text-slate-400 hover:text-amber-400' 
                  : 'hover:bg-slate-200 text-slate-500 hover:text-amber-600'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          )}
          {onInspect && (
            <button
              onClick={() => onInspect(camId)}
              title="Expand Camera Feed (Deep Dive)"
              className={`p-1 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'hover:bg-slate-800 text-slate-400 hover:text-cyan-400' 
                  : 'hover:bg-slate-200 text-slate-500 hover:text-cyan-600'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Video Feed Area */}
      <div
        className="relative aspect-video bg-black flex items-center justify-center overflow-hidden cursor-pointer"
        onClick={() => onInspect && onInspect(camId)}
      >
        {!imgError ? (
          <img
            key={`${camId}-${retryKey}`}
            src={streamUrl}
            alt={`${name} Live Stream`}
            className="w-full h-full object-cover select-none"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full relative">
            <video
              key={`vid-${camId}`}
              src={fallbackVideoUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
              onError={(e) => {
                if (!e.target.src.includes('expressway_traffic.mp4')) {
                  e.target.src = '/expressway_traffic.mp4';
                }
              }}
            />
            <div className="absolute top-2 left-2 bg-black/70 backdrop-blur px-2 py-0.5 rounded text-[10px] text-amber-300 font-mono flex items-center gap-1">
              <Radio className="w-3 h-3 animate-pulse text-amber-400" />
              <span>Standby Sync Feed</span>
            </div>
          </div>
        )}

        {/* Floating Quick Stats Overlay on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex flex-col justify-between p-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono bg-black/60 backdrop-blur px-2 py-0.5 rounded text-amber-300 border border-amber-400/30">
              YOLOv8 + Homography
            </span>
            <span className="text-[10px] font-mono bg-cyan-950/80 px-2 py-0.5 rounded text-cyan-300 border border-cyan-400/30">
              {activeTracks} Active Vehicles
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-white/90">
            <span>Location: <strong>{location}</strong></span>
            <span className="text-cyan-400 font-semibold flex items-center gap-1">
              Click to Deep Dive <Maximize2 className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Footer Info Bar */}
      <div className={`px-3 py-2 border-t flex items-center justify-between text-xs transition-colors ${
        isDarkMode 
          ? 'bg-slate-950/90 border-slate-800/80 text-slate-400' 
          : 'bg-slate-50 border-slate-200 text-slate-600'
      }`}>
        <div className="flex items-center gap-2">
          <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
            Limit: <strong className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>{speedLimit} km/h</strong>
          </span>
          <span className={isDarkMode ? 'text-slate-600' : 'text-slate-300'}>•</span>
          <span className={`flex items-center gap-1 font-medium ${
            isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
          }`}>
            <ShieldCheck className="w-3 h-3" /> {accuracy}% Accuracy
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${status === 'Online' ? 'bg-emerald-500 shadow-sm shadow-emerald-400/50' : 'bg-rose-500'}`}></span>
          <span className={`text-[11px] font-medium ${
            status === 'Online' 
              ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600') 
              : (isDarkMode ? 'text-rose-400' : 'text-rose-600')
          }`}>
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}
