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
  startNoise({ volume: 0.012, low: 55, high: 260, playbackRate: 0.42 });

  const air = addNode(state.context.createOscillator());
  const airGain = connectGain(0.006);
  air.type = "sine";
  air.frequency.value = 118;
  air.connect(airGain);
  air.start();

  const pageTurn = () => {
    const swipes = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < swipes; i += 1) {
      window.setTimeout(() => {
        noiseBurst({
          duration: 0.05 + Math.random() * 0.13,
          volume: 0.022 + Math.random() * 0.035,
          low: 900 + Math.random() * 700,
          high: 2800 + Math.random() * 1800,
          q: 0.8,
          fadeIn: 0.004,
          fadeOut: 0.04,
          playbackRate: 0.85 + Math.random() * 0.45,
        });
      }, i * (55 + Math.random() * 95));
    }
  };

  scheduleRandom(pageTurn, 450, 4200);

  scheduleRandom(() => {
    noiseBurst({
      duration: 0.09 + Math.random() * 0.08,
      volume: 0.026,
      low: 95,
      high: 520,
      fadeIn: 0.006,
      fadeOut: 0.11,
      playbackRate: 0.55 + Math.random() * 0.2,
    });
    window.setTimeout(() => {
      noiseBurst({
        duration: 0.08,
        volume: 0.018,
        low: 110,
        high: 460,
        fadeIn: 0.005,
        fadeOut: 0.09,
        playbackRate: 0.6,
      });
    }, 360 + Math.random() * 220);
  }, 2200, 8400);

  scheduleRandom(() => {
    chime(84 + Math.random() * 20, 0.08, 0.018, "triangle");
    noiseBurst({
      duration: 0.12 + Math.random() * 0.16,
      volume: 0.018,
      low: 140,
      high: 950,
      fadeIn: 0.008,
      fadeOut: 0.16,
      playbackRate: 0.65,
    });
  }, 3800, 12500);

  scheduleRandom(() => {
    chime(155 + Math.random() * 26, 0.06, 0.012, "sine");
  }, 2600, 9500);
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
  startNoise({ volume: 0.022, low: 75, high: 1200, playbackRate: 0.48 });

  const drone = addNode(state.context.createOscillator());
  const droneGain = connectGain(0.032);
  drone.type = "sawtooth";
  drone.frequency.value = 73.42;
  drone.connect(droneGain);
  drone.start();

  const pulse = addNode(state.context.createOscillator());
  const pulseGain = connectGain(0.018);
  pulse.type = "square";
  pulse.frequency.value = 36.71;
  pulse.connect(pulseGain);
  pulse.start();

  const pattern = [146.83, 146.83, 174.61, 164.81, 146.83, 123.47, 130.81, 110];
  let step = 0;

  addTimer(window.setInterval(() => {
    const beat = step % 8;
    const note = pattern[beat];

    chime(beat === 0 || beat === 4 ? 73.42 : 98, 0.11, beat === 0 ? 0.105 : 0.065, "sine");

    if (beat === 2 || beat === 6) {
      chime(220 + Math.random() * 90, 0.045, 0.035, "square");
    }

    chime(note, 0.16, 0.044, "triangle");
    if (beat === 3 || beat === 7) {
      window.setTimeout(() => chime(note * 2, 0.1, 0.03, "sawtooth"), 90);
    }

    step += 1;
  }, 285));

  scheduleRandom(() => {
    const accents = [293.66, 329.63, 392, 440];
    const note = accents[Math.floor(Math.random() * accents.length)];
    chime(note, 0.22, 0.032, "sawtooth");
    window.setTimeout(() => chime(note * 0.75, 0.18, 0.026, "triangle"), 120);
  }, 1800, 3400);
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
