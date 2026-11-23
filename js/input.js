const DIRECTION_KEYS = {
  ArrowUp: "N",
  KeyW: "N",
  ArrowRight: "E",
  KeyD: "E",
  ArrowDown: "S",
  KeyS: "S",
  ArrowLeft: "W",
  KeyA: "W",
  "Touch:N": "N",
  "Touch:E": "E",
  "Touch:S": "S",
  "Touch:W": "W"
};

export class Input {
  constructor() {
    this.held = new Set();
    this.order = [];
    this.enabled = false;
    this.onAction = null;
    this.bind();
    this.bindTouch();
  }

  bindTouch() {
    document.querySelectorAll("[data-direction]").forEach((button) => {
      const code = `Touch:${button.dataset.direction}`;
      const press = (event) => {
        event.preventDefault();
        if (!DIRECTION_KEYS[code]) return;
        button.setPointerCapture?.(event.pointerId);
        if (!this.held.has(code)) {
          this.held.add(code);
          this.order.push(code);
        }
      };
      const release = (event) => {
        event.preventDefault();
        this.held.delete(code);
        this.order = this.order.filter((item) => item !== code);
      };
      button.addEventListener("pointerdown", press);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("lostpointercapture", release);
      button.addEventListener("contextmenu", (event) => event.preventDefault());
    });
  }

  bind() {
    window.addEventListener("keydown", (event) => {
      if (event.target instanceof HTMLInputElement) return;

      const direction = DIRECTION_KEYS[event.code];
      if (direction) {
        if (this.enabled) event.preventDefault();
        if (!this.held.has(event.code)) {
          this.held.add(event.code);
          this.order.push(event.code);
        }
        return;
      }

      if (event.repeat) return;

      if (event.code === "Escape" || event.code === "KeyP") {
        event.preventDefault();
        this.onAction?.("pause");
      } else if (event.code === "KeyM") {
        this.onAction?.("mute");
      } else if (event.code === "KeyR") {
        this.onAction?.("retry");
      }
    });

    window.addEventListener("keyup", (event) => {
      if (!DIRECTION_KEYS[event.code]) return;
      this.held.delete(event.code);
      this.order = this.order.filter((code) => code !== event.code);
    });

    window.addEventListener("blur", () => this.clear());
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.clear();
  }

  clear() {
    this.held.clear();
    this.order.length = 0;
  }

  getDirection() {
    if (!this.enabled) return null;
    for (let i = this.order.length - 1; i >= 0; i -= 1) {
      const code = this.order[i];
      if (this.held.has(code)) return DIRECTION_KEYS[code];
    }
    return null;
  }
}
