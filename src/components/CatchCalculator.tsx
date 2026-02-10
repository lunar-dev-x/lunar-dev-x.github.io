import React, { useState, useEffect } from 'react';
import { getPokemonDetails, getAllPokemonNames } from '../utils/pokeApi';
import { Target, X } from 'lucide-react';
import AutocompleteInput from './AutocompleteInput';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  // If invoked from a specific pokemon context, these can be prefilled
  initialSpecies?: string;
  initialLevel?: number;
  initialStatus?: string;
}

const BALLS: Record<string, number> = {
    'Poke Ball': 1,
    'Great Ball': 1.5,
    'Ultra Ball': 2,
    'Master Ball': 255, // Always catches
    'Premier Ball': 1,
    'Net Ball': 1, // Logic handled in calc
    'Nest Ball': 1, // Logic handled in calc
    'Dive Ball': 1, // Logic handled in calc
    'Dusk Ball': 1, // Logic handled in calc
    'Timer Ball': 1, // Logic handled in calc
    'Quick Ball': 1, // Logic handled in calc
    'Repeat Ball': 1, // Logic handled in calc
    'Luxury Ball': 1,
    'Heal Ball': 1
};

const STATUS_MULTIPLIERS: Record<string, number> = {
    'None': 1,
    'Sleep': 2.5,
    'Freeze': 2.5,
    'Paralysis': 1.5,
    'Poison': 1.5,
    'Burn': 1.5
};

