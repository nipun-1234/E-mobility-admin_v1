import React, { useState } from 'react';
import { X, Plus, Camera, Radio, Shield, MapPin, Gauge, CheckCircle2, Video } from 'lucide-react';

export default function AddCameraModal({
  isOpen,
  onClose,
  onAddCamera,
  existingCamerasCount = 7,
  isDarkMode = true
}) {
  const nextId = existingCamerasCount + 1;
  const nextCamId = `cam_${String(nextId).padStart(2, '0')}`;

  const [formData, setFormData] = useState({
    name: `Cam-${String(nextId).padStart(2, '0')} (Central Expy Km 39.5)`,
    location: 'Kurunegala Interchange',
    corridor: 'E04 Central Expressway',
    streamSource: 'camera_08_feed.mp4',
    speedLimit: 100,
    accuracy: 98.8,
    status: 'Online'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newCamera = {
      id: nextId,
      camId: nextCamId,
      name: formData.name || `Cam-${String(nextId).padStart(2, '0')}`,
      location: formData.location || 'Expressway Sector',
      speedLimit: Number(formData.speedLimit) || 100,
      accuracy: Number(formData.accuracy) || 98.8,
      status: formData.status || 'Online',
      activeTracks: Math.floor(Math.random() * 15) + 8,
      streamFile: formData.streamSource
    };

    setTimeout(() => {
      onAddCamera(newCamera);
      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={`border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col transition-colors ${
        isDarkMode ? 'bg-slate-900 border-slate-700/80 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        {/* Modal Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between transition-colors ${
          isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Deploy New CCTV Node
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  {nextCamId.toUpperCase()}
                </span>
              </h2>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Connect real-time optical feed & YOLOv8 speed detection
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-600 hover:text-slate-950'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Camera Name */}
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Camera Name / Sector Designation
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border outline-none transition-colors ${
                isDarkMode 
                  ? 'bg-slate-950 border-slate-800 text-white focus:border-cyan-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-600'
              }`}
              placeholder="e.g. Cam-08 (Central Expy Km 39.5)"
            />
          </div>

          {/* Location & Corridor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Interchange / Location
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs font-semibold border outline-none transition-colors ${
                    isDarkMode 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-cyan-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-600'
                  }`}
                  placeholder="e.g. Kurunegala Interchange"
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Corridor Highway
              </label>
              <select
                value={formData.corridor}
                onChange={(e) => setFormData({ ...formData, corridor: e.target.value })}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border outline-none transition-colors ${
                  isDarkMode 
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-cyan-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-600'
                }`}
              >
                <option value="E01 Southern Expressway">E01 Southern Expressway</option>
                <option value="E02 Outer Circular Expressway">E02 Outer Circular Expressway</option>
                <option value="E03 Colombo - Katunayake Expressway">E03 Colombo - Katunayake</option>
                <option value="E04 Central Expressway">E04 Central Expressway</option>
              </select>
            </div>
          </div>

          {/* Video Stream Source & Speed Limit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Video Source / RTSP Stream
              </label>
              <div className="relative">
                <Video className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <select
                  value={formData.streamSource}
                  onChange={(e) => setFormData({ ...formData, streamSource: e.target.value })}
                  className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs font-semibold border outline-none transition-colors ${
                    isDarkMode 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-cyan-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-600'
                  }`}
                >
                  <option value="camera_08_feed.mp4">camera_08_feed.mp4 (Expressway HD)</option>
                  <option value="camera_01_feed.mp4">camera_01_feed.mp4 (Southern Expy)</option>
                  <option value="expressway_traffic.mp4">expressway_traffic.mp4 (Traffic Flow)</option>
                  <option value="live_rtsp">Live RTSP Optical Stream</option>
                </select>
              </div>
            </div>

            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Speed Limit (km/h)
              </label>
              <div className="relative">
                <Gauge className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="number"
                  min="40"
                  max="140"
                  value={formData.speedLimit}
                  onChange={(e) => setFormData({ ...formData, speedLimit: e.target.value })}
                  className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs font-mono font-bold border outline-none transition-colors ${
                    isDarkMode 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-cyan-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-600'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                isDarkMode 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' 
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 shadow-lg shadow-cyan-600/30 transition-all disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isSubmitting ? 'Deploying...' : 'Deploy & Activate Camera'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
