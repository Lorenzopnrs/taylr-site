import {useEffect, useRef, useState} from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Coffee,
  Footprints,
  Gift,
  Image as ImageIcon,
  Move,
  Package,
  Palette,
  PenLine,
  Plus,
  Ruler,
  Send,
  Shapes,
  Shirt,
  Sparkles,
  Spline,
  Sun,
  Type,
  Upload,
} from 'lucide-react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';

/* ═══════════════════════════════════════════════════════════════════
   Taylr. — site vitrine du module de personnalisation 3D.
   Thème clair (Apple / module light) · texte noir · pas de couleur identitaire.
   ═══════════════════════════════════════════════════════════════════ */

const INK = '#1C1C1C';
const MUTED = '#6E7078';

const PANTONES = [
  {name: 'Blanc', code: 'Blanc', hex: '#F5F0EB'},
  {name: 'Rouge', code: '186 C', hex: '#C8102E'},
  {name: 'Bleu', code: 'Reflex Blue C', hex: '#001489'},
  {name: 'Or', code: '7406 C', hex: '#F1BE48'},
  {name: 'Noir', code: 'Black C', hex: '#2D2926'},
];
const EUR = (n: number) =>
  n.toLocaleString('fr-FR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';

/* ───────── détection « dans la vue » (robuste, périodique) ───────── */
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

/* ───────── pantoufle 3D manipulable (OrbitControls) ───────── */
function Slipper3DViewer({hideHint = false}: {hideHint?: boolean}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'grab';
    // Le canvas doit TOUJOURS remplir son cadre, quelle que soit la résolution
    // interne (sinon, sur écran Retina dpr=2, il s'affiche à 2× et déborde).
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(3.2, 2.2, 5.2);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xe6e6e6, 1.55));
    const key = new THREE.DirectionalLight(0xffffff, 2.0);
    key.position.set(4, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 25;
    key.shadow.bias = -0.0008;
    key.shadow.radius = 14; // ombre très douce
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.75);
    fill.position.set(-4, 3, 3);
    scene.add(fill);

    // sol qui ne reçoit QUE l'ombre (large, étendue, floue)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.ShadowMaterial({opacity: 0.22})
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 3.4;
    controls.maxDistance = 8;
    controls.minPolarAngle = 0.25;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.1;
    controls.target.set(0, 0.55, 0);
    controls.addEventListener('start', () => (controls.autoRotate = false));

    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    let disposed = false;
    loader.load('/pantoufle-fermee.glb', (gltf) => {
      if (disposed) return;
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      const s = 3.2 / Math.max(size.x, size.y, size.z);
      model.scale.setScalar(s);
      model.position.multiplyScalar(s);
      const nb = new THREE.Box3().setFromObject(model);
      model.position.y -= nb.min.y; // posé sur le sol (y=0)
      model.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = false;
          // Tissu plus blanc : on éclaircit le matériau (le GLB rend gris).
          const mat = m.material as THREE.MeshStandardMaterial;
          if (mat && mat.isMeshStandardMaterial) {
            mat.color = new THREE.Color('#FFFFFF');
            if (mat.map) {
              mat.emissive = new THREE.Color('#FFFFFF');
              mat.emissiveMap = mat.map; // relève les zones claires (feutre) sans toucher la semelle noire
              mat.emissiveIntensity = 0.28;
            }
            mat.needsUpdate = true;
          }
        }
      });
      scene.add(model);
      setReady(true);
    });

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
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div
        className="absolute inset-0 blur-3xl"
        style={{background: 'radial-gradient(ellipse at 55% 45%, rgba(255,255,255,0.9), transparent 65%)'}}
      />
      <div ref={mountRef} className="relative w-full h-full" style={{minHeight: 420}} />
      {!hideHint && (
        <div
          className="drag-hint pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[12px] font-medium"
          style={{color: MUTED, opacity: ready ? undefined : 0}}
        >
          <Move size={14} /> Glissez pour tourner · molette pour zoomer
        </div>
      )}
    </div>
  );
}

type CursorApi = {
  moveTo: (sel: string, dur?: number) => Promise<void>;
  click: () => Promise<void>;
  sleep: (ms: number) => Promise<void>;
};

/* curseur automatique : anime un pointeur dans un panneau et joue un script en boucle */
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

