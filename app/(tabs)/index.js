import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const [mood, setMood] = useState('');
  const router = useRouter();

  const handleContinueToVlog = () => {
    if (!mood.trim()) {
      Alert.alert('Error', 'Please enter your mood first.');
      return;
    }

    // Dismiss keyboard before navigating
    Keyboard.dismiss();

    // Navigate to vlog screen with mood as parameter
    router.push({
      pathname: '/vlog',
      params: { mood: mood.trim() }
    });

    // Clear mood field for next entry
    setMood('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.emoji}>😊</Text>
            <Text style={styles.title}>How are you feeling?</Text>
            <Text style={styles.subtitle}>
              Enter your current mood, then record a video vlog about it
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter your mood..."
              placeholderTextColor="#94a3b8"
              value={mood}
              onChangeText={setMood}
              multiline
              maxLength={200}
              returnKeyType="done"
              blurOnSubmit={true}
            />
            <Text style={styles.charCount}>{mood.length}/200</Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleContinueToVlog}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Continue to Vlog 🎥</Text>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    fontSize: 18,
    color: '#1e293b',
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  charCount: {
    textAlign: 'right',
    marginTop: 8,
    color: '#94a3b8',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
