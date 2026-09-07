import { COMMON_DRUGS } from '../constants/drugs';
import { searchDrugInfo } from '../services/geminiService';
import fs from 'fs';

async function processBatch() {
  const batchSize = 1;
  const startIdx = 0; // Or whatever tracker
  
  const drugsToProcess = COMMON_DRUGS.slice(startIdx, startIdx + batchSize);
  console.log(`Starting to process ${drugsToProcess.length} drugs:`, drugsToProcess);

  const promises = drugsToProcess.map(async (drugName) => {
    try {
      console.log(`Fetching data for ${drugName}...`);
      // Calling our service to search and cache to Firestore
      await searchDrugInfo(drugName, 'en', null, false);
      console.log(`✅ Saved data for ${drugName}`);
    } catch (e) {
      console.error(`❌ Failed processing ${drugName}:`, e);
    }
  });

  await Promise.all(promises);
  console.log('Batch processing complete.');
  process.exit(0);
}

processBatch().catch((e) => {
  console.error(e);
  process.exit(1);
});
