import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../components/ThemeContext";

// Default placeholder for Render URL
const DEFAULT_RENDER_BACKEND_URL = "https://capstone-foal.onrender.com";

const Login = ({ navigation }) => {
  const { darkModeEnabled } = useTheme();
  const isDark = darkModeEnabled;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [parentsLoading, setParentsLoading] = useState(false);
  const [parentsData, setParentsData] = useState(null);

  const handleLogin = async () => {
    if (!username || !password) {
      setErrorMessage("Please enter your username and password");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      // Authenticate against the backend login endpoint
      const loginUrl = `${DEFAULT_RENDER_BACKEND_URL.replace(/\/$/, "")}/api/login/`;
      const resp = await fetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const json = await resp.json().catch(() => null);

      if (!resp.ok) {
        // Attempt parent login if teacher auth failed
        const parentLoginUrl = `${DEFAULT_RENDER_BACKEND_URL.replace(/\/$/, "")}/api/parents/login/`;
        try {
          const presp = await fetch(parentLoginUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
          });
          const pjson = await presp.json().catch(() => null);
          if (presp.ok && pjson && pjson.parent) {
            // parent authenticated
            await AsyncStorage.setItem("username", username);
            await AsyncStorage.setItem("parent", JSON.stringify(pjson.parent));
            setErrorMessage("");
            navigation.navigate("home");
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn('[Login] parent login attempt failed', e);
        }

        const message = (json && (json.error || json.detail)) || `Login failed (status ${resp.status})`;
        setErrorMessage(message);
        setLoading(false);
        return;
      }

      // Save username and token returned by backend
      try {
        await AsyncStorage.setItem("username", username);
        if (json && json.token) await AsyncStorage.setItem("token", json.token);
      } catch (e) {
        console.warn("[Login] AsyncStorage save failed", e);
      }

      // Fetch parents (authenticated)
      try {
        setParentsLoading(true);
        const parents = await fetchParents(json && json.token);
        setParentsData(parents);
      } catch (e) {
        console.warn("[Login] fetchParents failed", e);
      } finally {
        setParentsLoading(false);
      }

      setErrorMessage("");
      navigation.navigate("home");
    } catch (err) {
      console.error("[Login] error", err);
      setErrorMessage("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const fetchParents = async () => {
    // Build endpoint from fixed backend URL: /api/parents/parents/
    const base = DEFAULT_RENDER_BACKEND_URL.replace(/\/$/, "");
    const url = `${base}/api/parents/parents/`;
    try {
      // If a token is stored in AsyncStorage, include it
      const token = await AsyncStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Token ${token}`;

      const res = await fetch(url, { method: "GET", headers });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      const data = await res.json();
      await AsyncStorage.setItem("parents", JSON.stringify(data));
      return data;
    } catch (err) {
      console.error("[fetchParents] error", err);
      throw err;
    }
  };

  return (
    <LinearGradient
      colors={isDark ? ["#0b0f19", "#1a1f2b"] : ["#f5f5f5", "#e0e0e0"]}
      style={styles.container}
    >
      <Image
        source={require("../assets/lg.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <View style={[styles.card, isDark ? styles.darkCard : styles.lightCard]}>
        <Text style={[styles.title, isDark ? styles.darkText : styles.lightText]}>
          Welcome Back
        </Text>
        <Text
          style={[styles.subtitle, isDark ? styles.darkSubText : styles.lightSubText]}
        >
          Login to continue
        </Text>

        {/* Backend URL is fixed in code (no editable field) */}

        {/* Username Input */}
        <View style={[styles.inputContainer, isDark ? styles.darkInput : styles.lightInput]}>
          <Ionicons
            name="person-outline"
            size={20}
            color={isDark ? "#aaa" : "#666"}
            style={styles.icon}
          />
          <TextInput
            placeholder="Username"
            placeholderTextColor={isDark ? "#aaa" : "#666"}
            style={[styles.input, { color: isDark ? "#fff" : "#000" }]}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        {/* Password Input */}
        <View style={[styles.inputContainer, isDark ? styles.darkInput : styles.lightInput]}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color={isDark ? "#aaa" : "#666"}
            style={styles.icon}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor={isDark ? "#aaa" : "#666"}
            style={[styles.input, { color: isDark ? "#fff" : "#000" }]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={secureText}
          />
          <TouchableOpacity onPress={() => setSecureText(!secureText)} style={styles.eyeIcon}>
            <Ionicons
              name={secureText ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={isDark ? "#aaa" : "#666"}
            />
          </TouchableOpacity>
        </View>

        {/* Error message */}
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        <TouchableOpacity onPress={handleLogin} disabled={loading}>
          <LinearGradient
            colors={isDark ? ["#0D47A1", "#1565C0"] : ["#4FC3F7", "#0288D1"]}
            style={styles.button}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Forgot Password */}
        <TouchableOpacity
          onPress={() => navigation.navigate("fpass")}
          style={{ alignSelf: "center", marginTop: 15 }}
        >
          <Text style={[styles.forgotPassword, isDark ? styles.darkLink : styles.lightLink]}>
            Forgot Password?
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  logo: { width: 180, height: 180, marginBottom: 20 },
  card: { width: "100%", borderRadius: 20, padding: 25, elevation: 5, shadowColor: "#000", shadowOpacity: 0.15, shadowOffset: { width: 0, height: 5 }, shadowRadius: 10 },
  lightCard: { backgroundColor: "#fff" },
  darkCard: { backgroundColor: "#1a1a1a" },
  title: { fontSize: 26, fontWeight: "700" },
  subtitle: { fontSize: 14, marginBottom: 20 },
  inputContainer: { flexDirection: "row", alignItems: "center", width: "100%", padding: 12, borderRadius: 12, marginBottom: 15 },
  input: { flex: 1, fontSize: 16, marginLeft: 8 },
  lightInput: { backgroundColor: "#f2f2f2" },
  darkInput: { backgroundColor: "#2a2a2a" },
  icon: { marginRight: 6, marginLeft: -2 },
  eyeIcon: { position: "absolute", right: 12 },
  forgotPassword: { marginTop: 10, fontSize: 14 },
  lightLink: { color: "#0288D1" },
  darkLink: { color: "#4FC3F7" },
  button: { width: "100%", padding: 15, borderRadius: 12, alignItems: "center" },
  buttonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  lightText: { color: "#000" },
  darkText: { color: "#fff" },
  lightSubText: { color: "#444" },
  darkSubText: { color: "#bbb" },
  errorText: { color: "#d32f2f", marginBottom: 15, textAlign: "center" },
});

export default Login;
