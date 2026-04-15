import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import { styled } from "nativewind";

const StyledSafeArea = styled(SafeAreaView);
const { width } = Dimensions.get("window");

const SERVICE_UUID = "12345678-1234-1234-1234-123456789abc";
const CHARACTERISTIC_UUID = "abcd1234-5678-1234-5678-123456789abc";
const VITE_URL = process.env.EXPO_PUBLIC_API_URL;

// ─── Safe BLE import ────────────────────────────────────────────────────────
let BleManager: any = null;
let isBleSupported = false;

try {
  const ble = require("react-native-ble-plx");
  BleManager = ble.BleManager;
  isBleSupported = true;
} catch {
  isBleSupported = false;
}

let bleManagerInstance: any = null;
let bleSubscription: any = null;

const getBleManager = () => {
  if (!isBleSupported) return null;
  if (!bleManagerInstance) {
    try {
      bleManagerInstance = new BleManager();
    } catch {
      isBleSupported = false;
      return null;
    }
  }
  return bleManagerInstance;
};

// ─── Pulse Ring ─────────────────────────────────────────────────────────────
function PulseRing({ active, color }: { active: boolean; color: string }) {
  const ring1 = useRef(new Animated.Value(1)).current;
  const ring2 = useRef(new Animated.Value(1)).current;
  const opacity1 = useRef(new Animated.Value(0.6)).current;
  const opacity2 = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!active) {
      ring1.setValue(1);
      ring2.setValue(1);
      opacity1.setValue(0.6);
      opacity2.setValue(0.4);
      return;
    }
    const a1 = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ring1, {
            toValue: 1.55,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(ring1, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity1, {
            toValue: 0,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(opacity1, {
            toValue: 0.6,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    const a2 = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ring2, {
            toValue: 1.9,
            duration: 1300,
            useNativeDriver: true,
          }),
          Animated.timing(ring2, {
            toValue: 1,
            duration: 1300,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity2, {
            toValue: 0,
            duration: 1300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity2, {
            toValue: 0.4,
            duration: 1300,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    a1.start();
    setTimeout(() => a2.start(), 300);
    return () => {
      a1.stop();
      a2.stop();
    };
  }, [active]);

  if (!active) return null;
  return (
    <>
      <Animated.View
        style={[
          styles.pulseRing,
          {
            borderColor: color,
            opacity: opacity1,
            transform: [{ scale: ring1 }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.pulseRing,
          {
            borderColor: color,
            opacity: opacity2,
            transform: [{ scale: ring2 }],
          },
        ]}
      />
    </>
  );
}

// ─── Status Dot ─────────────────────────────────────────────────────────────
function StatusDot({ status }: { status: "connected" | "scanning" | "idle" }) {
  const blink = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (status === "scanning") {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(blink, {
            toValue: 0.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(blink, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      );
      anim.start();
      return () => anim.stop();
    } else {
      blink.setValue(1);
    }
  }, [status]);
  const color =
    status === "connected"
      ? "#22c55e"
      : status === "scanning"
        ? "#f59e0b"
        : "#6b7280";
  return (
    <Animated.View
      style={[styles.statusDot, { backgroundColor: color, opacity: blink }]}
    />
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
type Mode = "manual" | "auto";

export default function BleVoicePage() {
  // Recording state
  const [recording, setRecording] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [translatedText, setTranslatedText] = useState("");

  // BLE state
  const [bleEnabled, setBleEnabled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [bleError, setBleError] = useState<string | null>(null);

  // Mode state
  const [mode, setMode] = useState<Mode>("manual");
  const [autoRunning, setAutoRunning] = useState(false);

  // Refs
  const connectedDeviceRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const autoLoopRef = useRef(false);
  const recordingRef = useRef<any>(null);

  // Animation refs
  const micScale = useRef(new Animated.Value(1)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const resultTranslateY = useRef(new Animated.Value(16)).current;
  const bleCardScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);
  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  // Result animation
  useEffect(() => {
    if (translatedText) {
      resultOpacity.setValue(0);
      resultTranslateY.setValue(20);
      Animated.parallel([
        Animated.timing(resultOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(resultTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 7,
        }),
      ]).start();
    }
  }, [translatedText]);

  const animateMicPress = () => {
    Animated.sequence([
      Animated.timing(micScale, {
        toValue: 0.92,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(micScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 4,
      }),
    ]).start();
  };

  const animateBleCard = () => {
    Animated.sequence([
      Animated.timing(bleCardScale, {
        toValue: 0.97,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(bleCardScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
      }),
    ]).start();
  };

  // ─── Permissions ────────────────────────────────────────────────────────
  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
    }
  };

  // ─── BLE Listener ───────────────────────────────────────────────────────
  const startBleListener = (device: any) => {
    try {
      if (bleSubscription) bleSubscription.remove();
      bleSubscription = device.monitorCharacteristicForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        (err: any, characteristic: any) => {
          if (err) return;
          if (!characteristic?.value) return;
          const value = atob(characteristic.value);
          console.log("BLE:", value);
          if (loading) return;
          if (value === "START" && !isRecordingRef.current) startRecording();
          if (value === "STOP" && isRecordingRef.current)
            setTimeout(() => stopRecording(), 300);
        },
      );
    } catch (e) {
      console.log("BLE listener error:", e);
    }
  };

  // ─── Scan + Connect ─────────────────────────────────────────────────────
  const scanAndConnect = (manager: any) => {
    try {
      manager.startDeviceScan(null, null, (error: any, device: any) => {
        if (error) {
          setIsScanning(false);
          setBleEnabled(false);
          setBleError("Scan failed: " + (error?.message || "Unknown error"));
          return;
        }
        if (device?.name === "ESP32_Button") {
          manager.stopDeviceScan();
          device
            .connect()
            .then((d: any) => {
              connectedDeviceRef.current = d;
              setIsConnected(true);
              setIsScanning(false);
              setBleError(null);
              return d.discoverAllServicesAndCharacteristics();
            })
            .then((d: any) => {
              setTimeout(() => startBleListener(d), 800);
            })
            .catch((e: any) => {
              setIsConnected(false);
              setIsScanning(false);
              setBleEnabled(false);
              setBleError("Connection failed. Try again.");
            });
        }
      });

      setTimeout(() => {
        try {
          manager.stopDeviceScan();
        } catch {}
        setIsScanning(false);
        if (!isConnected) {
          setBleEnabled(false);
          setBleError("Device not found. Make sure ESP32 is on.");
        }
      }, 8000);
    } catch (e: any) {
      setIsScanning(false);
      setBleEnabled(false);
      setBleError("BLE scan error: " + (e?.message || "Unknown"));
    }
  };

  // ─── Connect BLE ────────────────────────────────────────────────────────
  const handleConnectBle = async () => {
    if (!isBleSupported) {
      setBleError("BLE not supported on this device.");
      return;
    }
    if (isScanning || isConnected) return;

    try {
      setBleError(null);
      const manager = getBleManager();
      if (!manager) {
        setBleError("BLE not supported on this device.");
        return;
      }
      await requestPermissions();
      const state = await manager.state();
      if (state !== "PoweredOn") {
        setBleError("Bluetooth is off. Please turn it on.");
        return;
      }
      setBleEnabled(true);
      setIsScanning(true);
      scanAndConnect(manager);
    } catch (e: any) {
      setBleEnabled(false);
      setIsScanning(false);
      setBleError("BLE not supported on this device.");
    }
  };

  // ─── Disconnect BLE ─────────────────────────────────────────────────────
  const handleDisconnectBle = async () => {
    try {
      stopAutoMode();
      if (bleSubscription) bleSubscription.remove();
      if (connectedDeviceRef.current) {
        await connectedDeviceRef.current.cancelConnection();
      }
    } catch {}
    setIsConnected(false);
    setBleEnabled(false);
    connectedDeviceRef.current = null;
  };

  // ─── Recording ──────────────────────────────────────────────────────────
  const startRecording = async () => {
    if (isRecordingRef.current || loading) return;
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) return;
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (e) {
      console.log("startRecording error:", e);
    }
  };

  const stopRecording = async (): Promise<string | null> => {
    try {
      if (loading) return null;
      const rec = recordingRef.current;
      if (!rec) return null;

      setIsRecording(false);
      setLoading(true);

      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      setRecording(null);

      const formData = new FormData();
      formData.append("audio", {
        uri,
        name: "audio.m4a",
        type: "audio/x-m4a",
      } as any);

      const res = await fetch(`${VITE_URL}/translate`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      const translated = data.translatedText || "";
      setTranslatedText(translated);
      return translated;
    } catch (e) {
      console.log("stopRecording error:", e);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // ─── Auto Mode ──────────────────────────────────────────────────────────
  const startAutoMode = async () => {
    if (!isConnected || autoLoopRef.current) return;
    autoLoopRef.current = true;
    setAutoRunning(true);

    const loop = async () => {
      while (autoLoopRef.current) {
        await startRecording();
        await new Promise((r) => setTimeout(r, 4000));
        if (!autoLoopRef.current) break;
        await stopRecording();
        await new Promise((r) => setTimeout(r, 500));
      }
    };

    loop();
  };

  const stopAutoMode = () => {
    autoLoopRef.current = false;
    setAutoRunning(false);
    if (isRecordingRef.current) stopRecording();
  };

  // ─── Derived ────────────────────────────────────────────────────────────
  const bleStatus: "connected" | "scanning" | "idle" = isConnected
    ? "connected"
    : isScanning
      ? "scanning"
      : "idle";
  const bleLabel = isConnected
    ? "Connected"
    : isScanning
      ? "Scanning…"
      : "Disconnected";
  const bleLabelColor = isConnected
    ? "#22c55e"
    : isScanning
      ? "#f59e0b"
      : "#6b7280";
  const bleBlocked = !isBleSupported;
  const featuresLocked = !isConnected;

  return (
    <StyledSafeArea style={styles.safeArea}>
      <View style={styles.bgGlow1} />
      <View style={styles.bgGlow2} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerEyebrow}>ESP32 DEVICE TAB</Text>
          <Text style={styles.headerTitle}>Lan Vector</Text>
        </View>

        {/* BLE Card */}
        <Animated.View
          style={[styles.bleCard, { transform: [{ scale: bleCardScale }] }]}
        >
          <View style={styles.bleStatusRow}>
            <StatusDot status={bleStatus} />
            <Text style={[styles.bleStatusLabel, { color: bleLabelColor }]}>
              {bleLabel}
            </Text>
          </View>

          <Text style={styles.bleDeviceName}>ESP32_Button</Text>

          {bleError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠ {bleError}</Text>
            </View>
          )}

          {bleBlocked && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>
                BLE not supported on this device
              </Text>
            </View>
          )}

          <View style={styles.bleButtonRow}>
            <TouchableOpacity
              style={[
                styles.bleActionBtn,
                styles.bleConnectBtn,
                (isScanning || isConnected || bleBlocked) &&
                  styles.bleActionBtnDisabled,
              ]}
              onPress={() => {
                animateBleCard();
                handleConnectBle();
              }}
              disabled={isScanning || isConnected || bleBlocked}
              activeOpacity={0.75}
            >
              <Text style={styles.bleConnectText}>
                {isScanning ? "Scanning…" : "Connect"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.bleActionBtn,
                styles.bleDisconnectBtn,
                !isConnected && styles.bleActionBtnDisabled,
              ]}
              onPress={() => {
                animateBleCard();
                handleDisconnectBle();
              }}
              disabled={!isConnected}
              activeOpacity={0.75}
            >
              <Text style={styles.bleDisconnectText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Features locked notice */}
        {featuresLocked && (
          <View style={styles.lockedNotice}>
            <Text style={styles.lockedNoticeText}>
              Connect ESP32 to use device features
            </Text>
          </View>
        )}

        {/* Mode Toggle */}
        <View
          style={[
            styles.modeToggleWrapper,
            featuresLocked && styles.sectionLocked,
          ]}
        >
          <Text style={styles.sectionLabel}>MODE</Text>
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[
                styles.modeBtn,
                mode === "manual" && styles.modeBtnActive,
              ]}
              onPress={() => {
                if (!featuresLocked) setMode("manual");
              }}
              disabled={featuresLocked}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.modeBtnText,
                  mode === "manual" && styles.modeBtnTextActive,
                ]}
              >
                Manual
              </Text>
              <Text
                style={[
                  styles.modeBtnSub,
                  mode === "manual" && { color: "#c7d2fe" },
                ]}
              >
                ESP32 Button
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeBtn, mode === "auto" && styles.modeBtnActive]}
              onPress={() => {
                if (!featuresLocked) {
                  setMode("auto");
                  stopAutoMode();
                }
              }}
              disabled={featuresLocked}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.modeBtnText,
                  mode === "auto" && styles.modeBtnTextActive,
                ]}
              >
                Auto
              </Text>
              <Text
                style={[
                  styles.modeBtnSub,
                  mode === "auto" && { color: "#c7d2fe" },
                ]}
              >
                Continuous
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mic / Control Section */}
        <View
          style={[styles.micSection, featuresLocked && styles.sectionLocked]}
        >
          {mode === "manual" ? (
            <>
              <Text style={styles.micStateLabel}>
                {isRecording ? "● RECORDING" : "WAITING FOR ESP32"}
              </Text>
              <View style={styles.micContainer}>
                <PulseRing active={isRecording} color="#ef4444" />
                <Animated.View style={{ transform: [{ scale: micScale }] }}>
                  <TouchableOpacity
                    style={[
                      styles.micButton,
                      isRecording && styles.micButtonActive,
                    ]}
                    onPress={() => {
                      if (featuresLocked) return;
                      animateMicPress();
                      isRecording ? stopRecording() : startRecording();
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={styles.micIconWrapper}>
                      <View
                        style={[
                          styles.micIconBody,
                          isRecording && { backgroundColor: "#fff" },
                        ]}
                      />
                      <View
                        style={[
                          styles.micIconStand,
                          isRecording && { borderColor: "#fff" },
                        ]}
                      />
                      <View
                        style={[
                          styles.micIconBase,
                          isRecording && { backgroundColor: "#fff" },
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              </View>
              <Text style={styles.micHint}>
                {isRecording
                  ? "Recording via ESP32 button…"
                  : "Press ESP32 button to record"}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.micStateLabel}>
                {autoRunning
                  ? isRecording
                    ? "● RECORDING"
                    : "⟳ PROCESSING"
                  : "AUTO MODE"}
              </Text>
              <View style={styles.micContainer}>
                <PulseRing
                  active={autoRunning}
                  color={isRecording ? "#ef4444" : "#818cf8"}
                />
                <Animated.View style={{ transform: [{ scale: micScale }] }}>
                  <TouchableOpacity
                    style={[
                      styles.micButton,
                      autoRunning &&
                        (isRecording
                          ? styles.micButtonActive
                          : styles.micButtonProcessing),
                    ]}
                    onPress={() => {
                      if (featuresLocked) return;
                      animateMicPress();
                      autoRunning ? stopAutoMode() : startAutoMode();
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={styles.micIconWrapper}>
                      {autoRunning ? (
                        <View style={styles.autoStopIcon} />
                      ) : (
                        <>
                          <View style={styles.micIconBody} />
                          <View style={styles.micIconStand} />
                          <View style={styles.micIconBase} />
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              </View>
              <Text style={styles.micHint}>
                {autoRunning
                  ? "Tap to stop auto translation"
                  : "Tap to start continuous recording (4s loops)"}
              </Text>
            </>
          )}
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color="#818cf8" />
            <Text style={styles.loadingText}>Processing…</Text>
          </View>
        )}

        {/* Result */}
        {!!translatedText && !loading && (
          <Animated.View
            style={[
              styles.resultCard,
              {
                opacity: resultOpacity,
                transform: [{ translateY: resultTranslateY }],
              },
            ]}
          >
            <View style={styles.resultHeader}>
              <View style={styles.resultDot} />
              <Text style={styles.resultHeaderText}>Translation</Text>
            </View>
            <Text style={styles.resultText}>{translatedText}</Text>
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </StyledSafeArea>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const CARD_RADIUS = 20;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#080b12" },
  bgGlow1: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "#1e1b4b",
    top: -100,
    right: -80,
    opacity: 0.55,
  },
  bgGlow2: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#0f172a",
    bottom: 60,
    left: -60,
    opacity: 0.7,
  },
  scrollContent: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 20 },

  // Header
  header: { marginBottom: 28, marginTop: 8 },
  headerEyebrow: {
    fontSize: 11,
    letterSpacing: 3.5,
    color: "#4f46e5",
    fontWeight: "700",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: "800",
    color: "#f8fafc",
    letterSpacing: -0.5,
  },

  // BLE card
  bleCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: CARD_RADIUS,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 16,
  },
  bleStatusRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  bleStatusLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  bleDeviceName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  bleButtonRow: { flexDirection: "row", gap: 10 },
  bleActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  bleActionBtnDisabled: { opacity: 0.4 },
  bleConnectBtn: { backgroundColor: "#4f46e5" },
  bleConnectText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.3,
  },
  bleDisconnectBtn: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  bleDisconnectText: { color: "#f87171", fontWeight: "700", fontSize: 14 },

  // Banners
  errorBanner: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  errorText: { color: "#f87171", fontSize: 13 },
  warningBanner: {
    backgroundColor: "rgba(245,158,11,0.1)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.2)",
  },
  warningText: { color: "#fbbf24", fontSize: 13 },

  // Locked notice
  lockedNotice: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
  },
  lockedNoticeText: { color: "#475569", fontSize: 13, letterSpacing: 0.2 },

  // Section locked fade
  sectionLocked: { opacity: 0.38 },

  // Mode toggle
  modeToggleWrapper: { marginBottom: 28 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 3,
    color: "#64748b",
    fontWeight: "700",
    marginBottom: 10,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: "center",
  },
  modeBtnActive: { backgroundColor: "#4f46e5" },
  modeBtnText: { color: "#64748b", fontWeight: "700", fontSize: 14 },
  modeBtnTextActive: { color: "#fff" },
  modeBtnSub: {
    color: "#475569",
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.3,
  },

  // Mic
  micSection: { alignItems: "center", marginBottom: 32 },
  micStateLabel: {
    fontSize: 11,
    letterSpacing: 3,
    color: "#64748b",
    fontWeight: "700",
    marginBottom: 28,
  },
  micContainer: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  pulseRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
  },
  micButton: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "rgba(79,70,229,0.15)",
    borderWidth: 2,
    borderColor: "rgba(79,70,229,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  micButtonActive: {
    backgroundColor: "rgba(239,68,68,0.18)",
    borderColor: "rgba(239,68,68,0.6)",
  },
  micButtonProcessing: {
    backgroundColor: "rgba(129,140,248,0.18)",
    borderColor: "rgba(129,140,248,0.5)",
  },
  micIconWrapper: { alignItems: "center", justifyContent: "center" },
  micIconBody: {
    width: 22,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#818cf8",
    marginBottom: 4,
  },
  micIconStand: {
    width: 36,
    height: 18,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 2.5,
    borderBottomWidth: 0,
    borderColor: "#818cf8",
    marginBottom: 3,
  },
  micIconBase: {
    width: 2.5,
    height: 7,
    backgroundColor: "#818cf8",
    borderRadius: 2,
  },
  autoStopIcon: {
    width: 28,
    height: 28,
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  micHint: {
    fontSize: 13,
    color: "#475569",
    letterSpacing: 0.2,
    textAlign: "center",
    paddingHorizontal: 20,
  },

  // Loading
  loadingCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(129,140,248,0.08)",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: "rgba(129,140,248,0.15)",
    gap: 12,
    marginBottom: 24,
  },
  loadingText: {
    color: "#818cf8",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  // Result
  resultCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: CARD_RADIUS,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  resultDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
    marginRight: 8,
  },
  resultHeaderText: {
    fontSize: 11,
    letterSpacing: 2.5,
    color: "#22c55e",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  resultText: {
    fontSize: 17,
    color: "#f1f5f9",
    lineHeight: 26,
    fontWeight: "400",
    letterSpacing: 0.1,
  },
});
