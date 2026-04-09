import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";

const StyledSafeArea = styled(SafeAreaView);

// ── Team data ─────────────────────────────────────────────────────────────────
const TEAM = [
  { name: "Harshit Singh",      roll: "25110129" },
  { name: "Anish Patil",        roll: "25110222" },
  { name: "Om Malusare",        roll: "25110222" },
  { name: "Harshit Maida",      roll: "25110222" },
  { name: "Vaibhav Paliwal",    roll: "25110222" },
  { name: "Heruthik",           roll: "25110222" },
  { name: "Himanshu Raj",       roll: "25110131" },
  { name: "Shivnath Surnar",    roll: "25110294" },
  { name: "Trilok Shah",        roll: "25110222" },
  { name: "Rajpal",             roll: "25110222" },
  { name: "Prithviraj Poojari", roll: "25110222" },
  { name: "Mir Aftab Rahman",   roll: "25110222" },
];

// Initials from name
const getInitials = (name: string) => {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Deterministic accent color per index
const ACCENTS = [
  "#38bdf8", // sky
  "#a78bfa", // violet
  "#34d399", // emerald
  "#fb923c", // orange
  "#f472b6", // pink
  "#facc15", // amber
  "#38bdf8",
  "#a78bfa",
  "#34d399",
  "#fb923c",
  "#f472b6",
  "#facc15",
];

// ── Animated card ─────────────────────────────────────────────────────────────
const MemberCard = ({
  member,
  index,
  accent,
}: {
  member: { name: string; roll: string };
  index: number;
  accent: string;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        delay: index * 70,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 12,
        delay: index * 70,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const initials = getInitials(member.name);
  const isEven = index % 2 === 0;

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
        flex: 1,
        margin: 6,
      }}
    >
      <View
        style={{
          backgroundColor: "rgba(10,18,36,0.9)",
          borderRadius: 20,
          borderWidth: 1,
          borderColor: `${accent}28`,
          overflow: "hidden",
          shadowColor: accent,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          paddingBottom: 16,
        }}
      >
        {/* Top accent bar */}
        <View style={{ height: 2, backgroundColor: accent, opacity: 0.7 }} />

        {/* Avatar */}
        <View style={{ alignItems: "center", paddingTop: 20, paddingBottom: 12 }}>
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 29,
              backgroundColor: `${accent}18`,
              borderWidth: 1.5,
              borderColor: `${accent}50`,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: accent,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.4,
              shadowRadius: 10,
            }}
          >
            <Text
              style={{
                color: accent,
                fontSize: 18,
                fontWeight: "800",
                letterSpacing: 0.5,
              }}
            >
              {initials}
            </Text>
          </View>

          {/* Index badge */}
          <View
            style={{
              position: "absolute",
              top: 16,
              right: 12,
              backgroundColor: `${accent}18`,
              borderRadius: 8,
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderWidth: 1,
              borderColor: `${accent}30`,
            }}
          >
            <Text style={{ color: accent, fontSize: 9, fontWeight: "700" }}>
              #{String(index + 1).padStart(2, "0")}
            </Text>
          </View>
        </View>

        {/* Name */}
        <Text
          style={{
            color: "#f1f5f9",
            fontSize: 13,
            fontWeight: "700",
            textAlign: "center",
            letterSpacing: 0.1,
            paddingHorizontal: 8,
            marginBottom: 6,
          }}
          numberOfLines={2}
        >
          {member.name}
        </Text>

        {/* Roll divider */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            gap: 6,
            marginBottom: 2,
          }}
        >
          <View style={{ flex: 1, height: 1, backgroundColor: `${accent}20` }} />
        </View>

        {/* Roll no */}
        <Text
          style={{
            color: "#475569",
            fontSize: 11,
            fontWeight: "600",
            textAlign: "center",
            letterSpacing: 1.5,
            marginTop: 6,
          }}
        >
          {member.roll}
        </Text>
      </View>
    </Animated.View>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────
export default function TeamPage() {
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(headerSlide, { toValue: 0, tension: 55, friction: 11, useNativeDriver: true }),
    ]).start();
  }, []);

  // Pair members into rows of 2
  const rows: (typeof TEAM)[] = [];
  for (let i = 0; i < TEAM.length; i += 2) {
    rows.push(TEAM.slice(i, i + 2));
  }

  return (
    <StyledSafeArea style={{ flex: 1, backgroundColor: "#070d1a" }}>

      {/* ── Ambient blobs ─────────────────────────────────── */}
      <View style={{ position: "absolute", top: -80, left: -60, width: 280, height: 280, borderRadius: 140, backgroundColor: "#38bdf8", opacity: 0.05 }} />
      <View style={{ position: "absolute", top: "30%", right: -80, width: 260, height: 260, borderRadius: 130, backgroundColor: "#a78bfa", opacity: 0.05 }} />
      <View style={{ position: "absolute", bottom: 60, left: -50, width: 220, height: 220, borderRadius: 110, backgroundColor: "#34d399", opacity: 0.04 }} />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 110, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────── */}
        <Animated.View
          style={{
            opacity: headerFade,
            transform: [{ translateY: headerSlide }],
            alignItems: "center",
            marginBottom: 28,
            marginTop: 10,
          }}
        >
          {/* Decorative line + label */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: "rgba(56,189,248,0.2)" }} />
            <Text style={{ color: "#38bdf8", fontSize: 10, fontWeight: "700", letterSpacing: 3, textTransform: "uppercase" }}>
              Our Squad
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: "rgba(56,189,248,0.2)" }} />
          </View>

          <Text
            style={{
              color: "#f1f5f9",
              fontSize: 28,
              fontWeight: "800",
              letterSpacing: -0.8,
              textAlign: "center",
            }}
          >
            Meet the Team
          </Text>
          <Text style={{ color: "#334155", fontSize: 13, marginTop: 5, letterSpacing: 0.3 }}>
            {TEAM.length} members · Lan Vector Project
          </Text>

          {/* Stat pills */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            {[
              { label: "Members", value: `${TEAM.length}` },
              { label: "Project", value: "WOE" },
            ].map((stat) => (
              <View
                key={stat.label}
                style={{
                  backgroundColor: "rgba(56,189,248,0.07)",
                  borderWidth: 1,
                  borderColor: "rgba(56,189,248,0.18)",
                  borderRadius: 100,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Text style={{ color: "#38bdf8", fontSize: 13, fontWeight: "700" }}>{stat.value}</Text>
                <Text style={{ color: "#475569", fontSize: 12 }}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── Grid ────────────────────────────────────────── */}
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={{ flexDirection: "row", marginHorizontal: -6 }}>
            {row.map((member, colIdx) => {
              const globalIdx = rowIdx * 2 + colIdx;
              return (
                <MemberCard
                  key={member.name}
                  member={member}
                  index={globalIdx}
                  accent={ACCENTS[globalIdx % ACCENTS.length]}
                />
              );
            })}
            {/* If odd number, fill with empty flex to keep alignment */}
            {row.length === 1 && <View style={{ flex: 1, margin: 6 }} />}
          </View>
        ))}
      </ScrollView>
    </StyledSafeArea>
  );
}