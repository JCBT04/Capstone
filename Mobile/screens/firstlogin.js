import React, { useEffect } from 'react';
import { View, Text } from 'react-native';

// FirstLogin removed — redirect to Profile if accidentally navigated here.
const FirstLogin = ({ navigation }) => {
  useEffect(() => {
    if (navigation && navigation.replace) navigation.replace('profile');
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Redirecting to Profile...</Text>
    </View>
  );
};

export default FirstLogin;
