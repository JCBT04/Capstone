import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; // ✅ Added gradient
import { useTheme } from '../components/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from "../config";

// Import your logo
import logo from '../assets/lg.png';

const Home = ({ navigation }) => {
  const { darkModeEnabled } = useTheme();
  const isDark = darkModeEnabled;
  const [childNames, setChildNames] = useState([]);
  const [loadingChild, setLoadingChild] = useState(true);

    const dashboardItems = [
      { title: 'Events', icon: 'calendar', color: '#27ae60', screen: 'event' },
      {
        title: 'Attendance',
        icon: 'people',
        color: '#2980b9',
        screen: 'attendance',
      },
      {
        title: 'Student Schedule',
        icon: 'time-outline',
        color: '#8e44ad',
        screen: 'schedule',
      },
      {
        title: 'Unregistered',
        icon: 'close-circle',
        color: '#e74c3c',
        screen: 'unregistered',
      },
      {
        title: 'Authorized List',
        icon: 'checkmark-done-circle',
        color: '#16a085',
        screen: 'authorized',
      },
    ];

  useEffect(() => {
    let isMounted = true;

    const loadChild = async () => {
      try {
        const username = await AsyncStorage.getItem('username');
        if (!username) {
          if (isMounted) {
            setChildNames([]);
            setLoadingChild(false);
          }
          return;
        }

        // first get parent list to find parent id by username
        const parentsResp = await fetch(`${BACKEND_URL}/api/parent/`);
        const parentsData = await parentsResp.json();
        const parent = (Array.isArray(parentsData) ? parentsData : (parentsData && parentsData.results ? parentsData.results : [])).find(p => p.username === username);
        if (!parent) {
          if (isMounted) {
            setChildNames([]);
            setLoadingChild(false);
          }
          return;
        }

        // fetch students from the API students endpoint (admin URL returns HTML)
        const studentsResp = await fetch(`${BACKEND_URL}/api/student/`);
        // parse JSON bodies
        let studentsData = await studentsResp.json();
        // log both responses to help debugging (inspect shape in console)
        console.log('parentsData:', parentsData);
        console.log('studentsData:', studentsData);

        // normalize students response: some DRF setups return { results: [...] }
        if (studentsData && studentsData.results) studentsData = studentsData.results;
        if (!Array.isArray(studentsData)) studentsData = [];

        // fetch teachers and map by student id
        let teachersData = [];
          try {
            const teachersResp = await fetch(`${BACKEND_URL}/api/teachers/`);
          teachersData = await teachersResp.json();
          if (teachersData && teachersData.results) teachersData = teachersData.results;
          if (!Array.isArray(teachersData)) teachersData = [];
        } catch (e) {
          console.warn('Failed to load teachers', e);
          teachersData = [];
        }

        // build map studentId -> first teacher
        const teacherMap = {};
        teachersData.forEach(t => {
          const sid = t.student || (t.student && t.student.id);
          if (!sid) return;
          if (!teacherMap[sid]) teacherMap[sid] = [];
          teacherMap[sid].push(t);
        });

        // students may store `parent` as an id or as an object; handle both
        // also extract teacher info if present on the student object
        const kids = studentsData
          .filter(s => {
            if (!s) return false;
            const sParent = s.parent;
            if (sParent == null) return false;
            if (typeof sParent === 'object') return (sParent.id === parent.id || sParent === parent.id);
            return sParent === parent.id;
          })
          .map(s => {
            const sid = s.id;
            const teachersForStudent = teacherMap[sid] || [];
            const firstTeacher = teachersForStudent.length ? teachersForStudent[0] : null;
            return {
              id: sid,
              name: s.name || 'Unknown',
              teacherName: firstTeacher ? (firstTeacher.name || '') : (s.teacher_name || s.teacher || ''),
              teacherPhone: firstTeacher ? (firstTeacher.phone || '') : (s.teacher_phone || s.teacher_phone_number || s.teacherPhone || ''),
              attendanceStatus: null,
            };
          });

        // Fetch today's attendance for each kid and attach status
        try {
          const today = new Date();
          const todayStr = today.toISOString().slice(0,10); // YYYY-MM-DD
          const day = today.getDay(); // 0 = Sunday, 6 = Saturday
          const isWeekend = (day === 0 || day === 6);

          if (isWeekend) {
            // On weekends, show 'weekend' instead of present/absent and skip API calls
            const kidsWithStatus = kids.map(k => ({ ...k, attendanceStatus: 'weekend' }));
            if (isMounted) {
              setChildNames(kidsWithStatus);
              setLoadingChild(false);
            }
          } else {
            const kidsWithStatus = await Promise.all(kids.map(async (kid) => {
              try {
                const aResp = await fetch(`${BACKEND_URL}/api/attendance/?student=${kid.id}&date=${todayStr}`);
                let aData = await aResp.json();
                if (aData && aData.results) aData = aData.results;
                if (!Array.isArray(aData)) aData = [];
                if (aData.length > 0) {
                  // take the first record for today
                  const st = aData[0].status || 'present';
                  return { ...kid, attendanceStatus: st };
                }
                // no record for today -> treat as absent
                return { ...kid, attendanceStatus: 'absent' };
              } catch (e) {
                console.warn('Failed fetching attendance for', kid.id, e);
                // On individual fetch failure, treat as absent to match desired behavior
                return { ...kid, attendanceStatus: 'absent' };
              }
            }));
            if (isMounted) {
              setChildNames(kidsWithStatus);
              setLoadingChild(false);
            }
          }
        } catch (e) {
          console.warn('Failed to fetch attendance statuses', e);
          if (isMounted) {
            // If the attendance-status fetch as a whole failed, mark kids as absent
            const absentKids = kids.map(k => ({ ...k, attendanceStatus: 'absent' }));
            setChildNames(absentKids);
            setLoadingChild(false);
          }
        }
        
      } catch (err) {
        console.warn('Failed loading child', err);
        if (isMounted) {
          setChildNames([]);
          setLoadingChild(false);
        }
      }
    };

    loadChild();

    return () => { isMounted = false };
  }, []);

  return (
    <LinearGradient
      colors={isDark ? ['#0b0f19', '#1a1f2b'] : ['#f5f5f5', '#e0e0e0']}
      style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View
          style={[
            styles.header,
            { backgroundColor: isDark ? '#1a1a1a' : '#3498db' }, // Match login dark card
          ]}>
          {/* Logo + Profile Icon */}
          <View style={styles.topRow}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
            <Ionicons name="person-circle-outline" size={40} color="#fff" />
          </View>

          {/* Welcome */}
          <Text style={[styles.welcome, { color: '#fff' }]}>
            👋 Welcome back, Parent!
          </Text>

          {/* Child Info */}
            <View style={styles.childInfo}>
              <View>
                <Text style={[styles.label, { color: '#fff' }]}>Your Child</Text>
                {loadingChild ? (
                  <Text style={[styles.childName, { color: '#fff' }]}>Loading…</Text>
                ) : !childNames.length ? (
                  <Text style={[styles.childName, { color: '#fff' }]}>No child found</Text>
                        ) : (
                          childNames.map((c, i) => (
                            <View key={i} style={{ marginBottom: 6 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Text style={[styles.childName, { color: '#fff' }]}>{c.name}</Text>
                                <View style={[
                                  styles.statusContainer,
                                  c.attendanceStatus === 'present' ? { backgroundColor: '#2ecc71' } :
                                  c.attendanceStatus === 'absent' ? { backgroundColor: '#e74c3c' } :
                                  c.attendanceStatus === 'weekend' ? { backgroundColor: '#3498db' } :
                                  { backgroundColor: '#95a5a6' }
                                ]}>
                                  <Text style={styles.statusText}>
                                    {c.attendanceStatus === 'present' ? 'Present' :
                                     c.attendanceStatus === 'absent' ? 'Absent' :
                                     c.attendanceStatus === 'weekend' ? 'No Class' :
                                     'No record'}
                                  </Text>
                                </View>
                              </View>
                              <View style={styles.teacherRow}>
                                <Text style={[styles.teacherName, { color: '#fff' }]}>
                                  {c.teacherName ? `Teacher: ${c.teacherName}` : 'Teacher: Not provided'}
                                </Text>
                                {c.teacherPhone ? (
                                  <TouchableOpacity
                                    onPress={() => {
                                      const tel = `tel:${c.teacherPhone}`;
                                      Linking.canOpenURL(tel).then(supported => {
                                        if (supported) Linking.openURL(tel);
                                      }).catch(() => {});
                                    }}
                                    style={styles.phoneButton}
                                  >
                                    <Ionicons name="call" size={14} color="#fff" />
                                    <Text style={[styles.teacherPhone, { color: '#fff' }]}> {c.teacherPhone}</Text>
                                  </TouchableOpacity>
                                ) : null}
                              </View>
                            </View>
                          ))
                        )}
              </View>
            
            </View>
        </View>

        {/* Dashboard Title */}
        <View style={styles.dashboardHeader}>
          <MaterialIcons
            name="dashboard"
            size={22}
            color={isDark ? '#f0f0f0' : '#333'}
          />
          <Text
            style={[
              styles.dashboardText,
              { color: isDark ? '#f0f0f0' : '#333' },
            ]}>
            Dashboard
          </Text>
          <View style={{ flexDirection: 'row', marginLeft: 'auto' }}>
            {/* Notifications */}
            <TouchableOpacity
              onPress={() => navigation.navigate('notification')}>
              <Ionicons
                name="notifications-outline"
                size={22}
                color={isDark ? '#f0f0f0' : '#333'}
                style={{ marginRight: 15 }}
              />
            </TouchableOpacity>
            {/* Settings */}
            <TouchableOpacity onPress={() => navigation.navigate('setting')}>
              <Ionicons
                name="settings-outline"
                size={22}
                color={isDark ? '#f0f0f0' : '#333'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Dashboard: left column with 3 cards, right column with 2 cards */}
        <View style={[styles.grid, { paddingHorizontal: 16, flexDirection: 'row', minHeight: 380 }]}> 
          <View style={{ width: '60%', justifyContent: 'space-between' }}>
            {dashboardItems.slice(0, 3).map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.card,
                  {
                    backgroundColor: isDark ? '#1a1a1a' : '#fff',
                    borderColor: isDark ? '#30363d' : '#ddd',
                    borderWidth: 1,
                    width: '100%',
                  },
                ]}
                onPress={() => navigation.navigate(item.screen)}
              >
                <Ionicons name={item.icon} size={28} color={item.color} />
                <Text style={[styles.cardTitle, { color: isDark ? '#e6edf3' : '#333' }]}> 
                  {item.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ width: '38%', marginLeft: '2%', justifyContent: 'space-between' }}>
            {dashboardItems.slice(3).map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.card,
                  {
                    backgroundColor: isDark ? '#1a1a1a' : '#fff',
                    borderColor: isDark ? '#30363d' : '#ddd',
                    borderWidth: 1,
                    width: '100%',
                    marginBottom: 16,
                    height: 180,
                    justifyContent:
                      item.title === 'Unregistered' || item.title === 'Authorized List'
                        ? 'center'
                        : 'flex-end',
                  },
                ]}
                onPress={() => navigation.navigate(item.screen)}
              >
                <Ionicons name={item.icon} size={28} color={item.color} />
                <Text style={[styles.cardTitle, { color: isDark ? '#e6edf3' : '#333' }]}> 
                  {item.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 50,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 5,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  logo: {
    width: 120,
    height: 70,
  },
  welcome: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 30,
  },
  childInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
  },
  childName: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  teacherInfo: {
    fontSize: 14,
    marginTop: 15,
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  teacherName: {
    fontSize: 14,
    opacity: 0.95,
  },
  teacherPhone: {
    fontSize: 13,
    opacity: 0.95,
    marginLeft: 6,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginLeft: 8,
  },
  statusContainer: {
    backgroundColor: '#2ecc71',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontWeight: '600',
  },
  dashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginTop: 30,
  },
  dashboardText: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 25,
  },
  card: {
    width: '47%',
    borderRadius: 16,
    padding: 25,
    marginBottom: 20,
    alignItems: 'center',
  },
  cardTitle: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default Home;
