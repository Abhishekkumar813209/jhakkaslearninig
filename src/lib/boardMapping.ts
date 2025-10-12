// Maps user-friendly board names to database enum values
export const BOARD_MAPPING: Record<string, string> = {
  'CBSE': 'CBSE',
  'ICSE': 'ICSE',
  'UP Board': 'UP_BOARD',
  'Bihar Board': 'BIHAR_BOARD',
  'Mp Board': 'MP_BOARD',
  'Rajasthan Board': 'RAJASTHAN_BOARD',
  'Maharashtra Board': 'MAHARASHTRA_BOARD',
  'Gujarat Board': 'GUJARAT_BOARD',
  'West-Bengal Board': 'WEST_BENGAL_BOARD',
  'Karnataka Board': 'KARNATAKA_BOARD',
  'State Board': 'STATE_BOARD'
};

// Reverse mapping for display
export const BOARD_DISPLAY: Record<string, string> = Object.entries(BOARD_MAPPING)
  .reduce((acc, [display, db]) => ({ ...acc, [db]: display }), {});

export const toBoardEnumValue = (displayName: string): string => {
  return BOARD_MAPPING[displayName] || displayName;
};

export const toBoardDisplayName = (enumValue: string): string => {
  return BOARD_DISPLAY[enumValue] || enumValue;
};
