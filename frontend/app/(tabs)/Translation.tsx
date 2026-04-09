import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import { styled } from "nativewind";

const StyledSafeArea = styled(SafeAreaView);

const VITE_URL = process.env.EXPO_PUBLIC_API_URL;

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "gu", name: "Gujarati" },
  { code: "fr", name: "French" },
  { code: "es", name: "Spanish" },
  { code: "de", name: "German" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "mr", name: "Marathi" },
];

// ── Mic SVG-style icon ────────────────────────────────────────────────────────
const MicIcon = () => (
  <View style={{ width: 36, height: 36, alignItems: "center" }}>
    <View
      style={{
        width: 16,
        height: 22,
        borderRadius: 8,
        borderWidth: 2.5,
        borderColor: "#fff",
        marginBottom: 2,
      }}
    />
    <View style={{ width: 24, height: 2.5, backgroundColor: "#fff", borderRadius: 2 }} />
    <View style={{ width: 2.5, height: 8, backgroundColor: "#fff", borderRadius: 2, marginTop: -1 }} />
  </View>
);

// ── Stop icon ─────────────────────────────────────────────────────────────────
const StopIcon = () => (
  <View style={{ width: 22, height: 22, borderRadius: 5, backgroundColor: "#fff" }} />
);

// ── Chevron ───────────────────────────────────────────────────────────────────
const ChevronDown = () => (
  <View style={{ width: 16, height: 16, alignItems: "center", justifyContent: "center" }}>
    <View
      style={{
        width: 8,
        height: 8,
        borderRightWidth: 2,
        borderBottomWidth: 2,
        borderColor: "#64748b",
        transform: [{ rotate: "45deg" }],
        marginTop: -4,
      }}
    />
  </View>
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
        <Animated.View
          key={i}
          style={{
            width: 3,
            height: 30,
            borderRadius: 2,
            backgroundColor: isActive ? "#38bdf8" : "#1e3a52",
            transform: [{ scaleY: b }],
          }}
        />
      ))}
    </View>
  );
};

// ── Pulse ring ────────────────────────────────────────────────────────────────
const PulseRing = ({ anim, delay, color }: { anim: Animated.Value; delay: number; color: string }) => (
  <Animated.View
    style={{
      position: "absolute",
      width: 110,
      height: 110,
      borderRadius: 55,
      borderWidth: 1.5,
      borderColor: color,
      opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
      transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
    }}
  />
);

