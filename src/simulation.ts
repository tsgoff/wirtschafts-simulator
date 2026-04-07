import { EconomicState, PolicyState } from "./types";

export function simulateYear(
  currentEconomy: EconomicState,
  policy: PolicyState
): EconomicState {
  // Base values and sensitivities
  const baseGdpGrowth = 0.8; // Base growth trend for 2026+
  
  // Tax impacts on growth
  const vatImpact = (19 - policy.vatRate) * 0.12; 
  const corpTaxImpact = (15 - policy.corporateTaxRate) * 0.18;
  const incomeTaxImpact = (30 - policy.incomeTaxRate) * 0.08;
  
  // Spending impacts
  const infraImpact = (policy.infrastructureSpending - 50) * 0.025;
  const eduImpact = (policy.educationSpending - 40) * 0.015;
  const digitalImpact = (policy.digitalizationInvestment - 10) * 0.04;
  const defenseImpact = (policy.defenseSpending - 52) * 0.005; // Small industrial boost
  const energyImpact = (policy.energyTransitionSpending - 20) * 0.01; // Short term cost, long term independence
  const keyTechImpact = (policy.keyTechInvestment - 15) * 0.05; // High growth potential
  
  // Structural impacts
  const retirementImpact = (policy.retirementAge - 67) * 0.2; // Higher retirement age = more labor force
  
  // Interest rate impact (higher rates = lower growth)
  const interestImpact = (currentEconomy.interestRate - 2.0) * -0.3;
  
  const totalGrowth = baseGdpGrowth + vatImpact + corpTaxImpact + incomeTaxImpact + 
                     infraImpact + eduImpact + digitalImpact + defenseImpact + 
                     energyImpact + keyTechImpact +
                     retirementImpact + interestImpact;
  
  const newGdp = currentEconomy.gdp * (1 + totalGrowth / 100);
  
  // Revenue calculation
  const vatRevenue = (newGdp * 0.32) * (policy.vatRate / 100);
  const corpRevenue = (newGdp * 0.12) * (policy.corporateTaxRate / 100);
  const incomeRevenue = (newGdp * 0.42) * (policy.incomeTaxRate / 100);
  const co2Revenue = (policy.co2Price * 0.5); // Simplified: 0.5 Mrd € per €/tonne
  const energyTaxRevenue = 40 * (policy.energyTaxRate / 100);
  const otherRevenue = 120;
  
  const totalRevenue = vatRevenue + corpRevenue + incomeRevenue + co2Revenue + energyTaxRevenue + otherRevenue;
  
  // Expenses calculation
  // Retirement age reduces pension costs
  const pensionSavings = (policy.retirementAge - 67) * 15;
  const socialSpending = Math.max(300, 420 - pensionSavings + (policy.ehegattensplitting ? 22 : 0));
  
  // Admin costs based on efficiency
  const baseAdminCosts = 250;
  const adminCosts = baseAdminCosts * (1.5 - policy.adminEfficiency / 100);
  
  let totalExpenses = 
    socialSpending + 
    policy.migrationSpending + 
    policy.foreignAid + 
    policy.infrastructureSpending + 
    policy.educationSpending + 
    policy.defenseSpending +
    policy.digitalizationInvestment +
    policy.energyTransitionSpending +
    policy.keyTechInvestment +
    policy.energySubsidies +
    adminCosts;
    
  // Debt interest payments
  const debtInterest = currentEconomy.debt * (currentEconomy.interestRate / 100);
  totalExpenses += debtInterest;

  // Debt Brake Logic
  if (policy.debtBrakeActive && totalExpenses > totalRevenue) {
    const deficit = totalExpenses - totalRevenue;
    // Force cut expenses by 50% of deficit if active
    totalExpenses -= deficit * 0.5;
  }
    
  const budgetBalance = totalRevenue - totalExpenses;
  const newDebt = currentEconomy.debt - budgetBalance;
  
  // Unemployment impact
  const growthUnemploymentImpact = (totalGrowth - 1.2) * -0.35;
  const newUnemployment = Math.max(2.5, currentEconomy.unemployment + growthUnemploymentImpact);
  
  // Inflation impact
  const growthInflationImpact = (totalGrowth - 1.0) * 0.25;
  const vatInflationImpact = (policy.vatRate - 19) * 0.4;
  const energyTaxInflationImpact = (policy.energyTaxRate - 100) * 0.02 + (policy.co2Price - 45) * 0.03;
  const newInflation = Math.max(-0.5, currentEconomy.inflation + growthInflationImpact + vatInflationImpact + energyTaxInflationImpact);
  
  // Popularity impact
  let popularityChange = 0;
  if (totalGrowth > 1.5) popularityChange += 4;
  if (totalGrowth < 0) popularityChange -= 12;
  if (newUnemployment > 6.5) popularityChange -= 6;
  if (newInflation > 3.5) popularityChange -= 10;
  if (budgetBalance < -60) popularityChange -= 5;
  if (!policy.ehegattensplitting) popularityChange -= 4;
  if (policy.retirementAge > 67) popularityChange -= (policy.retirementAge - 67) * 8;
  if (policy.migrationSpending > 60) popularityChange -= 4;
  if (policy.debtBrakeActive && budgetBalance < 0) popularityChange -= 2; // Austerity pain
  if (policy.co2Price > 100) popularityChange -= 5; // CO2 price backlash
  
  const newPopularity = Math.min(100, Math.max(0, currentEconomy.popularity + popularityChange));

  // Simulate interest rate changes (ECB behavior)
  let newInterestRate = currentEconomy.interestRate;
  if (newInflation > 3.0) newInterestRate += 0.25;
  else if (newInflation < 1.5 && totalGrowth < 0.5) newInterestRate -= 0.25;
  newInterestRate = Math.max(0, Math.min(10, newInterestRate));

  const feedback: string[] = [];

  // Growth feedback
  if (totalGrowth > 2.5) feedback.push("Wirtschaftsboom! Die Unternehmen investieren kräftig.");
  else if (totalGrowth > 1.0) feedback.push("Solides Wachstum stärkt den Standort Deutschland.");
  else if (totalGrowth < 0) feedback.push("Rezession! Die Wirtschaft schrumpft, Unternehmen sind besorgt.");
  
  // Inflation feedback
  if (newInflation > 4.0) feedback.push("Hohe Inflation! Die Bürger leiden unter steigenden Preisen.");
  else if (newInflation < 0.5) feedback.push("Deflationsgefahr! Die Preise stagnieren, was den Konsum lähmen könnte.");

  // Budget feedback
  if (budgetBalance > 10) feedback.push("Haushaltsüberschuss! Sie haben Spielraum für Investitionen oder Steuersenkungen.");
  else if (budgetBalance < -80) feedback.push("Massives Defizit! Die Staatsverschuldung steigt rasant an.");
  
  // Policy specific feedback
  if (policy.retirementAge > 68) feedback.push("Proteste gegen die Rentenreform! Die Gewerkschaften sind auf der Straße.");
  if (policy.vatRate > 21) feedback.push("Die Mehrwertsteuererhöhung drückt auf die Konsumlaune.");
  if (policy.corporateTaxRate < 12) feedback.push("Niedrige Unternehmenssteuern locken ausländische Investoren an.");
  if (policy.digitalizationInvestment > 40) feedback.push("Die Digitalisierungsoffensive zeigt erste Erfolge in der Verwaltung.");
  if (policy.debtBrakeActive && budgetBalance < -10) feedback.push("Die Schuldenbremse erzwingt harte Sparmaßnahmen.");
  
  // Energy & Tech feedback
  const draghiGap = 150 - (policy.keyTechInvestment + policy.energyTransitionSpending + policy.digitalizationInvestment);
  if (draghiGap > 50) {
    feedback.push(`Warnung: Die Investitionslücke (Draghi-Gap) beträgt ${draghiGap} Mrd. € pro Jahr. Wir verlieren den Anschluss an die USA und China.`);
  }

  if (policy.energyTransitionSpending < 30) feedback.push("Kritik: Ohne eigene Öl- und Gasvorkommen bleibt die Energiewende alternativlos, wird aber aktuell unterfinanziert.");
  else feedback.push("Investitionen in die Energiewende reduzieren langfristig die Abhängigkeit von teuren Öl- und Gasimporten.");

  // Competitiveness logic
  const newCompetitiveness = Math.min(100, Math.max(0, 
    currentEconomy.competitiveness + 
    (policy.keyTechInvestment - 20) * 0.2 + 
    (policy.digitalizationInvestment - 15) * 0.15 +
    (policy.adminEfficiency - 50) * 0.2 - // Efficiency boost
    (policy.corporateTaxRate - 15) * 0.3 -
    (policy.co2Price - 45) * 0.05 // High CO2 price hurts competitiveness
  ));

  // Energy cost logic
  const newEnergyCosts = Math.max(80, 
    currentEconomy.energyCosts - 
    (policy.energyTransitionSpending - 20) * 0.5 -
    (policy.energySubsidies * 0.8) + // Direct subsidy impact
    (policy.co2Price - 45) * 0.4 + // CO2 price impact
    (policy.energyTaxRate - 100) * 0.3 + // Energy tax impact
    (newInflation * 2)
  );

  if (newEnergyCosts > 180) feedback.push("Alarm: Die hohen Energiekosten führen zur Deindustrialisierung!");
  if (policy.adminEfficiency < 30) feedback.push("Bürokratie-Stau: Die Verwaltung ist überlastet und bremst die Wirtschaft.");
  if (policy.energySubsidies > 40) feedback.push("Hohe Energiesubventionen belasten den Haushalt massiv.");
  if (policy.co2Price > 120) feedback.push("Der hohe CO2-Preis belastet die Industrie und den Verkehrssektor.");

  return {
    year: currentEconomy.year + 1,
    gdp: newGdp,
    gdpGrowth: totalGrowth,
    debt: newDebt,
    debtToGdp: (newDebt / newGdp) * 100,
    inflation: newInflation,
    unemployment: newUnemployment,
    popularity: newPopularity,
    budgetBalance: budgetBalance,
    revenue: totalRevenue,
    expenses: totalExpenses,
    interestRate: newInterestRate,
    feedback: feedback.length > 0 ? feedback : ["Ein ruhiges Jahr ohne größere Vorkommnisse."],
    competitiveness: newCompetitiveness,
    energyCosts: newEnergyCosts,
  };
}
