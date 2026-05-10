module.exports = {
  apps: [
    {
      name: "crm-app",
      script: "./server-build/server.js",
      error_file: "./logs/crm-app-error.log",
      out_file: "./logs/crm-app-out.log",
      merge_logs: true,
      time: true,
      env: {
        NODE_ENV: "production",
        APP_PORT: 3010
      }
    },
    {
      name: "crm-worker",
      script: "./server-build/worker.js",
      error_file: "./logs/crm-worker-error.log",
      out_file: "./logs/crm-worker-out.log",
      merge_logs: true,
      time: true,
      env: {
        NODE_ENV: "production",
      }
    }
  ]
};
