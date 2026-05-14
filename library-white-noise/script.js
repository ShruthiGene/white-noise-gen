const AudioContextClass = window.AudioContext || window.webkitAudioContext;

const state = {
  context: null,
  master: null,
  playing: false,
  mode: "library",
  nodes: [],
  timers: [],
};

const modeTitles = {
  library: "Quiet Library",
  fantasy: "Epic Fantasy",
  cyberpunk: "Cyberpunk",
  witcher: "Monster Hunter",
};

const playButton = document.querySelector("#playButton");
const volume = document.querySelector("#volume");
const modeTitle = document.querySelector("#modeTitle");
const modeButtons = [...document.querySelectorAll(".mode")];

function initAudio() {
  if (state.context) return;
  state.context = new AudioContextClass();
  state.master = state.context.createGain();
  state.master.gain.value = Number(volume.value);
  state.master.connect(state.context.destination);
}

function createNoiseBuffer(seconds = 2) {
  const sampleRate = state.context.sampleRate;
  const buffer = state.context.createBuffer(1, sampleRate * seconds, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function addNode(node) {
  state.nodes.push(node);
  return node;
}

function addTimer(timer) {
  state.timers.push(timer);
  return timer;
}

function connectGain(value) {
  const gain = addNode(state.context.createGain());
  gain.gain.value = value;
  gain.connect(state.master);
  return gain;
}

function startNoise({ volume: gainValue, low = 350, high = 3800, playbackRate = 1 }) {
  const source = addNode(state.context.createBufferSource());
  const lowpass = addNode(state.context.createBiquadFilter());
  const highpass = addNode(state.context.createBiquadFilter());
  const gain = connectGain(gainValue);

  source.buffer = createNoiseBuffer(3);
  source.loop = true;
  source.playbackRate.value = playbackRate;
  highpass.type = "highpass";
  highpass.frequency.value = low;
  lowpass.type = "lowpass";
  lowpass.frequency.value = high;

  source.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(gain);
  source.start();
}

function chime(frequency, duration, gainValue, type = "sine", destination = state.master) {
  const now = state.context.currentTime;
  const osc = addNode(state.context.createOscillator());
  const gain = addNode(state.context.createGain());
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(now);
  osc.stop(now + duration + 0.04);
}

function noiseBurst({
  duration = 0.12,
  volume: gainValue = 0.04,
  low = 300,
  high = 3000,
  q = 1,
  fadeIn = 0.01,
  fadeOut = 0.08,
  playbackRate = 1,
}) {
  const now = state.context.currentTime;
  const source = addNode(state.context.createBufferSource());
  const highpass = addNode(state.context.createBiquadFilter());
  const lowpass = addNode(state.context.createBiquadFilter());
  const gain = addNode(state.context.createGain());

  source.buffer = createNoiseBuffer(Math.max(0.25, duration + 0.1));
  source.playbackRate.value = playbackRate;
  highpass.type = "highpass";
  highpass.frequency.value = low;
  highpass.Q.value = q;
  lowpass.type = "lowpass";
  lowpass.frequency.value = high;
  lowpass.Q.value = q;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainValue, now + fadeIn);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + fadeOut);

  source.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(state.master);
  source.start(now);
  source.stop(now + duration + fadeOut + 0.05);
}

function scheduleRandom(fn, minMs, maxMs) {
  const tick = () => {
    if (!state.playing) return;
    fn();
    addTimer(window.setTimeout(tick, minMs + Math.random() * (maxMs - minMs)));
  };
  tick();
}

function libraryMode() {
  startNoise({ volume: 0.006, low: 45, high: 170, playbackRate: 0.35 });

  const air = addNode(state.context.createOscillator());
  const airGain = connectGain(0.004);
  air.type = "sine";
  air.frequency.value = 96;
  air.connect(airGain);
  air.start();

  const pageTurn = () => {
    const swipes = Math.random() > 0.74 ? 2 : 1;
    for (let i = 0; i < swipes; i += 1) {
      window.setTimeout(() => {
        noiseBurst({
          duration: 0.16 + Math.random() * 0.26,
          volume: 0.012 + Math.random() * 0.018,
          low: 1250 + Math.random() * 600,
          high: 2600 + Math.random() * 1300,
          q: 0.8,
          fadeIn: 0.025,
          fadeOut: 0.18,
          playbackRate: 0.72 + Math.random() * 0.28,
        });
      }, i * (220 + Math.random() * 170));
    }
  };

  scheduleRandom(pageTurn, 2200, 7600);

  scheduleRandom(() => {
    noiseBurst({
      duration: 0.18 + Math.random() * 0.16,
      volume: 0.014,
      low: 70,
      high: 310,
      fadeIn: 0.035,
      fadeOut: 0.22,
      playbackRate: 0.45 + Math.random() * 0.18,
    });
  }, 8500, 19000);

  scheduleRandom(() => {
    chime(70 + Math.random() * 16, 0.16, 0.009, "triangle");
    noiseBurst({
      duration: 0.28 + Math.random() * 0.24,
      volume: 0.01,
      low: 115,
      high: 620,
      fadeIn: 0.04,
      fadeOut: 0.26,
      playbackRate: 0.52,
    });
  }, 12000, 26000);

  scheduleRandom(() => {
    chime(142 + Math.random() * 16, 0.11, 0.006, "sine");
  }, 9000, 24000);
}

