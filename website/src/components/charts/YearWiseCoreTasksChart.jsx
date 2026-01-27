import React, { useRef, useEffect } from 'react';
import * as d3 from "d3";
import useResizeObserver from '../../hooks/useResizeObserver';

const YearWiseCoreTasksChart = ({ data }) => {
  const containerRef = useRef();
  const svgRef = useRef();
  const dimensions = useResizeObserver(containerRef);

  useEffect(() => {
    if (!data || data.length === 0 || !dimensions) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, left: 40, bottom: 50 };
    const width = dimensions.width - margin.left - margin.right;
    const height = Math.min(400, dimensions.height || 400) - margin.top - margin.bottom;

    const chartSvg = svg
      .append("svg")
      .attr("width", dimensions.width)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Process data: for each year, count CTA, CPA, CEA, CNEA
    const years = [...new Set(data.map(d => d.year))].sort();
    const tasks = ['facets', 'navigation', 'queryBuilding', 'recommendation'];
    const taskLabels = {
      facets: 'Facets',
      navigation: 'Navigation',
      queryBuilding: 'Query Building',
      recommendation: 'Guidance/Visualization'
    };
    
    // Create an array of objects { year, facets, navigation, ... }
    const chartData = years.map(year => {
        const yearData = data.filter(d => d.year === year);
        const result = { year };
        tasks.forEach(task => {
            result[task] = yearData.filter(d => d.coreTasks?.[task]).length;
        });
        return result;
    });

    const x = d3.scalePoint()
      .domain(years)
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(chartData, d => Math.max(d.facets, d.navigation, d.queryBuilding, d.recommendation))])
      .range([height, 0]);

    const color = d3.scaleOrdinal()
      .domain(tasks)
      .range(['#ef4444', '#f97316', '#eab308', '#22c55e']); // Red, Orange, Yellow, Green

    // Define lines
    const line = d3.line()
      .x(d => x(d.year))
      .y(d => y(d.count));

    // Add lines for each task
    tasks.forEach(task => {
        const taskData = chartData.map(d => ({ year: d.year, count: d[task] }));
        
        chartSvg.append("path")
            .datum(taskData)
            .attr("fill", "none")
            .attr("stroke", color(task))
            .attr("stroke-width", 2)
            .attr("d", line);
            
        // Add dots
        chartSvg.selectAll(`dot-${task}`)
            .data(taskData)
            .enter()
            .append("circle")
            .attr("cx", d => x(d.year))
            .attr("cy", d => y(d.count))
            .attr("r", 4)
            .attr("fill", color(task));
    });

    // Add axes
    const xAxis = d3.axisBottom(x);
    const yAxis = d3.axisLeft(y);

    chartSvg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .selectAll("text")
      .style("fill", "#9ca3af")
      .style("font-size", "12px");

    chartSvg.append("g")
      .call(yAxis)
      .selectAll("text")
      .style("fill", "#9ca3af")
      .style("font-size", "12px");

    // Add Legend
    const legend = chartSvg.append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .attr("text-anchor", "start")
        .selectAll("g")
        .data(tasks)
        .enter().append("g")
        .attr("transform", (d, i) => `translate(${i * 60}, -10)`);

    legend.append("rect")
        .attr("x", 0)
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", color);

    legend.append("text")
        .attr("x", 15)
        .attr("y", 9.5)
        .attr("dy", "0.32em")
        .style("fill", "#9ca3af")
        .text(d => taskLabels[d] || d);

  }, [data, dimensions]);

  return (
    <div ref={containerRef} className="w-full h-full flex justify-center items-center">
      <div ref={svgRef} />
    </div>
  );
};

export default YearWiseCoreTasksChart;
