module.exports = {
  apps: [
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
