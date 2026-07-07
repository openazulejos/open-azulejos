import fs from "node:fs";
import vm from "node:vm";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const source = fs.readFileSync(new URL("../admin-similarity.js", import.meta.url), "utf8");
const context = { globalThis: {}, Map, Promise };
vm.runInNewContext(source, context, { filename: "admin-similarity.js" });
const tools = context.globalThis.AdminSimilarityTools;

assert(tools.hammingSimilarity("0000", "0000") === 100, "identical perceptual hashes should score 100 percent");
assert(tools.hammingSimilarity("0000", "1111") === 0, "opposite perceptual hashes should score zero percent");
assert(tools.hammingSimilarity("0000", "0011") === 50, "perceptual similarity should reflect Hamming distance");
assert(tools.hammingSimilarity("0", "00") === null, "incompatible hashes should not receive a score");

const visuallyRanked = await tools.scoreRecords(
  {
    id: "reference",
    image_url: "reference.jpg",
    image_fingerprint: "0000000000000000000000000000000000000000000000000000000000000000",
  },
  [
    ...Array.from({ length: 55 }, (_, index) => ({
      id: `stored-${index}`,
      image_url: `stored-${index}.jpg`,
      image_fingerprint: "1111111111111111111111111111111111111111111111111111111111111111",
    })),
    {
      id: "stored-late-match",
      image_url: "stored-late-match.jpg",
      image_fingerprint: "0000000000000000000000000000000000000000000000000000000000000000",
    },
  ],
  { maxImageLoads: 0 },
);
assert(visuallyRanked[0].id === "stored-late-match", "stored fingerprints beyond the first 50 records should still be ranked");
assert(visuallyRanked[0].visual_similarity === 100, "stored exact fingerprint match should score 100 percent");

console.log("admin similarity tests passed");
