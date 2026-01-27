/**
 * Survey Table Component
 * 
 * This component handles the main survey data table with all its functionality:
 * - Interactive data table with sorting and filtering
 * - Field validation with missing data indicators
 * - Visual badges for method types, domains, and user revision types
 * - Statistics calculation and display
 * 
 * Features:
 * - Collapsible navigation
 * - Missing field validation and highlighting
 * - Interactive tooltips for missing fields
 * - Sortable columns
 * - Responsive design
 */

// Grouped imports
import { useState, useEffect, useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Navigation from "./Navigation";
import Icon from "./Icon";
import schema from '../public/data/sti-survey.schema.json';

// Column helper for type-safe column definitions
const columnHelper = createColumnHelper();

// Unified color scheme for consistent styling
const UNIFIED_COLORS = {
  // Primary text color for ID, dates, authors, journal/conf, domain details, method details
  primaryText: '#e5e7eb', // neutral-200
  secondaryText: '#9ca3af', // neutral-400
  accentText: '#6b7280', // neutral-500
  
  // Badge colors using schema colors with consistent opacity
  badgeOpacity: '20', // 12% opacity in hex
  
  // Status colors
  success: '#10b981', // emerald-500
  error: '#ef4444', // red-500
  warning: '#f59e0b', // amber-500
  info: '#3b82f6', // blue-500
};

// Legacy color mappings (kept for backward compatibility)
const METHOD_TYPE_COLORS = {
  unsup: "bg-orange-500/20 text-orange-200",
  sup: "bg-indigo-500/20 text-indigo-200",
  "semi-automated": "bg-amber-500/20 text-amber-200",
  "fully-automated": "bg-emerald-500/20 text-emerald-200",
  hybrid: "bg-violet-500/20 text-violet-200",
};

const DOMAIN_COLORS = {
  independent: "bg-blue-500/20 text-blue-200",
  dependent: "bg-red-500/20 text-red-200",
  specific: "bg-purple-500/20 text-purple-200",
  general: "bg-teal-500/20 text-teal-200",
  biomedical: "bg-pink-500/20 text-pink-200",
  geographic: "bg-yellow-500/20 text-yellow-200",
  financial: "bg-green-500/20 text-green-200",
  scientific: "bg-cyan-500/20 text-cyan-200",
  educational: "bg-lime-500/20 text-lime-200",
};

const USER_REVISION_COLORS = {
  manual: "bg-blue-500/20 text-blue-200",
  "semi-automatic": "bg-orange-500/20 text-orange-200",
  automatic: "bg-emerald-500/20 text-emerald-200",
  none: "bg-slate-500/20 text-slate-200",
};

// Required fields configuration for validation
const REQUIRED_FIELDS = {
  id: true,
  year: true,
  firstAuthor: true,
  authors: true,
  title: true,
  "applicationPurpose": true,
  "userInterfaceTool": true,
  output: true,
  "mainMethod.type": true,
  "revision.type": true,
  "domain.domain": true,
  "validation.type": true,
  "coreTasks.facets": true,
  "coreTasks.navigation": true,
  "coreTasks.queryBuilding": true,
  "coreTasks.recommendation": true,
  "supportTasks.guidance": true,
  "supportTasks.backendAssumptions": true,
  "supportTasks.evidence": true,
  "supportTasks.availability": true,
};

// Utility functions (outside component)


// Generic function to count approaches for any support task or boolean field
const countSupportTaskApproaches = (data, taskPath) => {
  return data.filter(row => {
    let value;
    if (taskPath.includes('.')) {
      const parts = taskPath.split('.');
      let current = row;
      for (const part of parts) {
        if (!current) break;
        current = current[part];
      }
      value = current;
    } else {
      value = row.supportTasks?.[taskPath];
    }

    if (typeof value === 'boolean') return value === true;
    if (typeof value === 'string') return value.trim() !== '';
    if (Array.isArray(value)) return value.length > 0;
    return false;
  }).length;
};
// Unified badge color function
const getUnifiedBadgeColor = (baseColor, isNone = false) => {
  if (isNone) {
    return {
      backgroundColor: 'rgba(100,116,139,0.12)', // slate-500/20
      color: '#e5e7eb' // slate-200
    };
  }
  return {
    backgroundColor: baseColor + UNIFIED_COLORS.badgeOpacity,
    color: baseColor
  };
};

// Legacy functions for backward compatibility


const getUserRevisionBadgeColor = (type) => {
  const lower = type?.toLowerCase();
  const baseColor = schema._uiMeta?.revision?.color || '#06b6d4';
  return getUnifiedBadgeColor(baseColor, lower === 'none');
};
const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "object" && !Array.isArray(value)) return Object.keys(value).length === 0;
  return false;
};
const formatDate = (dateString) => {
  if (!dateString || dateString.trim() === "") return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
};
const getNestedValue = (obj, path) => {
  const keys = path.split(".");
  let current = obj;
  for (const key of keys) {
    if (current == null) return undefined;
    current = current[key];
  }
  return current;
};
const isRequiredFieldMissing = (row, fieldPath) => {
  if (!REQUIRED_FIELDS[fieldPath]) return false;
  const value = getNestedValue(row, fieldPath);
  return isEmpty(value);
};

