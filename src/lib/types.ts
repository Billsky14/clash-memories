export type UpgradeGroup = 'home' | 'laboratory' | 'pet' | 'builderBase';

export type BoostKind = 'builder' | 'laboratory' | 'pet';

export type AccountUpgrade = {
  id: number;
  accountTag: string;
  category: string;
  group: UpgradeGroup;
  base: string;
  dataId: number;
  level: number;
  remainingSeconds: number;
  endsAt: number;
  helperRecurrent: boolean;
  extra: boolean;
};

export type AccountBoost = {
  id: number;
  kind: BoostKind;
  multiplier: number;
  quantity: number;
  startedAt: number;
  endsAt: number;
};

export type Account = {
  tag: string;
  townHall: number | null;
  lastImportAt: number;
  createdAt: number;
  upgrades: AccountUpgrade[];
  boosts: AccountBoost[];
};

export type AccountsSnapshot = {
  accounts: Account[];
};

export type ImportResult = {
  account: Account;
  importedUpgrades: number;
};

export type BoostResult = {
  account: Account;
  boost: AccountBoost;
  affectedUpgrades: number;
  extended: boolean;
  addedQuantity: number;
};

export type ToastTone = 'success' | 'info' | 'error';

export type ToastMessage = {
  id: number;
  title: string;
  detail?: string;
  tone: ToastTone;
};
