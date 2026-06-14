import {useEffect, useRef, useState} from 'react';
import {ArrowRight, Check, Coffee, Move, Send, Sparkles, Upload} from 'lucide-react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';

/* ═══════════════════════════════════════════════════════════════════
   Démo prospect — Taylr × Lehbar (emballages boulangerie / traiteur).
   Modèles 3D PARAMÉTRIQUES (sacs + boîtes kraft/blanc). Thème blanc + bleu.
   ⚠️ Tarifs = exemples (à remplacer par la vraie grille Lehbar).
   ═══════════════════════════════════════════════════════════════════ */

const INK = '#16243B';
const BLUE = '#2F6FB3';
const BLUE_DEEP = '#1B3A6B';
const MUTED = '#6B7689';
const KRAFT = '#C8A26A';
const WHITE_BOARD = '#F1ECE2';

const PRINT_COLORS = [
  {name: 'Noir', code: 'Black C', hex: '#1C1C1C'},
  {name: 'Brun', code: '476 C', hex: '#623B2A'},
  {name: 'Bordeaux', code: '490 C', hex: '#5A2233'},
  {name: 'Vert olive', code: '5747 C', hex: '#3E4A1E'},
  {name: 'Bleu nuit', code: '2965 C', hex: '#10243F'},
];
const EUR = (n: number) =>
  n.toLocaleString('fr-FR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';

/* ───────── hooks ───────── */
function useInView<T extends HTMLElement>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      setInView(r.top < vh * 0.82 && r.bottom > vh * 0.18);
    };
    check();
    window.addEventListener('scroll', check, {passive: true});
    window.addEventListener('resize', check);
    const id = window.setInterval(check, 350);
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
      clearInterval(id);
    };
  }, []);
  return [ref, inView];
}

type CursorApi = {
  moveTo: (sel: string, dur?: number) => Promise<void>;
  click: () => Promise<void>;
  sleep: (ms: number) => Promise<void>;
};
function useAutoCursor(
  panelRef: React.RefObject<HTMLElement | null>,
  active: boolean,
  script: (c: CursorApi) => Promise<void>
) {
  const cursorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active) return;
    const panel = panelRef.current;
    const cursor = cursorRef.current;
    if (!panel || !cursor) return;
    let running = true;
    const pos = {x: panel.clientWidth / 2, y: panel.clientHeight / 2};
    const setPos = (x: number, y: number) => {
      pos.x = x;
      pos.y = y;
      cursor.style.left = x + 'px';
      cursor.style.top = y + 'px';
    };
    setPos(pos.x, pos.y);
    cursor.style.opacity = '1';
    const centerOf = (sel: string) => {
      const el = panel.querySelector(sel) as HTMLElement | null;
      if (!el) return {x: pos.x, y: pos.y};
      const pr = panel.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return {x: r.left - pr.left + r.width / 2, y: r.top - pr.top + r.height / 2};
    };
    const STOP = new Error('stop');
    const sleep = (ms: number) =>
      new Promise<void>((res, rej) => setTimeout(() => (running ? res() : rej(STOP)), ms));
    const moveTo = (sel: string, dur = 700) =>
      new Promise<void>((res, rej) => {
        const {x: tx, y: ty} = centerOf(sel);
        const sx = pos.x;
        const sy = pos.y;
        const t0 = performance.now();
        const step = () => {
          if (!running) {
            rej(STOP);
            return;
          }
          let p = Math.min(1, (performance.now() - t0) / dur);
          p = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          setPos(sx + (tx - sx) * p, sy + (ty - sy) * p);
          if (p < 1) setTimeout(step, 16);
          else res();
        };
        step();
      });
    const click = async () => {
      cursor.classList.add('clicking');
      await sleep(180);
      cursor.classList.remove('clicking');
    };
    (async () => {
      while (running) {
        try {
          await script({moveTo, click, sleep});
        } catch {
          break;
        }
      }
    })();
    return () => {
      running = false;
      if (cursor) cursor.style.opacity = '0';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  return cursorRef;
}

