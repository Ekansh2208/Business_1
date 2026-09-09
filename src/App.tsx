import React, { useState, useEffect, useRef } from "react";
import { Player, BoardSpace, PropertyState, GameState, GameLog, SpaceType, Card, GameAction, TurnOrderData } from "./types";
import { BOARD_SPACES, CHANCE_CARDS, UNO_CARDS, CardDef, UTILITY_PAIRS } from "./constants";
import { db } from "./firebase";
import { doc, setDoc, onSnapshot, getDoc, updateDoc } from "firebase/firestore";
import Board from "./components/Board";
import PlayerCard from "./components/PlayerCard";
import GameControls from "./components/GameControls";
import GameLogs from "./components/GameLogs";
import Lobby from "./components/Lobby";
import Modals from "./components/Modals";
import SandboxPanel from "./components/SandboxPanel";
import CardEditorModal from "./components/CardEditorModal";
import RuleBookModal from "./components/RuleBookModal";
import DetermineTurnOrderModal from "./components/DetermineTurnOrderModal";
import { createInitialTurnOrderData } from "./utils/turnOrder";
import { HelpCircle, AlertCircle, RefreshCw, Trophy, Copy, ArrowLeft, Landmark, Check, Crown, Play, Smartphone, RotateCw, Sparkles, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { soundEffects } from "./soundEffects";

// Generate a random room code (6 characters)
const generateRoomCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper to process cash deficit using Credit Card automatically
const processPayment = (player: Player, amount: number) => {
  // Autopay feature: automatically enable when player money is less than 3000
  if (player.cash < 3000) {
    player.payLaterEnabled = true;
  }
  if (player.payLaterEnabled && player.cash < 5000) {
    player.payLaterBalance = (player.payLaterBalance || 0) + amount;
    return 0; // successfully paid via Pay Later / Autopay
  }
  if (player.cash >= amount) {
    player.cash -= amount;
    // If cash drops below 3000 after this payment, automatically enable Autopay
    if (player.cash < 3000) {
      player.payLaterEnabled = true;
    }
    return 0; // successfully paid from cash
  } else {
    const remainingDeficit = amount - player.cash;
    player.cash = 0;
    // Cash reached 0 (< 3000), automatically enable Autopay
    player.payLaterEnabled = true;
    const availableCredit = 10000 - (player.creditUsed || 0);
    if (availableCredit >= remainingDeficit) {
      player.creditUsed = (player.creditUsed || 0) + remainingDeficit;
      return 0; // successfully covered by credit card
    } else {
      player.creditUsed = 10000;
      return remainingDeficit - availableCredit; // unresolved cash deficit
    }
  }
};

export default function App() {
  const [gameMode, setGameMode] = useState<"LOBBY" | "PLAYING" | "FINISHED">("LOBBY");
  const [isOnline, setIsOnline] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [selfPlayerId, setSelfPlayerId] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [boardStyle, setBoardStyle] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem("boardStyle") || "4");
    } catch {
      return 4;
    }
  });
  const [is3DMode, setIs3DMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem("board3DMode") !== "false";
    } catch {
      return true;
    }
  });
  const [bypassPortrait, setBypassPortrait] = useState<boolean>(false);

  // Game Engine state (used for local mode, and synced with Firestore in online mode)
  const [players, setPlayers] = useState<Player[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [turnStartedAt, setTurnStartedAt] = useState<number>(0);
  const [properties, setProperties] = useState<Record<string, PropertyState>>({});
  const [partyHouseBank, setPartyHouseBank] = useState(0);
  const [diceRoll, setDiceRoll] = useState<[number, number] | null>(null);
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [currentAction, setCurrentAction] = useState<GameState["currentAction"]>(null);
  const [chanceDeck, setChanceDeck] = useState<string[]>([]);
  const [unoDeck, setUnoDeck] = useState<string[]>([]);
  const [chanceCards, setChanceCards] = useState<CardDef[]>(CHANCE_CARDS);
  const [unoCards, setUnoCards] = useState<CardDef[]>(UNO_CARDS);
  const [isCardEditorOpen, setIsCardEditorOpen] = useState<boolean>(false);
  const [isRuleBookOpen, setIsRuleBookOpen] = useState<boolean>(false);
  const [timerEnabled, setTimerEnabled] = useState<boolean>(true);
  const [startingCash, setStartingCash] = useState<number>(30000);
  const [turnOrderData, setTurnOrderData] = useState<TurnOrderData | null>(null);
  const [isMoving, setIsMoving] = useState<boolean>(false);

  // Local helper to shuffle decks
  const shuffleDeck = (cards: CardDef[]) => {
    return [...cards].map((c) => c.id).sort(() => Math.random() - 0.5);
  };

  // Firestore Sync Effect
  useEffect(() => {
    if (!isOnline || !roomCode) return;

    const docRef = doc(db, "games", roomCode);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as GameState;
        setPlayers(data.players || []);
        setTurnIndex(data.turnIndex || 0);
        setProperties(data.properties || {});
        setPartyHouseBank(data.partyHouseBank || 0);
        setDiceRoll(data.diceRoll || null);
        const logData = data.logs || [];
        setLogs(logData.length > 150 ? logData.slice(-150) : logData);
        setCurrentAction(data.currentAction || null);
        setGameMode(data.status);
        setTurnStartedAt(data.turnStartedAt || 0);
        setTimerEnabled(data.timerEnabled !== false);
        setStartingCash(data.startingCash !== undefined ? data.startingCash : 30000);
        if (data.turnOrderData !== undefined) setTurnOrderData(data.turnOrderData);
        if (data.chanceDeck) setChanceDeck(data.chanceDeck);
        if (data.unoDeck) setUnoDeck(data.unoDeck);
        if (data.chanceCards) setChanceCards(data.chanceCards);
        if (data.unoCards) setUnoCards(data.unoCards);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `games/${roomCode}`);
    });

    return () => unsubscribe();
  }, [isOnline, roomCode]);

  // Play win game sound effect when game transitions to FINISHED
  useEffect(() => {
    if (gameMode === "FINISHED") {
      soundEffects.playWinGame();
    }
  }, [gameMode]);

  // Sync selfPlayerId in local/Pass & Play mode with current turn player
  useEffect(() => {
    if (!isOnline && gameMode === "PLAYING" && players[turnIndex]) {
      const activeTurnPlayerId = players[turnIndex].id;
      if (selfPlayerId !== activeTurnPlayerId) {
        setSelfPlayerId(activeTurnPlayerId);
      }
    }
  }, [isOnline, gameMode, turnIndex, players, selfPlayerId]);

  // Play turn notification bell sound effect when turn changes during play
  const prevTurnRef = useRef<{ turnIndex: number; gameMode: string; activePlayerId?: string }>({
    turnIndex: -1,
    gameMode: "",
  });

  useEffect(() => {
    if (gameMode !== "PLAYING" || players.length === 0) return;

    const activePlayer = players[turnIndex];
    if (!activePlayer) return;

    const turnChanged =
      prevTurnRef.current.turnIndex !== turnIndex ||
      prevTurnRef.current.gameMode !== "PLAYING" ||
      prevTurnRef.current.activePlayerId !== activePlayer.id;

    if (turnChanged) {
      prevTurnRef.current = {
        turnIndex,
        gameMode,
        activePlayerId: activePlayer.id,
      };

      if (!isOnline || activePlayer.id === selfPlayerId) {
        soundEffects.playTurnBell();
      }
    }
  }, [turnIndex, gameMode, players, selfPlayerId, isOnline]);

  // Play jail sound effect when any player goes to jail (for ALL connected players)
  const prevJailedMapRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (gameMode !== "PLAYING" || players.length === 0) {
      const initialMap: Record<string, boolean> = {};
      players.forEach((p) => {
        initialMap[p.id] = p.inJail || false;
      });
      prevJailedMapRef.current = initialMap;
      return;
    }

    let newlyJailed = false;
    const newMap: Record<string, boolean> = {};

    players.forEach((p) => {
      const wasJailed = prevJailedMapRef.current[p.id] || false;
      const isJailed = p.inJail || false;
      if (!wasJailed && isJailed) {
        newlyJailed = true;
      }
      newMap[p.id] = isJailed;
    });

    prevJailedMapRef.current = newMap;

    if (newlyJailed) {
      soundEffects.playGoToJail();
    }
  }, [players, gameMode]);

  // Handle local state updates (updates Firestore if online, otherwise React state)
  const updateGameState = async (updates: Partial<GameState> & { forcePlayers?: Player[], forceProperties?: Record<string, PropertyState>, forceLogs?: GameLog[] }) => {
    const updatedPlayers = updates.forcePlayers || updates.players || players;
    const updatedProperties = updates.forceProperties || updates.properties || properties;
    const updatedLogs = updates.forceLogs || updates.logs || logs;
    const updatedTurnIndex = updates.turnIndex !== undefined ? updates.turnIndex : turnIndex;
    const updatedPartyHouseBank = updates.partyHouseBank !== undefined ? updates.partyHouseBank : partyHouseBank;
    const updatedDiceRoll = updates.diceRoll !== undefined ? updates.diceRoll : diceRoll;
    const updatedCurrentAction = updates.currentAction !== undefined ? updates.currentAction : currentAction;
    const updatedStatus = updates.status || gameMode;
    const updatedChanceDeck = updates.chanceDeck !== undefined ? updates.chanceDeck : chanceDeck;
    const updatedUnoDeck = updates.unoDeck !== undefined ? updates.unoDeck : unoDeck;

    const processedPlayers = updatedPlayers.map(p => {
      let player = { ...p };
      if (player.cash > 10000 && (player.payLaterBalance || 0) > 0) {
        const settleAmount = Math.min(player.cash, player.payLaterBalance || 0);
        player.cash -= settleAmount;
        player.payLaterBalance = (player.payLaterBalance || 0) - settleAmount;
      }
      // Autopay feature: automatically enable Autopay (Pay Later) when player money is less than 3000 during active game
      if (updatedStatus === "PLAYING" && player.cash < 3000 && !player.payLaterEnabled) {
        player.payLaterEnabled = true;
      }
      return player;
    });

    const anyForceSettle = processedPlayers.some((p, idx) => p.cash !== (updatedPlayers[idx]?.cash || 0));
    let finalLogs = anyForceSettle ? [...updatedLogs] : updatedLogs;
    if (anyForceSettle) {
      processedPlayers.forEach((p, idx) => {
        const originalCash = updatedPlayers[idx]?.cash || 0;
        if (p.cash !== originalCash) {
          const settleAmount = originalCash - p.cash;
          finalLogs.push({
            id: `force-settle-${Date.now()}-${Math.random()}`,
            player: p.name,
            message: `⚡ Force Settle! Cash went above $10,000, so ${p.name} force-settled $${settleAmount.toLocaleString()} of their Pay Later balance.`,
            timestamp: Date.now()
          });
        }
      });
    }

    // Check if Autopay was newly activated because cash < 3000
    if (updatedStatus === "PLAYING") {
      processedPlayers.forEach((p, idx) => {
        const original = updatedPlayers[idx];
        if (original && !original.payLaterEnabled && p.payLaterEnabled && p.cash < 3000) {
          finalLogs.push({
            id: `autopay-activated-${Date.now()}-${Math.random()}`,
            player: p.name,
            message: `⚡ Autopay Activated! ${p.name}'s cash dropped below $3,000 ($${p.cash.toLocaleString()}). Autopay has been automatically enabled to defer expenses.`,
            timestamp: Date.now()
          });
        }
      });
    }

    if (finalLogs.length > 150) {
      finalLogs = finalLogs.slice(-150);
    }

    let updatedTurnStartedAt = updates.turnStartedAt !== undefined ? updates.turnStartedAt : turnStartedAt;
    if ((updates.turnIndex !== undefined && updates.turnIndex !== turnIndex) || (updates.status === "PLAYING" && gameMode === "LOBBY")) {
      updatedTurnStartedAt = Date.now();
    }

    if (isOnline && roomCode) {
      const docRef = doc(db, "games", roomCode);
      try {
        await updateDoc(docRef, {
          players: processedPlayers,
          properties: updatedProperties,
          logs: finalLogs,
          turnIndex: updatedTurnIndex,
          partyHouseBank: updatedPartyHouseBank,
          diceRoll: updatedDiceRoll,
          currentAction: updatedCurrentAction,
          status: updatedStatus,
          turnStartedAt: updatedTurnStartedAt,
          chanceDeck: updatedChanceDeck,
          unoDeck: updatedUnoDeck,
          turnOrderData: updates.turnOrderData !== undefined ? updates.turnOrderData : turnOrderData
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `games/${roomCode}`);
      }
    } else {
      setPlayers(processedPlayers);
      if (updates.forceProperties || updates.properties) setProperties(updatedProperties);
      setLogs(finalLogs);
      if (updates.turnIndex !== undefined) setTurnIndex(updatedTurnIndex);
      if (updates.partyHouseBank !== undefined) setPartyHouseBank(updatedPartyHouseBank);
      if (updates.diceRoll !== undefined) setDiceRoll(updatedDiceRoll);
      if (updates.currentAction !== undefined) setCurrentAction(updatedCurrentAction);
      if (updates.status) setGameMode(updatedStatus);
      if (updates.turnOrderData !== undefined) setTurnOrderData(updates.turnOrderData);
      setTurnStartedAt(updatedTurnStartedAt);
      if (updates.chanceDeck !== undefined) setChanceDeck(updatedChanceDeck);
      if (updates.unoDeck !== undefined) setUnoDeck(updatedUnoDeck);

      // Sync selfPlayerId in local mode with current turn or pending voter
      if (processedPlayers.length > 0) {
        if (updatedCurrentAction && updatedCurrentAction.type === "GAME_OVER_VOTE" && updatedCurrentAction.votes) {
          const pendingVoter = processedPlayers.find((p) => updatedCurrentAction.votes[p.id] === undefined);
          if (pendingVoter) {
            setSelfPlayerId(pendingVoter.id);
          }
        } else if (processedPlayers[updatedTurnIndex]) {
          setSelfPlayerId(processedPlayers[updatedTurnIndex].id);
        }
      }
    }
  };

  // Log Message helper
  const addLog = (message: string, playerName?: string) => {
    const newLog: GameLog = {
      id: Math.random().toString(),
      player: playerName,
      message,
      timestamp: Date.now()
    };
    const updatedLogs = [...logs, newLog];
    return updatedLogs.length > 150 ? updatedLogs.slice(-150) : updatedLogs;
  };

  // Launch local game setup
  const handleStartLocalGame = (localPlayersList: { name: string; avatar: string; color: string }[], timerEnabledVal: boolean, startingCashVal: number) => {
    const initializedPlayers: Player[] = localPlayersList.map((p, index) => ({
      id: `local-player-${index}`,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      position: 0,
      cash: startingCashVal,
      creditUsed: 0,
      payLaterBalance: 0,
      payLaterEnabled: false,
      inJail: false,
      hasGetOutOfJailCard: false,
      isHost: index === 0,
      isOnline: true,
      passportDebt: 0
    }));

    setPlayers(initializedPlayers);
    setSelfPlayerId(initializedPlayers[0].id);
    setTurnIndex(0);
    setProperties({});
    setPartyHouseBank(0);
    setDiceRoll(null);
    setChanceDeck(shuffleDeck(CHANCE_CARDS));
    setUnoDeck(shuffleDeck(UNO_CARDS));
    setTimerEnabled(timerEnabledVal);
    setStartingCash(startingCashVal);

    const initialTurnOrder = createInitialTurnOrderData(initializedPlayers);
    setTurnOrderData(initialTurnOrder);
    
    const initialLogs: GameLog[] = [
      { id: "init", message: `🎲 Starting turn order determination for Pass & Play game (Starting Cash: $${startingCashVal.toLocaleString()})`, timestamp: Date.now() }
    ];
    setLogs(initialLogs);
    setGameMode("DETERMINING_TURN_ORDER");
    setIsOnline(false);
  };

  // Create Online Game Room
  const handleCreateOnlineGame = async (playerName: string, avatar: string, color: string, timerEnabledVal: boolean, startingCashVal: number) => {
    setIsJoining(true);
    const code = generateRoomCode();
    const hostId = "player-" + Math.random().toString(36).substring(2, 9);
    
    const host: Player = {
      id: hostId,
      name: playerName,
      avatar,
      color,
      position: 0,
      cash: startingCashVal,
      creditUsed: 0,
      payLaterBalance: 0,
      payLaterEnabled: false,
      inJail: false,
      hasGetOutOfJailCard: false,
      isHost: true,
      isOnline: true,
      passportDebt: 0
    };

    const initialGameState: GameState = {
      id: code,
      status: "LOBBY",
      roomCode: code,
      players: [host],
      turnIndex: 0,
      properties: {},
      partyHouseBank: 0,
      diceRoll: null,
      logs: [{ id: "init", message: `🏠 lobby created. Share room code [${code}] with your friends! (Starting Cash: $${startingCashVal.toLocaleString()})`, timestamp: Date.now() }],
      currentAction: null,
      chanceDeck: shuffleDeck(CHANCE_CARDS),
      unoDeck: shuffleDeck(UNO_CARDS),
      timerEnabled: timerEnabledVal,
      startingCash: startingCashVal
    };

    const docRef = doc(db, "games", code);
    try {
      await setDoc(docRef, initialGameState);
      setRoomCode(code);
      setSelfPlayerId(hostId);
      setTimerEnabled(timerEnabledVal);
      setStartingCash(startingCashVal);
      setIsOnline(true);

      try {
        localStorage.setItem("online_game_session", JSON.stringify({
          roomCode: code,
          selfPlayerId: hostId,
          playerName: playerName
        }));
      } catch (e) {
        console.error("Failed to write to localStorage", e);
      }
    } catch (error) {
      console.error("Error creating online game room:", error);
      alert("Failed to create online game room. Please check your internet connection or try again.");
    } finally {
      setIsJoining(false);
    }
  };

  // Join Online Game Room
  const handleJoinOnlineGame = async (code: string, playerName: string, avatar: string, color: string) => {
    setIsJoining(true);

    try {
      // Check if we have a cached session for this room code in localStorage
      let cachedSession: { roomCode: string; selfPlayerId: string; playerName?: string } | null = null;
      try {
        const sessionStr = localStorage.getItem("online_game_session");
        if (sessionStr) {
          const parsed = JSON.parse(sessionStr);
          if (parsed && parsed.roomCode === code) {
            cachedSession = parsed;
          }
        }
      } catch (e) {
        console.error("Failed to read localStorage session", e);
      }

      const docRef = doc(db, "games", code);
      let snapshot;
      try {
        snapshot = await getDoc(docRef);
      } catch (error) {
        console.error("Error fetching room:", error);
        alert("Failed to connect to the game server. Please check the room code or try again.");
        return;
      }

      if (!snapshot.exists()) {
        alert("Lobby not found! Please check the room code.");
        return;
      }

      const data = snapshot.data() as GameState;

      // If we have a cached session, let's verify the player is still in the game
      if (cachedSession) {
        const isPlayerStillInGame = data.players.some((p) => p.id === cachedSession.selfPlayerId);
        if (isPlayerStillInGame) {
          // Player is rejoining!
          setRoomCode(code);
          setSelfPlayerId(cachedSession.selfPlayerId);
          setIsOnline(true);
          try {
            localStorage.setItem("online_game_session", JSON.stringify({
              roomCode: code,
              selfPlayerId: cachedSession.selfPlayerId,
              playerName: cachedSession.playerName || playerName
            }));
          } catch (e) {
            console.error("Failed to save to localStorage", e);
          }
          return;
        }
      }

      if (data.status !== "LOBBY") {
        alert("This game has already started!");
        return;
      }

      if (data.players.length >= 6) {
        alert("This lobby is full!");
        return;
      }

      const playerId = "player-" + Math.random().toString(36).substring(2, 9);
      const startingCashVal = data.startingCash !== undefined ? data.startingCash : 30000;
      const newPlayer: Player = {
        id: playerId,
        name: playerName,
        avatar,
        color,
        position: 0,
        cash: startingCashVal,
        creditUsed: 0,
        payLaterBalance: 0,
        payLaterEnabled: false,
        inJail: false,
        hasGetOutOfJailCard: false,
        isHost: false,
        isOnline: true,
        passportDebt: 0
      };

      const updatedPlayers = [...data.players, newPlayer];
      const updatedLogs = [...data.logs, {
        id: Math.random().toString(),
        message: `👋 ${playerName} joined the lobby.`,
        timestamp: Date.now()
      }];

      await updateDoc(docRef, {
        players: updatedPlayers,
        logs: updatedLogs
      });

      setRoomCode(code);
      setSelfPlayerId(playerId);
      setIsOnline(true);

      try {
        localStorage.setItem("online_game_session", JSON.stringify({
          roomCode: code,
          selfPlayerId: playerId,
          playerName: playerName
        }));
      } catch (e) {
        console.error("Failed to save to localStorage", e);
      }
    } catch (error) {
      console.error("Error joining online game:", error);
      alert("An unexpected error occurred while joining the room.");
    } finally {
      setIsJoining(false);
    }
  };

  // Rejoin Online Game from saved session (button/lobby)
  const handleRejoinOnlineGame = async (code: string, playerId: string) => {
    setIsJoining(true);
    try {
      const docRef = doc(db, "games", code);
      let snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        alert("This game session is no longer active or the room has been closed.");
        try {
          localStorage.removeItem("online_game_session");
        } catch {}
        return;
      }

      const data = snapshot.data() as GameState;
      const isPlayerStillInGame = data.players.some((p) => p.id === playerId);
      if (!isPlayerStillInGame) {
        alert("You are no longer a participant in this game.");
        try {
          localStorage.removeItem("online_game_session");
        } catch {}
        return;
      }

      // Restore state
      setRoomCode(code);
      setSelfPlayerId(playerId);
      setIsOnline(true);
      setGameMode(data.status);
    } catch (error) {
      console.error("Error rejoining game:", error);
      alert("Failed to rejoin active game session.");
    } finally {
      setIsJoining(false);
    }
  };

  // Start Online Game (Host only)
  const handleStartOnlineGame = async () => {
    if (players.length < 2) {
      alert("You need at least 2 players to start!");
      return;
    }
    const initialTurnOrder = createInitialTurnOrderData(players);
    const updatedLogs = [...logs, {
      id: Math.random().toString(),
      message: "🚀 The host started the game! Determining initial turn order...",
      timestamp: Date.now()
    }];
    await updateGameState({
      status: "DETERMINING_TURN_ORDER",
      turnOrderData: initialTurnOrder,
      logs: updatedLogs,
      turnIndex: 0
    });
  };

  // Complete Turn Order Determination and launch main game
  const handleTurnOrderComplete = async (finalOrderedPlayers: Player[]) => {
    const logMsg: GameLog = {
      id: Math.random().toString(),
      message: `🎉 Turn Order Finalized: ${finalOrderedPlayers.map((p, i) => `#${i + 1} ${p.name}`).join(" ➔ ")}. ${finalOrderedPlayers[0].name} takes the first turn!`,
      timestamp: Date.now()
    };
    const updatedLogs = [...logs, logMsg];

    if (isOnline && roomCode) {
      await updateGameState({
        status: "PLAYING",
        players: finalOrderedPlayers,
        turnOrderData: null,
        logs: updatedLogs,
        turnIndex: 0,
        diceRoll: null,
        currentAction: null,
        turnStartedAt: Date.now()
      });
    } else {
      setPlayers(finalOrderedPlayers);
      setGameMode("PLAYING");
      setTurnOrderData(null);
      setLogs(updatedLogs);
      setTurnIndex(0);
      setDiceRoll(null);
      setCurrentAction(null);
      setTurnStartedAt(Date.now());
      if (finalOrderedPlayers.length > 0) {
        setSelfPlayerId(finalOrderedPlayers[0].id);
      }
    }
  };

  // Copy Room Code to Clipboard
  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Leave Game / Go Back
  const handleBackToLobby = () => {
    if (confirm("Are you sure you want to exit the current game?")) {
      setGameMode("LOBBY");
      setIsOnline(false);
      setRoomCode("");
      setPlayers([]);
      try {
        localStorage.removeItem("online_game_session");
      } catch (e) {}
    }
  };

  // Restart New Match Handler
  const handleRestartGame = async () => {
    const defaultCash = startingCash !== undefined ? startingCash : 30000;

    // Reset all players to clean initial state
    const resetPlayers = players.map((p) => ({
      ...p,
      position: 0,
      cash: defaultCash,
      creditUsed: 0,
      payLaterBalance: 0,
      payLaterEnabled: false,
      inJail: false,
      hasGetOutOfJailCard: false,
      passportDebt: 0,
    }));

    const resetProperties: Record<string, PropertyState> = {};
    const newLogs: GameLog[] = [
      {
        id: Math.random().toString(),
        message: "🔄 Match restarted! Returned to lobby for a new match.",
        timestamp: Date.now(),
      },
    ];
    const newChanceDeck = shuffleDeck(CHANCE_CARDS);
    const newUnoDeck = shuffleDeck(UNO_CARDS);

    if (isOnline && roomCode) {
      await updateGameState({
        status: "LOBBY",
        players: resetPlayers,
        forceProperties: resetProperties,
        partyHouseBank: 0,
        diceRoll: null,
        currentAction: null,
        turnIndex: 0,
        turnOrderData: null,
        chanceDeck: newChanceDeck,
        unoDeck: newUnoDeck,
        logs: newLogs,
      });
    } else {
      setPlayers(resetPlayers);
      setProperties(resetProperties);
      setPartyHouseBank(0);
      setDiceRoll(null);
      setCurrentAction(null);
      setTurnIndex(0);
      setTurnOrderData(null);
      setChanceDeck(newChanceDeck);
      setUnoDeck(newUnoDeck);
      setLogs(newLogs);
      setGameMode("LOBBY");
    }
  };

  // Leave Online Lobby Room
  const handleLeaveOnlineLobby = async () => {
    if (confirm("Are you sure you want to leave this online lobby?")) {
      if (isOnline && roomCode) {
        const docRef = doc(db, "games", roomCode);
        const selfPlayer = players.find((p) => p.id === selfPlayerId);
        if (selfPlayer) {
          const updatedPlayers = players.filter((p) => p.id !== selfPlayerId);
          
          if (updatedPlayers.length === 0) {
            // No players left in lobby - we can exit
          } else {
            // If the host is leaving, promote someone else
            if (selfPlayer.isHost) {
              updatedPlayers[0].isHost = true;
            }
            const updatedLogs = [...logs, {
              id: Math.random().toString(),
              message: `👋 ${selfPlayer.name} left the lobby.`,
              timestamp: Date.now()
            }];
            try {
              await updateDoc(docRef, {
                players: updatedPlayers,
                logs: updatedLogs
              });
            } catch (error) {
              console.error("Error leaving lobby: ", error);
            }
          }
        }
      }
      setGameMode("LOBBY");
      setIsOnline(false);
      setRoomCode("");
      setPlayers([]);
      try {
        localStorage.removeItem("online_game_session");
      } catch (e) {}
    }
  };

  // Roll Dice & Move
  const handleRollDice = async () => {
    if (isMoving) return;
    const activePlayer = players[turnIndex];
    if (activePlayer.id !== selfPlayerId) return;

    setIsMoving(true);
    try {
      // 1. Roll two dice
      soundEffects.playRollDice();
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const rollTotal = d1 + d2;

      let updatedLogs = addLog(`Rolled 🎲 ${d1} + 🎲 ${d2} = ${rollTotal} and moves clockwise!`, activePlayer.name);

      // 2. Jail Check
      if (activePlayer.inJail) {
        // Prompt for Jail Choice
        await updateGameState({
          diceRoll: [d1, d2],
          currentAction: {
            type: "JAIL_CHOICE",
            propertyIndex: activePlayer.position,
            playerIndex: turnIndex
          },
          logs: updatedLogs
        });
        return;
      }

      // 3. Move player position
      const previousPosition = activePlayer.position;
      const nextPosition = (previousPosition + rollTotal) % BOARD_SPACES.length;
      
      const updatedPlayers = players.map((p, idx) => {
        if (idx === turnIndex) {
          return { ...p, position: nextPosition };
        }
        return p;
      });

      // 4. Pass Start Bonus ($1,500 salary)
      const passedStart = nextPosition < previousPosition;
      if (passedStart) {
        updatedPlayers[turnIndex].cash += 1500;
        updatedLogs = [
          ...updatedLogs,
          {
            id: Math.random().toString(),
            message: `💰 ${activePlayer.name} passed START and collected a $1,500 salary!`,
            timestamp: Date.now()
          }
        ];
      }

      const landedSpace = BOARD_SPACES[nextPosition];
      updatedLogs = [
        ...updatedLogs,
        {
          id: Math.random().toString(),
          message: `Landed on ${landedSpace.flag} ${landedSpace.name}.`,
          timestamp: Date.now()
        }
      ];

      // 5. Update state so avatar starts step-by-step hop animation on board
      await updateGameState({
        players: updatedPlayers,
        diceRoll: [d1, d2],
        currentAction: null,
        logs: updatedLogs
      });

      // Wait for step-by-step avatar movement animation to finish on board before showing popup modal
      const stepsToTake = rollTotal;
      const stepDelay = stepsToTake > 12 ? Math.max(50, Math.floor(1000 / stepsToTake)) : 160;
      const animationDuration = stepsToTake * stepDelay + 250;
      await new Promise((resolve) => setTimeout(resolve, animationDuration));

      // 6. Resolve landed space rules and present action popup modal
      await resolveLandedSpace(nextPosition, updatedPlayers, updatedLogs, [d1, d2]);
    } finally {
      setIsMoving(false);
    }
  };

  // Resolve Landed Space Rules
  const resolveLandedSpace = async (position: number, currentPlayersList: Player[], currentLogs: GameLog[], currentRoll: [number, number]) => {
    const activePlayer = currentPlayersList[turnIndex];
    const space = BOARD_SPACES[position];
    const propState = properties[position.toString()];

    // Reset action state by default
    let nextAction: GameState["currentAction"] = null;
    let nextTurnIndex = (turnIndex + 1) % currentPlayersList.length;
    let nextPartyHouseBank = partyHouseBank;
    let finalPlayersList = [...currentPlayersList];
    let finalProperties = { ...properties };

    if (space.type === SpaceType.COUNTRY || space.type === SpaceType.UTILITY || space.type === SpaceType.RAILWAY) {
      // 1. Unowned property
      if (!propState || !propState.ownerId) {
        soundEffects.playLandOnProperty();
        nextAction = {
          type: "BUY_OR_PASS",
          propertyIndex: position
        };
        // Keep turnIndex unchanged since they have a pending decision
        nextTurnIndex = turnIndex;
      } else if (propState.ownerId === activePlayer.id) {
        soundEffects.playLandOnProperty();
        // Owned by self - reset housesBuiltThisLanding to 0
        finalProperties[position.toString()] = {
          ...propState,
          housesBuiltThisLanding: 0
        };
        currentLogs = [
          ...currentLogs,
          {
            id: Math.random().toString(),
            message: `🏡 Welcome home! Lands on own developed property.`,
            timestamp: Date.now()
          }
        ];

        // Trigger BUILD_DECISION popup for all eligible COUNTRY properties (not utilities/railways) that do not have a hotel yet
        const isEligibleForHouse = space.type === SpaceType.COUNTRY && !propState.hasHotel;
        if (isEligibleForHouse) {
          nextAction = {
            type: "BUILD_DECISION",
            propertyIndex: position
          };
          nextTurnIndex = turnIndex;
        }
      } else {
        // Owned by another player - PAY RENT!
        const owner = currentPlayersList.find((p) => p.id === propState.ownerId);
        if (owner) {
          if (owner.passportDebt && owner.passportDebt > 0) {
            currentLogs = [
              ...currentLogs,
              {
                id: Math.random().toString(),
                message: `🛂 No Rent Paid! ${activePlayer.name} is exempt from paying rent because owner ${owner.name} is in Passport Debt ($${owner.passportDebt} remaining).`,
                timestamp: Date.now()
              }
            ];
          } else {
            soundEffects.playPayRent();
            // Calculate Rent
            let rent = space.rentBase || 0;
            if (space.type === SpaceType.COUNTRY) {
              // Color group base rent doubling rule:
              // If a player owns 3 or more properties of the same color group,
              // double the base rent of each property without houses or hotel.
              // When a house or hotel is built, standard old rent rules apply (base rent + 1000/house + 1500 for hotel).
              const sameColorProperties = BOARD_SPACES.filter((s) => s.color === space.color);
              const ownerOwnedCount = sameColorProperties.filter(
                (s) => properties[s.index.toString()]?.ownerId === owner.id
              ).length;

              const hasHousesOrHotel = propState.houses > 0 || propState.hasHotel;

              if (ownerOwnedCount >= 3 && !hasHousesOrHotel) {
                rent *= 2; // Doubled base rent for owning 3 or more properties of same color group
              }

              // Add houses & hotels rent increases
              rent += propState.houses * 1000;
              if (propState.hasHotel) {
                rent += 1500;
              }
            } else if (space.type === SpaceType.RAILWAY || space.type === SpaceType.UTILITY) {
              const pairInfo = UTILITY_PAIRS[space.name];
              if (pairInfo) {
                const partnerOwnerId = properties[pairInfo.partnerIndex.toString()]?.ownerId;
                const ownsBoth = partnerOwnerId === owner.id;
                rent = ownsBoth ? pairInfo.rentPaired : pairInfo.rentAlone;
              } else {
                rent = space.rentBase || 0;
              }
            }

            // Execute cash transfers
            const deficit = processPayment(activePlayer, rent);
            owner.cash += rent - deficit; // Owner only receives what the player could actually pay (up to their credit limit)

            currentLogs = [
              ...currentLogs,
              {
                id: Math.random().toString(),
                message: `💸 Paid $${rent} rent to ${owner.name}.`,
                timestamp: Date.now()
              }
            ];

            if (deficit > 0) {
              currentLogs = [
                ...currentLogs,
                {
                  id: Math.random().toString(),
                  message: `⚠️ Deficit alert! ${activePlayer.name} has a debt of $${deficit} that must be resolved immediately!`,
                  timestamp: Date.now()
                }
              ];
              // Turn stays locked on active player if they have debt
              nextTurnIndex = turnIndex;
            }
          }
        }
      }
    } else if (space.type === SpaceType.CHANCE) {
      nextAction = {
        type: "CHANCE_DRAW"
      };
      nextTurnIndex = turnIndex;
    } else if (space.type === SpaceType.UNO) {
      nextAction = {
        type: "UNO_DRAW"
      };
      nextTurnIndex = turnIndex;
    } else if (space.type === SpaceType.TAX) {
      // Travelling Duty / Custom Duty
      soundEffects.playPayRent();
      // "Travelling Duty / Customs Duty: Pay the required flat fee to the party House. Default: $100 per owned tile."
      const ownedTilesCount = BOARD_SPACES.filter(
        (s) => properties[s.index.toString()]?.ownerId === activePlayer.id
      ).length;
      const taxAmount = ownedTilesCount * 100;

      const deficit = processPayment(activePlayer, taxAmount);
      const paidAmount = taxAmount - deficit;
      nextPartyHouseBank += paidAmount;

      currentLogs = [
        ...currentLogs,
        {
          id: Math.random().toString(),
          message: `🛂 Paid Travelling/Customs Tax of $${paidAmount} ($100 per owned tile) to the Party House Bank.`,
          timestamp: Date.now()
        }
      ];

      if (deficit > 0) {
        nextTurnIndex = turnIndex;
      }
    } else if (space.type === SpaceType.JAIL) {
      // Sent to Jail
      activePlayer.inJail = true;
      activePlayer.position = space.index; // Jail position
      
      currentLogs = [
        ...currentLogs,
        {
          id: Math.random().toString(),
          message: `🚨 Detained in Prison! Immediate $500 bail required. Turn ends.`,
          timestamp: Date.now()
        }
      ];
      // Jail automatically ends their turn roll immediately as per rules
      nextTurnIndex = (turnIndex + 1) % currentPlayersList.length;
    } else if (space.type === SpaceType.PARTY_HOUSE) {
      // Landing on Party House option choice!
      nextAction = {
        type: "PARTY_HOUSE_CHOICE"
      };
      nextTurnIndex = turnIndex;
    } else if (space.type === SpaceType.CASINO) {
      // Landing on Casino! Choice to gamble or pass
      nextAction = {
        type: "CASINO_CHOICE"
      };
      nextTurnIndex = turnIndex;
    }

    await updateGameState({
      players: finalPlayersList,
      properties: finalProperties,
      partyHouseBank: nextPartyHouseBank,
      diceRoll: currentRoll,
      currentAction: nextAction ? { ...nextAction, space, playerIndex: turnIndex } : null,
      turnIndex: nextTurnIndex,
      logs: currentLogs
    });
  };

  // Buy Property
  const handleBuyProperty = async (useCredit?: boolean) => {
    if (!currentAction || !currentAction.space) return;
    const space = currentAction.space as BoardSpace;
    const activePlayer = players[turnIndex];

    if (activePlayer.passportDebt && activePlayer.passportDebt > 0) {
      alert("❌ You cannot purchase property while you have outstanding Passport Debt! Repay it in the Actions panel first.");
      return;
    }

    const price = space.price || 0;
    const availableCredit = 10000 - activePlayer.creditUsed;

    if (useCredit) {
      if (activePlayer.cash + availableCredit < price) {
        alert("❌ You do not have enough cash and credit to buy this property!");
        return;
      }
    } else {
      if (activePlayer.cash < price) {
        alert("❌ You do not have enough cash to buy this property! Try using the Credit Card option.");
        return;
      }
    }

    let creditCharged = 0;
    const updatedPlayers = players.map((p) => {
      if (p.id === activePlayer.id) {
        let newCash = p.cash;
        let newCreditUsed = p.creditUsed;

        if (useCredit) {
          const availableCredit = 10000 - newCreditUsed;
          if (availableCredit >= price) {
            creditCharged = price;
            newCreditUsed += price;
          } else {
            creditCharged = availableCredit;
            newCreditUsed = 10000;
            newCash -= (price - creditCharged);
          }
        } else {
          newCash -= price;
        }

        return { ...p, cash: newCash, creditUsed: newCreditUsed };
      }
      return p;
    });

    const updatedProperties = {
      ...properties,
      [space.index.toString()]: {
        ownerId: activePlayer.id,
        houses: 0,
        hasHotel: false,
        housesBuiltThisLanding: 1 // Don't allow house building on first landing
      }
    };

    const paymentMethodText = creditCharged === price
      ? `using Credit Card (Credit charged: $${creditCharged.toLocaleString()})`
      : creditCharged > 0
      ? `using Cash and Credit Card (Credit charged: $${creditCharged.toLocaleString()})`
      : "with Cash";

    const updatedLogs = addLog(`Purchased ${space.flag || ""} ${space.name} for $${price.toLocaleString()} ${paymentMethodText}!`, activePlayer.name);
    const nextTurnIndex = (turnIndex + 1) % players.length;

    await updateGameState({
      players: updatedPlayers,
      properties: updatedProperties,
      currentAction: null,
      turnIndex: nextTurnIndex,
      logs: updatedLogs
    });
  };

  // Pass Property -> Move to next turn
  const handlePassProperty = async () => {
    if (!currentAction || !currentAction.space) return;
    const space = currentAction.space as BoardSpace;
    const activePlayer = players[turnIndex];

    const updatedLogs = addLog(`Passed on purchasing ${space.flag || ""} ${space.name}.`, activePlayer.name);
    const nextTurnIndex = (turnIndex + 1) % players.length;

    await updateGameState({
      currentAction: null,
      turnIndex: nextTurnIndex,
      logs: updatedLogs
    });
  };

  // Build House/Hotel from Modal -> Deduct cash, update property, advance turn
  const handleBuildHouseFromModal = async (spaceIndex: number, useCredit?: boolean) => {
    const activePlayer = players[turnIndex];
    if (!activePlayer) return;

    const space = BOARD_SPACES[spaceIndex];
    const prop = properties[spaceIndex.toString()];
    if (!prop) return;

    const isHotel = prop.houses === 3;
    const price = space.price || 0;

    let newCash = activePlayer.cash;
    let newCreditUsed = activePlayer.creditUsed || 0;
    let creditCharged = 0;

    if (useCredit) {
      const availableCredit = 10000 - newCreditUsed;
      if (newCash + availableCredit < price) {
        alert("Not enough cash and credit limit to build!");
        return;
      }
      if (newCash >= price) {
        newCash -= price;
      } else {
        const remainingNeeded = price - newCash;
        creditCharged = remainingNeeded;
        newCash = 0;
        newCreditUsed += remainingNeeded;
      }
    } else {
      if (newCash < price) {
        alert(isHotel ? "Not enough cash to build hotel!" : "Not enough cash to build house!");
        return;
      }
      newCash -= price;
    }

    soundEffects.playBuildHouse();

    const updatedPlayers = players.map((p) => {
      if (p.id === activePlayer.id) return { ...p, cash: newCash, creditUsed: newCreditUsed };
      return p;
    });

    const updatedProperties = {
      ...properties,
      [spaceIndex.toString()]: {
        ...prop,
        houses: isHotel ? 3 : prop.houses + 1,
        hasHotel: isHotel ? true : prop.hasHotel,
        housesBuiltThisLanding: (prop.housesBuiltThisLanding || 0) + 1
      }
    };

    const paymentText = creditCharged > 0 ? ` (Charged $${creditCharged.toLocaleString()} on Credit Card)` : "";
    const buildText = isHotel ? `a Hotel` : `house #${prop.houses + 1}`;
    const updatedLogs = addLog(`Built ${buildText} on ${space.name} for $${price.toLocaleString()}${paymentText}!`, activePlayer.name);
    const nextTurnIndex = (turnIndex + 1) % players.length;

    await updateGameState({
      players: updatedPlayers,
      properties: updatedProperties,
      currentAction: null,
      turnIndex: nextTurnIndex,
      logs: updatedLogs
    });
  };

  // Sell house from Modal (or Manage Assets) to raise cash without closing decision modal
  const handleSellHouseFromModal = async (spaceIndex: number) => {
    const activePlayer = players.find((p) => p.id === selfPlayerId);
    if (!activePlayer) return;

    const space = BOARD_SPACES[spaceIndex];
    const prop = properties[spaceIndex.toString()];
    if (!prop) return;

    if (prop.ownerId !== selfPlayerId && !(activePlayer.isHost && !isOnline)) return;

    if (prop.houses > 0 && !prop.hasHotel) {
      const updatedPlayers = players.map((p) => {
        if (p.id === prop.ownerId) return { ...p, cash: p.cash + (space.price || 0) };
        return p;
      });
      const updatedProperties = {
        ...properties,
        [spaceIndex.toString()]: {
          ...prop,
          houses: prop.houses - 1
        }
      };
      const ownerPlayer = players.find((p) => p.id === prop.ownerId);
      const updatedLogs = addLog(`Sold 1 house on ${space.name} and received $${space.price?.toLocaleString()} cash!`, ownerPlayer?.name || activePlayer.name);
      await updateGameState({
        players: updatedPlayers,
        properties: updatedProperties,
        logs: updatedLogs
      });
    }
  };

  // Sell hotel from Modal (or Manage Assets) to raise cash without closing decision modal
  const handleSellHotelFromModal = async (spaceIndex: number) => {
    const activePlayer = players.find((p) => p.id === selfPlayerId);
    if (!activePlayer) return;

    const space = BOARD_SPACES[spaceIndex];
    const prop = properties[spaceIndex.toString()];
    if (!prop) return;

    if (prop.ownerId !== selfPlayerId && !(activePlayer.isHost && !isOnline)) return;

    if (prop.hasHotel) {
      const updatedPlayers = players.map((p) => {
        if (p.id === prop.ownerId) return { ...p, cash: p.cash + (space.price || 0) };
        return p;
      });
      const updatedProperties = {
        ...properties,
        [spaceIndex.toString()]: {
          ...prop,
          hasHotel: false
        }
      };
      const ownerPlayer = players.find((p) => p.id === prop.ownerId);
      const updatedLogs = addLog(`Sold Hotel on ${space.name} and received $${space.price?.toLocaleString()} cash!`, ownerPlayer?.name || activePlayer.name);
      await updateGameState({
        players: updatedPlayers,
        properties: updatedProperties,
        logs: updatedLogs
      });
    }
  };

  // Pass building from Modal -> Move to next turn
  const handlePassBuildFromModal = async () => {
    if (!currentAction || currentAction.propertyIndex === undefined) return;
    const spaceIndex = currentAction.propertyIndex;
    const space = BOARD_SPACES[spaceIndex];
    const activePlayer = players[turnIndex];

    const updatedLogs = addLog(`Passed on building on ${space.name}.`, activePlayer.name);
    const nextTurnIndex = (turnIndex + 1) % players.length;

    await updateGameState({
      currentAction: null,
      turnIndex: nextTurnIndex,
      logs: updatedLogs
    });
  };

  // Save updated cards to state and sync
  const handleUpdateCards = async (newChance: CardDef[], newUno: CardDef[]) => {
    setChanceCards(newChance);
    setUnoCards(newUno);
    const newChanceDeck = shuffleDeck(newChance);
    const newUnoDeck = shuffleDeck(newUno);
    setChanceDeck(newChanceDeck);
    setUnoDeck(newUnoDeck);

    const updatedLogs = addLog(`⚙️ Card Decks modified: Updated ${newChance.length} Chance & ${newUno.length} UNO cards`, "System");

    await updateGameState({
      chanceCards: newChance,
      unoCards: newUno,
      chanceDeck: newChanceDeck,
      unoDeck: newUnoDeck,
      logs: updatedLogs
    });
  };

  // Draw Card (Chance or UNO)
  const handleDrawCard = async (type: "CHANCE" | "UNO") => {
    if (!currentAction) return;

    const cardsPool = type === "CHANCE" ? chanceCards : unoCards;
    const activeDeck = (type === "CHANCE" ? chanceDeck : unoDeck) || [];
    const cardId = activeDeck[0] || (type === "CHANCE" ? shuffleDeck(chanceCards)[0] : shuffleDeck(unoCards)[0]);
    
    // Find card definition
    const cardDef = cardsPool.find((c) => c.id === cardId);
    if (!cardDef) return;

    // Remove from deck state
    const remainingDeck = activeDeck.filter((id) => id !== cardId);

    await updateGameState({
      currentAction: {
        ...currentAction,
        cardText: cardDef.text,
        cardType: type
      },
      chanceDeck: type === "CHANCE" ? remainingDeck : chanceDeck,
      unoDeck: type === "UNO" ? remainingDeck : unoDeck
    });
  };

  // Resolve Card Action
  const handleResolveCard = async () => {
    if (!currentAction || !currentAction.cardText) return;
    const activePlayer = players[turnIndex];
    const cardText = currentAction.cardText;
    const type = currentAction.cardType;

    const cardsPool = type === "CHANCE" ? chanceCards : unoCards;
    const cardDef = cardsPool.find((c) => c.text === cardText || c.id === cardText);
    if (!cardDef) return;

    let updatedLogs = addLog(`Resolved card: "${cardDef.text}"`, activePlayer.name);
    let finalPlayers = [...players];
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

    // 1. Gain/Loss money
    if (cardDef.cashChange) {
      if (cardDef.cashChange > 0) {
        finalPlayers[turnIndex].cash += cardDef.cashChange;
      } else {
        const deficit = processPayment(finalPlayers[turnIndex], Math.abs(cardDef.cashChange));
        nextPartyHouseBank += Math.abs(cardDef.cashChange) - deficit;
        if (deficit > 0) nextTurnIndex = turnIndex; // Locked on debt resolution
      }
    }

    let cardAction: GameState["currentAction"] = null;

    // 2. Go directly to position
    if (cardDef.goToPosition !== undefined) {
      finalPlayers[turnIndex].position = cardDef.goToPosition;
      const targetSpace = BOARD_SPACES[cardDef.goToPosition];
      
      // Pass start checking if applicable
      const japanIndex = BOARD_SPACES.findIndex((s) => s.name === "Japan");
      if (japanIndex !== -1 && cardDef.goToPosition === japanIndex && activePlayer.position > japanIndex) {
        finalPlayers[turnIndex].cash += 1500;
        updatedLogs = [
          ...updatedLogs,
          {
            id: Math.random().toString(),
            message: `💰 Passed START and collected $1,500 salary!`,
            timestamp: Date.now()
          }
        ];
      }

      // If landing/moving to Party House (e.g. u9 card)
      if (targetSpace && targetSpace.type === SpaceType.PARTY_HOUSE) {
        cardAction = {
          type: "PARTY_HOUSE_CHOICE",
          space: targetSpace,
          playerIndex: turnIndex
        };
        nextTurnIndex = turnIndex; // Stay on active player turn for choice
        updatedLogs = [
          ...updatedLogs,
          {
            id: Math.random().toString(),
            message: `🥳 ${activePlayer.name} travelled directly to Party House! Choose your Party Gift!`,
            timestamp: Date.now()
          }
        ];
      }

      // If landing/moving to Casino (e.g. c9 card)
      if (targetSpace && targetSpace.type === SpaceType.CASINO) {
        cardAction = {
          type: "CASINO_CHOICE",
          space: targetSpace,
          playerIndex: turnIndex
        };
        nextTurnIndex = turnIndex; // Stay on active player turn for choice
        updatedLogs = [
          ...updatedLogs,
          {
            id: Math.random().toString(),
            message: `🎰 ${activePlayer.name} travelled directly to Casino! Will you gamble or pass?`,
            timestamp: Date.now()
          }
        ];
      }
    }

    // 3. Go to jail
    if (cardDef.goToJail) {
      finalPlayers[turnIndex].inJail = true;
      const jailIndex = BOARD_SPACES.findIndex((s) => s.type === SpaceType.JAIL);
      finalPlayers[turnIndex].position = jailIndex !== -1 ? jailIndex : 9;
      nextTurnIndex = (turnIndex + 1) % players.length; // End turn
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
      // If payment lock
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

    // 7b. House & Hotel Tax (e.g. c7 card)
    if (cardDef.houseAndHotelTax) {
      let totalHouses = 0;
      let totalHotels = 0;
      BOARD_SPACES.forEach((s) => {
        const prop = properties[s.index.toString()];
        if (prop && prop.ownerId === activePlayer.id) {
          if (prop.hasHotel) {
            totalHotels += 1;
          }
          if (prop.houses) {
            totalHouses += prop.houses;
          }
        }
      });
      const taxTotal = (totalHouses * cardDef.houseAndHotelTax.houseTax) + (totalHotels * cardDef.houseAndHotelTax.hotelTax);

      const deficit = processPayment(finalPlayers[turnIndex], taxTotal);
      nextPartyHouseBank += taxTotal - deficit;

      if (deficit > 0) nextTurnIndex = turnIndex;

      updatedLogs = [
        ...updatedLogs,
        {
          id: Math.random().toString(),
          message: `🏘️ ${activePlayer.name} paid $${taxTotal.toLocaleString()} ($${cardDef.houseAndHotelTax.houseTax}/house, $${cardDef.houseAndHotelTax.hotelTax}/hotel) to Party House Bank! (${totalHouses} houses, ${totalHotels} hotels owned)`,
          timestamp: Date.now()
        }
      ];
    }

    // 8. Submit Passport
    if (cardDef.submitPassport) {
      finalPlayers[turnIndex].passportDebt = 5000;
      soundEffects.playLaugh();
      updatedLogs = [
        ...updatedLogs,
        {
          id: Math.random().toString(),
          message: `🛂 Submit Your Passport! ${activePlayer.name} must pay $5,000 to the Party Bank. Rent collection & property purchases are BLOCKED until paid! 👮`,
          timestamp: Date.now()
        }
      ];
    }

    await updateGameState({
      players: finalPlayers,
      currentAction: cardAction,
      turnIndex: nextTurnIndex,
      partyHouseBank: nextPartyHouseBank,
      logs: updatedLogs
    });
  };

  // Jail Choice release
  const handleJailChoice = async (choice: "PAY" | "CARD" | "SKIP") => {
    const activePlayer = players[turnIndex];
    let finalPlayers = [...players];
    let nextTurnIndex = turnIndex; // Keep turn on self to roll
    let updatedLogs = [...logs];

    if (choice === "PAY") {
      const player = finalPlayers[turnIndex];
      const amount = 500;
      if (player.cash < 3000) {
        player.payLaterEnabled = true;
      }
      if (player.payLaterEnabled && player.cash < 5000) {
        player.payLaterBalance = (player.payLaterBalance || 0) + amount;
      } else if (player.cash >= amount) {
        player.cash -= amount;
        if (player.cash < 3000) {
          player.payLaterEnabled = true;
        }
      } else {
        const remainingDeficit = amount - player.cash;
        player.cash = 0;
        player.payLaterEnabled = true;
        const availableCredit = 10000 - player.creditUsed;
        if (availableCredit >= remainingDeficit) {
          player.creditUsed += remainingDeficit;
        } else {
          player.creditUsed = 10000;
        }
      }
      finalPlayers[turnIndex].inJail = false;
      updatedLogs = addLog(`Paid $500 bail. Released from jail! Ready to roll!`, activePlayer.name);
    } else if (choice === "CARD") {
      finalPlayers[turnIndex].hasGetOutOfJailCard = false;
      finalPlayers[turnIndex].inJail = false;
      updatedLogs = addLog(`Used Jail Pass. Released for free! Ready to roll!`, activePlayer.name);
    } else if (choice === "SKIP") {
      finalPlayers[turnIndex].inJail = false; // Mark released for next turn
      nextTurnIndex = (turnIndex + 1) % players.length; // End turn immediately
      updatedLogs = addLog(`Skips turn to stay in jail. Will be released next turn.`, activePlayer.name);
    }

    await updateGameState({
      players: finalPlayers,
      currentAction: null,
      turnIndex: nextTurnIndex,
      logs: updatedLogs
    });
  };

  // Party House choice payout
  const handlePartyHouseChoice = async (choice: "BANK" | "PLAYERS") => {
    const activePlayer = players[turnIndex];
    let finalPlayers = [...players];
    let nextPartyHouseBank = partyHouseBank;
    let updatedLogs = [...logs];

    if (choice === "BANK") {
      finalPlayers[turnIndex].cash += partyHouseBank;
      nextPartyHouseBank = 0;
      updatedLogs = addLog(`Withdrew the entire Party Bank of $${partyHouseBank}! Balance resets to $0.`, activePlayer.name);
    } else if (choice === "PLAYERS") {
      finalPlayers.forEach((p) => {
        if (p.id !== activePlayer.id) {
          if (p.cash >= 200) {
            p.cash -= 200;
            finalPlayers[turnIndex].cash += 200;
          } else {
            const deficit = 200 - p.cash;
            p.cash = 0;
            const availableCredit = 10000 - p.creditUsed;
            p.creditUsed += Math.min(deficit, availableCredit);
            finalPlayers[turnIndex].cash += 200 - (deficit - Math.min(deficit, availableCredit));
          }
        }
      });
      updatedLogs = addLog(`Collected $200 as a gift from every active player!`, activePlayer.name);
    }

    const nextTurnIndex = (turnIndex + 1) % players.length;

    await updateGameState({
      players: finalPlayers,
      partyHouseBank: nextPartyHouseBank,
      currentAction: null,
      turnIndex: nextTurnIndex,
      logs: updatedLogs
    });
  };

  // Casino Choice Pass
  const handleCasinoPass = async () => {
    const activePlayer = players[turnIndex];
    let updatedLogs = addLog(`Passed on gambling at the Casino.`, activePlayer.name);
    const nextTurnIndex = (turnIndex + 1) % players.length;

    await updateGameState({
      players,
      currentAction: null,
      turnIndex: nextTurnIndex,
      logs: updatedLogs
    });
  };

  // Casino Choice Gamble Result
  const handleCasinoGambleResult = async (data: {
    betAmount: number;
    prediction: "ODD" | "EVEN";
    diceRoll: [number, number];
    won: boolean;
    continueGambling?: boolean;
  }) => {
    const activePlayer = players[turnIndex];
    let finalPlayers = [...players];
    let nextPartyHouseBank = partyHouseBank;
    let updatedLogs = [...logs];

    const player = finalPlayers[turnIndex];
    const sum = data.diceRoll[0] + data.diceRoll[1];
    const parity = sum % 2 !== 0 ? "ODD" : "EVEN";

    let nextTurnIndex = turnIndex;
    let nextAction: GameAction | null = null;

    if (data.won) {
      soundEffects.playWinGame();
      player.cash += data.betAmount;

      if (data.continueGambling) {
        // Keep gambling! Don't end turn
        nextTurnIndex = turnIndex;
        nextAction = {
          type: "CASINO_CHOICE",
          playerIndex: turnIndex,
          space: currentAction?.space,
          lastGamble: {
            betAmount: data.betAmount,
            prediction: data.prediction,
            diceRoll: data.diceRoll,
            sum,
            parity,
            won: true,
            playerCash: player.cash
          }
        };
        updatedLogs = addLog(
          `🎰 CASINO WIN! Gambled $${data.betAmount.toLocaleString()} on ${data.prediction}. Rolled 🎲${data.diceRoll[0]} + 🎲${data.diceRoll[1]} = ${sum} (${parity})! Won $${data.betAmount.toLocaleString()} from the Bank and decided to keep gambling!`,
          activePlayer.name
        );
      } else {
        // Passed after winning -> End turn
        nextTurnIndex = (turnIndex + 1) % players.length;
        nextAction = null;
        updatedLogs = addLog(
          `🎰 CASINO WIN! Gambled $${data.betAmount.toLocaleString()} on ${data.prediction}. Rolled 🎲${data.diceRoll[0]} + 🎲${data.diceRoll[1]} = ${sum} (${parity})! Won $${data.betAmount.toLocaleString()} from the Bank and passed.`,
          activePlayer.name
        );
      }
    } else {
      // Lost -> END turn
      soundEffects.playPayRent();
      // Pay Later is strictly prohibited for Casino losses - deduct directly from cash
      player.cash -= data.betAmount;
      const deficit = player.cash < 0 ? Math.abs(player.cash) : 0;
      const actualPaidToBank = Math.max(0, data.betAmount - deficit);
      nextPartyHouseBank += actualPaidToBank;
      nextTurnIndex = (turnIndex + 1) % players.length;
      nextAction = null;
      updatedLogs = addLog(
        `🎰 CASINO LOSS! Gambled $${data.betAmount.toLocaleString()} on ${data.prediction}. Rolled 🎲${data.diceRoll[0]} + 🎲${data.diceRoll[1]} = ${sum} (${parity}). $${data.betAmount.toLocaleString()} lost to Party House Bank! Turn ended.`,
        activePlayer.name
      );
    }

    await updateGameState({
      players: finalPlayers,
      partyHouseBank: nextPartyHouseBank,
      currentAction: nextAction,
      turnIndex: nextTurnIndex,
      turnStartedAt: nextTurnIndex !== turnIndex ? Date.now() : turnStartedAt,
      logs: updatedLogs
    });
  };

  // Initiate Unanimous Vote to End Game
  const handleInitiateVote = async () => {
    const activePlayer = players.find((p) => p.id === selfPlayerId);
    if (!activePlayer) return;

    const initialVotes: Record<string, boolean> = {
      [selfPlayerId]: true // Proposer automatically votes YES
    };

    const updatedLogs = addLog(`Initiated a unanimous vote to end the game and count Net Worth!`, activePlayer.name);

    await updateGameState({
      currentAction: {
        type: "GAME_OVER_VOTE",
        votes: initialVotes
      },
      logs: updatedLogs
    });
  };

  // Cast Game End Vote
  const handleVoteGameEnd = async (vote: boolean) => {
    if (!currentAction || !currentAction.votes) return;
    const voter = players.find((p) => p.id === selfPlayerId);
    if (!voter) return;

    const updatedVotes = {
      ...currentAction.votes,
      [selfPlayerId]: vote
    };

    let updatedLogs = addLog(`Voted ${vote ? "YES" : "NO"} to ending the game.`, voter.name);

    // Check if everyone has voted
    const totalVoted = Object.keys(updatedVotes).length;
    if (totalVoted === players.length) {
      const allYes = Object.values(updatedVotes).every((v) => v === true);
      if (allYes) {
        // Unanimous YES! Game Over
        updatedLogs = [
          ...updatedLogs,
          {
            id: Math.random().toString(),
            message: "🏁 Unanimous consensus reached! Game over! Calculating final Net Worth...",
            timestamp: Date.now()
          }
        ];
        await updateGameState({
          status: "FINISHED",
          currentAction: null,
          logs: updatedLogs
        });
      } else {
        // Vote failed! Keep playing
        updatedLogs = [
          ...updatedLogs,
          {
            id: Math.random().toString(),
            message: "❌ Vote failed to reach unanimous agreement. The game continues!",
            timestamp: Date.now()
          }
        ];
        await updateGameState({
          currentAction: null,
          logs: updatedLogs
        });
      }
    } else {
      await updateGameState({
        currentAction: {
          ...currentAction,
          votes: updatedVotes
        },
        logs: updatedLogs
      });
    }
  };

  // Buy/Build House/Hotel on tile
  const handleSellHouse = async (spaceIndex: number) => {
    // If player is landing on their own tile and wants to build a house:
    const activePlayer = players.find((p) => p.id === selfPlayerId);
    if (!activePlayer) return;

    const space = BOARD_SPACES[spaceIndex];
    const prop = properties[spaceIndex.toString()];

    // CHECK IF THEY ARE BUYING or SELLING:
    // Buying a house/hotel is ONLY permitted when currently landing on the property during a BUILD_DECISION action!
    const isLandedOnThis =
      turnIndex === players.findIndex((p) => p.id === selfPlayerId) &&
      currentAction?.type === "BUILD_DECISION" &&
      currentAction?.propertyIndex === spaceIndex;
    
    if (isLandedOnThis && prop && prop.houses < 3 && !prop.hasHotel) {
      // CHECK BUILD LIMIT - max 1 house per landing
      if (prop.housesBuiltThisLanding && prop.housesBuiltThisLanding >= 1) {
        alert("You can only build maximum 1 house per landing!");
        return;
      }

      // BUYING A HOUSE
      if (activePlayer.cash < (space.price || 0)) {
        alert("Not enough cash to build house!");
        return;
      }
      soundEffects.playBuildHouse();
      const updatedPlayers = players.map((p) => {
        if (p.id === selfPlayerId) return { ...p, cash: p.cash - (space.price || 0) };
        return p;
      });
      const updatedProperties = {
        ...properties,
        [spaceIndex.toString()]: {
          ...prop,
          houses: prop.houses + 1,
          housesBuiltThisLanding: (prop.housesBuiltThisLanding || 0) + 1
        }
      };
      const updatedLogs = addLog(`Built house #${prop.houses + 1} on ${space.name} for $${space.price}!`, activePlayer.name);
      const nextTurnIndex = (turnIndex + 1) % players.length;
      await updateGameState({
        players: updatedPlayers,
        properties: updatedProperties,
        currentAction: null,
        turnIndex: nextTurnIndex,
        logs: updatedLogs
      });
    } else if (prop && prop.houses > 0) {
      // SELLING A HOUSE (100% refund)
      if (prop.ownerId !== selfPlayerId && !(activePlayer.isHost && !isOnline)) return;
      const updatedPlayers = players.map((p) => {
        if (p.id === prop.ownerId) return { ...p, cash: p.cash + (space.price || 0) };
        return p;
      });
      const updatedProperties = {
        ...properties,
        [spaceIndex.toString()]: {
          ...prop,
          houses: prop.houses - 1
        }
      };
      const ownerPlayer = players.find((p) => p.id === prop.ownerId);
      const updatedLogs = addLog(`Sold house on ${space.name} and received $${space.price} cash!`, ownerPlayer?.name || activePlayer.name);
      await updateGameState({
        players: updatedPlayers,
        properties: updatedProperties,
        logs: updatedLogs
      });
    }
  };

  const handleSellHotel = async (spaceIndex: number) => {
    const activePlayer = players.find((p) => p.id === selfPlayerId);
    if (!activePlayer) return;

    const space = BOARD_SPACES[spaceIndex];
    const prop = properties[spaceIndex.toString()];
    if (!prop) return;

    // BUYING or SELLING check:
    const isLandedOnThis =
      turnIndex === players.findIndex((p) => p.id === selfPlayerId) &&
      currentAction?.type === "BUILD_DECISION" &&
      currentAction?.propertyIndex === spaceIndex;

    if (isLandedOnThis && prop.houses === 3 && !prop.hasHotel) {
      // BUYING A HOTEL
      if (activePlayer.cash < (space.price || 0)) {
        alert("Not enough cash to build hotel!");
        return;
      }
      soundEffects.playBuildHouse();
      const updatedPlayers = players.map((p) => {
        if (p.id === selfPlayerId) return { ...p, cash: p.cash - (space.price || 0) };
        return p;
      });
      const updatedProperties = {
        ...properties,
        [spaceIndex.toString()]: {
          ...prop,
          hasHotel: true
        }
      };
      const updatedLogs = addLog(`Built a Hotel on ${space.name} for $${space.price}!`, activePlayer.name);
      const nextTurnIndex = (turnIndex + 1) % players.length;
      await updateGameState({
        players: updatedPlayers,
        properties: updatedProperties,
        currentAction: null,
        turnIndex: nextTurnIndex,
        logs: updatedLogs
      });
    } else if (prop.hasHotel) {
      // SELLING A HOTEL (100% refund)
      if (prop.ownerId !== selfPlayerId && !(activePlayer.isHost && !isOnline)) return;
      const updatedPlayers = players.map((p) => {
        if (p.id === prop.ownerId) return { ...p, cash: p.cash + (space.price || 0) };
        return p;
      });
      const updatedProperties = {
        ...properties,
        [spaceIndex.toString()]: {
          ...prop,
          hasHotel: false
        }
      };
      const ownerPlayer = players.find((p) => p.id === prop.ownerId);
      const updatedLogs = addLog(`Sold Hotel on ${space.name} and received $${space.price} cash!`, ownerPlayer?.name || activePlayer.name);
      await updateGameState({
        players: updatedPlayers,
        properties: updatedProperties,
        logs: updatedLogs
      });
    }
  };

  // Sell Property back to Bank (Mortgage)
  const handleMortgageProperty = async (spaceIndex: number) => {
    const activePlayer = players.find((p) => p.id === selfPlayerId);
    if (!activePlayer) return;

    const space = BOARD_SPACES[spaceIndex];
    const prop = properties[spaceIndex.toString()];
    if (!prop) return;

    if (prop.ownerId !== selfPlayerId && !(activePlayer.isHost && !isOnline)) return;

    if (prop.houses > 0 || prop.hasHotel) {
      alert("Must sell all buildings (hotel, then houses) before selling the property!");
      return;
    }

    const sellPrice = (space.price || 0) / 2;

    const updatedPlayers = players.map((p) => {
      if (p.id === prop.ownerId) return { ...p, cash: p.cash + sellPrice };
      return p;
    });

    const updatedProperties = { ...properties };
    delete updatedProperties[spaceIndex.toString()]; // Ownership transfers back to Bank, becomes unowned

    const ownerPlayer = players.find((p) => p.id === prop.ownerId);
    const updatedLogs = addLog(`Sold ${space.flag} ${space.name} back to Bank for 50% value of $${sellPrice}! It is now unowned.`, ownerPlayer?.name || activePlayer.name);

    await updateGameState({
      players: updatedPlayers,
      properties: updatedProperties,
      logs: updatedLogs
    });
  };

  // Trigger manual Bailout loan on debt screen (reduces Final Net Worth)
  const triggerBailoutLoan = async () => {
    const activePlayer = players.find((p) => p.id === selfPlayerId);
    if (!activePlayer) return;

    const updatedPlayers = players.map((p) => {
      if (p.id === selfPlayerId) {
        return {
          ...p,
          cash: p.cash + 10000,
          creditUsed: p.creditUsed + 10000 // increases debt by $10,000
        };
      }
      return p;
    });

    const updatedLogs = addLog(`⚠️ Bank Bailout! Receives a $10,000 bailout loan to resolve cash deficits.`, activePlayer.name);

    await updateGameState({
      players: updatedPlayers,
      logs: updatedLogs
    });
  };

  // Pay passport debt manually
  const handlePayPassportDebt = async (amount: number) => {
    const activePlayer = players.find((p) => p.id === selfPlayerId);
    if (!activePlayer) return;

    const remainingDebt = activePlayer.passportDebt || 0;
    if (remainingDebt <= 0) return;

    const payAmount = Math.min(amount, remainingDebt);
    if (payAmount <= 0) return;

    const updatedPlayers = players.map((p) => {
      if (p.id === selfPlayerId) {
        // Deduct from cash, then use credit card if needed
        let newCash = p.cash;
        let newCreditUsed = p.creditUsed;
        let paidFromCash = 0;
        let paidFromCredit = 0;

        if (newCash >= payAmount) {
          newCash -= payAmount;
          paidFromCash = payAmount;
        } else {
          paidFromCash = newCash;
          newCash = 0;
          const deficit = payAmount - paidFromCash;
          const availableCredit = 10000 - newCreditUsed;
          
          if (availableCredit >= deficit) {
            newCreditUsed += deficit;
            paidFromCredit = deficit;
          } else {
            newCreditUsed = 10000;
            paidFromCredit = availableCredit;
          }
        }

        const actuallyPaid = paidFromCash + paidFromCredit;
        const newDebt = Math.max(0, remainingDebt - actuallyPaid);

        return {
          ...p,
          cash: newCash,
          creditUsed: newCreditUsed,
          passportDebt: newDebt
        };
      }
      return p;
    });

    const updatedLogs = addLog(`Paid $${payAmount.toLocaleString()} towards Passport Debt to the Party Bank.`, activePlayer.name);

    await updateGameState({
      players: updatedPlayers,
      partyHouseBank: partyHouseBank + payAmount,
      logs: updatedLogs
    });
  };

  // Toggle Pay Later / Autopay mode
  const handleTogglePayLater = async (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    // If cash is less than 3000, Autopay is automatically active
    if (player.cash < 3000 && player.payLaterEnabled) {
      alert(`⚡ Autopay is automatically active because your cash ($${player.cash.toLocaleString()}) is below $3,000 to protect you from payment deficits.`);
      return;
    }

    const updatedPlayers = players.map(p => {
      if (p.id === playerId) {
        return { ...p, payLaterEnabled: !p.payLaterEnabled };
      }
      return p;
    });
    const wasEnabled = player?.payLaterEnabled;
    const updatedLogs = addLog(
      `${wasEnabled ? "Disabled" : "Enabled"} Autopay / Pay Later mode. ${wasEnabled ? "" : "(Available because Cash < $5,000)"}`,
      player?.name || "Player"
    );
    await updateGameState({ players: updatedPlayers, logs: updatedLogs });
  };

  // Settle Pay Later balance manually
  const handleSettlePayLater = async (playerId: string, amount: number, useCredit: boolean = false) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const toPay = Math.min(amount, player.payLaterBalance || 0);
    if (toPay <= 0) return;

    if (!useCredit && player.cash < toPay) {
      alert(`You do not have enough cash to settle $${toPay.toLocaleString()}. Please raise cash first or select Pay with Credit Card.`);
      return;
    }

    if (useCredit) {
      const availableCredit = 10000 - player.creditUsed;
      if (availableCredit < toPay) {
        alert(`You do not have enough credit to settle $${toPay.toLocaleString()}. Available credit: $${availableCredit.toLocaleString()}.`);
        return;
      }
    }

    const updatedPlayers = players.map(p => {
      if (p.id === playerId) {
        if (useCredit) {
          return {
            ...p,
            creditUsed: p.creditUsed + toPay,
            payLaterBalance: (p.payLaterBalance || 0) - toPay
          };
        } else {
          return {
            ...p,
            cash: p.cash - toPay,
            payLaterBalance: (p.payLaterBalance || 0) - toPay
          };
        }
      }
      return p;
    });

    const methodText = useCredit ? "Credit Card" : "Cash";
    const updatedLogs = addLog(`Paid off $${toPay.toLocaleString()} of Pay Later balance using ${methodText}.`, player.name);
    await updateGameState({ players: updatedPlayers, logs: updatedLogs });
  };

  // End Turn Lock Resolution (Next Turn clicker)
  const handleForceNextTurn = async () => {
    const activePlayer = players[turnIndex];
    if (activePlayer.id !== selfPlayerId) return;

    // Check if they still have a cash deficit
    if (activePlayer.cash < 0) {
      alert("You cannot end your turn with a cash deficit! Liquidate assets or claim a Bank Bailout.");
      return;
    }

    if ((activePlayer.payLaterBalance || 0) > 2000) {
      alert("Your Pay Later balance exceeds $2,000! You cannot end your turn. Please settle your balance to less than $2,000 first.");
      return;
    }

    const nextTurnIndex = (turnIndex + 1) % players.length;
    const updatedLogs = addLog(`Ended their turn. Next player's turn!`, activePlayer.name);

    await updateGameState({
      turnIndex: nextTurnIndex,
      logs: updatedLogs
    });
  };

  // Turn timeout penalty & auto-end
  const handleTurnTimeout = async () => {
    const activePlayer = players[turnIndex];
    if (!activePlayer || activePlayer.id !== selfPlayerId) return;

    if (currentAction?.type === "CASINO_CHOICE") {
      return; // Turn timer is paused during Casino choice
    }

    // Penalize the player $500 from Pay Later balance only
    const penaltyAmount = 500;
    
    const updatedPlayers = players.map((p) => {
      if (p.id === selfPlayerId) {
        return {
          ...p,
          payLaterBalance: (p.payLaterBalance || 0) + penaltyAmount
        };
      }
      return p;
    });

    const nextTurnIndex = (turnIndex + 1) % players.length;
    const updatedLogs = addLog(`⏱️ Turn Timed Out! Penalized $500 (added to Pay Later balance only). Turn forced to next player!`, activePlayer.name);

    await updateGameState({
      players: updatedPlayers,
      turnIndex: nextTurnIndex,
      currentAction: null,
      logs: updatedLogs
    });
  };

  const getPageTheme = () => {
    // Keep the Homepage (Lobby) page wrapper in the Cyber Sleek Slate / Blue (Case 0) style always
    const activeStyle = gameMode === "LOBBY" ? 0 : boardStyle;
    switch (activeStyle) {
      case 0: // Cyber Sleek Slate (Dark Modernist)
        return {
          wrapper: "min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-white transition-all duration-500",
          header: "bg-slate-900/90 border-b border-slate-800/80 py-3.5 px-6 flex items-center justify-between shrink-0 shadow-[0_4px_20px_rgba(0,0,0,0.4)] backdrop-blur-md z-30 transition-all",
          main: "flex-1 overflow-y-auto p-4 md:p-6 flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/30 via-slate-950 to-slate-950 relative transition-all duration-500",
          logoBg: "bg-gradient-to-tr from-indigo-500 to-purple-600 text-white p-2 rounded-xl shadow-md",
          logoTitle: "text-sm font-black tracking-widest text-white uppercase leading-none",
          logoSub: "text-[10px] text-indigo-400 font-mono mt-0.5 uppercase tracking-wider",
          lobbyCodeContainer: "flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-1.5 shadow-inner",
          lobbyCodeLabel: "text-[10px] font-mono text-slate-500 font-bold uppercase",
          lobbyCodeVal: "text-xs font-mono font-black tracking-wider uppercase bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded",
          quitBtn: "flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-200 transition cursor-pointer",
        };
      case 1: // Hyper-Neon Cyberpunk (Cyan & Gold)
        return {
          wrapper: "min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-white transition-all duration-500",
          header: "bg-[#0b132b]/95 border-b border-cyan-500/20 py-3.5 px-6 flex items-center justify-between shrink-0 shadow-[0_4px_25px_rgba(6,182,212,0.15)] backdrop-blur-lg z-30 relative overflow-hidden transition-all",
          main: "flex-1 overflow-y-auto p-4 md:p-6 flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#081b33]/40 via-[#020617] to-[#020617] relative transition-all duration-500",
          logoBg: "bg-gradient-to-tr from-cyan-400 to-teal-500 text-slate-950 p-2 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)]",
          logoTitle: "text-sm font-black tracking-widest bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-500 bg-clip-text text-transparent leading-none uppercase filter drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]",
          logoSub: "text-[10px] text-amber-400 font-mono font-bold mt-0.5 uppercase tracking-widest",
          lobbyCodeContainer: "flex items-center gap-2 bg-[#0c1e3d] border border-cyan-500/30 rounded-xl px-3.5 py-1.5 shadow-[0_0_15px_rgba(6,182,212,0.1)]",
          lobbyCodeLabel: "text-[10px] font-mono text-cyan-500/70 font-bold uppercase",
          lobbyCodeVal: "text-xs font-mono font-black tracking-wider uppercase bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded",
          quitBtn: "flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-cyan-400 transition cursor-pointer font-mono tracking-wider",
        };
      case 2: // Emerald Casino Royale (Green & Gold Vintage)
        return {
          wrapper: "min-h-screen bg-stone-950 text-amber-50 flex flex-col font-sans selection:bg-amber-500/30 selection:text-white transition-all duration-500",
          header: "bg-emerald-950/95 border-b border-amber-900/30 py-3.5 px-6 flex items-center justify-between shrink-0 shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-md z-30 transition-all",
          main: "flex-1 overflow-y-auto p-4 md:p-6 flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/30 via-stone-950 to-stone-950 relative transition-all duration-500",
          logoBg: "bg-gradient-to-tr from-amber-500 to-yellow-600 text-slate-950 p-2 rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.3)]",
          logoTitle: "text-sm font-bold tracking-wider text-amber-100 uppercase leading-none font-serif",
          logoSub: "text-[10px] text-amber-400 font-serif italic mt-0.5",
          lobbyCodeContainer: "flex items-center gap-2 bg-emerald-900/40 border border-amber-900/30 rounded-xl px-3.5 py-1.5",
          lobbyCodeLabel: "text-[10px] font-serif text-amber-200/60 font-bold uppercase",
          lobbyCodeVal: "text-xs font-mono font-black tracking-wider uppercase bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded",
          quitBtn: "flex items-center gap-1.5 text-xs font-bold text-amber-200/70 hover:text-amber-200 transition cursor-pointer font-serif",
        };
      case 3: // Classic Mahogany Boardroom (Warm Timber)
        return {
          wrapper: "min-h-screen bg-stone-50 text-stone-800 flex flex-col font-sans selection:bg-amber-100 selection:text-stone-900 transition-all duration-500",
          header: "bg-white border-b border-stone-200 py-3 px-6 flex items-center justify-between shrink-0 shadow-sm z-30 transition-all",
          main: "flex-1 overflow-y-auto p-4 md:p-6 flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-50/20 via-stone-50 to-stone-100 relative transition-all duration-500",
          logoBg: "bg-gradient-to-tr from-amber-500 to-amber-600 text-white p-2 rounded-xl shadow-md",
          logoTitle: "text-sm font-black tracking-wide text-stone-800 uppercase leading-none",
          logoSub: "text-[10px] text-stone-500 font-mono mt-0.5 uppercase tracking-wider",
          lobbyCodeContainer: "flex items-center gap-2 bg-stone-100 border border-stone-200/60 rounded-xl px-3.5 py-1.5 shadow-inner",
          lobbyCodeLabel: "text-[10px] font-mono text-stone-500 font-bold uppercase",
          lobbyCodeVal: "text-xs font-mono font-black tracking-wider uppercase bg-amber-500/10 text-amber-700 px-1.5 py-0.5 rounded",
          quitBtn: "flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-800 transition cursor-pointer",
        };
      case 4: // Retro Cyber Orange & Black (Black, White, Neon Orange)
      default:
        return {
          wrapper: "min-h-screen bg-black text-white flex flex-col font-sans selection:bg-orange-500/30 selection:text-white transition-all duration-500",
          header: "bg-black border-b-2 border-orange-500/40 py-3.5 px-6 flex items-center justify-between shrink-0 shadow-[0_4px_30px_rgba(249,115,22,0.15)] z-30 transition-all",
          main: "flex-1 overflow-y-auto p-4 md:p-6 flex items-center justify-center bg-black relative transition-all duration-500",
          logoBg: "bg-orange-500 text-black p-2 rounded-xl shadow-[0_0_15px_rgba(249,115,22,0.4)]",
          logoTitle: "text-sm font-black tracking-widest text-white uppercase leading-none filter drop-shadow-[0_0_8px_rgba(249,115,22,0.3)] font-mono",
          logoSub: "text-[10px] text-orange-500 font-mono font-bold mt-0.5 uppercase tracking-widest",
          lobbyCodeContainer: "flex items-center gap-2 bg-zinc-950 border-2 border-orange-500/30 rounded-xl px-3.5 py-1.5 shadow-[0_0_15px_rgba(249,115,22,0.1)]",
          lobbyCodeLabel: "text-[10px] font-mono text-orange-500 font-bold uppercase",
          lobbyCodeVal: "text-xs font-mono font-black tracking-wider uppercase bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded",
          quitBtn: "flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-orange-500 transition cursor-pointer font-mono tracking-wider",
        };
    }
  };

  const pageTheme = getPageTheme();

  return (
    <div className={pageTheme.wrapper}>
      {/* Header */}
      <header className={pageTheme.header}>
        <div className="flex items-center gap-2.5">
          <div className={pageTheme.logoBg}>
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <h1 className={pageTheme.logoTitle}>
              Business
            </h1>
            <p className={pageTheme.logoSub}>BOARD ENGINE</p>
          </div>
        </div>

        {/* Lobby credentials header */}
        {gameMode === "PLAYING" && isOnline && (
          <div className={pageTheme.lobbyCodeContainer}>
            <span className={pageTheme.lobbyCodeLabel}>Lobby Code:</span>
            <span className={pageTheme.lobbyCodeVal}>
              {roomCode}
            </span>
            <button
              onClick={copyRoomCode}
              className="text-slate-400 hover:text-slate-600 transition"
              title="Copy room code"
            >
              {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-500 font-bold" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRuleBookOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-extrabold text-xs transition cursor-pointer shadow-xs font-mono uppercase tracking-wider"
            title="View Official Rule Book & Card Decks"
          >
            <BookOpen className="h-3.5 w-3.5 text-amber-400" />
            <span>Rule Book & Decks</span>
          </button>

          {gameMode === "PLAYING" && (
            <button
              onClick={handleBackToLobby}
              className={pageTheme.quitBtn}
            >
              <ArrowLeft className="h-4 w-4" /> Quit Game
            </button>
          )}
        </div>
      </header>

      {/* Main Board Arena */}
      <main className={pageTheme.main}>
        {gameMode === "LOBBY" ? (
          isOnline ? (
            <div className="w-full max-w-md mx-auto bg-slate-900/95 border border-slate-800 shadow-2xl rounded-3xl overflow-hidden p-6 md:p-8 space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 border border-slate-800 text-indigo-400 shadow-inner animate-pulse">
                  <Landmark className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-widest uppercase">
                  Online Lobby
                </h2>
                <p className="text-xs text-indigo-400 font-mono mt-1 uppercase tracking-widest">
                  Share this code with friends to join!
                </p>
              </div>

              {/* Lobby Code Display */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-inner">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Lobby Room Code</span>
                  <span className="text-2xl font-mono font-black text-indigo-400 tracking-wider uppercase">
                    {roomCode}
                  </span>
                </div>
                <button
                  onClick={copyRoomCode}
                  className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition cursor-pointer shadow-md"
                >
                  {copiedCode ? (
                    <>
                      <Check className="h-4 w-4" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Copy
                    </>
                  )}
                </button>
              </div>

              {/* Player list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <span>Connected Players</span>
                  <span className="text-indigo-400">{players.length} / 6</span>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {players.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-950/60 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl ${p.color.split(" ")[0]} flex items-center justify-center text-xl shadow-xs text-white font-bold`}>
                          {p.avatar}
                        </div>
                        <span className="text-sm font-bold text-white flex items-center gap-1.5">
                          {p.name}
                          {p.id === selfPlayerId && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded font-bold uppercase tracking-wider">
                              You
                            </span>
                          )}
                        </span>
                      </div>

                      {p.isHost && (
                        <span className="flex items-center gap-1 text-[10px] font-black text-purple-400 uppercase bg-purple-500/10 border border-purple-500/30 rounded-lg px-2 py-0.5 shadow-xs">
                          <Crown className="h-3.5 w-3.5 text-purple-400 fill-purple-400/30" /> Host
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Lobby Actions */}
              <div className="space-y-3 pt-2">
                {players.find((p) => p.id === selfPlayerId)?.isHost ? (
                  <button
                    onClick={handleStartOnlineGame}
                    disabled={players.length < 2}
                    className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <Play className="h-4 w-4 fill-white" />
                    Start Online Game
                  </button>
                ) : (
                  <div className="text-center py-3 bg-slate-950/50 border border-slate-800 rounded-xl">
                    <p className="text-xs text-indigo-400 font-bold animate-pulse flex items-center justify-center gap-1.5 uppercase tracking-wider">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" />
                      Waiting for host to start...
                    </p>
                  </div>
                )}

                <button
                  onClick={handleLeaveOnlineLobby}
                  className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white font-bold rounded-xl text-xs transition cursor-pointer border border-slate-800"
                >
                  Leave Lobby
                </button>
              </div>
            </div>
          ) : (
            <Lobby
              onJoinOnline={handleJoinOnlineGame}
              onCreateOnline={handleCreateOnlineGame}
              onStartLocalGame={handleStartLocalGame}
              onRejoinOnline={handleRejoinOnlineGame}
              onOpenRuleBook={() => setIsRuleBookOpen(true)}
              isJoining={isJoining}
              boardStyle={boardStyle}
            />
          )
        ) : gameMode === "PLAYING" || gameMode === "DETERMINING_TURN_ORDER" ? (
          <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left/Middle Column: Board View */}
            <div className={
              boardStyle === 0
                ? "lg:col-span-8 flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 border border-slate-800 p-4 md:p-6 rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),_0_20px_40px_rgba(0,0,0,0.6)] transition-all duration-500"
                : boardStyle === 1
                ? "lg:col-span-8 flex items-center justify-center bg-gradient-to-br from-slate-100 via-zinc-100 to-indigo-50/60 border border-slate-200/80 p-4 md:p-6 rounded-3xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.05),_0_15px_30px_rgba(99,102,241,0.08)] transition-all duration-500"
                : boardStyle === 2
                ? "lg:col-span-8 flex items-center justify-center bg-gradient-to-br from-stone-900 via-neutral-900 to-amber-950/40 border border-stone-800/80 p-4 md:p-6 rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),_0_25px_50px_rgba(0,0,0,0.7)] transition-all duration-500"
                : boardStyle === 3
                ? "lg:col-span-8 flex items-center justify-center bg-gradient-to-br from-stone-50 via-zinc-50 to-amber-50/20 border border-stone-200 p-4 md:p-6 rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),_0_20px_40px_rgba(0,0,0,0.1)] transition-all duration-500"
                : "lg:col-span-8 flex items-center justify-center bg-black border-2 border-orange-500/30 p-4 md:p-6 rounded-3xl shadow-[0_0_40px_rgba(249,115,22,0.15)] transition-all duration-500"
            }>
              <Board
                players={players}
                properties={properties}
                currentPlayerIndex={turnIndex}
                partyHouseBank={partyHouseBank}
                boardStyle={boardStyle}
                setBoardStyle={setBoardStyle}
                is3DMode={is3DMode}
                setIs3DMode={setIs3DMode}
              />
            </div>

            {/* Right Column: Turn controls, Feed, and Players on top right */}
            <div className="lg:col-span-4 flex flex-col gap-6 justify-between h-full">
              {/* Active Player / Turn Panel at the top right */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
                {players.map((p, idx) => (
                  <PlayerCard
                    key={p.id}
                    player={p}
                    isCurrentTurn={idx === turnIndex}
                    properties={properties}
                    selfPlayerId={selfPlayerId}
                  />
                ))}
              </div>

              {/* Core controls & Assets tab */}
              <div className="flex-1 min-h-[300px]">
                <GameControls
                  players={players}
                  currentPlayerIndex={turnIndex}
                  selfPlayerId={selfPlayerId}
                  properties={properties}
                  diceRoll={diceRoll}
                  onRollDice={handleRollDice}
                  isMoving={isMoving}
                  onSellHouse={handleSellHouse}
                  onSellHotel={handleSellHotel}
                  onMortgageProperty={handleMortgageProperty}
                  onInitiateVote={handleInitiateVote}
                  onPayPassportDebt={handlePayPassportDebt}
                  onTogglePayLater={handleTogglePayLater}
                  onSettlePayLater={handleSettlePayLater}
                  currentAction={currentAction}
                  partyHouseBank={partyHouseBank}
                  turnStartedAt={turnStartedAt}
                  onTurnTimeout={handleTurnTimeout}
                  timerEnabled={timerEnabled}
                />
              </div>

              {/* Cash deficit debt overlay alert */}
              {players.find((p) => p.id === selfPlayerId)?.cash! < 0 && (
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex flex-col gap-3 shrink-0 select-none animate-pulse">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-red-800 uppercase">Deficit Lock! Cash is Negative!</h4>
                      <p className="text-3xs text-red-600 leading-relaxed mt-0.5">
                        Your liquid cash has fallen below $0. You must sell houses/hotels, mortgage properties, or request a Bank Bailout to raise cash before you can end your turn.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={triggerBailoutLoan}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-3xs shadow-sm transition"
                    >
                      Bailout loan (+$10,000 Cash, +$10,000 Debt)
                    </button>
                  </div>
                </div>
              )}

              {/* Next turn end turn trigger */}
              {players[turnIndex]?.id === selfPlayerId && !currentAction && diceRoll && (
                <button
                  onClick={handleForceNextTurn}
                  id="btn-force-next-turn"
                  className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md transition shrink-0"
                >
                  End My Turn
                </button>
              )}

              {/* Scrolling Feed Logs */}
              <div className="h-[210px] shrink-0">
                <GameLogs logs={logs} selfPlayerId={selfPlayerId} players={players} />
              </div>
            </div>

            {/* Determine Turn Order Overlay Modal */}
            {gameMode === "DETERMINING_TURN_ORDER" && (
              <DetermineTurnOrderModal
                players={players}
                isOnline={isOnline}
                selfPlayerId={selfPlayerId}
                isHost={players.find((p) => p.id === selfPlayerId)?.isHost || false}
                turnOrderData={turnOrderData}
                onUpdateGameState={updateGameState}
                onComplete={handleTurnOrderComplete}
              />
            )}
          </div>
        ) : (
          /* GAME OVER / FINISHED END STATE SCREEN */
          <div className="w-full max-w-xl bg-white border border-slate-200/80 shadow-2xl rounded-3xl p-6 md:p-8 text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-500 text-4xl animate-bounce">
              🏆
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-500 font-mono">
                Consensus Game End
              </span>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">
                Final Standings
              </h2>
              <p className="text-xs text-slate-500">
                The board has closed. Winners determined by Final Net Worth.
              </p>
            </div>

            {/* Calculations Table */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 text-left">
              <h3 className="text-xs font-bold text-slate-700 border-b border-slate-250 pb-2 flex justify-between">
                <span>Player Ledger</span>
                <span>Final Net Worth</span>
              </h3>
              <div className="space-y-2">
                {players
                  .map((p) => {
                    const owned = BOARD_SPACES.filter(
                      (s) => properties[s.index.toString()]?.ownerId === p.id
                    );
                    const propertiesVal = owned.reduce((sum, s) => sum + (s.price || 0), 0);
                    const housesVal = owned.reduce((sum, s) => {
                      const prop = properties[s.index.toString()];
                      return sum + (prop ? prop.houses * (s.price || 0) : 0);
                    }, 0);
                    const hotelsVal = owned.reduce((sum, s) => {
                      const prop = properties[s.index.toString()];
                      return sum + (prop && prop.hasHotel ? (s.price || 0) : 0);
                    }, 0);
                    const finalNet = p.cash + propertiesVal + housesVal + hotelsVal - (p.creditUsed || 0) - (p.payLaterBalance || 0) - (p.passportDebt || 0);
                    return { ...p, finalNet };
                  })
                  .sort((a, b) => b.finalNet - a.finalNet)
                  .map((p, idx) => (
                    <div key={p.id} className="flex justify-between items-center text-xs py-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-400 font-mono w-4">#{idx + 1}</span>
                        <span className="text-lg">{p.avatar}</span>
                        <span className="font-semibold text-slate-700">{p.name}</span>
                      </div>
                      <strong className="text-slate-800 font-mono text-sm">${p.finalNet.toLocaleString()}</strong>
                    </div>
                  ))}
              </div>
            </div>

            <button
              onClick={handleRestartGame}
              className="w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" /> Restart New Match
            </button>
          </div>
        )}
      </main>

      {/* Sandbox Test Suite Panel */}
      {gameMode === "PLAYING" && !isOnline && (
        <SandboxPanel
          players={players}
          properties={properties}
          turnIndex={turnIndex}
          partyHouseBank={partyHouseBank}
          diceRoll={diceRoll}
          currentAction={currentAction}
          onUpdateGameState={updateGameState}
          onResolveLandedSpace={resolveLandedSpace}
          onAddLog={addLog}
          logs={logs}
          chanceCards={chanceCards}
          unoCards={unoCards}
          onOpenCardEditor={() => setIsCardEditorOpen(true)}
        />
      )}

      {/* Rule Book Modal */}
      <RuleBookModal
        isOpen={isRuleBookOpen}
        onClose={() => setIsRuleBookOpen(false)}
        chanceCards={chanceCards}
        unoCards={unoCards}
      />

      {/* Card Decks Manager & Editor Modal */}
      <CardEditorModal
        isOpen={isCardEditorOpen}
        onClose={() => setIsCardEditorOpen(false)}
        chanceCards={chanceCards}
        unoCards={unoCards}
        onUpdateCards={handleUpdateCards}
        isHost={true}
      />

      {/* Action Decision Modals Container */}
      <AnimatePresence>
        <Modals
          currentAction={currentAction}
          players={players}
          selfPlayerId={selfPlayerId}
          properties={properties}
          logs={logs}
          onBuyProperty={handleBuyProperty}
          onPassProperty={handlePassProperty}
          onDrawCard={handleDrawCard}
          onResolveCard={handleResolveCard}
          onJailChoice={handleJailChoice}
          onPartyHouseChoice={handlePartyHouseChoice}
          onVoteGameEnd={handleVoteGameEnd}
          partyHouseBank={partyHouseBank}
          onBuildHouseFromModal={handleBuildHouseFromModal}
          onPassBuildFromModal={handlePassBuildFromModal}
          onSettlePayLater={handleSettlePayLater}
          onSellHouse={handleSellHouseFromModal}
          onSellHotel={handleSellHotelFromModal}
          onMortgageProperty={handleMortgageProperty}
          onCasinoPass={handleCasinoPass}
          onCasinoGambleResult={handleCasinoGambleResult}
          isOnline={isOnline}
        />
      </AnimatePresence>

      {/* Mobile Portrait Orientation Overlay */}
      {!bypassPortrait && (
        <div className="hidden max-lg:portrait:flex fixed inset-0 z-[9999] bg-slate-950/98 backdrop-blur-xl text-white flex-col items-center justify-center p-6 text-center select-none overflow-hidden">
          {/* Decorative ambient background glows */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-amber-500/10 rounded-full blur-[80px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] -z-10" />

          <div className="max-w-xs md:max-w-sm flex flex-col items-center gap-6 relative z-10">
            {/* Spinning/rotating Phone Illustration */}
            <div className="relative w-28 h-28 flex items-center justify-center bg-slate-900/60 border border-slate-800/80 rounded-full shadow-inner p-4">
              <motion.div
                animate={{ rotate: [0, -90, -90, 0, 0] }}
                transition={{
                  repeat: Infinity,
                  duration: 3.5,
                  ease: "easeInOut",
                  times: [0, 0.35, 0.5, 0.85, 1],
                  repeatDelay: 0.5
                }}
                className="text-amber-500 flex items-center justify-center"
              >
                <Smartphone className="h-16 w-16" strokeWidth={1.5} />
              </motion.div>
              {/* Spinning circular orbit arrow */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  repeat: Infinity,
                  duration: 12,
                  ease: "linear"
                }}
                className="absolute inset-2 border border-dashed border-amber-500/30 rounded-full pointer-events-none"
              />
            </div>

            {/* Typography */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest font-mono">
                <span>🔄</span> SCREEN ROTATION REQUESTED
              </div>
              <h2 className="text-xl font-extrabold text-slate-100 tracking-tight leading-snug">
                Please Rotate Your Device to Landscape
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed font-normal">
                This international board game is optimized for <strong>Landscape mode</strong>. Turn your phone sideways to unlock the full layout, 3D board visualizers, and player panels.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 w-full pt-4">
              <div className="flex items-center justify-center gap-2 text-2xs text-slate-500 font-mono">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Detection live: rotate to dismiss</span>
              </div>
              
              <button
                onClick={() => setBypassPortrait(true)}
                className="mt-6 text-[11px] font-semibold text-slate-500 hover:text-amber-400 underline transition cursor-pointer"
              >
                Bypass & continue in portrait mode anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
