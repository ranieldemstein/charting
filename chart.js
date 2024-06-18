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
        multiplier = 30;
        timespan = 'minute';
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
          color: 'rgba(32, 38, 46, 0.1)',
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

    const areaSeries = chart.addAreaSeries({
      topColor: '#06cbf8',
      bottomColor: 'rgba(6, 203, 248, 0.28)',
      lineColor: '#06cbf8',
      lineWidth: 2,
      crossHairMarkerVisible: true, // Ensure crosshair marker is visible
    });

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

    function setLegendText(name, date, price, change, range) {
      legend.innerHTML = `<div style="font-size: 20px; font-weight: bold; font-family: 'Open Sans', sans-serif;">${name}</div>
                          <div style="font-size: 32px; font-weight: bold; font-family: 'Open Sans', sans-serif;">$${price}</div>
                          <div style="font-size: 16px; color: ${change.priceChange >= 0 ? 'green' : 'red'}; font-family: 'Open Sans', sans-serif;">${change.priceChange >= 0 ? '+' : ''}${change.priceChange} (${change.percentChange}%)</div>
                          <div style="font-size: 16px; font-family: 'Open Sans', sans-serif;">${date}</div>`;
    }

    chart.subscribeCrosshairMove(param => {
      if (!param || !param.time) {
        legend.style.display = 'block';
        const lastData = areaSeries.data().slice(-1)[0];
        if (lastData) {
          const previousData = areaSeries.data().slice(-2)[0];
          const change = calculateChange(lastData.value, previousData.value);
          setLegendText(symbolName, formatDate(lastData.time, currentRange), formatPrice(lastData.value), change, currentRange);
        }
        return;
      }
      legend.style.display = 'none';
      const price = param.seriesData.get(areaSeries);
      if (price) {
        const previousData = areaSeries.data().find(data => data.time < param.time);
        const change = previousData ? calculateChange(price.value, previousData.value) : { priceChange: '0.00', percentChange: '0.00' };
        const dateStr = formatDate(param.time, currentRange);
        toolTip.innerHTML = `<div style="color: white; font-family: 'Open Sans',
