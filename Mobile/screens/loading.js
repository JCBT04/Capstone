import React, { useEffect } from "react";
import {
  View,
  Image,
  StyleSheet,
  Text,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from "../components/ThemeContext";

const LoadingScreen = ({ navigation }) => {
  const { darkModeEnabled } = useTheme();
  const isDark = darkModeEnabled;

  useEffect(() => {
    // On load, try to restore the last visited route (or remain logged-in)
    // We'll ensure the splash is visible for at least MIN_DISPLAY_MS
    const MIN_DISPLAY_MS = 500;
    let mounted = true;
    (async () => {
      const start = Date.now();
      try {
        const lastRoute = await AsyncStorage.getItem('lastRoute');
        const parentJson = await AsyncStorage.getItem('parent');
        let parentObj = null;
        try {
          parentObj = parentJson ? JSON.parse(parentJson) : null;
        } catch (e) {
          console.warn('[Loading] failed to parse parent JSON', parentJson, e);
          parentObj = null;
        }
        // Consider authenticated only if parsed object contains an id or username/token
        const isAuthenticated = !!(parentObj && (parentObj.id || parentObj.username || parentObj.token));

        // Debug logs so you can see what's stored and why navigation happens
        console.log('[Loading] lastRoute=', lastRoute, 'parentRaw=', parentJson, 'parentParsed=', parentObj, 'authenticated=', isAuthenticated);

        let target = 'login';

        if (lastRoute && lastRoute !== 'loading') {
          // If the user is not authenticated we should not restore a protected route
          if (!isAuthenticated) {
            target = 'login';
          } else if (lastRoute === 'login' && isAuthenticated) {
            target = 'home';
          } else {
            target = lastRoute;
          }
        } else {
          target = isAuthenticated ? 'home' : 'login';
        }

        // Map removed 'firstlogin' route to 'profile' and enforce first-login flow
        if (target === 'firstlogin') target = 'profile';
        if (isAuthenticated && parentObj && parentObj.must_change_credentials) {
          // Force profile for parents who must change credentials
          target = 'profile';
        }

        const elapsed = Date.now() - start;
        const wait = Math.max(0, MIN_DISPLAY_MS - elapsed);
        if (!mounted) return;
        setTimeout(() => {
          if (!mounted) return;
          console.log('[Loading] navigating to', target);
          try {
            navigation.replace(target);
          } catch (e) {
            console.warn('[Loading] navigation.replace failed', e);
          }
        }, wait);
      } catch (err) {
        console.log('[Loading] restore route error', err);
        const elapsed = Date.now() - start;
        const wait = Math.max(0, MIN_DISPLAY_MS - elapsed);
        setTimeout(() => {
          if (!mounted) return;
          navigation.replace('login');
        }, wait);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigation]);

  return (
    <LinearGradient
     colors={isDark ? ['#0b0f19', '#1a1f2b'] : ['#f5f5f5', '#e0e0e0']}
      style={styles.container}
    >
      <Image
        source={require("../assets/lg.png")} // place your logo here
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator
        size="large"
        color={isDark ? "#fff" : "#000"}
        style={{ marginTop: 20 }}
      />
      <Text style={[styles.text, { color: isDark ? "#fff" : "#000" }]}>
        Loading...
      </Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 180,
    height: 180,
  },
  text: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "600",
  },
});

export default LoadingScreen;
