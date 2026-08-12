import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const documentPath = path.resolve(currentDirectory, '../../openapi.json');
export const openApiDocument = JSON.parse(readFileSync(documentPath, 'utf8'));

export const docsRouter = Router();

docsRouter.get('/openapi.json', (req, res) => {
  res.json(openApiDocument);
});

docsRouter.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    customSiteTitle: 'Internship Tracker API Docs',
    swaggerOptions: {
      displayRequestDuration: true,
      tryItOutEnabled: true,
    },
  }),
);
