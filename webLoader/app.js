import { ESPLoader, Transport } from "https://unpkg.com/esptool-js@0.5.6/bundle.js";

const binSelect = document.getElementById("binSelect");
const binFile = document.getElementById("binFile");
const flashOffset = document.getElementById("flashOffset");
const baudRate = document.getElementById("baudRate");
const connectBtn = document.getElementById("connectBtn");
const flashBtn = document.getElementById("flashBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const logEl = document.getElementById("log");
const flashStatus = document.getElementById("flashStatus");

const monitorBaud = document.getElementById("monitorBaud");
const monitorConnectBtn = document.getElementById("monitorConnectBtn");
const monitorDisconnectBtn = document.getElementById("monitorDisconnectBtn");
const monitorAutoScroll = document.getElementById("monitorAutoScroll");
const monitorClearBtn = document.getElementById("monitorClearBtn");
const monitorOutput = document.getElementById("monitorOutput");
const monitorInput = document.getElementById("monitorInput");
const monitorSendBtn = document.getElementById("monitorSendBtn");
const monitorStatus = document.getElementById("monitorStatus");

const PREPARED_BIN_OFFSET = 0x0;

let transport = null;
let loader = null;

let monitorPort = null;
let monitorReader = null;
let monitorWriter = null;
let monitorTextDecoder = null;
let monitorTextEncoder = null;
let monitorKeepReading = false;

function logLine(text) {
  logEl.value += `${text}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

function logMonitor(text) {
  monitorOutput.value += text;
  if (monitorAutoScroll.checked) {
    monitorOutput.scrollTop = monitorOutput.scrollHeight;
  }
}

function setFlashConnected(connected) {
  flashStatus.textContent = connected ? "Connected" : "Disconnected";
  flashStatus.classList.toggle("active", connected);
}

function setMonitorConnected(connected) {
  monitorStatus.textContent = connected ? "Running" : "Stopped";
  monitorStatus.classList.toggle("active", connected);
}

const terminal = {
  clean() {
    logEl.value = "";
  },
  writeLine(data) {
    logLine(data);
  },
  write(data) {
    logEl.value += data;
    logEl.scrollTop = logEl.scrollHeight;
  }
};


function toBinaryString(bytes) {
  const chunkSize = 0x8000;
  let result = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    result += String.fromCharCode(...chunk);
  }
  return result;
}

async function getSelectedBin() {
  if (binFile.files && binFile.files.length > 0) {
    return { file: binFile.files[0], isPrepared: false };
  }

  const selected = binSelect.value;
  if (!selected) {
    throw new Error("No BIN selected.");
  }

  const response = await fetch(`./${selected}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch BIN: ${selected}`);
  }

  const buffer = await response.arrayBuffer();
  return {
    file: new File([buffer], selected, { type: "application/octet-stream" }),
    isPrepared: true
  };
}

async function connect() {
  if (!navigator.serial) {
    throw new Error("Web Serial is not available in this browser.");
  }
  if (monitorPort) {
    throw new Error("Stop Serial Monitor before connecting flasher.");
  }

  const device = await navigator.serial.requestPort({ filters: [] });
  transport = new Transport(device);

  const baud = Number.parseInt(baudRate.value, 10);
  loader = new ESPLoader({ transport, baudrate: baud, terminal });

  terminal.clean();
  await loader.main();

  connectBtn.disabled = true;
  flashBtn.disabled = false;
  disconnectBtn.disabled = false;
  setFlashConnected(true);
}

async function flash() {
  if (!loader) {
    throw new Error("Not connected.");
  }

  const { file, isPrepared } = await getSelectedBin();
  const arrayBuffer = await file.arrayBuffer();
  const data = toBinaryString(new Uint8Array(arrayBuffer));

  let offset;
  if (isPrepared) {
    offset = PREPARED_BIN_OFFSET;
    flashOffset.value = "0x0";
  } else {
    const offsetRaw = flashOffset.value.trim();
    offset = offsetRaw.startsWith("0x")
      ? Number.parseInt(offsetRaw, 16)
      : Number.parseInt(offsetRaw, 10);

    if (!Number.isFinite(offset)) {
      throw new Error("Invalid flash offset.");
    }
  }

  await loader.writeFlash({
    fileArray: [{ data, address: offset }],
    flashSize: "keep",
    flashMode: "keep",
    flashFreq: "keep",
    compress: true,
    eraseAll: false
  });

  await loader.after("hard_reset");
}

async function disconnect() {
  if (transport) {
    await transport.disconnect();
  }
  transport = null;
  loader = null;

  connectBtn.disabled = false;
  flashBtn.disabled = true;
  disconnectBtn.disabled = true;
  setFlashConnected(false);
}

async function startMonitor() {
  if (!navigator.serial) {
    throw new Error("Web Serial is not available in this browser.");
  }
  if (transport) {
    throw new Error("Disconnect flasher before starting Serial Monitor.");
  }
  if (monitorPort) {
    throw new Error("Serial monitor is already running.");
  }

  monitorPort = await navigator.serial.requestPort({ filters: [] });
  await monitorPort.open({ baudRate: Number.parseInt(monitorBaud.value, 10) });

  monitorTextDecoder = new TextDecoderStream();
  monitorTextEncoder = new TextEncoder();
  monitorPort.readable.pipeTo(monitorTextDecoder.writable).catch(() => {});
  monitorReader = monitorTextDecoder.readable.getReader();
  monitorWriter = monitorPort.writable.getWriter();
  monitorKeepReading = true;

  monitorConnectBtn.disabled = true;
  monitorDisconnectBtn.disabled = false;
  monitorSendBtn.disabled = false;
  monitorInput.disabled = false;
  setMonitorConnected(true);

  while (monitorKeepReading && monitorReader) {
    const { value, done } = await monitorReader.read();
    if (done) {
      break;
    }
    if (value) {
      logMonitor(value);
    }
  }
}

async function stopMonitor() {
  monitorKeepReading = false;

  if (monitorReader) {
    await monitorReader.cancel().catch(() => {});
    monitorReader.releaseLock();
    monitorReader = null;
  }

  if (monitorWriter) {
    monitorWriter.releaseLock();
    monitorWriter = null;
  }

  if (monitorPort) {
    await monitorPort.close().catch(() => {});
    monitorPort = null;
  }

  monitorTextDecoder = null;
  monitorTextEncoder = null;

  monitorConnectBtn.disabled = false;
  monitorDisconnectBtn.disabled = true;
  monitorSendBtn.disabled = true;
  monitorInput.disabled = true;
  setMonitorConnected(false);
}

async function sendToMonitor() {
  if (!monitorWriter || !monitorTextEncoder) {
    throw new Error("Serial monitor is not running.");
  }

  const payload = monitorInput.value;
  if (!payload) {
    return;
  }

  await monitorWriter.write(monitorTextEncoder.encode(`${payload}\n`));
  monitorInput.value = "";
}

connectBtn.addEventListener("click", async () => {
  try {
    logLine("Connecting...");
    await connect();
    logLine("Connected.");
  } catch (error) {
    logLine(`Error: ${error.message || error}`);
  }
});

flashBtn.addEventListener("click", async () => {
  try {
    logLine("Flashing...");
    await flash();
    logLine("Flash complete.");
  } catch (error) {
    logLine(`Error: ${error.message || error}`);
  }
});

disconnectBtn.addEventListener("click", async () => {
  try {
    await disconnect();
    logLine("Disconnected.");
  } catch (error) {
    logLine(`Error: ${error.message || error}`);
  }
});

monitorConnectBtn.addEventListener("click", async () => {
  try {
    logMonitor("[monitor] Starting...\n");
    await startMonitor();
    logMonitor("[monitor] Connected.\n");
  } catch (error) {
    logMonitor(`[monitor] Error: ${error.message || error}\n`);
    await stopMonitor().catch(() => {});
  }
});

monitorDisconnectBtn.addEventListener("click", async () => {
  try {
    await stopMonitor();
    logMonitor("[monitor] Stopped.\n");
  } catch (error) {
    logMonitor(`[monitor] Error: ${error.message || error}\n`);
  }
});

monitorClearBtn.addEventListener("click", () => {
  monitorOutput.value = "";
});

monitorSendBtn.addEventListener("click", async () => {
  try {
    await sendToMonitor();
  } catch (error) {
    logMonitor(`[monitor] Error: ${error.message || error}\n`);
  }
});

monitorInput.addEventListener("keydown", async (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    try {
      await sendToMonitor();
    } catch (error) {
      logMonitor(`[monitor] Error: ${error.message || error}\n`);
    }
  }
});

window.addEventListener("beforeunload", () => {
  if (transport) {
    transport.disconnect().catch(() => {});
  }
  if (monitorReader) {
    monitorReader.cancel().catch(() => {});
  }
  if (monitorPort) {
    monitorPort.close().catch(() => {});
  }
});

if (!binSelect.options.length) {
  logLine("No BIN files configured in the selector.");
  flashBtn.disabled = true;
}

monitorSendBtn.disabled = true;
monitorInput.disabled = true;
setFlashConnected(false);
setMonitorConnected(false);

