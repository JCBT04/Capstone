import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../components/ThemeContext";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from "../config";

const ChangePassword = ({ navigation }) => {
  const { darkModeEnabled } = useTheme();
  const isDark = darkModeEnabled;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match!');
      return;
    }
    if (newPassword.length < 6) {
      alert('New password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const username = await AsyncStorage.getItem('username');
      if (!username) {
        alert('No logged-in user found');
        setLoading(false);
        return;
      }

      // Find parent by username
      const resp = await fetch(`${BACKEND_URL}/api/parent/`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      let data = await resp.json();
      if (data && data.results) data = data.results;
      if (!Array.isArray(data)) data = [];

      const parent = data.find(p => p && p.username === username);
      if (!parent) {
        alert('Parent record not found');
        setLoading(false);
        return;
      }

      // Verify current password (backend appears to store plain password in this project)
      if (parent.password !== currentPassword) {
        alert('Current password is incorrect');
        setLoading(false);
        return;
      }

      // Send PATCH to update password
      const patchRes = await fetch(`${BACKEND_URL}/api/parent/${parent.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });

      if (!patchRes.ok) {
        const txt = await patchRes.text();
        console.warn('Password update failed:', patchRes.status, txt);
        alert('Failed to update password');
        setLoading(false);
        return;
      }

      alert('Password changed successfully');
      navigation.goBack();
    } catch (err) {
      console.warn('Error changing password', err);
      alert('Error changing password — check network');
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
          Change Password
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View
          style={[
            styles.formCard,
            { backgroundColor: isDark ? "#1e1e1e" : "#fff" },
          ]}
        >
          {/* Current Password */}
          <View style={styles.inputRow}>
            <Ionicons
              name="lock-closed-outline"
              size={22}
              color={isDark ? "#bbb" : "#555"}
            />
            <TextInput
              style={[styles.input, { color: isDark ? "#fff" : "#000" }]}
              placeholder="Current Password"
              placeholderTextColor={isDark ? "#888" : "#999"}
              secureTextEntry={!showCurrent}
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
              <Ionicons
                name={showCurrent ? "eye" : "eye-off"}
                size={22}
                color={isDark ? "#bbb" : "#555"}
              />
            </TouchableOpacity>
          </View>

          {/* New Password */}
          <View style={styles.inputRow}>
            <Ionicons
              name="key-outline"
              size={22}
              color={isDark ? "#bbb" : "#555"}
            />
            <TextInput
              style={[styles.input, { color: isDark ? "#fff" : "#000" }]}
              placeholder="New Password"
              placeholderTextColor={isDark ? "#888" : "#999"}
              secureTextEntry={!showNew}
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TouchableOpacity onPress={() => setShowNew(!showNew)}>
              <Ionicons
                name={showNew ? "eye" : "eye-off"}
                size={22}
                color={isDark ? "#bbb" : "#555"}
              />
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputRow}>
            <Ionicons
              name="checkmark-done-outline"
              size={22}
              color={isDark ? "#bbb" : "#555"}
            />
            <TextInput
              style={[styles.input, { color: isDark ? "#fff" : "#000" }]}
              placeholder="Confirm Password"
              placeholderTextColor={isDark ? "#888" : "#999"}
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
              <Ionicons
                name={showConfirm ? "eye" : "eye-off"}
                size={22}
                color={isDark ? "#bbb" : "#555"}
              />
            </TouchableOpacity>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: isDark ? "#3498db" : "#2980b9" },
            ]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveText}>{loading ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  formCard: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 3,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    paddingVertical: 10,
  },
  saveButton: {
    padding: 14,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 20,
  },
  saveText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});

export default ChangePassword;
