/**
 * KG Exploration Survey Data Application
 * 
 * This application provides a comprehensive interface for viewing and analyzing
 * survey data related to knowledge graph exploration approaches.
 * 
 * Features:
 * - Interactive data table with sorting and filtering
 * - Field validation with missing data indicators
 * - Visual badges for method types, domains, and user revision types
 * - Responsive design with collapsible navigation
 * - Integration with external chart components
 * 
 * Data Structure:
 * - Each row represents a research paper/approach
 * - Fields include authors, methods, domains, tasks, and validation info
 * - Required fields are validated and highlighted when missing
 * 
 * Components:
 * - Main data table with React Table
 * - Cell renderers for different data types
 * - Navigation and routing system
 * - Statistics calculation and display
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import * as d3 from 'd3';
import CitationMap from "./CitationMap";
import Taxonomy from "./Taxonomy";
import Navigation from "./Navigation";
import Charts from "./Charts";
import SurveyTable from "./SurveyTable";
import Icon from "./Icon";

/**
 * Custom hook for animated counting
 */
const useCountUp = (end, start = 0, duration = 1000) => {
  const [count, setCount] = useState(start);
  
  useEffect(() => {
    // Handle invalid values
    if (typeof end !== 'number' || isNaN(end)) {
      setCount(0);
      return;
    }
    
    // Ensure duration is positive
    const safeDuration = Math.max(duration, 1);
    
    let startTime = null;
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / safeDuration, 1);
      const currentCount = Math.floor(start + (end - start) * progress);
      setCount(currentCount);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [end, start, duration]);
  
  return count;
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
 * Checks if a required field is missing from a row
 */
const isRequiredFieldMissing = (row, fieldPath) => {
  if (!REQUIRED_FIELDS[fieldPath]) return false;
  
  // Optimized nested value getter
  const getNestedValue = (obj, path) => {
    const keys = path.split(".");
    let current = obj;
    for (const key of keys) {
      if (current == null) return undefined;
      current = current[key];
    }
    return current;
  };
  
  const value = getNestedValue(row, fieldPath);
  return isEmpty(value);
};

/**
 * Main App component with routing
 */
function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStatistics] = useState(false);
  const [animationStarted, setAnimationStarted] = useState(false);
  const location = useLocation();
  
  // Refs for charts
  const chartRefs = useRef({
    total: null,
    yearRange: null,
    facets: null,
    navigation: null,
    queryBuilding: null,
    recommendation: null
  });

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(import.meta.env.BASE_URL + 'data/sti-survey.json');
        if (!response.ok) {
          throw new Error('Failed to load data');
        }
        const jsonData = await response.json();
        setData(jsonData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Start animations when data is loaded and on home page
  useEffect(() => {
    if (data.length > 0 && location.pathname === '/') {
      if (!animationStarted) {
        const timer = setTimeout(() => setAnimationStarted(true), 500);
        return () => clearTimeout(timer);
      }
    } else if (location.pathname !== '/') {
      // Reset animation state when leaving home page
      setAnimationStarted(false);
    }
  }, [data, animationStarted, location.pathname]);

  // Function to render mini line chart with animation
  const renderMiniChart = (svgRef, chartData, color, width = 80, height = 30) => {
    if (!svgRef || !chartData || chartData.length === 0) return;

    // Clear previous chart
    d3.select(svgRef).selectAll("*").remove();

    // Create SVG
    const svg = d3.select(svgRef)
      .attr("width", width)
      .attr("height", height);

    // Prepare data - count approaches by year
    const yearCounts = {};
    chartData.forEach(item => {
      if (item.year && typeof item.year === 'number') {
        yearCounts[item.year] = (yearCounts[item.year] || 0) + 1;
      }
    });

    const processedData = Object.entries(yearCounts)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => a.year - b.year);

    if (processedData.length === 0) return;

    // Calculate cumulative counts for growth line
    let cumulative = 0;
    const growthData = processedData.map(item => {
      cumulative += item.count;
      return { year: item.year, cumulative };
    });

    // Scales
    const xScale = d3.scaleLinear()
      .domain(d3.extent(growthData, d => d.year))
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(growthData, d => d.cumulative)])
      .range([height, 0]);

    // Line generator
    const line = d3.line()
      .x(d => xScale(d.year))
      .y(d => yScale(d.cumulative))
      .curve(d3.curveMonotoneX);

    // Create gradient
    const gradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", `gradient-${color.replace('#', '')}`)
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", color)
      .attr("stop-opacity", 0.8);

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", color)
      .attr("stop-opacity", 0.1);

    // Add area with animation
    const area = d3.area()
      .x(d => xScale(d.year))
      .y0(height)
      .y1(d => yScale(d.cumulative))
      .curve(d3.curveMonotoneX);

    const areaPath = svg.append("path")
      .datum(growthData)
      .attr("fill", `url(#gradient-${color.replace('#', '')})`)
      .attr("d", area)
      .style("opacity", 0);

    // Add line with animation
    const linePath = svg.append("path")
      .datum(growthData)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 1.5)
      .attr("d", line)
      .style("opacity", 0);

    // Animate both area and line
    areaPath.transition()
      .duration(1200)
      .style("opacity", 1);

    linePath.transition()
      .duration(1200)
      .style("opacity", 1);
  };

  // Effect to render charts when data changes and on home page
  useEffect(() => {
    if (data.length > 0 && animationStarted && location.pathname === '/') {
      // Render all charts simultaneously during number animation
      setTimeout(() => {
        renderMiniChart(chartRefs.current.total, data, "#64748b");
        renderMiniChart(chartRefs.current.yearRange, data, "#3b82f6");
        renderMiniChart(chartRefs.current.facets, data.filter(item => item.coreTasks?.facets), "#f43f5e");
        renderMiniChart(chartRefs.current.navigation, data.filter(item => item.coreTasks?.navigation), "#f97316");
        renderMiniChart(chartRefs.current.queryBuilding, data.filter(item => item.coreTasks?.queryBuilding), "#f59e0b");
        renderMiniChart(chartRefs.current.recommendation, data.filter(item => item.coreTasks?.recommendation), "#eab308");
      }, 300); // Start charts during counting animation
    }
  }, [data, animationStarted, location.pathname]);

  // Calculate summary statistics with optimized performance
  const summaryStats = useMemo(() => {
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

      // Availability
      if (row.codeAvailability && row.codeAvailability.trim() !== '') {
        acc.approachesWithCode++;
      }

      // License distribution
      const license = row['license'] || 'N/A';
      acc.licenseDistribution[license] = (acc.licenseDistribution[license] || 0) + 1;

      // Task counts
      if (row.coreTasks?.facets) acc.taskCounts.facets++;
      if (row.coreTasks?.navigation) acc.taskCounts.navigation++;
      if (row.coreTasks?.queryBuilding) acc.taskCounts.queryBuilding++;
      if (row.coreTasks?.recommendation) acc.taskCounts.recommendation++;

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
      taskCounts: { facets: 0, navigation: 0, queryBuilding: 0, recommendation: 0 },
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
    
    return {
      totalEntries,
      entriesWithMissingFields: stats.entriesWithMissingFields,
      totalMissingFields: stats.totalMissingFields,
      mostMissing,
      mainMethodTypeDistribution: stats.mainMethodTypeDistribution,
      domainDistribution: stats.domainDistribution,
      yearRange,
      approachesWithCode: stats.approachesWithCode,
      approachesWithCodePercentage: totalEntries > 0 ? (stats.approachesWithCode / totalEntries) * 100 : 0,
      licenseDistribution: stats.licenseDistribution,
      taskCounts: stats.taskCounts,
    };
  }, [data]);

  // Animated counters
  const animatedTotalEntries = useCountUp(summaryStats.totalEntries || 0, 0, animationStarted ? 1500 : 1);
  const animatedFacets = useCountUp(summaryStats.taskCounts?.facets || 0, 0, animationStarted ? 1500 : 1);
  const animatedNavigation = useCountUp(summaryStats.taskCounts?.navigation || 0, 0, animationStarted ? 1500 : 1);
  const animatedQueryBuilding = useCountUp(summaryStats.taskCounts?.queryBuilding || 0, 0, animationStarted ? 1500 : 1);
  const animatedRecommendation = useCountUp(summaryStats.taskCounts?.recommendation || 0, 0, animationStarted ? 1500 : 1);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-neutral-300 text-lg">Loading data...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-red-400 bg-red-900/20 border border-red-800 p-6 text-lg">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={
        <div className="min-h-screen bg-neutral-900 flex flex-col">
          <Navigation />
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
            <div className="w-full max-w-7xl flex flex-col items-center">
              {/* Main Title */}
              <div className="w-full pb-4 mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-neutral-100 mb-2">
                  KG Exploration Survey Companion
                </h1>
                <p className="text-neutral-400 text-lg mb-4">
                  Interactive resources for <span className="italic">Knowledge Exploration in Knowledge Graphs: State of the Art, Taxonomy, and Open Challenges</span>
                </p>
                
                {/* Authors */}
                <div className="text-neutral-300 text-sm mb-2">
                  <p>Task 2.4 group</p>
                </div>
              
              </div>
              
              {/* Data Overview Section */}
              <div className="w-full mb-8">
                {/* Overall Data Snapshot */}
                <div className="bg-neutral-800 shadow-lg overflow-hidden">
                  <div className="p-6 pb-0">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-neutral-100 flex items-center">
                        <Icon name="analytics" className="mr-2 text-blue-400" />
                        Data Overview
                      </h3>
                    </div>
                    
                    {/* Summary when closed */}
                    {!showStatistics && (
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                        <div className="bg-slate-500/10 p-4 relative min-h-[80px]">
                          <div className="text-2xl font-bold text-slate-100">{animatedTotalEntries}</div>
                          <div className="text-xs text-slate-300">Total Approaches</div>
                          <svg
                            ref={el => chartRefs.current.total = el}
                            className="absolute bottom-0 right-0 opacity-70"
                            style={{ pointerEvents: 'none' }}
                          />
                        </div>
                        <div className="bg-blue-500/10 p-4 relative min-h-[80px]">
                          <div className="text-2xl font-bold text-blue-100">{summaryStats.yearRange.min} - {summaryStats.yearRange.max}</div>
                          <div className="text-xs text-blue-300">Year Range</div>
                          <svg
                            ref={el => chartRefs.current.yearRange = el}
                            className="absolute bottom-0 right-0 opacity-70"
                            style={{ pointerEvents: 'none' }}
                          />
                        </div>
                        <div className="bg-rose-500/10 p-4 relative min-h-[80px]">
                          <div className="text-2xl font-bold text-rose-100">{animatedFacets}</div>
                          <div className="text-xs text-rose-300">Facets</div>
                          <svg
                            ref={el => chartRefs.current.facets = el}
                            className="absolute bottom-0 right-0 opacity-70"
                            style={{ pointerEvents: 'none' }}
                          />
                        </div>
                        <div className="bg-orange-500/10 p-4 relative min-h-[80px]">
                          <div className="text-2xl font-bold text-orange-100">{animatedNavigation}</div>
                          <div className="text-xs text-orange-300">Navigation</div>
                          <svg
                            ref={el => chartRefs.current.navigation = el}
                            className="absolute bottom-0 right-0 opacity-70"
                            style={{ pointerEvents: 'none' }}
                          />
                        </div>
                        <div className="bg-amber-500/10 p-4 relative min-h-[80px]">
                          <div className="text-2xl font-bold text-amber-100">{animatedQueryBuilding}</div>
                          <div className="text-xs text-amber-300">Query Building</div>
                          <svg
                            ref={el => chartRefs.current.queryBuilding = el}
                            className="absolute bottom-0 right-0 opacity-70"
                            style={{ pointerEvents: 'none' }}
                          />
                        </div>
                        <div className="bg-yellow-500/10 p-4 relative min-h-[80px]">
                          <div className="text-2xl font-bold text-yellow-100">{animatedRecommendation}</div>
                          <div className="text-xs text-yellow-300">Guidance/Visualization</div>
                          <svg
                            ref={el => chartRefs.current.recommendation = el}
                            className="absolute bottom-0 right-0 opacity-70"
                            style={{ pointerEvents: 'none' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Navigation Boxes */}
              <div className="w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <Link to="/survey" className="bg-neutral-800 shadow-lg overflow-hidden hover:bg-neutral-700 transition-all duration-300 group">
                    <div className="p-6">
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-blue-500/20 flex items-center justify-center mr-4">
                          <Icon name="table_chart" className="text-blue-400 text-xl" />
                        </div>
                        <h3 className="text-lg font-bold text-neutral-100">Survey Data</h3>
                      </div>
                      <p className="text-neutral-400 text-sm">
                        Explore the complete dataset with interactive filtering, sorting, and detailed information about each exploration system.
                      </p>
                    </div>
                  </Link>

                  <Link to="/citation-map" className="bg-neutral-800 shadow-lg overflow-hidden hover:bg-neutral-700 transition-all duration-300 group">
                    <div className="p-6">
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-green-500/20 flex items-center justify-center mr-4">
                          <Icon name="account_tree" className="text-green-400 text-xl" />
                        </div>
                        <h3 className="text-lg font-bold text-neutral-100">Citation Map</h3>
                      </div>
                      <p className="text-neutral-400 text-sm">
                        Visualize the relationships between research papers through their citation networks and connections.
                      </p>
                    </div>
                  </Link>

                  <Link to="/taxonomy" className="bg-neutral-800 shadow-lg overflow-hidden hover:bg-neutral-700 transition-all duration-300 group">
                    <div className="p-6">
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-purple-500/20 flex items-center justify-center mr-4">
                          <Icon name="category" className="text-purple-400 text-xl" />
                        </div>
                        <h3 className="text-lg font-bold text-neutral-100">Taxonomy</h3>
                      </div>
                      <p className="text-neutral-400 text-sm">
                        Discover the hierarchical classification of interaction paradigms, guidance strategies, and backends.
                      </p>
                    </div>
                  </Link>

                  <Link to="/charts" className="bg-neutral-800 shadow-lg overflow-hidden hover:bg-neutral-700 transition-all duration-300 group">
                    <div className="p-6">
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-orange-500/20 flex items-center justify-center mr-4">
                          <Icon name="bar_chart" className="text-orange-400 text-xl" />
                        </div>
                        <h3 className="text-lg font-bold text-neutral-100">Analytics</h3>
                      </div>
                      <p className="text-neutral-400 text-sm">
                        View charts and analytics showing trends, distributions, and insights from the KG exploration survey.
                      </p>
                    </div>
                  </Link>
                </div>
              </div>
              
              {/* Footer */}
              <footer className="w-full mt-8 p-6 bg-neutral-800">
                <div className="text-center text-neutral-400 text-sm">
                  <p>© 2026 KG Exploration Survey. All rights reserved.</p>
                </div>
              </footer>
            </div>
          </div>
        </div>
      } />
      <Route path="/survey" element={<SurveyTable />} />
      <Route path="/citation-map" element={<CitationMap />} />
      <Route path="/taxonomy" element={<Taxonomy />} />
      <Route path="/charts" element={<Charts data={data} />} />
    </Routes>
  );
}

export default App;
