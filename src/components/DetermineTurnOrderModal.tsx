import React, { useState, useEffect } from "react";
import { Player, TurnOrderData, GameState } from "../types";
import {
  createInitialTurnOrderData,
  rollForPlayerInTurnOrder,
  autoRollAllTurnOrder
} from "../utils/turnOrder";
import { soundEffects } from "../soundEffects";
import {
  Dices,
  Trophy,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  Play,
  ArrowRight,
  ShieldCheck,
  History
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DetermineTurnOrderModalProps {
  players: Player[];
  isOnline: boolean;
  selfPlayerId: string;
  isHost: boolean;
  turnOrderData?: TurnOrderData | null;
  onUpdateGameState?: (updates: Partial<GameState>) => Promise<void>;
  onComplete: (finalOrderedPlayers: Player[]) => void;
}

export const DetermineTurnOrderModal: React.FC<DetermineTurnOrderModalProps> = ({
  players,
  isOnline,
  selfPlayerId,
  isHost,
  turnOrderData: remoteTurnOrderData,
  onUpdateGameState,
  onComplete
}) => {
  // Local state for turn order determination when offline or fallback
  const [localTurnOrderData, setLocalTurnOrderData] = useState<TurnOrderData>(() =>
    createInitialTurnOrderData(players)
  );
  const [isAutoRolling, setIsAutoRolling] = useState(false);

  // Sync turnOrderData from remote when online
  const turnOrderData =
    isOnline && remoteTurnOrderData ? remoteTurnOrderData : localTurnOrderData;

  // Initialize online turn order data if host and not initialized
  useEffect(() => {
    if (isOnline && isHost && !remoteTurnOrderData && onUpdateGameState) {
      const initial = createInitialTurnOrderData(players);
      onUpdateGameState({ turnOrderData: initial });
    }
  }, [isOnline, isHost, remoteTurnOrderData, players, onUpdateGameState]);

  const updateData = async (newData: TurnOrderData) => {
    if (isOnline && onUpdateGameState) {
      await onUpdateGameState({ turnOrderData: newData });
    } else {
      setLocalTurnOrderData(newData);
    }
  };

  // Roll dice for a single player
  const handleRollForPlayer = async (playerId: string) => {
    soundEffects.playRollDice();
    const res = rollForPlayerInTurnOrder(turnOrderData, playerId, players);
    await updateData(res.updatedData);
  };

  // Auto-roll all remaining rolls sequentially
  const handleAutoRollAll = async () => {
    setIsAutoRolling(true);
    let curr = turnOrderData;

    const stepAutoRoll = async () => {
      while (curr.phase !== "COMPLETE") {
        const nextId = curr.activeGroupPlayerIds.find((id) => !curr.rolls[id]);
        if (!nextId) break;

        soundEffects.playRollDice();
        const res = rollForPlayerInTurnOrder(curr, nextId, players);
        curr = res.updatedData;
        await updateData(curr);

        // Short delay for visual animation
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      setIsAutoRolling(false);
    };

    await stepAutoRoll();
  };

  // Auto-start game after 3s when turn order determination phase is COMPLETE
  useEffect(() => {
    if (turnOrderData.phase === "COMPLETE" && (isHost || !isOnline)) {
      const timer = setTimeout(() => {
        handleStartGame();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [turnOrderData.phase, isHost, isOnline]);

  // Finish turn order determination and launch main game
  const handleStartGame = () => {
    if (!turnOrderData.finalOrderPlayerIds) return;

    // Create new player array ordered by final turn order
    const playerMap = new Map(players.map((p) => [p.id, p]));
    const reorderedPlayers: Player[] = turnOrderData.finalOrderPlayerIds
      .map((id) => playerMap.get(id))
      .filter((p): p is Player => p !== undefined);

    onComplete(reorderedPlayers);
  };

  const nextPlayerToRollId = turnOrderData.activeGroupPlayerIds.find(
    (id) => !turnOrderData.rolls[id]
  );
  const nextPlayerToRoll = players.find((p) => p.id === nextPlayerToRollId);

  // Is current client authorized to roll?
  const canRollCurrent =
    !isAutoRolling &&
    turnOrderData.phase !== "COMPLETE" &&
    nextPlayerToRollId &&
    (!isOnline ? (nextPlayerToRollId === selfPlayerId || isHost) : nextPlayerToRollId === selfPlayerId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md select-none font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border-2 border-indigo-500/40 shadow-2xl rounded-3xl w-full max-w-3xl overflow-hidden flex flex-col text-slate-100 max-h-[92vh]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 px-6 py-5 text-white flex items-center justify-between shrink-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
              <Dices className="h-7 w-7 text-yellow-300 animate-bounce" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-wide font-mono uppercase flex items-center gap-2">
                Determining Turn Order
              </h2>
              <p className="text-xs text-indigo-100/90 font-medium">
                Rolling 2 dice per player • Highest total takes 1st turn • Ties reroll
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-slate-950/40 text-xs font-mono font-bold text-amber-300 border border-amber-400/30">
              {turnOrderData.phase === "INITIAL_ROLL"
                ? "Round 1: Initial Roll"
                : turnOrderData.phase === "TIE_BREAKER"
                ? `Round ${turnOrderData.round}: Tie-Breaker`
                : "🎉 Complete"}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Active Roll Banner / Status */}
          {turnOrderData.phase !== "COMPLETE" ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/80 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-left">
                <div className="p-3 bg-indigo-600/30 rounded-2xl border border-indigo-400/30">
                  <Sparkles className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                  <div className="text-xs text-indigo-300 font-mono font-bold uppercase tracking-wider">
                    {turnOrderData.phase === "INITIAL_ROLL"
                      ? "Initial Roll Phase"
                      : `Tie-Breaker Round ${turnOrderData.round}`}
                  </div>
                  <div className="text-sm font-black text-white">
                    {nextPlayerToRoll ? (
                      <>
                        Turn to roll:{" "}
                        <span style={{ color: nextPlayerToRoll.color }} className="underline decoration-2">
                          {nextPlayerToRoll.avatar} {nextPlayerToRoll.name}
                        </span>
                      </>
                    ) : (
                      "Calculating rankings..."
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {nextPlayerToRollId && (
                  <button
                    onClick={() => handleRollForPlayer(nextPlayerToRollId)}
                    disabled={!canRollCurrent}
                    className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold font-mono text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
                      canRollCurrent
                        ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black hover:brightness-110 active:scale-95"
                        : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                    }`}
                  >
                    <Dices className="h-4 w-4" />
                    Roll for {nextPlayerToRoll?.name || "Player"}
                  </button>
                )}

                {!isOnline && (
                  <button
                    onClick={handleAutoRollAll}
                    disabled={isAutoRolling}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold font-mono text-xs transition cursor-pointer flex items-center justify-center gap-1.5 border border-indigo-400/40"
                  >
                    <Zap className="h-4 w-4 text-yellow-300" />
                    Auto-Roll
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Complete Banner */
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/80 border-2 border-emerald-500/50 text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-emerald-400 font-mono font-black text-sm uppercase">
                <Trophy className="h-6 w-6 text-yellow-400" />
                <span>Turn Order Successfully Determined!</span>
              </div>
              <p className="text-xs text-slate-300">
                All players have been ranked. Below is the final turn sequence for the match. Starting game automatically...
              </p>
              <button
                onClick={handleStartGame}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black font-mono text-sm uppercase tracking-wider shadow-xl hover:brightness-110 active:scale-95 transition cursor-pointer inline-flex items-center gap-2"
              >
                <Play className="h-5 w-5 fill-slate-950" /> Start Game Now
              </button>
            </div>
          )}

          {/* Player Cards Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-400" /> Player Status & Dice Totals
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {players.map((p) => {
                const roll = turnOrderData.rolls[p.id];
                const settledRank = turnOrderData.settledRanks[p.id];
                const isActiveInGroup = turnOrderData.activeGroupPlayerIds.includes(p.id);

                return (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                      settledRank
                        ? "bg-slate-950/80 border-amber-500/40 shadow-xs"
                        : isActiveInGroup
                        ? "bg-indigo-950/40 border-indigo-500/60 ring-2 ring-indigo-500/20"
                        : "bg-slate-950/40 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl p-1.5 rounded-xl bg-slate-900 border border-slate-700">
                        {p.avatar}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-1.5">
                          {p.name}
                          {p.id === selfPlayerId && (
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-1.5 py-0.2 rounded font-mono">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {settledRank ? (
                            <span className="text-amber-400 font-extrabold flex items-center gap-1">
                              🏅 Rank #{settledRank}
                            </span>
                          ) : isActiveInGroup ? (
                            roll ? (
                              <span className="text-emerald-400 font-bold">Rolled Total: {roll.total}</span>
                            ) : (
                              <span className="text-indigo-400 font-bold">Waiting to roll...</span>
                            )
                          ) : (
                            <span className="text-slate-500">Awaiting tie-breaker</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Dice Display */}
                    <div className="flex items-center gap-1.5">
                      {roll ? (
                        <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl font-mono text-xs">
                          <span>🎲{roll.die1}</span>
                          <span className="text-slate-500">+</span>
                          <span>🎲{roll.die2}</span>
                          <span className="text-slate-400 font-bold">=</span>
                          <span className="text-yellow-400 font-black text-sm">{roll.total}</span>
                        </div>
                      ) : (
                        <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-600 font-mono text-xs">
                          🎲 -
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Roll Logs & Tie History */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-2">
              <History className="h-4 w-4 text-amber-400" /> Turn Order Log & Tie Resolution
            </h3>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 max-h-36 overflow-y-auto font-mono text-xs space-y-1.5 text-slate-300">
              {turnOrderData.logMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-1.5 rounded-lg border text-left leading-relaxed ${
                    msg.includes("FINAL TURN ORDER")
                      ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300 font-bold"
                      : msg.includes("TIE DETECTED")
                      ? "bg-amber-950/60 border-amber-500/40 text-amber-300 font-bold"
                      : "bg-slate-900/50 border-slate-800/60 text-slate-300"
                  }`}
                >
                  {msg}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DetermineTurnOrderModal;
