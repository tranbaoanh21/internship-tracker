import { closePool } from '../src/config/db.js';
import { ensureBootstrapOwner } from '../src/services/authService.js';

try {
  const result = await ensureBootstrapOwner({ required: true });
  console.log(result.kind === 'created' ? `Owner ${result.user.email} created.` : `Owner ${result.user.email} already exists.`);
} finally {
  await closePool();
}
