import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";

const StyledSafeArea = styled(SafeAreaView);
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ── Tiny animated pulse dot ───────────────────────────────────────────────────
const PulseDot = ({ color }: { color: string }) => {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.6, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={{ width: 10, height: 10, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{
        position: "absolute", width: 10, height: 10, borderRadius: 5,
        backgroundColor: color, opacity: 0.3, transform: [{ scale: anim }],
      }} />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
};

// ── Section fade-in wrapper ───────────────────────────────────────────────────
const FadeIn = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, tension: 55, friction: 11, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
      {children}
    </Animated.View>
  );
};

// ── Hardware spec row ─────────────────────────────────────────────────────────
const SpecRow = ({ label, index }: { label: string; index: number }) => {
  const colors = ["#38bdf8", "#a78bfa", "#34d399", "#fb923c", "#f472b6", "#facc15", "#38bdf8", "#a78bfa", "#34d399"];
  const color = colors[index % colors.length];
  return (
    <View style={{
      flexDirection: "row", alignItems: "center", gap: 12,
      paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "rgba(56,189,248,0.07)",
    }}>
      <View style={{
        width: 28, height: 28, borderRadius: 8,
        backgroundColor: `${color}15`, borderWidth: 1, borderColor: `${color}30`,
        alignItems: "center", justifyContent: "center",
      }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      </View>
      <Text style={{ color: "#cbd5e1", fontSize: 13, flex: 1, lineHeight: 19 }}>{label}</Text>
    </View>
  );
};

// ── Impact stat card ──────────────────────────────────────────────────────────
const StatCard = ({ value, label, color }: { value: string; label: string; color: string }) => (
  <View style={{
    flex: 1,
    backgroundColor: "rgba(10,18,36,0.9)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${color}25`,
    padding: 14,
    alignItems: "center",
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  }}>
    <View style={{ height: 2, width: 30, backgroundColor: color, borderRadius: 1, marginBottom: 10, opacity: 0.7 }} />
    <Text style={{ color, fontSize: 22, fontWeight: "800", letterSpacing: -0.5 }}>{value}</Text>
    <Text style={{ color: "#475569", fontSize: 10, fontWeight: "600", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 4, textAlign: "center" }}>{label}</Text>
  </View>
);

// ── Use case card ─────────────────────────────────────────────────────────────
const UseCaseCard = ({
  emoji, title, desc, color, delay,
}: { emoji: string; title: string; desc: string; color: string; delay: number }) => {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 450, delay, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, tension: 55, friction: 11, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], flex: 1, minWidth: "45%" }}>
      <View style={{
        backgroundColor: "rgba(10,18,36,0.9)",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: `${color}20`,
        padding: 16,
        margin: 5,
        shadowColor: color,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      }}>
        <View style={{ height: 2, backgroundColor: color, opacity: 0.6, borderRadius: 1, marginBottom: 14 }} />
        <Text style={{ fontSize: 26, marginBottom: 8 }}>{emoji}</Text>
        <Text style={{ color: "#f1f5f9", fontSize: 13, fontWeight: "700", marginBottom: 6 }}>{title}</Text>
        <Text style={{ color: "#475569", fontSize: 11, lineHeight: 17 }}>{desc}</Text>
      </View>
    </Animated.View>
  );
};

// ── Architecture step ─────────────────────────────────────────────────────────
const ArchStep = ({ label, sub, color, isLast }: { label: string; sub: string; color: string; isLast?: boolean }) => (
  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
    <View style={{ alignItems: "center" }}>
      <View style={{
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: `${color}18`, borderWidth: 1.5, borderColor: `${color}50`,
        alignItems: "center", justifyContent: "center",
      }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      </View>
      {!isLast && <View style={{ width: 1.5, height: 28, backgroundColor: `${color}30`, marginTop: 4 }} />}
    </View>
    <View style={{ flex: 1, paddingTop: 6 }}>
      <Text style={{ color: "#f1f5f9", fontSize: 14, fontWeight: "700" }}>{label}</Text>
      <Text style={{ color: "#475569", fontSize: 12, marginTop: 2 }}>{sub}</Text>
    </View>
  </View>
);

// ── Roadmap phase ─────────────────────────────────────────────────────────────
const Phase = ({ num, title, desc, color }: { num: string; title: string; desc: string; color: string }) => (
  <View style={{
    backgroundColor: "rgba(10,18,36,0.9)", borderRadius: 14,
    borderWidth: 1, borderColor: `${color}22`, padding: 14, marginBottom: 10,
    flexDirection: "row", gap: 12, alignItems: "flex-start",
  }}>
    <View style={{
      width: 32, height: 32, borderRadius: 8,
      backgroundColor: `${color}15`, borderWidth: 1, borderColor: `${color}35`,
      alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ color, fontSize: 11, fontWeight: "800" }}>{num}</Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ color: "#f1f5f9", fontSize: 13, fontWeight: "700", marginBottom: 3 }}>{title}</Text>
      <Text style={{ color: "#475569", fontSize: 12, lineHeight: 18 }}>{desc}</Text>
    </View>
  </View>
);

