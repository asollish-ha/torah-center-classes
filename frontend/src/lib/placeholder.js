// 4 seeded diagonal-stripe placeholder variants (navy/teal at low opacity),
// used whenever a class has no real thumbnail/artwork yet.
const VARIANTS = [
  "repeating-linear-gradient(45deg, rgba(9,72,115,0.12) 0 10px, rgba(9,72,115,0.05) 10px 20px)",
  "repeating-linear-gradient(45deg, rgba(6,122,137,0.14) 0 10px, rgba(6,122,137,0.05) 10px 20px)",
  "repeating-linear-gradient(-45deg, rgba(9,72,115,0.1) 0 10px, rgba(6,122,137,0.08) 10px 20px)",
  "repeating-linear-gradient(-45deg, rgba(6,122,137,0.1) 0 10px, rgba(9,72,115,0.06) 10px 20px)",
];

export function placeholderStyle(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return { backgroundImage: VARIANTS[hash % VARIANTS.length], backgroundColor: "#EEE7DA" };
}
