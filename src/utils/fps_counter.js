const FPS_AVERAGE_COUNT = 30;

var fpsHistory = [];
var fpsHistoryCurrentIndex = 0;
var totFPS = 0;
export var FPS = 0;

var lastMs = 0;
export function UpdateFps(nowNs) {
  const nowMs = nowNs / 1000.0;
  const delta = (nowMs - lastMs);
  lastMs = nowMs;

  const fps = (1 / delta);

  totFPS += fps - (fpsHistory[fpsHistoryCurrentIndex] || 0);
  fpsHistory[fpsHistoryCurrentIndex++] = fps;
  fpsHistoryCurrentIndex %= FPS_AVERAGE_COUNT;

  FPS = totFPS / fpsHistory.length;

  return delta;
}
