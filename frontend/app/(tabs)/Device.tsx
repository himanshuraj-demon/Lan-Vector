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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import { styled } from "nativewind";
import { BleManager } from "react-native-ble-plx";

const StyledSafeArea = styled(SafeAreaView);

let bleManager: BleManager | null = null;
let isBleSupported = true;

try {
  bleManager = new BleManager();
} catch (e) {
  isBleSupported = false;
}

const SERVICE_UUID = "12345678-1234-1234-1234-123456789abc";
const CHARACTERISTIC_UUID = "abcd1234-5678-1234-5678-123456789abc";

const VITE_URL = process.env.EXPO_PUBLIC_API_URL;

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
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [translatedText, setTranslatedText] = useState("");
  
  const [bleEnabled, setBleEnabled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [bleErrorMessage, setBleErrorMessage] = useState("");
  
  const [mode, setMode] = useState<"manual" | "auto">("manual");
  const [isAutoActive, setIsAutoActive] = useState(false);

  const deviceIdRef = useRef<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const isRecordingRef = useRef(false);
  const modeRef = useRef(mode);
  const isAutoActiveRef = useRef(isAutoActive);
  const autoLoopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { isAutoActiveRef.current = isAutoActive; }, [isAutoActive]);

  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const mountFade = useRef(new Animated.Value(0)).current;
  const mountSlide = useRef(new Animated.Value(24)).current;
  const resultFade = useRef(new Animated.Value(0)).current;
  const resultSlide = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(mountFade, { toValue: 1, duration: 550, useNativeDriver: true }),
      Animated.spring(mountSlide, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

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

  // ── BLE SETUP ──────────────────────────────────────────────
  const toggleConnectBle = async () => {
    if (!isBleSupported || !bleManager) {
      setBleErrorMessage("BLE not supported on this device. Use a physical build.");
      return;
    }

    if (bleEnabled) {
      setBleEnabled(false);
      setIsConnected(false);
      setIsScanning(false);
      setBleErrorMessage("");
      if (isAutoActive) stopAutoMode();
      
      try {
        bleManager.stopDeviceScan();
        if (deviceIdRef.current) {
          await bleManager.cancelDeviceConnection(deviceIdRef.current);
          deviceIdRef.current = null;
        }
      } catch (e) {
        console.log(e);
      }
      return;
    }

    setBleEnabled(true);
    setBleErrorMessage("");
    
    try {
      await requestPermissions();
      setIsScanning(true);
      scanAndConnect();

      setTimeout(() => {
        if (bleManager) bleManager.stopDeviceScan();
        setIsScanning((prev) => {
          if (prev) {
            setBleEnabled(false);
            setBleErrorMessage("Scan timeout. Ensure ESP32 is powered on.");
          }
          return false;
        });
      }, 5000);
    } catch (e) {
      console.log("BLE init failed:", e);
      setIsScanning(false);
      setBleEnabled(false);
      setBleErrorMessage("Failed to start BLE operation safely.");
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
    }
  };

  const scanAndConnect = () => {
    try {
      if (!bleManager) return;
      bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) { 
          console.log("Scan error:", error);
          setIsScanning(false);
          setBleEnabled(false);
          setBleErrorMessage("BLE scan encountered an error.");
          return; 
        }

        if (device?.name === "ESP32_Button") {
          bleManager!.stopDeviceScan();
          setIsScanning(false);

          device
            .connect()
            .then((d) => {
              setIsConnected(true);
              deviceIdRef.current = d.id;
              setBleErrorMessage("");
              return d.discoverAllServicesAndCharacteristics();
            })
            .then((d) => {
              d.monitorCharacteristicForService(
                SERVICE_UUID,
                CHARACTERISTIC_UUID,
                (error, characteristic) => {
                  if (error) return;
                  if (!characteristic?.value) return;
                  const value = atob(characteristic.value);
                  console.log("BLE:", value);
                  
                  handleBleMessage(value);
                }
              );
            })
            .catch((err) => {
              console.log("Connection failed:", err);
              setIsConnected(false);
              setBleEnabled(false);
            });
        }
      });
    } catch (e) {
      console.log("scanAndConnect error:", e);
      setIsScanning(false);
      setBleEnabled(false);
      setBleErrorMessage("Could not scan and connect safely.");
    }
  };

  const handleBleMessage = (value: string) => {
    if (modeRef.current !== "manual") return;
    
    if (value === "START" && !isRecordingRef.current) {
        startRecording();
    } else if (value === "STOP" && isRecordingRef.current) {
        stopRecordingRef.current?.();
    }
  };

  // ── RECORDING ───────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      recordingRef.current = newRecording;
      
      setIsRecording(true);
      isRecordingRef.current = true;
    } catch (err) {
      console.log(err);
    }
  };

  const stopRecordingInternal = async () => {
    try {
      const rec = recordingRef.current;
      if (!rec) return;

      setIsRecording(false);
      isRecordingRef.current = false;
      setLoading(true);

      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      
      setRecording(null);
      recordingRef.current = null;
      
      if (!uri) return;

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
  
  const stopRecordingRef = useRef<(() => Promise<void>) | null>(null);
  stopRecordingRef.current = stopRecordingInternal;

  // ── AUTO MODE LOOP ────────────────────────────────────────
  const startAutoMode = async () => {
    if (!isConnected) return;
    setIsAutoActive(true);
    isAutoActiveRef.current = true;
    runAutoLoop();
  };

  const stopAutoMode = () => {
    setIsAutoActive(false);
    isAutoActiveRef.current = false;
    if (autoLoopRef.current) {
        clearTimeout(autoLoopRef.current);
        autoLoopRef.current = null;
    }
    if (isRecordingRef.current && stopRecordingRef.current) {
        stopRecordingRef.current();
    }
  };

  const runAutoLoop = async () => {
    if (!isAutoActiveRef.current) return;
    
    await startRecording();
    
    await new Promise(res => setTimeout(res, 4000));
    
    if (!isAutoActiveRef.current) return;

    if (stopRecordingRef.current) {
      await stopRecordingRef.current();
    }

    if (!isAutoActiveRef.current) return;
    
    autoLoopRef.current = setTimeout(runAutoLoop, 500);
  };

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <StyledSafeArea style={{ flex: 1, backgroundColor: "#070d1a" }}>

      <View style={{ position: "absolute", top: -80, left: -60, width: 280, height: 280, borderRadius: 140, backgroundColor: "#0ea5e9", opacity: 0.07 }} />
      <View style={{ position: "absolute", bottom: 80, right: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: "#6366f1", opacity: 0.06 }} />
      <View style={{ position: "absolute", top: "40%", left: "30%", width: 200, height: 200, borderRadius: 100, backgroundColor: "#38bdf8", opacity: 0.04 }} />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: mountFade, transform: [{ translateY: mountSlide }] }}>

          {/* ── Header ────────────────────────────────────────── */}
          <View style={{ alignItems: "center", marginBottom: 24, marginTop: 10 }}>
            <Text style={{ color: "#f1f5f9", fontSize: 27, fontWeight: "800", letterSpacing: -0.6, textAlign: "center" }}>
              BLE Voice Converter
            </Text>
            <Text style={{ color: "#334155", fontSize: 13, marginTop: 4, letterSpacing: 0.3, marginBottom: 14 }}>
              Speak · Translate via ESP32
            </Text>
            <BlePill connected={isConnected} scanning={isScanning} />
          </View>

          {/* ── BLE Connect Button & Mode Toggles ───────────────────────────── */}
          {!isBleSupported ? (
            <View style={{ backgroundColor: "rgba(239, 68, 68, 0.15)", padding: 12, borderRadius: 10, marginBottom: 16 }}>
              <Text style={{ color: "#ef4444", textAlign: "center", fontSize: 13, fontWeight: "600" }}>
                BLE not supported on this device. (Expo Go detected)
              </Text>
            </View>
          ) : bleErrorMessage ? (
            <View style={{ backgroundColor: "rgba(245, 158, 11, 0.15)", padding: 12, borderRadius: 10, marginBottom: 16 }}>
              <Text style={{ color: "#fcd34d", textAlign: "center", fontSize: 13, fontWeight: "600" }}>
                {bleErrorMessage}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            disabled={!isBleSupported}
            onPress={toggleConnectBle}
            style={{
              backgroundColor: !isBleSupported ? "#475569" : bleEnabled ? "#e11d48" : "#0284c7",
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: "center",
              marginBottom: 20,
              opacity: !isBleSupported ? 0.6 : 1,
            }}
          >
            <Text style={{ color: "white", fontSize: 15, fontWeight: "700", letterSpacing: 0.5 }}>
              {bleEnabled ? "Disconnect BLE" : "Connect BLE"}
            </Text>
          </TouchableOpacity>

          {!isConnected && isBleSupported && (
            <Text style={{ color: "#ef4444", textAlign: "center", marginBottom: 12, fontSize: 13, fontWeight: "600" }}>
              Connect ESP32 to use device features
            </Text>
          )}

          <View style={{ 
            flexDirection: "row", backgroundColor: "rgba(10,18,36,0.92)", 
            borderRadius: 14, marginBottom: 24, padding: 4, 
            borderWidth: 1, borderColor: "rgba(30,58,82,0.6)" 
          }}>
            <TouchableOpacity
              disabled={!isConnected}
              onPress={() => setMode("manual")}
              style={{
                flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 10,
                backgroundColor: mode === "manual" && isConnected ? "rgba(56,189,248,0.2)" : "transparent",
                opacity: !isConnected ? 0.4 : 1
              }}
            >
              <Text style={{ color: mode === "manual" && isConnected ? "#38bdf8" : "#94a3b8", fontWeight: "700" }}>Manual Mode</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={!isConnected}
              onPress={() => setMode("auto")}
              style={{
                flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 10,
                backgroundColor: mode === "auto" && isConnected ? "rgba(56,189,248,0.2)" : "transparent",
                opacity: !isConnected ? 0.4 : 1
              }}
            >
              <Text style={{ color: mode === "auto" && isConnected ? "#38bdf8" : "#94a3b8", fontWeight: "700" }}>Auto Mode</Text>
            </TouchableOpacity>
          </View>

          {mode === "auto" && isConnected && (
            <TouchableOpacity
              onPress={isAutoActive ? stopAutoMode : startAutoMode}
              style={{
                backgroundColor: isAutoActive ? "#e11d48" : "#10b981",
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <Text style={{ color: "white", fontSize: 15, fontWeight: "700" }}>
                {isAutoActive ? "Stop Auto Mode" : "Start Auto Mode"}
              </Text>
            </TouchableOpacity>
          )}

          {/* ── ESP32 device card ─────────────────────────────── */}
          <View style={{
            backgroundColor: "rgba(10,18,36,0.92)", borderRadius: 18,
            borderWidth: 1, borderColor: isConnected ? "rgba(52,211,153,0.25)" : "rgba(30,58,82,0.6)",
            padding: 16, marginBottom: 28, flexDirection: "row", alignItems: "center", gap: 14,
            shadowColor: isConnected ? "#34d399" : "#000",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: isConnected ? 0.18 : 0.1,
            shadowRadius: 14,
          }}>
            {/* Bluetooth icon box */}
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
                  ? mode === "auto"
                    ? "BLE connected · Auto mode active"
                    : "BLE connected · hardware trigger active"
                  : isScanning
                  ? "Scanning for device…"
                  : "Not found · tap Connect BLE"}
              </Text>
            </View>

            {/* Status dot */}
            <View style={{
              width: 10, height: 10, borderRadius: 5,
              backgroundColor: isConnected ? "#34d399" : isScanning ? "#facc15" : "#334155",
              shadowColor: isConnected ? "#34d399" : "#facc15",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: isConnected || isScanning ? 0.8 : 0,
              shadowRadius: 6,
            }} />
          </View>

          {/* ── Waveform ───────────────────────────────────────── */}
          <View style={{ alignItems: "center", marginBottom: 22 }}>
            <Waveform isActive={isRecording} />
          </View>

          {/* ── Record button ──────────────────────────────────── */}
          <View style={{ alignItems: "center", marginBottom: 30 }}>
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <PulseRing anim={pulse1} color={isRecording ? "#ef4444" : "#38bdf8"} />
              <PulseRing anim={pulse2} color={isRecording ? "#ef4444" : "#38bdf8"} />
              <PulseRing anim={pulse3} color={isRecording ? "#ef4444" : "#38bdf8"} />

              <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                <TouchableOpacity
                  disabled={mode === "auto" || !isConnected}
                  onPress={() => animateBtn(isRecording ? () => stopRecordingRef.current?.() : startRecording)}
                  activeOpacity={1}
                  style={{
                    width: 90, height: 90, borderRadius: 45,
                    alignItems: "center", justifyContent: "center",
                    backgroundColor: isRecording ? "#dc2626" : "#0284c7",
                    shadowColor: isRecording ? "#ef4444" : "#38bdf8",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.65, shadowRadius: 26,
                    borderWidth: 1.5,
                    borderColor: isRecording ? "rgba(239,68,68,0.35)" : "rgba(56,189,248,0.35)",
                    opacity: mode === "auto" || !isConnected ? 0.5 : 1,
                  }}
                >
                  <View style={{ position: "absolute", width: 78, height: 78, borderRadius: 39, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }} />
                  {isRecording ? <StopIcon /> : <MicIcon />}
                </TouchableOpacity>
              </Animated.View>
            </View>

            <Text style={{
              color: isRecording ? "#f87171" : "#38bdf8",
              fontSize: 11, fontWeight: "700", letterSpacing: 2.5,
              textTransform: "uppercase", marginTop: 18,
            }}>
              {isRecording ? "● Recording…" : isConnected ? (mode === "auto" ? "Auto Mode Loop" : "Press ESP32 or Tap") : "Disconnected"}
            </Text>
          </View>

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
