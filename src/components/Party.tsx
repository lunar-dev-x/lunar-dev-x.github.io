import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Pokemon, Player } from '../types';
import PokemonCard from './PokemonCard';

interface Props {
  player: Player | 'graveyard';
  pokemon: Pokemon[];
  onContextMenu?: (e: React.MouseEvent, id: string) => void;
}

const Party: React.FC<Props> = ({ player, pokemon, onContextMenu }) => {
  const containerId = `party-${player}`;
  const { setNodeRef } = useDroppable({
    id: containerId,
  });

  const MAX_PARTY_SIZE = 6;
  const emptySlots = Math.max(0, MAX_PARTY_SIZE - pokemon.length);

  // Background gradients for the 6 distinct areas
  const getSlotStyle = (index: number) => {
      const styles = [
          'bg-red-500/5 border-red-500/10 hover:bg-red-500/10',
          'bg-orange-500/5 border-orange-500/10 hover:bg-orange-500/10',
          'bg-yellow-500/5 border-yellow-500/10 hover:bg-yellow-500/10',
          'bg-green-500/5 border-green-500/10 hover:bg-green-500/10',
          'bg-cyan-500/5 border-cyan-500/10 hover:bg-cyan-500/10',
          'bg-violet-500/5 border-violet-500/10 hover:bg-violet-500/10',
      ];
      return styles[index] || 'bg-zinc-900/20 border-zinc-800/50';
  };

  return (
    <div className="mb-6">
      <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-2 font-bold pl-1 flex justify-between">
        <span>Party</span>
        <span className="text-[10px] opacity-60">{pokemon.length}/6</span>
      </h3>
      
      <div 
        ref={setNodeRef}
        className="grid grid-cols-1 sm:grid-cols-2 gap-2"
      >
        <SortableContext 
          items={pokemon.map(p => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {/* Render Filled Slots (0 to N) */}
          {pokemon.map((p, index) => (
            <div 
                key={p.id} 
                className={`relative p-1 rounded-lg border ${getSlotStyle(index)} transition-colors`}
            >
                <div className="absolute top-0 right-0 p-1">
                    <span className="text-[9px] font-bold text-zinc-600 block leading-none">#{index + 1}</span>
                </div>
                <PokemonCard pokemon={p} onContextMenu={(e) => onContextMenu?.(e, p.id)} />
            </div>
          ))}
        </SortableContext>
        
        {/* Render Empty Slots (N to 6) */}
        {Array.from({ length: emptySlots }).map((_, i) => {
             const actualIndex = pokemon.length + i;
             return (
                <div 
                    key={`empty-${i}`} 
                    className={`min-h-[74px] rounded-lg border-2 border-dashed flex items-center justify-center relative overflow-hidden group transition-all ${getSlotStyle(actualIndex)}`}
                >
                    <span className="text-zinc-800 text-3xl font-bold opacity-30 select-none group-hover:opacity-50 transition-opacity">
                        {actualIndex + 1}
                    </span>
                    <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px]" />
                </div>
             )
        })}
      </div>
    </div>
  );
};

export default Party;
