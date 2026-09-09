import React, { useState, useRef, useEffect } from "react";
import { BoardSpace, Player, PropertyState, SpaceType } from "../types";
import { BOARD_SPACES, UTILITY_PAIRS, getCountryCode } from "../constants";
import { motion, AnimatePresence } from "motion/react";
import { Building, Hotel, Volume2, VolumeX, Landmark, X, Globe } from "lucide-react";
import { soundEffects } from "../soundEffects";
import RemainingProperties from "./RemainingProperties";

interface BoardProps {
  players: Player[];
  properties: Record<string, PropertyState>;
  currentPlayerIndex: number;
  onSpaceClick?: (space: BoardSpace) => void;
  partyHouseBank: number;
  boardStyle?: number;
  setBoardStyle?: (style: number) => void;
  is3DMode?: boolean;
  setIs3DMode?: (mode: boolean) => void;
}

export const Board: React.FC<BoardProps> = ({
  players,
  properties,
  currentPlayerIndex,
  onSpaceClick,
  partyHouseBank,
  boardStyle: propBoardStyle,
  setBoardStyle: propSetBoardStyle,
  is3DMode: propIs3DMode,
  setIs3DMode: propSetIs3DMode
}) => {
  const [localBoardStyle, setLocalBoardStyle] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem("boardStyle") || "4");
    } catch {
      return 4;
    }
  });
  const [local3DMode, setLocal3DMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem("board3DMode") !== "false";
    } catch {
      return true;
    }
  });
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return soundEffects.isMuted();
  });

  const boardStyle = propBoardStyle !== undefined ? propBoardStyle : localBoardStyle;
  const is3DMode = propIs3DMode !== undefined ? propIs3DMode : local3DMode;

  const setBoardStyle = (style: number) => {
    if (propSetBoardStyle) {
      propSetBoardStyle(style);
    } else {
      setLocalBoardStyle(style);
    }
    try {
      localStorage.setItem("boardStyle", String(style));
    } catch {}
  };

  const setIs3DMode = (mode: boolean) => {
    if (propSetIs3DMode) {
      propSetIs3DMode(mode);
    } else {
      setLocal3DMode(mode);
    }
    try {
      localStorage.setItem("board3DMode", String(mode));
    } catch {}
  };
  const [hoveredSpace, setHoveredSpace] = useState<BoardSpace | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showRemainingModal, setShowRemainingModal] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  const remainingSpacesCount = BOARD_SPACES.filter(
    (s) => (s.price || 0) > 0 && (!properties[s.index.toString()] || !properties[s.index.toString()].ownerId)
  ).length;

  // State for step-by-step avatar movement animation around the board perimeter
  const [displayedPositions, setDisplayedPositions] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    players.forEach((p) => {
      init[p.id] = p.position;
    });
    return init;
  });

  const [activeHoppingPlayerIds, setActiveHoppingPlayerIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    players.forEach((player) => {
      const currentDisplayed = displayedPositions[player.id];
      const targetPos = player.position;

      if (currentDisplayed === undefined) {
        setDisplayedPositions((prev) => ({ ...prev, [player.id]: targetPos }));
        return;
      }

      if (currentDisplayed !== targetPos) {
        const totalSpaces = BOARD_SPACES.length; // 36
        const stepsToTake = (targetPos - currentDisplayed + totalSpaces) % totalSpaces;
        const stepDelay = stepsToTake > 12 ? Math.max(50, Math.floor(1000 / stepsToTake)) : 160;

        const timer = setTimeout(() => {
          const nextPos = (currentDisplayed + 1) % totalSpaces;
          setDisplayedPositions((prev) => ({ ...prev, [player.id]: nextPos }));
          setActiveHoppingPlayerIds((prev) => ({ ...prev, [player.id]: true }));
          soundEffects.playStepHop();

          setTimeout(() => {
            setActiveHoppingPlayerIds((prev) => ({ ...prev, [player.id]: false }));
          }, Math.max(20, stepDelay - 30));
        }, stepDelay);

        return () => clearTimeout(timer);
      }
    });
  }, [players, displayedPositions]);

  // Group players by rendered position (animating step by step along board perimeter)
  const playersByPosition: Record<number, Player[]> = {};
  players.forEach((player) => {
    const pos = displayedPositions[player.id] !== undefined ? displayedPositions[player.id] : player.position;
    if (!playersByPosition[pos]) {
      playersByPosition[pos] = [];
    }
    playersByPosition[pos].push(player);
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      setHoverCoords({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  // Coordinates calculation with boundaries constraining
  const rect = boardRef.current?.getBoundingClientRect();
  const boardWidth = rect?.width || 600;
  const boardHeight = rect?.height || 600;

  const tooltipWidth = 240;
  const tooltipHeight = 280;

  const posX = hoverCoords.x > boardWidth / 2 ? hoverCoords.x - tooltipWidth - 16 : hoverCoords.x + 16;
  const posY = hoverCoords.y > boardHeight / 2 ? hoverCoords.y - tooltipHeight - 16 : hoverCoords.y + 16;

  const clampedPosX = Math.max(8, Math.min(posX, boardWidth - tooltipWidth - 8));
  const clampedPosY = Math.max(8, Math.min(posY, boardHeight - tooltipHeight - 8));

  const renderDeedCard = (space: BoardSpace) => {
    const propState = properties[space.index.toString()];
    const owner = propState?.ownerId ? players.find((p) => p.id === propState.ownerId) : null;
    const baseRent = space.rentBase || 0;

    switch (space.type) {
      case SpaceType.COUNTRY: {
        const houseCost = space.price || 0;
        return (
          <div className="flex flex-col text-slate-800">
            {/* Deed Header */}
            <div className={`p-2.5 text-center border-b border-slate-800 ${space.colorClass || 'bg-slate-800 text-white'}`}>
              <div className="flex justify-center mb-1 h-6">
                {(() => {
                  const code = getCountryCode(space.name);
                  return code ? (
                    <img
                      src={`https://flagcdn.com/w160/${code}.png`}
                      alt=""
                      className="h-5 w-7.5 object-cover rounded-xs shadow-sm border border-black/10"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-xl leading-none">{space.flag}</span>
                  );
                })()}
              </div>
              <div className="font-black text-xs uppercase tracking-wider">{space.name}</div>
              <div className="text-[8px] font-bold uppercase tracking-widest opacity-85 font-mono">Country Deed</div>
            </div>

            {/* Deed Body */}
            <div className="p-3 space-y-2 text-2xs leading-normal">
              {/* Owner Status Row */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Owner</span>
                {owner ? (
                  <span className="flex items-center gap-1 font-bold text-slate-850">
                    <span className={`h-2.5 w-2.5 rounded-full ${owner.color}`} />
                    {owner.name}
                  </span>
                ) : (
                  <span className="font-extrabold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">Unowned 🏦</span>
                )}
              </div>

              {/* Cost stats */}
              <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-1.5 font-mono">
                <div>
                  <span className="text-slate-400 block text-[8px] uppercase font-bold tracking-wider">Purchase Price</span>
                  <strong className="text-slate-700">${space.price}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[8px] uppercase font-bold tracking-wider">House Cost</span>
                  <strong className="text-slate-700">${houseCost}</strong>
                </div>
              </div>

              {/* Rent Details list */}
              <div className="space-y-1">
                <span className="text-slate-400 block text-[8px] uppercase font-bold tracking-wider mb-1">Rent Tariff</span>
                <div className={`flex justify-between px-1 py-0.5 rounded ${(!propState || (!propState.houses && !propState.hasHotel)) ? 'bg-amber-50 font-bold text-amber-800 border border-amber-105' : ''}`}>
                  <span>Base Rent:</span>
                  <span className="font-mono">${baseRent}</span>
                </div>
                <div className="flex justify-between px-1 text-[8px] text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Color Group (3+ Owned, No Buildings):</span>
                  <span className="font-mono text-slate-600">${baseRent * 2}</span>
                </div>
                <div className={`flex justify-between px-1 py-0.5 rounded ${(propState && propState.houses === 1 && !propState.hasHotel) ? 'bg-emerald-50 font-bold text-emerald-800 border border-emerald-100' : ''}`}>
                  <span>🏠 1 House Rent:</span>
                  <span className="font-mono">${baseRent + 1000}</span>
                </div>
                <div className={`flex justify-between px-1 py-0.5 rounded ${(propState && propState.houses === 2 && !propState.hasHotel) ? 'bg-emerald-50 font-bold text-emerald-800 border border-emerald-100' : ''}`}>
                  <span>🏠🏠 2 Houses Rent:</span>
                  <span className="font-mono">${baseRent + 2000}</span>
                </div>
                <div className={`flex justify-between px-1 py-0.5 rounded ${(propState && propState.houses === 3 && !propState.hasHotel) ? 'bg-emerald-50 font-bold text-emerald-800 border border-emerald-100' : ''}`}>
                  <span>🏠🏠🏠 3 Houses Rent:</span>
                  <span className="font-mono">${baseRent + 3000}</span>
                </div>
                <div className={`flex justify-between px-1 py-0.5 rounded ${(propState && propState.hasHotel) ? 'bg-red-50 font-bold text-red-800 border border-red-100' : ''}`}>
                  <span>🏨 Hotel Rent:</span>
                  <span className="font-mono">${baseRent + 4500}</span>
                </div>
              </div>

              {/* Mortgage and stats */}
              <div className="pt-1.5 border-t border-slate-150 flex justify-between text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                <span>Mortgage Value:</span>
                <span className="text-slate-600 font-mono">${(space.price || 0) / 2}</span>
              </div>

              {/* Rules Note */}
              <div className="pt-1.5 border-t border-slate-100 text-[8px] text-slate-500 leading-normal font-medium bg-amber-50/40 p-1.5 rounded-lg border border-amber-100/50">
                ℹ️ <strong>Rules:</strong> Can only build <strong>max 1 house per landing</strong> on owned properties. No building allowed on the first landing/purchase turn.
              </div>
            </div>
          </div>
        );
      }
      case SpaceType.RAILWAY:
      case SpaceType.UTILITY: {
        const pairInfo = UTILITY_PAIRS[space.name];
        const partnerSpace = BOARD_SPACES.find(s => s.index === pairInfo?.partnerIndex);
        const partnerState = pairInfo ? properties[pairInfo.partnerIndex.toString()] : null;
        const partnerOwner = partnerState?.ownerId ? players.find(p => p.id === partnerState.ownerId) : null;

        return (
          <div className="flex flex-col text-slate-800">
            <div className="p-2.5 text-center border-b border-slate-800 bg-slate-800 text-white">
              <div className="text-xl leading-none mb-0.5">{space.flag}</div>
              <div className="font-black text-xs uppercase tracking-wider">{space.name}</div>
              <div className="text-[8px] font-bold uppercase tracking-widest opacity-85 font-mono">
                {space.type === SpaceType.RAILWAY ? "Transit System" : "Utility Corporate"}
              </div>
            </div>

            <div className="p-3 space-y-2 text-2xs leading-normal">
              {/* Owner Status */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Owner</span>
                {owner ? (
                  <span className="flex items-center gap-1 font-bold text-slate-850">
                    <span className={`h-2.5 w-2.5 rounded-full ${owner.color}`} />
                    {owner.name}
                  </span>
                ) : (
                  <span className="font-extrabold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">Unowned 🏦</span>
                )}
              </div>

              <div className="border-b border-slate-100 pb-1.5 font-mono">
                <span className="text-slate-400 block text-[8px] uppercase font-bold tracking-wider">Purchase Price</span>
                <strong className="text-slate-700">${space.price?.toLocaleString()}</strong>
              </div>

              {pairInfo && (
                <div className="space-y-1.5">
                  <span className="text-slate-400 block text-[8px] uppercase font-bold tracking-wider">
                    Utility & Transit Pair
                  </span>
                  <div className="p-1.5 bg-slate-50 border border-slate-150 rounded-lg text-[9px] leading-relaxed">
                    <div className="font-bold flex items-center justify-between text-slate-700 mb-1">
                      <span>Partner: {partnerSpace?.flag} {pairInfo.partnerName}</span>
                      {partnerOwner ? (
                        <span className="text-3xs text-slate-500 font-normal">
                          (Owned by {partnerOwner.name})
                        </span>
                      ) : (
                        <span className="text-3xs text-amber-600 font-normal bg-amber-50/50 px-1 rounded">
                          (Unowned)
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between px-0.5 pt-1 border-t border-slate-200/40">
                      <span>Rent (Owned alone):</span>
                      <strong className="font-mono text-slate-700">${pairInfo.rentAlone.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between px-0.5">
                      <span>Rent (Paired both):</span>
                      <strong className="font-mono text-emerald-600">${pairInfo.rentPaired.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-1.5 border-t border-slate-150 flex justify-between text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                <span>Mortgage Value:</span>
                <span className="text-slate-600 font-mono">${((space.price || 0) / 2).toLocaleString()}</span>
              </div>
            </div>
          </div>
        );
      }
      default: {
        // Special Action Squares
        let desc = "";
        let details = "";
        if (space.type === SpaceType.START) {
          desc = "Provides starting grounds and injects salaries.";
          details = "Passing start automatically transfers $1,500 salary to the player's capital balance.";
        } else if (space.type === SpaceType.TAX) {
          desc = "Travelling Duty & Customs checkpoints.";
          details = "Lands here must pay Travelling/Customs flat fee of $100 per owned developed country or transit system to the Party Bank.";
        } else if (space.type === SpaceType.JAIL) {
          desc = "Detention center & law enforcement zone.";
          details = "When jailed, player must pay immediate $500 bail or skip a chance to be released.";
        } else if (space.type === SpaceType.PARTY_HOUSE) {
          desc = "Social clubhouse of the map!";
          details = "Landing here grants choice to claim the full accumulated Party Bank fund, or collect $200 gifts from every player.";
        } else if (space.type === SpaceType.CASINO) {
          desc = "High-stakes gaming and luck hall!";
          details = "Landing here lets you Gamble up to $10,000 on Odd/Even dice roll or Pass. Win double your bet from the Bank, or lose to Party House Bank!";
        } else if (space.type === SpaceType.CHANCE || space.type === SpaceType.UNO) {
          desc = "Draws an unpredictable card from the deck.";
          details = "Executes mysterious modifiers like massive financial windfalls, heavy IRS penalties, or teleportation.";
        }

        return (
          <div className="flex flex-col text-slate-800">
            <div className="p-2.5 text-center border-b border-slate-800 bg-slate-900 text-white">
              <div className="text-xl leading-none mb-0.5">{space.flag}</div>
              <div className="font-black text-xs uppercase tracking-wider">{space.name}</div>
              <div className="text-[8px] font-bold uppercase tracking-widest opacity-85 font-mono">Special Location</div>
            </div>

            <div className="p-3 space-y-2 text-2xs leading-normal">
              <p className="font-semibold text-slate-700 italic">"{desc}"</p>
              <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg text-slate-500 text-[9px] leading-relaxed">
                {details}
              </div>
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center p-1 sm:p-2" style={{ perspective: "1500px" }}>
      <div
        ref={boardRef}
        style={{
          transform: is3DMode
            ? "rotateX(28deg) rotateZ(-10deg) translateY(-8px) translateZ(0px)"
            : "none",
          transformStyle: "preserve-3d",
          transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.6s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
        className={
          boardStyle === 1
            ? `relative w-full aspect-square max-w-[700px] bg-slate-950 p-2 rounded-3xl border-4 border-slate-900 ring-1 ring-slate-800/60 transition-all ${
                is3DMode
                  ? "shadow-[0_40px_60px_-15px_rgba(0,0,0,0.9),_0_16px_0_0_#0f172a,_0_18px_2px_rgba(255,255,255,0.02)]"
                  : "shadow-2xl"
              }`
            : boardStyle === 2
            ? `relative w-full aspect-square max-w-[700px] bg-amber-950 p-2 rounded-3xl border-4 border-amber-900 ring-2 ring-amber-950 transition-all ${
                is3DMode
                  ? "shadow-[0_40px_60px_-15px_rgba(0,0,0,0.95),_0_18px_0_0_#451a03,_0_20px_2px_#1c1917]"
                  : "shadow-2xl"
              }`
            : boardStyle === 3
            ? `relative w-full aspect-square max-w-[700px] bg-amber-50 p-2 rounded-3xl border-4 border-amber-400 ring-2 ring-yellow-300 transition-all ${
                is3DMode
                  ? "shadow-[0_40px_60px_-15px_rgba(0,0,0,0.85),_0_18px_0_0_#d97706,_0_20px_2px_#78350f]"
                  : "shadow-2xl"
              }`
            : boardStyle === 4
            ? `relative w-full aspect-square max-w-[700px] bg-black p-2 rounded-3xl border-4 border-orange-500 ring-2 ring-orange-500/20 transition-all ${
                is3DMode
                  ? "shadow-[0_40px_60px_-15px_rgba(249,115,22,0.15),_0_18px_0_0_#c2410c,_0_20px_2px_rgba(0,0,0,0.8)]"
                  : "shadow-[0_0_50px_rgba(249,115,22,0.2)]"
              }`
            : `relative w-full aspect-square max-w-[700px] bg-slate-100 p-1.5 rounded-3xl border border-slate-200 transition-all ${
                is3DMode
                  ? "shadow-[0_30px_50px_-15px_rgba(0,0,0,0.4),_0_12px_0_0_#cbd5e1,_0_14px_1px_rgba(0,0,0,0.1)]"
                  : "shadow-xl"
              }`
        }
      >
        <div
          className={
            boardStyle === 1
              ? "grid grid-cols-10 grid-rows-10 h-full w-full gap-1.5 rounded-3xl p-1.5 overflow-hidden bg-[#020617] border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.2)]"
              : boardStyle === 2
              ? "grid grid-cols-10 grid-rows-10 h-full w-full gap-1 rounded-2xl overflow-hidden bg-amber-950"
              : boardStyle === 3
              ? "grid grid-cols-10 grid-rows-10 h-full w-full gap-1 rounded-2xl overflow-hidden bg-amber-100"
              : boardStyle === 4
              ? "grid grid-cols-10 grid-rows-10 h-full w-full gap-1.5 rounded-3xl p-1.5 overflow-hidden bg-black border border-orange-500/30 shadow-[0_0_40px_rgba(249,115,22,0.2)]"
              : "grid grid-cols-10 grid-rows-10 h-full w-full gap-1 rounded-2xl overflow-hidden bg-slate-200"
          }
          style={{ transformStyle: "preserve-3d" }}
        >
          
          {/* Render Spaces */}
          {BOARD_SPACES.map((space) => {
            const propState = properties[space.index.toString()];
            const isOwned = !!propState?.ownerId;
            const owner = isOwned ? players.find((p) => p.id === propState.ownerId) : null;
            const landedPlayers = playersByPosition[space.index] || [];
  
            // Corner spaces special styles
            const isCorner =
              space.index === 0 || space.index === 9 || space.index === 18 || space.index === 27;
  
            // Compute cell class based on Style Selection
            let spaceClass = "";
            if (boardStyle === 1) {
              if (isCorner) {
                if (space.index === 0) {
                  spaceClass = "relative flex flex-col justify-between items-center p-2 rounded-2xl border-2 border-rose-500/50 bg-[#040815]/95 text-white cursor-pointer select-none transition-all duration-300 hover:bg-[#08122d] shadow-[inset_0_0_15px_rgba(239,68,68,0.1),_0_0_15px_rgba(239,68,68,0.15)]";
                } else if (space.index === 9) {
                  spaceClass = "relative flex flex-col justify-between items-center p-2 rounded-2xl border-2 border-blue-500/50 bg-[#040815]/95 text-white cursor-pointer select-none transition-all duration-300 hover:bg-[#08122d] shadow-[inset_0_0_15px_rgba(59,130,246,0.1),_0_0_15px_rgba(59,130,246,0.15)]";
                } else if (space.index === 18) {
                  spaceClass = "relative flex flex-col justify-between items-center p-2 rounded-2xl border-2 border-fuchsia-500/50 bg-[#040815]/95 text-white cursor-pointer select-none transition-all duration-300 hover:bg-[#08122d] shadow-[inset_0_0_15px_rgba(217,70,239,0.1),_0_0_15px_rgba(217,70,239,0.15)]";
                } else {
                  spaceClass = "relative flex flex-col justify-between items-center p-2 rounded-2xl border-2 border-emerald-500/50 bg-[#040815]/95 text-white cursor-pointer select-none transition-all duration-300 hover:bg-[#08122d] shadow-[inset_0_0_15px_rgba(16,185,129,0.1),_0_0_15px_rgba(16,185,129,0.15)]";
                }
              } else {
                let glowColor = "cyan";
                if (space.color === "yellow") glowColor = "amber";
                else if (space.color === "purple") glowColor = "purple";
                else if (space.color === "orange") glowColor = "orange";
                else if (space.color === "blue") glowColor = "cyan";
                else if (space.type === SpaceType.RAILWAY) glowColor = "indigo";
                else if (space.type === SpaceType.UTILITY) glowColor = "teal";
                else if (space.type === SpaceType.CHANCE) glowColor = "rose";
                else if (space.type === SpaceType.UNO) glowColor = "red";
                else if (space.type === SpaceType.TAX) glowColor = "violet";

                let borderClass = "border-cyan-500/30";
                let shadowClass = "shadow-[inset_0_0_8px_rgba(6,182,212,0.05),_0_0_10px_rgba(6,182,212,0.1)]";
                let hoverBorderClass = "hover:border-cyan-400";
                let hoverShadowClass = "hover:shadow-[inset_0_0_12px_rgba(6,182,212,0.12),_0_0_15px_rgba(6,182,212,0.25)]";

                if (glowColor === "amber") {
                  borderClass = "border-amber-500/35";
                  shadowClass = "shadow-[inset_0_0_8px_rgba(245,158,11,0.05),_0_0_10px_rgba(245,158,11,0.15)]";
                  hoverBorderClass = "hover:border-amber-400";
                  hoverShadowClass = "hover:shadow-[inset_0_0_12px_rgba(245,158,11,0.12),_0_0_15px_rgba(245,158,11,0.25)]";
                } else if (glowColor === "purple") {
                  borderClass = "border-purple-500/35";
                  shadowClass = "shadow-[inset_0_0_8px_rgba(168,85,247,0.05),_0_0_10px_rgba(168,85,247,0.15)]";
                  hoverBorderClass = "hover:border-purple-400";
                  hoverShadowClass = "hover:shadow-[inset_0_0_12px_rgba(168,85,247,0.12),_0_0_15px_rgba(168,85,247,0.25)]";
                } else if (glowColor === "orange") {
                  borderClass = "border-orange-500/35";
                  shadowClass = "shadow-[inset_0_0_8px_rgba(249,115,22,0.05),_0_0_10px_rgba(249,115,22,0.15)]";
                  hoverBorderClass = "hover:border-orange-400";
                  hoverShadowClass = "hover:shadow-[inset_0_0_12px_rgba(249,115,22,0.12),_0_0_15px_rgba(249,115,22,0.25)]";
                } else if (glowColor === "indigo") {
                  borderClass = "border-indigo-500/35";
                  shadowClass = "shadow-[inset_0_0_8px_rgba(99,102,241,0.05),_0_0_10px_rgba(99,102,241,0.15)]";
                  hoverBorderClass = "hover:border-indigo-400";
                  hoverShadowClass = "hover:shadow-[inset_0_0_12px_rgba(99,102,241,0.12),_0_0_15px_rgba(99,102,241,0.25)]";
                } else if (glowColor === "teal") {
                  borderClass = "border-teal-500/35";
                  shadowClass = "shadow-[inset_0_0_8px_rgba(20,184,166,0.05),_0_0_10px_rgba(20,184,166,0.15)]";
                  hoverBorderClass = "hover:border-teal-400";
                  hoverShadowClass = "hover:shadow-[inset_0_0_12px_rgba(20,184,166,0.12),_0_0_15px_rgba(20,184,166,0.25)]";
                } else if (glowColor === "rose") {
                  borderClass = "border-rose-500/35";
                  shadowClass = "shadow-[inset_0_0_8px_rgba(244,63,94,0.05),_0_0_10px_rgba(244,63,94,0.15)]";
                  hoverBorderClass = "hover:border-rose-400";
                  hoverShadowClass = "hover:shadow-[inset_0_0_12px_rgba(244,63,94,0.12),_0_0_15px_rgba(244,63,94,0.25)]";
                } else if (glowColor === "red") {
                  borderClass = "border-red-500/35";
                  shadowClass = "shadow-[inset_0_0_8px_rgba(239,68,68,0.05),_0_0_10px_rgba(239,68,68,0.15)]";
                  hoverBorderClass = "hover:border-red-400";
                  hoverShadowClass = "hover:shadow-[inset_0_0_12px_rgba(239,68,68,0.12),_0_0_15px_rgba(239,68,68,0.25)]";
                } else if (glowColor === "violet") {
                  borderClass = "border-violet-500/35";
                  shadowClass = "shadow-[inset_0_0_8px_rgba(139,92,246,0.05),_0_0_10px_rgba(139,92,246,0.15)]";
                  hoverBorderClass = "hover:border-violet-400";
                  hoverShadowClass = "hover:shadow-[inset_0_0_12px_rgba(139,92,246,0.12),_0_0_15px_rgba(139,92,246,0.25)]";
                }

                const ownerBorderGlow = owner ? `ring-1 ring-inset ring-${glowColor}-400/40` : "";
                spaceClass = `relative flex flex-col justify-between p-2 rounded-xl border ${borderClass} cursor-pointer select-none transition-all duration-300 hover:bg-[#070e24]/90 bg-[#040815]/95 text-slate-100 ${shadowClass} ${hoverBorderClass} ${hoverShadowClass} ${ownerBorderGlow}`;
              }
            } else if (boardStyle === 2) {
              if (isCorner) {
                spaceClass = "relative flex flex-col justify-between p-1.5 border border-amber-900/40 cursor-pointer select-none transition-all hover:bg-amber-900/10 bg-gradient-to-br from-amber-900 via-amber-950/80 to-amber-950 text-amber-100 shadow-md shadow-black/25";
              } else {
                const ownerBg = owner ? owner.color.split(" ")[0] : "";
                const ownerBorderGlow = owner ? `ring-1 ring-inset ${ownerBg.replace("bg-", "ring-")}/20 shadow-[inset_0_0_8px_rgba(0,0,0,0.05)]` : "";
                spaceClass = `relative flex flex-col justify-between p-2 border border-amber-900/10 cursor-pointer select-none transition-all hover:bg-stone-100 bg-gradient-to-b from-stone-50 to-stone-100 text-stone-900 shadow-sm ${ownerBorderGlow}`;
              }
            } else if (boardStyle === 3) {
              if (isCorner) {
                spaceClass = "relative flex flex-col justify-between p-1.5 border border-amber-200/60 cursor-pointer select-none transition-all hover:bg-amber-100/50 bg-gradient-to-br from-yellow-500 via-amber-600 to-amber-700 text-amber-50 shadow-md shadow-amber-900/20";
              } else {
                const ownerBg = owner ? owner.color.split(" ")[0] : "";
                const ownerBorderGlow = owner ? `ring-2 ring-inset ${ownerBg.replace("bg-", "ring-")}/30 shadow-[inset_0_0_10px_rgba(251,191,36,0.05)]` : "";
                spaceClass = `relative flex flex-col justify-between p-2 border border-amber-100/70 cursor-pointer select-none transition-all hover:bg-amber-50/50 bg-gradient-to-b from-white via-stone-50 to-amber-50/40 text-stone-900 shadow-sm ${ownerBorderGlow}`;
              }
            } else if (boardStyle === 4) {
              if (isCorner) {
                spaceClass = "relative flex flex-col justify-between p-1.5 border-2 border-orange-500 cursor-pointer select-none transition-all hover:bg-orange-500/10 bg-black text-white shadow-[0_0_15px_rgba(249,115,22,0.35)] font-mono";
              } else {
                const ownerBg = owner ? owner.color.split(" ")[0] : "";
                const ownerBorderGlow = owner ? `ring-2 ring-inset ring-orange-500/40 shadow-[inset_0_0_8px_rgba(249,115,22,0.1)]` : "";
                spaceClass = `relative flex flex-col justify-between p-2 border-2 border-zinc-800 cursor-pointer select-none transition-all hover:border-orange-500 hover:bg-orange-500/5 bg-black text-white shadow-sm font-mono ${ownerBorderGlow}`;
              }
            } else {
              spaceClass = `relative flex flex-col justify-between p-1.5 border border-slate-200/50 cursor-pointer select-none transition-all hover:bg-slate-50/50 ${
                isCorner
                  ? "bg-gradient-to-br from-slate-800 to-slate-900 text-white"
                  : "bg-white text-slate-800"
              }`;
            }

          return (
            <div
              key={space.index}
              onClick={() => onSpaceClick?.(space)}
              onMouseEnter={(e) => {
                setHoveredSpace(space);
                handleMouseMove(e);
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredSpace(null)}
              id={`board-space-${space.index}`}
              className={spaceClass}
              style={{
                gridRow: space.gridRow,
                gridCol: space.gridCol,
                gridColumnStart: space.gridCol,
                gridRowStart: space.gridRow
              }}
            >
              {/* Background Flag overlay for country tiles */}
              {space.type === SpaceType.COUNTRY && (
                <div className={`absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden transition-opacity duration-300 ${
                  boardStyle === 1 || boardStyle === 4 ? "opacity-[0.12]" : "opacity-[0.08]"
                }`}>
                  {(() => {
                    const code = getCountryCode(space.name);
                    return code ? (
                      <img
                        src={`https://flagcdn.com/w160/${code}.png`}
                        alt=""
                        className="w-16 h-11 object-cover opacity-85 filter saturate-[1.2] drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)] scale-[2.2] transform rotate-[-12deg]"
                        referrerPolicy="no-referrer"
                      />
                    ) : null;
                  })()}
                </div>
              )}
              {/* Header bar for countries - skipped for style 1 to keep layout extremely clean */}
              {space.color && boardStyle !== 1 && (
                boardStyle === 2 ? (
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${space.colorClass?.split(" ")[0] || "bg-slate-200"} opacity-90 border-b border-amber-900/10`}>
                    {/* Houses indicator */}
                    {propState && propState.houses > 0 && !propState.hasHotel && (
                      <div className="absolute top-[-3.5px] left-1/2 -translate-x-1/2 flex gap-0.5 justify-center z-10">
                        {Array.from({ length: propState.houses }).map((_, i) => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-600 border border-white shadow-xs" title="House" />
                        ))}
                      </div>
                    )}
                    {/* Hotel indicator */}
                    {propState && propState.hasHotel && (
                      <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 z-10 animate-bounce">
                        <div className="w-2 h-2 rounded-sm bg-red-600 border border-white shadow-sm" title="Hotel" />
                      </div>
                    )}
                  </div>
                ) : boardStyle === 3 ? (
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${space.colorClass?.split(" ")[0] || "bg-slate-200"} opacity-95 border-b border-amber-200/60`}>
                    {/* Houses indicator */}
                    {propState && propState.houses > 0 && !propState.hasHotel && (
                      <div className="absolute top-[-3.5px] left-1/2 -translate-x-1/2 flex gap-0.5 justify-center z-10">
                        {Array.from({ length: propState.houses }).map((_, i) => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500 border border-white shadow-xs" title="House" />
                        ))}
                      </div>
                    )}
                    {/* Hotel indicator */}
                    {propState && propState.hasHotel && (
                      <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 z-10 animate-pulse">
                        <div className="w-2 h-2 rounded-sm bg-red-500 border border-white shadow-sm" title="Hotel" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`absolute top-0 left-0 right-0 h-2 ${space.colorClass?.split(" ")[0] || "bg-slate-200"} flex gap-0.5 px-1 items-center justify-center`}>
                    {/* Houses indicator */}
                    {propState && propState.houses > 0 && !propState.hasHotel && (
                      <div className="flex gap-0.5 shrink-0 z-10">
                        {Array.from({ length: propState.houses }).map((_, i) => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-500 border border-white" title="House" />
                        ))}
                      </div>
                    )}
                    {/* Hotel indicator */}
                    {propState && propState.hasHotel && (
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 border border-white shrink-0 z-10 animate-pulse" title="Hotel" />
                    )}
                  </div>
                )
              )}

              {/* High-Fidelity Group color indicator bar at the top center of cell for Style 1 */}
              {space.color && boardStyle === 1 && (
                <div className="absolute top-1 left-4 right-4 h-0.5 rounded-full overflow-hidden flex z-10">
                  <div className={`w-full h-full ${
                    space.color === "yellow" ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]" :
                    space.color === "purple" ? "bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.6)]" :
                    space.color === "orange" ? "bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.6)]" :
                    "bg-cyan-400 shadow-[0_0_6px_rgba(96,165,250,0.6)]"
                  }`} />
                </div>
              )}

              {/* High-Fidelity Houses/Hotel Indicators at the Top Left of cell for Style 1 */}
              {propState && (propState.houses > 0 || propState.hasHotel) && boardStyle === 1 && (
                <div className="absolute top-1.5 left-1.5 flex gap-0.5 z-10 scale-90">
                  {propState.hasHotel ? (
                    <div className="h-1.5 w-1.5 rounded bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] border border-slate-900 animate-pulse" title="Hotel" />
                  ) : (
                    <div className="flex gap-0.5">
                      {Array.from({ length: propState.houses }).map((_, i) => (
                        <div key={i} className="h-1 w-1 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] border border-slate-900" title="House" />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* High-Fidelity Owner Badge at the Top Right of cell for Style 1 */}
              {boardStyle === 1 && owner && (
                <div className={`absolute top-1.5 right-1.5 h-3.5 w-3.5 rounded-full flex items-center justify-center border border-slate-950 shadow-[0_0_6px_rgba(255,255,255,0.2)] ${owner.color.split(" ")[0]} text-white z-10 scale-90`}>
                  <span className="text-[7.5px] leading-none font-bold">{owner.avatar}</span>
                </div>
              )}

              {/* Space Name & Flag */}
              {boardStyle === 1 ? (
                isCorner ? (
                  space.index === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-1 w-full mt-1.5">
                      <span className="text-2xl md:text-3xl mb-1 filter drop-shadow-[0_0_10px_rgba(239,68,68,0.65)] animate-bounce duration-1000">🏎️</span>
                      <span className="text-[9px] md:text-[10px] font-black tracking-[0.2em] text-rose-200 uppercase drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]">START</span>
                    </div>
                  ) : space.index === 9 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-1 w-full mt-1.5">
                      <span className="text-2xl md:text-3xl mb-1 filter drop-shadow-[0_0_10px_rgba(59,130,246,0.65)]">👮</span>
                      <span className="text-[9px] md:text-[10px] font-black tracking-[0.2em] text-blue-200 uppercase drop-shadow-[0_0_4px_rgba(59,130,246,0.5)]">JAIL</span>
                    </div>
                  ) : space.index === 18 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-1 w-full mt-1.5">
                      <span className="text-2xl md:text-3xl mb-1 filter drop-shadow-[0_0_10px_rgba(217,70,239,0.65)] animate-pulse">🎭</span>
                      <span className="text-[9px] md:text-[10px] font-black tracking-[0.2em] text-fuchsia-200 uppercase drop-shadow-[0_0_4px_rgba(217,70,239,0.5)]">PARTY</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-1 w-full mt-1.5">
                      <span className="text-2xl md:text-3xl mb-1 filter drop-shadow-[0_0_10px_rgba(234,179,8,0.65)]">🎰</span>
                      <span className="text-[9px] md:text-[10px] font-black tracking-[0.2em] text-amber-200 uppercase drop-shadow-[0_0_4px_rgba(234,179,8,0.5)]">CASINO</span>
                    </div>
                  )
                ) : (
                  <div className={`flex flex-col items-center justify-center h-full text-center w-full ${space.color ? "mt-2" : ""}`}>
                    <span className="mb-1 select-none flex items-center justify-center h-5">
                      {space.type === SpaceType.COUNTRY ? (
                        (() => {
                          const code = getCountryCode(space.name);
                          return code ? (
                            <img
                              src={`https://flagcdn.com/w160/${code}.png`}
                              alt=""
                              className="h-3.5 w-5 md:h-4 md:w-6 object-cover rounded-xs shadow-md border border-slate-700/50"
                              referrerPolicy="no-referrer"
                            />
                          ) : null;
                        })()
                      ) : (
                        <span className="text-sm md:text-base filter drop-shadow-[0_0_6px_rgba(255,255,255,0.35)]">
                          {space.flag}
                        </span>
                      )}
                    </span>
                    <span className="font-extrabold tracking-wide leading-tight text-[8px] md:text-[9.5px] text-white select-none line-clamp-2 px-0.5">
                      {space.name}
                    </span>
                  </div>
                )
              ) : boardStyle === 2 ? (
                <div className={`flex flex-col items-center justify-center h-full text-center ${space.color ? "mt-2.5" : ""}`}>
                  {space.type !== SpaceType.COUNTRY && (
                    <span className={`${isCorner ? "text-xl md:text-2xl filter drop-shadow" : "text-sm md:text-base"} mb-0.5`}>
                      {space.flag}
                    </span>
                  )}
                  <span className={`font-bold font-serif tracking-tight leading-none ${isCorner ? "text-xs text-amber-200 font-extrabold" : "text-[8.5px] md:text-[9.5px] text-stone-800"} line-clamp-2`}>
                    {space.name}
                  </span>
                </div>
              ) : boardStyle === 3 ? (
                <div className={`flex flex-col items-center justify-center h-full text-center ${space.color ? "mt-2.5" : ""}`}>
                  {space.type !== SpaceType.COUNTRY && (
                    <span className={`${isCorner ? "text-xl md:text-2xl filter drop-shadow" : "text-sm md:text-base"} mb-0.5`}>
                      {space.flag}
                    </span>
                  )}
                  <span className={`font-black font-sans tracking-tight leading-none ${isCorner ? "text-xs text-amber-800 font-extrabold" : "text-[8.5px] md:text-[9.5px] text-amber-950"} line-clamp-2`}>
                    {space.name}
                  </span>
                </div>
              ) : (
                <div className={`flex flex-col items-center justify-center h-full text-center ${space.color ? "mt-1" : ""}`}>
                  {space.type !== SpaceType.COUNTRY && (
                    <span className={`${isCorner ? "text-xl md:text-2xl" : "text-base md:text-lg"} mb-0.5`}>
                      {space.flag}
                    </span>
                  )}
                  <span className={`font-semibold tracking-tight leading-none ${isCorner ? "text-xs text-slate-100" : "text-[9px] md:text-[10px] text-white"} line-clamp-2`}>
                    {space.name}
                  </span>
                </div>
              )}

              {/* Bottom detail (Price/Owner banner) */}
              {boardStyle === 1 ? (
                <div className="flex justify-center items-center w-full mt-auto pt-0.5 z-10">
                  {space.price ? (
                    <span className="font-mono text-[7.5px] md:text-[8.5px] font-black text-cyan-400/90 drop-shadow-[0_0_4px_rgba(34,211,238,0.2)] select-none">
                      {owner ? `[${owner.name.substring(0, 3).toUpperCase()}]` : `$${space.price}`}
                    </span>
                  ) : (
                    <span className="h-2"></span>
                  )}
                </div>
              ) : boardStyle === 2 ? (
                <div className="flex justify-between items-center w-full mt-auto pt-0.5">
                  {space.price ? (
                    <span className={`font-serif text-[8.5px] md:text-[9.5px] font-bold ${isCorner ? "text-amber-100" : owner ? "text-amber-800" : "text-amber-900"}`}>
                      {owner ? `[${owner.name.substring(0, 3)}]` : `$${space.price}`}
                    </span>
                  ) : (
                    <span className="text-[7px] text-stone-400 font-mono"></span>
                  )}
                  
                  {/* Visual indicator of building counts */}
                  {propState && (propState.houses > 0 || propState.hasHotel) && (
                    <span className="flex items-center gap-0.5 text-2xs">
                      {propState.hasHotel ? (
                        <Hotel className="h-2.5 w-2.5 text-red-700 shrink-0" />
                      ) : (
                        <div className="flex gap-0.5 items-center">
                          <Building className="h-2.5 w-2.5 text-emerald-700 shrink-0" />
                          <span className="text-[7.5px] font-bold text-emerald-800 font-serif">{propState.houses}</span>
                        </div>
                      )}
                    </span>
                  )}
                </div>
              ) : boardStyle === 3 ? (
                <div className="flex justify-between items-center w-full mt-auto pt-0.5">
                  {space.price ? (
                    <span className={`font-mono text-[8.5px] md:text-[9.5px] font-extrabold ${isCorner ? "text-amber-100" : owner ? "text-yellow-700" : "text-amber-800"}`}>
                      {owner ? `[${owner.name.substring(0, 3)}]` : `$${space.price}`}
                    </span>
                  ) : (
                    <span className="text-[7px] text-amber-600/60 font-mono"></span>
                  )}
                  
                  {/* Visual indicator of building counts */}
                  {propState && (propState.houses > 0 || propState.hasHotel) && (
                    <span className="flex items-center gap-0.5 text-2xs">
                      {propState.hasHotel ? (
                        <Hotel className="h-2.5 w-2.5 text-red-600 shrink-0" />
                      ) : (
                        <div className="flex gap-0.5 items-center">
                          <Building className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                          <span className="text-[7.5px] font-bold text-emerald-800 font-serif">{propState.houses}</span>
                        </div>
                      )}
                    </span>
                  )}
                </div>
              ) : boardStyle === 4 ? (
                <div className="flex justify-between items-center w-full mt-auto font-mono">
                  {space.price ? (
                    <span className={`text-[8px] md:text-[9.5px] font-black tracking-wider ${isCorner ? "text-white" : owner ? "text-orange-400" : "text-orange-500"}`}>
                      {owner ? `[${owner.name.substring(0, 3).toUpperCase()}]` : `$${space.price}`}
                    </span>
                  ) : (
                    <span className="text-[7px] text-zinc-600"></span>
                  )}
                  
                  {/* Visual indicator of building counts */}
                  {propState && (propState.houses > 0 || propState.hasHotel) && (
                    <span className="flex items-center gap-0.5 text-2xs">
                      {propState.hasHotel ? (
                        <Hotel className="h-2.5 w-2.5 text-orange-500 animate-pulse shrink-0" />
                      ) : (
                        <div className="flex gap-0.5 items-center">
                          <Building className="h-2.5 w-2.5 text-orange-500 shrink-0" />
                          <span className="text-[7.5px] font-black text-white">{propState.houses}</span>
                        </div>
                      )}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex justify-between items-center w-full mt-auto">
                  {space.price ? (
                    <span className={`font-mono text-[8px] md:text-[9px] font-bold ${isCorner ? "text-slate-300" : owner ? "text-slate-400" : "text-slate-500"}`}>
                      {owner ? `[${owner.name.substring(0, 3)}]` : `$${space.price}`}
                    </span>
                  ) : (
                    <span className="text-[7px] text-slate-400 font-mono"></span>
                  )}
                  
                  {/* Visual indicator of building counts */}
                  {propState && (propState.houses > 0 || propState.hasHotel) && (
                    <span className="flex items-center gap-0.5 text-2xs text-slate-500">
                      {propState.hasHotel ? (
                        <Hotel className="h-2 w-2 text-red-500 shrink-0" />
                      ) : (
                        <Building className="h-2 w-2 text-emerald-500 shrink-0" />
                      )}
                    </span>
                  )}
                </div>
              )}

              {/* Owner Avatar Badge overlay for Style 2 & 3 */}
              {boardStyle !== 1 && owner && (
                <div className={`absolute top-1.5 right-1.5 h-3.5 w-3.5 rounded-full flex items-center justify-center border border-slate-950 shadow-md ${owner.color.split(" ")[0]} text-white z-10 scale-95`}>
                  <span className="text-[8px] leading-none">{owner.avatar}</span>
                </div>
              )}
              {boardStyle === 2 && owner && (
                <div className={`absolute top-1.5 right-1.5 h-4 w-4 rounded-full flex items-center justify-center border border-amber-800 shadow-md ${owner.color.split(" ")[0]} text-white z-10 scale-95`}>
                  <span className="text-[8.5px] leading-none">{owner.avatar}</span>
                </div>
              )}
              {boardStyle === 3 && owner && (
                <div className={`absolute top-1.5 right-1.5 h-4 w-4 rounded-full flex items-center justify-center border border-amber-300 shadow-md ${owner.color.split(" ")[0]} text-white z-10 scale-95`}>
                  <span className="text-[8.5px] leading-none">{owner.avatar}</span>
                </div>
              )}

              {/* Player Tokens Container inside Space */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none gap-0.5 p-1 flex-wrap mt-2" style={{ transformStyle: "preserve-3d" }}>
                <AnimatePresence>
                  {landedPlayers.map((player) => {
                    const isHopping = !!activeHoppingPlayerIds[player.id];
                    return (
                      <motion.div
                        key={player.id}
                        layoutId={`player-token-${player.id}`}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{
                          scale: isHopping ? [1, 1.3, 1] : 1,
                          y: isHopping ? [0, -16, 0] : 0,
                          opacity: 1
                        }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{
                          layout: { type: "spring", stiffness: 350, damping: 26 },
                          y: { duration: 0.15, ease: "easeInOut" },
                          scale: { duration: 0.15, ease: "easeInOut" }
                        }}
                        className={`relative flex h-5 w-5 md:h-6 md:w-6 items-center justify-center rounded-full text-xs md:text-sm shadow-md ring-2 ring-white border border-slate-200 ${player.color.split(" ")[0]} text-white shrink-0 z-20 pointer-events-auto transition-all ${
                          isHopping ? "ring-amber-300 ring-4 shadow-[0_0_15px_rgba(251,191,36,0.8)] scale-110" : ""
                        }`}
                        style={{
                          transform: is3DMode ? "rotateX(-28deg) rotateZ(10deg) translateZ(10px) scale(1.15)" : "none",
                          transformStyle: "preserve-3d",
                          boxShadow: is3DMode ? "0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -2px rgba(0,0,0,0.2)" : ""
                        }}
                        title={player.name}
                      >
                        {player.avatar}
                        {/* Animated drop shadow pulse during hop step */}
                        {isHopping && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: [0, 0.6, 0], scale: [0.6, 1.2, 0.6] }}
                            transition={{ duration: 0.15 }}
                            className="absolute -bottom-1.5 w-4 h-1 bg-black/60 rounded-full blur-[1px] pointer-events-none"
                          />
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          );
        })}

        {/* Center Panel (Grid row 2-9, col 2-9) */}
        <div className={
          boardStyle === 1
            ? "col-start-2 col-end-10 row-start-2 row-end-10 bg-[#030712]/95 flex flex-col justify-between p-4 md:p-6 text-white relative border-4 border-cyan-500/20 rounded-3xl overflow-hidden shadow-[0_0_35px_rgba(6,182,212,0.15),_inset_0_0_20px_rgba(6,182,212,0.1)]"
            : boardStyle === 3
            ? "col-start-2 col-end-10 row-start-2 row-end-10 bg-stone-50 flex flex-col justify-between p-4 md:p-6 text-stone-900 relative border-4 border-amber-300 rounded-xl overflow-hidden shadow-[inset_0_4px_20px_rgba(217,119,6,0.1)]"
            : boardStyle === 2 
            ? "col-start-2 col-end-10 row-start-2 row-end-10 bg-emerald-950 flex flex-col justify-between p-4 md:p-6 text-amber-50 relative border-4 border-amber-900 rounded-xl overflow-hidden shadow-[inset_0_4px_20px_rgba(0,0,0,0.6)]"
            : boardStyle === 4
            ? "col-start-2 col-end-10 row-start-2 row-end-10 bg-black flex flex-col justify-between p-4 md:p-6 text-white relative border-4 border-orange-500/40 rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(249,115,22,0.15),_inset_0_0_20px_rgba(249,115,22,0.1)]"
            : "col-start-2 col-end-10 row-start-2 row-end-10 bg-slate-900 flex flex-col justify-between p-4 md:p-6 text-white relative border-4 border-slate-800 rounded-xl overflow-hidden shadow-inner"
        }>
          {/* Grid ambient backgrounds */}
          {boardStyle === 1 ? (
            <div className="absolute inset-0 bg-radial-[circle_at_center,rgba(6,182,212,0.12)_0%,rgba(2,6,23,0.95)_100%] pointer-events-none" />
          ) : boardStyle === 3 ? (
            <div className="absolute inset-0 bg-radial-[circle_at_center,rgba(251,191,36,0.08)_0%,rgba(217,119,6,0.02)_100%] pointer-events-none" />
          ) : boardStyle === 2 ? (
            <div className="absolute inset-0 bg-radial-[circle_at_center,rgba(6,95,70,0.25)_0%,rgba(2,44,34,0.95)_100%] pointer-events-none" />
          ) : boardStyle === 4 ? (
            <div className="absolute inset-0 bg-radial-[circle_at_center,rgba(249,115,22,0.15)_0%,rgba(0,0,0,0.95)_100%] pointer-events-none" />
          ) : (
            <div className="absolute inset-0 bg-radial-[circle_at_center,rgba(30,41,59,0.3)_0%,rgba(15,23,42,0.9)_100%] pointer-events-none" />
          )}

          {/* High-Fidelity SVG Cybernetic Circuit Paths & Digital Globe for Style 1 */}
          {boardStyle === 1 && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-80">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#eab308" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#ca8a04" stopOpacity="0.1" />
                  </linearGradient>
                  <linearGradient id="cyanGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#0891b2" stopOpacity="0.1" />
                  </linearGradient>
                  <filter id="glowGold">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <filter id="glowCyan">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Digital earth globe wireframe in background center */}
                <g transform="translate(300, 300)" opacity="0.12">
                  <circle cx="0" cy="0" r="180" fill="none" stroke="#06b6d4" strokeWidth="1" strokeDasharray="4 4" />
                  <circle cx="0" cy="0" r="140" fill="none" stroke="#06b6d4" strokeWidth="1.5" />
                  <ellipse cx="0" cy="0" rx="140" ry="50" fill="none" stroke="#06b6d4" strokeWidth="1" />
                  <ellipse cx="0" cy="0" rx="140" ry="95" fill="none" stroke="#06b6d4" strokeWidth="1" />
                  <ellipse cx="0" cy="0" rx="50" ry="140" fill="none" stroke="#06b6d4" strokeWidth="1" />
                  <ellipse cx="0" cy="0" rx="95" ry="140" fill="none" stroke="#06b6d4" strokeWidth="1" />
                  <line x1="-140" y1="0" x2="140" y2="0" stroke="#06b6d4" strokeWidth="1" />
                  <line x1="0" y1="-140" x2="0" y2="140" stroke="#06b6d4" strokeWidth="1" />
                </g>

                {/* Circuit Board Traces (matching PCB layout in image) */}
                <g strokeWidth="1.5" fill="none" opacity="0.4">
                  {/* Left Side Circuits */}
                  <path d="M 60,200 L 140,200 L 170,170 L 220,170" stroke="url(#goldGrad)" filter="url(#glowGold)" />
                  <circle cx="60" cy="200" r="2.5" fill="#eab308" />
                  <circle cx="220" cy="170" r="2" fill="#ca8a04" />

                  <path d="M 40,300 L 120,300 L 150,330 L 210,330" stroke="url(#cyanGrad)" filter="url(#glowCyan)" />
                  <circle cx="40" cy="300" r="2.5" fill="#06b6d4" />
                  <circle cx="210" cy="330" r="2" fill="#0891b2" />

                  {/* Right Side Circuits */}
                  <path d="M 540,200 L 460,200 L 430,230 L 380,230" stroke="url(#cyanGrad)" filter="url(#glowCyan)" />
                  <circle cx="540" cy="200" r="2.5" fill="#06b6d4" />
                  <circle cx="380" cy="230" r="2" fill="#0891b2" />

                  <path d="M 560,300 L 480,300 L 450,270 L 400,270" stroke="url(#goldGrad)" filter="url(#glowGold)" />
                  <circle cx="560" cy="300" r="2.5" fill="#eab308" />
                  <circle cx="400" cy="270" r="2" fill="#ca8a04" />
                </g>
              </svg>
            </div>
          )}

          {/* Top segment: Title */}
          <div className="text-center z-10">
            <h1 className={
              boardStyle === 1
                ? "text-2xl md:text-4xl font-black tracking-[0.25em] bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent uppercase select-none filter drop-shadow-[0_0_12px_rgba(234,179,8,0.6)] font-sans animate-pulse"
                : boardStyle === 3
                ? "text-xl md:text-3xl font-extrabold tracking-widest bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-800 bg-clip-text text-transparent uppercase font-serif select-none drop-shadow-sm animate-pulse"
                : boardStyle === 2
                ? "text-xl md:text-3xl font-bold tracking-widest bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent uppercase font-serif select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                : boardStyle === 4
                ? "text-2xl md:text-4xl font-black tracking-[0.25em] bg-gradient-to-r from-white via-orange-500 to-white bg-clip-text text-transparent uppercase select-none filter drop-shadow-[0_0_12px_rgba(249,115,22,0.6)] font-mono animate-pulse"
                : "text-xl md:text-3xl font-extrabold tracking-wider bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent uppercase font-sans select-none drop-shadow-sm"
            }>
              {boardStyle === 1 || boardStyle === 4 ? "BUSINESS" : "Business"}
            </h1>
            <p className={
              boardStyle === 1
                ? "text-[9px] md:text-xs text-cyan-400 uppercase tracking-[0.3em] font-sans font-black mt-2 select-none filter drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                : boardStyle === 3
                ? "text-[9px] md:text-xs text-amber-800 uppercase tracking-widest font-serif mt-1 select-none font-bold opacity-90"
                : boardStyle === 2
                ? "text-[9px] md:text-xs text-amber-300 uppercase tracking-widest font-serif mt-1 select-none font-semibold opacity-90"
                : boardStyle === 4
                ? "text-[9px] md:text-xs text-orange-500 uppercase tracking-[0.3em] font-mono font-black mt-2 select-none filter drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                : "text-[9px] md:text-xs text-slate-400 uppercase tracking-widest font-mono mt-0.5 select-none"
            }>
              {boardStyle === 1 || boardStyle === 4 ? "INTERNATIONAL BOARD GAME" : "International Board Game"}
            </p>
          </div>

          {/* Middle segment: Vault / Party House Bank details */}
          <div className={
            boardStyle === 1
              ? "flex flex-col items-center justify-center z-10 bg-[#050d24]/90 border border-cyan-400/40 rounded-2xl py-4 px-6 max-w-[240px] w-full mx-auto shadow-[0_0_30px_rgba(6,182,212,0.2),_inset_0_1px_1px_rgba(255,255,255,0.05)] text-center relative backdrop-blur-md select-none"
              : boardStyle === 3
              ? "flex flex-col items-center justify-center z-10 bg-amber-100/30 border border-amber-300/40 rounded-2xl py-3 px-4 max-w-[200px] mx-auto shadow backdrop-blur-xs select-none"
              : boardStyle === 2
              ? "flex flex-col items-center justify-center z-10 bg-amber-950/60 border border-amber-800/40 rounded-2xl py-3 px-4 max-w-[200px] mx-auto shadow-lg backdrop-blur-xs select-none"
              : boardStyle === 4
              ? "flex flex-col items-center justify-center z-10 bg-zinc-950/90 border border-orange-500/40 rounded-2xl py-4 px-6 max-w-[240px] w-full mx-auto shadow-[0_0_30px_rgba(249,115,22,0.25),_inset_0_1px_1px_rgba(255,255,255,0.05)] text-center relative backdrop-blur-md select-none"
              : "flex flex-col items-center justify-center z-10 bg-slate-800/60 border border-slate-700/50 rounded-2xl py-3 px-4 max-w-[200px] mx-auto shadow-lg backdrop-blur-xs select-none"
          }>
            <span className={
              boardStyle === 1
                ? "text-[9px] text-amber-400 uppercase tracking-[0.2em] font-black flex items-center gap-1.5 mb-1.5 filter drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]"
                : boardStyle === 3
                ? "text-2xs text-amber-800 uppercase tracking-widest font-bold flex items-center gap-1 mb-1 font-serif"
                : boardStyle === 2
                ? "text-2xs text-yellow-400 uppercase tracking-widest font-bold flex items-center gap-1 mb-1 font-serif"
                : boardStyle === 4
                ? "text-[9px] text-orange-500 uppercase tracking-[0.2em] font-black flex items-center gap-1.5 mb-1.5 filter drop-shadow-[0_0_6px_rgba(249,115,22,0.4)] font-mono"
                : "text-2xs text-amber-400 uppercase tracking-widest font-bold flex items-center gap-1 mb-1"
            }>
              {boardStyle === 1 || boardStyle === 4 ? "💼 PARTY BANK" : "🥳 Party Bank"}
            </span>
            <span className={
              boardStyle === 1
                ? "text-xl md:text-3xl font-mono font-black text-sky-400 tracking-tight filter drop-shadow-[0_0_12px_rgba(56,189,248,0.7)]"
                : boardStyle === 3
                ? "text-lg md:text-2xl font-serif font-black text-amber-900 tracking-tight drop-shadow-sm"
                : boardStyle === 2
                ? "text-lg md:text-2xl font-serif font-black text-amber-100 tracking-tight drop-shadow-md"
                : boardStyle === 4
                ? "text-xl md:text-3xl font-mono font-black text-white tracking-tight filter drop-shadow-[0_0_12px_rgba(249,115,22,0.7)]"
                : "text-lg md:text-2xl font-mono font-black text-white tracking-tight drop-shadow-md"
            }>
              ${partyHouseBank.toLocaleString()}
            </span>
            <span className={
              boardStyle === 1
                ? "text-[8px] md:text-[9px] text-slate-400 text-center mt-2 leading-relaxed font-sans font-medium px-2"
                : boardStyle === 3
                ? "text-[8px] text-amber-900/75 text-center mt-1 leading-normal font-serif"
                : boardStyle === 2
                ? "text-[8px] text-amber-200/80 text-center mt-1 leading-normal font-serif"
                : boardStyle === 4
                ? "text-[8px] md:text-[9px] text-zinc-400 text-center mt-2 leading-relaxed font-mono font-medium px-2"
                : "text-[8px] text-slate-400 text-center mt-1 leading-normal"
            }>
              {boardStyle === 1 || boardStyle === 4 ? (
                <>
                  Collected from taxes and UNO/Chance fines.
                  <span className="block text-orange-500 font-extrabold mt-1 filter drop-shadow-[0_0_4px_rgba(249,115,22,0.3)]">Landing on Party House wins !!</span>
                </>
              ) : (
                "Collected from taxes and UNO/Chance fines. Landing on Party House wins it!"
              )}
            </span>

            {/* Quick Button to inspect Remaining Properties / Bank Stock */}
            <button
              type="button"
              onClick={() => setShowRemainingModal(true)}
              className={`mt-2.5 px-3 py-1.5 rounded-xl border text-[10px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95 ${
                boardStyle === 1
                  ? "bg-cyan-950/80 hover:bg-cyan-900 border-cyan-400/50 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  : boardStyle === 4
                  ? "bg-zinc-900/90 hover:bg-zinc-800 border-orange-500/50 text-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.3)] font-mono"
                  : boardStyle === 2
                  ? "bg-amber-900/80 hover:bg-amber-900 border-amber-600/50 text-amber-200"
                  : boardStyle === 3
                  ? "bg-amber-100 hover:bg-amber-200/80 border-amber-300 text-amber-900 font-serif"
                  : "bg-slate-800/90 hover:bg-slate-800 border-slate-600 text-amber-400"
              }`}
            >
              <Landmark className="h-3.5 w-3.5 shrink-0" />
              <span>Bank Stock: {remainingSpacesCount} Remaining</span>
            </button>
          </div>

          {/* Bottom segment: Decorative icons, credentials, and Board Style switcher */}
          {boardStyle === 1 ? (
            <div className="flex items-center justify-between text-[#38bdf8]/60 font-mono text-[8px] md:text-[9px] select-none border-t border-cyan-500/20 pt-2 gap-2 z-10 w-full">
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 font-black tracking-widest text-[8px] uppercase">RULESET v2.4</span>
                <span className="text-cyan-600/40 font-bold hidden xs:inline">|||ı|ı|||</span>
              </div>
              
              {/* Style & View switchers styled in matching cyber style */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Board Style Switcher */}
                <div className="flex bg-slate-950 p-0.5 rounded border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.05)]">
                  <button
                    type="button"
                    onClick={() => {
                      setBoardStyle?.(0);
                      localStorage.setItem("boardStyle", "0");
                    }}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold transition-all ${
                      boardStyle === 0
                        ? "bg-cyan-500 text-slate-950 font-black"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    S0
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBoardStyle?.(1);
                      localStorage.setItem("boardStyle", "1");
                    }}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold transition-all ${
                      boardStyle === 1
                        ? "bg-cyan-500 text-slate-950 font-black shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    S1
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBoardStyle?.(2);
                      localStorage.setItem("boardStyle", "2");
                    }}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold transition-all ${
                      boardStyle === 2
                        ? "bg-emerald-500 text-slate-950 font-black"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    S2
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBoardStyle?.(3);
                      localStorage.setItem("boardStyle", "3");
                    }}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold transition-all ${
                      boardStyle === 3
                        ? "bg-amber-500 text-slate-950 font-black"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    S3
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBoardStyle?.(4);
                      localStorage.setItem("boardStyle", "4");
                    }}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold transition-all ${
                      boardStyle === 4
                        ? "bg-orange-500 text-black font-black shadow-[0_0_10px_rgba(249,115,22,0.4)]"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    S4
                  </button>
                </div>

                {/* Perspective View Switcher */}
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !is3DMode;
                    setIs3DMode?.(nextVal);
                    localStorage.setItem("board3DMode", String(nextVal));
                  }}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-extrabold transition-all border ${
                    is3DMode
                      ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                      : "bg-slate-950 hover:bg-slate-900 text-slate-400 border-slate-800"
                  }`}
                >
                  {is3DMode ? "✨ 3D Tilt" : "平面 2D"}
                </button>

                {/* Sound FX Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !isMuted;
                    setIsMuted(nextVal);
                    soundEffects.setMuted(nextVal);
                  }}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-extrabold transition-all border ${
                    !isMuted
                      ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                      : "bg-slate-950 hover:bg-slate-900 text-slate-500 border-slate-800"
                  }`}
                  title={isMuted ? "Unmute Sounds" : "Mute Sounds"}
                >
                  {isMuted ? (
                    <>
                      <VolumeX className="h-2.5 w-2.5 text-slate-500" />
                      <span>MUTED</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-2.5 w-2.5 text-cyan-400 animate-pulse" />
                      <span>SOUND ON</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-cyan-600/40 font-bold hidden xs:inline">|||ı|ı|||</span>
                <span className="text-cyan-400 font-black tracking-widest text-[8px] uppercase">🎲 MULTIPLAYER LOBBY</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-slate-500 font-mono text-[8px] md:text-[9px] select-none border-t border-slate-800/50 pt-2 gap-2 z-10 w-full">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">🎨 Style:</span>
                  <div className="flex bg-slate-950 p-0.5 rounded border border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setBoardStyle?.(0);
                        localStorage.setItem("boardStyle", "0");
                      }}
                      className={`px-1 rounded text-[8px] font-extrabold transition-all ${
                        boardStyle === 0
                          ? "bg-slate-700 text-white font-black"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Style 0
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBoardStyle?.(1);
                        localStorage.setItem("boardStyle", "1");
                      }}
                      className={`px-1 rounded text-[8px] font-extrabold transition-all ${
                        boardStyle === 1
                          ? "bg-slate-700 text-white font-black shadow"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Style 1
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBoardStyle?.(2);
                        localStorage.setItem("boardStyle", "2");
                      }}
                      className={`px-1 rounded text-[8px] font-extrabold transition-all ${
                        boardStyle === 2
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black shadow border border-emerald-400/40"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Style 2
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBoardStyle?.(3);
                        localStorage.setItem("boardStyle", "3");
                      }}
                      className={`px-1 rounded text-[8px] font-extrabold transition-all ${
                        boardStyle === 3
                          ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow border border-amber-400/40"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Style 3
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBoardStyle?.(4);
                        localStorage.setItem("boardStyle", "4");
                      }}
                      className={`px-1 rounded text-[8px] font-extrabold transition-all ${
                        boardStyle === 4
                          ? "bg-orange-500 text-black font-black shadow border border-orange-400/40"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Style 4
                    </button>
                  </div>
                </div>

                {/* 3D Perspective Toggle */}
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">📐 View:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !is3DMode;
                      setIs3DMode?.(nextVal);
                      localStorage.setItem("board3DMode", String(nextVal));
                    }}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-extrabold transition-all border ${
                      is3DMode
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400 shadow-md"
                        : "bg-slate-950 hover:bg-slate-900 text-slate-400 border-slate-800"
                    }`}
                  >
                    {is3DMode ? "✨ 3D Tilt On" : "平面 2D Flat"}
                  </button>
                </div>

                {/* Sound FX Toggle */}
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">🔊 Sound:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !isMuted;
                      setIsMuted(nextVal);
                      soundEffects.setMuted(nextVal);
                    }}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-extrabold transition-all border ${
                      !isMuted
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400 shadow-md"
                        : "bg-slate-950 hover:bg-slate-900 text-slate-400 border-slate-800"
                    }`}
                    title={isMuted ? "Unmute Sounds" : "Mute Sounds"}
                  >
                    {isMuted ? (
                      <>
                        <VolumeX className="h-2.5 w-2.5 text-slate-500" />
                        <span>Muted</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-2.5 w-2.5 text-white animate-pulse" />
                        <span>On</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 text-slate-500 text-[8px]">
                <span>RULESET v2.4</span>
                <span className="flex items-center gap-1">
                  🎲 MULTIPLAYER LOBBY
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Property Deed Tooltip Hover Overlay */}
      <AnimatePresence>
        {hoveredSpace && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 6 }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            className="absolute z-50 pointer-events-none shadow-2xl rounded-xl border-2 border-slate-900 bg-white text-slate-800 w-60 overflow-hidden"
            style={{
              left: `${clampedPosX}px`,
              top: `${clampedPosY}px`
            }}
          >
            {renderDeedCard(hoveredSpace)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Remaining Properties Modal Overlay */}
      {showRemainingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in text-left">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-2xl w-full p-5 max-h-[90vh] overflow-hidden flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                  Remaining Board Properties ({remainingSpacesCount})
                </h3>
              </div>
              <button
                onClick={() => setShowRemainingModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              <RemainingProperties
                properties={properties}
                onSelectSpace={(space) => {
                  onSpaceClick?.(space);
                  setShowRemainingModal(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
export default Board;
