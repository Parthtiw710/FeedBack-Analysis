export const formatValue = (value: number) => Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumSignificantDigits: 3,
  notation: 'compact',
}).format(value);

export const formatThousands = (value: number) => Intl.NumberFormat('en-US', {
  maximumSignificantDigits: 3,
  notation: 'compact',
}).format(value);

export const getCssVariable = (variable: string) => {
  if (typeof window === 'undefined') {
    if (variable.includes('violet')) return '#8b5cf6';
    if (variable.includes('emerald')) return '#10b981';
    if (variable.includes('sky')) return '#0ea5e9';
    if (variable.includes('amber')) return '#f59e0b';
    if (variable.includes('rose')) return '#f43f5e';
    if (variable.includes('slate')) return '#64748b';
    return '#000000';
  }
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
};

const adjustHexOpacity = (hexColor: string, opacity: number) => {
  // Remove the '#' if it exists
  hexColor = hexColor.replace('#', '');

  // Convert hex to RGB
  const r = parseInt(hexColor.substring(0, 2), 16);
  const g = parseInt(hexColor.substring(2, 4), 16);
  const b = parseInt(hexColor.substring(4, 6), 16);

  // Return RGBA string
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const adjustHSLOpacity = (hslColor: string, opacity: number) => {
  // Convert HSL to HSLA
  return hslColor.replace('hsl(', 'hsla(').replace(')', `, ${opacity})`);
};

const adjustOKLCHOpacity = (oklchColor: string, opacity: number) => {
  // Add alpha value to OKLCH color
  return oklchColor.replace(/oklch\((.*?)\)/, (_match, p1) => `oklch(${p1} / ${opacity})`);
};

export const adjustColorOpacity = (color: string, opacity: number) => {
  if (color.startsWith('#')) {
    return adjustHexOpacity(color, opacity);
  } else if (color.startsWith('hsl')) {
    return adjustHSLOpacity(color, opacity);
  } else if (color.startsWith('oklch')) {
    return adjustOKLCHOpacity(color, opacity);
  } else {
    throw new Error('Unsupported color format');
  }
};

export const oklchToRGBA = (oklchColor: string) => {
  if (typeof window === 'undefined') {
    return 'rgba(0, 0, 0, 1)';
  }
  // Create a temporary div to use for color conversion
  const tempDiv = document.createElement('div');
  tempDiv.style.color = oklchColor;
  document.body.appendChild(tempDiv);
  
  // Get the computed style and convert to RGB
  const computedColor = window.getComputedStyle(tempDiv).color;
  document.body.removeChild(tempDiv);
  
  return computedColor;
};