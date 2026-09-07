import { GoogleGenAI, Type } from "@google/genai";
import { getFromCache, saveToHistory } from "./historyService";
import { UserProfile } from "../hooks/useUserProfile";
import { db } from "../lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, limit } from "firebase/firestore";

const safeId = (id: string) => id.replace(/\//g, '_');

// Dictionary of common brand/alternative names to generic names to bypass AI resolution
export const BRAND_TO_GENERIC_MAP: Record<string, string> = {
  'rifadin': 'rifampicin',
  'rifampin': 'rifampicin',
  'rimactane': 'rifampicin',
  'tylenol': 'acetaminophen',
  'paracetamol': 'acetaminophen',
  'panadol': 'acetaminophen',
  'advil': 'ibuprofen',
  'motrin': 'ibuprofen',
  'lipitor': 'atorvastatin',
  'lasix': 'furosemide',
  'xanax': 'alprazolam',
  'zoloft': 'sertraline',
  'prozac': 'fluoxetine',
  'glucophage': 'metformin',
  'norvasc': 'amlodipine',
  'lisinopril': 'lisinopril',
  'crestor': 'rosuvastatin',
  'warfarin': 'warfarin',
  'coumadin': 'warfarin',
  'nexium': 'esomeprazole',
  'plavix': 'clopidogrel',
  'singulair': 'montelukast',
  'synthroid': 'levothyroxine',
  'ventolin': 'albuterol',
  'proair': 'albuterol',
  'amoxil': 'amoxicillin',
  'augmentin': 'amoxicillin-clavulanate',
  'zithromax': 'azithromycin',
  'celflox': 'ciprofloxacin',
  'cipro': 'ciprofloxacin',
  'neurontin': 'gabapentin',
  'lyrica': 'pregabalin',
  'ativan': 'lorazepam',
  'valium': 'diazepam',
  'klonopin': 'clonazepam',
};

const getAI = () => {
  let userApiKey = null;
  try {
    if (typeof localStorage !== 'undefined') {
      userApiKey = localStorage.getItem('user_gemini_api_key');
    }
  } catch (e) {
    // Ignore access errors
  }
  const apiKey = userApiKey || process.env.GEMINI_API_KEY || "";

  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please add it in Settings.");
  }

  return new GoogleGenAI({ 
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

export const getGenericName = async (drugName: string, forceRegenerate: boolean = false): Promise<string> => {
  const normName = drugName.trim().toLowerCase();

  // 1. Local synonym lookup
  if (BRAND_TO_GENERIC_MAP[normName]) {
    return BRAND_TO_GENERIC_MAP[normName];
  }

  // 2. Check brand_map cache
  if (!forceRegenerate) {
    try {
       const docRef = doc(db, 'brand_map_v2', safeId(normName));
       const docSnap = await getDoc(docRef);
       if (docSnap.exists()) {
         return docSnap.data().genericName;
       }
    } catch (e) {
      console.error("Firestore brand_map check failed", e);
    }

    // 3. Check if the input is already a generic name (or exact match) stored in drugs_v3
    try {
       const docRef = doc(db, 'drugs_v3', safeId(normName));
       const docSnap = await getDoc(docRef);
       if (docSnap.exists()) {
         return normName;
       }
    } catch (e) {
      console.error("Firestore drugs_v3 check in getGenericName failed", e);
    }

    // 4. Check if normName matches any brandNamesLower in drugs_v3
    try {
      const q = query(
        collection(db, 'drugs_v3'),
        where('brandNamesLower', 'array-contains', normName),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const genName = snap.docs[0].id;
        try {
          await setDoc(doc(db, 'brand_map_v2', safeId(normName)), {
            brandName: normName,
            genericName: genName
          });
        } catch (_) {}
        return genName;
      }
    } catch (e) {
      console.error("Firestore query brandNamesLower failed", e);
    }

    // 5. Prefix/Substring query fallback inside drugs_v3 to avoid AI call
    if (normName.length >= 4) {
      try {
        const startText = normName.substring(0, 5);
        const endText = startText + '\uf8ff';
        const q = query(
          collection(db, 'drugs_v3'),
          where('name', '>=', startText),
          where('name', '<=', endText),
          limit(10)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          for (const docSnap of snap.docs) {
            const genName = docSnap.id;
            if (genName.includes(normName) || normName.includes(genName)) {
              return genName;
            }
          }
          return snap.docs[0].id;
        }
      } catch (e) {
        console.error("Firestore smart queries in getGenericName failed", e);
      }
    }
  }

  // 6. Ask AI (Gemini Flash)
  const ai = getAI();
  const prompt = `Return ONLY the Active Pharmaceutical Ingredient (generic name) in English for the drug "${drugName}". If the input is in a foreign language or is a brand/trade name, interpret it and map it to the corresponding English generic name. If the provided name is already the generic name, return it as is. Do not provide any other text.`;
  
  const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
  });
  
  const genericName = response.text.trim().toLowerCase();
  
  // Persist to brand_map for offline resolution
  try {
     await setDoc(doc(db, 'brand_map_v2', safeId(normName)), { brandName: normName, genericName: genericName });
  } catch (e) {
       console.error("Firestore brand_map persistence failed", e);
  }
  
  return genericName;
}

export const getRecallInfo = async (genericName: string): Promise<{recalled: boolean, info: string}> => {
  // Check recalls_v1 cache
  try {
     const docRef = doc(db, 'recalls_v1', safeId(genericName.toLowerCase()));
     const docSnap = await getDoc(docRef);
     if (docSnap.exists()) {
       return docSnap.data().data;
     }
  } catch (e) {
    console.error("Firestore recalls_v1 check failed", e);
  }

  // Ask AI
  const ai = getAI();
  const prompt = `Check if the drug "${genericName}" has any active public health recalls. Return a JSON object with: { "recalled": boolean, "info": string }. "info" should be a brief summary of the recall if it's recalled (or empty if not). Do not provide any other text.`;
  
  const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
  });
  
  let result;
  try {
     result = JSON.parse(response.text.match(/\{[\s\S]*\}/)?.[0] || response.text);
  } catch (e) {
     result = { recalled: false, info: "" };
  }

  // Persist to recalls_v1
  try {
     await setDoc(doc(db, 'recalls_v1', safeId(genericName.toLowerCase())), { data: result, lastAccessed: serverTimestamp() });
  } catch (e) {
       console.error("Firestore recalls_v1 persistence failed", e);
  }
  
  return result;
}

