import { getCryptoSignals, getCryptoHistoricalData, getCryptoFullHistoricalData } from './crypto-signals.js';

const API_BASE_URL = 'https://api.coingecko.com/api/v3';

async function fetchTopCryptos() {
    try {
        const response = await fetch(`${API_BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false`);
        const cryptos = await response.json();
        return cryptos.map(crypto => ({
            id: crypto.id,
            symbol: crypto.symbol.toUpperCase(),
            name: crypto.name,
            price: crypto.current_price,
            priceChange24h: crypto.price_change_percentage_24h,
            marketCap: crypto.market_cap
        }));
    } catch (error) {
        console.error('Error fetching top cryptos:', error);
        return [];
    }
}

function renderTopCryptos(cryptos) {
    const container = document.getElementById('topCryptosContainer');
    container.innerHTML = cryptos.map(crypto => `
        <div class="col-12 mb-2">
            <div class="crypto-card p-3 d-flex justify-content-between align-items-center" data-symbol="${crypto.symbol}">
                <div>
                    <h5 class="mb-1">${crypto.name} (${crypto.symbol})</h5>
                    <small class="text-muted">Market Cap: $${(crypto.marketCap / 1_000_000).toFixed(2)}M</small>
                </div>
                <div class="text-end">
                    <h6 class="mb-1">$${crypto.price.toFixed(2)}</h6>
                    <small class="${crypto.priceChange24h > 0 ? 'text-success' : 'text-danger'}">
                        ${crypto.priceChange24h.toFixed(2)}%
                    </small>
                </div>
            </div>
        </div>
    `).join('');

    // Add chart modal trigger
    document.querySelectorAll('.crypto-card').forEach(card => {
        card.addEventListener('click', async () => {
            const symbol = card.dataset.symbol;
            await showCryptoChart(symbol);
        });
    });
}

async function showCryptoChart(symbol) {
    try {
        const chartData = await getCryptoHistoricalData(symbol);
        
        const chartCtx = document.getElementById('cryptoChart');
        const cryptoChartTitle = document.getElementById('cryptoChartTitle');
        cryptoChartTitle.textContent = `${symbol} Price Chart`;

        // Destroy existing chart if it exists
        if (window.cryptoChart) {
            window.cryptoChart.destroy();
        }

        window.cryptoChart = new Chart(chartCtx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            color: '#00ff00'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#00ff00'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#00ff00'
                        }
                    }
                }
            }
        });

        // Show modal
        const chartModal = new bootstrap.Modal(document.getElementById('cryptoChartModal'));
        chartModal.show();
    } catch (error) {
        console.error('Error showing crypto chart:', error);
    }
}

function renderCryptoSignals(signals) {
    const container = document.getElementById('cryptoSignalsContainer');
    container.innerHTML = signals.map(signal => `
        <div class="crypto-card p-3 mb-2">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h5 class="mb-0">${signal.pair}</h5>
                <span class="signal-badge ${
                    signal.signalType === 'BUY' ? 'bg-success text-white' : 
                    signal.signalType === 'SELL' ? 'bg-danger text-white' : 'bg-secondary text-white'
                }">
                    ${signal.signalType}
                </span>
            </div>
            <div class="row">
                <div class="col-6">
                    <small class="text-muted">Entry Price</small>
                    <p class="mb-0">$${signal.entryPrice}</p>
                </div>
                <div class="col-6 text-end">
                    <small class="text-muted">24h Change</small>
                    <p class="mb-0 ${signal.priceChange24h > 0 ? 'text-success' : 'text-danger'}">
                        ${signal.priceChange24h}%
                    </p>
                </div>
            </div>
            <div class="row mt-2">
                <div class="col-4">
                    <small class="text-muted">Target</small>
                    <p class="mb-0">$${signal.targetPrice}</p>
                </div>
                <div class="col-4">
                    <small class="text-muted">Stop Loss</small>
                    <p class="mb-0">$${signal.stopLoss}</p>
                </div>
                <div class="col-4 text-end">
                    <small class="text-muted">Gain %</small>
                    <p class="mb-0 ${signal.potentialGain > 0 ? 'text-success' : 'text-danger'}">
                        ${signal.potentialGain}%
                    </p>
                </div>
            </div>
        </div>
    `).join('');
}

