# Annotated Source Passages

## 1. SRA Guidelines: room-count and area math (p.4)

> "Converted SRA rooms that are at least 200 SF will be removed from the SRA By-law, subject to Council approval. If a minimum of 200 SF for a converted room cannot be achieved, an average of 200 SF across all converted rooms will be considered for removal from the SRA By-law. To enable the conversion of rooms to self-contained units, a reduction to the total number of rooms, up to a maximum of 50%, will be considered."

Sets two independent numeric tests applied to a conversion project:

- **Size test:** each converted unit > 200 SF (net), or the average across all converted units in the project > 200 SF if an individual unit falls short.
- **Room-count test:** the number of rooms may shrink, but by no more than 50% of the original count.

Both are framed as "will be considered": i.e., ceilings/conditions for eligibility, not entitlements. Council approval is still required regardless of whether the numbers pencil out.

## 2. SRA Guidelines: unit design requirements (p.5–6)

> "The sleeping area may be located in a wall recess away from the main living area, but the space must remain contiguous with the main living area and not be enclosed. A sleeping area located in the main living area must include built-in hide-a-beds and fold-down kitchen tables that consider day and night uses of the space."

> "A complete bathroom must be provided which is equipped with a washbasin, toilet, and a shower and/or bath. Bathrooms must be physically separated from the remainder of the room by partitions and a door to ensure privacy and to isolate noise and odours."

> "Each upgraded SRA room must include cooking facilities such as a sink, ample counter space for food preparation, a cook top and modestly sized refrigerator with freezer. The fridge and freezer combination must be a minimum 12 cubic foot unit with a footprint of 24" x 24" and bulk food storage options."

Sets physical program elements that consume floor area inside each converted unit but are not directly part of the room-count/area math.

## 3. DTES Plan: replacement ratio, Policy 9.2.7 (p.103)

> "On redevelopment of sites with existing SRO rooms, aim to replace with self-contained social housing units on a 1 for 1 basis. In cases where 1 for 1 replacement is not achievable due to financial or development constraints, ensure that a minimum of 80% of rooms are replaced with self-contained social housing or the percentage of social housing required under zoning for inclusionary housing, whichever is greater. For conversion of SRO rooms to self-contained units, ensure a minimum of 50% of rooms are replaced."

A separate constraint from the SRA Guidelines' 50% reduction cap, and it is stated as a floor, not a ceiling. SRA Guidelines cap the room-count reduction at 50%; DTES 9.2.7 requires that at least 50% of rooms be replaced with self-contained units. (Numerically the same ratio, framed from opposite directions; see Open Questions below.)

## 4. DTES Plan: unit size flexibility, Policy 9.2.11 (p.103)

> "For conversion of existing SRO rooms to self-contained units, units in this project must average a minimum of 200 SF (net) and adhere to the Policies and Guidelines for Converting SRA-Designated Rooms to Self-Contained Units to be considered for removal from the SRA By-Law."

Confirms the DTES Plan and the SRA Guidelines are meant to be read together.

## 5. DTES Plan: tenant displacement trigger, Policy 9.5.1 and 9.5.4 (p.107)

> "Where tenants will be displaced due to redevelopment, a tenant relocation plan as outlined in the Tenant Relocation and Protection Policy (TRPP) will be required at rezoning or development permits..."

> "In the case of redevelopment of SRA-designated rooms, tenant protection and relocation requirements per the Single Room Accommodation By-law will apply."

Any net loss of occupied rooms through conversion is a displacement event that requires a relocation plan. Policy 9.5.4 specifically routes SRA-room redevelopment to the SRA By-law's own relocation mechanism rather than to the general TRPP.

See passages 7–8 below for the SRA By-law's own relocation and compensation mechanism referenced here.

## 6. DTES Plan: alternative relocation approaches, Policy 9.5.3 (p.107)

> "In case where affordable replacement accommodation...is not available, alternative tenant relocation approaches may be considered. Acceptable alternative approaches may include: (a) Providing right of first refusal for tenants to return to the new building at their same rent or rents affordable to them, along with temporary rent top-ups for the interim period while redevelopment occurs; or (b) Other solutions as deemed acceptable to the City."

This suggests that even where room count shrinks, displacement need not be permanent for tenants who can be housed in the surviving self-contained units (right-of-first-refusal effectively re-houses some of the original tenants inside the smaller unit count).

The tool should distinguish **"rooms lost"** (a design/regulatory number: original count − new unit count) from **"tenants permanently displaced"** (a smaller number, since surviving units can absorb some original tenants).

*Open item: how to quantify the permanently-displaced number, not yet resolved (see README, Open Questions).*

## 7. SRA By-law No. 8733: definition of "conversion" (s.1.2)

> "'conversion' or 'convert' means: (a) a change in the form of occupancy, intended form of occupancy, or customary form of occupancy of a designated room from living accommodation for a permanent resident to living accommodation for a transient guest or to another purpose... (e) a repair or alteration to a designated room or any improvement or fixture in it... except for repairs or alterations that are minor in nature and have no material effect on the enjoyment by permanent residents..."

