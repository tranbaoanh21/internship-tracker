import { APPLICATION_STATUSES } from '../constants/application.js';
import { AppError } from '../errors/AppError.js';
import * as repository from '../repositories/applicationRepository.js';
import {
  validateApplicationInput,
  validateId,
  validateListQuery,
} from '../validation/applicationValidation.js';

export async function listApplications(query) {
  const filters = validateListQuery(query);
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

export async function getApplication(idValue) {
  const id = validateId(idValue);
  const application = await repository.findApplicationById(id);
  if (!application) {
    throw new AppError(404, 'APPLICATION_NOT_FOUND', 'Application was not found.');
  }
  return application;
}

export async function createApplication(body) {
  const input = validateApplicationInput(body);
  return repository.createApplication(input);
}

export async function updateApplication(idValue, body) {
  const id = validateId(idValue);
  const input = validateApplicationInput(body, { partial: true });
  const application = await repository.updateApplication(id, input);
  if (!application) {
    throw new AppError(404, 'APPLICATION_NOT_FOUND', 'Application was not found.');
  }
  return application;
}

export async function deleteApplication(idValue) {
  const id = validateId(idValue);
  const deleted = await repository.deleteApplication(id);
  if (!deleted) {
    throw new AppError(404, 'APPLICATION_NOT_FOUND', 'Application was not found.');
  }
}

export async function getStats() {
  const counts = Object.fromEntries(APPLICATION_STATUSES.map((status) => [status, 0]));
  const rows = await repository.getApplicationStats();
  for (const row of rows) counts[row.status] = row.count;

  return {
    ...counts,
    total: Object.values(counts).reduce((sum, count) => sum + count, 0),
  };
}
