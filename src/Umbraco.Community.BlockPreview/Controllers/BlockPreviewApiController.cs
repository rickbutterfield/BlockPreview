using Asp.Versioning;
using System.Net;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Api.Management.Routing;
using Umbraco.Cms.Core.Cache;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PublishedCache;
using Umbraco.Cms.Core.Routing;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Web;
using Umbraco.Cms.Infrastructure.HybridCache;
using Umbraco.Cms.Infrastructure.Scoping;
using Umbraco.Community.BlockPreview.Enums;
using Umbraco.Community.BlockPreview.Helpers;
using Umbraco.Community.BlockPreview.Interfaces;
using Umbraco.Community.BlockPreview.Services;
using Umbraco.Extensions;

namespace Umbraco.Community.BlockPreview.Controllers
{
    /// <summary>
    /// Represents the Block Preview API controller.
    /// </summary>
    [ApiVersion("1.0")]
    [ApiExplorerSettings(GroupName = "BlockPreview")]
    public class BlockPreviewApiController : BlockPreviewApiControllerBase
    {
        private readonly IPublishedRouter _publishedRouter;
        private readonly ILogger<BlockPreviewApiController> _logger;
        private readonly IUmbracoContextAccessor _umbracoContextAccessor;
        private readonly ContextCultureService _contextCultureService;
        private readonly IBlockPreviewService _blockPreviewService;
        private readonly ILanguageService _languageService;
        private readonly IOptions<BlockPreviewOptions> _blockPreviewSettings;
        private readonly IAppPolicyCache _runtimeCache;
        private readonly ITypeFinder _typeFinder;
        private readonly IDocumentCacheService _documentCacheService;
        private readonly IPublishedContentTypeCache _contentTypeCache;
        private readonly IScopeProvider _scopeProvider;
        private readonly IBlockPreviewRequestEnricher _requestEnricher;
        private readonly IBlockPreviewResponseEnricher _responseEnricher;

        private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(1);

