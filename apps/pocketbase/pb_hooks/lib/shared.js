"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/hooks-entry.ts
var hooks_entry_exports = {};
__export(hooks_entry_exports, {
  ACHIEVEMENT_KINDS: () => ACHIEVEMENT_KINDS,
  CATALOG_CACHE_TTL_DAYS: () => CATALOG_CACHE_TTL_DAYS,
  CATALOG_MAX_RESULTS: () => CATALOG_MAX_RESULTS,
  CATALOG_SOURCES: () => CATALOG_SOURCES,
  CHALLENGE_PERIODS: () => CHALLENGE_PERIODS,
  COVER_CACHE_MAX_BYTES: () => COVER_CACHE_MAX_BYTES,
  COVER_CACHE_MAX_ITEMS: () => COVER_CACHE_MAX_ITEMS,
  DEFAULT_GRACE_HOURS: () => DEFAULT_GRACE_HOURS,
  DEFAULT_TIMEZONE: () => DEFAULT_TIMEZONE,
  GOAL_METRICS: () => GOAL_METRICS,
  GOAL_PERIODS: () => GOAL_PERIODS,
  MILESTONES: () => MILESTONES,
  PERIOD_STATUSES: () => PERIOD_STATUSES,
  POST_KINDS: () => POST_KINDS,
  REACTION_KINDS: () => REACTION_KINDS,
  READ_STATUSES: () => READ_STATUSES,
  RECOMMENDATION_SOURCES: () => RECOMMENDATION_SOURCES,
  ROLES: () => ROLES,
  addDaysISO: () => addDaysISO,
  buildAchievementPayload: () => buildAchievementPayload,
  buildTasteProfile: () => buildTasteProfile,
  canEdit: () => canEdit,
  computePeriodProgress: () => computePeriodProgress,
  computePeriodStatus: () => computePeriodStatus,
  computeProgress: () => computeProgress,
  computeStreak: () => computeStreak,
  countFinishedBooksInPeriod: () => countFinishedBooksInPeriod,
  dayOfWeek: () => dayOfWeek,
  daysRemainingInPeriod: () => daysRemainingInPeriod,
  deriveFeedEvents: () => deriveFeedEvents,
  diffDays: () => diffDays,
  eachDayISO: () => eachDayISO,
  endOfMonthISO: () => endOfMonthISO,
  formatISO: () => formatISO,
  formatInBusinessTimezone: () => formatInBusinessTimezone,
  isBeforeISO: () => isBeforeISO,
  isNewer: () => isNewer,
  isRole: () => isRole,
  isValidISODate: () => isValidISODate,
  isWithinGrace: () => isWithinGrace,
  isWithinInclusive: () => isWithinInclusive,
  maxISO: () => maxISO,
  milestoneByKey: () => milestoneByKey,
  minISO: () => minISO,
  parseISODate: () => parseISODate,
  recommend: () => recommend,
  resolveLWW: () => resolveLWW,
  resolvePeriod: () => resolvePeriod,
  resolveScheduleForPeriod: () => resolveScheduleForPeriod,
  startOfMonthISO: () => startOfMonthISO,
  startOfWeekISO: () => startOfWeekISO,
  sumPagesInPeriod: () => sumPagesInPeriod,
  timezoneOffsetMinutes: () => timezoneOffsetMinutes,
  todayISODate: () => todayISODate,
  utcToBusinessDate: () => utcToBusinessDate,
  zonedWallTimeToUTC: () => zonedWallTimeToUTC
});
module.exports = __toCommonJS(hooks_entry_exports);

// src/constants/index.ts
var ROLES = ["owner", "partner", "viewer"];
var READ_STATUSES = ["quero_ler", "a_ler", "lendo", "lido", "abandonado"];
var GOAL_METRICS = ["paginas", "livros"];
var GOAL_PERIODS = ["dia", "semana", "mes"];
var PERIOD_STATUSES = ["aberto", "batida", "nao_batida", "congelado"];
var CHALLENGE_PERIODS = ["semana", "mes"];
var POST_KINDS = ["livro_concluido", "meta_batida", "avanco", "desafio", "manual"];
var REACTION_KINDS = ["curtir", "aplauso", "forca"];
var CATALOG_SOURCES = ["manual", "open_library", "google_books"];
var RECOMMENDATION_SOURCES = ["interno", "open_library", "google_books"];
var ACHIEVEMENT_KINDS = ["meta_batida", "meta_nao_batida"];
var DEFAULT_TIMEZONE = "America/Sao_Paulo";
var DEFAULT_GRACE_HOURS = 24;
var CATALOG_MAX_RESULTS = 10;
var CATALOG_CACHE_TTL_DAYS = 30;
var COVER_CACHE_MAX_ITEMS = 100;
var COVER_CACHE_MAX_BYTES = 50 * 1024 * 1024;
function isRole(value) {
  return typeof value === "string" && ROLES.includes(value);
}
function canEdit(role) {
  return role === "owner" || role === "partner";
}

