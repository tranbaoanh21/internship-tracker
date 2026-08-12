import SwaggerParser from '@apidevtools/swagger-parser';
import { describe, expect, it } from 'vitest';
import { openApiDocument } from '../../src/routes/docsRoutes.js';

const documentedOperations = [
  'GET /health',
  'GET /applications',
  'POST /applications',
  'GET /applications/stats',
  'GET /applications/{id}',
  'PATCH /applications/{id}',
  'DELETE /applications/{id}',
];

describe('OpenAPI contract', () => {
  it('is a valid OpenAPI document with resolvable references', async () => {
    await expect(SwaggerParser.validate(openApiDocument)).resolves.toBeTruthy();
  });

  it('documents every public application and health operation', () => {
    const operations = Object.entries(openApiDocument.paths).flatMap(([path, pathItem]) => (
      Object.keys(pathItem)
        .filter((method) => ['get', 'post', 'patch', 'delete'].includes(method))
        .map((method) => `${method.toUpperCase()} ${path}`)
    ));

    expect(operations).toEqual(documentedOperations);
  });
});
