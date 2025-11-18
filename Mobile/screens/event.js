import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../components/ThemeContext";
import { BACKEND_URL } from "../config";

const Events = ({ navigation }) => {
  const { darkModeEnabled } = useTheme();
  const isDark = darkModeEnabled;

  // Use same color strategy as schedule: deterministic palette or single color
  const USE_SINGLE_COLOR = false; // set to true to force one color for all events
  const SINGLE_COLOR = '#1f77b4';
  const PALETTE = ['#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b','#e377c2','#7f7f7f'];

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

  const pickColor = (key) => {
    if (USE_SINGLE_COLOR) return SINGLE_COLOR;
    // namespace the key so events differ from schedules/notifications
    const seededKey = `event:${String(key || '')}`;
    const seed = Math.abs(hashStringToInt(seededKey));
    const rnd = mulberry32(seed)();
    const idx = Math.floor(rnd * PALETTE.length);
    return PALETTE[idx];
  };

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadEvents = async () => {
      try {
        // Use API endpoint (don't use admin URL — it returns HTML)
        const resp = await fetch(`${BACKEND_URL}/api/event/`);
        const respData = await resp.json();
        console.log('events resp:', respData);

        let data = respData;
        // handle paginated DRF responses
        if (data && data.results) data = data.results;
        if (!Array.isArray(data)) data = [];

        if (mounted) {
          if (Array.isArray(data) && data.length) {
            setEvents(
              data.map((e, ix) => ({
                id: e.id ? String(e.id) : String(ix + 1),
                title: e.title || e.name || 'Event',
                date: e.date || e.start_date || '',
                description: e.description || '',
                icon: e.icon || 'calendar',
                color: pickColor(e.id || e.title || ix),
              }))
            );
          } else {
            setEvents([]);
          }
          setLoading(false);
        }
      } catch (err) {
        console.warn('Failed to fetch events, using fallback', err);
        if (mounted) {
          setError('Could not load events');
          setEvents([]);
          setLoading(false);
        }
      }
    }

    loadEvents();

    return () => { mounted = false };
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isDark ? "#1e2633" : "#ffffff",
          borderColor: isDark ? "#2d3748" : "#e1e4e8",
          borderWidth: 1,
        },
      ]}
      onPress={() => navigation.navigate("EventDetails", { event: item })}
    >
      <View>
        <View style={[styles.banner, { backgroundColor: item.color }] }>
          <Ionicons name={item.icon} size={24} color="#fff" style={styles.icon} />
          <Text style={styles.bannerText}>{item.title}</Text>
        </View>
        <View style={styles.details}>
          <Text style={[styles.date, { color: isDark ? "#a0aec0" : "#555" }]}>📅 {item.date}</Text>
          <Text style={[styles.description, { color: isDark ? "#cbd5e0" : "#666" }]} numberOfLines={2}>{item.description}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={isDark ? ["#0b0f19", "#1a1f2b"] : ["#f5f5f5", "#ffffff"]}
      style={styles.container}
    >
      {/* Header (same style as Attendance) */}
      <View
        style={[
          styles.header,
          { borderBottomColor: isDark ? "#333" : "#ddd" },
        ]}
      >
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
        <Text
          style={[styles.headerTitle, { color: isDark ? "#fff" : "#333" }]}
        >
          Events
        </Text>
      </View>

      {/* Event List */}
      {loading ? (
        <View style={{ padding: 16 }}>
          <Text style={{ color: isDark ? '#fff' : '#333' }}>Loading events…</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={{ padding: 16 }}>
              <Text style={{ color: isDark ? '#fff' : '#333' }}>{error ? error : 'No events found'}</Text>
            </View>
          )}
        />
      )}
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
    marginTop: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  bannerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  details: {
    padding: 12,
  },
  icon: {
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    lineHeight: 18,
  },
});

export default Events;
