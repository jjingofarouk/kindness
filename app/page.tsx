'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import styles from './page.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faHeart, faCheck, faCopy } from '@fortawesome/free-solid-svg-icons';
import { faTwitter } from '@fortawesome/free-brands-svg-icons';

interface Act {
  id: string;
  act: string;
  category: string;
  difficulty: string;
}

export default function Home() {
  const [acts, setActs] = useState<Act[]>([]);
  const [currentAct, setCurrentAct] = useState<Act | null>(null);
  const [completedActs, setCompletedActs] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [completedToday, setCompletedToday] = useState(0);
  const dailyGoal = 3;

  useEffect(() => {
    loadSavedData();
    fetchActs();
    checkDailyReset();
  }, []);

  const loadSavedData = () => {
    const saved = localStorage.getItem('kindnessData');
    if (saved) {
      const data = JSON.parse(saved);
      setCompletedActs(new Set(data.completed));
      setStreak(data.streak);
    }
  };

  const saveData = () => {
    const data = {
      completed: Array.from(completedActs),
      streak: streak,
    };
    localStorage.setItem('kindnessData', JSON.stringify(data));
  };

  const fetchActs = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'acts'));
      const actsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Act));
      setActs(actsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching acts:', error);
      setError(true);
      setLoading(false);
    }
  };

  const generateAct = async (category = 'all') => {
    setLoading(true);
    setError(false);
    if (acts.length === 0) await fetchActs();
    const filteredActs = category === 'all' ? acts : acts.filter(act => act.category === category);
    const randomAct = filteredActs[Math.floor(Math.random() * filteredActs.length)];
    setCurrentAct(randomAct);
    setLoading(false);
  };

  const markCompleted = async () => {
    if (!currentAct) return;
    setCompletedActs(prev => new Set(prev).add(currentAct.id));
    setCompletedToday(prev => {
      const newCount = prev + 1;
      localStorage.setItem('completedToday', newCount.toString());
      return newCount;
    });
    await addDoc(collection(db, 'completedActs'), {
      actId: currentAct.id,
      timestamp: Timestamp.now(),
    });
    createConfetti();
    saveData();
    updateProgressBar();
  };

  const createConfetti = () => {
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = styles.confetti;
      confetti.style.left = Math.random() * 100 + 'vw';
      confetti.style.animationDelay = Math.random() * 3 + 's';
      confetti.style.background = `hsl(${Math.random() * 360}, 50%, 50%)`;
      document.body.appendChild(confetti);
      setTimeout(() => confetti.remove(), 3000);
    }
  };

  const updateProgressBar = () => {
    const progress = (completedToday / dailyGoal) * 100;
    return {
      width: `${Math.min(progress, 100)}%`,
      background: completedToday >= dailyGoal ? 'linear-gradient(90deg, #00b894, #00cec9)' : '#00b894',
    };
  };

  const checkDailyReset = () => {
    const today = new Date().toDateString();
    const lastReset = localStorage.getItem('lastResetDate');
    if (lastReset !== today) {
      localStorage.setItem('lastResetDate', today);
      localStorage.setItem('completedToday', '0');
      setCompletedToday(0);
    }
    const lastActive = localStorage.getItem('lastActiveDate');
    if (lastActive !== today) {
      localStorage.setItem('lastActiveDate', today);
      setStreak(prev => isConsecutiveDay(lastActive) ? prev + 1 : 1);
      saveData();
    }
  };

  const isConsecutiveDay = (lastDate: string | null) => {
    if (!lastDate) return false;
    const last = new Date(lastDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - last.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
  };

  const shareAct = () => {
    if (!currentAct) return;
    const text = encodeURIComponent(`🌟 Today's Random Act of Kindness: ${currentAct.act}\n#RandomActsOfKindness #Kindness`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`);
  };

  const copyAct = () => {
    if (!currentAct) return;
    navigator.clipboard.writeText(currentAct.act).then(() => {
      alert('Copied to clipboard!');
    });
  };

  const donate = () => {
    window.open('https://www.buymeacoffee.com/jjingofarouk', '_blank');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Random Acts of Kindness</h1>
        <p>Make someone's day better with a simple act of kindness!</p>
      </div>

      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{acts.length}</div>
          <div className={styles.statLabel}>Total Acts</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{completedActs.size}</div>
          <div className={styles.statLabel}>Completed</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{streak}</div>
          <div className={styles.statLabel}>Day Streak</div>
        </div>
      </div>

      <div className={styles.kindnessCard}>
        <div className={styles.decorativeLine}></div>
        {loading && (
          <div className={styles.loading}>
            <FontAwesomeIcon icon={faSpinner} spin /> Loading...
          </div>
        )}
        {error && (
          <div className={styles.errorMessage}>
            Unable to load acts of kindness. Please try again later.
          </div>
        )}
        <p className={styles.actText}>
          {currentAct ? currentAct.act : 'Click the button below to get your random act of kindness for today!'}
        </p>
        <div className={styles.actDetails}>
          <span className={styles.detailTag}>Category: {currentAct?.category || ''}</span>
          <span className={styles.detailTag}>Difficulty: {currentAct?.difficulty || ''}</span>
        </div>
        <button className={styles.button} onClick={() => generateAct()} disabled={loading}>
          <FontAwesomeIcon icon={faHeart} /> Generate Act of Kindness
        </button>
        <div className={styles.socialShare}>
          <button className={styles.shareButton} onClick={markCompleted}>
            <FontAwesomeIcon icon={faCheck} /> Mark Complete
          </button>
          <button className={styles.shareButton} onClick={shareAct}>
            <FontAwesomeIcon icon={faTwitter} /> Share
          </button>
          <button className={styles.shareButton} onClick={copyAct}>
            <FontAwesomeIcon icon={faCopy} /> Copy
          </button>
        </div>
      </div>

      <div className={styles.completionTracker}>
        <h3>Daily Progress</h3>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={updateProgressBar()}></div>
        </div>
        <p>
          {completedToday >= dailyGoal
            ? "Daily goal achieved! You're amazing! 🎉"
            : `${completedToday} of ${dailyGoal} acts completed today`}
        </p>
      </div>

      <div className={styles.donationSection}>
        <h2>Support Random Acts of Kindness</h2>
        <p>Your contribution helps us keep this initiative alive and spread kindness to more people around the world.</p>
        <button className={`${styles.button} ${styles.donateButton}`} onClick={donate}>
          Buy Me A Coffee
        </button>
      </div>
    </div>
  );
}