This is the operative legal definition of "conversion" that the SRA Guidelines and DTES Plan assume but do not themselves define. It confirms that physically combining rooms into self-contained units, the operation this tool models, falls under (e): an alteration with a material effect on permanent residents' living accommodation, triggering the permit requirement below.

## 8. SRA By-law No. 8733: permit requirement (s.4.1, s.4.1A)

> "A person must not... attempt to convert or demolish a designated room; or convert or demolish a designated room; unless the owner: (d) obtains a conversion or demolition permit; (e) complies with this By-law; and (f) fulfils all conditions required..."

Confirms the "Council approval is still required regardless of whether the numbers pencil out" note in passage 1: passing the SRA Guidelines' size and room-count tests is a *precondition* for the permit, not a substitute for it. Section 4.1A adds that a permit is required even if the conversion happens before the application is submitted.

## 9. SRA By-law No. 8733: relocation and compensation conditions (s.4.8(f)–(g))

> "...ensures that comparable or better accommodation is provided to every tenant displaced by the conversion or demolition so that: (A) if the tenant was paying rent geared to income through a government program, at a rent no higher than was being paid; or (B) for all other tenants, at a rent no higher than 30% of the tenant's income or the tenant's previous rent, whichever is lower... gives the permanent resident re-located... the first right of refusal to rent the replacement rooms..."

This is the SRA By-law's own version of the right-of-first-refusal mechanism referenced generally in DTES Policy 9.5.3 (passage 6): here it is a *permit condition* the General Manager can attach, not just an available option. It gives a concrete standard for "comparable accommodation" (rent capped at 30% of income or previous rent, whichever is lower) that the tool could use to define what counts as a tenant being successfully re-housed vs. permanently displaced.

## 10. SRA By-law No. 8733: displacement compensation schedule (s.4.8(i))

> "...provide every permanent resident whose tenancy is terminated as a result of the work contemplated by the permit with the actual costs of moving... and additional compensation based on the length of tenancy... (i) 4 months' rent for tenancies up to 5 years, (ii) 5 months' rent for tenancies over 5 years and up to 10 years, (iii) 6 months' rent... over 10 and up to 20 years, (iv) 12 months'... over 20 and up to 30 years, (v) 18 months'... over 30 and up to 40 years, and (vi) 24 months'... over 40 years."

A concrete, tenancy-length-indexed compensation schedule: this is a genuinely computable output (given a displaced tenant's tenancy length, output the required compensation in months' rent) and could give the "tenants permanently displaced" question from passage 6 an actual number to attach to, rather than leaving it as pure judgment.

## 11. SRA By-law No. 8733: small-scale exemption (s.4.3A)

> "...an owner may also apply to the General Manager of Arts, Culture and Community Services for a permit approving the conversion or demolition of designated rooms in a building if the work approved by the permit will result in the loss of no more than 3 designated rooms in the building and the work will, in the opinion of the General Manager, result in improved livability or operations of the building and secure affordability of the converted or demolished rooms."

A de minimis threshold that operates independently of the SRA Guidelines' percentage-based tests: a loss of ≤3 rooms can route through a simpler General Manager approval regardless of what percentage that represents of the building's total room count. This is a useful **boundary case** for the tool. For example, a 6-room building losing 3 rooms is a 50% reduction (right at the SRA Guidelines cap) but may also qualify for this separate small-building exemption.

## 12. SRA By-law No. 8733: "permanent resident" and "transient guest" (s.1.2)

> "'permanent resident' means an individual who, in return for rent, occupies or usually occupies a room as his or her residence, and does so for at least 30 days;"

> "'transient guest' means a tourist, hosteller, or other individual who, in return for rent, occupies a room on a transient basis for business or pleasure, and not as his or her residence, and does so for fewer than 30 days."

The relocation and compensation conditions at s.4.8 (passages 9–10) are owed to *permanent residents* specifically, so this definition fixes who the tool's displacement and compensation outputs actually cover. The threshold is only 30 days, low enough that any occupied tenancy the tool is likely to encounter qualifies, including the sub-year tenancies (8 and 10 months) in Case 3 of the README's hand-worked example.

The same 30-day line separates the two categories used in the "conversion" definition at passage 7(a): shifting a room from permanent-resident accommodation to transient-guest accommodation is itself a conversion requiring a permit, with no physical alteration involved at all.

## 13. SRA By-law No. 8733: definition of "room" (s.1.2)

> "'room' may include one or more connecting rooms, cooking facilities, or bathroom facilities used, intended to be used, or customarily used as one unit;"

This is the definitional basis for the room-count arithmetic the tool performs. Because connecting rooms used as a single unit count as one "room," merging two designated rooms into one self-contained unit genuinely reduces the room count by one: a 10-room floor becomes 5 rooms after pairwise conversion, rather than remaining 10 rooms that happen to be joined. Without this clause the reduction percentages in the SRA Guidelines (passage 1) would have no stable denominator.

Two features worth noting. The definition is permissive ("may include," not "is"), and it turns on *use* rather than geometry: the test is whether the connected spaces are "used, intended to be used, or customarily used as one unit." It also expressly contemplates that a single room includes its own cooking and bathroom facilities, which is consistent with the self-contained unit the SRA Guidelines require at passage 2.
