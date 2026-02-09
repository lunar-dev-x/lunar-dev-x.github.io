import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { Pokemon, Player } from '../types';
import PokemonCard from './PokemonCard';

interface Props {
  player: Player | 'graveyard';
  pokemon: Pokemon[];
  isGraveyard?: boolean;
}

const Box: React.FC<Props> = ({ player, pokemon, isGraveyard = false }) => {
  const containerId = isGraveyard ? 'graveyard' : `box-${player}`;
  
  const { setNodeRef } = useDroppable({
    id: containerId,
  });

  return (
    <div>
      <h3 className="text-sm uppercase tracking-wider text-gray-500 mb-2 font-bold">
        {isGraveyard ? 'Graveyard / Deaths' : 'PC Box'}
      </h3>
      <div 
        ref={setNodeRef}
        className={`min-h-[150px] bg-gray-900/50 p-3 rounded-lg border-2 border-gray-700 ${isGraveyard ? 'border-purple-900/50 bg-purple-900/10' : ''}`}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <SortableContext 
            items={pokemon.map(p => p.id)}
            strategy={rectSortingStrategy}
          >
            {pokemon.map(p => (
              <PokemonCard key={p.id} pokemon={p} />
            ))}
          </SortableContext>
        </div>
        {pokemon.length === 0 && (
          <div className="flex items-center justify-center text-gray-600 text-sm italic h-full py-8">
            {isGraveyard ? 'No deaths yet...' : 'Empty Box'}
          </div>
        )}
      </div>
    </div>
  );
};

export default Box;
