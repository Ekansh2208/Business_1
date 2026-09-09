import React, { useState } from "react";
import { Player, PropertyState, GameLog, SpaceType, CardDef } from "../types";
import { BOARD_SPACES, CHANCE_CARDS, UNO_CARDS } from "../constants";
import { soundEffects } from "../soundEffects";
import {
  Wrench,
  X,
  MapPin,
  Coins,
  Building,
  CreditCard,
  FileText,
  UserPlus,
  Play,
  RotateCcw,
  Sparkles,
  Edit3
} from "lucide-react";

interface SandboxPanelProps {
  players: Player[];
  properties: Record<string, PropertyState>;
  turnIndex: number;
  partyHouseBank: number;
  diceRoll: [number, number] | null;
  currentAction: any;
  onUpdateGameState: (updates: any) => Promise<void>;
  onResolveLandedSpace: (
    position: number,
    playersList: Player[],
    logs: GameLog[],
    roll: [number, number]
  ) => Promise<void>;
  onAddLog: (message: string, playerName?: string) => GameLog[];
  logs: GameLog[];
  chanceCards?: CardDef[];
  unoCards?: CardDef[];
  onOpenCardEditor?: () => void;
}

export const SandboxPanel: React.FC<SandboxPanelProps> = ({
  players,
  properties,
  turnIndex,
  partyHouseBank,
  diceRoll,
  currentAction,
  onUpdateGameState,
  onResolveLandedSpace,
  onAddLog,
  logs,
  chanceCards = CHANCE_CARDS,
  unoCards = UNO_CARDS,
  onOpenCardEditor
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [sandboxTab, setSandboxTab] = useState<"PLAYER" | "PROPERTIES" | "CARDS" | "SYSTEM">("PLAYER");

  // Selection states
  const [selectedSpaceIndex, setSelectedSpaceIndex] = useState<number>(0);
  const [selectedPropertyIndex, setSelectedPropertyIndex] = useState<number>(2); // Delhi by default
  const [selectedCardType, setSelectedCardType] = useState<"CHANCE" | "UNO">("CHANCE");
  const [selectedCardId, setSelectedCardId] = useState<string>("c1");

  const activePlayer = players[turnIndex];

  if (players.length === 0) return null;

  // Custom cash presets
  const handleModifyCash = async (amount: number) => {
    const updatedPlayers = players.map((p, idx) => {
      if (idx === turnIndex) {
        return { ...p, cash: Math.max(0, p.cash + amount) };
      }
      return p;
    });
    const updatedLogs = onAddLog(
      `🧪 [SANDBOX] Modified cash of ${activePlayer.name} by ${amount >= 0 ? "+" : ""}$${amount.toLocaleString()}`,
      "Sandbox"
    );
    await onUpdateGameState({ players: updatedPlayers, logs: updatedLogs });
  };

  // Custom credit presets
  const handleModifyCredit = async (amount: number) => {
    const updatedPlayers = players.map((p, idx) => {
      if (idx === turnIndex) {
        return { ...p, creditUsed: Math.min(10000, Math.max(0, p.creditUsed + amount)) };
      }
      return p;
    });
    const updatedLogs = onAddLog(
      `🧪 [SANDBOX] Modified credit card debt of ${activePlayer.name} by ${amount >= 0 ? "+" : ""}$${amount.toLocaleString()}`,
      "Sandbox"
    );
    await onUpdateGameState({ players: updatedPlayers, logs: updatedLogs });
  };

  // Modify Party House Bank
  const handleModifyPartyHouseBank = async (amount: number) => {
    const newBank = Math.max(0, partyHouseBank + amount);
    const updatedLogs = onAddLog(
      `🧪 [SANDBOX] Set Party House Bank balance to $${newBank.toLocaleString()}`,
      "Sandbox"
    );
    await onUpdateGameState({ partyHouseBank: newBank, logs: updatedLogs });
  };

  // Teleportation
  const handleTeleport = async (runRules: boolean) => {
    const targetSpace = BOARD_SPACES[selectedSpaceIndex];
    
    // Create deep copy of players
    const updatedPlayers = players.map((p, idx) => {
      if (idx === turnIndex) {
        return { ...p, position: selectedSpaceIndex };
      }
      return p;
    });

    const logMsg = `🧪 [SANDBOX] Teleported ${activePlayer.name} to Space #${selectedSpaceIndex}: ${targetSpace.name} (${runRules ? "Rules Engaged" : "Just Placing Token"}).`;
    const updatedLogs = onAddLog(logMsg, "Sandbox");

    if (runRules) {
      // Set the position and execute the board landing triggers
      await onResolveLandedSpace(selectedSpaceIndex, updatedPlayers, updatedLogs, diceRoll || [1, 1]);
    } else {
      // Just teleport the token silently
      await onUpdateGameState({ players: updatedPlayers, logs: updatedLogs });
    }
  };

  // Modify Property Development State
  const handleModifyProperty = async (actionType: "OWNER_PLAYER" | "OWNER_BANK" | "ADD_HOUSE" | "REMOVE_HOUSE" | "ADD_HOTEL" | "REMOVE_HOTEL") => {
    const space = BOARD_SPACES[selectedPropertyIndex];
    const key = selectedPropertyIndex.toString();
    const currentPropState = properties[key] || { ownerId: null, houses: 0, hasHotel: false };

    let nextOwnerId = currentPropState.ownerId;
    let nextHouses = currentPropState.houses;
    let nextHasHotel = currentPropState.hasHotel;

    switch (actionType) {
      case "OWNER_PLAYER":
        nextOwnerId = activePlayer.id;
        break;
      case "OWNER_BANK":
        nextOwnerId = null;
        nextHouses = 0;
        nextHasHotel = false;
        break;
      case "ADD_HOUSE":
        nextHouses = Math.min(3, nextHouses + 1);
        break;
      case "REMOVE_HOUSE":
        nextHouses = Math.max(0, nextHouses - 1);
        break;
      case "ADD_HOTEL":
        if (nextHouses < 3) {
          nextHouses = 3; // Hotels require 3 houses pre-req
        }
        nextHasHotel = true;
        break;
      case "REMOVE_HOTEL":
        nextHasHotel = false;
        break;
    }

    const updatedProperties = {
      ...properties,
      [key]: {
        ownerId: nextOwnerId,
        houses: nextHouses,
        hasHotel: nextHasHotel
      }
    };

    const updatedLogs = onAddLog(
      `🧪 [SANDBOX] Updated property ${space.flag || ""} ${space.name}: Owner=${
        nextOwnerId ? players.find(p => p.id === nextOwnerId)?.name : "Bank"
      }, Houses=${nextHouses}, Hotel=${nextHasHotel ? "Yes" : "No"}`,
      "Sandbox"
    );

    await onUpdateGameState({ properties: updatedProperties, logs: updatedLogs });
  };

  // Trigger Card draw
  const handleResolveSandboxCard = async () => {
    const cardList = selectedCardType === "CHANCE" ? chanceCards : unoCards;
    const cardDef = cardList.find((c) => c.id === selectedCardId);

    if (!cardDef) return;

    const updatedLogs = onAddLog(
      `🧪 [SANDBOX] Simulating card: [${selectedCardType}] "${cardDef.text}"`,
      "Sandbox"
    );

    // Deep copy of players to modify in local rules processor
    const finalPlayers = players.map(p => ({ ...p }));
    let nextTurnIndex = (turnIndex + 1) % players.length;
    let nextPartyHouseBank = partyHouseBank;

    // Helper to process cash deficit using Credit Card automatically
    const processPayment = (player: Player, amount: number) => {
      if (player.cash < 3000) {
        player.payLaterEnabled = true;
      }
      if (player.payLaterEnabled && player.cash < 5000) {
        player.payLaterBalance = (player.payLaterBalance || 0) + amount;
        return 0; // successfully paid via Pay Later / Autopay
      }
      if (player.cash >= amount) {
        player.cash -= amount;
        if (player.cash < 3000) {
          player.payLaterEnabled = true;
        }
        return 0;
      } else {
        const remainingDeficit = amount - player.cash;
        player.cash = 0;
        player.payLaterEnabled = true;
        const availableCredit = 10000 - player.creditUsed;
        if (availableCredit >= remainingDeficit) {
          player.creditUsed += remainingDeficit;
          return 0;
        } else {
          player.creditUsed = 10000;
          return remainingDeficit - availableCredit;
        }
      }
    };

    // 1. Cash Change
    if (cardDef.cashChange) {
      if (cardDef.cashChange > 0) {
        finalPlayers[turnIndex].cash += cardDef.cashChange;
      } else {
        const deficit = processPayment(finalPlayers[turnIndex], Math.abs(cardDef.cashChange));
        nextPartyHouseBank += Math.abs(cardDef.cashChange) - deficit;
        if (deficit > 0) nextTurnIndex = turnIndex; // Locked on debt resolution
      }
    }

    let cardAction: any = null;

    // 2. Go directly to position
    if (cardDef.goToPosition !== undefined) {
      finalPlayers[turnIndex].position = cardDef.goToPosition;
      const targetSpace = BOARD_SPACES[cardDef.goToPosition];
      const japanIndex = BOARD_SPACES.findIndex((s) => s.name === "Japan");
      if (japanIndex !== -1 && cardDef.goToPosition === japanIndex && activePlayer.position > japanIndex) {
        finalPlayers[turnIndex].cash += 1500;
      }
      if (targetSpace && targetSpace.type === SpaceType.PARTY_HOUSE) {
        cardAction = {
          type: "PARTY_HOUSE_CHOICE",
          space: targetSpace,
          playerIndex: turnIndex
        };
        nextTurnIndex = turnIndex;
      }
      if (targetSpace && targetSpace.type === SpaceType.CASINO) {
        cardAction = {
          type: "CASINO_CHOICE",
          space: targetSpace,
          playerIndex: turnIndex
        };
        nextTurnIndex = turnIndex;
      }
    }

    // 3. Go to jail
    if (cardDef.goToJail) {
      finalPlayers[turnIndex].inJail = true;
      const jailIndex = BOARD_SPACES.findIndex((s) => s.type === SpaceType.JAIL);
      finalPlayers[turnIndex].position = jailIndex !== -1 ? jailIndex : 9; // Jail space
      nextTurnIndex = (turnIndex + 1) % players.length;
    }

    // 4. Get out of jail free card
    if (cardDef.getOutOfJail) {
      finalPlayers[turnIndex].hasGetOutOfJailCard = true;
    }

    // 5. Collect from all
    if (cardDef.collectFromAll) {
      finalPlayers.forEach((p) => {
        if (p.id !== activePlayer.id) {
          const deficit = processPayment(p, cardDef.collectFromAll!);
          finalPlayers[turnIndex].cash += cardDef.collectFromAll! - deficit;
        }
      });
    }

    // 6. Pay all
    if (cardDef.payAll) {
      finalPlayers.forEach((p) => {
        if (p.id !== activePlayer.id) {
          const deficit = processPayment(finalPlayers[turnIndex], cardDef.payAll!);
          p.cash += cardDef.payAll! - deficit;
        }
      });
      const activePlayerCurrent = finalPlayers.find((p) => p.id === activePlayer.id);
      if (activePlayerCurrent && activePlayerCurrent.cash === 0 && activePlayerCurrent.creditUsed === 10000) {
        nextTurnIndex = turnIndex;
      }
    }

    // 7. House Tax
    if (cardDef.houseTax) {
      const ownedTilesCount = BOARD_SPACES.filter(
        (s) => properties[s.index.toString()]?.ownerId === activePlayer.id
      ).length;
      const taxTotal = ownedTilesCount * cardDef.houseTax;
      const deficit = processPayment(finalPlayers[turnIndex], taxTotal);
      nextPartyHouseBank += taxTotal - deficit;
      if (deficit > 0) nextTurnIndex = turnIndex;
    }

    // 7b. House & Hotel Tax
    if (cardDef.houseAndHotelTax) {
      let totalHouses = 0;
      let totalHotels = 0;
      BOARD_SPACES.forEach((s) => {
        const prop = properties[s.index.toString()];
        if (prop && prop.ownerId === activePlayer.id) {
          if (prop.hasHotel) totalHotels += 1;
          if (prop.houses) totalHouses += prop.houses;
        }
      });
      const taxTotal = (totalHouses * cardDef.houseAndHotelTax.houseTax) + (totalHotels * cardDef.houseAndHotelTax.hotelTax);
      const deficit = processPayment(finalPlayers[turnIndex], taxTotal);
      nextPartyHouseBank += taxTotal - deficit;
      if (deficit > 0) nextTurnIndex = turnIndex;
    }

    await onUpdateGameState({
      players: finalPlayers,
      currentAction: cardAction,
      turnIndex: nextTurnIndex,
      partyHouseBank: nextPartyHouseBank,
      logs: updatedLogs
    });
  };

  // Add bot player
  const handleAddBot = async () => {
    if (players.length >= 6) {
      alert("Maximum 6 players reached!");
      return;
    }
    const nextIndex = players.length;
    const botNames = ["Virtual Bot Alpha", "Virtual Bot Beta", "Virtual Bot Gamma"];
    const botEmojis = ["🤖", "👾", "🦊"];
    const botColors = [
      "bg-amber-500 hover:ring-amber-400",
      "bg-violet-500 hover:ring-violet-400",
      "bg-fuchsia-500 hover:ring-fuchsia-400"
    ];

    const newBot: Player = {
      id: `bot-player-${nextIndex}`,
      name: botNames[nextIndex - 1] || `Test Bot ${nextIndex}`,
      avatar: botEmojis[nextIndex - 1] || "🤖",
      color: botColors[nextIndex - 1] || "bg-amber-500 hover:ring-amber-400",
      position: 0,
      cash: 30000,
      creditUsed: 0,
      payLaterBalance: 0,
      payLaterEnabled: false,
      inJail: false,
      hasGetOutOfJailCard: false,
      isHost: false,
      isOnline: true
    };

    const updatedPlayers = [...players, newBot];
    const updatedLogs = onAddLog(`🧪 [SANDBOX] Added bot player ${newBot.name} to the match.`, "Sandbox");

    await onUpdateGameState({ players: updatedPlayers, logs: updatedLogs });
  };

  // End game instantly
  const handleForceEndGame = async () => {
    const updatedLogs = onAddLog("🧪 [SANDBOX] Instantly closed the match via Admin consensus override.", "Sandbox");
    await onUpdateGameState({ status: "FINISHED", logs: updatedLogs });
  };

  // Reset Game Sandbox State
  const handleResetSandbox = async () => {
    if (confirm("Reset current game back to pristine Sandbox initial state?")) {
      const resetPlayers = players.map(p => ({
        ...p,
        position: 0,
        cash: 30000,
        creditUsed: 0,
        payLaterBalance: 0,
        payLaterEnabled: false,
        inJail: false,
        hasGetOutOfJailCard: false
      }));
      const updatedLogs = onAddLog("🧪 [SANDBOX] Reset game state to pristine initial positions.", "Sandbox");
      await onUpdateGameState({
        players: resetPlayers,
        properties: {},
        partyHouseBank: 0,
        diceRoll: null,
        currentAction: null,
        turnIndex: 0,
        logs: updatedLogs,
        status: "PLAYING"
      });
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-40">
      {/* Floating Sandbox Toggle FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-amber-300 font-bold text-xs rounded-full shadow-2xl transition border border-slate-700/80 cursor-pointer"
        title="Open Rules Sandbox Panel"
        id="btn-toggle-sandbox"
      >
        <Wrench className="h-4 w-4 animate-pulse" />
        <span>🧪 TEST SANDBOX SUITE</span>
      </button>

      {isOpen && (
        <div className="fixed bottom-20 left-4 w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-[500px]">
          {/* Header */}
          <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-amber-400" />
              <div>
                <h3 className="text-xs font-black tracking-wider uppercase font-mono text-amber-400">
                  Rules & Metrics Test Panel
                </h3>
                <p className="text-[10px] text-slate-400 leading-none mt-1">
                  Evaluate board logic, formulas, and constraints instantly
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tab Selection */}
          <div className="flex bg-slate-100 border-b border-slate-200 shrink-0 text-3xs font-bold uppercase tracking-wider text-slate-500">
            {(["PLAYER", "PROPERTIES", "CARDS", "SYSTEM"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSandboxTab(tab)}
                className={`flex-1 py-2.5 text-center border-r border-slate-200 last:border-0 transition cursor-pointer ${
                  sandboxTab === tab ? "bg-white text-slate-800 font-extrabold border-t-2 border-amber-500" : "hover:bg-slate-50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Sandbox Body Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* 1. PLAYER TAB */}
            {sandboxTab === "PLAYER" && (
              <div className="space-y-4">
                {/* Active Player Stats Display */}
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1 text-2xs">
                  <p className="font-bold text-slate-500 flex justify-between uppercase">
                    <span>Active Target:</span>
                    <strong className="text-slate-800">{activePlayer.name}</strong>
                  </p>
                  <p className="font-mono text-slate-400 flex justify-between mt-1">
                    <span>Current Position:</span>
                    <strong className="text-slate-700">Space #{activePlayer.position} - {BOARD_SPACES[activePlayer.position]?.name}</strong>
                  </p>
                  <p className="font-mono text-slate-400 flex justify-between">
                    <span>Cash Balance:</span>
                    <strong className="text-emerald-600 font-bold">${activePlayer.cash.toLocaleString()}</strong>
                  </p>
                  <p className="font-mono text-slate-400 flex justify-between">
                    <span>Credit Debt Used:</span>
                    <strong className="text-red-500 font-bold">${activePlayer.creditUsed.toLocaleString()} / $10,000</strong>
                  </p>
                </div>

                {/* Cash Increments */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 font-mono">
                    💰 Adjust Liquid Cash (Deficits testing)
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleModifyCash(5000)}
                      className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-3xs rounded-lg cursor-pointer"
                    >
                      +$5,000
                    </button>
                    <button
                      onClick={() => handleModifyCash(-5000)}
                      className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-3xs rounded-lg cursor-pointer"
                    >
                      -$5,000
                    </button>
                    <button
                      onClick={async () => {
                        const updatedPlayers = players.map((p, idx) => idx === turnIndex ? { ...p, cash: 0 } : p);
                        await onUpdateGameState({ players: updatedPlayers });
                      }}
                      className="flex-1 py-1.5 px-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-3xs rounded-lg cursor-pointer"
                    >
                      Set $0 Cash
                    </button>
                  </div>
                </div>

                {/* Credit Increments */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 font-mono">
                    💳 Adjust Credit Card Debt
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleModifyCredit(2000)}
                      className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-3xs rounded-lg cursor-pointer"
                    >
                      +$2,000 Debt
                    </button>
                    <button
                      onClick={() => handleModifyCredit(-2000)}
                      className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-3xs rounded-lg cursor-pointer"
                    >
                      -$2,000 Debt
                    </button>
                    <button
                      onClick={async () => {
                        const updatedPlayers = players.map((p, idx) => idx === turnIndex ? { ...p, creditUsed: 10000 } : p);
                        await onUpdateGameState({ players: updatedPlayers });
                      }}
                      className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-3xs rounded-lg cursor-pointer"
                    >
                      Max Debt ($10k)
                    </button>
                  </div>
                </div>

                {/* Teleportation / Navigation */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 font-mono">
                    📍 Teleport Token
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedSpaceIndex}
                      onChange={(e) => setSelectedSpaceIndex(parseInt(e.target.value))}
                      className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white cursor-pointer"
                    >
                      {BOARD_SPACES.map((space) => (
                        <option key={space.index} value={space.index}>
                          #{space.index}: {space.flag || "⚪"} {space.name}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleTeleport(false)}
                      className="py-1.5 px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-3xs rounded-lg shrink-0 cursor-pointer"
                      title="Place token silently"
                    >
                      Place Token
                    </button>
                    <button
                      onClick={() => handleTeleport(true)}
                      className="py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-3xs rounded-lg shrink-0 cursor-pointer"
                      title="Place token and execute landing metrics/rules"
                    >
                      Run Land Rules
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. PROPERTIES TAB */}
            {sandboxTab === "PROPERTIES" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 font-mono">
                    🏘️ Select Property Asset
                  </label>
                  <select
                    value={selectedPropertyIndex}
                    onChange={(e) => setSelectedPropertyIndex(parseInt(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white cursor-pointer"
                  >
                    {BOARD_SPACES.filter(s => s.price).map((space) => {
                      const prop = properties[space.index.toString()];
                      const ownerName = prop?.ownerId ? players.find(p => p.id === prop.ownerId)?.name : "Bank";
                      return (
                        <option key={space.index} value={space.index}>
                          {space.flag} {space.name} (Owner: {ownerName})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Developer controls */}
                <div className="space-y-3.5 pt-2">
                  {/* Ownership toggles */}
                  <div>
                    <span className="block text-3xs font-bold uppercase text-slate-400 font-mono mb-1">Ownership</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleModifyProperty("OWNER_PLAYER")}
                        className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-3xs rounded-lg cursor-pointer"
                      >
                        Set Owner = {activePlayer.name}
                      </button>
                      <button
                        onClick={() => handleModifyProperty("OWNER_BANK")}
                        className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-3xs rounded-lg cursor-pointer"
                      >
                        Set Unowned (Bank)
                      </button>
                    </div>
                  </div>

                  {/* Buildings toggles */}
                  <div>
                    <span className="block text-3xs font-bold uppercase text-slate-400 font-mono mb-1">Houses Counter</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleModifyProperty("ADD_HOUSE")}
                        className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-3xs rounded-lg cursor-pointer"
                      >
                        + Add House (+1,000 Rent)
                      </button>
                      <button
                        onClick={() => handleModifyProperty("REMOVE_HOUSE")}
                        className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-3xs rounded-lg cursor-pointer"
                      >
                        - Remove House
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="block text-3xs font-bold uppercase text-slate-400 font-mono mb-1">Hotel State</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleModifyProperty("ADD_HOTEL")}
                        className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-3xs rounded-lg cursor-pointer"
                      >
                        Set Hotel Built (+1,500 Rent)
                      </button>
                      <button
                        onClick={() => handleModifyProperty("REMOVE_HOTEL")}
                        className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-3xs rounded-lg cursor-pointer"
                      >
                        Remove Hotel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. CARDS TAB */}
            {sandboxTab === "CARDS" && (
              <div className="space-y-4">
                {onOpenCardEditor && (
                  <button
                    onClick={onOpenCardEditor}
                    className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs rounded-xl shadow-2xs transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="h-4 w-4 text-amber-600" /> View & Edit Chance & UNO Card Decks
                  </button>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedCardType("CHANCE");
                      const firstChance = chanceCards[0]?.id || "c1";
                      setSelectedCardId(firstChance);
                    }}
                    className={`flex-1 py-1 px-2 font-bold text-3xs border rounded-lg cursor-pointer ${
                      selectedCardType === "CHANCE" ? "bg-amber-500 text-white border-amber-600" : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    Chance ({chanceCards.length})
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCardType("UNO");
                      const firstUno = unoCards[0]?.id || "u1";
                      setSelectedCardId(firstUno);
                    }}
                    className={`flex-1 py-1 px-2 font-bold text-3xs border rounded-lg cursor-pointer ${
                      selectedCardType === "UNO" ? "bg-red-500 text-white border-red-600" : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    UNO ({unoCards.length})
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 font-mono">
                    Select Event Action to Simulate
                  </label>
                  <select
                    value={selectedCardId}
                    onChange={(e) => setSelectedCardId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white cursor-pointer font-mono"
                  >
                    {(selectedCardType === "CHANCE" ? chanceCards : unoCards).map((card) => (
                      <option key={card.id} value={card.id}>
                        [{card.id}] {card.text.substring(0, 50)}...
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleResolveSandboxCard}
                  className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="h-4 w-4" /> Draw & Resolve Selected Card
                </button>
              </div>
            )}

            {/* 4. SYSTEM TAB */}
            {sandboxTab === "SYSTEM" && (
              <div className="space-y-4">
                {/* Party House Bank Balance */}
                <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-2xs">
                    <span className="font-bold uppercase text-slate-400 font-mono">Party House Bank Balance:</span>
                    <strong className="text-amber-600 font-mono text-sm">${partyHouseBank.toLocaleString()}</strong>
                  </div>
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => handleModifyPartyHouseBank(2000)}
                      className="flex-1 py-1 bg-white hover:bg-slate-100 border border-slate-250 text-slate-700 font-bold text-3xs rounded-lg cursor-pointer"
                    >
                      +$2,000
                    </button>
                    <button
                      onClick={() => handleModifyPartyHouseBank(-2000)}
                      className="flex-1 py-1 bg-white hover:bg-slate-100 border border-slate-250 text-slate-700 font-bold text-3xs rounded-lg cursor-pointer"
                    >
                      -$2,000
                    </button>
                    <button
                      onClick={async () => {
                        await onUpdateGameState({ partyHouseBank: 0 });
                      }}
                      className="flex-1 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold text-3xs rounded-lg cursor-pointer"
                    >
                      Reset Bank
                    </button>
                  </div>
                </div>

                {/* Consensus trigger, Add Bot, Override Game state */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleAddBot}
                    className="py-2.5 px-3 border border-dashed border-slate-300 hover:border-emerald-500 text-slate-600 hover:text-emerald-700 font-bold text-3xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Add Virtual Bot
                  </button>

                  <button
                    onClick={handleForceEndGame}
                    className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 font-bold text-3xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Force End Game
                  </button>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-150">
                  <button
                    onClick={handleResetSandbox}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-3xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset Pristine Sandbox
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default SandboxPanel;
