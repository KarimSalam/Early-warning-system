// العناصر
const elements = {
    tempValue: document.getElementById('tempValue'),
    tempStatus: document.getElementById('tempStatus'),
    humidityValue: document.getElementById('humidityValue'),
    humidityStatus: document.getElementById('humidityStatus'),
    smokeValue: document.getElementById('smokeValue'),
    smokeStatus: document.getElementById('smokeStatus'),
    carbonMonoxideValue: document.getElementById('carbonMonoxideValue'),
    carbonMonoxideStatus: document.getElementById('carbonMonoxideStatus'),
    flameStatus: document.getElementById('flameStatus'),
    connectionStatus: document.getElementById('connectionStatus')
};

// المتغيرات العامة
const API_URL = 'https://api.allorigins.win/raw?url=http://apiearlyingwarning4.runasp.net/api/SensorData/realtime';
const UPDATE_INTERVAL = 3000;
let temperatureChart = null;
let isConnected = false;

// الدوال الأساسية
function generateFallbackData() {
    return {
        temperature: Math.random() * 10 + 20,
        humidity: Math.random() * 20 + 40,
        smokeLevel: Math.random() * 50,
        carbonMonoxideLevel: Math.random() * 30,
        flameDetected: false
    };
}

function updateStatus(element, value, warnThreshold, dangerThreshold) {
    if (!element || value == null) return;

    element.className = 'sensor-status ';
    
    if (value >= dangerThreshold) {
        element.classList.add('status-danger');
        element.textContent = 'danger!!';
    } else if (value >= warnThreshold) {
        element.classList.add('status-warning');
        element.textContent = 'warning';
    } else {
        element.classList.add('status-normal');
        element.textContent = 'normal';
    }
}

function updateChart(temp) {
    const ctx = document.getElementById('temperatureChart')?.getContext('2d');
    if (!ctx) return;

    const now = new Date().toLocaleTimeString();

    if (!temperatureChart) {
        temperatureChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [now],
                datasets: [{
                    label: 'temperature(°C)',
                    data: [temp],
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: false }
                }
            }
        });
    } else {
        if (temperatureChart.data.labels.length >= 20) {
            temperatureChart.data.labels.shift();
            temperatureChart.data.datasets[0].data.shift();
        }
        temperatureChart.data.labels.push(now);
        temperatureChart.data.datasets[0].data.push(temp);
        temperatureChart.update();
    }
}

function updateConnectionStatus() {
    if (!elements.connectionStatus) return;
    
    elements.connectionStatus.innerHTML = `
        <i class="fas fa-circle ${isConnected ? 'connected' : 'error'}"></i>
        <span>${isConnected ? 'Connected' : ' Not Connected...'}</span>
    `;
}

function updateUI(data) {
    if (!data) return;

    elements.tempValue.textContent = `${data.temperature?.toFixed(1) ?? '--'}°C`;
    elements.humidityValue.textContent = `${data.humidity ?? '--'}%`;
    elements.smokeValue.textContent = `${data.smokeLevel ?? '--'} PPM`;
    elements.carbonMonoxideValue.textContent = `${data.carbonMonoxideLevel ?? '--'} PPM`;
    elements.flameStatus.textContent = data.flameDetected ? 'detected 🔥' : 'Undetected';

    updateStatus(elements.tempStatus, data.temperature, 35, 40);
    updateStatus(elements.humidityStatus, data.humidity, 30, 70);
    updateStatus(elements.smokeStatus, data.smokeLevel, 50, 100);
    updateStatus(elements.carbonMonoxideStatus, data.carbonMonoxideLevel, 50, 100);
    
    elements.flameStatus.className = `sensor-status ${data.flameDetected ? 'status-danger' : 'status-normal'}`;
    updateChart(data.temperature);
}

async function fetchWithFallback(urls) {
    for (const url of urls) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            if (response.ok) return response;
        } catch (e) {
            console.log(`Failed with ${url}, trying next...`);
        }
    }
    throw new Error('All proxies failed');
}

async function fetchData() {
    try {
        const response = await fetchWithFallback([
            API_URL,
            `https://cors-converter.onrender.com/http://apiearlyingwarning4.runasp.net/api/SensorData/realtime`,
            `https://thingproxy.freeboard.io/fetch/http://apiearlyingwarning4.runasp.net/api/SensorData/realtime`
        ]);
        
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        const jsonData = await response.json();
        
        if (!jsonData?.data) {
            throw new Error('Invalid API structure');
        }
        
        isConnected = true;
        return jsonData.data;
        
    } catch (error) {
        console.error('Error:', error.message);
        isConnected = false;
        return generateFallbackData();
    }
}

// الدالة الرئيسية
async function main() {
    try {
        const data = await fetchData();
        updateUI(data);
        updateConnectionStatus();
    } catch (error) {
        console.error('Main Loop Error:', error);
    } finally {
        setTimeout(main, UPDATE_INTERVAL);
    }
}

// بدء التشغيل عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Chart !== 'undefined') {
        main();
    } else {
        console.error('Chart.js not loaded!');
        alert('خطأ: لم يتم تحميل مكتبة الرسومات!');
    }
});