/* ───────── 3D paramétrique : sacs & boîtes kraft, avec logo imprimé ───────── */
type PackType = 'sac-traiteur' | 'sac-viennoiserie' | 'boite-poignee' | 'boite-carree';
const PACKS: Record<PackType, {kind: 'bag' | 'box'; w: number; h: number; d: number; handles: number; color: string; label: string; dims: string}> = {
  'sac-traiteur': {kind: 'bag', w: 1.7, h: 2.6, d: 0.95, handles: 2, color: KRAFT, label: 'Sac traiteur', dims: '35 + 32 × 32 cm'},
  'sac-viennoiserie': {kind: 'bag', w: 1.25, h: 2.7, d: 0.5, handles: 0, color: KRAFT, label: 'Sac viennoiserie', dims: '140 + 80 × 210 mm'},
  'boite-poignee': {kind: 'box', w: 2.2, h: 1.45, d: 1.6, handles: 1, color: KRAFT, label: 'Boîte poignée', dims: 'multi-formats'},
  'boite-carree': {kind: 'box', w: 1.95, h: 0.95, d: 1.95, handles: 0, color: WHITE_BOARD, label: 'Boîte carrée', dims: '3 hauteurs'},
};

function frontTexture(w: number, h: number, baseHex: string) {
  const px = 360;
  const cw = Math.round(px * (w / Math.max(w, h)));
  const ch = Math.round(px * (h / Math.max(w, h)));
  const c = document.createElement('canvas');
  c.width = Math.max(64, cw);
  c.height = Math.max(64, ch);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, c.width, c.height);
  // léger grain papier
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < c.width * c.height * 0.02; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#fff';
    ctx.fillRect(Math.random() * c.width, Math.random() * c.height, 1, 1);
  }
  ctx.globalAlpha = 1;
  const dark = baseHex === KRAFT;
  ctx.fillStyle = dark ? '#3A2A1A' : '#3A3A3A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(c.width * 0.14)}px Georgia, serif`;
  ctx.fillText('Votre', c.width / 2, c.height * 0.42);
  ctx.fillText('Boulangerie', c.width / 2, c.height * 0.52);
  ctx.strokeStyle = dark ? 'rgba(58,42,26,0.6)' : 'rgba(58,58,58,0.5)';
  ctx.lineWidth = Math.max(1, c.width * 0.006);
  ctx.beginPath();
  ctx.moveTo(c.width * 0.3, c.height * 0.6);
  ctx.lineTo(c.width * 0.7, c.height * 0.6);
  ctx.stroke();
  ctx.font = `400 ${Math.round(c.width * 0.05)}px Inter, sans-serif`;
  ctx.fillText('ARTISAN · DEPUIS 1998', c.width / 2, c.height * 0.66);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}

function buildPack(type: PackType) {
  const s = PACKS[type];
  const g = new THREE.Group();
  const kraft = new THREE.MeshStandardMaterial({color: new THREE.Color(s.color), roughness: 0.92, metalness: 0.02});
  const front = new THREE.MeshStandardMaterial({map: frontTexture(s.w, s.h, s.color), roughness: 0.9, metalness: 0.02});
  // corps
  const body = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, s.d), [kraft, kraft, kraft, kraft, front, kraft]);
  body.castShadow = true;
  body.position.y = s.h / 2;
  g.add(body);

  if (s.kind === 'bag') {
    // rabat supérieur (bord replié, plus foncé)
    const flap = new THREE.Mesh(
      new THREE.BoxGeometry(s.w * 1.005, s.h * 0.12, s.d * 1.01),
      new THREE.MeshStandardMaterial({color: new THREE.Color(s.color).multiplyScalar(0.82), roughness: 0.95})
    );
    flap.castShadow = true;
    flap.position.y = s.h - s.h * 0.06;
    g.add(flap);
  } else {
    // couvercle de boîte (légère surépaisseur)
    const lid = new THREE.Mesh(
      new THREE.BoxGeometry(s.w * 1.02, s.h * 0.14, s.d * 1.02),
      new THREE.MeshStandardMaterial({color: new THREE.Color(s.color).multiplyScalar(0.95), roughness: 0.9})
    );
    lid.castShadow = true;
    lid.position.y = s.h - s.h * 0.07;
    g.add(lid);
  }

  // poignées (arche demi-tore)
  if (s.handles > 0) {
    const hMat = new THREE.MeshStandardMaterial({color: new THREE.Color(s.color).multiplyScalar(0.85), roughness: 0.9});
    const r = s.kind === 'bag' ? s.w * 0.3 : s.w * 0.22;
    const positions = s.handles === 2 ? [s.d * 0.28, -s.d * 0.28] : [0];
    for (const z of positions) {
      const handle = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 10, 28, Math.PI), hMat);
      handle.castShadow = true;
      handle.position.set(0, s.h, z);
      g.add(handle);
    }
  }
  return g;
}

