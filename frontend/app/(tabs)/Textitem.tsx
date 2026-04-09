import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import { styled } from "nativewind";

const StyledSafeArea = styled(SafeAreaView);

const API_URL = process.env.EXPO_PUBLIC_API_URL;

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

// ── Translate arrow icon ───────────────────────────────────────────────────────
const ArrowIcon = ({ color = "#fff" }: { color?: string }) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
    <View style={{ width: 16, height: 2, backgroundColor: color, borderRadius: 1 }} />
    <View style={{
      width: 0, height: 0,
      borderTopWidth: 5, borderBottomWidth: 5, borderLeftWidth: 8,
      borderTopColor: "transparent", borderBottomColor: "transparent",
      borderLeftColor: color,
    }} />
  </View>
);

export default function TextTranslatePage() {
  const [inputText, setInputText] = useState("");
  const [language, setLanguage] = useState("hi");
  const [loading, setLoading] = useState(false);
  const [translatedText, setTranslatedText] = useState("");
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const MAX_CHARS = 500;

  const selectedLanguage = LANGUAGES.find((l) => l.code === language)?.name ?? "Hindi";

  // Animations
  const mountFade = useRef(new Animated.Value(0)).current;
  const mountSlide = useRef(new Animated.Value(24)).current;
  const resultFade = useRef(new Animated.Value(0)).current;
  const resultSlide = useRef(new Animated.Value(16)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(mountFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(mountSlide, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  const animateResult = () => {
    resultFade.setValue(0);
    resultSlide.setValue(16);
    Animated.parallel([
      Animated.timing(resultFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(resultSlide, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
    ]).start();
  };

  const handleTranslate = async () => {
    if (!inputText.trim() || loading) return;

    // Stop any existing audio
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
      setIsPlaying(false);
    }

    Animated.sequence([
      Animated.spring(btnScale, { toValue: 0.94, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }),
    ]).start();

    setLoading(true);
    setTranslatedText("");

    try {
      const formData = new FormData();
      formData.append("text", inputText.trim());
      formData.append("language", language);

      const res = await fetch(`${API_URL}/translate-text`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.error) throw new Error(data.error);

      setTranslatedText(data.translatedText ?? "");

      if (data.audioBase64) {
        const { sound: newSound } = await Audio.Sound.createAsync({
          uri: `data:audio/mp3;base64,${data.audioBase64}`,
        });
        setSound(newSound);
        setIsPlaying(true);
        await newSound.playAsync();
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) return;
          setIsPlaying(status.isPlaying);
        });
      }

      animateResult();
    } catch (err) {
      console.error(err);
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

  const handleClear = () => {
    setInputText("");
    setCharCount(0);
    setTranslatedText("");
    setSound(null);
    setIsPlaying(false);
  };

  return (
    <StyledSafeArea style={{ flex: 1, backgroundColor: "#070d1a" }}>

      {/* ── Ambient blobs ─────────────────────────────────── */}
      <View style={{ position: "absolute", top: -60, right: -80, width: 260, height: 260, borderRadius: 130, backgroundColor: "#6366f1", opacity: 0.07 }} />
      <View style={{ position: "absolute", bottom: 80, left: -70, width: 300, height: 300, borderRadius: 150, backgroundColor: "#0ea5e9", opacity: 0.06 }} />
      <View style={{ position: "absolute", top: "45%", right: "20%", width: 180, height: 180, borderRadius: 90, backgroundColor: "#38bdf8", opacity: 0.04 }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: mountFade, transform: [{ translateY: mountSlide }] }}>

            {/* ── Header ────────────────────────────────────── */}
            <View style={{ alignItems: "center", marginBottom: 26, marginTop: 10 }}>
              <Text style={{ color: "#f1f5f9", fontSize: 27, fontWeight: "800", letterSpacing: -0.6, textAlign: "center" }}>
                Text Translator
              </Text>
              <Text style={{ color: "#334155", fontSize: 13, marginTop: 4, letterSpacing: 0.3 }}>
                Type · Translate · Listen
              </Text>
            </View>

            {/* ── Language selector ──────────────────────────── */}
            <View style={{ marginBottom: 18 }}>
              <Text style={{ color: "#475569", fontSize: 10, fontWeight: "700", letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 9, marginLeft: 2 }}>
                Translate To
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
                  shadowOpacity: 0.1,
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

            {/* ── Input box ─────────────────────────────────── */}
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 9, marginLeft: 2 }}>
                <Text style={{ color: "#475569", fontSize: 10, fontWeight: "700", letterSpacing: 2.5, textTransform: "uppercase" }}>
                  Your Text
                </Text>
                {inputText.length > 0 && (
                  <TouchableOpacity onPress={handleClear}>
                    <Text style={{ color: "#475569", fontSize: 12, fontWeight: "600" }}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View
                style={{
                  backgroundColor: "rgba(10,18,36,0.92)",
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: inputText.length > 0 ? "rgba(56,189,248,0.28)" : "rgba(30,58,82,0.6)",
                  overflow: "hidden",
                  shadowColor: inputText.length > 0 ? "#38bdf8" : "#000",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: inputText.length > 0 ? 0.1 : 0.2,
                  shadowRadius: 14,
                }}
              >
                <TextInput
                  value={inputText}
                  onChangeText={(t) => {
                    if (t.length <= MAX_CHARS) {
                      setInputText(t);
                      setCharCount(t.length);
                    }
                  }}
                  placeholder="Enter text to translate…"
                  placeholderTextColor="#1e3a52"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  style={{
                    color: "#f1f5f9",
                    fontSize: 15,
                    lineHeight: 23,
                    padding: 16,
                    minHeight: 130,
                    fontWeight: "400",
                  }}
                />
                {/* char count */}
                <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 14, paddingBottom: 10 }}>
                  <Text style={{ color: charCount > MAX_CHARS * 0.9 ? "#f87171" : "#1e3a52", fontSize: 11, fontWeight: "600" }}>
                    {charCount}/{MAX_CHARS}
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Translate button ──────────────────────────── */}
            <Animated.View style={{ transform: [{ scale: btnScale }], marginBottom: 22 }}>
              <TouchableOpacity
                onPress={handleTranslate}
                activeOpacity={1}
                disabled={loading || !inputText.trim()}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  backgroundColor: inputText.trim() && !loading ? "#0284c7" : "rgba(2,132,199,0.3)",
                  paddingVertical: 16,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: inputText.trim() && !loading ? "rgba(56,189,248,0.35)" : "rgba(56,189,248,0.1)",
                  shadowColor: "#38bdf8",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: inputText.trim() && !loading ? 0.5 : 0,
                  shadowRadius: 20,
                }}
              >
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 0.4 }}>
                      Translating…
                    </Text>
                  </>
                ) : (
                  <>
                    <ArrowIcon />
                    <Text style={{ color: inputText.trim() ? "#fff" : "rgba(255,255,255,0.35)", fontSize: 15, fontWeight: "700", letterSpacing: 0.4 }}>
                      Translate
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* ── Result card ───────────────────────────────── */}
            {!!translatedText && (
              <Animated.View
                style={{
                  opacity: resultFade,
                  transform: [{ translateY: resultSlide }],
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
                  {/* Original label */}
                  <View style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 }}>
                      <View style={{ width: 3.5, height: 13, borderRadius: 2, backgroundColor: "#475569" }} />
                      <Text style={{ color: "#475569", fontSize: 10, fontWeight: "700", letterSpacing: 2.5, textTransform: "uppercase" }}>
                        Original
                      </Text>
                    </View>
                    <Text style={{ color: "#94a3b8", fontSize: 15, lineHeight: 23 }}>{inputText.trim()}</Text>
                  </View>

                  <View style={{ height: 1, backgroundColor: "rgba(56,189,248,0.09)", marginBottom: 16 }} />

                  {/* Translated */}
                  <View style={{ marginBottom: 18 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 }}>
                      <View style={{ width: 3.5, height: 13, borderRadius: 2, backgroundColor: "#38bdf8" }} />
                      <Text style={{ color: "#38bdf8", fontSize: 10, fontWeight: "700", letterSpacing: 2.5, textTransform: "uppercase" }}>
                        Translated · {selectedLanguage}
                      </Text>
                    </View>
                    <Text style={{ color: "#f1f5f9", fontSize: 17, lineHeight: 26, fontWeight: "500" }}>
                      {translatedText}
                    </Text>
                  </View>

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
              </Animated.View>
            )}

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Language Modal ───────────────────────────────── */}
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
              <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: "#1e3a52", alignSelf: "center", marginBottom: 20 }} />

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 22, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "rgba(30,58,82,0.8)" }}>
                <Text style={{ color: "#f1f5f9", fontSize: 18, fontWeight: "700", letterSpacing: -0.3 }}>Translate To</Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={{ backgroundColor: "rgba(239,68,68,0.1)", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, borderWidth: 1, borderColor: "rgba(239,68,68,0.22)" }}
                >
                  <Text style={{ color: "#f87171", fontSize: 13, fontWeight: "600" }}>Close</Text>
                </TouchableOpacity>
              </View>

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