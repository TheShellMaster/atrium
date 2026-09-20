import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useCabinet } from "../context/Cabinet";
import type { HeartMood } from "../lib/types";

function heartShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.7);
  shape.bezierCurveTo(0.15, 1.15, 0.85, 1.2, 1.05, 0.55);
  shape.bezierCurveTo(1.25, 0.05, 0.55, -0.55, 0, -1.25);
  shape.bezierCurveTo(-0.55, -0.55, -1.25, 0.05, -1.05, 0.55);
  shape.bezierCurveTo(-0.85, 1.2, -0.15, 1.15, 0, 0.7);
  return shape;
}

function makeHeart() {
  const group = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x9b2348,
    roughness: 0.28,
    metalness: 0.06,
    clearcoat: 0.65,
    sheen: 0.85,
    sheenColor: new THREE.Color(0xe06780),
  });
  const geo = new THREE.ExtrudeGeometry(heartShape(), {
    depth: 0.72,
    bevelEnabled: true,
    bevelThickness: 0.16,
    bevelSize: 0.14,
    bevelSegments: 6,
    curveSegments: 40,
  });
  geo.center();
  const body = new THREE.Mesh(geo, mat);
  body.castShadow = true;
  body.receiveShadow = true;

  group.add(body);
  group.rotation.x = -0.12;
  return { group, mat };
}

export function HeartScene() {
  const host = useRef<HTMLDivElement>(null);
  const { mood, pointer } = useCabinet();
  const moodRef = useRef<HeartMood>(mood);
  const pointerRef = useRef(pointer);
  moodRef.current = mood;
  pointerRef.current = pointer;

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.shadowMap.enabled = true;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, el.clientWidth / el.clientHeight, 0.1, 40);
    camera.position.set(0, 0.15, 6.4);

    scene.add(new THREE.HemisphereLight(0xf3f6f0, 0x3a2018, 1.05));
    const key = new THREE.SpotLight(0xfff4da, 28, 18, 0.42, 0.5, 1);
    key.position.set(2.8, 3.8, 4.0);
    key.castShadow = true;
    scene.add(key);
    scene.add(new THREE.PointLight(0x9b2348, 5, 12).translateX(-2.2).translateY(-0.4).translateZ(2));
    scene.add(new THREE.PointLight(0x137a4b, 1.8, 12).translateX(2).translateY(1.6).translateZ(-1));

    const { group, mat } = makeHeart();
    scene.add(group);

    const stand = new THREE.Mesh(
      new THREE.TorusGeometry(1.55, 0.03, 10, 64),
      new THREE.MeshPhysicalMaterial({ color: 0xb8963e, metalness: 0.7, roughness: 0.25 }),
    );
    stand.rotation.x = Math.PI / 2;
    stand.position.y = -1.7;
    scene.add(stand);

    const clock = new THREE.Clock();
    let frame = 0;
    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);

    const tick = () => {
      const t = clock.getElapsedTime();
      const current = moodRef.current;
      const rate = current === "contract" ? 1.5 : current === "expand" ? 0.4 : current === "warn" ? 1.85 : 0.7;
      const depth = current === "expand" ? 0.07 : current === "warn" ? 0.09 : 0.045;
      const beat = 1 + Math.sin(t * Math.PI * 2 * rate) * depth;
      group.scale.setScalar(beat);
      group.rotation.y = Math.sin(t * 0.2) * 0.4;
      mat.emissive.setHex(current === "warn" ? 0x4a0818 : 0x1b050c);
      mat.emissiveIntensity = 0.28 + (beat - 1) * 7;

      const px = pointerRef.current.x * 2 - 1;
      const py = pointerRef.current.y * 2 - 1;
      key.position.x += (2.8 + px * 2.2 - key.position.x) * 0.04;
      key.position.y += (3.8 - py * 1.6 - key.position.y) * 0.04;
      camera.position.x += (px * 0.45 - camera.position.x) * 0.035;
      camera.position.y += (0.15 - py * 0.22 - camera.position.y) * 0.035;
      camera.lookAt(0, 0.05, 0);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  return <div className="specimen" ref={host} />;
}
