import { Player, TurnOrderData, PlayerTurnOrderRoll } from "../types";

export function createInitialTurnOrderData(players: Player[]): TurnOrderData {
  return {
    phase: "INITIAL_ROLL",
    round: 1,
    rolls: {},
    activeGroupPlayerIds: players.map((p) => p.id),
    activeRankOffset: 1,
    pendingTieGroups: [],
    settledRanks: {},
    logMessages: [
      "🎲 Initial Roll: Each player rolls two 6-sided dice to determine turn order from highest total to lowest."
    ]
  };
}

export function rollForPlayerInTurnOrder(
  currentData: TurnOrderData,
  playerId: string,
  players: Player[]
): { updatedData: TurnOrderData; newlyRolled: PlayerTurnOrderRoll | null } {
  // If player is not active in this round or already rolled, ignore
  if (
    currentData.phase === "COMPLETE" ||
    !currentData.activeGroupPlayerIds.includes(playerId) ||
    currentData.rolls[playerId]
  ) {
    return { updatedData: currentData, newlyRolled: null };
  }

  const die1 = Math.floor(Math.random() * 6) + 1;
  const die2 = Math.floor(Math.random() * 6) + 1;
  const total = die1 + die2;
  const newlyRolled: PlayerTurnOrderRoll = { playerId, die1, die2, total };

  const updatedRolls = {
    ...currentData.rolls,
    [playerId]: newlyRolled
  };

  const playerName = players.find((p) => p.id === playerId)?.name || "Player";
  const rollLog = `🎲 ${playerName} rolled 🎲${die1} + 🎲${die2} = ${total}`;

  // Check if all players in activeGroupPlayerIds have rolled
  const hasEveryoneRolled = currentData.activeGroupPlayerIds.every(
    (id) => updatedRolls[id]
  );

  if (!hasEveryoneRolled) {
    return {
      updatedData: {
        ...currentData,
        rolls: updatedRolls,
        logMessages: [...currentData.logMessages, rollLog]
      },
      newlyRolled
    };
  }

  // Everyone in active group has rolled -> evaluate round results
  const roundRolls = currentData.activeGroupPlayerIds.map((id) => updatedRolls[id]);

  // Group by total
  const totalsMap: Record<number, string[]> = {};
  roundRolls.forEach((r) => {
    if (!totalsMap[r.total]) totalsMap[r.total] = [];
    totalsMap[r.total].push(r.playerId);
  });

  const sortedTotals = Object.keys(totalsMap)
    .map(Number)
    .sort((a, b) => b - a);

  let nextRankOffset = currentData.activeRankOffset;
  const newSettledRanks = { ...currentData.settledRanks };
  const newPendingTieGroups = [...currentData.pendingTieGroups];
  const roundSummaryLogs: string[] = [rollLog];

  sortedTotals.forEach((tot) => {
    const tiedIds = totalsMap[tot];
    if (tiedIds.length === 1) {
      const singleId = tiedIds[0];
      newSettledRanks[singleId] = nextRankOffset;
      const pName = players.find((p) => p.id === singleId)?.name || "Player";
      roundSummaryLogs.push(`🏅 Position #${nextRankOffset} fixed: ${pName} (Total ${tot})`);
      nextRankOffset += 1;
    } else {
      const tiedNames = tiedIds
        .map((id) => players.find((p) => p.id === id)?.name || id)
        .join(" & ");
      newPendingTieGroups.push({ playerIds: tiedIds, rankOffset: nextRankOffset });
      roundSummaryLogs.push(
        `⚠️ TIE DETECTED! ${tiedNames} tied with total ${tot} for positions #${nextRankOffset} to #${nextRankOffset + tiedIds.length - 1}. A tie-breaker roll is required!`
      );
      nextRankOffset += tiedIds.length;
    }
  });

  if (newPendingTieGroups.length > 0) {
    const nextTieGroup = newPendingTieGroups.shift()!;
    const nextRound = currentData.round + 1;
    const nextGroupNames = nextTieGroup.playerIds
      .map((id) => players.find((p) => p.id === id)?.name || id)
      .join(" & ");
    roundSummaryLogs.push(
      `🎲 Tie-Breaker Round ${nextRound}: ${nextGroupNames} reroll now!`
    );

    return {
      updatedData: {
        phase: "TIE_BREAKER",
        round: nextRound,
        rolls: {}, // Reset rolls for next active tie group
        activeGroupPlayerIds: nextTieGroup.playerIds,
        activeRankOffset: nextTieGroup.rankOffset,
        pendingTieGroups: newPendingTieGroups,
        settledRanks: newSettledRanks,
        logMessages: [...currentData.logMessages, ...roundSummaryLogs]
      },
      newlyRolled
    };
  } else {
    // All player ranks 1..N are settled!
    const sortedPlayers = [...players].sort(
      (a, b) => (newSettledRanks[a.id] || 99) - (newSettledRanks[b.id] || 99)
    );
    const finalOrderText = sortedPlayers
      .map((p, idx) => `#${idx + 1} ${p.name}`)
      .join(" ➔ ");
    roundSummaryLogs.push(`🎉 FINAL TURN ORDER ESTABLISHED: ${finalOrderText}`);

    return {
      updatedData: {
        phase: "COMPLETE",
        round: currentData.round,
        rolls: updatedRolls,
        activeGroupPlayerIds: [],
        activeRankOffset: nextRankOffset,
        pendingTieGroups: [],
        settledRanks: newSettledRanks,
        logMessages: [...currentData.logMessages, ...roundSummaryLogs],
        finalOrderPlayerIds: sortedPlayers.map((p) => p.id)
      },
      newlyRolled
    };
  }
}

export function autoRollAllTurnOrder(
  initialData: TurnOrderData,
  players: Player[]
): TurnOrderData {
  let curr = initialData;
  let safetyCounter = 0;

  while (curr.phase !== "COMPLETE" && safetyCounter < 100) {
    safetyCounter++;
    const unrolledActiveId = curr.activeGroupPlayerIds.find((id) => !curr.rolls[id]);

    if (unrolledActiveId) {
      const res = rollForPlayerInTurnOrder(curr, unrolledActiveId, players);
      curr = res.updatedData;
    } else {
      break;
    }
  }

  return curr;
}
