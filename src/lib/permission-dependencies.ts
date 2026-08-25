import { normalizeManagerPermissionName } from "@/lib/manager-permissions";

/**
 * Cross-module permission dependencies.
 *
 * Several backoffice pages open create/edit forms that load their dropdown /
 * option data from APIs owned by a DIFFERENT permission module than the page
 * itself. Examples:
 *   - Commission Group form (IB Management) also calls /admin/groups (Group
 *     List) and /admin/ib-plans/list (IB Plan) to populate its dropdowns.
 *   - Create MT5 Account (User Management) also calls /admin/account-types/list
 *     (Account Types List).
 *
 * A sub-admin granted only the page's own permission will get a 403 on those
 * unrelated APIs, so the dropdowns come up empty and the module silently
 * breaks. This registry declares those prerequisites so the sub-admin form can
 * warn the admin at assign-time and offer to add them in one click.
 *
 * IMPORTANT: every name in `anyOf` and every key MUST be a real permission /
 * module name as returned by the permissions API. Cross-check against
 * `managerPermissionConfig` in `manager-permissions.ts` — a typo means the
 * dependency can never be resolved or added.
 */

export type PermissionRequirement = {
  /**
   * Any one of these permission names satisfies the requirement (aliases for
   * the same capability). The first one that actually exists in the loaded
   * permission list is the one auto-added.
   */
  anyOf: string[];
  /** Short human explanation shown in the banner (what breaks without it). */
  reason: string;
};

/**
 * In this product "account types" and "groups" are the same concept: the
 * /all-accounts screen (labelled "Group Management" in the UI) manages account
 * types, and /admin/account-types/list backs its dropdowns. Depending on the
 * login response the guarding permission can surface as either name, so accept
 * both — the resolver adds whichever one actually exists in the permission list.
 */
const ACCOUNT_TYPES_OR_GROUP = ["Account Types List", "Group List"];

/**
 * Triggered by an INDIVIDUAL permission being selected. Key = the permission
 * name that powers a create/edit form.
 */
export const PERMISSION_REQUIREMENTS: Record<string, PermissionRequirement[]> = {
  // Commission Group form — /admin/groups + /admin/ib-plans/list
  "View / Create Commission Group": [
    { anyOf: ["Group List"], reason: "loads the Group dropdown" },
    { anyOf: ["IB Plan", "View / Create IB Plan"], reason: "loads the IB Plan dropdown" },
  ],
  "Edit / Delete Commission Group": [
    { anyOf: ["Group List"], reason: "loads the Group dropdown" },
    { anyOf: ["IB Plan", "View / Create IB Plan"], reason: "loads the IB Plan dropdown" },
  ],

  // MT5 account create/edit — /admin/account-types/list (+ user search).
  // Account Types == Groups here, so accept either "Account Types List" or
  // "Group List" (whichever the login response surfaces).
  "Create MT5 Account": [
    { anyOf: ACCOUNT_TYPES_OR_GROUP, reason: "loads the Account Type / Group dropdown" },
    { anyOf: ["User List"], reason: "loads the user search" },
  ],
  "Update MT5 Leverage": [
    { anyOf: ACCOUNT_TYPES_OR_GROUP, reason: "loads the Account Type / Group dropdown" },
  ],

  // Add existing client — /admin/account-types/list + user search
  "Add Existing Client": [
    { anyOf: ACCOUNT_TYPES_OR_GROUP, reason: "loads the Account Type / Group dropdown" },
    { anyOf: ["User List"], reason: "loads the user search" },
  ],

  // Set IB Commission — user search + /admin/ib-plans/list
  "Set IB Commission": [
    { anyOf: ["User List"], reason: "loads the user search" },
    { anyOf: ["IB Plan", "View / Create IB Plan"], reason: "loads the IB Plan dropdown" },
  ],

  // Admin transaction dialogs — /admin/user-management/crud/users (+ MT5 list)
  "Client Deposit": [{ anyOf: ["User List"], reason: "loads the user search" }],
  "Client Withdraw": [{ anyOf: ["User List"], reason: "loads the user search" }],
  "Internal Transfer": [
    { anyOf: ["User List"], reason: "loads the user search" },
    { anyOf: ["MT5 User List"], reason: "loads the MT5 account dropdown" },
  ],
  "Wallet Deposit": [
    { anyOf: ["User List"], reason: "loads the user search" },
    { anyOf: ["MT5 User List"], reason: "loads the MT5 account dropdown" },
  ],
  "Wallet Withdraw": [
    { anyOf: ["User List"], reason: "loads the user search" },
    { anyOf: ["MT5 User List"], reason: "loads the MT5 account dropdown" },
  ],

  // Bank details form — user search
  "Add Bank Details": [{ anyOf: ["User List"], reason: "loads the user search" }],

  // Broadcast / send email — recipient picker
  "Send Email": [{ anyOf: ["User List"], reason: "loads the recipient list" }],
  "Create Broadcast Email": [{ anyOf: ["User List"], reason: "loads the recipient list" }],
};

/**
 * Triggered when a WHOLE module/category is selected. Key = category name as
 * shown in the permissions list (matches the backend module label). Catches the
 * "admin enabled the entire module" case in one shot, on top of the per-
 * permission triggers above.
 */