export const searchDrugInfo = async (
  drugName: string, 
  targetLang: string = 'en', 
  userProfile?: UserProfile | null,
  forceRegenerate: boolean = false
) => {
  const normName = drugName.trim().toLowerCase();
  
  if (!forceRegenerate) {
    // 1. Try checking drugs_v3 directly with lowercase brand/generic name
    try {
      const docRef = doc(db, 'drugs_v3', safeId(normName));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const cachedData = docSnap.data().data;
        if (!cachedData.genericName) cachedData.genericName = normName;
        return cachedData;
      }
    } catch (e) {
      console.error("Firestore direct check failed", e);
    }

    // 2. Try checking brand_map_v2 to immediately resolve brand name without AI
    try {
      const brandDoc = await getDoc(doc(db, 'brand_map_v2', safeId(normName)));
      if (brandDoc.exists()) {
        const resolvedGeneric = brandDoc.data().genericName;
        if (resolvedGeneric) {
          const genDocRef = doc(db, 'drugs_v3', safeId(resolvedGeneric));
          const genDocSnap = await getDoc(genDocRef);
          if (genDocSnap.exists()) {
            const cachedData = genDocSnap.data().data;
            if (!cachedData.genericName) cachedData.genericName = resolvedGeneric;
            return cachedData;
          }
        }
      }
    } catch (e) {
      console.error("Firestore brand_map_v2 check failed", e);
    }
  }

  const genericName = await getGenericName(drugName, forceRegenerate);
  const profileHash = userProfile ? `${userProfile.name}_${userProfile.age}_${userProfile.sex}_${userProfile.medications}` : 'none';
  const cacheKey = `${genericName}_${targetLang}_${profileHash}`;
  
  if (!forceRegenerate) {
    const cached = getFromCache('drug', cacheKey);
    if (cached && cached.offLabelUses && cached.interactions) return cached;
    
    // Check Firestore under generic ID
    try {
      const docRef = doc(db, 'drugs_v3', safeId(genericName));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const cachedData = docSnap.data().data;
        saveToHistory('drug', drugName, cachedData, cacheKey);
        return cachedData;
      }
    } catch (e) {
      console.error("Firestore cache check failed", e);
    }
  }

  const ai = getAI();
  
  const langMap: Record<string, string> = {
    'en': 'English',
    'hi': 'Hindi',
    'bn': 'Bengali',
    'or': 'Odia'
  };
  const langName = langMap[targetLang] || 'English';
  
  const toneInstruction = "Maintain a professional, clinical tone.";
  
  const langInstruction = targetLang !== 'en' 
    ? `Write the final text in ${langName}. However, ALL JSON keys MUST remain exactly in English as defined by the schema. Medical enums like 'severity' (SEVERE, MODERATE, MILD) MUST remain in English.` 
    : "Write the response in English.";

  const profileInstruction = userProfile && userProfile.medications.trim() 
    ? `\n\nUSER PROFILE PROVIDED: The user investigating this drug is named ${userProfile.name}, Age: ${userProfile.age}, Sex: ${userProfile.sex}. They are currently taking the following medications: "${userProfile.medications}". \n\nYou MUST include a 'personalizedAdvice' object in your output JSON. In that object, specifically address whether it is safe for them to take this new medicine (${genericName}) along with their current medications. Explicitly name the current medications they are taking in the 'relevantMedications' array and explain any potential interactions.` 
    : "";

  const prompt = `Provide detailed clinical information for the drug "${genericName}". Include pharmacological and therapeutic classes in the 'category' array. Include mechanism of action, timing, dosage, safety profile, common off-label uses, a list of common severe, moderate, and mild interactions this drug has with other medications, and significant food or substance interactions. 
 
CRITICAL: Include an extensive list of all known commercial brand names, trade names, and proprietary market names worldwide for this drug in the 'brandNames' array (for example: for Acetaminophen include Tylenol, Panadol, Calpol, Paracetamol; for Ibuprofen include Advil, Motrin, Nurofen; for Atorvastatin include Lipitor, Torvast; for Metformin include Glucophage; for Furosemide include Lasix; for Omeprazole include Prilosec; for Lisinopril include Prinivil, Zestril).
CRITICAL: In the 'interactions' and 'foodInteractions' arrays, you MUST PRIORITIZE and ALWAYS include any known SEVERE interactions first, followed by MODERATE and then MILD. If severe interactions exist, they MUST be present.
CRITICAL: You MUST use the Active Pharmaceutical Ingredient (API) / generic name for the primary drug 'name' field and all 'interactingDrug' fields. Even if the user searched for a brand name, translate it to the API name. You can include the brand name in the description or genericName field.

Crucially, you MUST ALWAYS provide at least 2 to 3 important food, nutrient, or lifestyle interactions (including ALWAYS listing severe and moderate ones, e.g., interactions with broccoli and other greens, grapefruit, dairy, alcohol, etc.). ONLY include off-label uses that are supported by research, evidence, or clinical guidelines. Also specify if there are any active public health recalls in the 'recall' object with { recalled: boolean, info: string }.
${profileInstruction}
${toneInstruction}
${langInstruction}`;

  const schemaProperties: any = {
    id: { type: Type.STRING },
    name: { type: Type.STRING },
    genericName: { type: Type.STRING },
    brandNames: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of common commercial brand names and trade names worldwide for this drug"
    },
    category: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    description: { type: Type.STRING },
    mechanism: { type: Type.STRING },
    primaryUse: { type: Type.STRING },
    timing: {
      type: Type.OBJECT,
      properties: {
        frequency: { type: Type.STRING },
        food: { type: Type.STRING },
        note: { type: Type.STRING }
      },
      required: ["frequency", "food", "note"]
    },
    dosage: {
      type: Type.OBJECT,
      properties: {
        adult: { type: Type.STRING },
        pediatric: { type: Type.STRING },
        max: { type: Type.STRING }
      },
      required: ["adult", "pediatric", "max"]
    },
    safety: {
      type: Type.OBJECT,
      properties: {
        common: { type: Type.STRING },
        serious: { type: Type.STRING }
      },
      required: ["common", "serious"]
    },
    riskProfile: { type: Type.STRING, description: "Must be LOW RISK, MEDIUM RISK, or HIGH RISK" },
    recall: {
      type: Type.OBJECT,
      properties: {
        recalled: { type: Type.BOOLEAN },
        info: { type: Type.STRING }
      },
      required: ["recalled", "info"]
    },
    offLabelUses: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          use: { type: Type.STRING },
          explanation: { type: Type.STRING },
          reference: { type: Type.STRING }
        },
        required: ["use", "explanation", "reference"]
      }
    },
    interactions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          interactingDrug: { type: Type.STRING },
          severity: { type: Type.STRING, description: "Must be SEVERE, MODERATE, or MILD" },
          clinicalFinding: { type: Type.STRING }
        },
        required: ["interactingDrug", "severity", "clinicalFinding"]
      }
    },
    foodInteractions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          foodOrSubstance: { type: Type.STRING },
          severity: { type: Type.STRING, description: "Must be SEVERE, MODERATE, or MILD" },
          clinicalFinding: { type: Type.STRING }
        },
        required: ["foodOrSubstance", "severity", "clinicalFinding"]
      }
    }
  };

  const requiredFields = ["id", "name", "genericName", "brandNames", "category", "description", "mechanism", "primaryUse", "timing", "dosage", "safety", "riskProfile", "recall", "offLabelUses", "interactions", "foodInteractions"];

  if (userProfile && userProfile.medications.trim()) {
    schemaProperties.personalizedAdvice = {
      type: Type.OBJECT,
      properties: {
        relevantMedications: { type: Type.ARRAY, items: { type: Type.STRING } },
        hasInteractions: { type: Type.BOOLEAN },
        message: { type: Type.STRING }
      },
      required: ["relevantMedications", "hasInteractions", "message"]
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: schemaProperties,
          required: requiredFields
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
         result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse drug information.");
      }
    }
    
    const brandList: string[] = Array.isArray(result.brandNames) 
      ? result.brandNames.map((b: any) => String(b).trim()).filter(Boolean)
      : [];
    result.brandNames = brandList;

    saveToHistory('drug', drugName, result, cacheKey);

    // Persist to Firestore drugs_v3 and index brand names
    try {
      await setDoc(doc(db, 'drugs_v3', safeId(genericName)), { 
        name: genericName, 
        brandNames: brandList,
        brandNamesLower: brandList.map(b => b.toLowerCase()),
        data: result, 
        lastAccessed: serverTimestamp() 
      });

      // Auto-register each brand name into brand_map_v2 for instant lookup
      for (const brand of brandList) {
        const cleanBrand = brand.trim().toLowerCase();
        if (cleanBrand && cleanBrand !== genericName) {
          try {
            await setDoc(doc(db, 'brand_map_v2', safeId(cleanBrand)), {
              brandName: cleanBrand,
              genericName: genericName,
              createdAt: serverTimestamp()
            });
          } catch (_) {
            // Ignore single brand indexing failure
          }
        }
      }

      // Also persist recall info
      if (result.recall) {
        try {
          await setDoc(doc(db, 'recalls_v1', safeId(genericName)), {
            data: result.recall,
            lastAccessed: serverTimestamp()
          });
        } catch (_) {}
      }
    } catch (e) {
      console.error("Firestore persistence failed", e);
    }
    
    return result;
  } catch (error: any) {
    throw new Error(error.message || "An error occurred while fetching drug information.");
  }
};

