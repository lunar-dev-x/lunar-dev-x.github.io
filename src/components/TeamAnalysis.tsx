import React, { useState } from 'react';
import { Pokemon } from '../types';
import { getTypeEffectiveness, TYPE_COLORS } from '../utils/gameData';
import { X, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  pokemon: Pokemon[];
  onClose: () => void;
}

const TeamAnalysis: React.FC<Props> = ({ isOpen, pokemon, onClose }) => {
  const [activeTab, setActiveTab] = useState<'player1' | 'player2' | 'player3'>('player1');
  
  const party = pokemon.filter(p => p.status === 'party' && p.owner === activeTab);
  
  const partyWithTypes = party.filter(p => p.types && p.types.length > 0);
  
  const weaknesses: Record<string, number> = {};
  
  partyWithTypes.forEach(p => {
      if (!p.types) return;
      const eff = getTypeEffectiveness(p.types);
      Object.entries(eff).forEach(([type, mult]) => {
          if (mult > 1) {
              weaknesses[type] = (weaknesses[type] || 0) + 1;
          }
      });
  });

  const sortedWeaknesses = Object.entries(weaknesses).sort((a, b) => b[1] - a[1]);

  return (
    <AnimatePresence>
     {isOpen && (
      <motion.div 
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         exit={{ opacity: 0 }}
         transition={{ duration: 0.2 }}
         className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}
      >
        <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.2}}
            className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-lg w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}
        >
            <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-950 sticky top-0">
                <h3 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                    <ShieldAlert className="text-zinc-100" />
                    Team Defense Analysis
                </h3>
                <button onClick={onClose} className="text-zinc-500 hover:text-zinc-100 bg-zinc-900 p-1 rounded-md hover:bg-zinc-800 transition">
                    <X size={20} />
                </button>
            </div>
            
            {/* Player Tabs */}
            <div className="flex border-b border-zinc-800 shrink-0 bg-zinc-950">
                {(['player1', 'player2', 'player3'] as const).map(p => (
                    <button
                        key={p}
                        onClick={() => setActiveTab(p)}
                        className={`flex-1 py-3 text-sm font-bold uppercase transition ${activeTab === p ? 'bg-zinc-900 text-zinc-100 border-b-2 border-zinc-100' : 'text-zinc-600 hover:bg-zinc-900/50 hover:text-zinc-300'}`}
                    >
                        {p === 'player1' ? 'P1' : p === 'player2' ? 'P2' : 'P3'}
                    </button>
                ))}
            </div>
            
            <div className="p-6 overflow-y-auto">
                <p className="text-zinc-400 text-sm mb-6">Analyzing {partyWithTypes.length} Pokemon for P{activeTab === 'player1' ? '1' : activeTab === 'player2' ? '2' : '3'}</p>
                
                {partyWithTypes.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500">
                        No active party members with loaded data found.
                    </div>
                ) : (
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Major Weaknesses</h4>
                        <div className="grid grid-cols-2 gap-3">
                            {sortedWeaknesses.length > 0 ? sortedWeaknesses.map(([type, count]) => (
                                <div key={type} className="flex justify-between items-center bg-zinc-950/50 p-3 rounded border border-zinc-800">
                                    <span className="uppercase font-bold text-sm" style={{ color: TYPE_COLORS[type] }}>{type}</span>
                                    <span className={`font-mono font-bold ${count > 2 ? 'text-red-400' : 'text-zinc-400'}`}>
                                        {count}x
                                    </span>
                                </div>
                            )) : (
                                <p className="text-emerald-400">No shared weaknesses found!</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    </motion.div>
    )}
    </AnimatePresence>
  );
};

export default TeamAnalysis;
