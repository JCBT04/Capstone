import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient"; 
import { useTheme } from "../components/ThemeContext";
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_RENDER_BACKEND_URL = "https://capstone-foal.onrender.com";
const BACKEND_URL = DEFAULT_RENDER_BACKEND_URL.replace(/\/$/, "");
const PARENT_GUARDIAN_ENDPOINT = `${BACKEND_URL}/api/guardian/parent/`;

const Unregistered = ({ navigation }) => {
  const { darkModeEnabled } = useTheme();
  const isDark = darkModeEnabled;

  const [unregisteredList, setUnregisteredList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadUnregistered = async ({ skipLoading = false } = {}) => {
    if (!skipLoading) {
      setLoading(true);
      setError(null);
    }
    
    try {
      const parentData = await AsyncStorage.getItem('parent');
      
      if (!parentData) {
        setError("Please log in first.");
        setUnregisteredList([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const parent = JSON.parse(parentData);
      const parentId = parent.id;

      // Fetch from parent-specific endpoint with parent_id
      const response = await fetch(`${PARENT_GUARDIAN_ENDPOINT}?parent_id=${parentId}`, {
        method: 'GET',
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const guardians = Array.isArray(data) ? data : (data.results || []);

      // Map backend data to frontend format
      const mapped = guardians
        .map((g) => {
          // Use photo_url from serializer, fallback to photo field
          let photoUri = null;
          if (g.photo_url) {
            photoUri = g.photo_url;
          } else if (g.photo) {
            photoUri = g.photo.startsWith("http") ? g.photo : `${BACKEND_URL}${g.photo}`;
          }

          return {
            id: g.id,
            name: g.name || "Unnamed Guardian",
            relation: g.relationship || "Guardian",
            studentName: g.student_name || "Unknown student",
            reason: g.contact ? `Contact: ${g.contact}` : "Awaiting approval",
            photo: photoUri,
            age: g.age,
            address: g.address,
            status: g.status,
          };
        });

      setUnregisteredList(mapped);
      setError(mapped.length ? null : "No pending guardian requests.");
    } catch (err) {
      console.warn("Failed loading guardians", err);
      setError(err.message || "Failed to load guardians");
      setUnregisteredList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUnregistered();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUnregistered({ skipLoading: true });
  };

  const handleAllow = async (item) => {
    setProcessingId(item.id);
    try {
      const parentData = await AsyncStorage.getItem('parent');
      if (!parentData) {
        Alert.alert("Error", "Please log in first.");
        setProcessingId(null);
        return;
      }

      const parent = JSON.parse(parentData);
      const parentId = parent.id;

      console.log(`[Allow] Updating guardian ${item.id} to 'allowed' status`);

      // Use PATCH for partial update (only status field)
      const response = await fetch(`${PARENT_GUARDIAN_ENDPOINT}${item.id}/?parent_id=${parentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: 'allowed',
        }),
      });

      const responseData = await response.text();
      console.log(`[Allow] Response status: ${response.status}`);
      console.log(`[Allow] Response data:`, responseData);

      if (!response.ok) {
        throw new Error(responseData || `HTTP ${response.status}`);
      }

      Alert.alert("Success", "Guardian approved successfully!");
      
      // Remove from list
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
    Alert.alert(
      "Confirm Rejection",
      "Do you want to decline this guardian request or delete it permanently?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Decline (Keep Record)",
          onPress: async () => {
            setProcessingId(item.id);
            try {
              const parentData = await AsyncStorage.getItem('parent');
              if (!parentData) {
                Alert.alert("Error", "Please log in first.");
                setProcessingId(null);
                return;
              }

              const parent = JSON.parse(parentData);
              const parentId = parent.id;

              console.log(`[Reject] Updating guardian ${item.id} to 'declined' status`);

              // Use PATCH to update status to 'declined'
              const response = await fetch(`${PARENT_GUARDIAN_ENDPOINT}${item.id}/?parent_id=${parentId}`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  status: 'declined',
                }),
              });

              const responseData = await response.text();
              console.log(`[Reject] Response status: ${response.status}`);
              console.log(`[Reject] Response data:`, responseData);

              if (!response.ok) {
                throw new Error(responseData || `HTTP ${response.status}`);
              }

              Alert.alert("Declined", "Guardian request declined successfully.");
              
              // Remove from list
              setUnregisteredList((prev) =>
                prev.filter((guardian) => String(guardian.id) !== String(item.id))
              );
            } catch (err) {
              console.warn("Failed to decline guardian", err);
              Alert.alert("Error", err.message || "Failed to decline guardian");
            } finally {
              setProcessingId(null);
            }
          }
        },
        {
          text: "Delete Permanently",
          style: "destructive",
          onPress: async () => {
            setProcessingId(item.id);
            try {
              const parentData = await AsyncStorage.getItem('parent');
              if (!parentData) {
                Alert.alert("Error", "Please log in first.");
                setProcessingId(null);
                return;
              }

              const parent = JSON.parse(parentData);
              const parentId = parent.id;

              console.log(`[Delete] Deleting guardian ${item.id}`);

              const response = await fetch(`${PARENT_GUARDIAN_ENDPOINT}${item.id}/?parent_id=${parentId}`, {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                },
              });

              console.log(`[Delete] Response status: ${response.status}`);

              if (!response.ok) {
                const errorText = await response.text().catch(() => "");
                throw new Error(errorText || `HTTP ${response.status}`);
              }

              Alert.alert("Removed", "Guardian deleted permanently.");
              
              // Remove from list
              setUnregisteredList((prev) =>
                prev.filter((guardian) => String(guardian.id) !== String(item.id))
              );
            } catch (err) {
              console.warn("Failed to delete guardian", err);
              Alert.alert("Error", err.message || "Failed to delete guardian");
            } finally {
              setProcessingId(null);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View
      style={[
        styles.card,
        { backgroundColor: isDark ? "#1e1e1e" : "#fff" },
      ]}
    >
      {item.photo ? (
        <Image 
          source={{ uri: item.photo }} 
          style={styles.guardianPhoto}
          onError={(e) => console.log("Image load error:", e.nativeEvent.error)}
        />
      ) : (
        <View style={styles.guardianPhotoPlaceholder}>
          <Ionicons name="person-circle-outline" size={40} color="#3498db" />
        </View>
      )}
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
        <TouchableOpacity onPress={() => {
          if (navigation.canGoBack && navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('home');
          }
        }}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={isDark ? "#fff" : "#333"}
          />
        </TouchableOpacity>
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
                {error || 'No pending guardian requests.'}
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
  guardianPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ccc',
  },
  guardianPhotoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Unregistered;