export default function VoiceTestPage() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [textOutput, setTextOutput] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [language, setLanguage] = useState("en");
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const selectedLanguage = LANGUAGES.find((l) => l.code === language)?.name ?? "English";

  // Animations
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const mountFade = useRef(new Animated.Value(0)).current;
  const mountSlide = useRef(new Animated.Value(24)).current;

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

  const animateBtn = (fn: () => void) => {
    Animated.sequence([
      Animated.spring(btnScale, { toValue: 0.92, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }),
    ]).start();
    fn();
  };

  // ── Original logic ──────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.log(err);
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      setLoading(true);

      await recording?.stopAndUnloadAsync();
      const uri = recording?.getURI();
      if (!uri) return;

      const formData = new FormData();
      formData.append("audio", { uri, name: "audio.m4a", type: "audio/m4a" } as any);
      formData.append("language", language);

      const res = await fetch(`${VITE_URL}/translate`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setTextOutput(data.text || "");
      setTranslatedText(data.translatedText || "");

      if (data.audioBase64) {
        const { sound } = await Audio.Sound.createAsync({
          uri: `data:audio/mp3;base64,${data.audioBase64}`,
        });
        setSound(sound);
        setIsPlaying(true);
        await sound.playAsync();
        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) return;
          setIsPlaying(status.isPlaying);
        });
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const togglePlayPause = async () => {
    if (!sound) return;
    const status = await sound.getStatusAsync();
    if (status.isLoaded) {
      if (status.isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    }
  };

  const hasOutput = textOutput || translatedText;

  return (
    <StyledSafeArea style={{ flex: 1, backgroundColor: "#070d1a" }}>

      {/* ── Ambient glow blobs ───────────────────────────── */}
      <View style={{ position: "absolute", top: -90, left: -70, width: 300, height: 300, borderRadius: 150, backgroundColor: "#0ea5e9", opacity: 0.07 }} />
      <View style={{ position: "absolute", bottom: 60, right: -90, width: 340, height: 340, borderRadius: 170, backgroundColor: "#6366f1", opacity: 0.06 }} />
      <View style={{ position: "absolute", top: "38%", left: "25%", width: 220, height: 220, borderRadius: 110, backgroundColor: "#38bdf8", opacity: 0.04 }} />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: mountFade, transform: [{ translateY: mountSlide }] }}>

          {/* ── Header ──────────────────────────────────────── */}
          <View style={{ alignItems: "center", marginBottom: 28, marginTop: 10 }}>
            <Text style={{ color: "#f1f5f9", fontSize: 27, fontWeight: "800", letterSpacing: -0.6, textAlign: "center" }}>
              Voice Converter
            </Text>
            <Text style={{ color: "#334155", fontSize: 13, marginTop: 4, letterSpacing: 0.3 }}>
              Speak · Translate · Listen
            </Text>
          </View>

          {/* ── Language selector ────────────────────────────── */}
          <View style={{ marginBottom: 30 }}>
            <Text style={{ color: "#475569", fontSize: 10, fontWeight: "700", letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 9, marginLeft: 2 }}>
              Output Language
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              activeOpacity={0.85}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "rgba(15,23,42,0.95)",
                paddingHorizontal: 16,
                paddingVertical: 15,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "rgba(56,189,248,0.22)",
                shadowColor: "#38bdf8",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.12,
                shadowRadius: 14,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#38bdf8", shadowColor: "#38bdf8", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 5 }} />
                <Text style={{ color: "#f1f5f9", fontSize: 15, fontWeight: "600", letterSpacing: 0.2 }}>
                  {selectedLanguage}
                </Text>
              </View>
              <ChevronDown />
            </TouchableOpacity>
          </View>

          {/* ── Waveform ─────────────────────────────────────── */}
          <View style={{ alignItems: "center", marginBottom: 22 }}>
            <Waveform isActive={isRecording} />
          </View>

          {/* ── Record button ─────────────────────────────────── */}
          <View style={{ alignItems: "center", marginBottom: 30 }}>
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <PulseRing anim={pulse1} delay={0} color={isRecording ? "#ef4444" : "#38bdf8"} />
              <PulseRing anim={pulse2} delay={420} color={isRecording ? "#ef4444" : "#38bdf8"} />
              <PulseRing anim={pulse3} delay={840} color={isRecording ? "#ef4444" : "#38bdf8"} />

              <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                <TouchableOpacity
                  onPress={() => animateBtn(isRecording ? stopRecording : startRecording)}
                  activeOpacity={1}
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: 45,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isRecording ? "#dc2626" : "#0284c7",
                    shadowColor: isRecording ? "#ef4444" : "#38bdf8",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.65,
                    shadowRadius: 26,
                    borderWidth: 1.5,
                    borderColor: isRecording ? "rgba(239,68,68,0.35)" : "rgba(56,189,248,0.35)",
                  }}
                >
                  {/* Inner ring detail */}
                  <View style={{ position: "absolute", width: 78, height: 78, borderRadius: 39, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }} />
                  {isRecording ? <StopIcon /> : <MicIcon />}
                </TouchableOpacity>
              </Animated.View>
            </View>

            <Text style={{ color: isRecording ? "#f87171" : "#38bdf8", fontSize: 11, fontWeight: "700", letterSpacing: 2.5, textTransform: "uppercase", marginTop: 18 }}>
              {isRecording ? "● Recording…" : "Tap to Record"}
            </Text>
          </View>

          {/* ── Loading ───────────────────────────────────────── */}
          {loading && (
            <View style={{ alignItems: "center", marginBottom: 22 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "rgba(56,189,248,0.07)", paddingHorizontal: 18, paddingVertical: 11, borderRadius: 100, borderWidth: 1, borderColor: "rgba(56,189,248,0.18)" }}>
                <ActivityIndicator size="small" color="#38bdf8" />
                <Text style={{ color: "#38bdf8", fontSize: 13, fontWeight: "600", letterSpacing: 0.4 }}>
                  Processing translation…
                </Text>
              </View>
            </View>
          )}

          {/* ── Output card ───────────────────────────────────── */}
          {hasOutput && (
            <View
              style={{
                backgroundColor: "rgba(10,18,36,0.92)",
                borderRadius: 22,
                borderWidth: 1,
                borderColor: "rgba(56,189,248,0.14)",
                overflow: "hidden",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.35,
                shadowRadius: 22,
              }}
            >
              {/* Top accent */}
              <View style={{ height: 2.5, backgroundColor: "#0ea5e9", opacity: 0.55 }} />

              <View style={{ padding: 20 }}>
                {/* Original */}
                {!!textOutput && (
                  <View style={{ marginBottom: 18 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 }}>
                      <View style={{ width: 3.5, height: 13, borderRadius: 2, backgroundColor: "#475569" }} />
                      <Text style={{ color: "#475569", fontSize: 10, fontWeight: "700", letterSpacing: 2.5, textTransform: "uppercase" }}>
                        Original
                      </Text>
                    </View>
                    <Text style={{ color: "#94a3b8", fontSize: 15, lineHeight: 23 }}>{textOutput}</Text>
                  </View>
                )}

                {!!textOutput && !!translatedText && (
                  <View style={{ height: 1, backgroundColor: "rgba(56,189,248,0.09)", marginBottom: 18 }} />
                )}

                {/* Translated */}
                {!!translatedText && (
                  <View style={{ marginBottom: sound ? 18 : 0 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 }}>
                      <View style={{ width: 3.5, height: 13, borderRadius: 2, backgroundColor: "#38bdf8" }} />
                      <Text style={{ color: "#38bdf8", fontSize: 10, fontWeight: "700", letterSpacing: 2.5, textTransform: "uppercase" }}>
                        Translated
                      </Text>
                    </View>
                    <Text style={{ color: "#f1f5f9", fontSize: 16, lineHeight: 25, fontWeight: "500" }}>{translatedText}</Text>
                  </View>
                )}

                {/* Audio player */}
                {sound && (
                  <View
                    style={{
                      backgroundColor: "rgba(56,189,248,0.06)",
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: "rgba(56,189,248,0.16)",
                      padding: 13,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
                      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(56,189,248,0.12)", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 17 }}>🎧</Text>
                      </View>
                      <View>
                        <Text style={{ color: "#f1f5f9", fontSize: 13, fontWeight: "600" }}>Audio Response</Text>
                        <Text style={{ color: "#475569", fontSize: 11, marginTop: 1 }}>{isPlaying ? "Playing…" : "Paused"}</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={togglePlayPause}
                      activeOpacity={0.8}
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 21,
                        backgroundColor: "#0284c7",
                        alignItems: "center",
                        justifyContent: "center",
                        shadowColor: "#38bdf8",
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.55,
                        shadowRadius: 12,
                      }}
                    >
                      {isPlaying ? (
                        <View style={{ flexDirection: "row", gap: 3 }}>
                          <View style={{ width: 3.5, height: 14, backgroundColor: "#fff", borderRadius: 2 }} />
                          <View style={{ width: 3.5, height: 14, backgroundColor: "#fff", borderRadius: 2 }} />
                        </View>
                      ) : (
                        <View style={{ width: 0, height: 0, borderTopWidth: 7, borderBottomWidth: 7, borderLeftWidth: 12, borderTopColor: "transparent", borderBottomColor: "transparent", borderLeftColor: "#fff", marginLeft: 3 }} />
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}

        </Animated.View>
      </ScrollView>

      {/* ── Language Modal ───────────────────────────────────── */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.78)", justifyContent: "flex-end" }}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1}>
            <View
              style={{
                backgroundColor: "#0b1628",
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                borderWidth: 1,
                borderColor: "rgba(56,189,248,0.14)",
                borderBottomWidth: 0,
                paddingTop: 12,
              }}
            >
              {/* Drag handle */}
              <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: "#1e3a52", alignSelf: "center", marginBottom: 20 }} />

              {/* Modal header */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 22, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "rgba(30,58,82,0.8)" }}>
                <Text style={{ color: "#f1f5f9", fontSize: 18, fontWeight: "700", letterSpacing: -0.3 }}>Select Language</Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={{ backgroundColor: "rgba(239,68,68,0.1)", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, borderWidth: 1, borderColor: "rgba(239,68,68,0.22)" }}
                >
                  <Text style={{ color: "#f87171", fontSize: 13, fontWeight: "600" }}>Close</Text>
                </TouchableOpacity>
              </View>

              {/* Language list */}
              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                <View style={{ padding: 12 }}>
                  {LANGUAGES.map((lang) => {
                    const isSelected = lang.code === language;
                    return (
                      <TouchableOpacity
                        key={lang.code}
                        onPress={() => {
                          setLanguage(lang.code);
                          setModalVisible(false);
                        }}
                        activeOpacity={0.7}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingHorizontal: 16,
                          paddingVertical: 15,
                          borderRadius: 13,
                          marginBottom: 3,
                          backgroundColor: isSelected ? "rgba(56,189,248,0.09)" : "transparent",
                          borderWidth: isSelected ? 1 : 0,
                          borderColor: isSelected ? "rgba(56,189,248,0.28)" : "transparent",
                        }}
                      >
                        <Text style={{ color: isSelected ? "#38bdf8" : "#cbd5e1", fontSize: 15, fontWeight: isSelected ? "700" : "400" }}>
                          {lang.name}
                        </Text>
                        {isSelected && (
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#38bdf8", shadowColor: "#38bdf8", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6 }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </StyledSafeArea>
  );
}