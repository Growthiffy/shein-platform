import LegalDoc from "@/components/LegalDoc";

export const metadata = { title: "AML Policy — Shein Global Ltd" };

const SECTIONS = [
  { h: "Purpose and Scope", body: "Shein Global Ltd is committed to preventing money laundering and the financing of illegal activity. This policy sets out the controls we apply across deposits, withdrawals, and member activity." },
  { h: "Know Your Customer (KYC)", body: "Members are subject to identity verification appropriate to their activity and withdrawal levels. We may request your full name, country, contact details, and government-issued identification before enabling higher transaction limits." },
  { h: "Customer Due Diligence", body: "We perform due diligence at onboarding and on an ongoing basis. Enhanced due diligence may apply to higher-risk members, large transactions, or unusual patterns of activity." },
  { h: "Transaction Monitoring", body: "Transactions are monitored for indicators of suspicious activity, including structuring, rapid movement of funds, and inconsistencies between activity and member profile." },
  { h: "Suspicious Activity Reporting", body: "Where we identify activity that may indicate money laundering or other financial crime, we will investigate and, where required, report it to the relevant authorities without notifying the member." },
  { h: "Sanctions Screening", body: "We screen members and transactions against applicable sanctions and watchlists and will decline or freeze activity involving sanctioned persons or jurisdictions." },
  { h: "Record Keeping", body: "We retain identity, verification, and transaction records for the period required by applicable law and make them available to regulators on request." },
  { h: "Compliance Officer", body: "Our Chief Compliance Officer is responsible for this program, staff training, and liaison with authorities. Compliance concerns may be raised through in-app Support." },
  { h: "Member Cooperation", body: "Members must provide requested verification information promptly. Failure to do so, or provision of false information, may result in restricted access, withheld withdrawals, or account closure." },
];

export default function AmlPage() {
  return <LegalDoc title="Anti-Money Laundering Policy" updated="October 2024"
    intro="This policy describes how Shein Global Ltd meets its anti-money laundering and counter-terrorist-financing obligations."
    sections={SECTIONS} />;
}
