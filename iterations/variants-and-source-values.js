/* ==== the Source values button under the sliders ==== */
          <div class="btnrow" style="margin-top:4px">
            <button type="button" id="t-source" title="Put every threshold back to the source's value, and the assumptions to the tool's">Source values</button>
            <span class="hint-s" id="t-note"></span>

/* ==== Keep as variant and Source values in the policy section ==== */
        <div class="btnrow" style="margin-bottom:12px">
          <button type="button" id="d-keep" title="Keep these thresholds as a variant to compare against others">Keep as variant</button>
          <button type="button" id="d-source" title="Put every threshold back to the source's value">Source values</button>
          <span class="hint-s" id="d-policy-note"></span>
        </div>

/* ==== the variants table ==== */
        <div class="label out-head">Variants</div>
        <div id="d-variants"></div>

/* ==== rendering the variants table ==== */
    // variants: the thresholds kept, each with what it does, and the current one last
    var vh = '<table class="dist"><thead><tr><th>Variant</th><th>Thresholds</th><th class="n">Convert</th><th class="n">Units</th><th class="n">Displaced</th><th class="n">Council</th><th class="n">Compensation</th><th></th></tr></thead><tbody>';
    VARIANTS.forEach(function (v, k) {
      vh += '<tr class="pick" data-v="' + k + '" title="Load these thresholds"><td>' + esc(v.label) + '</td><td>' + esc(policyText(v.policy, v.strict)) + ' · ' + esc(v.scope === "market" ? "private" : v.scope === "nonmarket" ? "public" : "all") + '</td>'
        + '<td class="n">' + v.out.convert + '/' + v.out.of + '</td><td class="n">' + v.out.units.toLocaleString("en-CA") + '</td><td class="n">' + v.out.lost.toLocaleString("en-CA") + (v.out.tenants ? ' · ' + pct(v.out.lost / v.out.tenants) : '') + '</td>'
        + '<td class="n">' + v.out.council + '</td><td class="n">' + money(v.out.comp) + '</td><td class="n"><button type="button" data-rm="' + k + '" title="Remove this variant" style="padding:1px 6px">×</button></td></tr>';
    });
    vh += '<tr><td><em>now</em></td><td>' + esc(policyText(inp.policy, inp.strict)) + ' · ' + esc(inp.scope === "market" ? "private" : inp.scope === "nonmarket" ? "public" : "all") + '</td>'
      + '<td class="n">' + out.convert + '/' + out.of + '</td><td class="n">' + out.units.toLocaleString("en-CA") + '</td><td class="n">' + out.lost.toLocaleString("en-CA") + (out.tenants ? ' · ' + pct(out.lost / out.tenants) : '') + '</td>'
      + '<td class="n">' + out.council + '</td><td class="n">' + money(out.comp) + '</td><td></td></tr></tbody></table>'
      + '<p class="src">' + (VARIANTS.length ? 'Click a variant to load its thresholds. ' : 'Keep the current thresholds as a variant to compare against the next set. ') + 'Variants stay in this browser.</p>';
    var vEl = document.getElementById("d-variants");
    vEl.innerHTML = vh;
    vEl.querySelectorAll("tr.pick").forEach(function (tr) {
      tr.addEventListener("click", function (e) {
        if (e.target.closest("[data-rm]")) return;
        var v = VARIANTS[parseInt(tr.getAttribute("data-v"), 10)];
        writePolicy(v.policy);
        document.getElementById("d-scope").value = v.scope;
        document.getElementById("d-read").value = v.strict ? "strict" : "average";
        districtCands = null; renderDistrict();
      });
    });
    vEl.querySelectorAll("[data-rm]").forEach(function (btn) {
      btn.addEventListener("click", function () { VARIANTS.splice(parseInt(btn.getAttribute("data-rm"), 10), 1); saveVariants(); renderDistrict(); });
    });

/* ==== the Keep as variant and Source values handlers ==== */
  document.getElementById("d-keep").addEventListener("click", function () {
    var inp = districtInputs(), cands = candidatesFor(inp.scope, inp.strict, inp.policy), out = policyOutcome(cands, inp.scope);
    VARIANTS.push({ label: letter(VARIANTS.length), scope: inp.scope, strict: inp.strict, policy: inp.policy,
                    out: { convert: out.convert, of: out.of, units: out.units, lost: out.lost, tenants: out.tenants, council: out.council, comp: out.comp } });
    saveVariants(); renderDistrict();
  });
  document.getElementById("d-source").addEventListener("click", function () {
    writePolicy(SOURCE_POLICY); districtCands = null; renderDistrict();
  });

/* ==== the Source values handler under the sliders ==== */
    document.getElementById("t-source").addEventListener("click", function () {
      planView = "proposed";
      writePolicy(SOURCE_POLICY);
      document.getElementById("d-read").value = "average";
      document.getElementById("d-cap").value = DEFAULTS["d-cap"]; document.getElementById("d-circ").value = DEFAULTS["d-circ"];
      districtCands = null; districtReady(); sync();
    });

/* ==== the store of kept variants ==== */
  var VARIANTS = [];        // sets of thresholds kept for comparison
  function loadVariants() { try { VARIANTS = JSON.parse(localStorage.getItem("sro.variants") || "[]"); } catch (e) { VARIANTS = []; } }
  function saveVariants() { try { localStorage.setItem("sro.variants", JSON.stringify(VARIANTS)); } catch (e) {} }