const CatchCalculator: React.FC<Props> = ({ isOpen, onClose, initialSpecies = '', initialLevel = 20, initialStatus = 'None' }) => {
  const [species, setSpecies] = useState(initialSpecies);
  const [level, setLevel] = useState(initialLevel);
  const [hpPercent, setHpPercent] = useState(100);
  const [status, setStatus] = useState<string>(initialStatus);
  const [ball, setBall] = useState<string>('Poke Ball');
  
  // Specific Ball Conditions
  const [isDarkCave, setIsDarkCave] = useState(false); // Dusk Ball
  const [isFishingSurfing, setIsFishingSurfing] = useState(false); // Dive Ball
  const [turnCount, setTurnCount] = useState(1); // Timer Ball
  const [isWaterBug, setIsWaterBug] = useState(false); // Net Ball
  const [dexCaught, setDexCaught] = useState(false); // Repeat Ball
  
  const [catchRate, setCatchRate] = useState<number | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [allSpecies, setAllSpecies] = useState<string[]>([]);
  
  useEffect(() => {
     getAllPokemonNames().then(setAllSpecies);
  }, []);

  useEffect(() => {
    // Only fetch if species is exactly in the list (prevents 404 spam)
    if (species && allSpecies.includes(species.toLowerCase())) {
        setLoading(true);
        getPokemonDetails(species).then(data => {
            if (data && data.capture_rate) {
                setCatchRate(data.capture_rate);
                // Simple Net Ball Check (if types include water or bug)
                setIsWaterBug(data.types.includes('water') || data.types.includes('bug'));
            } else {
                setCatchRate(null);
            }
            setLoading(false);
        });
    }
  }, [species, allSpecies]);

  // Gen 5 Formula
  // B = (((3 * MaxHP - 2 * HP) * Rate * BallMod) / (3 * MaxHP)) * StatusMod
  // If B >= 255, catch is guaranteed.
  // Else, G = (1048560 / sqrt(sqrt(16711680 / B)))   <-- approximation for shake checks
  // P = (G / 65535) ^ 4
  
  useEffect(() => {
      if (!catchRate) return;

      let ballMod = BALLS[ball];
      
      // Special Ball Logic
      if (ball === 'Net Ball' && isWaterBug) ballMod = 3.5; // Gen 5: 3.5x if water/bug
      else if (ball === 'Net Ball') ballMod = 1;
      
      if (ball === 'Nest Ball') ballMod = Math.max(1, (41 - level) / 10); // Gen 5 formula
      
      if (ball === 'Dive Ball' && isFishingSurfing) ballMod = 3.5;
      else if (ball === 'Dive Ball') ballMod = 1;

      if (ball === 'Dusk Ball' && isDarkCave) ballMod = 3.5;
      else if (ball === 'Dusk Ball') ballMod = 1;

      if (ball === 'Timer Ball') ballMod = Math.min(4, 1 + (turnCount * 0.3)); // Gen 5: 1 + 0.3 turns (max 4)

      if (ball === 'Quick Ball' && turnCount === 1) ballMod = 5; // Gen 5: 5x on turn 1
      else if (ball === 'Quick Ball') ballMod = 1;

      if (ball === 'Repeat Ball' && dexCaught) ballMod = 3.5; // Gen 5: 3.5 instead of 3
      else if (ball === 'Repeat Ball') ballMod = 1;

      const hpFactor = ((3 * 100) - (2 * hpPercent)) / (3 * 100); 
      // Using 100 as base since input is percentage. (3*Max - 2*Current)/3*Max simplifies to (3 - 2*Pct)/3
      
      const statusMod = STATUS_MULTIPLIERS[status];

      // Final B Calculation
      const bValue = catchRate * ballMod * hpFactor * statusMod;
      
      if (bValue >= 255) {
          setResult(100);
      } else {
          // Calculate Probability roughly
          // Shake probability P = (bValue/255)^0.75 (approximation)
          // Actually Gen 3/4 formula is widely used approx for Gen 5 before Critical Capture logic
          // Let's use a standard approximation for %
          // P = Status * (MaxHP * 3 - HP * 2) / (MaxHP * 3) * Rate * Ball / 255
          // If result > 1, it's 100%.
          // Correct simple formula (Gen 3-4 style, closest to Gen 5):
          // Modified Catch Rate X = B
          
          // Shake probability Y = 65536 / (255/X)^0.1875 is too complex to calc exactly without bit shifting
          // Linear approx: (X / 255) * 100 is often displayed, but inaccurate for >50
          
          // Using Bulbapedia Simplified Gen 5:
          // CatchProb = (X / 255) roughly determines if it catches directly?
          // No, it determines shake checks.
          // Let's simply display the modified catch rate value normalized to 255 for "Ease"
          // Or Probability: P = (B/255) roughly? No.
          
          // Let's use the DragonFlyCave approximation for UX
          // P ~ (Status * (3Max - 2Cur) * Rate * Ball) / (3Max * 255)
          const p = bValue / 255;
          setResult(Math.min(100, p * 100)); 
      }
      
  }, [catchRate, ball, hpPercent, status, isDarkCave, isFishingSurfing, turnCount, isWaterBug, dexCaught, level]);

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
             onClick={e => e.stopPropagation()}
             className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-lg w-full shadow-2xl overflow-y-auto max-h-[90vh]"
          >
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                <Target className="text-zinc-100" /> Catch Calculator
            </h3>
            <button onClick={onClose}><X className="text-zinc-500 hover:text-white" /></button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="col-span-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Pokemon Species</label>
                <AutocompleteInput 
                    className="w-full bg-zinc-800 border-zinc-700 rounded px-3 py-2 text-zinc-200 outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="e.g. Mewtwo"
                    value={species}
                    onChange={setSpecies}
                    options={allSpecies}
                />
            </div>
            
            <div>
                <label className="text-xs font-bold text-zinc-500 uppercase">Level</label>
                <input type="number" className="w-full bg-zinc-800 border-zinc-700 rounded px-3 py-2 text-zinc-200"
                    value={level} onChange={e => setLevel(Number(e.target.value))} />
            </div>

            <div>
                <label className="text-xs font-bold text-zinc-500 uppercase">HP %</label>
                <input type="number" min="1" max="100" className="w-full bg-zinc-800 border-zinc-700 rounded px-3 py-2 text-zinc-200"
                    value={hpPercent} onChange={e => setHpPercent(Number(e.target.value))} />
            </div>

            <div>
                <label className="text-xs font-bold text-zinc-500 uppercase">Status</label>
                <select className="w-full bg-zinc-800 border-zinc-700 rounded px-3 py-2 text-zinc-200"
                    value={status} onChange={e => setStatus(e.target.value)}>
                    {Object.keys(STATUS_MULTIPLIERS).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            <div>
                <label className="text-xs font-bold text-zinc-500 uppercase">Ball</label>
                <select className="w-full bg-zinc-800 border-zinc-700 rounded px-3 py-2 text-zinc-200"
                    value={ball} onChange={e => setBall(e.target.value)}>
                    {Object.keys(BALLS).map(b => <option key={b} value={b}>{b}</option>)}
                </select>
            </div>
            
            <div className="col-span-2 grid grid-cols-2 gap-2 bg-zinc-800/50 p-3 rounded-lg">
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input type="checkbox" checked={isDarkCave} onChange={e => setIsDarkCave(e.target.checked)} />
                    Night / Cave
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input type="checkbox" checked={isFishingSurfing} onChange={e => setIsFishingSurfing(e.target.checked)} />
                    Surfing / Fishing
                </label>
                 <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input type="checkbox" checked={dexCaught} onChange={e => setDexCaught(e.target.checked)} />
                    Caught Before
                </label>
                 <div className="flex items-center gap-2 text-sm text-zinc-300">
                    <span>Turn:</span>
                    <input type="number" min="1" className="w-16 bg-zinc-900 border-zinc-700 rounded px-2 py-1"
                        value={turnCount} onChange={e => setTurnCount(Number(e.target.value))} />
                </div>
            </div>
        </div>

        <div className="bg-zinc-950 rounded-xl p-6 text-center border border-zinc-800">
            {loading ? (
                <span className="text-zinc-500">Loading catch rate data...</span>
            ) : catchRate === null ? (
                <span className="text-zinc-500">Enter a valid Pokemon species</span>
            ) : (
                <>
                    <div className="text-4xl font-bold text-white mb-2">{result?.toFixed(1)}%</div>
                    <div className="text-sm text-zinc-400">Estimated Catch Chance</div>
                    
                     <div className="mt-4 flex justify-center gap-2 text-xs text-zinc-600">
                        <span>Base Rate: {catchRate}</span>
                        <span>•</span>
                        <span>Water/Bug: {isWaterBug ? 'Yes' : 'No'}</span>
                    </div>
                </>
            )}
        </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
export default CatchCalculator;
