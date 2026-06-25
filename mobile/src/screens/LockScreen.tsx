import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { useTheme } from "../theme/useTheme";
import { useT } from "../i18n/useT";
import { Icon } from "../components/Icon";
import { PinPad } from "../components/PinPad";
import type { AuthResult } from "../wallet/biometricGate";
import type { PinUnlockResult } from "../wallet/sessionController";

/**
 * Unlock gate. The mandatory 6-digit PIN is always available (knowledge factor); biometrics are an
 * optional convenience that, when enabled, auto-prompts on mount and can be re-triggered. Any
 * biometric miss falls back silently to the PIN pad. A recovery escape (seed-restore) guarantees no
 * permanent lockout.
 */
export function LockScreen({
  onUnlockBiometric,
  onUnlockPin,
  biometricEnabled,
  onRecover,
}: {
  onUnlockBiometric: () => Promise<AuthResult>;
  onUnlockPin: (pin: string) => Promise<PinUnlockResult>;
  biometricEnabled: boolean;
  onRecover?: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lockedOut, setLockedOut] = useState(false);
  const autoTriggered = useRef(false);

  async function tryBiometric() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await onUnlockBiometric();
      if (r === "success") return; // App re-renders away from the lock screen
      // A compromised device is the only hard stop; failed/cancelled/unavailable quietly fall back
      // to PIN entry rather than alarming the user.
      if (r === "compromised") setMsg(t("lock.compromised"));
    } catch {
      /* fall back to PIN */
    } finally {
      setBusy(false);
    }
  }

  async function submitPin(pin: string) {
    setBusy(true);
    setMsg(null);
    try {
      const r = await onUnlockPin(pin);
      if (r.status === "unlocked") return; // App re-renders away
      setValue("");
      if (r.status === "wrong") setMsg(t("pin.wrong", { remaining: r.remaining }));
      else if (r.status === "lockedOut") {
        setMsg(t("pin.lockedOut"));
        setLockedOut(true);
      } else if (r.status === "compromised") setMsg(t("lock.compromised"));
      else setMsg(t("lock.failed"));
    } catch {
      setValue("");
      setMsg(t("lock.failed"));
    } finally {
      setBusy(false);
    }
  }

  // Submit automatically once the 6th digit lands.
  useEffect(() => {
    if (value.length === 6 && !busy) void submitPin(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // When biometrics are enabled, surface the prompt the instant the lock screen appears (one fewer
  // tap). Fire once; a miss leaves the PIN pad ready.
  useEffect(() => {
    if (autoTriggered.current) return;
    autoTriggered.current = true;
    if (biometricEnabled) void tryBiometric();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function confirmRecover() {
    Alert.alert(t("lock.recoverTitle"), t("lock.recoverBody"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("lock.recoverConfirm"), style: "destructive", onPress: onRecover },
    ]);
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Icon name="lock" color={theme.brand} size={44} />
      <Text style={[styles.title, { color: theme.text }]}>{t("lock.title")}</Text>
      <Text style={[styles.sub, { color: theme.muted }]}>{t("pin.unlockTitle")}</Text>
      {msg ? <Text style={[styles.msg, { color: theme.down }]}>{msg}</Text> : null}
      <View style={styles.padWrap}>
        <PinPad value={value} onChange={setValue} disabled={busy || lockedOut} />
      </View>
      {biometricEnabled && !lockedOut ? (
        <Pressable accessibilityRole="button" testID="lock-biometric" onPress={() => void tryBiometric()} style={styles.altBtn}>
          <Text style={[styles.altText, { color: theme.brand }]}>{t("pin.useBiometric")}</Text>
        </Pressable>
      ) : null}
      {onRecover ? (
        <Pressable accessibilityRole="button" testID="lock-recover" onPress={confirmRecover} style={styles.recoverBtn}>
          <Text style={[styles.recoverText, { color: theme.muted }]}>{t("lock.cantUnlock")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: "700" },
  sub: { fontSize: 13 },
  msg: { fontSize: 13, textAlign: "center" },
  padWrap: { marginTop: 18 },
  altBtn: { marginTop: 16, paddingVertical: 8 },
  altText: { fontSize: 14, fontWeight: "600" },
  recoverBtn: { marginTop: 10, paddingVertical: 8 },
  recoverText: { fontSize: 13, textDecorationLine: "underline" },
});
