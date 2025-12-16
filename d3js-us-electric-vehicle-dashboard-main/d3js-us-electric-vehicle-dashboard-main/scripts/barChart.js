export default class BarChart {
    constructor(selector) {
        this.selector = selector;
        this.margin = { top: 50, right: 30, bottom: 100, left: 80 };
    }

    render(data, selectedMake = null) {
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
            .text('Top 15 EV Manufacturers by Registration Count');

        // Subtitle
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', -12)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('fill', '#6b7280')
            .text('Click any bar to filter all charts by that manufacturer');

        const total = d3.sum(data, d => d.count);

        const xScale = d3.scaleBand()
            .domain(data.map(d => d.make))
            .range([0, width])
            .padding(0.25);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.count) * 1.1])
            .nice()
            .range([height, 0]);

        // Grid lines
        svg.append('g')
            .attr('class', 'grid')
            .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(''))
            .selectAll('line').attr('stroke', '#e5e7eb').attr('stroke-dasharray', '3,3');
        svg.select('.grid .domain').remove();

        // Bars
        const bars = svg.selectAll('.bar')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', d => `bar ${selectedMake === d.make ? 'selected' : selectedMake ? 'dimmed' : ''}`)
            .attr('x', d => xScale(d.make))
            .attr('width', xScale.bandwidth())
            .attr('y', height)
            .attr('height', 0)
            .attr('fill', d => selectedMake && d.make !== selectedMake ? '#d1d5db' : '#2563eb')
            .attr('rx', 4)
            .style('cursor', 'pointer')
            .on('click', (e, d) => window.onBarClick && window.onBarClick(d.make))
            .on('mouseover', (e, d) => {
                d3.select(e.target).attr('fill', selectedMake && d.make !== selectedMake ? '#9ca3af' : '#1d4ed8');
                this.showTooltip(e, d, total);
            })
            .on('mouseout', (e, d) => {
                d3.select(e.target).attr('fill', selectedMake && d.make !== selectedMake ? '#d1d5db' : '#2563eb');
                this.hideTooltip();
            });

        bars.transition().duration(800).delay((d, i) => i * 50)
            .attr('y', d => yScale(d.count))
            .attr('height', d => height - yScale(d.count));

        // Value labels on bars
        svg.selectAll('.bar-label')
            .data(data)
            .enter()
            .append('text')
            .attr('class', 'bar-label')
            .attr('x', d => xScale(d.make) + xScale.bandwidth() / 2)
            .attr('y', d => yScale(d.count) - 5)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('font-weight', '500')
            .attr('fill', '#4b5563')
            .attr('opacity', 0)
            .text(d => d3.format('.1s')(d.count))
            .transition().duration(800).delay((d, i) => i * 50 + 400)
            .attr('opacity', 1);

        // X Axis
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .attr('text-anchor', 'end')
            .attr('dx', '-0.5em')
            .attr('dy', '0.5em')
            .attr('font-size', '11px')
            .text(d => d.length > 12 ? d.substring(0, 12) + '…' : d);

        // Y Axis
        svg.append('g')
            .call(d3.axisLeft(yScale).ticks(6).tickFormat(d3.format(',.0f')));

        // Axis Labels
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', height + 85)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('font-weight', '500')
            .attr('fill', '#374151')
            .text('Manufacturer');

        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', -60)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('font-weight', '500')
            .attr('fill', '#374151')
            .text('Number of Registered Vehicles');
    }

    showTooltip(event, d, total) {
        const percentage = ((d.count / total) * 100).toFixed(1);
        d3.select('#tooltip')
            .html(`
                <div style="font-size:15px;font-weight:700;color:#2563eb;margin-bottom:6px;">${d.make}</div>
                <div style="font-size:22px;font-weight:700;color:#1f2937;">${d3.format(',')(d.count)}</div>
                <div style="font-size:12px;color:#6b7280;">registered vehicles</div>
                <div style="margin-top:6px;padding-top:6px;border-top:1px solid #e5e7eb;">
                    <span style="font-size:12px;color:#6b7280;">Market Share: </span>
                    <span style="font-weight:600;color:#10b981;">${percentage}%</span>
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
