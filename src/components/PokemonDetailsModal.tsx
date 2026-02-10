import React, { useState, useEffect } from 'react';
import { Pokemon } from '../types';
import { X, Sword, Shield, Save, RefreshCw, Zap } from 'lucide-react';
import { getTypeEffectiveness } from '../utils/gameData';
import { getPokemonDetails } from '../utils/pokeApi';
import AutocompleteInput from './AutocompleteInput';

interface Props {
  pokemon: Pokemon;
  onUpdate: (id: string, updates: Partial<Pokemon>) => void;
  onClose: () => void;
}

const PokemonDetailsModal: React.FC<Props> = ({ pokemon, onUpdate, onClose }) => {
  const [nickname, setNickname] = useState(pokemon.nickname || '');
  const [item, setItem] = useState(pokemon.item || '');
  const [moves, setMoves] = useState<string[]>(pokemon.moves || ['', '', '', '']);
  const [types, setTypes] = useState<string[]>(pokemon.types || []);
  const [loading, setLoading] = useState(false);
  const [possibleMoves, setPossibleMoves] = useState<string[]>([]);
  const [flavorText, setFlavorText] = useState('Loading details...');

  // Effect to load types if missing
  useEffect(() => {
      const fetchDetails = async () => {
          if (!pokemon.types || pokemon.types.length === 0) {
              setLoading(true);
              const details = await getPokemonDetails(pokemon.species);
              if (details) {
                  setTypes(details.types);
                  setPossibleMoves(details.moves);
                  // Auto-save types to skip fetch next time
                  onUpdate(pokemon.id, { types: details.types });
              }
              setLoading(false);
          } else {
              // Just fetch moves list for autocomplete
              const details = await getPokemonDetails(pokemon.species);
              if (details) setPossibleMoves(details.moves);
          }
      };
      fetchDetails();
  }, [pokemon.species]);

  const handleSave = () => {
    onUpdate(pokemon.id, {
        nickname,
        item,
        moves,
        types // Ensure types vary with evolutions if re-fetched
    });
    onClose();
  };

  const effectiveness = getTypeEffectiveness(types);
  const weaknesses = Object.entries(effectiveness).filter(([_, val]) => val > 1);
  const resistances = Object.entries(effectiveness).filter(([_, val]) => val < 1 && val > 0);
  const immunities = Object.entries(effectiveness).filter(([_, val]) => val === 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
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
        </div>
    </div>
  );
};

export default PokemonDetailsModal;
