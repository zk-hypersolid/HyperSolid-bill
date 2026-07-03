const appJson = require("./app.json");

// Extends the static app.json with the build-time Sentry DSN (EAS env). The Sentry Expo config
// plugin already lives in app.json's plugins; we only inject the DSN here.
module.exports = () => ({
  ...appJson.expo,
  extra: {
    ...(appJson.expo.extra ?? {}),
    sentryDsn: process.env.SENTRY_DSN ?? "",
  },
});
