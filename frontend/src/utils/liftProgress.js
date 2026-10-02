import {
  parseCardioLine,
  parseExerciseLine,
  stripGymOrLocationTagsFromLine,
} from "./workoutParser.js";

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const formatMinutes = (minutes) => {
  if (!minutes) return "";
  const whole = Math.round(minutes);
  if (whole >= 60 && whole % 60 === 0) return `${whole / 60} hr`;
  if (whole > 60) {
    const hours = Math.floor(whole / 60);
    const mins = whole % 60;
    return mins ? `${hours} hr ${mins} min` : `${hours} hr`;
  }
  return `${Number.isInteger(minutes) ? minutes : Math.round(minutes * 10) / 10} min`;
};

const trimNum = (value) => {
  const number = Number(value);
  return Number.isInteger(number) ? String(number) : String(Math.round(number * 10) / 10);
};

const blankSession = (date) => ({
  date,
  weight: 0,
  reps: 0,
  repsText: "",
  minutes: null,
  incline: null,
  level: null,
});

const repLabel = (session) =>
  session.repsText || (session.reps > 0 ? `${session.reps} reps` : "");

const cardioLabel = (session) =>
  [
    formatMinutes(session.minutes),
    session.incline != null ? `${trimNum(session.incline)} incline` : "",
    session.level != null ? `lvl ${trimNum(session.level)}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

const improved = (previous, next) => {
  if (!previous || !next) return false;
  if (next.weight > previous.weight && next.weight > 0) return true;
  if (
    next.weight > 0 &&
    next.weight === previous.weight &&
    next.reps > previous.reps
  ) {
    return true;
  }
  if (next.weight > 0 || previous.weight > 0) return false;
  if ((next.minutes || 0) > (previous.minutes || 0)) return true;
  if ((next.level || 0) > (previous.level || 0)) return true;
  if ((next.incline || 0) > (previous.incline || 0)) return true;
  if (next.reps > previous.reps) return true;
  return false;
};

const describePair = (previous, next) => {
  if (next.weight > previous.weight && next.weight > 0) {
    return [`${trimNum(previous.weight)} lbs`, `${trimNum(next.weight)} lbs`];
  }
  if (
    next.weight > 0 &&
    next.weight === previous.weight &&
    next.reps > previous.reps
  ) {
    return [repLabel(previous), repLabel(next)];
  }
  if (next.weight > 0 || previous.weight > 0) return ["", ""];
  if (
    (next.minutes || 0) > (previous.minutes || 0) ||
    (next.level || 0) > (previous.level || 0) ||
    (next.incline || 0) > (previous.incline || 0)
  ) {
    return [cardioLabel(previous), cardioLabel(next)];
  }
  if (next.reps > previous.reps) return [repLabel(previous), repLabel(next)];
  return ["", ""];
};

const buildExerciseSessions = (exercises, loggedEntries) => {
  const byName = new Map();

  const touch = (rawName, date) => {
    const name = stripGymOrLocationTagsFromLine(rawName) || rawName;
    if (!byName.has(name)) byName.set(name, new Map());
    const days = byName.get(name);
    const key = startOfDay(date).getTime();
    if (!days.has(key)) days.set(key, blankSession(date));
    return days.get(key);
  };

  Object.entries(exercises || {}).forEach(([rawName, stats]) => {
    (stats.history || []).forEach((point) => {
      const date = new Date(point.date);
      if (Number.isNaN(date.getTime())) return;
      const session = touch(rawName, date);
      const weight = Number(point.weight) || 0;
      const reps = Number(point.reps) || 0;
      session.weight = Math.max(session.weight, weight);
      session.reps = Math.max(session.reps, reps);
      if (weight === 0 && reps > 0 && !session.repsText) {
        session.repsText = `${reps} reps`;
      }
    });
  });

  (loggedEntries || []).forEach((entry) => {
    const date = new Date(entry.createdAt || entry.date);
    if (Number.isNaN(date.getTime()) || !entry.description) return;
    entry.description.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const exercise = parseExerciseLine(trimmed);
      if (exercise) {
        const reps = exercise.sets
          .map((set) => set.reps)
          .filter((value) => value > 0);
        const session = touch(exercise.name, date);
        if (exercise.maxWeight > 0) {
          session.weight = Math.max(session.weight, exercise.maxWeight);
        }
        if (reps.length > 0) {
          session.reps = Math.max(
            session.reps,
            reps.reduce((sum, value) => sum + value, 0),
          );
          session.repsText = `${reps.join(", ")} reps`;
        }
        return;
      }
      const cardio = parseCardioLine(trimmed);
      if (!cardio) return;
      const session = touch(cardio.name, date);
      if (cardio.minutes) {
        session.minutes = Math.max(session.minutes || 0, cardio.minutes);
      }
      if (cardio.incline != null) session.incline = cardio.incline;
      if (cardio.level != null) session.level = cardio.level;
    });
  });

  return [...byName.entries()].map(([name, days]) => ({
    name,
    sessions: [...days.values()].sort((a, b) => a.date - b.date),
  }));
};

const gainInBucket = (name, sessions, bucket) => {
  const before = [...sessions].reverse().find((session) => session.date < bucket.start);
  const inside = sessions.filter(
    (session) => session.date >= bucket.start && session.date < bucket.end,
  );
  if (inside.length === 0) return null;
  const start = before || inside[0];
  const candidates = before ? inside : inside.slice(1);
  let peak = start;
  candidates.forEach((session) => {
    if (improved(peak, session)) peak = session;
  });
  if (peak === start || !improved(start, peak)) return null;
  const [from, to] = describePair(start, peak);
  if (!from || !to || from === to) return null;
  return { name, from, to };
};

export const gainsForBuckets = (exercises, loggedEntries, buckets) => {
  const series = buildExerciseSessions(exercises, loggedEntries);
  return buckets.map((bucket) =>
    series
      .map(({ name, sessions }) => gainInBucket(name, sessions, bucket))
      .filter(Boolean),
  );
};