        /// <summary>
        /// Initializes a new instance of the <see cref="BlockPreviewApiController"/> class.
        /// </summary>
        [ActivatorUtilitiesConstructor]
        public BlockPreviewApiController(
            IPublishedRouter publishedRouter,
            ILogger<BlockPreviewApiController> logger,
            IUmbracoContextAccessor umbracoContextAccessor,
            ContextCultureService contextCultureSwitcher,
            IBlockPreviewService blockPreviewService,
            ILanguageService languageService,
            IOptions<BlockPreviewOptions> blockPreviewSettings,
            ITypeFinder typeFinder,
            AppCaches appCaches,
            IElementsCache elementsCache,
            IDocumentCacheService documentCacheService,
            IPublishedContentTypeCache contentTypeCache,
            IScopeProvider scopeProvider,
            IBlockPreviewRequestEnricher requestEnricher,
            IBlockPreviewResponseEnricher responseEnricher)
        {
            _publishedRouter = publishedRouter;
            _logger = logger;
            _umbracoContextAccessor = umbracoContextAccessor;
            _contextCultureService = contextCultureSwitcher;
            _blockPreviewService = blockPreviewService;
            _languageService = languageService;
            _blockPreviewSettings = blockPreviewSettings;
            _typeFinder = typeFinder;
            _runtimeCache = appCaches.RuntimeCache;
            _documentCacheService = documentCacheService;
            _contentTypeCache = contentTypeCache;
            _scopeProvider = scopeProvider;
            _requestEnricher = requestEnricher;
            _responseEnricher = responseEnricher;
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="BlockPreviewApiController"/> class.
        /// </summary>
        [Obsolete("Use the constructor with IBlockPreviewResponseEnricher parameter instead.")]
        public BlockPreviewApiController(
            IPublishedRouter publishedRouter,
            ILogger<BlockPreviewApiController> logger,
            IUmbracoContextAccessor umbracoContextAccessor,
            ContextCultureService contextCultureSwitcher,
            IBlockPreviewService blockPreviewService,
            ILanguageService languageService,
            IOptions<BlockPreviewOptions> blockPreviewSettings,
            ITypeFinder typeFinder,
            AppCaches appCaches,
            IElementsCache elementsCache,
            IDocumentCacheService documentCacheService,
            IPublishedContentTypeCache contentTypeCache,
            IScopeProvider scopeProvider,
            IBlockPreviewRequestEnricher requestEnricher)
            : this(
                publishedRouter,
                logger,
                umbracoContextAccessor,
                contextCultureSwitcher,
                blockPreviewService,
                languageService,
                blockPreviewSettings,
                typeFinder,
                appCaches,
                elementsCache,
                documentCacheService,
                contentTypeCache,
                scopeProvider,
                requestEnricher,
                StaticServiceProvider.Instance.GetRequiredService<IBlockPreviewResponseEnricher>())
        {
        }

        #region Public
        /// <summary>
        /// Renders a preview for a grid block using the associated Razor view or ViewComponent.
        /// </summary>
        /// <param name="blockData">The JSON content data of the block.</param>
        /// <param name="nodeKey">The <see cref="Guid"/> that represents the Umbraco node.</param>
        /// <param name="blockEditorAlias">The alias of the block editor</param>
        /// <param name="contentElementAlias">The alias of the content being rendered</param>
        /// <param name="culture">The current culture</param>
        /// <param name="documentTypeUnique">The <see cref="Guid"/> that represents the Umbraco node</param>
        /// <param name="contentUdi">The <see cref="Cms.Core.Udi"/> that represents the content element</param>
        /// <param name="settingsUdi">The <see cref="Cms.Core.Udi"/> that represents the settings element</param>
        /// <param name="blockIndex">The <see cref="int"/> that represents the block index</param>
        /// <returns>The markup to render in the preview.</returns>
        [HttpPost("preview/grid")]
        [MapToApiVersion("1.0")]
        [ProducesResponseType(typeof(string), 200)]
        public async Task<IActionResult> PreviewGridBlock(
            [FromBody] string blockData,
            [FromQuery] Guid nodeKey = default,
            [FromQuery] string blockEditorAlias = "",
            [FromQuery] string contentElementAlias = "",
            [FromQuery] string? culture = "",
            [FromQuery] Guid documentTypeUnique = default,
            [FromQuery] string contentUdi = "",
            [FromQuery] string? settingsUdi = default,
            [FromQuery] int? blockIndex = 0)
        {
            string markup;

            if (CheckGeneratedModelsExist())
            {
                try
                {
                    IPublishedContent? content = GetPublishedContent(nodeKey, documentTypeUnique, out bool isActualContent);

                    string? currentCulture = await GetCurrentCulture(culture, content);

                    await SetupPublishedRequest(currentCulture, isActualContent ? content : null);

                    await _requestEnricher.EnrichAsync(HttpContext, content, blockEditorAlias, contentElementAlias, contentUdi, settingsUdi, blockIndex);

                    markup = await _blockPreviewService.RenderGridBlock(blockData, content!, ControllerContext, blockEditorAlias, documentTypeUnique, contentUdi, settingsUdi, blockIndex);

                    markup = await _responseEnricher.EnrichAsync(markup, HttpContext, content, blockEditorAlias, contentElementAlias, contentUdi, settingsUdi, blockIndex);
                }
                catch (Exception ex)
                {
                    markup = string.Format(Constants.ErrorMessages.ErrorTemplate, string.Format(Constants.ErrorMessages.RenderError, WebUtility.HtmlEncode(ex.Message)));
                    _logger.LogError(ex, string.Format(Constants.ErrorMessages.LoggerError, contentElementAlias));
                }
            }

            else
            {
                markup = string.Format(Constants.ErrorMessages.WarningTemplate, Constants.ErrorMessages.ModelsBuilderError);
            }

            string? cleanMarkup = PreviewMarkupCleaner.Clean(markup);
            return Ok(cleanMarkup);
        }

        /// <summary>
        /// Renders a preview for a block list block using the associated Razor view or ViewComponent.
        /// </summary>
        /// <param name="blockData">The JSON content data of the block.</param>
        /// <param name="nodeKey">The key of the node.</param>
        /// <param name="blockEditorAlias">The alias of the block editor</param>
        /// <param name="contentElementAlias">The alias of the content being rendered</param>
        /// <param name="culture">The current culture</param>
        /// <param name="documentTypeUnique">The <see cref="Guid"/> that represents the Umbraco node</param>
        /// <param name="contentUdi">The <see cref="Cms.Core.Udi"/> that represents the content element</param>
        /// <param name="settingsUdi">The <see cref="Cms.Core.Udi"/> that represents the settings element</param>
        /// <param name="blockIndex">The <see cref="int"/> that represents the block index</param>
        /// <returns>The markup to render in the preview.</returns>
        [HttpPost("preview/list")]
        [MapToApiVersion("1.0")]
        [ProducesResponseType(typeof(string), 200)]
        public async Task<IActionResult> PreviewListBlock(
            [FromBody] string blockData,
            [FromQuery] Guid nodeKey = default,
            [FromQuery] string blockEditorAlias = "",
            [FromQuery] string contentElementAlias = "",
            [FromQuery] string culture = "",
            [FromQuery] Guid documentTypeUnique = default,
            [FromQuery] string contentUdi = "",
            [FromQuery] string? settingsUdi = default,
            [FromQuery] int? blockIndex = 0)
        {
            string markup;

            if (CheckGeneratedModelsExist())
            {
                try
                {
                    IPublishedContent? content = GetPublishedContent(nodeKey, documentTypeUnique, out bool isActualContent);

                    string? currentCulture = await GetCurrentCulture(culture, content);

                    await SetupPublishedRequest(currentCulture, isActualContent ? content : null);

                    await _requestEnricher.EnrichAsync(HttpContext, content, blockEditorAlias, contentElementAlias, contentUdi, settingsUdi, blockIndex);

                    markup = await _blockPreviewService.RenderListBlock(blockData, content!, ControllerContext, blockEditorAlias, documentTypeUnique, contentUdi, settingsUdi, blockIndex);

                    markup = await _responseEnricher.EnrichAsync(markup, HttpContext, content, blockEditorAlias, contentElementAlias, contentUdi, settingsUdi, blockIndex);
                }
                catch (Exception ex)
                {
                    markup = string.Format(Constants.ErrorMessages.ErrorTemplate, string.Format(Constants.ErrorMessages.RenderError, WebUtility.HtmlEncode(ex.Message)));
                    _logger.LogError(ex, string.Format(Constants.ErrorMessages.LoggerError, contentElementAlias));
                }
            }

            else
            {
                markup = string.Format(Constants.ErrorMessages.WarningTemplate, Constants.ErrorMessages.ModelsBuilderError);
            }

            string? cleanMarkup = PreviewMarkupCleaner.Clean(markup);
            return Ok(cleanMarkup);
        }

        /// <summary>
        /// Renders a preview for a rich text block using the associated Razor view or ViewComponent.
        /// </summary>
        /// <param name="blockData">The JSON content data of the block.</param>
        /// <param name="nodeKey">The key of the node.</param>
        /// <param name="blockEditorAlias">The alias of the block editor</param>
        /// <param name="contentElementAlias">The alias of the content being rendered</param>
        /// <param name="culture">The current culture</param>
        /// <param name="documentTypeUnique">The <see cref="Guid"/> that represents the Umbraco node</param>
        /// <returns>The markup to render in the preview.</returns>
        [HttpPost("preview/rte")]
        [MapToApiVersion("1.0")]
        [ProducesResponseType(typeof(string), 200)]
        public async Task<IActionResult> PreviewRichTextMarkup(
            [FromBody] string blockData,
            [FromQuery] Guid nodeKey = default,
            [FromQuery] string blockEditorAlias = "",
            [FromQuery] string contentElementAlias = "",
            [FromQuery] string culture = "",
            [FromQuery] Guid documentTypeUnique = default)
        {
            string markup;

            if (CheckGeneratedModelsExist())
            {
                try
                {
                    IPublishedContent? content = GetPublishedContent(nodeKey, documentTypeUnique, out bool isActualContent);

                    string? currentCulture = await GetCurrentCulture(culture, content);

                    await SetupPublishedRequest(currentCulture, isActualContent ? content : null);

                    await _requestEnricher.EnrichAsync(HttpContext, content, blockEditorAlias, contentElementAlias);

                    markup = await _blockPreviewService.RenderRichTextBlock(blockData, content!, ControllerContext);

                    markup = await _responseEnricher.EnrichAsync(markup, HttpContext, content, blockEditorAlias, contentElementAlias);
                }
                catch (Exception ex)
                {
                    markup = string.Format(Constants.ErrorMessages.ErrorTemplate, string.Format(Constants.ErrorMessages.RenderError, WebUtility.HtmlEncode(ex.Message)));
                    _logger.LogError(ex, string.Format(Constants.ErrorMessages.LoggerError, contentElementAlias));
                }
            }

            else
            {
                markup = string.Format(Constants.ErrorMessages.WarningTemplate, Constants.ErrorMessages.ModelsBuilderError);
            }

            string? cleanMarkup = PreviewMarkupCleaner.Clean(markup);
            return Ok(cleanMarkup);
        }

        /// <summary>
        /// Renders a preview for a single block using the associated Razor view or ViewComponent.
        /// </summary>
        /// <param name="blockData">The JSON content data of the block.</param>
        /// <param name="nodeKey">The key of the node.</param>
        /// <param name="blockEditorAlias">The alias of the block editor</param>
        /// <param name="contentElementAlias">The alias of the content being rendered</param>
        /// <param name="culture">The current culture</param>
        /// <param name="documentTypeUnique">The <see cref="Guid"/> that represents the Umbraco node</param>
        /// <param name="contentUdi">The <see cref="Cms.Core.Udi"/> that represents the content element</param>
        /// <param name="settingsUdi">The <see cref="Cms.Core.Udi"/> that represents the settings element</param>
        /// <param name="blockIndex">The <see cref="int"/> that represents the block index</param>
        /// <returns>The markup to render in the preview.</returns>
        [HttpPost("preview/single")]
        [MapToApiVersion("1.0")]
        [ProducesResponseType(typeof(string), 200)]
        public async Task<IActionResult> PreviewSingleBlock(
            [FromBody] string blockData,
            [FromQuery] Guid nodeKey = default,
            [FromQuery] string blockEditorAlias = "",
            [FromQuery] string contentElementAlias = "",
            [FromQuery] string culture = "",
            [FromQuery] Guid documentTypeUnique = default,
            [FromQuery] string contentUdi = "",
            [FromQuery] string? settingsUdi = default,
            [FromQuery] int? blockIndex = 0)
        {
            string markup;

            if (CheckGeneratedModelsExist())
            {
                try
                {
                    IPublishedContent? content = GetPublishedContent(nodeKey, documentTypeUnique, out bool isActualContent);

                    string? currentCulture = await GetCurrentCulture(culture, content);

                    await SetupPublishedRequest(currentCulture, isActualContent ? content : null);

                    await _requestEnricher.EnrichAsync(HttpContext, content, blockEditorAlias, contentElementAlias, contentUdi, settingsUdi, blockIndex);

                    markup = await _blockPreviewService.RenderSingleBlock(blockData, content!, ControllerContext, blockEditorAlias, documentTypeUnique, contentUdi, settingsUdi, blockIndex);

                    markup = await _responseEnricher.EnrichAsync(markup, HttpContext, content, blockEditorAlias, contentElementAlias, contentUdi, settingsUdi, blockIndex);
                }
                catch (Exception ex)
                {
                    markup = string.Format(Constants.ErrorMessages.ErrorTemplate, string.Format(Constants.ErrorMessages.RenderError, WebUtility.HtmlEncode(ex.Message)));
                    _logger.LogError(ex, string.Format(Constants.ErrorMessages.LoggerError, contentElementAlias));
                }
            }

            else
            {
                markup = string.Format(Constants.ErrorMessages.WarningTemplate, Constants.ErrorMessages.ModelsBuilderError);
            }

            string? cleanMarkup = PreviewMarkupCleaner.Clean(markup);
            return Ok(cleanMarkup);
        }

        /// <summary>
        /// Retrieves the stylesheet paths for a single block preview.
        /// </summary>
        /// <param name="nodeKey">The key of the node.</param>
        /// <param name="documentTypeUnique">The unique identifier for the document type.</param>
        /// <returns>A list of stylesheet paths if configured; otherwise, an empty list.</returns>
        [HttpGet("preview/single/stylesheets")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(IEnumerable<string>))]
        public async Task<IActionResult> GetSingleBlockStylesheets(
            [FromQuery] Guid nodeKey = default,
            [FromQuery] Guid documentTypeUnique = default)
        {
            IPublishedContent? content = GetPublishedContent(nodeKey, documentTypeUnique);

            await _requestEnricher.EnrichAsync(HttpContext, content);

            var stylesheetPaths = await _blockPreviewService.GetStylesheetPaths(BlockType.SingleBlock, content!, ControllerContext);

            return Ok(stylesheetPaths);
        }

