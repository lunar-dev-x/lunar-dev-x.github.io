import React, { useState, useEffect } from 'react';
import { DndContext, DragOverlay, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Pokemon, AppState, Route, PokemonStatus, Player } from './types';
import { Save, Upload, RotateCcw, Skull } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { getDexId, getEvolutionOptions, getPreEvolution } from './utils/pokeApi';

import Party from './components/Party';
import Box from './components/Box';
import RouteTracker from './components/RouteTracker';
import PokemonCard from './components/PokemonCard';
import SyncManager from './components/SyncManager';
import { useMultiplayer } from './hooks/useMultiplayer.ts'; // Hook for Firebase sync
import { motion } from 'framer-motion';

const INITIAL_ROUTES: Route[] = [
  { id: 'start', name: 'Nuvema Town (Starter)', status: 'empty' },
  { id: 'r1', name: 'Route 1', status: 'empty' },
  { id: 'accumula', name: 'Accumula Town', status: 'empty' },
  { id: 'r2', name: 'Route 2', status: 'empty' },
  { id: 'striaton', name: 'Striaton City', status: 'empty' },
  { id: 'dream-gift', name: 'Dreamyard (Gift Monkey)', status: 'empty' },
  { id: 'dream-grass', name: 'Dreamyard (Grass)', status: 'empty' },
  { id: 'r3', name: 'Route 3', status: 'empty' },
  { id: 'wellspring', name: 'Wellspring Cave', status: 'empty' },
  { id: 'nacrene', name: 'Nacrene City (Fossil/Event)', status: 'empty' },
  { id: 'pinwheel-out', name: 'Pinwheel Forest (Outer)', status: 'empty' },
  { id: 'pinwheel-in', name: 'Pinwheel Forest (Inner)', status: 'empty' },
  { id: 'castelia', name: 'Castelia City', status: 'empty' },
  { id: 'r4', name: 'Route 4', status: 'empty' },
  { id: 'desert', name: 'Desert Resort', status: 'empty' },
  { id: 'relic', name: 'Relic Castle', status: 'empty' },
  { id: 'nimbasa', name: 'Nimbasa City', status: 'empty' },
  { id: 'r16', name: 'Route 16', status: 'empty' },
  { id: 'lostlorn', name: 'Lostlorn Forest', status: 'empty' },
  { id: 'r5', name: 'Route 5', status: 'empty' },
  { id: 'driftveil', name: 'Driftveil Drawbridge', status: 'empty' },
  { id: 'driftveil-city', name: 'Driftveil City', status: 'empty' },
  { id: 'cold', name: 'Cold Storage', status: 'empty' },
  { id: 'r6', name: 'Route 6', status: 'empty' },
  { id: 'chargestone', name: 'Chargestone Cave', status: 'empty' },
  { id: 'mistralton', name: 'Mistralton Cave', status: 'empty' },
  { id: 'guidance', name: 'Guidance Chamber', status: 'empty' },
  { id: 'r7', name: 'Route 7', status: 'empty' },
  { id: 'celestial', name: 'Celestial Tower', status: 'empty' },
  { id: 'twist', name: 'Twist Mountain', status: 'empty' },
  { id: 'icirrus', name: 'Icirrus City', status: 'empty' },
  { id: 'dragonspiral-out', name: 'Dragonspiral Tower (Outside)', status: 'empty' },
  { id: 'dragonspiral-in', name: 'Dragonspiral Tower (Inside)', status: 'empty' },
  { id: 'r8', name: 'Route 8', status: 'empty' },
  { id: 'moor', name: 'Moor of Icirrus', status: 'empty' },
  { id: 'r9', name: 'Route 9', status: 'empty' },
  { id: 'r10', name: 'Route 10', status: 'empty' },
  { id: 'victory-out', name: 'Victory Road (Outside)', status: 'empty' },
  { id: 'victory-in', name: 'Victory Road (Inside)', status: 'empty' },
  { id: 'r17', name: 'Route 17 (Surf)', status: 'empty' },
  { id: 'r18', name: 'Route 18', status: 'empty' },
  { id: 'p2', name: 'P2 Laboratory', status: 'empty' },
  { id: 'egg', name: 'Larvesta Egg', status: 'empty' },
];

import { sendSaveToDiscord } from './utils/discord';

