"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useTranslations } from "next-intl";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Loader2, TrendingUp, AlertCircle } from "lucide-react";

interface MarketData {
    average_price_m2: number;
    min_price_m2: number;
    max_price_m2: number;
    total_listings: number;
}

interface AgentData {
    avg_m2: number;
    city: string;
    type: string;
}

export function MarketComparisonChart() {
    const t = useTranslations("dashboard.stats.analytics");
    const supabase = createClientComponentClient();

    const [loading, setLoading] = useState(true);
    const [marketData, setMarketData] = useState<MarketData | null>(null);
    const [agentData, setAgentData] = useState<AgentData | null>(null);
    const [availableCities, setAvailableCities] = useState<string[]>([]);
    const [selectedCity, setSelectedCity] = useState<string>("");
    const [selectedType, setSelectedType] = useState<string>("apartment");

    // Fetch available cities from agent's properties
    useEffect(() => {
        async function fetchFilterOptions() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('properties')
                .select('city, type, price, area')
                .eq('owner_id', user.id)
                .eq('status', 'active');

            if (data && data.length > 0) {
                // Extract unique cities
                const uniqueCities = Array.from(new Set(data.map(p => p.city))).filter(Boolean);
                setAvailableCities(uniqueCities);
                if (uniqueCities.length > 0) setSelectedCity(uniqueCities[0]);

                // Calculate Agent's initial average for default selection
                const relevantProps = data.filter(p => p.city === uniqueCities[0] && p.type === 'apartment');
                calculateAgentAvg(relevantProps, uniqueCities[0], 'apartment');
            }
            setLoading(false);
        }
        fetchFilterOptions();
    }, []);

    // Recalculate or Fetch Data when Selection Changes
    useEffect(() => {
        if (!selectedCity) return;
        fetchMarketData(selectedCity, selectedType);
        updateAgentAvg(selectedCity, selectedType);
    }, [selectedCity, selectedType]);

    const updateAgentAvg = async (city: string, type: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('properties')
            .select('price, area')
            .eq('owner_id', user.id)
            .eq('city', city)
            .eq('type', type)
            .eq('status', 'active');

        if (data) {
            calculateAgentAvg(data, city, type);
        }
    };

    const calculateAgentAvg = (properties: any[], city: string, type: string) => {
        if (!properties.length) {
            setAgentData({ avg_m2: 0, city, type });
            return;
        }

        let totalM2Price = 0;
        let validCount = 0;

        properties.forEach(p => {
            if (p.area > 0 && p.price > 0) {
                totalM2Price += (p.price / p.area);
                validCount++;
            }
        });

        setAgentData({
            avg_m2: validCount > 0 ? Math.round(totalM2Price / validCount) : 0,
            city,
            type
        });
    };

    const fetchMarketData = async (city: string, type: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_market_averages', {
                target_city: city,
                target_type: type
            });

            if (!error && data && data.length > 0) {
                setMarketData(data[0]);
            } else {
                setMarketData(null);
            }
        } catch (e) {
            console.error("Error fetching market data", e);
        } finally {
            setLoading(false);
        }
    };

    if (availableCities.length === 0 && !loading) {
        return null; // Don't show if agent has no properties
    }

    const chartData = [
        {
            name: t("yourAverage"),
            price: agentData?.avg_m2 || 0,
            fill: "#1C4B2E" // Brand Dark Green
        },
        {
            name: t("marketAverage"),
            price: marketData?.average_price_m2 || 0,
            fill: "#EAB308" // Amber/Yellow for Market
        }
    ];

    return (
        <Card className="col-span-1 lg:col-span-2 rounded-2xl border shadow-md overflow-hidden">
            <CardHeader className="bg-muted/10 pb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="font-serif flex items-center gap-2 text-xl text-[#1C4B2E]">
                            <TrendingUp className="size-5" />
                            {t("title")}
                        </CardTitle>
                        <CardDescription>{t("subtitle")}</CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                            className="h-9 rounded-md border text-sm px-2 bg-background"
                        >
                            {availableCities.map(city => <option key={city} value={city}>{city}</option>)}
                        </select>
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="h-9 rounded-md border text-sm px-2 bg-background"
                        >
                            <option value="apartment">Apartment</option>
                            <option value="house">House</option>
                            <option value="office">Office</option>
                            <option value="land">Land</option>
                        </select>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-6">
                {loading ? (
                    <div className="h-[300px] flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <XAxis dataKey="name" fontSize={14} tickLine={false} axisLine={false} />
                                <YAxis
                                    tickFormatter={(value) => `$${value}`}
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                    formatter={(value: number) => [`$${value.toLocaleString()}`, t("pricePerM2")]}
                                />
                                <Bar dataKey="price" radius={[8, 8, 0, 0]} barSize={60}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>

                        <div className="mt-4 flex flex-col sm:flex-row justify-center items-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#1C4B2E]" />
                                <span>{t("yourAverage")}: <strong>${agentData?.avg_m2.toLocaleString()}</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-amber-500" />
                                <span>{t("marketAverage")}: <strong>${marketData?.average_price_m2?.toLocaleString() || 0}</strong></span>
                            </div>
                            {marketData && (
                                <div className="text-muted-foreground bg-muted/30 px-3 py-1 rounded-full text-xs">
                                    Based on {marketData.total_listings} active listings
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
