"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  BAGGAGE_LIMITS, BAGGAGE_STORAGE_KEY, DEFAULT_BAGGAGE_ADJUSTMENTS,
  type BaggageAdjustments, type BeltAdjustment,
} from "../lib/baggage-settings";
import type { HavenWorld } from "../lib/scene/world";

type Props = {
  world: HavenWorld;
  adjustments: BaggageAdjustments;
  onChange: (value: BaggageAdjustments) => void;
  onClose: () => void;
};

function FineNumber({ value, name, limits, onChange }: {
  value: number; name: string; limits: { min: number; max: number; step: number }; onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value, name]);
  return <input type="number" aria-label={name} {...limits} value={draft}
    onChange={event => { setDraft(event.target.value); if (Number.isFinite(event.target.valueAsNumber)) onChange(event.target.valueAsNumber); }}
    onBlur={() => setDraft(String(value))} />;
}

export default function BaggageEditor({ world, adjustments, onChange, onClose }: Props) {
  const [side, setSide] = useState(0);
  const [both, setBoth] = useState(true);
  const [guides, setGuides] = useState(true);
  const [lines, setLines] = useState(() => world.getBaggageGuides());
  const [message, setMessage] = useState("");
  const beltName = side === 0 ? "Left belt" : "Right belt";

  useEffect(() => {
    const refresh = () => setLines(world.getBaggageGuides());
    const frame = requestAnimationFrame(refresh);
    const observer = new ResizeObserver(refresh);
    const canvas = document.querySelector(".resort-canvas");
    if (canvas) observer.observe(canvas);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [world, adjustments]);

  function change(key: keyof BeltAdjustment, value: number) {
    const { min, max } = BAGGAGE_LIMITS[key];
    if (!Number.isFinite(value)) return;
    const bounded = Math.max(min, Math.min(max, value));
    const delta = bounded - adjustments[side][key];
    onChange(adjustments.map((belt, index) => ({
      ...belt,
      [key]: index === side ? bounded : both ? Math.max(min, Math.min(max, belt[key] + delta)) : belt[key],
    })) as BaggageAdjustments);
    setMessage("");
  }

  function save() {
    try {
      localStorage.setItem(BAGGAGE_STORAGE_KEY, JSON.stringify(adjustments));
      setMessage("Saved for this browser. Reopening the page keeps these settings.");
    } catch {
      setMessage("Browser storage is unavailable. Copy the settings to keep them.");
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ baggageBelts: adjustments }, null, 2));
      setMessage("Settings copied. Paste them into this chat to share the exact placement.");
    } catch {
      setMessage("Copy is unavailable. Select and copy the settings below.");
    }
  }

  const fields: { key: keyof BeltAdjustment; label: string; from: string; to: string; unit: string }[] = [
    { key: "turn", label: "End alignment", from: "Left end closer", to: "Right end closer", unit: "°" },
    { key: "across", label: "Left / right position", from: "Left", to: "Right", unit: "% length" },
    { key: "forward", label: "Distance from you", from: "Farther away", to: "Closer to you", unit: "% depth" },
  ];
  const path = (points: number[][]) => `M ${points[0].join(" ")} L ${points[1].join(" ")}`;

  return <>
    {guides && <svg className="baggage-guides" viewBox={`0 0 ${lines.width} ${lines.height}`} aria-hidden="true">
      <path d={path(lines.hangar)} stroke="#ffb84b" />
      {lines.belts.map((points, index) => <g key={index}>
        <path d={path(points)} stroke="#58f0ce" />
        {points.map(([x,y], end) => <circle key={end} cx={x} cy={y} r="5" fill="#58f0ce" />)}
      </g>)}
    </svg>}
    <aside className="baggage-editor" aria-label="Baggage alignment controls">
      <div className="baggage-editor-title"><h2>Align baggage belts</h2>
        <button className="icon-button" aria-label="Close baggage controls" onClick={onClose}><X size={18} /></button>
      </div>
      <p>0° aligns with the hangar.</p>
      <div className="belt-picker" aria-label="Choose baggage belt">
        {["Left belt", "Right belt"].map((name, index) => <button key={name} aria-pressed={side===index} onClick={() => setSide(index)}>{name}</button>)}
      </div>
      <label className="belt-check"><input type="checkbox" checked={both} onChange={e => setBoth(e.target.checked)} /> Adjust both belts together</label>
      {fields.map(({ key, label, from, to, unit }) => <div className="belt-field" key={key}>
        <div><label htmlFor={`belt-${key}`}>{label}</label>
          <FineNumber value={adjustments[side][key]} name={`${beltName} ${key}`} limits={BAGGAGE_LIMITS[key]} onChange={value => change(key,value)} />
          <small>{unit}</small>
        </div>
        <input id={`belt-${key}`} type="range" aria-label={`${beltName} ${label}`} {...BAGGAGE_LIMITS[key]} value={adjustments[side][key]}
          onChange={e => change(key,e.target.valueAsNumber)} />
        <div className="belt-range-labels"><span>{from}</span><span>{to}</span></div>
      </div>)}
      <label className="belt-check"><input type="checkbox" checked={guides} onChange={e => setGuides(e.target.checked)} /> Show alignment guides</label>
      {guides && <p className="belt-legend"><span>Gold: hangar edge</span><span>Mint: belt edges</span></p>}
      <div className="belt-actions">
        <button onClick={() => { onChange(adjustments.map(belt => ({ ...belt, turn: 0 })) as BaggageAdjustments); setMessage(""); }}>Align to hangar</button>
        <button onClick={save}>Save alignment</button>
        <button onClick={copy}>Copy settings</button>
        <button onClick={() => { onChange(DEFAULT_BAGGAGE_ADJUSTMENTS.map(belt => ({ ...belt })) as BaggageAdjustments); setMessage(""); }}>Reset adjustments</button>
      </div>
      {message && <p role="status" className="belt-message">{message}</p>}
      <details><summary>Exact settings</summary><pre>{JSON.stringify({ baggageBelts: adjustments },null,2)}</pre></details>
    </aside>
  </>;
}
