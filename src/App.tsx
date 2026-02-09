import React, { useState, useEffect } from 'react';
import { DndContext, DragOverlay, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Pokemon, AppState, Route, PokemonStatus, Player } from './types';
import { Save, Upload } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { getDexId } from './utils/pokeApi';

import Party from './components/Party';
import Box from './components/Box';
import RouteTracker from './components/RouteTracker';
import PokemonCard from './components/PokemonCard';

const INITIAL_ROUTES: Route[] = [
  { id: 'start', name: 'Nuvema Town (Starter)', status: 'empty' },
  { id: 'r1', name: 'Route 1', status: 'empty' },
  { id: 'accumula', name: 'Accumula Town', status: 'empty' },
  { id: 'r2', name: 'Route 2', status: 'empty' },
  { id: 'striaton', name: 'Striaton City', status: 'empty' },
  { id: 'dream', name: 'Dreamyard', status: 'empty' },
  { id: 'r3', name: 'Route 3', status: 'empty' },
  { id: 'wellspring', name: 'Wellspring Cave', status: 'empty' },
  { id: 'nacrene', name: 'Nacrene City', status: 'empty' },
  { id: 'pinwheel-out', name: 'Pinwheel Forest (Outer)', status: 'empty' },
  { id: 'pinwheel-in', name: 'Pinwheel Forest (Inner)', status: 'empty' },
  { id: 'castelia', name: 'Castelia City', status: 'empty' },
  { id: 'r4', name: 'Route 4', status: 'empty' },
  { id: 'desert', name: 'Desert Resort', status: 'empty' },
  { id: 'relic', name: 'Relic Castle', status: 'empty' },
  { id: 'nimbasa', name: 'Nimbasa City', status: 'empty' },
  { id: 'r16', name: 'Route 16', status: 'empty' },
  { id: 'r5', name: 'Route 5', status: 'empty' },
  { id: 'driftveil', name: 'Driftveil Drawbridge', status: 'empty' },
  { id: 'driftveil-city', name: 'Driftveil City', status: 'empty' },
  { id: 'cold', name: 'Cold Storage', status: 'empty' },
  { id: 'r6', name: 'Route 6', status: 'empty' },
  { id: 'chargestone', name: 'Chargestone Cave', status: 'empty' },
  { id: 'mistralton', name: 'Mistralton Cave', status: 'empty' },
  { id: 'r7', name: 'Route 7', status: 'empty' },
  { id: 'celestial', name: 'Celestial Tower', status: 'empty' },
  { id: 'twist', name: 'Twist Mountain', status: 'empty' },
  { id: 'icirrus', name: 'Icirrus City', status: 'empty' },
  { id: 'dragonspiral', name: 'Dragonspiral Tower', status: 'empty' },
  { id: 'r8', name: 'Route 8', status: 'empty' },
  { id: 'moor', name: 'Moor of Icirrus', status: 'empty' },
  { id: 'r9', name: 'Route 9', status: 'empty' },
  { id: 'r10', name: 'Route 10', status: 'empty' },
  { id: 'victory', name: 'Victory Road', status: 'empty' },
  { id: 'fossil', name: 'Fossil Revive', status: 'empty' },
  { id: 'egg', name: 'Egg Encounter', status: 'empty' },
];

