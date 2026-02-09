import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Pokemon } from '../types';
import { GripVertical } from 'lucide-react';

interface Props {
  pokemon: Pokemon;
}

export const PokemonCard: React.FC<Props> = ({ pokemon }) => {
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
        />
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm truncate">{pokemon.nickname || pokemon.species}</p>
        <p className="text-xs text-gray-400 truncate">{pokemon.species}</p>
      </div>

      {/* Drag Handle */}
      <div {...attributes} {...listeners} className="text-gray-500 hover:text-white">
        <GripVertical size={16} />
      </div>
    </div>
  );
};

export default PokemonCard;
