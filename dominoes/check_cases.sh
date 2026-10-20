#!/bin/sh
# check_cases.sh: rerun every evaluation case and diff it against cases/.
# Exit 0 when every output matches, 1 otherwise. Run from dominoes/.
# A case output changes only when a rule changes; commit that change on its
# own with a message naming the rule (CLAUDE.md rule 6).
set -u
fail=0
check() {  # name, args
  name=$1; shift
  python3 run.py "$@" > /tmp/case_out.txt 2>&1
  code=$?
  if diff -q /tmp/case_out.txt "cases/$name.txt" >/dev/null; then echo "pass  $name.txt (exit $code)"; else echo "FAIL  $name.txt"; diff /tmp/case_out.txt "cases/$name.txt"; fail=1; fi
  if [ -f "cases/$name.json" ]; then
    if diff -q timeline.json "cases/$name.json" >/dev/null; then echo "pass  $name.json"; else echo "FAIL  $name.json"; fail=1; fi
    python3 render.py timeline.json /tmp/case_out.svg >/dev/null
    if diff -q /tmp/case_out.svg "cases/$name.svg" >/dev/null; then echo "pass  $name.svg"; else echo "FAIL  $name.svg"; fail=1; fi
  fi
}
check typical_conversion_permit_allow conversion_permit=allow 10
check boundary_unit_size_200          unit_size_sf=200 10
check missing_tenant_return_rate      --target tenant_return_rate 10
check supply_replacement_partial_15   replacement_ratio=partial 15
check fork_conversion_fee_charged     conversion_fee=charged 10
# repeated: three runs of the typical case must be byte-identical
for i in 1 2 3; do python3 run.py conversion_permit=allow 10 >/dev/null; md5 -q timeline.json; done > /tmp/case_md5.txt
if [ "$(sort -u /tmp/case_md5.txt | wc -l | tr -d ' ')" = 1 ]; then echo "pass  repeated (3 runs, 1 md5)"; else echo "FAIL  repeated"; fail=1; fi
printf 'repeated: conversion_permit=allow 10, three runs\n%s\n' "$(cat /tmp/case_md5.txt)" > /tmp/case_rep.txt
if diff -q /tmp/case_rep.txt cases/repeated_conversion_permit_allow.txt >/dev/null; then echo "pass  repeated_conversion_permit_allow.txt"; else echo "FAIL  repeated_conversion_permit_allow.txt (md5 differs from the committed run)"; fail=1; fi
rm -f /tmp/case_out.txt /tmp/case_out.svg /tmp/case_md5.txt /tmp/case_rep.txt
exit $fail
