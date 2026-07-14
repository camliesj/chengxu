export function findLegacyImportCandidates(localRecords, cloudRecords, companyId) {
  const cloudIds = new Set((cloudRecords || []).map((record) => record?.id).filter(Boolean));
  const candidateIds = new Set();
  return (localRecords || []).filter((record) => {
    if (!record?.id || (record.companyId || 'tongda') !== companyId) return false;
    if (cloudIds.has(record.id) || candidateIds.has(record.id)) return false;
    candidateIds.add(record.id);
    return true;
  });
}
