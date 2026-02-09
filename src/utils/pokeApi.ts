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
    const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1300');
    const data = await response.json();
    // Use only name
    pokemonCache = data.results.map((p: any) => p.name);
    return pokemonCache || [];
  } catch (e) {
    console.error("Failed to fetch pokemon list", e);
    return [];
  }
};
