import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useCabinet } from "@/context/Cabinet";
import { useTheme } from "@/components/theme/ThemeProvider";
import type { HeartMood } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Modèles essayés dans l'ordre : cœur réel (Sketchfab, CC BY 4.0), cœur Blender, puis repli procédural. */
const MODEL_URLS = ["/models/heart-real.glb", "/models/heart.glb"];

const RHYTHM: Record<HeartMood, { bpm: number; depth: number; glow: number }> = {
  idle: { bpm: 62, depth: 0.035, glow: 0.8 },
  contract: { bpm: 96, depth: 0.06, glow: 1.1 },
  expand: { bpm: 44, depth: 0.075, glow: 0.7 },
  warn: { bpm: 128, depth: 0.085, glow: 1.8 },
};

/** Forme « lub-dub » : deux impulsions par cycle, retour lent. */
function beatCurve(phase: number): number {
  const lub = Math.exp(-phase * 11);
  const dub = phase > 0.32 ? Math.exp(-(phase - 0.32) * 15) * 0.55 : 0;
  return lub + dub;
}

/** Halo de Fresnel : les bords du cœur s'allument, le centre reste transparent. */
function rimMaterial(color: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uPower: { value: 2.6 },
      uIntensity: { value: 0.9 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uPower;
      uniform float uIntensity;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float f = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), uPower);
        gl_FragColor = vec4(uColor * f * uIntensity, f * uIntensity);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });
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

function fallbackHeart(): THREE.Group {
  const geo = new THREE.ExtrudeGeometry(heartShape(), {
    depth: 0.7,
    bevelEnabled: true,
    bevelThickness: 0.18,
    bevelSize: 0.16,
    bevelSegments: 8,
    curveSegments: 48,
  });
  geo.center();
  const mat = new THREE.MeshPhysicalMaterial({ color: 0x6e1430, roughness: 0.5, transparent: true, opacity: 0.5 });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geo, mat));
  return group;
}

/** Rend le modèle translucide et ajoute le halo de Fresnel à chaque maillage. */
function makeTranslucent(root: THREE.Object3D, opacity: number) {
  const bases: THREE.MeshStandardMaterial[] = [];
  const rims: THREE.ShaderMaterial[] = [];
  const meshes: THREE.Mesh[] = [];
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) meshes.push(obj);
  });
  for (const mesh of meshes) {
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (m instanceof THREE.MeshStandardMaterial) {
        m.transparent = true;
        m.opacity = opacity;
        m.depthWrite = true;
        m.side = THREE.FrontSide;
        m.envMapIntensity = 0.6;
        m.emissive = new THREE.Color(0x3a0a16);
        m.emissiveIntensity = 0.25;
        bases.push(m);
      }
    }
    const rim = rimMaterial(/vein|veine/i.test(mesh.name) ? 0x8a5cff : 0xff4d6d);
    const shell = new THREE.Mesh(mesh.geometry, rim);
    shell.renderOrder = 2;
    mesh.add(shell);
    rims.push(rim);
  }
  return { bases, rims };
}

/**
 * Cœur 3D translucide en arrière-plan de toute l'interface.
 * Bat au rythme des termes survolés, suit légèrement la souris, s'allume en alerte.
 */
export function HeartScene({ className, side = "right" }: { className?: string; side?: "right" | "center" }) {
  const host = useRef<HTMLDivElement>(null);
  const { mood, pointer } = useCabinet();
  const { theme } = useTheme();
  const moodRef = useRef<HeartMood>(mood);
  const pointerRef = useRef(pointer);
  const themeRef = useRef(theme);
  const [source, setSource] = useState<"real" | "blender" | "fallback" | "loading">("loading");
  moodRef.current = mood;
  pointerRef.current = pointer;
  themeRef.current = theme;

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(el.clientWidth, el.clientHeight, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = "block size-full";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.5;

    const camera = new THREE.PerspectiveCamera(30, el.clientWidth / Math.max(el.clientHeight, 1), 0.1, 60);
    camera.position.set(0, 0, 8);

    const key = new THREE.DirectionalLight(0xfff1e0, 1.8);
    key.position.set(3, 4, 5);
    const rim = new THREE.PointLight(0x24d68a, 3, 16);
    rim.position.set(-4, 2, -2);
    const fill = new THREE.PointLight(0xff5a7a, 3, 14);
    fill.position.set(-2, -2, 3);
    scene.add(key, rim, fill);

    const root = new THREE.Group();
    scene.add(root);
    let bases: THREE.MeshStandardMaterial[] = [];
    let rims: THREE.ShaderMaterial[] = [];

    let disposed = false;
    const loader = new GLTFLoader();
    const tryLoad = (index: number) => {
      if (index >= MODEL_URLS.length) {
        const group = fallbackHeart();
        ({ bases, rims } = makeTranslucent(group, 0.5));
        root.add(group);
        setSource("fallback");
        return;
      }
      loader.load(
        MODEL_URLS[index],
        (gltf) => {
          if (disposed) return;
          const model = gltf.scene;
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          model.scale.setScalar(3.6 / Math.max(size.y, 0.001));
          box.setFromObject(model);
          model.position.sub(box.getCenter(new THREE.Vector3()));
          ({ bases, rims } = makeTranslucent(model, 0.55));
          root.add(model);
          setSource(index === 0 ? "real" : "blender");
        },
        undefined,
        () => {
          if (!disposed) tryLoad(index + 1);
        },
      );
    };
    tryLoad(0);

    const clock = new THREE.Clock();
    let frame = 0;
    let spin = 0;

    const layout = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      const halfWidth = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z * camera.aspect;
      const wide = w > 1024;
      root.position.x = side === "right" && wide ? halfWidth * 0.42 : 0;
      root.position.y = wide ? -0.1 : 0.3;
      root.userData.scale = wide ? 1 : 0.7;
    };
    layout();
    const observer = new ResizeObserver(layout);
    observer.observe(el);

    const tick = () => {
      const dt = clock.getDelta();
      const t = clock.elapsedTime;
      const rhythm = RHYTHM[moodRef.current];
      const phase = (t * rhythm.bpm) / 60;
      const beat = beatCurve(phase - Math.floor(phase)) * rhythm.depth;
      root.scale.setScalar((1 + beat) * (root.userData.scale ?? 1));

      const px = pointerRef.current.x * 2 - 1;
      const py = pointerRef.current.y * 2 - 1;
      spin += dt * 0.12;
      root.rotation.y += (spin + px * 0.35 - root.rotation.y) * 0.05;
      root.rotation.x += (py * 0.18 - root.rotation.x) * 0.05;

      const dark = themeRef.current === "dark";
      const glow = rhythm.glow * (dark ? 1 : 0.45);
      for (const m of bases) {
        m.opacity = dark ? 0.55 : 0.4;
        m.emissiveIntensity = 0.2 + beat * 6 * (dark ? 1 : 0.4);
      }
      for (const r of rims) {
        r.uniforms.uIntensity.value = glow * (0.7 + beat * 5);
      }
      rim.intensity = dark ? 3 : 1;
      renderer.toneMappingExposure = dark ? 1 : 1.15;

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
  }, [side]);

  return (
    <div className={cn("pointer-events-none", className)} aria-hidden="true">
      <div ref={host} className="absolute inset-0" />
      <span className="sr-only">
        {source === "real"
          ? "Cœur anatomique 3D (Realistic Human Heart, CC BY 4.0)"
          : source === "blender"
            ? "Cœur anatomique 3D modélisé dans Blender"
            : "Cœur 3D stylisé"}
      </span>
    </div>
  );
}
