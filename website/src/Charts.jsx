/**
 * Charts Component
 * 
 * This component provides interactive data visualizations and analytics for the KG exploration survey data.
 * Features include:
 * - D3.js powered charts and visualizations
 * - Interactive flip cards with statistics and charts
 * - Download functionality for SVG charts
 * - Responsive design with Tailwind CSS
 * - Comprehensive data analysis and statistics
 */


import React, { useState, useRef, useMemo } from 'react';
import Navigation from './Navigation';
import * as d3 from "d3";
import Icon from './Icon';
import MainMethodStackedChart from './components/charts/MainMethodStackedChart';
import ConferenceJournalBarChart from './components/charts/ConferenceJournalBarChart';
import YearWiseCoreTasksChart from './components/charts/YearWiseCoreTasksChart';

/**
 * Technique Trends Chart Component
 * 
 * Creates a multi-line chart showing the evolution of selected interaction/guidance tags over time
 * using D3.js for data visualization.
 */
const TechniqueTrendsChart = ({ data }) => {
  const svgRef = useRef();

  React.useEffect(() => {
    if (!data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 30, right: 120, left: 40, bottom: 40 }; // Increased top margin
    const width = 700 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const chartSvg = svg
      .append("svg")
      .attr("width", 800)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const years = [...new Set(data.map(d => d.year))].sort((a, b) => a - b);
    const selectedTags = ['graph-navigation', 'query-building', 'recommendation', 'visualization', 'facets'];
    
    // Milestones
    const milestones = [
      { year: 2003, label: "Haystack" },
      { year: 2006, label: "Tabulator" },
      { year: 2017, label: "Sparklis" },
      { year: 2021, label: "S-Paths" },
      { year: 2025, label: "SPARQL Editor" }
    ];

    const trendsData = years.map(year => {
      const yearData = data.filter(d => d.year === year);
      const result = { year };
      selectedTags.forEach(tag => {
        result[tag] = yearData.filter(d => d.techniqueTags?.includes(tag)).length;
      });
      return result;
    });

    const x = d3.scaleLinear()
      .domain(d3.extent(years))
      .range([0, width]);

    const maxValue = d3.max(trendsData, d => Math.max(...selectedTags.map(tag => d[tag])));
    const y = d3.scaleLinear()
      .domain([0, maxValue + 1]) // Add some headroom
      .range([height, 0]);

    const color = d3.scaleOrdinal()
      .domain(selectedTags)
      .range(['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6']);

    const line = d3.line()
      .x(d => x(d.year))
      .y(d => y(d.count))
      .curve(d3.curveMonotoneX);

    // Add X axis
    chartSvg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")))
      .selectAll("text")
      .style("fill", "#9ca3af")
      .style("font-size", "12px");

    // Add Y axis
    chartSvg.append("g")
      .call(d3.axisLeft(y).ticks(5))
      .selectAll("text")
      .style("fill", "#9ca3af")
      .style("font-size", "12px");

    // Add milestones lines and labels
    milestones.forEach((m, i) => {
      if (m.year >= d3.min(years) && m.year <= d3.max(years)) {
        // Line
        chartSvg.append("line")
          .attr("x1", x(m.year))
          .attr("x2", x(m.year))
          .attr("y1", -20)
          .attr("y2", height)
          .attr("stroke", "#9ca3af")
          .attr("stroke-width", 1)
          .attr("stroke-dasharray", "4,4")
          .attr("opacity", 0.5);

        // Label
        chartSvg.append("text")
          .attr("x", x(m.year) + 5)
          .attr("y", -10 + (i % 2) * 12) // Stagger labels slightly
          .text(m.label)
          .style("fill", "#9ca3af")
          .style("font-size", "10px")
          .style("font-style", "italic");
      }
    });

    // Add lines and dots
    selectedTags.forEach(tag => {
      const lineData = trendsData.map(d => ({ year: d.year, count: d[tag] }));
      
      // Line
      chartSvg.append("path")
        .datum(lineData)
        .attr("fill", "none")
        .attr("stroke", color(tag))
        .attr("stroke-width", 2)
        .attr("d", line);
      
      // Dots
      chartSvg.selectAll(`.dot-${tag}`)
        .data(lineData)
        .join("circle")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.count))
        .attr("r", 4)
        .attr("fill", color(tag))
        .append("title")
        .text(d => `${tag} (${d.year}): ${d.count}`);
    });

    // Legend
    const legend = chartSvg.append("g")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10)
      .attr("text-anchor", "start")
      .selectAll("g")
      .data(selectedTags)
      .join("g")
      .attr("transform", (d, i) => `translate(${width + 20},${i * 20})`);

    legend.append("rect")
      .attr("x", 0)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", color);

    legend.append("text")
      .attr("x", 20)
      .attr("y", 9.5)
      .attr("dy", "0.32em")
      .style("fill", "#9ca3af")
      .text(d => d);
      
    // Add Labels
    chartSvg.append("text")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 5)
      .style("text-anchor", "middle")
      .style("fill", "#9ca3af")
      .style("font-size", "14px")
      .text("Year");

    chartSvg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("fill", "#9ca3af")
      .style("font-size", "14px")
      .text("Count");

  }, [data]);

  return <div ref={svgRef} className="flex justify-center items-center w-full"></div>;
};

