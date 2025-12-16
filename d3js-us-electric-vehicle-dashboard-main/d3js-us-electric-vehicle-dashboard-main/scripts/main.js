'use strict';

import BarChart from './barChart.js';
import DonutChart from './donutChart.js';
import TreemapChart from './treemapChart.js';
import LineChart from './lineChart.js';
import StackedBarChart from './stackedBarChart.js';
import ScatterPlot from './scatterPlot.js';
import GroupedBarChart from './groupedBarChart.js';
import BubbleChart from './bubbleChart.js';
import MapChart from './mapChart.js';

// Global state
let globalData = [];
let filteredData = [];
let selectedMake = null;

// Chart instances
const charts = {
    bar: new BarChart('#bar-chart'),
    donut: new DonutChart('#donut-chart'),
    treemap: new TreemapChart('#treemap-chart'),
    line: new LineChart('#line-chart'),
    stacked: new StackedBarChart('#stacked-chart'),
    scatter: new ScatterPlot('#scatter-chart'),
    grouped: new GroupedBarChart('#grouped-chart'),
    bubble: new BubbleChart('#bubble-chart'),
    map: new MapChart('#map-chart')
};

// Safe element getter with null check
const getElement = (id) => document.getElementById(id);
const getElementSafe = (id, defaultValue = null) => document.getElementById(id) || defaultValue;

// Cross-Filter Callback - Real-time update when clicking bar
window.onBarClick = (make) => {
    try {
        if (selectedMake === make) {
            selectedMake = null;
            const section = getElement('active-filter-section');
            if (section) section.style.display = 'none';
        } else {
            selectedMake = make;
            const section = getElement('active-filter-section');
            const text = getElement('active-filter-text');
            if (section) section.style.display = 'block';
            if (text) text.textContent = make;
        }
        renderChartsWithSelection();
    } catch (e) {
        console.error('Cross-filter error:', e);
    }
};

// Data Loading with error handling
const loadData = async () => {
    try {
        const data = await d3.csv('data/Electric_Vehicle_Population_Data_Cleaned.csv');
        if (!data || data.length === 0) {
            throw new Error('No data loaded');
        }
        console.log('Loaded:', data.length, 'records');
        return data;
    } catch (error) {
        console.error('Data loading error:', error);
        throw error;
    }
};