        /// <summary>
        /// Loads the in-memory settings from appsettings.json
        /// </summary>
        /// <returns><see cref="BlockPreviewOptions">Block Preview settings</see></returns>
        [HttpGet("settings")]
        [ProducesResponseType(typeof(BlockPreviewOptions), 200)]
        public BlockPreviewOptions GetSettings()
        {
            var settings = _blockPreviewSettings.Value;

            // If any block type has IgnoredContentTypes configured (and ContentTypes is not set), compute ContentTypes dynamically
            if (ShouldApplyIgnoredContentTypes(settings.BlockGrid) ||
                ShouldApplyIgnoredContentTypes(settings.BlockList) ||
                ShouldApplyIgnoredContentTypes(settings.RichText) ||
                ShouldApplyIgnoredContentTypes(settings.SingleBlock))
            {
                var allElementAliases = _runtimeCache.GetCacheItem(Constants.CacheKeys.ElementAliases, () =>
                {
                    var contentTypeService = HttpContext.RequestServices.GetRequiredService<IContentTypeService>();
                    return contentTypeService.GetAll()
                        .Where(ct => ct.IsElement)
                        .Select(ct => ct.Alias)
                        .ToList();
                }, CacheDuration) ?? [];

                return new BlockPreviewOptions
                {
                    BlockGrid = ApplyIgnoredContentTypes(settings.BlockGrid, allElementAliases),
                    BlockList = ApplyIgnoredContentTypes(settings.BlockList, allElementAliases),
                    RichText = ApplyIgnoredContentTypes(settings.RichText, allElementAliases),
                    SingleBlock = ApplyIgnoredContentTypes(settings.SingleBlock, allElementAliases)
                };
            }

            return settings;
        }

