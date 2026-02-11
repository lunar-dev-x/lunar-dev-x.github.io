// Gen 5 Type Chart (1 = normal, 2 = super, 0.5 = not very, 0 = immune)
// Types: Normal, Fire, Water, Grass, Electric, Ice, Fighting, Poison, Ground, Flying, Psychic, Bug, Rock, Ghost, Dragon, Dark, Steel
// Gen 5 does not have Fairy.

export const TYPE_CHART: Record<string, Record<string, number>> = {
  normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
  fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  electric: { water: 2, grass: 0.5, electric: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  ice:      { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2 },
  poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
  ground:   { fire: 2, grass: 0.5, electric: 2, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying:   { grass: 2, electric: 0.5, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug:      { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5 },
  rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost:    { normal: 0, psychic: 2, ghost: 2, dark: 0.5, steel: 0.5 },
  dragon:   { dragon: 2, steel: 0.5 },
  dark:     { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, steel: 0.5 },
  steel:    { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5 }
};

export const WEATHER_MODIFIERS: Record<string, { boost: string[], nerf: string[] }> = {
    'none': { boost: [], nerf: [] },
    'sun': { boost: ['fire'], nerf: ['water'] },
    'rain': { boost: ['water'], nerf: ['fire'] },
    'sand': { boost: ['rock'], nerf: [] }, // Rock spDef boost handled in engine, not type dmg directly usually
    'hail': { boost: [], nerf: [] }
};

export const TYPE_COLORS: Record<string, string> = {
  normal: '#A8A77A',
  fire: '#EE8130',
  water: '#6390F0',
  electric: '#F7D02C',
  grass: '#7AC74C',
  ice: '#96D9D6',
  fighting: '#C22E28',
  poison: '#A33EA1',
  ground: '#E2BF65',
  flying: '#A98FF3',
  psychic: '#F95587',
  bug: '#A6B91A',
  rock: '#B6A136',
  ghost: '#735797',
  dragon: '#6F35FC',
  dark: '#705746',
  steel: '#B7B7CE',
  fairy: '#D685AD' // Just in case, though Gen 5
};

export const getTypeEffectiveness = (defendingTypes: string[]) => {
  const effectiveness: Record<string, number> = {};
  const allTypes = Object.keys(TYPE_CHART);

  allTypes.forEach(atkType => {
      let multiplier = 1;
      defendingTypes.forEach(defType => {
          const dt = defType.toLowerCase();
          const at = atkType.toLowerCase();
          if (TYPE_CHART[at] && TYPE_CHART[at][dt] !== undefined) {
              multiplier *= TYPE_CHART[at][dt];
          }
           // Default is 1, so no change if not defined
      });
      effectiveness[atkType] = multiplier;
  });

  return effectiveness;
};

// Badge Data for Unova (BW1)
// levelCap = The strict Nuzlocke cap (Gym Leader's Ace).
// obedience = The max level outsiders will obey you AFTER getting this badge.
export const BADGES = [
    { id: 'trio', name: 'Trio Badge', levelCap: 14, obedience: 20, img: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/33.png' },
    { id: 'basic', name: 'Basic Badge', levelCap: 20, obedience: 30, img: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/34.png' },
    { id: 'insect', name: 'Insect Badge', levelCap: 23, obedience: 40, img: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/36.png' },
    { id: 'bolt', name: 'Bolt Badge', levelCap: 27, obedience: 50, img: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/37.png' },
    { id: 'quake', name: 'Quake Badge', levelCap: 31, obedience: 60, img: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/38.png' },
    { id: 'jet', name: 'Jet Badge', levelCap: 35, obedience: 70, img: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/39.png' },
    { id: 'freeze', name: 'Freeze Badge', levelCap: 39, obedience: 80, img: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/40.png' },
    { id: 'legend', name: 'Legend Badge', levelCap: 43, obedience: 100, img: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/41.png' }
];

export const FINAL_CAPS = {
    e4: 50,
    ghetsis: 54
};
