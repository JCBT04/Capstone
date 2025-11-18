import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../components/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DEFAULT_RENDER_BACKEND_URL = "https://capstone-foal.onrender.com";
const BACKEND_URL = DEFAULT_RENDER_BACKEND_URL.replace(/\/$/, "");
const Notifications = ({ navigation }) => {
  const { darkModeEnabled } = useTheme();
  const isDark = darkModeEnabled;

  // Backend base URL is provided by centralized config

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Notification color strategy: single color or deterministic per-notification
  const USE_SINGLE_COLOR_NOTIF = false; // set true to force one color for all notifications
  const SINGLE_COLOR_NOTIF = '#3498db';
  const NOTIF_PALETTE = ['#e74c3c','#27ae60','#3498db','#9b59b6','#f39c12','#2ecc71'];

  const hashStringToInt = (str) => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
  };

  const mulberry32 = (a) => {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
  };

  const pickColorForNotif = (key) => {
    if (USE_SINGLE_COLOR_NOTIF) return SINGLE_COLOR_NOTIF;
    // namespace the key so notifications use a different mapping than events/schedules
    const seededKey = `notif:${String(key || '')}`;
    const seed = Math.abs(hashStringToInt(seededKey));
    const rnd = mulberry32(seed)();
    const idx = Math.floor(rnd * NOTIF_PALETTE.length);
    return NOTIF_PALETTE[idx];
  };

  useEffect(() => {
    let mounted = true;

    const fetchNotifications = async () => {
      try {
        const parentRaw = await AsyncStorage.getItem("parent");
        let query = "";
        if (parentRaw) {
          try {
            const parent = JSON.parse(parentRaw);
            if (parent && parent.id) {
              query = `?parent=${encodeURIComponent(parent.id)}`;
            }
          } catch (err) {
            console.warn("Failed to parse parent cache", err);
          }
        }

        const res = await fetch(`${BACKEND_URL}/api/notifications/${query}`);
        if (!res.ok) throw new Error('Network response not ok');
        const data = await res.json();
        if (!mounted) return;
        const TYPE_LABELS = { attendance: 'Attendance', pickup: 'Pickup', event: 'Event', other: 'Other' };

        const mapped = data.map((n) => ({
          id: String(n.id),
          type: n.type,
          typeLabel: TYPE_LABELS[n.type] || (n.type ? String(n.type).charAt(0).toUpperCase() + String(n.type).slice(1) : 'Other'),
          message: n.message,
          time: n.created_at ? new Date(n.created_at).toLocaleString() : '',
          // derive icon on the client side from the type
          icon: (n.type === 'attendance' ? 'alert-circle-outline' : n.type === 'pickup' ? 'person-circle-outline' : 'calendar-outline'),
          // compute deterministic color client-side (ignore persisted color)
          color: pickColorForNotif(n.id || n.type),
        }));
        setNotifications(mapped);
      } catch (err) {
        console.warn('Failed to load notifications:', err.message || err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchNotifications();
    return () => { mounted = false; };
  }, []);

  const renderItem = ({ item }) => (
    <LinearGradient
      colors={isDark ? ["#1e1e1e", "#121212"] : ["#ffffff", "#f4f6f9"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <Ionicons
        name={item.icon}
        size={32}
        color={item.color}
        style={styles.icon}
      />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <View style={[styles.badge, { backgroundColor: item.color }]}>
            <Text style={styles.badgeText}>{item.typeLabel}</Text>
          </View>
        </View>
        <Text style={[styles.message, { color: isDark ? "#fff" : "#333" }]}>
          {item.message}
        </Text>
        <Text style={[styles.time, { color: isDark ? "#bbb" : "#777" }]}>
          {item.time}
        </Text>
      </View>
    </LinearGradient>
  );

  return (
    <LinearGradient
      colors={isDark ? ['#0b0f19', '#1a1f2b'] : ['#f5f5f5', '#e0e0e0']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <Ionicons
          name="arrow-back"
          size={24}
          color={isDark ? "#fff" : "#333"}
          onPress={() => {
            if (navigation.canGoBack && navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('home');
            }
          }}
        />
        <Text style={[styles.headerTitle, { color: isDark ? "#fff" : "#333" }]}>
          Notifications
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    marginTop: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
  },
  icon: {
    marginRight: 12,
  },
  message: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default Notifications;
