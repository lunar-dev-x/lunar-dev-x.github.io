export const getDexId = async (species: string): Promise<number> => {
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${species.toLowerCase()}`);
    if (!response.ok) return 0;
    const data = await response.json();
    return data.id;
  } catch (e) {
    console.error(e);
    return 0; // Fallback or substitute
  }
};

let pokemonCache: string[] | null = null;

export const getAllPokemonNames = async (): Promise<string[]> => {
  if (pokemonCache) return pokemonCache;
  
  try {
    // Limit to 649 to include Gen 1-5 (Up to Genesect) for Pokemon Black 1 context
    // This avoids cluttering the list with Gen 6-9 pokemon which cannot exist in Black 1
    const response = await fetch('https://pokeapi.co/api/v2/pokemon-species?limit=649');
    const data = await response.json();
    // Use only name
    pokemonCache = data.results.map((p: any) => p.name);
    return pokemonCache || [];
  } catch (e) {
    console.error("Failed to fetch pokemon list", e);
    return [];
  }
};

let moveCache: string[] | null = null;
export const getAllMoveNames = async (): Promise<string[]> => {
    if (moveCache) return moveCache;
    try {
        const response = await fetch('https://pokeapi.co/api/v2/move?limit=600'); // Gen 5 limit
        const data = await response.json();
        moveCache = data.results.map((m: any) => m.name);
        return moveCache || [];
    } catch {
        return [];
    }
};

interface EvolutionOption {
  species: string;
  id: number;
}

export const getEvolutionOptions = async (currentSpecies: string): Promise<EvolutionOption[]> => {
  try {
    // 1. Get Species to find Evolution Chain URL
    const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${currentSpecies.toLowerCase()}`);
    if (!speciesRes.ok) throw new Error('Species not found');
    const speciesData = await speciesRes.json();
    
    const evolutionChainUrl = speciesData.evolution_chain.url;

    // 2. Get Evolution Chain
    const chainRes = await fetch(evolutionChainUrl);
    const chainData = await chainRes.json();
    
    // 3. Traverse Chain to find current pokemon and its next evolutions
    const findNode = (node: any): any => {
        if (node.species.name === currentSpecies.toLowerCase()) {
            return node;
        }
        for (const child of node.evolves_to) {
            const result = findNode(child);
            if (result) return result;
        }
        return null;
    };

    const node = findNode(chainData.chain);
    
    if (node && node.evolves_to.length > 0) {
        // Map all potential evolutions
        const options = await Promise.all(node.evolves_to.map(async (evo: any) => {
             const name = evo.species.name;
             const id = await getDexId(name); // Get ID for sprite
             return { species: name, id };
        }));
        return options;
    }
    
    return [];
  } catch (e) {
    console.error("Evolution fetch failed:", e);
    return [];
  }
};

export const getPreEvolution = async (currentSpecies: string): Promise<EvolutionOption | null> => {
    try {
        const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${currentSpecies.toLowerCase()}`);
        if (!speciesRes.ok) return null;
        const speciesData = await speciesRes.json();

        if (speciesData.evolves_from_species) {
            const prevName = speciesData.evolves_from_species.name;
            const prevId = await getDexId(prevName);
            return { species: prevName, id: prevId };
        }
        return null;
    } catch (e) {
        console.error("Devolution fetch failed:", e);
        return null;
    }
};

export const getPokemonDetails = async (species: string) => {
    try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${species.toLowerCase()}`);
        if (!res.ok) return null;
        const data = await res.json();
        
        // Fetch Species data for Capture Rate
        const specRes = await fetch(data.species.url);
        const specData = await specRes.json();

        return {
            types: data.types.map((t: any) => t.type.name),
            abilities: data.abilities.map((a: any) => a.ability.name),
            moves: data.moves.map((m: any) => m.move.name),
            stats: data.stats, // { base_stat, stat: { name } }
            capture_rate: specData.capture_rate,
            base_experience: data.base_experience
        };
    } catch (e) {
        console.error("Detail fetch failed", e);
        return null;
    }
};

export const getMoveDetails = async (moveName: string) => {
    try {
        const res = await fetch(`https://pokeapi.co/api/v2/move/${moveName.toLowerCase().replace(/ /g, '-')}`);
        if (!res.ok) return null;
        const data = await res.json();
        return {
            name: data.name,
            type: data.type.name,
            power: data.power,
            accuracy: data.accuracy,
            damage_class: data.damage_class.name, // physical, special, status
            priority: data.priority
        };
    } catch (e) {
        console.error("Move fetch failed", e);
        return null;
    }
};

export const getItems = async (): Promise<string[]> => {
    // Just cache common items, no need to fetch 1000 items from pokeapi every time
    // Importing from separate file to avoid massive file here
    return (await import('./itemList')).COMMON_ITEMS;
};