        private static bool ShouldApplyIgnoredContentTypes(BlockTypeSettings? blockTypeSettings) =>
            blockTypeSettings?.IgnoredContentTypes.Count > 0 &&
            (blockTypeSettings.ContentTypes == null || blockTypeSettings.ContentTypes.Count == 0);

        private static BlockTypeSettings ApplyIgnoredContentTypes(BlockTypeSettings original, List<string> allElementAliases)
        {
            // Only apply if ContentTypes is not explicitly set
            if (original.ContentTypes?.Count > 0 || original.IgnoredContentTypes.Count == 0)
            {
                return original;
            }

            return new BlockTypeSettings
            {
                Enabled = original.Enabled,
                ViewLocations = original.ViewLocations,
                ContentTypes = allElementAliases
                    .Except(original.IgnoredContentTypes, StringComparer.OrdinalIgnoreCase)
                    .ToList(),
                IgnoredContentTypes = original.IgnoredContentTypes,
#pragma warning disable CS0618 // Type or member is obsolete
                Stylesheet = original.Stylesheet,
#pragma warning restore CS0618 // Type or member is obsolete
                Stylesheets = original.Stylesheets
            };
        }


        /// <summary>
        /// Retrieves the stylesheet path for a grid block preview.
        /// </summary>
        /// <param name="nodeKey">The key of the node.</param>
        /// <param name="documentTypeUnique">The unique identifier for the document type.</param>
        /// <returns>The stylesheet path if configured; otherwise, a 404 response.</returns>
        [Obsolete("Use GetGridStylesheets instead to support multiple stylesheets.")]
        [HttpGet("preview/grid/stylesheet")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(string))]
        public async Task<IActionResult> GetGridStylesheet(
            [FromQuery] Guid nodeKey = default,
            [FromQuery] Guid documentTypeUnique = default)
        {
            IPublishedContent? content = GetPublishedContent(nodeKey, documentTypeUnique);

            await _requestEnricher.EnrichAsync(HttpContext, content);

#pragma warning disable CS0618 // Type or member is obsolete
            String? stylesheetPath = await _blockPreviewService.GetStylesheetPath(BlockType.BlockGrid, content!, ControllerContext);
#pragma warning restore CS0618 // Type or member is obsolete

            if (string.IsNullOrWhiteSpace(stylesheetPath))
            {
                return Ok(string.Empty);
            }
            return Ok(stylesheetPath);
        }

