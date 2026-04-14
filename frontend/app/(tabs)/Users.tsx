import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
  PermissionsAndroid,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import { styled } from "nativewind";

const StyledSafeArea = styled(SafeAreaView);

const SERVICE_UUID = "12345678-1234-1234-1234-123456789abc";
const CHARACTERISTIC_UUID = "abcd1234-5678-1234-5678-123456789abc";
const VITE_URL = process.env.EXPO_PUBLIC_API_URL;

// ── Detect if BLE is available (not supported in Expo Go) ─────────────────────
const isBleAvailable = (): boolean => {
  try {
    require("react-native-ble-plx");
    return true;
  } catch {
    return false;
  }
};

// Lazily create BleManager only if available
let bleManager: any = null;
const getBleManager = () => {
  if (!isBleAvailable()) return null;
  if (!bleManager) {
    try {
      const { BleManager } = require("react-native-ble-plx");
      bleManager = new BleManager();
    } catch {
      return null;
    }
  }
  return bleManager;
};

// ── Mic icon ──────────────────────────────────────────────────────────────────
const MicIcon = () => (
  <View style={{ width: 36, height: 36, alignItems: "center" }}>
    <View style={{ width: 16, height: 22, borderRadius: 8, borderWidth: 2.5, borderColor: "#fff", marginBottom: 2 }} />
    <View style={{ width: 24, height: 2.5, backgroundColor: "#fff", borderRadius: 2 }} />
    <View style={{ width: 2.5, height: 8, backgroundColor: "#fff", borderRadius: 2, marginTop: -1 }} />
  </View>
);

// ── Stop icon ─────────────────────────────────────────────────────────────────
const StopIcon = () => (
  <View style={{ width: 22, height: 22, borderRadius: 5, backgroundColor: "#fff" }} />
);

// ── Pulse ring ────────────────────────────────────────────────────────────────
const PulseRing = ({ anim, color }: { anim: Animated.Value; color: string }) => (
  <Animated.View style={{
    position: "absolute",
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 1.5, borderColor: color,
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
  }} />
);

