// Advanced Combat Sim - Battle Scenario / Solver
import React, { useState, useEffect, useMemo } from 'react';
import { TYPE_CHART, TYPE_COLORS } from '../utils/gameData';
import { getPokemonDetails, getMoveDetails, getAllPokemonNames, getAllMoveNames } from '../utils/pokeApi';
import { TRAINER_PRESETS } from '../utils/trainerPresets';
import { Sword, X, Shield, TrendingUp, Crosshair, CloudRain, Cloud, Wind, Sun } from 'lucide-react';
import { Pokemon } from '../types';
import AutocompleteInput from './AutocompleteInput';
import { motion, AnimatePresence } from 'framer-motion';

// --- Interfaces ---

interface Props {
  isOpen: boolean;
  onClose: () => void;
  allPokemon: Pokemon[];
  playerNames?: { player1: string; player2: string; player3: string }; // Added names
  onUpdatePokemon: (id: string, updates: Partial<Pokemon>) => void;
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

interface ExtendedMove {
    name: string;
    power?: number;
    accuracy?: number;
    type: string;
    damage_class: string;
    priority?: number;
    meta?: {
        ailment: string;
        ailment_chance: number;
        flinch_chance: number;
        stat_chance: number;
    };
}

interface BattlePokemon extends Pokemon {
    currentHp: number;
    maxHp: number;    
    
    baseStats: StatProfile;
    realStats: StatProfile; // Editable
    stages: StatStages;     // Editable
    
    condition: string; 
    volatiles: string[];
    
    loadedMoves?: ExtendedMove[]; // Details for the 4 moves
    
    // Override optionals to be definite for battle context (we ensure they exist)
    level: number;
    types: string[]; 
}

interface EnemyMon {
    species: string;
    level: number;
    types: string[]; 
    moves: string[]; 
    moveDetails: ExtendedMove[]; 
    
    baseStats: StatProfile;
    realStats: StatProfile;
    stages: StatStages;
    
    id: number;

