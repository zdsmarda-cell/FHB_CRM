module.exports = {
  apps: [
    {
      name: "crm-app",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        APP_PORT: 3010
      }
    },
    {
      name: "crm-worker",
      script: "npm",
      args: "run start-worker",
      env: {
        NODE_ENV: "production",
      }
    }
  ]
};
