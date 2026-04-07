export interface EconomicState {
  year: number;
  gdp: number; // in Billion EUR
  gdpGrowth: number; // percentage
  debt: number; // in Billion EUR
  debtToGdp: number; // percentage
  inflation: number; // percentage
  unemployment: number; // percentage
  popularity: number; // 0-100
  budgetBalance: number; // in Billion EUR
  revenue: number;
  expenses: number;
  interestRate: number; // ECB Refinancing Rate
  feedback: string[]; // Feedback for the year
  competitiveness: number; // 0-100 (Draghi Index)
  energyCosts: number; // Index (100 = base)
}

export interface PolicyState {
  vatRate: number; // Mehrwertsteuer (standard 19%)
  corporateTaxRate: number; // Körperschaftsteuer (standard 15%)
  incomeTaxRate: number; // Durchschnittlicher Einkommensteuersatz
  ehegattensplitting: boolean;
  migrationSpending: number; // in Billion EUR
  foreignAid: number; // in Billion EUR
  infrastructureSpending: number; // in Billion EUR
  educationSpending: number; // in Billion EUR
  defenseSpending: number; // in Billion EUR
  retirementAge: number; // Renteneintrittsalter
  digitalizationInvestment: number; // in Billion EUR
  debtBrakeActive: boolean; // Schuldenbremse
  energyTransitionSpending: number; // Energiewende-Investitionen (in Mrd. €)
  keyTechInvestment: number; // Förderung Schlüsseltechnologien (in Mrd. €)
  energySubsidies: number; // Energiesubventionen (in Mrd. €)
  adminEfficiency: number; // Verwaltungseffizienz (0-100, 100 = hoch)
  co2Price: number; // CO2-Preis (€ pro Tonne)
  energyTaxRate: number; // Energiesteuersatz (Index, 100 = Standard)
}

export const INITIAL_POLICY: PolicyState = {
  vatRate: 19,
  corporateTaxRate: 15,
  incomeTaxRate: 30,
  ehegattensplitting: true,
  migrationSpending: 30,
  foreignAid: 25,
  infrastructureSpending: 50,
  educationSpending: 40,
  defenseSpending: 52,
  retirementAge: 67,
  digitalizationInvestment: 10,
  debtBrakeActive: true,
  energyTransitionSpending: 20,
  keyTechInvestment: 15,
  energySubsidies: 5,
  adminEfficiency: 50,
  co2Price: 45,
  energyTaxRate: 100,
};

export const INITIAL_ECONOMY: EconomicState = {
  year: 2026,
  gdp: 4250,
  gdpGrowth: 0.5,
  debt: 2600,
  debtToGdp: 61.2,
  inflation: 2.2,
  unemployment: 5.8,
  popularity: 45,
  budgetBalance: -30,
  revenue: 920,
  expenses: 950,
  interestRate: 4.5, // Default ECB rate
  feedback: ["Willkommen im Amt! Deutschland steht vor großen Herausforderungen. Finden Sie die richtige Balance."],
  competitiveness: 45, // Starting low based on Draghi report
  energyCosts: 150, // High starting energy costs
};
