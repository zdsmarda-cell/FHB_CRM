import cron from 'node-cron';

// Pomocná funkce pro kontrolu odložených příležitostí
// UPOZORNĚNÍ: V aktuální verzi aplikace jsou data ukládána pouze v paměti klienta (prohlížeče).
// Aby tento serverový worker mohl data reálně upravovat, je nutné napojit aplikaci
// na backend s databází (např. SQLite nebo Firebase).
async function checkPostponedDealsWorker() {
  console.log(`[${new Date().toISOString()}] PM2 Worker: Spouštím kontrolu odložených příležitostí...`);
  
  try {
    const now = new Date();
    
    // ZDE BUDE LOGIKA PRO NAČTENÍ DAT Z DATABÁZE
    // Např. const deals = await db.collection('deals').where('stage', '==', 'lost').get();
    
    // ZDE BUDE ITERACE A ÚPRAVA STAVU
    // const dealsToRestore = deals.filter(d => d.postponedUntil && new Date(d.postponedUntil) <= now && !d.lostPermanently);
    //
    // for (const deal of dealsToRestore) {
    //   await db.collection('deals').doc(deal.id).update({
    //     stage: 'lead',
    //     postponedUntil: null,
    //     postponedReason: null,
    //     postponedBy: null,
    //     postponedAt: null,
    //     updatedAt: now.toISOString()
    //   });
    //   console.log(`[Worker] Oživen deal: ${deal.id}`);
    // }
    
    console.log(`[${new Date().toISOString()}] PM2 Worker: Kontrola dokončena.`);
  } catch (error) {
    console.error('Došlo k chybě při kontrole dealování:', error);
  }
}

// Naplánování spuštění minutu po půlnoci každý den
// Formát: sekunda minuta hodina den-v-měsíci měsíc den-v-týdnu
// '0 1 0 * * *' znamená běžet v 00:01:00
cron.schedule('0 1 0 * * *', () => {
  checkPostponedDealsWorker();
});

console.log('Worker pro kontrolu odložených příležitostí spuštěn. (Naplánováno na 00:01 každý den)');
