class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    try {
      this.muted = localStorage.getItem("gameMuted") === "true";
    } catch {
      this.muted = false;
    }
  }

  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public isMuted() {
    return this.muted;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    try {
      localStorage.setItem("gameMuted", muted ? "true" : "false");
    } catch (_) {}
  }

  // 1. Roll Dice: A sequence of short bouncing sounds
  public playRollDice() {
    if (this.muted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      
      const count = 5;
      for (let i = 0; i < count; i++) {
        const time = now + i * 0.08;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = "triangle";
        const startFreq = 220 - i * 25;
        osc.frequency.setValueAtTime(startFreq, time);
        osc.frequency.exponentialRampToValueAtTime(40, time + 0.06);
        
        gain.gain.setValueAtTime(0.12, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.06);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(time);
        osc.stop(time + 0.07);
      }
    } catch (e) {
      console.warn("Failed to play roll dice sound", e);
    }
  }

  // 2. Landing on Property: Clean and simple pleasant chime
  public playLandOnProperty() {
    if (this.muted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
      
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {
      console.warn("Failed to play land property sound", e);
    }
  }

  // 3. Building a House: Double hammer knock
  public playBuildHouse() {
    if (this.muted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      
      // Hammer 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(160, now);
      osc1.frequency.exponentialRampToValueAtTime(60, now + 0.07);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.08);
      
      // Hammer 2
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(190, now + 0.09);
      osc2.frequency.exponentialRampToValueAtTime(70, now + 0.16);
      gain2.gain.setValueAtTime(0.18, now + 0.09);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.09);
      osc2.stop(now + 0.17);
    } catch (e) {
      console.warn("Failed to play build house sound", e);
    }
  }

  // 4. Paying Rent: Slide down + metallic coin clinks
  public playPayRent() {
    if (this.muted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      
      // Downward buzz
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(150, now);
      osc1.frequency.linearRampToValueAtTime(80, now + 0.25);
      
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.26);
      
      // Coins
      const frequencies = [987.77, 1318.51, 1567.98]; // B5, E6, G6
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        gain.gain.setValueAtTime(0.05, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.13);
      });
    } catch (e) {
      console.warn("Failed to play pay rent sound", e);
    }
  }

  // 5. Winning the Game: Ascending major chord fanfare
  public playWinGame() {
    if (this.muted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4 major arpeggio to C6
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + index * 0.1);
        
        const subOsc = ctx.createOscillator();
        subOsc.type = "triangle";
        subOsc.frequency.setValueAtTime(freq + 4, now + index * 0.1);
        
        gain.gain.setValueAtTime(0.06, now + index * 0.1);
        const duration = index === notes.length - 1 ? 1.2 : 0.3;
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.1 + duration);
        
        osc.connect(gain);
        subOsc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + index * 0.1);
        subOsc.start(now + index * 0.1);
        
        osc.stop(now + index * 0.1 + duration + 0.05);
        subOsc.stop(now + index * 0.1 + duration + 0.05);
      });
    } catch (e) {
      console.warn("Failed to play win game sound", e);
    }
  }

  // 6. Hard Laughs: A teasing, sarcastic mock sequence for the passport debt.
  public playLaugh() {
    if (this.muted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      // Vocaloid-like "nyah" synthesizer
      const playNyah = (startTime: number, freq: number, length: number, volume: number) => {
        const osc = ctx.createOscillator();
        const subOsc = ctx.createOscillator();
        const mainGain = ctx.createGain();
        const formantFilter = ctx.createBiquadFilter();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, startTime);
        // Add a slight pitch slide up at the start for the nasal "ny-" transition
        osc.frequency.exponentialRampToValueAtTime(freq * 1.05, startTime + 0.05);

        subOsc.type = "triangle";
        subOsc.frequency.setValueAtTime(freq * 0.5, startTime);
        subOsc.frequency.exponentialRampToValueAtTime(freq * 0.5 * 1.05, startTime + 0.05);

        // Vocal formant filter (very high Q makes it sound nasal / vocal like "nyah")
        formantFilter.type = "bandpass";
        formantFilter.frequency.setValueAtTime(1000, startTime);
        formantFilter.Q.setValueAtTime(5.0, startTime);
        // sweep the filter downward to create the vowel sound "ah" (from "ee" to "ah")
        formantFilter.frequency.exponentialRampToValueAtTime(650, startTime + length);

        mainGain.gain.setValueAtTime(0, startTime);
        mainGain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
        mainGain.gain.linearRampToValueAtTime(volume * 0.8, startTime + length * 0.4);
        mainGain.gain.exponentialRampToValueAtTime(0.001, startTime + length - 0.01);

        osc.connect(formantFilter);
        subOsc.connect(mainGain); // Triangle bypasses filter to keep a clean low end
        formantFilter.connect(mainGain);
        mainGain.connect(ctx.destination);

        osc.start(startTime);
        subOsc.start(startTime);
        osc.stop(startTime + length);
        subOsc.stop(startTime + length);
      };

      // Slide whistle mock
      const playSlideWhistle = (startTime: number, startFreq: number, endFreq: number, length: number, volume: number) => {
        const osc = ctx.createOscillator();
        const mainGain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(startFreq, startTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + length);

        mainGain.gain.setValueAtTime(0, startTime);
        mainGain.gain.linearRampToValueAtTime(volume, startTime + 0.05);
        mainGain.gain.linearRampToValueAtTime(volume, startTime + length - 0.05);
        mainGain.gain.exponentialRampToValueAtTime(0.001, startTime + length);

        osc.connect(mainGain);
        mainGain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + length);
      };

      // 1. Play the classic playground taunt twice (0s to 4s)
      // Notes: G4 (392Hz), E4 (330Hz), A4 (440Hz), G4 (392Hz), E4 (330Hz)
      const tauntPitches = [392, 330, 440, 392, 330];
      const tauntRhythms = [0, 0.4, 0.8, 1.2, 1.6]; // seconds
      const tauntLengths = [0.25, 0.25, 0.25, 0.25, 0.5];

      // Phrase 1 (starts at 0.2s)
      tauntPitches.forEach((pitch, i) => {
        playNyah(now + 0.2 + tauntRhythms[i], pitch, tauntLengths[i], 0.12);
      });

      // Phrase 2 (starts at 2.4s, slightly higher pitch/mocking)
      tauntPitches.forEach((pitch, i) => {
        playNyah(now + 2.4 + tauntRhythms[i], pitch * 1.1, tauntLengths[i], 0.12);
      });

      // 2. Play funny rapid high-pitched teasing chuckles (4.6s to 7.0s)
      let chuckleTime = 4.6;
      for (let i = 0; i < 12; i++) {
        // High pitch staccato giggles
        const pitch = 500 + Math.sin(i * 1.5) * 50;
        playNyah(now + chuckleTime, pitch, 0.12, 0.08);
        chuckleTime += 0.18;
      }

      // 3. Play a comical slide whistle slide (7.2s to 9.5s)
      // "whoooop" slide up, then "wah-wah-wah-waaaah"
      playSlideWhistle(now + 7.2, 300, 700, 0.4, 0.1); // slide up
      playSlideWhistle(now + 7.6, 700, 200, 0.6, 0.1); // slide down

      // Classic final "wah" note at 8.3s
      playNyah(now + 8.3, 147, 1.2, 0.15); // Low brassy D3

    } catch (e) {
      console.warn("Failed to play teasing sound", e);
    }
  }

  // 7. Player Turn Notification: Clear double-ding bell chime
  public playTurnBell() {
    if (this.muted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      const playDing = (time: number, freq: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.25, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.9);

        // Metallic overtone for authentic bell ring
        const overtone = ctx.createOscillator();
        const overtoneGain = ctx.createGain();
        overtone.type = "sine";
        overtone.frequency.setValueAtTime(freq * 2.4, time);
        overtoneGain.gain.setValueAtTime(0, time);
        overtoneGain.gain.linearRampToValueAtTime(0.1, time + 0.005);
        overtoneGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);
        overtone.connect(overtoneGain);
        overtoneGain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + 0.95);
        overtone.start(time);
        overtone.stop(time + 0.5);
      };

      // Double ding bell: C6 (1046.50Hz) then G6 (1567.98Hz)
      playDing(now, 1046.5);
      playDing(now + 0.16, 1567.98);
    } catch (e) {
      console.warn("Failed to play turn bell sound", e);
    }
  }

  // 8. Go To Jail: Play pols_aa_gayi.mp3 from public folder
  public playGoToJail() {
    if (this.muted) return;
    try {
      const audio = new Audio("/pols_aa_gayi.mp3");
      audio.volume = 0.9;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((e) => {
          console.warn("Failed to play /pols_aa_gayi.mp3 audio, falling back to audio synthesis", e);
          this.playJailSirenSynth();
        });
      }
    } catch (e) {
      console.warn("Failed to play jail sound", e);
      this.playJailSirenSynth();
    }
  }

  // Fallback synthesizer for jail sound (siren + metal slam)
  private playJailSirenSynth() {
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      // Heavy metallic cell door slam
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);

      // Police siren wail
      const siren = ctx.createOscillator();
      const sirenGain = ctx.createGain();
      siren.type = "sine";
      siren.frequency.setValueAtTime(600, now);
      siren.frequency.linearRampToValueAtTime(900, now + 0.2);
      siren.frequency.linearRampToValueAtTime(500, now + 0.4);
      siren.frequency.linearRampToValueAtTime(800, now + 0.6);

      sirenGain.gain.setValueAtTime(0.15, now);
      sirenGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      siren.connect(sirenGain);
      sirenGain.connect(ctx.destination);
      siren.start(now);
      siren.stop(now + 0.7);
    } catch (e) {
      console.warn("Failed synth fallback", e);
    }
  }

  // 9. Step Hop: Short pleasant pop sound for avatar stepping tile to tile
  public playStepHop() {
    if (this.muted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(650, now + 0.05);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) {
      console.warn("Failed step hop sound", e);
    }
  }
}

export const soundEffects = new SoundEffectsManager();
