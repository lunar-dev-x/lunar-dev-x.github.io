import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Pokemon, Player } from '../types';
import PokemonCard from './PokemonCard';

interface Props {
  player: Player | 'graveyard';
  pokemon: Pokemon[];
}

const Party: React.FC<Props> = ({ player, pokemon }) => {
  const containerId = `party-${player}`;
  const { setNodeRef } = useDroppable({
    id: containerId,
  });

  return (
    <div className="mb-6">
      <h3 className="text-sm uppercase tracking-wider text-gray-500 mb-2 font-bold">Party (6 Max)</h3>
      <div 
        ref={setNodeRef}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-[100px] bg-gray-900/50 p-3 rounded-lg border-dashed border-2 border-gray-700"
      >
        <SortableContext 
          items={pokemon.map(p => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {pokemon.map(p => (
            <PokemonCard key={p.id} pokemon={p} />
          ))}
          {pokemon.length === 0 && (
            <div className="col-span-full flex items-center justify-center text-gray-600 text-sm italic h-full">
              Empty Party
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
};

export default Party;