// Color utility functions (kept for potential future use)


// Unified cell rendering components
const UnifiedTextCell = ({ value, isMissing, align = 'left', size = 'text-xs' }) => {
  const alignClass = align === 'center' ? 'flex justify-center' : '';
  const textColor = isMissing ? UNIFIED_COLORS.error : UNIFIED_COLORS.primaryText;
  
  return (
    <div className={alignClass}>
      <span 
        className={`${size} ${isMissing ? 'bg-red-500/20 text-red-200 px-2 py-1' : ''}`}
        style={{ color: isMissing ? undefined : textColor }}
      >
        {value || (isMissing ? "MISSING" : "")}
      </span>
    </div>
  );
};

const UnifiedDateCell = ({ value, isMissing, align = 'center' }) => {
  const formattedDate = formatDate(value);
  const alignClass = align === 'center' ? 'flex justify-center' : '';
  
  if (isMissing) {
    return (
      <div className={alignClass}>
        <span className="bg-red-500/20 text-red-200 px-2 py-1">MISSING</span>
      </div>
    );
  }
  
  if (formattedDate) {
    return (
      <div className={alignClass}>
        <div className="flex flex-col items-center">
          <span className="text-xs font-medium" style={{ color: UNIFIED_COLORS.primaryText }}>
            {formattedDate}
          </span>
          {value !== formattedDate && (
            <span className="text-[10px]" style={{ color: UNIFIED_COLORS.accentText }} title={`Original: ${value}`}>
              {value}
            </span>
          )}
        </div>
      </div>
    );
  } else {
    return (
      <div className={alignClass}>
        <span className="text-xs italic" style={{ color: UNIFIED_COLORS.accentText }}>-</span>
      </div>
    );
  }
};

const UnifiedAuthorsCell = ({ authors, isMissing, align = 'left' }) => {
  const alignClass = align === 'center' ? 'flex justify-center' : '';
  
  if (isMissing) {
    return (
      <div className={alignClass}>
        <span className="bg-red-500/20 text-red-200 px-2 py-1">MISSING</span>
      </div>
    );
  }
  
  if (!authors || authors.length === 0) {
    return (
      <div className={alignClass}>
        <span className="text-[10px]" style={{ color: UNIFIED_COLORS.accentText }}>No authors listed</span>
      </div>
    );
  }
  
  return (
    <div className={alignClass}>
      <span className="text-[10px]" style={{ color: UNIFIED_COLORS.secondaryText }}>
        {authors.join(", ")}
      </span>
    </div>
  );
};

const UnifiedVenueCell = ({ venue, isMissing, align = 'center' }) => {
  const alignClass = align === 'center' ? 'flex justify-center' : '';
  
  if (isMissing || !venue) {
    return (
      <div className={alignClass}>
        <span className="bg-red-500/20 text-red-200 px-2 py-1">MISSING</span>
      </div>
    );
  }
  
  return (
    <div className={alignClass}>
      <div className="flex flex-col gap-1">
        <span 
          className={isMissing ? "bg-red-500/20 text-red-200 px-2 py-1 rounded" : ""}
          style={{ color: isMissing ? undefined : UNIFIED_COLORS.primaryText }}
        >
          {venue.acronym || "MISSING"}
        </span>
        {venue.type && (
          <span className="text-[10px] italic" style={{ color: UNIFIED_COLORS.secondaryText }}>
            {venue.type}
          </span>
        )}
      </div>
    </div>
  );
};

