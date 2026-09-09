import React from "react";
import { Player, PropertyState } from "../types";
import { BOARD_SPACES, getCountryCode } from "../constants";
import { Coins, CreditCard, Shield, Landmark, MapPin, Building } from "lucide-react";

interface PlayerCardProps {
  player: Player;
  isCurrentTurn: boolean;
  properties: Record<string, PropertyState>;
  selfPlayerId: string;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isCurrentTurn,
  properties,
  selfPlayerId
}) => {
  const COLOR_ORDER: Record<string, number> = {
    yellow: 1,
    purple: 2,
    orange: 3,
    blue: 4,
  };

  const getPropertyOrder = (space: (typeof BOARD_SPACES)[0]) => {
    if (space.color && COLOR_ORDER[space.color]) {
      return COLOR_ORDER[space.color];
    }
    return 5;
  };

  // Calculate Asset Values
  const ownedSpaces = BOARD_SPACES.filter(
    (space) => properties[space.index.toString()]?.ownerId === player.id
  ).sort((a, b) => {
    const orderA = getPropertyOrder(a);
    const orderB = getPropertyOrder(b);
    if (orderA !== orderB) return orderA - orderB;
    return a.index - b.index;
  });

  const propertiesValue = ownedSpaces.reduce((sum, space) => sum + (space.price || 0), 0);
  
  const housesCount = ownedSpaces.reduce((sum, space) => {
    const prop = properties[space.index.toString()];
    return sum + (prop ? prop.houses : 0);
  }, 0);

  const hotelsCount = ownedSpaces.reduce((sum, space) => {
    const prop = properties[space.index.toString()];
    return sum + (prop && prop.hasHotel ? 1 : 0);
  }, 0);

  const housesValue = ownedSpaces.reduce((sum, space) => {
    const prop = properties[space.index.toString()];
    return sum + (prop ? prop.houses * (space.price || 0) : 0);
  }, 0);

  const hotelsValue = ownedSpaces.reduce((sum, space) => {
    const prop = properties[space.index.toString()];
    return sum + (prop && prop.hasHotel ? (space.price || 0) : 0);
  }, 0);

  const netWorth = player.cash + propertiesValue + housesValue + hotelsValue - player.creditUsed - (player.payLaterBalance || 0);

  const currentSpace = BOARD_SPACES[player.position];

  return (
    <div
      id={`player-card-${player.id}`}
      className={`relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 ${
        isCurrentTurn
          ? "border-amber-400 bg-amber-500/10 shadow-lg shadow-amber-500/5 ring-1 ring-amber-400/30"
          : player.id === selfPlayerId
          ? "border-slate-300 bg-slate-500/5"
          : "border-slate-200 bg-white"
      }`}
    >
      {/* Active turn pulse */}
      {isCurrentTurn && (
        <div className="absolute right-3 top-3 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl shadow-sm ${player.color} text-white`}>
          {player.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-slate-800 truncate">
              {player.name}
            </h3>
            {player.id === selfPlayerId && (
              <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-2s font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                You
              </span>
            )}
            {player.isHost && (
              <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-2s font-medium text-amber-700 ring-1 ring-inset ring-amber-600/10">
                Host
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1 truncate mt-0.5">
            <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
            Landed: <span className="font-medium flex items-center gap-1 inline-flex">
              {currentSpace && (
                (() => {
                  const code = getCountryCode(currentSpace.name);
                  return code ? (
                    <img
                      src={`https://flagcdn.com/w160/${code}.png`}
                      alt=""
                      className="h-2.5 w-3.5 object-cover rounded-xs border border-slate-200 inline shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span>{currentSpace.flag}</span>
                  );
                })()
              )}
              <span>{currentSpace?.name}</span>
            </span>
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        {/* Cash Balance */}
        <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100/50">
          <p className="text-2xs text-slate-400 font-medium flex items-center gap-1">
            <Coins className="h-3 w-3 text-emerald-500" /> Cash Balance
          </p>
          <p className="text-sm font-bold text-slate-800 mt-1">
            ${player.cash.toLocaleString()}
          </p>
        </div>

        {/* Properties Owned */}
        <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100/50">
          <p className="text-2xs text-slate-400 font-medium flex items-center gap-1">
            <Building className="h-3 w-3 text-indigo-500" /> Properties
          </p>
          <p className="text-sm font-bold text-slate-800 mt-1">
            {ownedSpaces.length} owned
          </p>
        </div>
      </div>

      {/* Credit and cards */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2 items-center justify-between text-2xs">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1 text-slate-500">
            <CreditCard className={`h-3 w-3 ${player.creditUsed > 0 ? 'text-red-500' : 'text-slate-400'}`} />
            <span>CC:</span>
            <span className={`font-semibold ${player.creditUsed > 0 ? 'text-red-600' : 'text-slate-700'}`}>
              ${(10000 - player.creditUsed).toLocaleString()}
            </span>
          </div>
          {(player.payLaterBalance || 0) > 0 && (
            <div className="flex items-center gap-1 text-slate-500">
              <span className="text-[10px]">⏳</span>
              <span className="text-slate-500">Later:</span>
              <span className={`font-bold ${player.payLaterBalance > 3000 ? 'text-red-600 font-extrabold animate-pulse' : 'text-amber-600'}`}>
                ${player.payLaterBalance.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1 items-center">
          {player.inJail && (
            <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
              🚨 In Jail
            </span>
          )}

          {player.hasGetOutOfJailCard && (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/10 flex items-center gap-0.5">
              <Shield className="h-2.5 w-2.5" /> Jail Pass
            </span>
          )}

          {player.cash < 3000 && player.payLaterEnabled && (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20 text-3xs">
              ⚡ Autopay
            </span>
          )}
        </div>
      </div>

      {/* Property ownership list */}
      <div className="mt-3">
        <p className="text-2xs text-slate-400 font-medium mb-1.5">
          Countries Owned ({ownedSpaces.length})
        </p>
        <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
          {ownedSpaces.length === 0 ? (
            <span className="text-2xs italic text-slate-400">None</span>
          ) : (
            ownedSpaces.map((space) => {
              const prop = properties[space.index.toString()];
              return (
                <div
                  key={space.index}
                  className="inline-flex items-center gap-1 rounded bg-slate-100 border border-slate-200/50 px-1.5 py-0.5 font-mono text-2xs text-slate-700"
                  title={`${space.name} - ${prop?.houses} Houses, ${prop?.hasHotel ? "1 Hotel" : "No Hotel"}`}
                >
                  {(() => {
                    const code = getCountryCode(space.name);
                    return code ? (
                      <img
                        src={`https://flagcdn.com/w160/${code}.png`}
                        alt=""
                        className="h-2 w-3 object-cover rounded-xs border border-slate-200 shrink-0 inline"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span>{space.flag}</span>
                    );
                  })()}
                  <span className="max-w-[50px] truncate">{space.name}</span>
                  {(prop?.houses > 0 || prop?.hasHotel) && (
                    <span className="text-2xs bg-slate-200 text-slate-800 px-0.5 rounded font-bold shrink-0">
                      {prop.hasHotel ? "H" : prop.houses}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
export default PlayerCard;
