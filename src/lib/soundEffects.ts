/**
 * Sound Effects Manager for Gamified Learning
 * Handles all audio feedback in the application
 */

type SoundType = 'correct' | 'wrong' | 'xp_gain' | 'level_up' | 'heart_loss' | 'streak_continue' | 'achievement';

class SoundManager {
  private sounds: Record<SoundType, HTMLAudioElement | null> = {
    correct: null,
    wrong: null,
    xp_gain: null,
    level_up: null,
    heart_loss: null,
    streak_continue: null,
    achievement: null
  };
  
  private enabled = true;
  private volume = 0.5;

  constructor() {
    this.preloadSounds();
  }

  private preloadSounds() {
    // Sound files to be added to public/sounds/
    const soundFiles: Record<SoundType, string> = {
      correct: '/sounds/correct.mp3',
      wrong: '/sounds/wrong.mp3',
      xp_gain: '/sounds/xp-gain.mp3',
      level_up: '/sounds/level-up.mp3',
      heart_loss: '/sounds/heart-loss.mp3',
      streak_continue: '/sounds/streak.mp3',
      achievement: '/sounds/achievement.mp3'
    };

    Object.entries(soundFiles).forEach(([key, path]) => {
      try {
        const audio = new Audio(path);
        audio.preload = 'auto';
        audio.volume = this.volume;
        this.sounds[key as SoundType] = audio;
      } catch (error) {
        console.warn(`Failed to preload sound: ${key}`, error);
        this.sounds[key as SoundType] = null;
      }
    });
  }

  play(type: SoundType) {
    if (!this.enabled) return;
    
    const sound = this.sounds[type];
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(e => {
        console.log(`Sound play failed for ${type}:`, e);
      });
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    Object.values(this.sounds).forEach(sound => {
      if (sound) sound.volume = this.volume;
    });
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  isEnabled() {
    return this.enabled;
  }
}

// Singleton instance
export const soundManager = new SoundManager();

// Helper function for quick sound playback
export const playSound = (type: SoundType) => {
  soundManager.play(type);
};
