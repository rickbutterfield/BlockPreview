using System.Collections.Concurrent;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Razor;
using Microsoft.AspNetCore.Mvc.ViewEngines;
using Microsoft.Extensions.Options;
using Umbraco.Community.BlockPreview.Enums;
using Umbraco.Community.BlockPreview.Extensions;
using Umbraco.Community.BlockPreview.Interfaces;

namespace Umbraco.Community.BlockPreview.Services
{
    /// <summary>
    /// Resolves and caches view results for block previews.
    /// </summary>
    public class BlockPreviewViewResolver : IBlockPreviewViewResolver
    {
        /// <summary>
        /// Sentinel value indicating a cache entry where no view path was found.
        /// </summary>
        private static readonly string NotFoundSentinel = "\0";

        private static readonly ConcurrentDictionary<string, string> _pathCache = new();

        private readonly IRazorViewEngine _razorViewEngine;
        private readonly IOptionsMonitor<BlockPreviewOptions> _optionsMonitor;

        /// <summary>
        /// Initializes a new instance of the <see cref="BlockPreviewViewResolver"/> class.
        /// </summary>
        /// <param name="razorViewEngine">The Razor view engine.</param>
        /// <param name="optionsMonitor">The block preview options monitor.</param>
        public BlockPreviewViewResolver(
            IRazorViewEngine razorViewEngine,
            IOptionsMonitor<BlockPreviewOptions> optionsMonitor)
        {
            _razorViewEngine = razorViewEngine;
            _optionsMonitor = optionsMonitor;
            _optionsMonitor.OnChange(_ => ClearCache());
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="BlockPreviewViewResolver"/> class.
        /// </summary>
        /// <param name="razorViewEngine">The Razor view engine.</param>
        /// <param name="webHostEnvironment">Not used.</param>
        /// <param name="optionsMonitor">The block preview options monitor.</param>
        [Obsolete("Use the constructor without IWebHostEnvironment instead. Scheduled for removal in v7.")]
        public BlockPreviewViewResolver(
            IRazorViewEngine razorViewEngine,
            IWebHostEnvironment webHostEnvironment,
            IOptionsMonitor<BlockPreviewOptions> optionsMonitor)
            : this(razorViewEngine, optionsMonitor)
        {
        }

        /// <inheritdoc/>
        public ViewEngineResult? ResolveView(string contentAlias, BlockType blockType)
        {
            if (string.IsNullOrEmpty(contentAlias))
                return null;

            var cacheKey = BuildCacheKey(contentAlias, blockType);
            var viewPath = _pathCache.GetOrAdd(cacheKey, _ => FindViewPath(contentAlias, blockType));

            if (ReferenceEquals(viewPath, NotFoundSentinel))
                return null;

            // Always create a fresh ViewEngineResult per call.
            // GetView creates a new RazorView + IRazorPage, which is required
            // because IRazorPage has mutable state (ViewContext) that is not thread-safe.
            return _razorViewEngine.GetView("", viewPath, false);
        }

        /// <inheritdoc/>
        public void ClearCache() => _pathCache.Clear();

        /// <inheritdoc/>
        public void ClearCacheForAlias(string contentAlias)
        {
            if (string.IsNullOrEmpty(contentAlias))
                return;

            // Clear cache entries for all block types for this alias
            foreach (BlockType blockType in Enum.GetValues<BlockType>())
            {
                var cacheKey = BuildCacheKey(contentAlias, blockType);
                _pathCache.TryRemove(cacheKey, out _);

                // Also clear PascalCase variant if different
                var pascalAlias = contentAlias.ToPascalCase();
                if (pascalAlias != contentAlias)
                {
                    var pascalCacheKey = BuildCacheKey(pascalAlias, blockType);
                    _pathCache.TryRemove(pascalCacheKey, out _);
                }
            }
        }

        private static string BuildCacheKey(string contentAlias, BlockType blockType)
            => $"{blockType}:{contentAlias}";

        /// <summary>
        /// Finds the view path for the given content alias and block type.
        /// Returns the resolved path string, or <see cref="NotFoundSentinel"/> if no view exists.
        /// </summary>
        private string FindViewPath(string contentAlias, BlockType blockType)
        {
            var viewPaths = _optionsMonitor.CurrentValue.GetViewLocations(blockType);

            if (viewPaths == null || viewPaths.Count == 0)
                return NotFoundSentinel;

            var pascalAlias = contentAlias.ToPascalCase();

            foreach (var viewPath in viewPaths)
            {
                string baseViewPath = viewPath.TrimStart('~', Path.DirectorySeparatorChar, '/');

                // Try non-PascalCase first
                var pathNonPascal = string.Format(baseViewPath, contentAlias);
                if (TryResolveView(pathNonPascal))
                    return pathNonPascal;

                // Then PascalCase (skip if identical to the non-PascalCase candidate)
                var pathPascal = string.Format(baseViewPath, pascalAlias);
                if (pathPascal != pathNonPascal && TryResolveView(pathPascal))
                    return pathPascal;
            }

            return NotFoundSentinel;
        }

        /// <summary>
        /// Determines whether a view can be resolved at the given application-relative path.
        /// </summary>
        /// <remarks>
        /// The Razor engine is asked to resolve the view regardless of whether the source
        /// <c>.cshtml</c> is present on disk, because the view may be precompiled into the
        /// assembly (e.g. <c>Runtime:Mode = Production</c>, see #273). The call is guarded
        /// against the runtime compiler throwing when a view genuinely cannot be read from
        /// disk (e.g. a case-sensitive file system miss, see #84), which is treated as
        /// "not resolvable" rather than being allowed to propagate.
        /// </remarks>
        /// <param name="relativePath">The application-relative view path.</param>
        /// <returns><see langword="true"/> if the view resolves successfully; otherwise <see langword="false"/>.</returns>
        private bool TryResolveView(string relativePath)
        {
            try
            {
                return _razorViewEngine.GetView("", relativePath, false).Success;
            }
            catch (IOException)
            {
                return false;
            }
        }
    }
}
