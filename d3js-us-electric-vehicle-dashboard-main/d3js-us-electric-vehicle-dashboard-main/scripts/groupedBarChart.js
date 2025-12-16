export default class GroupedBarChart {
    constructor(selector) {
        this.selector = selector;
        this.margin = { top: 50, right: 30, bottom: 70, left: 70 };
        this.colors = { BEV: '#2563eb', PHEV: '#f59e0b' };
    }

    render(data) {
        const container = d3.select(this.selector).node().parentElement;
        const containerWidth = container.getBoundingClientRect().width - 40;
        const containerHeight = 420;
        const width = containerWidth - this.margin.left - this.margin.right;
        const height = containerHeight - this.margin.top - this.margin.bottom;

        d3.select(this.selector).selectAll('*').remove();

        const validData = data.filter(d => d.yr && !isNaN(d.yr) && d.groups?.length);
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
            .text('BEV vs PHEV: Side-by-Side Annual Comparison');

        // Subtitle
        svg.append('text')
            .attr('x', width / 2).attr('y', -12)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px').attr('fill', '#6b7280')
            .text('Blue bars = Battery Electric (BEV) | Orange bars = Plug-in Hybrid (PHEV)');

        const x0 = d3.scaleBand().domain(validData.map(d => d.yr)).range([0, width]).padding(0.2);
        const x1 = d3.scaleBand().domain(['BEV', 'PHEV']).range([0, x0.bandwidth()]).padding(0.1);
        const yScale = d3.scaleLinear().domain([0, d3.max(validData, d => d3.max(d.groups, g => g.count)) * 1.1]).nice().range([height, 0]);

        // Grid
        svg.append('g').attr('class', 'grid')
            .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(''))
            .selectAll('line').attr('stroke', '#e5e7eb').attr('stroke-dasharray', '3,3');
        svg.select('.grid .domain').remove();

        // Bars
        const yearGroups = svg.selectAll('.year-group')
            .data(validData)
            .enter()
            .append('g')
            .attr('transform', d => `translate(${x0(d.yr)},0)`);

        yearGroups.selectAll('rect')
            .data(d => d.groups.map(g => ({ ...g, year: d.yr })))
            .enter()
            .append('rect')
            .attr('x', d => x1(d.grp))
            .attr('width', x1.bandwidth())
            .attr('y', height)
            .attr('height', 0)
            .attr('fill', d => this.colors[d.grp])
            .attr('rx', 3)
            .on('mouseover', (e, d) => this.showTooltip(e, d, validData))
            .on('mouseout', () => this.hideTooltip())
            .transition().duration(800).delay((d, i) => i * 40)
            .attr('y', d => yScale(d.count))
            .attr('height', d => Math.max(0, height - yScale(d.count)));

        // Axes
        svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x0))
            .selectAll('text').attr('transform', 'rotate(-45)').attr('text-anchor', 'end').attr('font-size', '11px');
        svg.append('g').call(d3.axisLeft(yScale).ticks(6).tickFormat(d3.format(',.0f')));

        // Labels
        svg.append('text').attr('x', width / 2).attr('y', height + 60)
            .attr('text-anchor', 'middle').attr('font-size', '12px').attr('font-weight', '500').attr('fill', '#374151').text('Model Year');
        svg.append('text').attr('transform', 'rotate(-90)').attr('x', -height / 2).attr('y', -55)
            .attr('text-anchor', 'middle').attr('font-size', '12px').attr('font-weight', '500').attr('fill', '#374151').text('Number of Vehicles');
    }

    showTooltip(event, d, allData) {
        const yearData = allData.find(y => y.yr === d.year);
        const otherType = d.grp === 'BEV' ? 'PHEV' : 'BEV';
        const otherCount = yearData?.groups.find(g => g.grp === otherType)?.count || 0;
        const total = d.count + otherCount;
        const percentage = total > 0 ? ((d.count / total) * 100).toFixed(1) : 0;
        
        const label = d.grp === 'BEV' ? 'Battery Electric (BEV)' : 'Plug-in Hybrid (PHEV)';
        const color = this.colors[d.grp];
        
        d3.select('#tooltip')
            .html(`
                <div style="font-size:14px;font-weight:700;color:${color};margin-bottom:4px;">${label}</div>
                <div style="font-size:11px;color:#6b7280;margin-bottom:8px;">Year ${d.year}</div>
                <div style="font-size:22px;font-weight:700;color:#1f2937;">${d3.format(',')(d.count)}</div>
                <div style="font-size:12px;color:#6b7280;">vehicles (${percentage}% of year total)</div>
        `)
            .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .classed('visible', true);
    }

    hideTooltip() { d3.select('#tooltip').classed('visible', false); }
}