// ── Animated waveform ─────────────────────────────────────────────────────────
const Waveform = ({ isActive }: { isActive: boolean }) => {
  const bars = Array.from({ length: 22 }, () => useRef(new Animated.Value(0.15)).current);

  useEffect(() => {
    if (!isActive) {
      bars.forEach((b) => Animated.spring(b, { toValue: 0.15, useNativeDriver: true }).start());
      return;
    }
    const anims = bars.map((b, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 55),
          Animated.spring(b, { toValue: 0.15 + Math.random() * 0.85, useNativeDriver: true, tension: 80, friction: 5 }),
          Animated.spring(b, { toValue: 0.15, useNativeDriver: true, tension: 60 }),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [isActive]);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", height: 36, gap: 2.5 }}>
      {bars.map((b, i) => (
        <Animated.View key={i} style={{
          width: 3, height: 30, borderRadius: 2,
          backgroundColor: isActive ? "#38bdf8" : "#1e3a52",
          transform: [{ scaleY: b }],
        }} />
      ))}
    </View>
  );
};

// ── BLE status pill ───────────────────────────────────────────────────────────
const BlePill = ({ connected, scanning }: { connected: boolean; scanning: boolean }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (scanning || connected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.5, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [scanning, connected]);

  const color = connected ? "#34d399" : scanning ? "#facc15" : "#475569";
  const label = connected ? "ESP32 Connected" : scanning ? "Scanning…" : "Disconnected";

  return (
    <View style={{
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: `${color}10`, paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: 100, borderWidth: 1, borderColor: `${color}28`,
    }}>
      <View style={{ width: 12, height: 12, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={{
          position: "absolute", width: 12, height: 12, borderRadius: 6,
          backgroundColor: color, opacity: 0.25, transform: [{ scale: pulseAnim }],
        }} />
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
      </View>
      <Text style={{ color, fontSize: 12, fontWeight: "700", letterSpacing: 0.3 }}>
        {label}
      </Text>
    </View>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────
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
  const [bleWarning, setBleWarning] = useState("");

  // Mode state
  const [mode, setMode] = useState<"manual" | "auto">("manual");
  const [autoRunning, setAutoRunning] = useState(false);

  // Refs
  const autoLoopRef = useRef(false);
  const connectedDeviceRef = useRef<any>(null);
  const isRecordingRef = useRef(false);

  // Keep isRecordingRef in sync
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Animation refs
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const mountFade = useRef(new Animated.Value(0)).current;
  const mountSlide = useRef(new Animated.Value(24)).current;
  const resultFade = useRef(new Animated.Value(0)).current;
  const resultSlide = useRef(new Animated.Value(16)).current;

  // Mount animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(mountFade, { toValue: 1, duration: 550, useNativeDriver: true }),
      Animated.spring(mountSlide, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  // Pulse rings when recording
  useEffect(() => {
    if (!isRecording) {
      pulse1.setValue(0); pulse2.setValue(0); pulse3.setValue(0);
      return;
    }
    const make = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 1400, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
    const a1 = make(pulse1, 0);
    const a2 = make(pulse2, 420);
    const a3 = make(pulse3, 840);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [isRecording]);

  // Result card animation
  const animateResult = () => {
    resultFade.setValue(0); resultSlide.setValue(16);
    Animated.parallel([
      Animated.timing(resultFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(resultSlide, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
    ]).start();
  };

  const animateBtn = (fn: () => void) => {
    Animated.sequence([
      Animated.spring(btnScale, { toValue: 0.92, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }),
    ]).start();
    fn();
  };

  // ── BLE: Request permissions ───────────────────────────────────────────────
  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
    }
  };

  // ── BLE: Scan and connect ─────────────────────────────────────────────────
  const scanAndConnect = (manager: any) => {
    manager.startDeviceScan(null, null, (error: any, device: any) => {
      if (error) {
        console.log("Scan error:", error);
        setIsScanning(false);
        setBleEnabled(false);
        return;
      }

      if (device?.name === "ESP32_Button") {
        manager.stopDeviceScan();
        setIsScanning(false);

        device
          .connect()
          .then((d: any) => {
            connectedDeviceRef.current = d;
            setIsConnected(true);
            return d.discoverAllServicesAndCharacteristics();
          })
          .then((d: any) => {
            d.monitorCharacteristicForService(
              SERVICE_UUID,
              CHARACTERISTIC_UUID,
              (err: any, characteristic: any) => {
                if (err) return;
                if (!characteristic?.value) return;
                const value = atob(characteristic.value);
                console.log("BLE:", value);
                if (value === "START" && !isRecordingRef.current) startRecording();
                if (value === "STOP" && isRecordingRef.current) stopRecording();
              }
            );
          })
          .catch((err: any) => {
            console.log("Connection failed:", err);
            setIsConnected(false);
            setBleEnabled(false);
          });
      }
    });

    // Auto-stop scan after 10s
    setTimeout(() => {
      try { manager.stopDeviceScan(); } catch {}
      setIsScanning(false);
    }, 10000);
  };

  // ── BLE: Connect button handler ───────────────────────────────────────────
  const handleConnectBle = async () => {
    if (!isBleAvailable()) {
      setBleWarning("BLE not supported on this device");
      return;
    }

    const manager = getBleManager();
    if (!manager) {
      setBleWarning("BLE not supported on this device");
      return;
    }

    try {
      setBleWarning("");
      setBleEnabled(true);
      await requestPermissions();
      setIsScanning(true);
      scanAndConnect(manager);
    } catch (e) {
      console.log("BLE connect failed:", e);
      setBleEnabled(false);
      setIsScanning(false);
      setBleWarning("BLE not supported on this device");
    }
  };

  // ── BLE: Disconnect ───────────────────────────────────────────────────────
  const handleDisconnectBle = async () => {
    try {
      const manager = getBleManager();
      if (manager) manager.stopDeviceScan();
      if (connectedDeviceRef.current) {
        await connectedDeviceRef.current.cancelConnection();
        connectedDeviceRef.current = null;
      }
    } catch {}
    setIsConnected(false);
    setBleEnabled(false);
    setIsScanning(false);
    stopAutoMode();
  };

  // ── RECORDING ─────────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(rec);
      setIsRecording(true);
    } catch (err) {
      console.log(err);
    }
  };

  const stopRecording = async (rec?: any) => {
    try {
      const activeRecording = rec || recording;
      if (!activeRecording) return;

      setIsRecording(false);
      setLoading(true);

      await activeRecording.stopAndUnloadAsync();
      const uri = activeRecording.getURI();
      setRecording(null);

      if (!uri) { setLoading(false); return; }

      const formData = new FormData();
      formData.append("audio", { uri, name: "audio.m4a", type: "audio/m4a" } as any);

      const res = await fetch(`${VITE_URL}/translate`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setTranslatedText(data.translatedText || "");
      if (data.translatedText) animateResult();
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  // ── AUTO MODE ─────────────────────────────────────────────────────────────
  const runAutoLoop = useCallback(async () => {
    while (autoLoopRef.current) {
      try {
        // Start recording
        const permission = await Audio.requestPermissionsAsync();
        if (!permission.granted) break;

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording: rec } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(rec);
        setIsRecording(true);

        // Record for 4 seconds
        await new Promise<void>((resolve) => setTimeout(resolve, 4000));

        if (!autoLoopRef.current) {
          // Loop stopped mid-recording
          setIsRecording(false);
          try { await rec.stopAndUnloadAsync(); } catch {}
          setRecording(null);
          break;
        }

        // Stop and send
        setIsRecording(false);
        setLoading(true);
        await rec.stopAndUnloadAsync();
        const uri = rec.getURI();
        setRecording(null);

        if (uri && autoLoopRef.current) {
          const formData = new FormData();
          formData.append("audio", { uri, name: "audio.m4a", type: "audio/m4a" } as any);

          const res = await fetch(`${VITE_URL}/translate`, { method: "POST", body: formData });
          const data = await res.json();
          setTranslatedText(data.translatedText || "");
          if (data.translatedText) animateResult();
        }

        setLoading(false);
      } catch (err) {
        console.log("Auto loop error:", err);
        setIsRecording(false);
        setLoading(false);
        setRecording(null);
      }
    }

    setAutoRunning(false);
    setIsRecording(false);
    setLoading(false);
  }, []);

  const startAutoMode = () => {
    if (autoLoopRef.current) return; // already running
    autoLoopRef.current = true;
    setAutoRunning(true);
    runAutoLoop();
  };

  const stopAutoMode = () => {
    autoLoopRef.current = false;
    setAutoRunning(false);
  };

  // ── UI ─────────────────────────────────────────────────────────────────────
  const bleSupported = isBleAvailable();

  return (
    <StyledSafeArea style={{ flex: 1, backgroundColor: "#070d1a" }}>

      {/* Ambient blobs */}
      <View style={{ position: "absolute", top: -80, left: -60, width: 280, height: 280, borderRadius: 140, backgroundColor: "#0ea5e9", opacity: 0.07 }} />
      <View style={{ position: "absolute", bottom: 80, right: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: "#6366f1", opacity: 0.06 }} />
      <View style={{ position: "absolute", top: "40%", left: "30%", width: 200, height: 200, borderRadius: 100, backgroundColor: "#38bdf8", opacity: 0.04 }} />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: mountFade, transform: [{ translateY: mountSlide }] }}>

          {/* ── Header ─────────────────────────────────────────── */}
          <View style={{ alignItems: "center", marginBottom: 24, marginTop: 10 }}>
            <Text style={{ color: "#f1f5f9", fontSize: 27, fontWeight: "800", letterSpacing: -0.6, textAlign: "center" }}>
              BLE Voice Converter
            </Text>
            <Text style={{ color: "#334155", fontSize: 13, marginTop: 4, letterSpacing: 0.3, marginBottom: 14 }}>
              Speak · Translate via ESP32
            </Text>
            <BlePill connected={isConnected} scanning={isScanning} />
          </View>

          {/* ── BLE Warning ────────────────────────────────────── */}
          {!!bleWarning && (
            <View style={{
              backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 12,
              borderWidth: 1, borderColor: "rgba(239,68,68,0.25)",
              paddingHorizontal: 16, paddingVertical: 10, marginBottom: 16,
              alignItems: "center",
            }}>
              <Text style={{ color: "#f87171", fontSize: 13, fontWeight: "600", textAlign: "center" }}>
                ⚠ {bleWarning}
              </Text>
            </View>
          )}

          {/* ── Connect BLE button ─────────────────────────────── */}
          {!isConnected ? (
            <TouchableOpacity
              onPress={handleConnectBle}
              disabled={!bleSupported || isScanning}
              style={{
                backgroundColor: bleSupported ? "rgba(14,165,233,0.12)" : "rgba(71,85,105,0.15)",
                borderRadius: 14, borderWidth: 1,
                borderColor: bleSupported ? "rgba(14,165,233,0.35)" : "rgba(71,85,105,0.3)",
                paddingVertical: 14, paddingHorizontal: 20,
                flexDirection: "row", alignItems: "center", justifyContent: "center",
                gap: 10, marginBottom: 16, opacity: isScanning ? 0.6 : 1,
              }}
            >
              {isScanning && <ActivityIndicator size="small" color="#38bdf8" />}
              <Text style={{ color: bleSupported ? "#38bdf8" : "#475569", fontSize: 14, fontWeight: "700", letterSpacing: 0.4 }}>
                {isScanning ? "Scanning for ESP32…" : bleSupported ? "📡 Connect BLE" : "BLE Not Supported"}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleDisconnectBle}
              style={{
                backgroundColor: "rgba(52,211,153,0.08)", borderRadius: 14,
                borderWidth: 1, borderColor: "rgba(52,211,153,0.28)",
                paddingVertical: 14, paddingHorizontal: 20,
                flexDirection: "row", alignItems: "center", justifyContent: "center",
                gap: 10, marginBottom: 16,
              }}
            >
              <Text style={{ color: "#34d399", fontSize: 14, fontWeight: "700", letterSpacing: 0.4 }}>
                ✓ ESP32 Connected · Disconnect
              </Text>
            </TouchableOpacity>
          )}

          {/* ── ESP32 device card ──────────────────────────────── */}
          <View style={{
            backgroundColor: "rgba(10,18,36,0.92)", borderRadius: 18,
            borderWidth: 1, borderColor: isConnected ? "rgba(52,211,153,0.25)" : "rgba(30,58,82,0.6)",
            padding: 16, marginBottom: 20, flexDirection: "row", alignItems: "center", gap: 14,
            shadowColor: isConnected ? "#34d399" : "#000",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: isConnected ? 0.18 : 0.1,
            shadowRadius: 14,
          }}>
            <View style={{
              width: 48, height: 48, borderRadius: 14,
              backgroundColor: isConnected ? "rgba(52,211,153,0.1)" : "rgba(71,85,105,0.2)",
              borderWidth: 1, borderColor: isConnected ? "rgba(52,211,153,0.3)" : "rgba(71,85,105,0.3)",
              alignItems: "center", justifyContent: "center",
            }}>
              <Text style={{ fontSize: 22 }}>📡</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ color: "#f1f5f9", fontSize: 14, fontWeight: "700", marginBottom: 2 }}>
                ESP32_Button
              </Text>
              <Text style={{ color: isConnected ? "#34d399" : "#475569", fontSize: 12 }}>
                {isConnected
                  ? "BLE connected · hardware trigger active"
                  : isScanning
                  ? "Scanning for device…"
                  : "Not connected · press Connect BLE above"}
              </Text>
            </View>

            <View style={{
              width: 10, height: 10, borderRadius: 5,
              backgroundColor: isConnected ? "#34d399" : isScanning ? "#facc15" : "#334155",
              shadowColor: isConnected ? "#34d399" : "#facc15",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: isConnected || isScanning ? 0.8 : 0,
              shadowRadius: 6,
            }} />
          </View>

          {/* ── BLE required message ───────────────────────────── */}
          {!isConnected && (
            <View style={{
              backgroundColor: "rgba(71,85,105,0.1)", borderRadius: 12,
              borderWidth: 1, borderColor: "rgba(71,85,105,0.25)",
              paddingHorizontal: 16, paddingVertical: 10, marginBottom: 20,
              alignItems: "center",
            }}>
              <Text style={{ color: "#64748b", fontSize: 13, textAlign: "center" }}>
                Connect ESP32 to use device features
              </Text>
            </View>
          )}

          {/* ── Mode toggle (only when connected) ─────────────── */}
          {isConnected && (
            <View style={{
              flexDirection: "row", backgroundColor: "rgba(10,18,36,0.92)",
              borderRadius: 14, borderWidth: 1, borderColor: "rgba(30,58,82,0.6)",
              padding: 4, marginBottom: 20,
            }}>
              <TouchableOpacity
                onPress={() => { stopAutoMode(); setMode("manual"); }}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: "center",
                  backgroundColor: mode === "manual" ? "rgba(14,165,233,0.18)" : "transparent",
                  borderWidth: mode === "manual" ? 1 : 0,
                  borderColor: "rgba(14,165,233,0.35)",
                }}
              >
                <Text style={{ color: mode === "manual" ? "#38bdf8" : "#475569", fontSize: 13, fontWeight: "700" }}>
                  Manual (ESP32 Button)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setMode("auto")}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: "center",
                  backgroundColor: mode === "auto" ? "rgba(99,102,241,0.18)" : "transparent",
                  borderWidth: mode === "auto" ? 1 : 0,
                  borderColor: "rgba(99,102,241,0.35)",
                }}
              >
                <Text style={{ color: mode === "auto" ? "#818cf8" : "#475569", fontSize: 13, fontWeight: "700" }}>
                  Auto (Continuous)
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Waveform ───────────────────────────────────────── */}
          <View style={{ alignItems: "center", marginBottom: 22 }}>
            <Waveform isActive={isRecording} />
          </View>

          {/* ── Manual mode: record button ─────────────────────── */}
          {(!isConnected || mode === "manual") && (
            <View style={{ alignItems: "center", marginBottom: 30 }}>
              <View style={{ alignItems: "center", justifyContent: "center" }}>
                <PulseRing anim={pulse1} color={isRecording ? "#ef4444" : "#38bdf8"} />
                <PulseRing anim={pulse2} color={isRecording ? "#ef4444" : "#38bdf8"} />
                <PulseRing anim={pulse3} color={isRecording ? "#ef4444" : "#38bdf8"} />

                <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                  <TouchableOpacity
                    onPress={() => {
                      if (!isConnected) return;
                      animateBtn(isRecording ? () => stopRecording() : startRecording);
                    }}
                    activeOpacity={isConnected ? 0.85 : 1}
                    style={{
                      width: 90, height: 90, borderRadius: 45,
                      alignItems: "center", justifyContent: "center",
                      backgroundColor: !isConnected
                        ? "#1e293b"
                        : isRecording ? "#dc2626" : "#0284c7",
                      shadowColor: isRecording ? "#ef4444" : "#38bdf8",
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: isConnected ? 0.65 : 0,
                      shadowRadius: 26,
                      borderWidth: 1.5,
                      borderColor: !isConnected
                        ? "rgba(71,85,105,0.3)"
                        : isRecording ? "rgba(239,68,68,0.35)" : "rgba(56,189,248,0.35)",
                      opacity: isConnected ? 1 : 0.4,
                    }}
                  >
                    <View style={{ position: "absolute", width: 78, height: 78, borderRadius: 39, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }} />
                    {isRecording ? <StopIcon /> : <MicIcon />}
                  </TouchableOpacity>
                </Animated.View>
              </View>

              <Text style={{
                color: !isConnected ? "#334155" : isRecording ? "#f87171" : "#38bdf8",
                fontSize: 11, fontWeight: "700", letterSpacing: 2.5,
                textTransform: "uppercase", marginTop: 18,
              }}>
                {!isConnected
                  ? "Connect ESP32 First"
                  : isRecording
                  ? "● Recording…"
                  : "Press ESP32 Button"}
              </Text>
            </View>
          )}

          {/* ── Auto mode controls ─────────────────────────────── */}
          {isConnected && mode === "auto" && (
            <View style={{ alignItems: "center", marginBottom: 30, gap: 16 }}>
              {/* Pulse rings for auto */}
              <View style={{ alignItems: "center", justifyContent: "center" }}>
                <PulseRing anim={pulse1} color={isRecording ? "#ef4444" : "#818cf8"} />
                <PulseRing anim={pulse2} color={isRecording ? "#ef4444" : "#818cf8"} />
                <PulseRing anim={pulse3} color={isRecording ? "#ef4444" : "#818cf8"} />

                <TouchableOpacity
                  onPress={autoRunning ? stopAutoMode : startAutoMode}
                  style={{
                    width: 90, height: 90, borderRadius: 45,
                    alignItems: "center", justifyContent: "center",
                    backgroundColor: autoRunning ? "#dc2626" : "#4f46e5",
                    shadowColor: autoRunning ? "#ef4444" : "#818cf8",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.65, shadowRadius: 26,
                    borderWidth: 1.5,
                    borderColor: autoRunning ? "rgba(239,68,68,0.35)" : "rgba(129,140,248,0.35)",
                  }}
                >
                  <View style={{ position: "absolute", width: 78, height: 78, borderRadius: 39, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }} />
                  {autoRunning ? <StopIcon /> : <MicIcon />}
                </TouchableOpacity>
              </View>

              <Text style={{
                color: autoRunning ? "#f87171" : "#818cf8",
                fontSize: 11, fontWeight: "700", letterSpacing: 2.5,
                textTransform: "uppercase",
              }}>
                {autoRunning
                  ? isRecording ? "● Recording…" : "● Processing…"
                  : "Start Auto Mode"}
              </Text>

              {autoRunning && (
                <View style={{
                  backgroundColor: "rgba(99,102,241,0.08)", borderRadius: 12,
                  borderWidth: 1, borderColor: "rgba(99,102,241,0.2)",
                  paddingHorizontal: 16, paddingVertical: 8,
                }}>
                  <Text style={{ color: "#818cf8", fontSize: 12, textAlign: "center" }}>
                    Auto translating every 4 seconds · Tap stop to end
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── Loading ────────────────────────────────────────── */}
          {loading && (
            <View style={{ alignItems: "center", marginBottom: 22 }}>
              <View style={{
                flexDirection: "row", alignItems: "center", gap: 9,
                backgroundColor: "rgba(56,189,248,0.07)", paddingHorizontal: 18,
                paddingVertical: 11, borderRadius: 100,
                borderWidth: 1, borderColor: "rgba(56,189,248,0.18)",
              }}>
                <ActivityIndicator size="small" color="#38bdf8" />
                <Text style={{ color: "#38bdf8", fontSize: 13, fontWeight: "600", letterSpacing: 0.4 }}>
                  Processing translation…
                </Text>
              </View>
            </View>
          )}

          {/* ── Result card ────────────────────────────────────── */}
          {!!translatedText && (
            <Animated.View style={{
              opacity: resultFade,
              transform: [{ translateY: resultSlide }],
              backgroundColor: "rgba(10,18,36,0.92)",
              borderRadius: 22, borderWidth: 1,
              borderColor: "rgba(56,189,248,0.14)",
              overflow: "hidden",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.35, shadowRadius: 22,
            }}>
              <View style={{ height: 2.5, backgroundColor: "#0ea5e9", opacity: 0.55 }} />
              <View style={{ padding: 20 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 }}>
                  <View style={{ width: 3.5, height: 13, borderRadius: 2, backgroundColor: "#38bdf8" }} />
                  <Text style={{ color: "#38bdf8", fontSize: 10, fontWeight: "700", letterSpacing: 2.5, textTransform: "uppercase" }}>
                    Translated
                  </Text>
                </View>
                <Text style={{ color: "#f1f5f9", fontSize: 16, lineHeight: 25, fontWeight: "500" }}>
                  {translatedText}
                </Text>
              </View>
            </Animated.View>
          )}

        </Animated.View>
      </ScrollView>
    </StyledSafeArea>
  );
}