function App() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('soul-link-state');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
          ...parsed,
          playerNames: parsed.playerNames || {
            player1: 'Player 1',
            player2: 'Player 2',
            player3: 'Player 3'
          },
          // Ensure routes are merged if new ones added (simple check)
          routes: parsed.routes.length < INITIAL_ROUTES.length ? 
            [...parsed.routes, ...INITIAL_ROUTES.slice(parsed.routes.length)] : 
            parsed.routes
      };
    }
    return {
      pokemon: [],
      routes: INITIAL_ROUTES,
      playerNames: {
        player1: 'Player 1',
        player2: 'Player 2',
        player3: 'Player 3'
      }
    };
  });

  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('soul-link-state', JSON.stringify(state));
  }, [state]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) return;
    
    // Just for visual connection, actual reorder handled in dragEnd purely for state update simplicity
    // or we could implementing real-time reordering here, but that requires complex state manipulation during drag
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activePokemon = state.pokemon.find(p => p.id === active.id);
    if (!activePokemon) return;

    const overId = over.id as string;
    let targetStatus: PokemonStatus = activePokemon.status;
    let targetOwner: Player = activePokemon.owner;

    // Determine target container properties
    if (overId === 'graveyard') {
      targetStatus = 'graveyard';
    } else if (overId.startsWith('party-') || overId.startsWith('box-')) {
      const [s, o] = overId.split('-');
      targetStatus = s as PokemonStatus;
      targetOwner = o as Player;
    } else {
      // Create dropped over another pokemon
      const overPokemon = state.pokemon.find(p => p.id === overId);
      if (overPokemon) {
        targetStatus = overPokemon.status;
        targetOwner = overPokemon.owner;
      }
    }

    // Constraints: Cannot change owner (unless we want to allow trading? Nuzlocke usually no)
    // The user requirement says "track which pokemon is linked", implying Player A always has Mon A.
    // So we should probably prevent changing owner unless it's graveyard (which is shared but has owner prop).
    if (targetOwner !== activePokemon.owner && targetStatus !== 'graveyard') {
        // Prevent moving to other player's box/party
        return;
    }

    // Update State
    setState(prev => {
      let newPokemon = [...prev.pokemon];
      
      // Update status and owner of the moved pokemon
      const movedIndex = newPokemon.findIndex(p => p.id === active.id);
      newPokemon[movedIndex] = {
        ...newPokemon[movedIndex],
        status: targetStatus,
        owner: targetStatus === 'graveyard' ? activePokemon.owner : targetOwner 
      };

      // Reordering logic
      // If we dropped over another pokemon, we want to place it at that index
      if (!overId.startsWith('party-') && !overId.startsWith('box-') && overId !== 'graveyard') {
          const overIndex = newPokemon.findIndex(p => p.id === overId);
          if (overIndex !== -1) {
             newPokemon = arrayMove(newPokemon, movedIndex, overIndex);
          }
      }

      return {
        ...prev,
        pokemon: newPokemon
      };
    });
  };

  const handleCatch = async (routeId: string, p1Species: string, p2Species: string, p3Species: string) => {
    const pairId = uuidv4();
    const [p1Dex, p2Dex, p3Dex] = await Promise.all([
      getDexId(p1Species), 
      getDexId(p2Species),
      getDexId(p3Species)
    ]);
    
    // Determine where to put them. Party if < 6, else Box.
    const p1PartySize = state.pokemon.filter(p => p.owner === 'player1' && p.status === 'party').length;
    const p2PartySize = state.pokemon.filter(p => p.owner === 'player2' && p.status === 'party').length;
    const p3PartySize = state.pokemon.filter(p => p.owner === 'player3' && p.status === 'party').length;

    const statusP1 = p1PartySize < 6 ? 'party' : 'box';
    const statusP2 = p2PartySize < 6 ? 'party' : 'box';
    const statusP3 = p3PartySize < 6 ? 'party' : 'box';
    
    // Sync status: if either party full, go to box? Or fill independently?
    // Let's fill independently.

    const newP1: Pokemon = {
      id: uuidv4(),
      species: p1Species,
      dexId: p1Dex,
      nickname: '',
      owner: 'player1',
      status: statusP1,
      pairId,
      route: routeId
    };

    const newP2: Pokemon = {
      id: uuidv4(),
      species: p2Species,
      dexId: p2Dex,
      nickname: '',
      owner: 'player2',
      status: statusP2,
      pairId,
      route: routeId
    };

    const newP3: Pokemon = {
      id: uuidv4(),
      species: p3Species,
      dexId: p3Dex,
      nickname: '',
      owner: 'player3',
      status: statusP3,
      pairId,
      route: routeId
    };

    setState(prev => ({
      ...prev,
      pokemon: [...prev.pokemon, newP1, newP2, newP3]
    }));
  };

  const updateRoute = (routeId: string, updates: Partial<Route>) => {
      setState(prev => ({
          ...prev,
          routes: prev.routes.map(r => r.id === routeId ? { ...r, ...updates } : r)
      }));
  };

  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "soullink_save.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };
  
  const triggerImport = () => {
      document.getElementById('import-file')?.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (json.pokemon && json.routes) {
                  setState(json);
              }
          } catch (err) {
              alert('Invalid Save File');
          }
      };
      reader.readAsText(file);
  };

  const getActivePokemon = () => {
    return state.pokemon.find(p => p.id === activeId);
  };

  const updatePokemon = (id: string, updates: Partial<Pokemon>) => {
      setState(prev => ({
          ...prev,
          pokemon: prev.pokemon.map(p => p.id === id ? { ...p, ...updates } : p)
      }));
  };
  
  const updateName = (player: 'player1' | 'player2' | 'player3', name: string) => {
      setState(prev => ({
          ...prev,
          playerNames: {
              ...prev.playerNames!,
              [player]: name
          }
      }));
  };

  // Calculate deaths
  const deaths = {
      p1: state.pokemon.filter(p => p.status === 'graveyard' && p.killedBy === 'player1').length,
      p2: state.pokemon.filter(p => p.status === 'graveyard' && p.killedBy === 'player2').length,
      p3: state.pokemon.filter(p => p.status === 'graveyard' && p.killedBy === 'player3').length,
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8 font-sans">
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 bg-clip-text text-transparent">
            Soul Link Tracker
          </h1>
          <p className="text-gray-400 text-sm mt-1">Pokémon Black Soul Link Challenge (3 Players)</p>
        </div>
        
        {/* Death Counters */}
        <div className="flex gap-4 bg-gray-800 p-2 rounded-lg border border-gray-700">
             <div className="flex flex-col items-center px-2 min-w-[80px]">
                 <span className="text-xs text-blue-400 font-bold uppercase truncate max-w-[100px]" title={state.playerNames?.player1}>{state.playerNames?.player1 || 'P1'}</span>
                 <span className="text-xl font-mono">{deaths.p1}</span>
             </div>
             <div className="w-px bg-gray-700"></div>
             <div className="flex flex-col items-center px-2 min-w-[80px]">
                 <span className="text-xs text-red-400 font-bold uppercase truncate max-w-[100px]" title={state.playerNames?.player2}>{state.playerNames?.player2 || 'P2'}</span>
                 <span className="text-xl font-mono">{deaths.p2}</span>
             </div>
             <div className="w-px bg-gray-700"></div>
             <div className="flex flex-col items-center px-2 min-w-[80px]">
                 <span className="text-xs text-green-400 font-bold uppercase truncate max-w-[100px]" title={state.playerNames?.player3}>{state.playerNames?.player3 || 'P3'}</span>
                 <span className="text-xl font-mono">{deaths.p3}</span>
             </div>
        </div>

        <div className="flex gap-3">
          <button onClick={exportData} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-semibold transition shadow-lg shadow-blue-900/20">
            <Save size={18} /> Save
          </button>
          <input type="file" id="import-file" className="hidden" onChange={handleImport} accept=".json" />
          <button onClick={triggerImport} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-semibold transition border border-gray-600">
            <Upload size={18} /> Import
          </button>
        </div>
      </header>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Player 1 Area */}
          <div className="bg-gray-800/50 p-6 rounded-2xl border border-blue-500/20 shadow-xl backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-700 pb-4">
               <div className="w-4 h-4 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
               <input 
                  className="text-2xl font-bold text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-white focus:outline-none w-full"
                  value={state.playerNames?.player1 || 'Player 1'}
                  onChange={(e) => updateName('player1', e.target.value)}
                />
            </div>
            <Party player="player1" pokemon={state.pokemon.filter(p => p.owner === 'player1' && p.status === 'party')} />
            <Box player="player1" pokemon={state.pokemon.filter(p => p.owner === 'player1' && p.status === 'box')} />
          </div>

          {/* Player 2 Area */}
          <div className="bg-gray-800/50 p-6 rounded-2xl border border-red-500/20 shadow-xl backdrop-blur-sm">
             <div className="flex items-center gap-3 mb-6 border-b border-gray-700 pb-4">
               <div className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
               <input 
                  className="text-2xl font-bold text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-white focus:outline-none w-full"
                  value={state.playerNames?.player2 || 'Player 2'}
                  onChange={(e) => updateName('player2', e.target.value)}
                />
            </div>
            <Party player="player2" pokemon={state.pokemon.filter(p => p.owner === 'player2' && p.status === 'party')} />
            <Box player="player2" pokemon={state.pokemon.filter(p => p.owner === 'player2' && p.status === 'box')} />
          </div>
          
          {/* Player 3 Area */}
          <div className="bg-gray-800/50 p-6 rounded-2xl border border-green-500/20 shadow-xl backdrop-blur-sm">
             <div className="flex items-center gap-3 mb-6 border-b border-gray-700 pb-4">
               <div className="w-4 h-4 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
               <input 
                  className="text-2xl font-bold text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-white focus:outline-none w-full"
                  value={state.playerNames?.player3 || 'Player 3'}
                  onChange={(e) => updateName('player3', e.target.value)}
                />
            </div>
            <Party player="player3" pokemon={state.pokemon.filter(p => p.owner === 'player3' && p.status === 'party')} />
            <Box player="player3" pokemon={state.pokemon.filter(p => p.owner === 'player3' && p.status === 'box')} />
          </div>
        </div>
        
        <div className="mt-8 bg-gray-800/80 p-6 rounded-2xl border border-purple-500/20 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
             <div className="w-4 h-4 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
             <h2 className="text-2xl font-bold text-gray-200">Graveyard</h2>
          </div>
           {/* Shared Graveyard */}
           <Box 
              player="player1" 
              isGraveyard 
              pokemon={state.pokemon.filter(p => p.status === 'graveyard')} 
              onUpdatePokemon={updatePokemon}
           />
        </div>

        <RouteTracker routes={state.routes} onUpdateRoute={updateRoute} onCatch={handleCatch} />

        <DragOverlay>
           {activeId ? (
                <div className="opacity-90 scale-105">
                 <PokemonCard pokemon={getActivePokemon()!} />
                </div>
            ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

export default App
