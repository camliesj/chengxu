export async function refreshCompanyArchives({ companyId, session, fetchVehicles, fetchPolicies }) {
  const [vehicles, policies] = await Promise.all([
    fetchVehicles(session),
    fetchPolicies(session),
  ]);
  return {
    companyId,
    vehicles,
    policies,
  };
}
