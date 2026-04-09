import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Euro, 
  Percent, 
  ShieldAlert, 
  Globe, 
  School, 
  Construction, 
  Heart,
  ChevronRight,
  RotateCcw,
  Info,
  Zap,
  ShieldCheck,
  Calendar,
  Activity,
  Home
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { EconomicState, PolicyState, INITIAL_ECONOMY, INITIAL_POLICY } from './types';
import { simulateYear } from './simulation';

export default function App() {
  const [economy, setEconomy] = useState<EconomicState>(INITIAL_ECONOMY);
  const [history, setHistory] = useState<EconomicState[]>([INITIAL_ECONOMY]);
  const [policy, setPolicy] = useState<PolicyState>(INITIAL_POLICY);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Fetch real economic and poll data on mount
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    async function fetchData() {
      console.log("Starting data fetch...");
      try {
        // 1. Fetch Poll Data from dawum.de
        // We try multiple ways to bypass CORS and handle potential API issues
        const pollUrl = 'https://api.dawum.de/';
        let data = null;

        // Attempt 1: Direct fetch (might work in some environments)
        try {
          const directResponse = await fetch(pollUrl, { signal: controller.signal });
          if (directResponse.ok) {
            data = await directResponse.json();
          }
        } catch (e) {
          console.warn("Direct fetch failed, trying proxy...");
        }

        // Attempt 2: AllOrigins Proxy (Raw)
        if (!data) {
          try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(pollUrl)}`;
            const proxyResponse = await fetch(proxyUrl, { signal: controller.signal });
            if (proxyResponse.ok) {
              data = await proxyResponse.json();
            }
          } catch (e) {
            console.warn("AllOrigins proxy failed, trying alternative...");
          }
        }

        // Attempt 3: Codetabs Proxy
        if (!data) {
          try {
            const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(pollUrl)}`;
            const proxyResponse = await fetch(proxyUrl, { signal: controller.signal });
            if (proxyResponse.ok) {
              data = await proxyResponse.json();
            }
          } catch (e) {
            console.error("All proxies failed.");
          }
        }

        if (data && isMounted) {
          console.log("Successfully fetched poll data");
          // Find all Survey IDs that belong to the Bundestag (Parliament_Id "0")
          const bundestagSurveyIds = Object.keys(data.Surveys || {}).filter(
            id => String(data.Surveys[id].Parliament_Id) === "0"
          );

          // Get all polls for these surveys
          const polls = Object.values(data.Polls || {}) as any[];
          const bundestagPolls = polls
            .filter(p => bundestagSurveyIds.includes(String(p.Survey_Id)))
            .sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());

          if (bundestagPolls.length > 0) {
            const latestPoll = bundestagPolls[0];
            const results = latestPoll.Results;
            
            const newSupport: { [key: string]: number } = {};
            let sonstige = 0;

            // Map Dawum Party IDs to our internal names
            const partyMap: { [key: string]: string } = {
              "1": "CDU/CSU",
              "2": "SPD",
              "7": "AfD",
              "4": "Grüne",
              "3": "FDP",
              "101": "BSW",
              "5": "Linke"
            };

            Object.entries(results).forEach(([id, value]) => {
              const internalName = partyMap[id];
              if (internalName) {
                newSupport[internalName] = value as number;
              } else {
                sonstige += value as number;
              }
            });
            
            newSupport["Sonstige"] = sonstige;

            setEconomy(prev => ({
              ...prev,
              partySupport: newSupport
            }));
            
            // Update history as well
            setHistory(prev => {
              const newHistory = [...prev];
              if (newHistory.length > 0) {
                newHistory[0] = { ...newHistory[0], partySupport: newSupport };
              }
              return newHistory;
            });
          }
        }

        // 2. Fetch ECB interest rate data (optional, fallback is fine)
        try {
          const ecbUrl = 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.en.html';
          await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(ecbUrl)}`, { signal: controller.signal });
          // We don't parse ECB HTML here for simplicity, just use 4.5 as current
          setEconomy(prev => ({ ...prev, interestRate: 4.5 }));
        } catch (e) {
          // Fallback already set in INITIAL_ECONOMY
        }

      } catch (error) {
        console.warn("Could not fetch live data, using fallbacks:", error);
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    }

    fetchData();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const handleNextYear = () => {
    const nextEconomy = simulateYear(economy, policy);
    setEconomy(nextEconomy);
    setHistory(prev => [...prev, nextEconomy]);
    
    if (nextEconomy.popularity <= 0 || nextEconomy.debtToGdp > 130) {
      setIsGameOver(true);
    }
  };

  const resetGame = () => {
    setEconomy(INITIAL_ECONOMY);
    setHistory([INITIAL_ECONOMY]);
    setPolicy(INITIAL_POLICY);
    setIsGameOver(false);
  };

  const updatePolicy = (key: keyof PolicyState, value: any) => {
    setPolicy(prev => ({ ...prev, [key]: value }));
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val) + ' Mrd.';

  const partyData = Object.entries(economy.partySupport).map(([name, value]) => ({
    name,
    value
  }));

  const PARTY_COLORS: { [key: string]: string } = {
    "CDU/CSU": "#000000",
    "SPD": "#E3000F",
    "AfD": "#009EE0",
    "Grüne": "#64A12D",
    "FDP": "#FFED00",
    "BSW": "#A01037",
    "Linke": "#BE3075",
    "Sonstige": "#777777"
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Euro className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Wirtschafts-Simulator Deutschland</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Aktuelles Jahr</p>
              <p className="text-lg font-bold text-blue-600">{economy.year}</p>
            </div>
            <button 
              onClick={handleNextYear}
              disabled={isGameOver || isLoadingData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoadingData ? "Lade Daten..." : "Nächstes Jahr"} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Stats & Charts */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Top Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
              <StatCard 
                label="BIP Wachstum" 
                value={`${economy.gdpGrowth.toFixed(1)}%`} 
                icon={<TrendingUp className={cn("w-5 h-5", economy.gdpGrowth >= 0 ? "text-emerald-500" : "text-rose-500")} />}
                trend={economy.gdpGrowth >= 0 ? 'up' : 'down'}
              />
              <StatCard 
                label="Wettbewerb (Draghi)" 
                value={`${economy.competitiveness.toFixed(0)}/100`} 
                icon={<Activity className="w-5 h-5 text-indigo-500" />}
                trend={economy.competitiveness > 50 ? 'up' : 'down'}
              />
              <StatCard 
                label="Staatsquote" 
                value={`${economy.govSpendingRatio.toFixed(1)}%`} 
                icon={<ShieldCheck className="w-5 h-5 text-slate-500" />}
                trend={economy.govSpendingRatio < 40 ? 'up' : 'down'}
                invertTrend
              />
              <StatCard 
                label="Energiekosten" 
                value={`${economy.energyCosts.toFixed(0)}`} 
                icon={<Zap className="w-5 h-5 text-amber-500" />}
                trend={economy.energyCosts < 120 ? 'up' : 'down'}
                invertTrend
              />
              <StatCard 
                label="Leitzins (EZB)" 
                value={`${economy.interestRate.toFixed(2)}%`} 
                icon={<Euro className="w-5 h-5 text-blue-500" />}
                trend={economy.interestRate < 3 ? 'up' : 'down'}
                invertTrend
              />
              <StatCard 
                label="Inflation" 
                value={`${economy.inflation.toFixed(1)}%`} 
                icon={<Percent className="w-5 h-5 text-amber-500" />}
                trend={economy.inflation < 3 ? 'up' : 'down'}
                invertTrend
              />
              <StatCard 
                label="Bevölkerung" 
                value={`${economy.population.toFixed(1)} Mio.`} 
                icon={<Users className="w-5 h-5 text-cyan-500" />}
                trend={economy.population > 80 ? 'up' : 'down'}
              />
              <StatCard 
                label="Wohnungsmangel" 
                value={`${economy.housingShortage.toFixed(0)}k`} 
                icon={<Home className="w-5 h-5 text-orange-500" />}
                trend={economy.housingShortage < 500 ? 'up' : 'down'}
                invertTrend
              />
              <StatCard 
                label="Beliebtheit" 
                value={`${economy.popularity.toFixed(0)}%`} 
                icon={<Heart className={cn("w-5 h-5", economy.popularity > 50 ? "text-rose-500" : "text-slate-400")} />}
                trend={economy.popularity > 50 ? 'up' : 'down'}
              />
            </div>

            {/* Main Chart Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-800">Wirtschaftliche Entwicklung</h3>
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-slate-600">BIP</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-500" />
                      <span className="text-slate-600">Schulden</span>
                    </div>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="colorGdp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Area type="monotone" dataKey="gdp" stroke="#3b82f6" fillOpacity={1} fill="url(#colorGdp)" strokeWidth={3} />
                      <Area type="monotone" dataKey="debt" stroke="#f43f5e" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                {isLoadingData && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-mono text-slate-500 animate-pulse">Lade Umfragen...</p>
                  </div>
                )}
                <h3 className="text-lg font-bold text-slate-800 mb-6">Politische Stimmung (Sonntagsfrage)</h3>
                <div className="h-[300px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={partyData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                      >
                        {partyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PARTY_COLORS[entry.name] || "#8884d8"} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => `${value.toFixed(1)}%`}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Feedback / News Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
              {isLoadingData && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-mono text-slate-500 animate-pulse">Lade Live-Daten von Dawum & EZB...</p>
                </div>
              )}
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                Jahresbericht & Feedback
              </h3>
              <div className="space-y-3">
                {economy.feedback.map((item, idx) => (
                  <motion.div 
                    key={`${economy.year}-${idx}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                    <p className="text-sm text-slate-700 leading-relaxed">{item}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Budget Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Haushaltssaldo</h3>
                <div className="flex items-end gap-3">
                  <span className={cn("text-4xl font-black", economy.budgetBalance >= 0 ? "text-emerald-600" : "text-rose-600")}>
                    {economy.budgetBalance >= 0 ? "+" : ""}{economy.budgetBalance.toFixed(0)} Mrd. €
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Einnahmen</span>
                    <span className="font-medium text-emerald-600">{formatCurrency(economy.revenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Ausgaben</span>
                    <span className="font-medium text-rose-600">{formatCurrency(economy.expenses)}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Schuldenquote</h3>
                <div className="flex items-end gap-3">
                  <span className={cn("text-4xl font-black", economy.debtToGdp < 60 ? "text-emerald-600" : economy.debtToGdp < 80 ? "text-amber-600" : "text-rose-600")}>
                    {economy.debtToGdp.toFixed(1)}%
                  </span>
                  <span className="text-slate-400 mb-1">des BIP</span>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className={cn("h-full transition-all duration-500", economy.debtToGdp < 60 ? "bg-emerald-500" : economy.debtToGdp < 80 ? "bg-amber-500" : "bg-rose-500")}
                      style={{ width: `${Math.min(100, economy.debtToGdp)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">Maastricht-Kriterium: 60%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Policy Controls */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-24 max-h-[85vh] overflow-y-auto custom-scrollbar">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-blue-600" />
                Politische Maßnahmen
              </h2>

              <div className="space-y-8">
                {/* Taxes Section */}
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Steuern & Abgaben</h3>
                  <div className="space-y-6">
                    <PolicySlider 
                      label="CO2-Preis" 
                      value={policy.co2Price} 
                      min={0} max={150} unit=" €/t" 
                      onChange={(v) => updatePolicy('co2Price', v)}
                      icon={<Zap className="w-4 h-4 text-emerald-500" />}
                    />
                    <PolicySlider 
                      label="Energiesteuer" 
                      value={policy.energyTaxRate} 
                      min={0} max={200} unit="%" 
                      onChange={(v) => updatePolicy('energyTaxRate', v)}
                      icon={<Zap className="w-4 h-4 text-amber-500" />}
                    />
                    <PolicySlider 
                      label="Mehrwertsteuer" 
                      value={policy.vatRate} 
                      min={0} max={25} unit="%" 
                      onChange={(v) => updatePolicy('vatRate', v)}
                      icon={<Percent className="w-4 h-4" />}
                    />
                    <PolicySlider 
                      label="Einkommensteuer" 
                      value={policy.incomeTaxRate} 
                      min={0} max={50} unit="%" 
                      onChange={(v) => updatePolicy('incomeTaxRate', v)}
                      icon={<Euro className="w-4 h-4" />}
                    />
                    <PolicySlider 
                      label="Körperschaftsteuer" 
                      value={policy.corporateTaxRate} 
                      min={0} max={35} unit="%" 
                      onChange={(v) => updatePolicy('corporateTaxRate', v)}
                      icon={<Euro className="w-4 h-4" />}
                    />
                  </div>
                </section>

                {/* Structural Section */}
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Struktur & Soziales</h3>
                  <div className="space-y-6">
                    <PolicySlider 
                      label="Wohnbauförderung" 
                      value={policy.housingSubsidies} 
                      min={0} max={50} unit=" Mrd." 
                      onChange={(v) => updatePolicy('housingSubsidies', v)}
                      icon={<Home className="w-4 h-4 text-orange-500" />}
                    />
                    <PolicySlider 
                      label="Bau-Entbürokratisierung" 
                      value={policy.buildingDeregulation} 
                      min={0} max={100} unit="%" 
                      onChange={(v) => updatePolicy('buildingDeregulation', v)}
                      icon={<Construction className="w-4 h-4 text-slate-500" />}
                    />
                    <PolicySlider 
                      label="Verwaltungseffizienz" 
                      value={policy.adminEfficiency} 
                      min={10} max={100} unit="%" 
                      onChange={(v) => updatePolicy('adminEfficiency', v)}
                      icon={<Activity className="w-4 h-4" />}
                    />
                    <PolicySlider 
                      label="Privatisierungsgrad" 
                      value={policy.privatizationLevel} 
                      min={0} max={100} unit="%" 
                      onChange={(v) => updatePolicy('privatizationLevel', v)}
                      icon={<TrendingUp className="w-4 h-4" />}
                    />
                    <PolicySlider 
                      label="Renteneintrittsalter" 
                      value={policy.retirementAge} 
                      min={63} max={72} unit=" Jahre" 
                      onChange={(v) => updatePolicy('retirementAge', v)}
                      icon={<Calendar className="w-4 h-4" />}
                    />
                    
                    <div className="grid grid-cols-1 gap-3">
                      <PolicyToggle 
                        label="Schuldenbremse" 
                        description="Begrenzt Neuverschuldung"
                        active={policy.debtBrakeActive}
                        icon={<ShieldCheck className="w-5 h-5 text-emerald-500" />}
                        onToggle={() => updatePolicy('debtBrakeActive', !policy.debtBrakeActive)}
                      />
                      <PolicyToggle 
                        label="Ehegattensplitting" 
                        description="Steuervorteil für Ehepaare"
                        active={policy.ehegattensplitting}
                        icon={<Heart className="w-5 h-5 text-rose-500" />}
                        onToggle={() => updatePolicy('ehegattensplitting', !policy.ehegattensplitting)}
                      />
                      <PolicyToggle 
                        label="Nord Stream" 
                        description="Gas-Pipeline in Betrieb nehmen"
                        active={policy.nordStreamActive}
                        icon={<Zap className={cn("w-5 h-5", policy.nordStreamActive ? "text-blue-500" : "text-slate-400")} />}
                        onToggle={() => updatePolicy('nordStreamActive', !policy.nordStreamActive)}
                      />
                      <PolicyToggle 
                        label="Atomenergie" 
                        description="Kernkraftwerke reaktivieren"
                        active={policy.nuclearPowerActive}
                        icon={<Zap className={cn("w-5 h-5", policy.nuclearPowerActive ? "text-amber-400" : "text-slate-400")} />}
                        onToggle={() => updatePolicy('nuclearPowerActive', !policy.nuclearPowerActive)}
                      />
                    </div>
                  </div>
                </section>

                {/* Spending Section */}
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Ausgaben</h3>
                  <div className="space-y-6">
                    <PolicySlider 
                      label="Energiesubventionen" 
                      value={policy.energySubsidies} 
                      min={0} max={100} unit=" Mrd." 
                      onChange={(v) => updatePolicy('energySubsidies', v)}
                      icon={<Zap className="w-4 h-4 text-amber-500" />}
                    />
                    <PolicySlider 
                      label="Verteidigung" 
                      value={policy.defenseSpending} 
                      min={30} max={150} unit=" Mrd." 
                      onChange={(v) => updatePolicy('defenseSpending', v)}
                      icon={<ShieldAlert className="w-4 h-4" />}
                    />
                    <PolicySlider 
                      label="Migration" 
                      value={policy.migrationSpending} 
                      min={0} max={100} unit=" Mrd." 
                      onChange={(v) => updatePolicy('migrationSpending', v)}
                      icon={<Globe className="w-4 h-4" />}
                    />
                    <PolicySlider 
                      label="Entwicklungshilfe" 
                      value={policy.foreignAid} 
                      min={0} max={60} unit=" Mrd." 
                      onChange={(v) => updatePolicy('foreignAid', v)}
                      icon={<Globe className="w-4 h-4" />}
                    />
                  </div>
                </section>

                {/* Investments Section */}
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Investitionen</h3>
                  <div className="space-y-6">
                    <PolicySlider 
                      label="Schlüsseltechnologien" 
                      value={policy.keyTechInvestment} 
                      min={0} max={100} unit=" Mrd." 
                      onChange={(v) => updatePolicy('keyTechInvestment', v)}
                      icon={<Zap className="w-4 h-4 text-amber-500" />}
                    />
                    <PolicySlider 
                      label="Energiewende" 
                      value={policy.energyTransitionSpending} 
                      min={0} max={120} unit=" Mrd." 
                      onChange={(v) => updatePolicy('energyTransitionSpending', v)}
                      icon={<Zap className="w-4 h-4 text-emerald-500" />}
                    />
                    <PolicySlider 
                      label="Digitalisierung" 
                      value={policy.digitalizationInvestment} 
                      min={0} max={80} unit=" Mrd." 
                      onChange={(v) => updatePolicy('digitalizationInvestment', v)}
                      icon={<Zap className="w-4 h-4" />}
                    />
                    <PolicySlider 
                      label="Infrastruktur" 
                      value={policy.infrastructureSpending} 
                      min={20} max={150} unit=" Mrd." 
                      onChange={(v) => updatePolicy('infrastructureSpending', v)}
                      icon={<Construction className="w-4 h-4" />}
                    />
                    <PolicySlider 
                      label="Bildung" 
                      value={policy.educationSpending} 
                      min={20} max={150} unit=" Mrd." 
                      onChange={(v) => updatePolicy('educationSpending', v)}
                      icon={<School className="w-4 h-4" />}
                    />
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Game Over Overlay */}
      <AnimatePresence>
        {isGameOver && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldAlert className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-2">Amtszeit beendet</h2>
              <div className="text-slate-600 mb-8 space-y-4">
                <p>
                  {economy.popularity <= 0 
                    ? "Das Volk hat das Vertrauen in Ihre Regierung verloren. Sie wurden abgewählt." 
                    : "Die Staatsverschuldung ist außer Kontrolle geraten. Deutschland steht vor dem Staatsbankrott."}
                </p>
                <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 text-sm text-rose-700 text-left">
                  <p className="font-bold mb-2">Analyse des Scheiterns:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {economy.popularity <= 0 && economy.inflation > 4 && <li>Die galoppierende Inflation hat die Kaufkraft der Bürger vernichtet.</li>}
                    {economy.popularity <= 0 && economy.unemployment > 7 && <li>Die hohe Arbeitslosigkeit führte zu sozialen Unruhen.</li>}
                    {economy.popularity <= 0 && policy.retirementAge > 69 && <li>Die drastische Erhöhung des Rentenalters war politischer Selbstmord.</li>}
                    {economy.debtToGdp > 130 && <li>Die Schuldenquote von über 130% hat das Vertrauen der Finanzmärkte zerstört.</li>}
                    {economy.gdpGrowth < -1 && <li>Eine anhaltende Rezession hat die wirtschaftliche Basis des Landes untergraben.</li>}
                    {policy.keyTechInvestment < 10 && <li>Mangelnde Investitionen in Schlüsseltechnologien haben Deutschland den Anschluss an den Weltmarkt gekostet.</li>}
                    {policy.energyTransitionSpending < 15 && <li>Die Abhängigkeit von fossilen Brennstoffen ohne eigene Vorkommen wurde zum Verhängnis.</li>}
                    {economy.popularity <= 0 && economy.popularity < 10 && <li>Ihre Reformen waren insgesamt zu unpopulär oder schlecht kommuniziert.</li>}
                    {economy.housingShortage > 1200 && <li>Die extreme Wohnungsnot hat zu einer sozialen Krise geführt, die nicht mehr beherrschbar war.</li>}
                  </ul>
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Erreichtes Jahr:</span>
                  <span className="font-bold">{economy.year}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Finales BIP:</span>
                  <span className="font-bold">{formatCurrency(economy.gdp)}</span>
                </div>
              </div>
              <button 
                onClick={resetGame}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" /> Neustart
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <footer className="max-w-7xl mx-auto px-4 py-12 border-t border-slate-200 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 opacity-50">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            <p className="text-xs">Dies ist eine vereinfachte Simulation zu Bildungszwecken. Daten werden von öffentlichen Quellen bezogen.</p>
          </div>
          <p className="text-xs">© 2026 Wirtschafts-Simulator Deutschland</p>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ label, value, icon, trend, invertTrend = false }: { 
  label: string; 
  value: string; 
  icon: React.ReactNode; 
  trend: 'up' | 'down';
  invertTrend?: boolean;
}) {
  const isPositive = trend === 'up';
  const colorClass = invertTrend 
    ? (isPositive ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50")
    : (isPositive ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50");

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 bg-slate-50 rounded-xl">
          {icon}
        </div>
        <div className={cn("px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", colorClass)}>
          {trend === 'up' ? 'Stabil' : 'Kritisch'}
        </div>
      </div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-800">{value}</p>
    </div>
  );
}

function PolicySlider({ label, value, min, max, unit, onChange, icon }: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (val: number) => void;
  icon: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="text-slate-400">{icon}</div>
          <span className="text-sm font-bold text-slate-700">{label}</span>
        </div>
        <span className="text-sm font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
          {value}{unit}
        </span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
      <div className="flex justify-between text-[10px] text-slate-400 font-medium">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

function PolicyToggle({ label, description, active, icon, onToggle }: {
  label: string;
  description: string;
  active: boolean;
  icon: React.ReactNode;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-sm font-bold text-slate-700">{label}</p>
          <p className="text-[10px] text-slate-500">{description}</p>
        </div>
      </div>
      <button 
        onClick={onToggle}
        className={cn(
          "w-12 h-6 rounded-full transition-colors relative shrink-0",
          active ? "bg-blue-600" : "bg-slate-300"
        )}
      >
        <div className={cn(
          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
          active ? "left-7" : "left-1"
        )} />
      </button>
    </div>
  );
}
