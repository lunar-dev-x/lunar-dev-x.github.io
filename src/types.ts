export type Player = 'player1' | 'player2' | 'player3';

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
  killedBy?: Player; // Who caused the death
}

export interface Route {
  id: string;
  name: string;
  encounterP1?: string; // ID of pokemon caught by P1
  encounterP2?: string; // ID of pokemon caught by P2
  encounterP3?: string; // ID of pokemon caught by P3
  status: 'caught' | 'failed' | 'empty' | 'skipped';
  isCustom?: boolean;
}

export interface AppState {
  pokemon: Pokemon[];
  routes: Route[];
  playerNames?: {
    player1: string;
    player2: string;
    player3: string;
  };
}
