import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../components/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DEFAULT_RENDER_BACKEND_URL = "https://capstone-foal.onrender.com";
const BACKEND_URL = DEFAULT_RENDER_BACKEND_URL.replace(/\/$/, "");
const PARENTS_ENDPOINT = `${BACKEND_URL}/api/parents/parents/`;
const PARENTS_PUBLIC_ENDPOINT = `${BACKEND_URL}/api/parents/parents/public/`;
const ALL_TEACHERS_ENDPOINT = `${BACKEND_URL}/api/parents/all-teachers-students/`;

const Authorized = ({ navigation }) => {
  const { darkModeEnabled } = useTheme();
  const isDark = darkModeEnabled;

  const [authorizedGuardians, setAuthorizedGuardians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const extractParentsFromTeachers = (payload) => {
    const teachersArray = Array.isArray(payload)
      ? payload
      : payload && Array.isArray(payload.results)
        ? payload.results
        : [];

    const aggregated = [];
    teachersArray.forEach((teacher) => {
      if (!teacher || typeof teacher !== "object") return;
      const students = Array.isArray(teacher.students) ? teacher.students : [];
      students.forEach((student) => {
        if (!student || typeof student !== "object") return;
        const parents = Array.isArray(student.parents_guardians)
          ? student.parents_guardians
          : [];
        parents.forEach((parent) => {
          if (parent) aggregated.push(parent);
        });
      });
    });
    return aggregated;
  };

  const parseStoredParent = async () => {
    const storedParentRaw = await AsyncStorage.getItem("parent");
    if (!storedParentRaw) return null;
    try {
      return JSON.parse(storedParentRaw);
    } catch (parseErr) {
      console.warn("Failed parsing stored parent data", parseErr);
      return null;
    }
  };

  const resolveStudentFilter = (record) => {
    if (!record || typeof record !== "object") return { lrn: null, studentName: null };
    const studentObj = record.student && typeof record.student === "object" ? record.student : null;
    const lrn = record.student_lrn || record.student || studentObj?.lrn || null;
    const studentName = record.student_name || studentObj?.name || null;
    return { lrn, studentName };
  };

  const fetchAuthorized = async ({ skipLoading = false } = {}) => {
    if (!skipLoading) setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem("token");
      const storedParent = await parseStoredParent();
      const username = await AsyncStorage.getItem("username");

      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Token ${token}`;

      let parentRecords = [];

      const { lrn: storedLrn, studentName: storedStudentName } = resolveStudentFilter(storedParent);

      if (token) {
        try {
          const res = await fetch(PARENTS_ENDPOINT, { headers });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          let payload = await res.json();
          if (Array.isArray(payload)) {
            parentRecords = payload;
          } else if (payload && Array.isArray(payload.results)) {
            parentRecords = payload.results;
          }
        } catch (primaryErr) {
          console.warn("[Authorized] primary parents fetch failed", primaryErr);
          const fallbackRes = await fetch(ALL_TEACHERS_ENDPOINT, { headers });
          if (!fallbackRes.ok) throw new Error(`Fallback HTTP ${fallbackRes.status}`);
          const fallbackPayload = await fallbackRes.json();
          parentRecords = extractParentsFromTeachers(fallbackPayload);
        }
      } else if (storedParent) {
        const params = [];
        if (storedLrn) params.push(`lrn=${encodeURIComponent(String(storedLrn))}`);
        else if (storedStudentName) params.push(`student=${encodeURIComponent(storedStudentName)}`);
        params.push(`role=${encodeURIComponent("Guardian")}`);
        const url = params.length
          ? `${PARENTS_PUBLIC_ENDPOINT}?${params.join("&")}`
          : `${PARENTS_PUBLIC_ENDPOINT}?role=Guardian`;
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Public parents HTTP ${res.status}`);
          const payload = await res.json();
          parentRecords = Array.isArray(payload) ? payload : [];
        } catch (publicErr) {
          console.warn("Public parents fetch failed, using cached guardian record", publicErr);
          parentRecords = [storedParent];
        }
      }

      if (!parentRecords.length && storedParent) {
        parentRecords = [storedParent];
      }

      const isTeacherSession = Boolean(token);
      const normalizedUsername = (username || "").trim().toLowerCase();

      const visibleRecords = isTeacherSession || !normalizedUsername
        ? parentRecords
        : parentRecords.filter((record) => {
            const recordUsername = (record?.username || "").trim().toLowerCase();
            if (recordUsername && recordUsername === normalizedUsername) return true;

            const candidateLrn =
              record?.student_lrn ||
              (typeof record?.student === "object" ? record.student?.lrn : record?.student) ||
              null;
            if (
              storedLrn &&
              candidateLrn &&
              String(candidateLrn).trim().toLowerCase() === String(storedLrn).trim().toLowerCase()
            ) {
              return true;
            }

            const candidateName =
              record?.student_name ||
              (typeof record?.student === "object" ? record.student?.name : null) ||
              null;
            if (
              storedStudentName &&
              candidateName &&
              candidateName.trim().toLowerCase() === storedStudentName.trim().toLowerCase()
            ) {
              return true;
            }
            return false;
          });

      const guardiansOnly = visibleRecords
        .filter((record) => record && typeof record === "object")
        .filter((record) => {
          const role = (record.role || "").toLowerCase();
          return role === "guardian" || role.includes("authorized");
        })
        .map((record) => ({
          id: record.id ?? record.username ?? Math.random().toString(36).slice(2),
          name: record.name || "Unnamed Guardian",
          relation: record.role || "Guardian",
          studentName: record.student_name || "",
          contactNumber: record.contact_number || "",
        }));

      setAuthorizedGuardians(guardiansOnly);
      setError(guardiansOnly.length ? null : "No authorized guardians found.");
    } catch (err) {
      console.warn("Failed to fetch authorized guardians:", err);
      setAuthorizedGuardians([]);
      setError("Unable to load authorized guardians.");
    } finally {
      if (!skipLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAuthorized(); }, []);

  const renderItem = ({ item }) => (
    <View
      style={[
        styles.card,
        { backgroundColor: isDark ? "#1e1e1e" : "#fff" },
      ]}
    >
      <Ionicons
        name="person-circle-outline"
        size={40}
        color="#2ecc71"
        style={styles.icon}
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: isDark ? "#fff" : "#333" }]}>
          {item.name}
        </Text>
        <Text style={[styles.relation, { color: isDark ? "#bbb" : "#777" }]}>
          Relation: {item.relation}
        </Text>
        {item.studentName ? (
          <Text style={[styles.relation, { color: isDark ? "#bbb" : "#777" }]}>
            Student: {item.studentName}
          </Text>
        ) : null}
      </View>
      <Ionicons name="checkmark-circle" size={28} color="#2ecc71" />
    </View>
  );

  return (
    <LinearGradient
      colors={isDark ? ["#0b0f19", "#1a1f2b"] : ["#f5f5f5", "#e0e0e0"]}
      style={styles.container}
    >
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
            if (navigation && navigation.canGoBack && navigation.canGoBack()) {
              navigation.goBack();
            } else if (navigation && navigation.navigate) {
              navigation.navigate('home');
            }
          }}
        />
        <Text style={[styles.headerTitle, { color: isDark ? "#fff" : "#333" }]}>
          Authorized Guardians
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#2ecc71" />
        </View>
      ) : (
        <FlatList
          data={authorizedGuardians}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchAuthorized({ skipLoading: true });
              }}
            />
          }
          ListEmptyComponent={() => (
            <View style={{ padding: 16, alignItems: 'center' }}>
              <Text style={{ color: isDark ? '#bbb' : '#666', textAlign: 'center' }}>
                {error ? error : 'No authorized guardians found.'}
              </Text>
            </View>
          )}
        />
      )}
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
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  icon: {
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  relation: {
    fontSize: 13,
  },
});

export default Authorized;
