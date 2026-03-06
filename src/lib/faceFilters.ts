import {
  FilesetResolver,
  FaceLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm";

// MediaPipe face mesh indices (478 landmarks)
const LEFT_EYE = [33, 133, 160, 159, 158, 157, 173];
const RIGHT_EYE = [362, 263, 249, 390, 373, 374, 380];
const NOSE_TIP = 4;
const FOREHEAD = 10;
const UPPER_LIP = [13, 14];
const MOUTH_LEFT = 61;
const MOUTH_RIGHT = 291;
const FACE_LEFT = 234;
const FACE_RIGHT = 454;

let faceLandmarker: FaceLandmarker | null = null;
let lastVideoTs = 0;

/** Returns strictly increasing timestamp (ms) for detectForVideo. Module-level so it survives remounts. */
export function nextVideoTimestamp(): number {
  const ts = Math.round(performance.now());
  if (ts <= lastVideoTs) lastVideoTs += 1;
  else lastVideoTs = ts;
  return lastVideoTs;
}

export async function initFaceLandmarker(): Promise<FaceLandmarker> {
  if (faceLandmarker) return faceLandmarker;
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL },
    runningMode: "VIDEO",
    numFaces: 1,
  });
  return faceLandmarker;
}

function centerOf(landmarks: NormalizedLandmark[], indices: number[]) {
  let x = 0,
    y = 0;
  let n = 0;
  for (const i of indices) {
    const p = landmarks[i];
    if (p != null) {
      x += p.x;
      y += p.y;
      n++;
    }
  }
  return n > 0 ? { x: x / n, y: y / n } : { x: 0.5, y: 0.5 };
}

function scaleToRect(
  pt: { x: number; y: number },
  x: number,
  y: number,
  w: number,
  h: number
) {
  return {
    x: x + pt.x * w,
    y: y + pt.y * h,
  };
}

export type FaceFilterType =
  | "none"
  | "glasses"
  | "heart"
  | "star"
  | "mustache"
  | "cat"
  | "panda"
  | "vampire"
  | "fairy";

