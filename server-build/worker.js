// worker.ts
import cron from "node-cron";
async function checkPostponedDealsWorker() {
  console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] PM2 Worker: Spou\u0161t\xEDm kontrolu odlo\u017Een\xFDch p\u0159\xEDle\u017Eitost\xED...`);
  try {
    const now = /* @__PURE__ */ new Date();
    console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] PM2 Worker: Kontrola dokon\u010Dena.`);
  } catch (error) {
    console.error("Do\u0161lo k chyb\u011B p\u0159i kontrole dealov\xE1n\xED:", error);
  }
}
cron.schedule("0 1 0 * * *", () => {
  checkPostponedDealsWorker();
});
console.log("Worker pro kontrolu odlo\u017Een\xFDch p\u0159\xEDle\u017Eitost\xED spu\u0161t\u011Bn. (Napl\xE1nov\xE1no na 00:01 ka\u017Ed\xFD den)");
