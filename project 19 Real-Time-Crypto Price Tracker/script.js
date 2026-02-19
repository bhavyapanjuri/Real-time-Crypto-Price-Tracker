// API Configuration
const API_URL = 'https://api.coingecko.com/api/v3/coins/markets';
const API_PARAMS = {
    vs_currency: 'usd',
    order: 'market_cap_desc',
    per_page: 50,
    page: 1,
    sparkline: false
};

// Polling Configuration
const POLLING_INTERVAL = 30000; // 30 seconds

// State Management
let cryptoData = [];
let filteredData = [];
let pollingTimer = null;
let previousPrices = {};

// DOM Elements
const cryptoTableBody = document.getElementById('cryptoTableBody');
const searchInput = document.getElementById('searchInput');
const lastUpdatedElement = document.getElementById('lastUpdated');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');
const topGainerElement = document.getElementById('topGainer');
const topLoserElement = document.getElementById('topLoser');
const totalCoinsElement = document.getElementById('totalCoins');

// Fetch Cryptocurrency Data
async function fetchCryptoData() {
    try {
        const queryString = new URLSearchParams(API_PARAMS).toString();
        const response = await fetch(`${API_URL}?${queryString}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        cryptoData = data;
        filteredData = data;
        
        updateLastUpdatedTime();
        hideLoading();
        hideError();
        renderCryptoList(filteredData);
        updateMarketOverview(data);
        
        return data;
    } catch (error) {
        console.error('Error fetching crypto data:', error);
        showError('Failed to fetch cryptocurrency data. Retrying...');
        hideLoading();
        throw error;
    }
}

// Render Cryptocurrency List
function renderCryptoList(data) {
    if (!data || data.length === 0) {
        cryptoTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">No cryptocurrencies found</td></tr>';
        return;
    }

    cryptoTableBody.innerHTML = data.map((coin, index) => {
        const priceChange = coin.price_change_percentage_24h || 0;
        const changeClass = priceChange >= 0 ? 'positive' : 'negative';
        const changeSymbol = priceChange >= 0 ? '▲' : '▼';
        
        // Check if price changed for animation
        const priceChanged = previousPrices[coin.id] && previousPrices[coin.id] !== coin.current_price;
        previousPrices[coin.id] = coin.current_price;
        
        return `
            <tr data-coin-id="${coin.id}">
                <td class="rank">${coin.market_cap_rank || index + 1}</td>
                <td>
                    <div class="coin-info">
                        <img src="${coin.image}" alt="${coin.name}" class="coin-icon">
                        <div class="coin-details">
                            <span class="coin-name">${coin.name}</span>
                            <span class="coin-symbol">${coin.symbol}</span>
                        </div>
                    </div>
                </td>
                <td class="price ${priceChanged ? 'price-updated' : ''}">
                    ${formatCurrency(coin.current_price)}
                </td>
                <td>
                    <span class="change ${changeClass}">
                        ${changeSymbol} ${Math.abs(priceChange).toFixed(2)}%
                    </span>
                </td>
                <td class="market-cap">${formatLargeNumber(coin.market_cap)}</td>
                <td class="volume">${formatLargeNumber(coin.total_volume)}</td>
            </tr>
        `;
    }).join('');
}

// Update Market Overview
function updateMarketOverview(data) {
    if (!data || data.length === 0) return;

    // Find top gainer and loser
    const sortedByChange = [...data].sort((a, b) => 
        (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0)
    );

    const topGainer = sortedByChange[0];
    const topLoser = sortedByChange[sortedByChange.length - 1];

    // Update top gainer
    if (topGainer) {
        topGainerElement.innerHTML = `
            <span class="coin-name">${topGainer.name}</span>
            <span class="coin-change positive">▲ ${(topGainer.price_change_percentage_24h || 0).toFixed(2)}%</span>
        `;
    }

    // Update top loser
    if (topLoser) {
        topLoserElement.innerHTML = `
            <span class="coin-name">${topLoser.name}</span>
            <span class="coin-change negative">▼ ${Math.abs(topLoser.price_change_percentage_24h || 0).toFixed(2)}%</span>
        `;
    }

    // Update total coins
    totalCoinsElement.innerHTML = `<span class="coin-count">${data.length}</span>`;
}

// Update Prices (Polling)
async function updatePrices() {
    try {
        await fetchCryptoData();
        
        // Re-apply search filter if active
        const searchTerm = searchInput.value.trim().toLowerCase();
        if (searchTerm) {
            handleSearch();
        }
    } catch (error) {
        console.error('Error updating prices:', error);
    }
}

// Start Polling
function startPolling() {
    if (pollingTimer) {
        clearInterval(pollingTimer);
    }
    
    pollingTimer = setInterval(updatePrices, POLLING_INTERVAL);
}

// Stop Polling
function stopPolling() {
    if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
    }
}

// Handle Search
function handleSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (!searchTerm) {
        filteredData = cryptoData;
    } else {
        filteredData = cryptoData.filter(coin => 
            coin.name.toLowerCase().includes(searchTerm) ||
            coin.symbol.toLowerCase().includes(searchTerm)
        );
    }
    
    renderCryptoList(filteredData);
}

// Format Currency
function formatCurrency(value) {
    if (value === null || value === undefined) return '$0.00';
    
    if (value < 0.01) {
        return `$${value.toFixed(6)}`;
    } else if (value < 1) {
        return `$${value.toFixed(4)}`;
    } else {
        return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
}

// Format Large Numbers
function formatLargeNumber(value) {
    if (value === null || value === undefined) return 'N/A';
    
    if (value >= 1e12) {
        return `$${(value / 1e12).toFixed(2)}T`;
    } else if (value >= 1e9) {
        return `$${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
        return `$${(value / 1e6).toFixed(2)}M`;
    } else if (value >= 1e3) {
        return `$${(value / 1e3).toFixed(2)}K`;
    } else {
        return `$${value.toFixed(2)}`;
    }
}

// Update Last Updated Time
function updateLastUpdatedTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    lastUpdatedElement.textContent = timeString;
}

// Show/Hide Loading
function hideLoading() {
    loadingSpinner.style.display = 'none';
}

function showLoading() {
    loadingSpinner.style.display = 'block';
}

// Show/Hide Error
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
}

function hideError() {
    errorMessage.classList.remove('show');
}

// Event Listeners
searchInput.addEventListener('input', handleSearch);

// Handle page visibility change (pause polling when tab is hidden)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopPolling();
    } else {
        startPolling();
        updatePrices();
    }
});

// Initialize Application
async function init() {
    try {
        showLoading();
        await fetchCryptoData();
        startPolling();
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize application. Please refresh the page.');
    }
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
