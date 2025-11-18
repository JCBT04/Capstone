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
import { BACKEND_URL } from "../config";

const Authorized = ({ navigation }) => {
  const { darkModeEnabled } = useTheme();
  const isDark = darkModeEnabled;

  // API URL (can be a full path accidentally pointing to the admin list page).
  // The code below will normalize common mistaken URLs like
  // "http://127.0.0.1:8000/admin/api/authorizedguardian/" into
  // the proper API endpoint: "/api/authorized-guardians/".
  // Adjust this value for your environment if needed.
  // - Android emulator: use http://10.0.2.2:8000
  // - iOS simulator: use http://localhost:8000
  // - Physical device: use your machine IP, e.g. http://192.168.1.10:8000
  const RAW_API_URL = `${BACKEND_URL}/admin/api/authorizedguardian/`;

  const buildApiEndpoint = (raw) => {
    if (!raw) return `${BACKEND_URL}/api/authorized-guardians/`;
    try {
      // remove any trailing path after the host (including /admin/...)
      const m = raw.match(/^(https?:\/\/[^/]+)/);
      const host = m ? m[1] : raw.replace(/\/$/, '');
      return `${host}/api/authorized-guardians/`;
    } catch (e) {
      return `${BACKEND_URL}/api/authorized-guardians/`;
    }
  };

  const API_ENDPOINT = buildApiEndpoint(RAW_API_URL);

  const [authorizedGuardians, setAuthorizedGuardians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAuthorized = async () => {
    try {
      const res = await fetch(API_ENDPOINT);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAuthorizedGuardians(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.warn("Failed to fetch authorized guardians:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAuthorized();
  }, []);

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
      </View>
      <Ionicons name="checkmark-circle" size={28} color="#2ecc71" />
    </View>
  );

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
          Authorized Guardians
        </Text>
      </View>

      {/* List */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#2ecc71" />
        </View>
      ) : (
        <FlatList
          data={authorizedGuardians}
          renderItem={renderItem}
          keyExtractor={(item) => (item.id ? String(item.id) : Math.random().toString())}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAuthorized(); }} />}
          ListEmptyComponent={() => (
            <View style={{ padding: 16, alignItems: 'center' }}>
              <Text style={{ color: isDark ? '#bbb' : '#666' }}>No authorized guardians found.</Text>
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
