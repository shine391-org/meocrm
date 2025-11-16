/* istanbul ignore file */
export const PRIORITY_CONFIG = {
  enabled: true,
  thresholds: {
    auto_to_medium: 7,
    auto_to_low: 30,
    auto_to_inactive: 60,
  },
  new_lead_priority: 'high',
  allow_manual_override: true,
  auto_assignment: {
    enabled: false,
    rules: {
      high: 'senior_sales',
      medium: 'any_sales',
      low: 'junior_sales',
    },
  },
} as const;
