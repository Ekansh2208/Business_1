import React, { useState } from "react";
import { BOARD_SPACES } from "../constants";
import { PropertyState, SpaceType, BoardSpace } from "../types";
import { Search, Landmark, MapPin, Sparkles, Building, Globe } from "lucide-react";

interface RemainingPropertiesProps {
  properties: Record<string, PropertyState>;
  onSelectSpace?: (space: BoardSpace) => void;
  compact?: boolean;
}

export const RemainingProperties: React.FC<RemainingPropertiesProps> = ({
  properties,
  onSelectSpace,
  compact = false
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");

  // Get all purchasable properties
  const purchasableSpaces = BOARD_SPACES.filter((space) => (space.price || 0) > 0);

  // Filter unowned properties
  const remainingSpaces = purchasableSpaces.filter((space) => {
    const prop = properties[space.index.toString()];
    return !prop || !prop.ownerId;
  });

  // Total bank stock value
  const totalStockValue = remainingSpaces.reduce((sum, s) => sum + (s.price || 0), 0);

  // Group definitions
  const groupFilters = [
    { id: "ALL", label: "All", count: remainingSpaces.length },
    { id: "yellow", label: "🟡 Yellow", count: remainingSpaces.filter((s) => s.color === "yellow").length },
    { id: "purple", label: "🟣 Purple", count: remainingSpaces.filter((s) => s.color === "purple").length },
    { id: "orange", label: "🟠 Orange", count: remainingSpaces.filter((s) => s.color === "orange").length },
    { id: "blue", label: "🔵 Blue", count: remainingSpaces.filter((s) => s.color === "blue").length },
    { id: "RAILWAY", label: "🚂 Transport", count: remainingSpaces.filter((s) => s.type === SpaceType.RAILWAY).length },
    { id: "UTILITY", label: "🛢️ Utilities", count: remainingSpaces.filter((s) => s.type === SpaceType.UTILITY).length }
  ];

  // Filtered remaining list based on search and group selection
  const filteredList = remainingSpaces.filter((space) => {
    // Search match
    const matchesSearch =
      space.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (space.flag && space.flag.includes(searchTerm));

    if (!matchesSearch) return false;

    // Group match
    if (selectedGroup === "ALL") return true;
    if (selectedGroup === "RAILWAY") return space.type === SpaceType.RAILWAY;
    if (selectedGroup === "UTILITY") return space.type === SpaceType.UTILITY;
    return space.color === selectedGroup;
  });

  // Utility helper to get group total count
  const getGroupTotal = (space: BoardSpace) => {
    if (space.type === SpaceType.RAILWAY) {
      return purchasableSpaces.filter((s) => s.type === SpaceType.RAILWAY).length;
    }
    if (space.type === SpaceType.UTILITY) {
      return purchasableSpaces.filter((s) => s.type === SpaceType.UTILITY).length;
    }
    if (space.color) {
      return purchasableSpaces.filter((s) => s.color === space.color).length;
    }
    return 1;
  };

  const getGroupUnownedCount = (space: BoardSpace) => {
    if (space.type === SpaceType.RAILWAY) {
      return remainingSpaces.filter((s) => s.type === SpaceType.RAILWAY).length;
    }
    if (space.type === SpaceType.UTILITY) {
      return remainingSpaces.filter((s) => s.type === SpaceType.UTILITY).length;
    }
    if (space.color) {
      return remainingSpaces.filter((s) => s.color === space.color).length;
    }
    return 1;
  };

  const getColorClasses = (space: BoardSpace) => {
    if (space.type === SpaceType.RAILWAY) return "bg-indigo-600 text-white border-indigo-700";
    if (space.type === SpaceType.UTILITY) return "bg-teal-600 text-white border-teal-700";
    if (space.color === "yellow") return "bg-amber-400 text-amber-950 border-amber-500";
    if (space.color === "purple") return "bg-purple-600 text-white border-purple-700";
    if (space.color === "orange") return "bg-orange-500 text-white border-orange-600";
    if (space.color === "blue") return "bg-blue-600 text-white border-blue-700";
    return "bg-slate-700 text-white border-slate-800";
  };

  return (
    <div className="space-y-3 font-sans text-left select-none">
      {/* Header Summary */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-3.5 rounded-2xl text-white border border-slate-800 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl shrink-0">
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-black tracking-wide uppercase text-slate-100">
                Bank Stock Inventory
              </h3>
              <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                {remainingSpaces.length} / {purchasableSpaces.length} Remaining
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
              Properties available for purchase when landing on them.
            </p>
          </div>
        </div>
        <div className="text-right hidden xs:block shrink-0 font-mono">
          <span className="text-[9px] uppercase font-bold text-slate-400 block">Bank Value</span>
          <span className="text-sm font-black text-amber-400">${totalStockValue.toLocaleString()}</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search remaining country or transport..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:bg-white transition"
          />
        </div>

        {/* Group Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-2xs">
          {groupFilters.map((gf) => (
            <button
              key={gf.id}
              onClick={() => setSelectedGroup(gf.id)}
              className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1 border ${
                selectedGroup === gf.id
                  ? "bg-slate-800 text-white border-slate-800 shadow-2xs"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>{gf.label}</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                  selectedGroup === gf.id ? "bg-slate-700 text-amber-300" : "bg-slate-200 text-slate-700"
                }`}
              >
                {gf.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Property List */}
      {filteredList.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
          <Globe className="h-8 w-8 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-500">
            {remainingSpaces.length === 0
              ? "All properties on the board have been purchased!"
              : "No remaining properties match your filter."}
          </p>
          {remainingSpaces.length > 0 && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedGroup("ALL");
              }}
              className="text-3xs font-extrabold text-amber-600 hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
          {filteredList.map((space) => {
            const groupTotal = getGroupTotal(space);
            const groupUnowned = getGroupUnownedCount(space);
            const isGroupFullBank = groupUnowned === groupTotal;

            return (
              <div
                key={space.index}
                onClick={() => onSelectSpace && onSelectSpace(space)}
                className="group relative bg-white border border-slate-200/90 hover:border-amber-400 rounded-2xl p-3 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between gap-2 overflow-hidden"
              >
                {/* Header Color Banner */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl shrink-0 leading-none">{space.flag || "🏛️"}</span>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-800 tracking-tight truncate group-hover:text-amber-600 transition">
                        {space.name}
                      </h4>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${getColorClasses(
                            space
                          )}`}
                        >
                          {space.type === SpaceType.RAILWAY
                            ? "Transport"
                            : space.type === SpaceType.UTILITY
                            ? "Utility"
                            : `${space.color?.toUpperCase()} GROUP`}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" /> Tile #{space.index}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono">
                    <span className="text-3xs text-slate-400 uppercase font-bold block">Price</span>
                    <span className="text-xs font-black text-emerald-600">${space.price?.toLocaleString()}</span>
                  </div>
                </div>

                {/* Details Footer */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-3xs font-mono text-slate-500">
                  <span>
                    Base Rent: <strong className="text-slate-700">${space.rentBase}</strong>
                  </span>

                  <span
                    className={`font-sans text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      isGroupFullBank
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {isGroupFullBank && <Sparkles className="h-2.5 w-2.5 text-amber-500 fill-amber-400" />}
                    {groupUnowned}/{groupTotal} Group Unowned
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RemainingProperties;
