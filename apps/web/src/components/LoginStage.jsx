import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

const FRONT_URL =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260808_192942_e1086505-d7da-433b-a59b-8220f4e6c808.png&w=1280&q=85";
const REVEAL_URL =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260808_151324_bf318a5f-5525-4fc7-aab5-e9a341018828.png&w=1280&q=85";

export default function LoginStage() {
  const shouldReduce = useReducedMotion();
  const ref = useRef(null);

  return (
    <>
      <style>{`
      .orbit-poster {
        position: absolute;
        inset: 0;
        display: block;
        overflow: hidden;
        background: transparent;
        color: #fff;
        isolation: isolate;
        contain: strict;
      }

      .orbit-poster .flower {
        position: absolute;
        top: 0;
        left: 50%;
        height: 100%;
        width: auto;
        transform: translateX(-50%);
        pointer-events: none;
        overflow: hidden;
        animation: orb-flower 1100ms cubic-bezier(.16, 1, .3, 1) both;
      }
      @keyframes orb-flower {
        from { opacity: 0; transform: translateX(-50%) translateY(2.5dvh); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      .orbit-poster .flower__sizer {
        display: block;
        height: 100%;
        width: auto;
        opacity: 0;
        visibility: hidden;
      }
      .orbit-poster .flower__layer {
        position: absolute;
        inset: 0;
        overflow: hidden;
      }
      .orbit-poster .flower__layer img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .orbit-poster .flower__layer--top {
        mask-image: linear-gradient(#0000, #0000);
        -webkit-mask-image: linear-gradient(#0000, #0000);
        mask-size: 100% 100%;
        mask-repeat: no-repeat;
        -webkit-mask-size: 100% 100%;
        mask-position: 0 0;
        -webkit-mask-position: 0 0;
      }

      @media (prefers-reduced-motion: reduce) {
        .orbit-poster .flower {
          animation: none !important;
          opacity: 1;
        }
      }
    `}</style>

      <div className="orbit-poster" ref={ref} aria-hidden>
        {/* Flower stack */}
        <div className="flower" id="flower-stage">
          <img
            className="flower__sizer"
            src={FRONT_URL}
            alt=""
            aria-hidden="true"
          />
          <div className="flower__layer flower__layer--bg">
            <img
              src={FRONT_URL}
              alt="Pixel-art pink and violet lily"
            />
          </div>
          <div className="flower__layer flower__layer--top" id="flower-reveal-layer" aria-hidden="true">
            <img
              src={REVEAL_URL}
              alt=""
            />
          </div>
        </div>
      </div>

      {/* JS only when motion is OK */}
      {!shouldReduce && <MorphTrail flowerRef={ref} />}
    </>
  );
}

