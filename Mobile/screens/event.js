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
import AsyncStorage from "@react-native-async-storage/async-storage";

const DEFAULT_RENDER_BACKEND_URL = "https://capstone-foal.onrender.com";
const BACKEND_URL = DEFAULT_RENDER_BACKEND_URL.replace(/\/$/, "");

const EVENTS_ENDPOINT = `${BACKEND_URL}/api/parents/events/`;
const PARENTS_ENDPOINT = `${BACKEND_URL}/api/parents/parents/`;

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

  const parseStoredParent = async () => {
    const storedParentRaw = await AsyncStorage.getItem("parent");
    if (!storedParentRaw) return null;
    try {
      return JSON.parse(storedParentRaw);
    } catch (err) {
      console.warn("[Events] failed parsing cached parent", err);
      return null;
    }
  };

  const parentSnapshot = (record) => {
    if (!record || typeof record !== "object") return null;
    const studentObj =
      record.student && typeof record.student === "object" ? record.student : null;
    return {
      parentId: record.id || record.parent || null,
      username: record.username || null,
      studentLrn: record.student_lrn || studentObj?.lrn || record.student || null,
      studentName: record.student_name || studentObj?.name || null,
    };
  };

  const determineParentContext = async () => {
    const storedParent = await parseStoredParent();
    if (storedParent) {
      const snapshot = parentSnapshot(storedParent);
      if (snapshot && (snapshot.parentId || snapshot.studentLrn || snapshot.studentName)) {
        return snapshot;
      }
    }

    const username = await AsyncStorage.getItem("username");
    if (!username) return null;

    const token = await AsyncStorage.getItem("token");
    if (!token) return null;

    try {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`,
      };
      const parentsResp = await fetch(PARENTS_ENDPOINT, { headers });
      if (!parentsResp.ok) throw new Error(`Parents HTTP ${parentsResp.status}`);
      let payload = await parentsResp.json();
      if (payload && payload.results) payload = payload.results;
      if (!Array.isArray(payload)) payload = [];
      const match = payload.find(
        (record) => record && record.username && record.username === username
      );
      if (match) return parentSnapshot(match);
    } catch (err) {
      console.warn("[Events] determineParentContext failed", err);
    }
    return null;
  };

  const buildEventsQuery = (context) => {
    if (!context) return EVENTS_ENDPOINT;
    const params = [];
    if (context.parentId) params.push(`parent=${encodeURIComponent(context.parentId)}`);
    if (context.studentLrn) params.push(`lrn=${encodeURIComponent(context.studentLrn)}`);
    return params.length ? `${EVENTS_ENDPOINT}?${params.join("&")}` : EVENTS_ENDPOINT;
  };

  const filterEventsByContext = (data, context) => {
    if (!context) return data;
    const parentId = context.parentId ? Number(context.parentId) : null;
    const studentLrn = context.studentLrn ? String(context.studentLrn).toLowerCase() : null;
    const studentName = context.studentName ? context.studentName.trim().toLowerCase() : null;

    return data.filter((event) => {
      if (!event) return false;

      const eventParent = (() => {
        if (event.parent == null) return null;
        if (typeof event.parent === "object") return event.parent.id ?? event.parent.pk ?? null;
        return event.parent;
      })();
      const parentMatches =
        parentId != null && eventParent != null && Number(eventParent) === parentId;

      const eventStudent = (() => {
        if (event.student == null) return null;
        if (typeof event.student === "object") {
          return {
            id: event.student.id ?? null,
            lrn: event.student.lrn ?? null,
            name: event.student.name ?? null,
          };
        }
        return event.student;
      })();

      const studentLrnCandidate =
        typeof eventStudent === "object"
          ? eventStudent.lrn || eventStudent.id || null
          : eventStudent;
      const studentNameCandidate =
        typeof eventStudent === "object" ? eventStudent.name || null : null;

      const lrnMatches =
        studentLrn &&
        studentLrnCandidate &&
        String(studentLrnCandidate).toLowerCase() === studentLrn;
      const nameMatches =
        studentName &&
        studentNameCandidate &&
        studentNameCandidate.trim().toLowerCase() === studentName;

      const hasParentContext = parentId != null;
      const hasStudentContext = Boolean(studentLrn || studentName);
      const studentMatches =
        (!studentLrn || lrnMatches) && (!studentName || nameMatches);

      if (!hasParentContext && !hasStudentContext) return true;
      if (hasParentContext && parentMatches) return true;
      if (hasStudentContext && studentMatches) return true;
      return false;
    });
  };

  useEffect(() => {
    let mounted = true;

    const loadEvents = async () => {
      try {
        const context = await determineParentContext();

        const token = await AsyncStorage.getItem("token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Token ${token}`;

        const query = buildEventsQuery(context);
        const resp = await fetch(query, { headers });
        if (!resp.ok) {
          throw new Error(`Events HTTP ${resp.status}`);
        }
        const respData = await resp.json();

        let data = respData;
        // handle paginated DRF responses
        if (data && data.results) data = data.results;
        if (!Array.isArray(data)) data = [];

        const filtered = filterEventsByContext(data, context);

        if (mounted) {
          if (Array.isArray(filtered) && filtered.length) {
            setEvents(
              filtered.map((e, ix) => ({
                id: e.id ? String(e.id) : String(ix + 1),
                title: e.title || e.name || 'Event',
                date: e.date || e.start_date || e.scheduled_at || '',
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