function PackagingViewer({type}: {type: PackType}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'grab';

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(3.2, 2.8, 4.8);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xcfd6df, 1.15));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(4, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 25;
    key.shadow.bias = -0.0008;
    key.shadow.radius = 6;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(-4, 3, 3);
    scene.add(fill);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({opacity: 0.15}));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 3;
    controls.maxDistance = 9;
    controls.minPolarAngle = 0.2;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.0;
    controls.target.set(0, 0.9, 0);
    controls.addEventListener('start', () => (controls.autoRotate = false));

    setReady(true);
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) mount.removeChild(renderer.domElement);
    };
  }, []);

  // (re)construction du modèle quand le type change
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (modelRef.current) {
      scene.remove(modelRef.current);
      modelRef.current.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          (Array.isArray(m.material) ? m.material : [m.material]).forEach((mt) => mt?.dispose());
        }
      });
    }
    const model = buildPack(type);
    modelRef.current = model;
    scene.add(model);
  }, [type]);

  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0 blur-3xl" style={{background: 'radial-gradient(ellipse at 55% 45%, rgba(47,111,179,0.12), transparent 65%)'}} />
      <div ref={mountRef} className="relative w-full h-full" style={{minHeight: 420}} />
      <div className="drag-hint pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[12px] font-medium" style={{color: MUTED, opacity: ready ? undefined : 0}}>
        <Move size={14} /> Glissez pour tourner · molette pour zoomer
      </div>
    </div>
  );
}

/* ───────── Loader ───────── */
function Loader() {
  return (
    <div className="loader-exit fixed inset-0 z-[100] flex items-center justify-center pointer-events-none" style={{background: '#F7F8FA'}}>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-3xl sm:text-5xl font-semibold tracking-tight" style={{color: INK}}>
        {['Personnalisez.', 'Visualisez.', 'Commandez.'].map((w, i) => (
          <span key={w} className="loader-word" style={{animationDelay: `${300 + i * 550}ms`}}>{w}</span>
        ))}
      </div>
    </div>
  );
}

/* ───────── Navbar ───────── */
function Navbar({active, go}: {active: string; go: (id: string) => void}) {
  const items = [
    {id: 'home', label: 'Accueil'},
    {id: 'presentation', label: 'Le configurateur'},
    {id: 'contact', label: 'Contact'},
  ];
  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-7 sm:gap-9">
      {items.map((it) => {
        const on = active === it.id;
        return (
          <button key={it.id} onClick={() => go(it.id)} className="text-[15px] sm:text-[16px] transition-all duration-300 cursor-pointer" style={{color: on ? INK : 'rgba(22,36,59,0.42)', fontWeight: on ? 600 : 500}}>
            {it.label}
          </button>
        );
      })}
    </nav>
  );
}

const panelCls = 'rounded-3xl p-7 w-full max-w-[400px] relative';
const panelStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.82)',
  backdropFilter: 'blur(22px) saturate(180%)',
  WebkitBackdropFilter: 'blur(22px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.9)',
  boxShadow: '0 18px 50px rgba(22,36,59,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
  color: INK,
};