// src/domain/dates.ts
var ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
var MS_PER_MIN = 6e4;
var MS_PER_DAY = 864e5;
var TZ_OFFSETS_MIN = {
  UTC: 0,
  "Etc/UTC": 0,
  GMT: 0,
  "America/Sao_Paulo": -180,
  "America/Argentina/Buenos_Aires": -180,
  "America/Bahia": -180,
  "America/Fortaleza": -180,
  "America/Recife": -180,
  "America/Belem": -180,
  "America/Manaus": -240,
  "America/Cuiaba": -240,
  "America/Rio_Branco": -300
};
function timezoneOffsetMinutes(timezone) {
  const known = TZ_OFFSETS_MIN[timezone];
  if (known !== void 0) return known;
  const match = /^UTC([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(timezone);
  if (match) {
    const sign = match[1] === "-" ? -1 : 1;
    const hours = parseInt(match[2], 10);
    const minutes = match[3] ? parseInt(match[3], 10) : 0;
    return sign * (hours * 60 + minutes);
  }
  return 0;
}
function isValidISODate(value) {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) return false;
  const d = /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && formatISO(d) === value;
}
function parseISODate(value) {
  return /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`);
}
function formatISO(date) {
  return date.toISOString().slice(0, 10);
}
function todayISODate(timezone = DEFAULT_TIMEZONE, reference = /* @__PURE__ */ new Date()) {
  const shifted = new Date(reference.getTime() + timezoneOffsetMinutes(timezone) * MS_PER_MIN);
  return formatISO(shifted);
}
function addDaysISO(value, days) {
  const d = parseISODate(value);
  d.setUTCDate(d.getUTCDate() + days);
  return formatISO(d);
}
function diffDays(a, b) {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / MS_PER_DAY);
}
function minISO(a, b) {
  return a <= b ? a : b;
}
function maxISO(a, b) {
  return a >= b ? a : b;
}
function isBeforeISO(a, b) {
  return a < b;
}
function isWithinInclusive(value, start, end) {
  return value >= start && value <= end;
}
function dayOfWeek(value) {
  return parseISODate(value).getUTCDay();
}
function eachDayISO(start, end) {
  const out = [];
  let cur = start;
  while (cur <= end) {
    out.push(cur);
    cur = addDaysISO(cur, 1);
  }
  return out;
}
function startOfWeekISO(value, weekStart) {
  const offset = (dayOfWeek(value) - weekStart + 7) % 7;
  return addDaysISO(value, -offset);
}
function startOfMonthISO(value) {
  return `${value.slice(0, 7)}-01`;
}
function endOfMonthISO(value) {
  const d = parseISODate(value);
  return formatISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
}
function zonedWallTimeToUTC(date, time, timezone = DEFAULT_TIMEZONE) {
  const [y, mo, d] = date.split("-").map((part) => parseInt(part, 10));
  const [h, mi, s] = time.split(":").map((part) => parseInt(part, 10));
  const wallMs = Date.UTC(y, mo - 1, d, h ?? 0, mi ?? 0, s ?? 0);
  return new Date(wallMs - timezoneOffsetMinutes(timezone) * MS_PER_MIN).toISOString();
}
function utcToBusinessDate(instant, timezone = DEFAULT_TIMEZONE) {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  return formatISO(new Date(date.getTime() + timezoneOffsetMinutes(timezone) * MS_PER_MIN));
}
function formatInBusinessTimezone(instant, timezone = DEFAULT_TIMEZONE) {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  const shifted = new Date(date.getTime() + timezoneOffsetMinutes(timezone) * MS_PER_MIN);
  const iso = shifted.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

// src/domain/period.ts
function computeGraceUntil(endDate, graceHours, tz) {
  const base = new Date(zonedWallTimeToUTC(endDate, "23:59:59", tz));
  return new Date(base.getTime() + graceHours * 36e5).toISOString();
}
function resolvePeriod(schedule, reference, tz = DEFAULT_TIMEZONE) {
  const graceHours = schedule.graceHours ?? DEFAULT_GRACE_HOURS;
  let startDate;
  let endDate;
  switch (schedule.period) {
    case "dia":
      startDate = reference;
      endDate = reference;
      break;
    case "semana":
      startDate = startOfWeekISO(reference, schedule.weekStart);
      endDate = addDaysISO(startDate, 6);
      break;
    case "mes":
      startDate = startOfMonthISO(reference);
      endDate = endOfMonthISO(reference);
      break;
  }
  return {
    startDate,
    endDate,
    graceUntil: computeGraceUntil(endDate, graceHours, tz)
  };
}
function resolveScheduleForPeriod(schedule, change, periodStart) {
  if (!change || periodStart < change.effectiveFrom) return schedule;
  return { ...schedule, weekStart: change.newWeekStart };
}
function isWithinGrace(bounds, now = /* @__PURE__ */ new Date()) {
  return now.getTime() <= new Date(bounds.graceUntil).getTime();
}

// src/domain/goal.ts
function sumPagesInPeriod(logs, period) {
  return logs.filter((log) => !log.deletedAt && isWithinInclusive(log.date, period.startDate, period.endDate)).reduce((total, log) => total + Math.max(0, log.pages), 0);
}
function countFinishedBooksInPeriod(books, period) {
  return books.filter(
    (book) => !book.deletedAt && book.status === "lido" && !!book.finishedAt && isWithinInclusive(book.finishedAt, period.startDate, period.endDate)
  ).length;
}
function computePeriodStatus(progress, target, period, now = /* @__PURE__ */ new Date()) {
  if (progress >= target) return "batida";
  if (!isWithinGrace(period, now)) return "nao_batida";
  return "aberto";
}
function daysRemainingInPeriod(period, now = /* @__PURE__ */ new Date(), tz = DEFAULT_TIMEZONE) {
  const today = todayISODate(tz, now);
  if (today > period.endDate) return 0;
  const from = maxISO(today, period.startDate);
  return diffDays(from, period.endDate) + 1;
}
function computePeriodProgress(input) {
  const { metric, target, period, logs = [], books = [], now = /* @__PURE__ */ new Date() } = input;
  const progress = metric === "paginas" ? sumPagesInPeriod(logs, period) : countFinishedBooksInPeriod(books, period);
  return {
    progress,
    remaining: Math.max(0, target - progress),
    daysRemaining: daysRemainingInPeriod(period, now, input.tz ?? DEFAULT_TIMEZONE),
    status: computePeriodStatus(progress, target, period, now)
  };
}

// src/domain/progress.ts
function computeProgress(userBook, logs = []) {
  const maxEndPage = logs.filter((log) => !log.deletedAt && typeof log.endPage === "number").reduce((max, log) => Math.max(max, log.endPage), 0);
  const totalPages = typeof userBook.totalPages === "number" ? userBook.totalPages : null;
  let currentPage = Math.max(userBook.currentPage, maxEndPage);
  if (totalPages !== null) currentPage = Math.min(currentPage, totalPages);
  const remaining = totalPages === null ? null : Math.max(0, totalPages - currentPage);
  const percent = totalPages && totalPages > 0 ? Math.round(currentPage / totalPages * 100) : 0;
  const status = totalPages !== null && currentPage >= totalPages ? "lido" : userBook.status;
  return { currentPage, remaining, percent, status };
}

// src/domain/streak.ts
function computeStreak(periods) {
  const closed = periods.filter((p) => p.status !== "aberto").sort((a, b) => a.endDate < b.endDate ? 1 : a.endDate > b.endDate ? -1 : 0);
  let streak = 0;
  for (const period of closed) {
    if (period.status === "batida") streak += 1;
    else if (period.status === "congelado") continue;
    else break;
  }
  return streak;
}

// src/domain/conflict.ts
function isNewer(a, b) {
  return new Date(a).getTime() > new Date(b).getTime();
}
function resolveLWW(local, remote) {
  const localNewer = isNewer(local.updatedAt, remote.updatedAt);
  return {
    winner: localNewer ? local : remote,
    conflict: local.updatedAt !== remote.updatedAt
  };
}

// src/domain/recommend.ts
function tally(values, weight, acc) {
  for (const value of values ?? []) acc[value] = (acc[value] ?? 0) + weight;
}
function buildTasteProfile(books) {
  const profile = { genres: {}, tags: {}, authors: {} };
  for (const book of books) {
    const weight = (book.favorite ? 2 : 1) + (book.rating ? book.rating / 5 : 0);
    tally(book.genres, weight, profile.genres);
    tally(book.tags, weight, profile.tags);
    tally(book.authors, weight, profile.authors);
  }
  return profile;
}
function recommend(profile, candidates, options = {}) {
  const excluded = new Set(options.excludedExternalIds ?? []);
  const limit = Math.min(options.limit ?? CATALOG_MAX_RESULTS, CATALOG_MAX_RESULTS);
  const scored = [];
  for (const candidate of candidates) {
    if (excluded.has(candidate.externalId)) continue;
    let score = candidate.popularity ?? 0;
    const reasons = [];
    for (const genre of candidate.genres ?? []) {
      const value = profile.genres[genre] ?? 0;
      if (value > 0) {
        score += value;
        reasons.push({ text: `porque voc\xEA gostou de ${genre}`, value });
      }
    }
    for (const author of candidate.authors ?? []) {
      const value = profile.authors[author] ?? 0;
      if (value > 0) {
        score += value * 1.5;
        reasons.push({ text: `porque voc\xEA gostou de ${author}`, value: value * 1.5 });
      }
    }
    if (reasons.length === 0) continue;
    reasons.sort((a, b) => b.value - a.value || a.text.localeCompare(b.text));
    scored.push({
      externalId: candidate.externalId,
      title: candidate.title,
      authors: [...candidate.authors ?? []],
      source: candidate.source,
      score,
      reason: reasons[0].text
    });
  }
  scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return scored.slice(0, limit);
}

// src/domain/feed.ts
function deriveFeedEvents(facts) {
  const seen = /* @__PURE__ */ new Set();
  const events = [];
  for (const fact of facts) {
    if (seen.has(fact.syncId)) continue;
    seen.add(fact.syncId);
    events.push({ ...fact });
  }
  return events.sort((a, b) => a.at < b.at ? 1 : a.at > b.at ? -1 : 0);
}

// src/domain/achievement.ts
function buildAchievementPayload(input) {
  return {
    kind: input.kind,
    metric: input.metric,
    target: input.target,
    progress: input.progress,
    remaining: Math.max(0, input.target - input.progress),
    startDate: input.startDate,
    endDate: input.endDate,
    streak: input.streak,
    books: [...input.books ?? []].sort(),
    pages: input.pages ?? 0
  };
}

// src/domain/milestones.ts
var MILESTONES = [
  { key: "books_1", label: "Primeiro livro", hint: "Termine 1 livro", kind: "books", threshold: 1, icon: "books" },
  { key: "books_5", label: "5 livros", hint: "Termine 5 livros", kind: "books", threshold: 5, icon: "books" },
  { key: "books_10", label: "10 livros", hint: "Termine 10 livros", kind: "books", threshold: 10, icon: "books" },
  { key: "books_25", label: "25 livros", hint: "Termine 25 livros", kind: "books", threshold: 25, icon: "books" },
  { key: "books_50", label: "50 livros", hint: "Termine 50 livros", kind: "books", threshold: 50, icon: "books" },
  { key: "pages_1000", label: "1.000 p\xE1ginas", hint: "Leia 1.000 p\xE1ginas", kind: "pages", threshold: 1e3, icon: "sparkles" },
  { key: "pages_5000", label: "5.000 p\xE1ginas", hint: "Leia 5.000 p\xE1ginas", kind: "pages", threshold: 5e3, icon: "sparkles" },
  { key: "streak_7", label: "7 seguidos", hint: "7 per\xEDodos batidos em sequ\xEAncia", kind: "streak", threshold: 7, icon: "award" },
  { key: "streak_30", label: "30 seguidos", hint: "30 per\xEDodos batidos em sequ\xEAncia", kind: "streak", threshold: 30, icon: "award" },
  { key: "streak_100", label: "100 seguidos", hint: "100 per\xEDodos batidos em sequ\xEAncia", kind: "streak", threshold: 100, icon: "award" }
];
function milestoneByKey(key) {
  return MILESTONES.find((m) => m.key === key);
}
