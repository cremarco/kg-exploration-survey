import React from 'react';

const Svg = ({ children, className, viewBox = '0 0 24 24', stroke = 'currentColor', fill = 'none' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={viewBox}
    width="1em"
    height="1em"
    fill={fill}
    stroke={stroke}
    strokeWidth={2}
    strokeLinecap="butt"
    strokeLinejoin="miter"
    aria-hidden="true"
    className={className}
    focusable="false"
  >
    {children}
  </svg>
);

const paths = {
  // Simple checkmark
  done: (className) => (
    <Svg className={className}>
      <path d="M5 13l4 4L19 7" />
    </Svg>
  ),
  // Simple X
  clear: (className) => (
    <Svg className={className}>
      <path d="M6 6l12 12M6 18L18 6" />
    </Svg>
  ),
  close: (className) => (
    <Svg className={className}>
      <path d="M6 6l12 12M6 18L18 6" />
    </Svg>
  ),
  menu: (className) => (
    <Svg className={className}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </Svg>
  ),
  // Info inside circle (outline)
  info_outline: (className) => (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6M12 8h.01" />
    </Svg>
  ),
  // External link / launch
  launch: (className) => (
    <Svg className={className}>
      <path d="M14 3h7v7" />
      <path d="M21 3l-9 9" />
      <path d="M12 7H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </Svg>
  ),
  // Download arrow with bar
  download: (className) => (
    <Svg className={className}>
      <path d="M12 3v12" />
      <path d="M7 12l5 5 5-5" />
      <path d="M5 21h14" />
    </Svg>
  ),
  // Bar chart / analytics
  bar_chart: (className) => (
    <Svg className={className}>
      <path d="M4 20h16" />
      <path d="M6 20V9" />
      <path d="M12 20V4" />
      <path d="M18 20v-7" />
    </Svg>
  ),
  analytics: (className) => (
    <Svg className={className}>
      <path d="M4 20h16" />
      <path d="M6 20V9" />
      <path d="M12 20V4" />
      <path d="M18 20v-7" />
    </Svg>
  ),
  // Table chart / grid
  table_chart: (className) => (
    <Svg className={className}>
      <rect x="3" y="7" width="18" height="12" />
      <path d="M3 11h18" />
      <path d="M9 7v12" />
      <path d="M15 7v12" />
    </Svg>
  ),
  // Category: four tiles
  category: (className) => (
    <Svg className={className}>
      <rect x="4" y="4" width="7" height="7" />
      <rect x="13" y="4" width="7" height="7" />
      <rect x="4" y="13" width="7" height="7" />
      <rect x="13" y="13" width="7" height="7" />
    </Svg>
  ),
  // Account tree: nodes connected
  account_tree: (className) => (
    <Svg className={className}>
      <circle cx="6" cy="6" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="12" cy="18" r="2" />
      <path d="M8 6h6" />
      <path d="M12 8v6" />
    </Svg>
  ),
  // 360: circular arrow
  360: (className) => (
    <Svg className={className}>
      <path d="M4 12a8 8 0 1 0 4-6.928" />
      <path d="M8 5l-2 2 2 2" />
    </Svg>
  ),
};

export default function Icon({ name, className = '' }) {
  const renderer = paths[name];
  if (renderer) return renderer(className);
  // Fallback: a simple square if icon name not found
  return (
    <Svg className={className}>
      <rect x="5" y="5" width="14" height="14" />
    </Svg>
  );
}