export const translateDrugInfo = async (drug: any, targetLang: string, forceRegenerate: boolean = false) => {
  const normId = drug.id || drug.name.toLowerCase();
  const cacheKey = `${normId}_${targetLang}`;
  
  if (!forceRegenerate) {
    const cached = getFromCache('drug_translation', cacheKey);
    if (cached) return cached;

    // Check permanent Firestore Cache to avoid repetitive translations
    try {
      const docRef = doc(db, 'translations_v3', safeId(cacheKey));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const cachedTranslation = docSnap.data().data;
        saveToHistory('drug_translation', `${drug.name} translation`, cachedTranslation, cacheKey);
        return cachedTranslation;
      }
    } catch (e) {
      console.error("Firestore translation cache check failed", e);
    }
  }

  const ai = getAI();
  const toneInstruction = "5. Maintain a professional, clinical tone in the translated text.";

  const prompt = `Translate the following JSON object representing clinical drug information into ${targetLang}. 
Rules:
1. Maintain the EXACT SAME JSON structure and keys. Do NOT translate the keys.
2. Translate all string values EXCEPT for the following fields, which MUST remain in English: 'id', 'riskProfile', 'severity'.
3. The 'category' and 'relevantMedications' array strings can be translated if appropriate, but keeping medical names exactly as is is often preferred unless a local equivalent is commonly known.
4. Ensure medical terminology is appropriately translated or transliterated into ${targetLang}.
${toneInstruction}

JSON to translate:
${JSON.stringify(drug)}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI for translation.");
    
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      const jsonMatch = text?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse translation results.");
      }
    }
    
    // Ensure critical enums and structure are preserved
    result.id = drug.id;
    result.imageUrl = drug.imageUrl; // keep image URL
    
    if (result.interactions) {
       result.interactions.forEach((inter: any, idx: number) => {
          if (drug.interactions[idx]) inter.severity = drug.interactions[idx].severity;
       });
    }
    if (result.foodInteractions) {
       result.foodInteractions.forEach((inter: any, idx: number) => {
          if (drug.foodInteractions[idx]) inter.severity = drug.foodInteractions[idx].severity;
       });
    }
    result.riskProfile = drug.riskProfile;
    
    if (drug.personalizedAdvice && !result.personalizedAdvice) {
        result.personalizedAdvice = drug.personalizedAdvice; // Fallback
    }

    saveToHistory('drug_translation', `${drug.name} translation`, result, cacheKey);

    // Save permanently in Firestore translations_v3
    try {
      await setDoc(doc(db, 'translations_v3', safeId(cacheKey)), { data: result, lastAccessed: serverTimestamp() });
    } catch (e) {
      console.error("Firestore translation persistence failed", e);
    }

    return result;
  } catch (error: any) {
    console.error("Translation Error:", error);
    throw new Error(error.message || "An error occurred while translating.");
  }
};

export const checkInteractions = async (drugs: string[], forceRegenerate: boolean = false) => {
  const genericDrugs = await Promise.all(drugs.map(d => getGenericName(d, forceRegenerate)));
  const queryStr = genericDrugs.sort().join(', ');
  
  if (!forceRegenerate) {
    const cached = getFromCache('interaction', queryStr);
    if (cached) return cached;
    
    // Check Firestore
    try {
      const docRef = doc(db, 'interactions_v3', safeId(queryStr));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const cachedData = docSnap.data().data;
        saveToHistory('interaction', queryStr, cachedData);
        return cachedData;
      }
    } catch (e) {
      console.error("Firestore interaction cache check failed", e);
    }
  }

  const ai = getAI();
  
  const prompt = `Analyze potential drug-drug interactions between these medications: ${drugs.join(', ')}. 
