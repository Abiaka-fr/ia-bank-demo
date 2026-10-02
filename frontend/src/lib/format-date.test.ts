import { expect, it } from "vitest";

import { formatDateDDMMYYYY, formatLocalDate, formatLocalDateTime } from "./format-date";

const pad = (value: number) => String(value).padStart(2, "0");

it("lit un horodatage sans fuseau comme de l'UTC et l'affiche en heure locale", () => {
  // Attendu calculé avec le fuseau de la machine : le test passe partout.
  const local = new Date("2026-09-30T23:30:00Z");
  const expected =
    `${pad(local.getDate())}/${pad(local.getMonth() + 1)}/${local.getFullYear()} ` +
    `${pad(local.getHours())}:${pad(local.getMinutes())}`;

  expect(formatLocalDateTime("2026-09-30T23:30:00.450364")).toBe(expected);
  expect(formatLocalDateTime("2026-09-30T23:30:00Z")).toBe(expected);
  expect(formatLocalDate("2026-09-30T23:30:00")).toBe(expected.slice(0, 10));
});

it("ne décale jamais une date de calendrier", () => {
  expect(formatLocalDateTime("2024-05-20")).toBe("20/05/2024");
  expect(formatDateDDMMYYYY("2024-05-20T00:00:00")).toBe("20/05/2024");
  expect(formatLocalDateTime("pas une date")).toBeUndefined();
  expect(formatLocalDateTime(undefined)).toBeUndefined();
});
