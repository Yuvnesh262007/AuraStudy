import React, { useState, useEffect, useRef } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  StatusBar,
  Image,
  Dimensions,
  Modal,
  TextInput,
  AppState,
  Alert
} from 'react-native';

const { width } = Dimensions.get('window');

// Default initial data structure per user
const INITIAL_USER_DATABASE = {
  'yuvnesh@aurastudy.com': {
    name: 'Yuvnesh Kumar Garg',
    focusLogged: 1.5,
    dailyGoalHours: 3,
    streak: 5,
    greenhouse: [],
    badges: [],
    stickers: [],
    tasks: [
      { id: '1', title: 'Practical file completion', course: 'OOPJ', deadline: 'Due 22 Oct 2026', priority: 'high', completed: false },
      { id: '2', title: 'DSA Lab & Assignment', course: 'DSA', deadline: 'Due 22 Oct 2026', priority: 'medium', completed: false },
      { id: '3', title: 'Read Java Exception Handling', course: 'Java', deadline: 'Due 24 Oct 2026', priority: 'low', completed: true },
    ]
  }
};
const API_URL = "http://10.246.138.245:8080/api/auth";
export default function App() {
  // Theme state: light mode is the default.
  const [isDarkMode, setIsDarkMode] = useState(false);
  const toggleTheme = () => setIsDarkMode((current) => !current);
  // Central theme object. Updating isDarkMode immediately rebuilds the styles.
  const theme = isDarkMode
    ? {
        bg: '#121212',
        card: '#1e1e1e',
        text: '#f7f4eb',
        subtext: '#a09a90',
        border: '#333333',
        input: '#252525',
        mutedTrack: '#333333',
      }
    : {
        bg: '#f7f4eb',
        card: '#efebe0',
        text: '#2b2621',
        subtext: '#7a7368',
        border: '#2b2621',
        input: '#f7f4eb',
        mutedTrack: '#e2dcd0',
      };
  const styles = createStyles(theme);
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [activeTab, setActiveTab] = useState('home');
  const [filter, setFilter] = useState('all');
  
  // Timer State
  const [timer, setTimer] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [timerMode, setTimerMode] = useState('work');
  const [customFocusMinutes, setCustomFocusMinutes] = useState(25);
  const [customMinutesInput, setCustomMinutesInput] = useState('25');
  const [showRewardPicker, setShowRewardPicker] = useState(false);
  const [showRewardCelebration, setShowRewardCelebration] = useState(false);
  const [selectedRewardPath, setSelectedRewardPath] = useState(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionRewardLocked, setSessionRewardLocked] = useState(false);
  const [celebrationReward, setCelebrationReward] = useState(null);
  const [greenhouse, setGreenhouse] = useState([]);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [unlockedStickers, setUnlockedStickers] = useState([]);

  // Ambient focus audio state and lifecycle reference.
  const [selectedAmbientSound, setSelectedAmbientSound] = useState(null);
  const [isSoundPlaying, setIsSoundPlaying] = useState(false);
  const ambientSoundRef = useRef(null);
  const ambientSoundTypeRef = useRef(null);
  const ambientRequestRef = useRef(0);


  // Focus Lock: pause immediately on app-switch and handle warnings/penalties on return.
  const [interruptionCount, setInterruptionCount] = useState(0);
  const timerRunningRef = useRef(false);
  const timerRef = useRef(timer);
  const interruptionCountRef = useRef(0);
  const interruptionPendingRef = useRef(false);
  const pendingInterruptionNumberRef = useRef(0);

  useEffect(() => {
    timerRunningRef.current = isRunning;
  }, [isRunning]);

  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') stopAmbientSound(false);
      if (
        (nextAppState === 'background' || nextAppState === 'inactive') &&
        timerRunningRef.current
      ) {
        // Count once, pause immediately, and defer the alert until the app returns.
        timerRunningRef.current = false;
        setIsRunning(false);
        interruptionCountRef.current += 1;
        setInterruptionCount(interruptionCountRef.current);
        pendingInterruptionNumberRef.current = interruptionCountRef.current;
        interruptionPendingRef.current = true;

        if (interruptionCountRef.current >= 4) {
          setSessionRewardLocked(true);
          const extendedSeconds = Math.ceil(timerRef.current * 1.3);
          timerRef.current = extendedSeconds;
          setTimer(extendedSeconds);
        }
      }

      if (nextAppState === 'active' && interruptionPendingRef.current) {
        interruptionPendingRef.current = false;
        const count = pendingInterruptionNumberRef.current;

        if (count <= 3) {
          Alert.alert(
            `⚠️ Warning ${count}/3`,
            'Leaving focus mode will disrupt your study session!',
            [{ text: 'I understand', style: 'default' }]
          );
        } else {
          Alert.alert(
            '⚠️ Penalty Applied!',
            'You switched apps too many times. Your focus session has been extended by 30%.',
            [{ text: 'I understand', style: 'default' }]
          );
        }
      }
    });

    return () => subscription.remove();
  }, []);
  
  // Modals State
  const [showProfile, setShowProfile] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // New Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCourse, setNewTaskCourse] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('Due 21 Oct 2026');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');

  // Calendar State
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  // Sign-in Input State
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  
  // Active User Profile State
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');
  
  // User Storage Database
  const [userDatabase, setUserDatabase] = useState(INITIAL_USER_DATABASE);
  
  // Active User Workspace State
  const [tasks, setTasks] = useState([]);
  const [dailyGoalHours, setDailyGoalHours] = useState(3);
  const [focusLogged, setFocusLogged] = useState(0);
  const [streak, setStreak] = useState(0);

  // CC0/public-domain audio sources streamed from the web.
  const AMBIENT_SOUND_URLS = {
    rain: 'https://sfxmint.com/dl/ambience-rain-62.mp3',
    lofi: 'https://sfxmint.com/dl/night-ambience-01.mp3',
    whitenoise: 'https://sfxjar.com/audio/synth-white-noise.mp3',
  };

  const stopAmbientSound = async (clearSelection = true) => {
    ambientRequestRef.current += 1;
    const sound = ambientSoundRef.current;
    ambientSoundRef.current = null;
    ambientSoundTypeRef.current = null;
    setIsSoundPlaying(false);
    if (clearSelection) setSelectedAmbientSound(null);
    if (sound) {
      try { sound.pause(); } catch (_) {}
      try { sound.remove(); } catch (_) {}
    }
  };

  const toggleAmbientSound = async (soundType) => {
    if (soundType === 'stop') {
      await stopAmbientSound(true);
      return;
    }
    if (!AMBIENT_SOUND_URLS[soundType]) return;

    if (ambientSoundRef.current && ambientSoundTypeRef.current === soundType) {
      try {
        if (ambientSoundRef.current.playing) {
          ambientSoundRef.current.pause();
          setIsSoundPlaying(false);
        } else {
          ambientSoundRef.current.play();
          setIsSoundPlaying(true);
        }
      } catch (error) {
        console.warn('Could not toggle ambient sound:', error);
        await stopAmbientSound(true);
        Alert.alert('Audio unavailable', 'This sound could not be played. Check your internet connection and try again.');
      }
      return;
    }

    const requestId = ambientRequestRef.current + 1;
    ambientRequestRef.current = requestId;
    const previousSound = ambientSoundRef.current;
    ambientSoundRef.current = null;
    ambientSoundTypeRef.current = null;
    setIsSoundPlaying(false);
    if (previousSound) {
      try { previousSound.pause(); } catch (_) {}
      try { previousSound.remove(); } catch (_) {}
    }

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'duckOthers',
      });
      const player = createAudioPlayer(AMBIENT_SOUND_URLS[soundType]);
      player.loop = true;
      player.volume = 0.45;
      if (ambientRequestRef.current !== requestId) {
        try { player.pause(); } catch (_) {}
        try { player.remove(); } catch (_) {}
        return;
      }
      ambientSoundRef.current = player;
      player.play();
      ambientSoundTypeRef.current = soundType;
      setSelectedAmbientSound(soundType);
      setIsSoundPlaying(true);
    } catch (error) {
      console.warn('Could not load ambient sound:', error);
      if (ambientRequestRef.current === requestId) {
        setSelectedAmbientSound(null);
        setIsSoundPlaying(false);
        Alert.alert('Audio unavailable', 'Could not load this sound. Check your internet connection and confirm expo-audio is installed.');
      }
    }
  };

  const handleTabChange = (tabId) => {
    if (tabId !== 'focus') stopAmbientSound(true);
    setActiveTab(tabId);
  };

  useEffect(() => {
    return () => {
      const sound = ambientSoundRef.current;
      if (sound) {
        try { sound.pause(); } catch (_) {}
        try { sound.remove(); } catch (_) {}
        ambientSoundRef.current = null;
      }
    };
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning ☀️';
    if (hour < 18) return 'Good Afternoon 🌤️';
    return 'Good Evening 🌙';
  };

  const finishFocusSession = () => {
    setIsRunning(false);
    timerRunningRef.current = false;
    if (timerMode !== 'work' || !sessionActive) return;

    setSessionActive(false);
    const locked = sessionRewardLocked || interruptionCountRef.current >= 4;
    if (locked || !selectedRewardPath) {
      setCelebrationReward({ title: 'Session Complete', message: 'You reached the end, but repeated app switching locked this reward. Reset and try again for a clean run.', icon: '🍂', locked: true });
      setShowRewardCelebration(true);
      return;
    }

    const creditedHours = customFocusMinutes / 60;
    const nextFocusLogged = Math.round((focusLogged + creditedHours) * 100) / 100;
    const nextStreak = streak + 1;
    setFocusLogged(nextFocusLogged);
    setStreak(nextStreak);

    if (selectedRewardPath === 'greenhouse') {
      const plants = [
        { name: 'Moonlit Fern', emoji: '🌿', rarity: 'Rare' },
        { name: 'Stardust Orchid', emoji: '🌸', rarity: 'Epic' },
        { name: 'Golden Sprout', emoji: '🌱', rarity: 'Uncommon' },
        { name: 'Aurora Bloom', emoji: '🌷', rarity: 'Legendary' },
        { name: 'Velvet Moss', emoji: '🍀', rarity: 'Rare' },
      ];
      const plant = { id: `${Date.now()}`, ...plants[Math.floor(Math.random() * plants.length)], earnedAt: new Date().toISOString(), minutes: customFocusMinutes };
      const nextGreenhouse = [...greenhouse, plant];
      setGreenhouse(nextGreenhouse);
      saveUserData({ focusLogged: nextFocusLogged, streak: nextStreak, greenhouse: nextGreenhouse });
      setCelebrationReward({ title: 'A New Plant Blossomed!', message: `${plant.name} (${plant.rarity}) has been added to your Study Greenhouse.`, icon: plant.emoji, locked: false, detail: `+${creditedHours} focus hours` });
    } else {
      const catalog = [
        { name: 'Focus Enthusiast', icon: '🏅' },
        { name: 'Late-Night Code Sorcerer', icon: '🪄' },
        { name: 'Deep Work Scholar', icon: '📚' },
        { name: 'Pomodoro Champion', icon: '⏳' },
      ];
      const badge = catalog[earnedBadges.length % catalog.length];
      const nextBadges = earnedBadges.some(item => item.name === badge.name) ? earnedBadges : [...earnedBadges, { ...badge, id: `${Date.now()}`, earnedAt: new Date().toISOString() }];
      const sticker = ['✨', '🌟', '💫', '🎓', '🦋'][unlockedStickers.length % 5];
      const nextStickers = [...unlockedStickers, { id: `${Date.now()}-sticker`, emoji: sticker }];
      setEarnedBadges(nextBadges);
      setUnlockedStickers(nextStickers);
      saveUserData({ focusLogged: nextFocusLogged, streak: nextStreak, badges: nextBadges, stickers: nextStickers });
      setCelebrationReward({ title: 'Reward Unboxed!', message: `You unlocked ${badge.name} and a new aesthetic sticker.`, icon: badge.icon, locked: false, detail: `${sticker}  +${creditedHours} focus hours` });
    }
    setShowRewardCelebration(true);
  };

  useEffect(() => {
    let interval = null;
    if (isRunning && timer > 0) {
      interval = setInterval(() => {
        setTimer((current) => {
          const next = Math.max(0, current - 1);
          timerRef.current = next;
          if (next === 0) setTimeout(() => finishFocusSession(), 0);
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timer, timerMode, sessionActive, sessionRewardLocked, selectedRewardPath, customFocusMinutes, focusLogged, streak, greenhouse, earnedBadges, unlockedStickers]);

  // Handle Sign In & Per-User Workspace Setup
  // Handle Sign In & Backend H2 Database Synchronization
  const handleSignIn = async () => {
    interruptionCountRef.current = 0;
    setInterruptionCount(0);
    interruptionPendingRef.current = false;
    const cleanEmail = emailInput.trim().toLowerCase() || 'student@aurastudy.com';
    const cleanName = nameInput.trim() || 'Student User';

    setCurrentUserEmail(cleanEmail);
    setCurrentUserName(cleanName);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, name: cleanName }),
      });

      const backendUser = await response.json();
      console.log("Connected to Java Backend:", backendUser);

      // Populate state with data returned from H2 database
      setTasks(backendUser.tasks || []);
      setFocusLogged(backendUser.focusLogged || 0);
      setDailyGoalHours(backendUser.dailyGoalHours || 3);
      setStreak(backendUser.streak || 1);
      setGreenhouse([]); 
      setEarnedBadges([]);
      setUnlockedStickers([]);
    } catch (error) {
      console.error("Backend connection failed, falling back to local state:", error);
      // Fallback if backend is unreachable
      setTasks([
        { id: '1', title: 'Practical file completion', course: 'OOPJ', deadline: 'Due 22 Oct 2026', priority: 'high', completed: false }
      ]);
      setFocusLogged(1.5);
      setDailyGoalHours(3);
      setStreak(5);
    }

    setCurrentScreen('main');
  };
  // Toggle Task Completion
  const toggleTask = (id) => {
    const updatedTasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTasks(updatedTasks);
    saveUserData({ tasks: updatedTasks });
  };

  // Delete Task
  const deleteTask = (id) => {
    const updatedTasks = tasks.filter(t => t.id !== id);
    setTasks(updatedTasks);
    saveUserData({ tasks: updatedTasks });
  };

  // Add New Task
  const handleAddNewTask = () => {
    if (!newTaskTitle.trim()) return;

    const newTask = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      course: newTaskCourse.trim() || 'General',
      deadline: newTaskDeadline.trim() || 'Due Today',
      priority: newTaskPriority,
      completed: false
    };

    const updatedTasks = [newTask, ...tasks];
    setTasks(updatedTasks);
    saveUserData({ tasks: updatedTasks });

    // Reset Form & Close Modal
    setNewTaskTitle('');
    setNewTaskCourse('');
    setShowAddTaskModal(false);
  };

  // Helper to sync changes to active user account
  // Helper to sync changes to Java backend database
  const saveUserData = async (updatedFields) => {
    if (!currentUserEmail) return;

    // Build the payload with current states + any newly updated fields
    const payload = {
      focusLogged: updatedFields.focusLogged !== undefined ? updatedFields.focusLogged : focusLogged,
      dailyGoalHours: updatedFields.dailyGoalHours !== undefined ? updatedFields.dailyGoalHours : dailyGoalHours,
      streak: updatedFields.streak !== undefined ? updatedFields.streak : streak,
      tasks: updatedFields.tasks !== undefined ? updatedFields.tasks : tasks,
    };

    try {
      const response = await fetch(`${API_URL}/update/${currentUserEmail}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const savedData = await response.json();
      console.log("H2 Database successfully updated:", savedData);
    } catch (error) {
      console.error("Failed to sync update to backend:", error);
    }
  };

  const handleGoalChange = (newGoal) => {
    setDailyGoalHours(newGoal);
    saveUserData({ dailyGoalHours: newGoal });
  };

  const handleSignOut = () => {
    stopAmbientSound(true);
    interruptionCountRef.current = 0;
    setInterruptionCount(0);
    interruptionPendingRef.current = false;
    setShowProfile(false);
    setIsRunning(false);
    setNameInput('');
    setEmailInput('');
    setCurrentUserEmail('');
    setCurrentUserName('');
    setGreenhouse([]);
    setEarnedBadges([]);
    setUnlockedStickers([]);
    setSelectedRewardPath(null);
    setSessionActive(false);
    setSessionRewardLocked(false);
    setCurrentScreen('welcome');
  };

  const resetInterruptionCount = () => {
    interruptionCountRef.current = 0;
    setInterruptionCount(0);
    interruptionPendingRef.current = false;
    pendingInterruptionNumberRef.current = 0;
  };

  const switchTimerMode = (mode) => {
    stopAmbientSound(true);
    setIsRunning(false);
    timerRunningRef.current = false;
    resetInterruptionCount();
    setTimerMode(mode);
    setSessionActive(false);
    setSessionRewardLocked(false);
    setSelectedRewardPath(null);
    if (mode === 'work') {
      const seconds = customFocusMinutes * 60;
      timerRef.current = seconds;
      setTimer(seconds);
    }
    if (mode === 'shortBreak') {
      timerRef.current = 5 * 60;
      setTimer(5 * 60);
    }
    if (mode === 'longBreak') {
      timerRef.current = 15 * 60;
      setTimer(15 * 60);
    }
  };

  const startFocusPressed = () => {
    if (isRunning) {
      timerRunningRef.current = false;
      setIsRunning(false);
      stopAmbientSound(false);
      return;
    }
    if (timerMode !== 'work') {
      if (timer <= 0) switchTimerMode(timerMode);
      timerRunningRef.current = true;
      setIsRunning(true);
      return;
    }
    if (timer <= 0) {
      timerRef.current = customFocusMinutes * 60;
      setTimer(customFocusMinutes * 60);
      setSessionActive(false);
      setSelectedRewardPath(null);
    }
    if (!sessionActive || !selectedRewardPath) {
      setShowRewardPicker(true);
      return;
    }
    timerRunningRef.current = true;
    setIsRunning(true);
  };

  const chooseRewardPath = (path) => {
    setSelectedRewardPath(path);
    setSessionRewardLocked(false);
    setSessionActive(true);
    setShowRewardPicker(false);
    resetInterruptionCount();
    const seconds = customFocusMinutes * 60;
    timerRef.current = seconds;
    setTimer(seconds);
    timerRunningRef.current = true;
    setIsRunning(true);
  };

  const closeRewardCelebration = () => {
    setShowRewardCelebration(false);
    setCelebrationReward(null);
    switchTimerMode('work');
  };

  const chooseCustomFocusMinutes = (minutes) => {
    setCustomFocusMinutes(minutes);
    setCustomMinutesInput(String(minutes));
    if (timerMode === 'work') {
      setIsRunning(false);
      timerRunningRef.current = false;
      resetInterruptionCount();
      timerRef.current = minutes * 60;
      setTimer(minutes * 60);
    }
  };

  const applyCustomMinutesInput = () => {
    const parsedMinutes = Number.parseInt(customMinutesInput, 10);
    if (!Number.isFinite(parsedMinutes) || parsedMinutes < 1 || parsedMinutes > 180) {
      Alert.alert('Invalid focus duration', 'Enter a whole number between 1 and 180 minutes.');
      setCustomMinutesInput(String(customFocusMinutes));
      return;
    }
    chooseCustomFocusMinutes(parsedMinutes);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'pending') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  // Calendar Helpers & Date Validation
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();

  const handleSelectCalendarDate = (dayNum) => {
    const selectedDate = new Date(selectedYear, selectedMonth, dayNum);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (selectedDate < todayStart) {
      return;
    }

    setSelectedDay(dayNum);
    setNewTaskDeadline(`Due ${dayNum} ${monthNames[selectedMonth]} ${selectedYear}`);
    setShowDatePicker(false);
  };

  const isPastDate = (dayNum) => {
    const checkDate = new Date(selectedYear, selectedMonth, dayNum);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return checkDate < todayStart;
  };

  // Calculations for Analytics Section
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.completed).length;
  const completionRatio = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount * 100).toFixed(0) : 0;

  // --- WELCOME SCREEN ---
  if (currentScreen === 'welcome') {
    return (
      <SafeAreaView style={styles.onboardingContainer}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.bg} />
        <View style={styles.welcomeContent}>
          <Text style={styles.welcomeSubText}>Hey!! This is</Text>
          
          <View style={styles.welcomeLogoContainer}>
            <Image 
              source={require('./assets/Aura.png')} 
              style={styles.welcomeLogoImage} 
              resizeMode="contain"
            />
          </View>

          <Text style={styles.welcomeTagline}>Your personal study & focus companion.</Text>

          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => setCurrentScreen('signin')}
          >
            <Text style={styles.primaryButtonText}>Continue →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- SIGN IN SCREEN ---
  if (currentScreen === 'signin') {
    return (
      <SafeAreaView style={styles.onboardingContainer}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.bg} />
        <View style={styles.signInContent}>
          <View style={styles.signInHeaderBox}>
            <Text style={styles.signInTitle}>Welcome to Aura</Text>
            <Text style={styles.signInSub}>Sign in to sync your study goals & tasks</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>FULL NAME</Text>
            <TextInput 
              style={styles.textInputBox}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="e.g. Yuvnesh Kumar Garg"
              placeholderTextColor={theme.subtext}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>STUDENT EMAIL</Text>
            <TextInput 
              style={styles.textInputBox}
              value={emailInput}
              onChangeText={setEmailInput}
              placeholder="e.g. yuvnesh@aurastudy.com"
              placeholderTextColor={theme.subtext}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity 
            style={[styles.primaryButton, { marginTop: 20 }]}
            onPress={handleSignIn}
          >
            <Text style={styles.primaryButtonText}>Sign In & Launch</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={{ marginTop: 16, alignItems: 'center' }}
            onPress={() => setCurrentScreen('welcome')}
          >
            <Text style={styles.backLinkText}>← Back to Welcome</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- MAIN DASHBOARD ---
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.bg} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoFrame}>
            <Image 
              source={require('./assets/Aura.png')}
              style={styles.logoImage} 
              resizeMode="contain"
            />
          </View>
          <View>
            <Text style={styles.greetingText}>{getGreeting()}</Text>
            <Text style={styles.headerTitle}>AuraStudy</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.profileBadge} onPress={() => setShowProfile(true)}>
          <Text style={styles.profileBadgeText}>
            {currentUserName ? currentUserName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'YG'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* DASHBOARD TAB */}
        {activeTab === 'home' && (
          <View>
            {/* Target Card */}
            <View style={styles.beigeCardPrimary}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.beigeCardTag}>DAILY FOCUS TARGET</Text>
                <Text style={styles.beigeCardValue}>
                  {dailyGoalHours > 0 ? (focusLogged / dailyGoalHours * 100).toFixed(0) : 0}%
                </Text>
              </View>
              <Text style={styles.beigeCardMainText}>{focusLogged}h <Text style={styles.dimText}>/ {dailyGoalHours}h completed</Text></Text>
              
              <View style={styles.progressTrack}>
                <View style={[styles.fillProgress, { width: `${Math.min(100, (focusLogged / dailyGoalHours) * 100)}%` }]} />
              </View>

              <View style={styles.counterRow}>
                <TouchableOpacity onPress={() => handleGoalChange(Math.max(1, dailyGoalHours - 1))} style={styles.miniBtn}>
                  <Text style={styles.miniBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.counterLabel}>Adjust Goal</Text>
                <TouchableOpacity onPress={() => handleGoalChange(dailyGoalHours + 1)} style={styles.miniBtn}>
                  <Text style={styles.miniBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Grid */}
            <View style={styles.gridRow}>
              <View style={[styles.beigeCard, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.gridLabel}>STREAK</Text>
                <Text style={styles.gridNumber}>🏆 {streak}</Text>
                <Text style={styles.gridSub}>Days Active</Text>
              </View>
              <View style={[styles.beigeCard, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.gridLabel}>PENDING</Text>
                <Text style={styles.gridNumber}>🎯 {tasks.filter(t => !t.completed).length}</Text>
                <Text style={styles.gridSub}>Tasks Left</Text>
              </View>
            </View>

            {/* PRODUCTIVITY & STUDY ANALYSIS SECTION */}
            <View style={styles.analysisCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.beigeCardTag}>STUDY ANALYSIS</Text>
                <Text style={styles.analysisBadge}>📈 {completionRatio}% Done</Text>
              </View>
              
              <View style={styles.analysisStatsRow}>
                <View style={styles.analysisStatBox}>
                  <Text style={styles.analysisStatVal}>{completedTasksCount}/{totalTasksCount}</Text>
                  <Text style={styles.analysisStatLbl}>Tasks Done</Text>
                </View>
                <View style={styles.analysisStatDivider} />
                <View style={styles.analysisStatBox}>
                  <Text style={styles.analysisStatVal}>{focusLogged} hrs</Text>
                  <Text style={styles.analysisStatLbl}>Total Focus</Text>
                </View>
                <View style={styles.analysisStatDivider} />
                <View style={styles.analysisStatBox}>
                  <Text style={styles.analysisStatVal}>{streak > 3 ? 'High' : 'Steady'}</Text>
                  <Text style={styles.analysisStatLbl}>Pace</Text>
                </View>
              </View>

              {/* Weekly Micro Bar Graph */}
              <Text style={styles.graphTitle}>Weekly Activity Overview</Text>
              <View style={styles.barGraphRow}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
                  const heights = ['40%', '70%', '100%', '50%', '80%', '30%', '60%'];
                  return (
                    <View key={idx} style={styles.barCol}>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { height: heights[idx] }]} />
                      </View>
                      <Text style={styles.barDayLabel}>{day}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Tasks Section Header with Add Task Button */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>High Priority Tasks</Text>
              <TouchableOpacity style={styles.addInlineBtn} onPress={() => setShowAddTaskModal(true)}>
                <Text style={styles.addInlineBtnText}>+ Add Task</Text>
              </TouchableOpacity>
            </View>

            {tasks.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <Text style={styles.emptyStateText}>No tasks added yet!</Text>
                <TouchableOpacity onPress={() => setShowAddTaskModal(true)}>
                  <Text style={styles.linkText}>+ Add your first task</Text>
                </TouchableOpacity>
              </View>
            ) : (
              tasks.slice(0, 3).map((task) => (
                <View key={task.id} style={styles.beigeTaskItem}>
                  <TouchableOpacity style={[styles.checkbox, task.completed && styles.checkboxActive]} onPress={() => toggleTask(task.id)}>
                    {task.completed && <Text style={styles.checkMark}>✓</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={{ flex: 1, marginLeft: 12 }} onPress={() => toggleTask(task.id)}>
                    <Text style={[styles.taskTitleText, task.completed && styles.strikeThrough]}>{task.title}</Text>
                    <Text style={styles.taskSubText}>{task.course} • {task.deadline}</Text>
                  </TouchableOpacity>
                  <View style={[styles.priorityPill, styles[`priority_${task.priority}`]]}>
                    <Text style={styles.priorityText}>{task.priority.toUpperCase()}</Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteTask(task.id)} style={styles.deleteIconBtn}>
                    <Text style={styles.deleteIconText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* TASKS TAB */}
        {activeTab === 'tasks' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitleLarge}>Assignments & Tasks</Text>
              <TouchableOpacity style={styles.addInlineBtn} onPress={() => setShowAddTaskModal(true)}>
                <Text style={styles.addInlineBtnText}>+ Add Task</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterContainer}>
              {['all', 'pending', 'completed'].map((f) => (
                <TouchableOpacity 
                  key={f} 
                  style={[styles.filterChip, filter === f && styles.filterChipActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                    {f.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {filteredTasks.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <Text style={styles.emptyStateText}>No tasks found in this filter.</Text>
              </View>
            ) : (
              filteredTasks.map((task) => (
                <View key={task.id} style={styles.beigeTaskCard}>
                  <View style={styles.taskCardTop}>
                    <TouchableOpacity style={[styles.checkbox, task.completed && styles.checkboxActive]} onPress={() => toggleTask(task.id)}>
                      {task.completed && <Text style={styles.checkMark}>✓</Text>}
                    </TouchableOpacity>
                    <Text style={[styles.taskCardTitle, task.completed && styles.strikeThrough]}>{task.title}</Text>
                    <TouchableOpacity onPress={() => deleteTask(task.id)} style={styles.deleteIconBtn}>
                      <Text style={styles.deleteIconText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.taskCardBottom}>
                    <Text style={styles.taskSubText}>{task.course} • {task.deadline}</Text>
                    <View style={[styles.priorityPill, styles[`priority_${task.priority}`]]}>
                      <Text style={styles.priorityText}>{task.priority.toUpperCase()}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* TIMER TAB */}
        {activeTab === 'focus' && (
          <View style={styles.timerWrap}>
            <Text style={styles.sectionTitleLarge}>Pomodoro Focus</Text>
            
            <View style={styles.timerModePills}>
              {[
                { id: 'work', label: 'Focus' },
                { id: 'shortBreak', label: 'Short Break' },
                { id: 'longBreak', label: 'Long Break' },
              ].map((m) => (
                <TouchableOpacity 
                  key={m.id}
                  style={[styles.modePill, timerMode === m.id && styles.modePillActive]}
                  onPress={() => switchTimerMode(m.id)}
                >
                  <Text style={[styles.modePillText, timerMode === m.id && styles.modePillTextActive]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {timerMode === 'work' && (
              <View style={styles.customDurationSection}>
                <Text style={styles.customDurationLabel}>CUSTOM FOCUS DURATION</Text>
                <View style={styles.durationQuickRow}>
                  {[15, 30, 45, 60].map((minutes) => (
                    <TouchableOpacity
                      key={minutes}
                      style={[
                        styles.durationChip,
                        customFocusMinutes === minutes && styles.durationChipActive
                      ]}
                      onPress={() => chooseCustomFocusMinutes(minutes)}
                    >
                      <Text style={[
                        styles.durationChipText,
                        customFocusMinutes === minutes && styles.durationChipTextActive
                      ]}>{minutes}m</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.customDurationInputRow}>
                  <TextInput
                    style={styles.customDurationInput}
                    value={customMinutesInput}
                    onChangeText={setCustomMinutesInput}
                    keyboardType="number-pad"
                    maxLength={3}
                    placeholder="Minutes"
                    placeholderTextColor={theme.subtext}
                    accessibilityLabel="Custom focus duration in minutes"
                  />
                  <TouchableOpacity
                    style={styles.applyDurationBtn}
                    onPress={applyCustomMinutesInput}
                  >
                    <Text style={styles.applyDurationBtnText}>Apply</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.customDurationHint}>Choose 1–180 minutes. Reset uses your selected duration.</Text>
              </View>
            )}

            {timerMode === 'work' && selectedRewardPath === 'greenhouse' && sessionActive && (
              <View style={styles.growthPreviewCard}>
                <Text style={styles.growthPreviewLabel}>YOUR TERRARIUM</Text>
                <Text style={styles.growthPreviewEmoji}>
                  {timer <= customFocusMinutes * 60 * 0.2 ? '🌸' :
                   timer <= customFocusMinutes * 60 * 0.5 ? '🌿' :
                   timer <= customFocusMinutes * 60 * 0.8 ? '🌱' : '🫘'}
                </Text>
                <Text style={styles.growthPreviewText}>
                  {timer <= customFocusMinutes * 60 * 0.2 ? 'Blooming beautifully…' :
                   timer <= customFocusMinutes * 60 * 0.5 ? 'Your plant is growing…' :
                   timer <= customFocusMinutes * 60 * 0.8 ? 'A sprout is emerging…' : 'A tiny seed is resting in the soil…'}
                </Text>
              </View>
            )}

            <View style={styles.beigeTimerCircle}>
              <Text style={styles.timerClockText}>{formatTime(timer)}</Text>
              <Text style={styles.timerStatusText}>{isRunning ? 'Focusing...' : sessionRewardLocked ? 'Reward at risk' : 'Paused'}</Text>
            </View>

            <View style={styles.timerControls}>
              <TouchableOpacity 
                style={[styles.actionBtn, isRunning ? styles.pauseBtn : styles.startBtn]}
                onPress={startFocusPressed}
              >
                <Text style={styles.actionBtnText}>{isRunning ? 'Pause' : 'Start Focus'}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.resetBtn}
                onPress={() => switchTimerMode(timerMode)}
              >
                <Text style={styles.resetBtnText}>↺ Reset</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.ambientSoundCard}>
              <Text style={styles.ambientSoundTitle}>Ambient Focus Sounds</Text>
              <Text style={styles.ambientSoundSubtitle}>
                {isSoundPlaying
                  ? `Playing ${selectedAmbientSound === 'rain' ? 'Rain' : selectedAmbientSound === 'lofi' ? 'Lo-Fi Beats' : 'White Noise'}`
                  : selectedAmbientSound
                    ? `${selectedAmbientSound === 'rain' ? 'Rain' : selectedAmbientSound === 'lofi' ? 'Lo-Fi Beats' : 'White Noise'} paused`
                    : 'Choose a sound to help you focus'}
              </Text>
              <View style={styles.ambientSoundChips}>
                {[
                  { id: 'rain', label: '🌧️ Rain' },
                  { id: 'lofi', label: '🎧 Lo-Fi Beats' },
                  { id: 'whitenoise', label: '🌊 White Noise' },
                ].map((sound) => {
                  const selected = selectedAmbientSound === sound.id;
                  return (
                    <TouchableOpacity
                      key={sound.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[styles.ambientSoundChip, selected && styles.ambientSoundChipActive]}
                      onPress={() => toggleAmbientSound(sound.id)}
                    >
                      <Text style={[styles.ambientSoundChipText, selected && styles.ambientSoundChipTextActive]}>
                        {selected && isSoundPlaying ? '♫ ' : ''}{sound.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[styles.ambientSoundChip, styles.ambientStopChip]}
                  onPress={() => toggleAmbientSound('stop')}
                >
                  <Text style={styles.ambientStopChipText}>⏹️ Stop</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.ambientSoundFootnote}>Audio streams over the internet and loops while selected.</Text>
            </View>

            {timerMode === 'work' && (
              <View style={styles.rewardCollectionCard}>
                <Text style={styles.rewardCollectionTitle}>Your Study Rewards</Text>
                <Text style={styles.rewardCollectionSub}>Plants: {greenhouse.length}  •  Badges: {earnedBadges.length}  •  Stickers: {unlockedStickers.length}</Text>
                {greenhouse.slice(-4).map(plant => (
                  <View key={plant.id} style={styles.rewardCollectionRow}>
                    <Text style={styles.rewardMiniEmoji}>{plant.emoji}</Text>
                    <Text style={styles.rewardMiniName}>{plant.name} · {plant.rarity}</Text>
                  </View>
                ))}
                {earnedBadges.slice(-4).map(badge => (
                  <View key={badge.id} style={styles.rewardCollectionRow}>
                    <Text style={styles.rewardMiniEmoji}>{badge.icon}</Text>
                    <Text style={styles.rewardMiniName}>{badge.name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Navigation Bar */}
      <View style={styles.floatingNavBar}>
        {[
          { id: 'home', label: 'Home', icon: '🏠' },
          { id: 'tasks', label: 'Tasks', icon: '📋' },
          { id: 'focus', label: 'Focus', icon: '⏱️' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={styles.navItem}
            onPress={() => handleTabChange(tab.id)}
          >
            <Text style={{ fontSize: 20 }}>{tab.icon}</Text>
            <Text style={[styles.navLabel, activeTab === tab.id && styles.navLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* PRE-FOCUS REWARD PATH PICKER */}
      <Modal animationType="fade" transparent visible={showRewardPicker} onRequestClose={() => setShowRewardPicker(false)}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.rewardPickerCard}>
            <Text style={styles.rewardEyebrow}>BEFORE YOU BEGIN</Text>
            <Text style={styles.rewardPickerTitle}>Choose your reward journey</Text>
            <Text style={styles.rewardPickerSub}>Stay focused until 00:00 to unlock a reward. Four or more app switches lock the reward for this run.</Text>
            <TouchableOpacity style={styles.greenhouseChoice} onPress={() => chooseRewardPath('greenhouse')}>
              <Text style={styles.rewardChoiceEmoji}>🌱</Text>
              <View style={styles.rewardChoiceTextWrap}>
                <Text style={styles.rewardChoiceTitle}>Greenhouse / Terrarium</Text>
                <Text style={styles.rewardChoiceDescription}>Watch your sprout grow as you study. Finish cleanly to add a rare plant to your Study Greenhouse.</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.badgeChoice} onPress={() => chooseRewardPath('badges')}>
              <Text style={styles.rewardChoiceEmoji}>🏅</Text>
              <View style={styles.rewardChoiceTextWrap}>
                <Text style={styles.rewardChoiceTitle}>Badge & Milestone Unboxer</Text>
                <Text style={styles.rewardChoiceDescription}>Earn badges like OOPJ Master and Late-Night Code Sorcerer, plus aesthetic stickers.</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rewardCancelBtn} onPress={() => setShowRewardPicker(false)}>
              <Text style={styles.rewardCancelText}>Not right now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SESSION CELEBRATION / LOCKED REWARD */}
      <Modal animationType="fade" transparent visible={showRewardCelebration} onRequestClose={closeRewardCelebration}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.celebrationCard}>
            <View style={styles.confettiRow}>
              {['✦', '✧', '✦', '✧', '✦'].map((piece, i) => <Text key={i} style={styles.confettiPiece}>{piece}</Text>)}
            </View>
            <Text style={styles.celebrationEmoji}>{celebrationReward?.icon || '🎉'}</Text>
            <Text style={styles.celebrationTitle}>{celebrationReward?.title || 'Amazing work!'}</Text>
            <Text style={styles.celebrationMessage}>{celebrationReward?.message || 'You completed your focus session.'}</Text>
            {!!celebrationReward?.detail && <Text style={styles.celebrationDetail}>{celebrationReward.detail}</Text>}
            {!celebrationReward?.locked && <Text style={styles.celebrationStats}>Focus logged: {focusLogged}h  •  Streak: {streak} days</Text>}
            <TouchableOpacity style={styles.celebrationButton} onPress={closeRewardCelebration}>
              <Text style={styles.celebrationButtonText}>Lovely! Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

            {/* CREATE NEW TASK MODAL WITH CALENDAR SELECTOR */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddTaskModal}
        onRequestClose={() => setShowAddTaskModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.profileModalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Add New Task</Text>
              <TouchableOpacity onPress={() => setShowAddTaskModal(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>TASK TITLE</Text>
              <TextInput 
                style={styles.textInputBox}
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                placeholder="e.g. Read Operating Systems Chapter 3"
                placeholderTextColor={theme.subtext}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>COURSE / SUBJECT</Text>
              <TextInput 
                style={styles.textInputBox}
                value={newTaskCourse}
                onChangeText={setNewTaskCourse}
                placeholder="e.g. OS / Java / Math"
                placeholderTextColor={theme.subtext}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>DEADLINE (CALENDAR)</Text>
              <TouchableOpacity 
                style={styles.textInputBox}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: theme.text, fontWeight: '700' }}>
                  📅 {newTaskDeadline || 'Select Date from Calendar'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PRIORITY LEVEL</Text>
              <View style={styles.prioritySelectorRow}>
                {['low', 'medium', 'high'].map((p) => (
                  <TouchableOpacity 
                    key={p} 
                    style={[styles.prioritySelectChip, newTaskPriority === p && styles[`priority_${p}`]]}
                    onPress={() => setNewTaskPriority(p)}
                  >
                    <Text style={styles.priorityText}>{p.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.primaryButton, { marginTop: 10 }]} 
              onPress={handleAddNewTask}
            >
              <Text style={styles.primaryButtonText}>+ Save Task</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CALENDAR DATE PICKER MODAL WITH PAST-DATE GUARD */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showDatePicker}
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.calendarModalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                {monthNames[selectedMonth]} {selectedYear}
              </Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.calendarNavRow}>
              <TouchableOpacity 
                onPress={() => {
                  if (selectedMonth === 0) {
                    setSelectedMonth(11);
                    setSelectedYear(selectedYear - 1);
                  } else {
                    setSelectedMonth(selectedMonth - 1);
                  }
                }}
                style={styles.calNavBtn}
              >
                <Text style={styles.calNavBtnText}>← Prev</Text>
              </TouchableOpacity>

              <Text style={styles.calNavTitle}>{monthNames[selectedMonth]} {selectedYear}</Text>

              <TouchableOpacity 
                onPress={() => {
                  if (selectedMonth === 11) {
                    setSelectedMonth(0);
                    setSelectedYear(selectedYear + 1);
                  } else {
                    setSelectedMonth(selectedMonth + 1);
                  }
                }}
                style={styles.calNavBtn}
              >
                <Text style={styles.calNavBtnText}>Next →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.calendarGrid}>
              {Array.from({ length: daysInMonth(selectedMonth, selectedYear) }, (_, i) => i + 1).map((dayNum) => {
                const disabled = isPastDate(dayNum);
                const isSelected = dayNum === selectedDay;

                return (
                  <TouchableOpacity
                    key={dayNum}
                    disabled={disabled}
                    style={[
                      styles.calendarDayCell,
                      disabled && styles.calendarDayDisabled,
                      isSelected && !disabled && styles.calendarDaySelected
                    ]}
                    onPress={() => handleSelectCalendarDate(dayNum)}
                  >
                    <Text style={[
                      styles.calendarDayText,
                      disabled && styles.calendarDayTextDisabled,
                      isSelected && !disabled && styles.calendarDayTextSelected
                    ]}>
                      {dayNum}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.calendarFooterTip}>
              ⚠️ Dates prior to today are disabled to avoid invalid deadlines.
            </Text>
          </View>
        </View>
      </Modal>

      {/* USER PROFILE MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showProfile}
        onRequestClose={() => setShowProfile(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.profileModalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>User Profile</Text>
              <TouchableOpacity onPress={() => setShowProfile(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.profileAvatarBox}>
              <View style={styles.largeAvatar}>
                <Text style={styles.largeAvatarText}>
                  {currentUserName ? currentUserName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'YG'}
                </Text>
              </View>
              <Text style={styles.profileName}>{currentUserName || 'Student User'}</Text>
              <Text style={styles.profileSub}>{currentUserEmail}</Text>
            </View>

            <View style={styles.profileStatsRow}>
              <View style={styles.profileStatItem}>
                <Text style={styles.statVal}>{focusLogged}h</Text>
                <Text style={styles.statLbl}>Focus Logged</Text>
              </View>
              <View style={styles.profileStatItem}>
                <Text style={styles.statVal}>{streak}</Text>
                <Text style={styles.statLbl}>Day Streak</Text>
              </View>
              <View style={styles.profileStatItem}>
                <Text style={styles.statVal}>{tasks.filter(t => t.completed).length}</Text>
                <Text style={styles.statLbl}>Completed</Text>
              </View>
            </View>

            <View style={styles.settingsSection}>
              <View style={styles.settingRow}>
                <Text style={styles.settingText}>🔔 Pomodoro Sound Alerts</Text>
                <Text style={styles.settingBadge}>ON</Text>
              </View>
              <View style={styles.settingRow}>
                <Text style={styles.settingText}>🎨 Theme Mode</Text>
                <TouchableOpacity
                  accessibilityRole="switch"
                  accessibilityState={{ checked: isDarkMode }}
                  onPress={toggleTheme}
                  style={[styles.themeToggle, isDarkMode && styles.themeToggleActive]}
                >
                  <Text style={styles.themeToggleText}>
                    {isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
                  </Text>
                  <View style={[styles.themeToggleKnob, isDarkMode && styles.themeToggleKnobActive]} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.doneModalBtn} 
              onPress={handleSignOut}
            >
              <Text style={styles.doneModalBtnText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  
  // Onboarding
  onboardingContainer: { flex: 1, backgroundColor: theme.bg, justifyContent: 'center', padding: 24 },
  welcomeContent: { alignItems: 'center', justifyContent: 'center' },
  welcomeSubText: { color: theme.text, fontSize: 28, fontWeight: '800', marginBottom: 24, letterSpacing: 0.5 },
  welcomeLogoContainer: { width: 180, height: 180, borderRadius: 30, backgroundColor: theme.card, borderWidth: 2, borderColor: theme.border, justifyContent: 'center', alignItems: 'center', marginBottom: 24, padding: 12 },
  welcomeLogoImage: { width: '100%', height: '100%' },
  welcomeTagline: { color: theme.subtext, fontSize: 15, fontWeight: '600', marginBottom: 40, textAlign: 'center' },
  
  primaryButton: { backgroundColor: theme.text, borderRadius: 24, paddingVertical: 16, paddingHorizontal: 40, width: '100%', alignItems: 'center', borderWidth: 1.5, borderColor: theme.border },
  primaryButtonText: { color: theme.bg, fontSize: 16, fontWeight: '900' },

  // Sign In
  signInContent: { width: '100%', justifyContent: 'center' },
  signInHeaderBox: { marginBottom: 30 },
  signInTitle: { color: theme.text, fontSize: 32, fontWeight: '900', marginBottom: 6 },
  signInSub: { color: theme.subtext, fontSize: 14, fontWeight: '600' },
  inputGroup: { marginBottom: 18 },
  inputLabel: { color: theme.subtext, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  textInputBox: { backgroundColor: theme.card, borderRadius: 16, borderWidth: 1.5, borderColor: theme.border, paddingHorizontal: 16, paddingVertical: 14, color: theme.text, fontSize: 15, fontWeight: '700' },
  backLinkText: { color: theme.subtext, fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoFrame: { width: 48, height: 48, borderRadius: 12, backgroundColor: theme.card, borderWidth: 1.5, borderColor: theme.border, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  logoImage: { width: 40, height: 40 },
  greetingText: { color: theme.subtext, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  headerTitle: { color: theme.text, fontSize: 24, fontWeight: '900', marginTop: 1 },
  profileBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.text, justifyContent: 'center', alignItems: 'center' },
  profileBadgeText: { color: theme.bg, fontWeight: 'bold', fontSize: 13 },
  content: { paddingHorizontal: 20, marginBottom: 80 },
  
  // Cards & Grid
  beigeCardPrimary: { backgroundColor: theme.card, borderRadius: 20, borderWidth: 1.5, borderColor: theme.border, padding: 20, marginBottom: 16 },
  beigeCard: { backgroundColor: theme.card, borderRadius: 20, borderWidth: 1.5, borderColor: theme.border, padding: 18, marginBottom: 16 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  beigeCardTag: { color: theme.subtext, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  beigeCardValue: { color: theme.text, fontSize: 18, fontWeight: 'bold' },
  beigeCardMainText: { color: theme.text, fontSize: 28, fontWeight: '900', marginVertical: 8 },
  dimText: { color: theme.subtext, fontSize: 16, fontWeight: '500' },
  
  progressTrack: { height: 10, backgroundColor: theme.mutedTrack, borderRadius: 5, overflow: 'hidden', marginVertical: 8, borderWidth: 1, borderColor: theme.border },
  fillProgress: { height: '100%', backgroundColor: theme.text, borderRadius: 5 },
  
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 10, gap: 10 },
  counterLabel: { color: theme.subtext, fontSize: 12, fontWeight: '600' },
  miniBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.text, justifyContent: 'center', alignItems: 'center' },
  miniBtnText: { color: theme.bg, fontSize: 16, fontWeight: 'bold' },

  gridRow: { flexDirection: 'row' },
  gridLabel: { color: theme.subtext, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  gridNumber: { color: theme.text, fontSize: 22, fontWeight: '900', marginVertical: 4 },
  gridSub: { color: theme.subtext, fontSize: 12, fontWeight: '500' },

  // Analysis Card
  analysisCard: { backgroundColor: theme.card, borderRadius: 20, borderWidth: 1.5, borderColor: theme.border, padding: 18, marginBottom: 16 },
  analysisBadge: { color: theme.text, fontSize: 12, fontWeight: '800' },
  analysisStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginVertical: 14 },
  analysisStatBox: { alignItems: 'center' },
  analysisStatVal: { color: theme.text, fontSize: 18, fontWeight: '900' },
  analysisStatLbl: { color: theme.subtext, fontSize: 11, fontWeight: '700', marginTop: 2 },
  analysisStatDivider: { width: 1, height: 28, backgroundColor: theme.text, opacity: 0.2 },
  
  graphTitle: { color: theme.subtext, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  barGraphRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 70, paddingTop: 10 },
  barCol: { alignItems: 'center', width: '12%' },
  barTrack: { height: 48, width: 10, backgroundColor: theme.mutedTrack, borderRadius: 5, justifyContent: 'flex-end', overflow: 'hidden', borderWidth: 1, borderColor: theme.border },
  barFill: { backgroundColor: theme.text, width: '100%', borderRadius: 5 },
  barDayLabel: { color: theme.subtext, fontSize: 10, fontWeight: '800', marginTop: 6 },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 14 },
  sectionTitle: { color: theme.text, fontSize: 18, fontWeight: '800' },
  sectionTitleLarge: { color: theme.text, fontSize: 22, fontWeight: '900' },
  linkText: { color: theme.subtext, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },

  // Add Task Buttons & Priority Selectors
  addInlineBtn: { backgroundColor: theme.text, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  addInlineBtnText: { color: theme.bg, fontSize: 12, fontWeight: '800' },
  prioritySelectorRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  prioritySelectChip: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card },

  // Empty State
  emptyStateCard: { backgroundColor: theme.card, borderRadius: 16, borderWidth: 1.5, borderColor: theme.border, padding: 24, alignItems: 'center', marginVertical: 10 },
  emptyStateText: { color: theme.subtext, fontSize: 14, fontWeight: '600', marginBottom: 6 },

  // Tasks
  beigeTaskItem: { backgroundColor: theme.card, borderRadius: 16, borderWidth: 1.5, borderColor: theme.border, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  beigeTaskCard: { backgroundColor: theme.card, borderRadius: 16, borderWidth: 1.5, borderColor: theme.border, padding: 16, marginBottom: 12 },
  taskCardTop: { flexDirection: 'row', alignItems: 'center' },
  taskCardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  taskTitleText: { color: theme.text, fontSize: 15, fontWeight: '700' },
  taskCardTitle: { color: theme.text, fontSize: 16, fontWeight: '700', marginLeft: 12, flex: 1 },
  taskSubText: { color: theme.subtext, fontSize: 12, marginTop: 2, fontWeight: '500' },
  strikeThrough: { textDecorationLine: 'line-through', opacity: 0.4 },

  deleteIconBtn: { padding: 6, marginLeft: 8 },
  deleteIconText: { color: '#dc2626', fontSize: 14, fontWeight: '900' },

  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: theme.border, justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: theme.text },
  checkMark: { color: theme.bg, fontSize: 12, fontWeight: 'bold' },

  priorityPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  priority_high: { backgroundColor: '#fcd34d', borderColor: theme.border },
  priority_medium: { backgroundColor: '#fdba74', borderColor: theme.border },
  priority_low: { backgroundColor: '#86efac', borderColor: theme.border },
  priorityText: { fontSize: 10, fontWeight: '800', color: theme.text },

  filterContainer: { flexDirection: 'row', gap: 8, marginVertical: 16 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
  filterChipActive: { backgroundColor: theme.text },
  filterText: { color: theme.text, fontSize: 12, fontWeight: '800' },
  filterTextActive: { color: theme.bg },

  // Timer
  timerWrap: { alignItems: 'center', paddingTop: 10 },
  customDurationSection: { width: '100%', backgroundColor: theme.card, borderRadius: 18, borderWidth: 1.5, borderColor: theme.border, padding: 14, marginBottom: 22 },
  customDurationLabel: { color: theme.subtext, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 10, textAlign: 'center' },
  durationQuickRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 10 },
  durationChip: { flex: 1, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: theme.border, alignItems: 'center', backgroundColor: theme.bg },
  durationChipActive: { backgroundColor: theme.text },
  durationChipText: { color: theme.text, fontSize: 13, fontWeight: '800' },
  durationChipTextActive: { color: theme.bg },
  customDurationInputRow: { flexDirection: 'row', gap: 8 },
  customDurationInput: { flex: 1, backgroundColor: theme.bg, borderRadius: 12, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, paddingVertical: 9, color: theme.text, fontWeight: '700' },
  applyDurationBtn: { backgroundColor: theme.text, borderRadius: 12, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  applyDurationBtnText: { color: theme.bg, fontSize: 13, fontWeight: '800' },
  customDurationHint: { color: theme.subtext, fontSize: 10, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  timerModePills: { flexDirection: 'row', backgroundColor: theme.card, borderRadius: 25, padding: 4, marginBottom: 30, borderWidth: 1.5, borderColor: theme.border },
  modePill: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20 },
  modePillActive: { backgroundColor: theme.text },
  modePillText: { color: theme.subtext, fontWeight: '700', fontSize: 13 },
  modePillTextActive: { color: theme.bg },

  beigeTimerCircle: { width: 240, height: 240, borderRadius: 120, backgroundColor: theme.card, borderWidth: 2.5, borderColor: theme.border, justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  timerClockText: { color: theme.text, fontSize: 52, fontWeight: '900' },
  timerStatusText: { color: theme.subtext, fontSize: 14, fontWeight: '700', marginTop: 4 },
  
  timerControls: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  actionBtn: { paddingVertical: 16, paddingHorizontal: 36, borderRadius: 30, borderWidth: 1.5, borderColor: theme.border },
  startBtn: { backgroundColor: theme.text },
  pauseBtn: { backgroundColor: '#dc2626' },
  actionBtnText: { color: theme.bg, fontSize: 16, fontWeight: 'bold' },
  resetBtn: { paddingVertical: 16, paddingHorizontal: 20, borderRadius: 30, backgroundColor: theme.card, borderWidth: 1.5, borderColor: theme.border },
  resetBtnText: { color: theme.text, fontSize: 14, fontWeight: '700' },

  floatingNavBar: { position: 'absolute', bottom: 20, left: 20, right: 20, height: 64, backgroundColor: theme.card, borderRadius: 32, borderWidth: 1.5, borderColor: theme.border, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 10 },
  navItem: { alignItems: 'center' },
  navLabel: { color: theme.subtext, fontSize: 11, fontWeight: '700', marginTop: 2 },
  navLabelActive: { color: theme.text, fontWeight: '900' },

  // Modals & Calendar
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 20 },
  profileModalCard: { backgroundColor: theme.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 2, borderColor: theme.border, padding: 24 },
  calendarModalCard: { backgroundColor: theme.bg, borderRadius: 24, borderWidth: 2, borderColor: theme.border, padding: 20 },
  
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: theme.text, fontSize: 20, fontWeight: '900' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { color: theme.text, fontWeight: 'bold' },
  
  // Calendar Grid
  calendarNavRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  calNavBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
  calNavBtnText: { color: theme.text, fontWeight: '800', fontSize: 12 },
  calNavTitle: { color: theme.text, fontSize: 16, fontWeight: '900' },

  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' },
  calendarDayCell: { width: '12%', aspectRatio: 1, borderRadius: 10, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, justifyContent: 'center', alignItems: 'center' },
  calendarDayDisabled: { opacity: 0.25, backgroundColor: theme.mutedTrack, borderColor: theme.subtext },
  calendarDaySelected: { backgroundColor: theme.text },
  
  calendarDayText: { color: theme.text, fontWeight: '800', fontSize: 12 },
  calendarDayTextDisabled: { color: theme.subtext, textDecorationLine: 'line-through' },
  calendarDayTextSelected: { color: theme.bg },
  calendarFooterTip: { color: theme.subtext, fontSize: 11, fontWeight: '600', marginTop: 14, textAlign: 'center' },

  profileAvatarBox: { alignItems: 'center', marginBottom: 20 },
  largeAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.text, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  largeAvatarText: { color: theme.bg, fontSize: 22, fontWeight: '900' },
  profileName: { color: theme.text, fontSize: 20, fontWeight: '900' },
  profileSub: { color: theme.subtext, fontSize: 13, fontWeight: '600', marginTop: 2 },
  
  profileStatsRow: { flexDirection: 'row', backgroundColor: theme.card, borderRadius: 16, borderWidth: 1.5, borderColor: theme.border, padding: 14, marginBottom: 20 },
  profileStatItem: { flex: 1, alignItems: 'center' },
  statVal: { color: theme.text, fontSize: 18, fontWeight: '900' },
  statLbl: { color: theme.subtext, fontSize: 11, fontWeight: '700', marginTop: 2 },

  settingsSection: { marginBottom: 20 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.mutedTrack },
  settingText: { color: theme.text, fontSize: 14, fontWeight: '700' },
  settingBadge: { color: theme.subtext, fontSize: 12, fontWeight: '800' },

  growthPreviewCard: { width: '100%', alignItems: 'center', backgroundColor: '#e4eadc', borderRadius: 18, borderWidth: 1.5, borderColor: '#667a57', padding: 12, marginBottom: 16 },
  growthPreviewLabel: { color: '#526448', fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  growthPreviewEmoji: { fontSize: 42, marginVertical: 5 },
  growthPreviewText: { color: '#405238', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  // Reward journey UI
  ambientSoundCard: { backgroundColor: theme.card, borderRadius: 20, borderWidth: 1.5, borderColor: theme.border, padding: 18, marginTop: 16, marginBottom: 16 },
  ambientSoundTitle: { color: theme.text, fontSize: 17, fontWeight: '900', marginBottom: 5 },
  ambientSoundSubtitle: { color: theme.subtext, fontSize: 12, fontWeight: '600', marginBottom: 14 },
  ambientSoundChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ambientSoundChip: { borderRadius: 18, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bg, paddingVertical: 10, paddingHorizontal: 12 },
  ambientSoundChipActive: { backgroundColor: theme.text, borderColor: theme.text },
  ambientSoundChipText: { color: theme.text, fontSize: 12, fontWeight: '800' },
  ambientSoundChipTextActive: { color: theme.bg },
  ambientStopChip: { backgroundColor: theme.mutedTrack },
  ambientStopChipText: { color: theme.text, fontSize: 12, fontWeight: '800' },
  ambientSoundFootnote: { color: theme.subtext, fontSize: 10, marginTop: 12, lineHeight: 15 },
  rewardCollectionCard: { width: '100%', backgroundColor: theme.card, borderRadius: 20, borderWidth: 1.5, borderColor: theme.border, padding: 16, marginTop: 24, marginBottom: 24 },
  rewardCollectionTitle: { color: theme.text, fontSize: 17, fontWeight: '900', textAlign: 'center' },
  rewardCollectionSub: { color: theme.subtext, fontSize: 11, fontWeight: '700', textAlign: 'center', marginTop: 6 },
  rewardCollectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, backgroundColor: theme.bg, borderRadius: 12, padding: 8 },
  rewardMiniEmoji: { fontSize: 22 },
  rewardMiniName: { color: theme.text, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  rewardPickerCard: { width: '100%', backgroundColor: theme.bg, borderRadius: 26, borderWidth: 2, borderColor: theme.border, padding: 20 },
  rewardEyebrow: { color: theme.subtext, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center' },
  rewardPickerTitle: { color: theme.text, fontSize: 23, fontWeight: '900', textAlign: 'center', marginTop: 7 },
  rewardPickerSub: { color: theme.subtext, fontSize: 12, lineHeight: 18, fontWeight: '600', textAlign: 'center', marginTop: 8, marginBottom: 16 },
  greenhouseChoice: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e4eadc', borderRadius: 18, borderWidth: 1.5, borderColor: '#667a57', padding: 13, marginBottom: 10 },
  badgeChoice: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3e7ce', borderRadius: 18, borderWidth: 1.5, borderColor: '#9a7a40', padding: 13, marginBottom: 8 },
  rewardChoiceEmoji: { fontSize: 30, marginRight: 10 },
  rewardChoiceTextWrap: { flex: 1 },
  rewardChoiceTitle: { color: theme.text, fontSize: 14, fontWeight: '900' },
  rewardChoiceDescription: { color: '#514a40', fontSize: 11, lineHeight: 16, marginTop: 4, fontWeight: '600' },
  rewardCancelBtn: { alignItems: 'center', paddingVertical: 10, marginTop: 3 },
  rewardCancelText: { color: theme.subtext, fontSize: 13, fontWeight: '800' },
  celebrationCard: { width: '100%', backgroundColor: theme.bg, borderRadius: 28, borderWidth: 2, borderColor: theme.border, padding: 24, alignItems: 'center' },
  confettiRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 8 },
  confettiPiece: { color: '#b18a45', fontSize: 24, fontWeight: '900' },
  celebrationEmoji: { fontSize: 64, marginVertical: 6 },
  celebrationTitle: { color: theme.text, fontSize: 23, fontWeight: '900', textAlign: 'center' },
  celebrationMessage: { color: '#62594e', fontSize: 14, lineHeight: 21, fontWeight: '600', textAlign: 'center', marginTop: 10 },
  celebrationDetail: { color: '#667a57', fontSize: 14, fontWeight: '900', marginTop: 12 },
  celebrationStats: { color: theme.subtext, fontSize: 11, fontWeight: '700', marginTop: 10, textAlign: 'center' },
  celebrationButton: { backgroundColor: theme.text, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 24, marginTop: 20, width: '100%', alignItems: 'center' },
  celebrationButtonText: { color: theme.bg, fontSize: 14, fontWeight: '900' },

  themeToggle: { minWidth: 132, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7, paddingHorizontal: 10, borderRadius: 18, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card },
  themeToggleActive: { backgroundColor: '#252525' },
  themeToggleText: { color: theme.text, fontSize: 12, fontWeight: '800', marginRight: 8 },
  themeToggleKnob: { width: 16, height: 16, borderRadius: 8, backgroundColor: theme.subtext },
  themeToggleKnobActive: { backgroundColor: theme.bg },

  doneModalBtn: { backgroundColor: '#dc2626', borderRadius: 20, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: theme.border },
  doneModalBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' }
});