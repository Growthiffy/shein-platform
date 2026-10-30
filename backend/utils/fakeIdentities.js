// A deterministic pool of 400 fabricated "members" used for social proof across
// the live payouts ticker, the live activity feed and the weekly leaderboard —
// so the platform looks busy without exposing real members to each other.
// Country mix is weighted: mostly US / UK / Canada, with fewer Middle-Eastern,
// Asian, Indian and Pakistani members. Each identity has a name, country+flag and
// a real-looking avatar photo (randomuser.me portraits).

const REGIONS = [
  { w: 32, country: "US", flag: "🇺🇸", first: ["James","Michael","Robert","David","John","Daniel","Matthew","Andrew","Joshua","Ryan","Emily","Olivia","Emma","Ava","Sophia","Madison","Ashley","Jessica","Hannah","Grace","Ethan","Mason","Logan","Jacob","Chloe","Abigail","Nathan","Tyler","Brandon","Kayla"] },
  { w: 20, country: "UK", flag: "🇬🇧", first: ["Oliver","Harry","George","Jack","Charlie","Thomas","William","Henry","Freddie","Alfie","Amelia","Isla","Poppy","Ella","Freya","Charlotte","Evie","Daisy","Florence","Sienna","Archie","Oscar","Leo","Theo","Harriet","Lola","Millie","Max","Elsie","Rosie"] },
  { w: 18, country: "CA", flag: "🇨🇦", first: ["Liam","Noah","Lucas","Benjamin","Jackson","Owen","Nathan","Hunter","Nolan","Felix","Charlotte","Chloe","Zoey","Hannah","Léa","Camille","Maeve","Aria","Nora","Elena","Gabriel","Samuel","William","Jack","Olivia","Emma","Sophie","Alice","Juliette","Victoria"] },
  { w: 7,  country: "AU", flag: "🇦🇺", first: ["Jack","Oliver","Noah","Cooper","Lachlan","Hudson","Archer","Lincoln","Hunter","Mason","Charlotte","Mia","Harper","Ruby","Scarlett","Isla","Zoe","Chloe","Willow","Matilda"] },
  { w: 5,  country: "UAE", flag: "🇦🇪", first: ["Omar","Khalid","Faisal","Hamdan","Rashid","Saif","Tariq","Yousef","Layla","Noura","Mariam","Salma","Hessa","Aisha","Fatima","Reem"] },
  { w: 5,  country: "IN", flag: "🇮🇳", first: ["Arjun","Rohan","Aditya","Vikram","Rahul","Karan","Aryan","Ishaan","Priya","Ananya","Diya","Riya","Meera","Kavya","Neha","Pooja"] },
  { w: 5,  country: "PK", flag: "🇵🇰", first: ["Ali","Hassan","Bilal","Usman","Hamza","Ahmed","Fahad","Zain","Ayesha","Fatima","Hira","Sana","Maryam","Noor","Zara","Sara"] },
  { w: 4,  country: "SG", flag: "🇸🇬", first: ["Wei","Jun","Ming","Hao","Yong","Zhi","Mei","Hui","Ling","Xin","Kai","Jia","Ryan","Ethan","Chloe","Faith"] },
  { w: 4,  country: "SA", flag: "🇸🇦", first: ["Abdullah","Mohammed","Sultan","Nasser","Majed","Turki","Lama","Haya","Jana","Rand","Ghala","Sara"] },
];

function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; return h >>> 0; }

// Build a weighted region index so picks follow the weights deterministically.
const WEIGHTED = [];
REGIONS.forEach((r, i) => { for (let k = 0; k < r.w; k++) WEIGHTED.push(i); });

const SIZE = 400;
let CACHE = null;

function build() {
  const out = [];
  for (let i = 0; i < SIZE; i++) {
    const h = hash("shein-member-" + i);
    const region = REGIONS[WEIGHTED[h % WEIGHTED.length]];
    const first = region.first[(h >> 3) % region.first.length];
    const lastInit = String.fromCharCode(65 + ((h >> 7) % 26));
    const female = (h >> 11) % 2 === 0;
    const portrait = (h >> 5) % 100;
    out.push({
      id: "m" + i,
      name: `${first} ${lastInit}.`,
      country: region.country,
      flag: region.flag,
      avatar: `https://randomuser.me/api/portraits/${female ? "women" : "men"}/${portrait}.jpg`,
    });
  }
  return out;
}

function pool() { if (!CACHE) CACHE = build(); return CACHE; }

// Pick an identity by a numeric key (stable per key).
function identity(key) { const p = pool(); return p[Math.abs(Number(key) || 0) % p.length]; }

// A plausible-looking wallet address, stable per key (used for fabricated entries).
function fakeAddress(key) {
  let h = hash("addr-" + key);
  const hex = "0123456789abcdef";
  let body = "";
  for (let i = 0; i < 40; i++) { h = (Math.imul(31, h) + 17) | 0; body += hex[(h >>> (i % 5)) & 15]; }
  return "0x" + body;
}

// Identity shown for a REAL member's own entries: their real name + avatar, with a
// stable fabricated country/flag (we don't store member country) for display parity.
function selfIdentity(user) {
  const base = user.username || (user.email ? user.email.split("@")[0] : "member");
  const name = base.charAt(0).toUpperCase() + base.slice(1).replace(/[0-9._-].*$/, "");
  const id = identity(hash(String(user._id || user.id || base)));
  return { name, avatar: user.avatar || id.avatar, flag: id.flag, country: id.country, self: true };
}

module.exports = { pool, identity, fakeAddress, selfIdentity, SIZE };
