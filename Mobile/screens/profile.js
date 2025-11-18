import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../components/ThemeContext";
import { BACKEND_URL } from "../config";

const Profile = ({ navigation }) => {
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
  });

  // Backend base URL for Parent API (from central config)

  useEffect(() => {
    let mounted = true;

    const fetchParent = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/parent/`);
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        // use first parent returned (adjust as needed to select specific parent)
        if (Array.isArray(data) && data.length > 0) {
          const p = data[0];
          // map avatar to a full URL if needed
          const avatarUrl = p.avatar
            ? (p.avatar.startsWith('http') ? p.avatar : `${BACKEND_URL}${p.avatar}`)
            : null;

          setProfile((prev) => ({
            ...prev,
            id: p.id || prev.id,
            name: p.name || prev.name,
            address: p.address || prev.address,
            username: p.username || prev.username,
            phone: p.phone || prev.phone,
            image: avatarUrl || prev.image,
          }));
        }
      } catch (err) {
        console.warn('Failed to load parent profile:', err.message || err);
      }
    };

    fetchParent();
    return () => { mounted = false; };
  }, []);

  const [modalVisible, setModalVisible] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

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

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
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
            <Text style={[styles.infoText, { color: isDark ? "#fff" : "#333" }]}>{profile.phone}</Text>
          </View>

          <View style={[styles.infoItem, { backgroundColor: isDark ? "#1e1e1e" : "#fff" }]}>
            <Ionicons name="home-outline" size={22} color="#2980b9" />
            <Text style={[styles.infoText, { color: isDark ? "#fff" : "#333" }]}>{profile.address}</Text>
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
                  setSaving(true);
                  try {
                    if (!profile.id) {
                      console.warn('No parent id available to save');
                    } else {
                      // If there's a local image URI (not an already uploaded HTTP URL), send multipart/form-data
                      const isLocalImage = profile.image && !profile.image.startsWith('http');

                      if (isLocalImage) {
                        const formData = new FormData();
                        formData.append('name', profile.name || '');
                        formData.append('username', profile.username || '');
                        formData.append('phone', profile.phone || '');
                        formData.append('address', profile.address || '');

                        // derive filename and mime type
                        const uri = profile.image;
                        const uriParts = uri.split('/');
                        let name = uriParts[uriParts.length - 1];
                        if (!name.includes('.')) {
                          // fallback name
                          name = `avatar.jpg`;
                        }
                        let match = name.match(/\.([0-9a-zA-Z]+)(?:\?|$)/);
                        let type = 'image/jpeg';
                        if (match) {
                          const ext = match[1].toLowerCase();
                          if (ext === 'png') type = 'image/png';
                          else if (ext === 'jpg' || ext === 'jpeg') type = 'image/jpeg';
                          else if (ext === 'heic') type = 'image/heic';
                        }

                        formData.append('avatar', { uri, name, type });

                        const res = await fetch(`${BACKEND_URL}/api/parent/${profile.id}/`, {
                          method: 'PATCH',
                          headers: {
                            Accept: 'application/json',
                          },
                          body: formData,
                        });

                        if (!res.ok) {
                          const text = await res.text();
                          console.warn('Failed to save profile (multipart):', res.status, text);
                        } else {
                          const updated = await res.json();
                          // ensure avatar is full URL
                          const avatarUrl = updated.avatar
                            ? (updated.avatar.startsWith('http') ? updated.avatar : `${BACKEND_URL}${updated.avatar}`)
                            : null;
                          setProfile((prev) => ({ ...prev, ...updated, image: avatarUrl || prev.image }));
                          setModalVisible(false);
                        }
                      } else {
                        // no local image: send JSON patch
                        const payload = {
                          name: profile.name,
                          username: profile.username,
                          phone: profile.phone,
                          address: profile.address,
                        };
                        const res = await fetch(`${BACKEND_URL}/api/parent/${profile.id}/`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(payload),
                        });
                        if (!res.ok) {
                          const text = await res.text();
                          console.warn('Failed to save profile:', res.status, text);
                        } else {
                          const updated = await res.json();
                          const avatarUrl = updated.avatar
                            ? (updated.avatar.startsWith('http') ? updated.avatar : `${BACKEND_URL}${updated.avatar}`)
                            : null;
                          setProfile((prev) => ({ ...prev, ...updated, image: avatarUrl || prev.image }));
                          setModalVisible(false);
                        }
                      }
                    }
                  } catch (err) {
                    console.warn('Error saving profile:', err.message || err);
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
