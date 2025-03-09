export async function getTopCryptos() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=500&page=1&sparkline=false');
        const cryptos = await response.json();
        return cryptos
            .filter(crypto => crypto.market_cap > 50_000_000) 
            .map(crypto => ({
                name: crypto.name,
                symbol: crypto.symbol.toUpperCase(),
                currentPrice: crypto.current_price,
                marketCap: crypto.market_cap,
                priceChangePercentage24h: crypto.price_change_percentage_24h,
                rank: crypto.market_cap_rank
            }));
    } catch (error) {
        console.error('Error fetching top cryptocurrencies:', error);
        return [];
    }
}

export async function getCryptoSignals() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false');
        const cryptos = await response.json();

        return cryptos
            .filter(crypto => crypto.market_cap > 5_000_000) 
            .map(crypto => {
                const { signalType, confidence } = enhancedSignalAnalysis(crypto);
                const entryPrice = crypto.current_price;
                const targetPrice = calculateTargetPrice(crypto, signalType);
                const stopLoss = calculateStopLoss(crypto, signalType);

                // Calculate support and resistance levels
                const { support, resistance, currentPrice } = calculateSupportResistance(crypto);

                return {
                    id: crypto.id,
                    pair: `${crypto.symbol.toUpperCase()}/USDT`,
                    name: crypto.name,
                    signalType,
                    entryPrice: entryPrice.toFixed(4),
                    targetPrice: targetPrice.toFixed(4),
                    stopLoss: stopLoss.toFixed(4),
                    support: support.map(s => s.toFixed(4)),
                    resistance: resistance.map(r => r.toFixed(4)),
                    potentialGain: ((targetPrice - entryPrice) / entryPrice * 100).toFixed(2),
                    riskReward: calculateRiskReward(entryPrice, targetPrice, stopLoss),
                    confidence: confidence,
                    priceChange24h: crypto.price_change_percentage_24h.toFixed(2)
                };
            })
            .filter(signal => 
                signal.signalType !== 'NEUTRAL' && 
                Math.abs(parseFloat(signal.potentialGain)) > 3 
            )
            .sort((a, b) => Math.abs(parseFloat(b.potentialGain)) - Math.abs(parseFloat(a.potentialGain)))
            .slice(0, 20); 
    } catch (error) {
        console.error('Error generating crypto signals:', error);
        return [];
    }
}

function enhancedSignalAnalysis(crypto) {
    const { 
        price_change_percentage_24h: priceChange, 
        total_volume: volume,
        market_cap: marketCap 
    } = crypto;
    
    let signalType = 'NEUTRAL';
    let confidence = 0;
    
    const volumeIndicator = volume / marketCap;
    const volatilityFactor = Math.abs(priceChange);

    if (priceChange > 7 && volumeIndicator > 0.001) {
        signalType = 'BUY';
        confidence = Math.min(volatilityFactor * 3, 95);
    } else if (priceChange < -7 && volumeIndicator > 0.001) {
        signalType = 'SELL';
        confidence = Math.min(volatilityFactor * 3, 95);
    }

    return { 
        signalType, 
        confidence: Math.floor(confidence)
    };
}

function calculateTargetPrice(crypto, signalType) {
    const currentPrice = crypto.current_price;
    const volatility = Math.abs(crypto.price_change_percentage_24h);
    
    return signalType === 'BUY' 
        ? currentPrice * (1 + (0.08 + volatility/100)) 
        : signalType === 'SELL' 
            ? currentPrice * (1 - (0.08 + volatility/100)) 
            : currentPrice;
}

function calculateStopLoss(crypto, signalType) {
    const currentPrice = crypto.current_price;
    const volatility = Math.abs(crypto.price_change_percentage_24h);
    
    return signalType === 'BUY' 
        ? currentPrice * (1 - (0.05 + volatility/200)) 
        : signalType === 'SELL' 
            ? currentPrice * (1 + (0.05 + volatility/200)) 
            : currentPrice;
}

function calculateRiskReward(entry, target, stopLoss) {
    const potentialProfit = Math.abs(target - entry);
    const potentialLoss = Math.abs(entry - stopLoss);
    return potentialLoss > 0 ? `1:${(potentialProfit / potentialLoss).toFixed(2)}` : '1:1';
}

