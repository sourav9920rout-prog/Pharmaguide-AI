import { RAW_DRUGS } from '../constants/drugs';
import { searchDrugInfo } from '../services/geminiService';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function syncAll() {
  console.log('Fetching existing drugs from Firestore...');
  
  const COMMON_DRUGS = RAW_DRUGS.split(',').map(s => s.trim()).filter(s => s.length > 0);
  
  let existingDrugs = new Set();
  try {
    const snapshot = await getDocs(collection(db, 'drugs_v3'));
    snapshot.forEach(doc => {
      existingDrugs.add(doc.id);
    });
    console.log(`Found ${existingDrugs.size} drugs already in database.`);
    console.log(`Sample ID from DB: ${Array.from(existingDrugs)[0]}`);
  } catch (e) {
    console.error('Failed to fetch existing drugs:', e);
  }

  const safeId = (id: string) => id.trim().toLowerCase().replace(/[,/]/g, '').replace(/\s+/g, ' ');

  const drugsToSync = COMMON_DRUGS.filter(drug => {
    const id = safeId(drug);
    return !existingDrugs.has(id);
  });

  console.log(`Remaining drugs to sync: ${drugsToSync.length}`);
  console.log(`First 5 drugs to sync (as IDs): ${drugsToSync.slice(0, 5).map(safeId).join(', ')}`);
  console.log(`Sample ID from DB: ${Array.from(existingDrugs)[0]}`);

  let success = 0;
  let skipped = 0;
  let errors = 0;
  
  for (let i = 0; i < drugsToSync.length; i++) {
    const drug = drugsToSync[i];
    let retryCount = 0;
    while (retryCount < 3) {
      try {
        const startTime = Date.now();
        const res = await searchDrugInfo(drug, 'en', null, false);
        const elapsed = Date.now() - startTime;
        
        if (elapsed < 1500) {
          skipped++;
          console.log(`[${i+1}/${drugsToSync.length}] ⏭️ Skipped/Cached ${drug} (took ${elapsed}ms)`);
        } else {
          success++;
          console.log(`[${i+1}/${drugsToSync.length}] ✅ Synced ${drug} (took ${elapsed}ms)`);
          // 9 seconds delay to stay well under 15 RPM (since it might make 2 calls)
          await new Promise(r => setTimeout(r, 9000));
        }
        break; // Success, break out of retry loop
        
      } catch (e: any) {
        if (e.message && e.message.includes('429')) {
          console.log(`[${i+1}/${drugsToSync.length}] ⚠️ Quota hit on ${drug}, waiting 65s...`);
          await new Promise(r => setTimeout(r, 65000));
          retryCount++;
        } else {
          errors++;
          console.error(`[${i+1}/${drugsToSync.length}] ❌ Error syncing ${drug}: ${e.message}`);
          await new Promise(r => setTimeout(r, 5000));
          break; // Other error, break out of retry loop
        }
      }
    }
    if (retryCount >= 3) {
      console.log(`[${i+1}/${drugsToSync.length}] ❌ Failed to sync ${drug} after 3 retries.`);
      errors++;
    }
  }
  
  console.log(`Sync complete! Success: ${success}, Skipped: ${skipped}, Errors: ${errors}`);
  process.exit(0);
}

syncAll();