    // Added missing props
    currentHp: number;
    maxHp: number;
    condition: string; 
}

interface AnalysisResult {
    score: number;
    speedResult: 'faster' | 'slower' | 'tie';
    mySpeed: number;
    enSpeed: number;
    maxIncomingPct: number;
    worstEnemyMoveStr: string;
    enemyBestMove: ExtendedMove | null;
    maxOutgoingPct: number;
    bestMoveStr: string;
    myBestMove: ExtendedMove | null;
    turnsToWin: number;
    turnsToDie: number;
    safetyRating: 'Safe' | 'Trade' | 'Risky' | 'Dead';
    isControlRisk?: boolean;
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

const calculateDamage = (
    attacker: BattlePokemon | EnemyMon, 
    defender: BattlePokemon | EnemyMon, 
    move: ExtendedMove,
    weather: string = 'none'
) => {
    // 1. Determine Stats
    const isPhysical = move.damage_class === 'physical';
    const isSpecial = move.damage_class === 'special';
    
    if (!isPhysical && !isSpecial) return { min: 0, max: 0, typeEff: 1 }; // Status moves

    const atkStat = isPhysical ? attacker.realStats.attack : attacker.realStats['special-attack'];
    let defStat = isPhysical ? defender.realStats.defense : defender.realStats['special-defense'];
    
    // Sandstorm SpDef Boost for Rock types
    if (weather === 'sand' && defender.types.includes('rock') && !isPhysical) {
        defStat = Math.floor(defStat * 1.5);
    }

    const atkStage = isPhysical ? attacker.stages.attack : attacker.stages['special-attack'];
    const defStage = isPhysical ? defender.stages.defense : defender.stages['special-defense'];

    const a = atkStat * STAGE_MULTIPLIERS[atkStage];
    let d = defStat * STAGE_MULTIPLIERS[defStage];

    // Screen support could go here (Reflect/Light Screen)

    // 2. Base Damage
    // Level formula: ((2 * Level / 5 + 2) * Power * A / D) / 50 + 2
    const level = attacker.level || 50; 
    let base = Math.floor((2 * level / 5) + 2);
    base = Math.floor(base * (move.power || 0) * a / d);
    base = Math.floor(base / 50) + 2;

    // 3. Modifiers
    // Weather
    if (weather === 'sun') {
        if (move.type === 'fire') base = Math.floor(base * 1.5);
        if (move.type === 'water') base = Math.floor(base * 0.5);
    } else if (weather === 'rain') {
        if (move.type === 'water') base = Math.floor(base * 1.5);
        if (move.type === 'fire') base = Math.floor(base * 0.5);
    }

    // Burn (Physical nerf unless Guts - ignoring Guts for now)
    if (attacker.condition === 'burn' && isPhysical) {
        base = Math.floor(base * 0.5);
    }

    // STAB
    const attackerTypes = attacker.types || [];
    const stab = attackerTypes.includes(move.type) ? 1.5 : 1;
    
    // Type Effectiveness
    let typeEff = 1;
    (defender.types || []).forEach(t => {
        if (TYPE_CHART[move.type] && TYPE_CHART[move.type][t] !== undefined) {
             typeEff *= TYPE_CHART[move.type][t];
        }
    });

    // Burn (Physical only) - ignored for now as we don't track burn source perfectly
    // const burnMod = (isPhysical && attacker.condition === 'burn') ? 0.5 : 1;

    const modifier = stab * typeEff;

    const minDmg = Math.floor(base * modifier * 0.85);
    const maxDmg = Math.floor(base * modifier * 1.00);

    return { min: minDmg, max: maxDmg, typeEff };
};

const CombatSimulator: React.FC<Props> = ({ isOpen, onClose, allPokemon, playerNames, onUpdatePokemon }) => {
  // --- Global State ---
  const [activeOwner, setActiveOwner] = useState<'player1' | 'player2' | 'player3'>('player1');
  const [activeBox, setActiveBox] = useState<'party' | 'box'>('party'); 

  // --- Scenario State ---
  // Load from LocalStorage to persist across reloads
  const [activeTab, setActiveTab] = useState<'setup' | 'battle'>(() => 
      (localStorage.getItem('sim_activeTab') as 'setup' | 'battle') || 'setup'
  );
  const [weather, setWeather] = useState<string>(() => 
      localStorage.getItem('sim_weather') || 'none'
  );
  
  // --- Enemy State ---
  const [enemySpecies, setEnemySpecies] = useState(() => localStorage.getItem('sim_enemySpecies') || '');
  const [enemyLevel, setEnemyLevel] = useState(() => parseInt(localStorage.getItem('sim_enemyLevel') || '50'));
  
  const [enemyMoves, setEnemyMoves] = useState<string[]>(() => {
      try {
          return JSON.parse(localStorage.getItem('sim_enemyMoves') || '["", "", "", ""]');
      } catch { return ['', '', '', '']; }
  });

  const [enemyData, setEnemyData] = useState<EnemyMon | null>(() => {
      try {
          const saved = localStorage.getItem('sim_enemyData');
          return saved ? JSON.parse(saved) : null;
      } catch { return null; }
  });

  const [enemyLoading, setEnemyLoading] = useState(false);
  const [possibleEnemyMoves, setPossibleEnemyMoves] = useState<any[]>([]); 
  
  // Lists
  const [allSpeciesList, setAllSpeciesList] = useState<string[]>([]);
  const [allMovesList, setAllMovesList] = useState<string[]>([]);

  // Persistence Effects
  useEffect(() => { localStorage.setItem('sim_activeTab', activeTab); }, [activeTab]);
  useEffect(() => { localStorage.setItem('sim_weather', weather); }, [weather]);
  useEffect(() => { localStorage.setItem('sim_enemySpecies', enemySpecies); }, [enemySpecies]);
  useEffect(() => { localStorage.setItem('sim_enemyLevel', enemyLevel.toString()); }, [enemyLevel]);
  useEffect(() => { localStorage.setItem('sim_enemyMoves', JSON.stringify(enemyMoves)); }, [enemyMoves]);
  useEffect(() => { 
      if (enemyData) localStorage.setItem('sim_enemyData', JSON.stringify(enemyData)); 
      else localStorage.removeItem('sim_enemyData');
  }, [enemyData]);

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
            level: p.level || 50, // Default to 50
            types: p.types || [], // Default to empty (will load)
            currentHp: 100,
            maxHp: 100,
            baseStats: { hp: 50, attack: 50, defense: 50, 'special-attack': 50, 'special-defense': 50, speed: 50 },
            realStats: { hp: 100, attack: 50, defense: 50, 'special-attack': 50, 'special-defense': 50, speed: 50 },
            stages: { ...DEFAULT_STAGES },
            condition: 'none',
            volatiles: [],
            loadedMoves: []
        }));

        setBattleParty(initialParty);
        if (initialParty.length > 0) setActivePokemonId(initialParty[0].id);
        
        // Async Fetch Stats & Moves
        initialParty.forEach(p => {
             getPokemonDetails(p.species).then(d => {
                 if (d) {
                    const baseS = convertStatsApi(d.stats);
                    const lvl = p.level || 50;
                    
                    // Priority: Custom Saved Stats > Calculated from Base
                    let realS: StatProfile;
                    
                    if (p.stats) {
                        realS = { ...p.stats };
                    } else {
                        realS = {
                            hp: calculateStat(baseS.hp, lvl, true),
                            attack: calculateStat(baseS.attack, lvl, false),
                            defense: calculateStat(baseS.defense, lvl, false),
                            'special-attack': calculateStat(baseS['special-attack'], lvl, false),
                            'special-defense': calculateStat(baseS['special-defense'], lvl, false),
                            speed: calculateStat(baseS.speed, lvl, false),
                        };
                    }

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

             // Fetch Moves Details
             if (p.moves && p.moves.length > 0) {
                 const movePromises = p.moves.filter(m => m).map(m => getMoveDetails(m));
                 Promise.all(movePromises).then(movesData => {
                     const validMoves = movesData.filter(m => m) as ExtendedMove[];
                     setBattleParty(prev => prev.map(mons => 
                        mons.id === p.id ? { ...mons, loadedMoves: validMoves } : mons
                     ));
                 });
             }
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
      // Clear custom stats when level changes to allow formula to take over
      onUpdatePokemon(id, { level: val, stats: undefined });

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

  const [selectedMoveSlot, setSelectedMoveSlot] = useState<number | null>(null);
  const [lockedMoves, setLockedMoves] = useState<boolean[]>(() => {
      try {
          return JSON.parse(localStorage.getItem('sim_lockedMoves') || '[false, false, false, false]');
      } catch { return [false, false, false, false]; }
  });

  useEffect(() => { localStorage.setItem('sim_lockedMoves', JSON.stringify(lockedMoves)); }, [lockedMoves]);

  const updateEnemySpecies = (val: string) => {
      setEnemySpecies(val);
      // Only reset if empty moves - user might want to keep moves if just fixing typo
      // But typically new species = new moves. Let's keep existing behavior but maybe less aggressive?
      // No, strictly, species change invalidates moves usually.
      if (val !== enemySpecies) {
          setEnemyMoves(['', '', '', '']);
          setLockedMoves([false, false, false, false]);
          setPossibleEnemyMoves([]);
          setActiveTab('setup'); // Force setup on new species
          setEnemyData(null); // Clear battle data
      }
  };

  const handleFillMoves = () => {
      const newMoves = [...enemyMoves];
      // Get moves currently used to avoid duplicates (optional, but good)
      const used = new Set(newMoves.filter(m => m));
      
      const availableFillers = possibleEnemyMoves.filter(m => !used.has(m.name));
      let fillIndex = 0;
      
      newMoves.forEach((move, i) => {
          // Fill if unlocked and empty
          if (!lockedMoves[i] && !move && fillIndex < availableFillers.length) {
              newMoves[i] = availableFillers[fillIndex].name;
              fillIndex++;
          }
      });
      setEnemyMoves(newMoves);
  };

  const loadPreset = (preset: typeof TRAINER_PRESETS[0]) => {
      const p1 = preset.pokemon[0];
      setEnemySpecies(p1.species);
      setEnemyLevel(p1.level);
      const moves = p1.moves || ['', '', '', ''];
      while (moves.length < 4) moves.push('');
      setEnemyMoves(moves);
      setLockedMoves([true, true, true, true]); // Lock preset moves by default
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
               stages: { ...DEFAULT_STAGES },
               // New props
               currentHp: realS.hp,
               maxHp: realS.hp,
               condition: 'none'
           });
           setActiveTab('battle');
       } catch (e) {
           console.error(e);
       }
       setEnemyLoading(false);
  };

  // --- SOLVER LOGIC ---
  
  const analyzeMatchup = (myMon: BattlePokemon, enemy: EnemyMon, weather: string): AnalysisResult | null => {
      if (!myMon.realStats || !enemy.realStats) return null;

      // 1. Speed Check
      const mySpeed = myMon.realStats.speed * STAGE_MULTIPLIERS[myMon.stages.speed] * (myMon.condition === 'paralysis' ? 0.5 : 1);
      const enSpeed = enemy.realStats.speed * STAGE_MULTIPLIERS[enemy.stages.speed] * (enemy.condition === 'paralysis' ? 0.5 : 1);
      
      let speedResult: 'faster' | 'slower' | 'tie' = 'tie';
      if (mySpeed > enSpeed) speedResult = 'faster';
      else if (mySpeed < enSpeed) speedResult = 'slower';

      // 2. Incoming Damage (Survival)
      let maxIncomingPct = 0; // Relative to MAX HP (for risk assessment)
      let maxIncomingRaw = 0; // Raw damage for accurate turns to die
      let worstEnemyMoveStr = 'None';
      let enemyBestMove: ExtendedMove | null = null;
      let threateningMoves: { name: string, pct: number, isStatus?: boolean }[] = [];

      enemy.moveDetails.forEach(m => {
          if (m.damage_class === 'status') {
              // Status Move Threat Analysis
              if (m.meta && ['sleep', 'freeze'].includes(m.meta.ailment)) {
                   // High threat status
                   threateningMoves.push({ name: m.name, pct: 0, isStatus: true });
                   // If they outspeed and sleep us, it's effectively a "kill" in terms of momentum
                   if (speedResult === 'slower' && (m.accuracy || 100) > 60) {
                       maxIncomingPct = Math.max(maxIncomingPct, 999); // Force danger rating
                       worstEnemyMoveStr = `${m.name} (Control)`;
                   }
              }
              return;
          }
          const dmg = calculateDamage(enemy, myMon, m, weather);
          // Use Max Roll for safety
          const raw = dmg.max;
          const pct = Math.min(100, Math.ceil((raw / myMon.maxHp) * 100));
          
          if (raw > maxIncomingRaw) {
              maxIncomingRaw = raw;
              maxIncomingPct = pct;
              worstEnemyMoveStr = m.name;
              enemyBestMove = m;
          }
          if (pct >= 50) threateningMoves.push({ name: m.name, pct });
      });
      // Fallback if enemy has no moves loaded (unlikely via smart load) or only status
      if (maxIncomingPct === 0 && enemy.moveDetails.every(m => m.damage_class === 'status')) {
          worstEnemyMoveStr = 'Status Only';
      }

      // 3. Outgoing Damage (Kill Potential)
      let maxOutgoingPct = 0;
      let maxOutgoingRaw = 0;
      let bestMoveStr = 'None';
      let myBestMove: ExtendedMove | null = null;
      let killMoves: { name: string, pct: number }[] = [];

      // Use 'Struggle' logic as fallback, or simple type match if no moves known
      const myMovesToTest = myMon.loadedMoves && myMon.loadedMoves.length > 0 
          ? myMon.loadedMoves 
          : [{ name: 'Unknown Move', power: 60, type: (myMon.types || [])[0] || 'normal', damage_class: 'physical' } as ExtendedMove]; 

      myMovesToTest.forEach(m => {
          if (m.damage_class === 'status') return;
          const dmg = calculateDamage(myMon, enemy, m, weather);
          // Use Min Roll for reliability
          const raw = dmg.min;
          const pct = Math.floor((raw / enemy.maxHp) * 100); 
          
          if (raw > maxOutgoingRaw) {
              maxOutgoingRaw = raw;
              maxOutgoingPct = pct;
              bestMoveStr = m.name;
              myBestMove = m;
          }
          if (pct >= 50) killMoves.push({ name: m.name, pct });
      });

      // 4. Turn Analysis
      // turnsToDie: how many hits from enemy to kill me (Current HP)?
      const effectiveMyHp = myMon.currentHp ?? myMon.maxHp;
      const turnsToDie = maxIncomingRaw >= effectiveMyHp ? 1 : (maxIncomingRaw > 0 ? Math.ceil(effectiveMyHp / maxIncomingRaw) : 999);
      
      // Control Threat overrides turnsToDie
      const actualTurnsToDie = maxIncomingPct >= 999 ? 1 : turnsToDie;

      // turnsToWin: how many hits from me to kill enemy (Current HP)?
      const effectiveEnemyHp = enemy.currentHp ?? enemy.maxHp;
      const turnsToWin = maxOutgoingRaw >= effectiveEnemyHp ? 1 : (maxOutgoingRaw > 0 ? Math.ceil(effectiveEnemyHp / maxOutgoingRaw) : 999);

      // 5. Winning Score & Safety
      let score = 0;
      let safetyRating: 'Safe' | 'Trade' | 'Risky' | 'Dead' = 'Neutral' as any;

      // Simulation
      if (speedResult === 'faster') {
          // I go first.
          const hitsTaken = turnsToWin - 1; 
          const damageTaken = hitsTaken * maxIncomingRaw;
          
          if (hitsTaken < actualTurnsToDie) {
               // I win
               if (damageTaken === 0) {
                   safetyRating = 'Safe';
                   score = 100 + (maxOutgoingPct); 
               } else if (damageTaken < (effectiveMyHp * 0.5)) { // Less than 50% of CURRENT HP lost? No, risk is usually relative to total, but mid-battle, if I have 10HP and take 5dmg, is that safe? Yes.
                   safetyRating = 'Safe';
                   score = 80 - (damageTaken / myMon.maxHp * 100);
               } else if (damageTaken < (effectiveMyHp * 0.8)) {
                   safetyRating = 'Trade';
                   score = 60 - (damageTaken / myMon.maxHp * 100);
               } else if (damageTaken < effectiveMyHp) {
                   safetyRating = 'Risky';
                   score = 40 - (damageTaken / myMon.maxHp * 100);
               } else {
                   safetyRating = 'Dead'; 
                   score = -50;
               }
          } else {
              safetyRating = 'Dead';
              score = -100 + maxOutgoingPct; 
          }
      } else {
          // They go first.
          const hitsTaken = turnsToWin;
          const damageTaken = hitsTaken * maxIncomingRaw;

          if (hitsTaken < actualTurnsToDie) {
               // I survive the required hits
               if (damageTaken < (effectiveMyHp * 0.5)) {
                   safetyRating = 'Safe';
                   score = 70 - (damageTaken / myMon.maxHp * 100);
               } else if (damageTaken < (effectiveMyHp * 0.8)) {
                   safetyRating = 'Trade';
                   score = 50 - (damageTaken / myMon.maxHp * 100);
               } else if (damageTaken < effectiveMyHp) {
                   safetyRating = 'Risky';
                   score = 30 - (damageTaken / myMon.maxHp * 100);
               } else {
                   safetyRating = 'Dead';
                   score = -50;
               }
          } else {
               safetyRating = 'Dead';
               score = -100 + maxOutgoingPct;
          }
      }
      
      // Bonus penalty for "Control" danger
      if (maxIncomingPct === 999) {
           safetyRating = 'Dead'; 
           score = -200;
      }
      
      if (maxOutgoingPct >= 100) score += 50; 
      else if (maxOutgoingPct >= 50) score += 20;

      return {
          score,
          speedResult,
          mySpeed,
          enSpeed,
          // Revert 999 to 0 for display logic if needed or handle in UI
          maxIncomingPct: maxIncomingPct === 999 ? 0 : maxIncomingPct,
          worstEnemyMoveStr,
          enemyBestMove,
          maxOutgoingPct,
          bestMoveStr,
          myBestMove,
          turnsToWin,
          turnsToDie,
          safetyRating,
          isControlRisk: maxIncomingPct === 999
      };
  };
  
  const [selectedMatchupId, setSelectedMatchupId] = useState<string | null>(null);

  const sortedLeads = useMemo(() => {
      if (!enemyData || battleParty.length === 0) return [];
      
      return battleParty
        .filter(p => p.currentHp > 0)
        .map(p => {
            const analysis = analyzeMatchup(p, enemyData, weather);
            return { id: p.id, pokemon: p, analysis, score: analysis?.score || -999 };
        })
        .sort((a, b) => b.score - a.score);
  }, [battleParty, enemyData, weather]);


    // STRATEGY CALCULATOR for when things go wrong
    const strategySuggestion = useMemo(() => {
        if (!enemyData || sortedLeads.length === 0) return null;

        // If even our best lead is risky/dead, we need a plan.
        const bestLead = sortedLeads[0];
        if (bestLead.analysis && (bestLead.analysis.safetyRating === 'Dead' || bestLead.analysis.safetyRating === 'Risky')) {
            // Find Cleaners: Pokemon that can kill 
            // Find Chippers: Pokemon that can deal dmg or status

            const cleaners = sortedLeads.filter(l => l.analysis && l.analysis.turnsToWin <= 2); // Can kill quickly
            const sacrifices = sortedLeads.filter(l => {
                if (!l.analysis) return false;
                // Good sacrifice: Outspeeds (guaranteed hit) OR can survive 1 hit
                const guaranteedAction = l.analysis.speedResult === 'faster' || l.analysis.safetyRating !== 'Dead';
                return guaranteedAction && (l.analysis.maxOutgoingPct > 10 || l.analysis.myBestMove?.damage_class === 'status');
            });
            
            // Prefer sacrifices that are NOT best cleaners
            const pureSacrifices = sacrifices.filter(s => !cleaners.find(c => c.id === s.id));

            if (pureSacrifices.length > 0 && cleaners.length > 0) {
                 const sac = pureSacrifices[0];
                 const finish = cleaners[0];
                 
                 return {
                     type: 'sac_swap',
                     step1: `Lead ${sac.pokemon.nickname || sac.pokemon.species}`,
                     step1Detail: `Use ${sac.analysis?.bestMoveStr} (~${sac.analysis?.maxOutgoingPct}%)`,
                     step2: `Let it faint, then send ${finish.pokemon.nickname || finish.pokemon.species}`,
                     step2Detail: `Clean up with ${finish.analysis?.bestMoveStr}`
                 };
            }
        }
        return null;
    }, [sortedLeads, enemyData]);


  // Set default selection when leads change
  useEffect(() => {
     if (sortedLeads.length > 0 && !selectedMatchupId) {
         setSelectedMatchupId(sortedLeads[0].id);
     }
  }, [sortedLeads]);

  const activeMatchup = sortedLeads.find(l => l.id === selectedMatchupId) || sortedLeads[0];
  const isSafe = activeMatchup?.analysis?.safetyRating === 'Safe';
  const isDead = activeMatchup?.analysis?.safetyRating === 'Dead';
  
  // Handlers for Enemy Mid-Battle Edits
  const handleEnemyHpEdit = (val: number) => {
      if(!enemyData) return;
      setEnemyData({ ...enemyData, currentHp: val });
  };

  const handleEnemyStatusEdit = (status: string) => {
     if(!enemyData) return;
     setEnemyData({ ...enemyData, condition: enemyData.condition === status ? 'none' : status });
  };

  const handleEnemyStageEdit = (stat: keyof StatStages, val: number) => {
      if(!enemyData) return;
      setEnemyData({ ...enemyData, stages: { ...enemyData.stages, [stat]: val } });
  };


  return (
    <AnimatePresence>
        {isOpen && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={onClose}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            >
            <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ duration: 0.3, type: "spring", bounce: 0.3 }}
                onClick={e => e.stopPropagation()}
                className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100"
            >
        
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
           <div className="flex items-center gap-3">
               <Sword className="text-zinc-400" />
               <h2 className="text-xl font-bold text-zinc-100">Battle Simulator</h2>
               <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1 text-xs ml-4">
                   <button onClick={() => setActiveTab('setup')} className={`px-3 py-1 rounded transition-colors ${activeTab === 'setup' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Setup</button>
                   <button onClick={() => setActiveTab('battle')} className={`px-3 py-1 rounded transition-colors ${activeTab === 'battle' ? 'bg-zinc-100 text-zinc-900 font-bold' : 'text-zinc-500 hover:text-zinc-300'}`} disabled={!enemyData}>Battle</button>
               </div>

                {/* Weather Controls */}
               <div className="hidden md:flex bg-zinc-900 border border-zinc-800 rounded-lg p-1 ml-4 items-center">
                    <span className="text-[10px] uppercase font-bold text-zinc-600 px-2 select-none">Wx</span>
                   {(['none', 'sun', 'rain', 'sand', 'hail'] as const).map(w => (
                       <button 
                           key={w}
                           onClick={() => setWeather(w)}
                           className={`p-1.5 rounded transition-colors ${weather === w ? 'bg-zinc-800 text-yellow-500' : 'text-zinc-600 hover:text-zinc-400'}`}
                           title={`Weather: ${w.charAt(0).toUpperCase() + w.slice(1)}`}
                        >
                            {w === 'none' && <span className="text-xs font-bold px-1">—</span>}
                            {w === 'sun' && <Sun size={14} />}
                            {w === 'rain' && <CloudRain size={14} />}
                            {w === 'sand' && <Wind size={14} />}
                            {w === 'hail' && <Cloud size={14} />}
                        </button>
                   ))}
               </div>
           </div>
           
           <div className="flex gap-2">
                 {/* Box Selector for Context */}
                 <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                     {(['party', 'box'] as const).map(b => (
                        <button 
                            key={b} 
                            onClick={() => setActiveBox(b)} 
                            className={`px-3 py-1 text-xs font-bold uppercase rounded transition-colors ${activeBox === b ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >
                            {b}
                        </button>
                     ))}
                 </div>

                 <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                    {(['player1', 'player2', 'player3'] as const).map(p => {
                        const name = playerNames?.[p as keyof typeof playerNames] || p.replace('player', 'P');
                        return (
                            <button key={p} onClick={() => setActiveOwner(p)} className={`px-3 py-1 text-xs font-bold uppercase rounded transition-colors ${activeOwner === p ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-600 hover:text-zinc-400'}`}>
                                {name}
                            </button>
                        );
                    })}
                 </div>
                 <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-full transition text-zinc-500 hover:text-zinc-200"><X className="w-5 h-5" /></button>
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
                                                {stat === 'hp' && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[9px] text-zinc-500">Cur</span>
                                                        <input 
                                                            type="number" 
                                                            className="w-10 bg-zinc-950 border border-zinc-800 text-right px-1 rounded no-spinner focus:border-blue-500 outline-none text-zinc-300"
                                                            value={mon.currentHp ?? mon.maxHp}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value) || 0;
                                                                setBattleParty(prev => prev.map(p => p.id === mon.id ? { ...p, currentHp: val } : p));
                                                            }} 
                                                        />
                                                        <span className="text-zinc-600">/</span>
                                                    </div>
                                                )}
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
                                            onChange={updateEnemySpecies} 
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
                                    <label className="text-xs text-zinc-500 mb-1 block uppercase font-bold flex justify-between items-center">
                                       <span>Enemy Moves</span>
                                       {possibleEnemyMoves.length > 0 && (
                                           <button onClick={handleFillMoves} className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30 transition">
                                               <TrendingUp size={10} /> Smart Fill
                                           </button>
                                       )}
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[0,1,2,3].map(i => (
                                            <div 
                                                key={i} 
                                                className={`relative flex items-center bg-black border rounded transition ${selectedMoveSlot === i ? 'border-red-500 ring-1 ring-red-500' : 'border-zinc-800'}`}
                                                onClick={() => setSelectedMoveSlot(i)}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <AutocompleteInput 
                                                        options={allMovesList.length > 0 ? allMovesList : possibleEnemyMoves.map((m: any) => m.name)}
                                                        value={enemyMoves[i] || ''}
                                                        onChange={(val) => {
                                                            if (lockedMoves[i]) return;
                                                            const n = [...enemyMoves];
                                                            n[i] = val;
                                                            setEnemyMoves(n);
                                                        }}
                                                        placeholder={`Move ${i+1}`}
                                                        className="bg-transparent border-none text-xs p-2 w-full focus:outline-none focus:ring-0"
                                                    />
                                                </div>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const n = [...lockedMoves];
                                                        n[i] = !n[i];
                                                        setLockedMoves(n);
                                                    }}
                                                    className={`p-2 hover:bg-zinc-900 rounded-r transition ${lockedMoves[i] ? 'text-red-400' : 'text-zinc-600'}`}
                                                    title={lockedMoves[i] ? "Unlock Move" : "Lock Move"}
                                                >
                                                    {lockedMoves[i] ? <Shield size={12} className="fill-current" /> : <Shield size={12} />}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* Known Move Pool */}
                                    {possibleEnemyMoves.length > 0 && (
                                       <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                                           <label className="text-[10px] text-zinc-600 mb-1 block uppercase font-bold flex justify-between">
                                               <span>Known Move Pool (Click to assign)</span>
                                           </label>
                                           <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto custom-scrollbar p-1.5 border border-zinc-800 rounded bg-black/40">
                                               {possibleEnemyMoves.map((m: any) => (
                                                   <button
                                                       key={m.name}
                                                       onClick={() => {
                                                           // If slot selected, use that
                                                           if (selectedMoveSlot !== null) {
                                                               if (lockedMoves[selectedMoveSlot]) return; // Or maybe show warning
                                                               const n = [...enemyMoves];
                                                               n[selectedMoveSlot] = m.name;
                                                               setEnemyMoves(n);
                                                               // Optional: Advance selection?
                                                               // setSelectedMoveSlot((selectedMoveSlot + 1) % 4);
                                                           } else {
                                                               // Fallback: Fill first empty
                                                               const emptyIndex = enemyMoves.findIndex((x, idx) => !x && !lockedMoves[idx]);
                                                               if (emptyIndex !== -1) {
                                                                   const n = [...enemyMoves];
                                                                   n[emptyIndex] = m.name;
                                                                   setEnemyMoves(n);
                                                               } else {
                                                                   // Or replace last unlocked? logic from before
                                                                   // Find last unlocked
                                                                    const lastUnlocked = [3,2,1,0].find(idx => !lockedMoves[idx]);
                                                                    if (lastUnlocked !== undefined) {
                                                                        const n = [...enemyMoves];
                                                                        n[lastUnlocked] = m.name;
                                                                        setEnemyMoves(n); 
                                                                    }
                                                               }
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
                                    className="w-full py-3 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-lg shadow-zinc-900/20"
                                >
                                    {enemyLoading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-zinc-950/20 border-t-zinc-950"></div> : <Crosshair className="w-4 h-4" />}
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
                        <div className="h-56 shrink-0 bg-gradient-to-b from-zinc-900 to-zinc-950 flex flex-col items-center justify-center border-b border-zinc-800 relative">
                             <div className="absolute inset-0 opacity-10" style={{background: `radial-gradient(circle at center, ${TYPE_COLORS[enemyData.types[0]]} 0%, transparent 70%)`}}></div>
                             
                             <div className="flex items-center gap-8 relative z-10 scale-90 md:scale-100 mt-2">
                                  <div className="relative group cursor-help">
                                      {/* Status Badge */}
                                      {enemyData.condition !== 'none' && (
                                          <div className="absolute -top-2 -right-2 z-20 px-1.5 py-0.5 rounded bg-purple-600 text-[10px] font-bold text-white shadow-lg border border-purple-400">
                                              {enemyData.condition.slice(0,3).toUpperCase()}
                                          </div>
                                      )}

                                      <img 
                                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${enemyData.id}.png`} 
                                        className="w-24 h-24 pixelated drop-shadow-2xl" 
                                        alt={enemyData.species} 
                                      />
                                      {/* Tooltip Stats - now clickable? maybe no need since we added editors below */}
                                  </div>
                                  
                                  <div className="text-center w-64">
                                      <h2 className="text-2xl font-black uppercase tracking-widest text-white drop-shadow-md">{enemyData.species}</h2>
                                      
                                      {/* HP Slider */}
                                      <div className="mt-2 text-xs font-bold text-zinc-400 flex items-center gap-2">
                                          <span>HP</span>
                                          <input 
                                              type="range" 
                                              min={0} 
                                              max={enemyData.maxHp} 
                                              value={enemyData.currentHp}
                                              onChange={(e) => handleEnemyHpEdit(parseInt(e.target.value))}
                                              className="flex-1 h-1.5 bg-zinc-700 rounded-full accent-green-500 cursor-pointer"
                                          />
                                          <span className="w-8 text-right text-white">{Math.ceil((enemyData.currentHp / enemyData.maxHp) * 100)}%</span>
                                      </div>

                                      <div className="flex justify-center gap-2 mt-2">
                                          {enemyData.types.map(t => (
                                              <span key={t} className="px-2 py-0.5 rounded text-[10px] font-bold uppercase text-black" style={{backgroundColor: TYPE_COLORS[t] || '#ccc'}}>{t}</span>
                                          ))}
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400">Lvl {enemyData.level}</span>
                                      </div>
                                  </div>
                             </div>

                             {/* Mid-Battle Controls */}
                             <div className="flex items-center gap-4 mt-2 z-10 bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
                                 {/* Status Toggles */}
                                 <div className="flex gap-1">
                                     {['paralysis', 'burn', 'sleep'].map(s => (
                                         <button 
                                            key={s} 
                                            onClick={() => handleEnemyStatusEdit(s)}
                                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold uppercase transition ${enemyData.condition === s ? 'bg-purple-500 text-white shadow-lg' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}
                                            title={s}
                                         >
                                             {s[0]}
                                         </button>
                                     ))}
                                 </div>
                                 <div className="w-px h-4 bg-zinc-700"></div>
                                 {/* Stat Stages */}
                                 <div className="flex gap-2">
                                     {([{k: 'attack', l: 'Atk'}, {k: 'defense', l: 'Def'}, {k: 'special-attack', l: 'SpA'}, {k: 'special-defense', l: 'SpD'}, {k: 'speed', l: 'Spe'}] as const).map(os => (
                                         <div key={os.k} className="flex flex-col items-center">
                                             <div className="flex bg-zinc-900 rounded border border-zinc-700 overflow-hidden">
                                                <button onClick={() => handleEnemyStageEdit(os.k, Math.max(-6, enemyData.stages[os.k] - 1))} className="w-4 h-4 flex items-center justify-center text-[10px] hover:bg-zinc-800">-</button>
                                                <span className={`w-4 h-4 flex items-center justify-center text-[8px] font-bold ${enemyData.stages[os.k] > 0 ? 'text-green-400' : enemyData.stages[os.k] < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                                                    {enemyData.stages[os.k]}
                                                </span>
                                                <button onClick={() => handleEnemyStageEdit(os.k, Math.min(6, enemyData.stages[os.k] + 1))} className="w-4 h-4 flex items-center justify-center text-[10px] hover:bg-zinc-800">+</button>
                                             </div>
                                             <span className="text-[6px] uppercase font-bold text-zinc-500 mt-0.5">{os.l}</span>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                        </div>

                        {/* Analysis Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-zinc-950">

                            {/* Strategy Prompt */}
                            {strategySuggestion && (
                                <div className="mb-6 p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl animate-in fade-in slide-in-from-top-4">
                                    <div className="flex items-center gap-2 mb-2 text-purple-300 font-bold text-xs uppercase tracking-wider">
                                        <TrendingUp className="w-4 h-4" /> Tactical Suggestion (Survival Mode)
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                                        <div className="flex flex-col items-center">
                                            <span className="font-bold text-white shrink-0">{strategySuggestion.step1}</span>
                                            <span className="text-[10px] text-zinc-500">{strategySuggestion.step1Detail}</span>
                                        </div>
                                        <div className="h-px bg-zinc-700 w-8 mx-2 relative">
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-zinc-500 rounded-full"></div>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="font-bold text-white shrink-0">{strategySuggestion.step2}</span>
                                            <span className="text-[10px] text-zinc-500">{strategySuggestion.step2Detail}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Selected Matchup Analysis (Mid-Battle) */}
                            {activeMatchup && activeMatchup.analysis && (
                                <div className="mb-6 animate-in slide-in-from-left-2 duration-300">
                                    <h3 className="text-zinc-500 font-bold text-xs uppercase mb-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-500" /> Active Scenario</div>
                                        <span className="text-[10px] text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded">Selected from Party below</span>
                                    </h3>
                                    
                                    <div className={`border p-4 rounded-xl flex items-center gap-4 shadow-lg transition-colors ${
                                        isSafe ? 'bg-gradient-to-r from-emerald-900/20 to-zinc-900 border-emerald-500/30 shadow-emerald-900/10' :
                                        isDead ? 'bg-gradient-to-r from-red-900/20 to-zinc-900 border-red-500/30' :
                                        'bg-gradient-to-r from-yellow-900/20 to-zinc-900 border-yellow-500/30'
                                    }`}>
                                        <div className={`p-3 rounded-full border ${
                                            isSafe ? 'bg-emerald-500/10 border-emerald-500/20' : 
                                            isDead ? 'bg-red-500/10 border-red-500/20' : 'bg-yellow-500/10 border-yellow-500/20' 
                                        }`}>
                                            <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${activeMatchup.pokemon.dexId}.png`} className="w-12 h-12 pixelated object-contain" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xl font-bold text-white leading-none mb-1 flex items-center justify-between">
                                                <span>{activeMatchup.pokemon.nickname || activeMatchup.pokemon.species}</span>
                                                <div className="flex gap-1">
                                                     <span className="text-[10px] bg-zinc-950 px-1.5 py-0.5 rounded text-zinc-400 font-mono">
                                                         {activeMatchup.pokemon.currentHp}/{activeMatchup.pokemon.maxHp} HP
                                                     </span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col gap-1 mt-2">
                                                 <div className="flex items-center gap-2 text-xs">
                                                      <span className={`font-bold px-1.5 py-0.5 rounded ${
                                                          isSafe ? 'bg-emerald-500/20 text-emerald-400' :
                                                          activeMatchup.analysis.safetyRating === 'Trade' ? 'bg-yellow-500/20 text-yellow-400' :
                                                          'bg-red-500/20 text-red-400'
                                                      }`}>{activeMatchup.analysis.safetyRating.toUpperCase()} MATCHUP</span>
                                                      
                                                      <span className="text-zinc-500">
                                                         {activeMatchup.analysis.speedResult === 'faster' ? 'Outspeeds' : activeMatchup.analysis.speedResult === 'tie' ? 'Speed Tie' : 'Outspeeded'}
                                                      </span>
                                                 </div>

                                                 <div className="mt-2 bg-black/50 border border-white/5 rounded p-2 text-xs font-mono space-y-1">
                                                     <div className="flex justify-between items-center">
                                                         <span className="text-zinc-500 uppercase text-[10px] tracking-wider font-bold">Recommended</span>
                                                         <span className="text-zinc-300 truncate ml-2">Use <span className="text-emerald-400 font-bold">{activeMatchup.analysis.bestMoveStr}</span> (~{activeMatchup.analysis.maxOutgoingPct}%)</span>
                                                     </div>
                                                     <div className="flex justify-between items-center">
                                                         <span className="text-zinc-500 uppercase text-[10px] tracking-wider font-bold">Threat</span>
                                                         <span className="text-zinc-300 truncate ml-2">Expect <span className="text-red-400 font-bold">{activeMatchup.analysis.worstEnemyMoveStr}</span> ({activeMatchup.analysis.isControlRisk ? 'CC' : `~${activeMatchup.analysis.maxIncomingPct}%`})</span>
                                                     </div>
                                                 </div>
                                            </div>
                                        </div>
                                        <div className={`text-right px-4 border-l flex flex-col items-end justify-center min-w-[80px] ${isSafe ? 'border-emerald-500/20' : isDead ? 'border-red-500/20' : 'border-yellow-500/20'}`}>
                                            <div className={`text-2xl font-black ${isSafe ? 'text-emerald-400' : isDead ? 'text-red-400' : 'text-yellow-400'}`}>
                                                {isDead && (activeMatchup.analysis.turnsToDie < activeMatchup.analysis.turnsToWin || activeMatchup.analysis.isControlRisk) ? (
                                                    <span className="text-red-500">LOSS</span>
                                                ) : (
                                                    <>{activeMatchup.analysis.turnsToWin} <span className="text-xs font-normal text-zinc-500">Turn KO</span></>
                                                )}
                                            </div>
                                            {isDead && (
                                                <span className="text-[10px] text-red-500 font-bold uppercase">{activeMatchup.analysis.isControlRisk ? 'CC Threat' : 'Lethal Risk'}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Party Grid */}
                            <h3 className="text-zinc-500 font-bold text-xs uppercase mb-3">Party Switch-Ins</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {sortedLeads.map(item => {
                                    if (!item.analysis) return null;
                                    const safe = item.analysis.safetyRating === 'Safe';
                                    const dead = item.analysis.safetyRating === 'Dead';
                                    const isSelected = selectedMatchupId === item.id;
                                    
                                    return (
                                    <button 
                                        key={item.id} 
                                        onClick={() => setSelectedMatchupId(item.id)}
                                        className={`bg-zinc-900 border p-3 rounded-lg flex items-center gap-3 transition hover:bg-zinc-800 text-left relative ${
                                            isSelected ? 'ring-2 ring-blue-500 bg-zinc-800' : ''
                                        } ${safe ? 'border-zinc-800' : dead ? 'border-red-900/30 bg-red-900/5' : 'border-yellow-900/30 bg-yellow-900/5'}`}
                                    >
                                        <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${item.pokemon.dexId}.png`} className="w-10 h-10 pixelated opacity-80" />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold truncate text-zinc-300">{item.pokemon.nickname || item.pokemon.species}</div>
                                            <div className="flex flex-col gap-0.5 overflow-hidden">
                                                 <div className="text-[10px] text-zinc-500 flex justify-between">
                                                     <span>Deal: {item.analysis.maxOutgoingPct}%</span>
                                                     <span>Take: {item.analysis.maxIncomingPct}%</span>
                                                 </div>
                                                 <div className={`text-[10px] font-bold ${dead ? 'text-red-500' : 'text-zinc-400'}`}>
                                                     {dead ? `Dies in ${item.analysis.turnsToDie} turn(s)` : `Wins in ${item.analysis.turnsToWin} turn(s)`}
                                                 </div>
                                            </div>
                                        </div>
                                        <div className={`text-lg font-bold ${safe ? 'text-zinc-600' : 'text-red-500'}`}>
                                            {item.analysis.safetyRating === 'Safe' ? 'OK' : '!!'}
                                        </div>
                                    </button>
                                )})}
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
      </motion.div>
    </motion.div>
    )}
    </AnimatePresence>
  );
};

export default CombatSimulator;
