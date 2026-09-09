import React, { useState } from "react";
import { Player } from "../types";
import { User, KeyRound, Play, Users, Globe, Smartphone, Crown, Trash2, RotateCw, BookOpen } from "lucide-react";
import { motion } from "motion/react";

interface LobbyProps {
  onJoinOnline: (roomCode: string, playerName: string, avatar: string, color: string) => void;
  onCreateOnline: (playerName: string, avatar: string, color: string, timerEnabled: boolean, startingCash: number) => void;
  onStartLocalGame: (playersList: { name: string; avatar: string; color: string }[], timerEnabled: boolean, startingCash: number) => void;
  onRejoinOnline?: (roomCode: string, playerId: string) => void;
  onOpenRuleBook?: () => void;
  isJoining: boolean;
  boardStyle?: number;
}

const AVATARS = ["🚗", "✈️", "🛥️", "🚂", "🚲", "🛸", "🚀", "🚜"];
const COLORS = [
  "bg-rose-500 hover:ring-rose-400",
  "bg-emerald-500 hover:ring-emerald-400",
  "bg-sky-500 hover:ring-sky-400",
  "bg-amber-500 hover:ring-amber-400",
  "bg-violet-500 hover:ring-violet-400",
  "bg-fuchsia-500 hover:ring-fuchsia-400",
];

