import { APPLICATION_STATUSES } from '../constants/application.js';
import { AppError } from '../errors/AppError.js';
import * as repository from '../repositories/applicationRepository.js';
import {
  validateApplicationInput,
  validateId,
  validateIfMatch,
  validateListQuery,
  validateStatsQuery,
} from '../validation/applicationValidation.js';
import { todayInApplicationTimezone } from '../utils/date.js';

export async function listApplications(query, userId) {
  const filters = {
    ...validateListQuery(query),
    userId,
    today: todayInApplicationTimezone(),
  };
  const result = await repository.listApplications(filters);

  return {
    data: result.items,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / filters.limit)),
    },
  };
}

export async function getApplication(idValue, userId) {
  const id = validateId(idValue);
  const application = await repository.findApplicationById(id, userId);
  if (!application) {
    throw new AppError(404, 'APPLICATION_NOT_FOUND', 'Application was not found.');
  }
  return application;
}

export async function createApplication(body, userId) {
  const input = validateApplicationInput(body);
  return repository.createApplication(input, userId);
}

export async function updateApplication(idValue, body, ifMatch, userId) {
  const id = validateId(idValue);
  const expectedVersion = validateIfMatch(ifMatch);
  const input = validateApplicationInput(body, { partial: true });
  const result = await repository.updateApplication(id, input, expectedVersion, userId);
  return resolveMutation(result);
}

export async function deleteApplication(idValue, ifMatch, userId) {
  const id = validateId(idValue);
  const expectedVersion = validateIfMatch(ifMatch);
  const result = await repository.deleteApplication(id, expectedVersion, userId);
  resolveMutation(result);
}

export async function getStats(query, userId) {
  const filters = { ...validateStatsQuery(query), userId };
  const counts = Object.fromEntries(APPLICATION_STATUSES.map((status) => [status, 0]));
  const rows = await repository.getApplicationStats(filters);
  for (const row of rows) counts[row.status] = row.count;

  return {
    ...counts,
    total: Object.values(counts).reduce((sum, count) => sum + count, 0),
  };
}

export async function getHistory(idValue, userId) {
  const id = validateId(idValue);
  await getApplication(id, userId);
  return repository.getApplicationHistory(id);
}

export async function archiveApplication(idValue, ifMatch, userId) {
  const id = validateId(idValue);
  const expectedVersion = validateIfMatch(ifMatch);
  const result = await repository.setArchived(id, expectedVersion, true, userId);
  return resolveMutation(result);
}

export async function restoreApplication(idValue, ifMatch, userId) {
  const id = validateId(idValue);
  const expectedVersion = validateIfMatch(ifMatch);
  const result = await repository.setArchived(id, expectedVersion, false, userId);
  return resolveMutation(result);
}

function resolveMutation(result) {
  if (result.kind === 'missing') {
    throw new AppError(404, 'APPLICATION_NOT_FOUND', 'Application was not found.');
  }
  if (result.kind === 'conflict') {
    throw new AppError(409, 'STALE_APPLICATION', 'The application changed since you loaded it.');
  }
  if (result.kind === 'unavailable') {
    throw new AppError(409, 'APPLICATION_ARCHIVED', 'Restore the application before editing it.');
  }
  if (['archived', 'restored', 'updated'].includes(result.kind)) return result.application;
  if (result.kind === 'invalidState') {
    throw new AppError(409, 'INVALID_APPLICATION_STATE', 'The application is already in that state.');
  }
  if (result.kind === 'active') {
    throw new AppError(409, 'ARCHIVE_REQUIRED', 'Archive the application before permanently deleting it.');
  }
  return undefined;
}
