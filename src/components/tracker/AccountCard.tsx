import { useState } from 'react';
import type { Account, AccountUpgrade, BoostKind, UpgradeGroup } from '../../lib/types.ts';
import {
  BOOST_SPECS,
  UPGRADE_GROUPS,
  getBoostKindForGroup,
  getRemainingWorkMs,
} from '../../lib/boosts.ts';
import { formatCountdown, formatDurationMs, formatRelativeTime } from '../../lib/format.ts';
import { getCategoryLabel, getGameName, getNextLevel } from '../../lib/gameData.ts';
import {
  panelBorderlessClass,
  panelHeadClass,
  panelSubtitleClass,
  thBadgeClass,
} from '../../lib/ui.ts';
import Icon from '../common/Icon.tsx';

type AccountCardProps = {
  account: Account;
  now: number;
  metadataLoading: boolean;
  onUpdate: (account: Account) => void;
  onDelete: (account: Account) => void;
  onBoost: (account: Account, kind: BoostKind) => void;
  onDismissUpgrade: (upgrade: AccountUpgrade) => void;
};

type GroupedUpgrades = {
  id: UpgradeGroup;
  label: string;
  upgrades: AccountUpgrade[];
};

const primaryActionClass =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gold bg-gold px-2.5 py-1.5 text-[11px] font-bold text-[#2b1a02] transition-[filter] duration-150 hover:brightness-[1.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold [&_svg]:size-3.5';

const dangerActionClass =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line bg-transparent px-2.5 py-1.5 text-[11px] font-semibold text-[#dc2626] transition-colors duration-150 hover:bg-[rgba(220,38,38,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dc2626] dark:text-[#f87171] [&_svg]:size-3.5';

const boostButtonClass =
  'inline-flex cursor-pointer items-center gap-1 rounded-md border border-gold bg-chip-bg px-2 py-1 text-[10px] font-bold text-chip-fg transition-colors duration-150 hover:bg-[rgba(240,180,76,0.24)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold [&_svg]:size-3';

const activeBoostClass =
  'inline-flex cursor-pointer items-center gap-1 rounded-md bg-gold px-2 py-1 text-[10px] font-bold tabular-nums text-[#2b1a02] transition-[filter] duration-150 hover:brightness-[1.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold [&_svg]:size-3';

const collapseButtonClass =
  'absolute -top-[5px] right-0 grid size-8 cursor-pointer place-items-center rounded-md border border-line bg-transparent text-body transition-colors duration-150 hover:bg-[rgba(127,127,127,0.06)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&_svg]:size-4';

const skeletonClass = 'block animate-pulse bg-[rgba(127,127,127,0.12)]';

const lightningPath = <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" />;

function getCountdownTone(remainingMs: number): string {
  if (remainingMs <= 10 * 60_000) return 'text-[#dc2626] dark:text-[#f87171]';
  if (remainingMs <= 60 * 60_000) return 'text-gold';
  return 'text-heading';
}

function isEquipment(upgrade: AccountUpgrade): boolean {
  return upgrade.category.startsWith('equipment');
}

function groupUpgrades(upgrades: AccountUpgrade[]): GroupedUpgrades[] {
  return UPGRADE_GROUPS.map((definition) => ({
    ...definition,
    upgrades: upgrades.filter((upgrade) => upgrade.group === definition.id),
  })).filter((group) => group.upgrades.length > 0);
}

export default function AccountCard({
  account,
  now,
  metadataLoading,
  onUpdate,
  onDelete,
  onBoost,
  onDismissUpgrade,
}: AccountCardProps) {
  const [expanded, setExpanded] = useState(false);
  const contentId = `account-detail-${account.tag.replace('#', '')}`;
  const upgrades = account.upgrades
    .filter((upgrade) => !isEquipment(upgrade))
    .sort((a, b) => a.endsAt - b.endsAt);
  const groups = groupUpgrades(upgrades);
  const activeBoosts = account.boosts.filter((boost) => boost.endsAt > now);
  const api = account.api;
  const displayName = api?.name ?? account.tag;
  const townHall = api?.townHallLevel ?? account.townHall;
  const apiSubtitle = api ? [api.clanName, api.leagueName].filter(Boolean).join(' · ') : '';
  const toggleButton = (
    <button
      type="button"
      className={collapseButtonClass}
      onClick={() => setExpanded((value) => !value)}
      aria-expanded={expanded}
      aria-controls={contentId}
      aria-label={`${expanded ? 'Tutup' : 'Buka'} detail ${displayName}`}
      title={expanded ? 'Tutup detail desa' : 'Buka detail desa'}
    >
      <span
        className={`block transition-transform duration-200 motion-reduce:transition-none ${
          expanded ? 'rotate-180' : ''
        }`}
      >
        <Icon>
          <path d="m6 9 6 6 6-6" />
        </Icon>
      </span>
    </button>
  );

  return (
    <section
      className={panelBorderlessClass}
      aria-label={`Akun ${displayName} (${account.tag})`}
      aria-busy={metadataLoading || undefined}
    >
      <div className={`${panelHeadClass} flex-wrap`}>
        <div className="relative min-w-[200px] basis-full">
          {metadataLoading ? (
            <>
              <h2 className="m-0" aria-label={`Memuat detail desa ${account.tag}`}>
                <span
                  aria-hidden="true"
                  className={`${skeletonClass} h-[17px] w-40 max-w-[75%] rounded`}
                />
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-mono text-[11.5px] text-body">{account.tag}</span>
                <span aria-hidden="true" className={`${skeletonClass} h-2.5 w-20 rounded`} />
                <span aria-hidden="true" className={`${skeletonClass} h-2.5 w-14 rounded`} />
              </div>
              <span aria-hidden="true" className={`${skeletonClass} mt-2 h-2.5 w-28 rounded`} />
            </>
          ) : (
            <>
              <h2 className="m-0 truncate pr-10 text-[15px] font-semibold tracking-[-0.01em] text-heading">
                {displayName}
              </h2>
              {apiSubtitle && (
                <p className={`${panelSubtitleClass} break-words`}>{apiSubtitle}</p>
              )}
              <p
                className={`${
                  apiSubtitle ? 'mt-0.5' : 'mt-[3px]'
                } text-[10.5px] text-body`}
              >
                {api ? (
                  <span className="font-mono">{account.tag}</span>
                ) : account.lastImportAt > 0 ? (
                  `Diperbarui ${formatRelativeTime(account.lastImportAt, now)}`
                ) : (
                  'Belum ada impor timer'
                )}
              </p>
            </>
          )}
          {toggleButton}
        </div>
        <div className="ml-auto flex min-h-7 shrink-0 flex-wrap items-center justify-end gap-2">
          {townHall !== null && <span className={thBadgeClass}>TH {townHall}</span>}
          {metadataLoading ? (
            <span
              aria-hidden="true"
              className={`${skeletonClass} h-[22px] w-[68px] rounded-md`}
            />
          ) : (
            api?.trophies != null && (
              <span className={thBadgeClass}>{api.trophies.toLocaleString('id-ID')} Trofi</span>
            )
          )}
          <span className="rounded-full bg-chip-bg px-2 py-1 text-[10px] font-semibold text-chip-fg">
            {upgrades.length} Peningkatan
          </span>
        </div>
      </div>

      <div
        id={contentId}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
        inert={!expanded}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-y border-line px-3.5 py-2">
            <button type="button" className={primaryActionClass} onClick={() => onUpdate(account)}>
              <Icon>
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </Icon>
              Impor ulang
            </button>
            <button type="button" className={dangerActionClass} onClick={() => onDelete(account)}>
              <Icon>
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="m19 6-1 14H6L5 6" />
                <path d="M10 11v5" />
                <path d="M14 11v5" />
              </Icon>
              Hapus Desa
            </button>
          </div>

          {upgrades.length === 0 ? (
            <p className="px-5 py-8 text-center text-[12px] text-body">Tidak ada upgrade berjalan.</p>
          ) : (
            <div className="px-5 pb-2">
              {groups.map((group, index) => {
                const boostKind = getBoostKindForGroup(group.id);
                const spec = boostKind ? BOOST_SPECS[boostKind] : null;
                const activeBoost = boostKind
                  ? activeBoosts.find((boost) => boost.kind === boostKind)
                  : undefined;
                const hasActiveUpgrades = group.upgrades.some(
                  (upgrade) => upgrade.endsAt > now,
                );

                return (
                  <section
                    key={group.id}
                    aria-label={group.label}
                    className={index > 0 ? 'border-t border-line' : undefined}
                  >
                    <div className="relative flex flex-wrap items-center gap-x-2 gap-y-1 pt-3 pb-0.5 before:absolute before:top-1.5 before:bottom-0 before:-left-3 before:w-[3px] before:rounded-full before:bg-accent before:content-[''] after:absolute after:bottom-0 after:-left-3 after:-right-3 after:h-[2px] after:rounded-full after:bg-accent after:content-['']">
                      <h3 className="m-0 text-[10px] font-semibold tracking-[0.1em] uppercase text-body">
                        {group.label}
                      </h3>
                      <span className="text-[10px] font-semibold tabular-nums text-body opacity-80">
                        {group.upgrades.length} Peningkatan
                      </span>
                      {spec && boostKind && hasActiveUpgrades && (
                        <div className="ml-auto -translate-y-1">
                          {activeBoost ? (
                            <button
                              type="button"
                              className={activeBoostClass}
                              onClick={() => onBoost(account, boostKind)}
                              title={`Tambah durasi ${spec.label} (aktif sampai ${new Date(activeBoost.endsAt).toLocaleTimeString('id-ID')})`}
                              aria-label={`Tambah durasi ${spec.label} ${spec.multiplier}x`}
                            >
                              <Icon>{lightningPath}</Icon>
                              {spec.multiplier}x · {formatCountdown(activeBoost.endsAt, now)}
                              <span aria-hidden="true" className="ml-0.5 text-[11px] leading-none">
                                +
                              </span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={boostButtonClass}
                              onClick={() => onBoost(account, boostKind)}
                              title={`Gunakan ${spec.label} (${spec.multiplier}x, 1 jam per kuantitas)`}
                              aria-label={`Gunakan ${spec.label} ${spec.multiplier}x`}
                            >
                              <Icon>{lightningPath}</Icon>
                              {spec.multiplier}x
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <ul className="m-0 list-none pb-1">
                      {group.upgrades.map((upgrade) => {
                        const realRemaining = upgrade.endsAt - now;
                        const isCompleted = realRemaining <= 0;
                        const originalRemaining =
                          !isCompleted && activeBoost
                            ? getRemainingWorkMs(upgrade.endsAt, now, activeBoost)
                            : null;
                        const nextLevel = getNextLevel(upgrade.base, upgrade.dataId, upgrade.level);

                        return (
                          <li
                            key={upgrade.id}
                            className="flex items-center justify-between gap-3 py-2.5 [&+&]:border-t [&+&]:border-line"
                          >
                            <div className="min-w-0">
                              <p className="m-0 truncate text-[12.5px] font-semibold text-heading">
                                {getGameName(upgrade.base, upgrade.dataId)}
                              </p>
                              <p className="mt-0.5 text-[10.5px] text-body">
                                Level {upgrade.level} → {nextLevel} ·{' '}
                                {getCategoryLabel(upgrade.category)}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              {isCompleted ? (
                                <div className="flex items-center justify-end gap-2">
                                  <span
                                    className="inline-flex items-center gap-1 rounded-full bg-green-soft px-2 py-1 text-[10px] font-semibold text-green [&_svg]:size-3"
                                    role="status"
                                    title={`Selesai ${new Date(upgrade.endsAt).toLocaleString('id-ID')}`}
                                  >
                                    <Icon>
                                      <path d="m5 13 4 4L19 7" />
                                    </Icon>
                                    Selesai
                                  </span>
                                  <button
                                    type="button"
                                    className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-md text-[14px] text-body hover:bg-[rgba(127,127,127,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                                    onClick={() => onDismissUpgrade(upgrade)}
                                    aria-label={`Tutup peningkatan selesai ${getGameName(upgrade.base, upgrade.dataId)}`}
                                    title="Tutup peningkatan selesai"
                                  >
                                    ×
                                  </button>
                                </div>
                              ) : activeBoost && originalRemaining !== null ? (
                                <div
                                  title={`Timer asli ${formatDurationMs(originalRemaining)} (${activeBoost.multiplier}x) · selesai dalam ${formatCountdown(upgrade.endsAt, now)}`}
                                >
                                  <span className="block font-mono text-[13.5px] leading-tight font-bold tabular-nums text-gold">
                                    {formatDurationMs(originalRemaining)}
                                  </span>
                                  <span className="mt-0.5 block text-[9.5px] font-medium whitespace-nowrap text-body">
                                    <span
                                      className={`font-mono font-semibold tabular-nums ${getCountdownTone(realRemaining)}`}
                                    >
                                      {formatCountdown(upgrade.endsAt, now)}
                                    </span>
                                  </span>
                                </div>
                              ) : (
                                <span
                                  className={`font-mono text-[13px] font-bold tabular-nums ${getCountdownTone(realRemaining)}`}
                                  title={`Selesai ${new Date(upgrade.endsAt).toLocaleString('id-ID')}`}
                                >
                                  {formatCountdown(upgrade.endsAt, now)}
                                </span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