// Legacy component for backward compatibility
const MissingFieldCell = ({ value, isMissing, align = 'left' }) => {
  return <UnifiedTextCell value={value} isMissing={isMissing} align={align} />;
};
const TaskCell = ({ value, isMissing, align = 'left' }) => {
  const alignClass = align === 'center' ? 'flex justify-center' : '';
  
  if (isMissing) {
    return (
      <div className={alignClass}>
        <span className="bg-red-500/20 text-red-200 px-2 py-1 rounded">MISSING</span>
      </div>
    );
  }
  const iconClass = value ? "text-green-500 text-lg" : "text-red-500 text-lg";
  return (
    <div className={alignClass}>
      <Icon name={value ? 'done' : 'clear'} className={iconClass} />
    </div>
  );
};
const StepCell = ({ value, align = 'left' }) => {
  const hasContent = Boolean(value?.trim());
  const iconClass = hasContent ? "text-green-500 text-lg" : "text-red-500 text-lg";
  const alignClass = align === 'center' ? 'flex justify-center' : '';
  
  return (
    <div className={alignClass}>
      <Icon name={hasContent ? 'done' : 'clear'} className={iconClass} />
    </div>
  );
};
const UnifiedMainMethodCell = ({ mainMethod, row, align = 'center' }) => {
  let { type, tech } = mainMethod || {};
  const baseColor = schema._uiMeta?.mainMethod?.color || '#6366f1';
  const badgeClass = 'inline-flex items-center justify-center px-2 py-1 text-[10px] font-medium';
  
  // Normalize type labels
  if (type?.toLowerCase() === 'unsup' || type?.toLowerCase() === 'unsupervised') {
    type = 'Unsupervised';
  } else if (type?.toLowerCase() === 'sup' || type?.toLowerCase() === 'supervised') {
    type = 'Supervised';
  }
  
  const isTypeMissing = isRequiredFieldMissing(row, "mainMethod.type");
  const isTechMissing = isRequiredFieldMissing(row, "mainMethod.technique");
  const alignClass = align === 'center' ? 'flex justify-center' : '';
  
  if (!type && !tech) return "";
  
  const badgeStyle = {
    backgroundColor: baseColor + UNIFIED_COLORS.badgeOpacity,
    color: baseColor
  };
  
  return (
    <div className={alignClass}>
      <div className="flex flex-col items-center gap-1">
        {(type || isTypeMissing) && (
          <span className={badgeClass} style={badgeStyle}>
            {type || "MISSING"}
          </span>
        )}
        {(tech || isTechMissing) && (
          <span 
            className={tech ? "text-[10px] text-center" : "bg-red-500/20 text-red-200 px-2 py-1 text-[10px] text-center"}
            style={{ color: tech ? UNIFIED_COLORS.secondaryText : undefined }}
          >
            {tech || "MISSING"}
          </span>
        )}
      </div>
    </div>
  );
};

// Legacy component for backward compatibility
const MainMethodCell = ({ mainMethod, row, align = 'left' }) => {
  return <UnifiedMainMethodCell mainMethod={mainMethod} row={row} align={align} />;
};
const UnifiedDomainCell = ({ domain, row, align = 'center' }) => {
  const domainValue = domain?.domain || "";
  const typeValue = domain?.type || "";
  const baseColor = schema._uiMeta?.domain?.color || '#14b8a6';
  const badgeClass = 'inline-flex items-center justify-center rounded px-2 py-1 text-[10px] font-medium';
  
  if (!domainValue && !typeValue) return "";
  
  const isDomainMissing = isRequiredFieldMissing(row, "domain.domain");
  const alignClass = align === 'center' ? 'flex justify-center' : '';
  
  const badgeStyle = {
    backgroundColor: baseColor + UNIFIED_COLORS.badgeOpacity,
    color: baseColor
  };
  
  return (
    <div className={alignClass}>
      <div className="flex flex-col items-center gap-1">
        {(domainValue || isDomainMissing) && (
          <span className={badgeClass} style={badgeStyle}>
            {domainValue || "MISSING"}
          </span>
        )}
        {typeValue && (
          <span className="text-[10px] text-center" style={{ color: UNIFIED_COLORS.secondaryText }}>
            {typeValue}
          </span>
        )}
      </div>
    </div>
  );
};

// Legacy component for backward compatibility
const DomainCell = ({ domain, row, align = 'left' }) => {
  return <UnifiedDomainCell domain={domain} row={row} align={align} />;
};

const ValidationCell = ({ value, isMissing }) => {
  if (isMissing) {
    return <span className="bg-red-500/20 text-red-200 px-2 py-1 rounded">MISSING</span>;
  }

  if (!value || typeof value !== 'object') {
    return <span className="text-neutral-400">No evidence data</span>;
  }

  const { type, details } = value;

  return (
    <div className="text-xs space-y-1">
      {type && (
        <div className="text-neutral-300">
          <span className="font-medium">Type:</span> {type}
        </div>
      )}
      {details && (
        <div className="text-neutral-400">
          <span className="font-medium">Details:</span> {details}
        </div>
      )}
    </div>
  );
};
const RowNumberCell = ({ row, index }) => {
  const missingFields = Object.keys(REQUIRED_FIELDS).filter((field) => isRequiredFieldMissing(row.original, field));
  const hasMissingFields = missingFields.length > 0;
  return (
    <div className="flex flex-col items-center">
      <span>{index + 1}</span>
      {hasMissingFields && (
        <div className="relative group mt-1">
          <span className="text-[11px] text-red-400 bg-red-900/60 px-2 py-0.5 leading-none cursor-pointer whitespace-nowrap">
            {missingFields.length} missing
          </span>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-neutral-800 shadow-lg text-xs text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none min-w-[120px]">
            <div className="font-semibold mb-1">Missing fields:</div>
            <div className="space-y-1">
              {missingFields.map((field) => (
                <div key={field} className="text-[10px] text-neutral-400">• {field}</div>
              ))}
            </div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
          </div>
        </div>
      )}
    </div>
  );
};

