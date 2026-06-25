import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../theme/useTheme";
import { useT } from "../i18n/useT";
import { Icon } from "../components/Icon";
import { PinPad } from "../components/PinPad";
import { useLockPrefsStore } from "../state/lockPrefsStore";
import { completePinSetup } from "../wallet/sessionController";
import type { PinStore } from "../wallet/pinStore";
import type { WalletManager } from "../wallet/walletManager";
import type { BiometricGate } from "../wallet/biometricGate";

type Phase = "enter" | "confirm" | "biometric";

/**
 * First-run PIN setup (the mandatory knowledge factor). Enter a 6-digit PIN twice; on a match we
 * persist its verifier and, when biometric hardware is enrolled, offer Face ID as an optional
 * convenience before unlocking into the app.
 */
export function PinSetupScreen({
  pinStore,
  manager,
  gate,
}: {
  pinStore: PinStore;
  manager: WalletManager;
  gate: BiometricGate;
}) {
  const theme = useTheme();
  const t = useT();
  const setBiometricEnabled = useLockPrefsStore((s) => s.setBiometricEnabled);

  const [phase, setPhase] = useState<Phase>("enter");
  const [first, setFirst] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);

  useEffect(() => {
    void gate.isAvailable().then((a) => setBioAvailable(a.hasHardware && a.isEnrolled));
  }, [gate]);

  async function finalize(enableBiometric: boolean) {
    setBusy(true);
    try {
      if (enableBiometric) await setBiometricEnabled(true);
      await completePinSetup(pinStore, manager, first);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (value.length !== 6) return;
    if (phase === "enter") {
      setFirst(value);
      setValue("");
      setError(null);
      setPhase("confirm");
    } else if (phase === "confirm") {
      if (value === first) {
        setError(null);
        if (bioAvailable) setPhase("biometric");
        else void finalize(false);
      } else {
        setError(t("pin.mismatch"));
        setFirst("");
        setValue("");
        setPhase("enter");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (phase === "biometric") {
    return (
      <View style={[styles.root, { backgroundColor: theme.bg }]}>
        <Icon name="shield" color={theme.brand} size={48} />
        <Text style={[styles.title, { color: theme.text }]}>{t("pin.enableBiometricTitle")}</Text>
        <Text style={[styles.sub, { color: theme.muted }]}>{t("pin.enableBiometricBody")}</Text>
        <Pressable
          accessibilityRole="button"
          testID="pin-enable-biometric"
          disabled={busy}
          onPress={() => void finalize(true)}
          style={[styles.btn, { backgroundColor: theme.brand }]}
        >
          <Text style={[styles.btnText, { color: theme.bg }]}>{t("pin.enableBiometric")}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" testID="pin-skip-biometric" disabled={busy} onPress={() => void finalize(false)} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: theme.muted }]}>{t("pin.skip")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Icon name="lock" color={theme.brand} size={44} />
      <Text style={[styles.title, { color: theme.text }]}>
        {phase === "enter" ? t("pin.setTitle") : t("pin.confirmTitle")}
      </Text>
      <Text style={[styles.sub, { color: theme.muted }]}>{t("pin.setSubtitle")}</Text>
      {error ? <Text style={[styles.msg, { color: theme.down }]}>{error}</Text> : null}
      <View style={styles.padWrap}>
        <PinPad value={value} onChange={setValue} disabled={busy} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  sub: { fontSize: 13, textAlign: "center", paddingHorizontal: 16 },
  msg: { fontSize: 13, textAlign: "center" },
  padWrap: { marginTop: 20 },
  btn: { marginTop: 16, paddingVertical: 13, paddingHorizontal: 40, borderRadius: 10 },
  btnText: { fontSize: 15, fontWeight: "700" },
  skipBtn: { marginTop: 14, paddingVertical: 8 },
  skipText: { fontSize: 14, textDecorationLine: "underline" },
});