function calculateSupportResistance(crypto) {
    const currentPrice = crypto.current_price;
    const priceChange = crypto.price_change_percentage_24h;
    
    // Enhanced support/resistance calculation with more nuanced approach
    const volatilityFactor = Math.abs(priceChange) / 100;
    const supportLevels = [
        currentPrice * (1 - volatilityFactor * 0.5),  // Weak support
        currentPrice * (1 - volatilityFactor * 1),    // Medium support
        currentPrice * (1 - volatilityFactor * 1.5)   // Strong support
    ];
    
    const resistanceLevels = [
        currentPrice * (1 + volatilityFactor * 0.5),  // Weak resistance
        currentPrice * (1 + volatilityFactor * 1),    // Medium resistance
        currentPrice * (1 + volatilityFactor * 1.5)   // Strong resistance
    ];
    
    return { 
        support: supportLevels,
        resistance: resistanceLevels,
        currentPrice: currentPrice
    };
}

export async function getCryptoHistoricalData(symbol, days = 30) {
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${symbol.toLowerCase()}/market_chart?vs_currency=usd&days=${days}`);
        const historicalData = await response.json();
        
        const labels = historicalData.prices.map((_, index) => index);
        const prices = historicalData.prices.map(price => price[1]);
        
        return {
            labels: labels,
            datasets: [{
                label: `${symbol.toUpperCase()} Price`,
                data: prices,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        };
    } catch (error) {
        console.error(`Error fetching historical data for ${symbol}:`, error);
        return null;
    }
}

export async function getCryptoFullHistoricalData(symbol, days = 90) {
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${symbol.toLowerCase()}/market_chart?vs_currency=usd&days=${days}`);
        const historicalData = await response.json();
        
        const prices = historicalData.prices.map(price => price[1]);
        const volumes = historicalData.total_volumes.map(volume => volume[1]);
        
        // Calculate advanced technical indicators
        const sma20 = calculateSMA(prices, 20);
        const ema50 = calculateEMA(prices, 50);
        const rsi = calculateRSI(prices);
        const bollinger = calculateBollingerBands(prices);
        
        return {
            prices: prices,
            volumes: volumes,
            indicators: {
                sma20: sma20,
                ema50: ema50,
                rsi: rsi,
                bollinger: bollinger
            }
        };
    } catch (error) {
        console.error(`Error fetching full historical data for ${symbol}:`, error);
        return null;
    }
}

function calculateSMA(prices, period) {
    const sma = [];
    for (let i = period - 1; i < prices.length; i++) {
        const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        sma.push(sum / period);
    }
    return sma;
}

function calculateEMA(prices, period) {
    const multiplier = 2 / (period + 1);
    const ema = [prices[0]];
    
    for (let i = 1; i < prices.length; i++) {
        const emaValue = (prices[i] - ema[i-1]) * multiplier + ema[i-1];
        ema.push(emaValue);
    }
    
    return ema;
}

function calculateRSI(prices, period = 14) {
    const changes = prices.slice(1).map((price, i) => price - prices[i]);
    const gains = changes.map(change => Math.max(change, 0));
    const losses = changes.map(change => Math.abs(Math.min(change, 0)));
    
    const avgGain = calculateAverage(gains, period);
    const avgLoss = calculateAverage(losses, period);
    
    return avgLoss === 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)));
}

function calculateAverage(values, period) {
    const sum = values.slice(0, period).reduce((a, b) => a + b, 0);
    return sum / period;
}

function calculateBollingerBands(prices, period = 20, stdDev = 2) {
    const sma = calculateSMA(prices, period);
    const standardDeviation = calculateStandardDeviation(prices, period);
    
    const upperBand = sma.map((value, index) => 
        value + (standardDeviation[index] * stdDev)
    );
    
    const lowerBand = sma.map((value, index) => 
        value - (standardDeviation[index] * stdDev)
    );
    
    return {
        middle: sma,
        upper: upperBand,
        lower: lowerBand
    };
}

function calculateStandardDeviation(prices, period) {
    const stdDev = [];
    
    for (let i = period - 1; i < prices.length; i++) {
        const periodPrices = prices.slice(i - period + 1, i + 1);
        const mean = periodPrices.reduce((a, b) => a + b, 0) / period;
        
        const variance = periodPrices.reduce((sum, price) => 
            sum + Math.pow(price - mean, 2), 0) / period;
        
        stdDev.push(Math.sqrt(variance));
    }
    
    return stdDev;
}
