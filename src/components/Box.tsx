import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { Pokemon, Player } from '../types';
import PokemonCard from './PokemonCard';
import { Skull, X, Layers } from 'lucide-react';

interface Props {
  player: Player | 'graveyard';
  pokemon: Pokemon[];
  isGraveyard?: boolean;
  onUpdatePokemon?: (id: string, updates: Partial<Pokemon>) => void;
  onContextMenu?: (e: React.MouseEvent, id: string) => void;
}

// Helper to generate consistent color (Duplicated from PokemonCard to be self-contained)
const getPairColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs((hash * 137.5) % 360);
    return `hsl(${hue}, 85%, 60%)`;
};

const GraveyardGroup = ({ pairId, pokemonList, onUpdate, onContextMenu }: { pairId: string, pokemonList: Pokemon[], onUpdate?: (id: string, updates: Partial<Pokemon>) => void, onContextMenu?: (e: React.MouseEvent, id: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const color = getPairColor(pairId);
    
    // Determine Killer from the group (assuming they usually sync, but we take the first found)
    const killer = pokemonList.find(p => p.killedBy)?.killedBy;

    if (isOpen) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setIsOpen(false)}>
                <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-2xl w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-200">
                        <X size={20} />
                    </button>
                    
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: color }}></div>
                        <h3 className="text-lg font-bold text-zinc-200">Linked Incident</h3>
                        <span className="text-xs font-mono text-zinc-500 uppercase">{pairId.slice(0, 8)}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pokemonList.map(p => (
                             <div key={p.id} className="relative group">
                                <PokemonCard pokemon={p} onUpdate={onUpdate} onContextMenu={(e) => onContextMenu?.(e, p.id)} />
                             </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div 
            onClick={() => setIsOpen(true)}
            className="relative h-[160px] bg-zinc-900/40 hover:bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 rounded-lg p-3 cursor-pointer transition-all group hover:scale-[1.02] active:scale-[0.98]"
        >
             <div className="absolute top-0 right-0 left-0 h-1 rounded-t-lg opacity-50" style={{ backgroundColor: color }} />
             
             <div className="flex justify-between items-start mb-2 mt-1">
                 <div className="flex -space-x-2">
                     {pokemonList.map(p => (
                         <div key={p.id} className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden flex items-center justify-center relative z-0 group-hover:z-10 transition-all">
                             <img 
                                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.dexId}.png`} 
                                className="w-full h-full object-contain"
                                alt={p.species}
                             />
                         </div>
                     ))}
                 </div>
                 {killer && (
                     <div className={`p-1 rounded bg-zinc-950/50 border border-zinc-800 ${
                         killer === 'player1' ? 'text-blue-400' :
                         killer === 'player2' ? 'text-red-400' : 'text-emerald-400'
                     }`}>
                         <Skull size={14} />
                     </div>
                 )}
             </div>

             <div className="space-y-1 mt-3">
                 {pokemonList.map(p => (
                     <div key={p.id} className="text-xs text-zinc-400 truncate flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                             p.owner === 'player1' ? 'bg-blue-500' :
                             p.owner === 'player2' ? 'bg-red-500' : 'bg-emerald-500'
                        }`}></span>
                        {p.nickname || p.species}
                     </div>
                 ))}
             </div>
             
             <div className="absolute bottom-2 right-2 text-zinc-600 opacity-50 group-hover:opacity-100 transition">
                 <Layers size={14} />
             </div>
        </div>
    );
};

const Box: React.FC<Props> = ({ player, pokemon, isGraveyard = false, onUpdatePokemon, onContextMenu }) => {
  const containerId = isGraveyard ? 'graveyard' : `box-${player}`;
  
  const { setNodeRef } = useDroppable({
    id: containerId,
  });

  // Group by Pair ID for Graveyard
  const groupedGraveyard = React.useMemo(() => {
     if (!isGraveyard) return [];
     const groups: Record<string, Pokemon[]> = {};
     pokemon.forEach(p => {
         if (!groups[p.pairId]) groups[p.pairId] = [];
         groups[p.pairId].push(p);
     });
     return Object.entries(groups).map(([pairId, list]) => ({ pairId, list }));
  }, [pokemon, isGraveyard]);

  return (
    <div>
      <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-2 font-bold flex justify-between pl-1">
        <span>{isGraveyard ? 'Graveyard / Deaths' : 'PC Box'}</span>
        {isGraveyard && (
          <span className="text-xs normal-case font-normal text-zinc-600">
             Click group to view details
          </span>
        )}
      </h3>
      <div 
        ref={setNodeRef}
        className={`min-h-[150px] bg-zinc-950/40 p-3 rounded-lg border-2 border-zinc-800 transition-colors ${isGraveyard ? 'border-purple-900/30 bg-purple-900/5' : 'hover:border-zinc-700/80'}`}
      >
        {isGraveyard ? (
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                 {groupedGraveyard.map(group => (
                     <GraveyardGroup 
                        key={group.pairId} 
                        pairId={group.pairId} 
                        pokemonList={group.list} 
                        onUpdate={onUpdatePokemon}
                        onContextMenu={onContextMenu}
                     />
                 ))}
             </div>
        ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <SortableContext 
                items={pokemon.map(p => p.id)}
                strategy={rectSortingStrategy}
            >
                {pokemon.map(p => (
                <PokemonCard 
                    key={p.id} 
                    pokemon={p} 
                    onUpdate={onUpdatePokemon}
                    onContextMenu={(e) => onContextMenu?.(e, p.id)}
                />
                ))}
            </SortableContext>
            </div>
        )}
      </div>
    </div>
  );
};


export default Box;
