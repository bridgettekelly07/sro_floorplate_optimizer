/* ==== the compensation range, table and citation ==== */
  function renderDisplacement(ev) {
    var h = "";
    h += '<p>' + ev.lost + ' room' + (ev.lost === 1 ? " is" : "s are") + ' lost outright. Of the '
      + ev.candidates + ' permanent resident' + (ev.candidates === 1 ? "" : "s")
      + ' in rooms this scheme converts, <strong>' + ev.rehoused + '</strong> can be re-housed in the '
      + 'surviving units under the right of first refusal and <strong>' + ev.displaced
      + '</strong> must leave.</p>';
    h += '<div class="cite">' + CITE.refusal[0] + ' &mdash; <em>&ldquo;' + CITE.refusal[1] + '&rdquo;</em></div>';

    if (!ev.displaced) {
      h += '<p class="note" style="margin-top:14px">No tenancy is terminated by this scheme, so '
        + 's.4.8(i) compensation is not engaged.</p>';
      document.getElementById("displacement").innerHTML = h;
      return;
    }

    var span = ev.high - ev.low;
    var axisMax = Math.max(ev.allMonths, ev.high) * 1.08 || 1;
    var lo = (ev.low / axisMax) * 100, hi = (ev.high / axisMax) * 100;
    var allPos = (ev.allMonths / axisMax) * 100;

    h += '<div class="panel-head" style="margin-top:18px"><h2>Compensation owed</h2>'
      + '<span class="label">Months’ rent</span></div>';
    h += '<div class="rangebar"><div class="span" style="left:' + lo.toFixed(2) + '%;width:'
      + Math.max(hi - lo, 0.6).toFixed(2) + '%"></div>'
      + '<div class="tick" style="left:' + allPos.toFixed(2) + '%"></div></div>';
    h += '<div class="rangelabels"><span>' + ev.low + ' mo &mdash; the ' + ev.displaced
      + ' shortest tenancies</span><span>' + ev.high + ' mo &mdash; the ' + ev.displaced + ' longest</span></div>';
    h += '<p style="margin-top:12px;font-size:20px;font-family:\'IBM Plex Sans Condensed\',sans-serif;'
      + 'font-weight:600;font-variant-numeric:tabular-nums">'
      + (span === 0 ? ev.low + " months’ rent" : ev.low + "–" + ev.high + " months’ rent")
      + '</p>';

    if (span > 0) {
      h += '<p class="note">The by-law grants the right of first refusal without ranking tenants by '
        + 'tenancy length, need, or any other criterion, so <strong>which</strong> tenants leave is not '
        + 'derivable from the sources. The range is the output; a single total would assert more than '
        + 'the sources support. The dashed mark is ' + ev.allMonths + ' months — what would be owed '
        + 'if every tenant in a converted room were displaced.</p>';
    }

    h += '<table class="sched"><thead><tr><th>Room</th><th>Tenancy (yr)</th>'
      + '<th>Months’ rent</th><th>Status</th></tr></thead><tbody>';
    floors.forEach(function (fl, fi) {
      fl.rooms.forEach(function (r) {
        if (!isResident(r)) return;
        var converted = !r.keep;
        var name = (floors.length > 1 ? (fi + 1) + "–" : "") + r.id;
        h += '<tr><td>' + name + '</td><td>' + (Math.round(r.tenancy * 100) / 100) + '</td><td>'
          + compensationMonths(r.tenancy) + '</td><td' + (converted ? ' class="gone"' : '') + '>'
          + (converted ? "at risk" : "stays") + '</td></tr>';
      });
    });
    h += '</tbody></table>';
    h += '<div class="cite" style="margin-top:8px">' + CITE.comp[0] + ' &mdash; <em>&ldquo;'
      + CITE.comp[1] + '&rdquo;</em></div>';
    h += '<p class="note">Compensation is owed to every <strong>permanent resident</strong> — '
      + 'occupancy as a residence for at least ' + RESIDENT_MIN_DAYS + ' days (s.1.2) — whose tenancy the work terminates.</p>';

    document.getElementById("displacement").innerHTML = h;
  }
