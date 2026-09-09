import React, { useState } from "react";
import { CardDef, CHANCE_CARDS, UNO_CARDS, BOARD_SPACES } from "../constants";
import {
  BookOpen,
  X,
  Sparkles,
  ShieldAlert,
  Coins,
  Building,
  CreditCard,
  Compass,
  Scale,
  Flame,
  Search,
  CheckCircle2,
  HelpCircle,
  Award
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface RuleBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  chanceCards?: CardDef[];
  unoCards?: CardDef[];
}

export const RuleBookModal: React.FC<RuleBookModalProps> = ({
  isOpen,
  onClose,
  chanceCards = CHANCE_CARDS,
  unoCards = UNO_CARDS
}) => {
  const [activeTab, setActiveTab] = useState<"RULES" | "CHANCE" | "UNO" | "SPACES">("RULES");
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const currentDeck = activeTab === "CHANCE" ? chanceCards : activeTab === "UNO" ? unoCards : [];

  const filteredDeck = currentDeck.filter(
    (c) =>
      c.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md text-left font-sans select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-800 shadow-2xl rounded-3xl w-full max-w-4xl overflow-hidden max-h-[92vh] flex flex-col text-slate-100"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 px-6 py-4 text-slate-950 flex items-center justify-between shrink-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-950/20 rounded-2xl backdrop-blur-md">
              <BookOpen className="h-6 w-6 text-slate-950" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wider uppercase font-mono">
                Official Rule Book & Card Decks
              </h2>
              <p className="text-xs text-slate-900/80 font-bold">
                International Business Board Game System Prompt Rules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-950/20 rounded-xl transition cursor-pointer text-slate-950 hover:text-black"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs font-bold">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <button
              onClick={() => setActiveTab("RULES")}
              className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 border font-mono uppercase tracking-wider ${
                activeTab === "RULES"
                  ? "bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              <Scale className="h-4 w-4" /> Game Rules & Formula
            </button>

            <button
              onClick={() => setActiveTab("CHANCE")}
              className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 border font-mono uppercase tracking-wider ${
                activeTab === "CHANCE"
                  ? "bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              <span>❓ Chance Cards</span>
              <span className="text-[10px] bg-slate-950/40 px-2 py-0.5 rounded-full font-mono">
                {chanceCards.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("UNO")}
              className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 border font-mono uppercase tracking-wider ${
                activeTab === "UNO"
                  ? "bg-red-500 text-white border-red-400 font-black shadow-xs"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              <span>🃏 UNO Cards</span>
              <span className="text-[10px] bg-slate-950/40 px-2 py-0.5 rounded-full font-mono">
                {unoCards.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("SPACES")}
              className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 border font-mono uppercase tracking-wider ${
                activeTab === "SPACES"
                  ? "bg-indigo-600 text-white border-indigo-400 font-black shadow-xs"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              <Compass className="h-4 w-4" /> Board Properties ({BOARD_SPACES.length})
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-slate-200">
          {/* TAB 1: SYSTEM PROMPT RULES */}
          {activeTab === "RULES" && (
            <div className="space-y-6">
              {/* Formula Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-yellow-500/10 border-2 border-amber-500/30 text-left space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-mono font-black text-sm uppercase tracking-wider">
                  <Award className="h-5 w-5 text-amber-400" />
                  <span>Final Net Worth Formula (Winner Determination)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  Players are <strong className="text-white">never eliminated</strong> upon bankruptcy. The game ends only by unanimous vote, and the final winner is declared based on total Net Worth:
                </p>
                <div className="p-3 bg-slate-950 border border-amber-500/40 rounded-xl font-mono text-xs text-amber-300 font-extrabold text-center tracking-wide">
                  Final Net Worth = Cash Balance + Property Value + House Value + Hotel Value − Outstanding Credit Used
                </div>
              </div>

              {/* Determining Turn Order Rule Box */}
              <div className="p-5 bg-indigo-950/40 border-2 border-indigo-500/40 rounded-2xl space-y-3 text-left">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm uppercase font-mono">
                  <Compass className="h-5 w-5 text-indigo-400" /> Determining Turn Order Rules
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Before the game begins, the system determines the initial turn sequence for all players through dice rolls:
                </p>
                <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
                  <li><strong>Initial Dice Roll:</strong> Each player rolls two standard 6-sided dice. Both dice values and the total sum are displayed. Players are ranked from highest total to lowest.</li>
                  <li><strong>Tie Breaker Rules:</strong> If two or more players roll the same total, <em>only those tied players</em> participate in a tie-breaker roll. They reroll two dice until their relative order is uniquely determined.</li>
                  <li><strong>Partial Tie Rule:</strong> Players with unique totals keep their fixed positions. Only the tied players reroll to determine their relative order among themselves.</li>
                </ul>

                {/* Examples */}
                <div className="mt-3 p-3.5 bg-slate-950/80 border border-indigo-500/20 rounded-xl space-y-2 font-mono text-xs">
                  <div className="text-indigo-300 font-bold uppercase text-[11px]">Turn Order Examples:</div>
                  <div className="text-slate-300 space-y-1 text-[11px]">
                    <div>• <strong>No Tie:</strong> Bob (11), Alice (9), David (8), Charlie (5) ➔ <strong>Order:</strong> Bob ➔ Alice ➔ David ➔ Charlie</div>
                    <div>• <strong>Full Tie:</strong> Alice (9), Bob (9), Charlie (6), David (3) ➔ Alice & Bob reroll: Alice (8), Bob (10) ➔ <strong>Order:</strong> Bob ➔ Alice ➔ Charlie ➔ David</div>
                    <div>• <strong>Partial Tie:</strong> Alice (9), Bob (8), Charlie (8), David (3) ➔ Alice fixed #1, David fixed #4; Bob & Charlie reroll for #2 and #3 ➔ <strong>Order:</strong> Alice ➔ Bob ➔ Charlie ➔ David</div>
                  </div>
                </div>
              </div>

              {/* Core Mechanics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Rule Box 1: Development & Houses */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase font-mono">
                    <Building className="h-4 w-4" /> Houses & Hotel Rules
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside leading-relaxed">
                    <li><strong>Color Group Bonus:</strong> Owning 3 or more properties in the same color group doubles the Base Rent for unimproved properties (0 houses, 0 hotel) in that group.</li>
                    <li><strong>Houses:</strong> Max 3 per property. Built 1 at a time when landing on your property. Cost = Property Price. Rent increases +$1,000 each (standard rent rules apply when built).</li>
                    <li><strong>Hotels:</strong> Requires 3 existing houses. Cost = Property Price. Increases rent +$1,500. Houses remain after hotel built.</li>
                    <li><strong>Full Development Value:</strong> Property + 3 Houses + 1 Hotel = 5 × Property Purchase Price.</li>
                    <li><strong>Selling:</strong> Houses and Hotels sell for 100% value on owner's turn. Hotel must be sold first before houses.</li>
                  </ul>
                </div>

                {/* Rule Box 2: Special Tiles */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase font-mono">
                    <Flame className="h-4 w-4" /> Party House & Special Tiles
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside leading-relaxed">
                    <li><strong>Party House Bank:</strong> Starts at $0. Receives all Chance/UNO losses & Customs duty. Landing awards entire Bank balance, then resets to $0!</li>
                    <li><strong>Casino:</strong> Landing player can Gamble up to $10,000 on an Odd or Even dice roll or Pass. Correct guess wins double the bet from the Bank (+$X profit); incorrect guess loses bet to Party House Bank!</li>
                    <li><strong>Passing Start:</strong> Collect $1,500 from the main Bank.</li>
                  </ul>
                </div>

                {/* Rule Box 3: Jail & Passport */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase font-mono">
                    <ShieldAlert className="h-4 w-4" /> Jail & Passport Customs
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside leading-relaxed">
                    <li><strong>Autopay (Pay Later):</strong> Automatically enabled when player money is less than $3,000 to defer expenses to Pay Later balance without debt default.</li>
                    <li><strong>Jail Bail:</strong> Landing on Go To Jail requires an immediate $500 bail payment. Turn ends immediately.</li>
                    <li><strong>Credit Card:</strong> $3,000 interest-free credit activated automatically when cash hits $0. Balance deducted from Final Net Worth.</li>
                    <li><strong>Mortgage:</strong> Bank pays 50% purchase price. Property becomes unowned and available for purchase by any player who lands on it.</li>
                  </ul>
                </div>

                {/* Rule Box 4: Game Termination */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase font-mono">
                    <CheckCircle2 className="h-4 w-4" /> Game Ending & Voting
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside leading-relaxed">
                    <li><strong>No Elimination:</strong> Players stay in game with credit card assistance and recovery options.</li>
                    <li><strong>Unanimous Vote:</strong> Any player can propose a vote to end game. All players must vote YES to complete match.</li>
                    <li><strong>Winner Declaration:</strong> Player with highest Final Net Worth is declared champion!</li>
                    <li><strong>Final Net Worth Formula:</strong> Cash + Property Value + House Value + Hotel Value − Credit Card Used − Pay Later Balance − Passport Debt</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2 & 3: CHANCE OR UNO CARDS */}
          {(activeTab === "CHANCE" || activeTab === "UNO") && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search ${activeTab} cards...`}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  />
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Showing <strong>{filteredDeck.length}</strong> of <strong>{currentDeck.length}</strong> cards
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredDeck.map((card, idx) => (
                  <div
                    key={card.id}
                    className="p-3.5 bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 rounded-2xl space-y-2 transition shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                        ID: {card.id}
                      </span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 font-mono border border-slate-800">
                        {card.type}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-100 leading-relaxed">
                      {card.text}
                    </p>

                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      {card.cashChange && card.cashChange > 0 && (
                        <span className="text-emerald-400 font-extrabold">💰 +${card.cashChange.toLocaleString()}</span>
                      )}
                      {card.cashChange && card.cashChange < 0 && (
                        <span className="text-rose-400 font-extrabold">💸 -${Math.abs(card.cashChange).toLocaleString()}</span>
                      )}
                      {card.goToJail && <span className="text-amber-400 font-extrabold">👮 Go To Jail</span>}
                      {card.getOutOfJail && <span className="text-indigo-400 font-extrabold">🎟️ Get Out Free</span>}
                      {card.houseTax && <span className="text-purple-400 font-extrabold">🏠 Tax ${card.houseTax}/tile</span>}
                      {card.houseAndHotelTax && <span className="text-purple-400 font-extrabold">🏠 Tax ${card.houseAndHotelTax.houseTax}/house, ${card.houseAndHotelTax.hotelTax}/hotel</span>}
                      {card.collectFromAll && <span className="text-blue-400 font-extrabold">👑 +${card.collectFromAll}/player</span>}
                      {card.payAll && <span className="text-yellow-400 font-extrabold">🎁 -${card.payAll}/player</span>}
                      {card.goToPosition !== undefined && (
                        <span className="text-sky-400 font-extrabold"> Move to Space #{card.goToPosition}</span>
                      )}
                      {card.submitPassport && <span className="text-red-400 font-extrabold">🛂 Passport ($5k Debt)</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: BOARD SPACES INDEX */}
          {activeTab === "SPACES" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {BOARD_SPACES.map((space) => (
                  <div
                    key={space.index}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{space.flag}</span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-200 truncate">
                          #{space.index} {space.name}
                        </h4>
                        <span className="text-[10px] text-slate-500 font-mono uppercase">
                          {space.type} {space.color ? `• ${space.color}` : ""}
                        </span>
                      </div>
                    </div>
                    {space.price ? (
                      <span className="text-xs font-extrabold font-mono text-emerald-400 shrink-0">
                        ${space.price.toLocaleString()}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0 text-xs text-slate-400">
          <span>Read rules carefully and issue prompts to edit or delete any card!</span>
          <button
            onClick={onClose}
            className="py-2 px-5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl transition cursor-pointer font-mono"
          >
            Close Rule Book
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default RuleBookModal;
