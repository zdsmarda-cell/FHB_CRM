module.exports = {
  apps: [
    {
      name: "crm-app",
      script: "./server-build/server.js",
      env: {
        NODE_ENV: "production",
        APP_PORT: 3010
      }
    },
    {
      name: "crm-worker",
      script: "./server-build/worker.js",
      env: {
        NODE_ENV: "production",
      }
    }
  ]
};
