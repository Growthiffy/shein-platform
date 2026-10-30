import LegalDoc from "@/components/LegalDoc";

export const metadata = { title: "Privacy Policy — Shein Global Ltd" };

const SECTIONS = [
  { h: "Information We Collect", body: "We collect information you provide directly — such as your email, username, phone, verification details, and payout addresses — as well as information generated through your use of the platform, including analysis submissions, transactions, and device and log data." },
  { h: "How We Use Information", body: "We use your information to operate and secure the platform, process deposits and withdrawals, calculate commissions and returns, provide support, meet legal and compliance obligations, and improve our services." },
  { h: "Legal Basis for Processing", body: "Where the GDPR applies, we process personal data on the basis of contract performance, our legitimate interests in running the platform securely, your consent where required, and compliance with legal obligations." },
  { h: "Data Sharing", body: "We do not sell your personal data. We share it only with service providers who help us operate the platform, with regulators or authorities where legally required, and in connection with a corporate transaction, always under appropriate safeguards." },
  { h: "Cookies and Similar Technologies", body: "We use essential cookies and local storage to keep you signed in and to remember preferences. Non-essential tracking is minimized; where consent is required, we request it and respect your choice." },
  { h: "Data Retention", body: "We retain personal data for as long as your account is active and thereafter only as needed to meet legal, accounting, compliance, or dispute-resolution requirements." },
  { h: "Your Rights", body: "Subject to applicable law, including the GDPR, you may request access to, correction of, or deletion of your personal data, object to or restrict certain processing, and request portability. Contact us to exercise these rights." },
  { h: "International Transfers", body: "Your data may be processed in countries other than your own. Where it is transferred internationally, we rely on recognized safeguards such as standard contractual clauses." },
  { h: "Security Measures", body: "We apply technical and organizational measures including encryption in transit, access controls, and monitoring. No system is perfectly secure, so we also rely on your care in protecting your credentials." },
  { h: "Children's Privacy", body: "The platform is not directed to anyone under 18. We do not knowingly collect data from minors, and we will delete such data if we become aware of it." },
  { h: "Changes to This Policy", body: "We may update this policy periodically. Material changes will be communicated through the platform, and the \"last updated\" date above will reflect the revision." },
  { h: "Contact Us", body: "For privacy questions or to exercise your rights, contact our Data Protection team through in-app Support or at support@shein-global.com." },
];

export default function PrivacyPage() {
  return <LegalDoc title="Privacy Policy" updated="October 2024"
    intro="This Privacy Policy explains how Shein Global Ltd collects, uses, and protects your personal data, in line with the GDPR and other applicable laws."
    sections={SECTIONS} />;
}
