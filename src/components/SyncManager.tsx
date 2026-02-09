import React, { useState } from 'react';
import { Wifi, WifiOff, Copy, Users, Play, Link } from 'lucide-react';

interface SyncManagerProps {
  peerId: string;
  mode: 'offline' | 'host' | 'client';
  connectionCount: number;
  startHosting: () => void;
  joinSession: (id: string) => void;
}

const SyncManager: React.FC<SyncManagerProps> = ({ peerId, mode, connectionCount, startHosting, joinSession }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [targetId, setTargetId] = useState('');

  const copyId = () => {
    navigator.clipboard.writeText(peerId);
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition shadow-lg ${
          mode === 'offline' 
            ? 'bg-gray-700 hover:bg-gray-600 border border-gray-600' 
            : mode === 'host' 
              ? 'bg-green-600 hover:bg-green-500 shadow-green-900/20'
              : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20'
        }`}
      >
        {mode === 'offline' ? <WifiOff size={18} /> : <Wifi size={18} />}
        {mode === 'offline' ? 'Sync' : mode === 'host' ? 'Hosting' : 'Connected'}
      </button>

      {isOpen && (
        <div className="absolute top-12 right-0 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-4 z-50 text-gray-100 flex flex-col gap-4">
          <h3 className="font-bold text-lg border-b border-gray-700 pb-2">Multiplayer Sync (P2P)</h3>
          
          {mode === 'offline' && (
            <div className="flex flex-col gap-4">
              <div className="bg-gray-700/50 p-3 rounded-lg">
                <p className="text-sm text-gray-300 mb-2">Start a session and share your ID with friends.</p>
                <button onClick={startHosting} className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 py-2 rounded font-medium transition">
                  <Play size={16} /> Start Hosting
                </button>
              </div>
              
              <div className="border-t border-gray-700 pt-3">
                <p className="text-sm text-gray-300 mb-2">Or join a friend's session:</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    placeholder="Enter Host ID..."
                    className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm outline-none focus:border-blue-500"
                  />
                  <button onClick={() => joinSession(targetId)} className="bg-blue-600 hover:bg-blue-500 px-3 rounded flex items-center justify-center">
                    <Link size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {mode === 'host' && (
            <div className="flex flex-col gap-3">
              <div className="bg-green-900/30 border border-green-800 p-3 rounded-lg">
                <span className="text-xs text-green-400 font-bold uppercase tracking-wider">Session ID</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="bg-gray-900 px-2 py-1 rounded flex-1 text-sm font-mono overflow-hidden text-ellipsis">{peerId}</code>
                  <button onClick={copyId} className="p-1 hover:bg-gray-700 rounded transition" title="Copy">
                    <Copy size={16} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Users size={16} />
                <span>Linekd Peers: {connectionCount}</span>
              </div>
            </div>
          )}

          {mode === 'client' && (
             <div className="flex flex-col gap-3">
                <div className="bg-indigo-900/30 border border-indigo-800 p-3 rounded-lg text-center">
                     <p className="text-indigo-200 font-medium">Connected to Host</p>
                     <p className="text-xs text-indigo-400 mt-1">Receiving updates live...</p>
                </div>
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SyncManager;
