/** PM2 config — Academy Hub (Next.js frontend, internal :3000). */
module.exports = {
  apps: [
    {
      name: "academy-hub",
      cwd: "/opt/football/fotbal/academy_hub",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 127.0.0.1",
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      listen_timeout: 30000,
      kill_timeout: 5000,
    },
  ],
};