async function renderCryptoCharts(signals) {
    const container = document.getElementById('portfolioSection');
    container.innerHTML = signals.map(signal => `
        <div class="crypto-chart-card p-3 mb-3" data-symbol="${signal.id}">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h5 class="mb-0">${signal.pair}</h5>
                <span class="signal-badge ${
                    signal.signalType === 'BUY' ? 'bg-success text-white' : 
                    signal.signalType === 'SELL' ? 'bg-danger text-white' : 'bg-secondary text-white'
                }">
                    ${signal.signalType}
                </span>
            </div>
            <div class="row mb-2">
                <div class="col-4">
                    <small class="text-muted">Entry</small>
                    <p class="mb-0">$${signal.entryPrice}</p>
                </div>
                <div class="col-4">
                    <small class="text-muted">Support</small>
                    <p class="mb-0 text-info">$${signal.support}</p>
                </div>
                <div class="col-4">
                    <small class="text-muted">Resistance</small>
                    <p class="mb-0 text-warning">$${signal.resistance}</p>
                </div>
            </div>
            <canvas id="chart-${signal.id}" class="crypto-full-chart" height="300"></canvas>
            <div class="row mt-2">
                <div class="col-6">
                    <small class="text-muted">Target</small>
                    <p class="mb-0 text-success">$${signal.targetPrice}</p>
                </div>
                <div class="col-6">
                    <small class="text-muted">Stop Loss</small>
                    <p class="mb-0 text-danger">$${signal.stopLoss}</p>
                </div>
            </div>
            <div class="row mt-2">
                <div class="col-12">
                    <small class="text-muted">Indicators</small>
                    <div class="d-flex justify-content-between">
                        <span class="badge bg-secondary">Confidence: ${signal.confidence}%</span>
                        <span class="badge bg-info">Risk/Reward: ${signal.riskReward}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // Render advanced charts for each signal with more details
    signals.forEach(async (signal) => {
        const chartCtx = document.getElementById(`chart-${signal.id}`);
        const fullData = await getCryptoFullHistoricalData(signal.id);
        
        if (fullData) {
            new Chart(chartCtx, {
                type: 'line',
                data: {
                    labels: fullData.prices.map((_, i) => i),
                    datasets: [
                        {
                            label: 'Price',
                            data: fullData.prices,
                            borderColor: 'rgb(0, 255, 0)',
                            backgroundColor: 'rgba(0, 255, 0, 0.1)',
                            tension: 0.3
                        },
                        {
                            label: 'SMA 20',
                            data: fullData.indicators.sma20,
                            borderColor: 'rgb(255, 99, 132)',
                            borderDash: [5, 5],
                            tension: 0.3,
                            hidden: false
                        },
                        {
                            label: 'EMA 50',
                            data: fullData.indicators.ema50,
                            borderColor: 'rgb(54, 162, 235)',
                            borderDash: [5, 5],
                            tension: 0.3,
                            hidden: false
                        },
                        {
                            label: 'Bollinger Upper',
                            data: fullData.indicators.bollinger.upper,
                            borderColor: 'rgba(255, 206, 86, 0.5)',
                            borderDash: [10, 5],
                            tension: 0.3,
                            hidden: true
                        },
                        {
                            label: 'Bollinger Lower',
                            data: fullData.indicators.bollinger.lower,
                            borderColor: 'rgba(255, 206, 86, 0.5)',
                            borderDash: [10, 5],
                            tension: 0.3,
                            hidden: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: false,
                            ticks: { 
                                color: '#00ff00',
                                callback: function(value) {
                                    return '$' + value.toFixed(2);
                                }
                            },
                            grid: {
                                color: 'rgba(0,255,0,0.1)'
                            }
                        },
                        x: {
                            ticks: { color: '#00ff00' },
                            grid: {
                                color: 'rgba(0,255,0,0.1)'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: { 
                                color: '#00ff00',
                                boxWidth: 20
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            titleColor: '#00ff00',
                            bodyColor: '#00ff00'
                        }
                    },
                    interaction: {
                        mode: 'nearest',
                        axis: 'x',
                        intersect: false
                    }
                }
            });
        }
    });
}

function setupBottomNavigation() {
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    const sections = {
        marketOverview: document.getElementById('marketOverviewSection'),
        signals: document.getElementById('signalsSection'),
        portfolio: document.getElementById('portfolioSection')
    };

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(navItem => navItem.classList.remove('active'));
            item.classList.add('active');

            Object.values(sections).forEach(section => section.classList.add('d-none'));

            const sectionId = item.dataset.section;
            sections[sectionId].classList.remove('d-none');
        });
    });
}

async function initializeApp() {
    const topCryptos = await fetchTopCryptos();
    renderTopCryptos(topCryptos);

    const cryptoSignals = await getCryptoSignals();
    renderCryptoSignals(cryptoSignals);
    await renderCryptoCharts(cryptoSignals); 

    setupBottomNavigation();
}

document.addEventListener('DOMContentLoaded', initializeApp);
