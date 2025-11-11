// Common medicines available in Bangladesh with categories
export const bangladeshMedicines = [
  // Antibiotics
  { name: "Azithromycin", category: "antibiotic" },
  { name: "Amoxicillin", category: "antibiotic" },
  { name: "Ciprofloxacin", category: "antibiotic" },
  { name: "Cefixime", category: "antibiotic" },
  { name: "Metronidazole", category: "antibiotic" },
  { name: "Doxycycline", category: "antibiotic" },
  { name: "Cephalexin", category: "antibiotic" },
  { name: "Levofloxacin", category: "antibiotic" },
  
  // Narcotics & Psychotropics
  { name: "Tramadol", category: "narcotic" },
  { name: "Codeine", category: "narcotic" },
  { name: "Diazepam", category: "psychotropic" },
  { name: "Alprazolam", category: "psychotropic" },
  { name: "Clonazepam", category: "psychotropic" },
  
  // Hormonal
  { name: "Levothyroxine", category: "hormonal" },
  { name: "Prednisolone", category: "hormonal" },
  { name: "Dexamethasone", category: "hormonal" },
  { name: "Insulin", category: "hormonal" },
  
  // Immunosuppressants
  { name: "Methotrexate", category: "immunosuppressant" },
  { name: "Cyclosporine", category: "immunosuppressant" },
  
  // General medicines
  { name: "Paracetamol", category: "general" },
  { name: "Ibuprofen", category: "general" },
  { name: "Omeprazole", category: "general" },
  { name: "Ranitidine", category: "general" },
  { name: "Losartan", category: "general" },
  { name: "Amlodipine", category: "general" },
  { name: "Atorvastatin", category: "general" },
  { name: "Metformin", category: "general" },
  { name: "Vitamin D3", category: "general" },
  { name: "Calcium", category: "general" },
  { name: "Folic Acid", category: "general" },
  { name: "Aspirin", category: "general" },
  { name: "Clopidogrel", category: "general" },
  { name: "Salbutamol", category: "general" },
  { name: "Montelukast", category: "general" },
];

export type MedicineCategory = 
  | "antibiotic" 
  | "narcotic" 
  | "psychotropic" 
  | "hormonal" 
  | "immunosuppressant" 
  | "cytotoxic"
  | "general";

export const categoryColors: Record<MedicineCategory, string> = {
  antibiotic: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/50",
  narcotic: "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/50",
  psychotropic: "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/50",
  hormonal: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/50",
  immunosuppressant: "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/50",
  cytotoxic: "bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/50",
  general: "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/50",
};

export const categoryLabels: Record<MedicineCategory, string> = {
  antibiotic: "⚠️ Antibiotic",
  narcotic: "🔴 Narcotic",
  psychotropic: "🟣 Psychotropic",
  hormonal: "💊 Hormonal",
  immunosuppressant: "🛡️ Immunosuppressant",
  cytotoxic: "☢️ Cytotoxic",
  general: "✓ General Medicine",
};
