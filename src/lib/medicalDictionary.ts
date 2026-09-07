export const MEDICAL_TERMS: Record<string, string> = {
  "analgesic": "A drug that relieves pain without causing loss of consciousness. Usually used for headaches, muscle aches, or arthritis.",
  "antipyretic": "A medication used to prevent or reduce fever by helping the body override a fever-inducing signal.",
  "nsaid": "Non-steroidal anti-inflammatory drug: a class of medication that reduces pain, decreases fever, prevents blood clots, and decreases inflammation.",
  "antibiotic": "A medicine that inhibits the growth of or destroys bacteria, used to treat bacterial infections.",
  "antihistamine": "A drug that inhibits the physiological effects of histamine, commonly used to treat allergies and cold symptoms.",
  "diuretic": "Also known as water pills, these medications promote the production of urine to help remove excess water and salt from the body.",
  "antidepressant": "A medication primarily used to treat major depressive disorder, some anxiety disorders, and certain chronic pain conditions.",
  "anticoagulant": "Commonly referred to as blood thinners, these medicines help prevent new blood clots from forming or existing ones from growing.",
  "antiemetic": "A medication that is effective against vomiting and nausea, typically used to treat motion sickness or side effects of other drugs.",
  "antihypertensive": "A class of drugs used to treat hypertension (high blood pressure).",
  "bronchodilator": "A medication that makes breathing easier by relaxing the muscles in the lungs and widening the airways.",
  "corticosteroid": "A class of steroid hormones that reduces inflammation and suppresses the immune system.",
  "statin": "A class of lipid-lowering medications that reduce illness and mortality in those who are at high risk of cardiovascular disease.",
  "proton pump inhibitor": "Medications that significantly reduce stomach acid production.",
  "ppi": "Medications that significantly reduce stomach acid production.",
  "beta blocker": "Medications that reduce blood pressure by blocking the effects of the hormone epinephrine (adrenaline).",
  "ace inhibitor": "Medications that help relax your veins and arteries to lower your blood pressure.",
  "arb": "Angiotensin II receptor blockers: Medications that help relax blood vessels, lowering blood pressure and making it easier for the heart to pump blood.",
  "ssri": "Selective serotonin reuptake inhibitors: A common type of antidepressant.",
  "benzodiazepine": "A class of psychoactive drugs used to treat anxiety, insomnia, and seizures.",
  "antiviral": "Medication used specifically for treating viral infections rather than bacterial ones.",
  "antifungal": "Medication used to treat fungal infections like athlete's foot, ringworm, and oral thrush.",
  "nucleoside analogues": "A class of antiviral medications that mimic nucleosides and interfere with viral replication, used to treat infections like HIV, herpes, and hepatitis.",
  "disease-modifying antirheumatic drug": "A class of drugs that slow down disease progression and prevent joint damage in conditions like rheumatoid arthritis.",
  "purine antimetabolite": "A class of drugs that mimic normal purines, disrupting DNA and RNA synthesis to inhibit cell growth, used to treat cancers and autoimmune disorders.",
  "immunosuppressive agent": "A medication that reduces or prevents the body's immune response, typically used to treat autoimmune diseases or prevent organ transplant rejection.",
  "platelet glycoprotein iib/iiia inhibitor": "A medication that prevents platelet aggregation and blood clot formation by blocking the glycoprotein IIb/IIIa receptor.",
  "antiplatelet agent": "A class of drugs that decrease platelet aggregation and inhibit thrombus formation, used to prevent cardiovascular diseases.",
  "antiretroviral agent": "Medications that are used to manage and treat retroviral infections, primarily HIV.",
  "integrase strand transfer inhibitor": "A class of antiretroviral drugs that block the action of integrase, a viral enzyme that inserts the viral genome into the DNA of the host cell.",
  "nucleoside reverse transcriptase inhibitor": "A class of antiretroviral drugs used to treat HIV infection by inhibiting the reverse transcriptase enzyme.",
  "cardiotonic antidote": "A specific medication or agent used to counteract or reverse the toxic effects of cardiotonic glycosides like digoxin.",
  "antidote": "A medicine or other remedy for counteracting the effects of poison or disease.",
  "monoclonal antibody fragment": "A partially complete monoclonal antibody engineered for specific binding to an antigen, often used in targeted therapies or as antidotes.",
  "neonatal fc receptor blocker": "A medication that prevents the recycling of IgG antibodies by blocking the neonatal Fc receptor (FcRn), leading to their clearance; used in autoimmune conditions.",
  "class ii antiarrhythmic": "Medications that act as beta-blockers, reducing the heart rate and decreasing the heart's workload to treat abnormal heart rhythms.",
  "beta-adrenergic blocker": "A class of medications that reduce blood pressure and heart rate by blocking the effects of the hormone epinephrine (adrenaline).",
  "ultrasound contrast agent": "A substance used to enhance the echogenicity of tissues and blood vessels during ultrasound imaging, improving the clarity of scans.",
  "diagnostic imaging agent": "A compound or substance administered to a patient to enhance the contrast and visibility of internal structures during medical imaging procedures.",
  "bronchoconstrictor": "A substance or agent that causes narrowing of the airways in the lungs, often used in pulmonary function testing.",
  "diagnostic agent": "A substance or compound used in medical tests or procedures to help diagnose a disease or condition.",
  "cholinergic agonist": "A drug that mimics the action of acetylcholine, stimulating the parasympathetic nervous system."
};

export const getDefinition = (term: string): string => {
  const normalizedTerm = term.toLowerCase().trim();
  
  // Exact match
  if (MEDICAL_TERMS[normalizedTerm]) {
    return MEDICAL_TERMS[normalizedTerm];
  }

  // Partial match
  const foundKey = Object.keys(MEDICAL_TERMS).find(key => normalizedTerm.includes(key));
  if (foundKey) {
    return MEDICAL_TERMS[foundKey];
  }

  return "A pharmacological classification or medical property of the drug.";
};