function fantasyMode() {
  startNoise({ volume: 0.022, low: 70, high: 900, playbackRate: 0.4 });
  const notes = [146.83, 196, 220, 246.94, 293.66, 329.63];
  addTimer(window.setInterval(() => {
    const note = notes[Math.floor(Math.random() * notes.length)];
    chime(note, 4.5, 0.028, "sine");
    chime(note * 1.5, 3.2, 0.015, "triangle");
  }, 2400));
}

function cyberpunkMode() {
  startNoise({ volume: 0.035, low: 45, high: 1200, playbackRate: 0.55 });
  const bass = addNode(state.context.createOscillator());
  const bassGain = connectGain(0.045);
  bass.type = "sawtooth";
  bass.frequency.value = 55;
  bass.connect(bassGain);
  bass.start();

  addTimer(window.setInterval(() => chime(110, 0.12, 0.065, "square"), 520));
  addTimer(window.setInterval(() => chime(880 + Math.random() * 240, 0.06, 0.018, "sawtooth"), 1700));
}

function witcherMode() {
  const root = 98;
  const bass = addNode(state.context.createOscillator());
  const bassGain = connectGain(0.038);
  bass.type = "triangle";
  bass.frequency.value = root / 2;
  bass.connect(bassGain);
  bass.start();

  const harmony = addNode(state.context.createOscillator());
  const harmonyGain = connectGain(0.018);
  harmony.type = "sine";
  harmony.frequency.value = root * 1.5;
  harmony.connect(harmonyGain);
  harmony.start();

  const pattern = [196, 246.94, 293.66, 329.63, 293.66, 246.94, 220, 246.94];
  const chords = [
    [98, 146.83, 196],
    [110, 164.81, 220],
    [130.81, 196, 261.63],
    [146.83, 220, 293.66],
  ];
  let step = 0;

  addTimer(window.setInterval(() => {
    const beat = step % 8;
    const note = pattern[beat];
    const chord = chords[Math.floor(step / 8) % chords.length];

    if (beat === 0 || beat === 4) {
      chime(chord[0] / 2, 0.2, 0.09, "triangle");
    }

    chime(note, 0.22, beat % 2 === 0 ? 0.048 : 0.035, "triangle");
    if (beat === 1 || beat === 5) {
      chime(chord[1], 0.34, 0.03, "sine");
      chime(chord[2], 0.34, 0.024, "sine");
    }

    if (beat === 7) {
      window.setTimeout(() => chime(note * 1.5, 0.16, 0.042, "triangle"), 105);
    }

    step += 1;
  }, 245));

  scheduleRandom(() => {
    const run = [392, 440, 493.88, 587.33, 659.25];
    run.forEach((note, index) => {
      window.setTimeout(() => chime(note, 0.14, 0.034, "triangle"), index * 95);
    });
  }, 5200, 9400);
}

function clearSound() {
  state.timers.forEach((timer) => {
    window.clearTimeout(timer);
    window.clearInterval(timer);
  });
  state.timers = [];
  state.nodes.forEach((node) => {
    try {
      if (typeof node.stop === "function") node.stop();
      if (typeof node.disconnect === "function") node.disconnect();
    } catch (error) {
      // Nodes may already be stopped; browser audio APIs throw in that case.
    }
  });
  state.nodes = [];
}

function startMode() {
  clearSound();
  const modes = {
    library: libraryMode,
    fantasy: fantasyMode,
    cyberpunk: cyberpunkMode,
    witcher: witcherMode,
  };
  modes[state.mode]();
}

async function togglePlay() {
  initAudio();
  if (state.context.state === "suspended") {
    await state.context.resume();
  }

  state.playing = !state.playing;
  document.body.classList.toggle("playing", state.playing);
  playButton.textContent = state.playing ? "Pause" : "Play";
  playButton.setAttribute("aria-pressed", String(state.playing));

  if (state.playing) {
    startMode();
  } else {
    clearSound();
  }
}

playButton.addEventListener("click", togglePlay);

volume.addEventListener("input", () => {
  if (state.master) {
    state.master.gain.value = Number(volume.value);
  }
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.mode = button.dataset.mode;
    modeTitle.textContent = modeTitles[state.mode];
    modeButtons.forEach((item) => item.classList.toggle("active", item === button));
    if (state.playing) startMode();
  });
});
