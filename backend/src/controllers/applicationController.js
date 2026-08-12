import * as service from '../services/applicationService.js';

export async function list(req, res) {
  res.json(await service.listApplications(req.query));
}

export async function stats(req, res) {
  res.json({ data: await service.getStats(req.query) });
}

export async function getById(req, res) {
  const application = await service.getApplication(req.params.id);
  res.set('ETag', `"${application.version}"`).json({ data: application });
}

export async function create(req, res) {
  const application = await service.createApplication(req.body);
  res
    .status(201)
    .location(`/api/applications/${application.id}`)
    .set('ETag', `"${application.version}"`)
    .json({ data: application });
}

export async function update(req, res) {
  const application = await service.updateApplication(req.params.id, req.body, req.get('If-Match'));
  res.set('ETag', `"${application.version}"`).json({ data: application });
}

export async function remove(req, res) {
  await service.deleteApplication(req.params.id, req.get('If-Match'));
  res.status(204).end();
}

export async function history(req, res) {
  res.json({ data: await service.getHistory(req.params.id) });
}

export async function archive(req, res) {
  const application = await service.archiveApplication(req.params.id, req.get('If-Match'));
  res.set('ETag', `"${application.version}"`).json({ data: application });
}

export async function restore(req, res) {
  const application = await service.restoreApplication(req.params.id, req.get('If-Match'));
  res.set('ETag', `"${application.version}"`).json({ data: application });
}
