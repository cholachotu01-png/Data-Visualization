export default class TreemapChart {
    constructor(selector) {
        this.selector = selector;
        this.colors = ['#2563eb', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];
    }

    render(data) {
        const container = d3.select(this.selector).node().parentElement;
        const containerWidth = container.getBoundingClientRect().width - 40;
        const containerHeight = 340;

        d3.select(this.selector).selectAll('*').remove();

        if (!data || !data.children || data.children.length === 0) return;

        const svg = d3.select(this.selector)
            .attr('width', containerWidth)
            .attr('height', containerHeight);

        // Title
        svg.append('text')
            .attr('x', containerWidth / 2)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('font-weight', '600')
            .attr('fill', '#1f2937')
            .text('Market Share: Top Manufacturers & Models');

        // Subtitle
        svg.append('text')
            .attr('x', containerWidth / 2)
            .attr('y', 36)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('fill', '#6b7280')
            .text('Rectangle size = number of vehicles | Hover for details');

        const treemapGroup = svg.append('g').attr('transform', 'translate(0, 45)');
        const treemapHeight = containerHeight - 50;

        const root = d3.hierarchy(data).sum(d => d.value).sort((a, b) => b.value - a.value);
        d3.treemap().size([containerWidth, treemapHeight]).padding(3).round(true)(root);

        const totalValue = root.value;

        const colorScale = d3.scaleOrdinal()
            .domain(root.children ? root.children.map(d => d.data.name) : [])
            .range(this.colors);

        const leaves = treemapGroup.selectAll('g')
            .data(root.leaves())
            .enter()
            .append('g')
            .attr('transform', d => `translate(${d.x0},${d.y0})`);

        // Rectangles
        leaves.append('rect')
            .attr('width', d => d.x1 - d.x0)
            .attr('height', d => d.y1 - d.y0)
            .attr('fill', d => colorScale(d.parent?.data.name || d.data.name))
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .attr('opacity', 0)
            .style('cursor', 'pointer')
            .on('mouseover', (e, d) => {
                d3.select(e.target).attr('opacity', 0.85);
                this.showTooltip(e, d, totalValue);
            })
            .on('mouseout', (e) => {
                d3.select(e.target).attr('opacity', 1);
                this.hideTooltip();
            })
            .transition().duration(600).delay((d, i) => i * 25).attr('opacity', 1);

        // Model Labels
        leaves.append('text')
            .attr('x', 6)
            .attr('y', 16)
            .attr('font-size', '11px')
            .attr('font-weight', '600')
            .attr('fill', '#fff')
            .text(d => {
                const w = d.x1 - d.x0, h = d.y1 - d.y0;
                if (w > 50 && h > 25) return d.data.name.length > Math.floor(w / 8) 
                    ? d.data.name.substring(0, Math.floor(w / 8)) + '..'
                    : d.data.name;
                return '';
            });

        // Count Labels
        leaves.append('text')
            .attr('x', 6)
            .attr('y', 30)
            .attr('font-size', '10px')
            .attr('fill', 'rgba(255,255,255,0.85)')
            .text(d => {
                const w = d.x1 - d.x0, h = d.y1 - d.y0;
                if (w > 50 && h > 40) return d3.format(',')(d.value);
                return '';
            });

        // Brand Labels (parent)
        leaves.append('text')
            .attr('x', 6)
            .attr('y', d => d.y1 - d.y0 - 6)
            .attr('font-size', '9px')
            .attr('fill', 'rgba(255,255,255,0.7)')
            .text(d => {
                const w = d.x1 - d.x0, h = d.y1 - d.y0;
                if (w > 60 && h > 50) return d.parent?.data.name || '';
                return '';
            });
    }

    showTooltip(event, d, totalValue) {
        const percentage = ((d.value / totalValue) * 100).toFixed(2);
        const parentName = d.parent?.data.name || 'Unknown';
        
        d3.select('#tooltip')
            .html(`
                <div style="font-size:11px;color:#6b7280;margin-bottom:2px;">${parentName}</div>
                <div style="font-size:15px;font-weight:700;color:#2563eb;margin-bottom:6px;">${d.data.name}</div>
                <div style="font-size:22px;font-weight:700;color:#1f2937;">${d3.format(',')(d.value)}</div>
                <div style="font-size:12px;color:#6b7280;">vehicles registered</div>
                <div style="margin-top:6px;padding-top:6px;border-top:1px solid #e5e7eb;">
                    <span style="font-size:12px;color:#6b7280;">Market Share: </span>
                    <span style="font-weight:600;color:#10b981;">${percentage}%</span>
                </div>
        `)
            .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .classed('visible', true);
    }

    hideTooltip() { d3.select('#tooltip').classed('visible', false); }
}
