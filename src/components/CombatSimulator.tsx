// Advanced Combat Sim - Battle Scenario / Solver
import React, { useState, useEffect, useMemo } from 'react';
import { TYPE_CHART, TYPE_COLORS } from '../utils/gameData';
import { getPokemonDetails, getMoveDetails, getAllPokemonNames, getAllMoveNames } from '../utils/pokeApi';
import { TRAINER_PRESETS } from '../utils/trainerPresets';
import { Sword, X, Shield, TrendingUp, Crosshair } from 'lucide-react';
import { Pokemon } from '../types';
import AutocompleteInput from './AutocompleteInput';

// --- Interfaces ---

interface Props {
  isOpen: boolean;
  onClose: () => void;
  allPokemon: Pokemon[];
}

interface StatProfile {
     hp: number;
     attack: number;
     defense: number; 
     'special-attack': number;
     'special-defense': number;
     speed: number;
}

interface StatStages {
    attack: number;
    defense: number;
    'special-attack': number;
    'special-defense': number;
    speed: number;
    accuracy: number;
    evasion: number;
}

interface BattlePokemon extends Pokemon {
    currentHp: number;
    maxHp: number;    
    
    baseStats: StatProfile;
    realStats: StatProfile; // Editable
    stages: StatStages;     // Editable
    
    condition: string; 
    volatiles: string[];
}

interface EnemyMon {
    species: string;
    level: number;
    types: string[]; 
    moves: string[]; 
    moveDetails: any[]; 
    
    baseStats: StatProfile;
    realStats: StatProfile;
    stages: StatStages;
    
    id: number;
}

// --- Constants ---

const DEFAULT_STAGES: StatStages = {
    attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0, accuracy: 0, evasion: 0
};

const STAT_LABELS = {
    hp: 'HP',
    attack: 'Atk',
    defense: 'Def',
    'special-attack': 'SpA',
    'special-defense': 'SpD',
    speed: 'Spe'
};

const STAGE_MULTIPLIERS: Record<number, number> = {
    '-6': 2/8, '-5': 2/7, '-4': 2/6, '-3': 2/5, '-2': 2/4, '-1': 2/3,
    '0': 1,
    '1': 3/2, '2': 4/2, '3': 5/2, '4': 6/2, '5': 7/2, '6': 8/2
};

// --- Helpers ---

const calculateStat = (base: number, level: number, isHp: boolean) => {
    // Assumption: Neutral Nature, 15 IVs, 0 EVs (Generic Playthrough)
    if (isHp) {
        return Math.floor(((2 * base + 15) * level) / 100) + level + 10;
    } else {
        return Math.floor(((2 * base + 15) * level) / 100) + 5;
    }
};

