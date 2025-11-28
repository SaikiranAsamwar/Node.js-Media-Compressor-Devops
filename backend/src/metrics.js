const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const jobsCounter = new client.Counter({
  name: 'filetool_jobs_total',
  help: 'Total jobs processed',
  labelNames: ['type', 'status']
});
register.registerMetric(jobsCounter);

module.exports = { register, jobsCounter };
