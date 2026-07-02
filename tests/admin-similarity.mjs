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

console.log("admin similarity tests passed");
