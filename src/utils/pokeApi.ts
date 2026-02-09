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