// ── Section header ────────────────────────────────────────────────────────────
const SectionHeader = ({ label, color = "#38bdf8" }: { label: string; color?: string }) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16, marginTop: 6 }}>
    <View style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: color }} />
    <Text style={{ color, fontSize: 10, fontWeight: "700", letterSpacing: 3, textTransform: "uppercase" }}>
      {label}
    </Text>
    <View style={{ flex: 1, height: 1, backgroundColor: `${color}20` }} />
  </View>
);

// ── Hardware components ───────────────────────────────────────────────────────
const HARDWARE = [
  "ESP32 Devkit — Main microcontroller & Wi-Fi/BT",
  "INMP441 Microphone Module — High-quality MEMS mic",
  "MAX98357 I2S Audio Amplifier — Digital audio output",
  "3W 4Ω Speaker — Clear voice playback",
  "18650 Lithium Battery — Portable power source",
  "TP4056 C-Type Battery Charging Module",
  "DC-DC Booster/Buck 1.8V–5V → 3.3V Power Regulator",
  "B10K Potentiometer — Volume / variable control",
  "Rocker Switch — Power on/off",
  "Six Core Copper Wire (20m) — Internal wiring",
];

// ── Use cases ─────────────────────────────────────────────────────────────────
const USE_CASES = [
  { emoji: "🏥", title: "Healthcare", desc: "Doctor–patient conversations across language barriers", color: "#34d399" },
  { emoji: "✈️", title: "Travel", desc: "Tourist navigation and authentic cultural exchange", color: "#38bdf8" },
  { emoji: "🎓", title: "Education", desc: "Multilingual classrooms with peer-to-peer comms", color: "#a78bfa" },
  { emoji: "🏛️", title: "Public Services", desc: "Railway, government offices, multilingual announcements", color: "#fb923c" },
];

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProductPage() {
  return (
    <StyledSafeArea style={{ flex: 1, backgroundColor: "#070d1a" }}>

      {/* Ambient blobs */}
      <View style={{ position: "absolute", top: -100, left: -80, width: 320, height: 320, borderRadius: 160, backgroundColor: "#38bdf8", opacity: 0.06 }} />
      <View style={{ position: "absolute", top: "25%", right: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: "#6366f1", opacity: 0.06 }} />
      <View style={{ position: "absolute", bottom: 100, left: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: "#34d399", opacity: 0.04 }} />

      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>

        {/* ── Hero ──────────────────────────────────────────── */}
        <FadeIn delay={0}>
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}>

            {/* Logo wordmark */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 24 }}>
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                borderWidth: 1.5, borderColor: "rgba(56,189,248,0.4)",
                backgroundColor: "rgba(56,189,248,0.08)",
                alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ color: "#38bdf8", fontSize: 14, fontWeight: "900", letterSpacing: -1 }}>LV</Text>
              </View>
              <Text style={{ color: "#94a3b8", fontSize: 13, fontWeight: "600", letterSpacing: 2, textTransform: "uppercase" }}>
                LanVector
              </Text>
              <View style={{ flex: 1 }} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(52,211,153,0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1, borderColor: "rgba(52,211,153,0.25)" }}>
                <PulseDot color="#34d399" />
                <Text style={{ color: "#34d399", fontSize: 10, fontWeight: "700", letterSpacing: 1 }}>LIVE</Text>
              </View>
            </View>

            {/* Hero headline */}
            <View style={{ marginBottom: 8 }}>
              <Text style={{ color: "#475569", fontSize: 11, fontWeight: "700", letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 }}>
                Real-Time Wearable AI
              </Text>
              <Text style={{ color: "#f1f5f9", fontSize: 34, fontWeight: "900", letterSpacing: -1.2, lineHeight: 40 }}>
                Break Every{"\n"}
                <Text style={{ color: "#38bdf8" }}>Language</Text>{"\n"}
                Barrier.
              </Text>
            </View>

            <Text style={{ color: "#64748b", fontSize: 14, lineHeight: 22, marginTop: 12, marginBottom: 24 }}>
              Lan Vector is an advanced wearable AI-powered language translator designed for real-time communication — instantly translating spoken or written words across any language, anywhere.
            </Text>

            {/* Stat pills */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[
                { value: "12+", label: "Languages", color: "#38bdf8" },
                { value: "<5s", label: "Latency", color: "#a78bfa" },
                { value: "₹6K", label: "Budget", color: "#34d399" },
              ].map((s) => (
                <StatCard key={s.label} value={s.value} label={s.label} color={s.color} />
              ))}
            </View>
          </View>
        </FadeIn>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: "rgba(56,189,248,0.08)", marginHorizontal: 20, marginBottom: 28 }} />

        {/* ── About ─────────────────────────────────────────── */}
        <FadeIn delay={120}>
          <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
            <SectionHeader label="About the Product" />
            <View style={{
              backgroundColor: "rgba(10,18,36,0.9)", borderRadius: 20,
              borderWidth: 1, borderColor: "rgba(56,189,248,0.12)",
              overflow: "hidden",
            }}>
              <View style={{ height: 2.5, backgroundColor: "#38bdf8", opacity: 0.5 }} />
              <View style={{ padding: 18 }}>
                <Text style={{ color: "#94a3b8", fontSize: 14, lineHeight: 23 }}>
                  Compact and easy to wear, <Text style={{ color: "#38bdf8", fontWeight: "700" }}>Lan Vector</Text> makes global communication effortless — whether in business meetings, hospital visits, travel, or daily social interactions.
                </Text>
                <View style={{ marginTop: 14, gap: 10 }}>
                  {[
                    { icon: "🎙️", text: "Hands-free, real-time voice translation" },
                    { icon: "🌐", text: "Supports 12+ languages including Hindi, Gujarati, Japanese & more" },
                    { icon: "⚡", text: "Sub-500ms latency for natural conversation flow" },
                    { icon: "📡", text: "Modular API-first architecture — offline-ready roadmap" },
                  ].map((item, i) => (
                    <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                      <Text style={{ fontSize: 15, marginTop: 1 }}>{item.icon}</Text>
                      <Text style={{ color: "#cbd5e1", fontSize: 13, flex: 1, lineHeight: 20 }}>{item.text}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </FadeIn>

        {/* ── Use Cases ─────────────────────────────────────── */}
        <FadeIn delay={200}>
          <View style={{ paddingHorizontal: 15, marginBottom: 32 }}>
            <View style={{ paddingHorizontal: 5, marginBottom: 4 }}>
              <SectionHeader label="Real-World Use Cases" color="#a78bfa" />
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {USE_CASES.map((uc, i) => (
                <UseCaseCard key={uc.title} {...uc} delay={220 + i * 60} />
              ))}
            </View>
          </View>
        </FadeIn>

        {/* ── Architecture ───────────────────────────────────── */}
        <FadeIn delay={300}>
          <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
            <SectionHeader label="How It Works" color="#34d399" />
            <View style={{
              backgroundColor: "rgba(10,18,36,0.9)", borderRadius: 20,
              borderWidth: 1, borderColor: "rgba(52,211,153,0.12)",
              overflow: "hidden",
            }}>
              <View style={{ height: 2.5, backgroundColor: "#34d399", opacity: 0.5 }} />
              <View style={{ padding: 18, gap: 0 }}>
                <ArchStep label="Input Layer" sub="Voice captured by INMP441 MEMS microphone" color="#38bdf8" />
                <ArchStep label="ASR — Speech Recognition" sub="gpt-4o-transcribe converts audio to text" color="#a78bfa" />
                <ArchStep label="Language Vector Engine" sub="GPT-4o-mini translates with context awareness" color="#34d399" />
                <ArchStep label="TTS — Audio Synthesis" sub="gpt-4o-mini-tts → MAX98357 → 3W speaker" color="#fb923c" isLast />
              </View>
            </View>
          </View>
        </FadeIn>

        {/* ── Hardware ───────────────────────────────────────── */}
        <FadeIn delay={380}>
          <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
            <SectionHeader label="Hardware Components" color="#fb923c" />
            <View style={{
              backgroundColor: "rgba(10,18,36,0.9)", borderRadius: 20,
              borderWidth: 1, borderColor: "rgba(251,146,60,0.12)",
              overflow: "hidden",
            }}>
              <View style={{ height: 2.5, backgroundColor: "#fb923c", opacity: 0.5 }} />
              <View style={{ padding: 18 }}>
                {/* Budget badge */}
                <View style={{
                  flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                  backgroundColor: "rgba(52,211,153,0.07)", borderRadius: 12,
                  borderWidth: 1, borderColor: "rgba(52,211,153,0.2)",
                  padding: 12, marginBottom: 16,
                }}>
                  <Text style={{ color: "#94a3b8", fontSize: 12, fontWeight: "600" }}>Total Project Budget</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <PulseDot color="#34d399" />
                    <Text style={{ color: "#34d399", fontSize: 18, fontWeight: "900" }}>₹6,000</Text>
                  </View>
                </View>
                {HARDWARE.map((h, i) => (
                  <SpecRow key={i} label={h} index={i} />
                ))}
              </View>
            </View>
          </View>
        </FadeIn>

        {/* ── Roadmap ────────────────────────────────────────── */}
        <FadeIn delay={440}>
          <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
            <SectionHeader label="Roadmap" color="#a78bfa" />
            <Phase num="01" title="Prototype + Cloud" desc="Hardware assembly, cloud API integration, early user testing" color="#38bdf8" />
            <Phase num="02" title="Mobile App Integration" desc="React Native app, UX refinement, multi-language expansion" color="#a78bfa" />
            <Phase num="03" title="Edge AI Optimization" desc="Offline capability, on-device inference, reduced latency" color="#34d399" />
            <Phase num="04" title="Market Launch & Scale" desc="Commercial deployment, enterprise partnerships, global rollout" color="#fb923c" />
          </View>
        </FadeIn>

        {/* ── Closing ────────────────────────────────────────── */}
        <FadeIn delay={500}>
          <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
            <View style={{
              backgroundColor: "rgba(10,18,36,0.9)", borderRadius: 22,
              borderWidth: 1, borderColor: "rgba(56,189,248,0.18)",
              overflow: "hidden", alignItems: "center", padding: 28,
            }}>
              <View style={{ height: 2.5, position: "absolute", top: 0, left: 0, right: 0, backgroundColor: "#38bdf8", opacity: 0.5 }} />

              {/* LV logo big */}
              <View style={{
                width: 56, height: 56, borderRadius: 16,
                backgroundColor: "rgba(56,189,248,0.1)",
                borderWidth: 1.5, borderColor: "rgba(56,189,248,0.3)",
                alignItems: "center", justifyContent: "center", marginBottom: 16,
                shadowColor: "#38bdf8", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 16,
              }}>
                <Text style={{ color: "#38bdf8", fontSize: 20, fontWeight: "900", letterSpacing: -1 }}>LV</Text>
              </View>

              <Text style={{ color: "#f1f5f9", fontSize: 20, fontWeight: "800", letterSpacing: -0.4, textAlign: "center", marginBottom: 8 }}>
                Lan Vector 
              </Text>
              <Text style={{ color: "#38bdf8", fontSize: 13, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
                Vector AI Team
              </Text>
              <View style={{ width: 40, height: 1, backgroundColor: "rgba(56,189,248,0.3)", marginBottom: 12 }} />
              <Text style={{ color: "#475569", fontSize: 13, textAlign: "center", lineHeight: 20, fontStyle: "italic" }}>
                Bridging Voices. Connecting Worlds.
              </Text>
            </View>
          </View>
        </FadeIn>

      </ScrollView>
    </StyledSafeArea>
  );
}