import React, { useState } from 'react';
import { Wifi, WifiOff, Copy, Play, Link, Users, LogOut, Loader2 } from 'lucide-react';

interface SyncManagerProps {
  sessionId: string;
  isConnected: boolean;
  userCount: number;
  createSession: () => Promise<string | null>;
  joinSession: (id: string) => void;
  leaveSession: () => void;
}

const SyncManager: React.FC<SyncManagerProps> = ({ sessionId, isConnected, userCount, createSession, joinSession, leaveSession }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [targetId, setTargetId] = useState('');
  const [loading, setLoading] = useState(false);

  const copyId = () => {
    navigator.clipboard.writeText(sessionId);
  };

  const handleCreate = async () => {
      setLoading(true);
      await createSession();
      setLoading(false);
  };

  const handleJoin = async () => {
      if(!targetId) return;
      setLoading(true);
      await joinSession(targetId);
      setLoading(false);
  }

  return (
    <div className="relative z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-all duration-200 ${
          isConnected 
            ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-400 hover:bg-emerald-950/50' 
            : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white'
        }`}
      >
        {isConnected ? <Users size={16} /> : <WifiOff size={16} />}
        <span>{isConnected ? `${userCount} Active` : 'Sync'}</span>
      </button>

      {isOpen && (
        <>
            {/* Backdrop for mobile */}
            <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setIsOpen(false)} />
            
            <div className="absolute top-12 right-0 w-[340px] bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl p-6 z-50 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <h3 className="font-semibold text-lg text-white">Multiplayer Sync</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                    {isConnected ? 'Connected' : 'Offline'}
                </span>
            </div>
            
            {!isConnected && (
                <div className="flex flex-col gap-6">
                <div className="space-y-3">
                    <p className="text-sm text-zinc-400">Start a new session to share with friends.</p>
                    <button 
                        disabled={loading}
                        onClick={handleCreate} 
                        className="w-full flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-zinc-900 py-2.5 rounded-md text-sm font-medium transition disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                        <span>Host New Session</span>
                    </button>
                </div>
                
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-zinc-800" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-zinc-950 px-2 text-zinc-500">Or join existing</span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={targetId}
                        onChange={(e) => setTargetId(e.target.value)}
                        placeholder="Paste Session ID..."
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-zinc-600 text-zinc-200 placeholder:text-zinc-600 font-mono"
                    />
                    <button 
                        disabled={loading || !targetId}
                        onClick={handleJoin} 
                        className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 rounded-md flex items-center justify-center border border-zinc-700 transition disabled:opacity-50"
                    >
                        <Link size={16} />
                    </button>
                </div>
                </div>
            )}

            {isConnected && (
                <div className="flex flex-col gap-4">
                <div className="space-y-1">
                    <label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider pl-1">Session ID</label>
                    <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 p-2 rounded-md group">
                        <code className="flex-1 text-sm font-mono text-zinc-300 ml-1">{sessionId}</code>
                        <button onClick={copyId} className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-white transition opacity-50 group-hover:opacity-100">
                            <Copy size={14} />
                        </button>
                    </div>
                    <p className="text-xs text-zinc-500 pt-1">Detailed stats should appear here soon.</p>
                </div>
                
                <div className="bg-zinc-900 rounded-md p-3 border border-zinc-800 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Users size={16} className="text-zinc-400" />
                        <span className="text-sm text-zinc-300">Active Users</span>
                    </div>
                    <span className="text-lg font-bold text-white font-mono">{userCount}</span>
                </div>

                <div className="pt-2 border-t border-zinc-800">
                    <button onClick={leaveSession} className="w-full flex items-center justify-center gap-2 text-red-400 hover:bg-red-400/10 py-2 rounded-md text-sm transition">
                        <LogOut size={14} />
                        <span>Disconnect Session</span>
                    </button>
                </div>
                </div>
            )}
            </div>
        </>
      )}
    </div>
  );
};

export default SyncManager;
