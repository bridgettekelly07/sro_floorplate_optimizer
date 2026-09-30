/* ==== the unit size that follows the scheme ==== */
  // the largest proposed unit drives the rent test, so it follows the
  // scheme actually drawn rather than a number typed twice
  var unitTouched = false;
  function syncUnitSize(ev) {
    var el = document.getElementById("r-unit-sf");
    var src = document.getElementById("r-unit-src");
    if (!el) return;
    if (!unitTouched && ev.units.length) {
      var biggest = Math.max.apply(null, ev.units.map(function (u) { return u.area; }));
      el.value = Math.round(biggest);
      src.textContent = "Following the largest unit in the scheme below";
    } else if (unitTouched) {
      src.textContent = "Set by hand; edit the scheme below to take it back over";
    }
    renderAfford();
  }

/* ==== the affordability test and the input wiring ==== */
  function renderAfford() {
    var rent = num(document.getElementById("r-existing").value);
    var rsf = num(document.getElementById("r-existing-sf").value) || 100;
    var income = num(document.getElementById("r-income").value) || 0;
    var usf = num(document.getElementById("r-unit-sf").value) || 200;
    var out = document.getElementById("afford-out");

    if (!rent) {
      out.innerHTML = '<p class="note">Enter the rent of one existing SRO room, or start from a '
        + 'survey average. The City reports SRO rents in aggregate, never per building, so a '
        + 'building-specific figure is yours to supply.</p>'
        + '<div class="btnrow"><button type="button" data-rent="' + SURVEY.rentMarket + '">'
        + 'Use private average, ' + money(SURVEY.rentMarket) + '</button>'
        + '<button type="button" data-rent="' + SURVEY.rentNonMarket + '">'
        + 'Use public average, ' + money(SURVEY.rentNonMarket) + '</button></div>'
        + '<div class="kv"><dt>Shelter component, BC income assistance (single person)</dt><dd>'
        + money(SHELTER_RATE) + '/mo</dd>'
        + '<dt>30% of the income entered</dt><dd>' + money(income * 0.3) + '/mo</dd></div>'
        + '<p class="src">The 30% figure is the by-law’s own test at s.4.8(f): comparable '
        + 'accommodation is rent no higher than 30% of the tenant’s income, or their previous '
        + 'rent, whichever is lower. Averages and the shelter component: 2024 SRO Tenant Survey, '
        + 'City of Vancouver.</p>';
      Array.prototype.forEach.call(out.querySelectorAll("[data-rent]"), function (b) {
        b.addEventListener("click", function () {
          document.getElementById("r-existing").value = b.getAttribute("data-rent");
          renderAfford();
        });
      });
      return;
    }

    var perSf = rent / rsf;                 // $/SF/month of the existing room
    var projected = perSf * usf;            // the converted unit at the same $/SF
    var ceilings = [
      { who: "30% of income (s.4.8(f))", amt: income * 0.3,
        src: "SRA By-law s.4.8(f) — the by-law’s own comparable-accommodation test" },
      { who: "Previous rent (s.4.8(f))", amt: rent,
        src: "The same clause caps at the previous rent when that is lower" },
      { who: "Shelter component alone", amt: SHELTER_RATE,
        src: "BC income assistance, shelter portion for a single person" }
    ];
    var ceiling = Math.min.apply(null, ceilings.slice(0, 2).map(function (c) { return c.amt; }));
    var scale = Math.max(projected, rent, ceilings[0].amt, SHELTER_RATE) * 1.12;

    var h = '<div class="hero">' + money(projected) + '<span style="font-size:15px">/mo</span></div>'
      + '<div class="hero-sub">what a ' + fmt(usf) + ' SF converted unit rents for at this '
      + 'building’s existing rate of $' + perSf.toFixed(2) + '/SF</div>';

    h += '<div class="bars" style="margin-top:18px">';
    ceilings.forEach(function (c) {
      var pass = projected <= c.amt + 0.5;
      var w = Math.max(1, Math.min(100, c.amt / scale * 100));
      h += '<div class="bar-row">'
        + '<div class="bar-label"><span class="who">' + c.who + '</span>'
        + '<span class="amt">' + money(c.amt) + '/mo</span></div>'
        + '<div class="bar-track">'
        + '<div class="bar-fill" style="width:' + w.toFixed(1) + '%;background:var(--'
        + (pass ? 'pass-soft' : 'fail-soft') + ')"></div>'
        + '<div class="bar-cap" style="left:' + Math.min(100, projected / scale * 100).toFixed(1) + '%">'
        + '</div></div>'
        + '<div class="verdict-row"><span class="dot" style="background:var(--'
        + (pass ? 'pass' : 'fail') + ')"></span>'
        + '<span class="' + (pass ? 'gap-ok' : 'gap-bad') + '">'
        + (pass ? "Within this ceiling" : money(projected - c.amt) + "/mo above this ceiling")
        + '</span></div>'
        + '<div class="src">' + c.src + '</div>'
        + '</div>';
    });
    h += '</div>';
    h += '<p class="src" style="margin-top:12px">The dashed line on each bar is the converted unit’s '
      + 'rent, ' + money(projected) + '/mo. Bars are one measure on one scale: dollars per month.</p>';

    h += '<div class="kv"><dt>Existing room</dt><dd>' + money(rent) + '/mo · ' + fmt(rsf) + ' SF</dd>'
      + '<dt>Rate</dt><dd>$' + perSf.toFixed(2) + '/SF/mo</dd>'
      + '<dt>Converted unit</dt><dd>' + fmt(usf) + ' SF</dd>'
      + '<dt>Rent ceiling that binds</dt><dd>' + money(ceiling) + '/mo</dd>'
      + '<dt>Rate the unit must hit to stay under it</dt><dd>$' + (ceiling / usf).toFixed(2) + '/SF/mo</dd>'
      + '</div>';

    var drop = 1 - (ceiling / usf) / perSf;
    h += '<p class="src" style="margin-top:14px">For scale, the 2024 SRO Tenant Survey found an '
      + 'average rent of ' + money(SURVEY.rentMarket) + '/mo in private SROs and '
      + money(SURVEY.rentNonMarket) + '/mo in public SROs, against a shelter component of '
      + money(SHELTER_RATE) + ' \u2014 market rents rose 46% between 2013 and 2024 while that '
      + 'component rose 33%. Only ' + Math.round(SURVEY.privateBathroom * 100) + '% of tenants '
      + 'reported a private bathroom, which is why a converted unit has to add the pods drawn '
      + 'in section 02.</p>';
    h += '<p class="note">' + (drop > 0
      ? "Holding this tenant at the by-law’s ceiling in a " + fmt(usf) + " SF unit means letting the "
        + "rate fall " + Math.round(drop * 100) + "% below what the room earns today. That gap is what a "
        + "subsidy, a grant or an inclusionary requirement has to cover — conversion does not close "
        + "it by itself."
      : "At this rate the converted unit stays within the binding ceiling without further subsidy.")
      + '</p>';
    out.innerHTML = h;
  }

  ["r-existing", "r-existing-sf", "r-income", "r-unit-sf"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", renderAfford);
  });
  ["u-count", "u-sf", "u-circ", "u-floors"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", renderBreakdown);
  });
  document.getElementById("u-apply").addEventListener("click", applyBreakdown);
