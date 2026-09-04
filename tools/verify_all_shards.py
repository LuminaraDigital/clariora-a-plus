import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))

import build_core2_fixed
import build_core2_new_security
import build_core2_new_swtroubleshooting
import build_core2_new_opprocedures
import validate_bank

def main():
    print("=== BUILDING SHARD 1: core2_fixed.json ===")
    build_core2_fixed.build_shard()
    
    print("\n=== BUILDING SHARD 2: core2_new_security.json ===")
    build_core2_new_security.build_shard()
    
    print("\n=== BUILDING SHARD 3: core2_new_swtroubleshooting.json ===")
    build_core2_new_swtroubleshooting.build_shard()
    
    print("\n=== BUILDING SHARD 4: core2_new_opprocedures.json ===")
    build_core2_new_opprocedures.build_shard()
    
    shards = [
        "core2_fixed.json",
        "core2_new_security.json",
        "core2_new_swtroubleshooting.json",
        "core2_new_opprocedures.json"
    ]
    
    print("\n=== VALIDATING ALL 4 SHARDS ===")
    all_passed = True
    for s in shards:
        shard_path = os.path.join(ROOT, "_bank", "shards", s)
        with open(shard_path, encoding="utf-8") as f:
            data = json.load(f)
        qs = data.get("questions", [])
        
        errors = []
        warnings = []
        validate_bank.validate_qs(qs, "core2", errors, warnings)
        
        print(f"\nShard: {s} ({len(qs)} questions)")
        if errors:
            print(f"  FAILED with {len(errors)} error(s):")
            for e in errors[:10]:
                print(f"    x {e}")
            all_passed = False
        else:
            print("  VALIDATION PASSED (0 errors)")
            if warnings:
                print(f"  Warnings ({len(warnings)})")
    
    if all_passed:
        print("\nALL 4 SHARDS PASSED VALIDATION WITH 0 ERRORS!")
        return 0
    else:
        print("\nSOME SHARDS HAD VALIDATION ERRORS.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
