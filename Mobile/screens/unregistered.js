import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient"; 
import { useTheme } from "../components/ThemeContext";
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_RENDER_BACKEND_URL = "https://childtrack-backend.onrender.com";
const BACKEND_URL = DEFAULT_RENDER_BACKEND_URL.replace(/\/$/, "");
const PARENTS_ENDPOINT = `${BACKEND_URL}/api/parents/parents/`;
const ALL_TEACHERS_ENDPOINT = `${BACKEND_URL}/api/parents/all-teachers-students/`;
const GUARDIAN_ENDPOINT = `${BACKEND_URL}/api/guardian/`;
const GUARDIAN_PUBLIC_ENDPOINT = `${BACKEND_URL}/api/guardian/public/`;

const Unregistered = ({ navigation }) => {
  const { darkModeEnabled } = useTheme();
  const isDark = darkModeEnabled;

  const [unregisteredList, setUnregisteredList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

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

  const fetchParentRecords = async () => {
    const token = await AsyncStorage.getItem('token');
    const storedParentRaw = await AsyncStorage.getItem('parent');

    let storedParent = null;
    if (storedParentRaw) {
      try {
        storedParent = JSON.parse(storedParentRaw);
      } catch (parseErr) {
        console.warn("[Unregistered] Failed parsing stored parent data", parseErr);
      }
    }

    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Token ${token}`;

    let parentRecords = [];
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
        console.warn("[Unregistered] primary parents fetch failed", primaryErr);
        try {
          const fallbackRes = await fetch(ALL_TEACHERS_ENDPOINT, { headers });
          if (!fallbackRes.ok) throw new Error(`Fallback HTTP ${fallbackRes.status}`);
          const fallbackPayload = await fallbackRes.json();
          parentRecords = extractParentsFromTeachers(fallbackPayload);
        } catch (fallbackErr) {
          console.warn("[Unregistered] fallback parents fetch failed", fallbackErr);
        }
      }
    }

    if (!parentRecords.length && storedParent) {
      parentRecords = [storedParent];
    }

    return parentRecords;
  };

  const guardianMatchesStudent = (guardian, studentNamesSet) => {
    if (!studentNamesSet || !studentNamesSet.size) return true;
    const normalizedStudent = (guardian.student_name || "").trim().toLowerCase();
    return normalizedStudent ? studentNamesSet.has(normalizedStudent) : false;
  };

  const buildStudentNamesSet = (parentRecords) => {
    const set = new Set();
    parentRecords.forEach((record) => {
      const name = (record?.student_name || "").trim().toLowerCase();
      if (name) set.add(name);
    });
    return set;
  };

  const loadUnregistered = async ({ skipLoading = false } = {}) => {
    let isMounted = true;
    if (!skipLoading) {
      setLoading(true);
      setError(null);
    }
    try {
      const token = await AsyncStorage.getItem('token');
      const parentRecords = await fetchParentRecords();
      const studentNamesSet = buildStudentNamesSet(parentRecords);

      let guardians = [];
      const endpointChain = [];
      if (token) {
        endpointChain.push({
          url: GUARDIAN_ENDPOINT,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
        });
      }
      endpointChain.push({
        url: GUARDIAN_PUBLIC_ENDPOINT,
        headers: { "Content-Type": "application/json" },
      });

      let lastError = null;
      for (const entry of endpointChain) {
        try {
          const resp = await fetch(entry.url, { headers: entry.headers });
          if (!resp.ok) throw new Error(`Guardian HTTP ${resp.status}`);
          let payload = await resp.json();
          if (Array.isArray(payload)) {
            guardians = payload;
          } else if (payload && Array.isArray(payload.results)) {
            guardians = payload.results;
          } else {
            guardians = [];
          }
          break;
        } catch (fetchErr) {
          lastError = fetchErr;
          guardians = [];
        }
      }

      if (!guardians.length && lastError) {
        throw lastError;
      }

      const mapped = guardians
        .filter((g) => g && guardianMatchesStudent(g, studentNamesSet))
        .map((g) => ({
          id: g.id,
          name: g.name || "Unnamed Guardian",
          relation: g.relationship || "Guardian",
          studentName: g.student_name || "Unknown student",
          reason: g.contact ? `Contact: ${g.contact}` : "Awaiting approval",
        }));

      setUnregisteredList(mapped);
      setError(mapped.length ? null : "No unregistered guardians.");
    } catch (err) {
      console.warn("Failed loading guardians", err);
      setError(err.message || "Failed to load guardians");
      setUnregisteredList([]);
    } finally {
      if (isMounted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      await loadUnregistered();
      mounted = false;
    })();
    return () => { mounted = false };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUnregistered({ skipLoading: true });
  };

  const performGuardianAction = async (guardianId, { method = "DELETE", body } = {}) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error("Teacher authentication required.");

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    };

    const response = await fetch(`${GUARDIAN_ENDPOINT}${guardianId}/`, {
      method,
      headers,
      body,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || `HTTP ${response.status}`);
    }
  };

  const handleAllow = async (item) => {
    setProcessingId(item.id);
    try {
      await performGuardianAction(item.id, {
        method: "PATCH",
        body: JSON.stringify({
          relationship:
            item.relation && !item.relation.toLowerCase().includes("authorized")
              ? `${item.relation} (Authorized)`
              : item.relation || "Authorized Guardian",
        }),
      });
      Alert.alert("Success", "Guardian approved and removed from the queue.");
      setUnregisteredList((prev) =>
        prev.filter((guardian) => String(guardian.id) !== String(item.id))
      );
    } catch (err) {
      console.warn("Failed to authorize guardian", err);
      Alert.alert("Error", err.message || "Failed to allow guardian");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (item) => {
    setProcessingId(item.id);
    try {
      await performGuardianAction(item.id, { method: "DELETE" });
      Alert.alert("Removed", "Guardian request rejected successfully.");
      setUnregisteredList((prev) =>
        prev.filter((guardian) => String(guardian.id) !== String(item.id))
      );
    } catch (err) {
      console.warn("Failed to remove guardian", err);
      Alert.alert("Error", err.message || "Failed to reject guardian");
    } finally {
      setProcessingId(null);
    }
  };

  const renderItem = ({ item }) => (
    <View
      style={[
        styles.card,
        { backgroundColor: isDark ? "#1e1e1e" : "#fff" },
      ]}
    >
      <Ionicons name="person-circle-outline" size={40} color="#3498db" />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.name, { color: isDark ? "#fff" : "#333" }]}>
          {item.name}
        </Text>
        <Text style={[styles.relation, { color: isDark ? "#bbb" : "#666" }]}>
          {item.relation} • {item.studentName}
        </Text>
        <Text style={[styles.reason, { color: isDark ? "#aaa" : "#777" }]}>
          {item.reason}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.allowButton}
          onPress={() => handleAllow(item)}
          disabled={processingId === item.id}
        >
          <Text style={styles.allowText}>
            {processingId === item.id ? "Processing..." : "Allow"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => handleReject(item)}
          disabled={processingId === item.id}
        >
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>
      </View>
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
            if (navigation.canGoBack && navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('home');
            }
          }}
        />
        <Text style={[styles.headerTitle, { color: isDark ? "#fff" : "#333" }]}>
          Unregistered Guardians
        </Text>
      </View>

      {loading ? (
        <View style={{ padding: 16 }}>
          <Text style={{ color: isDark ? '#fff' : '#333' }}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={unregisteredList}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={() => (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: isDark ? '#ddd' : '#555', textAlign: 'center' }}>
                {error ? error : 'No unregistered guardians.'}
              </Text>
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={isDark ? '#fff' : '#333'}
              colors={[isDark ? '#fff' : '#333']}
              progressBackgroundColor={isDark ? '#111' : '#fff'}
            />
          }
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
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  name: { fontSize: 16, fontWeight: "600" },
  relation: { fontSize: 14 },
  reason: { fontSize: 13, marginTop: 4 },
  actions: { flexDirection: "row", marginLeft: 12 },
  allowButton: {
    backgroundColor: "green",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  allowText: { color: "#fff", fontWeight: "bold" },
  rejectButton: {
    backgroundColor: "red",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  rejectText: { color: "#fff", fontWeight: "bold" },
});

export default Unregistered;
