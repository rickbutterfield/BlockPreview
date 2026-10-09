# CLAUDE.md - BlockPreview v5

## Overview

**BlockPreview** is an Umbraco community package that enables rich HTML backoffice previews for Block Grid, Block List, and Rich Text editors.

**Technologies:**
- .NET 10 (C#) - Backend library and API
- TypeScript/Lit - Frontend UI components (Umbraco backoffice extension)
- Vite - Frontend build tooling

**Target Platform:** Umbraco CMS v17+

**Package:** [Umbraco.Community.BlockPreview on NuGet](https://www.nuget.org/packages/Umbraco.Community.BlockPreview)

---

## Repository Structure

```
/src                    - Source projects
  /Umbraco.Community.BlockPreview       - Main .NET library (RCL)
  /Umbraco.Community.BlockPreview.UI    - TypeScript frontend (Lit components)
/examples               - Example/test sites
  /Umbraco.Community.BlockPreview.TestSite  - Umbraco 17 test site
/tools                  - Build utilities
  /Umbraco.Community.BlockPreview.SchemaGenerator - JSON schema generator
/docs                   - Documentation
/.github                - CI/CD workflows, README, assets
```

**Project Dependencies:**
- `Umbraco.Community.BlockPreview` references `Umbraco.Community.BlockPreview.UI` (embeds compiled JS assets)
- `TestSite` references `Umbraco.Community.BlockPreview` for local development

---

## Build Commands

**Full Solution:**
```bash
dotnet build Umbraco.Community.BlockPreview.sln
```

**Main Package (Release):**
```bash
dotnet build src/Umbraco.Community.BlockPreview/Umbraco.Community.BlockPreview.csproj --configuration Release
dotnet build examples/Umbraco.Community.BlockPreview.TestSite/Umbraco.Community.BlockPreview.TestSite.csproj
```

**Frontend Assets:**
```bash
cd src/Umbraco.Community.BlockPreview.UI

# Install dependencies (requires Node.js >=22.12.0)
npm install

# Development mode with hot reload
npm run dev

# Build for production
npm run build
```

**Run Test Site:**
```bash
dotnet run --project examples/Umbraco.Community.BlockPreview.TestSite
```

Test site credentials:
- Username: `admin@example.com`
- Password: `1234567890`

---

## Versioning

Uses [Nerdbank.GitVersioning](https://github.com/dotnet/Nerdbank.GitVersioning) for automatic versioning.

- Version defined in `version.json`
- Release tags: `release-{version}` (e.g., `release-5.5.1`)
- Release branches: `release/{version}`

**Cutting a release:**
1. Branch `release/{version}` off `vX/dev`.
2. Set the version in `version.json`, `src/Umbraco.Community.BlockPreview.UI/package.json`, and `package-lock.json`. Run `npm run build` so the package manifest restamps.
3. PR that branch into `vX/main` and merge.
4. Tag `release-{version}` on `vX/main` and push the tag. **The tag is what publishes.**

The published version comes from `version.json` on the tagged commit, not from the tag name. Keep the two in step.

---

## Teamwork & Collaboration

**Branching:**
- Main branch: `v5/main`
- Development branch: `v5/dev`
- Feature branches merged via PR to `v5/dev`

**CI/CD:**
- `release.yml` - Builds and pushes to NuGet. Triggers on `release-*` **tags only**, plus manual dispatch. Pushing a `release/*` branch does *not* publish; that trigger was removed in 9556dec because cutting a release created both a branch and a tag and fired the publish twice.
- `codeql.yml` - Security scanning

**Contributing:** See `.github/CONTRIBUTING.md`
- Fork repository, create PR with changes
- Issues for bugs/feature discussions

---

## Quick Reference

**Key Directories:**
| Path | Description |
|------|-------------|
| `/src` | Source code |
| `/examples` | Test site |
| `/tools` | Build utilities |
| `/docs` | Documentation |

**Projects:**
| Project | Type | Description |
|---------|------|-------------|
| `Umbraco.Community.BlockPreview` | .NET RCL | Main package library |
| `Umbraco.Community.BlockPreview.UI` | TypeScript/Vite | Backoffice UI components |
| `Umbraco.Community.BlockPreview.TestSite` | .NET Web | Development test site |
| `Umbraco.Community.BlockPreview.SchemaGenerator` | .NET Console | appsettings JSON schema generator |

**Documentation:**
- [Configuration Guide](/docs/configuration.md)
- [Usage Guide](/docs/usage.md)
- [Advanced Customization](/docs/advanced-customization.md)

---

## Avoiding Breaking Changes

No binary breaking changes within a major version: anything public in a released `X.y.z` must still compile and bind in every later `X.*` release. These patterns are adapted from [Umbraco CMS's CLAUDE.md](https://github.com/umbraco/Umbraco-CMS/blob/main/CLAUDE.md#6-avoiding-breaking-changes).

**Package validation** (`EnablePackageValidation` in `Directory.Build.props`) checks the package against the `X.0.0` release on every pack. It only protects APIs that existed in `X.0.0`. Types and members added in later minors aren't covered, so apply these rules by hand to anything public that has shipped.

### Obsolete constructor + new constructor
When a public class needs different dependencies, keep the old constructor, mark it `[Obsolete]`, and make it call the new one. Resolve any new dependencies with `StaticServiceProvider`. Dependencies the class no longer needs are simply ignored.

```csharp
[Obsolete("Use the constructor with all parameters instead. Scheduled for removal in v7.")]
public MyService(IDependencyA depA)
    : this(depA, StaticServiceProvider.Instance.GetRequiredService<IDependencyB>())
{
}

[ActivatorUtilitiesConstructor]
public MyService(IDependencyA depA, IDependencyB depB) { ... }
```

- DI must use the **new** constructor. Microsoft DI picks the longest constructor it can satisfy, which is often the obsolete one. So mark the new constructor `[ActivatorUtilitiesConstructor]` and register the service with `ActivatorUtilities.CreateInstance<T>(sp)`.
- Examples: `BlockPreviewApiController` (added `IBlockPreviewResponseEnricher`) and `BlockPreviewViewResolver` (dropped `IWebHostEnvironment`).

### Obsolete method + new overload
When a public method's signature needs to change, add the new overload and mark the old one `[Obsolete]`. The old one should call the new one with sensible defaults, and nothing in this repo should still call the obsolete one.

### Default interface implementation
When adding a member to a public interface, give it a default implementation so that external implementations keep compiling. In order of preference, the default should:
1. Use the interface's existing members, even if the result isn't optimal.
2. Return a sensible default, such as an empty collection or `null`.
3. Throw `NotImplementedException`, if there's no reasonable default.

Add `// TODO (v{X+1}): Remove the default implementation.` above it. Examples: `IBlockPreviewService.RenderSingleBlock` (falls back to `RenderListBlock`) and `IBlockPreviewService.GetStylesheetPaths` (wraps `GetStylesheetPath`).

### General rules
- Anything marked `[Obsolete]` stays for at least one full major version: if it's obsoleted in vN, the earliest it can be removed is vN+2. Every `[Obsolete]` message ends with `Scheduled for removal in v{N+2}.`, where N is the major version in `version.json`.
- When one obsolete member has to call another, wrap the call in `#pragma warning disable CS0618` / `restore CS0618`.
- Changing a public type from `internal` to `public` is an additive change, but after that it's a public API that's covered by these rules. Seal it unless it's meant to be inherited from.

---

## Architecture Notes

**Razor view caching:** Never cache `ViewEngineResult` objects. ASP.NET Core's `RazorView` holds a single `IRazorPage` with mutable state (`ViewContext`, `Output`) that is set during `RenderAsync`. Caching the `ViewEngineResult` shares the page across concurrent requests, causing race conditions (empty renders, `ObjectDisposedException`). Cache the resolved view **path** instead and call `_razorViewEngine.GetView(path)` per request to get a fresh `RazorView`/`IRazorPage`.

**Debugging approach:** When investigating rendering bugs, add diagnostic logging first before building fixes. Symptoms like empty strings, disposed object exceptions, and load-dependent failures can all stem from a single shared-state concurrency bug. Log the actual exception types and locations to avoid misdiagnosing the root cause.
