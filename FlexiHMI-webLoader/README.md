# ESP32-P4 Web Loader

Modern browser dashboard for ESP32-P4 firmware flashing with built-in Serial Monitor.

## Features

- Firmware flashing from bundled `.bin` files or a local `.bin` file.
- Flash controls for baud and offset.
- Live serial monitor with selectable baud, auto-scroll, clear, and command send.
- Visual connection status for both flasher and monitor.

## Quick start

1. Serve this folder with a local web server:

   ```bash
   cd /home/shristov/e2dev-eu.github.io/webLoader
   python3 -m http.server 8000
   ```

2. Open `http://localhost:8000` in Chrome or Edge.
3. Use **Firmware Flasher** to flash your board.
4. Use **Serial Monitor** to inspect logs and send commands.

## Notes

- Web Serial works only on Chromium-based browsers and requires `https` or `http://localhost`.
- The default flash offset is `0x0` for merged images.
- Local `.bin` flashing is used only when you choose `Use local BIN from Browse...` in the BIN dropdown.
- Keep flasher and monitor disconnected from each other (single serial port access).
