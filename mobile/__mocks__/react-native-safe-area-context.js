// Auto-applied manual mock: provides zero insets + passthrough providers in tests
// (avoids "No safe area value available" when components call useSafeAreaInsets()).
module.exports = require("react-native-safe-area-context/jest/mock").default;