// Data Processing with null safety
const processBarData = (data, selectedMakes = null) => {
    try {
        if (!data || data.length === 0) return [];
    let filtered = data;
    if (selectedMakes && selectedMakes.length > 0) {
            filtered = data.filter(d => d.Make && selectedMakes.includes(d.Make));
    }
        const counts = d3.rollup(filtered, v => v.length, d => d.Make || 'Unknown');
    return Array.from(counts, ([make, count]) => ({ make, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);
    } catch (e) {
        console.error('processBarData error:', e);
        return [];
    }
};

const processDonutData = (data) => {
    try {
        if (!data || data.length === 0) return [];
        const types = d3.rollup(data, v => v.length, d => d['Electric Vehicle Type'] || 'Unknown');
    const total = d3.sum(Array.from(types.values()));
        if (total === 0) return [];
    return Array.from(types, ([type, count]) => ({
        type,
        count,
        percentage: ((count / total) * 100).toFixed(1)
    }));
    } catch (e) {
        console.error('processDonutData error:', e);
        return [];
    }
};

const processTreemapData = (data) => {
    try {
        if (!data || data.length === 0) return { name: 'EV Market', children: [] };
        const nested = d3.rollup(data, v => v.length, d => d.Make || 'Unknown', d => d.Model || 'Unknown');
    const children = Array.from(nested, ([make, models]) => ({
        name: make,
            children: Array.from(models, ([model, count]) => ({ name: model, value: count }))
                .sort((a, b) => b.value - a.value).slice(0, 5)
    })).sort((a, b) => {
            return b.children.reduce((s, c) => s + c.value, 0) - a.children.reduce((s, c) => s + c.value, 0);
    }).slice(0, 8);
    return { name: 'EV Market', children };
    } catch (e) {
        console.error('processTreemapData error:', e);
        return { name: 'EV Market', children: [] };
    }
};

const processLineData = (data, selectedMakes = null) => {
    try {
        if (!data || data.length === 0) return [];
    let filtered = data;
    if (selectedMakes && selectedMakes.length > 0) {
            filtered = data.filter(d => d.Make && selectedMakes.includes(d.Make));
    }
    const grouped = d3.groups(filtered, d => d.Make);
    return grouped.map(([make, entries]) => {
            const countsByYear = d3.rollups(entries, v => v.length, d => d['Model Year'])
                .filter(([year]) => year) // Filter out null years
                .map(([year, count]) => ({ year, count }))
         .sort((a, b) => d3.ascending(a.year, b.year));
        return { make, values: countsByYear };
        }).filter(d => d.values.length > 0).slice(0, 10);
    } catch (e) {
        console.error('processLineData error:', e);
        return [];
    }
};

const processStackedData = (data) => {
    try {
        if (!data || data.length === 0) return [];
        const grouped = d3.rollups(data, v => v.length, d => d['Model Year'], d => d['Electric Vehicle Type']);
        return grouped.filter(([year]) => year).map(([year, types]) => {
        const obj = { year };
        types.forEach(([type, count]) => {
                const key = type && type.includes('Battery') ? 'BEV' : 'PHEV';
                obj[key] = count;
        });
        obj['BEV'] = obj['BEV'] || 0;
        obj['PHEV'] = obj['PHEV'] || 0;
        return obj;
    }).sort((a, b) => d3.ascending(a.year, b.year));
    } catch (e) {
        console.error('processStackedData error:', e);
        return [];
    }
};

const processScatterData = (data) => {
    try {
        if (!data || data.length === 0) return [];
        const years = Array.from(new Set(data.map(d => d['Model Year']).filter(y => y))).sort();
    return years.map(year => {
        const yearData = data.filter(d => d['Model Year'] === year);
            const rangeData = yearData.filter(d => +d['Electric Range'] > 0);
            const avgRange = rangeData.length > 0 ? d3.mean(rangeData, d => +d['Electric Range']) : 0;
        return [year, avgRange];
        }).filter(d => d[1] > 0);
    } catch (e) {
        console.error('processScatterData error:', e);
        return [];
    }
};

const processGroupedData = (data) => {
    try {
        if (!data || data.length === 0) return [];
        const grouped = d3.rollups(data, v => v.length, d => d['Model Year'], d => d['Electric Vehicle Type']);
        return grouped.filter(([year]) => year).map(([year, types]) => {
        const groups = types.map(([type, count]) => ({
                grp: type && type.includes('Battery') ? 'BEV' : 'PHEV',
            count
        }));
        return { yr: year, groups };
    }).sort((a, b) => d3.ascending(a.yr, b.yr));
    } catch (e) {
        console.error('processGroupedData error:', e);
        return [];
    }
};

const processBubbleData = (data) => {
    try {
        if (!data || data.length === 0) return [];
        const makes = Array.from(new Set(data.map(d => d.Make).filter(m => m)));
    return makes.map(make => {
        const makeData = data.filter(d => d.Make === make);
            const rangeData = makeData.filter(d => +d['Electric Range'] > 0);
            return {
                make,
                avgRange: rangeData.length > 0 ? d3.mean(rangeData, d => +d['Electric Range']) : 0,
                avgYear: d3.mean(makeData, d => +d['Model Year']) || 2020,
                count: makeData.length
            };
        }).filter(d => d.count > 50 && d.avgRange > 0).sort((a, b) => b.count - a.count).slice(0, 20);
    } catch (e) {
        console.error('processBubbleData error:', e);
        return [];
    }
};

const processMapData = (data) => {
    try {
        if (!data || data.length === 0) return [];
        return data.filter(d => d.Longitude && d.Latitude && !isNaN(+d.Longitude) && !isNaN(+d.Latitude))
            .map(d => ({ lon: +d.Longitude, lat: +d.Latitude, city: d.City || 'Unknown', make: d.Make || 'Unknown' }));
    } catch (e) {
        console.error('processMapData error:', e);
        return [];
    }
};

// Summary Statistics with null safety
const updateSummaryCards = (data) => {
    try {
        const safeData = data || [];
        const totalEl = getElement('total-vehicles');
        const mfgEl = getElement('total-manufacturers');
        const rangeEl = getElement('avg-range');
        const growthEl = getElement('yoy-growth');
        const donutTotal = getElement('donut-total');
        
        if (totalEl) animateValue(totalEl, 0, safeData.length, 800);
        if (mfgEl) animateValue(mfgEl, 0, new Set(safeData.map(d => d.Make).filter(m => m)).size, 800);
    
        const rangeData = safeData.filter(d => +d['Electric Range'] > 0);
        const avgRange = rangeData.length > 0 ? Math.round(d3.mean(rangeData, d => +d['Electric Range'])) : 0;
        if (rangeEl) animateValue(rangeEl, 0, avgRange, 800);
    
        const years = d3.rollup(safeData, v => v.length, d => d['Model Year']);
        const sorted = Array.from(years).filter(([y]) => y).sort((a, b) => b[0] - a[0]);
    let growth = 0;
        if (sorted.length >= 2 && sorted[1][1] > 0) {
            growth = Math.round(((sorted[0][1] - sorted[1][1]) / sorted[1][1]) * 100);
    }
        if (growthEl) growthEl.textContent = `${growth > 0 ? '+' : ''}${growth}%`;
        if (donutTotal) animateValue(donutTotal, 0, safeData.length, 800);
    } catch (e) {
        console.error('updateSummaryCards error:', e);
    }
};

const animateValue = (el, start, end, dur) => {
    if (!el) return;
    const startTime = performance.now();
    const format = d3.format(',');
    const update = (t) => {
        const progress = Math.min((t - startTime) / dur, 1);
        el.textContent = format(Math.round(start + (end - start) * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
};

// Generate Insights - Accurate & Real-time with error handling
const generateInsights = (data) => {
    try {
        const container = getElement('insights-list');
        if (!container) return;
        
        const safeData = data || [];
        const totalCount = safeData.length;
        
        if (totalCount === 0) {
            container.innerHTML = '<div class="insight-item"><span class="insight-icon">📊</span><span class="insight-text">No data matches current filters</span></div>';
            return;
        }
        
        const insights = [];
        
        // 1. Top Manufacturer
        const makeCounts = d3.rollup(safeData, v => v.length, d => d.Make);
        const sortedMakes = Array.from(makeCounts).filter(([m]) => m).sort((a, b) => b[1] - a[1]);
        if (sortedMakes.length > 0) {
            const [topMake, topCount] = sortedMakes[0];
            const percentage = ((topCount / totalCount) * 100).toFixed(1);
            insights.push({ icon: '🏆', text: `${topMake} leads with ${d3.format(',')(topCount)} vehicles (${percentage}%)` });
        }
        
        // 2. BEV vs PHEV
        const bevCount = safeData.filter(d => d['Electric Vehicle Type']?.includes('Battery')).length;
        const phevCount = totalCount - bevCount;
        const bevPercent = ((bevCount / totalCount) * 100).toFixed(1);
        const phevPercent = ((phevCount / totalCount) * 100).toFixed(1);
        insights.push({ icon: '⚡', text: `BEV: ${bevPercent}% (${d3.format(',')(bevCount)}) | PHEV: ${phevPercent}% (${d3.format(',')(phevCount)})` });
        
        // 3. Electric Range
        const vehiclesWithRange = safeData.filter(d => +d['Electric Range'] > 0);
        if (vehiclesWithRange.length > 0) {
            const avgRange = d3.mean(vehiclesWithRange, d => +d['Electric Range']);
            const maxRange = d3.max(vehiclesWithRange, d => +d['Electric Range']);
            insights.push({ icon: '🔋', text: `Avg range: ${Math.round(avgRange)} mi | Max: ${Math.round(maxRange)} mi` });
        }
        
        // 4. Peak Year
        const yearCounts = d3.rollup(safeData, v => v.length, d => d['Model Year']);
        const sortedYears = Array.from(yearCounts).filter(([y]) => y).sort((a, b) => b[1] - a[1]);
        if (sortedYears.length > 0) {
            const [peakYear, peakCount] = sortedYears[0];
            const yearRange = d3.extent(safeData.map(d => d['Model Year']).filter(y => y));
            insights.push({ icon: '📅', text: `Peak year: ${peakYear} (${d3.format(',')(peakCount)} vehicles) | Range: ${yearRange[0]}-${yearRange[1]}` });
        }
        
        // 5. Top City
        const cityCounts = d3.rollup(safeData, v => v.length, d => d.City);
        const sortedCities = Array.from(cityCounts).filter(([c]) => c).sort((a, b) => b[1] - a[1]);
        if (sortedCities.length > 0) {
            const [topCity, cityCount] = sortedCities[0];
            const cityPercent = ((cityCount / totalCount) * 100).toFixed(1);
            insights.push({ icon: '📍', text: `Top city: ${topCity} with ${d3.format(',')(cityCount)} EVs (${cityPercent}%)` });
        }
        
        // 6. Unique Models
        const uniqueModels = new Set(safeData.map(d => `${d.Make}-${d.Model}`).filter(m => m !== 'undefined-undefined')).size;
        const uniqueMakes = new Set(safeData.map(d => d.Make).filter(m => m)).size;
        insights.push({ icon: '🚗', text: `${uniqueMakes} manufacturers | ${d3.format(',')(uniqueModels)} unique models` });
        
        // 7. YoY Growth
        if (sortedYears.length >= 2) {
            const yearsSorted = Array.from(yearCounts).filter(([y]) => y).sort((a, b) => a[0] - b[0]);
            const recentYears = yearsSorted.slice(-2);
            if (recentYears.length === 2 && recentYears[0][1] > 0) {
                const [prevYear, prevCount] = recentYears[0];
                const [currYear, currCount] = recentYears[1];
                const growth = ((currCount - prevCount) / prevCount * 100).toFixed(1);
                const growthSign = growth > 0 ? '+' : '';
                insights.push({ icon: '📈', text: `${prevYear}→${currYear}: ${growthSign}${growth}% (${d3.format(',')(prevCount)}→${d3.format(',')(currCount)})` });
            }
        }
        
        container.innerHTML = insights.map((insight, i) => 
            `<div class="insight-item" style="animation-delay: ${i * 0.05}s">
                <span class="insight-icon">${insight.icon}</span>
                <span class="insight-text">${insight.text}</span>
            </div>`
        ).join('');
    } catch (e) {
        console.error('generateInsights error:', e);
    }
};

// Render Charts with error handling
const renderCharts = (data) => {
    try {
        const safeData = data || [];
        updateSummaryCards(safeData);
        generateInsights(safeData);
        
        charts.bar.render(processBarData(safeData), selectedMake);
        charts.donut.render(processDonutData(safeData));
        charts.treemap.render(processTreemapData(safeData));
        charts.line.render(processLineData(safeData));
        charts.stacked.render(processStackedData(safeData));
        charts.scatter.render(processScatterData(safeData));
        charts.grouped.render(processGroupedData(safeData));
        charts.bubble.render(processBubbleData(safeData));
        loadMapAndRender(safeData);
    } catch (e) {
        console.error('renderCharts error:', e);
    }
};

const renderChartsWithSelection = () => {
    try {
        let data = selectedMake ? filteredData.filter(d => d.Make === selectedMake) : filteredData;
        
    updateSummaryCards(data);
        generateInsights(data);
    
        charts.bar.render(processBarData(filteredData), selectedMake);
    charts.donut.render(processDonutData(data));
    charts.treemap.render(processTreemapData(data));
        charts.line.render(processLineData(data, selectedMake ? [selectedMake] : null));
    charts.stacked.render(processStackedData(data));
    charts.scatter.render(processScatterData(data));
    charts.grouped.render(processGroupedData(data));
    charts.bubble.render(processBubbleData(data));
        loadMapAndRender(data);
    } catch (e) {
        console.error('renderChartsWithSelection error:', e);
    }
};

const loadMapAndRender = async (data) => {
    try {
        const topoData = await d3.json('data/countries-50m.topo.json');
        if (topoData && topoData.objects && topoData.objects.countries) {
        const countries = topojson.feature(topoData, topoData.objects.countries);
            charts.map.render(countries, processMapData(data));
        }
    } catch (e) {
        console.error('Map loading error:', e);
    }
};

// REAL-TIME Filtering with comprehensive error handling
const applyFiltersRealTime = () => {
    try {
        const searchEl = getElement('manufacturer-search');
        const yearMinEl = getElement('year-min');
        const yearMaxEl = getElement('year-max');
        const bevEl = document.querySelector('input[value="BEV"]');
        const phevEl = document.querySelector('input[value="PHEV"]');
        
        const searchVal = searchEl ? searchEl.value.trim().toLowerCase() : '';
        const yearMin = yearMinEl ? parseInt(yearMinEl.value) || 2010 : 2010;
        const yearMax = yearMaxEl ? parseInt(yearMaxEl.value) || 2024 : 2024;
        const bevChecked = bevEl ? bevEl.checked : true;
        const phevChecked = phevEl ? phevEl.checked : true;
    
    filteredData = globalData.filter(d => {
            // Manufacturer filter
            if (searchVal && d.Make && !d.Make.toLowerCase().includes(searchVal)) return false;
        
        // Year filter
        const year = parseInt(d['Model Year']);
            if (!isNaN(year)) {
                if (year < yearMin || year > yearMax) return false;
        }
        
        // Vehicle type filter
            const evType = d['Electric Vehicle Type'] || '';
            const isBEV = evType.includes('Battery');
        if (isBEV && !bevChecked) return false;
        if (!isBEV && !phevChecked) return false;
        
        return true;
    });
        
        selectedMake = null;
        const activeSection = getElement('active-filter-section');
        if (activeSection) activeSection.style.display = 'none';
    
    renderCharts(filteredData);
    } catch (e) {
        console.error('applyFiltersRealTime error:', e);
    }
};

const resetFilters = () => {
    try {
        const searchEl = getElement('manufacturer-search');
        const yearMinEl = getElement('year-min');
        const yearMaxEl = getElement('year-max');
        const minLabel = getElement('year-min-label');
        const maxLabel = getElement('year-max-label');
        const bevEl = document.querySelector('input[value="BEV"]');
        const phevEl = document.querySelector('input[value="PHEV"]');
        const activeSection = getElement('active-filter-section');
        const dropdown = getElement('manufacturer-dropdown');
        
        if (searchEl) searchEl.value = '';
        if (yearMinEl) yearMinEl.value = 2010;
        if (yearMaxEl) yearMaxEl.value = 2024;
        if (minLabel) minLabel.textContent = '2010';
        if (maxLabel) maxLabel.textContent = '2024';
        if (bevEl) bevEl.checked = true;
        if (phevEl) phevEl.checked = true;
        if (activeSection) activeSection.style.display = 'none';
        if (dropdown) dropdown.classList.remove('active');
        
        selectedMake = null;
    filteredData = [...globalData];
    renderCharts(filteredData);
    } catch (e) {
        console.error('resetFilters error:', e);
    }
};

// Navigation - Re-render charts when switching tabs to sync filters
const setupNavigation = () => {
    try {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
            e.preventDefault();
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                const sectionId = link.getAttribute('data-section');
                document.querySelectorAll('.content-section').forEach(s => {
                    s.classList.toggle('active', s.id === sectionId);
                });
                
                // Re-render charts in the active section to sync with current filters
                // Small delay to ensure section is visible first
                setTimeout(() => {
                    if (selectedMake) {
                        renderChartsWithSelection();
                    } else {
                        renderCharts(filteredData);
                }
                }, 50);
            });
        });
    } catch (e) {
        console.error('setupNavigation error:', e);
    }
};

// Dropdowns
const setupDropdowns = () => {
    try {
        document.querySelectorAll('.dropdown').forEach(dd => {
            const btn = dd.querySelector('.dropdown-btn');
            if (btn) btn.addEventListener('click', () => dd.classList.toggle('active'));
    });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
                document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('active'));
        }
    });
    } catch (e) {
        console.error('setupDropdowns error:', e);
    }
};

