import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { COLORS } from '@/utils/constants';
import { useColors } from '@/hooks/useColors';

const GENDERS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Non-binary', value: 'non_binary' },
  { label: 'Other', value: 'other' },
];

export default function SignupScreen() {
  const C = useColors();
  const router = useRouter();
  const signup = useAuthStore((s) => s.signup);

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleLookingFor = (value: string) => {
    setLookingFor((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleSignup = async () => {
    if (!email || !password || !firstName || !dateOfBirth || !gender || lookingFor.length === 0) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signup({ email, password, firstName, dateOfBirth, gender, lookingFor });
      router.replace('/auth/onboarding');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: C.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.logo}>Spark</Text>
        <Text style={[styles.title, { color: C.text }]}>Create Account</Text>
        <Text style={[styles.stepText, { color: C.textLight }]}>Step {step} of 3</Text>

        {step === 1 && (
          <View style={styles.form}>
            <TextInput
              style={[styles.input, { borderColor: C.border, color: C.text, backgroundColor: C.backgroundDark }]}
              placeholder="First Name"
              placeholderTextColor={C.textLight}
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextInput
              style={[styles.input, { borderColor: C.border, color: C.text, backgroundColor: C.backgroundDark }]}
              placeholder="Email"
              placeholderTextColor={C.textLight}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={[styles.input, { borderColor: C.border, color: C.text, backgroundColor: C.backgroundDark }]}
              placeholder="Password (min 8 characters)"
              placeholderTextColor={C.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                if (!firstName || !email || !password) {
                  Alert.alert('Error', 'Fill in all fields');
                  return;
                }
                if (password.length < 8) {
                  Alert.alert('Error', 'Password must be at least 8 characters');
                  return;
                }
                setStep(2);
              }}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.form}>
            <TextInput
              style={[styles.input, { borderColor: C.border, color: C.text, backgroundColor: C.backgroundDark }]}
              placeholder="Date of Birth (YYYY-MM-DD)"
              placeholderTextColor={C.textLight}
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
            />

            <Text style={[styles.label, { color: C.text }]}>I am</Text>
            <View style={styles.chipRow}>
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g.value}
                  style={[styles.chip, { borderColor: C.border, backgroundColor: C.backgroundDark }, gender === g.value && styles.chipActive]}
                  onPress={() => setGender(g.value)}
                >
                  <Text
                    style={[styles.chipText, { color: C.text }, gender === g.value && styles.chipTextActive]}
                  >
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.navRow}>
              <TouchableOpacity style={[styles.backButton, { borderColor: C.border }]} onPress={() => setStep(1)}>
                <Text style={[styles.backText, { color: C.textLight }]}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { flex: 1 }]}
                onPress={() => {
                  if (!dateOfBirth || !gender) {
                    Alert.alert('Error', 'Fill in all fields');
                    return;
                  }
                  setStep(3);
                }}
              >
                <Text style={styles.buttonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.form}>
            <Text style={[styles.label, { color: C.text }]}>I'm looking for</Text>
            <View style={styles.chipRow}>
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g.value}
                  style={[styles.chip, { borderColor: C.border, backgroundColor: C.backgroundDark }, lookingFor.includes(g.value) && styles.chipActive]}
                  onPress={() => toggleLookingFor(g.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: C.text },
                      lookingFor.includes(g.value) && styles.chipTextActive,
                    ]}
                  >
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.navRow}>
              <TouchableOpacity style={[styles.backButton, { borderColor: C.border }]} onPress={() => setStep(2)}>
                <Text style={[styles.backText, { color: C.textLight }]}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { flex: 1 }, loading && styles.buttonDisabled]}
                onPress={handleSignup}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Creating...' : 'Create Account'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 1 && (
          <TouchableOpacity onPress={() => router.push('/auth/login')}>
            <Text style={[styles.link, { color: C.textLight }]}>
              Already have an account? <Text style={styles.linkBold}>Log In</Text>
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  stepText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    gap: 16,
    marginBottom: 24,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.backgroundDark,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundDark,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.text,
    fontSize: 14,
  },
  chipTextActive: {
    color: COLORS.textWhite,
    fontWeight: 'bold',
  },
  button: {
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.textWhite,
    fontSize: 18,
    fontWeight: 'bold',
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  backButton: {
    height: 52,
    paddingHorizontal: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backText: {
    color: COLORS.textLight,
    fontSize: 16,
  },
  link: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontSize: 14,
  },
  linkBold: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
});
