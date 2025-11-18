import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import { LinearGradient } from "expo-linear-gradient"; // ✅ Added gradient
import { useTheme } from "../components/ThemeContext";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from "../config";

const Attendance = ({ navigation }) => {
  const { darkModeEnabled } = useTheme();
  const isDark = darkModeEnabled;
  const [markedDates, setMarkedDates] = useState({});
  const [loading, setLoading] = useState(true);
  const [attDataState, setAttDataState] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
  // School year boundaries (SY 2025-2026)
  const SY_START = new Date(2025, 5, 16); // June 16, 2025 (month is 0-based)
  const SY_END = new Date(2026, 2, 31); // March 31, 2026

  const buildMarkedForMonth = (attData, year, month) => {
    const map = {};
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();

    const recordsForMonth = (attData || []).filter(a => {
      if (!a || !a.date) return false;
      const [y, m] = a.date.split('-').map(Number);
      return y === year && m === month;
    });

    // Default: for any day that is <= today (past and present), mark absent by default
    // Future days are not auto-marked. Records (present/absent/other) will override defaults.
    for (let d = 1; d <= daysInMonth; d++) {
      const dd = String(d).padStart(2, '0');
      const mm = String(month).padStart(2, '0');
      const key = `${year}-${mm}-${dd}`;
      const dateObj = new Date(year, month - 1, d);
      const dayOfWeek = dateObj.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // skip weekends
      if (dateObj < SY_START || dateObj > SY_END) continue; // outside school year

      // only default-mark days that are not in the future
      if (dateObj <= today) {
        map[key] = {
          customStyles: {
            container: { backgroundColor: 'red', borderRadius: 8 },
            text: { color: 'white', fontWeight: 'bold' },
          },
        };
      }
    }

    // Override with actual records (present/absent/other)
    recordsForMonth.forEach(a => {
      const date = a.date; if (!date) return;
      const status = a.status || 'present';
      const color = status === 'present' ? 'green' : (status === 'absent' ? 'red' : 'orange');
      map[date] = {
        customStyles: {
          container: { backgroundColor: color, borderRadius: 8 },
          text: { color: 'white', fontWeight: 'bold' },
        },
      };
    });

    return map;
  };

  useEffect(() => {
    let isMounted = true;

    

    const loadAttendance = async () => {
      try {
        const username = await AsyncStorage.getItem('username');
        if (!username) {
          if (isMounted) setLoading(false);
          return;
        }

        // find parent by username
        const parentsResp = await fetch(`${BACKEND_URL}/api/parent/`);
        const parentsData = await parentsResp.json();
        const parent = Array.isArray(parentsData)
          ? parentsData.find(p => p.username === username)
          : (parentsData && parentsData.results ? parentsData.results.find(p => p.username === username) : null);

        if (!parent) {
          if (isMounted) setLoading(false);
          return;
        }

        // get student id for this parent
        const studentsResp = await fetch(`${BACKEND_URL}/api/student/`);
        let studentsData = await studentsResp.json();
        if (studentsData && studentsData.results) studentsData = studentsData.results;
        if (!Array.isArray(studentsData)) studentsData = [];

        const student = studentsData.find(s => {
          if (!s) return false;
          const sParent = s.parent;
          if (sParent == null) return false;
          if (typeof sParent === 'object') return (sParent.id === parent.id || sParent === parent.id);
          return sParent === parent.id;
        });

        if (!student) {
          if (isMounted) setLoading(false);
          return;
        }

        // fetch attendance for this student (no date filter)
        const attResp = await fetch(`${BACKEND_URL}/api/attendance/?student=${student.id}`);
        let attData = await attResp.json();
        if (attData && attData.results) attData = attData.results;
        if (!Array.isArray(attData)) attData = [];

        const map = buildMarkedForMonth(attData, currentMonth.year, currentMonth.month);

        if (isMounted) {
          setAttDataState(attData);
          setMarkedDates(map);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Failed to load attendance', err);
        if (isMounted) setLoading(false);
      }
    };

    loadAttendance();

    return () => { isMounted = false };
  }, []);

  // when month changes in the calendar, rebuild markedDates for that month
  const onMonthChange = async (monthObj) => {
    const { year, month } = monthObj;
    setCurrentMonth({ year, month });

    // attempt to re-use already fetched attendance by calling the same endpoint again
    setLoading(true);
    try {
      const username = await AsyncStorage.getItem('username');
      if (!username) {
        setLoading(false);
        return;
      }
      const parentsResp = await fetch(`${BACKEND_URL}/api/parent/`);
      const parentsData = await parentsResp.json();
      const parent = Array.isArray(parentsData)
        ? parentsData.find(p => p.username === username)
        : (parentsData && parentsData.results ? parentsData.results.find(p => p.username === username) : null);
      if (!parent) { setLoading(false); return; }

      const studentsResp = await fetch(`${BACKEND_URL}/api/student/`);
      let studentsData = await studentsResp.json();
      if (studentsData && studentsData.results) studentsData = studentsData.results;
      if (!Array.isArray(studentsData)) studentsData = [];
      const student = studentsData.find(s => {
        if (!s) return false;
        const sParent = s.parent;
        if (sParent == null) return false;
        if (typeof sParent === 'object') return (sParent.id === parent.id || sParent === parent.id);
        return sParent === parent.id;
      });
      if (!student) { setLoading(false); return; }

      const attResp = await fetch(`${BACKEND_URL}/api/attendance/?student=${student.id}`);
      let attData = await attResp.json();
      if (attData && attData.results) attData = attData.results;
      if (!Array.isArray(attData)) attData = [];

      // reuse shared builder so past months w/ no records are auto-marked absent
      const map = buildMarkedForMonth(attData, year, month);
      setAttDataState(attData);
      setMarkedDates(map);
    } catch (e) {
      console.warn('Failed to load month attendance', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={isDark ? ["#0b0f19", "#1a1f2b"] : ["#f5f5f5", "#e0e0e0"]}
      style={styles.container}
    >
      {/* Header */}
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
        <Text style={[styles.headerTitle, { color: isDark ? "#fff" : "#333" }]}>
          Attendance
        </Text>
      </View>

      {/* Calendar */}
      <View
        style={[
          styles.card,
          { backgroundColor: isDark ? "#1e1e1e" : "#fff" },
        ]}
      >
        <Calendar
          markingType={"custom"}
          markedDates={markedDates}
          onMonthChange={onMonthChange}
          theme={{
            backgroundColor: isDark ? "#1e1e1e" : "#fff",
            calendarBackground: isDark ? "#1e1e1e" : "#fff",
            dayTextColor: isDark ? "#fff" : "#000",
            monthTextColor: isDark ? "#fff" : "#000",
            todayTextColor: "#3498db",
            arrowColor: "#3498db",
          }}
        />
      </View>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <View
          style={[
            styles.legendCard,
            { backgroundColor: isDark ? "#1e1e1e" : "#fff" },
          ]}
        >
          <View style={[styles.dot, { backgroundColor: "green" }]} />
          <Text style={{ color: isDark ? "#fff" : "#333" }}>Present</Text>
        </View>
        <View
          style={[
            styles.legendCard,
            { backgroundColor: isDark ? "#1e1e1e" : "#fff" },
          ]}
        >
          <View style={[styles.dot, { backgroundColor: "red" }]} />
          <Text style={{ color: isDark ? "#fff" : "#333" }}>Absent</Text>
        </View>
      </View>
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
    margin: 16,
    borderRadius: 16,
    padding: 10,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
    paddingHorizontal: 20,
  },
  legendCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
});

export default Attendance;
