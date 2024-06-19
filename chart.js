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
                fromDate = new Date(now.getTime());
                fromDate.setDate(now.getDate() - 5); // Look back up to 5 days
                multiplier = 5;
                timespan = 'minute';
                break;
            case '1W':
                fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                multiplier = 1;
                timespan = 'day';
                break;
            case '1M':
                fromDate = new Date(now.getTime());
                fromDate.setMonth(now.getMonth() - 1);
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

        try {
            const response = await fetch(`https://api.polygon.io/v2/aggs/ticker/${stockTicker}/range/${multiplier}/${timespan}/${fromDate}/${toDate}?apiKey=${apiKey}`);
            const data = await response.json();
            console.log('Data fetched:', data);

            if (data.results && data.results.length > 0) {
                let results = data.results.map(item => ({
                    time: item.t / 1000,
                    value: item.c,
                }));

                // Filter for the most recent market day
                if (range === '1D') {
                    const latestDay = Math.max(...results.map(item => item.time * 1000));
                    const startOfDay = new Date(latestDay);
                    startOfDay.setHours(0, 0, 0, 0);
                    results = results.filter(item => item.time * 1000 >= startOfDay.getTime());
                }

                return results;
            } else {
                console.error('No data results', data);
                return [];
            }
        } catch (error) {
            console.error('Fetch error', error);
            return [];
        }
    }

    function createStockChart() {
        const chartElement = document.getElementById('chart');
        if (!chartElement) {
            console.error('Chart element not found');
            return;
        }

        console.log('Chart element found:', chartElement);
        console.log('Chart element size:', chartElement.clientWidth, chartElement.clientHeight);

        const chart = LightweightCharts.createChart(chartElement, {
            width: chartElement.clientWidth,
            height: chartElement.clientHeight,
            layout: {
                textColor: 'white',
                background: { type: 'solid', color: 'transparent' },
            },
            rightPriceScale: {
                scaleMargins: {
                    top: 0.4,
                    bottom: 0.15,
                },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal, // Enable crosshair without tooltip
                vertLine: {
                    visible: true,
                    style: 0,
                    width: 2,
                    color: 'rgba(70, 70, 70, 0.5)', // Darkish grey crosshair color
                    labelVisible: false,
                },
                horzLine: {
                    visible: false, // Hide the horizontal crosshair line
                    labelVisible: false,
                },
            },
            grid: {
                vertLines: {
                    visible: false,
                },
                horzLines: {
                    visible: false,
                },
            },
            handleScroll: {
                mouseWheel: false,
                pressedMouseMove: false,
                horzTouchDrag: false,
                vertTouchDrag: false,
            },
            handleScale: {
                axisPressedMouseMove: false,
                mouseWheel: false,
                pinch: false,
            },
        });

        console.log('Chart created:', chart);

        const areaSeries = chart.addAreaSeries({
            topColor: '#06cbf8',
            bottomColor: 'rgba(6, 203, 248, 0.28)',
            lineColor: '#06cbf8',
            lineWidth: 2,
            crossHairMarkerVisible: true, // Ensure crosshair marker is visible
        });

        console.log('Area series added:', areaSeries);

        const legend = document.getElementById('legend');
        const symbolName = stockTicker;

        function formatDate(timestamp, range) {
            const date = new Date(timestamp * 1000);
            if (range === '1D') {
                return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            } else {
                return date.toLocaleDateString('en-US'); // Use local timezone for other ranges
            }
        }

        function formatPrice(price) {
            return price.toFixed(2);
        }

        function calculateChange(current, previous) {
            const priceChange = current - previous;
            const percentChange = (priceChange / previous) * 100;
            return {
                priceChange: priceChange.toFixed(2),
                percentChange: percentChange.toFixed(2)
            };
        }

        function animateTextUpdate(element, newValue, duration = 0.5) {
            gsap.to(element, { opacity: 0, duration: duration / 2, onComplete: () => {
                element.textContent = newValue;
                gsap.to(element, { opacity: 1, duration: duration / 2 });
            }});
        }

        function setLegendText(name, range, price, change, isPositive) {
            const stockInfo = `${name} | ${range}`;
            animateTextUpdate(legend.querySelector('.stock-info'), stockInfo);
            animateTextUpdate(legend.querySelector('.stock-price'), `$${price}`);
            const changeColor = isPositive ? '#06cbf8' : 'red';
            animateTextUpdate(legend.querySelector('.stock-change'), `${change.priceChange >= 0 ? '+' : ''}${change.priceChange} (${change.percentChange}%)`);
            legend.querySelector('.stock-change').style.color = changeColor;
        }

        function updateLegendOnHover(param, seriesData, currentRange) {
            const price = param.seriesData.get(seriesData);
            if (price) {
                const previousData = seriesData.data().find(data => data.time < param.time);
                const change = previousData ? calculateChange(price.value, previousData.value) : { priceChange: '0.00', percentChange: '0.00' };
                const dateStr = formatDate(param.time, currentRange);
                const changeColor = change.priceChange >= 0 ? '#06cbf8' : 'red';
                const stockInfo = `<span style="font-weight: bold;">${symbolName}</span> | ${dateStr}`;
                toolTipText.querySelector('.stock-info').innerHTML = stockInfo;
                toolTipText.querySelector('.stock-price').textContent = `$${price.value.toFixed(2)}`;
                toolTipText.querySelector('.stock-change').textContent = `${change.priceChange >= 0 ? '+' : ''}${change.priceChange} (${change.percentChange}%)`;
                toolTipText.querySelector('.stock-change').style.color = changeColor;
            }
        }

        function resetLegend(stockData, range) {
            const lastData = stockData.slice(-1)[0];
            if (lastData) {
                const firstData = stockData[0];
                const change = calculateChange(lastData.value, firstData.value);
                const isPositive = change.priceChange >= 0;
                const rangeText = {
                    '1D': '1 Day',
                    '1W': '1 Week',
                    '1M': '1 Month',
                    '1Y': '1 Year'
                }[range];
                setLegendText(symbolName, rangeText, formatPrice(lastData.value), change, isPositive);
                legend.style.display = 'block';
            }
        }

        function hideMagnifierAndTooltip() {
            toolTip.style.display = 'none';
            magnifierOverlay.style.display = 'none';
            const stockData = areaSeries.data();
            resetLegend(stockData, currentRange);
            legend.style.display = 'block';
        }

        // Create and style the tooltip html element
        const container = document.getElementById('chart-container');
        const toolTipWidth = 150;
        const toolTip = document.createElement('div');
        toolTip.style = `width: ${toolTipWidth}px; position: absolute; display: none; padding: 8px; box-sizing: border-box; font-size: 12px; text-align: center; z-index: 1000; top: 12px; left: 12px; pointer-events: none; border-radius: 4px 4px 0px 0px; border-bottom: none; font-family: 'Open Sans', sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;`;
        toolTip.style.background = `transparent`;
        toolTip.style.color = 'white';
        toolTip.style.borderColor = 'rgba( 239, 83, 80, 1)';
        container.appendChild(toolTip);

        // Create the magnifier overlay with glow on the sides and white color
        const magnifierOverlay = document.createElement('div');
        magnifierOverlay.style = `width: ${toolTipWidth}px; position: absolute; display: none; height: 100%; background: rgba(255, 255, 255, 0.1); box-shadow: 0px 0px 10px 0px rgba(255, 255, 255, 0.5); pointer-events: none; z-index: 998;`;
        container.appendChild(magnifierOverlay);

        // Create a gradient box for better readability without bottom glow
        const gradientBox = document.createElement('div');
        gradientBox.style = `width: 100%; height: 100%; position: absolute; top: 0; left: 0; background: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0)); pointer-events: none; z-index: -1;`;
        toolTip.appendChild(gradientBox);

        // Create a container for the tooltip text
        const toolTipText = document.createElement('div');
        toolTipText.style = `position: relative; z-index: 1; color: white;`;
        toolTipText.innerHTML = `
            <div class="stock-info"></div>
            <div class="stock-price"></div>
            <div class="stock-change"></div>
        `;
        toolTip.appendChild(toolTipText);

        // Update tooltip
        chart.subscribeCrosshairMove(param => {
            if (
                param.point === undefined ||
                !param.time ||
                param.point.x < 0 ||
                param.point.x > container.clientWidth ||
                param.point.y < 0 ||
                param.point.y > container.clientHeight
            ) {
                hideMagnifierAndTooltip();
                return;
            }
            legend.style.display = 'none';
            toolTip.style.display = 'block';
            magnifierOverlay.style.display = 'block';
            const date = new Date(param.time * 1000);
            const dateStr = currentRange === '1D' ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : date.toLocaleDateString('en-US');
            const data = param.seriesData.get(areaSeries);
            const price = data.value !== undefined ? data.value : data.close;
            const previousData = areaSeries.data().find(data => data.time < param.time);
            const change = previousData ? calculateChange(price, previousData.value) : { priceChange: '0.00', percentChange: '0.00' };
            const changeColor = change.priceChange >= 0 ? '#06cbf8' : 'red';
            const stockInfo = `<span style="font-weight: bold;">${symbolName}</span> | ${dateStr}`;
            toolTipText.querySelector('.stock-info').innerHTML = stockInfo;
            toolTipText.querySelector('.stock-price').textContent = `$${price.toFixed(2)}`;
            toolTipText.querySelector('.stock-change').textContent = `${change.priceChange >= 0 ? '+' : ''}${change.priceChange} (${change.percentChange}%)`;
            toolTipText.querySelector('.stock-change').style.color = changeColor;

            let left = param.point.x; // relative to timeScale
            const timeScaleWidth = chart.timeScale().width();
            const priceScaleWidth = chart.priceScale('left').width();
            const halfTooltipWidth = toolTipWidth / 2;
            left += priceScaleWidth - halfTooltipWidth;
            left = Math.min(left, priceScaleWidth + timeScaleWidth - toolTipWidth);
            left = Math.max(left, priceScaleWidth);

            toolTip.style.left = left + 'px';
            toolTip.style.top = 0 + 'px';

            magnifierOverlay.style.left = `${Math.min(Math.max(param.point.x - halfTooltipWidth, priceScaleWidth), priceScaleWidth + timeScaleWidth - toolTipWidth)}px`;
            magnifierOverlay.style.top = 0;
            magnifierOverlay.style.width = `${toolTipWidth}px`;
            magnifierOverlay.style.height = `${chartElement.clientHeight}px`;
        });

        async function setChartRange(range) {
            currentRange = range;
            const stockData = await fetchStockData(range);
            console.log('Stock data for range:', range, stockData);
            areaSeries.setData(stockData);

            // Determine color based on price change
            const firstData = stockData[0];
            const lastData = stockData[stockData.length - 1];
            const priceChange = lastData.value - firstData.value;
            const isPositive = priceChange >= 0;

            const topColor = isPositive ? '#06cbf8' : '#ff4441';
            const bottomColor = isPositive ? 'rgba(6, 203, 248, 0.28)' : 'rgba(255, 68, 65, 0.28)';
            const lineColor = isPositive ? '#06cbf8' : '#ff4441';

            areaSeries.applyOptions({
                topColor: topColor,
                bottomColor: bottomColor,
                lineColor: lineColor,
            });

            if (range === '1D') {
                chart.applyOptions({
                    timeScale: {
                        timeVisible: true,
                        secondsVisible: false,
                        tickMarkFormatter: (time, tickMarkType, locale) => {
                            const date = new Date(time * 1000);
                            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }); // Use local timezone
                        },
                    },
                });
            } else {
                chart.applyOptions({
                    timeScale: {
                        timeVisible: true,
                        secondsVisible: false,
                        tickMarkFormatter: (time, tickMarkType, locale) => {
                            const date = new Date(time * 1000);
                            return date.toLocaleDateString('en-US'); // Use local timezone
                        },
                    },
                });
            }
            resetLegend(stockData, range);
            chart.timeScale().fitContent();
        }

        setChartRange('1D'); // Set 1D as default

        // Add range buttons
        const ranges = ['1D', '1W', '1M', '1Y'];
        const buttonsContainer = document.getElementById('buttons-container');
        buttonsContainer.innerHTML = ''; // Clear any existing buttons

        ranges.forEach(range => {
            const button = document.createElement('button');
            button.innerText = range;
            button.style = 'font-family: Arial, sans-serif; font-size: 12px; padding: 6px 12px; margin: 5px; border: none; background-color: #333; border-radius: 5px; cursor: pointer; color: black;';
            button.addEventListener('click', () => setChartRange(range));
            button.addEventListener('mouseover', () => button.style.backgroundColor = '#555');
            button.addEventListener('mouseout', () => button.style.backgroundColor = '#333');
            button.addEventListener('mousedown', () => button.style.backgroundColor = '#777');
            button.addEventListener('mouseup', () => button.style.backgroundColor = '#555');
            buttonsContainer.appendChild(button);
        });

        // Add price and percentage toggle buttons
        const priceButton = document.getElementById('toggle-price');
        const percentageButton = document.getElementById('toggle-percentage');

        priceButton.style = 'font-family: Arial, sans-serif; font-size: 12px; padding: 6px 12px; margin: 5px; border: none; background-color: #333; border-radius: 5px; cursor: pointer; color: black;';
        priceButton.addEventListener('click', () => {
            chart.priceScale('right').applyOptions({
                mode: LightweightCharts.PriceScaleMode.Normal,
            });
        });
        priceButton.addEventListener('mouseover', () => priceButton.style.backgroundColor = '#555');
        priceButton.addEventListener('mouseout', () => priceButton.style.backgroundColor = '#333');
        priceButton.addEventListener('mousedown', () => priceButton.style.backgroundColor = '#777');
        priceButton.addEventListener('mouseup', () => priceButton.style.backgroundColor = '#555');

        percentageButton.style = 'font-family: Arial, sans-serif; font-size: 12px; padding: 6px 12px; margin: 5px; border: none; background-color: #333; border-radius: 5px; cursor: pointer; color: black;';
        percentageButton.addEventListener('click', () => {
            chart.priceScale('right').applyOptions({
                mode: LightweightCharts.PriceScaleMode.Percentage,
            });
        });
        percentageButton.addEventListener('mouseover', () => percentageButton.style.backgroundColor = '#555');
        percentageButton.addEventListener('mouseout', () => percentageButton.style.backgroundColor = '#333');
        percentageButton.addEventListener('mousedown', () => percentageButton.style.backgroundColor = '#777');
        percentageButton.addEventListener('mouseup', () => percentageButton.style.backgroundColor = '#555');

        // Handle touch events for mobile
        chartElement.addEventListener('touchstart', () => {
            toolTip.style.display = 'block';
            magnifierOverlay.style.display = 'block';
            chart.applyOptions({
                crosshair: {
                    vertLine: {
                        visible: true
                    }
                }
            });
        });

        chartElement.addEventListener('touchend', hideMagnifierAndTooltip);

        // Handle mouse events to reset tooltip on mouse leave
        chartElement.addEventListener('mouseleave', hideMagnifierAndTooltip);
    }

    let currentRange = '1D';
    createStockChart();
});
