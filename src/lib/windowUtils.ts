export async function setCompactMode(
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right",
  width: number,
  height: number
) {
  try {
    const { getCurrentWindow, LogicalSize, LogicalPosition } = await import(
      "@tauri-apps/api/window"
    );
    const win = getCurrentWindow();
    await win.setMinSize(new LogicalSize(280, 200));
    const { primaryMonitor } = await import("@tauri-apps/api/window");
    await win.setSize(new LogicalSize(width, height));
    const monitor = await primaryMonitor();
    if (!monitor) return;
    const workArea = monitor.workArea;
    const scaleFactor = monitor.scaleFactor ?? 1;
    const x = workArea.position.x / scaleFactor;
    const y = workArea.position.y / scaleFactor;
    const mw = workArea.size.width / scaleFactor;
    const mh = workArea.size.height / scaleFactor;
    const margin = 8;
    let posX: number;
    let posY: number;
    if (position === "top-left") {
      posX = x + margin;
      posY = y + margin;
    } else if (position === "top-right") {
      posX = x + mw - width - margin;
      posY = y + margin;
    } else if (position === "bottom-left") {
      posX = x + margin;
      posY = y + mh - height - margin;
    } else {
      posX = x + mw - width - margin;
      posY = y + mh - height - margin;
    }
    await win.setPosition(new LogicalPosition(posX, posY));
  } catch {
    /* Tauri not available (e.g. browser dev) */
  }
}

export async function setNormalMode() {
  try {
    const { getCurrentWindow, LogicalSize } = await import("@tauri-apps/api/window");
    const win = getCurrentWindow();
    await win.setSize(new LogicalSize(1000, 700));
    await win.setMinSize(new LogicalSize(800, 600));
  } catch {
    /* Tauri not available */
  }
}