const populateDropdown = (id, data, onChange) => {
    try {
        const el = getElement(id);
        if (!el) return;
        const content = el.querySelector('.dropdown-content');
        if (!content) return;
        const makes = [...new Set(data.map(d => d.Make).filter(m => m))].sort();
        content.innerHTML = makes.map(m => `<label><input type="checkbox" value="${m}" checked><span>${m}</span></label>`).join('');
        content.querySelectorAll('input').forEach(i => i.addEventListener('change', onChange));
    } catch (e) {
        console.error('populateDropdown error:', e);
    }
};

const getCheckedMakes = (id) => {
    try {
        const el = getElement(id);
        if (!el) return [];
        return Array.from(el.querySelectorAll('input:checked')).map(i => i.value);
    } catch (e) {
        return [];
    }
};

// Year Sliders with Real-Time Update
const setupYearSliders = () => {
    try {
        const minSlider = getElement('year-min');
        const maxSlider = getElement('year-max');
        const minLabel = getElement('year-min-label');
        const maxLabel = getElement('year-max-label');
    
        if (!minSlider || !maxSlider) return;
        
        let sliderTimeout;
        
        const updateSliders = () => {
            let minVal = parseInt(minSlider.value) || 2010;
            let maxVal = parseInt(maxSlider.value) || 2024;
            
            // Clamp values
            minVal = Math.max(2010, Math.min(2024, minVal));
            maxVal = Math.max(2010, Math.min(2024, maxVal));
            
            // Ensure min <= max
        if (minVal > maxVal) {
                minVal = maxVal;
                minSlider.value = minVal;
            }
            if (maxVal < minVal) {
                maxVal = minVal;
                maxSlider.value = maxVal;
        }
            
            // Update labels
            if (minLabel) minLabel.textContent = minVal;
            if (maxLabel) maxLabel.textContent = maxVal;
            
            // Debounced filter update
            clearTimeout(sliderTimeout);
            sliderTimeout = setTimeout(applyFiltersRealTime, 200);
        };
        
        minSlider.addEventListener('input', updateSliders);
        maxSlider.addEventListener('input', updateSliders);
        minSlider.addEventListener('change', applyFiltersRealTime);
        maxSlider.addEventListener('change', applyFiltersRealTime);
    } catch (e) {
        console.error('setupYearSliders error:', e);
    }
};

