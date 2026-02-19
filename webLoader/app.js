import { ESPLoader, Transport } from "https://unpkg.com/esptool-js@0.5.6/bundle.js";

const binSelect = document.getElementById("binSelect");
const binFile = document.getElementById("binFile");
const flashOffset = document.getElementById("flashOffset");
const baudRate = document.getElementById("baudRate");
const connectBtn = document.getElementById("connectBtn");
const flashBtn = document.getElementById("flashBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const logEl = document.getElementById("log");

const PREPARED_BIN_OFFSET = 0x0;

let transport = null;
let loader = null;

function logLine(text) {
  logEl.value += `${text}\n`;
  logEl.scrollTop = logEl.scrollHeight;
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
  const device = await navigator.serial.requestPort({ filters: [] });
  transport = new Transport(device);

  const baud = Number.parseInt(baudRate.value, 10);
  loader = new ESPLoader({ transport, baudrate: baud, terminal });

  terminal.clean();
  await loader.main();

  connectBtn.disabled = true;
  flashBtn.disabled = false;
  disconnectBtn.disabled = false;
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

if (!binSelect.options.length) {
  logLine("No BIN files configured in the selector.");
  flashBtn.disabled = true;
}

