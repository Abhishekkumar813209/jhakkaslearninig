/**
 * Unified topic progress color logic
 * Thresholds: >70% = Green, 50-70% = Grey, <50% = Red, 0% = Not Started
 */

export interface TopicColorConfig {
  key: 'green' | 'grey' | 'red' | 'yellow';
  bg: string;
  badgeClass: string;
  label: string;
  icon: string;
}

export function getTopicColor(rate: number): TopicColorConfig {
  if (rate > 70) {
    return {
      key: 'green',
      bg: 'bg-green-600',
      badgeClass: 'bg-green-800 border-green-400',
      label: 'Excellent',
      icon: '✅'
    };
  }
  
  if (rate >= 50) {
    return {
      key: 'yellow',
      bg: 'bg-yellow-500',
      badgeClass: 'bg-yellow-600 border-yellow-400',
      label: 'In Progress',
      icon: '🟡'
    };
  }
  
  if (rate > 0) {
    return {
      key: 'red',
      bg: 'bg-red-600',
      badgeClass: 'bg-red-800 border-red-400',
      label: 'Needs Attention',
      icon: '🔴'
    };
  }
  
  // Not started
  return {
    key: 'grey',
    bg: 'bg-gray-400',
    badgeClass: 'bg-gray-600 border-gray-400',
    label: 'Not Started',
    icon: '⚪'
  };
}
