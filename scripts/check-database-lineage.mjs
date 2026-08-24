import fs from 'node:fs';

const manifestPath = 'docs/deployment/APPROVED_DATABASE_LINEAGE.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const repoNames = fs.readdirSync('supabase/migrations')
  .filter((file) => file.endsWith('.sql'))
  .map((file) => file.replace(/^\d+_?/, '').replace(/\.sql$/, ''));
const accepted = manifest.acceptedLiveOnlyMigrations ?? [];
const classifications = manifest.liveOnlyClassifications ?? {};
const releaseBlockers = manifest.productionReleaseBlockers ?? [];

if (manifest.schemaVersion !== 2) throw new Error('unsupported database-lineage manifest version');
if (!manifest.targetProjectRef) throw new Error('database-lineage manifest is missing targetProjectRef');
if (new Set(accepted).size !== accepted.length) throw new Error('duplicate accepted live-only migration');

const collisions = accepted.filter((name) => repoNames.includes(name));
if (collisions.length) {
  throw new Error(`accepted live-only migrations now collide with repository migrations: ${collisions.join(', ')}`);
}

const allowedClassifications = new Set([
  'live_only_legacy_preserve'
]);
const missingClassification = accepted.filter((name) => !classifications[name]);
const invalidClassification = accepted.filter(
  (name) => classifications[name] && !allowedClassifications.has(classifications[name])
);
if (missingClassification.length || invalidClassification.length) {
  throw new Error(
    `live-only lineage classification invalid; missing=[${missingClassification.join(', ')}] invalid=[${invalidClassification.join(', ')}]`
  );
}
if (manifest.blockedUntilClassified && missingClassification.length === 0) {
  throw new Error('blockedUntilClassified is stale: every accepted live-only migration is classified');
}
if (!manifest.blockedUntilClassified && missingClassification.length) {
  throw new Error('live-only classification gate cannot close while classifications are missing');
}

if (!manifest.classificationEvidence || !fs.existsSync(manifest.classificationEvidence)) {
  throw new Error('live-only classification evidence file is missing');
}
const evidence = JSON.parse(fs.readFileSync(manifest.classificationEvidence, 'utf8'));
if (evidence.targetProjectRef !== manifest.targetProjectRef) {
  throw new Error('live-only classification evidence targets the wrong Supabase project');
}
const evidenceMigrations = evidence.portfolioLegacySubsystem?.migrations ?? [];
const evidenceNames = evidenceMigrations.map((item) => item.name);
const missingEvidence = accepted.filter((name) => !evidenceNames.includes(name));
if (missingEvidence.length) {
  throw new Error(`live-only classifications are missing evidence: ${missingEvidence.join(', ')}`);
}
for (const item of evidenceMigrations) {
  if (!accepted.includes(item.name)) continue;
  if (item.classification !== classifications[item.name]) {
    throw new Error(`${item.name}: manifest/evidence classification mismatch`);
  }
  if (!item.version || !item.rawStatementsMd5) {
    throw new Error(`${item.name}: evidence is missing immutable live version/hash`);
  }
}

if (!manifest.versionRemapEvidence || !fs.existsSync(manifest.versionRemapEvidence)) {
  throw new Error('version-remap evidence file is missing');
}
const remapEvidence = JSON.parse(fs.readFileSync(manifest.versionRemapEvidence, 'utf8'));
if (remapEvidence.targetProjectRef !== manifest.targetProjectRef) {
  throw new Error('version-remap evidence targets the wrong Supabase project');
}

if (!manifest.productionDdlBlocked && releaseBlockers.length) {
  throw new Error('production DDL cannot be unblocked while productionReleaseBlockers remain');
}
if (manifest.productionDdlBlocked && releaseBlockers.length === 0) {
  throw new Error('productionDdlBlocked is true but no explicit productionReleaseBlockers are recorded');
}

const snapshotRaw = process.env.KSP_DATABASE_LINEAGE_SNAPSHOT;
if (snapshotRaw) {
  const snapshot = JSON.parse(snapshotRaw);
  if (snapshot.projectRef !== manifest.targetProjectRef) {
    throw new Error('lineage snapshot targets the wrong Supabase project');
  }
  const liveOnly = snapshot.liveOnlyMigrations ?? [];
  const unexpected = liveOnly.filter((name) => !accepted.includes(name));
  const missing = accepted.filter((name) => !liveOnly.includes(name));
  if (unexpected.length || missing.length) {
    throw new Error(
      `database lineage differs from the reviewed manifest; unexpected=[${unexpected.join(', ')}] missing=[${missing.join(', ')}]`
    );
  }
}

console.log(
  `Database-lineage preflight passed: ${accepted.length} live-only migration(s) explicitly classified; production DDL ${manifest.productionDdlBlocked ? `blocked by ${releaseBlockers.length} release gate(s)` : 'eligible for controlled promotion'}.`
);