/* ───────── Loader ───────── */
function Loader() {
  return (
    <div className="loader-exit fixed inset-0 z-[100] module-bg flex items-center justify-center pointer-events-none">
      <div
        className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-3xl sm:text-5xl font-semibold tracking-tight"
        style={{color: INK}}
      >
        {['Personnalisez.', 'Visualisez.', 'Commandez.'].map((w, i) => (
          <span key={w} className="loader-word" style={{animationDelay: `${300 + i * 550}ms`}}>
            {w}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ───────── Navbar flottante (sans cadre, sans bulle) ───────── */
function Navbar({active, go}: {active: string; go: (id: string) => void}) {
  const items = [
    {id: 'home', label: 'Home'},
    {id: 'presentation', label: 'Présentation'},
    {id: 'contact', label: 'Contact'},
  ];
  return (
    <>
    <button
      onClick={() => go('home')}
      className="wordmark fixed top-5 sm:top-6 left-6 sm:left-10 z-50 text-[21px] font-bold cursor-pointer"
      style={{color: INK}}
    >
      Taylr.
    </button>
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-7 sm:gap-9">
      {items.map((it) => {
        const on = active === it.id;
        return (
          <button
            key={it.id}
            onClick={() => go(it.id)}
            className="text-[15px] sm:text-[16px] transition-all duration-300 cursor-pointer"
            style={{
              color: on ? INK : 'rgba(28,28,28,0.4)',
              fontWeight: on ? 600 : 500,
            }}
          >
            {it.label}
          </button>
        );
      })}
    </nav>
    </>
  );
}

/* ───────── Panneau F1 : Couleur du Tissu (curseur auto) ───────── */
function FabricDemo({inView}: {inView: boolean}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState(1);
  const cursorRef = useAutoCursor(panelRef, inView, async (c) => {
    for (const i of [1, 2, 3, 4, 0]) {
      await c.moveTo(`[data-chip="${i}"]`, 720);
      await c.click();
      setSel(i);
      await c.sleep(950);
    }
  });
  return (
    <div ref={panelRef} className="glass-strong rounded-3xl p-7 w-full max-w-[400px] relative" style={{color: INK}}>
      <div className="text-[10px] tracking-[3px] font-bold mb-1" style={{color: MUTED}}>
        PERSONNALISATION
      </div>
      <div className="text-[21px] font-bold mb-5">Couleur du Tissu</div>
      <div className="text-[10px] tracking-wider font-bold mb-2" style={{color: MUTED}}>RÉFÉRENCE PANTONE (PMS)</div>
      <div className="flex items-center gap-3 mb-5">
        <span
          className="w-9 h-9 rounded-lg shrink-0 transition-colors duration-300"
          style={{background: PANTONES[sel].hex, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.14)'}}
        />
        <div className="flex-1 rounded-xl px-4 py-2.5 text-[13px] bg-white/70 border border-black/10">
          {PANTONES[sel].code}
        </div>
      </div>
      <div className="text-[10px] tracking-wider font-bold mb-2" style={{color: MUTED}}>BEST-SELLERS</div>
      <div className="flex flex-col gap-2">
        {PANTONES.map((p, i) => (
          <div
            key={p.code}
            data-chip={i}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 bg-white/70"
            style={{
              border: `1.5px solid ${i === sel ? INK : 'rgba(0,0,0,0.08)'}`,
              boxShadow: i === sel ? `inset 0 0 0 1px ${INK}` : 'none',
            }}
          >
            <span
              className="w-6 h-6 rounded-full shrink-0"
              style={{background: p.hex, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.18)'}}
            />
            <span>
              <span className="block text-[13px] font-semibold leading-tight">{p.name}</span>
              <span className="text-[11px]" style={{color: MUTED}}>{p.code}</span>
            </span>
            {i === sel && <Check size={15} className="ml-auto" style={{color: INK}} />}
          </div>
        ))}
      </div>
      <div ref={cursorRef} className="auto-cursor" style={{opacity: 0}} />
    </div>
  );
}

/* ───────── Panneau F2 : Logo + détourage IA (curseur auto) ───────── */
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
    <div ref={panelRef} className="glass-strong rounded-3xl p-7 w-full max-w-[400px] relative" style={{color: INK}}>
      <div className="text-[10px] tracking-[3px] font-bold mb-1" style={{color: MUTED}}>
        PERSONNALISATION
      </div>
      <div className="text-[21px] font-bold mb-5">Logo</div>
      <div className="rounded-2xl border-2 border-dashed border-black/15 bg-white/40 p-5 text-center mb-5">
        <Upload size={20} className="mx-auto mb-2" style={{color: MUTED}} />
        <div className="text-[13px] font-semibold">Glissez un fichier ici</div>
        <div className="text-[11px] mt-1" style={{color: MUTED}}>PNG ou SVG — ou cliquez pour parcourir</div>
      </div>
      <div className="flex items-center justify-center gap-3 mb-5">
        <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-black/10 bg-white">
          <div className="checker absolute inset-0 transition-opacity duration-700" style={{opacity: removed ? 1 : 0}} />
          <div className="absolute inset-0 transition-opacity duration-700" style={{background: '#C8102E', opacity: removed ? 0 : 1}} />
          <div className="absolute inset-0 grid place-items-center">
            <span className="px-3 py-2 rounded-md text-[11px] font-extrabold tracking-widest" style={{background: INK, color: '#fff'}}>
              LOGO
            </span>
          </div>
          <div
            className="absolute top-1.5 right-1.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold transition-opacity duration-500"
            style={{background: INK, color: '#fff', opacity: removed ? 1 : 0}}
          >
            <Sparkles size={9} /> IA
          </div>
        </div>
      </div>
      <div data-toggle className="flex items-center justify-between gap-4 rounded-2xl bg-white/70 border border-black/10 px-4 py-3.5">
        <div>
          <div className="text-[13px] font-semibold">Retirer le fond automatiquement</div>
          <div className="text-[11px] mt-0.5" style={{color: MUTED}}>Détoure votre logo grâce à l'IA</div>
        </div>
        <div
          className="w-11 h-6 rounded-full relative shrink-0 transition-colors duration-300"
          style={{background: removed ? INK : 'rgba(0,0,0,0.18)'}}
        >
          <span
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300"
            style={{left: removed ? '22px' : '2px'}}
          />
        </div>
      </div>
      <div ref={cursorRef} className="auto-cursor" style={{opacity: 0}} />
    </div>
  );
}

/* ───────── Panneau F3 : récap + prix live (curseur auto) ───────── */
function PriceDemo({inView}: {inView: boolean}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [unit, setUnit] = useState(0.74);
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
    setUnit(0.74);
    await c.moveTo('[data-pricetag]', 700);
    await c.click();
    await c.sleep(500);
    await c.moveTo('[data-row="1"]', 600);
    setRows(2);
    animate(0.74, 0.79);
    await c.sleep(1000);
    await c.moveTo('[data-row="2"]', 600);
    setRows(3);
    animate(0.79, 0.99);
    await c.sleep(2200);
  });
  const ROWS = [
    {label: 'Basic fermée', amount: '0,74 €', plus: false},
    {label: 'Liséré', amount: '0,05 €', plus: true},
    {label: 'Broderie', amount: '0,20 €', plus: true},
  ];
  return (
    <div ref={panelRef} className="glass-strong rounded-3xl p-7 w-full max-w-[400px] relative" style={{color: INK}}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[10px] tracking-[3px] font-bold mb-1" style={{color: MUTED}}>RÉCAPITULATIF</div>
          <div className="text-[21px] font-bold">Prix en direct</div>
        </div>
        <div data-pricetag className="glass rounded-full px-4 py-2 flex items-center gap-1.5">
          <span className="text-[14px] font-bold tabular-nums">≈ {EUR(unit)}</span>
          <span className="text-[10px]" style={{color: MUTED}}>/ paire</span>
          <ChevronDown size={13} className="rotate-180" style={{color: MUTED}} />
        </div>
      </div>
      <div className="rounded-2xl bg-white/70 border border-black/10 px-5 py-4 mb-5">
        {ROWS.map((r, i) => (
          <div
            key={r.label}
            data-row={i}
            className="flex justify-between py-1.5 text-[14px] transition-all duration-500"
            style={{
              opacity: i < rows ? 1 : 0.18,
              transform: i < rows ? 'none' : 'translateX(8px)',
              color: r.plus ? INK : MUTED,
            }}
          >
            <span>
              {r.plus && <span className="font-extrabold mr-1" style={{color: INK}}>+</span>}
              {r.label}
            </span>
            <span className="tabular-nums">{r.amount}</span>
          </div>
        ))}
        <div className="flex justify-between pt-2.5 mt-1.5 border-t border-black/10 text-[14px] font-bold tabular-nums">
          <span>Total / paire</span>
          <span>{EUR(unit)}</span>
        </div>
      </div>
      <div className="flex items-center gap-5 rounded-2xl glass px-5 py-3.5">
        <div>
          <div className="text-[9px] tracking-wider font-bold" style={{color: MUTED}}>PRIX UNITAIRE ESTIMÉ</div>
          <div className="text-[17px] font-bold tabular-nums">{EUR(unit)}</div>
        </div>
        <div className="w-px h-8 bg-black/10" />
        <div>
          <div className="text-[9px] tracking-wider font-bold" style={{color: MUTED}}>TOTAL · 1 050 PAIRES</div>
          <div className="text-[17px] font-bold tabular-nums">{EUR(unit * 1050)}</div>
        </div>
      </div>
      <div ref={cursorRef} className="auto-cursor" style={{opacity: 0}} />
    </div>
  );
}

/* ───────── Panneau F4 : envoi du BAT en 3 clics (curseur auto) ───────── */
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
    {Icon: Check, label: 'Validez votre création', sub: 'Le bon à tirer est généré automatiquement'},
    {Icon: Send, label: 'Envoyez le bon à tirer', sub: 'Mail pré-rempli, PDF joint en un clic'},
    {Icon: Coffee, label: 'Détendez-vous', sub: 'On s’occupe du reste'},
  ];
  return (
    <div ref={panelRef} className="glass-strong rounded-3xl p-7 w-full max-w-[400px] relative" style={{color: INK}}>
      <div className="text-[10px] tracking-[3px] font-bold mb-1" style={{color: MUTED}}>VALIDATION</div>
      <div className="text-[21px] font-bold mb-6">Bon à tirer · 3 clics</div>
      <div className="flex flex-col gap-3">
        {STEPS.map((s, i) => {
          const isDone = i < done;
          const last = i === 2;
          return (
            <div
              key={s.label}
              data-step={i}
              className="flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-all duration-300 bg-white/70"
              style={{
                border: `1.5px solid ${isDone ? INK : 'rgba(0,0,0,0.08)'}`,
                boxShadow: isDone ? `inset 0 0 0 1px ${INK}` : 'none',
                opacity: isDone || done === i ? 1 : 0.5,
              }}
            >
              <div
                className="w-10 h-10 rounded-full grid place-items-center shrink-0 transition-all duration-300"
                style={{
                  background: isDone ? INK : 'rgba(0,0,0,0.06)',
                  color: isDone ? '#fff' : MUTED,
                }}
              >
                {isDone ? <Check size={18} /> : <s.Icon size={18} />}
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-semibold flex items-center gap-2">
                  {s.label}
                  {last && isDone && <Coffee size={14} style={{color: MUTED}} />}
                </div>
                <div className="text-[11.5px]" style={{color: MUTED}}>{s.sub}</div>
              </div>
              <div className="text-[11px] font-bold tabular-nums" style={{color: isDone ? INK : MUTED}}>
                {i + 1}
              </div>
            </div>
          );
        })}
      </div>
      <div
        className="mt-5 text-center text-[12px] font-medium transition-all duration-500"
        style={{color: MUTED, opacity: done === 3 ? 1 : 0, transform: done === 3 ? 'none' : 'translateY(6px)'}}
      >
        ✓ Commande transmise — vous n'avez plus rien à faire.
      </div>
      <div ref={cursorRef} className="auto-cursor" style={{opacity: 0}} />
    </div>
  );
}

/* ───────── Section « universel » : Taylr personnalise tout produit ───────── */
const PRODUCTS = [
  {Icon: Footprints, label: "Chaussons d'hôtel"},
  {Icon: Package, label: 'Emballages'},
  {Icon: Shirt, label: 'Textile'},
  {Icon: Gift, label: 'Objets promotionnels'},
  {Icon: Plus, label: 'Vos produits'},
];

function UniversalSection() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (inView) setSeen(true);
  }, [inView]);
  return (
    <section className="max-w-4xl mx-auto px-6 sm:px-10 pt-8 pb-16 sm:pt-16 sm:pb-20 text-center">
      <div ref={ref} className={`reveal reveal-1 ${seen ? 'in' : ''}`}>
        <div className="text-[11px] tracking-[3px] font-bold mb-3" style={{color: MUTED}}>UN MOTEUR, TOUS VOS PRODUITS</div>
        <h2 className="text-[1.9rem] sm:text-[2.4rem] font-semibold tracking-tight" style={{color: INK}}>
          Pas seulement des pantoufles.
        </h2>
        <p className="text-[15px] leading-relaxed mt-4 max-w-xl mx-auto" style={{color: MUTED}}>
          Taylr est un configurateur 3D universel : le même moteur personnalise n'importe quel
          produit. Vous affichez la 3D, vos clients choisissent couleurs, logo et options, le prix
          se calcule en direct et le bon à tirer part. La pantoufle n'est qu'un exemple.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-9">
          {PRODUCTS.map((p, i) => {
            const last = i === PRODUCTS.length - 1;
            return (
              <div
                key={p.label}
                className="flex items-center gap-2.5 rounded-full px-5 py-2.5 text-[14px] font-medium"
                style={{
                  background: last ? 'transparent' : '#FFFFFF',
                  color: INK,
                  border: last ? '1.5px dashed rgba(0,0,0,0.22)' : '1px solid rgba(0,0,0,0.07)',
                  boxShadow: last ? 'none' : '0 4px 14px rgba(28,28,28,0.07)',
                }}
              >
                <p.Icon size={17} strokeWidth={1.8} style={{color: last ? MUTED : INK}} />
                {p.label}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ───────── Aperçu du module : réplique visuelle de l'interface ─────────
   Reproduit TOUS les boutons du vrai configurateur, sans donner accès à la
   logique réelle (le prospect voit l'interface + la 3D, mais ne configure rien). */
const TILES_LEFT = [
  {key: 'fabric', Icon: Palette, label: 'Couleur du Tissu', desc: 'Large choix'},
  {key: 'piping', Icon: Spline, label: 'Couleur du Liséré', desc: 'Bordure soignée'},
  {key: 'logo', Icon: ImageIcon, label: 'Ajout du Logo', desc: 'Votre identité'},
  {key: 'thermo', Icon: Type, label: 'Texte', desc: 'Marquage durable'},
  {key: 'embroidery', Icon: Shapes, label: 'Broderie', desc: 'Imprimé ou brodé'},
];
const TILES_RIGHT = [
  {key: 'sole', Icon: Footprints, label: 'Couleur de la Semelle', desc: 'Blanche ou noire'},
  {key: 'size', Icon: Ruler, label: 'Tailles', desc: 'Enfants / femmes / hommes'},
  {key: 'quantity', Icon: Package, label: 'Quantité', desc: 'Commande grossiste'},
  {key: 'signature', Icon: PenLine, label: 'Validation & Signature', desc: 'Bon à tirer'},
];

function ModulePreview() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (inView) setSeen(true);
  }, [inView]);
  const [active, setActive] = useState('fabric');
  const [model, setModel] = useState<'fermee' | 'ouverte'>('fermee');

  const Tile = ({t}: {t: (typeof TILES_LEFT)[number]}) => {
    const on = active === t.key;
    return (
      <button
        onClick={() => setActive(t.key)}
        title={t.label}
        className="w-14 h-14 rounded-full grid place-items-center bg-white transition-all duration-200 hover:-translate-y-0.5 cursor-pointer shrink-0"
        style={{
          border: `1.5px solid ${on ? INK : 'rgba(0,0,0,0.05)'}`,
          color: INK,
          boxShadow: on
            ? '0 10px 22px rgba(28,28,28,0.16), inset 0 1px 0 rgba(255,255,255,0.9)'
            : '0 6px 16px rgba(70,58,34,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
        }}
      >
        <t.Icon size={20} strokeWidth={1.8} />
      </button>
    );
  };

  const pill = 'rounded-full bg-white flex items-center gap-1.5 text-[12px] font-semibold transition-colors';
  const pillStyle: React.CSSProperties = {border: '1px solid rgba(0,0,0,0.10)', color: INK, boxShadow: '0 2px 8px rgba(28,28,28,0.05)'};

  return (
    <section className="py-14 sm:py-20">
      <div ref={ref} className={`reveal reveal-1 ${seen ? 'in' : ''}`}>
        <div className="text-center mb-10 px-6">
          <div className="text-[11px] tracking-[3px] font-bold mb-3" style={{color: MUTED}}>APERÇU DU MODULE</div>
          <h2 className="text-[1.9rem] sm:text-[2.4rem] font-semibold tracking-tight" style={{color: INK}}>
            Le configurateur, en vrai.
          </h2>
          <p className="text-[14px] mt-3 max-w-md mx-auto" style={{color: MUTED}}>
            L'interface réelle du module — pivotez le produit en 3D, parcourez les réglages.
          </p>
        </div>

        {/* MODULE contenu dans une box (structure du module actuel) */}
        <div className="px-6 sm:px-10">
        <div
          className="relative max-w-6xl mx-auto rounded-[28px] overflow-hidden h-[72vh] min-h-[540px]"
          style={{
            background: 'radial-gradient(ellipse 88% 80% at 50% 42%, #F5F8FB 0%, #EAEEF3 58%, #DFE4EB 100%)',
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 30px 70px rgba(28,28,28,0.12), inset 0 2px 26px rgba(255,255,255,0.65)',
          }}
        >
          {/* points doux (neutres) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(rgba(40,44,60,0.05) 1px, transparent 1.6px)',
              backgroundSize: '24px 24px',
              WebkitMaskImage: 'radial-gradient(ellipse 75% 70% at 50% 45%, #000 40%, transparent 85%)',
              maskImage: 'radial-gradient(ellipse 75% 70% at 50% 45%, #000 40%, transparent 85%)',
            }}
          />
          {/* halo clair derrière le produit → le fait ressortir */}
          <div
            className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{width: '64%', height: '60%', borderRadius: '50%', background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.95), rgba(255,255,255,0) 70%)', filter: 'blur(8px)'}}
          />
          {/* ombre portée large et très floue */}
          <div
            className="absolute left-1/2 bottom-[17%] -translate-x-1/2 pointer-events-none"
            style={{width: '56%', height: '14%', borderRadius: '50%', background: 'rgba(28,33,48,0.22)', filter: 'blur(48px)'}}
          />
          {/* produit 3D, flottant dans le champ */}
          <div className="absolute inset-0">
            <SlipperViewerLite />
          </div>

          {/* barre du haut flottante */}
          <div className="absolute top-5 inset-x-0 px-6 sm:px-10 z-20 flex items-center pointer-events-none">
            <div className="flex-1 flex items-center gap-2 pointer-events-auto">
              <span className="wordmark text-[19px] font-bold" style={{color: INK}}>Taylr.</span>
            </div>
            <div className="hidden sm:flex items-center gap-3 absolute left-1/2 -translate-x-1/2 pointer-events-auto">
              <span className={pill} style={{...pillStyle, padding: '7px 14px'}}>
                BASIC <ChevronDown size={13} style={{color: MUTED}} />
              </span>
              <span className="rounded-full flex items-center p-1" style={{background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.10)', boxShadow: '0 2px 8px rgba(28,28,28,0.05)'}}>
                {(['fermee', 'ouverte'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setModel(m)}
                    className="text-[11.5px] font-bold rounded-full px-3.5 py-1.5 transition-all cursor-pointer"
                    style={{background: model === m ? INK : 'transparent', color: model === m ? '#fff' : MUTED}}
                  >
                    {m === 'fermee' ? 'FERMÉE' : 'OUVERTE'}
                  </button>
                ))}
              </span>
            </div>
            <div className="flex-1 flex items-center justify-end gap-2.5 pointer-events-auto">
              <span className={pill} style={{...pillStyle, padding: '7px 14px'}}>
                ≈ 0,99 € <span className="font-normal" style={{color: MUTED}}>/ paire</span>
                <ChevronDown size={12} style={{color: MUTED}} />
              </span>
              <span className="w-10 h-10 rounded-full grid place-items-center" style={{background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.10)', color: INK, boxShadow: '0 2px 8px rgba(28,28,28,0.05)'}}>
                <Sun size={17} />
              </span>
            </div>
          </div>

          {/* pastilles gauche */}
          <div className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 flex flex-col gap-4 sm:gap-5 z-20">
            {TILES_LEFT.map((t) => <Tile key={t.key} t={t} />)}
          </div>
          {/* pastilles droite */}
          <div className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 flex flex-col gap-4 sm:gap-5 z-20">
            {TILES_RIGHT.map((t) => <Tile key={t.key} t={t} />)}
          </div>


          {/* barre de prix flottante en bas */}
          <div className="absolute bottom-5 inset-x-0 px-6 sm:px-10 z-20 flex items-end justify-between gap-4 pointer-events-none">
            <div className="flex items-center gap-6 rounded-2xl px-5 py-3.5 pointer-events-auto" style={{background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 10px 26px rgba(28,28,28,0.10)'}}>
              <div>
                <div className="text-[9px] tracking-wider font-bold" style={{color: MUTED}}>PRIX UNITAIRE ESTIMÉ</div>
                <div className="text-[18px] font-bold tabular-nums" style={{color: INK}}>0,99 €</div>
              </div>
              <div className="w-px h-9" style={{background: 'rgba(0,0,0,0.10)'}} />
              <div className="hidden sm:block">
                <div className="text-[9px] tracking-wider font-bold" style={{color: MUTED}}>TOTAL · 1 050 PAIRES</div>
                <div className="text-[18px] font-bold tabular-nums" style={{color: INK}}>1 039,50 €</div>
              </div>
            </div>
            <button
              className="rounded-full px-6 py-3.5 text-[13.5px] font-semibold cursor-default pointer-events-auto"
              style={{background: INK, color: '#fff', boxShadow: '0 10px 26px rgba(28,28,28,0.2)'}}
            >
              Valider ma création
            </button>
          </div>
        </div>
        </div>
        <p className="text-center text-[11.5px] mt-5 px-6" style={{color: MUTED}}>
          Aperçu non contractuel — l'accès complet au configurateur est activé après accord.
        </p>
      </div>
    </section>
  );
}

/* Variante allégée du viewer pour l'aperçu (fond crème géré par la scène) */
function SlipperViewerLite() {
  return <Slipper3DViewer hideHint />;
}

/* ───────── Section fonctionnalité (texte + démo, alternés) ───────── */
function Feature({
  id,
  kicker,
  title,
  text,
  demo,
  flip,
}: {
  id?: string;
  kicker: string;
  title: string;
  text: string;
  demo: (inView: boolean) => React.ReactNode;
  flip?: boolean;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (inView) setSeen(true);
  }, [inView]);
  return (
    <section id={id} className="max-w-6xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
      <div
        className={`flex flex-col ${flip ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 lg:gap-20`}
        ref={ref}
      >
        <div className={`reveal reveal-1 ${seen ? 'in' : ''} flex-1 max-w-xl`}>
          <div className="text-[11px] tracking-[3px] font-bold mb-3" style={{color: MUTED}}>{kicker}</div>
          <h2 className="text-[1.9rem] sm:text-[2.4rem] leading-[1.12] font-semibold tracking-tight mb-5" style={{color: INK}}>
            {title}
          </h2>
          <p className="text-[15px] leading-relaxed" style={{color: MUTED}}>{text}</p>
        </div>
        <div className={`reveal reveal-2 ${seen ? 'in' : ''} flex-1 flex justify-center`}>{demo(inView)}</div>
      </div>
    </section>
  );
}

/* ═════════════════════════ App ═════════════════════════ */
export default function App() {
  const [active, setActive] = useState('home');
  const [heroSeen, setHeroSeen] = useState(false);
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
    <div className="relative min-h-screen module-bg" style={{fontFamily: "'Inter', system-ui, sans-serif", color: INK}}>
      <div className="module-dots fixed inset-0 pointer-events-none" />
      <div className="module-vignette fixed inset-0 pointer-events-none" />
      {/* dégradé flottant : masque le contenu qui défile sous la nav (pas de cadre) */}
      <div
        className="fixed top-0 left-0 right-0 h-24 z-40 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, #F0F0EE 0%, #F0F0EE 38%, rgba(240,240,238,0))',
          WebkitBackdropFilter: 'blur(8px)',
          backdropFilter: 'blur(8px)',
          WebkitMaskImage: 'linear-gradient(to bottom, #000 55%, transparent)',
          maskImage: 'linear-gradient(to bottom, #000 55%, transparent)',
        }}
      />
      <Loader />
      <Navbar active={active} go={go} />

      {/* ───────── HERO : explicatif gauche · pantoufle 3D manipulable droite ───────── */}
      <header id="home" className="relative min-h-[80vh] flex items-center">
        <div className="max-w-6xl mx-auto w-full px-6 sm:px-10 grid lg:grid-cols-2 gap-10 lg:gap-6 items-center pt-20 pb-6">
          <div className="max-w-xl">
            <div className={`reveal reveal-1 ${heroSeen ? 'in' : ''} text-[11px] tracking-[4px] font-bold mb-4`} style={{color: MUTED}}>
              CONFIGURATEUR 3D TEMPS RÉEL
            </div>
            <div className={`reveal reveal-1 ${heroSeen ? 'in' : ''} wordmark text-[4rem] sm:text-[5.5rem] leading-none font-black mb-4`} style={{color: INK}}>
              Taylr.
            </div>
            <h1 className={`reveal reveal-2 ${heroSeen ? 'in' : ''} text-[1.6rem] sm:text-[2rem] leading-[1.12] font-semibold tracking-tight mb-5`} style={{color: INK}}>
              Le chausson de votre hôtel.
              <br />
              Dessiné par vous, en 3D.
            </h1>
            <p className={`reveal reveal-3 ${heroSeen ? 'in' : ''} text-[15px] leading-relaxed mb-8 max-w-md`} style={{color: MUTED}}>
              Choisissez la teinte Pantone exacte, posez votre logo au millimètre et voyez le prix
              se calculer sous vos yeux. Fini les catalogues figés et les allers-retours de BAT.
            </p>
            <button
              onClick={() => go('contact')}
              className={`reveal reveal-4 ${heroSeen ? 'in' : ''} group inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 text-[14px] font-semibold transition-all duration-300 cursor-pointer`}
              style={{background: INK, color: '#fff'}}
            >
              Contactez-nous
              <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
            </button>
          </div>
          <div className={`reveal reveal-2 ${heroSeen ? 'in' : ''} relative h-[420px] sm:h-[520px] w-full`}>
            {/* halo clair derrière le produit → le fait ressortir (comme le module) */}
            <div
              className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{width: '78%', height: '64%', borderRadius: '50%', background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.95), rgba(255,255,255,0) 70%)', filter: 'blur(10px)'}}
            />
            {/* ombre portée large et très floue */}
            <div
              className="absolute left-1/2 bottom-[14%] -translate-x-1/2 pointer-events-none"
              style={{width: '64%', height: '15%', borderRadius: '50%', background: 'rgba(28,33,48,0.20)', filter: 'blur(50px)'}}
            />
            <div className="relative h-full w-full">
              <Slipper3DViewer />
            </div>
          </div>
        </div>
      </header>

      <UniversalSection />

      <ModulePreview />

      <Feature
        id="presentation"
        kicker="01 · COULEUR DU TISSU"
        title="La teinte exacte de votre marque."
        text="Toute la gamme Pantone, appliquée au fil près sur le tissu. Saisissez votre code PMS ou choisissez un best-seller : l'aperçu 3D se teinte instantanément, et le code exact part en production. Votre rouge est votre rouge — pas une approximation."
        demo={(inView) => <FabricDemo inView={inView} />}
      />
      <Feature
        flip
        kicker="02 · AJOUT DU LOGO"
        title="Votre logo, détouré par l'IA."
        text="Glissez votre fichier : le fond est retiré automatiquement par l'IA — aucun fichier à préparer, aucun aller-retour avec un graphiste. Puis posez le logo au millimètre sur la 3D, du talon aux orteils."
        demo={(inView) => <LogoDemo inView={inView} />}
      />
      <Feature
        kicker="03 · RÉCAPITULATIF & PRIX"
        title="Le prix se met à jour. À chaque choix."
        text="Chaque option s'affiche en clair dans le récapitulatif : base, liséré, broderie. Le prix unitaire et le total de commande se recalculent en direct — aucune surprise au devis, votre client valide en confiance."
        demo={(inView) => <PriceDemo inView={inView} />}
      />
      <Feature
        flip
        kicker="04 · ENVOI DU BON À TIRER"
        title="Votre bon à tirer, envoyé en 3 clics."
        text="Validez la création, envoyez le mail pré-rempli avec le PDF joint — et c'est tout. Plus de relances, plus de fichiers à préparer ni d'allers-retours : vous passez à autre chose, on s'occupe du reste."
        demo={(inView) => <BatDemo inView={inView} />}
      />

      <section id="contact" className="max-w-6xl mx-auto px-6 sm:px-10 py-20 sm:py-28">
        <ContactForm />
      </section>

      <footer className="text-center pb-10 text-[12px]" style={{color: MUTED}}>
        <span className="wordmark font-bold" style={{color: INK}}>Taylr.</span> — Pantoufles d'hôtel personnalisées en 3D
      </footer>
    </div>
  );
}

