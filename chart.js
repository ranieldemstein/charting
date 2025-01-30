document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded and parsed');

    function getStockTicker() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('ticker') || 'AAPL'; // Default to 'AAPL' if no ticker is provided
    }

    const stockTicker = getStockTicker();
    console.log('Stock Ticker:', stockTicker);

    async function fetchStockData(range) {
        const apiKey = '9htrZy1d7DYcG21DJKi6YwCo1_rCMfN8';
        const now = new Date();
        let fromDate;
        let multiplier;
        let timespan;

        switch (range) {
            case '1D':
                fromDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
                multiplier = 5;
                timespan = 'minute';
                break;
            case '1W':
                fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                multiplier = 1;
                timespan = 'hour';
                break;
            case '1M':
                fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                multiplier = 1;
                timespan = 'day';
                break;
            case '1Y':
                fromDate = new Date(now.getTime());
                fromDate.setFullYear(now.getFullYear() - 1);
                multiplier = 1;
                timespan = 'day';
                break;
            default:
                fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                multiplier = 5;
                timespan = 'minute';
        }

        fromDate = fromDate.toISOString().split('T')[0];
        const toDate = new Date().toISOString().split('T')[0];
        console.log(`Fetching data from ${fromDate} to ${toDate}`);

        try {
            const response = await fetch(`https://api.polygon.io/v2/aggs/ticker/${stockTicker}/range/${multiplier}/${timespan}/${fromDate}/${toDate}?apiKey=${apiKey}`);
            const data = await response.json();
            console.log('Data fetched:', data);

            if (data.results && data.results.length > 0) {
                return data.results.map(item => ({
                    time: item.t / 1000,
                    value: item.c,
                }));
            } else {
                console.error('No data results', data);
                return [];
            }
        } catch (error) {
            console.error('Fetch error', error);
            return [];
        }
    }

    async function createStockChart() {
        const chartElement = document.getElementById('chart');
        if (!chartElement) {
            console.error('Chart element not found');
            return;
        }

        console.log('Chart element found:', chartElement);

        const chart = LightweightCharts.createChart(chartElement, {
            width: chartElement.clientWidth,
            height: chartElement.clientHeight,
            layout: {
                textColor: 'white',
                background: { color: 'transparent' },
            },
            rightPriceScale: {
                scaleMargins: {
                    top: 0.4,
                    bottom: 0.15,
                },
            },
            grid: {
                vertLines: { visible: false },
                horzLines: { visible: false },
            },
        });

        console.log('Chart created:', chart);

        const areaSeries = chart.addSeries({
            type: 'Area',
            priceScaleId: 'right',
            topColor: '#06cbf8',
            bottomColor: 'rgba(6, 203, 248, 0.28)',
            lineColor: '#06cbf8',
            lineWidth: 2,
        });

        console.log('Area series added:', areaSeries);

        async function setChartRange(range) {
            const stockData = await fetchStockData(range);
            areaSeries.setData(stockData);
            chart.timeScale().fitContent();
        }

        setChartRange('1D');
    }

    createStockChart();
});
