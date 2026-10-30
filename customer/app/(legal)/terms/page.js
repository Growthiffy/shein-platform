import LegalDoc from "@/components/LegalDoc";

export const metadata = { title: "Terms of Service — Shein Global Ltd" };

const SECTIONS = [
  { h: "Account Eligibility", body: "You must be at least 18 years of age, or the age of majority in your jurisdiction, to open or hold an account with Shein Global Ltd. By registering you represent that you meet this requirement and that you are legally able to enter into this agreement." },
  { h: "Account Registration", body: "You agree to provide accurate, current, and complete information during registration and to keep it updated. You are responsible for safeguarding your login credentials and for all activity under your account. Notify us immediately of any unauthorized use." },
  { h: "Description of Platform Services", body: "Shein Global Ltd operates a members platform offering product market analysis tools, an analyst commission program, optional investment programs, community features, and related services. Features and availability may change over time." },
  { h: "Analyst Program Terms", body: "The analyst program allows members to review curated products and submit market assessments in exchange for commission. Commission rates depend on your level and the product. Submissions must represent genuine analysis; low-quality or automated submissions may be rejected or reversed." },
  { h: "Investment Program Terms", body: "Investment tiers lock a chosen amount for a defined period in exchange for scheduled returns. Returns are not guaranteed and are subject to the Risk Disclosure. Locked funds cannot be withdrawn before the lock period ends." },
  { h: "Deposits and Withdrawals", body: "Deposits and withdrawals are processed in supported assets and networks. Minimum and maximum limits, network fees, and processing times apply and may be adjusted. Withdrawals may require identity verification and are subject to review." },
  { h: "Fees", body: "Applicable fees, including network and processing fees, are displayed before you confirm a transaction. You are responsible for any third-party costs associated with the networks you use." },
  { h: "Prohibited Activities", body: "You may not use the platform for unlawful purposes, submit fraudulent analysis, operate multiple accounts to abuse rewards, attempt to manipulate balances, or interfere with the integrity or security of the services." },
  { h: "Intellectual Property", body: "All content, trademarks, software, and materials on the platform are owned by Shein Global Ltd or its licensors and are protected by law. You receive a limited, revocable, non-transferable license to use the platform for its intended purpose." },
  { h: "User Content", body: "You retain ownership of analysis and messages you submit but grant Shein Global Ltd a license to host, display, and use them to operate the services. You are responsible for content you post and must not post unlawful or infringing material." },
  { h: "Limitation of Liability", body: "To the maximum extent permitted by law, Shein Global Ltd is not liable for indirect, incidental, or consequential damages, or for losses arising from market conditions, third-party networks, or your use of the services." },
  { h: "Disclaimers", body: "The services are provided on an \"as is\" and \"as available\" basis without warranties of any kind. We do not guarantee uninterrupted access, specific earnings, or investment outcomes." },
  { h: "Indemnification", body: "You agree to indemnify and hold harmless Shein Global Ltd, its officers, and employees from claims arising out of your breach of these terms or misuse of the services." },
  { h: "Account Suspension and Termination", body: "We may suspend or terminate accounts that violate these terms, pose a security or compliance risk, or are inactive for an extended period. You may close your account at any time subject to settlement of outstanding balances." },
  { h: "Governing Law", body: "These terms are governed by the laws of the jurisdiction in which Shein Global Ltd is registered, without regard to conflict-of-law principles." },
  { h: "Dispute Resolution", body: "Disputes should first be raised with our support team. Where a dispute cannot be resolved informally, it will be settled through binding arbitration or the competent courts of our jurisdiction, as permitted by applicable law." },
  { h: "Modification of Terms", body: "We may update these terms from time to time. Material changes will be communicated through the platform. Continued use after changes take effect constitutes acceptance of the revised terms." },
  { h: "Contact Information", body: "Questions about these terms may be directed to our support team through the in-app Support section or at support@shein-global.com." },
];

export default function TermsPage() {
  return <LegalDoc title="Terms of Service" updated="October 2024"
    intro="Please read these Terms of Service carefully. They govern your access to and use of the Shein Global Ltd platform."
    sections={SECTIONS} />;
}
