## Summary

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Exam bank / study content
- [ ] Build, release, or CI tooling
- [ ] Documentation

## Release path

- [ ] Targets `staging` first (feature -> staging), or this PR is `staging` -> `main`
- [ ] Staging was validated before requesting a production merge (if targeting `main`)
- [ ] No production secrets or production-only env files are included

## Checklist

- [ ] `npm run smoke:prepush` (or `npm run check` + `npm test`) passes locally
- [ ] `python tools/validate_bank.py` passes (if exam data changed)
- [ ] No secrets, certificates, or third-party course media are included
- [ ] No em dashes or emoji in user-facing text (project style)
- [ ] Loading / error / empty states covered for any new async UI
- [ ] I agree that my contribution is licensed under AGPL-3.0-only
