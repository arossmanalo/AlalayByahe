import type { FareQuote, Mode, WalkLink } from "../contracts/index";
import { currentRideQuote, quoteRideFare, type FareBook, type Passenger } from "./fares";
import type { DirectionRoute, Graph } from "./graph";

/**
 * Directed multimodal label-setting search (ROUTE-003, onboard seeding for ROUTE-005).
 *
 * State is "on foot at a place" or "riding direction D at position P". Moves:
 *   walk   : follow a documented, directed WalkLink (never aerial proximity);
 *   board  : only where stop AND route-stop allow boarding, in a documented direction;
 *   ride   : advance to the next stop of the SAME direction (increasing sequence only);
 *   alight : only where stop AND route-stop allow alighting.
 * There is no transfer-count cap. Dominated labels are pruned (Pareto over rides, walking,
 * open walking segment and fare bounds); a label budget guards computation and ends in an
 * explicit "limit reached" outcome, never a "no route" claim.
 */

export interface Constraints {
  modes: ReadonlySet<Mode>;
  directOnly: boolean;
  budgetCentavos: number | null;
  maxAccessWalkMeters: number;
  maxTransferWalkMeters: number;
  maxEgressWalkMeters: number;
}

export interface SearchInput {
  destinationPlaceId: string;
  /** Pre-trip start. Ignored when `onboard` is set. */
  originPlaceId: string;
  onboard?: { route: DirectionRoute; startIndex: number };
  passenger: Passenger;
}

export type Step =
  | { t: "walk"; link: WalkLink }
  | { t: "board" }
  | { t: "advance" }
  | { t: "ride"; route: DirectionRoute; boardIndex: number; alightIndex: number; alreadyOnboard: boolean; quote: FareQuote };

export interface Label {
  id: number;
  /** Place ID when on foot, otherwise null. */
  place: string | null;
  route: DirectionRoute | null;
  pos: number;
  boardIndex: number;
  onboardStart: boolean;
  rides: number;
  access: number;
  walk: number;
  seg: number;
  fareMin: number;
  fareMax: number;
  unknown: number;
  prev: Label | null;
  step: Step | null;
  dead: boolean;
}

export type SearchOutcome = { kind: "done"; goals: Label[] } | { kind: "limit" };

/* ---------------- priority queue ---------------- */

function orderKey(l: Label): number[] {
  // Every component is non-decreasing along any edge, so a label is never popped
  // before a label that could dominate it.
  return [l.rides, l.walk, l.fareMin, l.unknown, l.access, l.fareMax, l.seg, l.id];
}

function before(a: Label, b: Label): boolean {
  const ka = orderKey(a);
  const kb = orderKey(b);
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] !== kb[i]) return (ka[i] as number) < (kb[i] as number);
  }
  return false;
}

class Heap {
  private items: Label[] = [];
  get size(): number { return this.items.length; }
  push(l: Label): void {
    const a = this.items;
    a.push(l);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!before(a[i] as Label, a[p] as Label)) break;
      [a[i], a[p]] = [a[p] as Label, a[i] as Label];
      i = p;
    }
  }
  pop(): Label | undefined {
    const a = this.items;
    if (a.length === 0) return undefined;
    const top = a[0] as Label;
    const last = a.pop() as Label;
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && before(a[l] as Label, a[m] as Label)) m = l;
        if (r < a.length && before(a[r] as Label, a[m] as Label)) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m] as Label, a[i] as Label];
        i = m;
      }
    }
    return top;
  }
}

/* ---------------- dominance ---------------- */

function dominatesOrEquals(a: Label, b: Label): boolean {
  return (
    a.rides <= b.rides && a.access <= b.access && a.walk <= b.walk && a.seg <= b.seg &&
    a.fareMin <= b.fareMin && a.fareMax <= b.fareMax && a.unknown <= b.unknown
  );
}

function sameCost(a: Label, b: Label): boolean {
  return dominatesOrEquals(a, b) && dominatesOrEquals(b, a);
}

/**
 * Labels with identical cost are kept side by side (up to this many per state) so that
 * equally good alternative services can all be offered. Strictly worse labels are still
 * pruned, which keeps the search finite.
 */
const TIE_CAP = 3;

/* ---------------- search ---------------- */

