import React, { useRef, useEffect } from 'react';
import * as d3 from "d3";
import useResizeObserver from '../../hooks/useResizeObserver';

const ValidationMetricsChart = ({ data, barColor = "#f59e0b", labelColor = "#fcd34d" }) => {
  const containerRef = useRef();
  const svgRef = useRef();
  const dimensions = useResizeObserver(containerRef);

  useEffect(() => {
    if (!data || data.length === 0 || !dimensions) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, left: 40, bottom: 80 };
    const width = dimensions.width - margin.left - margin.right;
    const height = Math.min(400, dimensions.height || 400) - margin.top - margin.bottom;

    const chartSvg = svg
      .append("svg")
      .attr("width", dimensions.width)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Aggregate validation metrics
    const metricCounts = {};
    data.forEach(row => {
        const metrics = row.validation?.metrics;
        if (metrics && Array.isArray(metrics)) {
            metrics.forEach(metric => {
                const normalizedMetric = metric.trim(); // Keep case as is usually significant for metrics (e.g. F1) but trim
                metricCounts[normalizedMetric] = (metricCounts[normalizedMetric] || 0) + 1;
            });
        }
    });

    const sortedData = Object.entries(metricCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10); // Top 10 metrics

    const x = d3.scaleBand()
      .domain(sortedData.map(d => d[0]))
      .range([0, width])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(sortedData, d => d[1])])
      .range([height, 0]);

    // Add bars
    chartSvg.selectAll("rect")
      .data(sortedData)
      .join("rect")
      .attr("x", d => x(d[0]))
      .attr("y", d => y(d[1]))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d[1]))
      .attr("fill", barColor);

    // Add value labels
    chartSvg.selectAll("text.label")
      .data(sortedData)
      .join("text")
      .attr("class", "label")
      .attr("x", d => x(d[0]) + x.bandwidth() / 2)
      .attr("y", d => y(d[1]) - 5)
      .attr("text-anchor", "middle")
      .style("fill", labelColor)
      .style("font-size", "12px")
      .text(d => d[1]);

    // Add axes
    const xAxis = d3.axisBottom(x);
    const yAxis = d3.axisLeft(y);

    chartSvg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .selectAll("text")
      .style("fill", "#9ca3af")
      .style("font-size", "10px")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

    chartSvg.append("g")
      .call(yAxis)
      .selectAll("text")
      .style("fill", "#9ca3af")
      .style("font-size", "12px");

  }, [data, barColor, labelColor, dimensions]);

  return (
    <div ref={containerRef} className="w-full h-full flex justify-center items-center">
      <div ref={svgRef} />
    </div>
  );
};

export default ValidationMetricsChart;
