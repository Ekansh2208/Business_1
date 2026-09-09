import { BoardSpace, SpaceType } from "./types";

export const BOARD_SPACES: BoardSpace[] = [
  { index: 0, name: "Start", type: SpaceType.START, flag: "🏁", gridRow: 1, gridCol: 1 },
  { index: 1, name: "Saudi Arabia", type: SpaceType.COUNTRY, color: "yellow", colorClass: "bg-yellow-400 text-yellow-900", flag: "🇸🇦", price: 4500, rentBase: 450, gridRow: 1, gridCol: 2 },
  { index: 2, name: "Railways", type: SpaceType.RAILWAY, flag: "🚂", price: 9500, rentBase: 1500, gridRow: 1, gridCol: 3 },
  { index: 3, name: "Malaysia", type: SpaceType.COUNTRY, color: "yellow", colorClass: "bg-yellow-400 text-yellow-900", flag: "🇲🇾", price: 1500, rentBase: 150, gridRow: 1, gridCol: 4 },
  { index: 4, name: "China", type: SpaceType.COUNTRY, color: "purple", colorClass: "bg-purple-600 text-white", flag: "🇨🇳", price: 4500, rentBase: 450, gridRow: 1, gridCol: 5 },
  { index: 5, name: "Singapore", type: SpaceType.COUNTRY, color: "yellow", colorClass: "bg-yellow-400 text-yellow-900", flag: "🇸🇬", price: 3000, rentBase: 300, gridRow: 1, gridCol: 6 },
  { index: 6, name: "Chance", type: SpaceType.CHANCE, flag: "❓", gridRow: 1, gridCol: 7 },
  { index: 7, name: "Petroleum", type: SpaceType.UTILITY, flag: "🛢️", price: 5500, rentBase: 500, gridRow: 1, gridCol: 8 },
  { index: 8, name: "Argentina", type: SpaceType.COUNTRY, color: "yellow", colorClass: "bg-yellow-400 text-yellow-900", flag: "🇦🇷", price: 5000, rentBase: 500, gridRow: 1, gridCol: 9 },
  { index: 9, name: "Jail", type: SpaceType.JAIL, flag: "👮", gridRow: 1, gridCol: 10 },
  { index: 10, name: "UNO", type: SpaceType.UNO, flag: "🃏", gridRow: 2, gridCol: 10 },
  { index: 11, name: "Mexico", type: SpaceType.COUNTRY, color: "yellow", colorClass: "bg-yellow-400 text-yellow-900", flag: "🇲🇽", price: 6000, rentBase: 600, gridRow: 3, gridCol: 10 },
  { index: 12, name: "Roadways", type: SpaceType.RAILWAY, flag: "🛣️", price: 3500, rentBase: 800, gridRow: 4, gridCol: 10 },
  { index: 13, name: "Travelling Duty", type: SpaceType.TAX, flag: "🛂", gridRow: 5, gridCol: 10 },
  { index: 14, name: "USA", type: SpaceType.COUNTRY, color: "orange", colorClass: "bg-orange-500 text-white", flag: "🇺🇸", price: 8500, rentBase: 850, gridRow: 6, gridCol: 10 },
  { index: 15, name: "Australia", type: SpaceType.COUNTRY, color: "orange", colorClass: "bg-orange-500 text-white", flag: "🇦🇺", price: 3200, rentBase: 320, gridRow: 7, gridCol: 10 },
  { index: 16, name: "Japan", type: SpaceType.COUNTRY, color: "orange", colorClass: "bg-orange-500 text-white", flag: "🇯🇵", price: 3500, rentBase: 350, gridRow: 8, gridCol: 10 },
  { index: 17, name: "India", type: SpaceType.COUNTRY, color: "orange", colorClass: "bg-orange-500 text-white", flag: "🇮🇳", price: 5500, rentBase: 550, gridRow: 9, gridCol: 10 },
  { index: 18, name: "Party House", type: SpaceType.PARTY_HOUSE, flag: "🥳", gridRow: 10, gridCol: 10 },
  { index: 19, name: "Italy", type: SpaceType.COUNTRY, color: "blue", colorClass: "bg-blue-600 text-white", flag: "🇮🇹", price: 3000, rentBase: 300, gridRow: 10, gridCol: 9 },
  { index: 20, name: "Chance", type: SpaceType.CHANCE, flag: "❓", gridRow: 10, gridCol: 8 },
  { index: 21, name: "Brazil", type: SpaceType.COUNTRY, color: "blue", colorClass: "bg-blue-600 text-white", flag: "🇧🇷", price: 3000, rentBase: 300, gridRow: 10, gridCol: 7 },
  { index: 22, name: "Switzerland", type: SpaceType.COUNTRY, color: "blue", colorClass: "bg-blue-600 text-white", flag: "🇨🇭", price: 5500, rentBase: 550, gridRow: 10, gridCol: 6 },
  { index: 23, name: "Custom Duty", type: SpaceType.TAX, flag: "🛃", gridRow: 10, gridCol: 5 },
  { index: 24, name: "South Africa", type: SpaceType.COUNTRY, color: "blue", colorClass: "bg-blue-600 text-white", flag: "🇿🇦", price: 4000, rentBase: 400, gridRow: 10, gridCol: 4 },
  { index: 25, name: "Airways", type: SpaceType.RAILWAY, flag: "✈️", price: 10500, rentBase: 1500, gridRow: 10, gridCol: 3 },
  { index: 26, name: "Germany", type: SpaceType.COUNTRY, color: "purple", colorClass: "bg-purple-600 text-white", flag: "🇩🇪", price: 5000, rentBase: 500, gridRow: 10, gridCol: 2 },
  { index: 27, name: "Casino", type: SpaceType.CASINO, flag: "🎰", gridRow: 10, gridCol: 1 },
  { index: 28, name: "Canada", type: SpaceType.COUNTRY, color: "purple", colorClass: "bg-purple-600 text-white", flag: "🇨🇦", price: 4500, rentBase: 400, gridRow: 9, gridCol: 1 },
  { index: 29, name: "Egypt", type: SpaceType.COUNTRY, color: "purple", colorClass: "bg-purple-600 text-white", flag: "🇪🇬", price: 3200, rentBase: 320, gridRow: 8, gridCol: 1 },
  { index: 30, name: "Satellite", type: SpaceType.UTILITY, flag: "🛰️", price: 2500, rentBase: 500, gridRow: 7, gridCol: 1 },
  { index: 31, name: "Iran", type: SpaceType.COUNTRY, color: "purple", colorClass: "bg-purple-600 text-white", flag: "🇮🇷", price: 3000, rentBase: 300, gridRow: 6, gridCol: 1 },
  { index: 32, name: "United Kingdom", type: SpaceType.COUNTRY, color: "blue", colorClass: "bg-blue-600 text-white", flag: "🇬🇧", price: 8000, rentBase: 800, gridRow: 5, gridCol: 1 },
  { index: 33, name: "France", type: SpaceType.COUNTRY, color: "orange", colorClass: "bg-orange-500 text-white", flag: "🇫🇷", price: 3000, rentBase: 300, gridRow: 4, gridCol: 1 },
  { index: 34, name: "UNO", type: SpaceType.UNO, flag: "🃏", gridRow: 3, gridCol: 1 },
  { index: 35, name: "Waterways", type: SpaceType.RAILWAY, flag: "🚢", price: 9500, rentBase: 1400, gridRow: 2, gridCol: 1 }
];