export function search(
  graph: Graph, fares: FareBook, input: SearchInput, c: Constraints, nowMs: number, labelLimit: number,
): SearchOutcome {
  const states = new Map<string, Label[]>();
  const heap = new Heap();
  const goals: Label[] = [];
  let created = 0;
  let overLimit = false;

  const transferOrEgress = Math.max(c.maxTransferWalkMeters, c.maxEgressWalkMeters);
  const quoteMemo = new Map<string, FareQuote>();

  const stateKey = (l: Label): string =>
    l.place !== null
      ? `f|${l.place}|${l.rides > 0 ? 1 : 0}`
      : `o|${(l.route as DirectionRoute).direction.id}|${l.pos}|${l.boardIndex}|${l.onboardStart ? 1 : 0}`;

  const make = (base: Omit<Label, "id" | "dead">): Label | null => {
    if (c.budgetCentavos !== null && base.fareMin > c.budgetCentavos) return null;
    if (created >= labelLimit) {
      overLimit = true;
      return null;
    }
    return { ...base, id: ++created, dead: false };
  };

  const admit = (l: Label): void => {
    const key = stateKey(l);
    const live = states.get(key) ?? [];
    let ties = 0;
    for (const e of live) {
      if (sameCost(e, l)) ties++;
      else if (dominatesOrEquals(e, l)) return;
    }
    if (ties >= TIE_CAP) return;
    const kept = live.filter((e) => {
      const gone = !sameCost(e, l) && dominatesOrEquals(l, e);
      if (gone) e.dead = true;
      return !gone;
    });
    kept.push(l);
    states.set(key, kept);
    heap.push(l);
  };

  /** A journey that reaches the destination on foot must still satisfy every strict preference. */
  const acceptGoal = (l: Label): boolean => {
    if (l.rides < 1) return false;
    if (l.seg > c.maxEgressWalkMeters) return false;
    if (c.directOnly && l.rides > 1) return false;
    if (c.budgetCentavos !== null && (l.unknown > 0 || l.fareMax > c.budgetCentavos)) return false;
    return true;
  };

  const root = (): Label | null => {
    if (input.onboard) {
      const { route, startIndex } = input.onboard;
      return make({
        place: null, route, pos: startIndex, boardIndex: startIndex, onboardStart: true,
        rides: 1, access: 0, walk: 0, seg: 0, fareMin: 0, fareMax: 0, unknown: 0, prev: null, step: null,
      });
    }
    return make({
      place: input.originPlaceId, route: null, pos: 0, boardIndex: 0, onboardStart: false,
      rides: 0, access: 0, walk: 0, seg: 0, fareMin: 0, fareMax: 0, unknown: 0, prev: null, step: null,
    });
  };

  const seed = root();
  if (!seed) return { kind: "limit" };
  admit(seed);

  const quote = (route: DirectionRoute, boardIndex: number, alightIndex: number, onboardStart: boolean): FareQuote => {
    // The ride already in progress: payment status is not known, so the fare is unknown, never zero.
    if (onboardStart) return currentRideQuote();
    const key = `${route.direction.id}|${boardIndex}|${alightIndex}`;
    const memo = quoteMemo.get(key);
    if (memo) return memo;
    const board = route.points[boardIndex];
    const alight = route.points[alightIndex];
    if (!board || !alight) return currentRideQuote();
    const q = quoteRideFare(fares, {
      serviceId: route.service.id, directionId: route.direction.id,
      boardStopId: board.stop.id, alightStopId: alight.stop.id,
      boardIndex, alightIndex, directionStopIds: route.points.map((p) => p.stop.id),
      passenger: input.passenger, nowMs,
    });
    quoteMemo.set(key, q);
    return q;
  };

  while (heap.size > 0) {
    const cur = heap.pop() as Label;
    if (cur.dead) continue;
    if (overLimit) return { kind: "limit" };

    if (cur.place !== null) {
      // On foot.
      if (cur.place === input.destinationPlaceId && cur.rides > 0) {
        goals.push(cur);
        continue;
      }
      const walkLimit = cur.rides === 0 ? c.maxAccessWalkMeters : transferOrEgress;
      for (const link of graph.walksFrom.get(cur.place) ?? []) {
        const seg = cur.seg + link.meters;
        if (seg > walkLimit) continue;
        const next = make({
          ...cur, place: link.toPlaceId, seg, walk: cur.walk + link.meters,
          access: cur.rides === 0 ? seg : cur.access,
          prev: cur, step: { t: "walk", link },
        });
        if (next && (next.place !== input.destinationPlaceId || next.rides === 0 || acceptGoal(next))) admit(next);
      }
      if (c.directOnly && cur.rides >= 1) continue;
      if (cur.rides > 0 && cur.seg > c.maxTransferWalkMeters) continue;
      for (const b of graph.boardingsByPlace.get(cur.place) ?? []) {
        if (!c.modes.has(b.route.service.mode)) continue;
        const next = make({
          place: null, route: b.route, pos: b.index, boardIndex: b.index, onboardStart: false,
          rides: cur.rides + 1, access: cur.rides === 0 ? cur.seg : cur.access, walk: cur.walk, seg: 0,
          fareMin: cur.fareMin, fareMax: cur.fareMax, unknown: cur.unknown,
          prev: cur, step: { t: "board" },
        });
        if (next) admit(next);
      }
      continue;
    }

    // Riding.
    const route = cur.route as DirectionRoute;
    const point = route.points[cur.pos];
    if (point && point.canAlight && (cur.pos > cur.boardIndex || (cur.onboardStart && cur.pos === cur.boardIndex))) {
      const q = quote(route, cur.boardIndex, cur.pos, cur.onboardStart);
      const known = q.status !== "unknown" && q.minCentavos !== null && q.maxCentavos !== null;
      const next = make({
        place: point.stop.placeId, route: null, pos: 0, boardIndex: 0, onboardStart: false,
        rides: cur.rides, access: cur.access, walk: cur.walk, seg: 0,
        fareMin: cur.fareMin + (known ? (q.minCentavos as number) : 0),
        fareMax: cur.fareMax + (known ? (q.maxCentavos as number) : 0),
        unknown: cur.unknown + (known ? 0 : 1),
        prev: cur,
        step: { t: "ride", route, boardIndex: cur.boardIndex, alightIndex: cur.pos, alreadyOnboard: cur.onboardStart, quote: q },
      });
      if (next && (next.place !== input.destinationPlaceId || acceptGoal(next))) admit(next);
    }
    if (cur.pos + 1 < route.points.length) {
      const next = make({ ...cur, pos: cur.pos + 1, prev: cur, step: { t: "advance" } });
      if (next) admit(next);
    }
  }

  return overLimit ? { kind: "limit" } : { kind: "done", goals };
}
