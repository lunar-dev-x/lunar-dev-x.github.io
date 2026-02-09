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
      className={`relative flex items-center gap-2 p-2 bg-gray-700 rounded-lg border-l-4 cursor-grab hover:bg-gray-600 transition group overflow-hidden ${borderColor}`}
    >
      {/* Pair Indicator */}
      <div 
        className="absolute top-1 right-1 w-3 h-3 rounded-full border border-white/50 shadow-sm" 
        style={{ backgroundColor: pairColor }}
        title={`Link ID: ${pokemon.pairId}`}
      />
      
      {/* Sprite */}
      <div className="w-12 h-12 bg-gray-800 rounded-full overflow-hidden flex items-center justify-center shrink-0">
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
      <div className="flex-1 min-w-0 flex flex-col">
        <p className="font-bold text-sm truncate">{pokemon.nickname || pokemon.species}</p>
        <p className="text-xs text-gray-400 truncate">{pokemon.species}</p>
        
        {/* Blame Display (Only in Graveyard) */}
        {pokemon.status === 'graveyard' && (
            <div className="mt-1">
                {pokemon.killedBy ? (
                    <span 
                        className={`text-[10px] px-1 rounded font-bold uppercase
                        ${pokemon.killedBy === 'player1' ? 'bg-blue-900 text-blue-200' : 
                          pokemon.killedBy === 'player2' ? 'bg-red-900 text-red-200' : 
                          'bg-green-900 text-green-200'}`}
                        onPointerDown={(e) => {
                            // Prevent drag
                            e.stopPropagation();
                        }}
                        onClick={(e) => {
                             e.preventDefault();
                             // Cycle blame
                             const next = pokemon.killedBy === 'player1' ? 'player2' : pokemon.killedBy === 'player2' ? 'player3' : 'player1';
                             onUpdate?.(pokemon.id, { killedBy: next });
                        }}
                    >
                        Skull: {pokemon.killedBy === 'player1' ? 'P1' : pokemon.killedBy === 'player2' ? 'P2' : 'P3'}
                    </span>
                ) : (
                     <button
                        className="text-[10px] bg-gray-800 hover:bg-gray-900 px-1 rounded text-gray-400 flex items-center gap-1"
                         onPointerDown={(e) => {
                            e.stopPropagation();
                        }}
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
