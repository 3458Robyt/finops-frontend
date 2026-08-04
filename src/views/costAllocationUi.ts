import type { CostAllocationRule, CostAllocationRuleInput, CostAllocationTarget } from '../services/api';

export function readCostAllocationRule(form: FormData): CostAllocationRuleInput {
  const provider = blank(String(form.get('provider') ?? '').toUpperCase());
  const allocationMode = form.get('allocationMode') === 'SPLIT' ? 'SPLIT' : 'DIRECT';
  return {
    name: String(form.get('name') ?? '').trim(), priority: Number(form.get('priority')), status: 'DRAFT', allocationMode,
    ...(allocationMode === 'SPLIT' ? { allocationTargets: readTargets(form) } : {}), ...optional(form, 'description'), ...optional(form, 'cloudAccountId'),
    ...(provider === undefined ? {} : { provider }), ...optional(form, 'serviceName'), ...optional(form, 'regionId'), ...optional(form, 'resourceId'),
    ...optional(form, 'tagKey'), ...optional(form, 'tagValue'), ...(allocationMode === 'DIRECT' ? { ...optional(form, 'costCenter'), ...optional(form, 'businessUnit'), ...optional(form, 'project'), ...optional(form, 'team'), ...optional(form, 'environment') } : {}),
  };
}

export function toCostAllocationInput(rule: CostAllocationRule): CostAllocationRuleInput {
  return { name: rule.name, priority: rule.priority, status: rule.status, allocationMode: rule.allocationMode, allocationTargets: rule.allocationTargets, configurationVersion: rule.configurationVersion,
    ...(rule.description === undefined ? {} : { description: rule.description }), ...(rule.cloudAccountId === undefined ? {} : { cloudAccountId: rule.cloudAccountId }), ...(rule.provider === undefined ? {} : { provider: rule.provider }), ...(rule.serviceName === undefined ? {} : { serviceName: rule.serviceName }), ...(rule.regionId === undefined ? {} : { regionId: rule.regionId }), ...(rule.resourceId === undefined ? {} : { resourceId: rule.resourceId }), ...(rule.tagKey === undefined ? {} : { tagKey: rule.tagKey }), ...(rule.tagValue === undefined ? {} : { tagValue: rule.tagValue }), ...(rule.costCenter === undefined ? {} : { costCenter: rule.costCenter }), ...(rule.businessUnit === undefined ? {} : { businessUnit: rule.businessUnit }), ...(rule.project === undefined ? {} : { project: rule.project }), ...(rule.team === undefined ? {} : { team: rule.team }), ...(rule.environment === undefined ? {} : { environment: rule.environment }) };
}

function readTargets(form: FormData): readonly CostAllocationTarget[] { const targets: CostAllocationTarget[] = []; for (let index = 0; form.has(`target${index}Percentage`); index += 1) { targets.push({ percentage: Number(form.get(`target${index}Percentage`)), ...optionalNamed(form, `target${index}CostCenter`, 'costCenter'), ...optionalNamed(form, `target${index}BusinessUnit`, 'businessUnit'), ...optionalNamed(form, `target${index}Project`, 'project'), ...optionalNamed(form, `target${index}Team`, 'team'), ...optionalNamed(form, `target${index}Environment`, 'environment') }); } return targets; }
function optional(form: FormData, key: keyof CostAllocationRuleInput) { const value = blank(String(form.get(key) ?? '')); return value === undefined ? {} : { [key]: value }; }
function optionalNamed(form: FormData, source: string, target: string) { const value = blank(String(form.get(source) ?? '')); return value === undefined ? {} : { [target]: value }; }
function blank(value: string): string | undefined { const trimmed = value.trim(); return trimmed === '' ? undefined : trimmed; }
