export default class MapChart {
    constructor(selector) {
        this.selector = selector;
        this.zoom = null;
        this.svg = null;
        this.g = null;
    }

    render(geoData, points) {
        const container = d3.select(this.selector).node().parentElement;
        const containerWidth = container.getBoundingClientRect().width - 40;
        const containerHeight = 520;

        d3.select(this.selector).selectAll('*').remove();

        this.svg = d3.select(this.selector)
            .attr('width', containerWidth)
            .attr('height', containerHeight);

        this.g = this.svg.append('g');

        if (!geoData || !geoData.features) {
            this.svg.append('text')
                .attr('x', containerWidth / 2)
                .attr('y', containerHeight / 2)
                .attr('text-anchor', 'middle')
                .attr('fill', '#9ca3af')
                .text('Loading map data...');
            return;
        }

        // Title
        this.svg.append('text')
            .attr('x', containerWidth / 2)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('font-weight', '600')
            .attr('fill', '#374151')
            .text('Electric Vehicle Registration Locations Across the United States');

        const projection = d3.geoAlbersUsa()
            .fitSize([containerWidth - 40, containerHeight - 80], geoData)
            .translate([containerWidth / 2, containerHeight / 2 + 10]);

        const path = d3.geoPath().projection(projection);

        // Zoom behavior
        this.zoom = d3.zoom()
            .scaleExtent([1, 12])
            .on('zoom', (event) => {
                this.g.attr('transform', event.transform);
                // Adjust point sizes on zoom
                this.g.selectAll('.map-point')
                    .attr('r', 3 / event.transform.k);
            });

        this.svg.call(this.zoom);

        // Draw states with better styling
        this.g.selectAll('.map-region')
            .data(geoData.features)
            .enter()
            .append('path')
                .attr('class', 'map-region')
            .attr('d', path)
            .attr('fill', '#e5e7eb')
            .attr('stroke', '#fff')
                .attr('stroke-width', 1);

        // Process and aggregate points by city
        const validPoints = points.filter(p => p && p.lon && p.lat);
        
        // Aggregate by city for heat-like effect
        const cityAgg = d3.rollup(validPoints, v => ({
            count: v.length,
            lon: d3.mean(v, d => d.lon),
            lat: d3.mean(v, d => d.lat),
            city: v[0].city
        }), d => d.city);

        const cityData = Array.from(cityAgg.values()).filter(d => {
            const p = projection([d.lon, d.lat]);
            return p !== null;
        });

        // Color scale based on count
        const maxCount = d3.max(cityData, d => d.count) || 1;
        const colorScale = d3.scaleSequential(d3.interpolateBlues)
            .domain([0, maxCount]);

        const sizeScale = d3.scaleSqrt()
            .domain([1, maxCount])
            .range([3, 20]);

        // Draw city points (aggregated)
        this.g.selectAll('.map-point')
            .data(cityData.sort((a, b) => b.count - a.count))
            .enter()
            .append('circle')
            .attr('class', 'map-point')
            .attr('cx', d => {
                const p = projection([d.lon, d.lat]);
                return p ? p[0] : -1000;
            })
            .attr('cy', d => {
                const p = projection([d.lon, d.lat]);
                return p ? p[1] : -1000;
            })
            .attr('r', 0)
            .attr('fill', d => colorScale(d.count))
            .attr('fill-opacity', 0.7)
            .attr('stroke', '#2563eb')
            .attr('stroke-width', 0.5)
            .attr('stroke-opacity', 0.5)
            .on('mouseover', (e, d) => {
                d3.select(e.target)
                    .attr('fill-opacity', 1)
                    .attr('stroke-width', 2)
                    .attr('stroke-opacity', 1);
                this.showTooltip(e, d);
            })
            .on('mouseout', (e) => {
                d3.select(e.target)
                    .attr('fill-opacity', 0.7)
                    .attr('stroke-width', 0.5)
                    .attr('stroke-opacity', 0.5);
                this.hideTooltip();
            })
            .transition()
            .duration(1000)
            .delay((d, i) => Math.min(i * 2, 500))
            .attr('r', d => sizeScale(d.count));

        // Legend
        const legendWidth = 150;
        const legendHeight = 10;
        const legendX = containerWidth - legendWidth - 30;
        const legendY = containerHeight - 50;

        const legendScale = d3.scaleLinear()
            .domain([0, maxCount])
            .range([0, legendWidth]);

        const legendAxis = d3.axisBottom(legendScale)
            .ticks(4)
            .tickFormat(d3.format(',.0f'));

        // Legend gradient
        const defs = this.svg.append('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', 'legend-gradient');

        gradient.selectAll('stop')
            .data([0, 0.25, 0.5, 0.75, 1])
            .enter()
            .append('stop')
            .attr('offset', d => d * 100 + '%')
            .attr('stop-color', d => colorScale(d * maxCount));

        this.svg.append('rect')
            .attr('x', legendX)
            .attr('y', legendY)
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .style('fill', 'url(#legend-gradient)');

        this.svg.append('g')
            .attr('transform', `translate(${legendX},${legendY + legendHeight})`)
            .call(legendAxis)
            .selectAll('text')
            .attr('font-size', '9px');

        this.svg.append('text')
            .attr('x', legendX)
            .attr('y', legendY - 5)
            .attr('font-size', '10px')
            .attr('fill', '#6b7280')
            .text('EVs per city');

        // Info text
        this.svg.append('text')
            .attr('x', 15)
            .attr('y', containerHeight - 15)
            .attr('font-size', '11px')
            .attr('fill', '#9ca3af')
            .text(`${d3.format(',')(cityData.length)} cities • ${d3.format(',')(validPoints.length)} total registrations • Scroll to zoom, drag to pan`);

        this.setupZoomControls();
    }

    setupZoomControls() {
        document.getElementById('zoom-in')?.addEventListener('click', () => {
            this.svg.transition().duration(300).call(this.zoom.scaleBy, 1.5);
        });
        document.getElementById('zoom-out')?.addEventListener('click', () => {
            this.svg.transition().duration(300).call(this.zoom.scaleBy, 0.67);
        });
        document.getElementById('zoom-reset')?.addEventListener('click', () => {
            this.svg.transition().duration(300).call(this.zoom.transform, d3.zoomIdentity);
        });
    }

    showTooltip(event, d) {
        d3.select('#tooltip')
            .html(`
                <div class="tooltip-title">${d.city || 'Unknown'}</div>
                <div class="tooltip-value">${d3.format(',')(d.count)}</div>
                <div style="font-size:11px;color:#9ca3af;">registered EVs</div>
        `)
            .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .classed('visible', true);
    }

    hideTooltip() {
        d3.select('#tooltip').classed('visible', false);
    }
}
