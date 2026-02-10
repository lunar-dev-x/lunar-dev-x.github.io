// Advanced Combat Sim - Battle Scenario
import React, { useState, useEffect } from 'react';
import { TYPE_CHART, TYPE_COLORS } from '../utils/gameData';
import { getPokemonDetails, getMoveDetails, getAllPokemonNames, getAllMoveNames } from '../utils/pokeApi';
import { Sword, X, Shield, Zap, Skull } from 'lucide-react';
import { Pokemon } from '../types';
import AutocompleteInput from './AutocompleteInput';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  allPokemon: Pokemon[];
}

interface BattlePokemon extends Pokemon {
    currentHp: number; // Absolute value
    maxHp: number;     // Absolute value
    stats?: Record<string, number>; 
    condition?: string;
    volatiles?: string[];
    loadedMoves?: any[];
}

interface EnemyMon {
    species: string;
    level: number;
    types: string[];
    moves: string[]; 
    moveDetails: any[]; 
    stats: Record<string, number>;
}

const CombatSimulator: React.FC<Props> = ({ isOpen, onClose, allPokemon }) => {
  // Navigation State
  const [activeOwner, setActiveOwner] = useState<'player1' | 'player2' | 'player3'>('player1');
  const [activeBox, setActiveBox] = useState<'party' | 'box'>('party'); // Ignore graveyard for combat

  // Scenario State
  const [activeTab, setActiveTab] = useState<'setup' | 'battle'>('setup');
  
  // Enemy State
  const [enemySpecies, setEnemySpecies] = useState('');
  const [enemyLevel, setEnemyLevel] = useState(50);
  const [enemyMoves, setEnemyMoves] = useState<string[]>(['', '', '', '']);
  const [enemyData, setEnemyData] = useState<EnemyMon | null>(null);
  const [enemyLoading, setEnemyLoading] = useState(false);
  const [possibleEnemyMoves, setPossibleEnemyMoves] = useState<string[]>([]);
  
  // Data Lists
  const [allSpeciesList, setAllSpeciesList] = useState<string[]>([]);
  const [allMovesList, setAllMovesList] = useState<string[]>([]);

  useEffect(() => {
    getAllPokemonNames().then(setAllSpeciesList);
    getAllMoveNames().then(setAllMovesList);
  }, []);

  // User State
  const [battleParty, setBattleParty] = useState<BattlePokemon[]>([]);
  const [activePokemonId, setActivePokemonId] = useState<string | null>(null);

  // Sync Party when Selection Changes
  useEffect(() => {
    if (isOpen) {
        const targetPokemon = allPokemon.filter(p => p.owner === activeOwner && p.status === activeBox);
        
        // Initialize with estimated HP or defaults
        const initialParty: BattlePokemon[] = targetPokemon.map(p => ({
            ...p,
            currentHp: 100, // Default until stats load
            maxHp: 100,
            condition: 'none',
            stats: undefined // Explicitly undefined to trigger fetch
        }));

        setBattleParty(initialParty);
        if (initialParty.length > 0) {
            setActivePokemonId(initialParty[0].id);
        } else {
            setActivePokemonId(null);
        }
        
        // Fetch background stats
        initialParty.forEach(p => {
             getPokemonDetails(p.species).then(d => {
                 if (d) {
                     const apiStats = convertStats(d.stats);
                     // Calculate Real Stats (Simple Gen 5 Formula approx)
                     // HP = ((2 * Base + 31 + 63) * Level / 100) + Level + 10
                     // IV=31, EV=252/4 (63) is generous, let's assume Neutral (IV=15, EV=0) for "playthrough"
                     const baseHp = apiStats['hp'];
                     const level = p.level || 50;
                     const realMaxHp = Math.floor(((2 * baseHp + 15) * level) / 100) + level + 10;

                     setBattleParty(prev => prev.map(mons => 
                        mons.id === p.id ? { 
                            ...mons, 
                            stats: apiStats, 
                            types: d.types,
                            maxHp: realMaxHp,
                            currentHp: realMaxHp // Auto-heal on load
                        } : mons
                     ));
                 }
             });
        });
    }
  }, [isOpen, activeOwner, activeBox, allPokemon]); // Re-run when selection changes

  const convertStats = (apiStats: any[]) => {
      const s: Record<string, number> = {};
      apiStats.forEach((st: any) => s[st.stat.name] = st.base_stat);
      return s;
  };

  const loadEnemy = async () => {
       if (!enemySpecies) return;
       setEnemyLoading(true);
       const data = await getPokemonDetails(enemySpecies);
       if (data) {
           setEnemyData({
               species: enemySpecies,
               level: enemyLevel,
               types: data.types,
               moves: enemyMoves.filter(m => m),
               moveDetails: [], 
               stats: convertStats(data.stats)
           });
           setPossibleEnemyMoves(data.moves);
           
           const movePromises = enemyMoves.filter(m => m).map(m => getMoveDetails(m));
           const details = await Promise.all(movePromises);
           setEnemyData(prev => prev ? { ...prev, moveDetails: details.filter(d => d) } : null);
       }
       setEnemyLoading(false);
       setActiveTab('battle');
  };

  if (!isOpen) return null;

  // --- ANALYSIS LOGIC ---
  const getMatchupAdvice = () => {
      if (!enemyData || !activePokemonId) return null;
      const activeMon = battleParty.find(p => p.id === activePokemonId);
      if (!activeMon || !activeMon.stats) return <p className="text-zinc-500 animate-pulse">Analyzing combat metrics...</p>;

      // 1. Speed Check
      const myMon = activeMon;
      let mySpeedMultiplier = 1;
      if (myMon.condition === 'paralysis') mySpeedMultiplier = 0.5;
      
      // Calculate Real Speed (Approx)
      // ((2 * Base + 15) * Level / 100) + 5
      const myBaseSpeed = activeMon.stats['speed'] || 50;
      const myLevel = myMon.level || 50;
      const myRealSpeed = Math.floor((((2 * myBaseSpeed + 15) * myLevel) / 100) + 5) * mySpeedMultiplier;

      const enemyBaseSpeed = enemyData.stats['speed'] || 50;
      const enemyRealSpeed = Math.floor((((2 * enemyBaseSpeed + 15) * enemyLevel) / 100) + 5);
      
      const isFaster = myRealSpeed >= enemyRealSpeed;
      
      const speedText = isFaster 
          ? `You are FASTER (~${Math.floor(myRealSpeed)} vs ~${enemyRealSpeed}) ${myMon.condition === 'paralysis' ? '(Paralyzed)' : ''}`
          : `Enemy is FASTER (~${enemyRealSpeed} vs ~${Math.floor(myRealSpeed)}) ${myMon.condition === 'paralysis' ? '(You are Paralyzed)' : ''}`;

      // 2. Incoming Damage Threat
      let maxThreat = 0;
      let worstMove = '';
      
      enemyData.moveDetails.forEach(move => {
          if (move.damage_class === 'status') return;
          let mult = 1;
          activeMon.types?.forEach(t => {
               const at = move.type;
               const dt = t;
               if (TYPE_CHART[at] && TYPE_CHART[at][dt] !== undefined) mult *= TYPE_CHART[at][dt];
          });
          if (mult > maxThreat) {
              maxThreat = mult;
              worstMove = move.name;
          }
      });
      
      if (enemyData.moveDetails.length === 0) {
           enemyData.types.forEach(t => {
               let mult = 1;
               activeMon.types?.forEach(dt => {
                   if (TYPE_CHART[t] && TYPE_CHART[t][dt] !== undefined) mult *= TYPE_CHART[t][dt];
               });
               if (mult > maxThreat) {
                   maxThreat = mult;
                   worstMove = `${t} (STAB Assumption)`;
               }
           });
      }

      // 3. Outgoing Damage
      let myMaxDmg = 0;
      let bestMove = '';
      
      activeMon.types?.forEach(at => {
           let mult = 1;
           enemyData.types.forEach(dt => {
               if (TYPE_CHART[at] && TYPE_CHART[at][dt] !== undefined) mult *= TYPE_CHART[at][dt];
           });
           if (mult > myMaxDmg) {
               myMaxDmg = mult;
               bestMove = `${at} (STAB)`;
           }
      });

      return (
          <div className="space-y-4">
              {/* Speed */}
              <div className={`p-4 rounded-lg border ${isFaster ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-orange-900/20 border-orange-500/30'}`}>
                  <div className="flex items-center gap-2 mb-1">
                      <Zap size={18} className={isFaster ? "text-indigo-400" : "text-orange-400"} />
                      <span className="font-bold text-zinc-200">Speed Tier</span>
                  </div>
                  <p className="text-sm text-zinc-300">{speedText}</p>
              </div>

              {/* Defense */}
              <div className={`p-4 rounded-lg border ${maxThreat >= 2 ? 'bg-red-900/20 border-red-500/30' : 'bg-emerald-900/20 border-emerald-500/30'}`}>
                   <div className="flex items-center gap-2 mb-1">
                      <Shield size={18} className={maxThreat >= 2 ? "text-red-400" : "text-emerald-400"} />
                      <span className="font-bold text-zinc-200">Defense Analysis</span>
                  </div>
                  <p className="text-sm text-zinc-300">
                      {maxThreat >= 4 ? `CRITICAL: Weak 4x to ${worstMove}.` :
                       maxThreat >= 2 ? `DANGER: Weak 2x to ${worstMove}.` :
                       maxThreat === 0 ? `SAFE: Immune to ${worstMove}.` :
                       maxThreat < 1 ? `SAFE: Resists main threats.` :
                       `NEUTRAL: Normal damage from ${worstMove}.`}
                  </p>
              </div>
              
              {/* Offense */}
              <div className={`p-4 rounded-lg border ${myMaxDmg >= 2 ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-zinc-800/50 border-zinc-700'}`}>
                   <div className="flex items-center gap-2 mb-1">
                      <Sword size={18} className={myMaxDmg >= 2 ? "text-emerald-400" : "text-zinc-400"} />
                      <span className="font-bold text-zinc-200">Offense Analysis</span>
                  </div>
                  <p className="text-sm text-zinc-300">
                       {myMaxDmg >= 4 ? `DEVASTATING: You have 4x coverage (${bestMove})!` :
                        myMaxDmg >= 2 ? `EFFECTIVE: You have 2x coverage (${bestMove}).` :
                        `NEUTRAL: No obvious super-effective STAB found.`}
                  </p>
              </div>
          </div>
      );
  };
  
  const getTeamStandouts = () => {
      if (!enemyData) return null;
      let tank = null;
      let minTaken = 999;
      let killer = null;
      let maxGiven = 0;
      
      battleParty.forEach(p => {
          if (!p.stats || p.currentHp === 0) return;
          
          let threat = 0;
          const checkThreat = (moveType: string) => {
              let m = 1;
              p.types?.forEach(t => {
                  if (TYPE_CHART[moveType] && TYPE_CHART[moveType][t] !== undefined) m *= TYPE_CHART[moveType][t];
              });
              if (m > threat) threat = m;
          }

          if (enemyData.moveDetails.length > 0) {
              enemyData.moveDetails.forEach(m => {
                  if (m.damage_class !== 'status') checkThreat(m.type);
              });
          } else {
              enemyData.types.forEach(et => checkThreat(et));
          }
          
          if (threat < minTaken) { minTaken = threat; tank = p; }
          
          let power = 0;
          p.types?.forEach(at => {
               let m = 1;
               enemyData.types.forEach(et => {
                    if (TYPE_CHART[at] && TYPE_CHART[at][et] !== undefined) m *= TYPE_CHART[at][et];
               });
               if (m > power) power = m;
          });
          if (power > maxGiven) { maxGiven = power; killer = p; }
      });
      
      return (
          <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-zinc-800/50 p-3 rounded border border-zinc-700 text-sm">
                  <span className="text-xs font-bold text-zinc-500 uppercase block mb-1">Safest Switch</span>
                  {tank ? (
                      <div className="flex items-center gap-2">
                          <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${(tank as any).dexId}.png`} className="w-8 h-8 pixelated" />
                          <div>
                              <div className="font-bold text-zinc-200">{(tank as any).nickname || (tank as any).species}</div>
                              <div className="text-xs text-zinc-400">Takes {minTaken}x</div>
                          </div>
                      </div>
                  ) : <span className="text-zinc-500">None safe</span>}
              </div>
              <div className="bg-zinc-800/50 p-3 rounded border border-zinc-700 text-sm">
                  <span className="text-xs font-bold text-zinc-500 uppercase block mb-1">Best Attacker</span>
                  {killer ? (
                      <div className="flex items-center gap-2">
                          <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${(killer as any).dexId}.png`} className="w-8 h-8 pixelated" />
                          <div>
                              <div className="font-bold text-zinc-200">{(killer as any).nickname || (killer as any).species}</div>
                              <div className="text-xs text-zinc-400">Deals {maxGiven}x</div>
                          </div>
                      </div>
                  ) : <span className="text-zinc-500">None effective</span>}
              </div>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-5xl w-full shadow-2xl h-[90vh] flex flex-col">
          {/* Header & Main Selectors */}
          <div className="border-b border-zinc-800 bg-zinc-950 rounded-t-xl">
             <div className="flex justify-between items-center p-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sword className="text-red-500" /> 
                    <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">Combat Director</span>
                </h3>
                <button onClick={onClose}><X className="text-zinc-500 hover:text-white" /></button>
             </div>
             {/* Player/Box Selectors */}
             <div className="flex gap-4 px-4 pb-4">
                  <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                      {(['player1', 'player2', 'player3'] as const).map(p => (
                          <button
                              key={p}
                              onClick={() => setActiveOwner(p)}
                              className={`px-4 py-1 text-xs font-bold uppercase rounded transition ${activeOwner === p ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                          >
                              {p.replace('player', 'P')}
                          </button>
                      ))}
                  </div>
                  <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                      {(['party', 'box'] as const).map(b => (
                          <button
                              key={b}
                              onClick={() => setActiveBox(b)}
                              className={`px-4 py-1 text-xs font-bold uppercase rounded transition ${activeBox === b ? 'bg-indigo-900/50 text-indigo-200 border border-indigo-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}
                          >
                              {b}
                          </button>
                      ))}
                  </div>
             </div>
          </div>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
             
             {/* Left Col: Setup & Enemy */}
             <div className="lg:col-span-3 flex flex-col gap-4 overflow-y-auto border-r border-zinc-800 bg-zinc-900/50 p-4">
                 <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 shadow-sm">
                     <h4 className="text-xs font-bold text-zinc-500 uppercase mb-3 flex items-center gap-2">
                         <Skull size={14} /> Threat Profile
                     </h4>
                     {activeTab === 'setup' ? (
                         <div className="space-y-3">
                             <div className="bg-zinc-900 border border-zinc-700 rounded p-1">
                                <AutocompleteInput 
                                    placeholder="Enemy Species"
                                    value={enemySpecies}
                                    onChange={setEnemySpecies}
                                    options={allSpeciesList}
                                />
                             </div>
                             <div className="grid grid-cols-2 gap-2">
                                <label className="text-xs text-zinc-500 font-bold block">
                                    LVL
                                    <input type="number" className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-white mt-1 text-sm font-mono" value={enemyLevel} onChange={e => setEnemyLevel(Number(e.target.value))} />
                                </label>
                             </div>
                             <div className="pt-2">
                                 <label className="text-xs text-zinc-500 mb-2 block font-bold">KNOWN MOVES</label>
                                 {enemyMoves.map((m, i) => (
                                     <div key={i} className="mb-2 bg-zinc-900 border border-zinc-700 rounded p-1">
                                        <AutocompleteInput 
                                            placeholder={`Move ${i+1}`}
                                            value={m}
                                            onChange={val => {
                                                const newM = [...enemyMoves];
                                                newM[i] = val;
                                                setEnemyMoves(newM);
                                            }}
                                            options={allMovesList.length > 0 ? allMovesList : possibleEnemyMoves}
                                        />
                                     </div>
                                 ))}
                             </div>
                             <button onClick={loadEnemy} disabled={!enemySpecies || enemyLoading} className="w-full py-2 bg-red-600 hover:bg-red-500 rounded font-bold text-white transition disabled:opacity-50 text-sm shadow-lg shadow-red-900/20">
                                 {enemyLoading ? 'SCANNING...' : 'START SIMULATION'}
                             </button>
                         </div>
                     ) : (
                         <div className="text-center">
                             {enemyData && (
                                 <>
                                    <div className="relative inline-block">
                                        <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full"></div>
                                        <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${(enemyData as any).id || 1}.png`} 
                                            className="w-24 h-24 mx-auto mb-2 object-contain relative z-10 pixelated" />
                                    </div>
                                    <h2 className="text-lg font-bold text-white capitalize">{enemySpecies}</h2>
                                    <p className="text-zinc-500 text-xs font-mono mb-3">Lvl {enemyLevel}</p>
                                    <div className="flex justify-center gap-1 mb-4 flex-wrap">
                                        {enemyData.types.map(t => (
                                            <span key={t} className="px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white shadow-sm" style={{ backgroundColor: TYPE_COLORS[t] }}>{t}</span>
                                        ))}
                                    </div>
                                    <div className="bg-zinc-900/80 rounded border border-zinc-800 p-2 text-left space-y-1">
                                        {enemyData.moveDetails.length > 0 ? enemyData.moveDetails.map(m => (
                                            <div key={m.name} className="flex justify-between text-[10px]">
                                                <span className="text-zinc-300 capitalize truncate pr-2">{m.name}</span>
                                                <span className="font-bold capitalize min-w-[3rem] text-right" style={{ color: TYPE_COLORS[m.type] }}>{m.type}</span>
                                            </div>
                                        )) : <span className="text-[10px] text-zinc-600 italic block text-center">No known moves</span>}
                                    </div>
                                    <button onClick={() => setActiveTab('setup')} className="text-xs text-zinc-500 mt-4 underline hover:text-zinc-300">Reconfigure Enemy</button>
                                 </>
                             )}
                         </div>
                     )}
                 </div>
             </div>

             {/* Middle: Active Battle Advice */}
             <div className="lg:col-span-5 flex flex-col p-6 bg-zinc-900/30">
                 <div className="h-full flex flex-col">
                     <h4 className="text-xs font-bold text-zinc-500 uppercase mb-4 text-center tracking-widest">Tactical Analysis</h4>
                     {activeTab === 'battle' ? (
                         <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                              <div className="transform transition-all duration-500 ease-out">
                                {getMatchupAdvice()}
                                <div className="mt-6 border-t border-zinc-800 pt-6">
                                    {getTeamStandouts()}
                                </div>
                              </div>
                         </div>
                     ) : (
                         <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 italic text-center px-6 border-2 border-dashed border-zinc-800 rounded-xl">
                             <Skull className="mb-4 opacity-20" size={48} />
                             <p>Configure enemy threat profile to begin tactical computer analysis.</p>
                         </div>
                     )}
                 </div>
             </div>

             {/* Right: Party Status */}
             <div className="lg:col-span-4 flex flex-col gap-2 overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-4">
                 <h4 className="text-xs font-bold text-zinc-500 uppercase mb-2 flex justify-between items-center">
                    <span>Available Counters</span>
                    <span className="text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full text-[10px]">{battleParty.length} active</span>
                 </h4>
                 
                 {battleParty.length === 0 && (
                     <div className="text-center py-10 text-zinc-600 text-sm">
                         No Pokemon in {activeOwner}'s {activeBox}.
                     </div>
                 )}

                 {battleParty.map(p => (
                     <div 
                        key={p.id} 
                        onClick={() => setActivePokemonId(p.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition relative group ${activePokemonId === p.id ? 'bg-indigo-900/20 border-indigo-500 ring-1 ring-indigo-500/50' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                     >
                         <div className="flex items-start gap-3">
                            <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.dexId}.png`} className="w-12 h-12 pixelated -ml-2" />
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`font-bold text-sm truncate ${activePokemonId === p.id ? 'text-white' : 'text-zinc-300'}`}>{p.nickname || p.species}</span>
                                    <span className="text-[10px] text-zinc-500 bg-zinc-950 px-1.5 rounded">Lv.{p.level || 50}</span>
                                </div>
                                
                                {/* Precise HP Control */}
                                <div className="flex items-center gap-1 mb-2">
                                    <div className="flex items-center text-[10px] bg-zinc-950 rounded border border-zinc-800 p-0.5">
                                        <span className="text-zinc-500 px-1">HP</span>
                                        <input 
                                            type="number" 
                                            className="w-8 bg-transparent text-right text-emerald-400 font-mono focus:outline-none"
                                            value={p.currentHp}
                                            onClick={e => e.stopPropagation()}
                                            onChange={e => {
                                                const val = parseInt(e.target.value) || 0;
                                                setBattleParty(prev => prev.map(m => m.id === p.id ? { ...m, currentHp: val } : m));
                                            }}
                                        />
                                        <span className="text-zinc-600 px-0.5">/</span>
                                        <input 
                                            type="number" 
                                            className="w-8 bg-transparent text-zinc-400 font-mono focus:outline-none"
                                            value={p.maxHp}
                                            onClick={e => e.stopPropagation()}
                                            onChange={e => {
                                                const val = parseInt(e.target.value) || 1;
                                                setBattleParty(prev => prev.map(m => m.id === p.id ? { ...m, maxHp: val } : m));
                                            }}
                                        />
                                    </div>
                                    
                                    {/* Inline Status */}
                                     <select 
                                        className={`w-12 text-[10px] h-5 bg-zinc-950 border border-zinc-800 rounded px-0 py-0 text-center ${p.condition && p.condition !== 'none' ? 'text-yellow-400 border-yellow-900' : 'text-zinc-600'}`}
                                        value={p.condition || 'none'}
                                        onClick={e => e.stopPropagation()}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setBattleParty(prev => prev.map(mons => mons.id === p.id ? { ...mons, condition: val } : mons));
                                        }}
                                    >
                                        <option value="none">OK</option>
                                        <option value="paralysis">PAR</option>
                                        <option value="burn">BRN</option>
                                        <option value="sleep">SLP</option>
                                        <option value="poison">PSN</option>
                                        <option value="freeze">FRZ</option>
                                    </select>
                                </div>

                                {/* Visual HP Bar */}
                                <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className={`h-full transition-all duration-300 ${
                                        (p.currentHp / p.maxHp) < 0.2 ? 'bg-red-500' : 
                                        (p.currentHp / p.maxHp) < 0.5 ? 'bg-yellow-500' : 'bg-emerald-500' 
                                    }`} style={{ width: `${Math.min(100, Math.max(0, (p.currentHp / p.maxHp) * 100))}%` }}></div>
                                </div>
                            </div>
                         </div>
                     </div>
                 ))}
             </div>

          </div>
      </div>
    </div>
  );
};

export default CombatSimulator;