function App() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('soul-link-state');
    if (saved) {
      const parsed = JSON.parse(saved);
      
      // Smart merge of routes: preserve status/encounters for existing IDs, but use new Names/Order from INITIAL_ROUTES
      const mergedRoutes = INITIAL_ROUTES.map(initialRoute => {
        const savedRoute = parsed.routes.find((r: Route) => r.id === initialRoute.id);
        if (savedRoute) {
          return {
            ...initialRoute, // Use new name/structure
            status: savedRoute.status,
            encounterP1: savedRoute.encounterP1,
            encounterP2: savedRoute.encounterP2,
            encounterP3: savedRoute.encounterP3
          };
        }
        return initialRoute;
      });

      return {
          ...parsed,
          playerNames: parsed.playerNames || {
            player1: 'Player 1',
            player2: 'Player 2',
            player3: 'Player 3'
          },
          routes: mergedRoutes
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

  // --- Multiplayer Logic ---

  // --- UI Sensors ---
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // --- Multiplayer Logic ---
  const handleStateReceived = React.useCallback((newState: AppState) => {
    setState({
        ...newState,
        pokemon: newState.pokemon || [],
        routes: (newState.routes && newState.routes.length > 0) ? newState.routes : INITIAL_ROUTES,
        playerNames: newState.playerNames || { player1: 'Player 1', player2: 'Player 2', player3: 'Player 3'}
    });
  }, []);

  const { sessionId, isConnected, isHost, userCount, createSession, joinSession, leaveSession, terminateSession, syncState } = useMultiplayer(state, handleStateReceived);

  const updateState = (updater: (prev: AppState) => AppState) => {
      setState(prev => {
          const newState = updater(prev);
          if (isConnected) {
              syncState(newState);
          }
          return newState;
      });
  };

  const handleAction = (type: string, payload: any) => {
    updateState(prev => {
      switch (type) {
        case 'RESET':
          return {
            pokemon: [],
            routes: INITIAL_ROUTES,
            playerNames: prev.playerNames
          };
        
        case 'IMPORT':
          return payload;

        case 'UPDATE_PLAYER_NAME':
          return {
             ...prev,
             playerNames: {
               ...prev.playerNames!,
               [payload.player]: payload.name
             }
          };

        case 'UPDATE_POKEMON':
           return {
             ...prev,
             pokemon: prev.pokemon.map(p => p.id === payload.id ? { ...p, ...payload.updates } : p)
           };

        case 'UPDATE_ROUTE':
            return {
              ...prev,
              routes: prev.routes.map(r => r.id === payload.routeId ? { ...r, ...payload.updates } : r)
            };

        case 'CATCH_POKEMON':
            const routeUpdate = prev.routes.map(r => r.id === payload.routeId ? { ...r, status: 'caught' as const, encounterP1: payload.pokemons[0]?.species, encounterP2: payload.pokemons[1]?.species, encounterP3: payload.pokemons[2]?.species } : r);
            return {
              ...prev,
              routes: routeUpdate,
              pokemon: [...prev.pokemon, ...payload.pokemons]
            };

        case 'MOVE_POKEMON': {
           const { activeId, overId } = payload;
           const activePokemon = prev.pokemon.find(p => p.id === activeId);
           if (!activePokemon) return prev;

           let targetStatus: PokemonStatus = activePokemon.status;
           let targetOwner: Player = activePokemon.owner;

           if (overId === 'graveyard') {
             targetStatus = 'graveyard';
           } else if (overId.startsWith('party-') || overId.startsWith('box-')) {
             const [s, o] = overId.split('-');
             targetStatus = s as PokemonStatus;
             targetOwner = o as Player;
           } else {
             const overPokemon = prev.pokemon.find(p => p.id === overId);
             if (overPokemon) {
               targetStatus = overPokemon.status;
               targetOwner = overPokemon.owner;
             }
           }

           if (targetOwner !== activePokemon.owner && targetStatus !== 'graveyard') {
               return prev;
           }

           let newPokemon = [...prev.pokemon];
           
           if (targetStatus !== activePokemon.status) {
                newPokemon = newPokemon.map(p => {
                    if (p.pairId === activePokemon.pairId) {
                        if (p.id === activeId) {
                            return {
                                ...p,
                                status: targetStatus,
                                owner: targetStatus === 'graveyard' ? activePokemon.owner : targetOwner
                            };
                        }
                        return {
                            ...p,
                            status: targetStatus
                        };
                    }
                    return p;
                });
           } else {
                const movedIndex = newPokemon.findIndex(p => p.id === activeId);
                newPokemon[movedIndex] = {
                    ...newPokemon[movedIndex],
                    status: targetStatus,
                    owner: targetStatus === 'graveyard' ? activePokemon.owner : targetOwner 
                };
           }

           if (!overId.startsWith('party-') && !overId.startsWith('box-') && overId !== 'graveyard') {
               const overIndex = newPokemon.findIndex(p => p.id === overId);
               const movedIndex = newPokemon.findIndex(p => p.id === activeId); 
               
               if (overIndex !== -1 && movedIndex !== -1) {
                  newPokemon = arrayMove(newPokemon, movedIndex, overIndex);
               }
           }

           return { ...prev, pokemon: newPokemon };
        }

        default:
          return prev;
      }
    });
  };

  // --- Handlers ---
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = () => {};

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    handleAction('MOVE_POKEMON', { activeId: active.id, overId: over.id });
  };

  const handleCatch = async (routeId: string, p1Species: string, p2Species: string, p3Species: string) => {
    try {
      const pairId = uuidv4();
      const [p1Dex, p2Dex, p3Dex] = await Promise.all([
        getDexId(p1Species), getDexId(p2Species), getDexId(p3Species)
      ]);
      
      const p1PartySize = (state.pokemon || []).filter(p => p.owner === 'player1' && p.status === 'party').length;
      const p2PartySize = (state.pokemon || []).filter(p => p.owner === 'player2' && p.status === 'party').length;
      const p3PartySize = (state.pokemon || []).filter(p => p.owner === 'player3' && p.status === 'party').length;

      const statusP1 = p1PartySize < 6 ? 'party' : 'box';
      const statusP2 = p2PartySize < 6 ? 'party' : 'box';
      const statusP3 = p3PartySize < 6 ? 'party' : 'box';

      const newP1: Pokemon = {
        id: uuidv4(), species: p1Species, dexId: p1Dex, nickname: '', owner: 'player1', status: statusP1, pairId, route: routeId
      };
      const newP2: Pokemon = {
        id: uuidv4(), species: p2Species, dexId: p2Dex, nickname: '', owner: 'player2', status: statusP2, pairId, route: routeId
      };
      const newP3: Pokemon = {
        id: uuidv4(), species: p3Species, dexId: p3Dex, nickname: '', owner: 'player3', status: statusP3, pairId, route: routeId
      };

      handleAction('CATCH_POKEMON', { 
          routeId, 
          pokemons: [newP1, newP2, newP3] 
      });
    } catch (error) {
       console.error("Failed to add encounter:", error);
       alert("Failed to add Pokemon. Please check the spelling of the names.");
    }
  };

  const updateRoute = (routeId: string, updates: Partial<Route>) => {
      // Sanitize updates to ensure undefined values are converted to null for Firebase
      const sanitizedUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
          (acc as any)[key] = value === undefined ? null : value;
          return acc;
      }, {} as Partial<Route>);

      handleAction('UPDATE_ROUTE', { routeId, updates: sanitizedUpdates });
  };

  const updatePokemon = (id: string, updates: Partial<Pokemon>) => {
      // Sanitize updates to replace undefined with null for Firebase compatibility
      const sanitizedUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
          (acc as any)[key] = value === undefined ? null : value;
          return acc;
      }, {} as Partial<Pokemon>);
      
      handleAction('UPDATE_POKEMON', { id, updates: sanitizedUpdates });
  };
  
  const updateName = (player: 'player1' | 'player2' | 'player3', name: string) => {
      handleAction('UPDATE_PLAYER_NAME', { player, name });
  };

  const addCustomRoute = (name: string) => {
    const newRoute: Route = {
      id: uuidv4(),
      name,
      status: 'empty',
      isCustom: true
    };
    updateState(prev => ({
       ...prev,
       routes: [...prev.routes, newRoute]
    }));
  };

  const deleteRoute = (id: string) => {
      updateState(prev => ({
          ...prev,
          routes: prev.routes.filter(r => r.id !== id)
      }));
  };

  const reorderRoutes = (newRoutes: Route[]) => {
      updateState(prev => ({ ...prev, routes: newRoutes }));
  };

  const resetData = () => {
    if (window.confirm("Are you sure you want to completely reset the Soul Link? This will delete all Pokémon and progress. Player names will be kept.")) {
        handleAction('RESET', null);
    }
  };

  // --- Evolution Logic ---
  const [evoModal, setEvoModal] = useState<{
      isOpen: boolean;
      pokemonId: string;
      options: { species: string; id: number }[];
  }>({ isOpen: false, pokemonId: '', options: [] });

  const handleEvolve = async (id: string) => {
      const p = (state.pokemon || []).find(pk => pk.id === id);
      if (!p) return;
      
      const options = await getEvolutionOptions(p.species);
      
      if (options.length === 0) {
          alert(`${p.species} does not seem to evolve further (or checking failed).`);
          return;
      }
      
      if (options.length === 1) {
          // Auto evolve
          updatePokemon(id, { species: options[0].species, dexId: options[0].id });
      } else {
          // Open Modal for branching evolution
          setEvoModal({ isOpen: true, pokemonId: id, options });
      }
      setContextMenu(null);
  };

  const handleDevolve = async (id: string) => {
      const p = (state.pokemon || []).find(pk => pk.id === id);
      if (!p) return;
      
      const prev = await getPreEvolution(p.species);
      
      if (!prev) {
           alert(`${p.species} does not have a known pre-evolution.`);
           return;
      }
      
      if (window.confirm(`Devolve ${p.species} back to ${prev.species}?`)) {
          updatePokemon(id, { species: prev.species, dexId: prev.id });
      }
      setContextMenu(null);
  };

  const killPokemonPair = (id: string) => {
      const p = (state.pokemon || []).find(pk => pk.id === id);
      if (!p) return;
      
      if (!window.confirm(`Are you sure you want to send this ${p.species} and its partners to the Graveyard?`)) return;

      const pairId = p.pairId;
      
      const newPokemonList = (state.pokemon || []).map(pk => {
          if (pk.pairId === pairId) {
              return { ...pk, status: 'graveyard' as const };
          }
          return pk;
      });
      
      updateState(prev => ({ ...prev, pokemon: newPokemonList }));
  };

  // --- Rename Logic ---
  const [renameModal, setRenameModal] = useState<{ isOpen: boolean, pokemonId: string, currentName: string }>({ isOpen: false, pokemonId: '', currentName: '' });

  const handleRename = (id: string) => {
      const p = (state.pokemon || []).find(pk => pk.id === id);
      if (!p) return;
      
      setRenameModal({ isOpen: true, pokemonId: id, currentName: p.nickname || p.species });
      setContextMenu(null);
  };
  
  const saveNickname = () => {
      if (renameModal.pokemonId) {
          updatePokemon(renameModal.pokemonId, { nickname: renameModal.currentName });
          setRenameModal({ isOpen: false, pokemonId: '', currentName: '' });
      }
  };

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, pokemonId: string } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, pokemonId: string) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, pokemonId });
  };

  useEffect(() => {
      const handleClick = () => setContextMenu(null);
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
  }, []);

  const exportData = () => {
    // Send to Discord
    sendSaveToDiscord(state, "Manual Save Download");

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
                  handleAction('IMPORT', json);
              }
          } catch (err) {
              alert('Invalid Save File');
          }
      };
      reader.readAsText(file);
  };

  const getPokemon = (player: Player, status: PokemonStatus) => {
    return (state.pokemon || []).filter(p => p.owner === player && p.status === status);
  };
  
  const getActivePokemon = () => {
      return (state.pokemon || []).find(p => p.id === activeId);
  };

  const getDeathCount = (player: Player) => {
    // Count unique pairIds killed by this player to represent "Incidents" or "Links Lost"
    const deadPokemon = (state.pokemon || []).filter(p => p.status === 'graveyard' && p.killedBy === player);
    const uniquePairs = new Set(deadPokemon.map(p => p.pairId));
    return uniquePairs.size;
  };

  const deaths = {
      p1: getDeathCount('player1'),
      p2: getDeathCount('player2'),
      p3: getDeathCount('player3'),
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/60"
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              SoulLinker
            </h1>
            <span className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase">Unova Link v2.0</span>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Death Counters - Removed from top bar per request, moving to player cards */}
             
             <div className="flex items-center gap-2">
                <SyncManager 
                  sessionId={sessionId}
                  isConnected={isConnected}
                  isHost={isHost}
                  userCount={userCount}
                  createSession={createSession}
                  joinSession={joinSession}
                  leaveSession={leaveSession}
                  terminateSession={terminateSession}
                />
                
                <div className="h-6 w-px bg-zinc-800 mx-1"></div>

                <div className="flex items-center gap-1">
                  <button onClick={resetData} className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-900 rounded-md transition" title="Reset All Progress">
                    <RotateCcw size={16} />
                  </button>
                  <button onClick={exportData} className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-zinc-900 rounded-md transition" title="Save Backup">
                    <Save size={16} />
                  </button>
                  <input type="file" id="import-file" className="hidden" onChange={handleImport} accept=".json" />
                  <button onClick={triggerImport} className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-900 rounded-md transition" title="Load Backup">
                    <Upload size={16} />
                  </button>
                </div>
             </div>
          </div>
        </div>
      </motion.header>

      <motion.main 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="container mx-auto px-4 py-8"
      >
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Player 1 Area */}
            <div className="bg-zinc-900/40 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="bg-zinc-900/60 border-b border-zinc-800 text-sm font-medium text-zinc-400 px-4 py-3 flex items-center justify-between">
                 <div className="flex items-center gap-3 flex-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                    <input 
                      className="bg-transparent border-none text-zinc-200 focus:outline-none focus:ring-0 w-full font-bold placeholder:text-zinc-600"
                      value={state.playerNames?.player1 || 'Player 1'}
                      onChange={(e) => updateName('player1', e.target.value)}
                      placeholder="Player 1 Name"
                    />
                 </div>
                 <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded">Host</span>
                 <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 rounded border border-red-500/20" title="Deaths Caused">
                    <Skull size={12} className="text-red-400" />
                    <span className="text-xs font-bold text-red-200">{deaths.p1}</span>
                 </div>
              </div>
              <div className="p-4 space-y-6">
                <Party player="player1" pokemon={getPokemon('player1', 'party')} onContextMenu={handleContextMenu} />
                <Box player="player1" pokemon={getPokemon('player1', 'box')} onContextMenu={handleContextMenu} />
              </div>
            </div>

            {/* Player 2 Area */}
            <div className="bg-zinc-900/40 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="bg-zinc-900/60 border-b border-zinc-800 text-sm font-medium text-zinc-400 px-4 py-3 flex items-center justify-between">
                 <div className="flex items-center gap-3 flex-1">
                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                    <input 
                      className="bg-transparent border-none text-zinc-200 focus:outline-none focus:ring-0 w-full font-bold placeholder:text-zinc-600"
                      value={state.playerNames?.player2 || 'Player 2'}
                      onChange={(e) => updateName('player2', e.target.value)}
                      placeholder="Player 2 Name"
                    />
                 </div>
                 <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 rounded border border-red-500/20" title="Deaths Caused">
                    <Skull size={12} className="text-red-400" />
                    <span className="text-xs font-bold text-red-200">{deaths.p2}</span>
                 </div>
              </div>
              <div className="p-4 space-y-6">
                <Party player="player2" pokemon={getPokemon('player2', 'party')} onContextMenu={handleContextMenu} />
                <Box player="player2" pokemon={getPokemon('player2', 'box')} onContextMenu={handleContextMenu} />
              </div>
            </div>
            
            {/* Player 3 Area */}
            <div className="bg-zinc-900/40 rounded-xl border border-zinc-800 overflow-hidden">
              <div className="bg-zinc-900/60 border-b border-zinc-800 text-sm font-medium text-zinc-400 px-4 py-3 flex items-center justify-between">
                 <div className="flex items-center gap-3 flex-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                    <input 
                      className="bg-transparent border-none text-zinc-200 focus:outline-none focus:ring-0 w-full font-bold placeholder:text-zinc-600"
                      value={state.playerNames?.player3 || 'Player 3'}
                      onChange={(e) => updateName('player3', e.target.value)}
                      placeholder="Player 3 Name"
                    />
                 </div>
                 <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 rounded border border-red-500/20" title="Deaths Caused">
                    <Skull size={12} className="text-red-400" />
                    <span className="text-xs font-bold text-red-200">{deaths.p3}</span>
                 </div>
              </div>
              <div className="p-4 space-y-6">
                <Party player="player3" pokemon={getPokemon('player3', 'party')} onContextMenu={handleContextMenu} />
                <Box player="player3" pokemon={getPokemon('player3', 'box')} onContextMenu={handleContextMenu} />
              </div>
            </div>
          </div>
          
          <div className="mt-6 bg-zinc-900/20 border-t border-b md:border border-zinc-800 md:rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
               <div className="p-2 bg-purple-500/10 rounded-md">
                 <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
               </div>
               <h2 className="text-lg font-semibold text-zinc-200">Graveyard</h2>
               <span className="text-xs text-zinc-500 ml-auto font-mono">Rest in Peace</span>
            </div>
             <Box 
                player="player1" 
                isGraveyard 
                pokemon={(state.pokemon || []).filter(p => p.status === 'graveyard')} 
                onUpdatePokemon={updatePokemon}
                onContextMenu={handleContextMenu}
             />
          </div>

          <div className="mt-8">
             <RouteTracker 
                routes={state.routes} 
                onUpdateRoute={updateRoute} 
                onCatch={handleCatch} 
                onAddRoute={addCustomRoute}
                onDeleteRoute={deleteRoute}
                onReorderRoutes={reorderRoutes}
             />
          </div>

          <DragOverlay>
             {activeId && getActivePokemon() ? (
                  <div className="opacity-90 scale-105 shadow-2xl cursor-grabbing">
                   <PokemonCard pokemon={getActivePokemon()!} />
                  </div>
              ) : null}
          </DragOverlay>

          {/* Context Menu */}
          {contextMenu && (
             <div 
               className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 w-48 overflow-hidden text-sm"
               style={{ top: contextMenu.y, left: contextMenu.x }}
             >
                <button 
                  onClick={() => handleRename(contextMenu.pokemonId)}
                  className="w-full text-left px-4 py-2 hover:bg-zinc-800 text-zinc-200 flex items-center gap-2"
                >
                   Rename
                </button>
                <button 
                  onClick={() => handleEvolve(contextMenu.pokemonId)}
                  className="w-full text-left px-4 py-2 hover:bg-zinc-800 text-zinc-200 flex items-center gap-2"
                >
                   Evolve
                </button>
                <button 
                  onClick={() => handleDevolve(contextMenu.pokemonId)}
                  className="w-full text-left px-4 py-2 hover:bg-zinc-800 text-zinc-200 flex items-center gap-2"
                >
                   Devolve
                </button>
                <div className="h-px bg-zinc-800 my-1"></div>
                <button 
                  onClick={() => killPokemonPair(contextMenu.pokemonId)}
                  className="w-full text-left px-4 py-2 hover:bg-red-500/20 text-red-400 flex items-center gap-2"
                >
                   <Skull size={14} /> Send to Graveyard
                </button>
             </div>
          )}

          {/* Rename Modal */}
          {renameModal.isOpen && (
             <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                 <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
                     <h3 className="text-lg font-bold text-white mb-4">Rename Pokemon</h3>
                     <input 
                         className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-200 outline-none focus:ring-1 focus:ring-emerald-500 mb-4"
                         value={renameModal.currentName}
                         onChange={e => setRenameModal(prev => ({ ...prev, currentName: e.target.value }))}
                         onKeyDown={e => e.key === 'Enter' && saveNickname()}
                         autoFocus
                     />
                     <div className="flex gap-2 justify-end">
                         <button 
                             onClick={() => setRenameModal({ isOpen: false, pokemonId: '', currentName: '' })}
                             className="px-4 py-2 text-zinc-400 hover:bg-zinc-800 rounded-lg"
                         >
                             Cancel
                         </button>
                         <button 
                             onClick={saveNickname}
                             className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium"
                         >
                             Save
                         </button>
                     </div>
                 </div>
             </div>
          )}

          {/* Evolution Modal */}
          {evoModal.isOpen && (
             <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                 <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
                     <h3 className="text-lg font-bold text-white mb-4">Choose Evolution</h3>
                     <div className="grid grid-cols-2 gap-3">
                         {evoModal.options.map(opt => (
                             <button
                                key={opt.species}
                                onClick={() => {
                                    updatePokemon(evoModal.pokemonId, { species: opt.species, dexId: opt.id });
                                    setEvoModal({ isOpen: false, pokemonId: '', options: [] });
                                }}
                                className="flex flex-col items-center gap-2 p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition"
                             >
                                 <img 
                                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${opt.id}.png`} 
                                    className="w-16 h-16 object-contain"
                                 />
                                 <span className="capitalize text-sm font-medium text-zinc-200">{opt.species}</span>
                             </button>
                         ))}
                     </div>
                     <button 
                         onClick={() => setEvoModal({ isOpen: false, pokemonId: '', options: [] })}
                         className="mt-6 w-full py-2 text-zinc-400 hover:bg-zinc-800 rounded-lg"
                     >
                         Cancel
                     </button>
                 </div>
             </div>
          )}
        </DndContext>
      </motion.main>
    </div>
  )
}

export default App
