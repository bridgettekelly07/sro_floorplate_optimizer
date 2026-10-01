# Source Documents

## Primary Sources

The three documents the tool's tests are built from.

| Source | Type | Authority | Version |
|---|---|---|---|
| *Policies and Guidelines for Converting SRA-Designated Rooms to Self-Contained Units* | City of Vancouver design guideline | Council-approved policy document, referenced by the DTES Plan as the governing standard for SRA room conversions | Approved March 15, 2014; last amended February 3, 2026 |
| *Downtown Eastside Plan* (2014), Section 9.0 Housing | Statutory/policy area plan (Council-adopted) | Higher-order plan; sets housing-replacement policy that the SRA Guidelines implement in physical/design terms | Adopted 2014; document as provided |
| *Single Room Accommodation By-law No. 8733* | City of Vancouver by-law (Vancouver Charter authority) | Legally binding regulation, the only source in this project with the force of law. Governs designation, exemption, conversion/demolition permitting, and tenant relocation conditions for SRA rooms. Referenced by DTES Plan Policy 9.5.4 as the mechanism for SRA-specific tenant protection | Enacted October 21, 2003; consolidated to include By-law No. 14593, effective February 3, 2026 |

## Procedural and Engagement Record

Neither document below states a rule. Both are evidence about the primary sources — what was proposed for them, and when.

| Source | Type | Authority | Version |
|---|---|---|---|
| *Public Hearing — Summary and Recommendation*, Item 1: *Downtown Eastside Housing Implementation* | City of Vancouver Council public hearing document | Procedural, not regulatory: the list of resolutions put to Council, not the text of any amendment. Cited only as evidence that all three primary sources were amended together | Public hearing December 9, 2025 (`phea1sr.pdf`) |
| *Downtown Eastside Housing Implementation* — public engagement handout | City of Vancouver public consultation material | Lowest authority here and the only non-Council document: plain-language proposals put out for consultation, not a draft by-law. Cited for what was proposed, never as a rule | May 12 information session (`dtes-housing-summary.pdf`); superseded by the December 9, 2025 hearing |
| *2024 SRO Tenant Survey* | City of Vancouver survey report | Empirical, not regulatory: it sets no threshold and grants no right. It is the only source here that measures the stock rather than governing it, and the tool uses it for reference values — average rents, tenancy length, the shelter component — never for a test. Findings are reported in aggregate, but **Appendix B lists every building by name and address** with its room count and survey count — the only building-level SRO inventory this project has found, and the basis of the map | Fieldwork 2024; 133 buildings surveyed of 141 SRA-designated, 908 tenants (`sro-tenant-survey-2024.pdf`) |

## Base Data

The map's geometry is City of Vancouver open data, used as drawing and matching material rather than
as authority. None of it states a rule, and none of it is specific to SROs.

