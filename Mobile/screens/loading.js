import React, { useEffect } from "react";
import {
  View,
  Image,
  StyleSheet,
  Text,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../components/ThemeContext";

const LoadingScreen = ({ navigation }) => {
  const { darkModeEnabled } = useTheme();
  const isDark = darkModeEnabled;

  useEffect(() => {
    // On load, try to restore the last visited route (or remain logged-in)
    (async () => {
      try {
        const lastRoute = await AsyncStorage.getItem('lastRoute');
        const parentJson = await AsyncStorage.getItem('parent');
        const isAuthenticated = !!parentJson;

        // If we have a last route and it's not the loading screen, restore it.
        if (lastRoute && lastRoute !== 'loading') {
          // If lastRoute was login but we are authenticated, go to home instead
          if (lastRoute === 'login' && isAuthenticated) {
            navigation.replace('home');
            return;
          }

          // Otherwise, navigate to recorded route (if authenticated or route is public)
          navigation.replace(lastRoute);
          return;
        }

        // Default behavior: if authenticated -> home, else -> login
        if (isAuthenticated) {
          navigation.replace('home');
        } else {
          navigation.replace('login');
        }
      } catch (err) {
        console.log('[Loading] restore route error', err);
        navigation.replace('login');
      }
    })();
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