// Collapsible navigation component
const CollapsibleNavigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <div className="fixed top-6 left-0 z-30">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative bg-neutral-900 hover:bg-neutral-800 text-neutral-300 px-4 py-3 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105 group flex items-center justify-center"
          title={isOpen ? "Hide navigation" : "Show navigation"}
        >
          {isOpen ? (
            <Icon name="close" className="text-xl transition-transform duration-300 group-hover:rotate-12 relative z-10" />
          ) : (
            <Icon name="menu" className="text-xl transition-transform duration-300 group-hover:rotate-12 relative z-10" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-neutral-700/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </button>
      </div>
      {isOpen && (
        <div className="fixed top-0 left-0 right-0 z-20">
          <Navigation defaultOpen={true} />
        </div>
      )}
    </>
  );
};

// Unified license badge color function
const getLicenseBadgeColor = (license) => {
  const baseColor = schema._uiMeta?.license?.color || '#facc15';
  const isNone = !license || license.trim().toLowerCase() === 'not specified' || license.trim() === 'Ns';
  return getUnifiedBadgeColor(baseColor, isNone);
};

function SurveyTable() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [columnFilters, setColumnFilters] = useState([]);
  const [sorting, setSorting] = useState([]);

  // Extract color mapping and taxonomy from schema _uiMeta
  const headerColors = useMemo(() => {
    const meta = schema._uiMeta || {};
    const colors = {};
    for (const key in meta) {
      if (meta[key].color) colors[key] = meta[key].color;
    }
    return colors;
  }, []);
  const headerTaxonomy = useMemo(() => {
    const meta = schema._uiMeta || {};
    const taxonomy = {};
    for (const key in meta) {
      if (meta[key].taxonomy) taxonomy[key] = meta[key].taxonomy;
    }
    return taxonomy;
  }, []);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(import.meta.env.BASE_URL + 'data/sti-survey.json');
        if (!response.ok) throw new Error('Failed to load data');
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

  // Column definitions
  const columns = useMemo(() => [
    columnHelper.display({
      id: "rowNumber",
      header: "#",
      cell: (info) => <RowNumberCell row={info.row} index={info.row.index} />, // Always first
      enableSorting: false,
      meta: { align: 'center' }
    }),
    columnHelper.accessor("id", {
      header: () => <span>ID</span>,
      cell: (info) => (
        <span 
          className="text-[10px] font-mono" 
          style={{ color: UNIFIED_COLORS.primaryText }}
        >
          {info.getValue()}
        </span>
      ),
      enableSorting: false,
      meta: { align: 'center' }
    }),
    columnHelper.accessor("added", {
      header: () => <span>Added</span>,
      cell: (info) => <UnifiedDateCell value={info.getValue()} isMissing={false} align="center" />,
      enableSorting: true,
      meta: { align: 'center' }
    }),
    columnHelper.accessor("year", {
      header: () => <span>Year</span>,
      cell: (info) => info.getValue(),
      enableSorting: true,
      meta: { align: 'center' }
    }),
    columnHelper.accessor("firstAuthor", {
      header: () => <span>First Author</span>,
      cell: (info) => <UnifiedTextCell value={info.getValue()} isMissing={isRequiredFieldMissing(info.row.original, 'firstAuthor')} align="center" />,
      enableSorting: false,
      meta: { align: 'center' }
    }),
    columnHelper.accessor("authors", {
      header: () => <span>Author</span>,
      cell: (info) => <UnifiedAuthorsCell authors={info.getValue()} isMissing={isRequiredFieldMissing(info.row.original, 'authors')} align="left" />,
      enableSorting: false,
    }),
    columnHelper.accessor("title", {
      header: () => <span>Name</span>,
      cell: (info) => {
        const titleText = info.getValue();
        const isMissing = isRequiredFieldMissing(info.row.original, 'title');
        return (
          <div className="flex items-center gap-2">
            <MissingFieldCell value={titleText} isMissing={isMissing} />
          </div>
        );
      },
      enableSorting: false,
    }),
    columnHelper.accessor(row => row.validation?.type || "", {
      id: "evidenceType",
      header: () => <span>Evidence Type</span>,
      cell: (info) => (
        <MissingFieldCell
          value={info.getValue()}
          isMissing={isRequiredFieldMissing(info.row.original, 'validation.type')}
          align="center"
        />
      ),
      enableColumnFilter: true,
      enableFacetedUniqueValues: true,
      enableSorting: false,
      filterFn: (row, columnId, filterValue) => {
        if (!Array.isArray(filterValue) || filterValue.length === 0) return true;
        const evidenceType = row.getValue(columnId);
        return filterValue.includes(evidenceType);
      },
      meta: { align: 'center' }
    }),
    columnHelper.accessor("techniqueTags", {
      header: () => <span>Tags</span>,
      cell: (info) => {
        const tags = info.getValue();
        if (!tags || tags.length === 0) {
          const alignClass = info.column.columnDef.meta?.align === 'center' ? 'flex justify-center' : '';
          return (
            <div className={alignClass}>
              <span className="text-neutral-500 text-[10px]">-</span>
            </div>
          );
        }
        const alignClass = info.column.columnDef.meta?.align === 'center' ? 'flex justify-center' : '';
        
        return (
          <div className={alignClass}>
            <div className="flex flex-wrap justify-center gap-1">
              {tags.map((tag, index) => (
                <span key={index} className="inline-flex items-center justify-center px-2 py-1 text-[10px] font-medium text-center" style={{ backgroundColor: 'rgba(100, 116, 139, 0.12)', color: 'rgb(229, 231, 235)' }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        );
      },
      enableSorting: false,
      meta: { align: 'center' }
    }),
    // Core Tasks group
    {
      id: "coreTasks",
      header: () => (
        <span style={{ color: headerColors.coreTasks }}>
          {headerTaxonomy.coreTasks ? headerTaxonomy.coreTasks + ' - ' : ''}Interaction Paradigms
        </span>
      ),
      columns: [
        columnHelper.accessor(row => row.coreTasks?.facets, {
          id: "facets",
          header: () => {
            const count = data.length > 0 ? countSupportTaskApproaches(data, 'coreTasks.facets') : 0;
            return (
              <div className="flex items-center gap-2">
                <span>Facets</span>
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-200">
                  {count}
                </span>
              </div>
            );
          },
          cell: (info) => <TaskCell value={info.getValue()} isMissing={isRequiredFieldMissing(info.row.original, 'coreTasks.facets')} align={info.column.columnDef.meta?.align} />,
          enableSorting: false,
          meta: { align: 'center' }
        }),
        columnHelper.accessor(row => row.coreTasks?.navigation, {
          id: "navigation",
          header: () => {
            const count = data.length > 0 ? countSupportTaskApproaches(data, 'coreTasks.navigation') : 0;
            return (
              <div className="flex items-center gap-2">
                <span>Navigation</span>
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-200">
                  {count}
                </span>
              </div>
            );
          },
          cell: (info) => <TaskCell value={info.getValue()} isMissing={isRequiredFieldMissing(info.row.original, 'coreTasks.navigation')} align={info.column.columnDef.meta?.align} />,
          enableSorting: false,
          meta: { align: 'center' }
        }),
        columnHelper.accessor(row => row.coreTasks?.queryBuilding, {
          id: "queryBuilding",
          header: () => {
            const count = data.length > 0 ? countSupportTaskApproaches(data, 'coreTasks.queryBuilding') : 0;
            return (
              <div className="flex items-center gap-2">
                <span>Query Building</span>
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-200">
                  {count}
                </span>
              </div>
            );
          },
          cell: (info) => <TaskCell value={info.getValue()} isMissing={isRequiredFieldMissing(info.row.original, 'coreTasks.queryBuilding')} align={info.column.columnDef.meta?.align} />,
          enableSorting: false,
          meta: { align: 'center' }
        }),
        columnHelper.accessor(row => row.coreTasks?.recommendation, {
          id: "recommendation",
          header: () => {
            const count = data.length > 0 ? countSupportTaskApproaches(data, 'coreTasks.recommendation') : 0;
            return (
              <div className="flex items-center gap-2">
                <span>Guidance/Visualization</span>
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-200">
                  {count}
                </span>
              </div>
            );
          },
          cell: (info) => <TaskCell value={info.getValue()} isMissing={isRequiredFieldMissing(info.row.original, 'coreTasks.recommendation')} align={info.column.columnDef.meta?.align} />,
          enableSorting: false,
          meta: { align: 'center' }
        }),
      ],
    },
    // Support Tasks group
    {
      id: "supportTasks",
      header: () => (
        <span style={{ color: headerColors.supportTasks }}>
          {headerTaxonomy.supportTasks ? headerTaxonomy.supportTasks + ' - ' : ''}Comparison Dimensions
        </span>
      ),
      columns: [
        columnHelper.accessor(row => row.supportTasks?.guidance || "", {
          id: "guidance",
          header: () => {
            const count = data.length > 0 ? countSupportTaskApproaches(data, 'guidance') : 0;
            return (
              <div className="flex items-center gap-2">
                <span>Guidance</span>
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-200">
                  {count}
                </span>
              </div>
            );
          },
          cell: (info) => (
            <MissingFieldCell
              value={info.getValue()}
              isMissing={isRequiredFieldMissing(info.row.original, 'supportTasks.guidance')}
            />
          ),
          enableSorting: false,
        }),
        columnHelper.accessor(row => row.supportTasks?.backendAssumptions || "", {
          id: "backendAssumptions",
          header: () => {
            const count = data.length > 0 ? countSupportTaskApproaches(data, 'backendAssumptions') : 0;
            return (
              <div className="flex items-center gap-2">
                <span>Backend &amp; Assumptions</span>
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-200">
                  {count}
                </span>
              </div>
            );
          },
          cell: (info) => (
            <MissingFieldCell
              value={info.getValue()}
              isMissing={isRequiredFieldMissing(info.row.original, 'supportTasks.backendAssumptions')}
            />
          ),
          enableSorting: false,
        }),
        columnHelper.accessor(row => row.supportTasks?.evidence || "", {
          id: "evidence",
          header: () => {
            const count = data.length > 0 ? countSupportTaskApproaches(data, 'evidence') : 0;
            return (
              <div className="flex items-center gap-2">
                <span>Evidence</span>
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-200">
                  {count}
                </span>
              </div>
            );
          },
          cell: (info) => (
            <MissingFieldCell
              value={info.getValue()}
              isMissing={isRequiredFieldMissing(info.row.original, 'supportTasks.evidence')}
              align="center"
            />
          ),
          enableSorting: false,
          meta: { align: 'center' }
        }),
        columnHelper.accessor(row => row.supportTasks?.availability || "", {
          id: "availability",
          header: () => {
            const count = data.length > 0 ? countSupportTaskApproaches(data, 'availability') : 0;
            return (
              <div className="flex items-center gap-2">
                <span>Availability</span>
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-200">
                  {count}
                </span>
              </div>
            );
          },
          cell: (info) => (
            <MissingFieldCell
              value={info.getValue()}
              isMissing={isRequiredFieldMissing(info.row.original, 'supportTasks.availability')}
              align="center"
            />
          ),
          enableSorting: false,
          meta: { align: 'center' }
        }),
        columnHelper.accessor(row => row.supportTasks?.visualization || "", {
          id: "visualization",
          header: () => {
            const count = data.length > 0 ? countSupportTaskApproaches(data, 'visualization') : 0;
            return (
              <div className="flex items-center gap-2">
                <span>Visualization</span>
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-200">
                  {count}
                </span>
              </div>
            );
          },
          cell: (info) => <MissingFieldCell value={info.getValue()} isMissing={false} align="center" />,
          enableSorting: false,
          meta: { align: 'center' }
        }),
        columnHelper.accessor(row => row.supportTasks?.dataAccess || "", {
          id: "dataAccess",
          header: () => {
            const count = data.length > 0 ? countSupportTaskApproaches(data, 'dataAccess') : 0;
            return (
              <div className="flex items-center gap-2">
                <span>Data Access</span>
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-200">
                  {count}
                </span>
              </div>
            );
          },
          cell: (info) => <MissingFieldCell value={info.getValue()} isMissing={false} align="center" />,
          enableSorting: false,
          meta: { align: 'center' }
        }),
        columnHelper.accessor(row => row.supportTasks?.dataSources || "", {
          id: "dataSources",
          header: () => {
            const count = data.length > 0 ? countSupportTaskApproaches(data, 'dataSources') : 0;
            return (
              <div className="flex items-center gap-2">
                <span>Data Sources</span>
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-200">
                  {count}
                </span>
              </div>
            );
          },
          cell: (info) => <MissingFieldCell value={info.getValue()} isMissing={false} align="center" />,
          enableSorting: false,
          meta: { align: 'center' }
        }),
        columnHelper.accessor(row => row.supportTasks?.notes || "", {
          id: "notes",
          header: () => {
            const count = data.length > 0 ? countSupportTaskApproaches(data, 'notes') : 0;
            return (
              <div className="flex items-center gap-2">
                <span>Notes</span>
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-200">
                  {count}
                </span>
              </div>
            );
          },
          cell: (info) => <MissingFieldCell value={info.getValue()} isMissing={false} align="center" />,
          enableSorting: false,
          meta: { align: 'center' }
        }),
      ],
    },
    columnHelper.accessor(row => {
      const type = row.mainMethod?.type || "";
      const tech = row.mainMethod?.technique || row.mainMethod?.tech || "";
      return { type, tech };
    }, {
      id: "mainMethod",
      header: () => <span style={{ color: headerColors.mainMethod }}>{headerTaxonomy.mainMethod ? headerTaxonomy.mainMethod + ' - ' : ''}Approach Class</span>,
      cell: (info) => <UnifiedMainMethodCell mainMethod={info.getValue()} row={info.row.original} align="center" />,
      enableSorting: false,
      meta: { align: 'center' }
    }),
    // Type (Revision) column - before Domain
    columnHelper.accessor(row => row.revision?.type || "", {
      id: "revision",
      header: () => <span style={{ color: headerColors.revision }}>{headerTaxonomy.revision ? headerTaxonomy.revision + ' - ' : ''}Guidance Strategy</span>,
      cell: (info) => {
        const value = info.getValue();
        const isMissing = isRequiredFieldMissing(info.row.original, 'revision.type');
        const description = info.row.original.revision?.description;
        const badgeStyle = getUserRevisionBadgeColor(value);
        const badgeClass = 'inline-flex items-center justify-center rounded px-2 py-1 text-[10px] font-medium';
        const alignClass = info.column.columnDef.meta?.align === 'center' ? 'flex justify-center' : '';
        
        if (isMissing) {
          return (
            <div className={alignClass}>
              <span className="bg-red-500/20 text-red-200 px-2 py-1 rounded">MISSING</span>
            </div>
          );
        }
        if (description && description.trim() !== "") {
          return (
            <div className={alignClass}>
              <div className="relative group inline-flex items-center">
                <span className={badgeClass} style={badgeStyle}>
                  {value}
                  <Icon name="info_outline" className="ml-1 align-middle leading-none text-[16px]" />
                </span>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-neutral-800 shadow-lg text-xs text-neutral-300 whitespace-pre-line opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none min-w-[120px] max-w-xs">
                  {description}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                </div>
              </div>
            </div>
          );
        }
        return (
          <div className={alignClass}>
            <span className={badgeClass} style={badgeStyle}>{value}</span>
          </div>
        );
      },
      enableSorting: false,
      meta: { align: 'center' }
    }),
    // Domain column - after Type
    columnHelper.accessor(row => row.domain, {
      id: "domain",
      header: () => <span style={{ color: headerColors.domain }}>{headerTaxonomy.domain ? headerTaxonomy.domain + ' - ' : ''}Backend Type</span>,
      cell: (info) => <UnifiedDomainCell domain={info.getValue()} row={info.row.original} align="center" />,
      enableSorting: false,
      meta: { align: 'center' }
    }),
    columnHelper.accessor(row => row.validation || "", {
      id: "validation",
      header: () => <span style={{ color: headerColors.validation }}>{headerTaxonomy.validation ? headerTaxonomy.validation + ' - ' : ''}Evidence</span>,
      cell: (info) => <ValidationCell value={info.getValue()} isMissing={isRequiredFieldMissing(info.row.original, 'validation.type')} />,
      enableSorting: false,
    }),
    columnHelper.accessor(row => row.codeAvailability || "", {
      id: "codeAvailability",
      header: () => <span style={{ color: headerColors.codeAvailability }}>{headerTaxonomy.codeAvailability ? headerTaxonomy.codeAvailability + ' - ' : ''}Availability</span>,
      cell: (info) => {
        const value = info.getValue();
        const alignClass = info.column.columnDef.meta?.align === 'center' ? 'flex justify-center' : '';
        const headerColor = headerColors.codeAvailability || '#10b981';

        if (!value || value.trim() === "") {
          return (
            <div className={alignClass}>
              <span className="inline-flex items-center justify-center px-2 py-1 text-[10px] font-medium bg-slate-500/20 text-slate-200">Not specified</span>
            </div>
          );
        }

        return (
          <div className={alignClass}>
            <span className="inline-flex items-center justify-center px-2 py-1 text-[10px] font-medium" style={{ backgroundColor: headerColor + '20', color: headerColor }}>
              {value}
            </span>
          </div>
        );
      },
      enableSorting: false,
      meta: { align: 'center' },
    }),
    columnHelper.accessor(row => row.license || "", {
      id: "license",
      header: () => <span style={{ color: headerColors.license }}>{headerTaxonomy.license ? headerTaxonomy.license + ' - ' : ''}License</span>,
      cell: (info) => {
        const value = info.getValue();
        const badgeStyle = getLicenseBadgeColor(value);
        const badgeClass = 'inline-flex items-center justify-center rounded px-2 py-1 text-[10px] font-medium';
        const alignClass = info.column.columnDef.meta?.align === 'center' ? 'flex justify-center' : '';
        
        return (
          <div className={alignClass}>
            <span className={badgeClass} style={badgeStyle}>{value || 'Not specified'}</span>
          </div>
        );
      },
      enableSorting: false,
      meta: { align: 'center' }
    }),
    columnHelper.accessor(row => row.output || "", {
      id: "output",
      header: () => <span style={{ color: headerColors.output }}>{headerTaxonomy.output ? headerTaxonomy.output + ' - ' : ''}Output</span>,
      cell: (info) => <MissingFieldCell value={info.getValue()} isMissing={isRequiredFieldMissing(info.row.original, 'output')} align={info.column.columnDef.meta?.align} />,
      enableSorting: false,
      meta: { align: 'center' }
    }),
    columnHelper.accessor(row => row.applicationPurpose, {
      id: "applicationPurpose",
      header: () => <span style={{ color: headerColors.applicationPurpose }}>{headerTaxonomy.applicationPurpose ? headerTaxonomy.applicationPurpose + ' - ' : ''}Primary Goal</span>,
      cell: (info) => <MissingFieldCell value={info.getValue()} isMissing={isRequiredFieldMissing(info.row.original, 'applicationPurpose')} />,
      enableSorting: false,
    }),
    columnHelper.accessor(row => row.userInterfaceTool, {
      id: "userInterfaceTool",
      header: () => <span style={{ color: headerColors.userInterfaceTool }}>{headerTaxonomy.userInterfaceTool ? headerTaxonomy.userInterfaceTool + ' - ' : ''}User Interaction</span>,
      cell: (info) => <MissingFieldCell value={info.getValue()} isMissing={isRequiredFieldMissing(info.row.original, 'userInterfaceTool')} />,
      enableSorting: false,
    }),
    columnHelper.accessor(row => row.doi, {
      id: "doi",
      header: "DOI",
      cell: (info) => {
        const doiValue = info.getValue();
        const isMissing = isRequiredFieldMissing(info.row.original, 'doi');
        
        if (isMissing) {
          return <span className="bg-red-500/20 text-red-200 px-2 py-1 rounded">MISSING</span>;
        }
        
        if (!doiValue || doiValue.trim() === "") {
          return <span className="text-neutral-500 text-[10px]">-</span>;
        }
        
        // Ensure DOI has proper protocol
        const doiUrl = doiValue.startsWith('http') ? doiValue : `https://doi.org/${doiValue}`;
        
        return (
          <a 
            href={doiUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline text-[10px] break-all"
            title="Open DOI link"
          >
            {doiValue}
          </a>
        );
      },
      enableSorting: false,
    }),
    // Citations group
    {
      id: "citations",
      header: () => <span style={{ color: headerColors.citations }}>{headerTaxonomy.citations ? headerTaxonomy.citations + ' - ' : ''}Citations</span>,
      columns: [
        columnHelper.accessor(row => Array.isArray(row.citations?.references) ? row.citations.references.length : 0, {
          id: "referencesCount",
          header: () => <span></span>,
          cell: (info) => {
            const referencesCount = info.getValue();
            const alignClass = info.column.columnDef.meta?.align === 'center' ? 'flex justify-center' : '';
            
            return (
              <div className={alignClass}>
                <span className="text-[10px] text-neutral-400">
                  {referencesCount}
                </span>
              </div>
            );
          },
          enableSorting: true,
          meta: { align: 'center' }
        }),
      ],
    },
  ], [headerColors, headerTaxonomy, data]);

  // React Table instance
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { columnFilters, sorting },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-neutral-300 text-lg">Loading data...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-red-400 bg-red-900/20 p-6 text-lg">Error: {error}</div>
      </div>
    );
  }
  return (
    <div className="bg-neutral-900 h-screen overflow-auto relative">
      <CollapsibleNavigation />
      <table className="w-full table-auto text-xs">
        <thead className="bg-neutral-800 sticky top-0 z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  colSpan={header.colSpan}
                  className="px-4 py-2 text-center text-xs font-semibold text-neutral-300"
                  onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                  style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getCanSort() && (
                    <span className="ml-2">
                      {header.column.getIsSorted() === 'asc' ? '▲' : header.column.getIsSorted() === 'desc' ? '▼' : ''}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="bg-neutral-900">
          {table.getRowModel().rows.map((row, index) => {
            const missingFields = Object.keys(REQUIRED_FIELDS).filter(field => isRequiredFieldMissing(row.original, field));
            const hasMissingFields = missingFields.length > 0;
            return (
              <tr
                key={row.id}
                className={`hover:bg-neutral-700 transition-colors duration-150 ${index % 2 === 0 ? 'bg-neutral-900' : 'bg-neutral-800'} ${hasMissingFields ? 'border-l-4 border-l-red-500' : ''} relative group`}
                title={`Approach ID: ${row.original.id}`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={`px-4 py-2 text-xs text-neutral-300 ${cell.column.columnDef.meta?.align === 'center' ? 'text-center' : 'text-left'}`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default SurveyTable; 