// Export
const setupExport = () => {
    try {
        const btn = getElement('export-btn');
        if (!btn) return;
        btn.addEventListener('click', () => {
            try {
                const headers = ['Make', 'Model', 'Year', 'Type', 'Range', 'City'];
                const rows = filteredData.slice(0, 1000).map(d => [
                    d.Make || '', d.Model || '', d['Model Year'] || '', 
                    d['Electric Vehicle Type'] || '', d['Electric Range'] || '', d.City || ''
                ]);
                const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'ev_data_export.csv';
                a.click();
            } catch (e) {
                console.error('Export error:', e);
            }
        });
    } catch (e) {
        console.error('setupExport error:', e);
    }
};

// Setup Manufacturer Search Autocomplete
const setupManufacturerSearch = () => {
    try {
        const searchInput = getElement('manufacturer-search');
        const dropdown = getElement('manufacturer-dropdown');
        const dropdownList = getElement('manufacturer-list');
        const toggleBtn = getElement('search-toggle');
        
        if (!searchInput || !dropdown || !dropdownList) return;
        
        // Get unique manufacturers with counts
        const getManufacturers = () => {
            const counts = d3.rollup(globalData, v => v.length, d => d.Make);
            return Array.from(counts, ([make, count]) => ({ make, count }))
                .filter(m => m.make)
                .sort((a, b) => b.count - a.count);
        };
        
        // Render dropdown list
        const renderDropdown = (filter = '') => {
            const manufacturers = getManufacturers();
            const filtered = filter 
                ? manufacturers.filter(m => m.make.toLowerCase().includes(filter.toLowerCase()))
                : manufacturers;
            
            if (filtered.length === 0) {
                dropdownList.innerHTML = '<div class="search-no-results">No manufacturers found</div>';
                return;
            }
            
            dropdownList.innerHTML = `
                <div class="search-dropdown-header">${filtered.length} Manufacturers</div>
                ${filtered.map(m => `
                    <div class="search-dropdown-item" data-make="${m.make}">
                        <span>${m.make}</span>
                        <span class="item-count">${d3.format(',')(m.count)}</span>
                    </div>
                `).join('')}
            `;
            
            // Add click handlers
            dropdownList.querySelectorAll('.search-dropdown-item').forEach(item => {
                item.addEventListener('click', () => {
                    const make = item.dataset.make;
                    searchInput.value = make;
                    dropdown.classList.remove('active');
                    applyFiltersRealTime();
                });
            });
        };
        
        // Toggle dropdown
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('active');
                if (dropdown.classList.contains('active')) {
                    renderDropdown(searchInput.value);
                }
            });
        }
        
        // Show dropdown on focus
        searchInput.addEventListener('focus', () => {
            dropdown.classList.add('active');
            renderDropdown(searchInput.value);
    });
        
        // Filter on input
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            dropdown.classList.add('active');
            renderDropdown(searchInput.value);

            // Debounced filter apply
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(applyFiltersRealTime, 300);
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-wrapper')) {
                dropdown.classList.remove('active');
            }
        });
        
        // Keyboard navigation
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                dropdown.classList.remove('active');
            } else if (e.key === 'Enter') {
                dropdown.classList.remove('active');
                applyFiltersRealTime();
            }
        });
    } catch (e) {
        console.error('setupManufacturerSearch error:', e);
    }
};