const CombatSimulator: React.FC<Props> = ({ isOpen, onClose, allPokemon }) => {
  // --- Global State ---
  const [activeOwner, setActiveOwner] = useState<'player1' | 'player2' | 'player3'>('player1');
  const [activeBox, setActiveBox] = useState<'party' | 'box'>('party'); 

  // --- Scenario State ---
  const [activeTab, setActiveTab] = useState<'setup' | 'battle'>('setup');
  
  // --- Enemy State ---
  const [enemySpecies, setEnemySpecies] = useState('');
  const [enemyLevel, setEnemyLevel] = useState(50);
  const [enemyMoves, setEnemyMoves] = useState<string[]>(['', '', '', '']);
  const [enemyData, setEnemyData] = useState<EnemyMon | null>(null);
  const [enemyLoading, setEnemyLoading] = useState(false);
  const [possibleEnemyMoves, setPossibleEnemyMoves] = useState<any[]>([]); // Changed to any[] for details
  
  // Lists
  const [allSpeciesList, setAllSpeciesList] = useState<string[]>([]);
  const [allMovesList, setAllMovesList] = useState<string[]>([]);

  useEffect(() => {
    getAllPokemonNames().then(setAllSpeciesList);
    getAllMoveNames().then(setAllMovesList);
  }, []);

  // --- Party State ---
  const [battleParty, setBattleParty] = useState<BattlePokemon[]>([]);
  const [activePokemonId, setActivePokemonId] = useState<string | null>(null);
  
  // Initialize Party
  useEffect(() => {
    if (isOpen) {
        const targetPokemon = allPokemon.filter(p => p.owner === activeOwner && p.status === activeBox);
        
        const initialParty: BattlePokemon[] = targetPokemon.map(p => ({
            ...p,
            currentHp: 100,
            maxHp: 100,
            baseStats: { hp: 50, attack: 50, defense: 50, 'special-attack': 50, 'special-defense': 50, speed: 50 },
            realStats: { hp: 100, attack: 50, defense: 50, 'special-attack': 50, 'special-defense': 50, speed: 50 },
            stages: { ...DEFAULT_STAGES },
            condition: 'none',
            volatiles: []
        }));

        setBattleParty(initialParty);
        if (initialParty.length > 0) setActivePokemonId(initialParty[0].id);
        
        // Async Fetch Stats
        initialParty.forEach(p => {
             getPokemonDetails(p.species).then(d => {
                 if (d) {
                    const baseS = convertStatsApi(d.stats);
                    const lvl = p.level || 50;
                    const realS: StatProfile = {
                        hp: calculateStat(baseS.hp, lvl, true),
                        attack: calculateStat(baseS.attack, lvl, false),
                        defense: calculateStat(baseS.defense, lvl, false),
                        'special-attack': calculateStat(baseS['special-attack'], lvl, false),
                        'special-defense': calculateStat(baseS['special-defense'], lvl, false),
                        speed: calculateStat(baseS.speed, lvl, false),
                    };

                    setBattleParty(prev => prev.map(mons => 
                        mons.id === p.id ? { 
                            ...mons, 
                            baseStats: baseS,
                            realStats: realS,
                            types: d.types,
                            maxHp: realS.hp,
                            currentHp: realS.hp 
                        } : mons
                     ));
                 }
             });
        });
    }
  }, [isOpen, activeOwner, activeBox, allPokemon]); 

  const convertStatsApi = (apiStats: any[]) => {
      const s: any = {};
      apiStats.forEach((st: any) => s[st.stat.name] = st.base_stat);
      return s as StatProfile;
  };

  // --- Handlers ---
  const handleStatChange = (id: string, stat: keyof StatProfile, val: number) => {
      setBattleParty(prev => prev.map(p => {
          if (p.id !== id) return p;
          const newReal = { ...p.realStats, [stat]: val };
          if (stat === 'hp') {
              return { ...p, realStats: newReal, maxHp: val, currentHp: Math.min(p.currentHp, val) };
          }
          return { ...p, realStats: newReal };
      }));
  };

  const handleStageChange = (id: string, stat: keyof StatStages, val: number) => {
      setBattleParty(prev => prev.map(p => p.id === id ? { ...p, stages: { ...p.stages, [stat]: val } } : p));
  };
  
  const handleLevelChange = (id: string, val: number) => {
      setBattleParty(prev => prev.map(p => {
          if (p.id !== id) return p;
          // Recalculate based on base stats
          const newReal: StatProfile = {
            hp: calculateStat(p.baseStats.hp, val, true),
            attack: calculateStat(p.baseStats.attack, val, false),
            defense: calculateStat(p.baseStats.defense, val, false),
            'special-attack': calculateStat(p.baseStats['special-attack'], val, false),
            'special-defense': calculateStat(p.baseStats['special-defense'], val, false),
            speed: calculateStat(p.baseStats.speed, val, false),
          };
          return { ...p, level: val, realStats: newReal, maxHp: newReal.hp, currentHp: newReal.hp };
      }));
  };

  const loadPreset = (preset: typeof TRAINER_PRESETS[0]) => {
      const p1 = preset.pokemon[0];
      setEnemySpecies(p1.species);
      setEnemyLevel(p1.level);
      const moves = p1.moves || ['', '', '', ''];
      while (moves.length < 4) moves.push('');
      setEnemyMoves(moves);
  };

  const loadEnemy = async () => {
       if (!enemySpecies) return;
       setEnemyLoading(true);
       try {
           const data: any = await getPokemonDetails(enemySpecies);
           if (!data) throw new Error("Mon not found");
           
           const baseS = convertStatsApi(data.stats);
           const realS: StatProfile = {
                hp: calculateStat(baseS.hp, enemyLevel, true),
                attack: calculateStat(baseS.attack, enemyLevel, false),
                defense: calculateStat(baseS.defense, enemyLevel, false),
                'special-attack': calculateStat(baseS['special-attack'], enemyLevel, false),
                'special-defense': calculateStat(baseS['special-defense'], enemyLevel, false),
                speed: calculateStat(baseS.speed, enemyLevel, false),
           };

           // Get Moves
           const levelUpCandidates = data.moves
                .filter((m: any) => m.level <= enemyLevel && m.method === 'level-up')
                .sort((a: any, b: any) => a.level - b.level); // Ensure chronological order

           // Optimization: Analyze the last 20 moves learned (most relevant)
           const recentCandidates = levelUpCandidates.slice(-20);
           
           // Fetch details for these candidates to find the strongest ones
           // If user has manually set moves, use them. Otherwise, run Smart Pick logic.
           let activeMoves = enemyMoves.filter(m => m);
           
           let poolDetails: any[] = [];
           if (recentCandidates.length > 0) {
               const poolPromises = recentCandidates.map((c: any) => getMoveDetails(c.name));
               const results = await Promise.all(poolPromises);
               poolDetails = results.filter(d => d).map(d => ({...d, level: recentCandidates.find((c: any) => c.name === d.name)?.level }));
               // Sort pool by Power for UI
               poolDetails.sort((a,b) => (b.power || 0) - (a.power || 0));
               setPossibleEnemyMoves(poolDetails);
           } else {
               setPossibleEnemyMoves([]);
           }

           if (activeMoves.length === 0) {
                // Smart Autopick: Top 4 Highest Power Moves
                // Filter out Status moves for the auto-pick if we have enough damaging moves?
                // Actually, let's just pick the 4 strongest moves.
                const smartPicks = [...poolDetails]
                    .sort((a,b) => (b.power || 0) - (a.power || 0))
                    .slice(0, 4)
                    .map(m => m.name);
                
                activeMoves = smartPicks;
                setEnemyMoves([ ...smartPicks, '', '', '' ].slice(0,4));
           }
           
           // Now fetch details for the *actual* active moves (could match pool, or be custom)
           // If they are in pool, reuse them
           const finalMoveDetails = await Promise.all(activeMoves.map(async (m) => {
               const cached = poolDetails.find(p => p.name === m);
               if (cached) return cached;
               return await getMoveDetails(m);
           }));

           setEnemyData({
               species: enemySpecies,
               id: data.id,
               level: enemyLevel,
               types: data.types,
               moves: activeMoves,
               moveDetails: finalMoveDetails.filter(d => d), 
               baseStats: baseS,
               realStats: realS,
               stages: { ...DEFAULT_STAGES }
           });
           setActiveTab('battle');
       } catch (e) {
           console.error(e);
       }
       setEnemyLoading(false);
  };

  // --- SOLVER LOGIC ---
  
  const getMatchupScore = (myMon: BattlePokemon, enemy: EnemyMon) => {
      if (!myMon.realStats || !enemy.realStats) return { score: 0, reasons: [] };
      let score = 0;
      const reasons: string[] = [];

      // 1. Speed Evaluation
      const mySpeed = myMon.realStats.speed * STAGE_MULTIPLIERS[myMon.stages.speed];
      const enSpeed = enemy.realStats.speed * STAGE_MULTIPLIERS[enemy.stages.speed];
      
      // Paralysis
      const adjustedMySpeed = myMon.condition === 'paralysis' ? mySpeed * 0.5 : mySpeed;

      if (adjustedMySpeed >= enSpeed) {
          score += 40;
          reasons.push(`Faster`);
      } else {
          score -= 30;
          reasons.push(`Slower`);
      }

      // 2. Defensive (Taking Hits)
      let maxIncomingMultiplier = 0;
      let worstMove = '';
      
      if (enemy.moveDetails.length > 0) {
          enemy.moveDetails.forEach(m => {
              if (m.damage_class === 'status') return;
              let mult = 1;
              myMon.types?.forEach(t => {
                   if (TYPE_CHART[m.type] && TYPE_CHART[m.type][t] !== undefined) mult *= TYPE_CHART[m.type][t];
              });
              if (mult > maxIncomingMultiplier) {
                  maxIncomingMultiplier = mult;
                  worstMove = m.name;
              }
          });
      } else {
           // Fallback to Type only
           enemy.types.forEach(et => {
               let mult = 1;
               myMon.types?.forEach(t => {
                   if (TYPE_CHART[et] && TYPE_CHART[et][t] !== undefined) mult *= TYPE_CHART[et][t];
               });
               if (mult > maxIncomingMultiplier) maxIncomingMultiplier = mult;
           });
      }

      if (maxIncomingMultiplier >= 4) {
          score -= 80;
          reasons.push(`Weak 4x to ${worstMove || 'Enemy'}`);
      } else if (maxIncomingMultiplier >= 2) {
          score -= 40;
          reasons.push(`Weak 2x to ${worstMove || 'Enemy'}`);
      } else if (maxIncomingMultiplier < 1) {
          score += 20;
          reasons.push(`Resists Enemy`);
      } else if (maxIncomingMultiplier === 0) {
          score += 60;
          reasons.push(`Immune to ${worstMove}`);
      }

      // 3. Offensive (Dealing Damage)
      let maxOutgoingMultiplier = 0;
      myMon.types?.forEach(mt => {
           let mult = 1; // STAB assumed
           enemy.types?.forEach(et => {
               if (TYPE_CHART[mt] && TYPE_CHART[mt][et] !== undefined) mult *= TYPE_CHART[mt][et];
           });
           if (mult > maxOutgoingMultiplier) maxOutgoingMultiplier = mult;
      });
      // Boost check
      if (myMon.stages.attack > 0 || myMon.stages['special-attack'] > 0) {
          score += 20;
          reasons.push("Boosted");
      }

      if (maxOutgoingMultiplier >= 4) {
          score += 80;
          reasons.push("Has 4x STAB");
      } else if (maxOutgoingMultiplier >= 2) {
          score += 40;
          reasons.push("Has 2x STAB");
      } else if (maxOutgoingMultiplier < 1) {
          score -= 20;
          reasons.push("Resisted");
      }

      // 4. Status/Condition
      if (myMon.currentHp === 0) score = -9999;
      if (myMon.condition === 'sleep' || myMon.condition === 'freeze') {
          score -= 50;
          reasons.push("Incapacitated");
      }

      return { score, reasons };
  };
  
  const sortedLeads = useMemo(() => {
      if (!enemyData || battleParty.length === 0) return [];
      return battleParty
        .filter(p => p.currentHp > 0)
        .map(p => {
            const { score, reasons } = getMatchupScore(p, enemyData);
            return { id: p.id, score, reasons, pokemon: p };
        })
        .sort((a, b) => b.score - a.score);
  }, [battleParty, enemyData]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100">
        
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
           <div className="flex items-center gap-3">
               <Sword className="text-red-500" />
               <h2 className="text-xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">Battle Simulator v2</h2>
               <div className="flex bg-zinc-800 rounded-lg p-1 text-xs ml-4">
                   <button onClick={() => setActiveTab('setup')} className={`px-3 py-1 rounded ${activeTab === 'setup' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}>Setup</button>
                   <button onClick={() => setActiveTab('battle')} className={`px-3 py-1 rounded ${activeTab === 'battle' ? 'bg-red-600 text-white' : 'text-zinc-400'}`} disabled={!enemyData}>Battle</button>
               </div>
           </div>
           
           <div className="flex gap-2">
                 {/* Box Selector for Context */}
                 <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                     {(['party', 'box'] as const).map(b => (
                        <button 
                            key={b} 
                            onClick={() => setActiveBox(b)} 
                            className={`px-3 py-1 text-xs font-bold uppercase rounded ${activeBox === b ? 'bg-indigo-600 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >
                            {b}
                        </button>
                     ))}
                 </div>

                 <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                    {(['player1', 'player2', 'player3'] as const).map(p => (
                        <button key={p} onClick={() => setActiveOwner(p)} className={`px-3 py-1 text-xs font-bold uppercase rounded ${activeOwner === p ? 'bg-zinc-700 text-white' : 'text-zinc-600'}`}>
                            {p.replace('player','P')}
                        </button>
                    ))}
                 </div>
                 <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition"><X className="w-5 h-5 text-zinc-400" /></button>
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
            
            {/* LEFT: Party Editor (35%) */}
            <div className="w-[400px] border-r border-zinc-800 flex flex-col bg-zinc-900/50 flex-shrink-0">
                <div className="p-2 bg-zinc-950/50 border-b border-zinc-800 flex justify-between text-xs font-mono uppercase text-zinc-500">
                    <span>{activeOwner} Party</span>
                    <span className="text-zinc-600">Click to Edit Stats</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                    {battleParty.length === 0 && <div className="text-center text-zinc-600 py-10">No Pokemon found</div>}
                    {battleParty.map(mon => (
                        <div 
                           key={mon.id} 
                           onClick={() => setActivePokemonId(mon.id === activePokemonId ? null : mon.id)}
                           className={`rounded-lg border p-3 cursor-pointer transition-all ${activePokemonId === mon.id ? 'border-red-500 bg-red-500/10' : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900'}`}
                        >
                            {/* Card Header */}
                            <div className="flex items-center gap-3">
                                <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${mon.dexId}.png`} className="w-10 h-10 pixelated" />
                                <div className="flex-1">
                                    <div className="font-bold flex items-center justify-between">
                                        <span>{mon.nickname || mon.species}</span>
                                        {mon.condition !== 'none' && <span className="text-[10px] px-1 bg-purple-900 text-purple-200 rounded">{mon.condition}</span>}
                                    </div>
                                    <div className="text-xs text-zinc-400 flex gap-2">
                                         {mon.types?.map(t => <span key={t} style={{color: TYPE_COLORS[t] || '#fff'}}>{t}</span>)}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <input 
                                        type="number" 
                                        className="w-10 bg-black border border-zinc-700 text-center text-sm rounded px-0.5 no-spinner"
                                        value={mon.level}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => handleLevelChange(mon.id, parseInt(e.target.value))}
                                    />
                                    <div className="text-[10px] text-zinc-500">Lvl</div>
                                </div>
                            </div>
                            
                            {/* Expanded Stats Editor */}
                            {activePokemonId === mon.id && (
                                <div className="mt-3 pt-3 border-t border-zinc-800 grid grid-cols-2 gap-x-4 gap-y-2 animate-in fade-in slide-in-from-top-1 duration-200 cursor-default" onClick={e => e.stopPropagation()}>
                                    {(['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'] as const).map(stat => (
                                        <div key={stat} className="flex items-center justify-between text-xs">
                                            <span className={(stat === 'speed' && enemyData && mon.realStats.speed * STAGE_MULTIPLIERS[mon.stages.speed] >= enemyData.realStats.speed * STAGE_MULTIPLIERS[enemyData.stages.speed]) ? "text-emerald-400 font-bold uppercase" : "text-zinc-500 uppercase"}>
                                                {STAT_LABELS[stat]}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <input 
                                                    type="number" 
                                                    className={`w-12 bg-zinc-950 border border-zinc-800 text-right px-1 rounded no-spinner focus:border-red-500 outline-none ${stat === 'speed' ? 'text-blue-300' : 'text-zinc-300'}`}
                                                    value={mon.realStats[stat]}
                                                    onChange={(e) => handleStatChange(mon.id, stat, parseInt(e.target.value) || 0)} 
                                                />
                                                {stat !== 'hp' && (
                                                    <select 
                                                        className={`w-9 bg-zinc-800 text-[9px] border-none rounded text-center cursor-pointer ${mon.stages[stat as keyof StatStages] > 0 ? 'text-green-400 font-bold' : mon.stages[stat as keyof StatStages] < 0 ? 'text-red-400 font-bold' : 'text-zinc-500'}`}
                                                        value={mon.stages[stat as keyof StatStages]}
                                                        onChange={(e) => handleStageChange(mon.id, stat as keyof StatStages, parseInt(e.target.value))}
                                                    >
                                                        {[-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6].map(s => (
                                                            <option key={s} value={s}>{s > 0 ? '+'+s : s}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    <div className="col-span-2 pt-2 border-t border-zinc-800 flex flex-wrap gap-2">
                                        <label className="text-[10px] text-zinc-600 uppercase font-bold self-center mr-2">Status</label>
                                        {['paralysis', 'burn', 'poison', 'sleep'].map(cond => (
                                            <button 
                                                key={cond}
                                                onClick={() => setBattleParty(prev => prev.map(p => p.id === mon.id ? { ...p, condition: p.condition === cond ? 'none' : cond } : p))}
                                                className={`text-[10px] px-2 py-0.5 rounded border transition ${mon.condition === cond ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300' : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}
                                            >
                                                {cond.toUpperCase().slice(0,3)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT: Main View (Setup or Battle) */}
            <div className="flex-1 flex flex-col bg-zinc-950 relative overflow-hidden">
                
                {/* --- SETUP TAB --- */}
                {activeTab === 'setup' && (
                    <div className="flex flex-col items-center justify-center h-full p-8 animate-in zoom-in-95 duration-200 overflow-y-auto">
                        <div className="w-full max-w-lg space-y-6">
                            
                             {/* Presets */}
                             <div>
                                <h3 className="text-zinc-500 text-xs font-bold mb-2 uppercase tracking-widest">Load Common Enemy</h3>
                                <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar snap-x">
                                    {TRAINER_PRESETS.map((preset, i) => (
                                        <button 
                                            key={i}
                                            onClick={() => loadPreset(preset)}
                                            className="snap-start shrink-0 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-red-500 hover:bg-zinc-800 transition text-sm text-left w-32"
                                        >
                                            <div className="font-bold text-white truncate">{preset.name}</div>
                                            <div className="text-[10px] text-zinc-500">{preset.pokemon.length} Pokemon</div>
                                        </button>
                                    ))}
                                </div>
                             </div>

                             {/* Manual Entry */}
                             <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 shadow-xl space-y-4">
                                <div className="flex items-end gap-3">
                                    <div className="flex-1">
                                        <label className="text-xs text-zinc-500 mb-1 block uppercase font-bold">Species</label>
                                        <AutocompleteInput 
                                            options={allSpeciesList} 
                                            value={enemySpecies} 
                                            onChange={setEnemySpecies} 
                                            placeholder="e.g. Garchomp"
                                            className="w-full bg-black border border-zinc-700 p-2 rounded text-lg font-bold focus:border-red-500 focus:outline-none"
                                        />
                                    </div>
                                    <div className="w-20">
                                        <label className="text-xs text-zinc-500 mb-1 block uppercase font-bold">Lvl</label>
                                        <input 
                                            type="number" 
                                            value={enemyLevel} 
                                            onChange={(e) => setEnemyLevel(parseInt(e.target.value))}
                                            className="w-full bg-black border border-zinc-700 p-2 rounded text-center font-mono text-lg font-bold focus:border-red-500 focus:outline-none no-spinner"
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1 block uppercase font-bold">Enemy Moves (Optional)</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[0,1,2,3].map(i => (
                                            <AutocompleteInput 
                                                key={i}
                                                options={allMovesList.length > 0 ? allMovesList : possibleEnemyMoves.map((m: any) => m.name)}
                                                value={enemyMoves[i] || ''}
                                                onChange={(val) => {
                                                    const n = [...enemyMoves];
                                                    n[i] = val;
                                                    setEnemyMoves(n);
                                                }}
                                                placeholder={`Move ${i+1}`}
                                                className="bg-black border border-zinc-800 text-xs p-2 rounded w-full focus:border-red-500 focus:outline-none"
                                            />
                                        ))}
                                    </div>
                                    
                                    {/* Known Move Pool */}
                                    {possibleEnemyMoves.length > 0 && (
                                       <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                                           <label className="text-[10px] text-zinc-600 mb-1 block uppercase font-bold flex justify-between">
                                               <span>Known Move Pool (Sorted by Power)</span>
                                               <span className="text-zinc-700">Click to Add</span>
                                           </label>
                                           <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto custom-scrollbar p-1.5 border border-zinc-800 rounded bg-black/40">
                                               {possibleEnemyMoves.map((m: any) => (
                                                   <button
                                                       key={m.name}
                                                       onClick={() => {
                                                           const emptyIndex = enemyMoves.findIndex(x => !x);
                                                           if (emptyIndex !== -1) {
                                                               const n = [...enemyMoves];
                                                               n[emptyIndex] = m.name;
                                                               setEnemyMoves(n);
                                                           } else {
                                                               // Cycle functionality: if full, replace the last one? Or maybe just flash red.
                                                               // Let's replace the last slot for convenience
                                                               const n = [...enemyMoves];
                                                               n[3] = m.name;
                                                               setEnemyMoves(n);
                                                           }
                                                       }}
                                                       className="text-[10px] pl-1.5 pr-2 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-500 hover:bg-zinc-800 rounded flex items-center gap-1.5 group transition w-auto"
                                                       title={`Learned at Level ${m.level} - ${m.damage_class}`}
                                                   >
                                                        <span className="w-2 h-2 rounded-full shadow-sm" style={{backgroundColor: TYPE_COLORS[m.type] || '#ccc'}}></span>
                                                        <div className="flex flex-col text-left leading-none">
                                                            <span className="text-zinc-300 group-hover:text-white capitalize font-bold">{m.name}</span>
                                                        </div>
                                                        {m.power ? <span className="text-zinc-500 font-mono bg-zinc-950 px-1 rounded ml-auto">{m.power}</span> : <span className="text-zinc-600 text-[9px] uppercase ml-auto">STS</span>}
                                                   </button>
                                               ))}
                                           </div>
                                       </div>
                                   )}
                                </div>
                            
                                <button 
                                    onClick={loadEnemy} 
                                    disabled={!enemySpecies || enemyLoading}
                                    className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-lg shadow-red-900/20"
                                >
                                    {enemyLoading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div> : <Crosshair className="w-4 h-4" />}
                                    Analyze Encounter
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- BATTLE TAB --- */}
                {activeTab === 'battle' && enemyData && (
                    <div className="flex flex-col h-full animate-in fade-in duration-300">
                        {/* Battle Header (Enemy Vis) */}
                        <div className="h-40 shrink-0 bg-gradient-to-b from-zinc-900 to-zinc-950 flex items-center justify-center border-b border-zinc-800 relative">
                             <div className="absolute inset-0 opacity-10" style={{background: `radial-gradient(circle at center, ${TYPE_COLORS[enemyData.types[0]]} 0%, transparent 70%)`}}></div>
                             
                             <div className="flex items-center gap-8 relative z-10 scale-90 md:scale-100">
                                  <div className="relative group cursor-help">
                                      <img 
                                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${enemyData.id}.png`} 
                                        className="w-28 h-28 pixelated drop-shadow-2xl" 
                                        alt={enemyData.species} 
                                      />
                                      {/* Tooltip Stats */}
                                      <div className="absolute left-full ml-2 top-0 bg-black/90 text-[10px] p-2 rounded border border-zinc-700 w-32 hidden group-hover:block z-50">
                                          <div className="font-bold text-red-400 mb-1">ENEMY STATS</div>
                                          <div className="grid grid-cols-2 gap-x-2 text-zinc-300">
                                            <span>Atk: {enemyData.realStats.attack}</span>
                                            <span>Def: {enemyData.realStats.defense}</span>
                                            <span>SpA: {enemyData.realStats['special-attack']}</span>
                                            <span>SpD: {enemyData.realStats['special-defense']}</span>
                                            <span className="text-yellow-400 col-span-2">Spe: {enemyData.realStats.speed}</span>
                                          </div>
                                      </div>
                                  </div>
                                  
                                  <div className="text-center">
                                      <h2 className="text-2xl font-black uppercase tracking-widest text-white drop-shadow-md">{enemyData.species}</h2>
                                      <div className="flex justify-center gap-2 mt-1">
                                          {enemyData.types.map(t => (
                                              <span key={t} className="px-2 py-0.5 rounded text-[10px] font-bold uppercase text-black" style={{backgroundColor: TYPE_COLORS[t] || '#ccc'}}>{t}</span>
                                          ))}
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400">Lvl {enemyData.level}</span>
                                      </div>
                                  </div>
                             </div>
                        </div>

                        {/* Analysis Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-zinc-950">
                            
                            {/* Best Lead Recommendation */}
                            {sortedLeads.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-zinc-500 font-bold text-xs uppercase mb-3 flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-emerald-500" /> Recommended Lead
                                    </h3>
                                    
                                    <div className="bg-gradient-to-r from-emerald-900/20 to-zinc-900 border border-emerald-500/30 p-4 rounded-xl flex items-center gap-4 shadow-lg shadow-emerald-900/10">
                                        <div className="bg-emerald-500/10 p-3 rounded-full border border-emerald-500/20">
                                            <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${sortedLeads[0].pokemon.dexId}.png`} className="w-12 h-12 pixelated object-contain" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xl font-bold text-white leading-none mb-1">{sortedLeads[0].pokemon.nickname || sortedLeads[0].pokemon.species}</div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {sortedLeads[0].reasons.map((r, i) => (
                                                    <span key={i} className="text-[10px] bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20">{r}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="text-right px-4 border-l border-emerald-500/20">
                                            <div className="text-2xl font-black text-emerald-400">{sortedLeads[0].score > 0 ? '+' : ''}{sortedLeads[0].score}</div>
                                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Score</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Rest of Party */}
                            <h3 className="text-zinc-500 font-bold text-xs uppercase mb-3">Party Matchups</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {sortedLeads.slice(1).map(item => (
                                    <div key={item.id} className={`bg-zinc-900 border p-3 rounded-lg flex items-center gap-3 transition hover:bg-zinc-800 ${item.score > 0 ? 'border-zinc-800' : 'border-red-900/30 bg-red-900/5'}`}>
                                        <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${item.pokemon.dexId}.png`} className="w-10 h-10 pixelated opacity-80" />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold truncate text-zinc-300">{item.pokemon.nickname || item.pokemon.species}</div>
                                            <div className="flex gap-1 overflow-hidden">
                                                 <span className={`text-[10px] truncate ${item.score > 0 ? 'text-zinc-500' : 'text-red-400'}`}>{item.reasons[0]}</span>
                                            </div>
                                        </div>
                                        <div className={`text-lg font-bold ${item.score >= 0 ? 'text-zinc-500' : 'text-red-500'}`}>
                                            {item.score > 0 ? '+' : ''}{item.score}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Battle Advice Footer */}
                            <div className="mt-8 p-4 bg-blue-900/10 border border-blue-500/20 rounded-lg text-xs text-blue-200 flex gap-3">
                                <TrendingUp className="shrink-0 w-5 h-5 text-blue-400" />
                                <div>
                                    <div className="font-bold mb-1 text-blue-400">COMBAT SIMULATION NOTES</div>
                                    <p className="opacity-80">
                                        Scores are calculated based on Speed tiers (do you move first?), Type Advantange (defensive & offensive), and Status conditions.
                                        <br/>
                                        Edit the stats in the left panel to update the simulation in real-time.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default CombatSimulator;
