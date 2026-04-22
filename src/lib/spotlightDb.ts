import type { SpotlightAccount, SpotlightRole } from "@/lib/config";
import { prisma } from "@/lib/prisma";

export type SpotlightRow = {
  id: string;
  role: SpotlightRole;
  value: string;
};

function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
}

export async function loadSpotlightAccounts(): Promise<SpotlightAccount[]> {
  const rows = await prisma.spotlightEntry.findMany({
    orderBy: [{ role: "asc" }, { value: "asc" }],
  });

  return rows.map((row) => ({
    key: row.normalized,
    label: row.value,
    role: row.role as SpotlightRole,
  }));
}

export async function listSpotlightRows(): Promise<SpotlightRow[]> {
  const rows = await prisma.spotlightEntry.findMany({
    orderBy: [{ role: "asc" }, { value: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    role: r.role as SpotlightRole,
    value: r.value,
  }));
}

export async function createSpotlightEntry(role: SpotlightRole, value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Пустое значение");
  }

  const normalized = normalizeValue(trimmed);

  return prisma.spotlightEntry.create({
    data: {
      role,
      value: trimmed,
      normalized,
    },
  });
}

export async function deleteSpotlightEntry(id: string) {
  await prisma.spotlightEntry.delete({
    where: { id },
  });
}

export async function getSpotlightEntryById(id: string) {
  return prisma.spotlightEntry.findUnique({
    where: { id },
  });
}

export async function upsertSpotlightEntry(role: SpotlightRole, value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Пустое значение");
  }

  const normalized = normalizeValue(trimmed);

  return prisma.spotlightEntry.upsert({
    where: {
      role_normalized: {
        role,
        normalized,
      },
    },
    create: {
      role,
      value: trimmed,
      normalized,
    },
    update: {
      value: trimmed,
    },
  });
}

export async function removeSpotlightByRoleAndNormalized(role: SpotlightRole, normalized: string) {
  await prisma.spotlightEntry.deleteMany({
    where: { role, normalized },
  });
}
