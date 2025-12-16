export default class StackedBarChart {
    constructor(selector) {
        this.selector = selector;
        this.margin = { top: 50, right: 30, bottom: 70, left: 70 };
        this.colors = { BEV: '#2563eb', PHEV: '#f59e0b' };
    }

    render(data) {
        const container = d3.select(this.selector).node().parentElement;
        const containerWidth = container.getBoundingClientRect().width - 40;
        const containerHeight = 360;
        const width = containerWidth - this.margin.left - this.margin.right;
        const height = containerHeight - this.margin.top - this.margin.bottom;

        d3.select(this.selector).selectAll('*').remove();

        const validData = data.filter(d => d.year && !isNaN(d.year));
        if (!validData.length) return;

        const svg = d3.select(this.selector)
            .attr('width', containerWidth)
            .attr('height', containerHeight)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        // Title
        svg.append('text')
            .attr('x', width / 2).attr('y', -30)
            .attr('text-anchor', 'middle')
            .attr('font-size', '15px').attr('font-weight', '600').attr('fill', '#1f2937')
            .text('BEV vs PHEV Registrations by Year');

        // Subtitle
        svg.append('text')
            .attr('x', width / 2).attr('y', -12)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px').attr('fill', '#6b7280')
            .text('Stacked bars show total registrations split by vehicle type');

        const xScale = d3.scaleBand().domain(validData.map(d => d.year)).range([0, width]).padding(0.3);
        const yScale = d3.scaleLinear().domain([0, d3.max(validData, d => (d.BEV || 0) + (d.PHEV || 0)) * 1.1]).nice().range([height, 0]);

        // Grid
        svg.append('g').attr('class', 'grid')
            .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(''))
            .selectAll('line').attr('stroke', '#e5e7eb').attr('stroke-dasharray', '3,3');
        svg.select('.grid .domain').remove();

        const stack = d3.stack().keys(['BEV', 'PHEV']);

        svg.selectAll('.stack')
            .data(stack(validData))
            .enter()
            .append('g')
            .attr('fill', d => this.colors[d.key])
            .selectAll('rect')
            .data(d => d)
            .enter()
            .append('rect')
            .attr('x', d => xScale(d.data.year))
            .attr('width', xScale.bandwidth())
            .attr('y', height)
            .attr('height', 0)
            .attr('rx', 3)
            .on('mouseover', (e, d) => this.showTooltip(e, d))
            .on('mouseout', () => this.hideTooltip())
            .transition().duration(800).delay((d, i) => i * 50)
            .attr('y', d => yScale(d[1]))
            .attr('height', d => Math.max(0, yScale(d[0]) - yScale(d[1])));

        // Axes
        svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(xScale))
            .selectAll('text').attr('transform', 'rotate(-45)').attr('text-anchor', 'end').attr('font-size', '11px');
        svg.append('g').call(d3.axisLeft(yScale).ticks(6).tickFormat(d3.format(',.0f')));

        // Labels
        svg.append('text').attr('x', width / 2).attr('y', height + 60)
            .attr('text-anchor', 'middle').attr('font-size', '12px').attr('font-weight', '500').attr('fill', '#374151').text('Model Year');
        svg.append('text').attr('transform', 'rotate(-90)').attr('x', -height / 2).attr('y', -55)
            .attr('text-anchor', 'middle').attr('font-size', '12px').attr('font-weight', '500').attr('fill', '#374151').text('Number of Vehicles');
    }

    showTooltip(event, d) {
        const total = (d.data.BEV || 0) + (d.data.PHEV || 0);
        const bevPercent = total > 0 ? ((d.data.BEV / total) * 100).toFixed(1) : 0;
        const phevPercent = total > 0 ? ((d.data.PHEV / total) * 100).toFixed(1) : 0;
        
        d3.select('#tooltip')
            .html(`
                <div style="font-size:14px;font-weight:700;color:#1f2937;margin-bottom:8px;">Year ${d.data.year}</div>
                <div style="display:grid;grid-template-columns:auto auto auto;gap:4px 10px;font-size:12px;">
                    <span style="color:#2563eb;">●</span>
                    <span>BEV:</span>
                    <span style="font-weight:600;">${d3.format(',')(d.data.BEV || 0)} (${bevPercent}%)</span>
                    <span style="color:#f59e0b;">●</span>
                    <span>PHEV:</span>
                    <span style="font-weight:600;">${d3.format(',')(d.data.PHEV || 0)} (${phevPercent}%)</span>
                </div>
                <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;font-weight:700;">
                    Total: ${d3.format(',')(total)}
                </div>
        `)
            .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .classed('visible', true);
    }

    hideTooltip() { d3.select('#tooltip').classed('visible', false); }
}
