import type { SpotlightRole } from "@/lib/config";
import { patchPlayerProfileMark } from "@/lib/playerProfileMarks";
import { removeSpotlightByRoleAndNormalized, upsertSpotlightEntry } from "@/lib/spotlightDb";

/**
 * Строки «Отслеживание» (SpotlightEntry) синхронизируются с метками профиля:
 * стример → role `streamer`, про игрок → role `esports`.
 */
export async function syncSpotlightFromProfileMarks(
  normalizedKey: string,
  displayValue: string,
  flags: { isStreamer: boolean; isPro: boolean },
): Promise<void> {
  const display = displayValue.trim() || normalizedKey;

  if (flags.isStreamer) {
    await upsertSpotlightEntry("streamer", display);
  } else {
    await removeSpotlightByRoleAndNormalized("streamer", normalizedKey);
  }

  if (flags.isPro) {
    await upsertSpotlightEntry("esports", display);
  } else {
    await removeSpotlightByRoleAndNormalized("esports", normalizedKey);
  }
}

/** После ручного добавления в /spotlight — поднять флаги в профиле (по тому же ключу ника/account). */
export async function applySpotlightRowToProfile(role: SpotlightRole, rawValue: string): Promise<void> {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return;
  }

  if (role === "streamer") {
    await patchPlayerProfileMark(trimmed, { isStreamer: true });
  } else {
    await patchPlayerProfileMark(trimmed, { isPro: true });
  }
}

/** После удаления строки отслеживания — снять соответствующую метку профиля. */
export async function clearProfileForDeletedSpotlight(role: SpotlightRole, normalized: string): Promise<void> {
  if (role === "streamer") {
    await patchPlayerProfileMark(normalized, { isStreamer: false });
  } else {
    await patchPlayerProfileMark(normalized, { isPro: false });
  }
}
