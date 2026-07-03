import "./src/polyfills";
import { registerRootComponent } from "expo";
import Constants from "expo-constants";
import { initSentry } from "./src/lib/observability/sentry";
import App from "./App";

const dsn = (Constants.expoConfig?.extra as { sentryDsn?: string } | undefined)?.sentryDsn ?? "";
const isExpoGo = Constants.executionEnvironment === "storeClient";
initSentry({ dsn, isDev: __DEV__, isExpoGo });

registerRootComponent(App);