// Setup Real-Time Event Listeners
const setupEventListeners = () => {
    try {
        const applyBtn = document.querySelector('.btn-apply-filters');
        const resetBtn = document.querySelector('.btn-reset-filters');
        const clearBtn = getElement('clear-filter-btn');
        
        if (applyBtn) applyBtn.addEventListener('click', applyFiltersRealTime);
        if (resetBtn) resetBtn.addEventListener('click', resetFilters);
    
        // Real-time checkbox updates
        document.querySelectorAll('.checkbox-item input').forEach(cb => {
            cb.addEventListener('change', applyFiltersRealTime);
        });
        
        // Clear filter button
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                selectedMake = null;
                const activeSection = getElement('active-filter-section');
                if (activeSection) activeSection.style.display = 'none';
                renderChartsWithSelection();
            });
        }
    } catch (e) {
        console.error('setupEventListeners error:', e);
    }
};

// Initialize
const init = async () => {
    console.log('Starting EV Insights Dashboard...');
    
    try {
        globalData = await loadData();
        filteredData = [...globalData];
        
        setupNavigation();
        setupDropdowns();
        setupYearSliders();
        setupEventListeners();
        setupManufacturerSearch();
        setupExport();
        
        populateDropdown('bar-dropdown', globalData, () => {
            charts.bar.render(processBarData(filteredData, getCheckedMakes('bar-dropdown')), selectedMake);
        });
        
        populateDropdown('line-dropdown', globalData, () => {
            charts.line.render(processLineData(filteredData, getCheckedMakes('line-dropdown')));
        });
        
        renderCharts(filteredData);
        console.log('Dashboard ready!');
    } catch (e) {
        console.error('Init failed:', e);
        const container = getElement('insights-list');
        if (container) {
            container.innerHTML = '<div class="insight-item"><span class="insight-icon">⚠️</span><span class="insight-text">Error loading data. Please refresh the page.</span></div>';
        }
    }
};

init();
