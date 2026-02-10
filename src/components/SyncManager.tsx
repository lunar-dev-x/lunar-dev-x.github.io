import React, { useState } from 'react';
import { WifiOff, Copy, Play, Link, Users, LogOut, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SyncManagerProps {
  sessionId: string;
  isConnected: boolean;
  isHost: boolean;
  userCount: number;
  createSession: () => Promise<string | null>;
  joinSession: (id: string) => void;
  leaveSession: () => void;
  terminateSession: () => void;
}

const SyncManager: React.FC<SyncManagerProps> = ({ sessionId, isConnected, isHost, userCount, createSession, joinSession, leaveSession, terminateSession }) => {
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
        className={`relative flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-all duration-300 ${
          isConnected 
            ? 'bg-zinc-900 border-zinc-600 text-zinc-100 hover:bg-zinc-800' 
            : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
        }`}
      >
        {isConnected ? <Users size={16} /> : <WifiOff size={16} />}
        <span>{isConnected ? `${userCount} Active` : 'Sync'}</span>
        {isConnected && <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>}
      </button>

      <AnimatePresence>
      {isOpen && (
        <>
            {/* Backdrop handles click outside */}
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="fixed inset-0 z-40 bg-black/50 md:bg-transparent" onClick={() => setIsOpen(false)} 
            />
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute top-12 right-0 w-[340px] bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-lg shadow-2xl p-6 z-50 flex flex-col gap-6 ring-1 ring-white/5"
            >
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

                <div className="pt-2 border-t border-zinc-800 space-y-2">
                    {isHost && (
                        <button onClick={terminateSession} className="w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-500/10 hover:border-red-500/20 border border-transparent py-2 rounded-md text-sm transition font-medium">
                             <WifiOff size={14} />
                             <span>End Session</span>
                        </button>
                    )}
                    <button onClick={leaveSession} className="w-full flex items-center justify-center gap-2 text-zinc-400 hover:text-white hover:bg-zinc-800 py-2 rounded-md text-sm transition">
                        <LogOut size={14} />
                        <span>Disconnect Local</span>
                    </button>
                </div>
                </div>
            )}
            </motion.div>
        </>
      )}
      </AnimatePresence>
    </div>
  );
};

export default SyncManager;
