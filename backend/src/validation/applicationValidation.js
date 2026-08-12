import { APPLICATION_STATUSES, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants/application.js';
import { AppError } from '../errors/AppError.js';

const WRITABLE_FIELDS = ['company', 'position', 'jobUrl', 'status', 'appliedAt', 'notes'];
const MAX_PAGE = 1_000_000;
const MAX_UNSIGNED_BIGINT = 18_446_744_073_709_551_615n;
const MAX_SEARCH_LENGTH = 120;

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizedText(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateApplicationInput(body, { partial = false } = {}) {
  if (!isPlainObject(body)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'The request body is invalid.', {
      _form: 'Expected a JSON object.',
    });
  }

  const presentFields = WRITABLE_FIELDS.filter((field) => Object.hasOwn(body, field));
  const unknownFields = Object.keys(body).filter((field) => !WRITABLE_FIELDS.includes(field));
  if (partial && presentFields.length === 0 && unknownFields.length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'No supported fields were provided.', {
      _form: `Provide at least one of: ${WRITABLE_FIELDS.join(', ')}.`,
    });
  }

  const fields = {};
  const output = {};

  for (const field of unknownFields) {
    fields[field] = 'This field is not supported.';
  }

  for (const field of WRITABLE_FIELDS) {
    if (partial && !Object.hasOwn(body, field)) continue;
    const value = normalizedText(body[field]);

    if (field === 'company' || field === 'position') {
      if (typeof value !== 'string' || value.length === 0) {
        fields[field] = `${field === 'company' ? 'Company' : 'Position'} is required.`;
      } else if (value.length > 120) {
        fields[field] = 'Use 120 characters or fewer.';
      } else {
        output[field] = value;
      }
    }

    if (field === 'jobUrl') {
      if (value === undefined || value === null || value === '') {
        output.jobUrl = null;
      } else if (typeof value !== 'string' || value.length > 2048 || !isHttpUrl(value)) {
        fields.jobUrl = 'Enter a valid http or https URL.';
      } else {
        output.jobUrl = value;
      }
    }

    if (field === 'status') {
      const normalizedStatus = Object.hasOwn(body, field)
        ? value
        : (partial ? undefined : 'wishlist');
      if (!APPLICATION_STATUSES.includes(normalizedStatus)) {
        fields.status = `Choose one of: ${APPLICATION_STATUSES.join(', ')}.`;
      } else {
        output.status = normalizedStatus;
      }
    }

    if (field === 'appliedAt') {
      if (value === undefined || value === null || value === '') {
        output.appliedAt = null;
      } else if (typeof value !== 'string' || !isValidDate(value)) {
        fields.appliedAt = 'Use a real date in YYYY-MM-DD format.';
      } else {
        output.appliedAt = value;
      }
    }

    if (field === 'notes') {
      if (value === undefined || value === null || value === '') {
        output.notes = null;
      } else if (typeof value !== 'string' || value.length > 5000) {
        fields.notes = 'Use 5000 characters or fewer.';
      } else {
        output.notes = value;
      }
    }
  }

  if (!partial) {
    if (!Object.hasOwn(output, 'status') && !fields.status) output.status = 'wishlist';
    if (!Object.hasOwn(output, 'jobUrl')) output.jobUrl = null;
    if (!Object.hasOwn(output, 'appliedAt')) output.appliedAt = null;
    if (!Object.hasOwn(output, 'notes')) output.notes = null;
  }

  if (Object.keys(fields).length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Check the highlighted fields.', fields);
  }

  return output;
}

function positiveInteger(value, fallback) {
  if (value === undefined || value === '') return fallback;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function validateListQuery(query) {
  const q = typeof query.q === 'string' ? query.q.trim() : '';
  const status = typeof query.status === 'string' ? query.status.trim() : '';
  const page = positiveInteger(query.page, 1);
  const limit = positiveInteger(query.limit, DEFAULT_PAGE_SIZE);
  const fields = {};

  if (q.length > MAX_SEARCH_LENGTH) {
    fields.q = `Search must use ${MAX_SEARCH_LENGTH} characters or fewer.`;
  }

  if (page === null || page > MAX_PAGE) {
    fields.page = `Page must be a decimal integer from 1 to ${MAX_PAGE}.`;
  }
  if (limit === null || limit > MAX_PAGE_SIZE) {
    fields.limit = `Limit must be an integer from 1 to ${MAX_PAGE_SIZE}.`;
  }
  if (status && !APPLICATION_STATUSES.includes(status)) {
    fields.status = `Choose one of: ${APPLICATION_STATUSES.join(', ')}.`;
  }

  if (Object.keys(fields).length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'The query parameters are invalid.', fields);
  }

  return { q, status, page, limit };
}

export function validateId(value) {
  if (
    typeof value !== 'string'
    || !/^[1-9]\d*$/.test(value)
    || BigInt(value) > MAX_UNSIGNED_BIGINT
  ) {
    throw new AppError(400, 'INVALID_ID', 'Application id must be a positive integer.');
  }
  return value;
}
