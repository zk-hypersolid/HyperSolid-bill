import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AccountStackParamList } from "./types";
import { AccountScreen } from "../screens/AccountScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { useTheme } from "../theme/useTheme";
import { useT } from "../i18n/useT";

const Stack = createNativeStackNavigator<AccountStackParamList>();

function AccountHome({ navigation }: NativeStackScreenProps<AccountStackParamList, "AccountHome">) {
  return <AccountScreen navigation={{ navigate: (name: string) => navigation.navigate(name as never) }} />;
}

export function AccountStack() {
  const theme = useTheme();
  const t = useT();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.text,
        contentStyle: { backgroundColor: theme.bg },
      }}
    >
      <Stack.Screen name="AccountHome" component={AccountHome} options={{ headerShown: false }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t("settings.title") }} />
    </Stack.Navigator>
  );
}
