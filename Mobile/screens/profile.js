import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  Button,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../components/ThemeContext";

const DEFAULT_RENDER_BACKEND_URL = "https://childtrack-backend.onrender.com";
const FALLBACK_RENDER_BACKEND_URLS = [
  DEFAULT_RENDER_BACKEND_URL,
  "https://childtrack-backend.onrender.com",
];
const BACKEND_URL = DEFAULT_RENDER_BACKEND_URL.replace(/\/$/, "");

const Profile = ({ navigation, route }) => {
  const { darkModeEnabled } = useTheme();
  const isDark = darkModeEnabled;

  // Profile state
  const [profile, setProfile] = useState({
    name: "",
    id: null,
    phone: "",
    address: "",
    username: "",
    image: null,
    must_change: false,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  const fetchParentsForUsername = async (username) => {
    const token = await AsyncStorage.getItem("token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Token ${token}`;

    try {
      const res = await fetch(`${BACKEND_URL}/api/parents/parents/`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      let parents = Array.isArray(data) ? data : (data && data.results ? data.results : []);
      parents = parents.filter((p) => p.username === username);
      if (parents.length) {
        await AsyncStorage.setItem("parent", JSON.stringify(parents[0]));
        return parents;
      }
    } catch (err) {
      console.warn("[Profile] Failed to fetch parents from API:", err?.message || err);
    }

    try {
      const storedParent = await AsyncStorage.getItem("parent");
      if (storedParent) {
        const parsed = JSON.parse(storedParent);
        if (parsed && parsed.username === username) {
          return [parsed];
        }
      }
    } catch (err) {
      console.warn("[Profile] Failed to read cached parent:", err?.message || err);
    }

    return [];
  };

  const fetchParent = async ({ skipLoading = false } = {}) => {
    if (!skipLoading) setLoading(true);
    try {
      const username = await AsyncStorage.getItem("username");
      if (!username) {
        if (mountedRef.current) setLoading(false);
        return;
      }

      const parents = await fetchParentsForUsername(username);
      if (!mountedRef.current) return;
      if (!parents.length) {
        setLoading(false);
        return;
      }

      const p = parents[0];
      const avatarUrl = p.avatar
        ? (p.avatar.startsWith("http") ? p.avatar : `${BACKEND_URL}${p.avatar}`)
        : null;

      if (mountedRef.current) {
        setProfile((prev) => ({
          ...prev,
          id: p.id || prev.id,
          name: p.name || prev.name,
          address: p.address || prev.address,
          username: p.username || prev.username,
          phone: p.contact_number || prev.phone,
          must_change: !!p.must_change_credentials,
          image: avatarUrl || prev.image,
        }));
        setLoading(false);
      }
    } catch (err) {
      console.warn("Failed to load parent profile:", err.message || err);
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchParent();
    // If routed here with forceChange, open edit modal automatically
    if (route && route.params && route.params.forceChange) {
      setModalVisible(true);
    }
    return () => { mountedRef.current = false; };
  }, []);

  const onRefresh = async () => {
    console.log('[Profile] onRefresh called');
    setRefreshing(true);
    await fetchParent({ skipLoading: true });
    setRefreshing(false);
  };

  const [modalVisible, setModalVisible] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Pick from gallery
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setProfile({ ...profile, image: result.assets[0].uri });
      setAvatarModalVisible(false);
    }
  };

  // Take a selfie
  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setProfile({ ...profile, image: result.assets[0].uri });
      setAvatarModalVisible(false);
    }
  };

  return (
    <LinearGradient
      colors={isDark ? ["#0b0f19", "#1a1f2b"] : ["#f5f5f5", "#e0e0e0"]}
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
          Profile
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#fff' : '#333'} colors={[isDark ? '#fff' : '#333']} progressBackgroundColor={isDark ? '#111' : '#fff'} />}>
        {/* Profile Card */}
        <View
          style={[
            styles.profileCard,
            { backgroundColor: isDark ? "#1e1e1e" : "#fff" },
          ]}
        >
          <TouchableOpacity onPress={() => setAvatarModalVisible(true)}>
            {profile.image ? (
              <Image source={{ uri: profile.image }} style={styles.avatar} />
            ) : (
              <View
                style={[
                  styles.avatarPlaceholder,
                  { backgroundColor: isDark ? "#333" : "#ddd" },
                ]}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={100}
                  color={isDark ? "#888" : "#555"}
                />
              </View>
            )}
          </TouchableOpacity>
          <Text style={[styles.name, { color: isDark ? "#fff" : "#333" }]}>
            {profile.name}
          </Text>
          {/* email removed - profile displays name and address only */}
        </View>

        {/* Info Section (order: username, contact, address) */}
        <View style={styles.infoSection}>
          <View style={[styles.infoItem, { backgroundColor: isDark ? "#1e1e1e" : "#fff" }]}>
            <Ionicons name="person-circle-outline" size={22} color="#8e44ad" />
            <Text style={[styles.infoText, { color: isDark ? "#fff" : "#333" }]}>Username: {profile.username}</Text>
          </View>

          <View style={[styles.infoItem, { backgroundColor: isDark ? "#1e1e1e" : "#fff" }]}>
            <Ionicons name="call-outline" size={22} color="#27ae60" />
          <Text style={[styles.infoText, { color: isDark ? "#fff" : "#333" }]}>Contact: {profile.phone || "No contact number"}
          </Text>
          </View>

          <View style={[styles.infoItem, { backgroundColor: isDark ? "#1e1e1e" : "#fff" }]}>
            <Ionicons name="home-outline" size={22} color="#2980b9" />
          <Text style={[styles.infoText, { color: isDark ? "#fff" : "#333" }]}>Address: {profile.address || "No address provided"}
          </Text>
          </View>
        </View>

        {/* Edit Profile Button */}
        <TouchableOpacity
          style={[
            styles.editButton,
            { backgroundColor: isDark ? "#3498db" : "#2980b9" },
          ]}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="create-outline" size={20} color="#fff" />
          <Text style={styles.editText}>Edit Profile</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: isDark ? "#2c2c2c" : "#fff" },
            ]}
          >
            <Text style={[styles.modalTitle, { color: isDark ? "#fff" : "#333" }]}>
              Edit Profile
            </Text>

            {/* Input rows with icons */}
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={20} color={isDark ? "#fff" : "#333"} />
              <TextInput
                style={[styles.input, { color: isDark ? "#fff" : "#000" }]}
                placeholder="Name"
                placeholderTextColor="#999"
                value={profile.name}
                onChangeText={(text) => setProfile({ ...profile, name: text })}
              />
            </View>

            {/* email removed */}

             <View style={styles.inputRow}>
              <Ionicons name="person-circle-outline" size={20} color={isDark ? "#fff" : "#333"} />
              <TextInput
                style={[styles.input, { color: isDark ? "#fff" : "#000" }]}
                placeholder="Username"
                placeholderTextColor="#999"
                value={profile.username}
                onChangeText={(text) => setProfile({ ...profile, username: text })}
              />
            </View>

            {/* Password change inputs (optional) */}
            {(profile.must_change || (route && route.params && route.params.forceChange)) && (
              <>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={20} color={isDark ? "#fff" : "#333"} />
                  <TextInput
                    style={[styles.input, { color: isDark ? "#fff" : "#000" }]}
                    placeholder="Current password (optional)"
                    placeholderTextColor="#999"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry={!showCurrentPassword}
                  />
                  <TouchableOpacity onPress={() => setShowCurrentPassword((s) => !s)} style={{ paddingHorizontal: 8 }}>
                    <Ionicons name={showCurrentPassword ? "eye" : "eye-off"} size={20} color={isDark ? "#fff" : "#333"} />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputRow}>
                  <Ionicons name="key-outline" size={20} color={isDark ? "#fff" : "#333"} />
                  <TextInput
                    style={[styles.input, { color: isDark ? "#fff" : "#000" }]}
                    placeholder="New password (required for first login)"
                    placeholderTextColor="#999"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                  />
                  <TouchableOpacity onPress={() => setShowNewPassword((s) => !s)} style={{ paddingHorizontal: 8 }}>
                    <Ionicons name={showNewPassword ? "eye" : "eye-off"} size={20} color={isDark ? "#fff" : "#333"} />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputRow}>
                  <Ionicons name="checkmark-done-outline" size={20} color={isDark ? "#fff" : "#333"} />
                  <TextInput
                    style={[styles.input, { color: isDark ? "#fff" : "#000" }]}
                    placeholder="Confirm new password"
                    placeholderTextColor="#999"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword((s) => !s)} style={{ paddingHorizontal: 8 }}>
                    <Ionicons name={showConfirmPassword ? "eye" : "eye-off"} size={20} color={isDark ? "#fff" : "#333"} />
                  </TouchableOpacity>
                </View>
              </>
            )}

            <View style={styles.inputRow}>
              <Ionicons name="call-outline" size={20} color={isDark ? "#fff" : "#333"} />
              <TextInput
                style={[styles.input, { color: isDark ? "#fff" : "#000" }]}
                placeholder="Phone"
                placeholderTextColor="#999"
                value={profile.phone}
                onChangeText={(text) => setProfile({ ...profile, phone: text })}
              />
            </View>

            <View style={styles.inputRow}>
              <Ionicons name="home-outline" size={20} color={isDark ? "#fff" : "#333"} />
              <TextInput
                style={[styles.input, { color: isDark ? "#fff" : "#000" }]}
                placeholder="Address"
                placeholderTextColor="#999"
                value={profile.address}
                onChangeText={(text) => setProfile({ ...profile, address: text })}
              />
            </View>

           

            <View style={styles.modalButtons}>
              <Button
                title={saving ? "Saving..." : "Save"}
                onPress={async () => {
                  if (saving) return;
                  if (!profile.id) {
                    console.warn("No parent id available to save");
                    return;
                  }
                  // Determine whether this save is part of a forced first-login change
                  const wasForced = !!((route && route.params && route.params.forceChange) || profile.must_change);

                  setSaving(true);
                  const token = await AsyncStorage.getItem("token");
                  const endpoints = [];
                  // Use the known correct parent detail endpoint and include reasonable fallbacks
                  // Preferred: /api/parents/<id>/ (defined in backend/parents/urls.py)
                  // Back-compat fallbacks: /api/parents/parent/<id>/ and /api/parent/<id>/
                  for (const base of FALLBACK_RENDER_BACKEND_URLS) {
                    const b = base.replace(/\/$/, "");
                    endpoints.push(`${b}/api/parents/${profile.id}/`);
                    endpoints.push(`${b}/api/parents/parent/${profile.id}/`);
                    endpoints.push(`${b}/api/parent/${profile.id}/`);
                  }

                  const PATCH_JSON_HEADERS = {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Token ${token}` } : {}),
                  };
                  const PATCH_FORM_HEADERS = {
                    Accept: "application/json",
                    ...(token ? { Authorization: `Token ${token}` } : {}),
                  };

                    const updateLocalState = async (updated) => {
                    const avatarUrl = updated.avatar
                      ? (updated.avatar.startsWith("http") ? updated.avatar : `${BACKEND_URL}${updated.avatar}`)
                      : null;
                    const normalized = {
                      ...updated,
                      contact_number: updated.contact_number ?? updated.phone ?? profile.phone,
                      address: updated.address ?? profile.address,
                      name: updated.name ?? profile.name,
                      username: updated.username ?? profile.username,
                      must_change: updated.must_change_credentials ?? false,
                    };
                    setProfile((prev) => ({
                      ...prev,
                      ...normalized,
                      phone: normalized.contact_number,
                      image: avatarUrl || prev.image,
                    }));
                    try {
                      await AsyncStorage.setItem("parent", JSON.stringify(normalized));
                      if (normalized.username) {
                        await AsyncStorage.setItem("username", normalized.username);
                      }
                      await AsyncStorage.setItem("parent_must_change", normalized.must_change ? "1" : "0");
                    } catch (err) {
                      console.warn("[Profile] Failed to cache parent:", err?.message || err);
                    }

                    // If this save was a forced first-login change, clear session and require re-login
                    if (wasForced) {
                      try {
                        await AsyncStorage.removeItem('token');
                        await AsyncStorage.removeItem('parent');
                        await AsyncStorage.removeItem('username');
                        await AsyncStorage.removeItem('parent_must_change');
                      } catch (err) {
                        console.warn('[Profile] Failed to clear session after forced change', err);
                      }
                      setModalVisible(false);
                      // Navigate back to login so the user can sign in with new credentials
                      setTimeout(() => {
                        try { navigation.replace('login'); } catch(e) { navigation.navigate('login'); }
                      }, 250);
                      return;
                    }
                    setModalVisible(false);
                  };

                  const attemptRequests = async (optionsBuilder) => {
                    for (const endpoint of endpoints) {
                      try {
                        const res = await fetch(endpoint, optionsBuilder(endpoint));
                        if (res.ok) {
                          const updated = await res.json();
                          await updateLocalState(updated);
                          return true;
                        }
                        const text = await res.text();
                        console.warn(`[Profile] Save failed for ${endpoint}:`, res.status, text);
                      } catch (err) {
                        console.warn(`[Profile] Error saving to ${endpoint}:`, err?.message || err);
                      }
                    }
                    return false;
                  };

                  try {
                    const isLocalImage = profile.image && !profile.image.startsWith("http");
                    const basePayload = {
                      name: profile.name || "",
                      username: profile.username || "",
                      contact_number: profile.phone || "",
                      address: profile.address || "",
                    };

                    // If user provided a new password, validate and include it in payload
                    if (newPassword) {
                      if (newPassword !== confirmPassword) {
                        alert('New passwords do not match');
                        setSaving(false);
                        return;
                      }
                      // include password and current_password if provided
                      basePayload.password = newPassword;
                      if (currentPassword) basePayload.current_password = currentPassword;
                    }

                    let success = false;
                    if (isLocalImage) {
                      const formData = new FormData();
                      Object.entries(basePayload).forEach(([key, value]) => formData.append(key, value));

                      const uri = profile.image;
                      const uriParts = uri.split("/");
                      let filename = uriParts[uriParts.length - 1];
                      if (!filename.includes(".")) filename = "avatar.jpg";
                      let mime = "image/jpeg";
                      const match = filename.match(/\.([0-9a-zA-Z]+)(?:\?|$)/);
                      if (match) {
                        const ext = match[1].toLowerCase();
                        if (ext === "png") mime = "image/png";
                        else if (ext === "heic") mime = "image/heic";
                      }
                      formData.append("avatar", { uri, name: filename, type: mime });

                      success = await attemptRequests(() => ({
                        method: "PATCH",
                        headers: PATCH_FORM_HEADERS,
                        body: formData,
                      }));
                    } else {
                      const payload = { ...basePayload };
                      success = await attemptRequests(() => ({
                        method: "PATCH",
                        headers: PATCH_JSON_HEADERS,
                        body: JSON.stringify(payload),
                      }));
                    }

                    if (!success) {
                      alert("Failed to save profile. Please try again later.");
                      return;
                    }
                  } catch (err) {
                    console.warn("Error saving profile:", err.message || err);
                  } finally {
                    setSaving(false);
                  }
                }}
              />
              <Button title="Cancel" color="red" onPress={() => setModalVisible(false)} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Avatar Update Modal */}
      <Modal visible={avatarModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.avatarModal,
              { backgroundColor: isDark ? "#2c2c2c" : "#fff" },
            ]}
          >
            <Text style={[styles.modalTitle, { color: isDark ? "#fff" : "#333" }]}>
              Update Profile Picture
            </Text>

            <TouchableOpacity
              style={[
                styles.avatarOption,
                { backgroundColor: isDark ? "#333" : "#f0f0f0" },
              ]}
              onPress={takePhoto}
            >
              <Ionicons
                name="camera-outline"
                size={24}
                color={isDark ? "#4da6ff" : "#3498db"}
              />
              <Text
                style={[
                  styles.optionText,
                  { color: isDark ? "#fff" : "#333" },
                ]}
              >
                Take Photo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.avatarOption,
                { backgroundColor: isDark ? "#333" : "#f0f0f0" },
              ]}
              onPress={pickImage}
            >
              <Ionicons
                name="image-outline"
                size={24}
                color={isDark ? "#6edc82" : "#27ae60"}
              />
              <Text
                style={[
                  styles.optionText,
                  { color: isDark ? "#fff" : "#333" },
                ]}
              >
                Choose from Gallery
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.cancelButton,
                { backgroundColor: isDark ? "#444" : "#eee" },
              ]}
              onPress={() => setAvatarModalVisible(false)}
            >
              <Text
                style={[
                  styles.cancelText,
                  { color: isDark ? "#fff" : "#333" },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    borderBottomColor: "#ddd",
    marginTop: 40,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", marginLeft: 12 },
  profileCard: {
    alignItems: "center",
    margin: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 3,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    backgroundColor: "#ccc",
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  name: { fontSize: 20, fontWeight: "700" },
  /* email style removed */
  infoSection: { marginTop: 10, marginHorizontal: 16 },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  infoText: { marginLeft: 12, fontSize: 15, fontWeight: "500" },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 50,
    padding: 14,
    borderRadius: 30,
    marginTop: 20,
  },
  editText: { color: "#fff", fontWeight: "600", marginLeft: 8, fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    padding: 20,
    borderRadius: 16,
  },
  avatarModal: {
    width: "80%",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 10,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  avatarOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    width: "100%",
    borderRadius: 10,
    marginBottom: 10,
  },
  optionText: { marginLeft: 10, fontSize: 16, fontWeight: "500" },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    alignItems: "center",
    width: "100%",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default Profile;