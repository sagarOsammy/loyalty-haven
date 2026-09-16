"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  Check,
  CircleHelp,
  Globe2,
  Leaf,
  Pause,
  Plane,
  Play,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { registerResortTools } from "../lib/webmcp";
import { flushSync } from "react-dom";
import { publicSnapshot } from "../lib/snapshot";
import {
  constructionFixture,
  EMPTY_SELECTION,
  formatPoints,
  snapshotTotals,
  toggleHotel,
  visibleAircraft,
  visibleHotels,
  type AirlineAlliance,
  type Selection,
} from "../lib/selection";
import type { HavenWorld, WorldEvent, WorldOptions } from "../lib/scene/world";

const alliances: {
  id: AirlineAlliance;
  name: string;
  mark: string;
  label: string;
}[] = [
  {
    id: "star-alliance",
    name: "Star Alliance",
    mark: "✦",
    label: "Five airlines. One extraordinary journey.",
  },
  {
    id: "skyteam",
    name: "SkyTeam",
    mark: "S",
    label: "Your world, beautifully connected.",
  },
  {
    id: "oneworld",
    name: "oneworld",
    mark: "one",
    label: "A world of possibilities awaits.",
  },
];

type PrivateMembership = {
  id: string;
  partner: string;
  program: string;
  alliance: string;
  points: number;
  redeemed: number | null;
  expiry: "Soft" | "Hard" | "NA";
  memberId: string | null;
  balanceStatus: "positive" | "zero";
};

type PrivateResponse = {
  memberships?: PrivateMembership[];
  directoryOnlyHotelAccounts?: PrivateMembership[];
  viewer?: { displayName: string; email: string };
  error?: string;
  message?: string;
  signInPath?: string;
};