/* ───────── F1 : Matière & impression ───────── */
function MaterialDemo({inView}: {inView: boolean}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState(0);
  const [kraft, setKraft] = useState(true);
  const cursorRef = useAutoCursor(panelRef, inView, async (c) => {
    setKraft(true);
    for (const i of [1, 2, 3, 4, 0]) {
      await c.moveTo(`[data-chip="${i}"]`, 700);
      await c.click();
      setSel(i);
      await c.sleep(750);
    }
    await c.moveTo('[data-mat]', 700);
    await c.click();
    setKraft(false);
    await c.sleep(1400);
  });
  return (
    <div ref={panelRef} className={panelCls} style={panelStyle}>
      <div className="text-[10px] tracking-[3px] font-bold mb-1" style={{color: BLUE}}>IMPRESSION</div>
      <div className="text-[21px] font-bold mb-5">Matière & couleur</div>
      <div className="text-[10px] tracking-wider font-bold mb-2" style={{color: MUTED}}>COULEUR D'IMPRESSION (PANTONE)</div>
      <div className="flex flex-col gap-2 mb-4">
        {PRINT_COLORS.map((p, i) => (
          <div key={p.code} data-chip={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200" style={{background: 'rgba(255,255,255,0.7)', border: `1.5px solid ${i === sel ? BLUE : 'rgba(22,36,59,0.10)'}`, boxShadow: i === sel ? `inset 0 0 0 1px ${BLUE}` : 'none'}}>
            <span className="w-6 h-6 rounded-full shrink-0" style={{background: p.hex, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.18)'}} />
            <span>
              <span className="block text-[13px] font-semibold leading-tight">{p.name}</span>
              <span className="text-[11px]" style={{color: MUTED}}>{p.code}</span>
            </span>
            {i === sel && <Check size={15} className="ml-auto" style={{color: BLUE}} />}
          </div>
        ))}
      </div>
      <div data-mat className="flex items-center justify-between gap-4 rounded-2xl px-4 py-3.5" style={{background: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(22,36,59,0.10)'}}>
        <div>
          <div className="text-[13px] font-semibold">Matière du papier</div>
          <div className="text-[11px] mt-0.5" style={{color: MUTED}}>{kraft ? 'Kraft écru' : 'Blanc'}</div>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] font-semibold">
          <span style={{color: kraft ? BLUE : MUTED}}>Kraft</span>
          <div className="w-9 h-5 rounded-full relative" style={{background: 'rgba(22,36,59,0.16)'}}>
            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300" style={{left: kraft ? '2px' : '18px'}} />
          </div>
          <span style={{color: !kraft ? BLUE : MUTED}}>Blanc</span>
        </div>
      </div>
      <div ref={cursorRef} className="auto-cursor" style={{opacity: 0}} />
    </div>
  );
}

/* ───────── F2 : Logo IA ───────── */
function LogoDemo({inView}: {inView: boolean}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [removed, setRemoved] = useState(false);
  const cursorRef = useAutoCursor(panelRef, inView, async (c) => {
    setRemoved(false);
    await c.sleep(700);
    await c.moveTo('[data-toggle]', 760);
    await c.click();
    setRemoved(true);
    await c.sleep(1900);
  });
  return (
    <div ref={panelRef} className={panelCls} style={panelStyle}>
      <div className="text-[10px] tracking-[3px] font-bold mb-1" style={{color: BLUE}}>PERSONNALISATION</div>
      <div className="text-[21px] font-bold mb-5">Logo du commerçant</div>
      <div className="rounded-2xl border-2 border-dashed p-5 text-center mb-5" style={{borderColor: 'rgba(22,36,59,0.18)', background: 'rgba(255,255,255,0.4)'}}>
        <Upload size={20} className="mx-auto mb-2" style={{color: MUTED}} />
        <div className="text-[13px] font-semibold">Glissez le logo de la boulangerie</div>
        <div className="text-[11px] mt-1" style={{color: MUTED}}>PNG ou SVG — imprimé sur l'emballage</div>
      </div>
      <div className="flex items-center justify-center gap-3 mb-5">
        <div className="relative w-28 h-28 rounded-xl overflow-hidden border bg-white" style={{borderColor: 'rgba(22,36,59,0.10)'}}>
          <div className="checker absolute inset-0 transition-opacity duration-700" style={{opacity: removed ? 1 : 0}} />
          <div className="absolute inset-0 transition-opacity duration-700" style={{background: '#10243F', opacity: removed ? 0 : 1}} />
          <div className="absolute inset-0 grid place-items-center">
            <span className="px-3 py-2 rounded-md text-[11px] font-extrabold tracking-widest" style={{background: INK, color: '#fff'}}>LOGO</span>
          </div>
          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold transition-opacity duration-500" style={{background: BLUE, color: '#fff', opacity: removed ? 1 : 0}}>
            <Sparkles size={9} /> IA
          </div>
        </div>
      </div>
      <div data-toggle className="flex items-center justify-between gap-4 rounded-2xl px-4 py-3.5" style={{background: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(22,36,59,0.10)'}}>
        <div>
          <div className="text-[13px] font-semibold">Retirer le fond automatiquement</div>
          <div className="text-[11px] mt-0.5" style={{color: MUTED}}>Détoure le logo grâce à l'IA</div>
        </div>
        <div className="w-11 h-6 rounded-full relative shrink-0 transition-colors duration-300" style={{background: removed ? BLUE : 'rgba(22,36,59,0.16)'}}>
          <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300" style={{left: removed ? '22px' : '2px'}} />
        </div>
      </div>
      <div ref={cursorRef} className="auto-cursor" style={{opacity: 0}} />
    </div>
  );
}

/* ───────── F3 : Prix live ───────── */
function PriceDemo({inView}: {inView: boolean}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [unit, setUnit] = useState(0.08);
  const [rows, setRows] = useState(1);
  const animate = (from: number, to: number) => {
    const t0 = performance.now();
    const step = () => {
      const p = Math.min(1, (performance.now() - t0) / 600);
      setUnit(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) setTimeout(step, 16);
    };
    step();
  };
  const cursorRef = useAutoCursor(panelRef, inView, async (c) => {
    setRows(1);
    setUnit(0.08);
    await c.moveTo('[data-pricetag]', 700);
    await c.click();
    await c.sleep(500);
    await c.moveTo('[data-row="1"]', 600);
    setRows(2);
    animate(0.08, 0.11);
    await c.sleep(1000);
    await c.moveTo('[data-row="2"]', 600);
    setRows(3);
    animate(0.11, 0.13);
    await c.sleep(2200);
  });
  const ROWS = [
    {label: 'Sac kraft (base)', amount: '0,08 €', plus: false},
    {label: 'Impression 1 couleur', amount: '0,03 €', plus: true},
    {label: '2ᵉ couleur', amount: '0,02 €', plus: true},
  ];
  return (
    <div ref={panelRef} className={panelCls} style={panelStyle}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[10px] tracking-[3px] font-bold mb-1" style={{color: BLUE}}>DEVIS</div>
          <div className="text-[21px] font-bold">Prix en direct</div>
        </div>
        <div data-pricetag className="rounded-full px-4 py-2 flex items-center gap-1.5" style={{background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(22,36,59,0.10)'}}>
          <span className="text-[14px] font-bold tabular-nums">≈ {EUR(unit)}</span>
          <span className="text-[10px]" style={{color: MUTED}}>/ unité</span>
        </div>
      </div>
      <div className="rounded-2xl px-5 py-4 mb-5" style={{background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(22,36,59,0.10)'}}>
        {ROWS.map((r, i) => (
          <div key={r.label} data-row={i} className="flex justify-between py-1.5 text-[13.5px] transition-all duration-500" style={{opacity: i < rows ? 1 : 0.18, transform: i < rows ? 'none' : 'translateX(8px)', color: r.plus ? INK : MUTED}}>
            <span>{r.plus && <span className="font-extrabold mr-1" style={{color: BLUE}}>+</span>}{r.label}</span>
            <span className="tabular-nums">{r.amount}</span>
          </div>
        ))}
        <div className="flex justify-between pt-2.5 mt-1.5 border-t text-[14px] font-bold tabular-nums" style={{borderColor: 'rgba(22,36,59,0.12)'}}>
          <span>Total / unité</span>
          <span>{EUR(unit)}</span>
        </div>
      </div>
      <div className="flex items-center gap-5 rounded-2xl px-5 py-3.5" style={{background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(22,36,59,0.10)'}}>
        <div>
          <div className="text-[9px] tracking-wider font-bold" style={{color: MUTED}}>PRIX UNITAIRE</div>
          <div className="text-[17px] font-bold tabular-nums">{EUR(unit)}</div>
        </div>
        <div className="w-px h-8" style={{background: 'rgba(22,36,59,0.12)'}} />
        <div>
          <div className="text-[9px] tracking-wider font-bold" style={{color: MUTED}}>TOTAL · 1 000 SACS</div>
          <div className="text-[17px] font-bold tabular-nums" style={{color: BLUE_DEEP}}>{EUR(unit * 1000)}</div>
        </div>
      </div>
      <div className="mt-3 text-[10.5px]" style={{color: MUTED}}>Personnalisation dès 300 unités</div>
      <div ref={cursorRef} className="auto-cursor" style={{opacity: 0}} />
    </div>
  );
}

/* ───────── F4 : BAT 3 clics ───────── */
function BatDemo({inView}: {inView: boolean}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(0);
  const cursorRef = useAutoCursor(panelRef, inView, async (c) => {
    setDone(0);
    await c.sleep(700);
    for (let i = 1; i <= 3; i++) {
      await c.moveTo(`[data-step="${i - 1}"]`, 700);
      await c.click();
      setDone(i);
      await c.sleep(i === 3 ? 2400 : 750);
    }
  });
  const STEPS = [
    {Icon: Check, label: 'Validez la maquette', sub: 'Le bon à tirer est généré automatiquement'},
    {Icon: Send, label: 'Envoyez le bon à tirer', sub: 'Mail pré-rempli, PDF joint en un clic'},
    {Icon: Coffee, label: 'Détendez-vous', sub: 'On s’occupe du reste'},
  ];
  return (
    <div ref={panelRef} className={panelCls} style={panelStyle}>
      <div className="text-[10px] tracking-[3px] font-bold mb-1" style={{color: BLUE}}>VALIDATION</div>
      <div className="text-[21px] font-bold mb-6">Bon à tirer · 3 clics</div>
      <div className="flex flex-col gap-3">
        {STEPS.map((s, i) => {
          const isDone = i < done;
          return (
            <div key={s.label} data-step={i} className="flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-all duration-300" style={{background: 'rgba(255,255,255,0.7)', border: `1.5px solid ${isDone ? BLUE : 'rgba(22,36,59,0.10)'}`, boxShadow: isDone ? `inset 0 0 0 1px ${BLUE}` : 'none', opacity: isDone || done === i ? 1 : 0.5}}>
              <div className="w-10 h-10 rounded-full grid place-items-center shrink-0 transition-all duration-300" style={{background: isDone ? BLUE : 'rgba(22,36,59,0.06)', color: isDone ? '#fff' : MUTED}}>
                {isDone ? <Check size={18} /> : <s.Icon size={18} />}
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-semibold">{s.label}</div>
                <div className="text-[11.5px]" style={{color: MUTED}}>{s.sub}</div>
              </div>
              <div className="text-[11px] font-bold tabular-nums" style={{color: isDone ? BLUE : MUTED}}>{i + 1}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-5 text-center text-[12px] font-medium transition-all duration-500" style={{color: MUTED, opacity: done === 3 ? 1 : 0, transform: done === 3 ? 'none' : 'translateY(6px)'}}>
        ✓ Commande transmise — vous n'avez plus rien à faire.
      </div>
      <div ref={cursorRef} className="auto-cursor" style={{opacity: 0}} />
    </div>
  );
}

/* ───────── Section ───────── */
function Feature({id, kicker, title, text, demo, flip}: {id?: string; kicker: string; title: string; text: string; demo: (inView: boolean) => React.ReactNode; flip?: boolean}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (inView) setSeen(true);
  }, [inView]);
  return (
    <section id={id} className="max-w-6xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
      <div className={`flex flex-col ${flip ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 lg:gap-20`} ref={ref}>
        <div className={`reveal reveal-1 ${seen ? 'in' : ''} flex-1 max-w-xl`}>
          <div className="text-[11px] tracking-[3px] font-bold mb-3" style={{color: BLUE}}>{kicker}</div>
          <h2 className="text-[1.9rem] sm:text-[2.4rem] leading-[1.12] font-semibold tracking-tight mb-5" style={{color: INK}}>{title}</h2>
          <p className="text-[15px] leading-relaxed" style={{color: MUTED}}>{text}</p>
        </div>
        <div className={`reveal reveal-2 ${seen ? 'in' : ''} flex-1 flex justify-center`}>{demo(inView)}</div>
      </div>
    </section>
  );
}

/* ═════════════════════════ App ═════════════════════════ */
const TYPES: PackType[] = ['sac-traiteur', 'sac-viennoiserie', 'boite-poignee', 'boite-carree'];

export default function LehbarApp() {
  const [active, setActive] = useState('home');
  const [heroSeen, setHeroSeen] = useState(false);
  const [type, setType] = useState<PackType>('sac-traiteur');
  useEffect(() => {
    const t = setTimeout(() => setHeroSeen(true), 60);
    return () => clearTimeout(t);
  }, []);
  const go = (id: string) => {
    if (id === 'home') window.scrollTo({top: 0, behavior: 'smooth'});
    else document.getElementById(id)?.scrollIntoView({behavior: 'smooth'});
  };
  useEffect(() => {
    const ids = ['home', 'presentation', 'contact'];
    const onScroll = () => {
      const y = window.scrollY + window.innerHeight * 0.35;
      let cur = 'home';
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= y) cur = id;
      }
      setActive(cur);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="relative min-h-screen" style={{fontFamily: "'Inter', system-ui, sans-serif", color: INK, background: 'radial-gradient(ellipse 90% 70% at 50% 0%, #FFFFFF, transparent 60%), linear-gradient(180deg, #F7F9FC 0%, #EAEEF4 100%)'}}>
      <div className="module-dots fixed inset-0 pointer-events-none" style={{backgroundImage: 'radial-gradient(rgba(22,36,59,0.05) 1px, transparent 1.5px)'}} />
      <div className="fixed top-0 left-0 right-0 h-24 z-40 pointer-events-none" style={{background: 'linear-gradient(to bottom, #F7F9FC 0%, #F7F9FC 38%, rgba(247,249,252,0))', WebkitBackdropFilter: 'blur(8px)', backdropFilter: 'blur(8px)', WebkitMaskImage: 'linear-gradient(to bottom, #000 55%, transparent)', maskImage: 'linear-gradient(to bottom, #000 55%, transparent)'}} />
      <Loader />
      <Navbar active={active} go={go} />

      {/* HERO */}
      <header id="home" className="relative min-h-screen flex items-center">
        <div className="max-w-6xl mx-auto w-full px-6 sm:px-10 grid lg:grid-cols-2 gap-10 lg:gap-6 items-center pt-28 pb-16">
          <div className="max-w-xl">
            <div className={`reveal reveal-1 ${heroSeen ? 'in' : ''} inline-flex items-center gap-2 text-[11px] tracking-[3px] font-bold mb-5 px-3 py-1.5 rounded-full`} style={{color: BLUE_DEEP, background: 'rgba(47,111,179,0.10)'}}>
              DÉMO — PROPOSÉ PAR TAYLR POUR LEHBAR
            </div>
            <h1 className={`reveal reveal-1 ${heroSeen ? 'in' : ''} text-[2.2rem] sm:text-[3rem] leading-[1.08] font-semibold tracking-tight mb-5`} style={{color: INK}}>
              Tous vos emballages,
              <br />
              <span style={{color: BLUE}}>personnalisables en 3D.</span>
            </h1>
            <p className={`reveal reveal-2 ${heroSeen ? 'in' : ''} text-[15.5px] leading-relaxed mb-4 max-w-md`} style={{color: MUTED}}>
              Sacs, boîtes, viennoiserie, traiteur… Offrez à vos clients boulangers et pâtissiers un
              configurateur 3D temps réel : ils posent leur logo, choisissent matière, couleur et
              format, voient le prix en direct et valident leur bon à tirer en 3 clics.
            </p>
            <p className={`reveal reveal-2 ${heroSeen ? 'in' : ''} text-[13px] mb-7 max-w-md`} style={{color: BLUE_DEEP}}>
              Le même moteur 3D, sur toute votre gamme.
            </p>
            {/* sélecteur de gamme */}
            <div className={`reveal reveal-3 ${heroSeen ? 'in' : ''} flex flex-wrap gap-2 mb-8`}>
              {TYPES.map((t) => {
                const on = t === type;
                return (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className="text-[12.5px] font-medium rounded-full px-4 py-2 transition-all duration-200 cursor-pointer"
                    style={{
                      background: on ? BLUE_DEEP : 'rgba(255,255,255,0.7)',
                      color: on ? '#fff' : INK,
                      border: `1px solid ${on ? BLUE_DEEP : 'rgba(22,36,59,0.12)'}`,
                    }}
                  >
                    {PACKS[t].label}
                  </button>
                );
              })}
            </div>
            <button onClick={() => go('contact')} className={`reveal reveal-4 ${heroSeen ? 'in' : ''} group inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 text-[14px] font-semibold transition-all duration-300 cursor-pointer`} style={{background: BLUE_DEEP, color: '#fff'}}>
              Discutons-en
              <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
            </button>
          </div>
          <div className={`reveal reveal-2 ${heroSeen ? 'in' : ''} flex flex-col`}>
            <div className="h-[420px] sm:h-[500px] w-full">
              <PackagingViewer type={type} />
            </div>
            <div className="text-center text-[12px] font-medium mt-1" style={{color: MUTED}}>
              {PACKS[type].label} · <span style={{color: INK}}>{PACKS[type].dims}</span>
            </div>
          </div>
        </div>
      </header>

      <Feature id="presentation" kicker="01 · MATIÈRE & IMPRESSION" title="Kraft ou blanc. Vos couleurs, au Pantone près." text="Vos clients choisissent la matière (kraft écru ou papier blanc) et la couleur d'impression — en 1 ou 2 couleurs, comme votre gamme le permet. L'aperçu 3D se met à jour à l'instant, la référence exacte part en production." demo={(v) => <MaterialDemo inView={v} />} />
      <Feature flip kicker="02 · LOGO DU COMMERÇANT" title="Leur logo, détouré par l'IA." text="Le boulanger glisse son logo : le fond est retiré automatiquement par l'IA, puis posé proprement sur le sac ou la boîte. Aucun fichier à préparer, aucun aller-retour graphique avant le bon à tirer." demo={(v) => <LogoDemo inView={v} />} />
      <Feature kicker="03 · DEVIS EN DIRECT" title="Le prix se calcule à chaque option." text="Matière, nombre de couleurs, format, quantité : chaque choix met à jour le prix unitaire et le total en direct, avec le minimum de commande affiché clairement. Le devis n'est plus une boîte noire." demo={(v) => <PriceDemo inView={v} />} />
      <Feature flip kicker="04 · BON À TIRER" title="Le bon à tirer, envoyé en 3 clics." text="Validez la maquette, envoyez le mail pré-rempli avec le PDF joint — et c'est tout. Vos clients passent à autre chose, vous recevez une commande prête à produire, sans relance ni fichier à reprendre." demo={(v) => <BatDemo inView={v} />} />

      <section id="contact" className="max-w-6xl mx-auto px-6 sm:px-10 py-20 sm:py-28">
        <ContactForm />
      </section>

      <footer className="text-center pb-10 text-[12px]" style={{color: MUTED}}>
        <span className="wordmark font-bold" style={{color: INK}}>Taylr.</span> — Configurateur 3D temps réel · démo réalisée pour Lehbar
      </footer>
    </div>
  );
}

function ContactForm() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (inView) setSeen(true);
  }, [inView]);
  const [form, setForm] = useState({name: '', company: '', email: '', message: ''});
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({...form, [k]: e.target.value});
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = `Nom : ${form.name}\nSociété : ${form.company}\nEmail : ${form.email}\n\n${form.message}`;
    window.location.href = 'mailto:contact@taylr.studio?subject=' + encodeURIComponent(`Taylr × Lehbar — ${form.company || form.name}`) + '&body=' + encodeURIComponent(body);
  };
  const input = 'w-full rounded-xl px-4 py-3 text-[14px] outline-none transition-colors';
  const inputStyle: React.CSSProperties = {background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(22,36,59,0.12)', color: INK};
  return (
    <div ref={ref} className={`reveal reveal-1 ${seen ? 'in' : ''} max-w-2xl mx-auto`}>
      <div className="text-center mb-10">
        <div className="text-[11px] tracking-[3px] font-bold mb-3" style={{color: BLUE}}>CONTACT</div>
        <h2 className="text-[1.9rem] sm:text-[2.4rem] font-semibold tracking-tight" style={{color: INK}}>Donnons vie à ce configurateur.</h2>
        <p className="text-[14px] mt-3" style={{color: MUTED}}>Une démo sur vos vrais produits, un devis — réponse sous 24 h.</p>
      </div>
      <form onSubmit={submit} className="rounded-3xl p-7 sm:p-9 flex flex-col gap-4" style={panelStyle}>
        <div className="flex flex-col sm:flex-row gap-4">
          <input required placeholder="Votre nom" value={form.name} onChange={set('name')} className={input} style={inputStyle} />
          <input placeholder="Société" value={form.company} onChange={set('company')} className={input} style={inputStyle} />
        </div>
        <input required type="email" placeholder="Votre email" value={form.email} onChange={set('email')} className={input} style={inputStyle} />
        <textarea required placeholder="Votre message…" rows={5} value={form.message} onChange={set('message')} className={input + ' resize-none'} style={inputStyle} />
        <button type="submit" className="group inline-flex items-center justify-center gap-2.5 rounded-full px-7 py-3.5 text-[14px] font-semibold transition-all duration-300 cursor-pointer mt-2" style={{background: BLUE_DEEP, color: '#fff'}}>
          Envoyer
          <Send size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
        </button>
      </form>
    </div>
  );
}
