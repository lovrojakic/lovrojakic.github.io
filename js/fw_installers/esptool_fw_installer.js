import { ESPLoader, Transport } from "esptool-js";
import { serial } from "web-serial-polyfill";
import { Terminal } from "@xterm/xterm";
import { GenericModal } from "../common/dialogs.js";

const serialLib = navigator.serial ?? (navigator.usb ? serial : null);

class EspLoaderTerminal {
  constructor(flashingXTerm) {
    this.flashingXTerm = flashingXTerm;
  }
  clean() {
    if (this.flashingXTerm) this.flashingXTerm.clear();
  }
  writeLine(data) {
    if (this.flashingXTerm) this.flashingXTerm.writeln(data);
  }
  write(data) {
    if (this.flashingXTerm) this.flashingXTerm.write(data);
  }
}

class EsptoolFwInstaller {
  constructor() {
    this.device = null;
    this.transport = null;
    this.flashingProgressBar = null;
    this.flashingXTerm = null;
    this.espLoaderTerminal = new EspLoaderTerminal(this.flashingXTerm);
    this.esploader = null;
    this.connectDialog = new GenericModal("install-connect");
  }

  async serialAvailable() {
    return serialLib ? true : new Error("Web Serial is not enabled in this browser");
  }

  async connect() {
    try {
      if (!this.device) {
        this.device = await serialLib.requestPort({});
        this.transport = new Transport(this.device, true);
      }
      return true;
    } catch (error) {
      console.error(error);
      this.espLoaderTerminal.writeLine(`Error: ${error.message}`);
      return false;
    }
  }

  async configure() {
    try {
      this.esploader = new ESPLoader({
        transport: this.transport,
        baudrate: 921600,
        terminal: this.espLoaderTerminal,
        debugLogging: false,
        enableTracing: false,
      });
      const chip = await this.esploader.main("default_reset");
      console.log(`Settings done for: ${chip}`);
    } catch (error) {
      console.error(error);
      this.espLoaderTerminal.writeLine(`Error: ${error.message}`);
    }
  }

  async readFirmware(firmwareBlob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsBinaryString(firmwareBlob);
    });
  }

  async programFlash() {
    try {
      const response = await fetch("https://lovrojakic.github.io/firmware/vidi_x_firmware_9_2_2_lib.bin");
      const blob = await response.blob();
      const firmwareData = await this.readFirmware(blob);
      
      await this.esploader.writeFlash({
        fileArray: [{ data: firmwareData, address: 0x0 }],
        flashSize: "keep",
        eraseAll: true,
        compress: true,
        reportProgress: (fileIndex, written, total) => {
          this.flashingProgressBar.animate(written / total);
        },
        calculateMD5Hash: (image) => CryptoJS.MD5(CryptoJS.enc.Latin1.parse(image)),
      });
    } catch (error) {
      console.error(error);
      this.espLoaderTerminal.writeLine(`Error: ${error.message}`);
    }
  }

  async reset() {
    if (this.transport) {
      await this.transport.setDTR(false);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await this.transport.setDTR(true);
    }
  }

  async cleanUp() {
    if (this.transport) {
      await this.transport.disconnect();
      await this.transport.waitForUnlock(1500);
      this.transport = null;
    }
    this.device = null;
  }

  disposeFlashingXTerm() {
    if (this.flashingXTerm) {
      this.flashingXTerm.dispose();
      this.flashingXTerm = null;
    }
  }

  disposeProgressBar() {
    if (this.ProgressBar) {
      this.ProgressBar.destroy();
      this.ProgressBar = null;
    }
  }

  async installButtonHandler() {
    this.connectDialog.open();
    const modal = this.connectDialog.getModal();

    if (!(await this.serialAvailable() instanceof Error)) {
      this._setConnectionStep(modal, 1);
    } else {
      this._setConnectionStep(modal, 0);
    }

    const flashingProgressBarDiv = modal.querySelector("#flashingProgressBar")
    this.flashingProgressBar = new ProgressBar.Line(flashingProgressBarDiv, {
      color: '#00FF00',
      strokeWidth: 3,
      trailWidth: 1,
    }); 

    const flashingTerminal = modal.querySelector("#flashing-terminal");
    this.flashingXTerm = new Terminal({ cols: 67, rows: 20 });
    this.flashingXTerm.open(flashingTerminal);
    this.espLoaderTerminal.flashingXTerm = this.flashingXTerm;

    const flashingHeader = modal.querySelector("#flashingHeader");
    const btnRequestFlashingSerialDevice = modal.querySelector("#requestFlashingSerialDevice");
    btnRequestFlashingSerialDevice.addEventListener("click", async () => {
      try {
        if (await this.connect()) {
          this._setConnectionStep(modal, 2);
          await this.configure();
          flashingHeader.innerHTML = "Installing Firmware...";
          await this.programFlash();
          await this.cleanUp();
          flashingHeader.innerHTML = "Installation successful! ✅";
        };
      } catch (error) {
        console.error(error);
      }
    });
  }

  _setConnectionStep(modal, step) {
    const buttonStates = [
      {request: false},
      {request: true},
      {request: false},
    ];

    if (step < 0) step = 0;
    if (step > buttonStates.length - 1) step = buttonStates.length - 1;

    const btnRequestFlashingSerialDevice = modal.querySelector("#requestFlashingSerialDevice");
    btnRequestFlashingSerialDevice.disabled = !buttonStates[step].request;

    const steps = modal.querySelectorAll(".step");
    steps.forEach((stepItem, index) => {
      stepItem.classList.toggle("hidden", index !== step);
    });
  }
}

export { EsptoolFwInstaller };
