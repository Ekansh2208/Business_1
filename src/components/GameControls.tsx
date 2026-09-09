import React, { useState, useEffect } from "react";
import { Player, PropertyState, BoardSpace, SpaceType } from "../types";
import { BOARD_SPACES, UTILITY_PAIRS, getCountryCode } from "../constants";
import { Dices, Building, Landmark, Trash2, HelpCircle, Vote, CreditCard, Globe } from "lucide-react";
import RemainingProperties from "./RemainingProperties";

interface GameControlsProps {
  players: Player[];
  currentPlayerIndex: number;
  selfPlayerId: string;
  properties: Record<string, PropertyState>;
  diceRoll: [number, number] | null;
  onRollDice: () => void;
  isMoving?: boolean;
  onSellHouse: (spaceIndex: number) => void;
  onSellHotel: (spaceIndex: number) => void;
  onMortgageProperty: (spaceIndex: number) => void;
  onInitiateVote: () => void;
  onPayPassportDebt: (amount: number) => void;
  onTogglePayLater?: (playerId: string) => void;
  onSettlePayLater?: (playerId: string, amount: number, useCredit?: boolean) => void;
  currentAction: any;
  partyHouseBank: number;
  turnStartedAt?: number;
  onTurnTimeout?: () => void;
  timerEnabled?: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  players,
  currentPlayerIndex,
  selfPlayerId,
  properties,
  diceRoll,
  onRollDice,
  isMoving = false,
  onSellHouse,
  onSellHotel,
  onMortgageProperty,
  onInitiateVote,
  onPayPassportDebt,
  onTogglePayLater,
  onSettlePayLater,
  currentAction,
  partyHouseBank,
  turnStartedAt,
  onTurnTimeout,
  timerEnabled = true
}) => {
  const [activeTab, setActiveTab] = useState<"ACTIONS" | "MANAGE_ASSETS" | "REMAINING">("ACTIONS");
  const [secondsLeft, setSecondsLeft] = useState<number>(60);

  const remainingCount = BOARD_SPACES.filter(
    (s) => (s.price || 0) > 0 && (!properties[s.index.toString()] || !properties[s.index.toString()].ownerId)
  ).length;
  const [settleAmount, setSettleAmount] = useState<string>("");
  const [useCreditForSettle, setUseCreditForSettle] = useState<boolean>(false);
  const activePlayer = players[currentPlayerIndex];
  const isMyTurn = activePlayer?.id === selfPlayerId;

  const isCasinoChoice = currentAction?.type === "CASINO_CHOICE";

  useEffect(() => {
    if (!timerEnabled || !turnStartedAt || players.length === 0 || isCasinoChoice) {
      setSecondsLeft(60);
      return;
    }

    const updateTimer = () => {
      const elapsedMs = Date.now() - turnStartedAt;
      const remaining = Math.max(0, 60 - Math.floor(elapsedMs / 1000));
      setSecondsLeft(remaining);

      if (remaining === 0 && activePlayer?.id === selfPlayerId && onTurnTimeout) {
        onTurnTimeout();
      }
    };

    updateTimer(); // Initial call
    const interval = setInterval(updateTimer, 250); // High-frequency check for accuracy

    return () => clearInterval(interval);
  }, [turnStartedAt, activePlayer?.id, selfPlayerId, onTurnTimeout, players.length, timerEnabled, isCasinoChoice]);

  // Color sorting helper
  const COLOR_ORDER: Record<string, number> = {
    yellow: 1,
    purple: 2,
    orange: 3,
    blue: 4,
  };

  const getPropertyOrder = (space: BoardSpace) => {
    if (space.color && COLOR_ORDER[space.color]) {
      return COLOR_ORDER[space.color];
    }
    if (space.type === SpaceType.RAILWAY) return 5;
    if (space.type === SpaceType.UTILITY) return 6;
    return 7;
  };

  const getPropertyTheme = (space: BoardSpace) => {
    if (space.color === "yellow") {
      return {
        cardBg: "bg-gradient-to-br from-amber-100/70 via-yellow-50/70 to-white border-amber-300/90 shadow-2xs hover:border-amber-400",
        topStripe: "bg-yellow-400",
        tagBg: "bg-yellow-400 text-amber-950 border-amber-500/40",
        label: "🟡 Yellow",
      };
    }
    if (space.color === "purple") {
      return {
        cardBg: "bg-gradient-to-br from-purple-100/70 via-fuchsia-50/70 to-white border-purple-300/90 shadow-2xs hover:border-purple-400",
        topStripe: "bg-purple-600",
        tagBg: "bg-purple-600 text-white border-purple-700/40",
        label: "🟣 Purple",
      };
    }
    if (space.color === "orange") {
      return {
        cardBg: "bg-gradient-to-br from-orange-100/70 via-amber-50/70 to-white border-orange-300/90 shadow-2xs hover:border-orange-400",
        topStripe: "bg-orange-500",
        tagBg: "bg-orange-500 text-white border-orange-600/40",
        label: "🟠 Orange",
      };
    }
    if (space.color === "blue") {
      return {
        cardBg: "bg-gradient-to-br from-blue-100/70 via-sky-50/70 to-white border-blue-300/90 shadow-2xs hover:border-blue-400",
        topStripe: "bg-blue-600",
        tagBg: "bg-blue-600 text-white border-blue-700/40",
        label: "🔵 Blue",
      };
    }
    if (space.type === SpaceType.RAILWAY) {
      return {
        cardBg: "bg-gradient-to-br from-indigo-100/70 via-slate-50/70 to-white border-indigo-300/90 shadow-2xs hover:border-indigo-400",
        topStripe: "bg-indigo-600",
        tagBg: "bg-indigo-600 text-white border-indigo-700/40",
        label: "🚂 Transit",
      };
    }
    if (space.type === SpaceType.UTILITY) {
      return {
        cardBg: "bg-gradient-to-br from-teal-100/70 via-emerald-50/70 to-white border-teal-300/90 shadow-2xs hover:border-teal-400",
        topStripe: "bg-teal-600",
        tagBg: "bg-teal-600 text-white border-teal-700/40",
        label: "🛢️ Utility",
      };
    }
    return {
      cardBg: "bg-slate-50 border-slate-200 shadow-2xs hover:border-slate-300",
      topStripe: "bg-slate-500",
      tagBg: "bg-slate-700 text-white border-slate-800",
      label: "Other",
    };
  };

  // Find properties owned by the current player sorted by color group
  const myProperties = BOARD_SPACES.filter((space) => {
    const prop = properties[space.index.toString()];
    return prop?.ownerId === selfPlayerId;
  }).sort((a, b) => {
    const orderA = getPropertyOrder(a);
    const orderB = getPropertyOrder(b);
    if (orderA !== orderB) return orderA - orderB;
    return a.index - b.index;
  });

  // Calculate stats
  const selfPlayer = players.find((p) => p.id === selfPlayerId);
  const selfProperties = BOARD_SPACES.filter(
    (space) => properties[space.index.toString()]?.ownerId === selfPlayerId
  );
  const selfPropertiesValue = selfProperties.reduce((sum, space) => sum + (space.price || 0), 0);
  const selfHousesValue = selfProperties.reduce((sum, space) => {
    const prop = properties[space.index.toString()];
    return sum + (prop ? prop.houses * (space.price || 0) : 0);
  }, 0);
  const selfHotelsValue = selfProperties.reduce((sum, space) => {
    const prop = properties[space.index.toString()];
    return sum + (prop && prop.hasHotel ? (space.price || 0) : 0);
  }, 0);
  const selfNetWorth = (selfPlayer?.cash || 0) + selfPropertiesValue + selfHousesValue + selfHotelsValue - (selfPlayer?.creditUsed || 0) - (selfPlayer?.payLaterBalance || 0);

  // Render Dice visual helper
  const renderDice = (val: number) => {
    const dots: Record<number, number[]> = {
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8]
    };
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white text-slate-800 shadow-md border border-slate-200 p-2.5 relative shrink-0">
        <div className="grid grid-cols-3 grid-rows-3 h-full w-full gap-0.5">
          {Array.from({ length: 9 }).map((_, i) => {
            const hasDot = dots[val]?.includes(i);
            return (
              <div key={i} className="flex items-center justify-center">
                {hasDot && <div className="h-2 w-2 rounded-full bg-slate-900" />}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const isCurrentLandedOnOwn = activePlayer && properties[activePlayer.position.toString()]?.ownerId === activePlayer.id;
  const currentLandedSpace = activePlayer ? BOARD_SPACES[activePlayer.position] : null;
  const currentLandedPropState = activePlayer ? properties[activePlayer.position.toString()] : null;

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-slate-100 shrink-0 text-[11px] md:text-xs">
        <button
          onClick={() => setActiveTab("ACTIONS")}
          className={`flex-1 py-3 font-bold uppercase tracking-wider transition ${
            activeTab === "ACTIONS"
              ? "border-b-2 border-amber-500 text-slate-800 bg-amber-500/5"
              : "text-slate-400 hover:text-slate-600 bg-transparent"
          } cursor-pointer`}
        >
          My Actions
        </button>
        <button
          onClick={() => setActiveTab("MANAGE_ASSETS")}
          className={`flex-1 py-3 font-bold uppercase tracking-wider transition ${
            activeTab === "MANAGE_ASSETS"
              ? "border-b-2 border-amber-500 text-slate-800 bg-amber-500/5"
              : "text-slate-400 hover:text-slate-600 bg-transparent"
          } cursor-pointer`}
        >
          Manage
        </button>
        <button
          onClick={() => setActiveTab("REMAINING")}
          className={`flex-1 py-3 font-bold uppercase tracking-wider transition flex items-center justify-center gap-1 ${
            activeTab === "REMAINING"
              ? "border-b-2 border-amber-500 text-slate-800 bg-amber-500/5"
              : "text-slate-400 hover:text-slate-600 bg-transparent"
          } cursor-pointer`}
        >
          <span>Remaining</span>
          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-black ${
            activeTab === "REMAINING" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-500"
          }`}>
            {remainingCount}
          </span>
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {activeTab === "ACTIONS" && (
          <div className="space-y-4 h-full flex flex-col justify-between">
            {/* Turn Announcement */}
            <div className="text-center bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">
                  Current Turn
                </span>
                {timerEnabled ? (
                  isCasinoChoice ? (
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border flex items-center gap-1 text-indigo-600 bg-indigo-50 border-indigo-200 shadow-xs animate-pulse">
                      ⏱️ PAUSED (CASINO 🎰)
                    </span>
                  ) : (
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border flex items-center gap-1 transition ${
                      secondsLeft <= 10 
                        ? "text-rose-600 font-black animate-pulse bg-rose-50 border-rose-200 shadow-xs" 
                        : secondsLeft <= 30
                        ? "text-amber-600 bg-amber-50 border-amber-200"
                        : "text-slate-500 bg-slate-100/50 border-slate-200"
                    }`}>
                      ⏱️ {secondsLeft}s
                    </span>
                  )
                ) : (
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border flex items-center gap-1 text-slate-500 bg-slate-100/50 border-slate-200">
                    ⏱️ No Limit
                  </span>
                )}
              </div>
              <h2 className="text-lg font-extrabold text-slate-800 mt-0.5 flex items-center justify-center gap-2">
                <span className={`h-3 w-3 rounded-full ${activePlayer?.color}`} />
                {activePlayer?.name}
              </h2>
              {isMyTurn ? (
                <p className="text-2xs text-amber-600 font-bold mt-1 uppercase tracking-wider animate-pulse">
                  👉 It's your turn! Take action below.
                </p>
              ) : (
                <p className="text-2xs text-slate-400 mt-1">
                  Waiting for {activePlayer?.name} to complete their move...
                </p>
              )}

              {/* Visual Progress Bar */}
              {timerEnabled && (
                <div className="w-full bg-slate-200/60 h-1.5 rounded-full overflow-hidden mt-3 relative">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      isCasinoChoice
                        ? "bg-indigo-500"
                        : secondsLeft <= 10 
                        ? "bg-rose-500 animate-pulse" 
                        : secondsLeft <= 30 
                        ? "bg-amber-500" 
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${isCasinoChoice ? 100 : (secondsLeft / 60) * 100}%` }}
                  />
                </div>
              )}
            </div>

            {/* Passport Debt Alert Box */}
            {activePlayer?.passportDebt && activePlayer.passportDebt > 0 ? (
              <div className="bg-rose-50 border-2 border-rose-150 p-4 rounded-2xl flex flex-col gap-3 select-none">
                <div className="flex items-start gap-2.5">
                  <div className="bg-rose-500 text-white p-2 rounded-xl shrink-0">
                    <span className="text-sm font-extrabold font-sans">🛂</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-rose-800 uppercase tracking-wide">Passport Confiscated!</h4>
                    <p className="text-3xs text-rose-600 leading-normal mt-0.5">
                      You must pay <strong>$5,000</strong> to the Party Bank.
                      <br />
                      Remaining balance: <span className="font-mono text-rose-800 font-extrabold">${activePlayer.passportDebt}</span>
                    </p>
                    <p className="text-[9px] text-rose-500 font-bold mt-1.5 italic">
                      ⛔ Blocked: Cannot collect rent or buy properties.
                    </p>
                  </div>
                </div>

                {isMyTurn && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const maxPayable = activePlayer.cash;
                        const availableCredit = 10000 - activePlayer.creditUsed;
                        const payLimit = maxPayable + availableCredit;
                        const toPay = Math.min(activePlayer.passportDebt || 0, payLimit);

                        if (toPay <= 0) {
                          alert("You have no cash or credit left! Go to 'Manage Assets' and sell houses/hotels or mortgage properties to raise cash.");
                          return;
                        }

                        onPayPassportDebt(toPay);
                      }}
                      className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer animate-pulse"
                    >
                      {activePlayer.cash >= (activePlayer.passportDebt || 0) ? (
                        `Pay Full Debt ($${activePlayer.passportDebt})`
                      ) : activePlayer.cash > 0 ? (
                        `Pay $${activePlayer.cash} from Cash`
                      ) : (
                        `Pay with Credit Card`
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {/* Pay Later Status and Settlement Box */}
            {(activePlayer?.cash < 5000 || (activePlayer?.payLaterBalance || 0) > 0) ? (
              <div className={`border-2 p-4 rounded-2xl flex flex-col gap-3 select-none transition-all ${
                (activePlayer.payLaterBalance || 0) > 3000
                  ? "bg-rose-50 border-rose-200"
                  : (activePlayer.payLaterBalance || 0) > 2000
                  ? "bg-amber-50 border-amber-200 animate-pulse"
                  : "bg-amber-50/50 border-amber-200"
              }`}>
                <div className="flex items-start gap-2.5">
                  <div className={`p-2 rounded-xl shrink-0 text-white ${
                    (activePlayer.payLaterBalance || 0) > 3000 ? "bg-rose-500" : "bg-amber-500"
                  }`}>
                    <span className="text-sm font-extrabold font-sans">💳</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className={`text-xs font-black uppercase tracking-wide ${
                        (activePlayer.payLaterBalance || 0) > 3000 ? "text-rose-800" : "text-amber-800"
                      }`}>
                        Autopay / Pay Later
                      </h4>
                      {activePlayer.cash < 3000 && activePlayer.payLaterEnabled && (
                        <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                          ⚡ Autopay Active
                        </span>
                      )}
                    </div>
                    <div className={`text-[10px] leading-normal mt-0.5 ${
                      (activePlayer.payLaterBalance || 0) > 3000 ? "text-rose-600 font-medium" : "text-amber-600"
                    }`}>
                      {(activePlayer.payLaterBalance || 0) > 3000 ? (
                        <>
                          <strong>🚨 Exceeded $3,000 limit!</strong> You must manage your assets (sell houses, hotels, or mortgage properties) to raise cash, then settle your Pay Later balance to less than $3,000 to roll the dice.
                        </>
                      ) : (activePlayer.payLaterBalance || 0) > 2000 ? (
                        <>
                          <strong>⚠️ Exceeded $2,000 limit!</strong> You are <strong>blocked from purchasing properties</strong> and cannot end your turn until you settle your Pay Later balance to less than $2,000.
                        </>
                      ) : activePlayer.cash < 3000 ? (
                        <>
                          <strong>⚡ Autopay Auto-Enabled:</strong> Cash is below $3,000 (${activePlayer.cash.toLocaleString()}). Expenses are automatically deferred to your Pay Later balance.
                        </>
                      ) : (
                        <>
                          Option to defer any payments to your Pay Later balance when cash is below $5,000. Autopay enables automatically when cash is below $3,000.
                        </>
                      )}
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                        Outstanding Balance:
                        <span className={`font-mono text-xs font-extrabold ${
                          (activePlayer.payLaterBalance || 0) > 3000 ? "text-rose-700 animate-pulse font-black text-sm" : "text-amber-700"
                        }`}>
                          ${(activePlayer.payLaterBalance || 0).toLocaleString()}
                        </span>
                        <span className="text-slate-400 font-normal">/ $3,000 limit</span>
                      </span>
                    </div>
                  </div>
                </div>

                {isMyTurn && (
                  <div className="flex flex-col gap-2 mt-1">
                    {isCasinoChoice && activePlayer.payLaterEnabled && (
                      <div className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 text-center shadow-2xs">
                        🚫 Note: Pay Later is paused & strictly prohibited while gambling at the Casino.
                      </div>
                    )}
                    {/* Toggle button */}
                    {activePlayer.cash < 5000 && (
                      <button
                        onClick={() => onTogglePayLater && onTogglePayLater(activePlayer.id)}
                        className={`w-full py-2 px-3 text-xs font-black rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          activePlayer.payLaterEnabled
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                        }`}
                      >
                        <span className="text-sm">{activePlayer.payLaterEnabled ? "✅" : "⬜"}</span>
                        {activePlayer.payLaterEnabled
                          ? activePlayer.cash < 3000
                            ? "⚡ Autopay: ACTIVE (Auto-enabled: Cash < $3,000)"
                            : "Autopay / Pay Later: ACTIVE (Deferring all costs)"
                          : "Enable Autopay / Pay Later (Cash < $5,000)"}
                      </button>
                    )}

                    {/* Settle Form with Custom Amount and Credit Card option */}
                    {(activePlayer.payLaterBalance || 0) > 0 && (
                      <div className="mt-2 border-t border-slate-200/60 pt-2 space-y-2.5 text-left">
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase font-mono">
                            Select Settlement Method
                          </label>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => setUseCreditForSettle(false)}
                              className={`py-1 px-2 rounded-lg font-bold text-[10px] border transition cursor-pointer flex items-center justify-center gap-1 ${
                                !useCreditForSettle
                                  ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              💵 Cash (${activePlayer.cash.toLocaleString()})
                            </button>
                            <button
                              type="button"
                              onClick={() => setUseCreditForSettle(true)}
                              className={`py-1 px-2 rounded-lg font-bold text-[10px] border transition cursor-pointer flex items-center justify-center gap-1 ${
                                useCreditForSettle
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
                            <span className="text-[8px] text-slate-400 normal-case">Enter amount</span>
                          </label>
                          <div className="flex gap-1.5">
                            <input
                              type="number"
                              value={settleAmount}
                              onChange={(e) => setSettleAmount(e.target.value)}
                              placeholder={`Max: ${activePlayer.payLaterBalance}`}
                              className="flex-1 min-w-0 py-1 px-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => setSettleAmount(activePlayer.payLaterBalance.toString())}
                              className="py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[9px] rounded-lg border border-slate-200 transition cursor-pointer"
                            >
                              MAX
                            </button>
                            {activePlayer.payLaterBalance > 2000 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const targetAmt = activePlayer.payLaterBalance - 1999;
                                  if (targetAmt > 0) {
                                    setSettleAmount(targetAmt.toString());
                                  }
                                }}
                                className="py-1 px-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-extrabold text-[9px] rounded-lg border border-amber-200 transition cursor-pointer animate-pulse"
                                title="Settle down to $1,999 to allow property purchase & end turn"
                              >
                                Settle &lt;$2k
                              </button>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const amt = parseFloat(settleAmount);
                            if (isNaN(amt) || amt <= 0) {
                              alert("Please enter a valid amount greater than $0.");
                              return;
                            }
                            if (amt > activePlayer.payLaterBalance) {
                              alert(`Cannot settle more than your current Pay Later balance of $${activePlayer.payLaterBalance.toLocaleString()}.`);
                              return;
                            }
                            if (onSettlePayLater) {
                              onSettlePayLater(activePlayer.id, amt, useCreditForSettle);
                              setSettleAmount(""); // Reset custom input on success
                            }
                          }}
                          className={`w-full py-1.5 px-3 font-black text-xs text-white rounded-lg shadow-sm transition cursor-pointer ${
                            useCreditForSettle
                              ? "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
                              : "bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-slate-950"
                          }`}
                        >
                          Confirm Settle: ${settleAmount ? parseFloat(settleAmount).toLocaleString() : "0"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}

            {/* Dice Visualizer */}
            {diceRoll && (
              <div className="flex flex-col items-center justify-center p-3 border border-slate-100 rounded-2xl bg-slate-50/30">
                <p className="text-3xs text-slate-400 font-bold uppercase tracking-wider mb-2 font-mono">
                  Dice Result: {diceRoll[0] + diceRoll[1]}
                </p>
                <div className="flex items-center gap-4">
                  {renderDice(diceRoll[0])}
                  <span className="text-xl font-bold text-slate-400">+</span>
                  {renderDice(diceRoll[1])}
                </div>
              </div>
            )}

            {/* Core Action Button */}
            <div className="pt-2">
              {isMyTurn && !currentAction ? (
                isMoving ? (
                  <button
                    disabled
                    className="w-full py-4 px-6 bg-amber-100 text-amber-800 border-2 border-amber-300 font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 cursor-not-allowed uppercase tracking-wider animate-pulse"
                  >
                    <Dices className="h-5 w-5 animate-spin text-amber-600" />
                    MOVING ON BOARD...
                  </button>
                ) : (activePlayer?.payLaterBalance || 0) > 3000 ? (
                  <button
                    disabled
                    className="w-full py-4 px-6 bg-red-100 border-2 border-red-200 text-red-600 font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-not-allowed uppercase tracking-wider animate-pulse"
                  >
                    🚫 PAY LATER OVER LIMIT ($3k max)
                  </button>
                ) : (
                  <button
                    onClick={onRollDice}
                    id="btn-roll-dice"
                    className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    <Dices className="h-5 w-5 animate-spin" />
                    ROLL DICE & MOVE
                  </button>
                )
              ) : (
                <button
                  disabled
                  className="w-full py-4 px-6 bg-slate-100 text-slate-400 font-extrabold text-sm rounded-xl border border-slate-200/50 flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <Dices className="h-5 w-5 opacity-40" />
                  {isMyTurn ? "PENDING ACTION..." : "WAITING FOR TURN..."}
                </button>
              )}
            </div>

            {/* House/Hotel Landing action helper */}
            {isMyTurn && isCurrentLandedOnOwn && currentLandedSpace && currentLandedPropState && (
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl mt-2 flex flex-col gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="bg-emerald-500 text-white p-1.5 rounded-lg shrink-0">
                    <Building className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-800">Land On Own Property!</h4>
                    {(currentLandedPropState.housesBuiltThisLanding ?? 0) >= 1 ? (
                      <p className="text-3xs text-slate-500 mt-0.5 leading-normal font-semibold">
                        You have already built a house during this landing. Land here again to build more! (Max 1 per landing)
                      </p>
                    ) : (
                      <p className="text-3xs text-emerald-600 mt-0.5 leading-normal">
                        Build 1 House or Hotel here to increase rent by $1,000/$1,500! (Max 1 house per landing)
                      </p>
                    )}
                  </div>
                </div>
                
                {(!currentLandedPropState.housesBuiltThisLanding || currentLandedPropState.housesBuiltThisLanding < 1) && (
                  <>
                    <div className="flex gap-2 font-mono mt-1 text-2xs">
                      {currentLandedPropState.houses < 3 && (
                        <div className="flex justify-between items-center bg-white border border-emerald-150 rounded-xl px-2.5 py-1.5 flex-1">
                          <span className="text-slate-500">House cost:</span>
                          <strong className="text-emerald-700">${currentLandedSpace.price}</strong>
                        </div>
                      )}
                      {currentLandedPropState.houses === 3 && !currentLandedPropState.hasHotel && (
                        <div className="flex justify-between items-center bg-white border border-emerald-150 rounded-xl px-2.5 py-1.5 flex-1">
                          <span className="text-slate-500">Hotel cost:</span>
                          <strong className="text-red-600">${currentLandedSpace.price}</strong>
                        </div>
                      )}
                    </div>
                    <p className="text-3xs text-slate-400 italic text-center mt-1">
                      (Note: You can buy buildings using the "Manage Assets" tab below on your turn!)
                    </p>
                  </>
                )}
              </div>
            )}

            {/* End Game / Vote Trigger */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4 mt-auto">
              <div className="text-left shrink-0">
                <span className="text-[9px] uppercase font-bold text-slate-400 font-mono">My Properties</span>
                <p className="text-xs font-black text-slate-700 font-mono">{myProperties.length} owned</p>
              </div>
              <button
                onClick={onInitiateVote}
                id="btn-call-end-vote"
                className="py-2.5 px-4 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-slate-600 hover:text-amber-700 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Vote className="h-4 w-4" />
                Call Game-End Vote
              </button>
            </div>
          </div>
        )}

        {activeTab === "MANAGE_ASSETS" && (
          <div className="space-y-4">
            <div className="flex items-center gap-1.5 bg-slate-50 p-3 border border-slate-100 rounded-xl">
              <Landmark className="h-4 w-4 text-amber-500" />
              <p className="text-3xs text-slate-500 leading-normal">
                Liquidate houses (100% refund) and hotels (100% refund), or mortgage properties (50% refund, transfers back to bank as unowned).
              </p>
            </div>

            {myProperties.length === 0 ? (
              <div className="text-center py-6 text-slate-400 italic text-xs">
                You do not own any countries or railways yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                {myProperties.map((space) => {
                  const prop = properties[space.index.toString()];
                  const hasHouses = prop?.houses > 0;
                  const hasHotel = prop?.hasHotel;
                  const canMortgage = !hasHouses && !hasHotel;

                  const isUtilityOrRailway = space.type === SpaceType.RAILWAY || space.type === SpaceType.UTILITY;
                  let currentRent = 0;
                  if (isUtilityOrRailway) {
                    const pairInfo = UTILITY_PAIRS[space.name];
                    if (pairInfo) {
                      const partnerOwnerId = properties[pairInfo.partnerIndex.toString()]?.ownerId;
                      const ownsBoth = partnerOwnerId === selfPlayerId;
                      currentRent = ownsBoth ? pairInfo.rentPaired : pairInfo.rentAlone;
                    } else {
                      currentRent = space.rentBase || 0;
                    }
                  } else {
                    const isMonopoly = space.color ? BOARD_SPACES.filter(s => s.color === space.color).every(s => properties[s.index.toString()]?.ownerId === selfPlayerId) : false;
                    currentRent = space.rentBase || 0;
                    if (isMonopoly) {
                      currentRent *= 2;
                    }
                    currentRent += ((prop?.houses || 0) * 1000);
                    if (prop?.hasHotel) {
                      currentRent += 1500;
                    }
                  }

                  // Landed on own property during own turn with active landing BUILD_DECISION is required to build houses:
                  const isLandedOnThis =
                    isMyTurn &&
                    currentAction?.type === "BUILD_DECISION" &&
                    currentAction?.propertyIndex === space.index;
                  const hasBuiltHouseThisLanding = prop && (prop.housesBuiltThisLanding ?? 0) >= 1;
                  const canBuildHouse = !isUtilityOrRailway && isLandedOnThis && prop?.houses < 3 && !prop?.hasHotel && !hasBuiltHouseThisLanding;
                  const canBuildHotel = !isUtilityOrRailway && isLandedOnThis && prop?.houses === 3 && !prop?.hasHotel;
                  const theme = getPropertyTheme(space);

                  return (
                    <div
                      key={space.index}
                      className={`relative overflow-hidden p-3 border rounded-xl space-y-2.5 transition ${theme.cardBg}`}
                    >
                      {/* Top color indicator stripe */}
                      <div className={`absolute top-0 left-0 right-0 h-1 ${theme.topStripe}`} />

                      <div className="flex items-center justify-between pt-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {(() => {
                            const code = getCountryCode(space.name);
                            return code ? (
                              <img
                                src={`https://flagcdn.com/w160/${code}.png`}
                                alt=""
                                className="h-2.5 w-3.5 object-cover rounded-xs border border-slate-200 inline shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="text-sm">{space.flag}</span>
                            );
                          })()}
                          <span className="text-xs font-bold text-slate-800 truncate">{space.name}</span>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border shrink-0 ${theme.tagBg}`}>
                            {theme.label}
                          </span>
                        </div>
                        <span className="text-3xs font-mono bg-white/90 px-1.5 py-0.5 rounded text-slate-700 font-bold border border-slate-200/80 shadow-2xs shrink-0">
                          Rent: ${currentRent.toLocaleString()}
                        </span>
                      </div>

                      {/* Info on houses/hotels */}
                      {!isUtilityOrRailway ? (
                        <div className="flex justify-between text-3xs font-mono text-slate-400">
                          <span>Houses: <strong className="text-slate-600">{prop?.houses || 0}</strong> / 3</span>
                          <span>Hotel: <strong className="text-slate-600">{prop?.hasHotel ? "Yes" : "No"}</strong></span>
                        </div>
                      ) : (
                        <div className="text-3xs font-mono text-slate-400">
                          <span>Pair Type: <strong className="text-slate-600">{space.type === SpaceType.RAILWAY ? "Transit System" : "Utility Corporate"}</strong></span>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100/50">
                        {/* Build actions */}
                        {isMyTurn && canBuildHouse && (
                          <button
                            onClick={() => onSellHouse(space.index)} // Wait, we can reuse sell houses as click trigger, but wait, building house is another trigger! Let's make sure we pass the correct trigger.
                            id={`btn-build-house-${space.index}`}
                            disabled={(selfPlayer?.cash || 0) < (space.price || 0)}
                            className="flex-1 py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-3xs flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Building className="h-3 w-3 shrink-0" /> Buy House (+${space.price})
                          </button>
                        )}
                        {isMyTurn && isLandedOnThis && prop?.houses < 3 && !prop?.hasHotel && hasBuiltHouseThisLanding && (
                          <div className="flex-1 text-center py-1.5 px-2 rounded-lg bg-slate-100 text-slate-400 font-bold text-[10px] border border-slate-200">
                            🔒 House Built (Max 1/landing)
                          </div>
                        )}
                        {isMyTurn && canBuildHotel && (
                          <button
                            onClick={() => onSellHotel(space.index)}
                            id={`btn-build-hotel-${space.index}`}
                            disabled={(selfPlayer?.cash || 0) < (space.price || 0)}
                            className="flex-1 py-1 px-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-3xs flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Building className="h-3 w-3 shrink-0" /> Buy Hotel (+${space.price})
                          </button>
                        )}

                        {/* Liquidate Actions */}
                        {isMyTurn && hasHotel && (
                          <button
                            onClick={() => onSellHotel(space.index)}
                            id={`btn-sell-hotel-${space.index}`}
                            className="flex-1 py-1 px-2 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 font-bold text-3xs flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3 shrink-0" /> Sell Hotel (+${space.price})
                          </button>
                        )}

                        {isMyTurn && hasHouses && !hasHotel && (
                          <button
                            onClick={() => onSellHouse(space.index)}
                            id={`btn-sell-house-${space.index}`}
                            className="flex-1 py-1 px-2 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 font-bold text-3xs flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3 shrink-0" /> Sell House (+${space.price})
                          </button>
                        )}

                        {isMyTurn && canMortgage && (
                          <button
                            onClick={() => onMortgageProperty(space.index)}
                            id={`btn-mortgage-${space.index}`}
                            className="flex-1 py-1 px-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-3xs flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Landmark className="h-3 w-3 shrink-0" /> Sell Property (+${(space.price || 0) / 2})
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

        {activeTab === "REMAINING" && (
          <RemainingProperties properties={properties} />
        )}
      </div>
    </div>
  );
};
export default GameControls;
