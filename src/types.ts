import { CardDef } from "./constants";
export type { CardDef };

export interface Player {
  id: string;
  name: string;
  avatar: string; // Emoji
  color: string; // Tailwind color class e.g., "bg-red-500"
  position: number; // 0 to 32
  cash: number;
  creditUsed: number; // 0 to 10000
  payLaterBalance: number; // Current Pay Later Balance
  payLaterEnabled: boolean; // Is Pay Later Mode toggled on?
  inJail: boolean;
  hasGetOutOfJailCard: boolean;
  isHost: boolean;
  isOnline: boolean;
  passportDebt?: number;
}

export enum SpaceType {
  START = "START",
  COUNTRY = "COUNTRY",
  RAILWAY = "RAILWAY",
  UTILITY = "UTILITY",
  TAX = "TAX",
  CHANCE = "CHANCE",
  UNO = "UNO",
  JAIL = "JAIL",
  PARTY_HOUSE = "PARTY_HOUSE",
  CASINO = "CASINO"
}

export interface BoardSpace {
  index: number;
  name: string;
  type: SpaceType;
  color?: string; // Color group (e.g., "yellow", "red", "orange", "blue", "green", "purple")
  colorClass?: string; // Tailwind color for visual headers
  flag?: string; // Emoji flag
  price?: number; // Purchase price
  rentBase?: number; // 10% of purchase price
  // Coordinates for grid rendering
  gridRow: number;
  gridCol: number;
}

export interface PropertyState {
  ownerId: string | null;
  houses: number; // 0 to 3
  hasHotel: boolean;
}

export interface Card {
  id: string;
  text: string;
  type: "CHANCE" | "UNO";
  action: (gameState: any, currentPlayerId: string) => {
    updatedGameState: any;
    logMessage: string;
  };
}

export interface GameLog {
  id: string;
  player?: string;
  message: string;
  timestamp: number;
}

export interface AuctionState {
  highestBid: number;
  highestBidderId: string | null;
  bids: Record<string, number | "pass">; // playerId to bid or pass
  activeBidderIndex: number;
  propertyIndex: number;
}

export type GameAction = GameState['currentAction'];

export interface PlayerTurnOrderRoll {
  playerId: string;
  die1: number;
  die2: number;
  total: number;
}

export interface TurnOrderData {
  phase: "INITIAL_ROLL" | "TIE_BREAKER" | "COMPLETE";
  round: number;
  rolls: Record<string, PlayerTurnOrderRoll>;
  activeGroupPlayerIds: string[];
  activeRankOffset: number;
  pendingTieGroups: { playerIds: string[]; rankOffset: number }[];
  settledRanks: Record<string, number>;
  logMessages: string[];
  finalOrderPlayerIds?: string[];
}

export interface GameState {
  id: string;
  status: "LOBBY" | "DETERMINING_TURN_ORDER" | "PLAYING" | "FINISHED";
  roomCode: string;
  players: Player[];
  turnIndex: number;
  properties: Record<string, PropertyState>; // string index -> property state
  partyHouseBank: number;
  diceRoll: [number, number] | null;
  logs: GameLog[];
  turnOrderData?: TurnOrderData | null;
  currentAction: {
    type: "BUY_OR_PASS" | "CHANCE_DRAW" | "UNO_DRAW" | "JAIL_CHOICE" | "PARTY_HOUSE_CHOICE" | "CASINO_CHOICE" | "GAME_OVER_VOTE" | "BUILD_DECISION";
    propertyIndex?: number;
    cardText?: string;
    cardType?: "CHANCE" | "UNO";
    votes?: Record<string, boolean>; // playerId to vote status
    space?: BoardSpace;
    playerIndex?: number;
    lastGamble?: {
      betAmount: number;
      prediction: "ODD" | "EVEN";
      diceRoll: [number, number];
      sum: number;
      parity: string;
      won: boolean;
      playerCash: number;
    };
  } | null;
  chanceDeck?: string[];
  unoDeck?: string[];
  chanceCards?: CardDef[];
  unoCards?: CardDef[];
  turnStartedAt?: number;
  timerEnabled?: boolean;
  startingCash?: number;
}
