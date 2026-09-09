import React, { useState } from "react";
import { CardDef, CHANCE_CARDS, UNO_CARDS, BOARD_SPACES } from "../constants";
import {
  Sparkles,
  X,
  Edit3,
  Plus,
  Trash2,
  RotateCcw,
  Search,
  Check,
  AlertCircle,
  HelpCircle,
  Coins,
  Building,
  ShieldAlert,
  Compass,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CardEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  chanceCards: CardDef[];
  unoCards: CardDef[];
  onUpdateCards: (newChance: CardDef[], newUno: CardDef[]) => Promise<void>;
  isHost?: boolean;
}

export const CardEditorModal: React.FC<CardEditorModalProps> = ({
  isOpen,
  onClose,
  chanceCards,
  unoCards,
  onUpdateCards,
  isHost = true
}) => {
  const [activeTab, setActiveTab] = useState<"CHANCE" | "UNO">("CHANCE");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEffectFilter, setSelectedEffectFilter] = useState<string>("ALL");

  // Local editing states
  const [editingCard, setEditingCard] = useState<CardDef | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  // Form states for creating/editing
  const [formText, setFormText] = useState("");
  const [formEffectType, setFormEffectType] = useState<
    "CASH" | "POSITION" | "JAIL" | "FREE_JAIL" | "COLLECT_ALL" | "PAY_ALL" | "HOUSE_TAX" | "PASSPORT"
  >("CASH");
  const [formCashChange, setFormCashChange] = useState<number>(1000);
  const [formPosition, setFormPosition] = useState<number>(0);
  const [formHouseTax, setFormHouseTax] = useState<number>(200);

  if (!isOpen) return null;

  const currentDeck = activeTab === "CHANCE" ? chanceCards : unoCards;

  // Filter cards
  const filteredCards = currentDeck.filter((card) => {
    const matchesSearch = card.text.toLowerCase().includes(searchQuery.toLowerCase()) || card.id.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedEffectFilter === "ALL") return true;
    if (selectedEffectFilter === "CASH_GAIN" && (card.cashChange || 0) > 0) return true;
    if (selectedEffectFilter === "CASH_LOSS" && (card.cashChange || 0) < 0) return true;
    if (selectedEffectFilter === "JAIL" && (card.goToJail || card.getOutOfJail)) return true;
    if (selectedEffectFilter === "TAX" && card.houseTax) return true;
    if (selectedEffectFilter === "POSITION" && card.goToPosition !== undefined) return true;
    if (selectedEffectFilter === "SPECIAL" && (card.collectFromAll || card.payAll || card.submitPassport)) return true;
    return false;
  });

  const handleOpenEdit = (card: CardDef) => {
    setEditingCard(card);
    setIsCreatingNew(false);
    setFormText(card.text);

    if (card.goToJail) {
      setFormEffectType("JAIL");
    } else if (card.getOutOfJail) {
      setFormEffectType("FREE_JAIL");
    } else if (card.submitPassport) {
      setFormEffectType("PASSPORT");
    } else if (card.houseTax) {
      setFormEffectType("HOUSE_TAX");
      setFormHouseTax(card.houseTax);
    } else if (card.collectFromAll) {
      setFormEffectType("COLLECT_ALL");
      setFormCashChange(card.collectFromAll);
    } else if (card.payAll) {
      setFormEffectType("PAY_ALL");
      setFormCashChange(card.payAll);
    } else if (card.goToPosition !== undefined) {
      setFormEffectType("POSITION");
      setFormPosition(card.goToPosition);
    } else {
      setFormEffectType("CASH");
      setFormCashChange(card.cashChange || 1000);
    }
  };

  const handleOpenCreate = () => {
    setEditingCard(null);
    setIsCreatingNew(true);
    setFormText("Custom Event Card: Collect $1,000 from the Bank!");
    setFormEffectType("CASH");
    setFormCashChange(1000);
    setFormPosition(0);
    setFormHouseTax(200);
  };

  const handleSaveCard = async () => {
    if (!formText.trim()) {
      alert("Please enter card text!");
      return;
    }

    const newCard: CardDef = {
      id: editingCard ? editingCard.id : `${activeTab.toLowerCase()}_${Date.now()}`,
      text: formText.trim(),
      type: activeTab
    };

    // Apply effect based on selected formEffectType
    switch (formEffectType) {
      case "CASH":
        newCard.cashChange = formCashChange;
        break;
      case "POSITION":
        newCard.goToPosition = formPosition;
        break;
      case "JAIL":
        newCard.goToJail = true;
        break;
      case "FREE_JAIL":
        newCard.getOutOfJail = true;
        break;
      case "COLLECT_ALL":
        newCard.collectFromAll = Math.abs(formCashChange);
        break;
      case "PAY_ALL":
        newCard.payAll = Math.abs(formCashChange);
        break;
      case "HOUSE_TAX":
        newCard.houseTax = formHouseTax;
        break;
      case "PASSPORT":
        newCard.submitPassport = true;
        break;
    }

    let updatedChance = [...chanceCards];
    let updatedUno = [...unoCards];

    if (activeTab === "CHANCE") {
      if (isCreatingNew) {
        updatedChance.push(newCard);
      } else {
        updatedChance = updatedChance.map((c) => (c.id === newCard.id ? newCard : c));
      }
    } else {
      if (isCreatingNew) {
        updatedUno.push(newCard);
      } else {
        updatedUno = updatedUno.map((c) => (c.id === newCard.id ? newCard : c));
      }
    }

    await onUpdateCards(updatedChance, updatedUno);
    setEditingCard(null);
    setIsCreatingNew(false);
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm("Are you sure you want to delete this card?")) return;

    const updatedChance = chanceCards.filter((c) => c.id !== cardId);
    const updatedUno = unoCards.filter((c) => c.id !== cardId);

    await onUpdateCards(updatedChance, updatedUno);
  };

  const handleResetToDefaults = async () => {
    if (!confirm("Reset all Chance and UNO cards back to default game rules?")) return;
    await onUpdateCards([...CHANCE_CARDS], [...UNO_CARDS]);
  };

  const renderEffectBadge = (card: CardDef) => {
    if (card.cashChange && card.cashChange > 0) {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono">
          <Coins className="h-3 w-3 text-emerald-600" /> +${card.cashChange.toLocaleString()}
        </span>
      );
    }
    if (card.cashChange && card.cashChange < 0) {
      return (
        <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono">
          <Coins className="h-3 w-3 text-rose-600" /> -${Math.abs(card.cashChange).toLocaleString()}
        </span>
      );
    }
    if (card.goToJail) {
      return (
        <span className="inline-flex items-center gap-1 bg-slate-200 text-slate-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
          👮 Go To Jail
        </span>
      );
    }
    if (card.getOutOfJail) {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
          🎟️ Get Out of Jail Free
        </span>
      );
    }
    if (card.houseTax) {
      return (
        <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono">
          <Building className="h-3 w-3 text-purple-600" /> ${card.houseTax}/tile
        </span>
      );
    }
    if (card.houseAndHotelTax) {
      return (
        <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono">
          <Building className="h-3 w-3 text-purple-600" /> ${card.houseAndHotelTax.houseTax}/house, ${card.houseAndHotelTax.hotelTax}/hotel
        </span>
      );
    }
    if (card.collectFromAll) {
      return (
        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono">
          👑 +${card.collectFromAll}/player
        </span>
      );
    }
    if (card.payAll) {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono">
          🎁 -${card.payAll}/player
        </span>
      );
    }
    if (card.goToPosition !== undefined) {
      const space = BOARD_SPACES[card.goToPosition];
      return (
        <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
          <Compass className="h-3 w-3 text-indigo-600" /> Move to {space ? `${space.flag} ${space.name}` : `#${card.goToPosition}`}
        </span>
      );
    }
    if (card.submitPassport) {
      return (
        <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
          🛂 Submit Passport ($5k Debt)
        </span>
      );
    }
    return <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full">Special Event</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col font-sans text-left"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 px-6 py-4 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-2xl backdrop-blur-md">
              <Sparkles className="h-5 w-5 text-amber-100" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-wide">Chance & UNO Cards Manager</h2>
              <p className="text-xs text-amber-100 font-medium">View, edit, or customize game deck events in real-time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-xl transition cursor-pointer text-white/90 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body / Subheader Tabs */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab("CHANCE");
                setEditingCard(null);
                setIsCreatingNew(false);
              }}
              className={`px-4 py-2 rounded-2xl font-black text-xs transition cursor-pointer flex items-center gap-2 border ${
                activeTab === "CHANCE"
                  ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>❓ Chance Cards</span>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono font-bold">
                {chanceCards.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab("UNO");
                setEditingCard(null);
                setIsCreatingNew(false);
              }}
              className={`px-4 py-2 rounded-2xl font-black text-xs transition cursor-pointer flex items-center gap-2 border ${
                activeTab === "UNO"
                  ? "bg-red-500 text-white border-red-600 shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>🃏 UNO Cards</span>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono font-bold">
                {unoCards.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenCreate}
              className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Card
            </button>
            <button
              onClick={handleResetToDefaults}
              className="py-2 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition cursor-pointer flex items-center gap-1.5"
              title="Reset all cards to standard game rules"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" /> Reset
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Card Editor Form overlay / section */}
          {(editingCard || isCreatingNew) && (
            <div className="p-4 bg-amber-50/80 border-2 border-amber-300 rounded-3xl space-y-3 shadow-md animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                <h3 className="text-xs font-black uppercase text-amber-900 tracking-wider flex items-center gap-1.5">
                  <Edit3 className="h-4 w-4 text-amber-600" />
                  {isCreatingNew ? `Create New ${activeTab} Card` : `Edit Card [${editingCard?.id}]`}
                </h3>
                <button
                  onClick={() => {
                    setEditingCard(null);
                    setIsCreatingNew(false);
                  }}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-amber-900 uppercase font-mono mb-1">
                    Card Text / Description
                  </label>
                  <input
                    type="text"
                    value={formText}
                    onChange={(e) => setFormText(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-800"
                    placeholder="Enter full card event description..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 uppercase font-mono mb-1">
                      Event Effect Type
                    </label>
                    <select
                      value={formEffectType}
                      onChange={(e) => setFormEffectType(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-800 cursor-pointer"
                    >
                      <option value="CASH">💰 Cash Gain or Loss</option>
                      <option value="POSITION">🗺️ Move directly to Position</option>
                      <option value="JAIL">👮 Go directly to Jail</option>
                      <option value="FREE_JAIL">🎟️ Get Out of Jail Free</option>
                      <option value="COLLECT_ALL">👑 Collect from All Players</option>
                      <option value="PAY_ALL">🎁 Pay All Active Players</option>
                      <option value="HOUSE_TAX">🏠 Tax per Owned Tile</option>
                      <option value="PASSPORT">🛂 Submit Passport ($5k Debt)</option>
                    </select>
                  </div>

                  {/* Value Input based on Effect Type */}
                  {formEffectType === "CASH" && (
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 uppercase font-mono mb-1">
                        Cash Amount (Positive = Gain, Negative = Loss)
                      </label>
                      <input
                        type="number"
                        step="100"
                        value={formCashChange}
                        onChange={(e) => setFormCashChange(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-mono font-extrabold bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                      />
                    </div>
                  )}

                  {formEffectType === "POSITION" && (
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 uppercase font-mono mb-1">
                        Destination Space
                      </label>
                      <select
                        value={formPosition}
                        onChange={(e) => setFormPosition(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-800 cursor-pointer"
                      >
                        {BOARD_SPACES.map((s) => (
                          <option key={s.index} value={s.index}>
                            #{s.index} {s.flag} {s.name} ({s.type})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {(formEffectType === "COLLECT_ALL" || formEffectType === "PAY_ALL") && (
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 uppercase font-mono mb-1">
                        Amount per Player ($)
                      </label>
                      <input
                        type="number"
                        step="100"
                        value={formCashChange}
                        onChange={(e) => setFormCashChange(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-mono font-extrabold bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                      />
                    </div>
                  )}

                  {formEffectType === "HOUSE_TAX" && (
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 uppercase font-mono mb-1">
                        Tax Amount per Owned Tile ($)
                      </label>
                      <input
                        type="number"
                        step="50"
                        value={formHouseTax}
                        onChange={(e) => setFormHouseTax(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-mono font-extrabold bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditingCard(null);
                      setIsCreatingNew(false);
                    }}
                    className="py-2 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 font-bold text-xs text-slate-600 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCard}
                    className="py-2 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="h-4 w-4" /> Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search & Filter bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-100/70 p-2.5 rounded-2xl border border-slate-200 text-xs">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cards..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-full">
              {[
                { id: "ALL", label: "All" },
                { id: "CASH_GAIN", label: "💰 Gains" },
                { id: "CASH_LOSS", label: "💸 Losses" },
                { id: "JAIL", label: "👮 Jail" },
                { id: "TAX", label: "🏠 Tax" },
                { id: "POSITION", label: "🗺️ Move" },
                { id: "SPECIAL", label: "✨ Special" }
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedEffectFilter(filter.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold whitespace-nowrap transition cursor-pointer ${
                    selectedEffectFilter === filter.id
                      ? "bg-slate-800 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredCards.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 text-xs italic">
                No cards match your filter or search query.
              </div>
            ) : (
              filteredCards.map((card, idx) => (
                <div
                  key={card.id}
                  className="p-3.5 bg-white border border-slate-200 hover:border-amber-400 rounded-2xl shadow-2xs hover:shadow-xs transition flex flex-col justify-between gap-2.5 group relative"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-mono font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                        #{idx + 1} [{card.id}]
                      </span>
                      {renderEffectBadge(card)}
                    </div>
                    <p className="text-xs font-semibold text-slate-800 leading-snug">{card.text}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Type: <strong>{card.type}</strong>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(card)}
                        className="py-1 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                      >
                        <Edit3 className="h-3 w-3" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="py-1 px-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg transition cursor-pointer"
                        title="Delete card"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs text-slate-500 font-medium">
          <span>Total Deck Cards: <strong>{currentDeck.length}</strong></span>
          <button
            onClick={onClose}
            className="py-2 px-5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl transition cursor-pointer"
          >
            Done Editing
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default CardEditorModal;