        /// <summary>
        /// Retrieves the stylesheet paths for a grid block preview.
        /// </summary>
        /// <param name="nodeKey">The key of the node.</param>
        /// <param name="documentTypeUnique">The unique identifier for the document type.</param>
        /// <returns>A list of stylesheet paths if configured; otherwise, a 404 response.</returns>
        [HttpGet("preview/grid/stylesheets")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(IEnumerable<string>))]
        public async Task<IActionResult> GetGridStylesheets(
            [FromQuery] Guid nodeKey = default,
            [FromQuery] Guid documentTypeUnique = default)
        {
            IPublishedContent? content = GetPublishedContent(nodeKey, documentTypeUnique);

            await _requestEnricher.EnrichAsync(HttpContext, content);

            var stylesheetPaths = await _blockPreviewService.GetStylesheetPaths(BlockType.BlockGrid, content!, ControllerContext);

            return Ok(stylesheetPaths);
        }

        /// <summary>
        /// Retrieves the stylesheet path for a list block preview.
        /// </summary>
        /// <param name="nodeKey">The key of the node.</param>
        /// <param name="documentTypeUnique">The unique identifier for the document type.</param>
        /// <returns>The stylesheet path if configured; otherwise, a 404 response.</returns>
        [Obsolete("Use GetListStylesheets instead to support multiple stylesheets.")]
        [HttpGet("preview/list/stylesheet")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(string))]
        public async Task<IActionResult> GetListStylesheet(
            [FromQuery] Guid nodeKey = default,
            [FromQuery] Guid documentTypeUnique = default)
        {
            IPublishedContent? content = GetPublishedContent(nodeKey, documentTypeUnique);

            await _requestEnricher.EnrichAsync(HttpContext, content);

#pragma warning disable CS0618 // Type or member is obsolete
            String? stylesheetPath = await _blockPreviewService.GetStylesheetPath(BlockType.BlockList, content!, ControllerContext);
#pragma warning restore CS0618 // Type or member is obsolete

            if (string.IsNullOrWhiteSpace(stylesheetPath))
            {
                return Ok(string.Empty);
            }
            return Ok(stylesheetPath);
        }

        /// <summary>
        /// Retrieves the stylesheet paths for a list block preview.
        /// </summary>
        /// <param name="nodeKey">The key of the node.</param>
        /// <param name="documentTypeUnique">The unique identifier for the document type.</param>
        /// <returns>A list of stylesheet paths if configured; otherwise, a 404 response.</returns>
        [HttpGet("preview/list/stylesheets")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(IEnumerable<string>))]
        public async Task<IActionResult> GetListStylesheets(
            [FromQuery] Guid nodeKey = default,
            [FromQuery] Guid documentTypeUnique = default)
        {
            IPublishedContent? content = GetPublishedContent(nodeKey, documentTypeUnique);

            await _requestEnricher.EnrichAsync(HttpContext, content);

            var stylesheetPaths = await _blockPreviewService.GetStylesheetPaths(BlockType.BlockList, content!, ControllerContext);

            return Ok(stylesheetPaths);
        }

        /// <summary>
        /// Retrieves the stylesheet path for a rich text block preview.
        /// </summary>
        /// <param name="nodeKey">The key of the node.</param>
        /// <param name="documentTypeUnique">The unique identifier for the document type.</param>
        /// <returns>The stylesheet path if configured; otherwise, a 404 response.</returns>
        [Obsolete("Use GetRteStylesheets instead to support multiple stylesheets.")]
        [HttpGet("preview/rte/stylesheet")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(string))]
        public async Task<IActionResult> GetRteStylesheet(
            [FromQuery] Guid nodeKey = default,
            [FromQuery] Guid documentTypeUnique = default)
        {
            IPublishedContent? content = GetPublishedContent(nodeKey, documentTypeUnique);

            await _requestEnricher.EnrichAsync(HttpContext, content);

#pragma warning disable CS0618 // Type or member is obsolete
            String? stylesheetPath = await _blockPreviewService.GetStylesheetPath(BlockType.RichText, content!, ControllerContext);
#pragma warning restore CS0618 // Type or member is obsolete

            if (string.IsNullOrWhiteSpace(stylesheetPath))
            {
                return Ok(string.Empty);
            }
            return Ok(stylesheetPath);
        }

        /// <summary>
        /// Retrieves the stylesheet paths for a rich text block preview.
        /// </summary>
        /// <param name="nodeKey">The key of the node.</param>
        /// <param name="documentTypeUnique">The unique identifier for the document type.</param>
        /// <returns>A list of stylesheet paths if configured; otherwise, a 404 response.</returns>
        [HttpGet("preview/rte/stylesheets")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(IEnumerable<string>))]
        public async Task<IActionResult> GetRteStylesheets(
            [FromQuery] Guid nodeKey = default,
            [FromQuery] Guid documentTypeUnique = default)
        {
            IPublishedContent? content = GetPublishedContent(nodeKey, documentTypeUnique);

            await _requestEnricher.EnrichAsync(HttpContext, content);

            var stylesheetPaths = await _blockPreviewService.GetStylesheetPaths(BlockType.RichText, content!, ControllerContext);

            return Ok(stylesheetPaths);
        }
        #endregion

        #region Private
        private bool CheckGeneratedModelsExist()
        {
            return _runtimeCache.GetCacheItem(Constants.CacheKeys.GeneratedModels, () =>
            {
                return _typeFinder.FindClassesWithAttribute<PublishedModelAttribute>().Any();
            }, CacheDuration);
        }

        private async Task<string?> GetCurrentCulture(string? culture, IPublishedContent? content = null)
        {
            var currentCulture = string.IsNullOrWhiteSpace(culture) || culture == "undefined"
                ? null
                : culture;

            // Try domain-based culture from the content
            currentCulture ??= content?.GetCultureFromDomains();

            // If only one language is configured, use it regardless of default flag
            if (string.IsNullOrEmpty(currentCulture))
            {
                var allLanguages = await _languageService.GetAllAsync();
                var languages = allLanguages.ToList();
                currentCulture = languages.Count == 1
                    ? languages[0].IsoCode
                    : await _languageService.GetDefaultIsoCodeAsync();
            }

            _contextCultureService.SetCulture(currentCulture);

            return currentCulture;
        }

        private async Task SetupPublishedRequest(string? culture, IPublishedContent? content = null)
        {
            if (!_umbracoContextAccessor.TryGetUmbracoContext(out IUmbracoContext? context))
                return;

            var requestUrl = new Uri(Request.GetDisplayUrl());
            var requestBuilder = await _publishedRouter.CreateRequestAsync(requestUrl);

            if (content != null)
                requestBuilder.SetPublishedContent(content);

            context.PublishedRequest = requestBuilder.Build();
        }

        private IPublishedContent? GetPublishedContent(Guid? nodeKey = default, Guid? documentTypeUnique = default)
        {
            return GetPublishedContent(nodeKey, documentTypeUnique, out _);
        }

        private IPublishedContent? GetPublishedContent(Guid? nodeKey, Guid? documentTypeUnique, out bool isActualContent)
        {
            isActualContent = false;

            if (!_umbracoContextAccessor.TryGetUmbracoContext(out IUmbracoContext? context))
                return null;

            IPublishedContent? content = null;

            if (nodeKey.HasValue)
            {
                content = context.Content?.GetById(preview: true, nodeKey.GetValueOrDefault());
            }

            if (content != null)
            {
                isActualContent = true;
                return content;
            }

            var publishedContentType = _contentTypeCache.Get(PublishedItemType.Content, documentTypeUnique.GetValueOrDefault());

            if (publishedContentType == null)
                return null;

            var contentCacheKey = string.Format(Constants.CacheKeys.Content, nodeKey);
            using var scope = _scopeProvider.CreateScope();
            var cacheItem = _runtimeCache.GetCacheItem(contentCacheKey, () =>
            {
                return _documentCacheService.GetByContentType(publishedContentType).FirstOrDefault();
            }, CacheDuration);
            scope.Complete();
            return cacheItem;
        }

        #endregion
    }
}