function MorphTrail({ flowerRef }) {
  const layerRef = useRef(null);
  const stageRef = useRef(null);
  const trailRef = useRef(null);
  const timeRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const stage = flowerRef?.current?.querySelector?.(".flower");
    if (!stage) return;
    stageRef.current = stage;

    const layerFront = stage.querySelector(".flower__layer--bg");
    const layerReveal = stage.querySelector(".flower__layer--top");
    if (!layerFront || !layerReveal) return;

    const front = createLayer(layerFront);
    const reveal = createLayer(layerReveal);
    layerRef.current = { front, reveal };
    trailRef.current = [];

    stage.addEventListener("mousemove", onMove);
    stage.addEventListener("mouseenter", onEnter);
    stage.addEventListener("mouseleave", onLeave);

    return () => {
      stage.removeEventListener("mousemove", onMove);
      stage.removeEventListener("mouseenter", onEnter);
      stage.removeEventListener("mouseleave", onLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [flowerRef]);

  function createLayer(domLayer) {
    const canvas = document.createElement("canvas");
    canvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;display:none;";
    domLayer.style.position = "relative";
    domLayer.appendChild(canvas);
    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    return { domLayer, canvas, ctx };
  }

  function resizeLayer(layer) {
    const rect = layer.domLayer.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (layer.canvas.width !== w || layer.canvas.height !== h) {
      layer.canvas.width = w;
      layer.canvas.height = h;
    }
    return { w, h, dpr, x: rect.left, y: rect.top };
  }

  function toFlowerCoords(e, geom) {
    const x = (e.clientX - geom.x) * geom.dpr;
    const y = (e.clientY - geom.y) * geom.dpr;
    return { x, y };
  }

  function onMove(e) {
    if (!stageRef.current || !trailRef.current) return;
    const geom = resizeLayer(layerRef.current.front);
    const p = toFlowerCoords(e, geom);
    const hovering = true;
    updateTrail(p, hovering, geom);
    if (!rafRef.current) rafRef.current = requestAnimationFrame(frame);
  }

  function onEnter() {
    if (!stageRef.current || !trailRef.current) return;
    const geom = resizeLayer(layerRef.current.front);
    const r = trailRef.current.revealCenter;
    if (r) {
      const last = { x: r.x, y: r.y, r: 140, alpha: 1, seed: Math.random() * 100 };
      trailRef.current.push(last);
    }
    if (!rafRef.current) rafRef.current = requestAnimationFrame(frame);
  }

  function onLeave() {
    if (!stageRef.current || !trailRef.current) return;
    trailRef.current.revealCenter = null;
  }

  function updateTrail(pos, hovering, geom) {
    const t = trailRef.current;
    t.revealCenter = pos;
    if (!hovering) return;

    const targetR = 140;
    if (!t.headRadius) t.headRadius = 0;
    t.headRadius += (targetR - t.headRadius) * 0.14;

    if (t.headRadius <= 5) return;
    const last = t.points && t.points[t.points.length - 1];
    const dx = pos.x - (last ? last.x : pos.x);
    const dy = pos.y - (last ? last.y : pos.y);
    const dist = Math.hypot(dx, dy);
    if (dist > 8) {
      t.points.push({
        x: pos.x,
        y: pos.y,
        r: t.headRadius,
        alpha: 1,
        seed: Math.random() * 100,
      });
      if (t.points.length > 60) t.points.shift();
    }
  }

  function frame() {
    rafRef.current = null;
    const t = trailRef.current;
    if (!t) return;
    timeRef.current += 0.016;

    t.points.forEach((p) => {
      p.alpha *= 0.92;
      p.r *= 0.995;
    });
    while (t.points.length && t.points[0].alpha < 0.01) t.points.shift();

    if (!t.points.length && (!t.revealCenter || t.headRadius < 5)) {
      clearLayers();
      return;
    }

    const { front, reveal } = layerRef.current;
    const seed = Math.random() * 100;

    // FRONT layer: punch holes so the front lily is wiped away under the trail
    const fctx = front.ctx;
    fctx.clearRect(0, 0, front.canvas.width, front.canvas.height);
    fctx.globalCompositeOperation = "destination-out";
    fctx.fillStyle = "#fff";
    for (const p of t.points) {
      drawMorphBlob(fctx, p.x, p.y, p.r, timeRef.current, p.seed, p.alpha);
    }
    if (t.revealCenter && t.headRadius > 5) {
      drawMorphBlob(fctx, t.revealCenter.x, t.revealCenter.y, t.headRadius, timeRef.current, seed, 1);
    }
    fctx.globalCompositeOperation = "source-over";

    // REVEAL layer: paint the trail so only that shape shows the second lily
    const rctx = reveal.ctx;
    rctx.clearRect(0, 0, reveal.canvas.width, reveal.canvas.height);
    rctx.globalCompositeOperation = "source-over";
    rctx.fillStyle = "#fff";
    for (const p of t.points) {
      drawMorphBlob(rctx, p.x, p.y, p.r, timeRef.current, p.seed, p.alpha);
    }
    if (t.revealCenter && t.headRadius > 5) {
      drawMorphBlob(rctx, t.revealCenter.x, t.revealCenter.y, t.headRadius, timeRef.current, seed, 1);
    }

    applyMasks();
    rafRef.current = requestAnimationFrame(frame);
  }

  function drawMorphBlob(ctx, cx, cy, r, t, seed, alpha) {
    if (r < 2) return;
    const n = 24;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2;
      const n1 = Math.sin(angle * 3 + t * 1.4 + seed) * 0.45;
      const n2 = Math.sin(angle * 5 - t * 0.9 + seed * 2.3) * 0.3;
      const n3 = Math.cos(angle * 2 + t * 1.8 + seed * 0.7) * 0.25;
      const noise = (n1 + n2 + n3) * 44 * (r / 140);
      const rr = Math.max(0, r + noise);
      pts.push({
        x: cx + Math.cos(angle) * rr,
        y: cy + Math.sin(angle) * rr,
      });
    }
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      ctx.quadraticCurveTo(a.x, a.y, mx, my);
    }
    ctx.closePath();
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function clearLayers() {
    if (!layerRef.current) return;
    const { front, reveal } = layerRef.current;
    front.ctx.clearRect(0, 0, front.canvas.width, front.canvas.height);
    reveal.ctx.clearRect(0, 0, reveal.canvas.width, reveal.canvas.height);
    front.canvas.style.display = "none";
    reveal.canvas.style.display = "none";
  }

  function applyMasks() {
    if (!layerRef.current) return;
    const { front, reveal } = layerRef.current;
    const frontData = front.canvas.toDataURL();
    const revealData = reveal.canvas.toDataURL();

    front.canvas.style.display = "block";
    reveal.canvas.style.display = "block";
    front.domLayer.style.maskImage = 'url("' + frontData + '")';
    front.domLayer.style.webkitMaskImage = 'url("' + frontData + '")';
    front.domLayer.style.maskSize = '100% 100%';
    front.domLayer.style.webkitMaskSize = '100% 100%';
    front.domLayer.style.maskRepeat = 'no-repeat';
    front.domLayer.style.webkitMaskRepeat = 'no-repeat';

    reveal.domLayer.style.maskImage = 'url("' + revealData + '")';
    reveal.domLayer.style.webkitMaskImage = 'url("' + revealData + '")';
    reveal.domLayer.style.maskSize = '100% 100%';
    reveal.domLayer.style.webkitMaskSize = '100% 100%';
    reveal.domLayer.style.maskRepeat = 'no-repeat';
    reveal.domLayer.style.webkitMaskRepeat = 'no-repeat';
  }

  return null;
}