export interface CardDef {
  id: string;
  text: string;
  type: "CHANCE" | "UNO";
  // Effect modifiers:
  cashChange?: number; // positive = gain, negative = loss
  goToPosition?: number;
  goToJail?: boolean;
  getOutOfJail?: boolean;
  collectFromAll?: number;
  payAll?: number;
  houseTax?: number; // per owned tile (house or country)
  houseAndHotelTax?: { houseTax: number; hotelTax: number };
  submitPassport?: boolean;
}

export const CHANCE_CARDS: CardDef[] = [
  { id: "c1", text: "Jackpot Winner! Collect $2,500 from the Bank.", type: "CHANCE", cashChange: 2500 },
  { id: "c2", text: "Gold Deposit: Receive interest on your investments. Collect $1,500 from the Bank.", type: "CHANCE", cashChange: 1500 },
  { id: "c3", text: "Loss in Share Market. Pay $2,000 to the Party House Bank.", type: "CHANCE", cashChange: -2000 },
  { id: "c4", text: "Accident due to Strong Driving! Pay $1,000 to the Party House Bank.", type: "CHANCE", cashChange: -1000 },
  { id: "c5", text: "House repairs required. Pay $50 per house and $100 per hotel to the Party House Bank.", type: "CHANCE", houseAndHotelTax: { houseTax: 50, hotelTax: 100 } },
  { id: "c6", text: "Birthday Celebration! Collect $500 from every active player.", type: "CHANCE", collectFromAll: 500 },
  { id: "c7", text: "Pay $1,500 penalty to the Party House Bank.", type: "CHANCE", cashChange: -1500 },
  { id: "c8", text: "School & Medical fees. Pay $1,000 to the Party House Bank.", type: "CHANCE", cashChange: -1000 },
  { id: "c9", text: "Go to Casino! Roll the dice and test your luck.", type: "CHANCE", goToPosition: 27 },
  { id: "c10", text: "Go directly to Jail. Do not pass Start, do not collect $1,500.", type: "CHANCE", goToJail: true }
];

