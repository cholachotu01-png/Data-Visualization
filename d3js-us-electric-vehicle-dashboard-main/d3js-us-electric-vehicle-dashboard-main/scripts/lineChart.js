export default class LineChart {
    constructor(selector) {
        this.selector = selector;
        this.margin = { top: 50, right: 30, bottom: 70, left: 70 };
        this.colors = {};
        this.palette = ['#2563eb', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#14b8a6', '#f97316'];
    }

    render(data) {
        const container = d3.select(this.selector).node().parentElement;
        const containerWidth = container.getBoundingClientRect().width - 40;
        const containerHeight = 420;
        const width = containerWidth - this.margin.left - this.margin.right;
        const height = containerHeight - this.margin.top - this.margin.bottom;

        d3.select(this.selector).selectAll('*').remove();

        if (!data || data.length === 0) return;

        const svg = d3.select(this.selector)
            .attr('width', containerWidth)
            .attr('height', containerHeight)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        // Title
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -30)
            .attr('text-anchor', 'middle')
            .attr('font-size', '15px')
            .attr('font-weight', '600')
            .attr('fill', '#1f2937')
            .text('EV Adoption Trends by Manufacturer');

        // Subtitle
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -12)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('fill', '#6b7280')
            .text('Each line shows vehicle registrations over time for a manufacturer');

        const allYears = [...new Set(data.flatMap(d => d.values.map(v => v.year)))].filter(y => y).sort();
        if (!allYears.length) return;

        const xScale = d3.scaleBand().domain(allYears).range([0, width]).padding(0.1);
        const yMax = d3.max(data, d => d3.max(d.values, v => v.count)) || 100;
        const yScale = d3.scaleLinear().domain([0, yMax * 1.1]).nice().range([height, 0]);

        data.forEach((d, i) => { this.colors[d.make] = this.palette[i % this.palette.length]; });

        // Grid
        svg.append('g').attr('class', 'grid')
            .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(''))
            .selectAll('line').attr('stroke', '#e5e7eb').attr('stroke-dasharray', '3,3');
        svg.select('.grid .domain').remove();

        const line = d3.line()
            .defined(d => d.count != null)
            .x(d => xScale(d.year) + xScale.bandwidth() / 2)
            .y(d => yScale(d.count))
            .curve(d3.curveMonotoneX);

        data.forEach((makeData, idx) => {
            const vals = makeData.values.filter(d => d.count != null);
            if (!vals.length) return;

            // Line
            const path = svg.append('path')
                .datum(vals)
                .attr('fill', 'none')
                .attr('stroke', this.colors[makeData.make])
                .attr('stroke-width', 2.5)
                .attr('d', line);

            const len = path.node().getTotalLength();
            path.attr('stroke-dasharray', len).attr('stroke-dashoffset', len)
                .transition().duration(1500).attr('stroke-dashoffset', 0);

            // Dots
            svg.selectAll(`.dot-${idx}`)
                .data(vals)
                .enter()
                .append('circle')
                .attr('cx', d => xScale(d.year) + xScale.bandwidth() / 2)
                .attr('cy', d => yScale(d.count))
                .attr('r', 0)
                .attr('fill', this.colors[makeData.make])
                .attr('stroke', '#fff')
                .attr('stroke-width', 2)
                .on('mouseover', (e, d) => {
                    d3.select(e.target).attr('r', 8);
                    this.showTooltip(e, d, makeData.make);
                })
                .on('mouseout', (e) => {
                    d3.select(e.target).attr('r', 5);
                    this.hideTooltip();
                })
                .transition().duration(500).delay((d, i) => 1000 + i * 80).attr('r', 5);
        });

        // X Axis
        svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(xScale))
            .selectAll('text').attr('transform', 'rotate(-45)').attr('text-anchor', 'end').attr('font-size', '11px');

        // Y Axis
        svg.append('g').call(d3.axisLeft(yScale).ticks(6).tickFormat(d3.format(',.0f')));

        // Labels
        svg.append('text')
            .attr('x', width / 2).attr('y', height + 60)
            .attr('text-anchor', 'middle').attr('font-size', '12px').attr('font-weight', '500').attr('fill', '#374151')
            .text('Model Year');

        svg.append('text')
            .attr('transform', 'rotate(-90)').attr('x', -height / 2).attr('y', -55)
            .attr('text-anchor', 'middle').attr('font-size', '12px').attr('font-weight', '500').attr('fill', '#374151')
            .text('Number of Vehicles Registered');

        this.updateLegend(data);
    }

    updateLegend(data) {
        const container = d3.select('#line-legend');
        container.selectAll('*').remove();
        data.forEach(d => {
            const item = container.append('div').attr('class', 'legend-item');
            item.append('span').attr('class', 'legend-dot').style('background', this.colors[d.make]);
            item.append('span').text(d.make);
        });
    }

    showTooltip(event, d, make) {
        d3.select('#tooltip')
            .html(`
                <div style="font-size:14px;font-weight:700;color:#2563eb;margin-bottom:4px;">${make}</div>
                <div style="display:flex;gap:8px;align-items:baseline;">
                    <span style="font-size:11px;color:#6b7280;">Year ${d.year}:</span>
                    <span style="font-size:18px;font-weight:700;">${d3.format(',')(d.count)}</span>
                </div>
                <div style="font-size:11px;color:#6b7280;">vehicles registered</div>
        `)
            .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .classed('visible', true);
    }

    hideTooltip() { d3.select('#tooltip').classed('visible', false); }
}
