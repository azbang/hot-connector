import { createMinQRCode, drawModules } from "./utils";

interface QR {
  moduleCount: number;
  isDark: (row: number, col: number) => boolean;
}

export interface QRSettings {
  ecLevel: "L" | "M" | "Q" | "H";
  value: string;
  radius: number;
  fill: any;
  imageEcCover?: number;
  minVersion?: number;
  maxVersion?: number;
  quiet?: number;
  background?: string;
  withLogo: boolean;
  logo?: HTMLImageElement;
  size: number;
}

export class QRCodeLogo {
  private quietModuleCount = 0;
  private moduleSize = 0;
  private dataPixels = 0;
  private ratio = 0;
  private area = 0;

  private imageModuleWidth = 0;
  private imageModuleHeight = 0;
  private imageModuleLeft = 0;
  private imageModuleTop = 0;
  private imageFloatModuleWidth = 0;
  private imageFloatModuleHeight = 0;
  private imageLeft = 0;
  private imageTop = 0;

  public isLoaded = false;

  constructor(readonly settings: QRSettings, readonly qr: QR, public readonly img: HTMLImageElement) {
    this.img.addEventListener("load", () => this.process());
    if (this.img.width > 0) {
      this.process();
    }
  }

  private process() {
    const quiet = this.settings.quiet ?? 0;
    const imageEcCover = this.settings.imageEcCover ?? 0.5;

    this.isLoaded = true;
    this.quietModuleCount = this.qr.moduleCount - quiet * 2;
    this.moduleSize = this.settings.size / this.quietModuleCount;
    this.dataPixels = this.quietModuleCount * this.quietModuleCount - (49 * 3 + 25);
    this.ratio = this.img.width / this.img.height;

    const quality = {
      L: 0.07,
      M: 0.15,
      Q: 0.25,
      H: 0.3,
    };

    this.area = (quality[this.settings.ecLevel] * imageEcCover * this.dataPixels) | 0;

    this.imageModuleWidth = Math.min(this.quietModuleCount, Math.sqrt(this.area * this.ratio) | 0);
    this.imageModuleHeight = (this.imageModuleWidth / this.ratio) | 0;
    if (this.imageModuleHeight > this.quietModuleCount) {
      this.imageModuleHeight = this.quietModuleCount;
      this.imageModuleWidth = (this.imageModuleHeight * this.ratio) | 0;
    }

    this.imageModuleLeft = (this.qr.moduleCount / 2 - this.imageModuleWidth / 2) | 0;
    this.imageModuleTop = (this.qr.moduleCount / 2 - this.imageModuleHeight / 2) | 0;

    this.imageFloatModuleWidth = Math.min(this.imageModuleWidth, this.imageModuleHeight * this.ratio) - quiet;
    this.imageFloatModuleHeight = Math.min(this.imageModuleHeight, this.imageModuleWidth / this.ratio) - quiet;
    this.imageLeft = this.imageModuleLeft + (this.imageModuleWidth - this.imageFloatModuleWidth) / 2 - quiet;
    this.imageTop = this.imageModuleTop + (this.imageModuleHeight - this.imageFloatModuleHeight) / 2 - quiet;

    const isDark = this.qr.isDark;
    this.qr.isDark = (row, col) => {
      if (this.isContains(row, col)) return false;
      return isDark(row, col);
    };
  }

  render(context: CanvasRenderingContext2D) {
    context.drawImage(this.img, this.imageLeft * this.moduleSize, this.imageTop * this.moduleSize, this.imageFloatModuleWidth * this.moduleSize, this.imageFloatModuleHeight * this.moduleSize);
  }

  isContains(row: number, col: number) {
    return this.imageModuleLeft <= col && col < this.imageModuleLeft + this.imageModuleWidth && this.imageModuleTop <= row && row < this.imageModuleTop + this.imageModuleHeight;
  }
}

class QRCode {
  public readonly canvas = document.createElement("canvas");
  public readonly ctx: CanvasRenderingContext2D;
  public readonly settings: QRSettings;
  public readonly logo?: QRCodeLogo;
  public readonly qr: QR;

  private rafHandler = 0;

  constructor(settings: QRSettings) {
    this.qr = createMinQRCode(settings.value, settings.ecLevel ?? "H", settings.minVersion ?? 1, settings.maxVersion ?? 40, settings.quiet ?? 0) as QR;

    this.settings = settings;
    this.ctx = this.canvas.getContext("2d")!;

    this.canvas.style.width = settings.size + "px";
    this.canvas.style.height = settings.size + "px";

    settings.size = settings.size * 4;
    this.canvas.width = settings.size;
    this.canvas.height = settings.size;

    if (settings.withLogo) {
      this.logo = new QRCodeLogo(settings, this.qr, settings.logo!);
      this.logo.img.addEventListener("load", () => this.render());
    }
  }

  render() {
    if (this.settings.background) {
      this.ctx.fillStyle = this.settings.background;
      this.ctx.fillRect(0, 0, this.settings.size, this.settings.size);
    } else {
      this.ctx.clearRect(0, 0, this.settings.size, this.settings.size);
    }

    drawModules(this.qr, this.ctx, this.settings);
    this.logo?.render(this.ctx);
  }

  animate = () => {
    this.render();
    this.rafHandler = requestAnimationFrame(this.animate);
  };

  stopAnimate() {
    cancelAnimationFrame(this.rafHandler);
  }
}

export const darkQR: QRSettings = {
  value: "",
  radius: 0.8,
  ecLevel: "H",
  fill: {
    type: "linear-gradient",
    position: [0, 0, 1, 1],
    colorStops: [
      [0, "#2C3034"],
      [0.34, "#4F5256"],
      [1, "#2C3034"],
    ],
  },
  size: 256,
  withLogo: true,
  imageEcCover: 0.7,
  quiet: 1,
};

export const lightQR: QRSettings = {
  value: "",
  radius: 0.8,
  ecLevel: "H",
  fill: {
    type: "linear-gradient",
    position: [0.3, 0.3, 1, 1],
    colorStops: [
      [0, "#FDBF1C"],
      [1, "#FDA31C"],
    ],
  },
  size: 256,
  withLogo: true,
  imageEcCover: 0.7,
  quiet: 1,
};

export default QRCode;