export const Lobby: React.FC<LobbyProps> = ({
  onJoinOnline,
  onCreateOnline,
  onStartLocalGame,
  onRejoinOnline,
  onOpenRuleBook,
  isJoining,
  boardStyle = 1
}) => {
  const [mode, setMode] = useState<"SELECT_MODE" | "ONLINE_CREATE" | "ONLINE_JOIN" | "LOCAL_SETUP">("SELECT_MODE");
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("🚗");
  const [selectedColor, setSelectedColor] = useState("bg-rose-500 hover:ring-rose-400");
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [startingCash, setStartingCash] = useState<number>(30000);

  // Check for cached session in localStorage
  const [cachedSession, setCachedSession] = useState<{ roomCode: string; selfPlayerId: string; playerName: string } | null>(() => {
    try {
      const sessionStr = localStorage.getItem("online_game_session");
      if (sessionStr) {
        return JSON.parse(sessionStr);
      }
    } catch {
      return null;
    }
    return null;
  });

  // Local Pass & Play State
  const [localPlayers, setLocalPlayers] = useState([
    { name: "Player 1", avatar: "🚗", color: "bg-rose-500 hover:ring-rose-400" },
    { name: "Player 2", avatar: "✈️", color: "bg-emerald-500 hover:ring-emerald-400" },
    { name: "Player 3", avatar: "🛥️", color: "bg-sky-500 hover:ring-sky-400" },
  ]);

  const handleCreateOnline = () => {
    if (!playerName.trim()) return;
    onCreateOnline(playerName, selectedAvatar, selectedColor, timerEnabled, startingCash);
  };

  const handleJoinOnline = () => {
    if (!playerName.trim() || !roomCode.trim()) return;
    onJoinOnline(roomCode.toUpperCase(), playerName, selectedAvatar, selectedColor);
  };

  const handleStartLocal = () => {
    onStartLocalGame(localPlayers, timerEnabled, startingCash);
  };

  const addLocalPlayer = () => {
    if (localPlayers.length >= 6) return;
    const nextIndex = localPlayers.length;
    const defaultAvatars = ["🚂", "🚲", "🛸", "🚀"];
    const defaultColors = [
      "bg-amber-500 hover:ring-amber-400",
      "bg-violet-500 hover:ring-violet-400",
      "bg-fuchsia-500 hover:ring-fuchsia-400",
    ];
    setLocalPlayers([
      ...localPlayers,
      {
        name: `Player ${nextIndex + 1}`,
        avatar: defaultAvatars[nextIndex - 3] || "🚗",
        color: defaultColors[nextIndex - 3] || "bg-rose-500 hover:ring-rose-400"
      }
    ]);
  };

  const removeLocalPlayer = (index: number) => {
    if (localPlayers.length <= 1) return; // Minimum 1 player
    setLocalPlayers(localPlayers.filter((_, i) => i !== index));
  };

  const updateLocalPlayer = (index: number, fields: Partial<typeof localPlayers[0]>) => {
    const updated = [...localPlayers];
    updated[index] = { ...updated[index], ...fields };
    setLocalPlayers(updated);
  };

  const getTheme = () => {
    // Irrespective of the Gameboard style, keep the Homepage theme as the Cyber Sleek Slate / Blue theme (Case 0)
    switch (0 as number) {
      case 0: // Cyber Sleek Slate (Dark Modernist)
        return {
          card: "w-full max-w-md mx-auto bg-slate-900/95 border border-slate-800 shadow-2xl rounded-3xl p-6 md:p-8 backdrop-blur-md transition-all duration-300 relative overflow-hidden",
          title: "text-3xl font-black text-white tracking-widest uppercase",
          desc: "text-xs text-indigo-400 mt-1 font-mono uppercase tracking-widest",
          label: "text-slate-400 font-bold text-[10px] tracking-wider",
          btnMode: "group flex flex-col items-center gap-3 rounded-2xl border border-slate-800 p-5 text-center transition hover:border-indigo-500 hover:bg-indigo-500/5 hover:shadow-lg cursor-pointer bg-slate-950/20",
          btnModeIcon: "flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-indigo-400 group-hover:bg-slate-800 transition-colors",
          modeTitle: "font-bold text-slate-100",
          modeDesc: "text-xs text-slate-400 mt-0.5",
          headerTitle: "text-lg font-bold text-white",
          backBtn: "text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer",
          input: "w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none placeholder-slate-600 transition-all",
          avatarUnselected: "border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900",
          avatarSelected: "border-indigo-500 bg-indigo-500/20 text-white scale-110 shadow-[0_0_15px_rgba(99,102,241,0.3)]",
          localPlayerCard: "flex gap-2 items-center p-3 rounded-xl border border-slate-800 bg-slate-950/40",
          localPlayerIdx: "text-xs font-bold text-slate-500 w-5 font-mono flex-shrink-0",
          localInput: "flex-1 min-w-0 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs font-medium text-slate-200 focus:border-indigo-500 focus:outline-none",
          localSelect: "rounded-lg border border-slate-800 bg-slate-950 px-1 py-1.5 text-sm text-slate-200 cursor-pointer flex-shrink-0 focus:border-indigo-500 focus:outline-none",
          addPlayerBtn: "flex-1 py-2 px-3 border border-dashed border-slate-800 hover:border-indigo-500 rounded-xl text-xs font-semibold text-slate-400 hover:text-indigo-400 transition-all cursor-pointer bg-slate-950/10",
          primaryBtn: "w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer",
          localPrimaryBtn: "flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer",
        };
      case 1: // Hyper-Neon Cyberpunk (Cyan & Gold)
        return {
          card: "w-full max-w-md mx-auto bg-[#0b132b]/95 border border-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.15)] rounded-3xl p-6 md:p-8 backdrop-blur-lg transition-all duration-300 relative overflow-hidden",
          title: "text-3xl font-black bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-500 bg-clip-text text-transparent tracking-[0.15em] uppercase filter drop-shadow-[0_0_12px_rgba(6,182,212,0.5)]",
          desc: "text-xs text-amber-400 mt-1 font-mono font-bold tracking-widest uppercase",
          label: "text-cyan-400 font-mono text-[9px] tracking-widest uppercase block mb-1.5",
          btnMode: "group flex flex-col items-center gap-3 rounded-2xl border border-cyan-500/10 p-5 text-center transition hover:border-cyan-400 hover:bg-cyan-500/5 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] cursor-pointer bg-[#050d24]/50",
          btnModeIcon: "flex h-12 w-12 items-center justify-center rounded-xl bg-[#050d24] text-cyan-400 group-hover:bg-[#0c244c] group-hover:text-cyan-300 border border-cyan-500/20 transition-all",
          modeTitle: "font-bold text-cyan-100 font-mono tracking-wide",
          modeDesc: "text-xs text-slate-400 mt-0.5",
          headerTitle: "text-lg font-bold text-cyan-400 font-mono uppercase tracking-widest",
          backBtn: "text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer font-mono tracking-widest",
          input: "w-full rounded-xl border border-cyan-500/20 bg-slate-950 p-3 text-sm text-cyan-100 font-mono focus:border-cyan-400 focus:outline-none placeholder-slate-700 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]",
          avatarUnselected: "border-cyan-500/10 bg-slate-950 text-slate-400 hover:bg-cyan-950/20 hover:text-cyan-300",
          avatarSelected: "border-cyan-400 bg-cyan-400/20 text-white scale-110 shadow-[0_0_15px_rgba(34,211,238,0.4)]",
          localPlayerCard: "flex gap-2 items-center p-3 rounded-xl border border-cyan-500/10 bg-[#050d24]/80",
          localPlayerIdx: "text-xs font-bold text-cyan-500/60 w-5 font-mono flex-shrink-0",
          localInput: "flex-1 min-w-0 rounded-lg border border-cyan-500/20 bg-slate-950 px-2 py-1.5 text-xs font-medium text-cyan-100 focus:border-cyan-400 focus:outline-none font-mono",
          localSelect: "rounded-lg border border-cyan-500/20 bg-slate-950 px-1 py-1.5 text-sm text-cyan-100 cursor-pointer flex-shrink-0 focus:border-cyan-400 focus:outline-none font-mono",
          addPlayerBtn: "flex-1 py-2 px-3 border border-dashed border-cyan-500/20 hover:border-cyan-400 rounded-xl text-xs font-semibold text-cyan-500/70 hover:text-cyan-400 transition-all cursor-pointer bg-cyan-950/10 font-mono",
          primaryBtn: "w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 disabled:opacity-50 text-slate-950 font-black rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer font-mono tracking-wider",
          localPrimaryBtn: "flex-1 py-2 px-4 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-slate-950 font-black rounded-xl text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center gap-1 cursor-pointer font-mono",
        };
      case 2: // Emerald Casino Royale (Green & Gold Vintage)
        return {
          card: "w-full max-w-md mx-auto bg-emerald-950/95 border border-amber-900/30 shadow-2xl rounded-3xl p-6 md:p-8 backdrop-blur-md transition-all duration-300 relative overflow-hidden",
          title: "text-3xl font-bold text-amber-100 tracking-wider uppercase font-serif",
          desc: "text-xs text-amber-400/80 mt-1 font-serif italic",
          label: "text-amber-200/80 font-serif text-[10px] tracking-wider block mb-1.5",
          btnMode: "group flex flex-col items-center gap-3 rounded-2xl border border-amber-900/20 p-5 text-center transition hover:border-amber-500 hover:bg-amber-500/5 hover:shadow-md cursor-pointer bg-emerald-900/10",
          btnModeIcon: "flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-900/50 text-amber-400 group-hover:bg-emerald-900 group-hover:text-amber-300 transition-colors border border-amber-900/20",
          modeTitle: "font-serif font-semibold text-amber-100",
          modeDesc: "text-xs text-emerald-100/70 mt-0.5 font-serif",
          headerTitle: "text-lg font-bold text-amber-100 font-serif tracking-wide",
          backBtn: "text-xs font-semibold text-amber-300/80 hover:text-amber-200 transition-colors cursor-pointer font-serif",
          input: "w-full rounded-xl border border-amber-900/30 bg-stone-950 p-3 text-sm text-amber-100 focus:border-amber-500 focus:outline-none placeholder-amber-900/30 font-serif",
          avatarUnselected: "border-amber-900/20 bg-stone-950/60 text-amber-200/60 hover:bg-emerald-900/30 hover:text-amber-200",
          avatarSelected: "border-amber-500 bg-amber-500/20 text-amber-200 scale-110 shadow-lg",
          localPlayerCard: "flex gap-2 items-center p-3 rounded-xl border border-amber-900/20 bg-emerald-900/20",
          localPlayerIdx: "text-xs font-bold text-amber-500/60 w-5 font-serif flex-shrink-0",
          localInput: "flex-1 min-w-0 rounded-lg border border-amber-900/20 bg-stone-950 px-2 py-1.5 text-xs font-medium text-amber-100 focus:border-amber-500 focus:outline-none font-serif",
          localSelect: "rounded-lg border border-amber-900/20 bg-stone-950 px-1 py-1.5 text-sm text-amber-100 cursor-pointer flex-shrink-0 focus:border-amber-500 focus:outline-none font-serif",
          addPlayerBtn: "flex-1 py-2 px-3 border border-dashed border-amber-900/20 hover:border-amber-500 rounded-xl text-xs font-semibold text-amber-200/60 hover:text-amber-300 transition-all cursor-pointer bg-emerald-900/10 font-serif",
          primaryBtn: "w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer font-serif",
          localPrimaryBtn: "flex-1 py-2 px-4 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-bold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer font-serif",
        };
      case 3: // Classic Mahogany Boardroom (Warm Timber)
        return {
          card: "w-full max-w-md mx-auto bg-white border border-stone-200/80 shadow-xl rounded-3xl p-6 md:p-8 transition-all duration-300 relative overflow-hidden",
          title: "text-3xl font-extrabold text-stone-800 tracking-tight uppercase",
          desc: "text-sm text-stone-500 mt-1",
          label: "text-stone-500 font-semibold text-xs mb-1.5 block",
          btnMode: "group flex flex-col items-center gap-3 rounded-2xl border border-stone-200 p-5 text-center transition hover:border-amber-400 hover:bg-amber-500/5 hover:shadow-md cursor-pointer",
          btnModeIcon: "flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-500 group-hover:bg-amber-100 transition-all",
          modeTitle: "font-semibold text-stone-800",
          modeDesc: "text-xs text-stone-500 mt-0.5",
          headerTitle: "text-lg font-bold text-stone-800",
          backBtn: "text-xs font-medium text-stone-400 hover:text-stone-600 transition-colors cursor-pointer",
          input: "w-full rounded-xl border border-stone-200 p-3 text-sm focus:border-amber-400 focus:outline-none text-stone-800 placeholder-stone-400 transition-all",
          avatarUnselected: "border-stone-200 hover:bg-stone-50 text-stone-600 bg-white",
          avatarSelected: "border-amber-500 bg-amber-50 text-stone-800 scale-110 shadow-xs",
          localPlayerCard: "flex gap-2 items-center p-3 rounded-xl border border-stone-150 bg-stone-50/50",
          localPlayerIdx: "text-xs font-bold text-stone-400 w-5 font-mono flex-shrink-0",
          localInput: "flex-1 min-w-0 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs font-medium focus:border-emerald-400 focus:outline-none text-stone-800",
          localSelect: "rounded-lg border border-stone-200 bg-white px-1 py-1.5 text-sm text-stone-800 cursor-pointer flex-shrink-0 focus:border-emerald-400 focus:outline-none",
          addPlayerBtn: "flex-1 py-2 px-3 border border-dashed border-stone-300 hover:border-emerald-500 rounded-xl text-xs font-semibold text-stone-500 hover:text-emerald-600 transition-all cursor-pointer bg-white",
          primaryBtn: "w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer",
          localPrimaryBtn: "flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer",
        };
      case 4: // Retro Cyber Orange & Black (Black, White, Neon Orange)
      default:
        return {
          card: "w-full max-w-md mx-auto bg-black border-2 border-orange-500 shadow-[0_0_35px_rgba(249,115,22,0.4)] rounded-3xl p-6 md:p-8 backdrop-blur-md transition-all duration-300 relative overflow-hidden",
          title: "text-3xl font-black text-white tracking-[0.2em] uppercase filter drop-shadow-[0_0_12px_rgba(249,115,22,0.75)] font-mono",
          desc: "text-xs text-orange-500 mt-1 font-mono uppercase tracking-[0.2em] font-bold",
          label: "text-orange-500 font-mono text-[10px] tracking-widest uppercase block mb-1.5",
          btnMode: "group flex flex-col items-center gap-3 rounded-2xl border-2 border-zinc-800 p-5 text-center transition hover:border-orange-500 hover:bg-orange-500/5 hover:shadow-[0_0_20px_rgba(249,115,22,0.25)] cursor-pointer bg-black",
          btnModeIcon: "flex h-12 w-12 items-center justify-center rounded-xl bg-black text-white group-hover:text-orange-500 border border-zinc-800 group-hover:border-orange-500 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]",
          modeTitle: "font-bold text-white font-mono tracking-wide group-hover:text-orange-500 transition-all",
          modeDesc: "text-xs text-zinc-400 mt-0.5 font-mono",
          headerTitle: "text-lg font-bold text-white font-mono uppercase tracking-widest",
          backBtn: "text-xs font-semibold text-zinc-400 hover:text-orange-500 transition-colors cursor-pointer font-mono tracking-widest",
          input: "w-full rounded-xl border-2 border-zinc-800 bg-black p-3 text-sm text-white font-mono focus:border-orange-500 focus:outline-none placeholder-zinc-700 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]",
          avatarUnselected: "border-zinc-800 bg-black text-zinc-400 hover:border-orange-500/50 hover:text-white",
          avatarSelected: "border-orange-500 bg-orange-500/25 text-white scale-110 shadow-[0_0_15px_rgba(249,115,22,0.4)]",
          localPlayerCard: "flex gap-2 items-center p-3 rounded-xl border-2 border-zinc-800 bg-black",
          localPlayerIdx: "text-xs font-bold text-orange-500/70 w-5 font-mono flex-shrink-0",
          localInput: "flex-1 min-w-0 rounded-lg border-2 border-zinc-800 bg-black px-2 py-1.5 text-xs font-medium text-white focus:border-orange-500 focus:outline-none font-mono",
          localSelect: "rounded-lg border-2 border-zinc-800 bg-black px-1 py-1.5 text-sm text-white cursor-pointer flex-shrink-0 focus:border-orange-500 focus:outline-none font-mono",
          addPlayerBtn: "flex-1 py-2 px-3 border-2 border-dashed border-zinc-800 hover:border-orange-500 rounded-xl text-xs font-semibold text-orange-500 hover:text-white transition-all cursor-pointer bg-black font-mono",
          primaryBtn: "w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-black rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:shadow-[0_0_25px_rgba(249,115,22,0.6)] transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer font-mono tracking-widest",
          localPrimaryBtn: "flex-1 py-2 px-4 bg-orange-500 hover:bg-orange-600 text-black font-black rounded-xl text-xs shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-all flex items-center justify-center gap-1 cursor-pointer font-mono",
        };
    }
  };

  const theme = getTheme();

  return (
    <div className={theme.card}>
      {mode === "SELECT_MODE" && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className={theme.title}>
              Business
            </h1>
            <p className={theme.desc}>
              International Edition Board Game
            </p>
            {onOpenRuleBook && (
              <button
                onClick={onOpenRuleBook}
                className="mt-2 inline-flex items-center gap-2 py-2 px-4 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-2xl text-xs font-mono font-black uppercase tracking-wider transition cursor-pointer shadow-sm"
              >
                <BookOpen className="h-4 w-4 text-amber-400" /> View Official Rule Book & Card Decks
              </button>
            )}
          </div>

          {cachedSession && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-left space-y-3 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 transform translate-x-3 -translate-y-3 text-indigo-500/10 font-bold text-6xl select-none">
                ⚡
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-extrabold text-indigo-400 tracking-widest font-mono block">
                  ⚡ Active Game Detected
                </span>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  You have a saved game session as <span className="text-white font-bold">{cachedSession.playerName}</span> in Room <span className="text-white font-black font-mono">{cachedSession.roomCode}</span>.
                </p>
              </div>
              <div className="flex gap-2.5 pt-1">
                <button
                  onClick={() => {
                    if (onRejoinOnline) {
                      onRejoinOnline(cachedSession.roomCode, cachedSession.selfPlayerId);
                    }
                  }}
                  id="btn-rejoin-active"
                  className="flex-1 py-2 px-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                >
                  <RotateCw className="h-3 w-3 animate-spin" style={{ animationDuration: "3s" }} /> Rejoin Game
                </button>
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to dismiss this session? You won't be able to rejoin automatically.")) {
                      try {
                        localStorage.removeItem("online_game_session");
                      } catch {}
                      setCachedSession(null);
                    }
                  }}
                  id="btn-dismiss-rejoin"
                  className="py-2 px-3 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => setMode("ONLINE_CREATE")}
              id="btn-mode-online-create"
              className={theme.btnMode}
            >
              <div className={theme.btnModeIcon}>
                <Globe className="h-6 w-6" />
              </div>
              <div>
                <h3 className={theme.modeTitle}>Create Online Lobby</h3>
                <p className={theme.modeDesc}>Host a game and share a code with your friends</p>
              </div>
            </button>

            <button
              onClick={() => setMode("ONLINE_JOIN")}
              id="btn-mode-online-join"
              className={theme.btnMode}
            >
              <div className={theme.btnModeIcon}>
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className={theme.modeTitle}>Join Online Game</h3>
                <p className={theme.modeDesc}>Enter a room code to join your friends' lobby</p>
              </div>
            </button>

            <button
              onClick={() => setMode("LOCAL_SETUP")}
              id="btn-mode-local"
              className={theme.btnMode}
            >
              <div className={theme.btnModeIcon}>
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <h3 className={theme.modeTitle}>Pass & Play (Local)</h3>
                <p className={theme.modeDesc}>Play locally on a single device screen</p>
              </div>
            </button>
          </div>

          {/* Funny Disclaimer */}
          <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 text-amber-500/10 font-bold text-4xl select-none">
              😭
            </div>
            <p className="text-[10px] uppercase font-extrabold text-amber-400 tracking-widest font-mono">
              ⚠️ Official No-Crying Agreement ⚠️
            </p>
            <p className="text-xs text-slate-300 mt-1.5 font-medium leading-relaxed">
              By launching this game, you legally swear and agree that <strong className="text-amber-300 font-bold">no tears, table-flipping, or relationship breakups</strong> will be tolerated upon bankruptcy. Losing properties to a bad roll is part of life—please keep the crying to yourself! 😭🚫
            </p>
          </div>
        </div>
      )}

      {(mode === "ONLINE_CREATE" || mode === "ONLINE_JOIN") && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className={theme.headerTitle}>
              {mode === "ONLINE_CREATE" ? "Host Game" : "Join Game"}
            </h2>
            <button
              onClick={() => setMode("SELECT_MODE")}
              className={theme.backBtn}
            >
              Back
            </button>
          </div>

          <div className="space-y-4">
            {/* Player Name */}
            <div>
              <label className={theme.label}>
                {mode === "ONLINE_CREATE" ? (
                  <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> YOUR NAME</span>
                ) : (
                  <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> YOUR NAME</span>
                )}
              </label>
              <input
                type="text"
                placeholder="Enter your name..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className={theme.input}
                maxLength={12}
              />
            </div>

            {/* Room Code for Join */}
            {mode === "ONLINE_JOIN" && (
              <div>
                <label className={theme.label}>
                  <span className="flex items-center gap-1"><KeyRound className="h-3.5 w-3.5" /> ROOM CODE</span>
                </label>
                <input
                  type="text"
                  placeholder="6-LETTER CODE (e.g. BZNSS1)"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className={theme.input}
                  maxLength={6}
                />
              </div>
            )}

            {/* Avatar Selector */}
            <div>
              <label className={theme.label}>
                CHOOSE CHIP TOKENS
              </label>
              <div className="flex flex-wrap gap-2.5">
                {AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setSelectedAvatar(emoji)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition border cursor-pointer ${
                      selectedAvatar === emoji
                        ? theme.avatarSelected
                        : theme.avatarUnselected
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selector */}
            <div>
              <label className={theme.label}>
                CHOOSE CHIP COLOR
              </label>
              <div className="flex gap-3">
                {COLORS.map((bgClass) => (
                  <button
                    key={bgClass}
                    onClick={() => setSelectedColor(bgClass)}
                    className={`h-7 w-7 rounded-full cursor-pointer transition ring-offset-2 ${
                      bgClass.split(" ")[0]
                    } ${selectedColor === bgClass ? "ring-2 ring-slate-400 scale-110" : ""}`}
                  />
                ))}
              </div>
            </div>

            {/* Turn Timer Option (Online Create only) */}
            {mode === "ONLINE_CREATE" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-2xl select-none">
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                      ⏱️ Turn Timer (60s)
                    </span>
                    <span className="text-[10px] text-indigo-400 font-medium">
                      Automatically auto-passes turn on timeout
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTimerEnabled(!timerEnabled)}
                    className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer flex items-center ${
                      timerEnabled ? "bg-indigo-600" : "bg-slate-800"
                    }`}
                    aria-label="Toggle Turn Timer"
                  >
                    <div
                      className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-200 ${
                        timerEnabled ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Starting Money Option */}
                <div className="flex flex-col gap-2 p-3.5 bg-slate-950 border border-slate-800 rounded-2xl select-none text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                        💵 Starting Money
                      </span>
                      <span className="text-[10px] text-indigo-400 font-medium">
                        Starting cash balance for all players
                      </span>
                    </div>
                    <span className="text-base font-extrabold text-emerald-400 font-mono">
                      ${startingCash.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[15000, 20000, 30000, 40000, 50000].map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setStartingCash(amount)}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold font-mono transition border cursor-pointer ${
                          startingCash === amount
                            ? "bg-indigo-600/25 border-indigo-500 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                        }`}
                      >
                        ${(amount / 1000)}k
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setStartingCash(Math.max(5000, startingCash - 5000))}
                      disabled={startingCash <= 5000}
                      className="flex-1 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed font-extrabold text-xs cursor-pointer transition"
                    >
                      - $5k
                    </button>
                    <button
                      type="button"
                      onClick={() => setStartingCash(Math.min(100000, startingCash + 5000))}
                      disabled={startingCash >= 100000}
                      className="flex-1 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed font-extrabold text-xs cursor-pointer transition"
                    >
                      + $5k
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Launch button */}
            <button
              onClick={mode === "ONLINE_CREATE" ? handleCreateOnline : handleJoinOnline}
              disabled={isJoining || !playerName.trim() || (mode === "ONLINE_JOIN" && !roomCode.trim())}
              className={theme.primaryBtn}
            >
              <Play className="h-4 w-4 fill-current text-slate-900" />
              {isJoining ? "Connecting..." : mode === "ONLINE_CREATE" ? "Launch Lobby" : "Join Lobby"}
            </button>
          </div>
        </div>
      )}

      {mode === "LOCAL_SETUP" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className={theme.headerTitle}>
              Pass & Play Setup
            </h2>
            <button
              onClick={() => setMode("SELECT_MODE")}
              className={theme.backBtn}
            >
              Back
            </button>
          </div>

          <div className="space-y-3.5 max-h-[300px] overflow-y-auto overflow-x-hidden pr-1">
            {localPlayers.map((player, index) => (
              <div key={index} className={theme.localPlayerCard}>
                <span className={theme.localPlayerIdx}>
                  #{index + 1}
                </span>

                {/* Name */}
                <input
                  type="text"
                  value={player.name}
                  onChange={(e) => updateLocalPlayer(index, { name: e.target.value })}
                  className={theme.localInput}
                  maxLength={12}
                />

                {/* Avatar select */}
                <select
                  value={player.avatar}
                  onChange={(e) => updateLocalPlayer(index, { avatar: e.target.value })}
                  className={theme.localSelect}
                >
                  {AVATARS.map((av) => (
                    <option key={av} value={av}>
                      {av}
                    </option>
                  ))}
                </select>

                {/* Color */}
                <div className="flex gap-0.5 flex-shrink-0">
                  {COLORS.map((bgClass) => (
                    <button
                      key={bgClass}
                      onClick={() => updateLocalPlayer(index, { color: bgClass })}
                      className={`h-3.5 w-3.5 rounded-full ring-offset-1 transition cursor-pointer ${
                        bgClass.split(" ")[0]
                      } ${player.color === bgClass ? "ring-2 ring-slate-400 scale-105" : ""}`}
                    />
                  ))}
                </div>

                {/* Delete button */}
                <div className="flex-shrink-0">
                  {localPlayers.length > 1 ? (
                    <button
                      onClick={() => removeLocalPlayer(index)}
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition cursor-pointer flex items-center justify-center"
                      title="Remove Player"
                      aria-label="Remove Player"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      disabled
                      className="text-slate-200 p-1.5 cursor-not-allowed flex items-center justify-center"
                      title="Minimum 1 player required"
                      aria-label="Minimum 1 player required"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Local Turn Timer Option */}
          <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl select-none">
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                ⏱️ Turn Timer (60s)
              </span>
              <span className="text-[10px] text-indigo-400 font-medium">
                Automatically auto-passes turn on timeout
              </span>
            </div>
            <button
              type="button"
              onClick={() => setTimerEnabled(!timerEnabled)}
              className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer flex items-center ${
                timerEnabled ? "bg-indigo-600" : "bg-slate-800"
              }`}
              aria-label="Toggle Turn Timer"
            >
              <div
                className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-200 ${
                  timerEnabled ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Starting Money Option */}
          <div className="flex flex-col gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl select-none text-left">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                  💵 Starting Money
                </span>
                <span className="text-[10px] text-indigo-400 font-medium">
                  Starting cash balance for all players
                </span>
              </div>
              <span className="text-sm font-extrabold text-emerald-400 font-mono">
                ${startingCash.toLocaleString()}
              </span>
            </div>
            <div className="flex gap-1.5 mt-1">
              {[15000, 20000, 30000, 40000, 50000].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setStartingCash(amount)}
                  className={`flex-1 py-1 px-1.5 rounded-lg text-[9px] font-bold font-mono transition border cursor-pointer ${
                    startingCash === amount
                      ? "bg-indigo-600/25 border-indigo-500 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                  }`}
                >
                  ${(amount / 1000)}k
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <button
                type="button"
                onClick={() => setStartingCash(Math.max(5000, startingCash - 5000))}
                disabled={startingCash <= 5000}
                className="flex-1 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed font-extrabold text-[10px] cursor-pointer transition"
              >
                - $5k
              </button>
              <button
                type="button"
                onClick={() => setStartingCash(Math.min(100000, startingCash + 5000))}
                disabled={startingCash >= 100000}
                className="flex-1 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed font-extrabold text-[10px] cursor-pointer transition"
              >
                + $5k
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {localPlayers.length < 6 && (
              <button
                onClick={addLocalPlayer}
                className={theme.addPlayerBtn}
              >
                + Add Player
              </button>
            )}

            <button
              onClick={handleStartLocal}
              className={theme.localPrimaryBtn}
            >
              <Play className="h-3.5 w-3.5 fill-current" /> Start Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default Lobby;
