export interface Drug {
  id: string;
  name: string;
  genericName?: string;
  brandNames?: string[];
  category: string[];
  description: string;
  mechanism: string;
  timing: {
    frequency: string;
    food: string;
    note: string;
  };
  dosage: {
    adult: string;
    pediatric: string;
    max: string;
  };
  safety: {
    common: string;
    serious: string;
  };
  riskProfile: 'LOW RISK' | 'MEDIUM RISK' | 'HIGH RISK';
  primaryUse: string;
  imageUrl: string;
  offLabelUses?: {
    use: string;
    explanation: string;
    reference: string;
  }[];
  interactions?: {
    interactingDrug: string;
    severity: 'SEVERE' | 'MODERATE';
    clinicalFinding: string;
  }[];
  foodInteractions?: {
    foodOrSubstance: string;
    severity: 'SEVERE' | 'MODERATE' | 'MILD';
    clinicalFinding: string;
  }[];
  personalizedAdvice?: {
    relevantMedications: string[];
    hasInteractions: boolean;
    message: string;
  };
}

export interface Interaction {
  drugs: [string, string];
  severity: 'SEVERE' | 'MODERATE' | 'MINOR';
  clinicalFinding: string;
  explanation: string;
  monitoring: {
    label: string;
    description: string;
  }[];
}

export interface Mnemonic {
  drugId: string;
  word: string;
  lines: { letter: string; text: string }[];
}

export interface Flashcard {
  id: string;
  drugId: string;
  question: string;
  answer: string;
}
