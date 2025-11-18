import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient"; // ✅ Added gradient
import { useTheme } from "../components/ThemeContext";
import AsyncStorage from '@react-native-async-storage/async-storage';


const Schedule = ({ navigation }) => {
  const { darkModeEnabled } = useTheme();
  const isDark = darkModeEnabled;

  // Color strategy: set to true to make all schedule banners the same color.
  // If false, a deterministic palette is used so each schedule gets a consistent distinct color.
  const USE_SINGLE_COLOR = false; // change to true to force one color for all schedules
  const SINGLE_COLOR = '#8e44ad';
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
    // namespace the key so schedules produce different colors than events/notifications
    const seededKey = `schedule:${String(key || '')}`;
    const seed = Math.abs(hashStringToInt(seededKey));
    const rnd = mulberry32(seed)();
    const idx = Math.floor(rnd * PALETTE.length);
    return PALETTE[idx];
  };

  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSchedule = async () => {
      try {
        const username = await AsyncStorage.getItem('username');
        let studentId = null;

        if (username) {
          // find parent by username
          const parentsResp = await fetch(`${BACKEND_URL}/api/parent/`);
          const parentsData = await parentsResp.json();
          const parent = Array.isArray(parentsData)
            ? parentsData.find(p => p.username === username)
            : (parentsData && parentsData.results ? parentsData.results.find(p => p.username === username) : null);

          if (parent) {
            // fetch students and try to find a student for this parent
            const studentsResp = await fetch(`${BACKEND_URL}/api/student/`);
            let students = await studentsResp.json();
            if (students && students.results) students = students.results;
            if (!Array.isArray(students)) students = [];

            const student = students.find(s => {
              if (!s) return false;
              const sParent = s.parent;
              if (sParent == null) return false;
              if (typeof sParent === 'object') return (sParent.id === parent.id || sParent === parent.id);
              return sParent === parent.id;
            });

            if (student) studentId = student.id;
          }
        }

        // fetch schedules
        const resp = await fetch(`${BACKEND_URL}/api/schedule/`);
        let schedules = await resp.json();
        if (schedules && schedules.results) schedules = schedules.results;
        if (!Array.isArray(schedules)) schedules = [];

        // if we resolved a studentId, filter schedules for that student
        if (studentId) {
          schedules = schedules.filter(s => {
            if (!s) return false;
            const sStudent = s.student;
            if (sStudent == null) return false;
            if (typeof sStudent === 'object') return (sStudent.id === studentId || sStudent === studentId);
            return sStudent === studentId;
          });
        }

        const mapped = schedules.map(s => ({
          id: s.id,
          subject: s.subject || s.title || 'Subject',
          time: s.time || '',
          room: s.room || '',
          icon: s.icon || 'book-outline',
          // pick deterministic color based on schedule id (falls back to subject)
          color: pickColor(s.id || s.subject || s.time),
        }));

        if (isMounted) {
          setScheduleData(mapped);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Failed loading schedule', err);
        if (isMounted) {
          setScheduleData([]);
          setLoading(false);
        }
      }
    };

    loadSchedule();
    return () => { isMounted = false };
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: isDark ? "#1e1e1e" : "#fff" },
      ]}
      onPress={() => console.log("Open Schedule Details")}
    >
      {/* Subject Banner */}
      <View style={[styles.banner, { backgroundColor: item.color }]}>
        <Ionicons name={item.icon} size={24} color="#fff" />
        <Text style={styles.bannerText}>{item.subject}</Text>
      </View>

      {/* Details */}
      <View style={styles.details}>
        <Text style={[styles.time, { color: isDark ? "#bbb" : "#333" }]}>
          ⏰ {item.time}
        </Text>
        <Text style={[styles.room, { color: isDark ? "#ddd" : "#555" }]}>
          📍 {item.room}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={isDark ? ["#0b0f19", "#1a1f2b"] : ["#f5f5f5", "#e0e0e0"]}
      style={styles.container}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? "#333" : "#ddd" }]}>
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
          Student Schedule
        </Text>
      </View>

      {/* Schedule List */}
      <FlatList
        data={scheduleData}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={!loading ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: isDark ? '#ddd' : '#555' }}>No schedule found.</Text>
          </View>
        ) : null}
        showsVerticalScrollIndicator={false}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    marginBottom: 20,
    elevation: 4,
    overflow: "hidden",
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  bannerText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  details: {
    padding: 14,
  },
  time: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  room: {
    fontSize: 14,
  },
});

export default Schedule;
