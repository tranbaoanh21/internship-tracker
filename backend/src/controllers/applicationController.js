import * as service from '../services/applicationService.js';

export async function list(req, res) {
  res.json(await service.listApplications(req.query));
}

export async function stats(req, res) {
  res.json({ data: await service.getStats() });
}

export async function getById(req, res) {
  res.json({ data: await service.getApplication(req.params.id) });
}

export async function create(req, res) {
  const application = await service.createApplication(req.body);
  res.status(201).location(`/api/applications/${application.id}`).json({ data: application });
}

export async function update(req, res) {
  res.json({ data: await service.updateApplication(req.params.id, req.body) });
}

export async function remove(req, res) {
  await service.deleteApplication(req.params.id);
  res.status(204).end();
}
