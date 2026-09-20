import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useCabinet } from "@/context/Cabinet";
import { useTheme } from "@/components/theme/ThemeProvider";
import type { HeartMood } from "@/lib/types";
import { cn } from "@/lib/utils";

const MODEL_URL = "/models/heart.glb";

/** Battements par minute et amplitude selon l'humeur du cœur. */
const RHYTHM: Record<HeartMood, { bpm: number; depth: number; glow: number }> = {
  idle: { bpm: 62, depth: 0.045, glow: 0.35 },
  contract: { bpm: 96, depth: 0.075, glow: 0.6 },
  expand: { bpm: 44, depth: 0.09, glow: 0.3 },
  warn: { bpm: 128, depth: 0.1, glow: 1.1 },
};

/** Forme « lub-dub » : deux impulsions par cycle, retour lent. */
function beatCurve(phase: number): number {
  const lub = Math.exp(-phase * 11);
  const dub = phase > 0.32 ? Math.exp(-(phase - 0.32) * 15) * 0.55 : 0;
  return lub + dub;
}

function heartShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.7);
  shape.bezierCurveTo(0.15, 1.15, 0.85, 1.2, 1.05, 0.55);
  shape.bezierCurveTo(1.25, 0.05, 0.55, -0.55, 0, -1.25);
  shape.bezierCurveTo(-0.55, -0.55, -1.25, 0.05, -1.05, 0.55);
  shape.bezierCurveTo(-0.85, 1.2, -0.15, 1.15, 0, 0.7);
  return shape;
}

/** Repli si le GLB Blender est absent : cœur extrudé lisse. */
function fallbackHeart(material: THREE.MeshPhysicalMaterial) {
  const geo = new THREE.ExtrudeGeometry(heartShape(), {
    depth: 0.7,
    bevelEnabled: true,
    bevelThickness: 0.18,
    bevelSize: 0.16,
    bevelSegments: 8,
    curveSegments: 48,
  });
  geo.center();
  const mesh = new THREE.Mesh(geo, material);
  mesh.rotation.x = -0.1;
  return mesh;
}

export function HeartScene({
  className,
  autoRotate = true,
  scale = 0.72,
  glow = true,
}: {
  className?: string;
  autoRotate?: boolean;
  /** Taille du cœur dans le cadre (1 = remplit la hauteur). */
  scale?: number;
  glow?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const { mood, pointer } = useCabinet();
  const { theme } = useTheme();
  const moodRef = useRef<HeartMood>(mood);
  const pointerRef = useRef(pointer);
  const themeRef = useRef(theme);
  const scaleRef = useRef(scale);
  const [source, setSource] = useState<"glb" | "fallback" | "loading">("loading");
  moodRef.current = mood;
  pointerRef.current = pointer;
  themeRef.current = theme;
  scaleRef.current = scale;

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = "block size-full";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.45;

    const camera = new THREE.PerspectiveCamera(30, el.clientWidth / Math.max(el.clientHeight, 1), 0.1, 50);
    camera.position.set(0, 0.1, 6.2);

    const key = new THREE.DirectionalLight(0xfff1e0, 2.2);
    key.position.set(3, 4, 4);
    const rim = new THREE.PointLight(0x24d68a, 4, 14);
    rim.position.set(-3, 1.5, -2);
    const fill = new THREE.PointLight(0xff5a7a, 3, 12);
    fill.position.set(-2.4, -1.2, 2.6);
    scene.add(key, rim, fill);

    const muscle = new THREE.MeshPhysicalMaterial({
      color: 0x6e1430,
      roughness: 0.5,
      metalness: 0.0,
      clearcoat: 0.25,
      clearcoatRoughness: 0.4,
      sheen: 0.35,
      sheenColor: new THREE.Color(0xb23a55),
      emissive: new THREE.Color(0x2a040e),
      emissiveIntensity: 0.3,
    });
    const glowMaterials: THREE.MeshStandardMaterial[] = [muscle];

    const root = new THREE.Group();
    scene.add(root);

    let disposed = false;
    const loader = new GLTFLoader();
    loader.load(
      MODEL_URL,
      (gltf) => {
        if (disposed) return;
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const scale = 2.6 / Math.max(size.y, 0.001);
        model.scale.setScalar(scale);
        box.setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        model.traverse((obj) => {
          if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
            const mat = obj.material;
            mat.envMapIntensity = 0.9;
            if (/muscle/i.test(mat.name)) {
              mat.emissive = new THREE.Color(0x3a0714);
              mat.emissiveIntensity = 0.3;
              glowMaterials.push(mat);
            }
          }
        });
        root.add(model);
        setSource("glb");
      },
      undefined,
      () => {
        if (disposed) return;
        root.add(fallbackHeart(muscle));
        setSource("fallback");
      },
    );

    const clock = new THREE.Clock();
    let frame = 0;
    let spin = 0;

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);

    const tick = () => {
      const dt = clock.getDelta();
      const t = clock.elapsedTime;
      const rhythm = RHYTHM[moodRef.current];
      const phase = (t * rhythm.bpm) / 60;
      const beat = beatCurve(phase - Math.floor(phase)) * rhythm.depth;
      root.scale.setScalar((1 + beat) * scaleRef.current);

      const px = pointerRef.current.x * 2 - 1;
      const py = pointerRef.current.y * 2 - 1;
      if (autoRotate) spin += dt * 0.25;
      const targetY = spin + px * 0.55;
      const targetX = py * 0.25 - 0.05;
      root.rotation.y += (targetY - root.rotation.y) * 0.06;
      root.rotation.x += (targetX - root.rotation.x) * 0.06;
      camera.position.x += (px * 0.35 - camera.position.x) * 0.04;
      camera.position.y += (0.1 - py * 0.25 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      const dark = themeRef.current === "dark";
      const glow = rhythm.glow * (dark ? 0.8 : 0.35) * (0.6 + beat * 8);
      for (const mat of glowMaterials) mat.emissiveIntensity = glow;
      rim.intensity = dark ? 3 : 1.2;
      renderer.toneMappingExposure = dark ? 0.95 : 1.15;

      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, [autoRotate]);

  return (
    <div className={cn("relative", className)}>
      {glow ? (
        <div
          className="pointer-events-none absolute inset-[22%] rounded-full bg-risk/15 blur-3xl transition-opacity duration-1000"
          style={{ opacity: mood === "warn" ? 0.9 : 0.45 }}
          aria-hidden="true"
        />
      ) : null}
      <div ref={host} className="absolute inset-0" />
      <span className="sr-only">
        {source === "glb" ? "Cœur anatomique 3D modélisé dans Blender" : "Cœur 3D stylisé"}
      </span>
    </div>
  );
}
