// Advanced Combat Sim - Battle Scenario
import React, { useState, useEffect } from 'react';
import { TYPE_CHART, TYPE_COLORS } from '../utils/gameData';
import { getPokemonDetails, getMoveDetails } from '../utils/pokeApi';
import { Sword, X, Shield, Zap, Skull } from 'lucide-react';
import { Pokemon } from '../types';
import AutocompleteInput from './AutocompleteInput';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userParty: Pokemon[]; // From App State
}

interface BattlePokemon extends Pokemon {
    currentHp?: number;
    maxHp?: number;
    stats?: Record<string, number>; // base stats
    condition?: string; // Overrides 'status' from Pokemon which is location
    volatiles?: string[]; // 'trapped', 'seeded'
    loadedMoves?: any[]; // Cached move data
}

interface EnemyMon {
    species: string;
    level: number;
    types: string[];
    moves: string[]; // Names
    moveDetails: any[]; // Cached
    stats: Record<string, number>;
}

const CombatSimulator: React.FC<Props> = ({ isOpen, onClose, userParty }) => {
  // Scenario State
  const [activeTab, setActiveTab] = useState<'setup' | 'battle'>('setup');
  
  // Enemy State
  const [enemySpecies, setEnemySpecies] = useState('');
  const [enemyLevel, setEnemyLevel] = useState(50);
  const [enemyMoves, setEnemyMoves] = useState<string[]>(['', '', '', '']);
  const [enemyData, setEnemyData] = useState<EnemyMon | null>(null);
  const [enemyLoading, setEnemyLoading] = useState(false);
  const [possibleEnemyMoves, setPossibleEnemyMoves] = useState<string[]>([]);

  // User State
  const [battleParty, setBattleParty] = useState<BattlePokemon[]>([]);
  const [activePokemonId, setActivePokemonId] = useState<string | null>(null);

  // Initialize Party from Prop
  useEffect(() => {
    if (isOpen && userParty.length > 0) {
        // Enrich party with defaults
        const initialParty = userParty.map(p => ({
            ...p,
            currentHp: 100, // Percentage for simplicity? Or fetch base HP? Let's use % for UX speed.
            maxHp: 100,
            condition: 'none'
        }));
        setBattleParty(initialParty);
        if (!activePokemonId) setActivePokemonId(initialParty[0].id);
        
        // Fetch stats in background
        initialParty.forEach(p => {
             getPokemonDetails(p.species).then(d => {
                 if (d) {
                     setBattleParty(prev => prev.map(mons => 
                        mons.id === p.id ? { ...mons, stats: convertStats(d.stats), types: d.types } : mons
                     ));
                     // Also fetch move details?
                 }
             });
        });
    }
  }, [isOpen, userParty]);

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
               moveDetails: [], // Load later
               stats: convertStats(data.stats)
           });
           setPossibleEnemyMoves(data.moves);
           
           // Fetch move details for known inputs
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
      if (!activeMon || !activeMon.stats) return <p className="text-zinc-500">Loading stats...</p>;

      // 1. Speed Check
      // Approx: Base * Level for now (ignoring IV/EV)
      // Apply Status modifiers
      const myMon = activeMon;
      let mySpeedMultiplier = 1;
      if (myMon.condition === 'paralysis') mySpeedMultiplier = 0.5;
      const mySpeed = Math.floor((activeMon.stats['speed'] || 50) * mySpeedMultiplier);
      
      const enemySpeed = (enemyData.stats['speed'] || 50); // Enemy status not tracked yet
      const isFaster = mySpeed >= enemySpeed;
      
      const speedText = isFaster 
          ? `You are likely FASTER (Est ${mySpeed} vs ${enemySpeed}) ${myMon.condition === 'paralysis' ? '(Paralyzed)' : ''}`
          : `Enemy is likely FASTER (Est ${enemySpeed} vs ${mySpeed}) ${myMon.condition === 'paralysis' ? '(You are Paralyzed)' : ''}`;

      // 2. Incoming Damage Threat (Defensive)
      let maxThreat = 0;
      let worstMove = '';
      
      enemyData.moveDetails.forEach(move => {
          if (move.damage_class === 'status') return;
          let mult = 1;
          activeMon.types?.forEach(t => {
               // Check Type Chart
               const at = move.type;
               const dt = t;
               if (TYPE_CHART[at] && TYPE_CHART[at][dt] !== undefined) mult *= TYPE_CHART[at][dt];
          });
          if (mult > maxThreat) {
              maxThreat = mult;
              worstMove = move.name;
          }
      });
      
      // If no moves known, use Type Coverage assumptions
      if (enemyData.moveDetails.length === 0) {
           // Assume STAB
           enemyData.types.forEach(t => {
               let mult = 1;
               activeMon.types?.forEach(dt => {
                   if (TYPE_CHART[t] && TYPE_CHART[t][dt] !== undefined) mult *= TYPE_CHART[t][dt];
               });
               if (mult > maxThreat) {
                   maxThreat = mult;
                   worstMove = `${t} (STAB)`;
               }
           });
      }

      // 3. Outgoing Damage (Offensive)
      let myMaxDmg = 0;
      let bestMove = '';
      
      // We don't have move details for our party cached yet, so estimation based on type only is tricky.
      // But we know our types.
      // Let's assume we have STAB moves.
      activeMon.types?.forEach(at => {
           let mult = 1;
           enemyData.types.forEach(dt => {
               if (TYPE_CHART[at] && TYPE_CHART[at][dt] !== undefined) mult *= TYPE_CHART[at][dt];
           });
           if (mult > myMaxDmg) {
               myMaxDmg = mult;
               bestMove = `${at} Move`;
           }
      });

      return (
          <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${isFaster ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-orange-900/20 border-orange-500/30'}`}>
                  <div className="flex items-center gap-2 mb-1">
                      <Zap size={18} className={isFaster ? "text-indigo-400" : "text-orange-400"} />
                      <span className="font-bold text-zinc-200">Speed Tier</span>
                  </div>
                  <p className="text-sm text-zinc-300">{speedText}</p>
              </div>

              <div className={`p-4 rounded-lg border ${maxThreat >= 2 ? 'bg-red-900/20 border-red-500/30' : 'bg-emerald-900/20 border-emerald-500/30'}`}>
                   <div className="flex items-center gap-2 mb-1">
                      <Shield size={18} className={maxThreat >= 2 ? "text-red-400" : "text-emerald-400"} />
                      <span className="font-bold text-zinc-200">Defense Analysis</span>
                  </div>
                  <p className="text-sm text-zinc-300">
                      {maxThreat >= 4 ? `CRITICAL DANGER: Weak 4x to ${worstMove}. One-shot likely.` :
                       maxThreat >= 2 ? `DANGER: Weak 2x to ${worstMove}. Heavy damage.` :
                       maxThreat === 0 ? `SAFE: Immune to ${worstMove}.` :
                       maxThreat < 1 ? `SAFE: Resists main threats.` :
                       `NEUTRAL: Likely takes normal damage.`}
                  </p>
              </div>
              
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
      
      // Find Safe Switch (Best Defense)
      let tank = null;
      let minTaken = 999;
      
      // Find Killer (Best Offense)
      let killer = null;
      let maxGiven = 0;
      
      battleParty.forEach(p => {
          if (!p.stats || p.currentHp === 0) return;
          
          // Defense Calc
          let threat = 0;
          enemyData.moveDetails.forEach(m => {
             if (m.damage_class === 'status') return; 
             let mult = 1;
             p.types?.forEach(t => {
                 if (TYPE_CHART[m.type] && TYPE_CHART[m.type][t] !== undefined) mult *= TYPE_CHART[m.type][t];
             });
             if (mult > threat) threat = mult;
          });
          // Fallback if no moves
          if (enemyData.moveDetails.length === 0) {
              enemyData.types.forEach(et => {
                   let mult = 1;
                   p.types?.forEach(t => {
                        if (TYPE_CHART[et] && TYPE_CHART[et][t] !== undefined) mult *= TYPE_CHART[et][t];
                   });
                   if (mult > threat) threat = mult;
              });
          }
          
          if (threat < minTaken) { minTaken = threat; tank = p; }
          
          // Offense Calc
          let power = 0;
          p.types?.forEach(at => {
               let mult = 1;
               enemyData.types.forEach(et => {
                    if (TYPE_CHART[at] && TYPE_CHART[at][et] !== undefined) mult *= TYPE_CHART[at][et];
               });
               if (mult > power) power = mult;
          });
          if (power > maxGiven) { maxGiven = power; killer = p; }
      });
      
      return (
          <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-zinc-800 p-3 rounded text-sm">
                  <span className="text-xs font-bold text-zinc-500 uppercase block mb-1">Best Defense</span>
                  {tank ? (
                      <div className="flex items-center gap-2">
                          <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${(tank as any).dexId}.png`} className="w-8 h-8 pixelated" />
                          <div>
                              <div className="font-bold text-zinc-200">{(tank as any).nickname || (tank as any).species}</div>
                              <div className="text-xs text-zinc-400">Takes {minTaken}x dmg</div>
                          </div>
                      </div>
                  ) : <span>None</span>}
              </div>
              <div className="bg-zinc-800 p-3 rounded text-sm">
                  <span className="text-xs font-bold text-zinc-500 uppercase block mb-1">Best Offense</span>
                  {killer ? (
                      <div className="flex items-center gap-2">
                          <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${(killer as any).dexId}.png`} className="w-8 h-8 pixelated" />
                          <div>
                              <div className="font-bold text-zinc-200">{(killer as any).nickname || (killer as any).species}</div>
                              <div className="text-xs text-zinc-400">Deals {maxGiven}x dmg</div>
                          </div>
                      </div>
                  ) : <span>None</span>}
              </div>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-4xl w-full shadow-2xl h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-zinc-800">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sword className="text-red-500" /> 
                    <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">Combat Director</span>
                </h3>
                <button onClick={onClose}><X className="text-zinc-500 hover:text-white" /></button>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-hidden">
             
             {/* Left Col: Setup & Enemy */}
             <div className="md:col-span-4 flex flex-col gap-4 overflow-y-auto pr-2">
                 <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                     <h4 className="text-sm font-bold text-zinc-400 uppercase mb-3 flex items-center gap-2">
                         <Skull size={14} /> Enemy Threat
                     </h4>
                     {activeTab === 'setup' ? (
                         <div className="space-y-3">
                             <AutocompleteInput 
                                placeholder="Enemy Species (e.g. Ghetsis's Hydreigon)"
                                value={enemySpecies}
                                onChange={setEnemySpecies}
                                options={[]} // Could load all
                             />
                             <div className="grid grid-cols-2 gap-2">
                                <label className="text-xs text-zinc-500">Level
                                    <input type="number" className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white mt-1" value={enemyLevel} onChange={e => setEnemyLevel(Number(e.target.value))} />
                                </label>
                             </div>
                             <div className="pt-2">
                                 <label className="text-xs text-zinc-500 mb-1 block">Known Moves (Optional)</label>
                                 {enemyMoves.map((m, i) => (
                                     <div key={i} className="mb-2">
                                        <AutocompleteInput 
                                            placeholder={`Move ${i+1}`}
                                            value={m}
                                            onChange={val => {
                                                const newM = [...enemyMoves];
                                                newM[i] = val;
                                                setEnemyMoves(newM);
                                            }}
                                            options={possibleEnemyMoves}
                                        />
                                     </div>
                                 ))}
                             </div>
                             <button onClick={loadEnemy} disabled={!enemySpecies || enemyLoading} className="w-full py-2 bg-red-600 hover:bg-red-500 rounded font-bold text-white transition disabled:opacity-50">
                                 {enemyLoading ? 'Analyzing...' : 'Initialize Battle'}
                             </button>
                         </div>
                     ) : (
                         <div className="text-center">
                             {enemyData && (
                                 <>
                                    <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${enemyData.stats['speed'] ? 'other/showdown/' : ''}${enemySpecies.toLowerCase()}.gif`} 
                                         onError={(e) => (e.currentTarget.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${(enemyData as any).id || 1}.png`)}
                                         className="w-24 h-24 mx-auto mb-2 object-contain" />
                                    <h2 className="text-xl font-bold text-white capitalize">{enemySpecies}</h2>
                                    <p className="text-zinc-500 text-sm">Lv. {enemyLevel}</p>
                                    <div className="flex justify-center gap-1 mt-2 mb-4">
                                        {enemyData.types.map(t => (
                                            <span key={t} className="px-2 py-0.5 rounded text-xs font-bold uppercase text-white" style={{ backgroundColor: TYPE_COLORS[t] }}>{t}</span>
                                        ))}
                                    </div>
                                    <div className="bg-zinc-900 rounded p-2 text-left space-y-1">
                                        {enemyData.moveDetails.length > 0 ? enemyData.moveDetails.map(m => (
                                            <div key={m.name} className="flex justify-between text-xs">
                                                <span className="text-zinc-300 capitalize">{m.name}</span>
                                                <span className="font-bold capitalize" style={{ color: TYPE_COLORS[m.type] }}>{m.type}</span>
                                            </div>
                                        )) : <span className="text-xs text-zinc-600 italic">No moves known (assuming STAB)</span>}
                                    </div>
                                    <button onClick={() => setActiveTab('setup')} className="text-xs text-zinc-500 mt-4 underline hover:text-white">Edit Enemy</button>
                                 </>
                             )}
                         </div>
                     )}
                 </div>
             </div>

             {/* Middle: Active Battle */}
             <div className="md:col-span-4 flex flex-col">
                 <div className="bg-zinc-800/20 rounded-xl border border-zinc-700 p-4 h-full flex flex-col">
                     <h4 className="text-sm font-bold text-zinc-400 uppercase mb-4 text-center">Tactical Guide</h4>
                     {activeTab === 'battle' ? (
                         <div className="flex-1 overflow-y-auto">
                              {getMatchupAdvice()}
                              {getTeamStandouts()}
                         </div>
                     ) : (
                         <div className="flex-1 flex items-center justify-center text-zinc-600 italic text-center px-6">
                             Select an enemy to begin tactical analysis.
                         </div>
                     )}
                 </div>
             </div>

             {/* Right: Party Status */}
             <div className="md:col-span-4 flex flex-col gap-2 overflow-y-auto pr-2">
                 <h4 className="text-sm font-bold text-zinc-400 uppercase mb-2">My Team</h4>
                 {battleParty.map(p => (
                     <div 
                        key={p.id} 
                        onClick={() => setActivePokemonId(p.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition flex items-center gap-3 ${activePokemonId === p.id ? 'bg-indigo-600/20 border-indigo-500' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                     >
                         <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.dexId}.png`} className="w-10 h-10 pixelated" />
                         <div className="flex-1">
                             <div className="flex justify-between items-center">
                                 <span className={`font-bold text-sm ${activePokemonId === p.id ? 'text-white' : 'text-zinc-300'}`}>{p.nickname || p.species}</span>
                                 <span className="text-xs text-zinc-500">Lv.{p.level || 50}</span>
                             </div>
                             {/* HP Bar */}
                             <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
                                 <div className="h-full bg-emerald-500" style={{ width: `${p.currentHp}%` }}></div>
                             </div>
                         </div>
                         {/* Status Toggles (Simple) */}
                         <div className="flex flex-col gap-1 items-end">
                             <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setBattleParty(prev => prev.map(mons => mons.id === p.id ? { ...mons, currentHp: Math.max(0, (mons.currentHp||100) - 10) } : mons));
                                }}
                                className="w-6 h-6 flex items-center justify-center bg-zinc-800 hover:bg-red-900/50 rounded text-red-500 text-xs font-bold"
                                title="-10% HP"
                             >HP-</button>
                             <select 
                                className={`w-14 text-[10px] h-6 bg-zinc-950 border border-zinc-700 rounded px-1 ${p.condition && p.condition !== 'none' ? 'text-yellow-400 border-yellow-600' : 'text-zinc-500'}`}
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
                     </div>
                 ))}
             </div>

          </div>
      </div>
    </div>
  );
};

export default CombatSimulator;