export function drawFaceFilter(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  filter: FaceFilterType,
  x: number,
  y: number,
  w: number,
  h: number
) {
  if (filter === "none") return;
  if (!landmarks || landmarks.length < 455) return;

  const safe = (i: number) => landmarks[i] ?? { x: 0.5, y: 0.5 };
  const leftEye = scaleToRect(centerOf(landmarks, LEFT_EYE), x, y, w, h);
  const rightEye = scaleToRect(centerOf(landmarks, RIGHT_EYE), x, y, w, h);
  const nose = scaleToRect(
    { x: safe(NOSE_TIP).x, y: safe(NOSE_TIP).y },
    x,
    y,
    w,
    h
  );
  const forehead = scaleToRect(
    { x: safe(FOREHEAD).x, y: safe(FOREHEAD).y },
    x,
    y,
    w,
    h
  );
  const upperLip = scaleToRect(centerOf(landmarks, UPPER_LIP), x, y, w, h);
  const mouthLeft = scaleToRect(
    { x: safe(MOUTH_LEFT).x, y: safe(MOUTH_LEFT).y },
    x,
    y,
    w,
    h
  );
  const mouthRight = scaleToRect(
    { x: safe(MOUTH_RIGHT).x, y: safe(MOUTH_RIGHT).y },
    x,
    y,
    w,
    h
  );
  const faceLeft = scaleToRect(
    { x: safe(FACE_LEFT).x, y: safe(FACE_LEFT).y },
    x,
    y,
    w,
    h
  );
  const faceRight = scaleToRect(
    { x: safe(FACE_RIGHT).x, y: safe(FACE_RIGHT).y },
    x,
    y,
    w,
    h
  );
  // Derive temple positions from known-good landmarks (avoids wrong indices)
  const leftTemple = {
    x: (forehead.x + faceLeft.x) / 2,
    y: (forehead.y + faceLeft.y) / 2,
  };
  const rightTemple = {
    x: (forehead.x + faceRight.x) / 2,
    y: (forehead.y + faceRight.y) / 2,
  };

  const eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
  const scale = eyeDist * 0.8;
  const cx = (leftEye.x + rightEye.x) / 2;
  const cy = (leftEye.y + rightEye.y) / 2;

  // Face angle from eye line - rotate filter to follow head tilt
  const faceAngle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(faceAngle);
  ctx.translate(-cx, -cy);

  if (filter === "glasses") {
    const glassW = eyeDist * 1.4;
    const glassH = scale * 0.6;
    const bridgeW = eyeDist * 0.15;
    const cx = (leftEye.x + rightEye.x) / 2;
    const cy = (leftEye.y + rightEye.y) / 2;

    // Frame (dark)
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = Math.max(2, scale * 0.06);
    ctx.fillStyle = "rgba(0,0,0,0.35)";

    // Left lens
    ctx.beginPath();
    ctx.ellipse(
      cx - glassW / 2 - bridgeW / 2,
      cy,
      glassW / 2,
      glassH,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.stroke();

    // Right lens
    ctx.beginPath();
    ctx.ellipse(
      cx + glassW / 2 + bridgeW / 2,
      cy,
      glassW / 2,
      glassH,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.stroke();

    // Bridge
    ctx.beginPath();
    ctx.moveTo(cx - bridgeW / 2, cy - glassH * 0.3);
    ctx.lineTo(cx + bridgeW / 2, cy - glassH * 0.3);
    ctx.stroke();
  } else if (filter === "mustache") {
    const mw = Math.hypot(mouthRight.x - mouthLeft.x, mouthRight.y - mouthLeft.y) * 1.2;
    const my = (upperLip.y + nose.y) / 2;
    const mx = (mouthLeft.x + mouthRight.x) / 2;

    ctx.strokeStyle = "#2c1810";
    ctx.fillStyle = "#3d2318";
    ctx.lineWidth = Math.max(1, scale * 0.03);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(mx - mw / 2, my);
    ctx.quadraticCurveTo(mx - mw / 4, my + mw * 0.15, mx, my + mw * 0.08);
    ctx.quadraticCurveTo(mx + mw / 4, my + mw * 0.15, mx + mw / 2, my);
    ctx.stroke();
    ctx.fill();
  } else if (filter === "heart") {
    const cx = (leftEye.x + rightEye.x) / 2;
    const cy = (nose.y + forehead.y) / 2;
    const s = scale * 0.4;
    ctx.fillStyle = "#e74c3c";
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.3);
    ctx.bezierCurveTo(cx - s, cy - s * 0.5, cx - s * 1.5, cy + s * 0.5, cx, cy + s * 1.2);
    ctx.bezierCurveTo(cx + s * 1.5, cy + s * 0.5, cx + s, cy - s * 0.5, cx, cy + s * 0.3);
    ctx.fill();
  } else if (filter === "star") {
    const cx = (leftEye.x + rightEye.x) / 2;
    const cy = forehead.y - scale * 0.2;
    const r = scale * 0.4;
    ctx.fillStyle = "#f39c12";
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const px = cx + r * Math.cos(a);
      const py = cy + r * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  } else if (filter === "cat") {
    const earH = scale * 1.1;
    const leftX = (forehead.x + leftTemple.x) / 2 - scale * 0.2;
    const rightX = (forehead.x + rightTemple.x) / 2 + scale * 0.2;
    const earY = forehead.y - scale * 0.15;
    ctx.fillStyle = "#FFB6C1";
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(leftX, earY + earH * 0.4);
    ctx.lineTo(leftX - scale * 0.4, earY);
    ctx.lineTo(leftX, earY + earH * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rightX, earY + earH * 0.4);
    ctx.lineTo(rightX + scale * 0.4, earY);
    ctx.lineTo(rightX, earY + earH * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (filter === "panda") {
    const earR = scale * 0.5;
    const leftX = (forehead.x + faceLeft.x) / 2 - earR * 0.5;
    const rightX = (forehead.x + faceRight.x) / 2 + earR * 0.5;
    const earY = forehead.y - scale * 0.1;
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(leftX, earY, earR, 0, Math.PI * 2);
    ctx.arc(rightX, earY, earR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.ellipse(leftEye.x - scale * 0.15, leftEye.y, scale * 0.35, scale * 0.45, 0, 0, Math.PI * 2);
    ctx.ellipse(rightEye.x + scale * 0.15, rightEye.y, scale * 0.35, scale * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (filter === "vampire") {
    const fangY = (upperLip.y + mouthLeft.y) / 2;
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#ccc";
    ctx.beginPath();
    ctx.moveTo(cx - scale * 0.25, fangY);
    ctx.lineTo(cx - scale * 0.2, fangY + scale * 0.25);
    ctx.lineTo(cx - scale * 0.15, fangY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + scale * 0.15, fangY);
    ctx.lineTo(cx + scale * 0.2, fangY + scale * 0.25);
    ctx.lineTo(cx + scale * 0.25, fangY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (filter === "fairy") {
    const wingW = scale * 0.8;
    const wingY = cy;
    ctx.strokeStyle = "rgba(255,182,193,0.8)";
    ctx.fillStyle = "rgba(255,182,193,0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx - scale * 1.2, wingY, wingW, scale * 0.5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx + scale * 1.2, wingY, wingW, scale * 0.5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.arc(cx, forehead.y - scale * 0.4, scale * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
