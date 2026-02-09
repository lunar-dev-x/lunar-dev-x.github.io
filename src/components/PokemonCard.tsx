import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Pokemon } from '../types';
import { Skull } from 'lucide-react';

interface Props {
  pokemon: Pokemon;
  onUpdate?: (id: string, updates: Partial<Pokemon>) => void;
}

export const PokemonCard: React.FC<Props> = ({ pokemon, onUpdate }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: pokemon.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const borderColor = 
    pokemon.owner === 'player1' ? 'border-blue-500' : 
    pokemon.owner === 'player2' ? 'border-red-500' :
    'border-green-500';
  
  // Generate a consistent color from pairId
  const getPairColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  };
  const pairColor = getPairColor(pokemon.pairId);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes} 
      {...listeners}
      className={`relative flex items-center gap-3 p-2 bg-zinc-900 rounded-md border-l-[3px] shadow-sm cursor-grab 
        hover:bg-zinc-800 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] active:cursor-grabbing 
        transition-all duration-200 ease-out group overflow-hidden ${borderColor}`}
    >
      {/* Pair Indicator */}
      <div 
        className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full ring-1 ring-zinc-950/50 shadow-sm" 
        style={{ backgroundColor: pairColor }}
        title={`Link ID: ${pokemon.pairId}`}
      />
      
      {/* Sprite */}
      <div className="w-10 h-10 bg-zinc-950/80 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-zinc-800">
        <img 
          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.dexId}.png`} 
          alt={pokemon.species}
          className="w-full h-full object-contain"
          onError={(e) => {
             // Fallback for missing sprites
             (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';
          }}
        />
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p className="font-semibold text-sm truncate text-zinc-200 leading-tight">{pokemon.nickname || pokemon.species}</p>
        <p className="text-[10px] text-zinc-500 truncate font-medium">{pokemon.species}</p>
        
        {/* Blame Display (Only in Graveyard) */}
        {pokemon.status === 'graveyard' && (
            <div className="mt-1">
                {pokemon.killedBy ? (
                    <button 
                        className={`text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 font-bold uppercase tracking-wide transition ring-1 ring-inset
                        ${pokemon.killedBy === 'player1' ? 'bg-blue-500/10 text-blue-400 ring-blue-500/20 hover:bg-blue-500/20' : 
                          pokemon.killedBy === 'player2' ? 'bg-red-500/10 text-red-400 ring-red-500/20 hover:bg-red-500/20' : 
                          'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20 hover:bg-emerald-500/20'}`}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                             e.preventDefault();
                             // Cycle blame
                             const next = pokemon.killedBy === 'player1' ? 'player2' : pokemon.killedBy === 'player2' ? 'player3' : 'player1';
                             onUpdate?.(pokemon.id, { killedBy: next });
                        }}
                    >
                        <Skull size={9} /> {pokemon.killedBy === 'player1' ? 'P1' : pokemon.killedBy === 'player2' ? 'P2' : 'P3'}
                    </button>
                ) : (
                     <button
                        className="text-[9px] bg-zinc-800 hover:bg-zinc-700 px-1.5 py-0.5 rounded text-zinc-400 flex items-center gap-1 transition"
                         onPointerDown={(e) => e.stopPropagation()}
                         onClick={(e) => {
                             e.preventDefault();
                             onUpdate?.(pokemon.id, { killedBy: 'player1' });
                        }}
                     >
                       <Skull size={10} /> Set Blame
                     </button>
                )}
            </div>
        )}
      </div>

      {/* Drag Handle - Hidden/Removed since card is draggable */}
      {/* <div className="text-gray-500 hover:text-white">
        <GripVertical size={16} />
      </div> */}
    </div>
  );
};

export default PokemonCard;
