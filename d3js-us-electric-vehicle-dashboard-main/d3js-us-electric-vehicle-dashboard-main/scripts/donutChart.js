export default class DonutChart {
    constructor(selector) {
        this.selector = selector;
        this.colors = {
            'Battery Electric Vehicle (BEV)': '#2563eb',
            'Plug-in Hybrid Electric Vehicle (PHEV)': '#f59e0b'
        };
    }

    render(data) {
        const container = d3.select(this.selector).node().parentElement;
        const size = Math.min(container.getBoundingClientRect().width - 40, 280);
        const radius = size / 2;
        const innerRadius = radius * 0.55;

        d3.select(this.selector).selectAll('*').remove();

        if (!data || data.length === 0) return;

        const svg = d3.select(this.selector)
            .attr('width', size)
            .attr('height', size + 40)
            .append('g')
            .attr('transform', `translate(${size / 2},${size / 2 + 25})`);

        // Title
        svg.append('text')
            .attr('y', -size / 2 - 10)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('font-weight', '600')
            .attr('fill', '#1f2937')
            .text('EV Type Distribution');

        const pie = d3.pie().value(d => d.count).sort(null).padAngle(0.03);
        const arc = d3.arc().innerRadius(innerRadius).outerRadius(radius);
        const arcHover = d3.arc().innerRadius(innerRadius).outerRadius(radius + 10);

        const total = d3.sum(data, d => d.count);

        const slices = svg.selectAll('.slice')
            .data(pie(data))
            .enter()
            .append('path')
            .attr('fill', d => this.colors[d.data.type] || '#9ca3af')
            .attr('stroke', '#fff')
            .attr('stroke-width', 3)
            .on('mouseover', (e, d) => {
                d3.select(e.target).transition().duration(200).attr('d', arcHover);
                this.showTooltip(e, d.data, total);
            })
            .on('mouseout', (e) => {
                d3.select(e.target).transition().duration(200).attr('d', arc);
                this.hideTooltip();
            });

        slices.transition().duration(800)
            .attrTween('d', function(d) {
                const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
                return t => arc(i(t));
            });

        // Percentage labels on slices
        svg.selectAll('.slice-label')
            .data(pie(data))
            .enter()
            .append('text')
            .attr('transform', d => `translate(${arc.centroid(d)})`)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('font-weight', '700')
            .attr('fill', '#fff')
            .attr('opacity', 0)
            .text(d => d.data.percentage + '%')
            .transition().delay(600).duration(400)
            .attr('opacity', 1);

        this.updateLegend(data, total);
    }

    updateLegend(data, total) {
        const container = d3.select('#donut-legend');
        container.selectAll('*').remove();

        data.forEach(d => {
            const item = container.append('div').attr('class', 'legend-item');
            item.append('span').attr('class', 'legend-dot').style('background', this.colors[d.type] || '#9ca3af');
            const label = d.type.includes('Battery') ? 'BEV (Battery Electric)' : 'PHEV (Plug-in Hybrid)';
            item.append('span').html(`${label}: <strong>${d.percentage}%</strong> (${d3.format(',')(d.count)})`);
        });
    }

    showTooltip(event, d, total) {
        const label = d.type.includes('Battery') ? 'Battery Electric Vehicle (BEV)' : 'Plug-in Hybrid Electric Vehicle (PHEV)';
        const description = d.type.includes('Battery') 
            ? 'Fully electric, no gasoline engine' 
            : 'Electric + gasoline hybrid';
        d3.select('#tooltip')
            .html(`
                <div style="font-size:14px;font-weight:700;color:${this.colors[d.type]};margin-bottom:4px;">${label}</div>
                <div style="font-size:11px;color:#6b7280;margin-bottom:8px;">${description}</div>
                <div style="font-size:22px;font-weight:700;color:#1f2937;">${d3.format(',')(d.count)}</div>
                <div style="font-size:12px;color:#6b7280;">vehicles (${d.percentage}% of total)</div>
        `)
            .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .classed('visible', true);
    }

    hideTooltip() { d3.select('#tooltip').classed('visible', false); }
}
