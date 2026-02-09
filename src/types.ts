export type Player = 'player1' | 'player2';

export type PokemonStatus = 'party' | 'box' | 'graveyard';

export interface Pokemon {
  id: string;
  species: string;
  dexId: number; // For sprite
  nickname: string;
  owner: Player;
  status: PokemonStatus;
  pairId: string; // The ID shared with the soul linked partner
  route?: string;
}

export interface Route {
  id: string;
  name: string;
  encounterP1?: string; // ID of pokemon caught by P1
  encounterP2?: string; // ID of pokemon caught by P2
  status: 'caught' | 'failed' | 'empty';
}

export interface AppState {
  pokemon: Pokemon[];
  routes: Route[];
}
