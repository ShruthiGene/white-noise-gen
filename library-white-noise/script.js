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

function scheduleRandom(fn, minMs, maxMs) {
  const tick = () => {
    if (!state.playing) return;
    fn();
    addTimer(window.setTimeout(tick, minMs + Math.random() * (maxMs - minMs)));
  };
  tick();
}

function libraryMode() {
  startNoise({ volume: 0.045, low: 650, high: 5200 });
  startNoise({ volume: 0.025, low: 80, high: 420, playbackRate: 0.6 });

  scheduleRandom(() => {
    const burst = state.context.createBufferSource();
    const filter = state.context.createBiquadFilter();
    const gain = connectGain(0.08);
    burst.buffer = createNoiseBuffer(0.18);
    filter.type = "bandpass";
    filter.frequency.value = 1900 + Math.random() * 1300;
    filter.Q.value = 1.8;
    burst.connect(filter);
    filter.connect(gain);
    burst.start();
    burst.stop(state.context.currentTime + 0.12 + Math.random() * 0.18);
    addNode(burst);
    addNode(filter);
  }, 900, 2600);

  scheduleRandom(() => chime(92 + Math.random() * 18, 0.16, 0.035, "triangle"), 1800, 5200);
  scheduleRandom(() => chime(130 + Math.random() * 45, 0.08, 0.025, "sine"), 2400, 7200);
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
  startNoise({ volume: 0.026, low: 90, high: 1500, playbackRate: 0.5 });
  const notes = [110, 130.81, 146.83, 164.81, 196, 220];
  scheduleRandom(() => {
    const note = notes[Math.floor(Math.random() * notes.length)];
    chime(note, 0.28, 0.045, "triangle");
    window.setTimeout(() => chime(note * 2, 0.18, 0.024, "triangle"), 130);
  }, 680, 1600);
  scheduleRandom(() => chime(73.42, 2.8, 0.022, "sine"), 3000, 5800);
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
