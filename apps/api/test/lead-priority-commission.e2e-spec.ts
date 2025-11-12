describe('Lead Priority Automation', () => {
  it.todo('decays HIGH→MEDIUM→LOW→INACTIVE at T1/T2/T3 thresholds per PRIORITY_CONFIG');
  it.todo('resets priorityAuto back to HIGH when high-value activity is recorded');
  it.todo('respects manual override via POST /leads/:id/priority:override');
  it.todo('runs cron batch per organization without leaking data across tenants');
});

describe('Commission Engine & Payouts', () => {
  it.todo('creates PENDING commission immediately when a POS order completes');
  it.todo('creates PENDING commission when a COD order webhook confirms DELIVERED');
  it.todo('approves commissions and marks payouts as PAID for the requested period');
  it.todo('creates a negative adjustment (amount < 0) for a 30% refund');
  it.todo('applies tiered split + rounding rules (70/20/10) with remainder assigned to owner');
  it.todo('returns API errors in {code,message,traceId} format on invalid commission rule payloads');
});