export const UNO_CARDS: CardDef[] = [
  { id: "u1", text: "Income Tax Refund! Collect $1,500 from the Bank.", type: "UNO", cashChange: 1500 },
  { id: "u2", text: "Customs Fine: You tried to import forbidden items. Pay $2,000 to the Party House Bank.", type: "UNO", cashChange: -2000 },
  { id: "u3", text: "Beauty Contest Winner! You won 2nd prize. Collect $2,500 from the Bank.", type: "UNO", cashChange: 2500 },
  { id: "u4", text: "Excursion Trip: Pay $200 to every other active player.", type: "UNO", payAll: 200 },
  { id: "u5", text: "Receive $1,000 for crying.", type: "UNO", cashChange: 1000 },
  { id: "u6", text: "Donation to Charity. Pay $1,000 to the Party House Bank.", type: "UNO", cashChange: -1000 },
  { id: "u7", text: "Salary Bonus. Collect $2,000 from the Bank.", type: "UNO", cashChange: 2000 },
  { id: "u8", text: "Go to Party House.", type: "UNO", goToPosition: 18 },
  { id: "u9", text: "Go directly to Jail. Do not pass Start, do not collect $1,500.", type: "UNO", goToJail: true },
  { id: "u10", text: "Submit your passport: Pay $5,000 to the Party Bank. Until paid, you cannot collect rent from other players or purchase property.", type: "UNO", submitPassport: true }
];

export interface UtilityPairInfo {
  partnerName: string;
  partnerIndex: number;
  rentAlone: number;
  rentPaired: number;
  partnerRentAlone: number;
  partnerRentPaired: number;
}

export const UTILITY_PAIRS: Record<string, UtilityPairInfo> = {
  "Railways": { partnerName: "Roadways", partnerIndex: 12, rentAlone: 1500, rentPaired: 2500, partnerRentAlone: 800, partnerRentPaired: 1500 },
  "Roadways": { partnerName: "Railways", partnerIndex: 2, rentAlone: 800, rentPaired: 1500, partnerRentAlone: 1500, partnerRentPaired: 2500 },
  "Airways": { partnerName: "Petroleum", partnerIndex: 7, rentAlone: 1500, rentPaired: 2500, partnerRentAlone: 500, partnerRentPaired: 1500 },
  "Petroleum": { partnerName: "Airways", partnerIndex: 25, rentAlone: 500, rentPaired: 1500, partnerRentAlone: 1500, partnerRentPaired: 2500 },
  "Waterways": { partnerName: "Satellite", partnerIndex: 30, rentAlone: 1400, rentPaired: 2200, partnerRentAlone: 500, partnerRentPaired: 1200 },
  "Satellite": { partnerName: "Waterways", partnerIndex: 35, rentAlone: 500, rentPaired: 1200, partnerRentAlone: 1400, partnerRentPaired: 2200 },
};

export const getCountryCode = (countryName: string): string => {
  const map: Record<string, string> = {
    "Saudi Arabia": "sa",
    "Malaysia": "my",
    "China": "cn",
    "Singapore": "sg",
    "Argentina": "ar",
    "Mexico": "mx",
    "USA": "us",
    "Australia": "au",
    "Japan": "jp",
    "India": "in",
    "Italy": "it",
    "Brazil": "br",
    "Switzerland": "ch",
    "South Africa": "za",
    "Germany": "de",
    "Canada": "ca",
    "Egypt": "eg",
    "Iran": "ir",
    "United Kingdom": "gb",
    "France": "fr",
  };
  return map[countryName] || "";
};


