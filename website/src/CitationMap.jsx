/**
 * Citation Map Component
 * 
 * This component creates an interactive chord diagram visualization showing
 * citation relationships between research papers in the KG exploration survey data.
 * 
 * Features:
 * - D3.js chord diagram visualization
 * - Interactive hover effects
 * - SVG download functionality
 * - Responsive design with Tailwind CSS
 * - Citation relationship analysis
 */

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import Navigation from './Navigation';

/**
 * Main CitationMap component
 */
function CitationMap() {
  const chartRef = useRef();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [svgNode, setSvgNode] = useState(null);

  // Load citation data on component mount
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/data@3.json`)
      .then((res) => {
        if (!res.ok) throw new Error('Error loading data');
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Render chord chart when data is loaded
  useEffect(() => {
    if (!data || !chartRef.current) return;
    chartRef.current.innerHTML = '';
    renderChordChart(data, chartRef.current, setSvgNode);
  }, [data]);

  /**
   * Renders the D3 chord chart visualization
   * 
   * @param {Array} data - Citation relationship data
   * @param {HTMLElement} container - DOM container for the chart
   * @param {Function} setSvgNode - Function to store SVG node reference
   */
  function renderChordChart(data, container, setSvgNode) {
    const width = 1180;
    const height = width + 150;
    const innerRadius = Math.min(width, height) * 0.5 - 200;
    const outerRadius = innerRadius + 10;
    const chordPadAngle = 8 / innerRadius;

    /**
     * Helper function to format year from date string
     */
    const formatYear = (str) => {
      const parsed = Date.parse(str);
      const date = new Date(parsed);
      return date.getFullYear();
    };

    // Compute unique names for the chord diagram
    // Build unique names and sort by year ascending (then by label)
    const allNames = d3.union(
      data.map((d) => `${d.source} ${formatYear(d.source_date)}`).filter((name) => name && name.trim() !== 'NaN' && name.trim() !== ''),
      data.map((d) => `${d.target} ${formatYear(d.target_date)}`)
    );
    const getYearFromLabel = (name) => {
      const lastSpace = name.lastIndexOf(' ');
      const y = Number(name.slice(lastSpace + 1));
      return Number.isFinite(y) ? y : Number.POSITIVE_INFINITY;
    };
    const names = Array.from(allNames).sort((a, b) => {
      const ya = getYearFromLabel(a);
      const yb = getYearFromLabel(b);
      if (ya !== yb) return ya - yb;
      return a.localeCompare(b);
    });
    const index = new Map(names.map((name, i) => [name, i]));

    // Map for 'evolve' type relationships
    const evolveMap = new Map();
    data.forEach((datum) => {
      if (datum.type === 'evolve') {
        evolveMap.set(index.get(`${datum.target} ${formatYear(datum.target_date)}`), `${datum.source} ${formatYear(datum.source_date)}`);
      }
    });

    // Build adjacency matrix for chord diagram
    const matrix = Array.from(index, () => new Array(names.length).fill(0));
    for (const { source, target, source_date, target_date, value } of data) {
      if (source === '') continue;
      matrix[index.get(`${source} ${formatYear(source_date)}`)][index.get(`${target} ${formatYear(target_date)}`)] += value;
    }

    // D3 generators for chord diagram
    const chord = d3.chordDirected()
      .padAngle(chordPadAngle)
      .sortSubgroups(d3.descending)
      .sortChords(d3.descending);
    const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);
    const selectingArea = d3.arc()
      .startAngle((d) => d.startAngle - chordPadAngle / 2)
      .endAngle((d) => d.endAngle + chordPadAngle / 2)
      .innerRadius(innerRadius)
      .outerRadius(outerRadius + 200);
    const ribbon = d3.ribbon().radius(innerRadius + 1).padAngle(0);
    const colors = d3.quantize(d3.interpolateRainbow, names.length);

    // Create SVG container
    const svg = d3
      .create('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [-width / 2, -height / 2, width, height])
      .attr('style', 'width: 100%; height: auto; font: 10px sans-serif;');

    const chords = chord(matrix);

    // Create groups for each node
    const group = svg
      .append('g')
      .selectAll('g')
      .data(chords.groups)
      .join('g')
      .attr('class', (d) => `group-${d.index}`);

    // Add arcs for each group
    group
      .append('path')
      .attr('fill', (d) => colors[d.index])
      .attr('d', arc);

    // Add labels for each group
    const labels = group
      .append('text')
      .each((d) => (d.angle = (d.startAngle + d.endAngle) / 2))
      .attr('dy', '0.35em')
      .attr('transform', (d) => `
        rotate(${(d.angle * 180) / Math.PI - 90})
        translate(${outerRadius + 5})
        ${d.angle > Math.PI ? 'rotate(180)' : ''}
      `)
      .attr('text-anchor', (d) => (d.angle > Math.PI ? 'end' : null))
      .attr('fill', '#e5e7eb') // Tailwind text-gray-200
      .each(function(d) {
        const g = d3.select(this);
        g.append('tspan')
          .attr('font-weight', 'bold')
          .text(names[d.index]);
        if (evolveMap.get(d.index)) {
          g.append('tspan')
            .attr('dx', 4)
            .attr('font-weight', 'normal')
            .text(` ≪ ${evolveMap.get(d.index)}`);
        }
      });

    // Highlight the earliest work by adding a red bullet at the end of its label
    {
      const highlightName = names[0];
      if (highlightName !== undefined) {
        const hi = index.get(highlightName);
        if (hi !== undefined) {
          labels
            .filter((d) => d.index === hi)
            .each(function() {
              d3.select(this)
                .append('tspan')
                .attr('dx', 6)
                .attr('dy', '-0.2em')
                .attr('fill', '#ef4444')
                .attr('font-size', 20)
                .attr('font-weight', 'bold')
                .attr('alignment-baseline', 'middle')
                .attr('dominant-baseline', 'middle')
                .text(' •');
            });
        }
      }
    }

    // Add interactive area for hover effects
    group
      .append('path')
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .attr('d', selectingArea)
      .on('mouseover', fade(0))
      .on('mouseout', fade(1));

    // Add tooltips for groups
    group
      .append('title')
      .text(
        (d) => `${names[d.index]}
${d3.sum(chords, (c) => (c.source.index === d.index) * c.source.value)} Cited →
${d3.sum(chords, (c) => (c.target.index === d.index) * c.source.value)} Citing ←`
      );

    // Add chord edges
    const edges = svg
      .append('g')
      .selectAll('path')
      .data(chords)
      .join('path')
      .attr('mix-blend-mode', 'darken')
      .attr('class', 'edges')
      .attr('d', ribbon)
      .attr('fill', (d) => colors[d.source.index]);

    // Add tooltips for edges
    edges
      .append('title')
      .text((d) => `${names[d.source.index]} → ${names[d.target.index]} ${d.source.value}`);

    // Append SVG to container
    container.appendChild(svg.node());
    setSvgNode(svg.node());

    /**
     * Fade function for hover effects
     * @param {number} opacity - Opacity value for fade effect
     */
    function fade(opacity) {
      return function (event, i) {
        const indexes = [];
        edges
          .filter(function (d) {
            if (d.source.index === i.index || d.target.index === i.index) indexes.push(d.source.index, d.target.index);
            return d.source.index !== i.index && d.target.index !== i.index;
          })
          .attr('fill-opacity', opacity);
        group.selectAll('path')
          .filter(function (d) {
            return indexes.indexOf(d.index) === -1;
          })
          .attr('fill-opacity', opacity);
      };
    }
  }

  /**
   * Handles SVG download functionality
   */
  const handleDownloadSVG = () => {
    if (!svgNode) return;
    
    // Find all text labels and save original colors
    const texts = svgNode.querySelectorAll('text');
    const originalFills = [];
    texts.forEach((el) => {
      originalFills.push(el.getAttribute('fill'));
      el.setAttribute('fill', '#000');
    });
    
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgNode);
    
    // Add XML declaration for compatibility
    if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'citation-map.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Restore original colors
    texts.forEach((el, i) => {
      if (originalFills[i]) {
        el.setAttribute('fill', originalFills[i]);
      } else {
        el.removeAttribute('fill');
      }
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <span className="text-neutral-300 text-lg">Loading data...</span>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <span className="text-red-400 bg-red-900/20 border border-red-800 p-6 text-lg">Error: {error}</span>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col">
      <Navigation />
      <div className="flex-1 flex flex-col items-center justify-center py-12 px-1">
        <div className="w-full max-w-7xl flex flex-col items-center">
          <div className="w-full pb-4 mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl md:text-4xl text-neutral-100 font-bold tracking-tight mb-2">Citation Map</h1>
              <p className="text-neutral-400 text-base">Visualization of citations between documents</p>
            </div>
            <button
              onClick={handleDownloadSVG}
              className="flex items-center justify-center w-10 h-10 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-100 border border-indigo-500/30 hover:border-indigo-500/50 transition-all duration-200 shadow-lg"
              disabled={!svgNode}
              title="Download SVG"
            >
              <Icon name="download" className="text-lg" />
            </button>
          </div>
        </div>
        <div className="w-full">
          <div className="w-full flex justify-center items-center">
            <div ref={chartRef} className="w-full flex justify-center items-center" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default CitationMap; 
import Icon from './Icon';
