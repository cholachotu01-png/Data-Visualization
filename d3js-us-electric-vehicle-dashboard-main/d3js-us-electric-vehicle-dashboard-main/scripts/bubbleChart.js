export default class BubbleChart {
    constructor(selector) {
        this.selector = selector;
        this.margin = { top: 60, right: 120, bottom: 80, left: 80 };
        this.colors = ['#2563eb', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#14b8a6', '#f97316'];
    }

    render(data) {
        const container = d3.select(this.selector).node().parentElement;
        const containerWidth = container.getBoundingClientRect().width - 40;
        const containerHeight = 480;
        const width = containerWidth - this.margin.left - this.margin.right;
        const height = containerHeight - this.margin.top - this.margin.bottom;

        d3.select(this.selector).selectAll('*').remove();

        const validData = data.filter(d => d.avgYear && d.avgRange > 0 && d.count > 0);
        if (!validData.length) {
            d3.select(this.selector)
                .attr('width', containerWidth)
                .attr('height', 100)
                .append('text')
                .attr('x', containerWidth / 2)
                .attr('y', 50)
                .attr('text-anchor', 'middle')
                .attr('fill', '#9ca3af')
                .text('No data available');
            return;
        }

        const svg = d3.select(this.selector)
            .attr('width', containerWidth)
            .attr('height', containerHeight)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        // Title
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -35)
            .attr('text-anchor', 'middle')
            .attr('font-size', '15px')
            .attr('font-weight', '600')
            .attr('fill', '#1f2937')
            .text('Brand Performance Matrix');

        // Subtitle explaining the chart
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -18)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('fill', '#6b7280')
            .text('X = Average Model Year | Y = Average Electric Range | Bubble Size = Number of Vehicles');

        // Scales
        const xExtent = d3.extent(validData, d => d.avgYear);
        const xScale = d3.scaleLinear()
            .domain([Math.floor(xExtent[0]) - 0.5, Math.ceil(xExtent[1]) + 0.5])
            .range([0, width]);

        const yMax = d3.max(validData, d => d.avgRange);
        const yScale = d3.scaleLinear()
            .domain([0, yMax * 1.15])
            .nice()
            .range([height, 0]);

        const maxCount = d3.max(validData, d => d.count);
        const rScale = d3.scaleSqrt()
            .domain([0, maxCount])
            .range([8, 55]);

        const colorScale = d3.scaleOrdinal()
            .domain(validData.map(d => d.make))
            .range(this.colors);

        // Grid lines
        svg.append('g')
            .attr('class', 'grid')
            .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(''))
            .selectAll('line')
            .attr('stroke', '#e5e7eb')
            .attr('stroke-dasharray', '3,3');
        svg.select('.grid .domain').remove();

        svg.append('g')
            .attr('class', 'grid')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale).tickSize(-height).tickFormat(''))
            .selectAll('line')
            .attr('stroke', '#e5e7eb')
            .attr('stroke-dasharray', '3,3');
        svg.selectAll('.grid .domain').remove();

        // Quadrant labels for context
        const midX = (xExtent[0] + xExtent[1]) / 2;
        const midY = yMax / 2;

        // Add subtle quadrant backgrounds
        svg.append('rect')
            .attr('x', xScale(midX))
            .attr('y', 0)
            .attr('width', width - xScale(midX))
            .attr('height', yScale(midY))
            .attr('fill', 'rgba(16, 185, 129, 0.03)');

        // Quadrant labels
        svg.append('text')
            .attr('x', xScale(midX) + (width - xScale(midX)) / 2)
            .attr('y', yScale(midY) / 2)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('fill', '#10b981')
            .attr('opacity', 0.7)
            .text('⭐ Newer & Longer Range');

        svg.append('text')
            .attr('x', xScale(midX) / 2)
            .attr('y', height - 20)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('fill', '#9ca3af')
            .attr('opacity', 0.7)
            .text('Older Models');

        // Bubbles - sorted so smaller bubbles are on top
        const sortedData = [...validData].sort((a, b) => b.count - a.count);

        svg.selectAll('.bubble')
            .data(sortedData)
            .enter()
            .append('circle')
            .attr('class', 'bubble')
            .attr('cx', d => xScale(d.avgYear))
            .attr('cy', d => yScale(d.avgRange))
            .attr('r', 0)
            .attr('fill', d => colorScale(d.make))
            .attr('fill-opacity', 0.75)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .on('mouseover', (e, d) => {
                d3.select(e.target)
                    .attr('fill-opacity', 1)
                    .attr('stroke-width', 3)
                    .attr('stroke', '#1f2937');
                this.showTooltip(e, d, maxCount);
            })
            .on('mouseout', (e) => {
                d3.select(e.target)
                    .attr('fill-opacity', 0.75)
                    .attr('stroke-width', 2)
                    .attr('stroke', '#fff');
                this.hideTooltip();
            })
            .transition()
            .duration(800)
            .delay((d, i) => i * 40)
            .attr('r', d => rScale(d.count));

        // Labels for top 5 bubbles
        const topBubbles = sortedData.slice(0, 5);
        svg.selectAll('.bubble-label')
            .data(topBubbles)
            .enter()
            .append('text')
            .attr('x', d => xScale(d.avgYear))
            .attr('y', d => yScale(d.avgRange))
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', '#fff')
            .attr('font-size', d => rScale(d.count) > 30 ? '11px' : '9px')
            .attr('font-weight', '600')
            .attr('pointer-events', 'none')
            .text(d => d.make.length > 8 ? d.make.substring(0, 7) + '..' : d.make)
            .attr('opacity', 0)
            .transition()
            .delay(900)
            .duration(400)
            .attr('opacity', 1);

        // X Axis
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale).tickFormat(d3.format('d')).ticks(8))
            .selectAll('text')
            .attr('font-size', '11px');

        // Y Axis
        svg.append('g')
            .call(d3.axisLeft(yScale).ticks(6).tickFormat(d => d + ' mi'))
            .selectAll('text')
            .attr('font-size', '11px');

        // Axis Labels
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', height + 50)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('font-weight', '500')
            .attr('fill', '#374151')
            .text('← Older Models                    Average Model Year                    Newer Models →');

        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', -55)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('font-weight', '500')
            .attr('fill', '#374151')
            .text('Average Electric Range (miles)');

        // Size Legend
        this.drawSizeLegend(svg, width, rScale, maxCount);
    }

    drawSizeLegend(svg, width, rScale, maxCount) {
        const legendX = width + 20;
        const legendY = 20;

        svg.append('text')
            .attr('x', legendX)
            .attr('y', legendY)
            .attr('font-size', '11px')
            .attr('font-weight', '600')
            .attr('fill', '#374151')
            .text('Vehicle Count');

        const legendSizes = [
            { label: 'Large', value: maxCount },
            { label: 'Medium', value: maxCount / 2 },
            { label: 'Small', value: maxCount / 5 }
        ];

        legendSizes.forEach((item, i) => {
            const y = legendY + 30 + i * 50;
            const r = Math.min(rScale(item.value), 20);

            svg.append('circle')
                .attr('cx', legendX + 20)
                .attr('cy', y)
                .attr('r', r)
            .attr('fill', 'none')
                .attr('stroke', '#9ca3af')
                .attr('stroke-width', 1.5);

            svg.append('text')
                .attr('x', legendX + 45)
                .attr('y', y + 4)
                .attr('font-size', '10px')
                .attr('fill', '#6b7280')
                .text(d3.format(',.0f')(item.value));
        });

        // How to read hint
        svg.append('text')
            .attr('x', legendX)
            .attr('y', legendY + 180)
            .attr('font-size', '9px')
            .attr('fill', '#9ca3af')
            .text('💡 Hover bubbles');

        svg.append('text')
            .attr('x', legendX)
            .attr('y', legendY + 195)
            .attr('font-size', '9px')
            .attr('fill', '#9ca3af')
            .text('for details');
    }

    showTooltip(event, d, maxCount) {
        const marketShare = ((d.count / maxCount) * 100).toFixed(1);
        d3.select('#tooltip')
            .html(`
                <div style="font-size:15px;font-weight:700;color:#2563eb;margin-bottom:8px;">${d.make}</div>
                <div style="display:grid;grid-template-columns:auto auto;gap:4px 12px;font-size:12px;">
                    <span style="color:#6b7280;">Vehicles:</span>
                    <span style="font-weight:600;">${d3.format(',')(d.count)}</span>
                    <span style="color:#6b7280;">Avg Year:</span>
                    <span style="font-weight:600;">${Math.round(d.avgYear)}</span>
                    <span style="color:#6b7280;">Avg Range:</span>
                    <span style="font-weight:600;">${Math.round(d.avgRange)} miles</span>
                    <span style="color:#6b7280;">Market Share:</span>
                    <span style="font-weight:600;">${marketShare}%</span>
                </div>
        `)
            .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .classed('visible', true);
    }

    hideTooltip() {
        d3.select('#tooltip').classed('visible', false);
    }
}