CRITICAL: You MUST use the Active Pharmaceutical Ingredient (API) / generic names for all drugs in your response, even if the user provided brand names.
Critically evaluate interactions for all combinations when multiple drugs are provided. You MUST base your analysis ONLY on reliable clinical sources such as PubMed, ResearchGate, or official medical guidelines. DO NOT use Wikipedia as a source. If there is no documented interaction data available in genuine clinical sources, clearly state 'Data not available' for the clinicalFinding and set hasInteraction to false with NONE severity.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hasInteraction: { type: Type.BOOLEAN },
            severity: { type: Type.STRING, description: "Must be SEVERE, MODERATE, MINOR, or NONE" },
            clinicalFinding: { type: Type.STRING },
            explanation: { type: Type.STRING },
            monitoring: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  description: { type: Type.STRING }
                }
              }
            }
          },
          required: ["hasInteraction", "severity", "clinicalFinding", "explanation", "monitoring"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
         result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse interaction results.");
      }
    }
    
    saveToHistory('interaction', queryStr, result);
    // Persist to Firestore
    try {
      await setDoc(doc(db, 'interactions_v3', safeId(queryStr)), { drugs: drugs.sort(), data: result, lastAccessed: serverTimestamp() });
    } catch (e) {
      console.error("Firestore interaction persistence failed", e);
    }
    
    return result;
  } catch (error: any) {
    throw new Error(error.message || "An error occurred while checking interactions.");
  }
};