/**
 * Utility Functions
 */


/**
 * Downloads an SVG element as a file
 * @param {SVGElement} svgElement - The SVG element to download
 * @param {string} filename - The filename for the downloaded file
 */
function downloadSVG(svgElement, filename = "chart.svg") {
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);
  
  const downloadLink = document.createElement("a");
  downloadLink.href = svgUrl;
  downloadLink.download = filename;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(svgUrl);
}

/**
 * Required fields configuration for validation
 */
const REQUIRED_FIELDS = {
  id: true,
  year: true,
  firstAuthor: true,
  authors: true,
  title: true,
  applicationPurpose: true,
  userInterfaceTool: true,
  output: true,
  "mainMethod.type": true,
  "domain.domain": true,
  "validation.type": true,
  "coreTasks.facets": true,
  "coreTasks.navigation": true,
  "coreTasks.queryBuilding": true,
  "coreTasks.recommendation": true,
  "revision.type": true,
  "supportTasks.guidance": true,
  "supportTasks.backendAssumptions": true,
  "supportTasks.evidence": true,
  "supportTasks.availability": true,
};

/**
 * Utility function to check if a value is empty, null, or undefined
 */
const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "object" && !Array.isArray(value)) {
    return Object.keys(value).length === 0;
  }
  return false;
};

/**
 * Gets nested value from object using dot notation path
 */
const getNestedValue = (obj, path) => {
  const keys = path.split(".");
  let current = obj;
  for (const key of keys) {
    if (current == null) return undefined;
    current = current[key];
  }
  return current;
};

/**
 * Checks if a required field is missing from a row
 */
const isRequiredFieldMissing = (row, fieldPath) => {
  if (!REQUIRED_FIELDS[fieldPath]) return false;
  const value = getNestedValue(row, fieldPath);
  return isEmpty(value);
};

/**
 * Calculate summary statistics for the charts
 * 
 * Processes the survey data to generate comprehensive statistics including:
 * - Missing field analysis
 * - Method type distributions
 * - Domain distributions
 * - Task coverage
 * - License distributions
 * - Access method distributions
 */
