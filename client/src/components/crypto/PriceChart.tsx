import { useEffect, useRef, useState, useCallback } from 'react';
import { Chart } from 'chart.js/auto';
import type { ChartConfiguration } from 'chart.js';
import { cryptoService } from '../../services/cryptoService';
import type { HistoricalPrice } from '../../types/domain';
import { Timeframe } from '../../types/domain';

interface PriceChartProps {
    symbol: string;
    timeframe: Timeframe;
}

export const PriceChart: React.FC<PriceChartProps> = ({ symbol, timeframe }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [data, setData] = useState<HistoricalPrice[]>([]);
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    const fetchData = useCallback(async () => {
        try {
            // If symbol is empty, just set empty data and don't make the API call
            if (!symbol.trim()) {
                setLoading(false);
                setError(null);
                setData([]);
                return;
            }
            
            setLoading(true);
            setError(null);
            const response = await cryptoService.getHistoricalPrices(symbol, timeframe);
            setData(response.prices);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch data'));
        } finally {
            setLoading(false);
        }
    }, [symbol, timeframe]);

    useEffect(() => {
        fetchData();
        // Set up periodic refresh every 5 minutes
        const interval = setInterval(fetchData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchData]);

    useEffect(() => {
        if (!chartRef.current || loading) return;

        // Destroy existing chart if it exists
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;
        
        // If there's an error or no symbol, show an empty chart
        if (error || !symbol.trim()) {
            const emptyConfig: ChartConfiguration = {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Price',
                        data: [],
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: symbol.trim() ? 'No Data Available' : 'Enter Symbol'
                        }
                    }
                }
            };
            chartInstance.current = new Chart(ctx, emptyConfig);
            return;
        }

        const config: ChartConfiguration = {
            type: 'line',
            data: {
                labels: data.map(d => new Date(d.timestamp).toLocaleTimeString()),
                datasets: [{
                    label: `${symbol} Price`,
                    data: data.map(d => d.price),
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `${symbol} Price History`
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Price (USD)'
                        }
                    }
                }
            }
        };

        chartInstance.current = new Chart(ctx, config);

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
        };
    }, [data, loading, error, symbol]);

    if (loading) {
        return (
            <div className="h-64 w-full relative">
                {loading && (
                    <div data-testid="price-chart-loading" className="absolute inset-0 flex items-center justify-center text-blue-500">
                        <svg className="animate-spin h-10 w-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                )}
                {/* Only show error message if there's an error and symbol is not empty */}
                {error && symbol.trim() && (
                    <div className="absolute inset-0 flex items-center justify-center text-red-500">
                        <p>Error: {error.message}</p>
                    </div>
                )}
                <canvas ref={chartRef} className={loading ? 'hidden' : ''}></canvas>
            </div>
        );
    }

    // Only show error if there's an error AND the symbol is not empty
    if (error && symbol.trim()) {
        return (
            <div data-testid="price-chart" className="relative h-96">
                <div data-testid="price-chart-error" className="absolute inset-0 flex items-center justify-center text-red-500">
                    {error.message}
                </div>
            </div>
        );
    }

    return (
        <div data-testid="price-chart" className="relative h-96">
            <canvas data-testid="price-chart-canvas" ref={chartRef}></canvas>
        </div>
    );
};
