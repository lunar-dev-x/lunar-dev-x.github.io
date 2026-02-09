import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { Pokemon, Player } from '../types';
import PokemonCard from './PokemonCard';

interface Props {
  player: Player | 'graveyard';
  pokemon: Pokemon[];
  isGraveyard?: boolean;
  onUpdatePokemon?: (id: string, updates: Partial<Pokemon>) => void;
}

const Box: React.FC<Props> = ({ player, pokemon, isGraveyard = false, onUpdatePokemon }) => {
  const containerId = isGraveyard ? 'graveyard' : `box-${player}`;
  
  const { setNodeRef } = useDroppable({
    id: containerId,
  });

  return (
    <div>
      <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-2 font-bold flex justify-between pl-1">
        <span>{isGraveyard ? 'Graveyard / Deaths' : 'PC Box'}</span>
        {isGraveyard && (
          <span className="text-xs normal-case font-normal text-zinc-600">
             Click 'Set Blame' on cards to track deaths
          </span>
        )}
      </h3>
      <div 
        ref={setNodeRef}
        className={`min-h-[150px] bg-zinc-950/40 p-3 rounded-lg border-2 border-zinc-800 transition-colors ${isGraveyard ? 'border-purple-900/30 bg-purple-900/5' : 'hover:border-zinc-700/80'}`}
      >
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
              />
            ))}
          </SortableContext>
        </div>
      </div>
    </div>
  );
};

export default Box;
