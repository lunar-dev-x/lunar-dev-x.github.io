import React from 'react';
import { BADGES, FINAL_CAPS } from '../utils/gameData';
import { Shield, Target, Sword } from 'lucide-react';

interface Props {
  badges: number;
  onUpdateBadges: (count: number) => void;
  onOpenTeamAnalysis: () => void;
  onOpenCatchCalc: () => void;
  onOpenCombatSim: () => void;
}

const BadgeTracker: React.FC<Props> = ({ badges = 0, onUpdateBadges, onOpenTeamAnalysis, onOpenCatchCalc, onOpenCombatSim }) => {
  const currentCap = badges < 8 ? BADGES[badges]?.levelCap : (badges === 8 ? FINAL_CAPS.e4 : FINAL_CAPS.ghetsis);
  // 0 Badges = Lv 10 limit. 1 Badge = Lv 20 (Trio's obedience), etc.
  const currentObedience = badges === 0 ? 10 : BADGES[badges - 1].obedience;
  
  return (
    <div className="flex items-center gap-4 bg-zinc-900/50 backdrop-blur-md rounded-full px-4 py-2 border border-zinc-800 shadow-xl">
        {/* Badge Row */}
        <div className="flex -space-x-1">
            {BADGES.map((b, i) => {
                const isUnlocked = i < badges;
                return (
                    <button
                        key={b.id}
                        onClick={() => onUpdateBadges(isUnlocked ? i : i + 1)}
                        className={`relative w-8 h-8 rounded-full border-2 transition-all duration-300 group overflow-hidden ${isUnlocked ? 'border-amber-400 bg-zinc-900 grayscale-0 scale-100 z-10' : 'border-zinc-700 bg-zinc-950 grayscale opacity-40 scale-90 z-0 hover:scale-100 hover:opacity-100'}`}
                        title={b.name}
                    >
                        <img src={b.img} alt={b.name} className="w-full h-full object-cover" />
                    </button>
                );
            })}
        </div>

        {/* Level Cap */}
        <div className="flex flex-col items-start min-w-[80px]">
            <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Level Cap</span>
            <span className="text-xl font-mono font-bold text-amber-400 leading-none">Lv.{currentCap}</span>
        </div>
        
        <div className="w-px h-8 bg-zinc-700 mx-1"></div>

        {/* Obedience Cap */}
        <div className="flex flex-col items-start min-w-[80px]">
             <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Obedience</span>
             <span className="text-xl font-mono font-bold text-emerald-400 leading-none">Lv.{currentObedience}</span>
        </div>

        <div className="w-px h-8 bg-zinc-700 mx-1"></div>

        {/* Tools */}
        <div className="flex gap-2">
            <button 
                onClick={onOpenTeamAnalysis}
                className="p-2 rounded-full bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30 transition shadow-lg shadow-indigo-500/10" title="Team Analysis"
            >
                <Shield size={16} />
            </button>
            <button 
                onClick={onOpenCatchCalc}
                className="p-2 rounded-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition" title="Catch Calculator"
            >
                <Target size={16} />
            </button>
            <button 
                onClick={onOpenCombatSim}
                className="p-2 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 transition" title="Combat Simulator"
            >
                <Sword size={16} />
            </button>
        </div>
    </div>
  );
};

export default BadgeTracker;
