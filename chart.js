document.addEventListener('DOMContentLoaded', async function () {
    console.log("📌 Document loaded. Initializing chart...");

    const chartElement = document.getElementById('chart');

    // ✅ Create Chart using v5 API
    const chart = LightweightCharts.createChart(chartElement, {
        layout: {
            background: { type: 'solid', color: 'transparent' },
            textColor: 'white',
        },
        grid: {
            vertLines: { visible: false },
            horzLines: { visible: false },
        },
    });

    console.log("✅ Chart created successfully!");

    // ✅ Corrected v5 API: Use `addSeries()`
    const lineSeries = chart.addSeries(LightweightCharts.LineSeries, { lineWidth: 2 });

    async function fetchStockData() {
        console.log("📡 Fetching stock data...");
        
        try {
            const apiKey = "7ff2b8a1f147da1182bdfe3efe19e76b";
            const response = await fetch(`https://api.polygon.io/v2/aggs/ticker/AAPL/range/1/day/2023-01-01/2023-12-31?apiKey=${apiKey}`);
            const data = await response.json();

            if (!data.results || data.results.length === 0) {
                throw new Error("No data returned from API.");
            }

            const chartData = data.results.map(item => ({
                time: item.t / 1000,  // Convert timestamp to seconds
                value: item.c         // Closing price
            }));

            console.log("📊 Processed chart data:", chartData);

            // ✅ Apply correct color logic
            const first = chartData[0].value;
            const last = chartData[chartData.length - 1].value;
            const newColor = last >= first ? '#06cbf8' : '#ff0000';

            console.log(`🎨 Updating chart color: ${newColor}`);
            lineSeries.applyOptions({ color: newColor });
            lineSeries.setData(chartData);

            console.log("✅ Chart updated successfully.");

            // ✅ Update Odometer for stock price
            document.querySelector('.stock-price').innerHTML = last.toFixed(2);

            // ✅ Apply color to stock change
            const stockChangeElement = document.querySelector('.stock-change');
            const changeValue = (last - first).toFixed(2);
            stockChangeElement.innerHTML = changeValue;
            stockChangeElement.style.color = last >= first ? '#06cbf8' : '#ff0000';

        } catch (error) {
            console.error("❌ Error fetching stock data:", error);
        }
    }

    fetchStockData();

    // 📍 Log Range Selection
    document.getElementById('buttons-container').addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON') {
            console.log(`🕐 Time range changed to: ${event.target.innerText}`);
        }
    });

    // 📍 Log Price/Percentage Toggle
    document.getElementById('toggle-container').addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON') {
            document.querySelectorAll('.toggle-button').forEach(btn => btn.classList.remove('selected'));
            event.target.classList.add('selected');

            const mode = event.target.innerText === '$' ? LightweightCharts.PriceScaleMode.Normal : LightweightCharts.PriceScaleMode.Percentage;
            chart.applyOptions({ rightPriceScale: { mode } });

            console.log(`📈 Display toggled to: ${event.target.innerText}`);
        }
    });

    // 📍 Resize Event Logging
    window.addEventListener('resize', () => {
        chart.resize(chartElement.clientWidth, chartElement.clientHeight);
        console.log("🔄 Chart resized.");
    });
});
