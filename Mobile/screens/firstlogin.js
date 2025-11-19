import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';

const DEFAULT_RENDER_BACKEND_URL = 'https://capstone-foal.onrender.com';
const BACKEND_URL = DEFAULT_RENDER_BACKEND_URL.replace(/\/$/, '');

const FirstLogin = ({ navigation, route }) => {
  const { darkModeEnabled } = useTheme();
  const isDark = darkModeEnabled;
  const parentId = route?.params?.parentId;

  const [newUsername, setNewUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!newUsername || !currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const url = `${BACKEND_URL}/api/parents/parent/${parentId}/`;
      const body = {
        username: newUsername,
        password: newPassword,
        current_password: currentPassword,
      };
      const resp = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await resp.json().catch(() => null);
      if (!resp.ok) {
        const msg = (json && (json.error || JSON.message)) || 'Failed to update credentials';
        setError(msg);
        setLoading(false);
        return;
      }

      // Successful update. Save new username + parent record
      if (json) {
        try {
          // serializer returns full parent data at top-level
          await AsyncStorage.setItem('username', String(newUsername));
          await AsyncStorage.setItem('parent', JSON.stringify(json));
        } catch (e) {
          console.warn('[FirstLogin] AsyncStorage save failed', e);
        }
      }

      Alert.alert('Success', 'Credentials updated. You will be taken to Home.');
      navigation.reset({ index: 0, routes: [{ name: 'home' }] });
    } catch (err) {
      console.warn('[FirstLogin] error', err);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={isDark ? ['#0b0f19', '#1a1f2b'] : ['#f5f5f5', '#e0e0e0']}
      style={styles.container}
    >
      <View style={[styles.card, isDark ? styles.darkCard : styles.lightCard]}>
        <Text style={[styles.title, isDark ? styles.darkText : styles.lightText]}>
          First-time setup
        </Text>
        <Text style={[styles.subtitle, isDark ? styles.darkSubText : styles.lightSubText]}>
          For security, please change your username and password now.
        </Text>

        <View style={[styles.inputContainer, isDark ? styles.darkInput : styles.lightInput]}>
          <Ionicons name="person-outline" size={20} color={isDark ? '#aaa' : '#666'} style={styles.icon} />
          <TextInput placeholder="New username" placeholderTextColor={isDark ? '#aaa' : '#666'} style={[styles.input, { color: isDark ? '#fff' : '#000' }]} value={newUsername} onChangeText={setNewUsername} autoCapitalize="none" />
        </View>

        <View style={[styles.inputContainer, isDark ? styles.darkInput : styles.lightInput]}>
          <Ionicons name="lock-closed-outline" size={20} color={isDark ? '#aaa' : '#666'} style={styles.icon} />
          <TextInput placeholder="Current (temporary) password" placeholderTextColor={isDark ? '#aaa' : '#666'} style={[styles.input, { color: isDark ? '#fff' : '#000' }]} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
        </View>

        <View style={[styles.inputContainer, isDark ? styles.darkInput : styles.lightInput]}>
          <Ionicons name="key-outline" size={20} color={isDark ? '#aaa' : '#666'} style={styles.icon} />
          <TextInput placeholder="New password" placeholderTextColor={isDark ? '#aaa' : '#666'} style={[styles.input, { color: isDark ? '#fff' : '#000' }]} value={newPassword} onChangeText={setNewPassword} secureTextEntry />
        </View>

        <View style={[styles.inputContainer, isDark ? styles.darkInput : styles.lightInput]}>
          <Ionicons name="checkmark-done-outline" size={20} color={isDark ? '#aaa' : '#666'} style={styles.icon} />
          <TextInput placeholder="Confirm new password" placeholderTextColor={isDark ? '#aaa' : '#666'} style={[styles.input, { color: isDark ? '#fff' : '#000' }]} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          <LinearGradient colors={isDark ? ['#0D47A1', '#1565C0'] : ['#4FC3F7', '#0288D1']} style={styles.button}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save</Text>}
          </LinearGradient>
        </TouchableOpacity>

      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  card: { width: '100%', borderRadius: 20, padding: 25, elevation: 5 },
  lightCard: { backgroundColor: '#fff' },
  darkCard: { backgroundColor: '#1a1a1a' },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 14, marginBottom: 18 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', padding: 12, borderRadius: 12, marginBottom: 12 },
  input: { flex: 1, fontSize: 16, marginLeft: 8 },
  lightInput: { backgroundColor: '#f2f2f2' },
  darkInput: { backgroundColor: '#2a2a2a' },
  icon: { marginRight: 6, marginLeft: -2 },
  button: { width: '100%', padding: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  errorText: { color: '#d32f2f', marginBottom: 8, textAlign: 'center' },
  darkText: { color: '#fff' },
  lightText: { color: '#000' },
  darkSubText: { color: '#bbb' },
});

export default FirstLogin;
