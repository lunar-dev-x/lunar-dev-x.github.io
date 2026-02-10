// Common Gen 5 Trainers for quick loading
export interface TrainerPreset {
    name: string;
    description: string;
    pokemon: {
        species: string;
        level: number;
        moves?: string[];
        item?: string;
    }[];
}

export const TRAINER_PRESETS: TrainerPreset[] = [
    {
        name: "Rival Battle 1 (Accumula)",
        description: "Initial battle vs N",
        pokemon: [
            { species: "purrloin", level: 7, moves: ["scratch", "growl"] }
        ]
    },
    {
        name: "Gym 1 (Cilan/Chili/Cress)",
        description: "Striaton City Gym",
        pokemon: [
            { species: "lillipup", level: 12, moves: ["bite", "work-up"] },
            { species: "pansage", level: 14, moves: ["vine-whip", "work-up"] } // Typical coverage
        ]
    },
    {
        name: "Gym 2 (Lenora)",
        description: "Nacrene City Gym",
        pokemon: [
            { species: "herdier", level: 18, moves: ["take-down", "leer", "bite", "retaliate"] },
            { species: "watchog", level: 20, moves: ["retaliate", "crunch", "hypnosis", "leer"] }
        ]
    },
    {
        name: "Gym 3 (Burgh)",
        description: "Castelia City Gym",
        pokemon: [
            { species: "whirlipede", level: 21, moves: ["poison-tail", "screech", "shrugging-tackle", "iron-defense"] },
            { species: "dwebble", level: 21, moves: ["smack-down", "bug-struggle", "feint-attack"] },
            { species: "leavanny", level: 23, moves: ["razor-leaf", "bug-struggle", "string-shot"] }
        ]
    },
    {
        name: "Gym 4 (Elesa)",
        description: "Nimbasa City Gym",
        pokemon: [
            { species: "emolga", level: 25, moves: ["volt-switch", "aerial-ace", "quick-attack", "pursuit"] },
            { species: "emolga", level: 25, moves: ["volt-switch", "aerial-ace", "quick-attack", "pursuit"] },
            { species: "zebstrika", level: 27, moves: ["volt-switch", "spark", "flame-charge", "quick-attack"] }
        ]
    },
    {
        name: "Gym 5 (Clay)",
        description: "Driftveil City Gym",
        pokemon: [
            { species: "krokorok", level: 29, moves: ["crunch", "bulldoze", "torment"] },
            { species: "palpitoad", level: 29, moves: ["muddy-water", "bubble-beam", "bulldoze"] },
            { species: "excadrill", level: 31, moves: ["bulldoze", "rock-slide", "slash", "hone-claws"] }
        ]
    },
    {
        name: "Ghetsis (Final)",
        description: "Endgame Boss",
        pokemon: [
            { species: "cofagrigus", level: 52 },
            { species: "bouffalant", level: 52 },
            { species: "seismitoad", level: 52 },
            { species: "bisharp", level: 52 },
            { species: "elektross", level: 52 },
            { species: "hydreigon", level: 54, moves: ["dragon-pulse", "fire-blast", "surf", "focus-blast"] }
        ]
    }
];
