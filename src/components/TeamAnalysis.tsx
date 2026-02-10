// Placeholder component for Team Analysis
import React from 'react';
import { Pokemon } from '../types';
import { getTypeEffectiveness } from '../utils/gameData';
import { X, ShieldAlert } from 'lucide-react';

interface Props {
  isOpen: boolean;
  pokemon: Pokemon[];
  onClose: () => void;
}

const TeamAnalysis: React.FC<Props> = ({ isOpen, pokemon, onClose }) => {
  if (!isOpen) return null;

  const party = pokemon.filter(p => p.status === 'party');
  
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-lg w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
                <X size={20} />
            </button>
            
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <ShieldAlert className="text-indigo-400" />
                Team Defense Analysis
            </h3>
            <p className="text-zinc-400 text-sm mb-6">Based on {partyWithTypes.length} Pokemon with known types.</p>
            
            {partyWithTypes.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                    Open Pokemon Details cards to load their types first!
                </div>
            ) : (
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Major Weaknesses</h4>
                    <div className="grid grid-cols-2 gap-3">
                        {sortedWeaknesses.length > 0 ? sortedWeaknesses.map(([type, count]) => (
                            <div key={type} className="flex justify-between items-center bg-zinc-950/50 p-3 rounded border border-zinc-800">
                                <span className={`uppercase font-bold text-sm type-${type}`}>{type}</span>
                                <span className={`font-mono font-bold ${count > 2 ? 'text-red-400' : 'text-zinc-400'}`}>
                                    {count}x
                                </span>
                            </div>
                        )) : (
                            <p className="text-emerald-400">No major weaknesses found!</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default TeamAnalysis;
