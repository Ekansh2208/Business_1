import React, { useState, useEffect, useRef } from "react";
import { GameLog, Player } from "../types";
import { ListFilter, MessageSquareCode, User, Globe, Sparkles } from "lucide-react";

interface GameLogsProps {
  logs: GameLog[];
  selfPlayerId?: string;
  players?: Player[];
}

export const GameLogs: React.FC<GameLogsProps> = ({ logs, selfPlayerId, players = [] }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"ALL" | "MY">("ALL");

  // Determine current focus player for "My Feed"
  const selfPlayer = players.find((p) => p.id === selfPlayerId) || players[0];
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(selfPlayer?.id || "");

  // Keep selectedPlayerId in sync if selfPlayerId or players change
  useEffect(() => {
    if (selfPlayerId && players.some((p) => p.id === selfPlayerId)) {
      setSelectedPlayerId(selfPlayerId);
    } else if (players.length > 0 && !selectedPlayerId) {
      setSelectedPlayerId(players[0].id);
    }
  }, [selfPlayerId, players]);

  const targetPlayer = players.find((p) => p.id === selectedPlayerId) || selfPlayer;
  const targetPlayerName = targetPlayer?.name || "";

  // Helper to check if a log belongs to a player
  const isLogForPlayer = (log: GameLog, name: string) => {
    if (!name) return false;
    const lowerName = name.toLowerCase();
    const isLogByPlayer = !!log.player && log.player.toLowerCase() === lowerName;
    const isLogMentioningPlayer = log.message.toLowerCase().includes(lowerName);
    return isLogByPlayer || isLogMentioningPlayer;
  };

  // Calculate count for "My Feed" (based on selfPlayer)
  const myFeedCount = logs.filter((log) => isLogForPlayer(log, selfPlayer?.name || "")).length;

  // Filter logs based on activeTab
  const displayedLogs = logs.filter((log) => {
    if (activeTab === "ALL") return true;
    return isLogForPlayer(log, targetPlayerName);
  });

  // Auto-scroll to bottom when new displayed logs appear
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedLogs.length, activeTab]);

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden text-left font-sans select-none">
      {/* Header Tabs */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-2 pt-1.5 shrink-0 text-xs font-bold">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-t-xl transition cursor-pointer flex items-center gap-1.5 border-t border-x ${
              activeTab === "ALL"
                ? "bg-white border-slate-200 text-slate-800 shadow-2xs font-extrabold"
                : "border-transparent text-slate-400 hover:text-slate-600 bg-transparent"
            }`}
          >
            <Globe className={`h-3.5 w-3.5 ${activeTab === "ALL" ? "text-amber-500" : "text-slate-400"}`} />
            <span>Game Feed</span>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === "ALL" ? "bg-amber-100 text-amber-800 font-extrabold" : "bg-slate-200 text-slate-600"
              }`}
            >
              {logs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("MY")}
            className={`px-3 py-1.5 rounded-t-xl transition cursor-pointer flex items-center gap-1.5 border-t border-x ${
              activeTab === "MY"
                ? "bg-white border-slate-200 text-slate-800 shadow-2xs font-extrabold"
                : "border-transparent text-slate-400 hover:text-slate-600 bg-transparent"
            }`}
          >
            <User className={`h-3.5 w-3.5 ${activeTab === "MY" ? "text-amber-500" : "text-slate-400"}`} />
            <span>My Feed</span>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === "MY" ? "bg-amber-500 text-white font-black" : "bg-slate-200 text-slate-600"
              }`}
            >
              {myFeedCount}
            </span>
          </button>
        </div>

        {/* Player Switcher Pill when in "My Feed" and multiple players exist */}
        {activeTab === "MY" && players.length > 1 && (
          <div className="flex items-center gap-1 pr-2 pb-1">
            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">Feed for:</span>
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-0.5 px-2 rounded-lg border border-slate-200 focus:outline-none cursor-pointer"
            >
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.avatar} {p.name} {p.id === selfPlayerId ? "(You)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Log Feed List */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[220px] md:max-h-none font-mono text-2xs"
      >
        {displayedLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 py-6 space-y-1">
            <ListFilter className="h-6 w-6 opacity-40 stroke-1 text-slate-400" />
            <p className="text-2xs italic font-sans text-slate-500">
              {activeTab === "MY"
                ? `No feed events logged for ${targetPlayerName || "you"} yet.`
                : "No game activity logged yet."}
            </p>
          </div>
        ) : (
          displayedLogs.map((log) => {
            const isMyTargetLog = targetPlayerName && isLogForPlayer(log, targetPlayerName);

            return (
              <div
                key={log.id}
                className={`text-2xs leading-relaxed border-l-2 pl-2 py-1 rounded-r-lg transition ${
                  isMyTargetLog && activeTab === "MY"
                    ? "border-amber-500 bg-amber-50/50 text-slate-900"
                    : "border-slate-200 hover:border-amber-400 text-slate-700 hover:bg-slate-50/60"
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <span className="flex-1 break-words">
                    {log.player && (
                      <strong
                        className={`font-extrabold mr-1 ${
                          log.player.toLowerCase() === targetPlayerName.toLowerCase()
                            ? "text-amber-700"
                            : "text-slate-900"
                        }`}
                      >
                        {log.player}:
                      </strong>
                    )}
                    {log.message}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono whitespace-nowrap shrink-0 mt-0.5">
                    {new Date(log.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit"
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default GameLogs;

