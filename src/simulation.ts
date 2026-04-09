import { EconomicState, PolicyState } from "./types";

export function simulateYear(
  currentEconomy: EconomicState,
  policy: PolicyState
): EconomicState {
  // Base values and sensitivities
  const baseGdpGrowth = 0.8; // Base growth trend for 2026+
  
  // Tax impacts on growth (Libertarian model: lower taxes = higher growth boost)
  const vatImpact = (19 - policy.vatRate) * 0.15; 
  const corpTaxImpact = (15 - policy.corporateTaxRate) * 0.25;
  const incomeTaxImpact = (30 - policy.incomeTaxRate) * 0.12;
  
  // Spending impacts
  const infraImpact = (policy.infrastructureSpending - 40) * 0.02;
  const eduImpact = (policy.educationSpending - 35) * 0.01;
  const digitalImpact = (policy.digitalizationInvestment - 5) * 0.03;
  const defenseImpact = (policy.defenseSpending - 60) * 0.005; 
  const energyImpact = (policy.energyTransitionSpending - 10) * 0.005; 
  const keyTechImpact = (policy.keyTechInvestment - 10) * 0.04; 
  
  // Structural impacts
  const retirementImpact = (policy.retirementAge - 68) * 0.25; 
  const privatizationImpact = (policy.privatizationLevel - 40) * 0.02; // Boosts efficiency/growth
  
  // Interest rate impact (higher rates = lower growth)
  const interestImpact = (currentEconomy.interestRate - 2.0) * -0.3;
  
  // Nord Stream impact (cheaper gas = more growth)
  const nordStreamGrowthImpact = policy.nordStreamActive ? 0.5 : 0;
  
  // Nuclear power impact (reliable base load = growth boost)
  const nuclearGrowthImpact = policy.nuclearPowerActive ? 0.3 : 0;
  
  const totalGrowth = baseGdpGrowth + vatImpact + corpTaxImpact + incomeTaxImpact + 
                     infraImpact + eduImpact + digitalImpact + defenseImpact + 
                     energyImpact + keyTechImpact + privatizationImpact +
                     retirementImpact + interestImpact + nordStreamGrowthImpact + nuclearGrowthImpact;
  
  const newGdp = currentEconomy.gdp * (1 + totalGrowth / 100);
  
  // Revenue calculation
  const vatRevenue = (newGdp * 0.32) * (policy.vatRate / 100);
  const corpRevenue = (newGdp * 0.12) * (policy.corporateTaxRate / 100);
  const incomeRevenue = (newGdp * 0.42) * (policy.incomeTaxRate / 100);
  const co2Revenue = (policy.co2Price * 0.4); 
  const energyTaxRevenue = 30 * (policy.energyTaxRate / 100);
  const privatizationRevenue = (policy.privatizationLevel > 40) ? (policy.privatizationLevel - 40) * 2 : 0;
  const otherRevenue = 100;
  
  const totalRevenue = vatRevenue + corpRevenue + incomeRevenue + co2Revenue + energyTaxRevenue + privatizationRevenue + otherRevenue;
  
  // Expenses calculation
  // Retirement age reduces pension costs
  const pensionSavings = (policy.retirementAge - 68) * 18;
  const socialSpending = Math.max(200, 350 - pensionSavings + (policy.ehegattensplitting ? 20 : 0));
  
  // Admin costs based on efficiency and privatization
  const baseAdminCosts = 220;
  const adminCosts = baseAdminCosts * (1.6 - (policy.adminEfficiency + policy.privatizationLevel / 2) / 100);
  
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
    policy.housingSubsidies +
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
  const growthInflationImpact = (totalGrowth - 1.0) * 0.2;
  const vatInflationImpact = (policy.vatRate - 19) * 0.35;
  const energyTaxInflationImpact = (policy.energyTaxRate - 80) * 0.02 + (policy.co2Price - 25) * 0.025;
  const newInflation = Math.max(-1.0, currentEconomy.inflation + growthInflationImpact + vatInflationImpact + energyTaxInflationImpact);
  
  // Competitiveness logic
  const newCompetitiveness = Math.min(100, Math.max(0, 
    currentEconomy.competitiveness + 
    (policy.keyTechInvestment - 10) * 0.15 + 
    (policy.digitalizationInvestment - 5) * 0.1 +
    (policy.adminEfficiency - 60) * 0.25 + 
    (policy.privatizationLevel - 40) * 0.3 -
    (policy.corporateTaxRate - 12) * 0.4 -
    (policy.co2Price - 25) * 0.08
  ));

  // Simulate interest rate changes (ECB behavior)
  let newInterestRate = currentEconomy.interestRate;
  if (newInflation > 3.0) newInterestRate += 0.25;
  else if (newInflation < 1.5 && totalGrowth < 0.5) newInterestRate -= 0.25;
  newInterestRate = Math.max(0, Math.min(10, newInterestRate));

  // Population simulation
  const naturalGrowth = -0.05; // -0.05% natural decline
  const migrationImpact = (policy.migrationSpending / 20) * 0.4; // Base migration
  const economicPull = totalGrowth * 0.1;
  const populationGrowth = naturalGrowth + migrationImpact + economicPull;
  const newPopulation = currentEconomy.population * (1 + populationGrowth / 100);

  // Housing simulation
  // Demand increases with population
  const housingDemandIncrease = (newPopulation - currentEconomy.population) * 1000; // 1M people = 1M units demand? No, let's say 1M people = 500k units
  const unitsPerMillion = 450; 
  const newDemand = (newPopulation - currentEconomy.population) * unitsPerMillion; 
  
  // Supply increases with subsidies and deregulation, decreases with high interest rates
  const subsidySupply = policy.housingSubsidies * 15; // 1B = 15k units
  const deregulationSupply = (policy.buildingDeregulation - 30) * 2; // 1 point = 2k units
  const interestRateSupplyImpact = (newInterestRate - 3.0) * -20; // High rates kill building
  
  const newHousingSupply = Math.max(50, 250 + subsidySupply + deregulationSupply + interestRateSupplyImpact);
  const newHousingShortage = Math.max(0, currentEconomy.housingShortage + newDemand - newHousingSupply);

  // Popularity impact
  let popularityChange = 0;
  if (totalGrowth > 1.5) popularityChange += 5; // Easier to get growth bonus
  if (totalGrowth > 3.0) popularityChange += 5; // Extra bonus for boom
  if (totalGrowth < 0) popularityChange -= 12;
  if (newUnemployment > 7.5) popularityChange -= 8;
  if (newInflation > 4.5) popularityChange -= 10;
  if (newInflation >= 1.0 && newInflation <= 3.0) popularityChange += 2; // Price stability bonus
  
  // Minarchist popularity: People like low taxes but hate radical cuts
  if (totalRevenue / newGdp < 0.38) popularityChange += 4; // Tax relief bonus (easier to reach)
  if (totalExpenses / newGdp > 0.52) popularityChange -= 4; // Taxpayer burden penalty (starts later)
  
  if (newCompetitiveness > 65) popularityChange += 3; // Pride in strong economy
  
  if (!policy.ehegattensplitting) popularityChange -= 4;
  if (policy.retirementAge > 68) popularityChange -= (policy.retirementAge - 68) * 8;
  if (policy.migrationSpending > 60) popularityChange -= 4;
  if (policy.debtBrakeActive && budgetBalance < -20) popularityChange -= 1.5; // Reduced austerity pain
  if (policy.co2Price > 100) popularityChange -= 5; 
  if (policy.nordStreamActive) popularityChange -= 12; 
  if (policy.nuclearPowerActive) popularityChange -= 8; 
  if (policy.privatizationLevel > 75) popularityChange -= 5; 
  
  if (newHousingShortage > 800) popularityChange -= 5; // Housing crisis penalty
  if (newHousingShortage < 400) popularityChange += 3; // Housing relief bonus
  
  const newPopularity = Math.min(100, Math.max(0, currentEconomy.popularity + popularityChange));

  const feedback: string[] = [];

  // Growth feedback
  if (totalGrowth > 3.0) feedback.push("Wirtschaftswunder! Der schlanke Staat entfesselt ungeahnte Kräfte.");
  else if (totalGrowth > 1.5) feedback.push("Solides Wachstum durch marktwirtschaftliche Reformen.");
  else if (totalGrowth < 0) feedback.push("Rezession! Trotz Reformen schwächelt die Konjunktur.");
  
  // Inflation feedback
  if (newInflation > 4.0) feedback.push("Inflation steigt! Die Geldentwertung belastet die Sparer.");
  
  // Budget feedback
  const govSpendingRatio = (totalExpenses / newGdp) * 100;
  if (govSpendingRatio < 35) feedback.push("Vorbildlich: Die Staatsquote ist auf einem minarchistischen Niveau.");
  else if (govSpendingRatio > 50) feedback.push("Warnung: Die Staatsquote ist zu hoch. Der Staat erstickt die Privatwirtschaft.");

  if (budgetBalance > 20) feedback.push("Haushaltsüberschuss! Zeit für weitere Steuersenkungen.");
  
  // Policy specific feedback
  if (policy.privatizationLevel > 60) feedback.push("Privatisierungsschub: Der Staat zieht sich aus der Wirtschaft zurück.");
  if (policy.incomeTaxRate < 20) feedback.push("Niedrige Einkommensteuern belohnen Leistung und Eigenverantwortung.");
  if (policy.adminEfficiency > 80) feedback.push("Effiziente Verwaltung: Bürokratie ist kaum noch ein Hindernis.");
  
  // Housing feedback
  if (newHousingShortage > 1000) feedback.push("Wohnungsnot! Die Mieten explodieren, das Volk ist zornig.");
  else if (newHousingShortage < 300) feedback.push("Entspannung am Wohnungsmarkt: Bauen wird wieder attraktiv.");
  
  if (policy.buildingDeregulation > 70) feedback.push("Bauboom durch Entbürokratisierung: Weniger Regeln, mehr Wohnraum.");

  // Energy & Tech feedback
  const draghiGap = 120 - (policy.keyTechInvestment + policy.energyTransitionSpending + policy.digitalizationInvestment);
  if (draghiGap > 40) {
    feedback.push(`Investitionslücke: Der Markt wartet auf bessere Rahmenbedingungen.`);
  }

  // Energy cost logic
  const newEnergyCosts = Math.max(70, 
    currentEconomy.energyCosts - 
    (policy.energyTransitionSpending - 10) * 0.4 -
    (policy.energySubsidies * 0.5) -
    (policy.nordStreamActive ? 35 : 0) -
    (policy.nuclearPowerActive ? 25 : 0) + // Nuclear lowers costs
    (policy.co2Price - 25) * 0.5 + 
    (policy.energyTaxRate - 80) * 0.4 + 
    (newInflation * 1.5)
  );

  if (newEnergyCosts > 180) feedback.push("Alarm: Die hohen Energiekosten führen zur Deindustrialisierung!");
  if (policy.adminEfficiency < 30) feedback.push("Bürokratie-Stau: Die Verwaltung ist überlastet und bremst die Wirtschaft.");
  if (policy.energySubsidies > 40) feedback.push("Hohe Energiesubventionen belasten den Haushalt massiv.");
  if (policy.co2Price > 120) feedback.push("Der hohe CO2-Preis belastet die Industrie und den Verkehrssektor.");
  if (policy.nordStreamActive) feedback.push("Nord Stream ist in Betrieb: Günstiges Gas stützt die Industrie, führt aber zu massiver internationaler Kritik.");
  else feedback.push("Nord Stream bleibt außer Betrieb: Die Energieversorgung muss ohne russisches Pipeline-Gas gesichert werden.");
  if (policy.nuclearPowerActive) feedback.push("Kernkraftwerke am Netz: Günstiger Grundlaststrom stabilisiert das Netz, führt aber zu Protesten.");
  else feedback.push("Atomausstieg bleibt bestehen: Fokus auf Erneuerbare und Gas-Backup.");

  // Party support calculation
  const newPartySupport = { ...currentEconomy.partySupport };
  const partyFeedback: string[] = [];
  
  // Helper to adjust support and track reasons
  const adjust = (party: string, amount: number, reason?: string) => {
    if (newPartySupport[party] !== undefined) {
      newPartySupport[party] += amount;
      if (reason && Math.abs(amount) >= 0.3) {
        const trend = amount > 0 ? "Gewinn" : "Verlust";
        partyFeedback.push(`${party} (${trend}): ${reason}`);
      }
    }
  };

  // Economic performance impacts
  if (totalGrowth > 2.0) {
    adjust("CDU/CSU", 0.5, "Wirtschaftswachstum stärkt das Vertrauen in bürgerliche Kompetenz.");
    adjust("FDP", 0.3, "Unternehmen investieren, was die FDP-Wählerbasis mobilisiert.");
    adjust("SPD", 0.2, "Gute Konjunktur sichert Arbeitsplätze, wovon die SPD profitiert.");
  } else if (totalGrowth < 0) {
    adjust("CDU/CSU", -1.0, "Rezession schadet dem Image der Union als Wirtschaftspartei.");
    adjust("SPD", -0.8, "Wirtschaftskrise verunsichert die Arbeitnehmerschaft.");
    adjust("AfD", 1.0, "Unzufriedenheit mit der wirtschaftlichen Lage treibt Wähler zur AfD.");
    adjust("BSW", 0.5, "Wirtschaftliche Instabilität stärkt die populistische Linke.");
  }

  if (newInflation > 4.0) {
    adjust("AfD", 0.8, "Hohe Inflation schürt Ängste und stärkt die Opposition.");
    adjust("BSW", 0.5, "Kaufkraftverlust treibt Wähler zu Protestparteien.");
    adjust("CDU/CSU", -0.5, "Geldentwertung wird der aktuellen Politik angelastet.");
    adjust("SPD", -0.5, "Reallohnverluste schwächen die SPD.");
  }

  // Policy impacts
  // Taxes
  if (policy.corporateTaxRate < 15) { 
    adjust("FDP", 0.5, "Niedrige Körperschaftsteuern sind Kernforderung des FDP-Programms."); 
    adjust("CDU/CSU", 0.3, "Steuersenkungen für Unternehmen entsprechen Unions-Positionen."); 
    adjust("Linke", -0.3, "Linke kritisiert Entlastung von Konzernen als unsozial."); 
  }
  if (policy.incomeTaxRate < 30) { 
    adjust("FDP", 0.4, "Entlastung der Leistungsträger stärkt die FDP."); 
    adjust("CDU/CSU", 0.2, "Steuersenkungen kommen bei der bürgerlichen Mitte gut an."); 
  }
  
  // Energy
  if (policy.nuclearPowerActive) { 
    adjust("CDU/CSU", 0.5, "Rückkehr zur Kernkraft wird von der Unionsbasis begrüßt."); 
    adjust("AfD", 0.5, "AfD profitiert von der Abkehr vom Atomausstieg."); 
    adjust("Grüne", -1.5, "Kernkraft-Reaktivierung ist ein massiver Bruch mit grünen Grundwerten."); 
  }
  if (policy.nordStreamActive) { 
    adjust("AfD", 1.0, "Forderung nach günstiger Energie via Nord Stream erfüllt."); 
    adjust("BSW", 0.8, "Annäherung an Russland entspricht BSW-Positionen."); 
    adjust("Grüne", -1.0, "Grüne Wähler lehnen fossile Abhängigkeit von Russland strikt ab."); 
  }
  if (policy.co2Price > 100) { 
    adjust("Grüne", 1.0, "Hoher CO2-Preis wird als konsequenter Klimaschutz gewertet."); 
    adjust("AfD", -1.0, "AfD-Wähler lehnen 'Klimadiktatur' und hohe Energiepreise ab."); 
  }
  
  // Spending
  if (policy.migrationSpending < 15) { 
    adjust("AfD", -0.5, "Härterer Kurs nimmt der AfD ein Alleinstellungsmerkmal."); 
    adjust("CDU/CSU", 0.5, "Forderung nach Begrenzung der Migration wird umgesetzt."); 
    adjust("Grüne", -0.5, "Kürzungen bei Migration stoßen auf grüne Kritik."); 
  }
  if (policy.migrationSpending > 40) { 
    adjust("AfD", 1.5, "Hohe Migrationskosten sind zentrales Mobilisierungsthema der AfD."); 
    adjust("Grüne", 0.5, "Humanitäre Ausrichtung wird von grünen Wählern honoriert."); 
  }
  
  if (policy.defenseSpending > 70) { 
    adjust("CDU/CSU", 0.5, "Stärkung der Bundeswehr entspricht Unions-Programmatik."); 
    adjust("BSW", -0.5, "BSW lehnt Aufrüstung und Militarisierung ab."); 
    adjust("Linke", -0.5, "Pazifistische Basis der Linken protestiert gegen Rüstungsausgaben."); 
  }
  
  if (policy.privatizationLevel > 60) { 
    adjust("FDP", 0.8, "Privatisierung und 'Mehr Markt' sind FDP-Identitätsthemen."); 
    adjust("Linke", -0.8, "Linke warnt vor Ausverkauf staatlicher Daseinsvorsorge."); 
  }
  
  if (policy.retirementAge > 68) { adjust("FDP", 0.3, "Längere Lebensarbeitszeit zur Rentensicherung wird von FDP unterstützt."); adjust("SPD", -0.8, "Rente mit 69+ ist ein rotes Tuch für die SPD-Wählerschaft."); adjust("BSW", -0.5, "BSW kritisiert Rentenkürzungen durch die Hintertür."); adjust("Linke", -0.5, "Pazifistische Basis der Linken protestiert gegen Rüstungsausgaben."); }

  // Housing impacts
  if (newHousingShortage > 900) {
    adjust("SPD", -0.5, "Wohnungsnot belastet die Kernklientel der SPD.");
    adjust("CDU/CSU", -0.3, "Mangelnder Wohnraum wird als Regierungsversagen gewertet.");
    adjust("Linke", 0.5, "Linke profitiert von der Debatte um Mietenstopp und Enteignung.");
  }
  if (policy.buildingDeregulation > 70) {
    adjust("FDP", 0.6, "Bauen durch weniger Regeln ist ein Kernanliegen der FDP.");
    adjust("CDU/CSU", 0.3, "Entbürokratisierung im Bauwesen kommt bei der Union gut an.");
  }
  if (policy.housingSubsidies > 20) {
    adjust("SPD", 0.4, "Staatliche Wohnbauförderung entspricht SPD-Positionen.");
    adjust("Linke", 0.3, "Mehr Geld für Wohnraum wird von der Linken begrüßt.");
  }

  // Normalize to 100%
  let totalSupport = 0;
  Object.values(newPartySupport).forEach(v => totalSupport += Math.max(0.1, v));
  
  const finalPartySupport: { [key: string]: number } = {};
  for (const party in newPartySupport) {
    finalPartySupport[party] = (Math.max(0.1, newPartySupport[party]) / totalSupport) * 100;
  }

  // Add party feedback to general feedback
  const combinedFeedback = [...feedback, ...partyFeedback];

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
    feedback: combinedFeedback.length > 0 ? combinedFeedback : ["Der Markt regelt. Ein stabiles Jahr."],
    competitiveness: newCompetitiveness,
    energyCosts: newEnergyCosts,
    govSpendingRatio: govSpendingRatio,
    partySupport: finalPartySupport,
    population: newPopulation,
    housingShortage: newHousingShortage,
  };
}