const calculateSummaryStats = (data) => {
  if (data.length === 0) {
    return {
      totalEntries: 0,
      entriesWithMissingFields: 0,
      totalMissingFields: 0,
      mostMissing: 'N/A',
      mainMethodTypeDistribution: {},
      domainDistribution: {},
      yearRange: { min: 'N/A', max: 'N/A' },
      approachesWithCode: 0,
      licenseDistribution: {},
      taskCounts: { facets: 0, navigation: 0, queryBuilding: 0, recommendation: 0 },
    };
  }

  const totalEntries = data.length;
  
  // Single pass through data for better performance
  const stats = data.reduce((acc, row) => {
    // Missing fields analysis
    const missingFields = Object.keys(REQUIRED_FIELDS).filter(field => isRequiredFieldMissing(row, field));
    if (missingFields.length > 0) {
      acc.entriesWithMissingFields++;
      acc.totalMissingFields += missingFields.length;
      missingFields.forEach(field => {
        acc.fieldCounts[field] = (acc.fieldCounts[field] || 0) + 1;
      });
    }

    // Main method distribution
    const methodType = row['mainMethod']?.type || 'N/A';
    acc.mainMethodTypeDistribution[methodType] = (acc.mainMethodTypeDistribution[methodType] || 0) + 1;

    // Domain distribution
    const domain = row['domain']?.domain || 'N/A';
    acc.domainDistribution[domain] = (acc.domainDistribution[domain] || 0) + 1;

    // Year range
    if (typeof row.year === 'number') {
      acc.years.push(row.year);
    }

    // Code availability
    if (row['codeAvailability'] && row['codeAvailability'].trim() !== '') {
      acc.approachesWithCode++;
    }

    // License distribution
    const license = row['license'] || 'N/A';
    acc.licenseDistribution[license] = (acc.licenseDistribution[license] || 0) + 1;

    // Technique Tags stats (for selected tags)
    const selectedTags = ['graph-navigation', 'query-building', 'recommendation', 'visualization', 'facets'];
    if (row.techniqueTags && Array.isArray(row.techniqueTags)) {
      row.techniqueTags.forEach(tag => {
        if (selectedTags.includes(tag)) {
          acc.techniqueTagCounts[tag] = (acc.techniqueTagCounts[tag] || 0) + 1;
        }
      });
    }

    // Task counts
    if (row.coreTasks?.facets) acc.taskCounts.facets++;
    if (row.coreTasks?.navigation) acc.taskCounts.navigation++;
    if (row.coreTasks?.queryBuilding) acc.taskCounts.queryBuilding++;
    if (row.coreTasks?.recommendation) acc.taskCounts.recommendation++;

    // User revision distribution
    const userRevisionType = row['revision']?.type || 'N/A';
    acc.userRevisionDistribution[userRevisionType] = (acc.userRevisionDistribution[userRevisionType] || 0) + 1;

    // Steps coverage
    if (row.supportTasks?.guidance) acc.stepsCoverage['guidance']++;
    if (row.supportTasks?.backendAssumptions) acc.stepsCoverage['backend-assumptions']++;
    if (row.supportTasks?.evidence) acc.stepsCoverage['evidence']++;
    if (row.supportTasks?.availability) acc.stepsCoverage['availability']++;
    if (row.supportTasks?.visualization) acc.stepsCoverage['visualization']++;
    if (row.supportTasks?.dataAccess) acc.stepsCoverage['data-access']++;
    if (row.supportTasks?.dataSources) acc.stepsCoverage['data-sources']++;

    // Access method distribution (data access)
    const accessMethod = row.supportTasks?.dataAccess || 'N/A';
    acc.accessMethodDistribution[accessMethod] = (acc.accessMethodDistribution[accessMethod] || 0) + 1;

    return acc;
  }, {
    entriesWithMissingFields: 0,
    totalMissingFields: 0,
    fieldCounts: {},
    mainMethodTypeDistribution: {},
    domainDistribution: {},
    years: [],
    approachesWithCode: 0,
    licenseDistribution: {},
    techniqueTagCounts: {},
    taskCounts: { facets: 0, navigation: 0, queryBuilding: 0, recommendation: 0 },
    userRevisionDistribution: {},
    stepsCoverage: {
      'guidance': 0,
      'backend-assumptions': 0,
      'evidence': 0,
      'availability': 0,
      'visualization': 0,
      'data-access': 0,
      'data-sources': 0
    },
    accessMethodDistribution: {}
  });

  // Calculate most missing field
  const mostMissingEntry = Object.entries(stats.fieldCounts)
    .sort(([,a], [,b]) => b - a)[0];
  const mostMissing = mostMissingEntry ? `${mostMissingEntry[0]} (${mostMissingEntry[1]})` : 'None';

  // Calculate year range
  const yearRange = {
    min: stats.years.length > 0 ? Math.min(...stats.years) : 'N/A',
    max: stats.years.length > 0 ? Math.max(...stats.years) : 'N/A',
  };

  // Calculate percentages
  const calculatePercentages = (distribution) => 
    Object.fromEntries(
      Object.entries(distribution).map(([key, value]) => [
        key,
        { count: value, percentage: totalEntries > 0 ? (value / totalEntries) * 100 : 0 },
      ])
    );

  const taskPercentages = {
    facets: totalEntries > 0 ? (stats.taskCounts.facets / totalEntries) * 100 : 0,
    navigation: totalEntries > 0 ? (stats.taskCounts.navigation / totalEntries) * 100 : 0,
    queryBuilding: totalEntries > 0 ? (stats.taskCounts.queryBuilding / totalEntries) * 100 : 0,
    recommendation: totalEntries > 0 ? (stats.taskCounts.recommendation / totalEntries) * 100 : 0,
  };
  
  return {
    totalEntries,
    entriesWithMissingFields: stats.entriesWithMissingFields,
    totalMissingFields: stats.totalMissingFields,
    mostMissing,
    mainMethodTypeDistribution: calculatePercentages(stats.mainMethodTypeDistribution),
    domainDistribution: calculatePercentages(stats.domainDistribution),
    yearRange,
    approachesWithCode: stats.approachesWithCode,
    approachesWithCodePercentage: totalEntries > 0 ? (stats.approachesWithCode / totalEntries) * 100 : 0,
    licenseDistribution: calculatePercentages(stats.licenseDistribution),
    techniqueTagDistribution: calculatePercentages(stats.techniqueTagCounts),
    taskCounts: stats.taskCounts,
    taskPercentages,
    userRevisionDistribution: stats.userRevisionDistribution,
    stepsCoverage: stats.stepsCoverage,
    accessMethodDistribution: stats.accessMethodDistribution,
  };
};