export default function Haven() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<HavenWorld | null>(null);
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [motion, setMotion] = useState(true);
  const [quality, setQuality] = useState<WorldOptions["quality"]>("cinematic");
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState("");
  const [panel, setPanel] = useState<
    "ledger" | "settings" | "private" | "about" | null
  >(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [fixture, setFixture] = useState(false);
  const [privateState, setPrivateState] = useState<
    "idle" | "loading" | "ready" | "anonymous" | "forbidden" | "unconfigured" | "error"
  >("idle");
  const [privateData, setPrivateData] = useState<PrivateResponse | null>(null);
  const stateRef = useRef({ selection, motion, quality, fixture });
  const snapshot = useMemo(
    () => (fixture ? constructionFixture(publicSnapshot) : publicSnapshot),
    [fixture],
  );
  const planes = visibleAircraft(publicSnapshot, selection.alliance);
  const floors = visibleHotels(snapshot, selection.hotels);
  const totals = snapshotTotals(publicSnapshot);
  const detail = [
    ...publicSnapshot.airlinePartners,
    ...publicSnapshot.hotelBrands,
  ].find((record) => record.id === detailId);
  const activeAlliance = alliances.find((a) => a.id === selection.alliance);

  useEffect(() => {
    stateRef.current = { selection, motion, quality, fixture };
  }, [selection, motion, quality, fixture]);
  useEffect(() => {
    let cancelled = false;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const preferenceChanged = () => setMotion(!preference.matches);
    queueMicrotask(preferenceChanged);
    preference.addEventListener("change", preferenceChanged);
    const handleEvent = (event: WorldEvent) => {
      if (cancelled) return;
      if (event.type === "ready") {
        setStatus("ready");
        setNotice("");
      }
      if (event.type === "progress")
        setProgress(
          Math.min(
            96,
            Math.round(((event.loaded ?? 0) / (event.total ?? 1)) * 100),
          ),
        );
      if (event.type === "error") {
        setStatus("error");
        setNotice(event.message ?? "The scene needs to reload.");
      }
      if (event.type === "detail" && event.id) {
        const alliance = alliances.find((a) => a.id === event.id);
        if (alliance) {
          setSelection((s) => ({ ...s, alliance: alliance.id }));
        } else {
          setDetailId(event.id);
          setPanel("ledger");
        }
      }
    };
    void Promise.all([import("../lib/scene/world"), document.fonts.ready]).then(
      ([{ HavenWorld }]) => {
        if (cancelled || !canvasRef.current) return;
        const current = stateRef.current;
        try {
          const world = new HavenWorld(
            canvasRef.current,
            current.fixture
              ? constructionFixture(publicSnapshot)
              : publicSnapshot,
            { motion: current.motion, quality: current.quality },
            handleEvent,
          );
          worldRef.current = world;
          world.setSelection(current.selection);
        } catch {
          setStatus("error");
          setNotice(
            "This browser could not start the 3D view. Your point summary remains available below.",
          );
        }
      },
    );
    return () => {
      cancelled = true;
      preference.removeEventListener("change", preferenceChanged);
      worldRef.current?.dispose();
      worldRef.current = null;
    };
  }, []);
  useEffect(() => {
    worldRef.current?.setSelection(selection, snapshot);
  }, [selection, snapshot]);
  useEffect(() => {
    worldRef.current?.setOptions({ motion, quality });
  }, [motion, quality]);
  useEffect(
    () =>
      registerResortTools({
        read: () => ({
          ...stateRef.current,
          snapshotAt: publicSnapshot.snapshotAt,
          totalPoints: snapshotTotals(publicSnapshot).combinedPoints,
          scene: { ...canvasRef.current?.dataset },
        }),
        configure: (input) => {
          flushSync(() => {
            if ("alliance" in input)
              setSelection((s) => ({ ...s, alliance: input.alliance ?? null }));
            if ("accor" in input) {
              setFixture(false);
              setSelection((s) => ({
                ...s,
                hotels: input.accor ? ["accor"] : [],
              }));
            }
            if ("motion" in input) setMotion(input.motion!);
            if ("quality" in input) setQuality(input.quality!);
          });
        },
      }),
    [],
  );

  function chooseAlliance(id: AirlineAlliance) {
    setSelection((current) => ({
      ...current,
      alliance: current.alliance === id ? null : id,
    }));
  }
  function reset() {
    setSelection(EMPTY_SELECTION);
    setFixture(false);
    setDetailId(null);
  }
  function reviewConstruction() {
    setFixture(true);
    setSelection((s) => ({
      ...s,
      hotels: ["accor", "review-terrace-2", "review-terrace-3"],
    }));
    setPanel(null);
  }

  function openPrivatePanel() {
    setPrivateState("idle");
    setPrivateData(null);
    setPanel("private");
  }

  async function loadPrivateDetails() {
    setPrivateState("loading");
    try {
      const response = await fetch("/api/loyalty/private", {
        cache: "no-store",
      });
      const payload = (await response.json()) as PrivateResponse;
      setPrivateData(payload);
      if (response.status === 401) setPrivateState("anonymous");
      else if (response.status === 403) setPrivateState("forbidden");
      else if (response.status === 503) setPrivateState("unconfigured");
      else if (!response.ok) setPrivateState("error");
      else setPrivateState("ready");
    } catch {
      setPrivateData({
        message: "The private details request could not be completed.",
      });
      setPrivateState("error");
    }
  }

  return (
    <main className="haven">
      <div
        className="scene-window"
        aria-label="Interactive seaside loyalty resort"
      >
        <canvas
          ref={canvasRef}
          className="resort-canvas"
          aria-label="3D resort with an airline hangar, a hotel, alliance forum and moving luggage. Use the controls below or select an object to inspect its points."
        />
        <div className="scene-vignette" />
      </div>
      <header className="masthead">
        <Link href="/" className="brand-seal" aria-label="My Loyalty Haven home">
          <Globe2 size={26} strokeWidth={1} />
          <span>
            EST.
            <br />
            2026
          </span>
        </Link>
        <div className="wordmark">
          <p>THE JETSETTER’S RESORT</p>
          <h1>My Loyalty Haven</h1>
        </div>
        <button
          className="portfolio"
          onClick={() => {
            setDetailId(null);
            setPanel("ledger");
          }}
        >
          <span>YOUR WORLD OF POSSIBILITIES</span>
          <strong>
            {formatPoints(totals.combinedPoints)}
            <small> pts</small>
          </strong>
          <ArrowUpRight size={17} />
        </button>
      </header>

      <div className="weather-note">
        <span className="sun-icon" /> <span>Golden hour at the Haven</span>
      </div>
      <div className="scene-tools" aria-label="Scene controls">
        <button
          className="icon-button"
          aria-label={motion ? "Pause all animation" : "Play animation"}
          aria-pressed={!motion}
          onClick={() => setMotion((v) => !v)}
        >
          {motion ? <Pause size={17} /> : <Play size={17} />}
        </button>
        <button
          className="icon-button"
          aria-label="Replay arrivals and hotel construction"
          onClick={() => worldRef.current?.replay()}
          disabled={!selection.alliance && !selection.hotels.length}
        >
          <RotateCcw size={17} />
        </button>
        <button
          className="icon-button"
          aria-label="Scene settings"
          onClick={() => setPanel("settings")}
        >
          <SlidersHorizontal size={17} />
        </button>
      </div>

      {status === "loading" && (
        <div className="arrival-loader" role="status">
          <span className="loader-ring">
            <Plane size={23} />
          </span>
          <p>Preparing your arrival</p>
          <small>Opening the resort · {progress}%</small>
          <div className="load-track">
            <i style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      {notice && (
        <div className="scene-notice" role="status">
          <p>{notice}</p>
          <button onClick={() => window.location.reload()}>Reload scene</button>
        </div>
      )}
      {fixture && (
        <div className="fixture-banner">
          <span>Construction review · two sample terraces added</span>
          <button
            onClick={() => {
              setFixture(false);
              setSelection((s) => ({ ...s, hotels: ["accor"] }));
            }}
          >
            Return to saved balances <X size={13} />
          </button>
        </div>
      )}

      <section
        className="resort-controls"
        aria-label="Build your loyalty resort"
      >
        <div className="control-group airlines-control">
          <div className="section-label">
            <Plane size={15} />
            <span>CHOOSE YOUR ALLIANCE</span>
            <span className="section-index">01</span>
          </div>
          <div className="alliance-options">
            {alliances.map((alliance) => (
              <button
                key={alliance.id}
                className={`alliance-option ${selection.alliance === alliance.id ? "selected" : ""}`}
                aria-pressed={selection.alliance === alliance.id}
                onClick={() => chooseAlliance(alliance.id)}
                aria-label={`${alliance.name} arrivals`}
              >
                <span className={`alliance-symbol ${alliance.id}`}>
                  {alliance.mark === "✦" ? (
                    <svg
                      viewBox="0 0 30 30"
                      width="24"
                      height="24"
                      aria-hidden="true"
                    >
                      <path
                        d="m15 2 4 9 10 1-8 7 2 10-8-5-9 5 2-10-7-7 10-1Z"
                        fill="currentColor"
                      />
                    </svg>
                  ) : (
                    alliance.mark
                  )}
                </span>
                <span>{alliance.name}</span>
                {selection.alliance === alliance.id ? (
                  <Check size={14} />
                ) : (
                  <span className="select-dot" />
                )}
              </button>
            ))}
          </div>
          <p className="control-caption">
            {activeAlliance
              ? `${planes.length} arrivals · ${formatPoints(publicSnapshot.alliances.find((a) => a.id === activeAlliance.id)!.totalPoints)} points`
              : "Choose an alliance to bring your airlines into the Haven."}
          </p>
        </div>
        <div className="resort-divider" />
        <div className="control-group hotels-control">
          <div className="section-label">
            <Building2 size={15} />
            <span>BUILD YOUR HIDEAWAY</span>
            <span className="section-index">02</span>
          </div>
          <button
            className={`hotel-option ${selection.hotels.includes("accor") ? "selected" : ""}`}
            aria-pressed={selection.hotels.includes("accor")}
            onClick={() =>
              setSelection((s) => toggleHotel(s, "accor", snapshot))
            }
          >
            <span className="accor-mark">
              ALL<span>ACCOR</span>
            </span>
            <span>
              <strong>Accor Live Limitless</strong>
              <small>
                {formatPoints(publicSnapshot.hotelBrands[0].points)} points to
                escape with
              </small>
            </span>
            <span className="hotel-check">
              {selection.hotels.includes("accor") ? (
                <Check size={16} />
              ) : (
                <span>+</span>
              )}
            </span>
          </button>
          <p className="control-caption">
            {floors.length
              ? `${floors.length} ${floors.length === 1 ? "terrace" : "terraces"} in your hideaway`
              : "Your hotel points become a place to unwind."}
          </p>
        </div>
        <button
          className="ledger-button"
          onClick={() => {
            setDetailId(null);
            setPanel("ledger");
          }}
        >
          <span>
            Your
            <br />
            passport
            <br />
            to more.
          </span>
          <ArrowUpRight size={24} strokeWidth={1.3} />
        </button>
      </section>

      <footer className="site-footer">
        <span>
          <Leaf size={13} /> A little closer to somewhere wonderful.
        </span>
        <div>
          <span>Saved balances · 10 Sep 2026</span>
          <button onClick={reset}>Reset resort</button>
          <button
            onClick={() => setPanel("about")}
            aria-label="About this preview"
          >
            <CircleHelp size={15} />
          </button>
        </div>
      </footer>

      <Dialog
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
      >
        <DialogContent
          className={`haven-dialog ${panel === "ledger" ? "ledger-dialog" : ""} ${panel === "private" ? "private-dialog" : ""}`}
          showCloseButton={false}
        >
          <div className="dialog-top">
            <p className="eyebrow">MY LOYALTY HAVEN</p>
            <button
              className="icon-button"
              aria-label="Close panel"
              onClick={() => setPanel(null)}
            >
              <X size={21} />
            </button>
          </div>
          {panel === "ledger" && (
            <>
              <DialogTitle>
                {detail ? "A closer look" : "Your next chapter awaits."}
              </DialogTitle>
              <DialogDescription className="dialog-intro">
                Saved balances from your Notion ledger, 10 September 2026. Every
                point keeps its original program.
              </DialogDescription>
              {detail ? (
                <div className="detail-card">
                  <p>{"partner" in detail ? detail.partner : detail.brand}</p>
                  <strong>
                    {formatPoints(detail.points)} <span>points</span>
                  </strong>
                  <p>{detail.program}</p>
                  <div>
                    Redeemed{" "}
                    <b>
                      {detail.redeemed === null
                        ? "Not recorded"
                        : formatPoints(detail.redeemed)}
                    </b>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setDetailId(null)}
                  >
                    View all programs <ArrowUpRight size={15} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="ledger-totals">
                    <div>
                      <span>Airline miles</span>
                      <strong>{formatPoints(totals.airlinePoints)}</strong>
                    </div>
                    <div>
                      <span>Hotel points</span>
                      <strong>{formatPoints(totals.hotelPoints)}</strong>
                    </div>
                    <div>
                      <span>Redeemed</span>
                      <strong>{formatPoints(totals.redeemedPoints)}</strong>
                    </div>
                  </div>
                  <div className="ledger-list">
                    {publicSnapshot.alliances.map((alliance) => (
                      <section key={alliance.id}>
                        <h3>
                          {alliance.name}
                          <span>{formatPoints(alliance.totalPoints)} pts</span>
                        </h3>
                        {[
                          ...publicSnapshot.airlinePartners,
                          ...publicSnapshot.hotelBrands,
                        ]
                          .filter((p) => p.allianceId === alliance.id)
                          .map((partner) => (
                            <button
                              key={partner.id}
                              onClick={() => setDetailId(partner.id)}
                            >
                              <span>
                                {"partner" in partner
                                  ? partner.partner
                                  : partner.brand}
                                <small>{partner.program}</small>
                              </span>
                              <strong>{formatPoints(partner.points)}</strong>
                              <ArrowUpRight size={14} />
                            </button>
                          ))}
                      </section>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
          {panel === "settings" && (
            <>
              <DialogTitle>Make yourself comfortable.</DialogTitle>
              <DialogDescription className="dialog-intro">
                Set the pace and detail of your resort.
              </DialogDescription>
              <div className="setting-row">
                <span>
                  Resort animation
                  <small>Aircraft, terraces, water and luggage</small>
                </span>
                <button
                  className="pill-toggle"
                  aria-pressed={motion}
                  onClick={() => setMotion((value) => !value)}
                >
                  {motion ? "Playing" : "Paused"}
                  {motion ? <Pause size={14} /> : <Play size={14} />}
                </button>
              </div>
              <div className="setting-row">
                <label htmlFor="quality">
                  Visual detail<small>Balanced uses less graphics power</small>
                </label>
                <Select
                  value={quality}
                  onValueChange={(value) =>
                    setQuality(value as WorldOptions["quality"])
                  }
                >
                  <SelectTrigger id="quality" className="quality-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="quality-options">
                    <SelectItem value="cinematic">Cinematic</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <button className="review-button" onClick={reviewConstruction}>
                Preview three terrace construction <ArrowUpRight size={16} />
              </button>
              <p className="setting-note">
                Adds two clearly marked sample terraces for this design review.
                Your saved balance stays unchanged.
              </p>
              <button
                className="review-button private-review-button"
                onClick={openPrivatePanel}
              >
                Open private account details <ArrowUpRight size={16} />
              </button>
              <p className="setting-note">
                Membership IDs and expiry notes require owner-authorized ChatGPT
                sign-in.
              </p>
            </>
          )}
          {panel === "private" && (
            <>
              <DialogTitle>Private account details.</DialogTitle>
              <DialogDescription className="dialog-intro">
                Membership IDs and expiry notes are kept outside the public
                resort scene and returned only to the authorized owner.
              </DialogDescription>
              {privateState === "idle" && (
                <div className="private-actions">
                  {/* SIWC must be a top-level navigation, not a client-side route. */}
                  <a
                    className="auth-button primary-auth"
                    href="/signin-with-chatgpt?return_to=%2F"
                    target="_top"
                  >
                    Sign in with ChatGPT
                  </a>
                  <button
                    className="auth-button details-auth"
                    onClick={loadPrivateDetails}
                  >
                    Load private details
                  </button>
                </div>
              )}
              {privateState === "loading" && (
                <p className="private-status" role="status">
                  Checking owner access…
                </p>
              )}
              {privateState !== "idle" &&
                privateState !== "loading" &&
                privateState !== "ready" && (
                  <div className="private-status status-warning" role="status">
                    <p>
                      {privateData?.message ??
                        "The private account details could not be loaded."}
                    </p>
                    {privateState === "anonymous" && (
                      // SIWC must be a top-level navigation, not a client-side route.
                      <a
                        className="text-button"
                        href={
                          privateData?.signInPath ??
                          "/signin-with-chatgpt?return_to=%2F"
                        }
                        target="_top"
                      >
                        Sign in with ChatGPT <ArrowUpRight size={15} />
                      </a>
                    )}
                  </div>
                )}
              {privateState === "ready" && privateData?.viewer && (
                <div className="private-ready">
                  <div className="private-viewer">
                    <span className="source-pip" />
                    <strong>{privateData.viewer.displayName}</strong>
                    <small>{privateData.viewer.email}</small>
                  </div>
                  <div className="private-account-list">
                    {privateData.memberships?.map((membership) => (
                      <div className="private-account-row" key={membership.id}>
                        <span>
                          <strong>{membership.partner}</strong>
                          <small>
                            {membership.program} · {membership.alliance}
                          </small>
                        </span>
                        <span>
                          <strong>{membership.memberId ?? "No ID recorded"}</strong>
                          <small>Expiry {membership.expiry}</small>
                        </span>
                      </div>
                    ))}
                  </div>
                  {!!privateData.directoryOnlyHotelAccounts?.length && (
                    <p className="private-footnote">
                      {privateData.directoryOnlyHotelAccounts.length} directory-only
                      hotel accounts are retained privately for future refreshes.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
          {panel === "about" && (
            <>
              <DialogTitle>Welcome to your Haven.</DialogTitle>
              <DialogDescription className="dialog-intro">
                Explore Star Alliance, SkyTeam and oneworld arrivals alongside
                your Accor terrace. Each alliance brings in up to three airlines,
                ranked by your saved points.
              </DialogDescription>
              <ol className="about-steps">
                <li>Select an aircraft or a suitcase to see its program.</li>
                <li>Replay the arrival and construction from the top right.</li>
                <li>Pause the world whenever you prefer a still view.</li>
              </ol>
              <p className="setting-note">
                Balances are a saved snapshot, refreshed 10 September 2026.
                Membership details are available only to the owner after
                ChatGPT sign-in.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
