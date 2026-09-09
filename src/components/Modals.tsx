import React from "react";
import { Player, BoardSpace, Card, PropertyState, GameLog } from "../types";
import { CHANCE_CARDS, UNO_CARDS, BOARD_SPACES, getCountryCode } from "../constants";
import { AlertCircle, Coins, ShieldCheck, PartyPopper, Vote, Landmark, Building, ChevronDown, ChevronUp, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ModalsProps {
  currentAction: any;
  players: Player[];
  selfPlayerId: string;
  properties: Record<string, PropertyState>;
  logs?: GameLog[];
  onBuyProperty: (useCredit?: boolean) => void;
  onPassProperty: () => void;
  onDrawCard: (type: "CHANCE" | "UNO") => void;
  onResolveCard: () => void;
  onJailChoice: (choice: "PAY" | "CARD" | "SKIP") => void;
  onPartyHouseChoice: (choice: "BANK" | "PLAYERS") => void;
  onVoteGameEnd: (vote: boolean) => void;
  partyHouseBank: number;
  onBuildHouseFromModal: (spaceIndex: number, useCredit?: boolean) => void;
  onPassBuildFromModal: () => void;
  onSettlePayLater?: (playerId: string, amount: number, useCredit?: boolean) => void;
  onSellHouse?: (spaceIndex: number) => void;
  onSellHotel?: (spaceIndex: number) => void;
  onMortgageProperty?: (spaceIndex: number) => void;
  onCasinoPass?: () => void;
  onCasinoGambleResult?: (data: { betAmount: number; prediction: "ODD" | "EVEN"; diceRoll: [number, number]; won: boolean; continueGambling?: boolean }) => void;
  isOnline?: boolean;
}

const ManageAssetsSection: React.FC<{
  player: Player;
  properties: Record<string, PropertyState>;
  onSellHouse?: (spaceIndex: number) => void;
  onSellHotel?: (spaceIndex: number) => void;
  onMortgageProperty?: (spaceIndex: number) => void;
  requiredCost?: number;
  canManage?: boolean;
}> = ({ player, properties, onSellHouse, onSellHotel, onMortgageProperty, requiredCost, canManage = true }) => {
  if (!canManage) return null;
  const isShortOnCash = requiredCost !== undefined && player.cash < requiredCost;
  const [isExpanded, setIsExpanded] = React.useState<boolean>(isShortOnCash);

  // Sync auto-expansion if cash status changes
  React.useEffect(() => {
    if (isShortOnCash) {
      setIsExpanded(true);
    }
  }, [isShortOnCash]);

  const ownedSpaces = BOARD_SPACES.filter((s) => {
    const prop = properties[s.index.toString()];
    return prop && prop.ownerId === player.id;
  });

  return (
    <div className="mt-3 border-t border-slate-100 pt-3 text-left">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between text-xs font-bold transition cursor-pointer ${
          isShortOnCash
            ? "bg-amber-50 border-amber-300 text-amber-900 shadow-xs animate-pulse"
            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
        }`}
      >
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-amber-600 shrink-0" />
          <span>Manage Assets & Raise Cash</span>
          {ownedSpaces.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black bg-amber-200 text-amber-800">
              {ownedSpaces.length} {ownedSpaces.length === 1 ? "property" : "properties"}
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {isExpanded && (
        <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 text-xs">
          {isShortOnCash && (
            <div className="text-[11px] font-bold text-amber-800 bg-amber-100/80 border border-amber-200 p-2 rounded-xl flex items-start gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Short on cash! Needed: <strong>${requiredCost?.toLocaleString()}</strong> (You have <strong>${player.cash.toLocaleString()}</strong>). Sell houses/hotels or mortgage properties below to get cash!
              </span>
            </div>
          )}

          {ownedSpaces.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic text-center py-2">
              You don't own any properties to sell or mortgage.
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {ownedSpaces.map((space) => {
                const prop = properties[space.index.toString()];
                if (!prop) return null;

                const hasHotel = prop.hasHotel;
                const houses = prop.houses || 0;
                const canMortgage = houses === 0 && !hasHotel;

                return (
                  <div
                    key={space.index}
                    className="p-2 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="text-base shrink-0">{space.flag || "🏛️"}</span>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-xs truncate">{space.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {hasHotel
                            ? "🏨 1 Hotel"
                            : houses > 0
                            ? `🏡 ${houses} ${houses === 1 ? "House" : "Houses"}`
                            : "Vacant Land"}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      {hasHotel && onSellHotel && (
                        <button
                          type="button"
                          onClick={() => onSellHotel(space.index)}
                          className="py-1 px-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-[10px] rounded-lg transition cursor-pointer flex items-center gap-1"
                        >
                          Sell Hotel (+${space.price})
                        </button>
                      )}

                      {!hasHotel && houses > 0 && onSellHouse && (
                        <button
                          type="button"
                          onClick={() => onSellHouse(space.index)}
                          className="py-1 px-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-[10px] rounded-lg transition cursor-pointer flex items-center gap-1"
                        >
                          Sell House (+${space.price})
                        </button>
                      )}

                      {canMortgage && onMortgageProperty && (
                        <button
                          type="button"
                          onClick={() => onMortgageProperty(space.index)}
                          className="py-1 px-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold text-[10px] rounded-lg transition cursor-pointer flex items-center gap-1"
                        >
                          Mortgage (+${(space.price || 0) / 2})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CasinoModalContent: React.FC<{
  targetPlayer: Player;
  currentPlayer: Player;
  isHost: boolean;
  currentAction?: any;
  logs?: GameLog[];
  onCasinoPass?: () => void;
  onCasinoGambleResult?: (data: { betAmount: number; prediction: "ODD" | "EVEN"; diceRoll: [number, number]; won: boolean; continueGambling?: boolean }) => void;
}> = ({ targetPlayer, currentPlayer, isHost, currentAction, logs = [], onCasinoPass, onCasinoGambleResult }) => {
  const isAuthorized = currentPlayer?.id === targetPlayer?.id || isHost;
  const [mode, setMode] = React.useState<"CHOICE" | "BET_SETUP" | "ROLLING" | "RESULT">("CHOICE");
  const [betInput, setBetInput] = React.useState<string>("1000");
  const [prediction, setPrediction] = React.useState<"ODD" | "EVEN">("ODD");
  const [diceRoll, setDiceRoll] = React.useState<[number, number] | null>(null);
  const [isRolling, setIsRolling] = React.useState<boolean>(false);
  const [won, setWon] = React.useState<boolean | null>(null);

  const maxCashBet = Math.min(10000, Math.max(0, targetPlayer?.cash || 0));
  const parsedBet = parseInt(betInput, 10);
  const betAmount = isNaN(parsedBet) ? 0 : parsedBet;
  const canGamble = (targetPlayer?.cash || 0) > 0;
  const isBetValid = canGamble && betAmount > 0 && betAmount <= (targetPlayer?.cash || 0) && betAmount <= 10000;

  const casinoLogs = logs.filter((l) => l.message.includes("🎰") || l.message.toLowerCase().includes("casino")).slice(-4).reverse();

  const handleRollDice = () => {
    setIsRolling(true);
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      setDiceRoll([Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]);
      if (attempts > 8) {
        clearInterval(interval);
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        const sum = d1 + d2;
        const isOdd = sum % 2 !== 0;
        const hasWon = (prediction === "ODD" && isOdd) || (prediction === "EVEN" && !isOdd);
        setDiceRoll([d1, d2]);
        setWon(hasWon);
        setIsRolling(false);
        setMode("RESULT");
      }
    }, 100);
  };

  return (
    <div className="p-6 text-center space-y-4">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 text-3xl shadow-inner">
        🎰
      </div>

      <div className="space-y-1">
        <span className="text-[10px] uppercase font-bold tracking-widest text-amber-600 font-mono">
          Landed on Casino
        </span>
        <h3 className="text-xl font-bold text-slate-800">
          Casino Gaming Hall
        </h3>
        <p className="text-xs text-slate-500">
          Test your luck on an Odd or Even dice roll, or pass safely!
        </p>
      </div>

      {!(currentPlayer?.id === targetPlayer?.id) && isHost && (
        <div className="text-3xs text-amber-600 font-extrabold bg-amber-50 border border-amber-200/50 rounded-xl py-1.5 px-2 flex items-center justify-center gap-1 animate-pulse my-1">
          👑 Host Rescue Action active for {targetPlayer?.name}
        </div>
      )}

      {!isAuthorized ? (
        <div className="space-y-4 pt-1 text-left">
          {/* Live Spectator Header Banner */}
          <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/25 to-amber-500/15 border border-amber-300 rounded-2xl p-4 text-center space-y-1.5 relative overflow-hidden shadow-sm">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-800 font-extrabold text-[10px] uppercase tracking-wider animate-pulse border border-amber-300/60">
              <span className="text-sm">🎰</span> Live Spectator Room
            </div>
            <h4 className="text-base font-black text-slate-800">
              {targetPlayer?.name} is Gambling at the Casino!
            </h4>
            <p className="text-2xs text-slate-600 leading-relaxed max-w-xs mx-auto">
              The turn timer is <strong>paused</strong> while {targetPlayer?.name} makes their moves. Watch live as they test their luck!
            </p>
          </div>

          {/* Active Gambler Player Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${targetPlayer?.color || "bg-amber-500"} text-white font-black flex items-center justify-center text-lg shadow-sm ring-2 ring-amber-300`}>
                {targetPlayer?.avatar || targetPlayer?.name[0]}
              </div>
              <div>
                <p className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  {targetPlayer?.name}
                  <span className="text-[9px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 uppercase font-mono">
                    High Roller
                  </span>
                </p>
                <p className="text-2xs font-mono font-extrabold text-emerald-600 mt-0.5">
                  Cash: ${targetPlayer?.cash.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-2xs font-black text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl animate-pulse">
              <span>🎲</span> Gambling Live...
            </div>
          </div>

          {/* Last Gamble Result Highlight (if available) */}
          {currentAction?.lastGamble && (
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-3.5 space-y-2 text-center shadow-xs">
              <div className="inline-flex items-center gap-1.5 text-2xs font-black uppercase text-emerald-800 tracking-wider">
                <span>🎉</span> RECENT CASINO WIN!
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-10 h-10 bg-slate-900 text-white font-black text-lg rounded-xl flex items-center justify-center border border-amber-400">
                  {currentAction.lastGamble.diceRoll[0]}
                </div>
                <span className="font-bold text-slate-400">+</span>
                <div className="w-10 h-10 bg-slate-900 text-white font-black text-lg rounded-xl flex items-center justify-center border border-amber-400">
                  {currentAction.lastGamble.diceRoll[1]}
                </div>
                <span className="font-bold text-slate-400">=</span>
                <div className="w-10 h-10 bg-amber-500 text-white font-black text-lg rounded-xl flex items-center justify-center shadow">
                  {currentAction.lastGamble.sum}
                </div>
              </div>
              <p className="text-xs font-extrabold text-emerald-900 font-mono">
                Predicted <span className="underline">{currentAction.lastGamble.prediction}</span> & Won +${currentAction.lastGamble.betAmount.toLocaleString()}!
              </p>
              <p className="text-[10px] text-emerald-700 font-bold italic">
                🔥 {targetPlayer?.name} decided to keep gambling!
              </p>
            </div>
          )}

          {/* Casino Rules Summary */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 space-y-1 text-2xs text-amber-900">
            <p className="font-bold flex items-center gap-1">
              <span>🎰</span> How Casino Gambling Works:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-amber-800">
              <li>Bet any custom amount up to <strong>$10,000</strong> on <strong>ODD</strong> or <strong>EVEN</strong>.</li>
              <li><strong>Correct guess:</strong> Wins double bet from Bank!</li>
              <li><strong>Incorrect guess:</strong> Bet lost to Party House Bank!</li>
              <li>Players can keep gambling as long as they win!</li>
            </ul>
          </div>

          {/* Recent Casino Activity Logs */}
          {casinoLogs.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] font-extrabold uppercase font-mono tracking-wider text-slate-500">
                Recent Casino Logs:
              </p>
              <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                {casinoLogs.map((log) => (
                  <div key={log.id} className="text-2xs bg-slate-100 border border-slate-200/80 rounded-lg p-2 text-slate-700 font-medium leading-relaxed">
                    {log.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {mode === "CHOICE" && (
            <div className="space-y-3 pt-2">
              {/* Last Gamble Result Highlight if continuing */}
              {currentAction?.lastGamble && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 text-center text-2xs space-y-1">
                  <div className="font-black text-emerald-800 flex items-center justify-center gap-1">
                    <span>🎉</span> LAST ROLL: 🎲{currentAction.lastGamble.diceRoll[0]} + 🎲{currentAction.lastGamble.diceRoll[1]} = {currentAction.lastGamble.sum} ({currentAction.lastGamble.parity})
                  </div>
                  <p className="text-emerald-700 font-bold">
                    Won +${currentAction.lastGamble.betAmount.toLocaleString()} on {currentAction.lastGamble.prediction}! Roll again or pass?
                  </p>
                </div>
              )}
              
              {!canGamble && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-2xs text-red-700 font-bold text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-red-800 font-extrabold uppercase tracking-wide">
                    <span>🚫</span> Pay Later Prohibited at Casino
                  </div>
                  <p className="text-red-600 font-medium">
                    You have <strong>$0 liquid cash</strong>. Pay Later credit cannot be used to fund Casino bets. Please pass safely.
                  </p>
                </div>
              )}

              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-left space-y-1 text-2xs text-amber-900">
                <p className="font-bold flex items-center gap-1">
                  <span>🎰</span> How Casino Gambling Works:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                  <li>Bet any liquid cash amount up to <strong>$10,000</strong> (No Pay Later).</li>
                  <li>Pick <strong>ODD</strong> or <strong>EVEN</strong> for total sum of 2 dice.</li>
                  <li><strong>Win:</strong> Receive double your bet from Bank (+$X profit)!</li>
                  <li><strong>Loss:</strong> Gambled cash goes directly to Party House Bank!</li>
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => setMode("BET_SETUP")}
                  disabled={!canGamble}
                  id="btn-casino-gamble"
                  className={`py-3 px-4 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 ${
                    canGamble
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white cursor-pointer"
                      : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none"
                  }`}
                >
                  <span>🎰 Gamble</span>
                </button>
                <button
                  onClick={onCasinoPass}
                  id="btn-casino-pass"
                  className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>🚪 Pass Safely</span>
                </button>
              </div>
            </div>
          )}

          {mode === "BET_SETUP" && (
            <div className="space-y-4 pt-1 text-left">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">Bet Amount ($1 to $10,000):</span>
                  <span className="text-2xs font-mono font-extrabold text-emerald-600">
                    Liquid Cash: ${targetPlayer.cash.toLocaleString()}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    id="casino-custom-bet-input"
                    type="number"
                    min={1}
                    max={maxCashBet}
                    value={betInput}
                    onChange={(e) => setBetInput(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder="Enter bet amount..."
                    className="w-full pl-7 pr-3 py-2 bg-white border border-amber-300 focus:border-amber-500 rounded-lg text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                  />
                </div>

                {betAmount > targetPlayer.cash && (
                  <p className="text-2xs text-rose-600 font-extrabold flex items-center gap-1">
                    <span>⚠️</span> Bet exceeds liquid cash (${targetPlayer.cash.toLocaleString()}). Pay Later is strictly prohibited.
                  </p>
                )}

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[100, 500, 1000, 5000, 10000].map((amt) => {
                    const isDisabled = amt > targetPlayer.cash;
                    return (
                      <button
                        key={amt}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setBetInput(amt.toString())}
                        className={`py-1 px-2.5 text-3xs font-extrabold rounded-md font-mono transition ${
                          isDisabled
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/50"
                            : "bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
                        }`}
                      >
                        ${amt.toLocaleString()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700">Select Prediction:</span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPrediction("ODD")}
                    className={`py-3 px-3 rounded-xl border-2 font-bold text-xs flex flex-col items-center gap-1 cursor-pointer transition ${
                      prediction === "ODD"
                        ? "bg-purple-50 border-purple-600 text-purple-900 shadow-sm"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-sm">🎲 ODD</span>
                    <span className="text-[10px] font-mono text-purple-600 font-extrabold">Sum: 1, 3, 5, 7, 9, 11</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrediction("EVEN")}
                    className={`py-3 px-3 rounded-xl border-2 font-bold text-xs flex flex-col items-center gap-1 cursor-pointer transition ${
                      prediction === "EVEN"
                        ? "bg-blue-50 border-blue-600 text-blue-900 shadow-sm"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-sm">🎲 EVEN</span>
                    <span className="text-[10px] font-mono text-blue-600 font-extrabold">Sum: 2, 4, 6, 8, 10, 12</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setMode("CHOICE")}
                  className="py-2.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={() => setMode("ROLLING")}
                  disabled={!isBetValid}
                  className={`flex-1 py-2.5 px-4 font-bold text-xs rounded-xl shadow-md transition text-center ${
                    isBetValid
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white cursor-pointer"
                      : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none"
                  }`}
                >
                  {isBetValid
                    ? `Confirm Bet: $${betAmount.toLocaleString()} on ${prediction}`
                    : "Invalid Bet Amount"}
                </button>
              </div>
            </div>
          )}

          {mode === "ROLLING" && (
            <div className="space-y-4 pt-2 text-center">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1">
                <p className="text-3xs text-amber-600 font-bold uppercase tracking-wider font-mono">Current Bet On Hold</p>
                <p className="text-2xl font-black text-amber-800 font-mono">${betAmount.toLocaleString()}</p>
                <p className="text-xs font-bold text-amber-700">Predicted: <span className="bg-amber-200 px-2 py-0.5 rounded-md font-extrabold">{prediction}</span></p>
              </div>

              <div className="py-2 flex items-center justify-center gap-4">
                <div className="w-16 h-16 bg-slate-900 text-white text-3xl font-black rounded-2xl flex items-center justify-center border-2 border-amber-400 shadow-md animate-bounce">
                  {diceRoll ? diceRoll[0] : "🎲"}
                </div>
                <span className="text-xl font-bold text-slate-400">+</span>
                <div className="w-16 h-16 bg-slate-900 text-white text-3xl font-black rounded-2xl flex items-center justify-center border-2 border-amber-400 shadow-md animate-bounce">
                  {diceRoll ? diceRoll[1] : "🎲"}
                </div>
              </div>

              <button
                onClick={handleRollDice}
                disabled={isRolling}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-sm shadow-md cursor-pointer disabled:opacity-50"
              >
                {isRolling ? "Rolling Dice..." : "🎲 Roll Casino Dice Now!"}
              </button>
            </div>
          )}

          {mode === "RESULT" && diceRoll && (
            <div className="space-y-4 pt-2 text-center">
              <div className="flex items-center justify-center gap-3">
                <div className="w-14 h-14 bg-slate-900 text-white text-2xl font-black rounded-xl flex items-center justify-center border-2 border-amber-400 shadow">
                  {diceRoll[0]}
                </div>
                <span className="text-lg font-bold text-slate-400">+</span>
                <div className="w-14 h-14 bg-slate-900 text-white text-2xl font-black rounded-xl flex items-center justify-center border-2 border-amber-400 shadow">
                  {diceRoll[1]}
                </div>
                <span className="text-lg font-bold text-slate-400">=</span>
                <div className="w-14 h-14 bg-amber-500 text-white text-2xl font-black rounded-xl flex items-center justify-center shadow">
                  {diceRoll[0] + diceRoll[1]}
                </div>
              </div>

              <div className="text-xs font-mono font-bold text-slate-600">
                Sum Total = {diceRoll[0] + diceRoll[1]} ({(diceRoll[0] + diceRoll[1]) % 2 !== 0 ? "ODD" : "EVEN"})
              </div>

              {won ? (
                <>
                  <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl space-y-1">
                    <div className="text-lg font-black text-emerald-700 flex items-center justify-center gap-1.5">
                      🎉 YOU WON ${betAmount.toLocaleString()}!
                    </div>
                    <p className="text-xs text-emerald-800">
                      Your prediction <strong className="uppercase">{prediction}</strong> was correct! You receive double your bet from the Bank.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      onClick={() => {
                        if (onCasinoGambleResult) {
                          onCasinoGambleResult({
                            betAmount,
                            prediction,
                            diceRoll: diceRoll!,
                            won: true,
                            continueGambling: true
                          });
                        }
                        setMode("BET_SETUP");
                        setDiceRoll(null);
                        setWon(null);
                        setIsRolling(false);
                      }}
                      className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>🎰 Gamble Again</span>
                    </button>
                    <button
                      onClick={() => {
                        if (onCasinoGambleResult) {
                          onCasinoGambleResult({
                            betAmount,
                            prediction,
                            diceRoll: diceRoll!,
                            won: true,
                            continueGambling: false
                          });
                        }
                      }}
                      className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>🚪 Pass & End Turn</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-1">
                    <div className="text-lg font-black text-rose-700 flex items-center justify-center gap-1.5">
                      💸 YOU LOST ${betAmount.toLocaleString()}
                    </div>
                    <p className="text-xs text-rose-800">
                      The sum was <strong className="uppercase">{(diceRoll[0] + diceRoll[1]) % 2 !== 0 ? "ODD" : "EVEN"}</strong> (you guessed {prediction}). Your bet was added to Party House Bank! Your turn ends now.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (onCasinoGambleResult) {
                        onCasinoGambleResult({
                          betAmount,
                          prediction,
                          diceRoll: diceRoll!,
                          won: false,
                          continueGambling: false
                        });
                      }
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                  >
                    🚪 End Turn
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const Modals: React.FC<ModalsProps> = ({
  currentAction,
  players,
  selfPlayerId,
  properties,
  logs = [],
  onBuyProperty,
  onPassProperty,
  onDrawCard,
  onResolveCard,
  onJailChoice,
  onPartyHouseChoice,
  onVoteGameEnd,
  partyHouseBank,
  onBuildHouseFromModal,
  onPassBuildFromModal,
  onSettlePayLater,
  onSellHouse,
  onSellHotel,
  onMortgageProperty,
  onCasinoPass,
  onCasinoGambleResult,
  isOnline,
}) => {
  if (!currentAction) return null;

  const currentPlayer = players.find((p) => p.id === selfPlayerId);
  const targetPlayer = currentAction && currentAction.playerIndex !== undefined ? players[currentAction.playerIndex] : null;
  const isHost = currentPlayer?.isHost === true;
  const canHostAct = isHost && !isOnline;

  const [modalSettleAmount, setModalSettleAmount] = React.useState<string>("");
  const [modalUseCredit, setModalUseCredit] = React.useState<boolean>(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100"
      >
        {/* BUY_OR_PASS MODAL */}
        {currentAction.type === "BUY_OR_PASS" && currentAction.space && (
          <div className="p-6 text-center space-y-4">
            <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-3xl shadow-md overflow-hidden ${currentAction.space.colorClass || "bg-slate-100 text-slate-800"}`}>
              {(() => {
                const code = getCountryCode(currentAction.space.name);
                return code ? (
                  <img
                    src={`https://flagcdn.com/w160/${code}.png`}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{currentAction.space.flag || "🗺️"}</span>
                );
              })()}
            </div>
            
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono">
                Unowned Property Landed
              </span>
              <h3 className="text-xl font-bold text-slate-800">
                {currentAction.space.name}
              </h3>
              <p className="text-xs text-slate-500">
                Do you want to purchase this {currentAction.space.type.toLowerCase()}?
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 grid grid-cols-2 gap-4 text-left">
              <div>
                <p className="text-3xs text-slate-400 font-bold uppercase font-mono">Purchase Price</p>
                <p className="text-lg font-black text-slate-800 font-mono">${currentAction.space.price}</p>
              </div>
              <div>
                <p className="text-3xs text-slate-400 font-bold uppercase font-mono">Base Rent</p>
                <p className="text-lg font-black text-slate-800 font-mono">${currentAction.space.rentBase}</p>
              </div>
            </div>

            {targetPlayer && (
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100/80 flex justify-between items-center text-left text-2xs text-slate-500">
                <div>
                  <span className="font-medium text-slate-400 font-mono uppercase text-[9px]">Your Cash:</span>
                  <span className="ml-1 font-extrabold text-slate-700">${targetPlayer.cash.toLocaleString()}</span>
                </div>
                <div className="border-r border-slate-200 h-4" />
                <div>
                  <span className="font-medium text-slate-400 font-mono uppercase text-[9px]">Your Credit Limit:</span>
                  <span className="ml-1 font-extrabold text-slate-700">${(10000 - targetPlayer.creditUsed).toLocaleString()}</span>
                </div>
              </div>
            )}

            {!(currentPlayer?.id === targetPlayer?.id) && canHostAct && (
              <div className="text-3xs text-amber-600 font-extrabold bg-amber-50 border border-amber-200/50 rounded-xl py-1.5 px-2 flex items-center justify-center gap-1 animate-pulse my-2">
                👑 Host Rescue Action active for {targetPlayer?.name}
              </div>
            )}

            {currentPlayer?.id === targetPlayer?.id || canHostAct ? (
              targetPlayer && (targetPlayer.payLaterBalance || 0) > 2000 ? (
                <div className="flex flex-col gap-3 pt-2 text-left bg-rose-50/50 border border-rose-100 p-4 rounded-2xl">
                  <div className="flex items-start gap-2 text-rose-800">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-600" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider">Purchase Blocked</h4>
                      <p className="text-[10px] text-rose-700 leading-relaxed mt-0.5">
                        Your Pay Later balance (<strong>${targetPlayer.payLaterBalance.toLocaleString()}</strong>) exceeds the <strong>$2,000</strong> property purchase threshold. Settle your balance to less than $2,000 to unlock buying.
                      </p>
                    </div>
                  </div>

                  {/* Settle Form */}
                  <div className="space-y-2 border-t border-rose-200/50 pt-2 text-xs">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase font-mono">
                        Settle Method
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setModalUseCredit(false)}
                          className={`py-1 px-2 rounded-lg font-bold text-[10px] border transition cursor-pointer flex items-center justify-center gap-1 ${
                            !modalUseCredit
                              ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          💵 Cash (${targetPlayer.cash.toLocaleString()})
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalUseCredit(true)}
                          className={`py-1 px-2 rounded-lg font-bold text-[10px] border transition cursor-pointer flex items-center justify-center gap-1 ${
                            modalUseCredit
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                              : "bg-white border-slate-200 text-indigo-600 hover:bg-indigo-50/50"
                          }`}
                        >
                          💳 Credit Card
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase font-mono flex justify-between items-center">
                        <span>Settle Amount ($)</span>
                        <span className="text-[8px] text-slate-400 normal-case">Enter custom amount</span>
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          value={modalSettleAmount}
                          onChange={(e) => setModalSettleAmount(e.target.value)}
                          placeholder={`Max: ${targetPlayer.payLaterBalance}`}
                          className="flex-1 min-w-0 py-1 px-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => setModalSettleAmount(targetPlayer.payLaterBalance.toString())}
                          className="py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[9px] rounded-lg border border-slate-200 transition cursor-pointer"
                        >
                          MAX
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const neededAmt = targetPlayer.payLaterBalance - 1999;
                            if (neededAmt > 0) {
                              setModalSettleAmount(neededAmt.toString());
                            }
                          }}
                          className="py-1 px-2 bg-amber-100 hover:bg-amber-200 text-amber-800 font-extrabold text-[9px] rounded-lg border border-amber-200 transition cursor-pointer animate-pulse"
                          title="Settle down to $1,999 to unlock purchase"
                        >
                          Settle &lt;$2k
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const amt = parseFloat(modalSettleAmount);
                        if (isNaN(amt) || amt <= 0) {
                          alert("Please enter a valid amount greater than $0.");
                          return;
                        }
                        if (amt > targetPlayer.payLaterBalance) {
                          alert(`Cannot settle more than your current Pay Later balance of $${targetPlayer.payLaterBalance.toLocaleString()}.`);
                          return;
                        }
                        if (onSettlePayLater) {
                          onSettlePayLater(targetPlayer.id, amt, modalUseCredit);
                          setModalSettleAmount(""); // Reset input on success
                        }
                      }}
                      className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-lg shadow-sm transition cursor-pointer"
                    >
                      Confirm Settle: ${modalSettleAmount ? parseFloat(modalSettleAmount).toLocaleString() : "0"}
                    </button>
                  </div>

                  {/* Pass is still allowed */}
                  <div className="pt-1.5 border-t border-rose-200/30">
                    <button
                      onClick={onPassProperty}
                      id="btn-pass-property"
                      className="w-full py-2 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-500 font-semibold text-xs text-center transition cursor-pointer"
                    >
                      Decline & Pass Country
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 pt-2">
                  <div className="flex gap-3">
                    <button
                      onClick={onPassProperty}
                      id="btn-pass-property"
                      className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-600 font-semibold text-sm transition cursor-pointer"
                    >
                      Pass
                    </button>
                    <button
                      onClick={() => onBuyProperty(false)}
                      id="btn-buy-property"
                      disabled={(targetPlayer?.cash || 0) < (currentAction.space.price || 0)}
                      className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition cursor-pointer"
                    >
                      Buy for ${currentAction.space.price}
                    </button>
                  </div>

                  {/* Credit Card Option Button */}
                  <button
                    onClick={() => onBuyProperty(true)}
                    id="btn-buy-property-credit"
                    disabled={
                      ((targetPlayer?.cash || 0) + (10000 - (targetPlayer?.creditUsed || 0))) < (currentAction.space.price || 0) ||
                      (targetPlayer?.creditUsed || 0) >= 10000
                    }
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 text-white font-semibold text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    💳 Pay by Credit Card (${currentAction.space.price})
                  </button>

                  {((targetPlayer?.cash || 0) < (currentAction.space.price || 0)) && 
                   ((targetPlayer?.cash || 0) + (10000 - (targetPlayer?.creditUsed || 0)) >= (currentAction.space.price || 0)) && (
                    <p className="text-[10px] text-indigo-600 font-bold bg-indigo-50 border border-indigo-100 rounded-lg py-1.5 px-2 text-center animate-pulse">
                      💡 You don't have enough cash, but you can buy this using Credit Card!
                    </p>
                  )}
                </div>
              )
            ) : (
              <div className="text-xs text-slate-400 italic pt-2">
                Waiting for {targetPlayer?.name} to make a decision...
              </div>
            )}

            {targetPlayer && (currentPlayer?.id === targetPlayer.id || canHostAct) && (
              <ManageAssetsSection
                player={targetPlayer}
                properties={properties}
                onSellHouse={onSellHouse}
                onSellHotel={onSellHotel}
                onMortgageProperty={onMortgageProperty}
                requiredCost={currentAction.space.price}
                canManage={currentPlayer?.id === targetPlayer.id || canHostAct}
              />
            )}
          </div>
        )}

        {/* CHANCE_DRAW / UNO_DRAW MODALS */}
        {(currentAction.type === "CHANCE_DRAW" || currentAction.type === "UNO_DRAW") && (
          <div className="p-6 text-center space-y-4">
            <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-md ${
              currentAction.type === "CHANCE_DRAW" ? "bg-amber-500 text-white" : "bg-blue-600 text-white"
            }`}>
              {currentAction.type === "CHANCE_DRAW" ? "❓" : "🃏"}
            </div>

            <div className="space-y-1">
              <span className={`text-[10px] uppercase font-bold tracking-widest font-mono ${
                currentAction.type === "CHANCE_DRAW" ? "text-amber-500" : "text-blue-500"
              }`}>
                {currentAction.type === "CHANCE_DRAW" ? "Chance space landed" : "UNO space landed"}
              </span>
              <h3 className="text-xl font-bold text-slate-800">
                {currentAction.type === "CHANCE_DRAW" ? "Chance Draw" : "UNO Draw"}
              </h3>
            </div>

            {/* Flippable Card UI */}
            <div className={`relative w-full aspect-video rounded-2xl p-5 border-2 flex flex-col justify-between text-left shadow-lg overflow-hidden transition-all ${
              currentAction.cardText
                ? currentAction.type === "CHANCE_DRAW"
                  ? "bg-amber-50/50 border-amber-300"
                  : "bg-blue-50/50 border-blue-300"
                : "bg-slate-50 border-dashed border-slate-300"
            }`}>
              {currentAction.cardText ? (
                <>
                  <p className="text-xs font-bold text-slate-700 italic flex-1 flex items-center justify-center text-center">
                    "{currentAction.cardText}"
                  </p>
                  <div className="flex items-center justify-between text-3xs font-semibold text-slate-400 font-mono border-t border-slate-200/50 pt-2 shrink-0">
                    <span>{currentAction.type === "CHANCE_DRAW" ? "CHANCE CARD" : "UNO CARD"}</span>
                    <span>No. {Math.floor(Math.random() * 10) + 1}</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
                  <span className="text-xs font-bold italic">Draw exactly 1 card to execute</span>
                </div>
              )}
            </div>

            {!(currentPlayer?.id === targetPlayer?.id) && canHostAct && (
              <div className="text-3xs text-amber-600 font-extrabold bg-amber-50 border border-amber-200/50 rounded-xl py-1.5 px-2 flex items-center justify-center gap-1 animate-pulse my-2">
                👑 Host Rescue Action active for {targetPlayer?.name}
              </div>
            )}

            {currentPlayer?.id === targetPlayer?.id || canHostAct ? (
              <div className="pt-2">
                {!currentAction.cardText ? (
                  <button
                    onClick={() => onDrawCard(currentAction.type === "CHANCE_DRAW" ? "CHANCE" : "UNO")}
                    id="btn-draw-card"
                    className={`w-full py-3 px-4 rounded-xl text-white font-semibold text-sm shadow-sm transition cursor-pointer ${
                      currentAction.type === "CHANCE_DRAW" ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {currentPlayer?.id === targetPlayer?.id ? "Draw Card" : `👑 Host Rescue: Draw Card for ${targetPlayer?.name}`}
                  </button>
                ) : (
                  <button
                    onClick={onResolveCard}
                    id="btn-resolve-card"
                    className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm shadow-md transition cursor-pointer"
                  >
                    {currentPlayer?.id === targetPlayer?.id ? "Apply Card Action" : `👑 Host Rescue: Apply for ${targetPlayer?.name}`}
                  </button>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic pt-2">
                Waiting for {targetPlayer?.name} to draw...
              </div>
            )}
          </div>
        )}

        {/* JAIL_CHOICE MODAL */}
        {currentAction.type === "JAIL_CHOICE" && (
          <div className="p-6 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 text-3xl">
              👮
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-red-500 font-mono">
                Detained in Prison
              </span>
              <h3 className="text-xl font-bold text-slate-800">
                Bail out of Jail
              </h3>
              <p className="text-xs text-slate-500">
                You must pay $500 bail, or skip your turn's roll.
              </p>
            </div>

            {!(currentPlayer?.id === targetPlayer?.id) && canHostAct && (
              <div className="text-3xs text-amber-600 font-extrabold bg-amber-50 border border-amber-200/50 rounded-xl py-1.5 px-2 flex items-center justify-center gap-1 animate-pulse my-2">
                👑 Host Rescue Action active for {targetPlayer?.name}
              </div>
            )}

            {currentPlayer?.id === targetPlayer?.id || canHostAct ? (
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={() => onJailChoice("PAY")}
                  id="btn-jail-pay"
                  disabled={(targetPlayer?.cash || 0) < 500}
                  className="w-full py-3 px-4 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-slate-700 font-semibold text-xs flex items-center justify-between transition cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 font-bold">
                    <Coins className="h-4 w-4 text-amber-500" /> {currentPlayer?.id === targetPlayer?.id ? "Pay $500 Bail" : `👑 Host Rescue: Pay Bail for ${targetPlayer?.name}`}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">Immediate release</span>
                </button>

                <button
                  onClick={() => onJailChoice("SKIP")}
                  id="btn-jail-skip"
                  className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs flex items-center justify-between transition shadow-sm cursor-pointer"
                >
                  <span className="font-bold">{currentPlayer?.id === targetPlayer?.id ? "Skip Roll & Stay in Jail" : `👑 Host Rescue: Skip Roll for ${targetPlayer?.name}`}</span>
                  <span className="font-mono text-[10px] text-slate-300">Wait till next turn</span>
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic pt-2">
                Waiting for {targetPlayer?.name} to choose...
              </div>
            )}

            {targetPlayer && (currentPlayer?.id === targetPlayer.id || canHostAct) && (
              <ManageAssetsSection
                player={targetPlayer}
                properties={properties}
                onSellHouse={onSellHouse}
                onSellHotel={onSellHotel}
                onMortgageProperty={onMortgageProperty}
                requiredCost={500}
                canManage={currentPlayer?.id === targetPlayer.id || canHostAct}
              />
            )}
          </div>
        )}

        {/* PARTY_HOUSE_CHOICE MODAL */}
        {currentAction.type === "PARTY_HOUSE_CHOICE" && (
          <div className="p-6 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 text-3xl">
              🥳
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-500 font-mono">
                Landed on Party House
              </span>
              <h3 className="text-xl font-bold text-slate-800">
                Choose Party Gift!
              </h3>
              <p className="text-xs text-slate-500">
                You can withdraw the entire Party Bank or collect $200 from each player.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-center items-center">
              <div>
                <p className="text-3xs text-slate-400 font-bold uppercase font-mono">Party House Bank Total</p>
                <p className="text-lg font-black text-amber-600 font-mono">${partyHouseBank.toLocaleString()}</p>
              </div>
            </div>

            {!(currentPlayer?.id === targetPlayer?.id) && canHostAct && (
              <div className="text-3xs text-amber-600 font-extrabold bg-amber-50 border border-amber-200/50 rounded-xl py-1.5 px-2 flex items-center justify-center gap-1 animate-pulse my-2">
                👑 Host Rescue Action active for {targetPlayer?.name}
              </div>
            )}

            {currentPlayer?.id === targetPlayer?.id || canHostAct ? (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => onPartyHouseChoice("BANK")}
                  id="btn-party-bank"
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-xs flex flex-col items-center justify-center gap-1 shadow-sm cursor-pointer"
                >
                  <Landmark className="h-5 w-5 fill-white/20" />
                  <span>{currentPlayer?.id === targetPlayer?.id ? "Withdraw Bank" : "👑 Host Rescue: Withdraw"}</span>
                  <span className="text-2xs font-bold font-mono opacity-90">${partyHouseBank}</span>
                </button>

                <button
                  onClick={() => onPartyHouseChoice("PLAYERS")}
                  id="btn-party-players"
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs flex flex-col items-center justify-center gap-1 shadow-sm cursor-pointer"
                >
                  <PartyPopper className="h-5 w-5 opacity-90" />
                  <span>{currentPlayer?.id === targetPlayer?.id ? "Get $200 / Player" : "👑 Host Rescue: Get $200"}</span>
                  <span className="text-2xs font-bold font-mono opacity-90">${(players.length - 1) * 200} total</span>
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic pt-2">
                Waiting for {targetPlayer?.name} to choose...
              </div>
            )}
          </div>
        )}

        {/* CASINO_CHOICE MODAL */}
        {currentAction.type === "CASINO_CHOICE" && targetPlayer && (
          <CasinoModalContent
            targetPlayer={targetPlayer}
            currentPlayer={currentPlayer!}
            isHost={canHostAct}
            currentAction={currentAction}
            logs={logs}
            onCasinoPass={onCasinoPass}
            onCasinoGambleResult={onCasinoGambleResult}
          />
        )}

        {/* GAME_OVER_VOTE MODAL */}
        {currentAction.type === "GAME_OVER_VOTE" && currentAction.votes && (
          <div className="p-6 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <Vote className="h-7 w-7" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 font-mono">
                UNANIMOUS VOTE REQUESTED
              </span>
              <h3 className="text-lg font-extrabold text-slate-800">
                Vote to End Game
              </h3>
              <p className="text-xs text-slate-500">
                A player has called a vote to end the game. Game ends ONLY by unanimous yes!
              </p>
            </div>

            {/* Votes tracker */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1.5 text-left">
              <p className="text-3xs text-slate-400 font-bold uppercase font-mono mb-1">Voting Status:</p>
              {players.map((p) => {
                const voted = currentAction.votes[p.id];
                return (
                  <div key={p.id} className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-700">{p.avatar} {p.name}</span>
                    {voted === true ? (
                      <span className="text-emerald-600 font-bold">✔️ YES</span>
                    ) : voted === false ? (
                      <span className="text-red-500 font-bold">❌ NO</span>
                    ) : (
                      <span className="text-slate-400 italic font-medium">Pending...</span>
                    )}
                  </div>
                );
              })}
            </div>

            {currentAction.votes[selfPlayerId] === undefined ? (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => onVoteGameEnd(false)}
                  id="btn-vote-no"
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:border-red-400 hover:bg-red-50 text-red-600 font-bold text-sm transition cursor-pointer"
                >
                  Vote No (Keep Playing)
                </button>
                <button
                  onClick={() => onVoteGameEnd(true)}
                  id="btn-vote-yes"
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition cursor-pointer"
                >
                  Vote Yes (End Game)
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic pt-2">
                Thank you for voting. Waiting for other players...
              </div>
            )}
          </div>
        )}

        {/* BUILD_DECISION MODAL */}
        {currentAction.type === "BUILD_DECISION" && currentAction.propertyIndex !== undefined && (() => {
          const space = BOARD_SPACES[currentAction.propertyIndex];
          const prop = properties[currentAction.propertyIndex.toString()];
          if (!space || !prop) return null;

          const isHotel = prop.houses === 3;
          const buildCost = space.price || 0;
          const currentHouses = prop.houses;
          const nextRentIncrease = isHotel ? 1500 : 1000;
          const buildTypeName = isHotel ? "Hotel" : "House";

          return (
            <div className="p-6 text-center space-y-4">
              <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-3xl shadow-md overflow-hidden ${space.colorClass || "bg-slate-100 text-slate-800"}`}>
                {(() => {
                  const code = getCountryCode(space.name);
                  return code ? (
                    <img
                      src={`https://flagcdn.com/w160/${code}.png`}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span>{space.flag || "🗺️"}</span>
                  );
                })()}
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-500 font-mono">
                  🏡 Welcome Home!
                </span>
                <h3 className="text-xl font-bold text-slate-800">
                  {space.name}
                </h3>
                <p className="text-xs text-slate-500">
                  You landed on your own property. Would you like to build {isHotel ? "a Hotel" : "a House"}?
                </p>
              </div>

              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 grid grid-cols-2 gap-4 text-left">
                <div>
                  <p className="text-3xs text-indigo-400 font-bold uppercase font-mono">Build Cost</p>
                  <p className="text-lg font-black text-indigo-700 font-mono">${buildCost.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-3xs text-indigo-400 font-bold uppercase font-mono">Rent Boost</p>
                  <p className="text-lg font-black text-emerald-600 font-mono">+${nextRentIncrease.toLocaleString()}</p>
                </div>
              </div>

              <div className="text-left bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium font-semibold">Current Development:</span>
                  <span className="font-extrabold text-slate-700 font-mono text-xs">
                    {prop.hasHotel ? "🏨 1 Hotel" : prop.houses === 0 ? "None (Vacant Land)" : `🏡 ${currentHouses} ${currentHouses === 1 ? "House" : "Houses"}`}
                  </span>
                </div>
                <div className="border-t border-slate-100 my-1" />
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium font-mono uppercase text-[9px]">Your Cash Balance:</span>
                  <span className={`font-black font-mono text-xs ${targetPlayer && targetPlayer.cash >= buildCost ? "text-emerald-600" : "text-red-500"}`}>
                    ${targetPlayer ? targetPlayer.cash.toLocaleString() : "0"}
                  </span>
                </div>
              </div>

              {!(currentPlayer?.id === targetPlayer?.id) && canHostAct && (
                <div className="text-3xs text-amber-600 font-extrabold bg-amber-50 border border-amber-200/50 rounded-xl py-1.5 px-2 flex items-center justify-center gap-1 animate-pulse my-2">
                  👑 Host Rescue Action active for {targetPlayer?.name}
                </div>
              )}

              {currentPlayer?.id === targetPlayer?.id || canHostAct ? (
                <div className="space-y-2 pt-2">
                  <div className="flex gap-3">
                    <button
                      onClick={onPassBuildFromModal}
                      id="btn-pass-build"
                      className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 font-semibold text-sm transition cursor-pointer"
                    >
                      {currentPlayer?.id === targetPlayer?.id ? "Skip" : "👑 Host Skip"}
                    </button>
                    <button
                      onClick={() => onBuildHouseFromModal(currentAction.propertyIndex!, false)}
                      id="btn-build-house"
                      disabled={!targetPlayer || targetPlayer.cash < buildCost}
                      className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition cursor-pointer"
                    >
                      {currentPlayer?.id === targetPlayer?.id ? `Build ${buildTypeName}` : `👑 Host Build ${buildTypeName}`}
                    </button>
                  </div>

                  {/* Credit Card Option Button for Building */}
                  <button
                    onClick={() => onBuildHouseFromModal(currentAction.propertyIndex!, true)}
                    id="btn-build-house-credit"
                    disabled={
                      !targetPlayer ||
                      (targetPlayer.cash + (10000 - (targetPlayer.creditUsed || 0))) < buildCost ||
                      (targetPlayer.creditUsed || 0) >= 10000
                    }
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 text-white font-semibold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    💳 Pay by Credit Card (${buildCost})
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic pt-2">
                  Waiting for {targetPlayer?.name} to choose whether to build...
                </div>
              )}

              {targetPlayer && (currentPlayer?.id === targetPlayer.id || canHostAct) && (
                <ManageAssetsSection
                  player={targetPlayer}
                  properties={properties}
                  onSellHouse={onSellHouse}
                  onSellHotel={onSellHotel}
                  onMortgageProperty={onMortgageProperty}
                  requiredCost={buildCost}
                  canManage={currentPlayer?.id === targetPlayer.id || canHostAct}
                />
              )}
            </div>
          );
        })()}
      </motion.div>
    </div>
  );
};
export default Modals;
