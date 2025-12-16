export default class ScatterPlot {
    constructor(selector) {
        this.selector = selector;
        this.margin = { top: 50, right: 30, bottom: 70, left: 70 };
    }

    render(data) {
        const container = d3.select(this.selector).node().parentElement;
        const containerWidth = container.getBoundingClientRect().width - 40;
        const containerHeight = 360;
        const width = containerWidth - this.margin.left - this.margin.right;
        const height = containerHeight - this.margin.top - this.margin.bottom;

        d3.select(this.selector).selectAll('*').remove();

        const validData = data.filter(d => d[0] && !isNaN(d[0]) && d[1] && !isNaN(d[1]) && d[1] > 0);
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
            .text('Electric Range Evolution Over Time');

        // Subtitle
        svg.append('text')
            .attr('x', width / 2).attr('y', -12)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px').attr('fill', '#6b7280')
            .text('Shows how average battery range has improved year by year');

        const xScale = d3.scaleLinear().domain(d3.extent(validData, d => +d[0])).nice().range([0, width]);
        const yScale = d3.scaleLinear().domain([0, d3.max(validData, d => d[1]) * 1.15]).nice().range([height, 0]);

        // Grid
        svg.append('g').attr('class', 'grid')
            .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(''))
            .selectAll('line').attr('stroke', '#e5e7eb').attr('stroke-dasharray', '3,3');
        svg.select('.grid .domain').remove();

        // Trend area
        svg.append('path')
            .datum(validData)
            .attr('fill', 'rgba(37, 99, 235, 0.1)')
            .attr('d', d3.area()
                .x(d => xScale(+d[0]))
                .y0(height)
                .y1(d => yScale(d[1]))
                .curve(d3.curveMonotoneX));

        // Trend line
        svg.append('path')
            .datum(validData)
            .attr('fill', 'none')
            .attr('stroke', '#2563eb')
            .attr('stroke-width', 3)
            .attr('d', d3.line().x(d => xScale(+d[0])).y(d => yScale(d[1])).curve(d3.curveMonotoneX));

        // Points
        svg.selectAll('.point')
            .data(validData)
            .enter()
            .append('circle')
            .attr('cx', d => xScale(+d[0]))
            .attr('cy', d => yScale(d[1]))
            .attr('r', 0)
            .attr('fill', '#2563eb')
            .attr('stroke', '#fff')
            .attr('stroke-width', 3)
            .on('mouseover', (e, d) => {
                d3.select(e.target).attr('r', 12);
                this.showTooltip(e, d);
            })
            .on('mouseout', (e) => {
                d3.select(e.target).attr('r', 8);
                this.hideTooltip();
            })
            .transition().duration(600).delay((d, i) => i * 60).attr('r', 8);

        // Axes
        svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(xScale).tickFormat(d3.format('d')));
        svg.append('g').call(d3.axisLeft(yScale).ticks(6).tickFormat(d => Math.round(d) + ' mi'));

        // Labels
        svg.append('text').attr('x', width / 2).attr('y', height + 50)
            .attr('text-anchor', 'middle').attr('font-size', '12px').attr('font-weight', '500').attr('fill', '#374151').text('Model Year');
        svg.append('text').attr('transform', 'rotate(-90)').attr('x', -height / 2).attr('y', -55)
            .attr('text-anchor', 'middle').attr('font-size', '12px').attr('font-weight', '500').attr('fill', '#374151').text('Average Electric Range (miles)');

        // Improvement annotation
        if (validData.length >= 2) {
            const first = validData[0];
            const last = validData[validData.length - 1];
            const improvement = Math.round(((last[1] - first[1]) / first[1]) * 100);
            const milesGain = Math.round(last[1] - first[1]);
            
            svg.append('rect')
                .attr('x', width - 120)
                .attr('y', 5)
                .attr('width', 115)
                .attr('height', 45)
                .attr('fill', 'rgba(16, 185, 129, 0.1)')
                .attr('rx', 6);
            
        svg.append('text')
                .attr('x', width - 62)
                .attr('y', 22)
            .attr('text-anchor', 'middle')
                .attr('font-size', '11px')
                .attr('font-weight', '700')
                .attr('fill', '#10b981')
                .text(`+${improvement}% improvement`);

        svg.append('text')
                .attr('x', width - 62)
                .attr('y', 40)
            .attr('text-anchor', 'middle')
                .attr('font-size', '10px')
                .attr('fill', '#6b7280')
                .text(`+${milesGain} miles since ${first[0]}`);
        }
    }

    showTooltip(event, d) {
        d3.select('#tooltip')
            .html(`
                <div style="font-size:14px;font-weight:700;color:#2563eb;margin-bottom:4px;">Year ${d[0]}</div>
                <div style="font-size:22px;font-weight:700;color:#1f2937;">${Math.round(d[1])} miles</div>
                <div style="font-size:11px;color:#6b7280;">average electric range</div>
        `)
            .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .classed('visible', true);
    }

    hideTooltip() { d3.select('#tooltip').classed('visible', false); }
}
