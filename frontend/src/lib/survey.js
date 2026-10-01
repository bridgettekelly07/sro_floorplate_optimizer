// 2024 SRO Tenant Survey, City of Vancouver. Aggregate figures only: the
// survey reports no building names or addresses, so none of this places a
// point on the map. It is the reference layer behind Appendix B.
export const SURVEY = Object.freeze({
  year: 2024,
  buildings: 133,          // buildings surveyed
  respondents: 908,
  marketBuildings: 76,
  marketRooms: 3083,       // rooms in those buildings
  rentMarket: 640,         // average monthly rent, market SROs
  rentNonMarket: 426,      // average monthly rent, non-market SROs
  rent2013Market: 439,
  tenancyYears: 4.6,       // average length of time at address
  privateBathroom: 0.19
});
export const SHELTER_RATE = 500;   // shelter component of BC income assistance, single person, 2024

export function typicalRent(b) {
  return b.tenure === "market" ? SURVEY.rentMarket : SURVEY.rentNonMarket;
}