/* ───────── Formulaire de contact ───────── */
function ContactForm() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (inView) setSeen(true);
  }, [inView]);
  // Clé Web3Forms — remplace la valeur ci-dessous par la clé reçue par email sur web3forms.com
  const WEB3FORMS_KEY = '187201de-ec2e-4214-b724-21cfa0dc0f1c';
  const [form, setForm] = useState({name: '', company: '', email: '', message: ''});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({...form, [k]: e.target.value});
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', Accept: 'application/json'},
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: `Contact Taylr — ${form.company || form.name}`,
          from_name: 'Site Taylr',
          name: form.name,
          company: form.company,
          email: form.email,
          message: form.message,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('sent');
        setForm({name: '', company: '', email: '', message: ''});
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };
  const input =
    'w-full rounded-xl px-4 py-3 text-[14px] bg-white/70 border border-black/10 outline-none focus:border-black/30 transition-colors';
  return (
    <div ref={ref} className={`reveal reveal-1 ${seen ? 'in' : ''} max-w-2xl mx-auto`} style={{color: INK}}>
      <div className="text-center mb-10">
        <div className="text-[11px] tracking-[3px] font-bold mb-3" style={{color: MUTED}}>CONTACT</div>
        <h2 className="text-[1.9rem] sm:text-[2.4rem] font-semibold tracking-tight">Parlons de votre projet.</h2>
        <p className="text-[14px] mt-3" style={{color: MUTED}}>Une démo, un devis, une question — nous répondons sous 24 h.</p>
      </div>
      {status === 'sent' ? (
        <div className="text-center py-16 sm:py-20">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-6" style={{background: INK, color: '#fff'}}>
            <Send size={20} />
          </div>
          <p className="text-[1.4rem] sm:text-[1.7rem] font-semibold tracking-tight">Merci, votre message a bien été envoyé.</p>
          <p className="text-[14px] mt-3" style={{color: MUTED}}>Nous revenons vers vous sous 24 h.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="glass-strong rounded-3xl p-7 sm:p-9 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <input required placeholder="Votre nom" value={form.name} onChange={set('name')} className={input} />
            <input placeholder="Votre hôtel / société" value={form.company} onChange={set('company')} className={input} />
          </div>
          <input required type="email" placeholder="Votre email" value={form.email} onChange={set('email')} className={input} />
          <textarea required placeholder="Votre message…" rows={5} value={form.message} onChange={set('message')} className={input + ' resize-none'} />
          <button
            type="submit"
            disabled={status === 'sending'}
            className="group inline-flex items-center justify-center gap-2.5 rounded-full px-7 py-3.5 text-[14px] font-semibold transition-all duration-300 cursor-pointer mt-2 disabled:opacity-60 disabled:cursor-default"
            style={{background: INK, color: '#fff'}}
          >
            {status === 'sending' ? 'Envoi…' : 'Envoyer'}
            {status === 'idle' && (
              <Send size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
            )}
          </button>
          {status === 'error' && (
            <p className="text-[13px] text-center" style={{color: '#C0392B'}}>
              Une erreur est survenue. Réessayez ou écrivez-nous à taylr.business@hotmail.com.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