/**
 * Main Charts Component
 * 
 * Renders the complete charts dashboard with interactive visualizations
 * and comprehensive data analytics for the KG exploration survey data.
 */
function Charts({ data }) {
  // Calculate summary statistics using the data
  const summaryStats = useMemo(() => calculateSummaryStats(data), [data]);

  // State for chart visibility toggles
  const [showMainMethodChart, setShowMainMethodChart] = useState(false);
  const [showTechniqueChart, setShowTechniqueChart] = useState(false);
  const [showLicensesChart, setShowLicensesChart] = useState(false);
  const [showConferenceJournalChart, setShowConferenceJournalChart] = useState(false);
  const chartRef = useRef();

  if (!data || !summaryStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-400">Loading charts...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col">
      <Navigation />
      <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
        <div className="w-full max-w-7xl flex flex-col items-center">
          <div className="w-full pb-4 mb-8">
            <h1 className="text-3xl md:text-4xl text-neutral-100 font-bold tracking-tight mb-2">Data Analytics & Charts</h1>
            <p className="text-neutral-400 text-base">Interactive visualizations and statistics from the KG exploration survey data</p>
          </div>
        </div>
        
        {/* Charts Content */}
        <div className="w-full">
          <div className="w-full flex justify-center items-center">
            <div className="w-full max-w-7xl">
              {/* Row 1: Approach Classes (Full Width - Flip Box) */}
              <div className="grid grid-cols-1 gap-6 mb-6">
                <div className="relative perspective-1000 h-[500px]">
                  <div 
                    className={`bg-gradient-to-r from-sky-500/10 to-sky-600/10 p-4 transition-transform duration-700 ease-in-out transform-style-preserve-3d h-[500px] ${showMainMethodChart ? 'rotate-y-180' : ''}`}
                    style={{ 
                      transformStyle: 'preserve-3d',
                      transform: showMainMethodChart ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                  >
                    {/* Front side - Statistics */}
                    <div className="backface-hidden h-[500px]">
                      <div className="flex items-center justify-between mb-4 w-full">
                        <span className="text-sky-300 font-semibold text-lg flex items-center gap-2">
                          Approach Classes
                          <span className="ml-2 px-2 py-0.5 bg-sky-700/40 text-sky-200 text-xs font-mono align-middle">
                            {Object.keys(summaryStats.mainMethodTypeDistribution).length}
                          </span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowMainMethodChart(!showMainMethodChart)}
                            className="flex items-center justify-center w-8 h-8 bg-sky-600/30 hover:bg-sky-600/50 transition-colors duration-200 text-sky-300 hover:text-sky-100"
                            title={showMainMethodChart ? 'Show statistics' : 'Show chart'}
                          >
                            <Icon name="360" className="text-lg" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {Object.entries(summaryStats.mainMethodTypeDistribution)
                          .sort(([, a], [, b]) => b.count - a.count)
                          .map(([type, data], index) => (
                          <div key={type} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sky-200 text-sm font-medium">{type}</span>
                              <span className="text-sky-300 text-sm">{data.count} ({data.percentage.toFixed(1)}%)</span>
                            </div>
                            <div className="h-2 w-full bg-gray-700 overflow-hidden">
                              <div 
                                className="h-2 bg-sky-500 transition-all duration-1000 ease-out"
                                style={{ width: `${data.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Back side - Chart */}
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-sky-500/10 to-sky-600/10 p-4 backface-hidden h-[500px]"
                      style={{ 
                        transform: 'rotateY(180deg)',
                        backfaceVisibility: 'hidden'
                      }}
                    >
                      <div className="flex flex-col h-full w-full">
                        <div className="flex items-center justify-between mb-4 w-full">
                          <span className="text-sky-300 font-semibold text-lg flex items-center gap-2">
                            Approach Class Distribution by Year
                            <span className="ml-2 px-2 py-0.5 bg-sky-700/40 text-sky-200 text-xs font-mono align-middle">
                              {Object.keys(summaryStats.mainMethodTypeDistribution).length}
                            </span>
                          </span>
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => setShowMainMethodChart(!showMainMethodChart)}
                              className="flex items-center justify-center w-8 h-8 bg-sky-600/30 hover:bg-sky-600/50 transition-colors duration-200 text-sky-300 hover:text-sky-100"
                              title={showMainMethodChart ? "Show statistics" : "Show chart"}
                            >
                              <Icon name="360" className="text-lg" />
                            </button>
                            <button
                              onClick={() => {
                                if (chartRef?.current?.children[0]?.children[0]) {
                                  downloadSVG(chartRef.current.children[0].children[0], "main-method-chart.svg");
                                }
                              }}
                              className="flex items-center justify-center w-8 h-8 bg-sky-600/30 hover:bg-sky-600/50 transition-colors duration-200 text-sky-300 hover:text-sky-100"
                              title="Download SVG"
                            >
                              <Icon name="download" className="text-lg" />
                            </button>
                          </div>
                        </div>
                        <div className="flex-grow flex flex-col justify-end pt-2 h-[400px] w-full" ref={chartRef}>
                          <MainMethodStackedChart data={data} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Backends & Interaction Paradigms (Two Columns) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Backends */}
                <div className="bg-gradient-to-r from-teal-500/10 to-teal-600/10 p-4 h-[500px]">
                  <div className="flex items-center justify-between mb-4 w-full">
                    <span className="text-teal-300 font-semibold text-lg flex items-center gap-2">
                      Backend Types
                      <span className="ml-2 px-2 py-0.5 bg-teal-700/40 text-teal-200 text-xs font-mono align-middle">
                        {Object.keys(summaryStats.domainDistribution).length}
                      </span>
                    </span>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(summaryStats.domainDistribution)
                      .sort(([, a], [, b]) => b.count - a.count)
                      .map(([domain, data], index) => (
                      <div key={domain} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-teal-200 text-sm font-medium">{domain}</span>
                          <span className="text-teal-300 text-sm">{data.count} ({data.percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="h-2 w-full bg-gray-700 overflow-hidden">
                          <div 
                            className="h-2 bg-teal-500 transition-all duration-1000 ease-out"
                            style={{ width: `${data.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interaction Paradigms */}
                <div className="bg-gradient-to-r from-indigo-500/10 to-indigo-600/10 p-4 h-[500px]">
                  <div className="flex items-center justify-between mb-4 w-full">
                    <span className="text-indigo-300 font-semibold text-lg flex items-center gap-2">
                      Interaction Paradigms
                      <span className="ml-2 px-2 py-0.5 bg-indigo-700/40 text-indigo-200 text-xs font-mono align-middle">
                        {Object.keys(summaryStats.taskCounts).length}
                      </span>
                    </span>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(summaryStats.taskPercentages).map(([task, percentage], index) => (
                      <div key={task} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-indigo-200 text-sm font-medium">
                            {task.replace(/([a-z])([A-Z])/g, '$1 $2').replace('-', ' ').toUpperCase()}
                          </span>
                          <span className="text-indigo-300 text-sm">{summaryStats.taskCounts[task]} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="h-2 w-full bg-gray-700 overflow-hidden">
                          <div 
                            className="h-2 bg-indigo-500 transition-all duration-1000 ease-out"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 3: Comparison Dimensions & Guidance Strategy (Two Columns) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Comparison Dimensions */}
                <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 p-4 h-[500px]">
                  <div className="flex items-center justify-between mb-4 w-full">
                    <span className="text-blue-300 font-semibold text-lg flex items-center gap-2">
                      Comparison Dimensions
                      <span className="ml-2 px-2 py-0.5 bg-blue-700/40 text-blue-200 text-xs font-mono align-middle">
                        {Object.keys(summaryStats.stepsCoverage).length}
                      </span>
                    </span>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(summaryStats.stepsCoverage)
                      .sort(([, a], [, b]) => b - a)
                      .map(([step, count], index) => (
                      <div key={step} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-blue-200 text-sm font-medium">{step.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                          <span className="text-blue-300 text-sm">{count} ({(count / summaryStats.totalEntries * 100).toFixed(1)}%)</span>
                        </div>
                        <div className="h-2 w-full bg-gray-700 overflow-hidden">
                          <div 
                            className="h-2 bg-blue-500 transition-all duration-1000 ease-out"
                            style={{ width: `${(count / summaryStats.totalEntries * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Guidance Strategy */}
                <div className="bg-gradient-to-r from-cyan-500/10 to-cyan-600/10 p-4 h-[500px]">
                  <div className="flex items-center justify-between mb-4 w-full">
                    <span className="text-cyan-300 font-semibold text-lg flex items-center gap-2">
                      Guidance Strategy
                      <span className="ml-2 px-2 py-0.5 bg-cyan-700/40 text-cyan-200 text-xs font-mono align-middle">
                        {Object.keys(summaryStats.userRevisionDistribution).length}
                      </span>
                    </span>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(summaryStats.userRevisionDistribution)
                      .sort(([, a], [, b]) => b - a)
                      .map(([type, count], index) => (
                      <div key={type} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-cyan-200 text-sm font-medium">{type}</span>
                          <span className="text-cyan-300 text-sm">{count} ({(count / summaryStats.totalEntries * 100).toFixed(1)}%)</span>
                        </div>
                        <div className="h-2 w-full bg-gray-700 overflow-hidden">
                          <div 
                            className="h-2 bg-cyan-500 transition-all duration-1000 ease-out"
                            style={{ width: `${(count / summaryStats.totalEntries * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 3.5: Technique Trends (Full Width - Flip Box) */}
              <div className="grid grid-cols-1 gap-6 mb-6">
                <div className="relative perspective-1000 h-[500px]">
                  <div 
                    className={`bg-gradient-to-r from-violet-500/10 to-violet-600/10 p-4 transition-transform duration-700 ease-in-out transform-style-preserve-3d h-[500px] ${showTechniqueChart ? 'rotate-y-180' : ''}`}
                    style={{ 
                      transformStyle: 'preserve-3d',
                      transform: showTechniqueChart ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                  >
                    {/* Front side - Statistics */}
                    <div className="backface-hidden h-[500px]">
                      <div className="flex items-center justify-between mb-4 w-full">
                        <span className="text-violet-300 font-semibold text-lg flex items-center gap-2">
                          Tag Evolution
                          <span className="ml-2 px-2 py-0.5 rounded bg-violet-700/40 text-violet-200 text-xs font-mono align-middle">
                            {Object.keys(summaryStats.techniqueTagDistribution).length}
                          </span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowTechniqueChart(!showTechniqueChart)}
                            className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 transition-colors duration-200 text-violet-300 hover:text-violet-100"
                            title={showTechniqueChart ? 'Show statistics' : 'Show chart'}
                          >
                            <Icon name="360" className="text-lg" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {Object.entries(summaryStats.techniqueTagDistribution)
                          .sort(([, a], [, b]) => b.count - a.count)
                          .map(([tag, data], index) => (
                          <div key={tag} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-violet-200 text-sm font-medium">{tag}</span>
                              <span className="text-violet-300 text-sm">{data.count} ({data.percentage.toFixed(1)}%)</span>
                            </div>
                            <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className="h-2 bg-violet-500 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${data.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Back side - Chart */}
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-violet-600/10 p-4 backface-hidden h-[500px]"
                      style={{ 
                        transform: 'rotateY(180deg)',
                        backfaceVisibility: 'hidden'
                      }}
                    >
                      <div className="flex flex-col h-full w-full">
                        <div className="flex items-center justify-between mb-4 w-full">
                          <span className="text-violet-300 font-semibold text-lg flex items-center gap-2">
                            Tag Trends over Time
                          </span>
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => setShowTechniqueChart(!showTechniqueChart)}
                              className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 transition-colors duration-200 text-violet-300 hover:text-violet-100"
                              title={showTechniqueChart ? "Show statistics" : "Show chart"}
                            >
                              <Icon name="360" className="text-lg" />
                            </button>
                            <button
                              onClick={() => {
                                const chart = document.querySelector('.technique-chart svg');
                                if (chart) downloadSVG(chart, "technique-trends.svg");
                              }}
                              className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 transition-colors duration-200 text-violet-300 hover:text-violet-100"
                              title="Download SVG"
                            >
                              <Icon name="download" className="text-lg" />
                            </button>
                          </div>
                        </div>
                        <div className="flex-grow flex flex-col justify-end pt-2 h-[400px] w-full technique-chart">
                          <TechniqueTrendsChart data={data} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 4: Licenses (Full Width - Flip Box) */}
              <div className="grid grid-cols-1 gap-6 mb-6">
                <div className="relative perspective-1000 h-[500px]">
                  <div 
                    className={`bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 p-4 transition-transform duration-700 ease-in-out transform-style-preserve-3d h-[500px] ${showLicensesChart ? 'rotate-y-180' : ''}`}
                    style={{ 
                      transformStyle: 'preserve-3d',
                      transform: showLicensesChart ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                  >
                    {/* Front side - Statistics */}
                    <div className="backface-hidden h-[500px]">
                      <div className="flex items-center justify-between mb-4 w-full">
                        <span className="text-yellow-300 font-semibold text-lg flex items-center gap-2">
                          Licenses
                          <span className="ml-2 px-2 py-0.5 bg-yellow-700/40 text-yellow-200 text-xs font-mono align-middle">
                            {Object.keys(summaryStats.licenseDistribution).length}
                          </span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowLicensesChart(!showLicensesChart)}
                            className="flex items-center justify-center w-8 h-8 bg-yellow-600/30 hover:bg-yellow-600/50 transition-colors duration-200 text-yellow-300 hover:text-yellow-100"
                            title={showLicensesChart ? 'Show statistics' : 'Show chart'}
                          >
                            <Icon name="360" className="text-lg" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {Object.entries(summaryStats.licenseDistribution)
                          .sort(([, a], [, b]) => b.count - a.count)
                          .map(([license, data], index) => (
                          <div key={license} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                            <div className="flex justify-between items-center mb-1">
                          <span className="text-yellow-200 text-sm font-medium">{license}</span>
                          <span className="text-yellow-300 text-sm">{data.count} ({data.percentage.toFixed(1)}%)</span>
                            </div>
                            <div className="h-2 w-full bg-gray-700 overflow-hidden">
                              <div 
                                className="h-2 bg-yellow-500 transition-all duration-1000 ease-out"
                                style={{ width: `${data.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Back side - Chart */}
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 p-4 backface-hidden h-[500px]"
                      style={{ 
                        transform: 'rotateY(180deg)',
                        backfaceVisibility: 'hidden'
                      }}
                    >
                      <div className="flex flex-col h-full w-full">
                        <div className="flex items-center justify-between mb-4 w-full">
                          <span className="text-yellow-300 font-semibold text-lg flex items-center gap-2">
                            License Distribution
                            <span className="ml-2 px-2 py-0.5 bg-yellow-700/40 text-yellow-200 text-xs font-mono align-middle">
                              {Object.keys(summaryStats.licenseDistribution).length}
                            </span>
                          </span>
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => setShowLicensesChart(!showLicensesChart)}
                              className="flex items-center justify-center w-8 h-8 bg-yellow-600/30 hover:bg-yellow-600/50 transition-colors duration-200 text-yellow-300 hover:text-yellow-100"
                              title={showLicensesChart ? 'Show statistics' : 'Show chart'}
                            >
                              <Icon name="360" className="text-lg" />
                            </button>
                            <button
                              onClick={() => {
                                const chartElement = document.querySelector('.licenses-chart svg');
                                if (chartElement) {
                                  downloadSVG(chartElement, "licenses-chart.svg");
                                }
                              }}
                              className="flex items-center justify-center w-8 h-8 bg-yellow-600/30 hover:bg-yellow-600/50 transition-colors duration-200 text-yellow-300 hover:text-yellow-100"
                              title="Download SVG"
                            >
                              <Icon name="download" className="text-lg" />
                            </button>
                          </div>
                        </div>
                        <div className="flex-grow flex flex-col justify-end pt-2 h-[400px] w-full licenses-chart">
                          <ConferenceJournalBarChart 
                            data={Object.fromEntries(Object.entries(summaryStats.licenseDistribution).map(([k, v]) => [k, v.count]))} 
                            total={summaryStats.totalEntries} 
                            barColor="#facc15"
                            labelColor="#fef3c7"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 5: Approaches by Access Method (Full Width - Flip Box) */}
              <div className="grid grid-cols-1 gap-6">
                <div className="relative perspective-1000 h-[500px]">
                  <div 
                    className={`bg-gradient-to-r from-cyan-500/10 to-cyan-600/10 p-4 transition-transform duration-700 ease-in-out transform-style-preserve-3d h-[500px] ${showConferenceJournalChart ? 'rotate-y-180' : ''}`}
                    style={{ 
                      transformStyle: 'preserve-3d',
                      transform: showConferenceJournalChart ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                  >
                    {/* Front: Text statistics */}
                    <div className="backface-hidden h-[500px]">
                      <div className="flex items-center justify-between mb-4 w-full">
                        <span className="text-cyan-300 font-semibold text-lg flex items-center gap-2">
                          Approaches by Access Method
                          {/* Unique venues count label */}
                          <span className="ml-2 px-2 py-0.5 bg-cyan-700/40 text-cyan-200 text-xs font-mono align-middle">
                            {Object.keys(summaryStats.accessMethodDistribution).length}
                          </span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowConferenceJournalChart(!showConferenceJournalChart)}
                            className="flex items-center justify-center w-8 h-8 bg-cyan-600/30 hover:bg-cyan-600/50 transition-colors duration-200 text-cyan-300 hover:text-cyan-100"
                            title={showConferenceJournalChart ? 'Show statistics' : 'Show chart'}
                          >
                            <Icon name="360" className="text-lg" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-3 overflow-y-scroll h-[400px]">
                        {Object.entries(summaryStats.accessMethodDistribution)
                          .sort(([, a], [, b]) => b - a)
                          .map(([method, count], index) => (
                            <div key={method} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-cyan-200 text-sm font-medium truncate max-w-[180px]" title={method}>{method}</span>
                                <span className="text-cyan-300 text-sm">{count} ({(count / summaryStats.totalEntries * 100).toFixed(1)}%)</span>
                              </div>
                              <div className="h-2 w-full bg-neutral-700 overflow-hidden">
                                <div 
                                  className="h-2 bg-cyan-500 transition-all duration-1000 ease-out"
                                  style={{ width: `${(count / summaryStats.totalEntries * 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        {Object.keys(summaryStats.accessMethodDistribution).length === 0 && (
                          <div className="text-cyan-200 text-sm">No data available</div>
                        )}
                      </div>
                    </div>
                    {/* Back: D3 Chart */}
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-cyan-600/10 p-4 backface-hidden h-[500px]"
                      style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
                    >
                      <div className="flex flex-col h-full w-full">
                        <div className="flex items-center justify-between mb-4 w-full">
                          <span className="text-cyan-300 font-semibold text-lg flex items-center gap-2">
                            Approaches by Access Method
                            <span className="ml-2 px-2 py-0.5 bg-cyan-700/40 text-cyan-200 text-xs font-mono align-middle">
                              {Object.keys(summaryStats.accessMethodDistribution).length}
                            </span>
                          </span>
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => setShowConferenceJournalChart(!showConferenceJournalChart)}
                              className="flex items-center justify-center w-8 h-8 bg-cyan-600/30 hover:bg-cyan-600/50 transition-colors duration-200 text-cyan-300 hover:text-cyan-100"
                              title={showConferenceJournalChart ? 'Show statistics' : 'Show chart'}
                            >
                              <Icon name="360" className="text-lg" />
                            </button>
                            <button
                              onClick={() => {
                                const chartElement = document.querySelector('.conference-journal-chart svg');
                                if (chartElement) {
                                  downloadSVG(chartElement, "access-methods-chart.svg");
                                }
                              }}
                              className="flex items-center justify-center w-8 h-8 bg-cyan-600/30 hover:bg-yellow-600/50 transition-colors duration-200 text-cyan-300 hover:text-cyan-100"
                              title="Download SVG"
                            >
                              <Icon name="download" className="text-lg" />
                            </button>
                          </div>
                        </div>
                        <div className="flex-grow flex flex-col justify-end pt-2 h-[400px] w-full conference-journal-chart">
                          <ConferenceJournalBarChart 
                            data={summaryStats.accessMethodDistribution} 
                            total={summaryStats.totalEntries} 
                            barColor="#06b6d4"
                            labelColor="#bae6fd"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 6: Year-wise Interaction Paradigms (Full Width) */}
              <div className="grid grid-cols-1 gap-6 mb-6 mt-6">
                <div className="bg-gradient-to-r from-red-500/10 to-red-600/10 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-red-300 font-semibold text-lg">Year-wise Trends of Interaction Paradigms</span>
                  </div>
                  <div className="h-[400px]">
                    <YearWiseCoreTasksChart data={data} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Charts;
