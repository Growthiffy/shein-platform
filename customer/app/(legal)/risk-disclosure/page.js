import LegalDoc from "@/components/LegalDoc";

export const metadata = { title: "Risk Disclosure — Shein Global Ltd" };

const SECTIONS = [
  { h: "General Investment Risk", body: "All investment involves risk. The value of investment products offered on the platform can go down as well as up, and you may receive back less than you committed. Only commit funds you can afford to have locked for the full term." },
  { h: "No Guaranteed Returns", body: "Projected or advertised weekly returns are targets, not promises. Returns are not guaranteed and may vary or be suspended depending on market and platform conditions." },
  { h: "Market Volatility", body: "Markets and the underlying assets can be volatile. Prices and demand may change rapidly and unpredictably, which can affect commissions, returns, and the value of balances held in volatile assets." },
  { h: "Past Performance", body: "Any historical figures shown are for illustration only. Past performance is not a reliable indicator of future results." },
  { h: "Lock Periods and Liquidity", body: "Investment tiers lock funds for a defined period. During the lock you cannot withdraw the committed amount. Consider your liquidity needs before locking funds." },
  { h: "Maximum Loss", body: "In adverse conditions you could lose the entire amount you invest. Do not invest borrowed money or funds needed for essential expenses." },
  { h: "Currency and Network Risk", body: "Deposits and withdrawals in crypto assets carry additional risks, including price fluctuation, irreversible transactions, and network congestion or fees outside our control." },
  { h: "No Personalized Advice", body: "Shein Global Ltd does not provide personalized investment, tax, or financial advice. Information on the platform is general in nature. Seek independent professional advice before making decisions." },
  { h: "Your Responsibility", body: "You are solely responsible for assessing the suitability of any program for your circumstances and for the decisions you make on the platform." },
];

export default function RiskPage() {
  return <LegalDoc title="Investment Risk Disclosure" updated="October 2024"
    intro="This disclosure describes key risks of the investment products offered by Shein Global Ltd. Read it carefully before committing funds."
    sections={SECTIONS} />;
}