| Dataset | Used for |
|---|---|
| *Public streets* (`public-streets`) | the street grid, and the hundred-block centroids that place an address without an external geocoder |
| *Property parcel polygons* (`property-parcel-polygons`) | the lot outline and area for each SRO building, matched by exact civic address — 136 of 143. The other seven are not registered civic addresses; each was matched by hand to the nearest registered number on the same side of the street, or to the corner lot the address falls on (Arco Hotel → 83 W Pender; 630 E Georgia → 628; Alexander Apartments → 322 Woodland; Alexander Court → the corner lot registered as 189 Columbia; St. Elmo → 425 Campbell; May Wah → the five lots 252–266 E Pender taken together; Vet's Rooms → the corner lot registered as 257 E Hastings). Recorded in the data file's `parcelNote`; these are judgments, not matches |
| *Building Footprints 2015* (`building-footprints-2015`) | the figure-ground the map is drawn on |
| *Building Footprints 2009* (`building-footprints-2009`), field `hgt_agl` | the LiDAR-derived height above ground of each footprint, which the 3D view extrudes to. Each 2015 footprint takes the height of the 2009 footprint containing its centroid, or the nearest within 12 m; 571 of 5,023 have none (built after 2009, or no return) and stand at a nominal 4 m. Each SRO takes the height of the footprint under its parcel centroid: 134 of 143 |
| *Building Footprints 2009*, the parts themselves | the massing of each SRO in the 3D view: every LiDAR-measured footprint part whose centroid falls inside the building's 2015 footprint or its parcel, at its own height and with its `rooftype` (120 of 143 buildings; the rest fall back to the single 2015 footprint under the parcel centroid, including the seven matched by hand). A building drawn from parts shows a rear wing or a lower annex at its measured height rather than one block |
| *Public streets*, again | which footprint edges front a street, and so carry a generated elevation: within 24 m of a centreline, within 25 degrees of parallel, street on the outward side. 206 edges across the stock |
| *Public streets*, again | the street surfaces in both maps: each centreline drawn at a pavement width by its street use (13 m arterial, 11 m secondary, 8.5 m residential) with a 2.5 m sidewalk band either side. The widths are a drawing convention, not a survey of curbs |
| *Shoreline 2002* (`shoreline-2002`) | the water: its two linestrings joined into the land polygon, clipped to the map extent and simplified to about 1.5 m (`web/data/dtes-ground.json`) |
| *Lanes* (`lanes`) | the lanes within the map extent, drawn at 5 m |
| *Parks* (`parks-polygon-representation`) | park polygons within the map extent, drawn as flat ground |
| *Heritage sites* (`heritage-sites`) | the Vancouver Heritage Register entry for an SRO, matched by civic number within the register's number or range on the same street (45 of 143). Supplies the evaluation group, the register's own building name where it differs from Appendix B, and designation flags. Appendix B's 'Rice Block' at 160 E Hastings is the register's 'Regent Hotel'; both names are shown |

Four cautions. **The elevations were generated, not surveyed, and are no longer drawn.** An earlier version dressed each street-facing edge in the type the stock shares (a retail ground floor under a storefront, punched windows on a 3.3 m bay, a belt course and a cornice); the masses now stand plain with a storey line at each floor level, because no source records any building's windows, and the register entry on the record is the place to check what the building actually is. A **storey count is not measured anywhere**: the tool reads one from the LiDAR height at an assumed 3.4 m floor to floor, and labels it an estimate wherever it appears. A **parcel is the lot, not the building**: an area taken from it is the site, and the
floorplate derived from it in the tool is an assumption the user is expected to correct. And the
City's non-market housing dataset, the obvious place to look for this stock, **explicitly excludes**
single room accommodation — which is why the building list had to come from Appendix B of the survey
rather than from open data.

## City open data drawn by the map

All from the City of Vancouver Open Data portal under the Open Government Licence - Vancouver, rebuilt by
`tools/city-data.py` for a context extent wider than the stock: the downtown peninsula, False Creek and the
blocks east to Clark Drive. Retrieved 2026-09-30. None of these is a source for any rule; they are the
ground the stock stands on.

| Dataset | Dataset id | Used for |
|---|---|---|
| Elevation contour lines - 1-metre contours | `elevation-contour-lines-1-metre-contours` | the terrain: a heightfield interpolated between the two nearest contour levels at each 15 m cell, and every second contour drawn on it |
| Shoreline 2002 | `shoreline-2002` | the land: the shoreline flood-filled from known land on a 6 m grid; everything else is water |
| Building Footprints 2009 | `building-footprints-2009` | the city around the surveyed extent, every footprint at its LiDAR height; and the measured parts of each SRO's massing |
| Building Footprints 2015 | `building-footprints-2015` | the surveyed extent's footprints, which the SRO records index into |
| Public streets | `public-streets` | the street centrelines by use, drawn at a pavement width with a sidewalk band and a curb line |
| Sidewalk condition rating 2021 | `sidewalk-condition-rating` | the centreline of each sidewalk segment, for where the sidewalks are; the condition rating is not used |
| Lanes, Parks | `lanes`, `parks-polygon-representation` | the lanes and the parks |
| Public trees | `public-trees` | every street and park tree the City maintains, at the height class and trunk diameter it records |
| Property parcel polygons | `property-parcel-polygons` | the lot under each SRO, matched by civic address |

## Note on Currency

All three primary sources were put to Council for amendment at the December 9, 2025 public hearing, as one exercise aimed at accelerating SRO replacement: the SRA By-law "to improve tenant protections" (Recommendation E), the DTES Plan (G), and the Guidelines for the *Upgrade* of designated rooms (H). The substance of each sits in appendices to the Report that are not part of the summary, so it establishes that the sources moved, not how.

Two open risks follow. **Recommendation E is aimed at s.4.8**, where the compensation schedule this tool computes from lives. And **the guideline named is not obviously the one used** — this project is built on the Guidelines for *Converting* SRA-designated rooms, and the 200 SF and 50% thresholds appear nowhere in the summary. Both are settled by checking the enacted texts, not by these documents.

The versions recorded above both take effect February 3, 2026, about eight weeks after the hearing. That is consistent with these recommendations having been enacted — which would mean the tool already reads the amended text — but it is an inference from two dates, not a statement either document makes.

## Note on Authority

The SRA Guidelines are a design guideline document; its numeric thresholds (200 SF avg., 50% max room reduction) are administrative criteria for SRA By-law removal, not the SRA By-law itself. The DTES Plan is *policy* that Council uses in decision-making at rezoning/development permit stage; it is not a by-law provision with the same legal force as a zoning regulation, but Section 9.2.7 and Section 9.5 policies are explicitly applied as conditions of approval.

For the purposes of this tool, both are treated as binding design constraints, while flagging that "policy" language ("aim to," "encourage," "consider") throughout Section 9 signals discretionary application by Council or the General Manager of Arts, Culture and Community Services, not a mechanical pass/fail test.

The SRA By-law sits above both in legal force: it is an enacted by-law under the Vancouver Charter, not a design guideline or policy. It is what actually requires a conversion/demolition permit, defines "conversion," and attaches the relocation and compensation conditions the General Manager may impose (sections 4.1, 4.8): the actual legal mechanism that the DTES Plan's Policy 9.5.4 points to. The SRA Guidelines' numeric thresholds function as administrative criteria evaluated *within* that by-law's permit process, not as a substitute for it; passing them does not remove the underlying permit requirement.

Note also a scale distinction the By-law introduces that the SRA Guidelines and DTES Plan do not: Section 4.3A allows a simplified administrative permit path (to the General Manager rather than Council) when a conversion results in the loss of **3 or fewer** designated rooms, a much smaller threshold than the Guidelines' 50% reduction ceiling, and worth checking against in any worked example that stays close to that boundary.