export const MODULE_REQUIREMENTS: Record<string, PermissionRequirement[]> = {
  "IB Management": [
    { anyOf: ["Group List"], reason: "Commission Group form loads the Group dropdown" },
    { anyOf: ACCOUNT_TYPES_OR_GROUP, reason: "IB rate forms load Account Types / Groups" },
  ],
  Transaction: [
    { anyOf: ["User List"], reason: "transaction dialogs load the user search" },
    { anyOf: ["MT5 User List"], reason: "MT5 transfer dialogs load the MT5 account dropdown" },
  ],
  "User Management": [
    { anyOf: ACCOUNT_TYPES_OR_GROUP, reason: "MT5 account & existing-client forms load Account Types / Groups" },
  ],
  "E-Mail Management": [{ anyOf: ["User List"], reason: "broadcast email loads the recipient list" }],
  "Email Management": [{ anyOf: ["User List"], reason: "broadcast email loads the recipient list" }],
};

/** A prerequisite permission resolved to a concrete, addable permission id. */
export type ResolvedDependency = {
  id: number;
  name: string;
  category: string;
  /** Reasons this dependency is needed (deduped across triggers). */
  reasons: string[];
};

type PermissionLite = { id: number; name: string };
type PermissionGroupLite = { category: string; permissions: PermissionLite[] };
type PermIndexEntry = { id: number; name: string; category: string };

/** Pre-normalize a registry once so lookups are O(1) and case-insensitive. */
function normalizeRegistry(
  registry: Record<string, PermissionRequirement[]>,
): Map<string, PermissionRequirement[]> {
  const map = new Map<string, PermissionRequirement[]>();
  for (const [key, reqs] of Object.entries(registry)) {
    map.set(normalizeManagerPermissionName(key), reqs);
  }
  return map;
}

const NORMALIZED_PERMISSION_REQUIREMENTS = normalizeRegistry(PERMISSION_REQUIREMENTS);
const NORMALIZED_MODULE_REQUIREMENTS = normalizeRegistry(MODULE_REQUIREMENTS);

/**
 * Given the currently selected permission ids and the full grouped permission
 * list, return the prerequisite permissions that are required by the current
 * selection but not yet selected — resolved to real, addable permission ids.
 *
 * A requirement is:
 *  - "active" when its trigger is selected (an individual permission, or a
 *    fully-selected category);
 *  - "satisfied" when any of its `anyOf` aliases is already selected;
 *  - "resolvable" when at least one alias exists in the loaded permission list.
 *
 * Only active + unsatisfied + resolvable requirements are returned.
 */
export function computeMissingDependencies(params: {
  selectedIds: Set<number>;
  grouped: PermissionGroupLite[];
}): ResolvedDependency[] {
  const { selectedIds, grouped } = params;
  if (!grouped.length) return [];

  const byId = new Map<number, PermIndexEntry>();
  const byName = new Map<string, PermIndexEntry>();
  for (const group of grouped) {
    for (const permission of group.permissions ?? []) {
      const entry: PermIndexEntry = {
        id: permission.id,
        name: permission.name,
        category: group.category,
      };
      byId.set(permission.id, entry);
      const key = normalizeManagerPermissionName(permission.name);
      if (!byName.has(key)) byName.set(key, entry);
    }
  }

  const selectedNames = new Set<string>();
  selectedIds.forEach((id) => {
    const entry = byId.get(id);
    if (entry) selectedNames.add(normalizeManagerPermissionName(entry.name));
  });

  const activeRequirements: PermissionRequirement[] = [];

  // Per-permission triggers: any selected permission that has requirements.
  selectedNames.forEach((name) => {
    const reqs = NORMALIZED_PERMISSION_REQUIREMENTS.get(name);
    if (reqs) activeRequirements.push(...reqs);
  });

  // Module triggers: a category whose every permission is selected.
  for (const group of grouped) {
    const permissions = group.permissions ?? [];
    if (permissions.length === 0) continue;
    const reqs = NORMALIZED_MODULE_REQUIREMENTS.get(
      normalizeManagerPermissionName(group.category),
    );
    if (!reqs) continue;
    const fullySelected = permissions.every((p) => selectedIds.has(p.id));
    if (fullySelected) activeRequirements.push(...reqs);
  }

  // Resolve unmet requirements to concrete permission ids, deduped by id.
  const resolved = new Map<number, ResolvedDependency>();
  for (const requirement of activeRequirements) {
    const satisfied = requirement.anyOf.some((alias) =>
      selectedNames.has(normalizeManagerPermissionName(alias)),
    );
    if (satisfied) continue;

    let target: PermIndexEntry | undefined;
    for (const alias of requirement.anyOf) {
      const match = byName.get(normalizeManagerPermissionName(alias));
      if (match) {
        target = match;
        break;
      }
    }
    if (!target) continue; // Not in the loaded permission list — can't add it.

    const existing = resolved.get(target.id);
    if (existing) {
      if (!existing.reasons.includes(requirement.reason)) {
        existing.reasons.push(requirement.reason);
      }
    } else {
      resolved.set(target.id, {
        id: target.id,
        name: target.name,
        category: target.category,
        reasons: [requirement.reason],
      });
    }
  }

  return Array.from(resolved.values());
}
