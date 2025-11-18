import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient"; 
import { useTheme } from "../components/ThemeContext";
import AsyncStorage from '@react-native-async-storage/async-storage';


const Unregistered = ({ navigation }) => {
  const { darkModeEnabled } = useTheme();
  const isDark = darkModeEnabled;

  const [unregisteredList, setUnregisteredList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadUnregistered = async () => {
      try {
        const username = await AsyncStorage.getItem('username');
        let studentId = null;

        if (username) {
          const parentsResp = await fetch(`${BACKEND_URL}/api/parent/`);
          const parentsData = await parentsResp.json();
          const parent = Array.isArray(parentsData)
            ? parentsData.find(p => p.username === username)
            : (parentsData && parentsData.results ? parentsData.results.find(p => p.username === username) : null);

          if (parent) {
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

        const resp = await fetch(`${BACKEND_URL}/api/guardian/`);
        let data = await resp.json();
        if (data && data.results) data = data.results;
        if (!Array.isArray(data)) data = [];

        const filtered = data.filter(g => {
          if (!g) return false;
          if (g.authorized) return false;
          if (!studentId) return true;
          const gStudent = g.student;
          if (!gStudent) return false;
          if (typeof gStudent === 'object') return (gStudent.id === studentId || gStudent === studentId);
          return gStudent === studentId;
        });

        if (isMounted) {
          setUnregisteredList(filtered);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Failed loading guardians', err);
        if (isMounted) {
          setError('Failed to load guardians');
          setLoading(false);
        }
      }
    };

    loadUnregistered();
    return () => { isMounted = false };
  }, []);

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
          {item.relation}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.allowButton}
          onPress={async () => {
            try {
                      await fetch(`${BACKEND_URL}/api/guardian/${item.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ authorized: true }),
              });
              setUnregisteredList(prev => prev.filter(g => String(g.id) !== String(item.id)));
            } catch (err) {
              console.warn('Failed to authorize guardian', err);
              Alert.alert('Error', 'Failed to allow guardian');
            }
          }}
        >
          <Text style={styles.allowText}>Allow</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={async () => {
            try {
              await fetch(`${BACKEND_URL}/api/guardian/${item.id}/`, { method: 'DELETE' });
              setUnregisteredList(prev => prev.filter(g => String(g.id) !== String(item.id)));
            } catch (err) {
              console.warn('Failed to remove guardian', err);
              Alert.alert('Error', 'Failed to reject guardian');
            }
          }}
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
          Unregistered Guardians
        </Text>
      </View>

      {/* List */}
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
              <Text style={{ color: isDark ? '#ddd' : '#555' }}>{error ? error : 'No unregistered guardians.'}</Text>
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
  actions: { flexDirection: "row" },
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
  // small spacing to keep action buttons from crowding
  actionsSpacing: {
    marginLeft: 8,
  },
});

export default Unregistered;
