import React, { useState, useEffect } from 'react';
import { Pokemon, StatProfile } from '../types';
import { X, Sword, Shield, Save, RefreshCw } from 'lucide-react';
import { getTypeEffectiveness } from '../utils/gameData';
import { getPokemonDetails } from '../utils/pokeApi';
import AutocompleteInput from './AutocompleteInput';
import { motion } from 'framer-motion';

interface Props {
  isOpen?: boolean;
  pokemon: Pokemon;
  onUpdate: (id: string, updates: Partial<Pokemon>) => void;
  onClose: () => void;
}

const calculateStat = (base: number, level: number, isHp: boolean) => {
    // Assumption: Neutral Nature, 15 IVs, 0 EVs (Generic Playthrough)
    if (isHp) {
        return Math.floor(((2 * base + 15) * level) / 100) + level + 10;
    } else {
        return Math.floor(((2 * base + 15) * level) / 100) + 5;
    }
};

const STAT_LABELS: Record<string, string> = {
    hp: 'HP',
    attack: 'Attack',
    defense: 'Defense',
    'special-attack': 'Sp. Atk',
    'special-defense': 'Sp. Def',
    speed: 'Speed'
};

const PokemonDetailsModal: React.FC<Props> = ({ pokemon, onUpdate, onClose }) => {
  const [nickname, setNickname] = useState(pokemon.nickname || '');
  const [item, setItem] = useState(pokemon.item || '');
  const [level, setLevel] = useState(pokemon.level || 5);
  const [moves, setMoves] = useState<string[]>(pokemon.moves || ['', '', '', '']);
  const [types, setTypes] = useState<string[]>(pokemon.types || []);
  const [possibleMoves, setPossibleMoves] = useState<string[]>([]);
  
  // Stats State
  const [stats, setStats] = useState<StatProfile>(pokemon.stats || {
      hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0
  });
  const [baseStats, setBaseStats] = useState<any>(null); // To allow resetting to defaults

  // Effect to load types if missing
  useEffect(() => {
      const fetchDetails = async () => {
          const details = await getPokemonDetails(pokemon.species);
          if (details) {
              setBaseStats(details.stats);

              if (!pokemon.types || pokemon.types.length === 0) {
                  setTypes(details.types);
                  onUpdate(pokemon.id, { types: details.types });
              }
              
              const moveNames = Array.from(new Set(details.moves.map((m: any) => m.name))).sort() as string[];
              setPossibleMoves(moveNames);

              // If no custom stats saved, calculate them now
              if (!pokemon.stats) {
                  const s: any = {};
                  details.stats.forEach((st: any) => {
                      const isHp = st.stat.name === 'hp';
                      s[st.stat.name] = calculateStat(st.base_stat, level, isHp);
                  });
                  setStats(s as StatProfile);
              }
          }
      };
      fetchDetails();
  }, [pokemon.species]);

  // Recalculate stats when level changes IF using defaults (optional behavior, maybe just provide a reset button?)
  // Actually usually users want stats to auto-update with level unless manually overriden.
  // But hard to know if "manually overriden". Let's provide a "Recalculate" button.

  const handleRecalculateStats = () => {
      if (!baseStats) return;
      const s: any = {};
      baseStats.forEach((st: any) => {
          const isHp = st.stat.name === 'hp';
          s[st.stat.name] = calculateStat(st.base_stat, level, isHp);
      });
      setStats(s as StatProfile);
  };

  const handleSave = () => {
    onUpdate(pokemon.id, {
        nickname,
        item,
        level,
        moves,
        types, // Ensure types vary with evolutions if re-fetched
        stats
    });
    onClose();
  };

  const effectiveness = getTypeEffectiveness(types);
  const weaknesses = Object.entries(effectiveness).filter(([_, val]) => val > 1);
  const resistances = Object.entries(effectiveness).filter(([_, val]) => val < 1 && val > 0);
  const immunities = Object.entries(effectiveness).filter(([_, val]) => val === 0);

  return (
    <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" 
        onClick={onClose}
    >
        <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]" 
            onClick={e => e.stopPropagation()}
        >
            {/* Header */}
            <div className="p-6 border-b border-zinc-700 flex items-start gap-4">
               <div className="w-20 h-20 bg-zinc-950 rounded-full border-2 border-zinc-700 flex items-center justify-center shrink-0 relative">
                   <img 
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.dexId}.png`} 
                      className="w-full h-full object-contain"
                   />
                   {types.map((t, i) => (
                       <span key={t} className={`absolute -bottom-2 ${i===0?'left-0':'right-0'} px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-zinc-800 border border-zinc-600`}>
                           {t}
                       </span>
                   ))}
               </div>
               
               <div className="flex-1">
                   <input 
                      className="bg-transparent text-2xl font-bold text-white outline-none placeholder:text-zinc-600 w-full"
                      value={nickname}
                      onChange={e => setNickname(e.target.value)}
                      placeholder={pokemon.species}
                   />
                   <p className="text-zinc-500 font-mono text-sm">{pokemon.species} #{pokemon.dexId}</p>
                   
                   <div className="mt-2 flex gap-2">
                       <input 
                          className="bg-zinc-950/50 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 outline-none w-32 focus:border-indigo-500"
                          value={item}
                          onChange={e => setItem(e.target.value)}
                          placeholder="Held Item..."
                       />
                       <input 
                          type="number"
                          className="bg-zinc-950/50 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 outline-none w-16 focus:border-indigo-500 text-center"
                          value={level}
                          onChange={e => setLevel(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                          placeholder="Lv"
                          title="Level"
                       />
                   </div>
               </div>

               <button onClick={onClose} className="text-zinc-500 hover:text-white">
                   <X size={24} />
               </button>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Stats & Weaknesses */}
                <div className="space-y-6">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="flex items-center gap-2 text-sm font-bold text-zinc-400 uppercase tracking-wider">
                                <Sword size={14} /> Stats
                            </h4>
                            <button 
                                onClick={handleRecalculateStats}
                                className="text-[10px] flex items-center gap-1 text-zinc-500 hover:text-white bg-zinc-800 px-2 py-1 rounded transition"
                                title="Recalculate based on Level & Base Stats"
                            >
                                <RefreshCw size={10} /> Auto-Calc
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            {Object.entries(stats).map(([key, val]) => (
                                <div key={key} className="flex items-center justify-between bg-zinc-950/50 p-2 rounded border border-zinc-800">
                                    <span className="text-xs text-zinc-500 font-bold uppercase">{STAT_LABELS[key]}</span>
                                    <input 
                                        type="number" 
                                        value={Math.round(val)} 
                                        onChange={(e) => setStats({...stats, [key]: parseInt(e.target.value) || 0})}
                                        className="w-12 bg-transparent text-right font-mono text-sm text-zinc-200 focus:outline-none focus:text-white"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="flex items-center gap-2 text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">
                            <Shield size={14} /> Type Matchups
                        </h4>
                        
                        <div className="space-y-4 text-sm">
                            {weaknesses.length > 0 && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <span className="text-red-400 font-bold block mb-1">Weaknesses</span>
                                    <div className="flex flex-wrap gap-1">
                                        {weaknesses.map(([t, val]) => (
                                            <span key={t} className="px-1.5 py-0.5 bg-red-500/20 text-red-300 rounded text-xs">
                                                {t} {val > 2 ? '4x' : '2x'}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {resistances.length > 0 && (
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                    <span className="text-emerald-400 font-bold block mb-1">Resistances</span>
                                    <div className="flex flex-wrap gap-1">
                                        {resistances.map(([t, val]) => (
                                            <span key={t} className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-xs">
                                                {t} {val < 0.5 ? '1/4x' : '1/2x'}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                             {immunities.length > 0 && (
                                <div className="p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
                                    <span className="text-zinc-400 font-bold block mb-1">Immune To</span>
                                    <div className="flex flex-wrap gap-1">
                                        {immunities.map(([t]) => (
                                            <span key={t} className="px-1.5 py-0.5 bg-zinc-700 text-zinc-300 rounded text-xs uppercase">
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Moveset */}
                <div>
                     <h4 className="flex items-center gap-2 text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">
                        <Sword size={14} /> Moveset
                    </h4>
                    <div className="space-y-2">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className="relative">
                                <AutocompleteInput 
                                    value={moves[i]}
                                    onChange={(val) => {
                                        const newMoves = [...moves];
                                        newMoves[i] = val;
                                        setMoves(newMoves);
                                    }}
                                    options={possibleMoves}
                                    placeholder={`Move ${i + 1}`}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">
                        Start typing to search learnable moves.
                    </p>
                </div>
            </div>

            <div className="p-6 border-t border-zinc-700 flex justify-end gap-3">
                <button onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white transition">Cancel</button>
                <button 
                  onClick={handleSave}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                >
                    <Save size={18} /> Save Details
                </button>
            </div>
        </motion.div>
    </motion.div>
  );
};

export default PokemonDetailsModal;
